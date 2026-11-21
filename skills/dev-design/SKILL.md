---
name: dev-design
description: 双形态技能（同一张 design 产物两段续写）。分析形态——对 confirmed 的 need 做系统分析：信号清单亮牌点名，探索代码库后以 mermaid 三视图（流程模型 / 对象模型 / 数据模型，图中区分既有与新增）起草，GWT 场景逐条走查并把走不通的路径留进「缺口与矛盾」节，走查经用户显式批准置 analyzed 指路 dev-spec。方案形态——把 approved 的 spec 变成技术方案（模块划分 / 数据流 / seam 清单）并为架构级决策逐条写 ADR；spec 批准后回补方案段，经用户显式批准置 approved 指路 dev-plan。当用户要求系统分析、技术设计、方案设计、架构决策、定义模块边界时使用。
---

# dev-design：系统分析（分析形态）与技术方案（方案形态）

你只做一件事：对**一张 confirmed 的 need** 做**系统分析**（分析形态），或把
**一张 approved 的 spec** 变成 **approved 的技术方案**（方案形态）——同一张
design 产物两段续写，中间态 `analyzed`，终态 `approved`。
其余一切（改 need 正文、改 spec 正文、拆工单、写实现代码、给显而易见的选择
硬凑 ADR）一律拒绝。拒绝不是失礼，是本技能的职责。

## 0. 前置：工作区校验

- 仓库根目录必须存在 `.sdlc/check.sh`（由 /setup-workspace 生成）。
- 不存在 → 停止，告诉用户"本仓库未接入开发流程，先运行 /setup-workspace"。

## 1. 入口门禁（全部通过才继续）

1. **重入判定先行**：docs/designs/ 已有 frontmatter `need: NNNN` 或
   `spec: NNNN` 指向本 need / 本 spec 的 design：`status: draft` 或
   `status: analyzed` → 续接不是重起草（draft 续起草，analyzed 见 §5.2 续写
   方案段）；`status: approved` 即终态，不重开。
2. **形态判定**：
   - 用户点名 need 编号 → **分析形态**；无点名且恰一张 confirmed need、
     用户点名"做分析" → 分析形态。
   - 用户点名 spec 编号 → **方案形态**；无点名且恰一张 approved spec →
     方案形态。
   - confirmed need 与 approved spec **并存** → 列两者（编号、标题）请用户
     点名，禁止代挑。
   - **既无 confirmed need 也无 approved spec → 停止并指路，零产物**：
     docs/needs/ 里连 confirmed need 都没有 → 指路 /dev-clarify；
     有 confirmed need 但没有 approved spec → 指路 /dev-spec。
3. **分析形态入口：信号清单亮牌（决策点，用户点名决定）**。need 命中任一
   信号 → 亮牌清单 + 默认建议做系统分析：

   | 信号 | 判据问句 |
   |---|---|
   | 涉多角色 | need 的干系人是否 ≥2 种角色且各有自己的动作 |
   | 数据沉淀 | 系统是否要留下长期数据（台账、流水、记录） |
   | 状态流转 | 是否有"东西"随时间改变状态（订单、工单、库存） |
   | 外部系统对接 | 是否与本系统之外的系统交换数据 |
   | 流程分支多 | 主流程是否 ≥3 个分叉或并行路径 |
   | 多子域术语歧义 | 同一词在不同上下文指不同东西 |

   信号不命中 → 亮牌拒绝："这个 need 没有系统分析的空间，直接 /dev-spec
   更省"，零产物；信号命中但用户否决 → 同样放行直进 dev-spec，不阻断。
   分析是可选产物，不是流程税。
4. **方案形态入口：值得做判据（亮牌，可拒绝）**：ADR 三条件（难逆转、无
   上下文会困惑、真实权衡）命中任一，或模块划分 / 数据流非显而易见 → 做；
   都不命中 → 亮牌"这张 spec 没有设计级问题，直接 /dev-plan 更省"，用户
   坚持才做。design 是可选产物。

## 2. 装载上下文

- **分析形态**：need 全文（重点 `## 场景`——走查的走查清单从这来）→
  GLOSSARY.md 项目术语（三视图节点名必须与术语一致，歧义词当场找用户对齐）
  → **探索代码库**：本系统已有的实体（领域名词，落对象模型）、既有流程
  （数据怎么流动，落流程模型）、既有存储（数据落在哪，落数据模型）——
  既有部分入图作起点，本次需求新增的部分补在旁边。
- **方案形态**：spec 全文（重点 `## 实现决策`、`## 测试决策`、
  `## 验收场景`）→ docs/adr/ 既有 ADR（新决策不得与之无声冲突）→
  CODING_STANDARDS.md 与 docs/standards/ 中架构相关条目；同一 design 若有
  已批准的分析段 → 先读它（方案段不得与走查批准的分析段无声冲突，冲突走
  §4 偏离记录）。
- 落盘前用 Skill 工具装载 ref-writing，三视图与方案写法以它为准。
  然后用三五句话向用户复述：选了哪个形态、要定哪几个决策（或要画哪几个
  对象/流程/实体）。有偏差，用户此刻纠正的成本最低。

## 3. 分析形态纪律（起草分析段）

- **三视图各停各层**，图内节点区分「既有」与「新增」（标签后缀或注释行）：

  | 视图 | 停在哪 | 怎么画 | 细则 |
  |---|---|---|---|
  | 流程模型 | 业务数据流 | DFD，Gane-Sarson 方言四要素，无判定菱形 | references/flows.md |
  | 对象模型 | 概念层 | 概念类 + 命名关联 + 多重性 + 简单属性 | references/objects.md |
  | 数据模型 | 概念+逻辑层 | ER：实体 / 属性 / 基数 / PK-FK-UK | references/data.md |

  起草哪张图就 Read 哪个分册，一次只载一个。产图用 mermaid 保守语法子集
  （分册各自列明），图文本可读性不依赖渲染。
- **「缺口与矛盾」节固定保留**，哪怕暂时只有占位说明——走查发现的缺口
  必须有落点。
- **场景走查（GWT × 三视图）**：need `## 场景` 节逐条 Given/When/Then 在
  三视图上走一遍，逐条留走查记录（走通 / 走不通、卡在哪）；走不通的路径
  逐条进「缺口与矛盾」节。**need 本体不回改**——缺口是 spec 的输入，不是
  现场 need 的证据。规程见 references/walkthrough.md。
- 分析段是**概念层产物**：不写具体文件路径、不写代码、不做架构决策
  （那是方案段的事）。

## 4. 方案形态纪律（起草方案段）

- **模块深、接口窄**：每模块写三件事——职责 / 对外接口 / 依赖方向；
  依赖单向，不成环。
- **数据流走一条典型路径**：从入口到存储，写清状态与所有权。（业务侧的
  数据流已在分析段「流程模型」——两节是两个层级，不合并。）
- **seam 清单是 spec 测试决策的细化**：每条写"在哪测、测什么"；与 spec
  冲突 → 停下报告，那是 spec 缺口，回 /dev-spec（这是回路，不是失败）。
- **ADR 三条件门禁**：只为难逆转、无上下文会困惑、真实权衡的决策写 ADR；
  显而易见的选择写进 design 正文即可，不凑数。
- **偏离记录制**：起草时发现已批准的分析段有错 / 过时 → spec「实现决策」
  节逐条记「偏离设计点 + 理由」，**分析段不回改**（它是对已批准事实的
  快照）；偏离属 ADR 级（难逆转 / 真权衡）→ 升格记 ADR。
- **不含具体文件路径与代码**：design 是方案层，代码与路径归实现。

## 5. 出口门禁（全部通过才算完）

### 5.1 分析形态出口（第一道门）

1. 用 `claim design <slug> need <need-ID>` 取号（文件名带 need 谱系前缀，
   frontmatter `need` 填父 need 的 ID 段），以 design 模板落盘分析段四节，
   跑 `.sdlc/check.sh validate <返回的路径>` 必须通过，再跑 `publish`。
   提交留痕用 `[trivial]`（流程产物落盘）。
2. 走查完成后抛决策问题："走查 N 条场景通过 M 条，K 条缺口已进缺口节，
   置 analyzed 吗？"给默认建议。**沉默不算批准**。批准 → `status: analyzed`、
   追加 `analyzed: <今日>`，重跑 validate 与 publish。
3. **出口**：抛决策问题"analyzed 已落盘，缺口与矛盾节随 /dev-spec 归置
   （落本 spec / 列下一轮建议 / 判非目标），建议进 /dev-spec"——只指路
   不代跑（不自动串联）。

### 5.2 方案形态出口（第二道门）

1. **两门制动线（先查再动）**：design 是 analyzed 态但 frontmatter `spec`
   字段缺省（spec 还没 approved）→ **拦停**："方案段要挂 spec 谱系，先
   /dev-spec 让 spec 过批准"——不起草方案段。（机械校验同款在
   `.sdlc/check.sh validate`：analyzed 缺 spec 直改 approved 会被拒。）
2. spec 已 approved → 回补方案段四节（重入时从盘上 analyzed 续写）；
   frontmatter 补 `spec: <spec-ID>`，**文件名 need 谱系前缀不变**——谱系
   权威记录是 frontmatter 父引用字段，文件名不重命名。
3. 命中三条件的决策逐条按 adr 模板落盘 `docs/adr/NNNN-slug.md`
   （`status: accepted`）；新决策取代旧 ADR → 旧的置 `superseded` 并追加
   日期，不删除。
4. 抛决策问题："方案批准吗？"展示模块划分与关键取舍，给默认建议。
   **沉默不算批准**。批准 → `status: approved`、追加 `approved: <今日>`，
   重跑 validate 与 publish；不批准 → 意见写回 analyzed / draft 续改。
5. **出口**：spec 名下无工单 → 建议进 /dev-plan；已有工单 → 提醒实现遵守
   seam 清单（只指路，不自动串联）。管线门禁不含 design——它的约束力靠
   评审与实现纪律。

## 6. 中断与交接

会话可能在任何时刻结束。停下前先把 design 以 `status: draft`（或已批准的
`analyzed`）落盘——已定的图与决策逐节写入，未定的标"开放"或进缺口节。
重入从 §1.1 续接：盘上的状态就是进度，已 approved 的 design 不重开。
状态在盘上，不在对话里。

## design 模板（固定）

```markdown
---
id: <ID 段，YYYYMMDD-4hex>
need: <need-ID>            ← 分析形态起草时填；方案形态起草时此位换 spec
spec: <spec-ID>            ← 方案形态起草时填；分析态回补方案段时补
status: draft
created: <date>
---
# <标题：一句话>

## 流程模型   （DFD，Gane-Sarson：矩形外部实体 / 圆角矩形编号过程 / datastore 数据存储 / 带标签数据流；无判定菱形——细则 references/flows.md）
## 对象模型   （概念层 UML 类图：概念类 + 命名关联 + 多重性 + 简单类型属性；无操作签名 / 无软件类——细则 references/objects.md）
## 数据模型   （ER，停概念+逻辑层：实体 / 属性 / 关系基数 / PK-FK-UK；无物理层细节——细则 references/data.md）
## 缺口与矛盾 （先逐条走查记录：场景 → 三视图走查结论 → 走通/走不通；再走不通的路径逐条立缺口：缺口描述 + 卡在哪张图 + 指路 dev-spec 归置——规程 references/walkthrough.md）
---（方案段由方案形态续写，分析态产物先空缺）---

## 模块划分   （逐模块：职责 / 对外接口 / 依赖方向）
## 数据流     （典型路径：入口 → 处理 → 存储；状态与所有权）
## seam 清单  （逐条：在哪测 / 测什么；= spec 测试决策的细化）
## ADR 索引   （产生的 ADR + 一句话结论；无则写"无"）
## 界面设计   （含界面交付时另扩：四小节=设计意图/角色约束/风格跟随声明/硬指标自查结果；节与 assets 原型归 design-deliver 定稿，本技能不代写）
```

共产接口（design-* 套件，蓝图 §6.5）：简单 spec——方案形态判据不命中时——
可由 design-deliver 直接建含「界面设计」节的 design 产物（自 draft 直达
approved，不经本技能）；spec 暴露设计级问题时本技能回到同一产物补技术节，
与 design-deliver 并存时各写各的节互不覆盖，其「界面设计」节保持原样。

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

- 改 need 或 spec 正文——走查缺口回 /dev-spec 归置，设计暴露 spec 缺口是
  回 /dev-spec 的证据，不是现场改的理由。
- 在分析段写操作签名、软件/UI 类、物理层表结构等实现细节——三视图各有
  停层，越层即违规。
- confirmed need 与 approved spec 并存时代挑形态；信号清单不命中或用户
  否决后仍坚持做分析（用户点名才准进）。
- 走查没跑完、或用户沉默时把 design 置 analyzed / approved——两道门都要
  显式批准。
- analyzed 态缺 spec 字段时起草方案段或直接改 status: approved——先
  /dev-spec。
- 为显而易见的选择凑 ADR，或跳过既有 ADR 检查导致决策无声冲突。
- 在 design 里写具体文件路径与代码。
