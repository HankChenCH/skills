// skill add 名归一化与选择校验（spec 20261116-2c58 实现决策，票 20261116-f761）。
//
// 名归一化语义（载体迁移、语义同构）：位置参数逐 token 拆逗号、trim、滤空段、按首现
// 保序去重——与旧 --skills 值语义完全同构（空格 variadic + 逗号双收为拍板 D6 扩展），
// 如 `skill add a b,c d` → [a, b, c, d]、`skill add a,a` → [a]。
// 错误文案为 spec 命令面契约原文（测试逐字锚定），不得改写：
//   --all 互斥 / 空名 / 非 TTY 守卫三条（plugin 侧同构文案随票 20261116-ccfb）。

// spec 契约原文：--all 与名并集互斥（先后顺序无关，由解析层先归一化后判定保证）。
export const ERR_ALL_MUTEX = '--all 与技能名互斥：全装与按条目指定只能选一';
// spec 契约原文：名过滤后为空。
export const ERR_NAMES_EMPTY = 'skill add 需要至少一个技能名（如 skill add dev-spec,dev-plan）';
// spec 契约原文：非 TTY 交互守卫（含 plugin add 用法指引，plugin 侧行为随票 20261116-ccfb 验）。
export const ERR_INTERACTIVE_TTY =
  '交互选择需要终端（TTY）；非交互请改用 skill add <名...>、skill add --all 或 plugin add <名...> --profile <名>';

// 选择校验结果：error = ✗ 通道退出 1；names/all = 免交互安装；interactive = 无参进勾选。
export type SkillSelection =
  | { kind: 'error'; message: string }
  | { kind: 'all' }
  | { kind: 'interactive' }
  | { kind: 'names'; names: string[] };

export function normalizeNames(tokens: string[]): string[] {
  const names: string[] = [];
  for (const token of tokens) {
    for (const segment of token.split(',')) {
      const name = segment.trim();
      if (name !== '' && !names.includes(name)) {
        names.push(name);
      }
    }
  }
  return names;
}

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
