# GLOSSARY

本文档分两章：**流程术语与状态**由 setup-workspace 首建，是全仓库对流程词汇的共识来源，AGENTS.md 哨兵块引用本章；**项目术语**由各技能与用户在使用中续写，先到这里登记定义，再在文档与对话中使用。

## 流程术语与状态

### 产物类型

| 术语 | 定义 |
|---|---|
| need | 需求纪要：业务目标、干系人、系统能力需求（FR-N）、场景、假设与风险。一轮迭代的最上层依据。 |
| spec | 规格：用户视角的问题陈述、方案、用户故事、实现与测试决策、验收场景。改源码前的必要产物。 |
| design | 技术方案：模块划分、数据流、seam（测试边界）。配合 ADR 记录架构决策。 |
| ticket | 工单：一张可独立开工、可独立验收的实现单元，分 feature / fix 两类，同池编号。 |
| review | 评审报告：双轴（标准轴 + Spec 轴）findings 汇总，`tickets: []` 声明覆盖面。 |
| acceptance | 验收报告：集成后逐条运行集成级场景、逐 FR 核销、风险复审的结果。 |
| adr | 架构决策记录：难逆转、无上下文会困惑、真实权衡的决策，accepted → superseded。 |
| research | 调研报告：带来源引用的参考资料，无状态机。 |
| retro | 复盘报告：dev-retro 落盘 docs/retros/ 的复盘记录——豁免审计结论、改动清单与采纳记录。轻产物，不进 check.sh 门禁。 |

### 状态与推进者

| 产物.状态 | 含义 | 谁推进 |
|---|---|---|
| need.draft | 需求澄清中，开放问题未清零 | dev-clarify |
| need.confirmed | 澄清完成，可作为 spec 输入 | dev-clarify |
| need.fulfilled | 成功标准全部核销、无未接受风险（终态） | dev-accept |
| spec.draft | 规格起草中 | dev-spec |
| spec.approved | 用户已显式批准，可拆工单 | dev-spec |
| spec.done | 验收通过（终态） | dev-accept |
| design.draft / approved | 技术方案起草 / 定稿 | dev-design |
| ticket.ready | 阻塞已清、可开工 | dev-plan |
| ticket.in-progress | 开工中，进展写进 ## Progress | dev-implement |
| ticket.implemented | 实现完成、全量检查绿，待评审 | dev-implement |
| ticket.done | 已合并（终态） | dev-ship |
| review.draft / approved | 评审中 / 两轴阻断清零 | dev-review |
| acceptance.draft / passed / rejected | 验收中 / 通过 / 不通过 | dev-accept |
| adr.accepted / superseded | 生效中 / 被新 ADR 取代 | dev-design |
| retro.draft / done | 复盘中 / 复盘定稿（终态） | dev-retro |

### 关键机制

- **FR-N**：系统需求编号（need 定义，spec 验收场景覆盖，acceptance 核销）。没有场景覆盖的 FR 是孤儿，`check.sh validate` 报错。
- **工单级 / 集成级**：验收场景的验证层级。工单级映射进单张工单的验收标准；集成级拆不进单票，是 acceptance 的运行清单。
- **round**：spec 的迭代轮次。round 1 覆盖风险最大的最小范围（MVP），后续轮次由验收后的"下一轮建议"驱动。
- **frontier**：阻塞已清、可开工的工单清单，`check.sh frontier` 输出。
- **[trivial]**：提交豁免标记，限 typo 与纯文档改动；每次豁免留痕于 commit message，dev-retro 审计。
- **哨兵块**：AGENTS.md 中 `<!-- sdlc:begin/end -->` 之间的内容，由 setup-workspace 管理，勿手改。
- **盘上主本 / tracker 投影**：docs/ 是唯一真相源，tracker（GitHub/GitLab/Codeup）只单向接收发布，不回读。
- **门禁分级**：commit-msg 查轻量项（[#NNNN] 状态合法或 [trivial]）；pre-push 查重项（implemented 工单须有 approved 评审覆盖）。
- **L4 hook**：平台层拦截（`.sdlc/hooks/l4-guard.sh`，经 ZCode PreToolUse 触发）：拦含 `--no-verify` 的命令与无在办（in-progress）工单的 CODE_DIRS 源码编辑；失效安全为放行（fail-open），自身故障不锁死工作。
- **红绿循环**：每个行为先写一个失败的测试（红），再写刚好让它通过的实现（绿）的实现节奏；标准细则见 ref-testing 技能。
- **分诊定级**：dev-fix 对缺陷的定级（阻断：主流程不可用/数据错误或丢失/安全漏洞；重要：功能受损有绕行、影响面大；一般：影响面小；轻微：文案样式纯文档）与处置决策（现在修/排期/不修），落进 fix 票正文。
- **seam**：测试边界——测试只写在预先约定的接口处，不穿实现内部。design 的 seam 清单是 spec 测试决策的细化，dev-implement 在其上落测试（细则见 ref-testing）。
- **面向人的文档**：README、用户文档、API 文档等描述仓库实际行为、给人读的文档，dev-docs 的维护对象；与流程产物（docs/ 各产物目录）、METHOD.md（归 setup）、CHANGELOG（归 dev-release）分界；不含源码内注释与 docstring——那属源码文件，改动走工单。

## 项目术语

（首个项目术语落盘时由对应技能在此追加；格式：`术语 —— 定义（首次出现的产物）`）

- **稳态假设** —— 混沌测试的前置判据：一句可度量的系统正常状态描述，加"用哪些指标证明它成立"（如"下单成功率 ≥99.9%，以订单表增长与错误率为证"）；先有稳态假设才准注入故障（首次出现：ref-testing 技能 references/chaos.md）。
- **投影** —— tracker 适配器把 docs/ 产物单向镜像到平台对象（GitHub/GitLab issue、Codeup 工作项+评论）的行为；投影失败一律警告跳过不阻断，盘上产物永远是真相源（首次出现：need 0002 / spec 0004）。
- **映射文件** —— 适配器同目录的 `<tracker>.map` 三字段表（盘上相对路径、平台对象编号、对象 URL），支撑同一产物重复 publish 时更新而非新建；丢失映射的后果仅是可能新建重复对象（首次出现：spec 0004 实现决策）。
