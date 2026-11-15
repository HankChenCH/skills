#!/usr/bin/env node
// @hankchen/infra 入口：旗标模式（--all / --skills / --plugins --profile）直通安装器；
// 无旗标进两层交互菜单（clack：第一层选资产类型，第二层勾选条目，插件类型追加 profile 选择）。
// 旗标路径按映射表机制分发（copy 行 → 技能安装器；command 行 → 插件安装编排）——
// 不再把旗标模式硬连技能行。交互、占位、取消、空选路径全部零落盘。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as clack from '@clack/prompts';

import {
  ASSET_MAP,
  PLUGINS_TYPE,
  SKILLS_TYPE,
  findRow,
  isCommandRow,
  isInstallableRow,
} from '../src/asset-map.js';
import { installAssets } from '../src/installer.js';
import { installPlugins } from '../src/plugin-install.js';
import { commandExists, DSH_COMMAND } from '../src/dsh-command.js';
import { listProfiles, profilesRoot } from '../src/dsh-profiles.js';
import { AGENT_DIRS } from '../src/agent-dirs.js';
import { listEntries, listPlugins, readDescriptions } from '../src/catalog.js';
import { skillOptions, typeOptions } from '../src/menu.js';
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

async function selectSkills(row) {
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
  return picked;
}

// command 类行第二层：插件多选（正名 = 包名、提示 = description）+ 第三层目标 profile。
// 既有 profile 列表按名排序；无既有项时可输入新名（官方流程会初始化它）。
// desktop 在列表中出现但选它会在安装前置被拒（官方保留名，异常流 B）。
async function selectPlugins(row) {
  let catalog;
  try {
    catalog = listPlugins(packageRoot, row);
  } catch (err) {
    clack.log.error(err.message);
    clack.outro('插件编目失败——未做任何改动。');
    return null;
  }
  const names = catalog.map((entry) => entry.name);
  const descriptions = Object.fromEntries(catalog.map((entry) => [entry.name, entry.description]));
  const picked = await clack.multiselect({
    message: `选择要安装的插件（共 ${names.length} 项；空格勾选、回车确认）`,
    options: skillOptions(names, descriptions),
    required: false,
  });
  if (clack.isCancel(picked)) {
    clack.cancel('已取消，未做任何改动。');
    return null;
  }
  if (picked.length === 0) {
    clack.outro('未勾选任何插件——未做任何改动。');
    return null;
  }

  const existing = listProfiles(profilesRoot());
  let profile;
  if (existing.length > 0) {
    profile = await clack.select({
      message: '选择目标 dsh profile（既有项按名排序）',
      options: existing.map((name) => ({ value: name, label: name })),
    });
  } else {
    profile = await clack.text({
      message: '未发现既有 dsh profile，输入新 profile 名（官方流程会初始化它）',
    });
    if (!clack.isCancel(profile)) {
      profile = String(profile).trim();
      if (profile === '') {
        clack.cancel('profile 名为空——未做任何改动。');
        return null;
      }
    }
  }
  if (clack.isCancel(profile)) {
    clack.cancel('已取消，未做任何改动。');
    return null;
  }

  clack.log.step(`已选 ${picked.length} 项：${picked.join('、')} → profile ${profile}`);
  return { kind: 'plugins', plugins: picked, profile };
}

async function interactiveSelect() {
  clack.intro(`@hankchen/infra v${packageVersion} · 套件资产初始化`);

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

  if (isCommandRow(row)) {
    const plugins = await selectPlugins(row);
    return plugins; // null = 取消/空选；否则 { kind:'plugins', plugins, profile }
  }
  const picked = await selectSkills(row);
  if (picked === null) {
    return null;
  }
  clack.log.step(`已选 ${picked.length} 项：${picked.join('、')}`);
  return { kind: 'skills', skills: picked };
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

function renderPluginSummary(result) {
  const lines = result.installed.map(
    (entry) =>
      `已安装插件 ${entry.name}@${entry.version} → dsh profile ${result.profile}（对账：依赖行 + bundles 行齐备）`,
  );
  lines.push(`记账：${LOCKFILE_NAME}（包版本 ${packageVersion}）；重跑本命令即按官方幂等语义刷新安装。`);
  clack.outro(lines.join('\n'));
}

// 插件安装（旗标与交互路径共用）：编目校验所选正名 → 前置检查 → 逐条转发官方命令 → 对账记账。
async function runPluginInstall({ plugins, profile }) {
  let cataloged;
  try {
    cataloged = listPlugins(packageRoot, findRow(ASSET_MAP, PLUGINS_TYPE)).map((entry) => entry.name);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    return 1;
  }
  const missing = plugins.filter((name) => !cataloged.includes(name));
  if (missing.length > 0) {
    console.error(`✗ 以下插件不在套件包内：${missing.join('、')}；可用插件：${cataloged.join('、') || '（无）'}`);
    return 1;
  }

  const spinner = clack.spinner();
  spinner.start(`正在安装 ${plugins.length} 项插件 → profile ${profile}…`);
  try {
    const result = installPlugins({
      profile,
      plugins,
      profilePath: path.join(profilesRoot(), profile),
      dshInPath: commandExists(DSH_COMMAND),
      projectRoot: process.cwd(),
      packageVersion,
      now: new Date().toISOString(),
    });
    spinner.stop(`安装完成（${result.installed.length} 项）`);
    renderPluginSummary(result);
    return 0;
  } catch (err) {
    spinner.stop('安装失败');
    clack.log.error(err.message);
    return 1;
  }
}

async function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    console.error('  运行 npx @hankchen/infra --help 查看全部旗标与示例。');
    return 1;
  }
  if (args.mode === 'help') {
    console.log(renderHelp());
    return 0;
  }

  if (args.mode === 'plugins') {
    if (args.profile === null) {
      const existing = listProfiles(profilesRoot());
      console.error('✗ 插件安装需要 --profile <名> 指定目标 dsh profile。');
      console.error(
        existing.length > 0
          ? `  既有 profile：${existing.join('、')}`
          : '  未发现既有 profile（$DSH_HOME/profiles/，缺省 ~/.dsh/profiles/）——可用任意新名。',
      );
      console.error('  示例：npx @hankchen/infra --plugins @hankchen/dsh-demo --profile dev');
      return 1;
    }
    return runPluginInstall({ plugins: args.plugins, profile: args.profile });
  }

  const skillsRow = findRow(ASSET_MAP, SKILLS_TYPE);
  let selected;
  if (args.mode === 'interactive') {
    const selection = await interactiveSelect();
    if (selection === null) {
      return 0;
    }
    if (selection.kind === 'plugins') {
      return runPluginInstall({ plugins: selection.plugins, profile: selection.profile });
    }
    selected = selection.skills;
  } else if (args.mode === 'all') {
    selected = listEntries(packageRoot, skillsRow);
  } else {
    selected = args.skills;
  }

  const spinner = clack.spinner();
  spinner.start(`正在安装 ${selected.length} 项技能…`);
  let result;
  try {
    result = installAssets({
      row: skillsRow,
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
