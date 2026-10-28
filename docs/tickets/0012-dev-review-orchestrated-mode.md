---
id: 0012
type: feature
spec: 0006
status: ready
blocked-by: []
created: 2026-10-28
---
# 0012: dev-review 编排模式入参

**做什么：** dev-review 增加编排模式分支：dev-execute 以入参显式指定工单编号与 diff 基线（运行分支）时，评审范围只取入参工单，出口止于"报告 approved + 报告"，不自动调 dev-ship（PR 准备由编排方在运行末统一执行）；无编排入参时单票路径行为逐字不变。check.sh 零改动。

**验收标准：**
- [ ] 编排模式：给定显式工单编号与基线分支，评审报告 `tickets`/`branch` 记入参值，两轴阻断清零后 `status: approved` 即停，全程无 dev-ship 调用（FR-3/FR-4/FR-6｜证据：临时仓库演练记录）
- [ ] 单票路径回归：无编排入参时入口仍自动识别当前分支 implemented 工单、出口仍自动调 dev-ship，与改动前行为一致（FR-6｜证据：演练对照记录）
- [ ] 影响面收敛：dev-implement、dev-ship、check.sh 零改动，改动仅 dev-review 技能文件（FR-6｜证据：git diff 范围）

**Blocked by：** （无）

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
