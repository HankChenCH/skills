---
id: 0015
type: feature
spec: 0006
status: ready
blocked-by: [0013, 0014]
created: 2026-10-28
---
# 0015: sdlc 总控接线（运行中 worktree 段 + next-mode 路由行）

**做什么：** sdlc 技能两处接线：① 默认模式报告增加"运行中 worktree"段——`git worktree list` 发现 `run/` 前缀分支，逐分支读票状态并列出，sdlc 零写入铁律不变；② references/next-mode.md 路由表加行——frontier 多张可开工票同属一张 approved spec 时问询"整 spec 编排（默认，调 dev-execute）/ 单票（原语义，默认最小编号）"。

**验收标准：**
- [ ] FR-8（总览）：存在进行中运行 worktree 时默认报告含"运行中 worktree"段（逐运行分支列出票状态），且 sdlc 运行前后 `git status` 零变化（FR-8｜证据：演练记录 + git status diff）
- [ ] 路由行：多票同 approved spec 时命中问询，选编排调 dev-execute、选单票走原语义；单张可开工票场景不受影响（证据：演练记录）
- [ ] 空态：无运行 worktree 时该段为一行空态说明或省略，不报错（证据：演练记录）

**Blocked by：** 0013, 0014

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
