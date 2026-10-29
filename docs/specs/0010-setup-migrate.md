---
id: 0010
status: done
need: 0007
round: 1
created: 2026-10-29
approved: 2026-10-29
done: 2026-10-30
---
# 存量项目套件迁移技能（setup-migrate）

## 问题陈述

已使用 matt / superpower 等外来技能套件的存量项目，工作流规则与生命周期产物散落在外来体系里：matt 套件把 spec / ticket 发布到 issue tracker（to-spec 原文"publish it to the project issue tracker"并打 `ready-for-agent` 标签），本地仓库几乎不留过程档，技能装在技能目录且允许模型自动调用。这类项目接入本套件时两套规则并存互相干扰——外来生命周期技能（to-spec、implement、tdd 等）仍可被会话自动选中，绕开本套件门禁链（蓝图 §10.3 已识别此风险）；外来产物在 tracker 与本地目录无归宿，未来会话既不敢用也清不掉。仓库主人要的是：一次迁移把外来痕迹识别干净、每件产物有明确归宿、本套件门禁生效，之后所有会话只按本套件规则工作。

## 方案

新增 setup-\* 家族按需服务技能 setup-migrate（技能总清单 22 → 23）：对存量仓库一次迁移——识别 matt / superpower 两个点名套件的安装痕迹（技能文件、规则文件、产物落点）→ 外来产物逐件翻译映射成本套件形态（分态规则：未完成的外来工作进正向流程现态照常推进，已完成的历史产物译为沉淀形态落盘即 `reconstructed`）→ tracker 上开着的-issue 外来 issue 关闭并注明已迁移 → 生命周期类外来技能移除或归档（写作类保留，判据沿蓝图 §10.3）→ 本套件门禁接入（未接入仓库 setup-workspace 全流程，已接入仓库仅补迁移产物，两态）→ 对账清单落盘（逐件来源 → 归宿，含显式弃置与失败留痕）。superpower 结构先调研后实现（dev-research 纪律），调研不可行回用户决策。出口指路 setup-reconstruct 可选串联知识逆向，不自动串联。

## 用户故事

- 作为仓库主人，我想让迁移一次识别出 matt / superpower 的技能与产物痕迹，以便没有外来残留干扰后续开发。
- 作为仓库主人，我想让每件外来产物都有明确归宿（翻译 / 归档 / 显式弃置）并可查对账清单，以便逐件核销、不丢不漏。
- 作为仓库主人，我想让未完成的外来工作进入本套件正向流程继续推进，以便在办事项不被冻结或丢失。
- 作为仓库主人，我想让已完成的外来历史沉淀为知识档而非伪过程档，以便不污染正向流程状态机。
- 作为仓库主人，我想让 tracker 上开着的-issue 外来 issue 被关闭并注明已迁移，以便 tracker 不再有活的外来工单。
- 作为仓库主人，我想让外来生命周期技能不再被自动触发（移除或归档），以便 agent 会话只走本套件门禁链。
- 作为未接入仓库的主人，我想让迁移顺带完成本套件接入，以便一次会话从外来体系切到本套件。
- 作为仓库主人，我想让迁移中的失败项（如 issue 关闭失败）在对账清单留痕，以便事后人工补办有据可查。

## 实现决策

**技能定位与结构（FR-1）**：终名 setup-migrate（D6 暂名转正，与 setup-reconstruct 同族同构），setup-\* 家族按需服务定位同 dev-docs——不进 sdlc next-mode 路由表，用户手动触发，出口形态 = 迁移报告 + 对账清单 + 指路。技能由主文档与按需加载的参考文档构成：主文档管入口门禁、流程骨架与禁止事项；参考文档承载套件识别特征清单、翻译映射表、处置协议（issue 关闭 / 技能归档 / 两态接入）与对账清单模板。入口前置：git 仓库 + 技能自身文件完整，不要求已接入本套件（两态在落盘阶段分流）。识别全程只读。

**套件识别（FR-1）**：内置两套点名套件的特征清单，不做通用识别器。matt 特征（2026-10-29 一手核验）：技能目录中的生命周期类技能（蓝图 §10.3 清单十四项）、tracker 上带五枚 triage 标签（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）的 spec / ticket issue、本地 markdown tracker 目录（.scratch/）、GLOSSARY-MAP.md、docs/agents/ 配置目录；superpower 特征以 FR-8 调研报告为准，实现时按报告落识别清单。识别出非点名套件痕迹 → 对账清单标"未处理"并提示用户，不擅自处置（E1）。

**翻译映射（FR-2，D1/D2）**：逐件翻译，不以原样归档替代翻译。产物对产物映射表：

| matt 产物 | 本套件归宿 |
|---|---|
| spec issue（tracker 或本地 tracker） | 本套件 spec（八节齐备，validate 通过） |
| ticket issue（tracker 或本地 tracker） | 未闭环 → 正向 ticket（ready）；已闭环 → 不产 ticket 产物（过程档不留僵尸），耐久内容折进对应沉淀 spec / ADR |
| questionnaire issue | need（未闭环 → 正向 draft；已闭环 → 沉淀形态） |
| ADR 文件 | 本套件 ADR，status: accepted（判据同逆向 ADR：描述当前生效的决策） |
| GLOSSARY 术语 | GLOSSARY 项目术语章（同名术语不覆盖，冲突报告交用户——setup-workspace 先例） |
| GLOSSARY-MAP.md | 显式弃置（其功能被本套件 GLOSSARY 取代），对账清单记理由 |
| docs/agents/ 配置 | 随生命周期技能处置（弃置或归档），对账清单记行 |

状态对状态映射（分态规则，D2）：未完成的外来工作（开着的 issue，非 wontfix，含 needs-triage / needs-info / ready-for-agent / ready-for-human）→ 正向流程现态——spec 落 draft 交用户走 dev-spec 审定，ticket 落 ready 且 spec 字段指向翻译出的 spec，照常走本套件流程；已完成的历史产物（已闭环 issue）→ 沉淀形态，落盘即 `status: reconstructed`（复用 need 0006 状态机扩展，本技能零新增状态），或折进既有沉淀产物。wontfix → 对账清单"显式弃置"，理由记"外来套件已拒"。每张翻译产物正文首部带「来源」行（外来产物位置 + 迁移日期）承载来源区分（D1：迁移 vs 逆向的区分走正文来源行 + 对账清单，不走状态机）；翻译产物不带扫描基线节（非扫描所得）。ready-for-human 等外来特有语义不新增状态，在产物正文显式记录。翻译沉淀 spec 的 need 字段可空（外来 spec issue 通常自含行为描述，不为凑字段伪造 need；无 need 字段时孤儿 FR 校验不触发，check.sh 既有行为）。

**tracker issue 处置（FR-3）**：开着的-issue 外来 issue 全部翻译后关闭，关闭评论注明"已迁移"并指向对账清单；经平台 CLI（gh / glab 等，与 publish 适配器同款调用面），不扩 trackers 适配器（其只发布语义保持不变）。本地 tracker（.scratch/）文件无外部副作用：标记关闭并归位。对账清单记录 issue 编号（或本地文件路径）与新产物路径。关闭失败（凭据 / 权限）→ 对账清单留失败明细，不阻断本地翻译与门禁接入，事后人工补办（E3）。

**生命周期技能处置（FR-4，D4）**：判据沿蓝图 §10.3——生命周期类移除或归档，写作类（writing-\* 等）保留。处置 = 移出技能发现路径；改 description 之类的软禁用不采用（不满足 S2 的"不再被自动触发"）。作用域决策点：技能装在仓库专属位置 → 直接处置；装在用户全局技能目录（如 ~/.zcode/skills，其他项目可能仍用）→ 默认归档而非删除，且处置前必须经用户确认作用域，不擅动全局安装。superpower 生命周期技能清单以调研报告为准。每件处置在对账清单记行。

**门禁接入（FR-5，D5）**：两态同 setup-reconstruct——未接入仓库先按 setup-workspace 全流程执行接入（含其决策点），随后落迁移产物，一次会话完成；已接入仓库仅补迁移产物与对账清单，接入资产逐字不变。

**对账清单（FR-6）**：落 docs/migrations/NNNN-slug.md，轻产物不进 check.sh 门禁（retro 先例同构），frontmatter 仅 `id` / `created`——快照语义，一次迁移一张，落盘即终态；重跑迁移生成新编号清单。每行：来源（本地路径 / issue 编号 + 平台）→ 归宿（新产物路径 / 归档位置 / 显式弃置及理由）→ 处置结果（已翻译 / 已关闭 / 失败待补 / 未处理）。E3 残留项人工补办后在原清单对应行补记。

**调研前置（FR-8，D3）**：superpower 实现票开工前必须存在带来源引用与检索日期的调研报告（dev-research 纪律，落 docs/research/）；调研不可行（够不着一手来源）→ superpower 支持范围回用户决策（缩小为报告所得特征，或延期下一轮），决策记录进对账清单备注。

**可选串联（FR-7）**：出口报告指路 setup-reconstruct——迁移只保证外来产物归宿，存量代码的知识逆向是另一件事；用户自选触发，不自动串联（dev-docs / dev-research 先例）。

**蓝图与清单同步**：蓝图（治理规则"先改本文档再改技能"）新增 setup-migrate 规格节（§11.19，排在 setup-reconstruct 的 §11.18 之后）、技能总清单 22 → 23、§5.2 目录树与所有权表补 docs/migrations/（轻产物待遇同 docs/retros/）、版本修订记录一条；README 技能表 setup-\* 区加一行。GLOSSARY 项目术语章登记「翻译映射」词条（随实现落盘；「对账清单」need 阶段已登记）。check.sh 与 trackers 适配器零改动。

## 测试决策

- seam 1：setup-migrate 主文档文本契约（dev-accept 先例）——断言主文档含关键词：两套点名套件特征、分态规则（未完成进正向现态 / 已完成落 reconstructed）、对账清单格式与落点、生命周期 / 写作类判据、全局安装须用户确认、两态接入、关闭注明已迁移，防技能文档漂移。
- seam 2：check.sh 与 trackers 零改动回归——本技能不改二者；既有 run-tests.sh 全组用例原样通过（含 spec 0008 落地后的 reconstructed 用例，若已并网）。
- seam 3：对账清单不进门禁的机械断言——validate 对 docs/migrations/ 下文件报"无法识别产物类型"（不受理即不进状态机），phase 与 frontier 输出不受 docs/migrations/ 存在影响。
- 真实存量仓库的完整迁移流程不进自动化（集成级留验收阶段，L4 hook / 蒸馏清扫先例）。

## 验收场景

- [FR-1 | 工单级] Given 一个装有 matt 套件、spec / ticket 在 issue tracker 的存量仓库，When 运行 setup-migrate 识别阶段，Then 识别报告覆盖技能目录生命周期技能清单、tracker 外来 issue 清单、本地痕迹（本地 tracker 目录、GLOSSARY-MAP.md、docs/agents/），且识别全程源码与用户文件零改动。
- [FR-1 | 工单级] Given 仓库存在非点名套件痕迹（E1），When 识别完成，Then 对账清单含"未处理"行并提示用户，迁移不擅自处置该痕迹。
- [FR-2 | 工单级] Given matt 开着的 spec issue 与其下开着的 ticket issue，When 翻译落盘，Then 产出正向 spec（draft）与正向 ticket（ready，spec 字段指向翻译 spec），产物节结构齐备、正文带来源行，validate 通过。
- [FR-2 | 工单级] Given matt 已闭环的 spec / ticket issue 与 wontfix 项，When 翻译落盘，Then 产出沉淀形态产物（reconstructed）或耐久内容折进既有沉淀产物，不产生伪过程档；wontfix 在对账清单记显式弃置及理由。
- [FR-2 | 工单级] Given 某件外来产物语义无法对应本套件形态（E2），When 处置，Then 对账清单记显式弃置与理由，不硬造产物。
- [FR-2 | 工单级] Given matt ADR 文件与 GLOSSARY 术语，When 翻译落盘，Then ADR 以 accepted 落本套件 ADR 目录、术语并入 GLOSSARY 项目术语章；同名术语不覆盖，冲突报告交用户处置。
- [FR-3 | 工单级] Given matt tracker 上开着的-issue 外来 issue 已全部翻译，When 执行处置，Then issue 关闭且评论注明已迁移，对账清单记录 issue 编号与新产物路径。
- [FR-3 | 工单级] Given 某 issue 关闭失败（E3），When 执行处置，Then 对账清单记失败明细，本地翻译与门禁接入继续完成，不被阻断。
- [FR-4 | 工单级] Given 生命周期类外来技能装在仓库专属位置，When 处置，Then 技能移除或归档出技能发现路径，写作类技能保留，对账清单逐件记录归宿。（验收 0001 边界修订 2026-10-30：逐件记录指处置件——移除 / 归档 / 弃置——逐行；保留的写作类不占清单行，处置结果四值无"保留"，由识别报告第 1 类清单承载并在迁移报告点名。）
- [FR-4 | 工单级] Given 生命周期类外来技能装在用户全局技能目录，When 处置，Then 技能不擅自改动全局安装，经用户确认作用域后再归档或移除。
- [FR-5 | 工单级] Given 仓库未接入本套件，When 迁移落盘，Then setup-workspace 全流程接入完成后才写迁移产物，一次会话完成，check.sh phase 与 frontier 可正常执行。
- [FR-5 | 工单级] Given 仓库已接入本套件，When 迁移落盘，Then 接入资产逐字不变，仅新增迁移产物与对账清单。
- [FR-6 | 工单级] Given 迁移完成，When 读对账清单，Then 每件外来产物一行：来源（本地路径或 issue 编号）→ 归宿（新产物路径 / 归档位置 / 显式弃置及理由）→ 处置结果；清单落 docs/migrations/，validate 拒识、phase 与 frontier 不受影响。
- [FR-8 | 工单级] Given superpower 实现票开工前，When 检查前置，Then 存在带来源引用与检索日期的调研报告；调研不可行时 superpower 支持范围回用户决策且决策记录在案。
- [FR-2、FR-3、FR-4、FR-5、FR-6 | 集成级] Given 一个真实使用 matt 套件的存量仓库，When 一次会话完成全迁移，Then S1 本套件门禁生效（check.sh / hooks 可执行）、S2 生命周期技能不再被自动触发、S3 对账清单逐件可核销。（留验收阶段）
- [FR-7 | 集成级] Given 迁移完成后的仓库，When 用户选择串联知识逆向，Then setup-reconstruct 可正常运行且两类产物互不覆盖；用户不选择时不产生逆向产物。（留验收阶段）

## 非目标

- 不做通用套件识别器——只内置 matt + superpower 两个点名套件（need 非目标 1）。
- 不改动正向流程技能与 check.sh 既有校验；check.sh 唯一相关扩展仍是 need 0006 已拍板的 reconstructed 状态机项，本技能零新增状态（need 非目标 2 / D1）。trackers 适配器保持只发布语义，不为关闭 issue 扩操作。
- 不强制串联知识逆向扫描——setup-reconstruct 可选，用户自选（need 非目标 3 / FR-7）。
- 不删除 tracker 上已闭环的历史 issue 与 label 定义——已闭环 issue 只翻译沉淀并记对账清单，tracker 侧无操作。
- 翻译产物用既有产物模板同构（八节 / 七节齐备）+ 正文来源行，不为迁移新增产物类型或必填节，validate 零改动。

## 备注

来源：need 0007（2026-10-29 confirmed，开放问题清零，拍板 D1–D6 记录在案）。分轮拍板（2026-10-29 用户选定）：round 1 全量覆盖 FR-1–8——最大风险 A1（superpower 结构未知）正由 FR-8 调研前置缓解且 D3 已拍板不可行回用户，matt 映射证据全部一手核验（to-spec / to-tickets / triage SKILL.md 原文与 setup-matt-pocock-skills 布局清单，2026-10-29 本机核验），round 2 留验收后残余风险（spec 0008 round 1 全量 7 FR 先例）。探索结论：check.sh validate 只受理 docs/ 八产物目录内文件，docs/migrations/ 天然不进门禁（与 docs/retros/ 同构）；孤儿 FR 校验仅在 spec 带 need 字段时触发（check.sh validate 实现核验）；reconstructed 合法值依赖 spec 0008 票 0001 落地——本 spec 名下工单须排其后；蓝图技能总清单现值 21（v1.17），setup-reconstruct 落地后 22，setup-migrate 落地后 23。GLOSSARY「对账清单」词条 need 阶段已登记，「翻译映射」随实现落盘登记。
