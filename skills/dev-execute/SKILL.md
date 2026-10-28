---
name: dev-execute
description: 整 spec 编排运行——点名一张 approved spec，把名下全部工票按 blocked-by 依赖序图自动实现（同层票独立 worktree 经子代理并行，子代理执行 dev-implement 纪律）、逐票编排评审、机械合回运行分支并逐票预演，全绿后转收口。当用户要求"把 spec NNNN 整个跑完""编排执行这张 spec""一次跑完整张 spec 的全部工票"时使用——spec 未 approved 或点名单张工票会在入口被拒绝并分别指路 dev-spec / dev-implement。
---

# dev-execute：整 spec 编排运行

你只做一件事：把**一张已批准 spec 名下的全部工票**变成**按依赖序实现、评审、合回并预演通过的运行**。
其余一切（spec 未 approved、点名单张工票、范围外话题）一律拒绝。
拒绝不是失礼，是本技能的职责。

## 0. 前置：工作区校验

- 仓库根目录必须存在 `.sdlc/check.sh`（由 /setup-workspace 生成）。
- 不存在 → 停止："本仓库未接入开发流程，先运行 /setup-workspace"，不做任何编排。

## 1. 入口门禁（全部通过才继续）

1. **确定编排对象**。入参必须是**一张 spec**（编号或路径）。用户点的是单张工票 →
   拒绝："单票实现请用 /dev-implement"；没点名 → 运行 `.sdlc/check.sh phase` 列出
   全部 `status: approved` 的 spec 供用户选择，禁止猜测或自行挑一张。
2. **校验 spec**：存在且 `status: approved`。仍是 draft → 拒绝并指路
   "/dev-spec 完成批准"；已 done → 拒绝并指路 /dev-accept。名下没有任何工票 →
   拒绝并指路 /dev-plan。名下工票已全部 done → 拒绝："无可运行工票，走 /dev-accept"。
3. **重入判定**：`git worktree list` 已发现该 spec 的运行分支 worktree → 运行已在
   进行中，跳过建图与开工确认，直接进 §5 续接（推导方法见 run-mechanics §5）。

## 2. 装载上下文

按顺序读：spec 全文 → 名下每张工票全文 → GLOSSARY.md（术语"运行""运行依赖顺序图"）
→ CODING_STANDARDS.md。再用 Skill 工具装载三个参考：ref-implementation、
ref-testing、ref-git-commit——它们随派发传给实现子代理，合回信息规范也以
ref-git-commit 为准。

然后用三五句话向用户复述：这张 spec 交付什么、共几张票几层并行、打算怎么推进。
有偏差，用户此刻纠正的成本最低。

## 3. 建运行依赖顺序图，请求开工确认

1. 对 spec 名下全部工票按 blocked-by 拓扑分层建图（算法与辅助命令见
   run-mechanics §2）：同层票无依赖可并行，层间 blocked-by 边串行；标注关键路径
   （最长票链）；开工前已 done 的票列图外"已完成"；被 spec 外工票阻塞且未完成的票
   标注"外部阻塞"，若因此全图无法开工 → 停下报告，不进入运行。
2. 向用户展示分层图，并请求**开工确认**：将建立运行分支与运行 worktree、每票一个
   票分支与票 worktree（命名与放置约定见 run-mechanics §1，命令见 §3/§4）、
   同层并行派发。决策点必须问人，带默认建议（建议：按图开工）。
3. **未确认不创建任何 worktree**。用户拒绝或要求调整 → 中止，零写入退出；
   要调整分层或拆票 → 指路 /dev-plan（编排不拆票）。

## 4. 运行建立

- 建运行分支与运行 worktree（命令与核对清单见 run-mechanics §3）。
- 建立后核对：`git worktree list` 出现运行 worktree 与运行分支；主工作区仍停留
  主分支且 `git status` 干净。任一不满足 → 停下报告，不派发任何票。

## 5. 分层调度：实现 → 评审 → 合回 → 预演

逐层推进，层内并行、层间串行：

1. **派发实现**：当前层每票从运行分支切出票分支与票 worktree（细则见
   run-mechanics §4），每票派一个**子代理并行实现**，子代理执行 dev-implement
   纪律全文（红绿循环、只做工单内的事、Progress 交接）。并行度默认上限 4，
   调用参数可覆盖，超出分批。blocked-by 未满足的票不派发。
2. **编排评审**：票 implemented 后，在该票 worktree 内用 Skill 工具调 dev-review，
   **编排模式入参**："编排评审：工单 <NNNN>，基线 <运行分支>"。评审出口止于
   approved——编排模式下它不准备 PR、不调 dev-ship。有阻断 → 按评审的决策问题
   处置（机械问题修后重审，不停运行；设计级阻断 → §7 异常流）。
3. **机械合回**：approved 票按依赖序合回运行分支（不设人工门；合回信息按
   ref-git-commit 的合并规则带 [#NNNN]，细则见 run-mechanics §7）。合回冲突 →
   §7 异常流。
4. **预演**：每次合回后在运行 worktree 跑 `check.sh all`，加上 spec 验收场景中
   已有自动化承载的集成级测试（细则见 run-mechanics §6）。绿灯才调度后续票与层；
   红灯 → §7 异常流。
5. 当前层全部票合回且预演绿 → 进入下一层。全部票 implemented 且预演绿 →
   运行全绿，出**运行摘要报告**（逐票终态 + 预演记录）并停：收口链（一次 PR、
   合并确认、票 done、清理）不在本技能内，待其接入后此处自动转收口。

## 6. 中断与续接

运行状态在盘上，不在对话里：票 frontmatter 状态机 + 各 worktree 分支即全部状态。
凡停下（异常流、用户喊停、上下文将尽）：先把下一步写进当前在办票的 `## Progress`，
保持票状态，再停。重入时按 §1.3 判定，从 `git worktree list` + 票状态推导断点
（方法见 run-mechanics §5）：已合回的不重做，在办票续接其 Progress，未开工票照图
派发。fix 票插入或票集变化 → 重算本 spec 的图再续。

## 7. 异常流（一律停下问人，报告连坐阻塞面与指路）

四种异常都执行同一套停机动作：**停下、报告连坐阻塞面（该票下游全部未合回工票
及其状态）、指路技能、等用户决策**。不自动重试、不自动解冲突、不自动改 spec。

- **设计级阻断**（评审发现接口/边界级问题）→ 指路 /dev-design 与工票作者定方案；
  方案落定后受影响票重开。评审的机械问题不在此列——修后重审，运行不停。
- **spec 缺口**（实现中发现 spec 错漏）→ 指路 /dev-spec 修订；修订产出的新票/
  改票并入运行，重算图后续跑。
- **预演失败** → 指路 /dev-fix 开 fix 票；fix 票并入本 spec 图，重算后续跑。
- **合回冲突** → 问人怎么解；可建议 expand–contract 拆票回 /dev-plan。绝不自动
  解冲突。

## 8. 边界（任何时候）

- 编排不拆票：拆分归 /dev-plan；一次运行只处理点名 spec 名下的票。
- 不改 dev-implement 纪律、dev-review 单票路径与 `.sdlc/check.sh`。
- 运行依赖顺序图是会话内视图：不落盘、不新增产物类型，进度由票状态机表达。
- 收口（PR / 合并确认 / 票 done / 清理 worktree）是运行末的独立环节，不经本票
  派发链触发。

## 禁止事项（任何时候）

- 未获开工确认就创建任何 worktree 或分支。
- spec 未 approved、点名单张工票时"顺手"开跑。
- 跳过预演或对红灯自动重试；对合回冲突自动解冲突。
- 替 dev-review 做评审结论，或替实现子代理写实现。
- 在主工作区直接实现任何票——票实现只发生在票 worktree。
