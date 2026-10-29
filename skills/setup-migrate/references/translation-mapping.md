# 翻译映射协议（产物对产物、状态对状态）

主文档 §3 翻译步的本细则。翻译 = 逐件把外来产物译为本套件形态，
**不以原样归档替代翻译**；产物形态与既有模板同构（spec 八节齐备、need 七节齐备、
ticket 带 Progress 节与验收标准条目），**零新增产物类型、零新增状态机状态**。

## 总则

- **来源行**：每张翻译产物正文首部（一级标题之后、首个小节之前）加一行
  `> 来源：<外来产物位置>；迁移日期 <YYYY-MM-DD>`。迁移与逆向的区分走正文
  来源行 + 对账清单，不走状态机。
- **不带扫描基线节**：翻译产物非扫描所得，不加「扫描基线」节
  （该节是 setup-reconstruct 逆向产物专属）。
- 逐件翻译逐件记行：每译一件，对账清单同步一行（来源 → 归宿 → 已翻译；
  弃置与失败各按其值），编号接目标仓库对应目录内最大号 +1。

## 产物对产物

- **spec issue → 本套件 spec**（docs/specs/NNNN-slug.md，**八节齐备**）：
  问题陈述 / 方案 / 用户故事 / 实现决策 / 测试决策 / 验收场景 / 非目标 / 备注
  逐节从外来 spec issue 正文翻译填实，不空节凑数；status 按下节分态规则定。
- **ticket issue → 正向 ticket 或不产 ticket 产物**：未闭环 → 落
  docs/tickets/NNNN-slug.md，status: ready，frontmatter `spec:` 字段**指向**
  翻译出的 spec，做什么 / 验收标准 / Progress 节照模板译实；已闭环 →
  **不产 ticket 产物**（过程档不留僵尸），正文耐久内容（决策、约束、验收口径）
  **折进**对应沉淀 spec / ADR 的相应小节，折进处在来源行注明。
- **questionnaire issue → need**（docs/needs/NNNN-slug.md，七节齐备）：
  背景与业务目标 / 干系人与用户 / 系统能力需求 / 场景 / 假设与风险 /
  范围与非目标 / 开放问题；分态同下节（未闭环 → draft，已闭环 → reconstructed）。
- **ADR 文件 → 本套件 ADR**（docs/adr/NNNN-slug.md，status: accepted）：
  判据同逆向 ADR——只把**当前生效的决策**落 accepted；外来 ADR 描述的决策
  已失效时不硬落 accepted，按 E2 交用户（显式弃置或由用户拍板补 superseded 链）。
- **GLOSSARY 术语 → GLOSSARY 项目术语章**：按既有词条格式
  （`术语 —— 定义（首次出现：…）`）追加，首次出现标注记外来来源与迁移日期；
  **同名术语不覆盖**——保留原词条，冲突报告交用户处置（setup-workspace 先例）。
- **GLOSSARY-MAP.md → 显式弃置**：其功能被本套件 GLOSSARY 取代，不翻译
  不归档，对账清单记显式弃置及理由。
- **docs/agents/ 配置 → 随生命周期技能处置**：翻译步只在对账清单记行
  （归宿写"随处置"），处置动作归处置步（主文档 §3 第 2 步）。

## 状态对状态（分态规则）

- **未完成的外来工作**（开着的 issue，非 wontfix，含 needs-triage / needs-info /
  ready-for-agent / ready-for-human）→ **正向流程现态**：spec 落
  `status: draft` 交用户走 dev-spec 审定；ticket 落 `status: ready` 且
  frontmatter `spec:` 字段指向翻译出的 spec，照常走本套件流程——翻译完成即
  并入 frontier，由门禁链接管，迁移不再特殊对待。
- **已完成的历史产物**（已闭环 issue）→ **沉淀形态**：落盘即
  `status: reconstructed`（复用 need 0006 状态机扩展，need / spec 均为合法值，
  零新增状态），或把耐久内容折进既有沉淀产物；**不产伪过程档**——已闭环的
  ticket issue 不落 docs/tickets/。
- **wontfix** → 对账清单「显式弃置」，理由记「外来套件已拒」，不落任何产物。
- **沉淀 spec 的 need 字段可空**：外来 spec issue 通常自含行为描述，
  不为凑字段伪造 need；无 need 字段时孤儿 FR 校验不触发（check.sh 既有行为）。
- **外来特有语义正文显式记录，不新增状态**：如 `ready-for-human`
  （等人工确认）这类本套件没有的状态语义，写进产物正文备注原样记录，
  不为它新增状态机状态。

## E2（语义无法对应 → 显式弃置）

- 外来产物语义无法对应本套件任何产物形态（或形态可对应但状态语义冲突，
  如已失效决策落 accepted）→ **显式弃置**：对账清单记行，归宿写显式弃置
  及理由；**不硬造产物**——不为"翻译完了"凑形态。
- 弃置是否得当存疑时交用户拍板，拍板记录进对账清单备注。
