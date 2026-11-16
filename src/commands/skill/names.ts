// skill add 名归一化与选择校验（spec 20261116-2c58 实现决策，票 20261116-f761）。
//
// 名归一化与非 TTY 守卫文案与 plugin 侧共享单源实现（../names.ts，票 20261116-ccfb 起；
// 此处重导出保既有 import 面不变，勿另写第二份）。
// 错误文案为 spec 命令面契约原文（测试逐字锚定），不得改写：
//   --all 互斥 / 空名两条为 skill 侧专有；非 TTY 守卫为两命令共用。

import { ERR_INTERACTIVE_TTY, normalizeNames } from '../names.ts';

// spec 契约原文：--all 与名并集互斥（先后顺序无关，由解析层先归一化后判定保证）。
export const ERR_ALL_MUTEX = '--all 与技能名互斥：全装与按条目指定只能选一';
// spec 契约原文：名过滤后为空。
export const ERR_NAMES_EMPTY = 'skill add 需要至少一个技能名（如 skill add dev-spec,dev-plan）';
// 非 TTY 守卫文案（spec 契约原文）自共享叶重导出，保既有 import 面（cli.test 等）不变。
export { ERR_INTERACTIVE_TTY, normalizeNames };

// 选择校验结果：error = ✗ 通道退出 1；names/all = 免交互安装；interactive = 无参进勾选。
export type SkillSelection =
  | { kind: 'error'; message: string }
  | { kind: 'all' }
  | { kind: 'interactive' }
  | { kind: 'names'; names: string[] };

// 选择校验纯函数：commander 解析产物（位置参数收集 + --all 旗标）→ 归一化后的行动分支。
// 无位置参数（tokens 空）才走交互/守卫；有参数但过滤后为空（如 `skill add ,`）为空名报错。
export function resolveSkillSelection({
  tokens,
  all,
  isTTY,
}: {
  tokens: string[];
  all: boolean;
  isTTY: boolean;
}): SkillSelection {
  const names = normalizeNames(tokens);
  if (all) {
    if (names.length > 0) {
      return { kind: 'error', message: ERR_ALL_MUTEX };
    }
    return { kind: 'all' };
  }
  if (names.length === 0) {
    if (tokens.length === 0) {
      return isTTY ? { kind: 'interactive' } : { kind: 'error', message: ERR_INTERACTIVE_TTY };
    }
    return { kind: 'error', message: ERR_NAMES_EMPTY };
  }
  return { kind: 'names', names };
}
