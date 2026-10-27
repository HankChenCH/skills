# 实现 dev-spec 技能（蓝图 §11.4）

## 依据

- 蓝图 `docs/sdlc-skills-blueprint.md`（v1.6，唯一设计真相源）：§11.4 dev-spec 规格、§6.3 spec 固定模板（须内嵌进技能）、§8 出口契约（publish → 进 dev-plan；必问点 = spec 批准 + MVP 分轮范围）、§13.1 文件规范、§13.2 自测清单。
- 结构与文风参照已入库的 `skills/dev-implement/SKILL.md`（83 行）与 `skills/dev-review/SKILL.md`：frontmatter 仅 name+description、开头拒绝宣言、§0 工作区校验 → §1 入口门禁 → §2 装载上下文 → §3 纪律 → §4 出口门禁 → §5 中断交接 → 禁止事项。
- 机械校验已对照 `.sdlc/check.sh` 源码：spec 必填八节、`[FR-N | 工单级/集成级]` 标签、孤儿 FR 检测、`publish <file>` 语义。

## 改动 1：新建 `skills/dev-spec/SKILL.md`（约 88 行，含模板）

```markdown
---
name: dev-spec
description: 把 need 或对话中的需求整理成 docs/specs/ 的规格文档——固定模板、带验证层级的验收场景、与用户定 MVP 分轮范围。入口校验工作区与上游 need（开放问题必须清零），出口过 check.sh validate 并经用户显式批准后置 approved、publish、转入 dev-plan。当用户要求写 spec、起草规格、把需求定成规格、开下一轮时使用——缺 need 且对话信息不足会在入口被引导至 dev-clarify。
---

# dev-spec：把需求定成规格

你只做一件事：把**一份 need（或对话中的需求）**变成**一张过校验、获用户批准的 spec**。
其余一切（拆工单、写代码、评审实现）一律拒绝。
拒绝不是失礼，是本技能的职责。

## 0. 前置：工作区校验

- 仓库根目录必须存在 `.sdlc/check.sh`（由 /setup-workspace 生成）。
- 不存在 → 停止，告诉用户"本仓库未接入开发流程，先运行 /setup-workspace"。

## 1. 入口门禁（全部通过才继续）

1. **重入**：docs/specs/ 已有 `status: draft` 的 spec 且用户要继续（含 approved 的 spec
   被实现退回修订的情形）→ 直接从 §3 续作，不重新起草（见 §5）。
2. **确定输入**：
   - 用户给了 need 编号 → 读其全文，读不到就停下与用户确认编号。
     `## 开放问题` 不为空 → **停止**："need NNNN 还有开放问题，先 /dev-clarify 清零。"
     这是上游的出口门禁。
   - 没有 need → 先建议跑 /dev-clarify；用户明确要从当前对话直接综合 → 允许，
     但须在 spec `## 备注` 注明来源（"本 spec 由对话综合，无对应 need"）。
3. **确定轮次**：同一 need 名下已有 spec → 本次是新的一轮，`round` = 已有最大轮次 + 1，
   范围只覆盖上一轮验收后的残余风险；全新需求 round = 1。

## 2. 装载上下文

按顺序读：need 全文（若有）→ docs/adr/ 中相关 ADR → GLOSSARY.md →
一张同类既有 spec（校准粒度）。落盘前用 Skill 工具装载 ref-writing，一次只载一个。
然后用三五句话向用户复述：要解决什么问题、本轮打算覆盖什么、打算怎么验证。
有偏差，用户此刻纠正的成本最低。

## 3. 起草纪律

- **探索先行**：动笔前探索代码库，摸清现状与方案的落点；写进 spec 的是结论，不是漫游记录。
- **固定模板**：一律用下面的模板落盘 `docs/specs/NNNN-slug.md`
  （id = 目录内最大号 +1，slug 用 ASCII 小写短横线）：

```markdown
---
id: 0001
status: draft
need: 0003          # 可选
round: 1
created: <date>
---
# <标题>

## 问题陈述             ← 用户视角的问题
## 方案                 ← 用户视角的解决方案
## 用户故事             ← 编号长列表："作为<角色>，我想要<功能>，以便<收益>"
## 实现决策             ← 模块/接口/schema/API 契约；不含具体文件路径与代码。
                         原型产出的关键片段（状态机、schema、类型形状）可内嵌并注明来源
## 测试决策             ← seam 清单；既有同类测试作为先例
## 验收场景
- [FR-1 | 工单级] Given … When … Then …
- [FR-3 | 集成级] Given … When … Then …   ← dev-accept 的运行清单
## 非目标
## 备注
```

- **词汇与决策**：用 GLOSSARY 词汇；与相关 ADR 冲突时停下来问用户，不擅自绕开。
  实现决策不含具体文件路径与代码。
- **验收场景**：每条带 `[FR-N | 工单级]` 或 `[FR-N | 集成级]` 标签；有 need 时必须覆盖其
  全部 FR，缺一条 validate 即报孤儿 FR。集成级 = 拆不进单票、必须集成后验证的场景。
- **分轮决策（必须问人）**：读 need 的 `## 假设与风险`（按"错了代价 × 不确定度"排序），
  向用户提议本轮范围：round 1 = 风险最大的最小可交付范围（MVP）。用户认可后才定稿。

## 4. 出口门禁（全部通过才算完）

1. 运行 `.sdlc/check.sh validate docs/specs/NNNN-slug.md`，必须通过；不过 → 修复后重跑。
2. 向用户完整念一遍：问题陈述、方案、本轮范围、验收场景清单，请求批准。
   **批准是决策点，必须用户显式确认**，不接受沉默或"都行"。要改 → 回 §3，改完重走本节。
3. 批准 → frontmatter `status` 改 `approved`、追加 `approved: <今日>`，
   运行 `.sdlc/check.sh publish docs/specs/NNNN-slug.md`。
4. **立即用 Skill 工具调用 dev-plan**（把 spec 拆成垂直切片工单）。dev-plan 未实现 →
   停下说明"spec NNNN 已 approved，下一步拆工单"，建议运行 /sdlc 查看去向；
   不要自己动手拆工单。

## 5. 中断与交接

会话可能在任何时刻结束。凡是停下（等用户决策、上下文将尽、被卡住）：
先把 spec 以 `status: draft` 落盘（已落盘的先更新内容），再停。
重入时从 §1 的重入分支续接——盘上的 draft 就是进度。状态在盘上，不在对话里。

## 禁止事项（任何时候）

- 拆工单、排依赖、估工作量——那是 dev-plan 的事。
- 用户未显式批准就把 `status` 写成 `approved`。
- 跳过 validate，或为让它通过而删改验收场景。
- 在实现决策里写具体文件路径与代码。
- 替用户定分轮范围，或把"默认 round 1"当作不必问人。
```

## 改动 2：安装

`ln -s ~/Desktop/workspace/skills/skills/dev-spec ~/.zcode/skills/dev-spec`（与 dev-implement 等 8 个已装技能同法）。

## 改动 3：蓝图 §10.2 标注完成

按 §13.3 治理要求，在 §10.2 批 1 第 4 项 dev-spec 后标注 ✅ 2026-10-27（格式对齐既有条目）。蓝图内容无设计变更，版本停留 v1.6。

## 自测（§13.2 五项）

1. **触发**：用 3 句话术（"把这个需求整理成 spec"、"帮我写个规格文档"、"开下一轮"）核对 description 覆盖，含直连请求命中。
2. **门禁拒绝路径**：在 docs/specs/ 建临时 `9999-selftest-scratch.md`——先按模板写全跑 `check.sh validate`（须通过），再故意缺节/缺场景标签复跑（须报孤儿 FR/缺节错误），确认技能引用的报错与脚本实际输出一致。
3. **产物校验**：即上一步的 validate 往返。
4. **重入**：核对 §1 重入分支与 §5 交接话术能从盘上 draft 续接（纸上推演）。
5. **衔接**：核对出口三形态——自动调 dev-plan（未实现则拦停说明）、两个必问点（批准、分轮）落位。
   测试后删除临时文件，`git status` 确认工作区干净。

## 提交

`[trivial] 入库 dev-spec 流程技能`——沿 dev-implement 入库先例（d514cd8）：设计已由蓝图 v1.6 批准（§11.4 即批准的 spec），本次为按图施工 + §10.2 一行日期标注，走 trivial 豁免（retro 审计兜底）。提交须通过 check.sh commit-msg 钩子。

## 执行顺序

写 SKILL.md → 建符号链接 → 蓝图 §10.2 标注 → 自测（validate 往返）→ 清理临时文件 → 提交。
