---
id: 0013
type: feature
spec: 0006
status: ready
blocked-by: [0012]
created: 2026-10-28
---
# 0013: dev-execute 运行主体（建图 / worktree / 并行 / 合回 / 预演）

**做什么：** 新增 `skills/dev-execute/`（SKILL.md 控制流 + references/run-mechanics.md 操作细则）：入口门禁（spec approved；点名单票或未批准拒绝并指路）、对点名 spec 名下全部票按 blocked-by 拓扑分层建运行依赖顺序图并请求开工确认、运行分支（`run/<spec-id>`）与运行/票 worktree 建立、同层每票子代理并行派发（dev-implement 纪律全文，并行度默认上限 4、参数可覆盖）、经 dev-review 编排模式（票 0012 契约）逐票评审、approved 票按依赖序机械合回运行分支、每次合回后预演（`check.sh all` + 已有自动化承载的集成级测试）、四种异常流（设计级阻断 / spec 缺口 / 预演失败 / 合回冲突）停下问人带连坐阻塞面与指路、中断续接从 `git worktree list` + 票状态推导。收口（PR / 合并 / 票 done / 清理）归票 0014。

**验收标准：**
- [ ] FR-1（图+确认）：点名 approved spec 展示分层依赖序图（同层无依赖、层间 blocked-by 串行、标注关键路径）并请求开工确认；未确认不创建任何 worktree（证据：临时仓库演练记录）
- [ ] FR-1（拒绝）：spec 未 approved 或点名单张票 → 拒绝并分别指路 /dev-spec、/dev-implement，零写入（证据：演练记录）
- [ ] FR-2（隔离）：运行建立后 `git worktree list` 可见运行 worktree 与 `run/<spec-id>` 分支，主工作区停留主分支且干净（证据：演练记录）
- [ ] FR-3（并行）：某层 ≥2 张无依赖票在各自票 worktree 并行实现（执行时间重叠），每票走完 dev-implement 红绿纪律；blocked-by 未满足的票未开工（证据：演练记录）
- [ ] FR-4（合回+预演）：approved 票机械合回后运行分支自动跑 `check.sh all`，绿灯才调度后续，红灯停下问人（证据：演练记录）
- [ ] FR-9（异常）：设计级阻断 / spec 缺口 / 预演失败 / 合回冲突各自停下、报告连坐阻塞面与指路技能，无自动修复或自动解冲突（证据：演练记录）
- [ ] check.sh 零改动、零新增产物类型（依赖序图为会话内视图）（证据：git diff 范围）

**Blocked by：** 0012

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
