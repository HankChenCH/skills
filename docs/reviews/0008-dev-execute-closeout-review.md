---
id: 0008
status: approved
tickets: [0014]
branch: main
created: 2026-10-28
---
# 0008: dev-execute 收口链（票 0014）评审

评审对象：main 上三笔提交（56ed0d0 收口链文本、72cfbc4 演练修订、f47c467 出口门禁核销）——SKILL.md §6 收口节 + 节号顺延（§7–§9）+ 异常流第五形态，run-mechanics §8 收口章（§8.1–8.6）+ §5 末条收口断点推导。CODING_STANDARDS.md 不存在，标准轴以 ref-review 基线 + ref-implementation 可迁移标准为据。

## 标准轴 findings
- [references/run-mechanics.md:181（原）] §8.1 第 2 条"该弃进 §7 异常流"——节号顺延遗漏，§7 现为中断与续接，异常流在 §8；已改为 §8。读的人会走错章节找处置路径。（阻断→已修复）
- [references/run-mechanics.md:206（原）] §8.3 "（§5.6 断点续接）"——本文件 §5 无子节，§5.6 指代不明；已改为"§5 末条"，与 SKILL.md §7 的引用措辞一致。（建议→已采纳）
- [references/run-mechanics.md:184（原）] §8.1 第 3 条"运行全绿（§5.5）"——在 run-mechanics 内会被读成本文件 §5.5；已改为"SKILL.md §5.5"。（建议→已采纳）

## Spec 轴 findings
- [ticket 0014 / spec 0006 §5 末条] 走样（表述）："确认前中断的不补问已答过的问题，重新一次问清"与单向门"每轮显式确认"连读含混（未执行的确认到底作不作数）；已改为"未执行合并的确认不作数——重入后重新一次问清（单向门）"，安全侧语义明确。（建议→已采纳）
- [ticket 0014 / spec 0006 FR-9] 超范围核查：异常流第五形态（收口 pre-push 不过）不在 spec FR-9 四类清单内——判定不超范围：它是 FR-6 收口链自身的错误路径（评审覆盖与盘上状态不一致时 pre-push 必须有处置），处置与既有四类同款（停下、报告、指路 /dev-review），未引入新机制；缺失它则收口链在防线触发时无路径。
- FR-6 / FR-7 / 中断续接逐条对照 spec 验收场景与工单三条验收标准：SKILL §6 七步 + run-mechanics §8.1–8.6 + §5 末条全覆盖；证据为演练记录 /tmp/devx-drill/records/closeout-1…8（PR 三节、pre-push 红绿两形态、显式确认、五票 done、worktree 清零、出口报告三件、断点续接零重复评审）。演练实锤并已写回文本：合并信息不带 [#NNNN] 被 commit-msg hook 拦（§8.3 写死要求）。

## 范围外备注
- 本仓库 0001–0011 号票状态停在 implemented（历史遗留，其评审 0001–0005 均 approved），未来走 dev-ship/编排运行时会被 pre-push 放行（有覆盖），但状态机不收口；不属本票范围，留待轮次规划。

## 汇总
标准轴阻断 0（1 已修复）/ 建议 0（2 已采纳）；Spec 轴阻断 0 / 建议 0（1 已采纳）。结论：approved。
