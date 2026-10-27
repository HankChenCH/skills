---
name: dev-design
description: 把已批准（approved）的 spec 变成技术方案——起草 design（模块划分/数据流/seam 清单）并为架构级决策逐条写 ADR，经用户批准后置 approved，建议进 dev-plan 或提醒实现遵守 seam。仅当存在设计级问题（决策难逆转、无上下文会困惑、真实权衡，或模块划分、数据流非显而易见）时才值得做，简单 spec 会在入口被亮牌拒绝并指路 dev-plan。当用户要求技术设计、方案设计、架构决策、定义模块边界时使用——spec 未批准时会在入口被拒绝并指路 dev-spec。
---

# dev-design：技术方案与 ADR

你只做一件事：把**一张 approved 的 spec**变成**approved 的技术方案（design + ADR）**。
其余一切（改 spec 正文、拆工单、写实现代码、给显而易见的选择硬凑 ADR）一律拒绝。
拒绝不是失礼，是本技能的职责。

## 0. 前置：工作区校验

- 仓库根目录必须存在 `.sdlc/check.sh`（由 /setup-workspace 生成）。
- 不存在 → 停止，告诉用户"本仓库未接入开发流程，先运行 /setup-workspace"。

## 1. 入口门禁（全部通过才继续）

1. **重入判定先行**：docs/designs/ 已有 `spec: NNNN` 指向本 spec 的 design：
   `status: draft` → 续接不是重起草（见 §5）；`status: approved` 即终态，不重开。
2. **确定 spec**。用户给了编号 → 用它；没给 → 运行 `.sdlc/check.sh phase` 找
   `approved` 的 spec：恰一张直接用；多张列候选（编号、标题）请用户点名，
   禁止代挑；零张 → 停止转述："没有 approved 的 spec，先 /dev-spec 完成批准"。
3. **值得做判据（亮牌，可拒绝）**：ADR 三条件（难逆转、无上下文会困惑、真实
   权衡）命中任一，或模块划分 / 数据流非显而易见 → 做；都不命中 → 亮牌"这张
   spec 没有设计级问题，直接 /dev-plan 更省"，用户坚持才做。design 是可选产物。

## 2. 装载上下文

按顺序读：spec 全文（重点 `## 实现决策`、`## 测试决策`、`## 验收场景`）→
docs/adr/ 既有 ADR（新决策不得与之无声冲突）→ CODING_STANDARDS.md 与
docs/standards/ 中架构相关条目。然后用三五句话向用户复述：方案要定哪几个
决策、模块边界划在哪。有偏差，用户此刻纠正的成本最低。

## 3. 设计纪律

- **模块深、接口窄**：每模块写三件事——职责 / 对外接口 / 依赖方向；
  依赖单向，不成环。
- **数据流走一条典型路径**：从入口到存储，写清状态与所有权。
- **seam 清单是 spec 测试决策的细化**：每条写"在哪测、测什么"；与 spec
  冲突 → 停下报告，那是 spec 缺口，回 /dev-spec（这是回路，不是失败）。
- **ADR 三条件门禁**：只为难逆转、无上下文会困惑、真实权衡的决策写 ADR；
  显而易见的选择写进 design 正文即可，不凑数。
- **不含具体文件路径与代码**：design 是方案层，代码与路径归实现。

## 4. 出口门禁（全部通过才算完）

1. 落盘前用 Skill 工具装载 ref-writing，方案写法以它为准。
2. 用 design 模板落盘 `docs/designs/NNNN-slug.md`，跑 `.sdlc/check.sh validate`
   必须通过，再跑 `publish`。提交留痕用 `[trivial]`（流程产物落盘）。
3. 命中三条件的决策逐条按 adr 模板落盘 `docs/adr/NNNN-slug.md`（`status:
   accepted`）；新决策取代旧 ADR → 旧的置 `superseded` 并追加日期，不删除。
4. **抛决策问题："方案批准吗？"** 展示模块划分与关键取舍，给默认建议；
   沉默不算批准。批准 → design `status: approved`、追加 `approved: <今日>`，
   跑 validate + publish；不批准 → 意见写回 draft 续改。
5. **出口**：spec 名下无工单 → 建议进 /dev-plan；已有工单 → 提醒实现遵守
   seam 清单。管线门禁不含 design——它的约束力靠评审与实现纪律。

## 5. 中断与交接

会话可能在任何时刻结束。停下前先把 design 以 `status: draft` 落盘——已定的
决策逐节写入，未定的标"开放"。重入从 §1.1 续接：盘上的 draft 就是进度，
已 approved 的 design 不重开。状态在盘上，不在对话里。

## design 模板（固定）

```markdown
---
id: 0001
spec: 0001
status: draft
created: <date>
---
# <标题：一句话方案>
## 模块划分   （逐模块：职责 / 对外接口 / 依赖方向）
## 数据流     （典型路径：入口 → 处理 → 存储；状态与所有权）
## seam 清单  （逐条：在哪测 / 测什么；= spec 测试决策的细化）
## ADR 索引   （产生的 ADR + 一句话结论；无则写"无"）
```

## adr 模板（固定）

```markdown
---
id: 0001
status: accepted
created: <date>
---
# 0001: <决策一句话>
## 背景   （为什么现在必须决策；不决策的代价）
## 决策   （选了什么，放弃了什么及理由）
## 后果   （正向 / 负向 / 对后续实现的约束）
```

## 禁止事项（任何时候）

- 改 spec 正文——设计暴露 spec 缺口是回 /dev-spec 的证据，不是现场改的理由。
- 为显而易见的选择凑 ADR，或跳过既有 ADR 检查导致决策无声冲突。
- 在 design 里写具体文件路径与代码。
- 未经用户显式批准就把 design 置 approved；沉默或"都行"不算批准。
