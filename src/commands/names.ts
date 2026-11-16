// 命令定义层共享叶（票 20261116-ccfb）：skill add 与 plugin add 共用的名归一化实现
//（spec 20261116-2c58 实现决策「名归一化与 skill 侧同构——共享同一归一化实现，勿另写第二份」）
// 与两条命令共用面契约文案。独立成叶是为了依赖方向单一：skill/ 命令目录与 plugin/ 命令目录
// 各自 import 本叶，命令之间互不依赖。
//
// 名归一化语义（载体迁移、语义同构）：位置参数逐 token 拆逗号、trim、滤空段、按首现
// 保序去重——与旧 --skills/--plugins 值语义完全同构（空格 variadic + 逗号双收为拍板 D6 扩展），
// 如 `skill add a b,c d` → [a, b, c, d]、`skill add a,a` → [a]。

// spec 契约原文：非 TTY 交互守卫（skill add 与 plugin add 同一条文案，含三条命令用法指引）。
export const ERR_INTERACTIVE_TTY =
  '交互选择需要终端（TTY）；非交互请改用 skill add <名...>、skill add --all 或 plugin add <名...> --profile <名>';

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
