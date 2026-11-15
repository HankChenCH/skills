#!/usr/bin/env node
// @hankghchen/infra 入口：旗标模式（--all / --skills）直通安装器；
// 无旗标进两层交互菜单（clack：第一层选资产类型，第二层勾选技能）。
// 交互、占位、取消、空选路径全部零落盘；安装路径由映射表驱动（src/asset-map.js）。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as clack from '@clack/prompts';

import { ASSET_MAP, SKILLS_TYPE, findRow, isInstallableRow } from '../src/asset-map.js';
import { installAssets } from '../src/installer.js';
import { AGENT_DIRS } from '../src/agent-dirs.js';
import { listEntries, readDescriptions } from '../src/catalog.js';
import { typeOptions, skillOptions } from '../src/menu.js';
import { parseArgs, renderHelp } from '../src/cli-args.js';
import { LOCKFILE_NAME } from '../src/lockfile.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageVersion = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).version;

// 提前进入 raw 模式：clack 只认裸 \r 的 return 键名；若终端仍处规范模式（如 PTY 合成按键、
// 部分远端终端），\r 会被 ICRNL 翻成 \n（键名 enter）而永远无法提交。TTY 上先开 raw 保证
// 回车语义一致；clack 自身的 raw 开关在非 tty.ReadStream 的 stdin 上会静默跳过。
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

async function interactiveSelect() {
  clack.intro(`@hankghchen/infra v${packageVersion} · 套件资产初始化`);

  const type = await clack.select({
    message: '选择要安装的资产类型',
    options: typeOptions(ASSET_MAP),
  });
  if (clack.isCancel(type)) {
    clack.cancel('已取消，未做任何改动。');
    return null;
  }
  const row = findRow(ASSET_MAP, type);
  if (!isInstallableRow(row)) {
    clack.outro(`「${type}」为占位类型，本轮不可安装——未做任何改动。`);
    return null;
  }

  const names = listEntries(packageRoot, row);
  const descriptions = readDescriptions(packageRoot, row, names);
  const picked = await clack.multiselect({
    message: `选择要安装的技能（共 ${names.length} 项；空格勾选、回车确认）`,
    options: skillOptions(names, descriptions),
    required: false,
  });
  if (clack.isCancel(picked)) {
    clack.cancel('已取消，未做任何改动。');
    return null;
  }
  if (picked.length === 0) {
    clack.outro('未勾选任何技能——未做任何改动。');
    return null;
  }
  clack.log.step(`已选 ${picked.length} 项：${picked.join('、')}`);
  return picked;
}

function renderSummary(result) {
  const lines = [];
  lines.push(`已安装 ${result.installedSkills.length} 项技能 → .agents/skills/：${result.installedSkills.join('、')}`);
  if (result.linkedAgentDirs.length > 0) {
    lines.push(`已为 ${result.linkedAgentDirs.length} 个 agent 目录建软链：${result.linkedAgentDirs.join('、')}`);
  }
  if (result.skippedAgentDirs.length > 0) {
    lines.push(
      `跳过 ${result.skippedAgentDirs.length} 个 agent 目录（项目内不存在）：${result.skippedAgentDirs.map((s) => s.dir).join('、')}`,
    );
  }
  for (const conflict of result.conflicts) {
    lines.push(`跳过软链（该位置已有真实文件，未改动使用者数据）：${conflict.linkPath}`);
  }
  lines.push(`记账：${LOCKFILE_NAME}（包版本 ${packageVersion}）；重跑本命令即刷新已装技能到当前包内容。`);
  clack.outro(lines.join('\n'));
}

async function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    console.error('  运行 npx @hankghchen/infra --help 查看全部旗标与示例。');
    return 1;
  }
  if (args.mode === 'help') {
    console.log(renderHelp());
    return 0;
  }

  const row = findRow(ASSET_MAP, SKILLS_TYPE);
  let selected;
  if (args.mode === 'interactive') {
    selected = await interactiveSelect();
    if (selected === null) {
      return 0;
    }
  } else if (args.mode === 'all') {
    selected = listEntries(packageRoot, row);
  } else {
    selected = args.skills;
  }

  const spinner = clack.spinner();
  spinner.start(`正在安装 ${selected.length} 项技能…`);
  let result;
  try {
    result = installAssets({
      row,
      packageRoot,
      projectRoot: process.cwd(),
      agentDirs: AGENT_DIRS,
      selected,
      packageVersion,
      now: new Date().toISOString(),
    });
  } catch (err) {
    spinner.stop('安装失败');
    clack.log.error(err.message);
    return 1;
  }
  spinner.stop(`安装完成（${result.installedSkills.length} 项）`);
  renderSummary(result);
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(`✗ 未预期的错误：${err.stack ?? err.message}`);
    process.exitCode = 1;
  },
);
