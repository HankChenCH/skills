---
id: 0015
type: feature
spec: 0006
status: implemented
blocked-by: [0013, 0014]
created: 2026-10-28
---
# 0015: sdlc 总控接线（运行中 worktree 段 + next-mode 路由行）

**做什么：** sdlc 技能两处接线：① 默认模式报告增加"运行中 worktree"段——`git worktree list` 发现 `run/` 前缀分支，逐分支读票状态并列出，sdlc 零写入铁律不变；② references/next-mode.md 路由表加行——frontier 多张可开工票同属一张 approved spec 时问询"整 spec 编排（默认，调 dev-execute）/ 单票（原语义，默认最小编号）"。

**验收标准：**
- [x] FR-8（总览）：存在进行中运行 worktree 时默认报告含"运行中 worktree"段（逐运行分支列出票状态），且 sdlc 运行前后 `git status` 零变化（FR-8｜证据：演练记录 + git status diff——/tmp/devx-drill-0015/records/green-fr8.txt：两条 run/ 条目被发现、运行 worktree 读票 0008 implemented、票 worktree 读票 0009 in-progress、步骤 0/6 `git status --porcelain` 均空）
- [x] 路由行：多票同 approved spec 时命中问询，选编排调 dev-execute、选单票走原语义；单张可开工票场景不受影响（证据：/tmp/devx-drill-0015/records/green-routing.txt——场景 A 多票同 spec 0006 命中行 4 问询、场景 C 反例多票异 spec 落行 5 原语义、场景 B 单张直路由）
- [x] 空态：无运行 worktree 时该段为一行空态说明或省略，不报错（证据：/tmp/devx-drill-0015/records/green-empty.txt——清理后 worktree list 仅主工作区、`branch --list "run/*"` 空、退出码全 0）

**Blocked by：** 0013, 0014

## Progress
实现完成：SKILL.md §1.2 默认报告增"运行中 worktree"段（票状态读运行/票 worktree、主工作区旧态不作依据、纯只读）；next-mode.md 插路由行 4（原 4–11 顺延 5–12）+ 规则"多票同 spec 先问编排"。
临时仓库三场景演练全绿（红 /tmp/devx-drill-0015/records/red-before.md，绿 green-fr8/green-routing/green-empty + green-summary.md）；check.sh all 报 config.sh 无检查命令——既有发现，非本票引入。
评审注意：段文本显式声明零写入与"续接归 dev-execute 重入"；票状态读取顺序对齐 run-mechanics §5.2；路由行命中条件=≥2 张 frontier 票同指一张 approved spec。
