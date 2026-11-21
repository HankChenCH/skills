---
id: 20261120-fedf
status: approved
need: 20261120-3afe
round: 1
created: 2026-11-20
approved: 2026-11-20
---
# dev-design 双形态重定位：分析形态（系统分析三视图）+ 方案形态（现状保留）

## 问题陈述

使用套件的开发者在 need 确认（want）之后直接写 spec（how 的起点），中间没有一层系统分析（know）：对象是什么、流程怎么走、数据怎么建模。后果有三——spec「实现决策」落笔时缺模型撑腰写得浅；want 到 how 跨度大导致实现偏移；现有 design 排在 spec 之后且可选，介入点在 know 层应在位置之后（need 20261120-3afe 背景与业务目标）。

## 方案

dev-design 重写为**双形态技能**：新增**分析形态**——输入 confirmed 的 need，经信号清单亮牌 + 用户点名进入，探索代码库后以 mermaid 三视图（流程模型 / 对象模型 / 数据模型）起草系统分析，固定带「缺口与矛盾」节，经场景走查批准（第一道门）后指路 dev-spec；**方案形态**保留现状（approved spec → 模块划分/数据流/seam/ADR），spec 批准后回补方案节并经独立批准（第二道门）——同一张 design 产物两段续写，新状态 `analyzed` 表达两门制中间态。下游四技能（dev-spec / dev-plan / dev-implement / dev-review）接线消费设计产物；check.sh 机械面（design frontmatter need 谱系 + analyzed 状态）同批适配。方法内容依据调研报告 20261120-0b9e。

## 用户故事

- 作为套件使用者，我想在 need 确认后调用 /dev-design 做系统分析，以便 spec 落笔前先看清系统的对象、流程与数据。
- 作为套件使用者，我想沿 need 场景逐条在三视图上走查，以便图上走不通的 FR 缺口在写 spec 之前暴露并留痕。
- 作为套件使用者，我想让简单需求被信号清单亮牌放行直进 spec，以便不为小改动付分析成本。
- 作为套件使用者，我想让 spec「实现决策」引用设计结论而非从零重写，以便实现决策有模型撑腰、减少实现偏移。
- 作为套件使用者，我想在 spec 批准后回 dev-design 补方案节（模块/seam/ADR），以便实现纪律有技术层锚点。
- 作为套件使用者，我想让实现与评审对照设计图查"做走样"、偏离记录显式豁免，以便设计约束力贯穿实现全程。
- 作为仓库主人，我想让门禁机械面（design 的 need 谱系与 analyzed 状态）同步到位，以便新形态产物过 validate / publish 不靠自觉。

## 实现决策

- **双形态入口判定（need FR-1）**：dev-design 重写入口判定序——① 重入判定（盘上该 need 或 spec 名下存在 draft / analyzed 的 design → 续接不重起草）；② 形态判定：用户点名 need 编号（或存在恰一张 confirmed need 且点名做分析）→ 分析形态；用户点名 spec 编号（或存在恰一张 approved spec）→ 方案形态；confirmed need 与 approved spec 并存 → 请用户点名，禁止代挑。分析形态入口亮牌**信号清单**（need 涉多角色 / 数据沉淀 / 状态流转 / 外部系统对接 / 流程分支多 / 多子域术语歧义）+ 默认建议，用户点名决定；清单不命中 → 亮牌拒绝零产物、指路 dev-spec；信号命中但用户否决 → 同样放行直进 dev-spec。方案形态保留现「值得做判据」（ADR 三条件或结构非显而易见）不变。
- **design 产物模板扩展（need FR-2/FR-6，蓝图 §6.5 同步）**：正文分两段——**分析段**新增四节：`## 流程模型`（DFD，Gane-Sarson 方言：矩形外部实体 / 圆角矩形编号过程 / `datastore` 数据存储 / 带标签数据流；无判定菱形——DFD 无控制流）、`## 对象模型`（概念层 UML 类图：概念类 + 命名关联 + 多重性 + 简单类型属性；无操作签名 / 无导航箭头 / 无软件与 UI 类 / 无外键式关联属性；聚合慎用、组合仅强从属）、`## 数据模型`（ER，停概念+逻辑层：实体 / 属性 / 关系基数 / PK-FK-UK；无物理层细节）、`## 缺口与矛盾`（走查发现的 FR 缺口 / 实体矛盾 / 流程断点逐条留痕）；**方案段**保留现有四节（模块划分 / 数据流 / seam 清单 / ADR 索引）不动；`## 界面设计` 节契约不变（design-* 套件各写各的节互不覆盖）。分析段与方案段分层职责：分析段停业务/概念层（对应概念+逻辑层），方案段落技术层——「流程模型」（业务数据流）与「数据流」（技术典型路径）是两个层级，不合并。方法细则以 **references/ 四分册**承载（先例 dev-clarify 五细则 / ref-testing 六分册）：`flows.md`（DFD 记号 / 分层与编号 / balancing / mermaid 映射）、`objects.md`（概念层纪律 / OMG 语义要点 / 克制清单）、`data.md`（三层口径 / 规范化程度裁量 / mermaid erDiagram 子集）、`walkthrough.md`（GWT × 三视图走查规程，**正文声明组合性质**——骨架引 CRC / RUP / Use Case 2.0 一手出处，二元判据为工程化推断不冒充既有规程）；素材 = 调研报告 20261120-0b9e。
- **mermaid 保守语法子集（need FR-2，调研 Q6）**：产图只用各图核心记号（经典形状记号 / 8 种类图关系 / erDiagram 四基数 + PK-FK-UK），避开 v11.15+ 新特性与主题 front-matter；数据存储优先 `datastore`（v11.3+），版本不可用退圆柱 `id[(text)]`；图文本可读性不依赖渲染——渲染兼容不设门禁。
- **状态机扩展（need FR-7，机械面）**：design 状态词表 `draft → analyzed → approved`（新增 `analyzed` 表达分析走查已批准、方案节未补的中间态）；推进者 = dev-design。frontmatter 契约调整：`spec` 字段由必填变可选、新增可选 `need` 字段；validate 机械约束——`analyzed` 态必有 `need` 引用；`approved` 态必有 `spec` 引用（分析态回补方案节时 frontmatter 补 `spec`，文件名谱系前缀保持 need 谱系不变——谱系权威记录是 frontmatter 父引用字段，METHOD §4.2 既有规则）；`draft` 态 `need` 或 `spec` 至少其一。check.sh 状态词表、frontmatter 校验、`claim design` 父参数（need / spec 二选一）同批适配。
- **两门制动线（need FR-7）**：分析形态走查通过且用户显式批准 → `status: analyzed`、追加 `analyzed` 日期、指路 dev-spec（不自动串联）；spec approved 后用户回 /dev-design（点名 analyzed 态 design 或由 dev-spec 出口指路）→ 补方案段 → 用户显式批准 → `status: approved`、指路 dev-plan。顺序约束机械可校验：analyzed 态直接尝试推进 approved 而其 `spec` 字段缺省 → 拦停并指路 dev-spec。沉默不算批准（两道门都是决策点）。
- **缺口与矛盾归置（need FR-6/FR-8 衔接）**：走查发现缺口 → 逐条进「缺口与矛盾」节，need 本体不回改；dev-spec 入口新增读取步骤——该 need 名下存在含缺口节的 analyzed design → 缺口逐条与用户确认后归置（落本 spec / 列入下一轮建议 / 判定为非目标），归置结论留痕。
- **偏离记录制（need FR-8）**：spec 起草发现已批准分析段有错/过时 → spec「实现决策」节逐条记「偏离设计点 + 理由」，分析段不回改（快照语义）；偏离条目成为 dev-review Spec 轴对照的显式豁免清单；偏离属 ADR 级（难逆转 / 真权衡）→ 升格记 ADR。
- **下游消费接线（need FR-9，四技能文本增量）**：dev-spec——实现决策纪律补一条「该 need 名下存在设计产物时引用其结论，不从零重写模块与 schema；与设计冲突走偏离记录」；dev-plan——拆票纪律补一条「设计产物存在时切片边界参照其对象 / 流程边界，改动面互斥判定机制不变」；dev-implement——开工装载清单补「该 spec 关联 design 产物存在时装载」；dev-review——Spec 轴材料清单补设计产物 + 「偏离记录条目 = 显式豁免，不重复计阻断」。dev-clarify 出口建议文案补一句「结构非显而易见时建议先 /dev-design 做系统分析」。
- **投影受理面（need FR-10）**：design 投影语义不变——METHOD §7.1 受理面 design 行原样适用（GitHub 腿 = 全产物独立 issue；分析态 design 文件名带 need 谱系前缀，claim 时带父参数即可）；零新增投影逻辑，仅 validate 受理新 frontmatter 形态。
- **治理同步面（先蓝图后技能）**：蓝图——§6.1 design 行（frontmatter 字段与状态机）、§6.5 design 模板要点（分析段四节 + 两段分层说明）、§8 决策点表 dev-design 行（两道门）、§11.12 条目重写（双形态）、修订记录新条目；GLOSSARY（根 + assets 双份）——流程章状态表补 `design.analyzed` 行、产物类型 design 定义句核对；METHOD——§5 状态机表 design 行同步（`draft → analyzed → approved`）；README——dev-design 一句话职责行更新；docs/skills.md——技能清单 dev-design 行描述更新（verify-pack 对账）。sdlc next-mode 路由表零改动（分析形态不进自动串联链，dev-clarify 出口只建议不调用）。

## 测试决策

- seam：dev-design SKILL.md（双形态入口 / 信号清单 / 亮牌 / 两门制动线）与 references/ 四分册文本；蓝图 §6.1 / §6.5 / §8 / §11.12 / 修订记录；GLOSSARY 双份（状态表 analyzed 行）；METHOD §5 状态机 design 行；check.sh design 状态词表 / frontmatter 校验 / claim 父参数分支；dev-spec / dev-plan / dev-implement / dev-review 四技能接线段；dev-clarify 出口文案。
- 静态核验（蓝图 §13.2 六项）：触发（confirmed need / approved spec 双入口各一）/ 拒绝（信号不命中亮牌、approved 缺失指路、analyzed 态越序推 approved 拦停）/ 重入（analyzed 态跨会话续接从盘上状态）/ 衔接（分析批准指路 dev-spec、方案批准指路 dev-plan）。
- 行为实测（临时 git 仓库演练）：① 分析形态全动线——confirmed need → 亮牌点名 → 探索起草三视图 + 缺口节 → 场景走查 → analyzed（validate / publish 通过）→ 模拟 spec approved → 方案段 → approved；② 拒绝路径——信号不命中零产物指路 + analyzed 态越序拦停；③ 机械面——claim design need 父参数谱系前缀正确、frontmatter 三态约束（draft / analyzed / approved）validate 正反例；④ 下游接线——spec 实现决策引用 + 偏离记录、dev-review 对照豁免各一条断言。
- 既有先例：spec 20261111-1dcd 临时仓库演练四条；spec 20261107-5cb8 演练双形态点选。

## 验收场景

- [FR-1 | 工单级] Given 一张 confirmed 的 need，When 调用 /dev-design，Then 入口呈现分析形态信号清单与默认建议；Given 一张 approved 的 spec，When 调用 /dev-design，Then 走方案形态（现「值得做判据」不变）。
- [FR-1 | 工单级] Given 既无 confirmed need 也无 approved spec，When 调用 /dev-design，Then 停止并指路（无 need → /dev-clarify；有 need 未有 spec → /dev-spec），零产物。
- [FR-2 | 工单级] Given 分析形态起草，When 产出三视图，Then mermaid 三图内嵌 design 正文——流程模型含四要素且无判定菱形；对象模型为概念层（无操作签名 / 无软件类）；数据模型停概念+逻辑层（无物理层细节）。
- [FR-4 | 工单级] Given 起草前，When 探索代码库，Then 既有实体 / 流程 / 存储入图作起点，图中以标注区分「既有」与「新增」。
- [FR-3 | 工单级] Given 三视图 draft 与 need 场景节，When 走查，Then 逐条 Given/When/Then 场景在三视图上走一遍并留走查记录；走不通的路径逐条进「缺口与矛盾」节。
- [FR-6 | 工单级] Given 走查发现 FR 缺口 / 实体矛盾，When 归置，Then 逐条进「缺口与矛盾」节且 need 本体不回改；Given dev-spec 起草时读到缺口节，Then 逐条与用户确认后归置（落 spec / 列下一轮建议 / 判非目标）并留痕。
- [FR-5 | 工单级] Given 入口信号清单不命中，When 亮牌，Then 建议直进 /dev-spec、零产物（need 异常流 1）；Given 信号命中但用户否决建议，When 用户点名跳过分析，Then 直进 /dev-spec 不阻断（need 异常流 2）。
- [FR-7 | 工单级] Given 走查通过且用户显式批准，Then design `status: analyzed`、追加 analyzed 日期、指路 /dev-spec；沉默不算批准。
- [FR-7 | 工单级] Given analyzed 态 design 且 spec 未 approved，When 尝试直接补方案节推进 approved，Then 拦停并指路 /dev-spec（两门制顺序约束机械校验）。
- [FR-7 | 工单级] Given spec approved 后回 /dev-design，When 补方案段并经用户显式批准，Then design `status: approved`（frontmatter 补 spec 字段、文件名 need 谱系前缀不变）、指路 /dev-plan。
- [FR-8 | 工单级] Given spec 起草与已批准分析段冲突，When 处置，Then spec「实现决策」节逐条记「偏离设计点 + 理由」，分析段不回改；Given 偏离属 ADR 级，Then 升格记 ADR（need 异常流 4）。
- [FR-9 | 工单级] Given 该 need 名下存在设计产物，When dev-spec 起草实现决策，Then 引用设计结论而非从零重写；When dev-plan 拆票，Then 切片边界参照对象 / 流程边界；When dev-implement 开工装载，Then 装载清单含设计产物；When dev-review Spec 轴对照，Then 材料含设计产物且偏离记录条目按显式豁免处理（不重复计阻断）。
- [FR-10 | 工单级] Given 分析形态取号 `claim design <slug> need <need-id>`，Then 文件名带 need 谱系前缀、frontmatter `need` 字段与 `id` 正确；Given 三态 frontmatter（draft 带 need 或 spec / analyzed 必有 need / approved 必有 spec），When validate，Then 正例通过、违例（analyzed 缺 need、approved 缺 spec）逐条拦截。
- [FR-10 | 工单级] Given design 任一状态落盘，When publish（TRACKER=github），Then 按既有受理面投影（全产物独立 issue），投影语义与受理面零变化。
- [FR-9 | 集成级 | 承载票 T3] Given 演练仓库一张真实 need，When 端到端走全动线（need → 分析 → 走查批准 → spec 引用起草 → spec 批准 → 方案段批准 → 拆票对照 → 评审对照豁免），Then 下游四技能在各环节真实引用 / 对照设计产物，人工门恰三道（走查批准 / spec 批准 / 方案批准）。
- [FR-7 | 集成级 | 承载票 T3] Given 演练中 analyzed 态 design，When 会话中断后重入，Then 从盘上状态续接（analyzed 不重起草、缺口节内容保留），越序推 approved 被拦停。

## 非目标

- dev-quick-implement 快通道不接分析形态——一句话级改动不涉系统分析（need 非目标）。
- 不立 docs/analyses/ 独立产物目录——分析之实进 design 产物（蓝图 v1.10 拍板延续：产物必须有下游消费者）。
- 不做「期望 → 对象映射表」——与既有 FR 追溯链职能重叠（need 拍板 D 归置）。
- mermaid 渲染兼容不设门禁——文本承载兜底，Codeup 渲染实测为演练观察项而非验收项（调研 Q6：未找到一手支持来源）。
- design-* 界面设计套件链零改动——「界面设计」节与 assets 原型契约原样保留，与 dev-design 各写各的节互不覆盖。
- dev-execute 编排零改动——编排纯读合成产物，analyzed 态 design 照常可读；编排流程不含分析环节。
- METHOD.md 模板零改动（模板内嵌技能）——仅 §5 状态机表 design 行同步。
- 不新增自动串联——分析批准后指路不调用 dev-spec，方案批准后指路不调用 dev-plan（现 dev-design 出口语义延续）。

## 备注

- 分轮拍板（2026-11-20，用户显式批准）：round 1 全量覆盖 need FR-1 至 FR-10——validate 孤儿 FR 规则要求单张 spec 覆盖全部 FR（spec 20261111-1dcd 备注先例同款）；round 2 候选 = 演练暴露的走查判据与信号清单调优。
- 需求纯度：FR-1 ← need FR-1（原话①② + 拍板 D1）；FR-2 ← need FR-2（原话③）+ FR-4（拍板）；FR-3 ← need FR-3（拍板）；FR-4 ← need FR-4；FR-5 ← need FR-5（拍板 D2）；FR-6 ← need FR-6（拍板 D4）；FR-7 ← need FR-7（拍板 D3）；FR-8 ← need FR-8（拍板 D5）；FR-9 ← need FR-9（拍板 UC3/5/6）；FR-10 ← need FR-10（D1 连带）。异常流四条全部继承自 need 场景节（分别落于 FR-5/FR-6/FR-7/FR-8 条目）。
- 术语：「分析形态」「方案形态」已随 need 20261120-3afe 登记 GLOSSARY（根 + assets 双份）项目术语章；`design.analyzed` 状态随 T1 登记 GLOSSARY 流程章状态表。
- 方法内容依据：调研报告 20261120-0b9e——三视图记号纪律（Q1/Q2/Q3）、走查规程三源出处与组合性质声明（Q4）、信号清单判据素材（Q5）、mermaid 保守语法子集与 Codeup 渲染缺口（Q6）；报告「映射要点」的遗留四项归实现票处置。
- 蓝图核对项（T1 时处理）：sdlc next-mode 路由表是否已含 dev-design 行及其措辞核对（不新增自动串联）；§7.2 引用矩阵核对（dev-design 既有 ref-writing 行不变，references/ 四分册不经引用矩阵——先例 dev-clarify 五细则）。
- 拆票方案（拟定，待 dev-plan 确认）：3 片垂直票——T1「治理文档」（蓝图 §6.1/§6.5/§8/§11.12 + 修订记录 + GLOSSARY 双份 analyzed 行 + METHOD §5 design 行 + README + docs/skills.md；改动面 = docs/ 与 README）；T2「dev-design 技能本体 + check.sh 机械面」（SKILL.md 双形态 + references/ 四分册 + check.sh 词表 / frontmatter / claim 分支；blocked-by T1；改动面 = skills/dev-design/ + .sdlc/check.sh）；T3「下游接线 + 集成演练」（dev-spec / dev-plan / dev-implement / dev-review / dev-clarify 五技能文本 + 临时仓库全动线演练；blocked-by T2；改动面 = skills/ 五技能）。集成级 2 条由 T3 承载。
