// 旧旗标路径（过渡并存，票 20261116-f761）：--all / --skills / --plugins --profile 旗标分发与
// 两层交互菜单全链，自 bin/infra.ts 逐字搬迁（行为零变化）。
//
// 过渡口径（spec 20261116-2c58、票 20261116-f761）：新命令面（skill 前缀）由程序装配层
// 前置分发进 src/commands/；其余 token（旧旗标与裸跑两层菜单）仍走本模块并存，保证过渡期
// CI 绿。硬切（旧旗标按未知旗标口径报错、两层菜单退役、未知命令/未知旗标新文案）归
// 票 20261116-bfcf，届时本模块整体退役删除——不做半迁移，等硬切票一次性处置。

import fs from 'node:fs';
import path from 'node:path';

import * as clack from '@clack/prompts';

import {
  ASSET_MAP,
  PLUGINS_TYPE,
  SKILLS_TYPE,
  findRow,
  isCommandRow,
  isInstallableRow,
} from './kernel/asset-map.ts';
import type { CommandRow, CopyRow } from './kernel/asset-map.ts';
import { installAssets } from './kernel/installer.ts';
import type { InstallAssetsResult } from './kernel/installer.ts';
import { installPlugins } from './kernel/plugin-install.ts';
import type { InstallPluginsResult } from './kernel/plugin-install.ts';
import { commandExists, DSH_COMMAND } from './kernel/dsh-command.ts';
import { listProfiles, profilesRoot } from './kernel/dsh-profiles.ts';
import { AGENT_DIRS } from './kernel/agent-dirs.ts';
import { listEntries, listPlugins, readDescriptions } from './kernel/catalog.ts';
import { skillOptions, typeOptions } from './kernel/menu.ts';
import { parseArgs, renderHelp } from './cli.ts';
import type { ParsedArgs } from './cli.ts';
import { LOCKFILE_NAME } from './kernel/lockfile.ts';

// 提前进入 raw 模式：clack 只认裸 \r 的 return 键名；若终端仍处规范模式（如 PTY 合成按键、
// 部分远端终端），\r 会被 ICRNL 翻成 \n（键名 enter）而永远无法提交。TTY 上先开 raw 保证
// 回车语义一致；clack 自身的 raw 开关在非 tty.ReadStream 的 stdin 上会静默跳过。
function ensureRawModeOnTty(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
}

// 旗标解析与交互选择共用安装选择形态：技能集或（插件集 + 目标 profile）。
type Selection = { kind: 'skills'; skills: string[] } | { kind: 'plugins'; plugins: string[]; profile: string };

async function selectSkills(packageRoot: string, row: CopyRow): Promise<string[] | null> {
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
async function selectPlugins(packageRoot: string, row: CommandRow): Promise<Selection | null> {
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

async function interactiveSelect(packageRoot: string, packageVersion: string): Promise<Selection | null> {
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
    const plugins = await selectPlugins(packageRoot, row);
    return plugins; // null = 取消/空选；否则 { kind:'plugins', plugins, profile }
  }
  const picked = await selectSkills(packageRoot, row);
  if (picked === null) {
    return null;
  }
  clack.log.step(`已选 ${picked.length} 项：${picked.join('、')}`);
  return { kind: 'skills', skills: picked };
}

function renderSummary(packageVersion: string, result: InstallAssetsResult): void {
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

function renderPluginSummary(packageVersion: string, result: InstallPluginsResult): void {
  const lines = result.installed.map(
    (entry) =>
      `已安装插件 ${entry.name}@${entry.version} → dsh profile ${result.profile}（对账：依赖行 + bundles 行齐备）`,
  );
  lines.push(`记账：${LOCKFILE_NAME}（包版本 ${packageVersion}）；重跑本命令即按官方幂等语义刷新安装。`);
  clack.outro(lines.join('\n'));
}

// 插件安装（旗标与交互路径共用）：编目校验所选正名 → 前置检查 → 逐条转发官方命令 → 对账记账。
async function runPluginInstall(
  packageRoot: string,
  packageVersion: string,
  { plugins, profile }: { plugins: string[]; profile: string },
): Promise<number> {
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
    renderPluginSummary(packageVersion, result);
    return 0;
  } catch (err) {
    spinner.stop('安装失败');
    clack.log.error(err.message);
    return 1;
  }
}

export async function runLegacyFlags(argv: string[], packageRoot: string, packageVersion: string): Promise<number> {
  ensureRawModeOnTty();

  let args: ParsedArgs;
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
    // 解析不变量：plugins 模式下 plugins 恒非空数组、profile 过上面 null 门后恒为 string
    //（ParsedArgs 为增量构造的可选形态，见 cli ParsedArgs 注）。
    return runPluginInstall(packageRoot, packageVersion, { plugins: args.plugins as string[], profile: args.profile as string });
  }

  const skillsRow = findRow(ASSET_MAP, SKILLS_TYPE);
  let selected: string[];
  if (args.mode === 'interactive') {
    const selection = await interactiveSelect(packageRoot, packageVersion);
    if (selection === null) {
      return 0;
    }
    if (selection.kind === 'plugins') {
      return runPluginInstall(packageRoot, packageVersion, { plugins: selection.plugins, profile: selection.profile });
    }
    selected = selection.skills;
  } else if (args.mode === 'all') {
    selected = listEntries(packageRoot, skillsRow);
  } else {
    // 解析不变量：skills 模式下 args.skills 恒为非空数组（parseArgs 对空值显式报错保证）
    selected = args.skills as string[];
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
  renderSummary(packageVersion, result);
  return 0;
}
