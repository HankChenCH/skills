---
name: dev-accept
description: 对工单已全部交付（done）的 spec 做集成验收——在集成后的代码上逐条运行 spec 的集成级验收场景、逐 FR 核销、跑全量检查，写 docs/acceptance/ 验收报告（场景结果/假设验证/残余风险/下一轮建议），通过则 spec 置 done、够条件时 need 置 fulfilled，不通过则指路 dev-fix 并问用户开不开下一轮。当用户要求验收、核销需求、跑集成场景、检查 spec 是否交付完成时使用——工单未全部 done 或没有 approved spec 时会在入口被拒绝并指路 dev-ship。
---

# dev-accept：集成验收

你只做一件事：把**工单全部 done 的一张 approved spec**变成**一份验收报告，spec 置 done（够条件时 need 置 fulfilled）**。
其余一切（修缺陷、改工单状态、动 spec 正文）一律拒绝。
拒绝不是失礼，是本技能的职责。

## 0. 前置：工作区校验

- 仓库根目录必须存在 `.sdlc/check.sh`（由 /setup-workspace 生成）。
- 不存在 → 停止，告诉用户"本仓库未接入开发流程，先运行 /setup-workspace"。

## 1. 入口门禁（全部通过才继续）

1. **重入判定先行**：docs/acceptance/ 已有 `spec: NNNN` 指向本 spec 的报告：
   `status: draft` → 续接不是重验，从没有结论的场景继续（见 §5）；已是
   `passed` / `rejected` 即终态，不重开报告，停下指路（passed → 已完成；
   rejected → 缺陷走 dev-fix，范围问题走下一轮）。
2. **确定 spec**。用户给了编号 → 用它；没给 → 运行 `.sdlc/check.sh phase` 找
   `approved` 且名下工单已全部 `done` 的 spec：恰一张直接用；多张列候选
   （编号、标题、round）请用户点名，禁止代挑；零张 → 停止转述缺什么：
   "spec NNNN 名下还有 implemented 的工单，先 /dev-ship 交付"，或"没有可验收的
   spec，新需求从 /dev-clarify 起步"。
3. **集成环境校验**：验收对象是集成后的代码；当前分支不是 BASE_REF（config.sh，
   通常 main）→ 停下请用户切回并同步，不在未合并的分支上验收。

## 2. 装载上下文

按顺序读：spec 全文（重点 `## 验收场景`）→ 关联 need 全文，若有（重点成功标准、
`## 假设与风险`）→ 该 spec 名下工单清单（逐一确认 done）。然后用三五句话向用户
复述：本轮验收哪几条集成级场景、覆盖哪些 FR、怎样算通过。有偏差，用户此刻
纠正的成本最低。

## 3. 验收纪律

- **只跑集成级场景**：`[FR-N | 集成级]` 场景逐条在集成后的代码上按 Given/When/Then 运行；工单级场景已由 dev-implement 在票内核销，不重跑。
- **证据必须是运行结果**：命令输出、返回数据、界面观察原样引用进报告；读代码推定"应该没问题"不算，说不出证据不许判过。
- **逐 FR 核销**：FR 核销 = 覆盖它的场景全过；某 FR 无场景 → 停下报告，spec 缺口（validate 本应拦截）不是验收能补的。
- **全量检查**：`.sdlc/check.sh all` 必须全绿；仓库没定义检查命令 → 本身就是发现，写进报告，不静默跳过。
- **假设验证**：逐条对照 need 的 `## 假设与风险`，写"验证通过 / 证伪 / 本轮未触发"。
- **失败只记录不修复**：场景失败 → 记录步骤、输出、线索，跑完其余再统一定级；验收现场不动代码。

## 4. 出口门禁（全部通过才算完）

1. **落盘前用 Skill 工具装载 ref-writing**，报告写法以它为准。
2. 用下面的固定模板落盘 `docs/acceptance/NNNN-slug.md`（id = 目录内最大号 +1，
   `round` = spec 的 round，slug 用 ASCII 小写短横线），跑 `.sdlc/check.sh validate`
   必须通过，再跑 `publish`。
3. **判定是机械的，不问人**：集成级场景全过且 `check.sh all` 全绿 → `status: passed`；任一场景没过或检查有红灯 → `status: rejected`，缺陷与范围问题如实写进报告。报告状态变更的提交用 `[trivial]`——流程状态落盘，不是绕门禁（dev-retro 可审计）。
4. **passed 出口**：spec frontmatter `status` 改 `done`、追加 `done: <今日>`，跑 validate + publish。随后处理 need（有 need 时）：成功标准逐条核销，且残余风险为空或逐条经用户显式接受 → need `status` 改 `fulfilled`、追加 `fulfilled: <今日>`；存在未核销标准或未接受风险 → **抛决策问题："开不开下一轮？"**，默认建议按残余风险性质给（建议开 → 下一轮从 /dev-spec 起步，round 递增，范围 = 残余风险；用户显式确认才开轮）。不开 → need 保持原状，说明差距，停。
5. **rejected 出口**：缺陷指路 dev-fix 开 fix 票，dev-fix 未实现 → 停下说明
   "缺陷清单已写进验收报告 NNNN，等 dev-fix 实现后开票"；范围问题确认已写进
   `## 下一轮建议`。停，不自动开轮。

```markdown
---
id: 0001
status: draft
spec: 0001
round: 1
created: <date>
---
# 0001: <一句话概括验收对象>
## 场景结果
（逐条：场景 / FR / 证据（命令与输出）/ 结论：过 | 挂）
## 假设验证
（逐条：need 假设 / 验证结果：验证通过 | 证伪 | 本轮未触发）
## 残余风险
（无就写"无"；有则逐条：风险 / 影响 / 是否阻塞）
## 下一轮建议
（范围问题、值得再投入的方向；无就写"无"）
```

## 5. 中断与交接

会话可能在任何时刻结束。停下前（等用户决策、上下文将尽、被卡住）：先把报告
以 `status: draft` 落盘——已跑场景的结果与证据全部写入，未跑的标"未执行"。
重入从 §1.1 续接：盘上的 draft 就是进度，已出结论的场景不重跑。状态在盘上，
不在对话里。

## 禁止事项（任何时候）

- 改工单的 status（工单生命周期归 dev-ship），或改 spec 正文——验收场景与实现
  不符是 rejected 的证据，不是现场改场景的理由。
- 场景没跑就凭读代码写"通过"。
- 在验收中顺手修缺陷——修是 dev-fix / 新工单的事。
- 跳过 `.sdlc/check.sh all`，或检查有红灯时写出"全绿"。
- 为通过而弱化结论、删失败场景。
- 未满足末轮条件就把 need 置 fulfilled——沉默或"都行"不算接受风险。
