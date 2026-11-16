// plugin add 名归一化与选择校验（spec 20261116-2c58 实现决策，票 20261116-ccfb）。
//
// 名归一化与 skill 侧共享同一实现（../names.ts，勿另写第二份）；本模块只承载 plugin 侧
// 的选择分支判定与契约文案。错误文案为 spec 命令面契约原文（测试逐字锚定），不得改写：
//   空名 / --profile 缺值 / 非 TTY 守卫 / 缺 --profile 三行结构。

import { ERR_INTERACTIVE_TTY, normalizeNames } from '../names.ts';

// spec 契约原文：名过滤后为空（plugin 侧同构文案）。
export const ERR_NAMES_EMPTY =
  'plugin add 需要至少一个插件名（如 plugin add @hankchen/dsh-demo --profile dev）';
// spec 契约原文：--profile 缺值。commander 选项声明 `--profile <名>` 承担值必需，缺值经
// 出口通道翻本文案（见 add.ts 的 exitOverride 转译）；空串值同缺值口径（旧旗标矩阵同义）。
export const ERR_PROFILE_VALUE =
  '--profile 需要一个 profile 名（如 plugin add @hankchen/dsh-demo --profile dev）';
// 非 TTY 交互守卫（spec 契约原文，与 skill 侧同一条）自共享叶重导出，保 import 面单一。
export { ERR_INTERACTIVE_TTY };

// 选择校验结果：error = ✗ 通道退出 1；profile-required = 缺 --profile 三行结构报错；
// names = 带名免交互安装；interactive = 无参进勾选（presetProfile 非空时不再提示 profile）。
export type PluginSelection =
  | { kind: 'error'; message: string }
  | { kind: 'profile-required' }
  | { kind: 'interactive'; presetProfile: string | undefined }
  | { kind: 'names'; names: string[]; profile: string };

// 选择校验纯函数：commander 解析产物（位置参数收集 + --profile 值）→ 行动分支。
// 判定顺序：--profile 空值（显式给了旗标但无有效值）最先报；带名无 profile 为三行结构；
// 有参数但过滤后为空（如 `plugin add ,`）为空名报错；无位置参数才走交互/守卫。
export function resolvePluginSelection({
  tokens,
  profile,
  isTTY,
}: {
  tokens: string[];
  profile: string | undefined;
  isTTY: boolean;
}): PluginSelection {
  if (profile !== undefined && profile.trim() === '') {
    return { kind: 'error', message: ERR_PROFILE_VALUE };
  }
  const names = normalizeNames(tokens);
  if (names.length > 0) {
    return profile === undefined
      ? { kind: 'profile-required' }
      : { kind: 'names', names, profile };
  }
  if (tokens.length > 0) {
    return { kind: 'error', message: ERR_NAMES_EMPTY };
  }
  if (!isTTY) {
    return { kind: 'error', message: ERR_INTERACTIVE_TTY };
  }
  return { kind: 'interactive', presetProfile: profile };
}

// 缺 --profile 三行结构（spec 命令面契约：沿用现行三行结构，示例行改新形态）。纯函数
// 返回三行内容（不含 ✗ 前缀与缩进，呈现归处理器）；既有 profile 列表由调用方读盘注入。
export function profileRequiredLines(existingProfiles: string[]): string[] {
  return [
    '插件安装需要 --profile <名> 指定目标 dsh profile。',
    existingProfiles.length > 0
      ? `既有 profile：${existingProfiles.join('、')}`
      : '未发现既有 profile（$DSH_HOME/profiles/，缺省 ~/.dsh/profiles/）——可用任意新名。',
    '示例：npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev',
  ];
}
