---
id: 0006
status: approved
need: 0004
round: 1
created: 2026-10-28
approved: 2026-10-28
---
# dev-execute：V 模型整 spec 编排运行技能

## 问题陈述

管线一次只推进一张工单：一张 5 张票的 spec 至少 10 次人交互（5 次逐票点名 + 5 次逐票合并确认）；票间 blocked-by 依赖顺序靠人看 frontier 清单自己排；票级红绿测试已有，但票间集成问题要等最后 dev-accept 才暴露；"整个 spec 执行到哪了"没有一屏视图，多会话并行时更不可见。（源：need 0004 四痛点，用户 2026-10-28 原话圈定）

## 方案

新增第 16 个流程技能 dev-execute（蓝图清单 20 → 21）。用户点名一张 approved spec，技能把"实现整个 spec"收缩为恰两次人交互（开工确认 + 合并确认）：

1. 对 spec 名下全部工票按 blocked-by 构建运行依赖顺序图（拓扑分层视图），展示并行机会与关键路径，请求开工确认。
2. 在独立 git worktree 的运行分支上执行运行：同层无依赖票并行实现（每票独立 worktree + 票分支，子代理执行 dev-implement 纪律全文）→ 逐票 dev-review 评审 → approved 票机械合回运行分支 → 每次合回后跑集成预演（V 模型右臂上行）。
3. 全部票 implemented 且预演绿 → 一次 PR（dev-ship 前半三节模板）→ 合并确认（单向门）→ 全部票 done → 清理 worktree → 出口报告指路手动 /dev-accept。

FR 承接 need 0004（全文见该 need）：FR-1 依赖序图与开工确认；FR-2 运行 worktree 隔离；FR-3 同层并行（每票一 worktree）；FR-4 机械合回 + 逐票集成预演；FR-5 多会话各跑各的 spec；FR-6 一次合并收口；FR-7 出口报告；FR-8 sdlc 总控"运行中 worktree"段；FR-9 异常流一律停下问人。

## 用户故事

- 作为仓库主人，我想点名一张 approved spec 就让它名下全部工票按依赖序自动实现并评审，以便不再逐票点名。
- 作为仓库主人，我想让同层无依赖的票在各自 worktree 并行实现，以便缩短整张 spec 的交付时间。
- 作为仓库主人，我想每票合回后就跑全量检查与集成预演，以便集成问题当场暴露而不是拖到验收。
- 作为仓库主人，我想整张 spec 只在开工与合并两处拍板、异常时才被打扰，以便人只管决策。
- 作为仓库主人，我想在总控一屏看到所有进行中的运行与各票状态，以便多会话并行时心中有序。

## 实现决策

- **技能形态**：SKILL.md 只留控制流（入口门禁 / 建图 / 分层调度 / 收口 / 异常），操作细则下沉 `references/run-mechanics.md` 按需加载（先例：sdlc 的 next-mode.md、dev-clarify 的方法论细则）。
- **分层与并行**：会话内按 blocked-by 拓扑分层（入度为零者同层），blocked-by 边是唯一串行约束；同层每票一个票 worktree + 票分支自运行分支切出，经子代理并行派发，子代理执行 dev-implement 纪律全文（并行子代理先例：dev-review 双轴）；默认并行度上限 4，超出分批，调用参数可覆盖。
- **评审范围契约**：dev-execute 调 dev-review 时带编排模式入参（显式工单编号 + diff 基线 = 运行分支）；编排模式下 dev-review 只评审入参工单、出口止于"报告 approved"，不自动调 dev-ship——其单票路径零改动。评审报告 `branch` 记票分支、`tickets` 记该票，pre-push 在运行分支按覆盖面机械校验。
- **合回与预演**：票 approved 后按依赖序机械合回运行分支（不设人工门）；每次合回后在运行分支跑 `check.sh all` 加 spec 验收场景中已有自动化承载的集成级测试；红灯停下问人，不自动重试。
- **收口**：按 dev-ship 前半三节模板生成一次 PR → `check.sh pre-push` → 合并确认一次问清（方式 + 是否 tag）→ 合并后全部票 done（[trivial] 状态提交，dev-ship 同款语义）→ 清理全部运行 worktree → 出口报告指路 /dev-accept，不自动串联。
- **状态与续接**：零新产物、check.sh 零改动（need 拍板）——票状态机 + 各 worktree 分支即运行状态；中断续接从 `git worktree list` + 票 frontmatter 与 ## Progress 推导，无运行级新状态。
- **worktree 约定**：运行与票 worktree 置于仓库同级约定目录，checkout 目录不入版本库（git 元数据自管理）；分支命名 `run/<spec-id>` 与 `run/<spec-id>/<ticket-id>`，供 `git worktree list` 机械发现。
- **跨会话总览**：sdlc 默认模式报告增加"运行中 worktree"段——`git worktree list` 发现 run/ 前缀分支，逐分支读票状态；sdlc 零写入铁律不变。
- **路由接线**：sdlc references/next-mode.md 加行——frontier 多张可开工票同属一张 approved spec 时问询"整 spec 编排（默认）/ 单票"，单票保留原语义。
- **治理顺序**：先改蓝图再写技能——新增 §11.17 dev-execute 规格、§8 决策点表补行、§7.2 引用矩阵补行（dev-execute 开工装载 ref-implementation / ref-testing / ref-git-commit）、§10.1 清单计数、修订记录。

## 测试决策

- seam：`check.sh phase / frontier / ticket / all / pre-push` 输出；`git worktree list`；票 frontmatter 状态机；dev-review 编排模式入参。
- 自测按蓝图 §13.2 六项：触发 / 拒绝 / 重入 / 衔接静态核验；行为实测在临时 git 仓库演练 worktree 创建 / 并行派发 / 合回 / 预演 / 清理全链（真实 git 行为为证）；产物校验不适用（技能文件非八类产物）。
- 既有先例：dev-implement 出口门禁行为实测（批 1）、dev-review 并行子代理（批 1）、L4 用例组的红绿纪律（批 3）。

## 验收场景

- [FR-1 | 工单级] Given approved spec 名下票含阻塞边与并行机会，When dev-execute 点名该 spec，Then 展示分层依赖序图（同层无依赖、层间 blocked-by 串行、标注关键路径）并请求开工确认；未确认不创建任何 worktree。
- [FR-1 | 工单级] Given spec 未 approved 或用户点名单张票，When 进入技能，Then 拒绝并分别指路 /dev-spec 或 /dev-implement，零写入。
- [FR-2 | 工单级] Given 开工确认通过，When 运行建立，Then `git worktree list` 可见运行 worktree 与 `run/<spec-id>` 分支，主工作区仍停留主分支且干净。
- [FR-3 | 工单级] Given 某层含至少 2 张无依赖票，When 层调度，Then 各票在各自票 worktree 并行实现（执行时间重叠），每票走完 dev-implement 红绿纪律；blocked-by 未满足的票未开工。
- [FR-4 | 工单级] Given 某票评审 approved，When 机械合回运行分支，Then 合回后运行分支自动跑 `check.sh all`，绿灯才调度后续；红灯停下问人。
- [FR-5 | 集成级] Given 两个会话各对一张 approved spec 发起运行，When 并行推进，Then 两运行各自 worktree 与分支独立、互不阻塞；先后合并时后者冲突即停在合并门问人。
- [FR-6 | 工单级] Given 全部票 implemented 且预演绿，When 收口，Then 生成一次三节正文 PR、`check.sh pre-push` 通过、合并经用户显式确认、合并后全部票 status: done、运行 worktree 全部清理；且逐票评审出口无任何 PR 准备动作。
- [FR-7 | 工单级] Given 收口完成，When 读出口报告，Then 含逐票终态清单与运行摘要并指路 /dev-accept，dev-accept 未被自动调用。
- [FR-8 | 集成级] Given 存在进行中的运行 worktree，When sdlc 默认模式盘点，Then 报告含"运行中 worktree"段（逐运行分支列出票状态），且 sdlc 全程零写入。
- [FR-9 | 工单级] Given 评审设计级阻断 / spec 缺口 / 预演失败 / 合回冲突任一发生，When 异常流触发，Then 运行停下、报告连坐阻塞面与指路技能，无自动修复或自动解冲突。

## 非目标

- 不改 dev-implement 单票纪律与 dev-ship 单票路径；dev-review 仅增加编排模式入参分支，默认行为不变。
- 不改 `.sdlc/check.sh`（need 0004 拍板）。
- 不做票级人工合并门：票合回运行分支是机械操作（拍板 D1）。
- 收口不自动调 dev-accept（拍板：用例圈定圈掉）。
- 不落盘运行依赖顺序图、不新增产物类型（拍板）。
- 不做跨 spec 联合编排：一次运行只处理点名 spec 名下的票（拍板）。
- 不做 git worktree 之外的隔离机制（容器、chroot 等）。

## 备注

- 分轮拍板（2026-10-28）：round 1 全量覆盖 9 FR——validate 孤儿 FR 规则要求单张 spec 场景覆盖 need 全部 FR，FR-3/FR-4（风险靶心）本就必含，FR-8 改动面小顺带完成；round 2 留给验收后残余风险。
- 术语"运行（run）""运行依赖顺序图"已在 GLOSSARY 项目术语章登记（need 0004 定稿时）。
- 本 spec 的蓝图同步面：§11.17（新规格节）、§8（决策点补行）、§7.2（引用矩阵补行）、§10.1（清单 20 → 21）、修订记录、sdlc references/next-mode.md（路由加行）——全部随实现工票落，先文档后技能。
