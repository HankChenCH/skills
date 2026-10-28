---
id: 0014
type: feature
spec: 0006
status: implemented
blocked-by: [0013]
created: 2026-10-28
---
# 0014: dev-execute 收口链（一次 PR / 合并确认 / 票 done / 清理）

**做什么：** dev-execute 增收口链（SKILL.md 收口节 + references/run-mechanics.md 收口章）：全部票 implemented 且预演绿的判定 → 按 dev-ship 前半三节模板（Summary / Evidence / Merge Danger）生成一次 PR → `check.sh pre-push` → 合并确认一次问清（方式 + 是否 tag，单向门）→ 合并后该 spec 全部票 `status: done`（[trivial] 状态提交，dev-ship 同款语义）→ 清理全部运行/票 worktree → 出口报告（逐票终态 + 运行摘要）指路手动 /dev-accept，不自动串联。

**验收标准：**
- [x] FR-6（收口全链）：演练中生成一次含三节正文的 PR、pre-push 通过、合并经用户显式确认、合并后该 spec 全部票 done、运行与票 worktree 全部清理；且逐票评审出口无任何 PR 准备动作（证据：演练记录）
- [x] FR-7（出口）：出口报告含逐票终态清单与运行摘要并指路 /dev-accept；dev-accept 未被自动调用（证据：演练记录）
- [x] 中断续接：合并确认前中断后重入，从 `git worktree list` + 票状态推导续接到收口，已合回票不重复评审（证据：演练记录）

**Blocked by：** 0013

## Progress
SKILL §6 收口节 + run-mechanics §8 收口章（§8.1–8.6）与 §5 收口断点推导已落，全链在临时仓库演练实证（/tmp/devx-drill/records/closeout-1…8）。演练抓到并修订一处缺口：合并信息不带 [#NNNN] 被 commit-msg hook 拦（§8.3 写死要求）。尾巴：pre-push hook 壳在本仓库存在、演练仓库手动补装；评审时值得注意 run-mechanics §5 末条三段断点判据。
