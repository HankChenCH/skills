// 提交通道判定（20261119-6698 retro 采纳 B 项增补；滥用实录 = 7a25c54 / 53c113c 源码改动误用 [trivial]）。

# 通道判定：[trivial] / 快通道 / 正式票

改一项东西之前先判定走哪条通道——判据只有一条：**动不动 docs 产物之外的文件**（源码、测试、技能文件、脚本）。

## 三通道

| 改动对象 | 通道 | 依据 |
|---|---|---|
| typo、纯文档（README / specs / needs / design 注记 / CHANGELOG / tracker 记账） | `[trivial]` 豁免直接提交 | GLOSSARY「[trivial]」定义：限 typo 与纯文档改动 |
| 小但真实改代码（源码 + 测试，一句话能说清、低风险、不违反已有 ADR） | **快通道**（dev-quick-implement）：自动补齐 need / spec / 单票三件套，三道准入门逐门留痕进自产 spec「## 备注」 | GLOSSARY「快通道」：trivial 管 typo 与纯文档，快通道管小但真改代码 |
| 快通道三道门任一不过（不简单 / 有风险 / 触碰 ADR） | 正式链：dev-clarify → dev-spec → dev-plan → dev-implement | 标准 SDLC 流 |

## 判定例（2026-11-19 实录）

- README「已知边界」补一段 → `[trivial]` ✓
- spec 批准落盘 / 发布记账（版本 bump + CHANGELOG，无逻辑变更）→ `[trivial]` ✓（发布记账另有 dev-release §4.3 明文许可）
- `/mcp add` 引号值拒收守卫（index.ts + 单测）→ **快通道**，不是 trivial（7a25c54 误用实录）
- 面板卡外边距 8px（client 样式 + 契约断言 + design 注记）→ **快通道**，不是 trivial（53c113c 误用实录）

## 反例信号（出现即不是 [trivial]）

- diff 里有 `agents/`、`src/`、`test/`、`scripts/`、`skills/` 下任何文件；
- 「顺手把行为改对」——行为变化就是代码改动，无论多小；
- commit message 里出现「red-green」「修复」「拒收」「新增断言」等实现动词。

## 追认与例外

- 滥用既成事实的补救 = 补立快通道形态 need + spec 追认登记（先例：20261119-5625 / 20261119-16d3，随 0.3.2 已发布变更的追认）。
- 待办：AGENTS.md 哨兵块「小修走 [trivial] 豁免」措辞与 GLOSSARY 定义存在口径差，修订归蓝图 + setup-workspace 技能下轮落实（哨兵块由 setup-workspace 管理，勿手改）。
