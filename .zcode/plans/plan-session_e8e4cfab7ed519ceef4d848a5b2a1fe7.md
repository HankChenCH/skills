# ref-testing 技能实现计划(完整 spec 流程)

## 背景

蓝图 `docs/sdlc-skills-blueprint.md` v1.3 已设计 ref-testing(§7.1 内容要点:只测外部行为、期望值来自独立来源、只在预定 seam 上测、一个测试一个行为、测试名即规格、失败信息能直接定位;§7.2 装载时机:dev-implement 写测试前重读、dev-fix 先写失败测试前装载;§10.2 标注待建),但**只覆盖红绿循环+集成两层,单文件 30–60 行**。本次按需求扩展为六类测试 + 场景化按需读取,依据 §13.3 治理规则"先改蓝图再改技能",蓝图升 v1.4。

仓库惯例(已核实):ref-* 技能为中文、frontmatter 仅 name+description(四段式内部身份声明);多文件按需加载先例 = sdlc/setup-workspace 的 references/ 模式("进入阶段前才 Read 对应文件,一次只载一个");`~/.zcode/skills/` 下为符号链接,无同步脚本,需手动 `ln -s`。

## 交付物

### 1. 蓝图 v1.4 修订(先于技能落盘)
- 版本行追加 **v1.4 修订记录**:ref-testing 规格化(六类测试参考 + 场景路由)。
- §7.1 ref-testing 条目扩写:通则不变,新增"六类测试细则入 references/,按场景路由加载"。
- §7.2 引用矩阵加注:ref-testing 装载后按 SKILL.md 场景路由表按需读 references/,一次一个。
- §10.1 行更新为"好测试的标准(含六类测试参考)";§10.2 标注 ✅ 日期。
- §11.3:ref-testing 规格 = SKILL.md(≤60 行,含场景路由表)+ references/ 六文件(各 30–60 行)。

### 2. `skills/ref-testing/SKILL.md`(≤60 行)
- frontmatter 四段式 description:内部参考,定义什么是好的测试(要点罗列);由 dev-implement 开工时装载(写测试前重读),dev-fix 在先写失败测试前装载;进入具体测试场景按路由表读取 references/;不响应独立测试请求,转 dev-implement / dev-fix。
- 正文:总标准一句 → **通则**(编号,含蓝图 §7.1 六条 + 可重复确定性)→ **场景路由表**(六场景→六文件:实现新行为→red-green;多组输入输出变体→table-driven;跨模块/集成级场景→integration;关键用户旅程→e2e;容量/性能目标→stress-capacity;故障注入→chaos;边界规则:一次只载一个、两可时按更接近实际失败的一层选)→ **反模式表**(实现耦合/同义反复/横向切片:识别信号→修法)→ 自查口令。

### 3. `skills/ref-testing/references/` 六文件(各 30–60 行,内容中文,示例 TypeScript)
每文件统一骨架:首句声明加载时机 → 该类好用例的标准(编号)→ 好/差对照范例 → 反模式 → 自查口令。
- **red-green.md 红绿循环**:Red 先写失败测试并确认失败原因="行为缺失"而非语法错;Green 写刚好通过的实现;禁止为变绿删测试、改弱断言、加条件跳过;一行为一循环。
- **table-driven.md 表格驱动**:用例表即规格,每行=一个行为、有名可读;列=输入+期望(含期望错误);期望值手算/来自 spec;边界与错误行与正常行同表;禁止表外特判。
- **integration.md 集成**:测真实协作者的接缝(不 mock 内部);外部依赖(DB/队列/第三方)用可控替身;断言数据流经边界后的行为;失败定位到哪个 seam 断了;环境可重建可重复。
- **e2e.md**:只覆盖少数关键用户旅程(穷举留在底层);断言用户可观察结果而非实现细节;语义化选择器;固定种子数据;失败留证据(截图/trace);数量少、跑合并前。
- **stress-capacity.md 压力/容量**:先有独立容量目标(来自 spec/SLA),没目标就没有"通过";测通过率曲线与劣化拐点、找瓶颈资源;固定环境+预热数字才可比;CI 只留阈值守门;结果记环境与数字可复现。
- **chaos.md 混沌**:先定义稳态假设(用什么指标证明"还正常")再注入;一次一个变量;先受控环境非生产裸奔;验证回弹恢复而非仅不崩;一键 abort、最小爆炸半径开始。

### 4. 安装
`ln -s` 建 `~/.zcode/skills/ref-testing` → 仓库 skills/ref-testing(仿既有四个 ref-*);GLOSSARY.md 视需登记新术语(如混沌的"稳态假设")。

### 5. SDLC 产物与提交
1. `docs/specs/0003-ref-testing-skill.md`:固定模板八节,FR 编号(蓝图修订/技能通则/场景路由/六类参考/安装),验收场景全部 `[FR-N | 工单级]`(纯文档改动);`status: approved`(以本计划获批为用户批准,备注节记录批准依据)。
2. `docs/tickets/0005-ref-testing-skill.md`:`spec: 0003`、`blocked-by: []`、ready;两者过 `check.sh validate`。
3. `check.sh ticket 0005` 通过 → status: in-progress → 修蓝图 → 写技能 → 机械自测(wc -l、链接解析、description 四段)→ 勾验收标准(逐条带证据)→ status: implemented + Progress。
4. 提交 `[#0005] 新增 ref-testing 参考技能`(过 commit-msg 门禁,不 push)。
5. 按 dev-review 双轴流程出 `docs/reviews/0003-ref-testing-skill.md`(`tickets: [0005]`,approved 后 pre-push 门禁可过)。

## 验收标准
- 蓝图 v1.4 与技能在同一工单内、蓝图先落盘;§10.2 ref-testing 标 ✅。
- SKILL.md ≤60 行;六个 reference 各 30–60 行;description 注明内部身份与 dev-implement/dev-fix 装载时机。
- 六类测试各有:加载时机、好用例标准、好/差对照、反模式、自查口令;场景路由表覆盖全部六类并声明"一次只载一个"。
- `check.sh validate` 对 spec 0003 / ticket 0005 / review 0003 通过;提交通过 commit-msg 门禁;符号链接生效。
