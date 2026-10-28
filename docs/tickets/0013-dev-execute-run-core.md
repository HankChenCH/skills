---
id: 0013
type: feature
spec: 0006
status: in-progress
blocked-by: [0012]
created: 2026-10-28
---
# 0013: dev-execute 运行主体（建图 / worktree / 并行 / 合回 / 预演）

**做什么：** 新增 `skills/dev-execute/`（SKILL.md 控制流 + references/run-mechanics.md 操作细则）：入口门禁（spec approved；点名单票或未批准拒绝并指路）、对点名 spec 名下全部票按 blocked-by 拓扑分层建运行依赖顺序图并请求开工确认、运行分支（`run/<spec-id>`）与票分支（`run/<spec-id>-t<ticket-id>`，spec 0006 round 2 修订命名）与运行/票 worktree 建立、同层每票子代理并行派发（dev-implement 纪律全文，并行度默认上限 4、参数可覆盖）、经 dev-review 编排模式（票 0012 契约）逐票评审、approved 票按依赖序机械合回运行分支、每次合回后预演（`check.sh all` + 已有自动化承载的集成级测试）、四种异常流（设计级阻断 / spec 缺口 / 预演失败 / 合回冲突）停下问人带连坐阻塞面与指路、中断续接从 `git worktree list` + 票状态推导。蓝图 §11.17 分支命名行随本票同步修订（spec round 2 同步面）。收口（PR / 合并 / 票 done / 清理）归票 0014。

**验收标准：**
- [ ] FR-1（图+确认）：点名 approved spec 展示分层依赖序图（同层无依赖、层间 blocked-by 串行、标注关键路径）并请求开工确认；未确认不创建任何 worktree（证据：临时仓库演练记录）
- [ ] FR-1（拒绝）：spec 未 approved 或点名单张票 → 拒绝并分别指路 /dev-spec、/dev-implement，零写入（证据：演练记录）
- [ ] FR-2（隔离）：运行建立后 `git worktree list` 可见运行 worktree 与 `run/<spec-id>` 分支，主工作区停留主分支且干净（证据：演练记录）
- [ ] FR-2（票分支共存）：运行分支 `run/<spec-id>` 已存在时逐票建 `run/<spec-id>-t<ticket-id>` 成功、无 ref 锁定错误，`git worktree list` 下运行内全部分支保持 `run/` 单前缀（证据：演练记录）
- [ ] FR-3（并行）：某层 ≥2 张无依赖票在各自票 worktree 并行实现（执行时间重叠），每票走完 dev-implement 红绿纪律；blocked-by 未满足的票未开工（证据：演练记录）
- [ ] FR-4（合回+预演）：approved 票机械合回后运行分支自动跑 `check.sh all`，绿灯才调度后续，红灯停下问人（证据：演练记录）
- [ ] FR-9（异常）：设计级阻断 / spec 缺口 / 预演失败 / 合回冲突各自停下、报告连坐阻塞面与指路技能，无自动修复或自动解冲突（证据：演练记录）
- [ ] check.sh 零改动、零新增产物类型（依赖序图为会话内视图）（证据：git diff 范围）
- [ ] 蓝图 §11.17 分支命名行改为运行分支 `run/<spec-id>`、票分支 `run/<spec-id>-t<ticket-id>`，与 spec 0006 round 2 一致（证据：git diff）

**Blocked by：** 0012

## Progress
- 已做：FR-1 全链演练通过（分层图/关键路径/done 票图外/两路拒绝零写入）；SKILL.md 控制流全文 + run-mechanics §1–3/§5–6（均实跑证实）落盘。演练记录 /tmp/devx-drill/records/（fr1-graph / fr1-reject / fr1-done-variant / fr2-run-side / fr4-rehearsal-probe / mechanics-verify）。
- 卡点（spec 0006 缺口，停机待修订）：票分支命名 `run/<spec-id>/<ticket-id>` 与运行分支 `run/<spec-id>` 在 git ref 名空间 D/F 冲突不可共存（`fatal: cannot lock ref 'refs/heads/run/0006/0012': 'refs/heads/run/0006' exists`），FR-2 票侧 / FR-3 / FR-4 / FR-9 合回冲突无法按 spec 实现。
- 下一步：/dev-spec round 2 修订命名（推荐 `run/<spec-id>-t<NNNN>`，已实测与 `run/<spec-id>` 共存）→ 重入 0013 补 run-mechanics §4/§7 并完成余下演练（并行派发/合回/冲突/预演红绿）。
- 状态保持 in-progress；未到出口，未调 dev-review。
- 2026-10-28：spec 0006 round 2 approved（票分支 `run/<spec-id>-t<ticket-id>`，实测共存）→ 上条卡点解除；验收标准增 FR-2 共存与蓝图同步两条，按上文"下一步"重入。
