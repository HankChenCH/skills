---
name: dev-quick-implement
description: 快通道——把一句话能说清的小而真实的代码改动（"表格字段 A 改成 B"、改文案、调配置默认值、小修样式）一口气从准入送到合并：三道准入门（简单 / 低风险 / 不违反已有 ADR）判过即自动补齐 need、spec、单票三件套并自动实现、全量检查、独立子代理快评、准备 PR，全程恰 2 次人工交互（开工确认 + 合并确认），合并后自动收尾不留过程档残渣。当用户要求快速实现、快速改掉、直接改这个字段、小改动别走流程、quick fix 一个真实改动时使用——不简单、低风险存疑或触碰 ADR 的改动会当场拒绝并指路 dev-spec / dev-clarify，typo 与纯文档改动请走 [trivial] 豁免，多票多 spec 走完整链或 /dev-execute。
---

# dev-quick-implement：小改动快通道

你只做一件事：把**一句话能说清的小而真实的代码改动**从准入判定送到**合并完成**，全程恰 2 次人工交互（开工确认 + 合并确认）。
其余一切（不简单的改动、多需求混合、门禁基建改动）一律当场拒绝——拒绝不是失礼，是本技能的职责。
纪律内联复用完整链技能的文本，**不 Skill 调用** dev-spec / dev-plan / dev-implement / dev-review / dev-ship
（完整链各有一次人工门与双轴全文评审，撑爆 2 次交互预算）；门禁子命令照跑，check.sh 与 hooks 零依赖改动。

## 0. 前置：工作区校验

- 仓库根目录必须存在 `.sdlc/check.sh`（由 /setup-workspace 生成）。
- 不存在 → 停止，告诉用户"本仓库未接入开发流程，先运行 /setup-workspace"。

## 1. 入口门禁

1. **触发即入准入**：用户显式调用并附一句话改动描述 → 直接进入 §3 准入判定。
   不要求 need 编号、不查 sdlc 路由表——附描述即启动。
2. **重入先行**：docs/ 里有上一轮快通道的在盘痕迹且用户要继续 → 按在盘签名续接，
   禁止新建重复三件套：
   - 草稿三件套（need/spec `draft` + 对应票）→ 开工确认未过 → 回 §5 续呈现；
   - 已批准三件套（need `confirmed` + spec `approved` + 票 `ready` 或 `in-progress`）→
     批准后未动工或实现中断 → 回 §6 实现（票 `ready` 先置 `in-progress`）；
   - 票 `implemented`（快评报告未产出或 `draft`，frontmatter `rounds` = 已用返工轮次）→
     实现出口后中断或快评返工中断 → 回 §6 快评（报告未产出则先评首轮），
     剩余上限 = 2 − rounds，**不重置**；
   - 快评报告 `blocked` → 按 §6 末条复述卡点，指路从 /dev-spec 修订续走完整链；
   - 合并已执行未收尾（票 `done` 且过程档未清）→ 跑 §7 收尾序列。
3. 不附改动描述的空调用 → 停下问"要改什么"，禁止自行挑活、禁止替用户猜改动面。

## 2. 装载上下文（准入输入）

粗探代码定位改动面（动哪些文件、约多少行、什么概念）+ **读 docs/adr/ 全量** +
GLOSSARY.md 项目术语；实现阶段动笔前再补读 CODING_STANDARDS.md。
这一步只摸现状，不改任何文件。

## 3. 第一段 · 准入判定（零人工交互）

对三道门**逐门判定**，每门一句结论 + 一句理由（rubric 是判断辅助、不是机械门禁——
判定 = 结合需求描述与代码实际综合评估；拿不准从严，拒绝误放行）：

- **简单门**：改动面小（量级参考 ≤5 文件、≤50 行；越界必须给出"体量与改动不成比例"的
  说明理由才可放行）、单一概念、无新依赖、无 API/schema 契约破坏、无迁移脚本。
- **低风险门**：现有测试可覆盖或改动本身即测试、git revert 单提交可回滚、
  不触并发 / 安全 / 数据完整性敏感面。
- **ADR 门**：改动与任一 **accepted** ADR 的裁决冲突 → 不通过，引用该 ADR 编号；
  superseded ADR 不在约束链上，以其承接者为约束判定，不误拦。

**硬拒项（任一命中即拒，不进入综合权衡）**：跨模块重构、新功能面、依赖引入、
schema/数据迁移、门禁与流程基础设施改动（.sdlc/、METHOD、GLOSSARY 流程章、蓝图、
check.sh——门禁自指场景走 [trivial] 既有例外通道）、无既定 spec 可归属的多需求混合描述。

任一门不过或硬拒项命中 → **当场拒绝**：明说卡在哪道门、哪条判据（ADR 引编号），
指路 dev-spec（改动意图清楚）或 dev-clarify（需求模糊），**docs/ 零落盘**——
拒绝理由只在对话中陈述，不写任何产物。

## 4. 第二段 · 三件套自产（零人工交互）

准入全过 → 自产真实产物三件（每次运行立自己的三件套，不设伞形 need；正常状态机流转，
commit-msg / pre-push 门禁语义不变）。逐张 claim → 按模板写正文覆盖占位文件（frontmatter
`id` 填文件名的 ID 段）→ `check.sh validate` 必须通过，不过 → 修复重跑：

1. `check.sh claim need <slug>` → need 模板（内容从简，七节齐备）：

```markdown
---
id: <ID 段，YYYYMMDD-4hex>
status: draft
created: <date>
---
# <标题>
## 背景与业务目标          ← 一句话改动 + 为什么值得改（不做的代价）
## 干系人与用户            ← 通常一行：开发者本人；成功标准 = 2 次交互内改完合入
## 系统能力需求            ← FR-1…（即改动目标，说"能什么"；快通道通常 1–2 条）
## 场景                    ← 主流程一条（Given/When/Then）；异常流按实际失败模式补，不虚构
## 假设与风险              ← 从简：显式假设一两行
## 范围与非目标            ← 明确不做的（如顺手重构、相邻优化）
## 开放问题                ← 清零：能查证的查证变事实，要用户拍的留到开工确认问
```

2. `check.sh claim spec <slug> need <need-id>` → spec 模板（round 1，节名缺一 validate 即拒）：

```markdown
---
id: <ID 段，YYYYMMDD-4hex>
status: draft
need: <need-id>
round: 1
created: <date>
---
# <标题>
## 问题陈述                ← 用户视角的问题，一两句
## 方案                    ← 用户视角的解决方案，一两句
## 用户故事                ← 一两条："作为开发者，我想要…，以便…"
## 实现决策                ← 模块与契约，不含文件路径与代码
## 测试决策                ← seam 在哪、怎么验
## 验收场景                ← [FR-N | 工单级] Given/When/Then 逐条，覆盖 need 全部 FR（孤儿 FR validate 会拦）
## 非目标
## 备注                    ← 准入判定段：三道门逐门结论 + 一句理由（dev-retro 审计的唯一承载）
```

3. `check.sh claim ticket <slug> spec <spec-id>`（单票）→ 票模板：

```markdown
---
id: <ID 段，YYYYMMDD-4hex>
type: feature
spec: <spec-id>
status: ready
blocked-by: []
created: <date>
---
# <ID 段>: <标题>

**做什么：** 端到端一句话改动
**改动面：** <预估触碰的文件或模块>
**验收标准：**
- [ ] spec 验收场景逐条落 checkbox（条目注明 FR-N）
- [ ] 出口 .sdlc/check.sh all 全绿
**Blocked by：** 无

## Progress
```

三件均以草稿态在盘（need/spec `draft`、票 `ready`），**publish 留到开工确认批准后一次做**。

## 5. 第三段 · 开工确认（人工 1/2，必须问人）

一次呈现四件，不拆多次问：① 准入判定结果（三道门逐门 + 理由）；② need 摘要（一句话改动目标）；
③ spec 验收场景清单；④ 票验收标准清单。

- **显式批准** → 一次推进三态：need → `confirmed`（追加 `confirmed: <今日>`）+
  spec → `approved`（追加 `approved: <今日>`）+ 票保持 `ready`，三张各
  `check.sh publish`，然后进 §6。不再各停一次。
- **沉默不算确认**：等不到显式答复就停在这里，不推进任何状态。
- **拒绝** → 三件套以草稿态留盘不废弃、实现不开始，指路："/dev-spec 修订续走完整链"。

## 6. 第四段 · 实现与快评（零人工交互）

**实现**：立即把票 frontmatter `status` 改 `in-progress`，在分支 `quick/<spec-id>` 上推进：

- **垂直推进**：一次只做一条验收标准，从测试到实现端到端打通，不做横向分层。
- **红绿循环**：每个行为先写一个失败的测试，再写刚好让它通过的实现；测试只断言外部行为。
  禁止 mock 内部协作者、测私有方法；禁止为变绿删测试、改弱断言、加条件跳过。
- **提交节奏**：每完成一条验收标准或一次绿循环即提交，message 首行 `[#票号] 行为摘要`
  （祈使句，只提交源码与测试改动——need/spec 知识档变更统一留收口提交），一次提交只做一件事。
- **边界**：只做票内的事；实现中发现必要改动超出"简单 / 低风险"范畴 → 停，按 §3 拒绝路径指路。
- **出口**：`check.sh all` 全绿（反复修不绿 → 停，指路 dev-fix 或完整链，不以跳过检查收工），
  票 frontmatter `status` 改 `implemented`。

**快评**：全绿后 spawn **独立子代理**（与实现上下文隔离），输入 = diff 基线
（主干 `.sdlc/config.sh` 的 BASE_REF…quick/<spec-id>）+ spec 验收场景 + 标准轴精简清单
（CODING_STANDARDS.md 已文档化的标准优先于基线，lint/编译已强制的跳过）+ 随派发文本附上的
内联坏味道要点（几条核心反模式信号：重复代码、死代码、过深嵌套、过长函数、魔法值、吞错误）——
精简版，不是 dev-review 双轴全文，也不装载 ref-review / dev-review 技能（纪律内联复用）。产出精简评审报告落
docs/reviews/（`check.sh claim review <slug>` 取号，frontmatter：id / status /
tickets: [<票号>] / branch: quick/<spec-id> / rounds / created；节：标准轴 findings /
Spec 轴 findings（对照 spec 验收场景查缺失、走样、超范围，精简）/ 汇总）：

- 各轴无阻断 → 报告 `status: approved`（满足 pre-push 评审覆盖）。
- 有阻断 → `status: draft` 留盘并把轮次写进盘上（frontmatter `rounds: <N>`——**首轮评审
  落盘置 `rounds: 0`，此后每个返工轮结论落盘 +1**；首轮即 approved 时 rounds 缺省
  `rounds: 0`），按意见返工再评，**不加人工交互**，**返工环上限两轮**——已用轮次以盘上
  `rounds` 为准续算剩余（2 − rounds），中断重入不重置。
- 两轮后仍非 approved（盘上 rounds = 2），或判定问题超出简单 / 低风险范畴（二者先到为准）
  → 报告以 `status: blocked` 落盘留案，停：三件套已在盘，指路从 /dev-spec 修订续走完整链。

## 7. 第五段 · PR 停门（人工 2/2）与自动收尾

**PR 三节**（合并确认前在会话中完整呈现，不让用户盲批；TRACKER 指向平台时 push 分支建 PR）：

- `## Summary`：最小可表达视图讲清改动。
- `## Evidence`：check.sh all 全绿输出摘要 + spec 验收标准逐条勾（附证据）+ 评审报告摘要。
- `## Merge Danger`：单向门 / 双向门判定 + 影响半径（谁依赖它）。

**停在合并确认门**：合并单向门由用户亲手点，**不自动合并**；确认拒绝 → 停在门上，
分支与盘上状态保留、不清理。dev-accept 不被调用——验收证据已折叠进 Evidence，
正式验收需要时手动跑；合并确认即验收证据被显式接受，是收尾推进 need fulfilled 的依据。

**合并执行后零交互按序收尾**（次序固定：票 done → 蒸馏 → 清扫 → 置 done → 原子提交，禁跳步）：

1. 票 frontmatter `status` 改 `done`、追加 `done: <今日>`——**落盘不提交**
   （过程档无可提交内容，ADR 0003 裁决 3）。
2. **蒸馏折回（先于清扫——蒸馏来源是 ticket、review 过程档）**：确有耐久内容
   （残余风险回 need、行为契约修正回 spec 验收场景、架构决策立 ADR、模式学习进标准）→
   折回对应知识档；无蒸馏目标 → 收口提交信息里留一句注记（"蒸馏：无目标，折回跳过"），不虚构。
3. **清扫**：删除该 spec 名下过程档（ticket、review）——validate 的 done 残留门禁以此为准。
4. need → `fulfilled`（追加 `fulfilled: <今日>`）、spec → `done`（追加 `done: <今日>`），
   各跑 validate（done spec 名下过程档必须为零）。
5. **收口**：恰一个 `[trivial]` 原子提交（内容 = need/spec 状态推进 + 蒸馏若有，纯知识档变更）。

## 8. 中断与交接

会话可能在任何时刻结束。凡是停下：准入前 → 对话态重开成本低；
草稿三件套未确认 → 草稿态已在盘，无需额外落盘即停（§1.2 续 §5）；
实现中 → 票保持 `in-progress`、进度写进票 `## Progress`（做到哪、下一步、卡在哪）再停（§1.2 续 §6）；
快评返工中 → 票 `implemented`、报告 `draft` 且轮次已在盘（frontmatter `rounds`），再停（§1.2 续 §6，剩余上限按 rounds 续算）；
合并已执行未收尾 → 重入从 §7 收尾序列续跑。状态在盘上，不在对话里。

## 禁止事项（任何时候）

- 任一道门不过仍放行，或硬拒项命中后进综合权衡。
- 未经开工确认开始实现；未经合并确认执行合并；沉默当确认推进任何状态。
- 拒绝路径落盘任何产物（docs/ 零新增）。
- 快评非 approved 仍宣称满足 pre-push 评审覆盖；返工环超两轮继续。
- 收尾跳步：票未落 done、蒸馏未处置、过程档未清扫、need/spec 未推进就做收口提交。
- 自动合并；替代 [trivial]（typo 与纯文档走豁免通道）；多票多 spec 跨模块改动进快通道。
- 做无人值守编排与宿主能力探测——快通道默认有人值守、单票主会话顺序执行，挂机编排归 dev-execute。
- 使用 --no-verify，或以任何方式绕过 .sdlc/check.sh。
