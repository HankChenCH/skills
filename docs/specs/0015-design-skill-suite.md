---
id: 0015
status: done
need: 0013
round: 1
created: 2026-11-03
approved: 2026-11-03
---
# design-* 界面设计技能套件：四技能、述标交付与脊柱三点建议

## 问题陈述

智能体设计前端界面时反复出现六类病：布局反直觉；配色像默认 Bootstrap；不区分移动端；忽略空态/加载态；设计不站在使用者角度（操作员要一屏多看数据，做出来是大区块表格；管理者要总览+明细）；对既有系统的风格跟随性差。且设计做完只有代码没有交付物——验收方既看不到设计意图，也没有可评审的界面，无法像建筑设计院述标那样"听意图、看界面、提意见"。（源：need 0013，用户 2026-11-03 澄清。）

## 方案

新增四个自包含技能，构成"场景约束 → 基线 → 设计 → 述标"链：

- **design-brief**：从使用者角色与任务产出书面设计约束（信息优先级/密度/关键操作路径），让设计有使用者依据。
- **design-baseline**：建立/读取项目设计语言基线（docs/standards/ 按平台分册 + CODING_STANDARDS.md 索引登记），让风格跟随有据可依。
- **design-ui**：在约束与基线下产出多平台布局+视觉决策，四态完备（正常/空/加载/错误），出口过硬指标自查清单。
- **design-deliver**：述标交付——design 产物新增「界面设计」节（设计意图/角色约束/风格跟随声明/自查结果）+ 可点 HTML 原型落 docs/designs/assets/；design 的 approved 门即述标评审门。

脊柱三点只建议不强制：dev-spec 出口建议"先述标再拆票"、dev-implement 装载基线与设计原则、dev-accept 对照述标核销。与 dev-design 分工：技术方案 vs 界面设计，并存时各写各的节互不覆盖。

## 用户故事

- 作为调用方，我想让界面设计从使用者角色与任务出发，以便布局贴合操作习惯（操作员一屏多看数据、管理者总览+明细）。
- 作为调用方，我想为项目建立一次设计语言基线并让后续界面跟随，以便风格统一、不再像默认 Bootstrap。
- 作为调用方，我想要覆盖 Web/移动端/桌面端/CLI/文档视觉的布局方案且含移动端适配决策，以便界面不挑设备。
- 作为调用方，我想要设计产出四态完备且过硬指标自查，以便不缺空态加载态、美观有可验证的底线。
- 作为验收方，我想读到设计意图说明并打开可评审的界面原型，以便知道为什么这么设计、对着界面提意见。
- 作为调用方，我想在脊柱三点被建议使用这套技能，以便合适时机不遗漏。
- 作为调用方，我想要 references 按对象类型分册、按需装载，以便单个技能文件不过载。

## 实现决策

- **四技能同构骨架（全部 FR）**：沿管线技能结构（前置工作区校验 / 入口门禁 / 装载上下文 / 纪律 / 出口门禁 / 中断交接 / 禁止事项），description 写宽（何时使用+何时会拒绝）。中断纪律同构：停前 draft 状态落盘，重入从盘上续接。
- **design-brief（FR-1）**：输入=spec 编号或对话描述；采集角色清单（拿不准 → 问用户，不猜）→ 逐角色产出设计约束：信息优先级、密度要求、关键操作路径 → 约束清单作为述标说明的输入随链传递。
- **design-baseline（FR-2/3）**：先查既有基线（docs/standards/ 设计分册，按平台命名 design-<platform>.md：web/mobile/desktop/cli/docs）；无 → 问用户是否建立，确认后引导产出分册，最低内容集=配色 / 字体 / 密度 / 间距与字号阶梯 / 组件观感 / 反例，并在 CODING_STANDARDS.md 索引登记；有 → 读入并执行跟随纪律。基线文件由技能现场产出，setup 不生成。
- **design-ui（FR-4/5/6/9）**：入口校验有约束输入（brief 产物或用户等价说明，无 → 指路 design-brief）；读基线（有则跟随，偏离逐条声明）；产出布局+视觉决策，Web 方案必须含移动端适配决策（断点或独立布局，明示二选一）；原型含四态；出口硬指标清单逐项自查并记录。硬指标默认阈值（A3 定稿）：正文对比度 ≥4.5:1（WCAG AA）；正文字号 Web ≥14px；触控目标 ≥44px（仅移动端触屏，桌面指针设备豁免）；间距与字号阶梯符合基线（无基线用套件默认阶梯）。references/ 按对象五分册，SKILL.md 留路由表，进入设计按对象装载对应分册（ref-testing 两级结构先例）。
- **design-deliver（FR-7）**：建/更新 design 产物——frontmatter 沿 design 现契约（id/spec/status/created），正文在技术节之外扩「界面设计」节，四小节=设计意图 / 角色约束 / 风格跟随声明 / 硬指标自查结果；可点 HTML 原型（四态，单文件零依赖，沿 dev-clarify 原型规格）由 design-ui 起草、design-deliver 定稿落 docs/designs/assets/<design-id>/（知识档进仓库，区别于样张的临时目录）；出口走 design 既有 approved 门，沉默不算批准=述标评审门。共产接口：design-deliver 可直接建立含「界面设计」节的 design 产物（简单 spec 不经过 dev-design 的 ADR 三条件值得做门）；与 dev-design 并存时各写各的节互不覆盖。
- **脊柱三点（FR-8）**：dev-spec 出口——识别 spec 含界面交付（用户故事/FR 提及界面、页面、原型）→ 出口建议"先 /design-brief 链述标再进 /dev-plan"，不强制；dev-implement——工单含界面实现 → 装载设计基线分册与 design-ui 原则；dev-accept——验收含界面 FR → 对照述标说明核销，无述标 → 按工单验收标准核销并在验收报告注明"无述标"（need 0013 场景 3）。
- **规则文本同步（治理：先改文档再改技能）**：blueprint——§6 design 模板补「界面设计」节说明、§11 新增四技能规格条目、§10.2 进度台账加行；METHOD（根 + assets 双份）——§6.1 状态表 design 行推进者补 design-deliver、产物目录说明补 designs/assets；GLOSSARY（根 + assets 双份）——流程章 design 行同步推进者；README——技能清单 23→27、特色段与脊柱建议点位各补一句。双份同步执行 docs/standards/dual-copy-assets.md 纪律（spec 0014 先例：commit 068e7a3）。
- **分轮承接（A1/A2）**：硬指标自查为 agent 出口自查，脚本化下沉（check.sh/CI）是 round 2 候选；「界面设计」节不进 check.sh validate（含界面 spec 才必填由技能出口纪律保证），校验下沉 round 2 评估。check.sh 与 hooks 资产零改动（Q8 甲）。

## 测试决策

- seam ①：四技能全链演练（dogfood）——在本仓库以真实任务跑 brief → baseline → ui → deliver，逐产物落盘核验：设计分册出现、CODING_STANDARDS 索引行出现、design 界面节四小节齐、assets 下四态原型可开、validate 通过。
- seam ②：述标评审门——design approved 推进须有用户显式确认记录；无确认时保持 draft（演练含一次"沉默不放行"）。
- seam ③：脊柱三点核验——三个脊柱技能文件的出口/入口含对应逻辑，grep 可核；"无述标"降级路径各演练一次。
- seam ④：硬指标自查——构造一张低对比度样张，自查报不通过 → 修复或豁免留痕。
- seam ⑤：双份同步——assets/ 与根目录 METHOD/GLOSSARY diff 一致（dual-copy-assets 纪律）。
- 既有先例：spec 0014 演练式 seam、spec 0011/0012 门禁演练、spec 0013 全链演练。

## 验收场景

- [FR-1 | 工单级] Given 角色清单含"操作员要一屏多看数据、管理者要总览+明细"，When 跑 design-brief，Then 约束清单逐角色含信息优先级、密度要求、关键操作路径，且作为述标说明输入随链传递。
- [FR-2 | 工单级] Given 项目无设计基线，When 跑 design-baseline 并经用户确认建立，Then docs/standards/ 出现按平台命名的设计分册（含配色/字体/密度/阶梯/组件观感/反例最低集），CODING_STANDARDS.md 索引出现对应行。
- [FR-3 | 工单级] Given 基线存在，When design-ui 设计界面，Then 述标说明含风格跟随声明；偏离基线的决策逐条附理由，无偏离则声明"全程跟随"。
- [FR-4 | 工单级] Given 对五类对象各出一个设计任务，When design-ui 逐一处理，Then 各对象产出对应平台布局方案，Web 方案明示移动端适配决策（断点或独立布局二选一）。
- [FR-5 | 工单级] Given design-ui/design-deliver 产出原型，When 打开原型，Then 正常/空/加载/错误四态齐备且可切换。
- [FR-6 | 工单级] Given ui/deliver 出口自查，When 执行硬指标清单，Then 逐项有结果记录；构造低对比度样张时，不通过项被修复或附豁免理由。
- [FR-7 | 工单级] Given 简单 spec（无技术设计级问题）含界面交付，When design-deliver 交付述标，Then design 产物由它直接建立、含「界面设计」节四小节、assets/<design-id>/ 含可点 HTML；Given 同 spec 需技术方案，When dev-design 与 design-deliver 并存，Then 各写各的节互不覆盖。
- [FR-8 | 工单级] Given spec 含界面交付，When dev-spec 走到出口，Then 输出含"先述标再拆票"建议；Given 工单含界面实现，When dev-implement 入口，Then 基线分册与设计原则的装载被指名；Given 验收含界面 FR 且无述标，When dev-accept，Then 按工单标准核销且报告注明"无述标"。
- [FR-9 | 工单级] Given brief/ui 的 references 目录，When 检查分册，Then web/mobile/desktop/cli/docs 五分册存在且 SKILL.md 路由表按对象指名装载。
- [FR-7/8 | 集成级] Given 本 spec 名下工单 dogfood（设计任务=本套件自身的呈现物），When 从 spec 出口建议 → brief → baseline → ui → deliver 全链 → 用户显式批准 design（述标门）→ 进 dev-plan，Then 全链产物在盘上逐项可核、脊柱三点建议全部出现。

## 非目标

- 不改 check.sh 与 hooks 等门禁机械资产（Q8 甲；非目标 3 经本 spec 批准精确化——assets 下的 METHOD/GLOSSARY 规则文本模板属双份同步资产，按既有纪律随改，不属于"不改 setup-workspace 资产"的禁改范围）。
- 不动 dev-review 门禁语义（Q10 乙否决丙案）。
- 不改 setup 行为：基线由 design-baseline 现场产出，setup 不新增基线生成步骤（Q9 丙）。
- 不做高保真设计稿 / Figma 等外部设计工具集成（Q13）。
- 不联动 prototype 等外部原型技能，套件完全自包含（Q14）。
- round 2 候选（本轮不做）：硬指标脚本化下沉、「界面设计」节进 validate 校验、分平台分册加深。

## 备注

- 输入：need 0013（issue #101，confirmed 2026-11-03）；本 spec round 1 全量覆盖其 9 条 FR（validate 孤儿 FR 规则，spec 0012/0013/0014 先例）；A1/A2/A3 已承接——A3 阈值在实现决策定稿，A1/A2 转 round 2 候选。
- 术语：述标 / 设计基线已登记 GLOSSARY 项目术语章（need 0013 定稿时）。
- 参考素材：Matt Pocock 套件技能（prototype / show-me 等）可作写法与形态参考，只参考不依赖（need 0013 范围节拍板）。
- 非目标 3 精确化属起草中发现的范围澄清，随本 spec 批准一并拍板；蒸馏时折回 need 范围节。
- dogfood：四技能的实现任务本身含界面交付（本套件的 README 与蓝图呈现），集成级场景以真实链自验。
- design 判据预期不命中：四技能边界机械枚举（入口/出口/装载三点 + 模板扩节 + 文案），无架构权衡；实现中若暴露设计级问题（如 design 产物双生产者契约冲突）再回 dev-design。
done: 2026-11-04
