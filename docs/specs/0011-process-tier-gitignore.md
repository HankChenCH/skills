---
id: 0011
status: done
need: 0009
round: 1
created: 2026-10-29
approved: 2026-10-29
done: 2026-10-30
---
# 过程档 gitignore 化（C+蒸馏清扫叠加落地）

## 问题陈述

need 0005 交付的机制是"过程档过程中照常进库、验收后蒸馏清扫删除"，git 历史持续累积过程档提交（自举期 8 张工单已被跟踪，三张在飞 spec 的 16 张活跃票将继续进库）。用户本意是方案 C 与蒸馏清扫叠加：过程档从立项起就被 .gitignore 排除、不进任何提交，验收后清扫盘上文件；git 记录只剩知识档变更与带 `[#NNNN]` 的源码提交。现行 ADR 0001 把 gitignore 列为被否备选，本规格正式替代该裁决。

## 方案

四类改动一次交付：① 本仓收口——.gitignore 追加三条过程档目录（tickets / reviews / acceptance），已跟踪的 8 张工单经 `git rm --cached` 一次提交移出索引（盘上保留，门禁照常）；② 生成面——setup-workspace 的 generation.md 新增 .gitignore 生成节（幂等追加、用户已有内容不动），SKILL.md 生成表加行、禁止事项行改写，新接入仓库开箱即得；③ 文档成文——METHOD §4.1/§4.3 分档表述改写、GLOSSARY「过程档」词条更新（活本与 assets 双份同步，既有逐字一致断言兜底）；④ 裁决替代——新 ADR 0002 记录"过程档 gitignore + 蒸馏清扫"，ADR 0001 置 superseded。check.sh、git hooks、dev-accept 蒸馏清扫序列零改动。

## 用户故事

- 作为仓库主人，我想让过程档文件从创建起就不出现在 git status 与任何提交里，以便提交流只剩知识档变更与源码提交。
- 作为仓库主人，我想让已跟踪的 8 张存量工单一次收口移出索引，以便新规则立即全量生效而非等各自验收。
- 作为新接入仓库的用户，我想让 setup-workspace 安装时就写好过程档忽略规则，以便开箱即得、不靠事后手动。
- 作为未来读者，我想从新 ADR 0002 看到裁决内容、与 ADR 0001 否决的差异及接受的代价，以便理解审计链承载为何从 git 历史改为 tracker 投影。
- 作为门禁，我想让全部校验照旧工作（工单在盘上即可解析），以便归置策略变更不触碰机械层。
- 作为在飞 spec 0010 的实现会话，我想让 setup 面修订以跨票依赖排在它的重叠票之后，以便同文件改动不打架。

## 实现决策

**忽略规则（FR-1）**：根 .gitignore 追加恰好三行——`docs/tickets/`、`docs/reviews/`、`docs/acceptance/`（目录级条目；产物目录懒创建，对不存在目录无副作用）。知识档目录（needs/specs/designs/adr/research/standards）不出现于 .gitignore。

**存量收口（FR-2）**：本仓一次性动作，单独 `[trivial]` 提交承载——.gitignore 三行 + `git rm --cached` 全部已跟踪过程档文件（当前 8 张，执行时以 `git ls-files docs/tickets docs/reviews docs/acceptance` 实际清单为准）+ 收口说明。盘上文件保留；不提交盘上删除。

**生成面（FR-6/S4）**：generation.md「各目标的确切写法」新增 `.gitignore` 节——生成写法为逐行幂等追加（每行先 grep 后追加），用户已有 .gitignore 内容一行不动，不设标记块（三行固定内容、追加去重即幂等）；收尾报告模板加对应行。SKILL.md §3 生成表加一行（.gitignore：幂等追加三条过程档忽略行，已有内容不动）；L77 禁止事项行改写为"触碰源码与用户自有文件；往 .gitignore 写过程档忽略三行以外的任何内容"——原句"往 .gitignore 加任何流程产物"整体废除。

**文档成文（FR-6，双份同步）**：METHOD §4.1 总原则中"归置手段是终态删除而非 gitignore，因此不往 .gitignore 加任何东西（审计链是门禁的一部分）"改写为分档表述——知识档进库永久留存；过程档过程中盘上存在、被 .gitignore 排除、不进任何提交，验收通过后蒸馏清扫删除；审计链主承载为 tracker 投影与源码提交 `[#NNNN]` 引用。§4.3"不做"清单中 gitignore 相关条目同向改写。GLOSSARY「过程档」词条由"过程中照常进库"改为"过程中盘上存在、被 .gitignore 排除"。双份逐字一致由 run-tests 既有断言（L1476-1477）强制。

**裁决替代（FR-5）**：新 ADR 0002（status: accepted）记录：裁决内容、与 ADR 0001 的否决差异及理由（tracker 投影已实装并经四轮收口实跑，审计链有版本库外承载）、显式代价（TRACKER=local 仓库工单文件史无痕；协作场景进行中票不随 clone）。ADR 0001 frontmatter status 改 superseded，正文顶部加一行指向 ADR 0002。

**零改动面（FR-3/FR-4/FR-7）**：check.sh 与 assets/check.sh 零字节变化；git hooks 转发与 L4 hook 不动；dev-accept SKILL.md 蒸馏清扫序列原文不动；知识档目录与现行提交规则不动。与在飞 spec 0010 的文件重叠（A3）：setup 面修订（generation.md + SKILL.md）单独成票并以跨票依赖（blocked-by 票 0011、0013）排后，具体归 dev-plan。

## 测试决策

- seam 1（机械，gitignore 行为）：run-tests.sh 新增用例组——new_repo 夹具写入三条忽略行后创建 docs/tickets/0001-x.md，断言 `git status --porcelain` 输出不含该文件、`git check-ignore -q` 对三目录各退出 0；对照断言 docs/needs/ 下文件不受影响（知识档可见）。
- seam 2（文本契约，防漂移）：generation.md 含 `.gitignore` 节与三条忽略行的确切写法；SKILL.md 不再含旧禁止句"往 .gitignore 加任何流程产物"、生成表含 .gitignore 行。既有双份逐字一致断言（METHOD/GLOSSARY）兜底文档同步，基线不降。
- 一次性收口动作不进自动化（本仓迁移，验收场景核销）；真实仓库的收口后首个验收流程留集成级场景。
- run-tests.sh 全量 ALL PASSED；check.sh 相关既有用例零变化。

## 验收场景

- [FR-1 | 工单级] Given 夹具仓库 .gitignore 含三条过程档目录，When 创建 docs/tickets/0001-x.md 并 git status --porcelain，Then 输出不含该文件且 git check-ignore 对三目录均命中；Given docs/needs/0001-x.md 新建，Then 照常出现在 status（知识档不受影响）。
- [FR-2 | 工单级] Given 本仓收口提交完成，When git ls-files docs/tickets docs/reviews docs/acceptance，Then 输出为空；盘上 8 张工单文件仍在；check.sh validate 全库通过、phase/frontier 输出与收口前一致（过程档行照常显示——状态在盘上）。
- [FR-3 | 工单级] Given 本 spec 与 need 0009 的后续修订，When git status，Then 照常显示（知识档进库行为不变）。
- [FR-4 | 工单级] Given 本 spec 全部改动落盘，When diff skills/dev-accept/SKILL.md 与其改动前版本，Then 蒸馏清扫序列节零变化；收口后首个真实验收提交只含知识档编辑与 spec 置 done。
- [FR-5 | 工单级] Given 裁决替代完成，When 读 docs/adr/，Then 0002 status: accepted 且含与 0001 的差异与代价记录，0001 status: superseded 且正文首行指向 0002；GLOSSARY adr 状态语义不受影响。
- [FR-6 | 工单级] Given 文档与生成面成文，When run-tests.sh 全量运行，Then 双份逐字一致断言通过、新增 seam 1/seam 2 用例通过、全量 ALL PASSED。
- [FR-7 | 工单级] Given 本 spec 全部改动，When diff .sdlc/check.sh skills/setup-workspace/assets/check.sh 及其对改动前版本，Then 均零字节变化；commit-msg / pre-push 行为用例全部原样通过。
- [FR-1、FR-2、FR-6 | 集成级] Given 本仓完成收口，When 三张在飞 spec 中任一张走完验收，Then 收口提交 git show 仅含知识档路径变更，无 docs/tickets|reviews|acceptance 内容；此后 git log 新增提交均不含过程档路径。（留验收阶段）
  - 验收实证（2026-10-30，验收报告 0001 / issue #77）：首个实例即本 spec 自身验收——PR #76 合并提交 9a8ef77 与验收收口提交均仅含知识档路径，收口提交 21ebddf 后全部提交零过程档路径；运行 worktree 过程档物化细则见 ADR 0003。

## 非目标

不改写 git 历史（存量过程档提交永久留存于历史，A4）；不动 check.sh 全部子命令与 git hooks；不动 dev-accept 蒸馏清扫序列语义与蒸馏四路落点；不动 tracker 适配器与投影行为；不给成员子仓库发 .gitignore（need 0008 C1：成员不装 docs/，无过程档）；不做状态翻转提交噪音治理（need 0005 D2 沿袭）；不处理 spec 0010 线的入库现场（其 untracked 产物归该线自行收口）。

## 备注

来源：need 0009（2026-10-29 confirmed；用户原话"我说过是C方案可以，再叠加蒸馏方案"）。分轮：round 1 覆盖全部七条 FR——改动全机械且互相咬合（收口依赖忽略规则、成文依赖裁决），最小可交付单位即整体（用户 2026-10-29 认可）。探索结论：generation.md 按"各目标的确切写法"分节（.gitignore 节落点）；run-tests.sh L1476-1477 已有 METHOD/GLOSSARY 双份逐字一致断言；setup SKILL.md L77 禁止事项行与 §3 生成表为修订点；本仓现场存在 spec 0010 线未入库产物（untracked），本 spec 不触碰。
