---
id: 20261120-0b9e
created: 2026-11-20
---
# 系统分析与设计方法调研：为 dev-design 分析形态（need 20261120-3afe）提供方法内容参考

## 调研问题与用途

- Q1 要回答 DFD 的现代可操作形态（记号体系/分层规则/标准化程度）与 mermaid flowchart 承载方式 / 为什么重要：堵着「流程模型怎么画、画到什么深度」/ 影响 FR-2（流程模型）、FR-5（信号清单素材）。
- Q2 要回答 UML 类图的概念层领域建模纪律（必画/可省/不该出现）与 mermaid classDiagram 表达力 / 为什么重要：堵着「对象模型怎么画、防止过度建模」/ 影响 FR-2（对象模型）。
- Q3 要回答数据建模的最小必要集（ER 记号/三层划分/规范化深度）与 mermaid erDiagram 表达力 / 为什么重要：堵着「数据模型停在哪一层不越权到实现」/ 影响 FR-2（数据模型）。
- Q4 要回答场景走查承载用户期望的方法出处与操作规程 / 为什么重要：堵着 FR-3 走查规程「只有直觉缺出处」/ 影响 FR-3、FR-6（缺口节素材）。
- Q5 要回答 SA/OOA/RUP/DDD 各方法的产物、适用信号与组合先例 / 为什么重要：堵着 FR-5 信号清单的判据出处与技能整体编排 / 影响 FR-1、FR-5。
- Q6 要回答 mermaid 三图语法边界与 GitHub/云效 Codeup 渲染支持 / 为什么重要：堵着表达载体选型与 need 轻风险（Codeup 渲染未实测）/ 影响 FR-2、need 假设与风险节。

## 结论速览

- Q1：DFD 两经典方言（Yourdon/DeMarco 与 Gane-Sarson）仅过程与数据存储形状不同；无 ISO/IEEE 规范性记法标准；mermaid 无专用 DFD 图类型，v11.3+ 的 `datastore` 形状官方描述即 "Data flow diagram data store"，Gane-Sarson 方言对 mermaid 最友好（来源 1、7、8）。
- Q2：概念层领域模型必画 = 概念类 + 命名关联 + 多重性 + 简单类型属性；不该出现 = 操作签名、导航箭头、软件/UI 类、外键式关联属性；OMG 规范明示聚合（shared）语义弱、概念层慎用；mermaid classDiagram 覆盖概念层全部必画元素（来源 9、10、11、12）。
- Q3：ER 一手出处 Chen 1976；概念/逻辑/物理三层四厂商口径一致，设计阶段停概念+逻辑层；「逻辑层必须 3NF」无厂商一手硬性规定；mermaid erDiagram 覆盖 Chen 核心子集（来源 2、13、14、15、16）。
- Q4：「场景走查暴露未覆盖职责 → 补职责/建类」有 CRC 原论文一手原文（经独立抽验逐字命中）；RUP「沿场景事件流逐步走查」与 Use Case 2.0 "walks-through the design"（其认可表达形式明确含 DFD）构成操作规程三源；「走通 = 完备」二元判据为组合化推断，引用须注明组合性质（来源 17、18、19、20）。
- Q5：SA 产物四件套、OMT 三模型（功能模型 ≈ DFD）、RUP 分析类三分 boundary/control/entity 且「分析模型不对解决方案架构做决策」（IBM 官方一手）、DDD 战略设计定义与信号全部作者一手；信号映射表归纳成立但各行为判断（来源 21、22、23、24、25、26）。
- Q6：GitHub 官方支持 mermaid（Issues/PR/Markdown 文件/Wiki）；云效 Codeup 未找到任何官方 mermaid 支持的一手来源，实现时必实测；mermaid v11.15–v12 有多批新语法与默认观感变更，实现建议保守语法子集（来源 27、28、29、30）。

## Q1 DFD：记号、分层与 mermaid 承载

- 两方言差异：IBM 官方原文——过程"circles (Yourdon and Coad) or rectangles with rounded corners (Gane and Sarson)"，数据存储"parallel lines (Yourdon and Coad) or open-ended rectangles (Gane and Sarson)"，两体系"differ in the symbols that they use to represent processes and data stores but are otherwise the same"（外部实体均矩形、数据流均带标签箭头）。来源：https://www.ibm.com/think/topics/data-flow-diagram（检索 2026-11-20）| 事实
- 四要素定义（Yourdon 体系学术整理）：过程 = "Transforms data from input flows to data sent to output flows"；外部实体（terminator）= "Producer or user of data that interfaces with the system"；数据存储 = "Buffer between the system and the environment"。来源：https://ris.utwente.nl/ws/portalfiles/portal/5125880/Dehne_Wieringa_-_The_Yourdon_Systems_Method_and_the_Toolkit_for_Conceptual_Modeling.pdf（检索 2026-11-20）| 学术二手（对 Yourdon 方法的整理）
- 分层与编号：context diagram = "a special case of a data flow diagram, containing a single process representing the whole system"；Level 0/1/2 逐层分解，"Level 3 以上罕见"（IBM 原文引语）；子图编号 = 所细化过程的编号（context 的子图编号 "0"，过程 1 分解为 1.1/1.2）。来源：https://is.muni.cz/el/fi/podzim2016/PB007/um/lec/05-StructuredAnalysis.pdf 与 https://www.ibm.com/think/topics/data-flow-diagram（检索 2026-11-20）| 二手线索（大学讲义）+ 厂商
- balancing 操作定义：父子图数据流守恒的形式化规则（父图边界流 = 子图外部流之和、组合流可拆包/合包、单子流须同名）出自学术形式化论文，Yourdon 原书正文未在线公开、教材原文规则未一手可得。来源：https://ris.utwente.nl/ws/portalfiles/portal/5125880/Dehne_Wieringa_-_The_Yourdon_Systems_Method_and_the_Toolkit_for_Conceptual_Modeling.pdf（检索 2026-11-20）| 学术二手（形式化本身是论文成果）
- 标准化程度：DFD 四要素记法无现行 ISO/IEEE 规范性标准——ISO 5807:1985 为文档符号约定性质（非 SA 记法规范化）；IDEF0（SADT 衍生）曾入 FIPS 183、2008 年撤回；SWEBOK v3 将 DFD 列为已知建模技术但不规定记法。三本原书（DeMarco 1979 / Gane-Sarson 1979 / Yourdon 1989）无公开一手电子文本。来源：https://www.iso.org/standard/11955.html、https://nvlpubs.nist.gov/nistpubs/Legacy/FIPS/fipspub183.pdf、https://cs.fit.edu/~kgallagher/Schtick/Serious/SWEBOKv3.pdf（检索 2026-11-20）| 事实（标准组织/政府存档/IEEE 官方出版物）+ 判断（ISO 5807 性质归类）
- mermaid 承载：官方图类型清单无专用 DFD；v11.3.0+ 新形状语法 `A@{ shape: datastore }`，官方描述即 "Data flow diagram data store"（本次调研独立抽验命中）；经典语法可用圆柱 `id[(text)]` 近似数据存储。四要素映射：外部实体 = 矩形 `id[text]`；过程 = 圆 `id((text))`（Yourdon）或圆角矩形 `id(text)`（Gane-Sarson）；数据流 = 带标签边 `A-->|数据名|B`。来源：https://mermaid.js.org/syntax/flowchart.html（检索 2026-11-20）| 事实 + 判断（方言映射建议）
- DFD 无控制流：判定/分支逻辑不属于 DFD（"A data-flow diagram has no control flow"），菱形与六边形不得入图。来源：https://en.wikipedia.org/wiki/Data-flow_diagram（检索 2026-11-20）| 二手线索（与 IBM 页一致）
- 方言建议（判断）：以 Gane-Sarson 方言起草（圆角矩形过程 + `datastore`/圆柱 + 矩形实体）——两方言仅两形状之差，切换成本低，而 Gane-Sarson 与 mermaid 现状最贴合。依据上述 IBM 原文与形状清单。

## Q2 UML 类图：概念层建模纪律与 mermaid classDiagram

- OMG UML 2.5.1 规范语义（规范 PDF 逐页核对）：类 = 对象分类及其结构/行为特征的声明；关联 = 类型化实例间语义关系（至少两个成员端）；多重性 = 集合合法基数约束（`lower..upper`，`*` 无限上界，`1` ≡ `1..1`）；泛化 = 分类学关系（特化实例亦为泛化实例并继承特征），空心三角指向父类。来源：https://www.omg.org/spec/UML/2.5.1/PDF（检索 2026-11-20）| 事实
- 聚合与组合的规范语义（关键）：聚合（shared，空心菱形）"Precise semantics of shared aggregation varies by application area and modeler"——规范不给强语义；组合（composite，实心菱形）为强语义："a part object be included in at most one composite object at a time. If a composite object is deleted, all of its part instances … are deleted with it"。来源：同上（检索 2026-11-20）| 事实
- 规范明示的省略口径：任何分栏可省且"no inference may be drawn"；"If no multiplicity is shown on the diagram, no conclusion may be drawn about the multiplicity in the model"——克制记法有规范级依据。来源：同上（检索 2026-11-20）| 事实
- Fowler 三模式与视角：UML 用法三分 UmlAsSketch / UmlAsBlueprint / UmlAsProgrammingLanguage；sketch 的本质是选择性（"comprehensiveness is the enemy of comprehensibility"）；UML Distilled 第 3 版把视角收缩为 conceptual vs software 两分（旧三分 conceptual/specification/implementation 出自第 1/2 版传统，第 3 版附录保留）；概念视角原文："we aren't talking about software elements so much as we are building a vocabulary to talk about a particular domain"。来源：https://martinfowler.com/bliki/UmlMode.html、https://martinfowler.com/bliki/UmlAsSketch.html、https://www.cs.miu.edu/courses/de/cs425/admin/umldistilled.pdf（检索 2026-11-20）| 事实（作者一手/作者书文本）+ 判断（三分口径的引用溯源注记）
- Larman 领域模型纪律（作者书文本原文）：领域模型 = 概念类的类图，"no operations are defined"，只含概念类/关联/属性；"A domain model does not show software artifacts or classes"；"methods are purely a software concept"；关联 vs 属性："Attributes should not be used to relate conceptual classes"（外键式属性是最常见违规）；属性只放简单数据类型；制图人原则："Exclude irrelevant features. Do not add things that are not there"。来源：https://personal.utdallas.edu/~chung/SP/applying-uml-and-patterns.pdf（检索 2026-11-20）| 事实（书文本，OCR 承载于课程站）
- 概念模型克制（Fowler）：概念模型不用操作定接口（"use them to indicate the principal responsibilities"）；不画导航箭头；"keep the notation to a minimum. Don't introduce anything … specific to the software implementation"；实用建议"Start with the simple stuff: classes, associations, attributes, generalization, and constraints"。来源：https://www.cs.miu.edu/courses/de/cs425/admin/umldistilled.pdf（检索 2026-11-20）| 事实
- mermaid classDiagram 能力边界：8 种关系记号（`<|--` 继承、`*--` 组合、`o--` 聚合、`-->` 关联、`--` 实线、`..>` 依赖、`..|>` 实现、`..` 虚线）+ 多重性（`1`/`0..1`/`1..*`/`*`/`n`）+ 可见性（`+`/`-`/`#`/`~`）+ note（通用与 `note for 类`）——覆盖概念层全部必画元素；缺口：关联类、限定符、多元关联、导航性区分无语法（需降级为普通关联 + note）。来源：https://mermaid.js.org/syntax/classDiagram.html（检索 2026-11-20）| 事实 + 判断（降级策略）

## Q3 数据建模：三层口径、规范化深度与 mermaid erDiagram

- ER 一手出处：Chen 1976（ACM TODS Vol.1 No.1, pp.9-36；作者 LSU 公开 PDF 已逐页读取）——实体 "a 'thing' which can be distinctly identified"；关系 "an association among entities"；属性 "a function which maps from an entity set or a relationship set into a value set"；关系本身也可带属性。Chen 原文为四层逻辑视图（L1-L4），今日"概念/逻辑/物理"三层系后续演化，论文非三层口径直接出处。来源：https://www.csc.lsu.edu/~chen/pdf/erd-5-pages.pdf（检索 2026-11-20）| 事实
- 三层权威口径（四厂商原文对照一致）：概念层 = 业务实体/关系高层视图（需求收集）；逻辑层 = 实体+属性+关系、形式化记号、技术无关（IBM："标出数据属性如数据类型与长度"；Oracle："Entity-relationship modeling is purely logical"）；物理层 = 具体 DBMS 实现（主外键/字段类型/调优）。来源：https://www.ibm.com/think/topics/data-modeling、https://aws.amazon.com/what-is/data-modeling/、https://www.microsoft.com/en-us/microsoft-fabric/resources/data-101/what-is-data-modeling、https://docs.oracle.com/en/database/oracle/oracle-database/26/dwhsg/data-warehouse-logical-design.html（检索 2026-11-20）| 事实（厂商官方）+ 判断（四源一致的归纳）
- 规范化深度：3NF 一手出处 Codd 1971（IBM RJ909）；无厂商一手文档把"逻辑层必须 3NF"写成硬性规定——Oracle 把 3NF 列为逻辑设计的 schema 选项之一（与 star/snowflake 并列）、讨论合理去规范化（denormalization）；IBM 原文口径为"decide on a degree of normalization that balances the need to reduce redundancy with performance requirements"（程度裁量）。来源：https://forum.thethirdmanifesto.com/wp-content/uploads/asgarosforum/987737/00-efc-further-normalization.pdf、https://docs.oracle.com/en/database/oracle/oracle-database/26/dwhsg/data-warehouse-logical-design.html、https://www.ibm.com/think/topics/data-modeling（检索 2026-11-20）| 事实 + 判断（"教程广泛宣称 3NF 硬规"为二手说法，不采信）
- Crow's Foot 记号溯源：最可信出处为 Barker 等（约 1981 CACI 时期发展、Oracle CASE Method 系列书 1990 采纳）；Barker 原书正文未核读（二手转述）；更早线索（Everest 1976）一手出处未锁定。来源：https://en.wikipedia.org/wiki/Barker%27s_notation（检索 2026-11-20）| 二手线索
- mermaid erDiagram 能力边界（HTML 逐字核对）：四基数（`|o` 零或一 / `||` 恰一 / `}o` 零或多 / `}|` 一或多，"最外侧字符表最大值、最内侧字符表最小值"）× 识别/非识别（实线/虚线）× 单向关系标签（"Some ER diagrams label relationships from both perspectives, but this is not supported here"）；实体属性块支持类型/名称、`*` 主键、PK/FK/UK 逗号并列、尾注释、可空 `?`（v11.16+）；属性类型为自由字符串无内置校验。覆盖 Chen 核心子集。来源：https://mermaid.js.org/syntax/entityRelationshipDiagram.html（检索 2026-11-20）| 事实 + 判断（子集归类）

## Q4 场景走查承载期望：方法出处与组合声明

- CRC 卡片一手（OOPSLA'89，c2.com 作者官网全文；两处关键句经本次调研独立抽验逐字命中）："If the situation calls for a responsibility not already covered by one of the objects we either add the responsibility to one of the objects, or create a new object to address that responsibility."（走查暴露未覆盖职责 → 补职责/建新对象）；"a concerned designer can influence team members by suggesting scenarios aimed specifically at suspected weaknesses or omissions."（定向场景探测薄弱点）；"creating objects not to meet mythical future needs, but only under the demands of the moment"（按需建类防过度建模）。来源：https://c2.com/doc/oopsla89/paper.html、https://dl.acm.org/doi/10.1145/74878.74879（检索 2026-11-20）| 事实
- Use Case 2.0 官方白皮书（作者官方 PDF）："As the team walks-through the design they picture it on a white board, typically in the form of a simple sequence or collaboration diagram"；分析切片操作 = 识别受影响系统元素 → 定义各元素职责 → 定义元素间交互；use-case realization 的认可表达形式原文明确列出 "simple tables, story-boards, sequence diagrams, collaboration diagrams, and data-flow diagrams"（DFD 在列）。来源：https://www.ivarjacobson.com/files/use-case_2_0_e-book_2023_0.pdf（检索 2026-11-20）| 事实
- RUP 分析操作规程："Identify the analysis classes responsible for the required behavior by stepping through the flow of events of the scenario"（沿场景事件流逐步走查识别分析类）；设计侧回溯链 "trace behavior in the Design Model back to the Use-Case Model"。（IBM Rational 官方 RUP 过程文档，经第三方镜像站承载，正文为官方内容）来源：https://files.defcon.no/RUP/process/activity/ac_ucana.htm、https://files.defcon.no/RUP/process/activity/ac_ucdes.htm（检索 2026-11-20）| 事实（层级注明：官方内容第三方镜像）
- GWT 出处：Dan North "What's in a story?"——Given/When/Then 格式原文（含序列型变体；"The givens should define all of, and no more than, the required context"）。来源：https://dannorth.net/blog/whats-in-a-story/（检索 2026-11-20）| 事实
- 相邻先例：BPMN 2.0 规范 Lane 按角色（Performer）划分；Shostack 1984 服务蓝图四层（顾客行动/前台/后台/支持过程，含失败点排查）；NN/g 旅程图五要素（actor/scenario/phases/actions/opportunities，"Focus on one actor per map"）。来源：https://www.nngroup.com/articles/journey-mapping-101、https://hbr.org/1984/01/designing-services-that-deliver（检索 2026-11-20）| 事实（厂商实务/期刊；泳道按角色走查无一手成文方法论）
- 组合性质声明（判断，重要）：本组合方法不是任何单一文献的既有规程。骨架（场景执行走查 + 暴露未覆盖元素 + 补卡补类 + 重走）在 CRC / RUP / Use Case 2.0 三处一手文献各有直接原文支撑；但「固定 DFD/类图/ER 三视图一套走查」「GWT 绑定对象走查」「图上走通 = 完备」的二元验收判据是工程化推断——CRC 原文是"按需补卡"而非失败判据；ER 走查（持久化数据无归属 → 补实体）仅有弱支撑（UC2.0 把数据库表纳入 realization 范围、RUP 有 persistence 行为步骤）。实现技能时文本应声明组合性质，二元判据措辞不冒充既有规程。

## Q5 方法学编排：四方法产物、信号与组合先例

- SA 产物正源（原作者一手）：Yourdon《Modern Structured Analysis》工具目录 Ch9 DFD、Ch10 数据字典、Ch11 加工说明、Ch12 ERD、Ch13 状态转换图、Ch14 模型平衡（作者本人 SA Wiki 存档）。SA 视角原文（转引 NASA 1986 报告）："views a system from the perspective of the data flowing through it"。来源：https://web.archive.org/web/20070203213944/http://www.yourdon.com/strucanalysis/wiki/index.php?title=Table_of_Contents、https://en.wikipedia.org/wiki/Structured_analysis（检索 2026-11-20）| 事实（一手目录）+ 二手（NASA 转引）
- OMT 三模型：object（静态结构）/ dynamic（"state diagrams for all objects … that display significant dynamic behavior"）/ functional（"corresponding roughly to data flow diagrams"）——功能模型直接采用 DFD，构成"SA 产物可整体进入 OOA"的组合先例；"The object model is the most important of the three models."（原书文字，第三方托管副本）。来源：https://en.wikipedia.org/wiki/Object-modeling_technique、https://www.scribd.com/document/387167002/（检索 2026-11-20）| 二手转述原书 + 原书文字非官方托管
- RUP 分析类三分（IBM 官方一手，两文档交叉）：boundary "Mediates between the system and something outside the system"；controller "Provides the coordinating behavior in the system"；entity "Reused in many use cases, often with persistent characteristics"；链条 = 用例 → use-case realization → 行为分派三类分析类；关键同构结论："The analysis model focuses on capturing the use cases for the application and does not make any decisions regarding the architecture of the solution"（分析模型不对解决方案架构做决策，抽象于设计模型之上）。来源：https://public.dhe.ibm.com/software/websphere/JavaDevTools/Resources/RSM-Fundamentals/RSM-Fundamentals_student_manual.pdf、https://www.redbooks.ibm.com/redbooks/pdfs/sg247105.pdf（检索 2026-11-20）| 事实（厂商官方一手）
- DDD 战略设计（作者一手）：Evans 官方 Reference——DDD 三要点（聚焦核心域 / 领域与实践者协作探索模型 / 在显式限界上下文内说通用语言）；bounded context "Explicitly define the context within which a model applies"；聚合 "Transactions should not cross aggregate boundaries"；适用信号原文 "particularly suited to complex domains, where a lot of often-messy logic needs to be organized"；Fowler 补充"语言变了就要换模型"（"you need a different model when the language changes"）。来源：https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf、https://martinfowler.com/bliki/BoundedContext.html、https://martinfowler.com/bliki/DDD_Aggregate.html、https://martinfowler.com/bliki/DomainDrivenDesign.html（检索 2026-11-20）| 事实（作者一手）
- 信号映射表（全部为判断；技能文本以「信号清单亮牌 + 默认建议」呈现即可，不伪装成事实）：多角色数据沉淀/加工链清晰 → 分层 DFD + 数据字典，数据沉淀强再加 ERD（依据 Yourdon 工具分工）；用例清晰多角色交互 → 用例 → realization → BCE 分析类（依据 IBM 一手）；对象状态多事件驱动 → 状态图（依据 OMT dynamic model 分工）；业务规则复杂/术语歧义/多子域 → 先切限界上下文再类模型与聚合（依据 DDD 一手）；DDD 与 RUP/SA 同流程组合无一手先例（二手博客未采信）。
- 诚实缺口清单：DeMarco 1978 / Yourdon 1989 / Coad-Yourdon 1990 / Rumbaugh 1990-91 四本原书均无官方公开电子版，内容核对依赖作者 Wiki（一手）、书目与学术二手转述；Levine CSTR 165 被 Cloudflare 拦截未直读；FAA 手册附录原文被拦截未取得。

## Q6 mermaid 语法与平台渲染

- mermaid 三图官方语法（一手，多代理独立核对 + 交叉一致）：flowchart 形状/连线清单、classDiagram 关系/多重性/成员记号、erDiagram 基数/键/注释——详见 Q1/Q2/Q3 各节（同一来源不重复列）。来源：https://mermaid.js.org/syntax/flowchart.html、https://mermaid.js.org/syntax/classDiagram.html、https://mermaid.js.org/syntax/entityRelationshipDiagram.html（检索 2026-11-20）| 事实
- GitHub 官方支持："Diagram rendering is available in GitHub Issues, GitHub Discussions, pull requests, wikis, and Markdown files."；写法 = ```mermaid 围栏代码块；官方不承诺固定 mermaid 版本，可用只含 `info` 的块实测当前版本。来源：https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams、https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/（检索 2026-11-20）| 事实
- 云效 Codeup：**未找到一手来源**——多轮定向检索 help.aliyun.com 云效/Codeup 章节（markdown 语法/代码库文档/合并请求/更新日志）均无 mermaid 字样；社区旁证（2024-05 提问帖"README mermaid 显示不出来"，无官方回答）仅说明疑似不支持。实现时必须在 Codeup 的 README 渲染、MR 描述/评论、工作项描述逐一实测，不得以本报告推断其支持与否。来源：https://help.aliyun.com/zh/yunxiao/product-overview/2023、https://developer.aliyun.com/ask/623448（检索 2026-11-20）| 事实（检索为空的负面结论）+ 二手线索（社区帖）
- 版本风险：v11.3.0+ 才有 `datastore`/`A@{ shape }` 新形状语法；v11.15/11.16/11.17 各加 classDiagram namespace、erDiagram 可空类型与子图；v12.0.0 为视觉/配置层最大破坏性版本（ELK 默认布局、默认主题/观感变更、`defaultRenderer` 移除；回退：front matter 设 `theme: default`、`look: classic`、`layout: dagre`）。同一份图源码在不同宿主钉的版本不同，渲染结果可能不一致。来源：https://raw.githubusercontent.com/mermaid-js/mermaid/develop/packages/mermaid/CHANGELOG.md（检索 2026-11-20）| 事实；实现时请复核（时效敏感）
- 保守语法子集建议（判断）：技能产图只用各图核心记号（经典形状记号、8 种 classDiagram 关系、erDiagram 四基数 + PK/FK/UK），避开 v11.15+ 新特性与 front-matter 主题定制；数据存储优先 `datastore`、版本不可用时退圆柱 `id[(text)]`——文本可读性不依赖渲染（这是 mermaid 承载的兜底属性）。

## 对本项目的映射要点

- 回答 FR-2（三视图怎么画）：三视图各有权威记号纪律与 mermaid 子集——流程模型按 Gane-Sarson 方言 + 四要素映射 + 分层/编号 + 无控制流；对象模型按概念层纪律（Larman/Fowler 克制清单，聚合慎用、组合强语义勿滥用）；数据模型停概念+逻辑层（物理层归实现，与"design 不含实现细节"同构）。实现票可直接把这些纪律写成 references/ 方法分册。
- 回答 FR-3（期望承载）：走查规程骨架有三源一手支撑（CRC 按场景执行补卡 / RUP 沿事件流走查 / UC2.0 walks-through + DFD 认可形式）；「走通 = 完备」二元判据与 ER 走查为组合推断——技能文本声明组合性质，不冒充既有规程。
- 回答 FR-6（缺口机制）：「缺口与矛盾」节的操作原型即 CRC 原文"职责未被覆盖 → 补职责或建新对象" + "定向场景探测薄弱点"——缺口节的"发现→补图→重走"循环有一手出处。
- 回答 FR-5（信号清单判据）：Q5 信号映射表为素材（多角色数据沉淀 → DFD+ERD；多角色交互 → BCE；状态复杂 → 状态图；多子域术语歧义 → 先切上下文）。各行为判断，技能以亮牌形式呈现合法；DDD 与其他方法组合无一手先例，引用时注明。
- 核销 need 假设与风险节轻风险的一半：GitHub 渲染官方支持无虞；Codeup 侧升级为"未找到一手来源、实现时必实测"——技能文本应写明 mermaid 文本承载、渲染失败不影响文本可读。
- 否掉的方案：UmlAsBlueprint 全蓝图正向工程（与 Fowler 作者立场相反："too difficult to do well and slows down a development effort"）；「逻辑层必须 3NF」硬规（无一手出处，写程度裁量）；DFD 记法找"标准"（无 ISO/IEEE 规范标准可依，引教材 + 厂商多源一致）；概念层用聚合/组合表达弱从属（OMG 明言 shared 语义不定，宜用普通关联）。
- 遗留（实现时处置）：① Codeup 渲染实测（README/MR/工作项三处）；② `datastore` 形状的版本依赖（<11.3 平台退圆柱）；③ GWT × 三视图走查的组合判据措辞定稿（二元判据怎么声明组合性质）；④ 概念层若需关联类/多元关联的降级策略（普通关联 + note）。

## 来源清单（检索日期 2026-11-20）

一手来源（标准/官方文档/作者一手/厂商官方）：

1. https://mermaid.js.org/syntax/flowchart.html （mermaid 官方）
2. https://www.csc.lsu.edu/~chen/pdf/erd-5-pages.pdf （Chen 1976 作者公开 PDF）
3. https://www.omg.org/spec/UML/2.5.1/PDF （OMG UML 2.5.1 规范）
4. https://www.ivarjacobson.com/files/use-case_2_0_e-book_2023_0.pdf （Use Case 2.0 官方）
5. https://c2.com/doc/oopsla89/paper.html （CRC 原论文作者官网；正式收录 https://dl.acm.org/doi/10.1145/74878.74879 ）
6. https://dannorth.net/blog/whats-in-a-story/ （GWT 出处）
7. https://www.ibm.com/think/topics/data-flow-diagram 、https://www.ibm.com/think/topics/data-modeling （IBM 官方）
8. https://aws.amazon.com/what-is/data-modeling/ 、https://www.microsoft.com/en-us/microsoft-fabric/resources/data-101/what-is-data-modeling 、https://docs.oracle.com/en/database/oracle/oracle-database/26/dwhsg/data-warehouse-logical-design.html （AWS/微软/Oracle 官方）
9. https://public.dhe.ibm.com/software/websphere/JavaDevTools/Resources/RSM-Fundamentals/RSM-Fundamentals_student_manual.pdf 、https://www.redbooks.ibm.com/redbooks/pdfs/sg247105.pdf 、https://www.redbooks.ibm.com/redbooks/pdfs/sg247362.pdf （IBM 官方 RUP/建模材料）
10. https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf （Evans 官方）
11. https://martinfowler.com/bliki/UmlMode.html 、/UmlAsSketch.html 、/UmlAsBlueprint.html 、/BoundedContext.html 、/UbiquitousLanguage.html 、/DDD_Aggregate.html 、/DomainDrivenDesign.html 、/AnemicDomainModel.html 、https://martinfowler.com/eaaCatalog/domainModel.html （Fowler 作者一手）
12. https://web.archive.org/web/20070203213944/http://www.yourdon.com/strucanalysis/wiki/index.php?title=Table_of_Contents （Yourdon 作者 Wiki 存档）
13. https://www.iso.org/standard/11955.html （ISO 5807 官方页）；https://nvlpubs.nist.gov/nistpubs/Legacy/FIPS/fipspub183.pdf （FIPS 183 存档）；https://cs.fit.edu/~kgallagher/Schtick/Serious/SWEBOKv3.pdf （SWEBOK v3 官方出版物镜像）
14. https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams 、https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/ 、https://github.blog/changelog/2022-08-09-wikis-now-support-math-and-mermaid-diagrams （GitHub 官方）
15. https://help.aliyun.com/zh/yunxiao/product-overview/2023 等云效官方文档页（检索为空的负面结论所据）
16. https://raw.githubusercontent.com/mermaid-js/mermaid/develop/packages/mermaid/CHANGELOG.md 、https://github.com/mermaid-js/mermaid/releases/tag/v10.0.0 （mermaid 官方变更记录）
17. https://files.defcon.no/RUP/process/activity/ac_ucana.htm 、/ac_ucdes.htm （IBM 官方 RUP 过程文档第三方镜像，正文为官方内容）
18. 作者书文本（课程站承载，OCR）：https://www.cs.miu.edu/courses/de/cs425/admin/umldistilled.pdf （UML Distilled 3rd）、https://personal.utdallas.edu/~chung/SP/applying-uml-and-patterns.pdf （Larman 3rd）

二手线索（转述/讲义/百科/社区，仅作线索不冒充结论）：

- https://en.wikipedia.org/wiki/Data-flow_diagram 、/Structured_analysis 、/Object-modeling_technique 、/Barker%27s_notation
- https://ris.utwente.nl/ws/portalfiles/portal/5125880/Dehne_Wieringa_-_The_Yourdon_Systems_Method_and_the_Toolkit_for_Conceptual_Modeling.pdf （Yourdon 方法学术整理）
- https://is.muni.cz/el/fi/podzim2016/PB007/um/lec/05-StructuredAnalysis.pdf （大学讲义）
- https://www.scribd.com/document/387167002/ （OMT 原书第三方托管副本）
- https://developer.aliyun.com/ask/623448 （Codeup mermaid 疑似不支持的社区旁证）
- https://www.nngroup.com/articles/journey-mapping-101 、https://hbr.org/1984/01/designing-services-that-deliver （实务权威，无走查判据）
- https://github.com/orgs/community/discussions/70672 （GitHub mermaid 版本社区讨论）

诚实缺口：DeMarco 1978 / Gane-Sarson 1979 / Yourdon 1989 / Coad-Yourdon 1990 / Rumbaugh 1990-91 / Barker 1990 六本原书均无公开一手电子文本，相关结论的层级已在正文逐条标注；Barker 记号更早线索（Everest 1976）一手出处未锁定。
