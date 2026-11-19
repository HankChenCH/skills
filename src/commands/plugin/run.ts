// plugin 安装运行时（票 20261116-ccfb 起；20261116-bfcf 硬切后为 plugin add 命令的唯一
// 交互勾选与安装摘要实现，沿 skill 侧 run.ts 先例：helper 复用而非命令注册）。
// 安装行为（编目校验正名、前置检查、逐条转发官方命令、装后对账、锁文件记账）全部在
// 安装内核，本层只编排与呈现——语义零变化，仅调用。

import path from 'node:path';

import * as clack from '@clack/prompts';

import type { ProgramContext } from '../../context.ts';
import { ASSET_MAP, PLUGINS_TYPE, findRow } from '../../kernel/asset-map.ts';
import { listPlugins } from '../../kernel/catalog.ts';
import { commandExists, DSH_COMMAND } from '../../kernel/dsh-command.ts';
import { listProfiles, profilesRoot } from '../../kernel/dsh-profiles.ts';
import { installPlugins } from '../../kernel/plugin-install.ts';
import type { InstallPluginsResult } from '../../kernel/plugin-install.ts';
import { LOCKFILE_NAME } from '../../kernel/lockfile.ts';
import { skillOptions } from '../../kernel/menu.ts';

// 交互勾选结果（评审 20261116-ccfb 增量修正）：编目失败可区分返回，调用方走 ✗ 通道 +
// 退出 1——spec「错误统一走 ✗ 通道 + 退出码 1」，取消/空选是唯一明文豁免（零落盘退 0），
// 编目失败不在豁免之列；成功为所选组合。
export type PluginInteractivePick =
  | { kind: 'catalog-error'; message: string }
  | { kind: 'cancel' }
  | { kind: 'picked'; plugins: string[]; profile: string };

// 插件条目多选（构造保留：按名排序、正名为包名、提示为包 description，与现行形态一致）。
// 取消（Ctrl-C）与空选确认 → 提示后返回 cancel，调用方按 0 退出、零落盘（现行交互纪律）。
// presetProfile 非空时跳过 profile 提示（spec：`plugin add --profile dev` 无名进交互
// 仅提示插件多选、不再提示 profile）；否则既有 profile 单选、无既有项输入新名。
// desktop 与其他 profile 同一流程（保留名拒装已随官方 CLI 放行 desktop 插件管理移除——
// spec 20261119-7a9a，票 20261119-443c）。
export async function selectPluginsInteractive(
  context: ProgramContext,
  presetProfile: string | undefined,
): Promise<PluginInteractivePick> {
  let catalog;
  try {
    catalog = listPlugins(context.packageRoot, findRow(ASSET_MAP, PLUGINS_TYPE));
  } catch (err) {
    return { kind: 'catalog-error', message: err.message }; // 交调用方 ✗ 通道（错误统一退出 1）
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
    return { kind: 'cancel' };
  }
  if (picked.length === 0) {
    clack.outro('未勾选任何插件——未做任何改动。');
    return { kind: 'cancel' };
  }

  // profile 提示（预置跳过 / 既有单选 / 无既有输入新名）：clack 的 isCancel 守卫窄化依赖
  // 分支内对 await 结果直接判定（声明 string | symbol 变量会让 generic symbol 挡住窄化），
  // 故各分支自收窄到 string 后合并。
  let profile: string;
  if (presetProfile !== undefined) {
    profile = presetProfile;
  } else {
    const existing = listProfiles(profilesRoot());
    if (existing.length > 0) {
      const picked = await clack.select({
        message: '选择目标 dsh profile（既有项按名排序）',
        options: existing.map((name) => ({ value: name, label: name })),
      });
      if (clack.isCancel(picked)) {
        clack.cancel('已取消，未做任何改动。');
        return { kind: 'cancel' };
      }
      profile = picked;
    } else {
      const entered = await clack.text({
        message: '未发现既有 dsh profile，输入新 profile 名（官方流程会初始化它）',
      });
      if (clack.isCancel(entered)) {
        clack.cancel('已取消，未做任何改动。');
        return { kind: 'cancel' };
      }
      profile = String(entered).trim();
      if (profile === '') {
        clack.cancel('profile 名为空——未做任何改动。');
        return { kind: 'cancel' };
      }
    }
  }

  clack.log.step(`已选 ${picked.length} 项：${picked.join('、')} → profile ${profile}`);
  return { kind: 'picked', plugins: [...picked], profile };
}

// 编目校验所选正名（不套件包内即报错列清单、零落盘）→ 前置检查 → 逐条转发官方命令 →
// 对账记账。失败路径：spinner 停止 + ✗ 呈现 + 退出 1（与技能失败路径同流）。
export async function installPluginsAndRender({
  plugins,
  profile,
  context,
}: {
  plugins: string[];
  profile: string;
  context: ProgramContext;
}): Promise<number> {
  let cataloged;
  try {
    cataloged = listPlugins(context.packageRoot, findRow(ASSET_MAP, PLUGINS_TYPE)).map((entry) => entry.name);
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
      packageVersion: context.packageVersion,
      now: new Date().toISOString(),
    });
    spinner.stop(`安装完成（${result.installed.length} 项）`);
    renderPluginSummary(context, result);
    return 0;
  } catch (err) {
    spinner.stop('安装失败');
    clack.log.error(err.message);
    return 1;
  }
}

function renderPluginSummary(context: ProgramContext, result: InstallPluginsResult): void {
  const lines = result.installed.map(
    (entry) =>
      `已安装插件 ${entry.name}@${entry.version} → dsh profile ${result.profile}（对账：依赖行 + bundles 行齐备）`,
  );
  lines.push(`记账：${LOCKFILE_NAME}（包版本 ${context.packageVersion}）；重跑本命令即按官方幂等语义刷新安装。`);
  clack.outro(lines.join('\n'));
}
