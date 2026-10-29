---
id: 0009
status: fulfilled
created: 2026-10-29
confirmed: 2026-10-29
fulfilled: 2026-10-30
---
# 过程档 gitignore 化（过程档不进 git）

## 背景与业务目标

need 0005 交付的现行机制是"过程中照常进库、验收后蒸馏清扫删除"（spec 0007 已 done 并实跑四轮收口：spec 0001–0005、0007）。但用户本意是**方案 C（过程档 gitignore）与蒸馏清扫叠加**——2026-10-29 用户纠正："我说过是C方案可以，再叠加蒸馏方案"。现行机制下 git 历史持续累积过程档提交：自举期已有 8 张工单被跟踪（docs/tickets/ 的 0001–0010 中已提交部分），三张在飞 spec（0008/0009/0010）的 16 张活跃票将继续进库；git log 中的 `[trivial]` 状态落盘与工单落盘提交持续稀释提交流。

叠加形态：知识档（need、spec、design、adr、research、standards）照常进库；过程档（ticket、review、acceptance）**过程中在盘上存在、被 .gitignore 排除、不进任何提交**；验收通过后蒸馏清扫不变（删除盘上文件、spec 置 done）。门禁不受影响——已查证 check.sh 全部判定读盘上文件、不读 git 索引（无 git show / git ls-files 调用）。

前置冲突：ADR 0001（accepted）背景节把"gitignore 过程档"列为被否决备选（"审计链离开版本库，门禁失据"）。本 need 正式替代该裁决：审计链主承载从"git 历史 + tracker"改为"tracker 投影 + 源码提交 [#NNNN] 引用"，依据是 tracker 投影已实装且四轮收口实跑证明 tracker 侧完整可用。

业务目标：过程档从立项起就不进 git，提交流只剩知识档变更与源码提交。成功标准（可核销）：

- S1 活跃过程档文件（新增/修改/删除）永不出现在 git status 与任何新提交中。
- S2 存量 8 张已跟踪工单经一次收口移出索引，文件留在盘上，`check.sh validate` 全库与 frontier 行为不变。
- S3 验收收口提交（如 94acb66 形态）此后只含知识档编辑与 spec 置 done，无过程档内容。
- S4 新接入仓库（setup-workspace 安装）开箱即得过程档忽略规则。

## 干系人与用户

- 仓库主人（主 Actor）：拍板本方案；验收 S1–S4。
- agent 会话（执行 Actor）：过程中工单操作照旧（盘上）；验收时蒸馏清扫序列照旧（dev-accept 零改动）。
- 门禁（check.sh + git hooks）：零改动——commit-msg 查 `[#NNNN]` 时工单在盘上可解析（gitignore 不影响盘上存在），pre-push / validate / frontier 照旧。
- setup-workspace：生成面新增——.gitignore 过程档条目随安装生成；其 SKILL.md 禁止事项"往 .gitignore 加任何流程产物"须同步修订。
- 新加入协作者（need 0008 S7 场景）：clone 根仓库后看不到进行中工单（gitignore 固有代价），靠 tracker 投影（GitHub issue）回读。
- tracker 投影：考古链主承载（工单完整生命周期在 issue 侧），单向发布不回删原则不变。

## 系统能力需求

- FR-1 过程档忽略：docs/tickets/、docs/reviews/、docs/acceptance/ 三目录进入 .gitignore，其中任何文件的新增、修改、删除不再进入 git status 与提交（来源：用户原话"C方案可以"，两次确认）。
- FR-2 存量收口：现已被 git 跟踪的过程档文件（当前 8 张工单）经 `git rm --cached` 一次提交移出索引，盘上文件保留；不收口则 FR-1 对已跟踪文件空转（gitignore 不作用于已跟踪文件——这是 FR-2 存在的机械原因）（来源：讨论拍板 D3）。
- FR-3 知识档不变：need、spec、design、adr、research、standards 照常进库，现行提交规则不变（来源：方案 C 的知识档定义，need 0005 已确立的判据"价值是否越过终态"沿用）。
- FR-4 蒸馏清扫出口不变：dev-accept 的"蒸馏四路 → 清扫 → 置 done → 原子提交"序列零改动；收口提交内容自然变为纯知识档编辑 + spec 置 done（盘上删除未跟踪文件不产生 git 变更）（来源：spec 0007 已交付机制沿用）。
- FR-5 ADR 替代：ADR 0001 置 superseded 并指向新 ADR；新 ADR 记录"过程档 gitignore + 蒸馏清扫"裁决、与 ADR 0001 的否决差异（tracker 投影实装后审计链已有版本库外承载）及代价（来源：METHOD 纪律——与 ADR 冲突须经用户裁决，拍板 D4）。
- FR-6 文档与生成面成文（全部双份同步：活本 + setup-workspace assets）：METHOD §4.1 总原则改写（"归置手段是终态删除而非 gitignore，因此不往 .gitignore 加任何东西"→ 过程档 gitignore + 终态清扫的分档表述）；§4.3 对齐；GLOSSARY「过程档」词条更新（"过程中照常进库"→"过程中盘上存在、gitignore 排除"）；setup-workspace SKILL.md 禁止事项行修订；setup 生成模板新增 .gitignore 过程档条目（新接入仓库开箱即得，S4）（来源：讨论确认的修订面 + 重探发现的 SKILL.md §77 禁止事项）。
- FR-7 门禁与技能家族零改动：check.sh、git hooks、dev-clarify / dev-spec / dev-plan / dev-implement / dev-review / dev-ship 过程行为全部不动（来源：已查证 check.sh 只读盘上文件；need 0008 C2 家族零改动原则沿用）。

## 场景

主成功场景一（过程中）：

- Given 仓库已收口（FR-2 完成），一张 in-progress 工单被编辑。
- When `git status`。
- Then 该文件不出现在未跟踪/修改列表（被 ignore），commit-msg 提交（带 `[#NNNN]` 源码改动）照常通过——工单在盘上可解析。

主成功场景二（验收收口）：

- Given 一张 spec 名下工单全部 done，验收通过。
- When dev-accept 执行蒸馏清扫出口。
- Then 收口提交只含知识档编辑（need/spec/ADR/standards）与 spec 置 done；盘上过程档文件删除不产生 git 记录；validate 全库通过。

异常流：

- E1 只加 .gitignore 不做存量收口：已跟踪工单继续进库——FR-1 空转，validate 全库不报错（它不查跟踪状态），噪音依旧（该异常定义了 FR-2 的必要性）。
- E2 新协作者 clone 单仓/根仓库后接手进行中工单：盘上无票（未随 clone 走），指路 tracker 投影（GitHub issue）回读工单内容；tracker 未配置（TRACKER=local）的仓库无兜底（A1 显式代价）。
- E3 多仓工作区（need 0008 形态）：成员子仓库不装 docs/（无过程档），gitignore 规则只落根仓库——成员仓库无感知。

## 假设与风险

- A1 TRACKER=local 仓库的工单文件史彻底无痕：票从未进 git，验收后盘上删除，唯一残迹是源码提交的 `[#NNNN]` 引用。代价：此类仓库的工单考古不可为；不确定度：低（本仓 TRACKER=github，投影完整，不受影响）。拍板 D2 知情接受。 【验收标注 2026-10-30：本轮未触发——本仓 TRACKER=github、投影完整（工单投影 #70–#72 等在案）；代价经拍板 D2 知情接受，ADR 0002 已录为显式代价。】
- A2 多人/多机协作时进行中工单不随 git 同步：clone 拿不到 in-progress 票（E2）。solo 主场景无感；need 0008 S7 新同事复原场景受影响，由 tracker 投影兜底。代价：中（仅协作场景）；不确定度：低。 【验收标注 2026-10-30：本轮未触发——单人多仓场景无协作者接手在飞票；代价经拍板 D2 知情接受，ADR 0002 已录为显式代价。】
- A3 与在飞 spec 0010（setup-migrate）的修订面重叠：其票 0011（blueprint-glossary-sync）、0013（setup-migrate-skeleton）将改 setup-workspace SKILL.md 与 METHOD——本 need FR-6 修订面与其重叠，时序（等其票清或分文件错开）归 dev-plan 排。代价：低。 【验收标注 2026-10-30：验证通过——spec 0010 先行合并（d1d0755），票 0018 以 blocked-by 0013 排后，修订面无打架；仅 run-tests.sh 断言组同插入点一处预期内合回冲突，经用户决策机械拼接解决（两组内容一字不动），预演 344/0 绿。】
- A4 历史上已进库的过程档提交不可消除（不改写历史）：git log 中存量过程档提交永久保留，新规则只约束未来。代价：低（历史噪音一次性，不再增长）。 【验收标注 2026-10-30：验证通过——未改写历史；收口提交 21ebddf 之后全部提交零过程档路径（验收报告 0001 证据 2，投影 #77）。】
- round 1 靶心：FR-2 存量收口 + FR-6 文档与生成面（修订点多但全机械）；FR-1 是三行 gitignore，FR-4/FR-7 是零改动声明，风险最低。
- 验收折回（2026-10-30，报告 0001 / issue #77）：S1–S4 全部核销。残余风险：① A1/A2 设计内代价（已接受，见上）；② 运行机制适配细则（过程档 worktree 物化、状态翻转盘上语义）已立 ADR 0003，dev-execute run-mechanics 参考件修订落地前，后续运行的编排者须知晓（漏物化则 commit-msg hook 拦截全部 `[#NNNN]` 提交）。下一轮建议：① run-mechanics §4/§7/§8.4 把物化与盘上翻转细则成文（依据 ADR 0003 与 run/0011 运行实证）；② 修复工单 0011/0014（spec 0010 名下）blocked-by 指向已清扫工单 0001/0002 的悬挂引用（validate 既有 2 处失败，归 dev-plan 修引）。

## 范围与非目标

非目标（全部来自显式拍板或既有原则）：

- 不改写 git 历史：存量过程档提交留在历史中（A4）。
- 不改 dev-accept 蒸馏清扫序列语义、check.sh 全部子命令、tracker 适配器（FR-4/FR-7）。
- 成员子仓库不涉及：不装 docs/ 故无过程档（need 0008 C1，E3）。
- 不做过程中状态翻转提交噪音治理（need 0005 D2 沿袭——本 need 消除的是过程档**文件**进库，状态落盘提交随其载体消失，剩余 `[trivial]` 状态提交属知识档变更，不在本轮）。
- 不动 need 0005 已交付的分档判据与蒸馏四路落点（FR-3/FR-4 沿用）。

## 开放问题

（已清零。拍板记录：）

- D1 → 方案 = C（过程档 gitignore）+ 蒸馏清扫叠加；"过程中保持现状"指工作流与门禁不变，非提交行为照旧（用户原话两次确认，2026-10-29）。
- D2 → 统一规则不分 tracker：过程档一律 gitignore；TRACKER=local 仓库考古链 = 源码 `[#NNNN]` 引用（代价知情接受；去向 A1、E2）。
- D3 → 存量收口 = `git rm --cached` 一次提交，盘上保留（去向 FR-2、E1）。
- D4 → ADR 0001 置 superseded，新 ADR 记录本裁决（去向 FR-5）。
- D5 → 编号 0009（need 序列最大 0008 + 1；与在飞 spec 0009 无关，引用带类型限定）。
- 方法 → 讨论式澄清（延续 need 0005 的调研基础：mattpocock 对照已查证；本轮重探补 ADR 0001 冲突、need 0008 多仓影响、spec 0010 并行面三项新事实）。
