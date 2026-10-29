---
id: 0007
status: done
need: 0005
round: 1
created: 2026-10-29
approved: 2026-10-29
done: 2026-10-29
---
# 验收后蒸馏与清扫（流程产物生命周期归置）

## 问题陈述

全部流程产物同权永久进库：本仓库启用流程两天，git 跟踪文件 106 个中 docs/ 占 40（工单 15、评审 9），近 5 次提交全部是流程落盘。工单与评审在终态（done / approved）之后只余审计价值，却永久占据工作区，docs/ 与 git 历史被过程残余稀释，静止态仓库不反映"系统现在是什么"。仓库主人要的是"用完即收敛"：闭单后工作区只剩知识档（need、spec、design、adr、research、standards），过程档（ticket、review、acceptance）交给 git 历史归档——而开发过程中的提交与门禁行为必须一切照旧。

## 方案

验收通过时一次性收口：dev-accept 先把过程档里的耐久内容**蒸馏**回知识档——残余风险与证伪假设回 need「假设与风险」节，行为契约修正（实现中发现的实际边界行为）修订进 spec 验收场景，有架构分量的决策新立 ADR，模式学习追加进编码标准；然后**清扫**——删除该 spec 名下全部过程档（工单、评审、验收报告，含本次报告本身，tracker 投影不回删），spec 置 done，全部装进同一个 `[trivial]` 提交。check.sh validate 增加一条机械校验：status 为 done 的 spec 名下必无过程档残留，否则报错列出文件。METHOD.md 把分档判据（价值是否越过终态）成文。开发过程中零改动。

## 用户故事

- 作为仓库主人，我想在验收通过后仓库自动收敛为知识库，以便 docs/ 与 git 历史不再被已完成工单稀释。
- 作为仓库主人，我想让残余风险与行为契约在清扫前先落进 need / spec，以便清扫不丢失任何未来要回读的信息。
- 作为仓库主人，我想让"done 的 spec 名下还有过程档"被 validate 机械拒绝并指明文件，以便收敛不靠自觉。
- 作为未来协作者，我想从 git 历史与 tracker 投影考古已清扫的工单与评审，以便审计链不因清扫断裂。
- 作为 dev-accept 会话，我想要一条固定的蒸馏→清扫→置 done→原子提交出口序列，以便执行有章法、不产生门禁中间态。
- 作为在办的 agent 会话，我想让开发过程中的提交规则与门禁校验零改动，以便进行中的工作不受影响。

## 实现决策

**validate 新校验（FR-4；双份同步）**：validate 处理 spec 类型产物时，若 status 为 done，执行全库存在性扫描，凡满足"名下"关系的过程档仍在盘上即报错并逐个列出文件路径。"名下"关系定义：ticket 的 `spec` 字段指向该 spec；acceptance 的 `spec` 字段指向该 spec；review 的 `tickets` 列表与该 spec 名下工单有交集（评审按分支/spec 组织，跨 spec 覆盖在现行流程中不出现，交集规则取简单）。status 为 draft / approved 时不触发，过程中零影响。判定复用 check.sh 既有 frontmatter 解析函数，不新增解析器。活本与 setup-workspace 生成资产两份同步，重跑 setup 不回退该规则。

**dev-accept passed 出口序列（FR-2、FR-3、FR-6）**：现有出口为"机械判定 passed → 落盘报告 → validate + publish 报告"，在其后、"spec 置 done"前插入固定序列：

1. 蒸馏四路（落点各自过 validate）：① need「假设与风险」节逐条标注验证结果（验证通过 / 证伪 / 本轮未触发），残余风险与"下一轮建议"及其依据补写进该节——这是清扫的前置，不是可选步骤（E3 边界）；② spec「验收场景」按实现中发现的实际边界行为修订，仅 passed 后允许，rejected 时现行"不改 spec 正文"禁令原样保留（禁止事项相应改写为"蒸馏例外"表述）；③ 有架构分量的决策新立 ADR（status: accepted）；④ 模式学习追加进 CODING_STANDARDS.md 索引的 standards/。
2. 清扫：删除该 spec 名下全部 tickets、reviews 与本次验收报告文件（"名下"关系与 validate 校验同一定义）。
3. spec frontmatter 置 done、追加 done 日期，validate（含新校验）必须通过。
4. 原子提交：蒸馏编辑 + 清扫删除 + 状态置 done 合为一个 `[trivial]` 提交（纯文档改动，commit-msg 门禁既有规则直接放行），不产生中间态提交。

need 置 fulfilled 的判定逻辑不变。dev-accept frontmatter description 同步补蒸馏清扫一句话，保持技能路由描述准确。

**METHOD.md §4 成文（FR-5；双份同步）**：目录与所有权一节的总原则中"一切流程产物进版本库，不往 .gitignore 加任何东西"改为分档表述——知识档进库永久留存；过程档过程中进库、验收通过后随蒸馏清扫删除、git 历史为归档；"不往 .gitignore 加任何东西"保留（归置手段是终态删除，不是过程忽略）。§4.3"不做"清单中"不 gitignore 任何流程产物"条目措辞对齐分档表述；§5 spec.done 状态语义补"且名下过程档已清扫"；§7 validate 行补新校验说明。两份 GLOSSARY（活本与生成资产）同步：四词条（知识档 / 过程档 / 蒸馏 / 清扫）进生成资产的项目术语章，与活本一致。

**零改动面（FR-1；S4 核销依据）**：check.sh 既有子命令与全部既有校验项、commit-msg / pre-push 门禁、dev-clarify / dev-spec / dev-plan / dev-implement / dev-review / dev-ship 过程行为、setup 安装接线全部不动。`check.sh phase` 对缺失文件天然容错（逐文件循环），清扫后无需适配。

## 测试决策

- seam 1：validate 的 spec-done 残留扫描——纯机械判定，夹具仓库直接喂文件矩阵，断言报错文案含残留文件路径、通过场景静默。
- seam 2：dev-accept 出口序列的机械依赖与文本契约——序列落点用文本断言（SKILL.md 含蒸馏四路、清扫、原子提交的既定顺序关键词，防漂移），机械效果由 seam 1 与 git 端到端覆盖（dev-accept 本体是提示词技能，无可执行单元）。
- 沿用 run-tests.sh 的 `new_repo` 夹具 + `t`/`tn` 断言骨架，离线可重复；既有用例（publish 组、git hook 端到端组）基线不降。
- 文档同步断言：两份 METHOD.md 逐字一致、两份 GLOSSARY.md 逐字一致（spec 0005 先例）。
- 真实仓库的完整验收流程不进自动化（集成级场景留验收阶段，同 L4 hook 真实会话先例）。

## 验收场景

- [FR-4 | 工单级] Given 夹具仓库含 status: done 的 spec 且名下仍有 ticket、review、acceptance 各一，When validate 该 spec，Then 报错且文案列出全部三个残留文件路径；删除三个文件后重跑 validate 通过。
- [FR-4 | 工单级] Given 同仓 spec status 为 approved 且名下产物齐全，When validate，Then 通过（校验仅对 done 触发）；Given 一张 review 的 tickets 仅指向其他 spec 名下工单，When validate 本 spec，Then 不因该 review 报残留。
- [FR-2 | 工单级] Given 验收通过、need 含证伪假设与残余风险、spec 场景与实际行为存在边界偏差，When 执行蒸馏，Then need「假设与风险」逐条标注验证结果且残余风险补写进节内，spec「验收场景」修订反映实际边界行为，新 ADR 落盘且 status: accepted，standards 追加条目，各落点 validate 通过。
- [FR-2 | 工单级] Given 验收报告含"下一轮建议"（E3 边界），When 执行蒸馏与清扫，Then 该建议与其依据的残余风险已出现在 need「假设与风险」节内，清扫后 need 仍完整保留开轮输入。
- [FR-3 | 工单级] Given 蒸馏完成，When 执行清扫，Then 该 spec 名下 tickets、reviews、acceptance（含本次验收报告）在盘上为零，tracker 侧已投影对象不回删（映射文件仍记录历史对象编号）。
- [FR-6 | 工单级] Given 蒸馏与清扫完成，When 检查 git log，Then 恰一个新提交承载全部蒸馏编辑、文件删除与 spec 置 done，提交信息带 `[trivial]`，commit-msg 门禁对该提交通过。
- [FR-5 | 工单级] Given 文档成文完成，When 比对两份 METHOD.md 与两份 GLOSSARY.md，Then 同名文件逐字一致，且 §4 含分档判据（知识档 / 过程档、价值是否越过终态、终态删除而非 gitignore）。
- [FR-1 | 工单级] Given 改动前后各跑一次 phase / frontier / ticket 入口与 commit-msg 用例组，Then 输出逐项一致，run-tests.sh 既有用例基线不降。
- [FR-2、FR-3、FR-4 | 集成级] Given 真实仓库一张名下工单全部 done 的 approved spec，When 实跑 /dev-accept 且验收通过，Then 单个 `[trivial]` 提交内完成蒸馏、清扫与置 done，validate 全库通过，工作区无该 spec 过程档残留，git 历史可查到被删文件。（留验收阶段）

## 非目标

不做过程中状态翻转提交的噪音治理（need 0005 非目标）；不改 tracker 适配器与发布语义，清扫不回删平台侧对象；不给 phase / frontier 增加残留展示；不动 setup 安装接线与 L4 hook；不为被清扫产物设归档目录或任何 gitignore 规则；不做跨 spec 混合覆盖 review 的拆分清扫（交集整体删除，出现真实跨 spec 覆盖时另立）。

## 备注

来源：need 0005（2026-10-29 confirmed，用户原话"过程中保持现状，待工单完成验收后，蒸馏整合到 spec"）。分轮：round 1 覆盖全部六条 FR——蒸馏、清扫、门禁互为前提，最小可交付单位即整个机制（用户 2026-10-29 认可）。探索结论：check.sh 存在活本与生成资产两份（`.sdlc/` 与 setup-workspace assets），METHOD / GLOSSARY 同为双份同步（spec 0005 先例）；测试骨架为 run-tests.sh 的 new_repo 夹具；docs/adr/ 现为空，本 spec 落地的 ADR 由蒸馏在验收时产生。
