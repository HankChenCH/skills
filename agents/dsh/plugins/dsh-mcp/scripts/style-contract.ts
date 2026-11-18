// 客户端产物样式契约扫描器（spec 20261118-8a57 FR-7，票 20261118-eb6a；design 0004 述标
// approved 实现校验点）：client 产物内零 `#[0-9a-f]{3,6}` 直值色、零 `font-family:` 写死——
// 取色全走 var(--dsw-alias-*) token，字体族只许 var() 引用（继承宿主 text/code/terminal
// 三路用户设置）。
// 断言面 = 产出代码（spec 契约）：调用方传入 prepack 同形态编译产物（removeComments 剥注释）
// ——token 快照演示注释天然不在断言面。两面消费：① prepack 编译后 fail loud（缺陷即中止
// 打包，scripts/prepack.ts）；② 单测对产物全扫（test/unit/dsh-mcp-client-style-contract.test.ts）。
// 契约面声明：只锁 `font-family:` 声明（font 简写不在契约面——本样式层不用简写，引入时须
// 同步扩本扫描器）；颜色面只锁 hex 直值（rgba/hsl 字面按 design-web.md 反例纪律归评审，
// 本样式层不用）。
// 导入面：编译产物相对路径 import './style-contract.ts'（node 零构建直跑形态）与测试相对
// 路径 import 同源单点。

/** 单条契约缺陷：规则名 + 原值上下文（±40 字符，可直接进 stderr / 测试失败消息定位）。 */
export interface StyleContractDefect {
  rule: 'hex-color' | 'font-family';
  snippet: string;
}

/** 缺陷 snippet 的上下文半径（字符）：足以定位，不淹没 stderr。 */
const SNIPPET_CONTEXT = 40;

/** hex 直值色：3–6 位十六进制（大小写都在契约面），后随非十六进制字符（不吃更长 token）。 */
const HEX_COLOR_PATTERN = /#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/g;

/** font-family 声明：值取到声明终结（; 或 } 或文本尾）。 */
const FONT_FAMILY_PATTERN = /font-family\s*:\s*([^;}]+)/g;

/**
 * var() 引用链判定（字体族写死与否的判定单点）：值剥到只剩 var(...) 调用与分隔符即 token
 * 引用——嵌套 var 回退链（官方先例 `var(--a, var(--b))`）由反复剥最内层收敛。
 */
function isVarReferenceOnly(value: string): boolean {
  let rest = value.trim();
  let previous = '';
  while (rest !== previous) {
    previous = rest;
    rest = rest.replace(/var\([^()]*\)/g, '');
  }
  return rest.trim() === '';
}

function snippetAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - SNIPPET_CONTEXT);
  const end = Math.min(text.length, index + length + SNIPPET_CONTEXT);
  const prefix = start === 0 ? '' : '…';
  const suffix = end === text.length ? '' : '…';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

/**
 * 扫描产物文本，返回样式契约缺陷清单（空数组 = 通过）。
 * 输入契约：产出代码（编译产物或等价的无注释文本）——带注释文本的注释段会被误扫，
 * 调用方须先剥注释（prepack 编译即剥）。
 */
export function collectStyleContractDefects(productText: string): StyleContractDefect[] {
  const defects: StyleContractDefect[] = [];
  for (const match of productText.matchAll(HEX_COLOR_PATTERN)) {
    defects.push({ rule: 'hex-color', snippet: snippetAround(productText, match.index, match[0].length) });
  }
  for (const match of productText.matchAll(FONT_FAMILY_PATTERN)) {
    if (isVarReferenceOnly(match[1])) continue;
    defects.push({ rule: 'font-family', snippet: snippetAround(productText, match.index, match[0].length) });
  }
  return defects;
}
