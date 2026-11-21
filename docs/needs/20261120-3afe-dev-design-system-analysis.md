---
id: 20261120-3afe
status: confirmed
confirmed: 2026-11-20
created: 2026-11-20
---
# dev-design 重定位：承接澄清后的系统分析与设计（双形态）

## 背景与业务目标

使用者原话："dev-design 这个技能与我设想的不同，我希望它承接需求的澄清之后，开始系统分析与设计的工作"；"现在只有 want 没有 know 直接到 how，可能会造成实现偏移"。

现状管线里，need（want）确认后直接进 dev-spec，spec「实现决策」节一节要求写清模块/接口/schema/API 契约（how 的起点）——中间缺一层系统分析（know）：对象是什么、流程怎么走、数据怎么建模。三个具体痛点（使用者勾选确认）：

1. spec「实现决策」太早太挤：落笔时缺对象模型与数据模型撑腰。
2. need→spec 跨度太大：want 到 how 之间没有系统分析层。
3. design 现定位是 spec 批准后的可选技术方案，介入点在 know 层应该出现的位置之后。

业务目标（可验证）：

- 真实需求走完"need → 分析 → spec → 方案 → 拆票"全动线，spec 落笔有设计产物可引用。
- 简单需求被入口亮牌正确拒绝，直进 spec，零额外交互。
- 实现与设计的分歧全部显式留痕（偏离记录），评审对照时有据可查。

## 干系人与用户

| Actor | 要完成什么 | 成功标准 |
|---|---|---|
| 套件使用者（主，本仓库即维护者） | need confirmed 后触发分析形态；沿三视图走查并批准；spec 阶段确认缺口归置 | 每次人工门都是看图/看清单后拍板，无越权代拍 |
| dev-clarify（副，上游） | 出口指路新增分支："建议 /dev-design 先做系统分析" | 指路只改文案，不新增门禁 |
| dev-spec（副） | 起草「实现决策」时引用三视图；逐条确认缺口清单；偏离记录留痕 | spec 不再从零写模块/schema |
| dev-plan（副） | 拆垂直切片按对象/流程边界，而非按技术层 | 切片边界能指回图中对象/流程 |
| dev-implement（副） | 遵守设计边界实现 | 装载清单含设计产物 |
| dev-review（副） | Spec 轴对照设计查"做走样"；偏离记录条目为显式豁免 | 对照有材料、豁免有记录 |
| check.sh（副，基础设施） | design frontmatter 支持 need 谱系；validate/publish 适配两段批准 | 门禁行为与蓝图 §6.1 状态机一致 |

## 系统能力需求

- FR-1（分析形态介入点｜原话①②、拍板 D1）：dev-design 新增**分析形态**——输入为 confirmed 的 need，产出系统分析产物；现状"approved spec → 技术方案"保留为**方案形态**，双形态并存。
- FR-2（三视图｜原话③）：分析产物以 mermaid 内嵌 design 正文，含三视图——流程模型（数据流图，flowchart）、对象模型（UML 类图，classDiagram）、数据模型（数据建模，erDiagram）。
- FR-3（用户期望承载｜原话③、拍板）：期望以**场景走查**承载——沿 need 场景节 Given/When/Then 在三视图上走一遍，图上走不通的路径即缺口；不新增独立期望视图。
- FR-4（探索先行｜拍板）：起草前探索代码库，既有实体/流程/表结构入图作起点，图中区分"既有"与"新增"。
- FR-5（触发判据｜拍板 D2）：分析形态入口亮牌**信号清单**（need 涉多角色 / 数据沉淀 / 状态流转 / 外部系统对接 / 流程分支多等）+ 默认建议，用户点名决定；清单不命中 → 亮牌拒绝，直进 dev-spec。
- FR-6（缺口与矛盾节｜拍板 D4）：分析产物固定带「缺口与矛盾」节——走查发现的 FR 缺口、实体矛盾逐条留痕；need 本体不回改；dev-spec 起草时逐条与使用者确认后归置（落 spec 或列入下一轮建议）。
- FR-7（两门制接力｜拍板 D3）：分析节经走查批准（第一道 approved 门）→ 指路 dev-spec → spec approved → 回 dev-design 补方案节（模块划分 / 数据流 / seam 清单 / ADR，即现状内容）→ 方案节独立批准（第二道 approved 门）→ 指路 dev-plan。design 产物两段续写、两次批准。
- FR-8（偏离记录制｜拍板 D5）：spec 起草发现已批准的分析节有错/过时 → spec「实现决策」节逐条记"偏离设计点 + 理由"，分析节不回改（快照语义）；偏离条目成为 dev-review Spec 轴对照时的显式豁免；ADR 级偏离升格记 ADR。
- FR-9（下游消费｜拍板 UC3/5/6）：三视图下游消费——dev-spec 起草时引用、dev-plan 按对象/流程边界切片、dev-implement 遵守边界、dev-review Spec 轴对照查走样。
- FR-10（机械面适配｜拍板 D1 连带）：design frontmatter 契约调整以支持 need 谱系（分析形态批准时 spec 尚不存在，`spec` 字段缺省）；check.sh validate / publish 相应适配；design 投影受理面（挂对应 need 需求单评论）保持同口径。

## 场景

主流程（分析形态全动线）：

- Given 一张 confirmed 的 need，When 使用者运行 /dev-design，Then 入口亮牌信号清单与默认建议。
- Given 使用者点名做分析，When 技能探索代码库并起草三视图，Then design 产物（含「缺口与矛盾」节）以 draft 落盘。
- Given 三视图 draft，When 使用者沿 need 场景逐条在图上走查，Then 走得通的路径确认对齐，走不通的进「缺口与矛盾」节。
- Given 走查通过，When 使用者显式批准，Then 分析节 approved、指路 /dev-spec。
- Given spec approved，When 回 /dev-design 补方案节，Then 方案节经批准 approved、指路 /dev-plan。

异常流：

- Given 信号清单不命中（简单 need），When 入口亮牌，Then 拒绝并指路 /dev-spec，零产物（D2）。
- Given 信号命中但使用者不想做分析，When 使用者否决默认建议，Then 直进 /dev-spec，不阻断（D2 同款点名语义）。
- Given 走查发现 FR 缺口/矛盾，When 归置，Then 逐条进「缺口与矛盾」节，need 不回改，spec 起草时逐条确认（D4）。
- Given spec 起草与已批准分析节冲突，When 处置，Then spec「实现决策」记偏离 + 理由，分析节不回改（D5）。

## 假设与风险

开放问题已全部三路归置（拍板 D1–D5）或归 spec 实现决策，无真未知。

轻风险留痕：mermaid 在 Codeup 平台（评论/文件）的渲染效果未实测——已有先例兜底（dev-ship PR 模板 §11.8 已采纳 mermaid 为可选视图），渲染失败时文本仍可读，代价低；round 1 验收时实测一次即收敛。

## 范围与非目标

范围（技能级改动面，先改蓝图再改技能）：

- skills/dev-design 重写：双形态入口、三视图方法、「缺口与矛盾」节、两段批准动线。
- dev-spec / dev-plan / dev-implement / dev-review 四技能文本：引用设计、按图切片、遵守边界、对照与豁免。
- design 模板同步：蓝图 §6.1（frontmatter 契约）/ §6.5（模板要点）/ §8 决策点表 / §11.12 重写。
- check.sh：design need 谱系 frontmatter、validate、publish 适配。
- GLOSSARY 新术语登记（分析形态 / 方案形态）；README 与 docs/skills.md 技能清单行、安装器包内清单同步（verify-pack 对账）。

非目标（全部来自显式拍板或查证）：

- 期望→对象映射表：与既有 FR 追溯链（need→spec→acceptance）职能重叠，未勾选（本轮拍板）。
- confirmed need 就地修订机制：D4 明确弃选，状态机不开修订口子。
- 实体计数硬判据（≥N 实体触发分析）：D2 明确弃选，误伤简单需求。
- 独立分析产物目录 docs/analyses/：延续蓝图 v1.10 拍板"产物必须有下游消费者"，分析之实进 design 产物。
- dev-quick-implement 快通道接分析形态：一句话级改动不涉系统分析。

## 开放问题

清零。拍板记录：

- D1 → 介入点 = C 双形态（分析形态接 confirmed need + 方案形态保留现状）；弃"彻底前移"（反转 v1.9/v1.10 面过大）与"原地扩容"（介入点不变，不合原话①）。（去向 FR-1）
- D2 → 触发判据 = 信号清单亮牌 + 用户点名；弃实体计数硬判据、弃必经站+豁免。（去向 FR-5）
- D3 → 接力动线 = 两门制（分析走查门 → spec 批准门 → 方案节批准门，人工门 3 次）；弃一门制（方案节无 spec 上下文）与惰性方案节（seam 锚点缺失）。（去向 FR-7）
- D4 → 缺口回置 = 「缺口与矛盾」节（need 不回改）；弃 need 就地修订（状态机开口子面大）与退回重澄清（两次重开门）。（去向 FR-6）
- D5 → 偏离处置 = 偏离记录制（分析节快照不回改 + 评审显式豁免）；弃退回修订制（approved→draft 口子现契约不存在）；ADR 升格作 ADR 级偏离的组合通道。（去向 FR-8）
- UC → 用例 UC1–UC6 全保留（触发/走查门/spec 引用/方案节/拆票切/评审对照）；"人评审述标式"未单列——分析走查门（UC2）已承载人评审职能。（去向 FR-9）
- 表达 → mermaid 内嵌 + 场景走查承载期望 + 探索先行入图；期望→对象映射表落非目标。（去向 FR-2/3/4）
