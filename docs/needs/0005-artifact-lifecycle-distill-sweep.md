---
id: 0005
status: confirmed
created: 2026-10-29
confirmed: 2026-10-29
---
# 流程产物生命周期归置：验收后蒸馏与清扫

## 背景与业务目标

现状：全部流程产物同权进库并永久留存（METHOD.md §4.1"一切流程产物进版本库，不往 .gitignore 加任何东西"）。本仓库 2026-10-27 启用流程，两天内 git 跟踪文件达 106 个，其中 docs/ 占 40（tickets 15、reviews 9、specs 6、needs 4、其余 6）；近 5 次提交全部是流程落盘（`[trivial]` 状态收口、评审落盘）。工单与评审在终态（done / approved）之后仍留在工作区，只余审计价值。代价：知识被过程残余稀释，静止态仓库不反映"系统现在是什么"，克隆与 PR diff 携带已完成工单。

来源：用户 2026-10-29 发起讨论"哪些产物应该跟 git 一起提交、哪些应该 .gitignore——目前全部产物都生产在 docs 对应目录跟 git 提交感觉有问题"；对照调研 mattpocock/skills（工作状态进 tracker、过程残余即弃、长期知识进仓库；其仓库 .gitignore 仅 node_modules 与 .claude）后，用户拍板混合方案："过程中保持现状，待工单完成验收后，蒸馏整合到 spec"，并确认"没有其他疑点"。

分档判据（讨论拍板）：看**价值在哪里到期**——价值越过终态仍被回读的是知识档（need、spec、design、adr、research、standards），终态即耗尽的是过程档（ticket、review、acceptance）。存储形态随架构：本仓库 git 原生，知识档 = 进库留存；过程档 = 过程中照常进库，验收通过后删除、以 git 历史为归档。

业务目标：闭单后工作区收敛为知识库。成功标准（可核销）：

- S1 一张 spec 验收通过并清扫后，工作区中该 spec 名下 tickets/、reviews/、acceptance/ 文件数为 0，且蒸馏内容已出现在对应知识档产物中。
- S2 `check.sh validate` 能拒绝"spec status: done 但名下过程档产物仍在盘上"的库，报错指明残留文件路径。
- S3 每闭一 spec，git log 新增恰一个提交承载蒸馏 + 清扫 + 状态推进（S4 前提下）。
- S4 开发过程中现行门禁行为不变：check.sh 既有校验项零增减，可对照改动前后 `check.sh phase` 输出。

## 干系人与用户

- 仓库主人（主 Actor）：使用本技能套件开发；要完成"开发完成后仓库保持知识库形态"；成功标准 S1–S3 由其验收。
- agent 会话（执行 Actor，dev-accept 为蒸馏 owner）：验收通过时执行蒸馏与清扫；蒸馏四路落点分别落进 need（dev-accept 修订）、spec 验收场景（dev-accept 修订）、新 ADR、CODING_STANDARDS.md 索引的 standards/。
- 门禁（check.sh + git hooks）：获得一条新全库校验（FR-4）；既有校验项与 hook 行为零改动。
- 未来读者 / 协作者：从 git 历史考古被清扫产物（`git log -- docs/tickets/` 可还原工单生命周期），从 tracker 投影检索已闭工单。
- 不变干系人：dev-clarify / dev-spec / dev-plan / dev-implement / dev-review / dev-ship 的过程行为零改动。

## 系统能力需求

- FR-1 过程照旧：开发过程中全部流程产物照常落盘并随 git 提交，现行提交规则与门禁行为不变（来源：用户原话"过程中保持现状"）。
- FR-2 验收蒸馏：spec 验收通过时，系统把过程档产物中的耐久内容折回知识档，四路各有落点——① 残余风险与证伪假设 → need「假设与风险」节，已验证的标记核销；② 行为契约修正（实现中发现的实际边界行为）→ spec 验收场景；③ 有架构分量的决策 → 新立 ADR；④ 模式学习 → CODING_STANDARDS.md 索引的 standards/（来源：讨论拍板四件套，用户无异议）。
- FR-3 终态清扫：蒸馏完成后，系统删除该 spec 名下全部过程档产物（tickets、reviews、acceptance 报告），不设归档目录（来源：拍板 D1）。
- FR-4 清扫机械门禁：check.sh validate 增加全库校验——spec status: done ⇒ 其名下 tickets / reviews / acceptance 不在盘上；清扫未完成不得置 done（来源：讨论拍板"能机械检查的绝不靠自觉"）。
- FR-5 分档判据成文：METHOD.md §4 载明分档判据与产物归属（FR-2 前的"分档判据"段），替代"不 gitignore 任何东西"的绝对表述（来源：讨论拍板；design 归知识档为拍板 D3）。
- FR-6 蒸馏-清扫原子性：蒸馏、清扫、spec 置 done 在同一次提交内完成，不产生违反 FR-4 的中间态（来源：讨论拍板"每闭一个 spec 一个清扫提交"，用户无异议）。

## 场景

主成功场景：

- Given 一张 approved spec 名下工单全部 done（已合并），集成级验收场景全部通过。
- When 用户运行 dev-accept。
- Then：
  1. 写验收报告（现状行为：场景结果 / 假设验证 / 残余风险 / 下一轮建议）。
  2. 蒸馏：①②③④ 按 FR-2 落盘。
  3. 清扫：删除该 spec 名下全部 tickets、reviews 与本次验收报告文件。
  4. spec frontmatter 置 done，validate 全库通过，一次提交落 main。
  5. need 够条件（成功标准全部核销且无未接受风险）时置 fulfilled。

异常流：

- E1 验收不通过（rejected）：不蒸馏、不清扫、spec 不置 done，按现状指路 dev-fix 或下一轮（FR-2 的前置条件是"通过"）。
- E2 蒸馏后 validate 仍报名下有过程档残留：spec 不得置 done，门禁拦停并指明残留文件（FR-4 生效样例）。
- E3 验收报告含"下一轮建议"且用户决定开轮：下一轮建议与其依据的残余风险必须先折回 need「假设与风险」节再清扫，否则开轮所需输入随报告删除（蒸馏完整性的边界，指回 FR-2①）。

## 假设与风险

- A1 清扫提交直接落 main 可行——本仓库为 solo + 自举场景；团队受保护分支场景未验证，代价：需改走 PR，蒸馏/清扫步骤本身不变。不确定度：低，代价：低。（验证：通过——round 1 清扫提交即落 main 并过 commit-msg 门禁；保护分支场景未触及，原判据维持）
- A2 协作者对被清扫产物的发现成本上升（工作区 grep 不到，需 `git log -- docs/tickets/` 考古或查 tracker 投影）：拍板 D1 已接受该代价换工作区干净。不确定度：低。（验证：通过——被删文件 git 历史可查，tracker 投影保留不回删）
- A3 全库状态-存在性校验与既有"依赖无环"校验同类（扫 docs/ frontmatter），check.sh 复杂度增量小。不确定度：低。（验证：通过——新增 spec_residue 单函数，run-tests 既有 148 用例零破坏，148→150 仅新增）
- 残余风险：`.sdlc/config.sh` 未定义任何检查命令（CHECK_LINT / CHECK_TYPE / CHECK_TEST 全空），`check.sh all` 只能响亮警告，run-tests.sh 150 用例依赖会话手动执行，出口门禁证据存在漏跑可能（来源：验收报告 0002，不阻塞验收）。
- 残余风险：spec 0006（dev-execute-orchestrator，round 2 已 passed 置 done）名下过程档 9 个仍在盘上（tickets 0012–0015、reviews 0006–0009、acceptance 0001）——它闭单于 FR-4 门禁诞生之前，validate spec 0006 及任何全库校验持续报红（来源：验收 0002 实跑发现；门禁行为正确，属遗留债）。
- 下一轮建议：① 对 spec 0006 补跑同款蒸馏清扫出口（其验收报告 0001 的残余风险与建议折回 need 0004 后清扫 9 个过程档，单个 `[trivial]` 提交）——这是"validate 全库通过"恢复的唯一路径；② config.sh 接线 `CHECK_TEST="bash skills/setup-workspace/tests/run-tests.sh"`；③ GLOSSARY 状态表 spec.done 行是否补"名下过程档已清扫"语义（评审 0012 范围外备注）。
- round 1 靶心：FR-2 蒸馏的落点完整性（E3 边界）与 FR-4 门禁（新机制）；FR-1 / FR-3 是既有行为的收拢，风险最低。（结果：全部命中——FR-4 由工单 0016 落地，FR-2/3/6 由工单 0017 落地，FR-5 由工单 0018 落地）

## 范围与非目标

非目标（全部来自显式拍板或既有原则）：

- 不改过程中任何行为：提交节奏、check.sh 既有校验项、各 dev-* 技能过程行为零改动（拍板：用户原话"过程中保持现状"，S4 核销）。
- 不做过程中状态翻转提交的噪音治理（如状态变更随工单内容同提交）——本轮不做，需要时另立（拍板：讨论中标记"可选优化，不阻塞主线"，用户确认无其他疑点）。
- 清扫不回删 tracker 投影：tracker 侧已发布的 issue / 工作项保留（依据 METHOD 既有原则"单向发布不回读"，讨论未推翻）。
- 不设 .scratch/ 草稿区、不对过程档产物 gitignore：归置手段是"终态删除"，不是"过程忽略"（拍板 D1）。

## 开放问题

（已清零。拍板记录：）

- D1 → 清扫 = 删除，git 历史即归档，不设归档目录（去向 FR-3；理由：归档目录使树重新膨胀，METHOD 既有哲学"修订历史是 git 的事"）。
- D2 → 过程中状态翻转提交噪音本轮不治（去向非目标第 2 条）。
- D3 → design 归知识档保留：它是结构契约，与 spec 的行为契约对偶（去向 FR-5）。
- 蒸馏 owner → dev-accept：验收通过出口现状已写假设验证/残余风险/下一轮建议四节报告，蒸馏是其自然延伸（去向 FR-2）。
- 方法 → 讨论式澄清：先调研 mattpocock/skills 归置方式（查证其 SKILL.md 与仓库 .gitignore），再以分档判据收敛，用户逐点确认；未启用结构化方法论文件。
