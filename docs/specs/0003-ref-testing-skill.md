---
id: 0003
status: approved
round: 1
created: 2026-10-27
approved: 2026-10-27
---
# ref-testing 参考技能（六类测试参考 + 场景路由）

## 问题陈述

"什么是好的测试"没有落盘的单一真相源：红绿纪律只散落在蓝图 §12 dev-implement 范文里，表格驱动、集成、e2e、压力/容量、混沌五类测试完全没有标准，写测试时无参考可载；蓝图 v1.3 §10.2 将 ref-testing 列为批 1 待建。同时测试场景差异大（单行为循环 vs 全链路旅程 vs 故障注入），单一 30–60 行文件装不下六类细则，全部塞进 SKILL.md 又违背"技能全文每次进上下文是每个会话的税"的篇幅约束。

## 方案

按蓝图 §13.3 治理规则先升蓝图（v1.4）再建技能：ref-testing 采用 SKILL.md（通则 + 场景路由）+ references/（六类细则）两级结构——装载时先入通则，进入具体测试场景再按路由表按需读对应 reference，一次只载一个。

- **FR-1**：蓝图修订至 v1.4——§7.1 ref-testing 条目扩写（六类细则入 references/、按场景路由加载）、§7.2 引用矩阵加注、§10.1 行更新、§10.2 标注完成、§11.3 补 ref-testing 两级结构规格；修订先于技能落盘。
- **FR-2**：skills/ref-testing/SKILL.md——frontmatter 注明内部参考身份与 dev-implement（开工装载、写测试前重读）/ dev-fix（先写失败测试前）装载时机；总标准 + 通则（只测外部行为、期望值独立来源、只在预定 seam、一个测试一个行为、测试名即规格、失败可定位、可重复确定）；场景路由表覆盖六类并声明"一次只载一个"；反模式表（实现耦合/同义反复/横向切片：识别信号→修法）；自查口令；≤60 行。
- **FR-3**：skills/ref-testing/references/ 六文件——red-green（红绿循环）、table-driven（表格驱动）、integration（集成）、e2e、stress-capacity（压力/容量）、chaos（混沌），各 30–60 行，统一骨架：首句加载时机 → 好用例标准 → 好/差对照范例 → 反模式 → 自查口令。
- **FR-4**：安装与术语——~/.zcode/skills/ref-testing 符号链接指向仓库技能目录（与既有四个 ref-* 同法）；新术语（稳态假设等）登记进 GLOSSARY.md。

## 用户故事

- 作为仓库主人，我想让 dev-implement / dev-fix 写测试时有一份"什么是好测试"的参考可载，以便测试质量不靠模型自觉。
- 作为仓库主人，我想按当前测试场景只载入对应的那一份细则，以便上下文只为正在写的测试类型付税。
- 作为仓库主人，我想六类测试各有好/差对照，以便差例的识别信号可以直接进评审。

## 实现决策

- **两级结构**：SKILL.md 只留通则与路由（≤60 行，§13.1 控制流原则）；细则按场景拆 references/，先例为 sdlc 的 next-mode.md 与 setup-workspace 的按需加载声明。
- **通则跨类共用**：蓝图 §7.1 六条要点是六类测试的公共标准，红绿循环不因"先写失败测试"豁免"期望值独立来源"，混沌测试同样只在 seam 上注入。
- **场景路由靠信号不靠猜测**：路由表以"你现在要验证什么"的信号行描述，两可场景按更接近实际失败的一层选。
- **治理顺序**：先改蓝图（v1.4 修订记录 + 五处条款）再写技能，同工单内完成。

## 测试决策

- seam：`.sdlc/check.sh validate`（spec/ticket/review 模板校验）、`wc -l`（行数硬校验）、grep（条款登记与 description 结构）、符号链接可解析。
- 按蓝图 §13.2 自测清单执行适用项（触发 / 拒绝路径 = description 内部身份声明 / 重入 = N/A 无状态参考 / 产物校验 / 衔接 = §7.2 矩阵）；运行时行为验证留待消费者技能（dev-implement / dev-fix）建成。

## 验收场景

- [FR-1 | 工单级] Given 蓝图文件，When 核对版本行与五处条款，Then 版本行含 v1.4 修订记录，§7.1/§7.2/§10.1/§10.2/§11.3 均登记 ref-testing 六类参考与场景路由，且蓝图修订先于技能文件出现在同一提交序列。
- [FR-2 | 工单级] Given skills/ref-testing/SKILL.md，When 机械核验，Then wc -l ≤60、description 含"内部参考"与 dev-implement/dev-fix 装载时机、场景路由表含六行且声明"一次只载一个"、反模式表含三条反模式。
- [FR-3 | 工单级] Given references/ 六文件，When 逐一 wc -l 并 grep 骨架要素，Then 各文件 30–60 行且均含加载时机声明、好/差对照、反模式、自查口令。
- [FR-4 | 工单级] Given 安装目标，When `ls -la ~/.zcode/skills/`，Then ref-testing 符号链接指向本仓库 skills/ref-testing；GLOSSARY.md 含新登记术语。

## 非目标

不实现消费者技能 dev-implement / dev-fix（批 1/批 2 余项）；不改 `.sdlc/check.sh`；不为六类测试绑定具体框架（示例保持框架中立，TypeScript 仅作展示语言）；不做运行时技能触发验证（待新会话技能列表刷新）。

## 备注

批准依据：2026-10-27 用户在实现计划问答中选择"完整 spec 流程"并批准实现计划（含本 spec 的 FR 与验收场景全案），plan 获批即为 spec 0003 的用户批准，故落盘即 approved。工单编号 0005（ticket 序列下一号，与 spec 序列独立递增）。
