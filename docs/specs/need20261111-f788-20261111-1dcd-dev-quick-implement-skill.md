---
id: 20261111-1dcd
status: approved
need: 20261111-f788
round: 1
created: 2026-11-11
approved: 2026-11-11
---
# dev-quick-implement：小改动快速实现通道（快通道）

## 问题陈述

「表格字段 A 改 B」一类小而真实的代码改动，在完整链（clarify → spec → plan → implement → review → ship → accept）上每个环节各停一次等人确认，交互成本与改动体量不成比例；[trivial] 豁免又只限 typo 与纯文档。用户要为这条真空地带立一个快通道技能 dev-quick-implement：三道准入门（简单 / 低风险 / 不违反已有 ADR）判过即自动补齐 need、spec、工单并一路自动交付，全程恰 2 次人工交互（need 20261111-f788 业务目标）。

## 方案

新建独立技能 `dev-quick-implement`（快通道），用户显式调用并附一句话改动描述后按五段推进：

1. **准入判定**：粗探代码定位改动面 + 读 docs/adr/ 全量，对三道门逐门判定并留痕；任一门不满足 → 当场拒绝并指路完整链，零产物。
2. **三件套自产**：自动取号产出真实 need、spec（round 1）、单张工单，全走固定模板、逐张过 validate；准入判定留痕写进 spec 备注。
3. **开工确认（人工 1/2）**：一次呈现准入结果 + need 摘要 + spec 验收场景 + 票验收标准；显式批准即一次推进 need → confirmed、spec → approved、票 → ready；拒绝则草案留盘转完整链。
4. **实现与快评**：单票按 dev-implement 纪律实现，check.sh all 全绿后 spawn 独立子代理做精简评审，产出 approved 评审报告；PR 就绪（Summary / Evidence / Merge Danger）后停在合并确认门（人工 2/2）。
5. **自动收尾**：合并执行后零交互——票 done、清扫过程档、need → fulfilled、spec → done、蒸馏按需，收口为一个 [trivial] 原子提交（ADR 0002 收口机制）。

治理按「先蓝图后技能」：蓝图 §11.24 新条目 + §8 决策点表行 + §10.1 清单 + 修订记录先行，README 与 GLOSSARY（双份资产）同批，技能文本随后，临时仓库演练收尾。

## 用户故事

- 作为仓库主人，我想对一句话能说清的小改动调用 /dev-quick-implement，以便不被七环节确认链拖住、全程只在开工和合并两个点被打断。
- 作为仓库主人，我想让三道准入门逐门判定并留痕，以便事后能核查每次放行的理由。
- 作为仓库主人，我想在改动触碰 ADR 或不简单时被当场拒绝并指路完整链，以便快通道不被滥用成绕过评审的后门。
- 作为仓库主人，我想让开工确认一次覆盖 need 确认 + spec 批准 + 票概览，以便产物齐全而不多付确认成本。
- 作为仓库主人，我想让独立子代理按标准轴快评并出 approved 报告，以便 pre-push 评审门禁语义不变、实现与评审不同 getContext。
- 作为仓库主人，我想让合并始终亲手确认，以便单向门不因快通道失守。
- 作为仓库主人，我想让合并后自动收尾（票 done、清扫、need fulfilled、spec done），以便快通道跑完不留过程档残渣。

## 实现决策

- **独立技能、纪律内联、不串联调用完整链技能**：quick 路径不 Skill 调用 dev-spec / dev-plan / dev-implement / dev-review / dev-ship——三个原因：①dev-ship 出口自动串联 dev-accept，违反 need D6（dev-accept 不进链）；②dev-spec 批准与 dev-plan 粒度确认各是一次人工门，撑爆 2 次交互预算；③快评是标准轴精简版，不是 dev-review 双轴全文。实现纪律（红绿循环、垂直推进、边界、提交节奏）与 PR 三节模板按对应技能的纪律**内联复用文本**，门禁子命令（ticket / all / validate / publish）照跑。
- **准入判定程序（need FR-2）**：技能文本内置 rubric 与硬拒项清单，作判断辅助不作机械门禁——
  - 简单门判据：改动面小（量级参考：≤5 文件、≤50 行，越界须给出不成比例的说明理由才可放行）、单一概念、无新依赖、无 API/schema 契约破坏、无迁移脚本。
  - 低风险门判据：现有测试可覆盖或改动本身即测试、git revert 单提交可回滚、不触并发/安全/数据完整性敏感面。
  - ADR 门判据：读 docs/adr/ 全量，改动与任一 accepted ADR 的裁决冲突即拒（superseded ADR 不在约束链上，以其承接者为准）。
  - 硬拒项（任一命中即拒，不进入综合权衡）：跨模块重构、新功能面、依赖引入、schema/数据迁移、门禁与流程基础设施改动（.sdlc/、METHOD、GLOSSARY 流程章、蓝图、check.sh——门禁自指场景仍走 [trivial] 既有例外通道）、无既定 spec 可归属的多需求混合描述。
  - 留痕承载：三道门逐门结论 + 一句理由写进自产 spec 的「## 备注」准入判定段；拒绝路径不落盘产物（拒绝理由只在对话中陈述）。
- **三件套自产程序（need FR-4）**：`claim need <slug>` → 按 need 模板写（七节齐备、内容从简——FR 即改动目标、场景主流程一条、开放问题清零）→ `claim spec <slug> need <need-id>` → 按 spec 模板写 → `claim ticket <slug> spec <spec-id>`（单票）→ 三张逐张过 validate。均为真实产物、正常状态机流转，commit-msg / pre-push 门禁语义不变（need A4 收口）。
- **开工确认打包契约（need FR-5）**：呈现四件——准入判定结果（三道门逐门）、need 摘要、spec 验收场景清单、票验收标准清单；显式批准后一次推进 need → confirmed（追加 confirmed 日期）+ spec → approved（追加 approved 日期）+ 票 → ready，三张各 publish。**沉默不算确认**；拒绝 → 三件套 draft 留盘不废弃，指路 /dev-spec 修订续走完整链，实现不开始（need 异常流 4）。
- **实现（need FR-6）**：单票在分支 `quick/<spec-id>` 上按内联的红绿循环纪律实现；提交节奏与 [#票号] 引用同 dev-implement §3；出口 check.sh all 必须全绿，反复修不绿 → 停，转 dev-fix 或完整链（need 异常流 3）。
- **快评（need FR-7）**：spawn 独立子代理（与本会话实现上下文隔离），输入 = diff 基线（main…quick/<spec-id>）+ spec 验收场景 + 标准轴清单；产出精简评审报告落 docs/reviews/，frontmatter 契约与既有 review 产物一致（id / status / tickets / branch / created），status: approved 才满足 pre-push 评审覆盖。非 approved → 按意见返工再评，返工环上限两轮；两轮仍 rejected 或模型判定问题超出简单/低风险范畴（二者先到为准）→ 停，三件套已在盘，指路从 dev-spec 修订续走完整链（need 异常流 2 的可验证化）。
- **交付停点与 Evidence 打包（need FR-8/D6）**：PR 三节模板（Summary / Evidence / Merge Danger），Evidence 含 check.sh all 全绿输出摘要 + spec 验收标准逐条勾（附证据）+ 评审报告摘要；停下等合并确认，**合并单向门由用户亲手点，不自动合并**。dev-accept 不被调用——正式验收需要时手动跑。
- **自动收尾（need FR-9/ADR 0002/0003）**：合并执行后零交互按序——票 → done（落盘不提交，ADR 0003 裁决 3）→ 清扫该 spec 名下过程档（ticket、review）→ need → fulfilled、spec → done → 蒸馏折回仅在确有蒸馏目标时做（无目标留一句注记）→ 收口为一个 [trivial] 原子提交（内容 = need/spec 状态推进 + 蒸馏若有，纯知识档变更）。need fulfilled 的推进依据 = 验收证据已折叠进 Evidence 并经合并确认显式接受（D6/D7 语义闭环）。
- **治理同步面**：蓝图新增 §11.24 dev-quick-implement 条目、§8 决策点表加行（人工门 = 开工确认 + 合并确认恰两次）、§10.1 清单 30 → 31、修订记录新条目（v1.36 顺位）；README 技能清单 30 → 31 并在特色段补一句；GLOSSARY（根 + assets 双份，按 docs/standards/dual-copy-assets.md 纪律）项目术语章登记「快通道」词条。sdlc next-mode 路由表不加行、METHOD 零改动、check.sh 与 hooks 资产零改动。
- **治理顺序**：先蓝图后技能——T1 治理文档（蓝图 + README + GLOSSARY 双份），T2 技能文本 + 临时仓库演练（blocked-by T1）。

## 测试决策

- seam：dev-quick-implement SKILL.md 修订文本（准入 rubric、三件套自产程序、打包确认契约、快评契约、收尾序列）；蓝图 §11.24 / §8 / §10.1 / 修订记录文本；GLOSSARY 双份「快通道」词条；临时 git 仓库演练中的全链行为。
- 自测按蓝图 §13.2 六项静态核验：触发（调用带描述即入准入）/ 拒绝（三道门各一条拒绝指路）/ 重入（draft 留盘续接）/ 衔接（出口停点与收尾序列声明）。
- 行为实测在临时 git 仓库演练四条：①准入通过全链——一句话改动描述 → 三件套 → 开工确认 → 实现 → 全绿 → 快评 approved → PR 就绪 → 合并确认 → 自动收尾，人工交互恰 2 次、过程档清扫干净；②准入拒绝——分别构造 ADR 冲突、跨模块、依赖引入三例，逐门拒绝 + 指路 + 零产物；③快评返工环——注入一次 rejected，返工再评 approved，全程不加人工交互；④开工确认被拒——三件套 draft 留盘、实现不开始、指路完整链。
- 既有先例：spec 20261107-5cb8 临时仓库演练（值守/点选四条）、spec 20261110-b2fc 收口链演练。

## 验收场景

- [FR-1 | 工单级] Given 用户显式调用 /dev-quick-implement 并附一句话改动描述，When 技能启动，Then 直接进入准入判定，不要求 need 编号、不查 sdlc 路由表。
- [FR-2 | 工单级] Given 改动描述涉及单文件字段改名，When 准入判定，Then 三道门逐门给出结论与一句理由，且三道门结论写进自产 spec 的「## 备注」准入判定段。
- [FR-2 | 工单级] Given docs/adr/ 存在 accepted ADR 与改动裁决冲突，When ADR 门判定，Then 判定不通过且引用该 ADR 编号；Given ADR 已 superseded，When 判定，Then 以承接者 ADR 为约束、原 ADR 不误拦。
- [FR-3 | 工单级] Given 改动命中任一硬拒项（跨模块 / 新依赖 / 门禁改动等），When 准入判定，Then 当场拒绝、明说卡在哪道门与哪条判据、指路 dev-spec（需求清楚）或 dev-clarify（需求模糊），docs/ 不新增任何产物。
- [FR-4 | 工单级] Given 准入通过，When 三件套自产，Then docs/needs/、docs/specs/、docs/tickets/ 各落一张真实产物，frontmatter 谱系前缀正确（spec 带 need 前缀、票带 spec 前缀），三张逐张 validate 通过。
- [FR-5 | 工单级] Given 三件套就绪，When 开工确认呈现，Then 一次呈现准入结果 + need 摘要 + spec 验收场景 + 票验收标准四件；用户显式批准后 need confirmed、spec approved、票 ready 三态一次推进且各 publish。
- [FR-5 | 工单级] Given 开工确认呈现后用户未回应，When 技能等待，Then 不以沉默推进任何状态（沉默不算确认）；Given 用户拒绝，Then 三件套 draft 留盘、实现不开始、指路 /dev-spec 续走完整链。
- [FR-6 | 工单级] Given 票开工，When 实现，Then 在 quick/<spec-id> 分支按红绿循环推进、提交带 [#票号]；出口 check.sh all 全绿，票 status: implemented。
- [FR-6 | 工单级] Given check.sh all 反复失败修不绿，When 出口判定，Then 停止并转 dev-fix 或完整链，不以跳过检查完成工单。
- [FR-7 | 工单级] Given 实现全绿，When 快评启动，Then 独立子代理基于 diff 基线 + spec + 标准轴产出评审报告落 docs/reviews/，frontmatter 含 tickets 与 status: approved，满足 pre-push 评审覆盖。
- [FR-7 | 工单级] Given 快评首轮 rejected，When 按意见返工再评，Then 返工与重评不加人工交互；两轮仍 rejected 或判定超范畴时停并指路完整链。
- [FR-8 | 工单级] Given 快评 approved，When PR 准备，Then Summary / Evidence / Merge Danger 三节齐备，Evidence 含全绿输出摘要 + 验收标准逐条勾 + 评审报告摘要；合并确认前技能停住不执行合并。
- [FR-8 | 集成级 | 承载票 演练票] Given 用户显式确认合并，When 合并执行，Then 合并只发生在显式确认之后；确认拒绝则停在合并门、分支保留。
- [FR-9 | 工单级] Given 合并执行完成，When 自动收尾，Then 票 done 落盘不提交、过程档（ticket / review）从盘上清扫、need → fulfilled、spec → done、蒸馏无目标时留注记跳过，收口为一个 [trivial] 原子提交且 validate 通过（done spec 名下无过程档残留）。
- [FR-10 | 工单级] Given 任一次快通道运行完成或被拒，When dev-retro 审计，Then 准入判定（放行的三道门结论 / 拒绝的卡点）可从 spec 备注或对话记录追溯，满足审计输入。
- [FR-9 | 集成级 | 承载票 演练票] Given 演练仓库走通①准入通过全链，When 全程计数人工交互，Then 恰 2 次（开工确认 + 合并确认），收口后 docs/ 无过程档残留、git log 呈一条实现提交 + 一条收口提交。

## 非目标

- 不自动合并——合并单向门永远留人亲手点（need D3）。
- 不替代 [trivial]——typo 与纯文档改动继续走豁免通道（need D2）。
- 不设伞形 need——每次运行立自己的三件套（need D8）。
- dev-accept 不进快通道——验收证据折叠进 Evidence，正式验收手动跑（need D6）。
- check.sh、hooks 资产、METHOD、sdlc next-mode 路由表零改动（need A4/D4 推论；快通道复用既有门禁语义）。
- 不支持多票、多 spec、跨模块改动——单票单 spec 是快通道定义的一部分，多票走完整链或 /dev-execute。
- 门禁与流程基础设施改动（.sdlc/、METHOD、GLOSSARY 流程章、蓝图、check.sh）不走快通道——准入硬拒项（本 spec 的实现自身即按完整链走，不自证例外）。
- 不做无人值守模式——快通道默认有人值守，挂机编排归 dev-execute 无人值守档。
- 不做宿主能力探测与并行派发——快通道单票主会话顺序执行，无回退链。

## 备注

- 分轮拍板（2026-11-11，用户确认）：round 1 全量覆盖 need FR-1 至 FR-10（validate 孤儿 FR 规则要求单张 spec 覆盖全部 FR，spec 20261107-5cb8 先例）；round 2 留验收后残余风险——need A1 rubric 误放行案例积累为既记候选。
- 需求纯度：FR-1 ← need FR-1（S1）；FR-2 ← need FR-2（D5）；FR-3 ← need FR-3；FR-4 ← need FR-4（D8）；FR-5 ← need FR-5（D1）；FR-6 ← need FR-6；FR-7 ← need FR-7（D4 决策卡出口）；FR-8 ← need FR-8（D3/D6）；FR-9 ← need FR-9（D7）；FR-10 ← need FR-10。异常流四条全部继承自 need 场景节。
- 术语：「快通道」将随 T1 登记 GLOSSARY（根 + assets 双份）项目术语章，定义 = dev-quick-implement 承载的「准入 → 三件套 → 2 交互交付 → 自动收尾」单票快速路径。
- 蓝图同步面：§11.24 新条目、§8 决策点表加行、§10.1 清单 30 → 31、修订记录 v1.36；§7.2 引用矩阵核对（dev-quick-implement 不新增 ref 引用行——纪律内联复用，不装 ref-review/dev-review 技能）；README 30 → 31；GLOSSARY 双份；sdlc / METHOD / check.sh 零改动。
- 快评报告契约沿用既有 review 产物 frontmatter（id / status / tickets / branch / created），pre-push 覆盖校验零改动——已在 check.sh 读取路径上实证（docs/reviews/ 既有产物同构）。
- 拆票方案（2026-11-11 拟定，待 dev-plan 确认）：2 片垂直票——T1「快通道治理文档」（蓝图 §11.24/§8/§10.1/修订记录 v1.36 + README + GLOSSARY 双份词条，覆盖 FR-2 rubric 成文面与 FR-10 留痕承载声明；改动面 = 蓝图 + README + GLOSSARY 双份）；T2「dev-quick-implement 技能 + 演练」（SKILL.md 本体 + 静态核验四项 + 临时仓库演练四条，覆盖其余全部场景；blocked-by T1；改动面 = skills/dev-quick-implement/）。集成级 2 条由 T2 演练票承载。
