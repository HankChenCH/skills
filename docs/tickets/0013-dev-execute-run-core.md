---
id: 0013
type: feature
spec: 0006
status: implemented
blocked-by: [0012]
created: 2026-10-28
---
# 0013: dev-execute 运行主体（建图 / worktree / 并行 / 合回 / 预演）

**做什么：** 新增 `skills/dev-execute/`（SKILL.md 控制流 + references/run-mechanics.md 操作细则）：入口门禁（spec approved；点名单票或未批准拒绝并指路）、对点名 spec 名下全部票按 blocked-by 拓扑分层建运行依赖顺序图并请求开工确认、运行分支（`run/<spec-id>`）与票分支（`run/<spec-id>-t<ticket-id>`，spec 0006 round 2 修订命名）与运行/票 worktree 建立、同层每票子代理并行派发（dev-implement 纪律全文，并行度默认上限 4、参数可覆盖）、经 dev-review 编排模式（票 0012 契约）逐票评审、approved 票按依赖序机械合回运行分支、每次合回后预演（`check.sh all` + 已有自动化承载的集成级测试）、四种异常流（设计级阻断 / spec 缺口 / 预演失败 / 合回冲突）停下问人带连坐阻塞面与指路、中断续接从 `git worktree list` + 票状态推导。蓝图 §11.17 分支命名行随本票同步修订（spec round 2 同步面）。收口（PR / 合并 / 票 done / 清理）归票 0014。

**验收标准：**
- [x] FR-1（图+确认）：点名 approved spec 展示分层依赖序图（同层无依赖、层间 blocked-by 串行、标注关键路径）并请求开工确认；未确认不创建任何 worktree（证据：临时仓库演练记录 /tmp/devx-drill/records/fr1-graph.txt：三层图+关键路径 0101→0103→0105，worktree list 仅主区、status 0 行）
- [x] FR-1（拒绝）：spec 未 approved 或点名单张票 → 拒绝并分别指路 /dev-spec、/dev-implement，零写入（证据：fr1-reject.txt：draft → check.sh ticket exit 1 指路 /dev-spec，git status 0 行、worktree 仅主区；点单票与拒绝开工同录零写入）
- [x] FR-2（隔离）：运行建立后 `git worktree list` 可见运行 worktree 与 `run/<spec-id>` 分支，主工作区停留主分支且干净（证据：fr2-run-side.txt：list 增 run-0006 条目，主区 main + status 0 行，worktree 内 check.sh 可用）
- [x] FR-2（票分支共存）：运行分支 `run/<spec-id>` 已存在时逐票建 `run/<spec-id>-t<ticket-id>` 成功、无 ref 锁定错误，`git worktree list` 下运行内全部分支保持 `run/` 单前缀（证据：fr2-ticket-coexist.txt：run/0006 与 -t0101/-t0102/-t0103 全共存，`run/` 单前缀；反例即 round 1 嵌套命名的 D/F fatal）
- [x] FR-3（并行）：某层 ≥2 张无依赖票在各自票 worktree 并行实现（执行时间重叠），每票走完 dev-implement 红绿纪律；blocked-by 未满足的票未开工（证据：fr3-parallel.txt + fr3-parallel-times.txt：两票同窗 1793162120–123 执行重叠、worktree 互不可见、run 分支合回前无两票内容；blocked 票 0103 无 worktree 未派发）
- [x] FR-4（合回+预演）：approved 票机械合回后运行分支自动跑 `check.sh all`，绿灯才调度后续，红灯停下问人（证据：fr4-merge-rehearsal.txt：真 hook 下 [#0101]/[#0102] 合回放行、预演绿才续；CHECK_TEST=false → exit 1 红，停不重试，解除后续跑）
- [x] FR-9（异常）：设计级阻断 / spec 缺口 / 预演失败 / 合回冲突各自停下、报告连坐阻塞面与指路技能，无自动修复或自动解冲突（证据：fr4-merge-rehearsal.txt——预演红灯停、合回 CONFLICT 停+abort 还原+未合回判定成立；spec 缺口流经本票首轮真实执行：停机带连坐面指路 /dev-spec（Progress 首轮记录）；设计级阻断为评审编排流规则，SKILL.md §7 固化（静态核验））
- [x] check.sh 零改动、零新增产物类型（依赖序图为会话内视图）（证据：git diff 范围——两轮提交均未触 .sdlc/check.sh，未新增 docs/ 产物目录）
- [x] 蓝图 §11.17 分支命名行改为运行分支 `run/<spec-id>`、票分支 `run/<spec-id>-t<ticket-id>`，与 spec 0006 round 2 一致（证据：git diff——§11.17 状态与续接行改写 + v1.17 修订记录补行）

**Blocked by：** 0012

## Progress
- 已做：FR-1 全链演练通过（分层图/关键路径/done 票图外/两路拒绝零写入）；SKILL.md 控制流全文 + run-mechanics §1–3/§5–6（均实跑证实）落盘。演练记录 /tmp/devx-drill/records/（fr1-graph / fr1-reject / fr1-done-variant / fr2-run-side / fr4-rehearsal-probe / mechanics-verify）。
- 卡点（spec 0006 缺口，停机待修订）：票分支命名 `run/<spec-id>/<ticket-id>` 与运行分支 `run/<spec-id>` 在 git ref 名空间 D/F 冲突不可共存（`fatal: cannot lock ref 'refs/heads/run/0006/0012': 'refs/heads/run/0006' exists`），FR-2 票侧 / FR-3 / FR-4 / FR-9 合回冲突无法按 spec 实现。
- 下一步：/dev-spec round 2 修订命名（推荐 `run/<spec-id>-t<NNNN>`，已实测与 `run/<spec-id>` 共存）→ 重入 0013 补 run-mechanics §4/§7 并完成余下演练（并行派发/合回/冲突/预演红绿）。
- 状态保持 in-progress；未到出口，未调 dev-review。
- 2026-10-28：spec 0006 round 2 approved（票分支 `run/<spec-id>-t<ticket-id>`，实测共存）→ 上条卡点解除；验收标准增 FR-2 共存与蓝图同步两条，按上文"下一步"重入。
- 重入完成：run-mechanics §1/§4/§7 补齐（七章全实证，含两条机制发现——合回放行前提=状态翻转随票分支提交（hook 时点工作树已含合并结果，正反两向实测）；frontmatter 读取顺序=运行/票 worktree 为准、主工作区旧态）；蓝图 §11.17 命名行同步 + v1.17 修订记录（版本行补正 v1.16 漏更）。演练记录增至八份（新增 fr2-ticket-coexist / fr3-parallel）。
- 出口：九条验收全勾（证据见各条）；`check.sh all` 绿（本仓库未定义 CHECK_* 命令，警告如实上报表户）；收口链缺口=SKILL.md §5.5 出口停在"运行全绿报告"待 0014 接入——评审咬合点。
