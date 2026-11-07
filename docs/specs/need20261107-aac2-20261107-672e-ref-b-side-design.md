---
id: 20261107-672e
status: done
need: 20261107-aac2
round: 1
created: 2026-11-07
approved: 2026-11-07
done: 2026-11-07
---
# ref-b-side-design 参考技能（B端体验设计课六讲蒸馏 + 设计链挂载）

## 问题陈述

design-* 链在 B 端项目上有两个无据可依的断点：design-brief 做功能归类与信息架构、design-ui 出大屏/组件/权限模块时，决策靠模型通用知识，无仓库内章法可载。ref-refactoring-ui 只覆盖通用视觉层（源自《Refactoring UI》），不含 B 端结构层问题（功能怎么归类、命名用谁的语言、流程怎么编排）与 B 端特有场景。need 20261107-aac2 已拍板：从《B端体验设计入门课》「体验设计」6 讲（08–13）按方法论重组构建 ref-b-side-design 技能，挂 design-brief + design-ui，公开仓库零原文为硬门禁。

## 方案

按 ref-* 家族两级结构建技能：`SKILL.md`（总纲 + 任务路由 + 来源留痕）+ `references/` 四分册（按方法论阶段重组，非讲次一一对应）；design-brief 与 design-ui 各追加挂载（description + 正文装载行 + 蓝图 §7.2 矩阵行）；新术语登记 GLOSSARY 并同步副本；ref-* 家族枚举同批改。round 1 全量覆盖 need 全部 5 条 FR（圈法见备注）。

- **FR-1**：`skills/ref-b-side-design/` 技能——SKILL.md 与 references/ 四分册；`~/.zcode/skills/ref-b-side-design` 符号链接指向仓库技能目录（与既有 ref-* 同法）。
- **FR-2**：四分册按方法论阶段重组覆盖 6 讲——每条规则标注"来源：第 N 讲"，08–13 每讲至少 1 条规则可指回，重组无讲次静默丢失。
- **FR-3**：分册内容为蒸馏规则——每条规则可执行（步骤/判据/反模式/检查清单形态），零原文段落、零图片、零音频；课程案例只留结构化要点不搬运叙述文本；每册抽 2 条规则可对照素材快照指回讲次。
- **FR-4**：设计链挂载——design-brief / design-ui 两 SKILL.md 的 frontmatter description 各追加挂载语，两文件正文各补一条本技能装载动作行（照 ref-refactoring-ui 挂载先例：装载指令只写 description 时执行链路不可达）；docs/sdlc-skills-blueprint.md §7.2 引用矩阵补 design-brief / design-ui → ref-b-side-design 两行。
- **FR-5**：互补路由——SKILL.md 写明分工边界：本技能管 B 端结构层与业务章法，布局/配色/层级等视觉细节章法路由至 ref-refactoring-ui；description 声明内部参考身份（不独立响应设计请求，转 design-brief → design-ui 链）。

## 用户故事

- 作为设计执行会话（design-brief / design-ui 内），我想要按当前任务只载入对应方法论分册，以便上下文只为正在做的 B 端设计决策付税。
- 作为仓库主人，我想要每条规则标注来源讲次，以便设计决策能指回章法出处、验收可逐讲核对覆盖。
- 作为仓库主人，我想要技能内零原文零图片零音频，以便本仓库推公开 GitHub 不构成对付费专栏内容的再分发。
- 作为仓库主人，我想要 SKILL.md 记录六讲 URL 与快照日期，以便内容出处可查证、版权边界成文可审计。

## 实现决策

- **两级结构沿用家族先例**（spec 0003 / ref-testing / ref-refactoring-ui）：SKILL.md 只留总纲与路由，细则按任务拆分册、按需一次载一册。
- **分册切法定案（4 册，按方法论阶段排序）**：
  - `references/understand-customer.md` ← 08 前半 + 09 前半——复杂守恒定律（复杂性不可移除，只能决定谁来处理）、客户语言体系匹配（"巡查/追溯" vs "违规/监控"类判据）、原有业务与流程调研（业务三问）、组织结构与角色匹配；
  - `references/architect-structure.md` ← 08 主体 + 09 主体——MECE 功能归类（互相独立判据与耦合反例）、信息架构落地（导航结构 = 产品脑图）、新增功能归位纪律、泳道图、效率优先级判定（耗时 × 使用人数 × 步骤数）；
  - `references/craft-key-interface.md` ← 10——基础错误防线清单、多尔蒂门槛（响应时间与反馈节奏）、聚焦核心竞争力打造体验亮点；
  - `references/special-scenes.md` ← 11 + 12 + 13——册内按场景小节路由：数字大屏（信息呈现与视觉呈现分治）、组件化（组件体系搭建两步：3C 高频定位 → 信息架构复用检查；组件体验设计）、权限模块（权限逻辑先行再谈体验）。
- **分册统一骨架**：册首行 = 标题 + 来源讲次注记；开场两三句 = 本册解决什么问题；规则列表 = 每条"规则 + 正/反例文字描述 + 来源讲次标注"；册尾自查口令。规则为改写的祈使句，不转录原文。
- **SKILL.md 总纲**：B 端体验总标准一条（复杂性守恒——以客户视角重构复杂性的归属，目标是"找得到 + 看得懂"），路由表按"你现在要做什么"信号行覆盖四册并声明"一次只载一个"。
- **SKILL.md 来源留痕**：专栏名《B端体验设计入门课》、作者林远宏（汤圆）、六讲文章 URL（661481 / 662228 / 662704 / 663551 / 664257 / 664733）、内容快照日期 2026-11-07、版权声明（极客邦科技所有，未经许可不得传播售卖；本技能为方法论蒸馏，零原文零图片零音频）。
- **素材管线（A1 已消解）**：六讲全文已于 2026-11-07 经内置浏览器登录态提取至 `/tmp/geekbang-0813/`（6 文件 35,990 字符，逐一验证无付费墙），实现期作蒸馏输入与对照基准；该目录不入仓库、gitignore 覆盖之外的临时区，实现完成后清扫。
- **术语登记**：蒸馏引入的跨册术语（预计 3–5 条：复杂守恒定律、MECE、多尔蒂门槛、泳道图等）登记 GLOSSARY 项目术语章，注明首次出现位置（来源讲次）；GLOSSARY.md 为双份同步资产，`skills/setup-workspace/assets/GLOSSARY.md` 副本按 dual-copy-assets 第 4 条整文件复制随改。
- **家族枚举同批改**：本技能入册 ref-* 内部参考家族时，README 参考层条目、docs/concepts.md 内部参考条目（"六个内部参考"→ 七个并补一句定位）、蓝图 §7.2 引用矩阵按枚举同批改纪律同步更新（评审 20261107-36a7 落地口径）。
- **适用边界**：仅 B 端图形界面项目（Web/移动端/桌面端）；纯 C 端视觉任务、CLI 与文档视觉不适用（路由表写明转 ref-refactoring-ui 或不装载）。

## 测试决策

- seam：`.sdlc/check.sh validate`（spec/ticket 校验）、`wc -l`（体量：SKILL.md ≤ 60 行、每分册 ≤ 80 行，家风同 ref-refactoring-ui）、grep（"来源：第 N 讲"标注、挂载语、来源留痕三要素、GLOSSARY 登记条目）、`ls`（references/ 恰 4 个 .md、无图片音频文件）、`readlink`（符号链接解析）、`diff`（GLOSSARY 双份一致）。
- 对照型核验：FR-3 每册抽 2 条规则对照 `/tmp/geekbang-0813/` 素材快照，核对"规则可指回对应讲次小节且为改写非转录"；全技能 `grep` 无连续 ≥ 3 行原文段落（机械代理指标）。
- 运行时行为（design 会话实际装载并引用规则）不由本 spec 自动化验证，以集成级场景人工核销一次（先例：spec 0003 / ref-refactoring-ui spec 2f42）。

## 验收场景

- [FR-1 | 工单级] Given skills/ref-b-side-design/，When 机械核验，Then SKILL.md 存在、references/ 恰含 4 个 .md 文件且无图片音频文件，`readlink ~/.zcode/skills/ref-b-side-design` 解析到仓库技能目录。
- [FR-1 | 工单级] Given 全部技能文件，When `wc -l`，Then SKILL.md ≤ 60 行、每分册 ≤ 80 行。
- [FR-2 | 工单级] Given references/ 四分册，When `grep -o "来源：第 [0-9]* 讲"` 汇总讲次集合，Then 覆盖 {08,09,10,11,12,13} 无缺漏，且四册册首各有来源讲次注记；GLOSSARY 项目术语章含 3–5 条新术语且注明首次出现位置，`diff` 确认双份 GLOSSARY 一致。
- [FR-3 | 工单级] Given 四分册与 /tmp/geekbang-0813/ 素材快照，When 每册抽 2 条规则对照对应讲次原文，Then 规则为改写方法论表述而非原文转录、能指回对应讲次小节；全技能 grep 无连续 ≥ 3 行原文段落、无图片音频文件。
- [FR-4 | 工单级] Given design-brief / design-ui 两 SKILL.md 与蓝图，When `git diff` 核对，Then 两文件各含 frontmatter description 一行变更（含挂载语）、正文各新增一条本技能装载动作行，除上述行外其余内容不变；docs/sdlc-skills-blueprint.md §7.2 含 design-brief / design-ui → ref-b-side-design 两行；README 与 docs/concepts.md 枚举更新为含本技能。
- [FR-4 | 集成级] Given 新开会话技能列表，When 查找并读 design-brief / design-ui 的 description，Then ref-b-side-design 可被加载且两技能 description 含挂载语（人工在新会话核销一次）。
- [FR-5 | 工单级] Given SKILL.md，When 核对路由表与 description，Then 含"视觉细节章法路由至 ref-refactoring-ui"分工边界行、"仅 B 端图形界面适用"边界声明、"不独立响应设计请求"条款。

## 非目标

不做「体验设计」之外的讲次（need 非目标 1 继承）；不改 design-brief / design-ui 既有流程逻辑与路由结构（仅挂载三处 + 枚举同批改）；不搬运课程音频、视频与原文截图；不在技能内做可交互原型或工具；不产出 docs/standards/ 项目设计基线分册（归 design-baseline）；不自动验证 design 会话的运行时加载行为（集成级人工核销）。

## 备注

- 来源：need 20261107-aac2（confirmed，投影 issue #143）；need 拍板 D1 命名 / D2 分册重组方向 / D3 素材获取全部继承为本 spec 实现决策。
- 分轮：round 1 全量 5 FR——A1 素材风险已在 spec 期消解（六讲全文已落临时目录并逐一验证），A2 版权边界以 FR-3 验收硬门禁（抽样对照 + 连续 3 行 grep）消化，A3 讲次覆盖以 FR-2 逐讲核对消化；产物体量小（1 技能 5 文件 + 3 处挂载 + 枚举同步），分轮无收益。本圈法随本 spec 批准一并确认。
- 内容快照：《B端体验设计入门课》08–13 六讲，2026-11-07 登录态提取，`/tmp/geekbang-0813/`（不入仓库，实现完成后清扫）。
