---
id: 0014
status: done
need: 0012
round: 1
created: 2026-11-02
approved: 2026-11-02
done: 2026-11-03
---
# dev-overview：开工前总览评审——五节合成、走查归置与多票开工门禁

## 问题陈述

管线 clarify→spec→plan 的产物全是分解物，没有产物回答"功能实现成什么样"：spec 用户故事是按 FR 编号的清单不是旅程，工单是单片端到端行为，拼起来的整体没人负责呈现。管线里唯一能"看"的能力（可点 HTML 原型）锁在 dev-clarify 阶段且用完即弃；集成级验收场景是现成的"整个系统演一遍"剧本，但演出时点在实现之后——形状错误实现后才暴露，返工以票计。（源：need 0012，用户 2026-11-02「拆完 needs、spec、tickets 之后我依然不知道功能会实现成什么样，想要设计一个技能生成总览给我评审」。）

## 方案

新流程技能 **dev-overview**，站位在 dev-plan 出口之后、首票开工之前：从 need + spec + design（若有）+ 名下全部工单纯读合成一份**总览**（GLOSSARY 已登记，need 0012），固定五节——全景一行 / 全景矩阵（actor×FR×场景×票号，指不回的格子按缺口暴露）/ 黄金场景走查（2–3 条第二人称叙事含异常流，剧本取 spec 验收场景）/ 样张（按对象类型选媒介）/ 差距清单。用户走查后把暴露的缝隙三路归置（回 dev-spec 补 FR 改场景 / 回 dev-plan 补票重切 / 非目标），拍板落点永远在 spec 与工单上，归置清零且用户显式确认后总览置 reviewed。名下票 ≥2 的 spec 由 `check.sh ticket` 硬门禁强制 reviewed 总览（单票豁免）；总览按过程档归置（ADR 0002 整体沿用），验收通过后随蒸馏清扫删除。

## 用户故事

- 作为需求人，我想在开工前读到一份可走查的总览，以便不读源码就能看懂功能全貌并拍板。
- 作为评审人，我想沿黄金场景叙事与样张走查一遍，以便在开工前暴露缝隙并归置，而不是实现后返工。
- 作为实现会话，我想在开工入口被明确拦下或放行，以便合规开工有机械依据、不靠自觉。
- 作为仓库主人，我想让总览验收后随清扫删除，以便仓库只留知识档，git 历史不被脚手架稀释。
- 作为需求人，我想让总览正文每段可溯源到既有产物，以便它不漂移成第二真相源。

## 实现决策

- **新技能 dev-overview（FR-1/2/3/4/5）**：管线流程技能，与 dev-spec/dev-plan 同构（前置校验 / 入口门禁 / 出口门禁 / 中断交接）。入口校验：spec approved 且名下 ≥1 票 ready（票拆完才合成——全景矩阵的票号列依赖票在盘上）。装载 need+spec+design+名下全部票纯读合成，五节模板内嵌技能（METHOD 先例：模板内嵌在写产物的技能里，METHOD 只留规则）。硬纪律三条：①正文每段可溯源（标注来源 need FR-N / spec 场景 / ticket NNNN），不产新决策；②样张写不出的格子一律进差距清单，不现场拍板；③保真度 JBGE——样张只做状态可见性（三态：正常/空/错误），沿 dev-clarify references/prototype.md 规格（单文件零依赖、临时目录、不进仓库、用完即弃留拍板要点）。
- **样张媒介判定（FR-4）**：从 spec 实现决策判对象类型——UI→三态可点 HTML 原型（落系统临时目录）、CLI→输出样例（输出即线框）、API→调用序列+请求/响应样例；混合对象分节各出。判定拿不准（多类型交织/无从判断）→ 决策卡问用户，不猜。
- **走查与状态推进（FR-5）**：走查完成后由用户显式确认（沉默不算，沿管线语义）→ 总览 `status: reviewed`、追加 `reviewed: <日期>`；差距归置改动了 spec/票 → 先更新产物再更新总览，再走确认。总览全程不替用户拍板——它只暴露缝隙。
- **总览产物契约（FR-6）**：落 `docs/overviews/NNNN-slug.md`（四位零填充、目录内独立递增、slug ASCII 小写短横线）。frontmatter：`id` `spec` `status` `created`（置 reviewed 追加 `reviewed`）。状态机 draft→reviewed（推进者 dev-overview，须用户显式确认）。归置为过程档：`.gitignore` 排除、不进任何提交、验收通过后随蒸馏清扫删除、tracker 投影照常（单向发布不回删）——全部沿 ADR 0002 裁决的后果条款，不立新 ADR（归置裁决零新增，只扩成员清单；GLOSSARY 项目术语章已随 need 0012 登记）。
- **开工门禁（FR-7）**：`check.sh ticket NNNN` 在既有 spec approved 校验之后新增总览分支——统计名下票数（票 frontmatter `spec` 字段指向该 spec）：≥2 时查 `docs/overviews/` 下 `spec` 指向它且 `status: reviewed` 的总览，缺失或 draft → 非零退出并输出指路文案（缺什么、去 /dev-overview）；单票 → 不查直接放行。类型注册与既有七类产物同构，共六处机械分支：产物目录映射、路径→类型识别、状态表（`draft reviewed`）、`phase` 扫描、`validate` 模板节校验（五节必填 + frontmatter + spec 引用存在）、`spec_residue` 名下关系（done 的 spec 名下残留必须为零）。
- **清扫与指路接线（FR-6/7 生态）**：dev-accept 清扫步骤的"名下过程档"清单纳入总览（与 validate 残留扫描同一定义），蒸馏四路不变；dev-plan 出口在 frontier 呈现后，对名下票 ≥2 的 spec 加一句"建议先 /dev-overview 走查再开工"；dev-implement 入口的 check.sh ticket 校验清单说明补总览一项（改文案不改语义，门禁本体在 check.sh）。
- **规则文本同步（FR-6）**：setup-workspace 资产模板同步——`.gitignore` 模板过程档忽略行 +1、METHOD 模板产物表加行（draft→reviewed、过程档）、目录树加 `overviews/`、GLOSSARY 模板流程状态章加 overview 两态；工作区副本同步更新（生成资产副本同步先例：commit 068e7a3）。

## 测试决策

- seam ①：check.sh 类型注册六处分支 + ticket 门禁——临时 git 仓库演练（spec 0006/0012/0013 先例），覆盖门禁四态与残留扫描。
- seam ②：dev-overview 合成行为——真实 spec 演练：五节齐备、正文溯源引用 grep 可核、样张三媒介各演练一次（临时目录产物、`git status` 干净可核）。
- seam ③：三路归置回路——构造缝隙（某 FR 指不回票）演练归置：spec/票被更新、差距清单清零、reviewed 推进有显式确认。
- seam ④：清扫原子收口——验收收口的 `[trivial]` 原子提交后盘上无该 spec 名下总览，validate 通过。
- setup-workspace 资产模板改动跑既有 `run-tests.sh`（config CHECK_TEST 已挂）；既有同类测试作为先例：spec 0011 门禁演练、spec 0012 开工预检演练。

## 验收场景

- [FR-1 | 工单级] Given spec approved 且名下 3 票 ready，When 运行 dev-overview，Then `docs/overviews/NNNN-*.md` 落盘五节齐备，validate 通过，正文每节含可溯源引用（need FR-N / spec 场景 / ticket NNNN）。
- [FR-2 | 工单级] Given 构造一个指不回任何票的 FR，When 合成全景矩阵，Then 该格子按缺口标出并进差距清单，不被静默略过。
- [FR-3 | 工单级] Given 合成完成，When 检查黄金场景走查，Then 含 2–3 条用户视角叙事与至少一条异常流，剧本可在 spec 验收场景中逐句对上（集成级优先）。
- [FR-4 | 工单级] Given UI 类 spec，When 出样张，Then 三态 HTML 原型落系统临时目录且仓库 `git status` 干净；Given CLI 类 spec，Then 输出样例呈现正常/空/错误三态；Given API 类 spec，Then 调用序列含请求/响应样例。
- [FR-5 | 工单级] Given 走查暴露缝隙，When 三路归置，Then 对应 spec/工单已更新、差距清单清零，总览在用户显式确认后置 reviewed（未确认时保持 draft）。
- [FR-6 | 工单级] Given 总览已落盘，When 检查归置，Then `.gitignore` 含总览目录行、`git status` 不显示总览、publish 投影成功且 tracker 不回删。
- [FR-6 | 集成级] Given spec 验收通过进入收口，When 蒸馏清扫完成，Then 该 spec 名下总览已删除、validate 残留扫描为零、恰一个 `[trivial]` 原子提交。
- [FR-7 | 工单级] Given 门禁四态演练仓库，When 依次运行 `check.sh ticket`，Then：多票 spec 无总览 → 非零退出含指路 /dev-overview；总览 draft → 拒绝；单票 spec 无总览 → 放行；总览 reviewed → 放行。
- [FR-1/5/7 | 集成级] Given 真实多票功能（dogfood：本 spec 名下工单），When 生成→走查→归置→开工全流程，Then 暴露 ≥1 处会返工的缝隙并归置清零，评审人不读源码能复述功能形态，A1 靶心（need 0012）核销。

## 非目标

- 不做跨 spec 的发布级整图总览（need 0012 拍板 D5，将来另立 need）。
- 总览不进库存档（拍板 D4 否决）；不在 spec 批准后（票未拆时）出总览（拍板 D1 否决）。
- 不做一律 HTML 原型、不做高保真视觉稿、不陪评配色字体（拍板 D2 否决 + clarify 防跑偏纪律）。
- 不立新 ADR——过程档归置零新增裁决，沿 ADR 0002；tracker 投影不回删沿同裁决。
- 不改 dev-execute / dev-review / dev-ship / dev-fix——总览站在 plan 与首票 implement 之间，与运行编排和评审契约无关。
- 门禁不扩到单票 spec（拍板 D3）；不改 commit-msg / pre-push 门禁语义。

## 备注

- 输入：need 0012（issue #93，confirmed）；本 spec 收口其 A1 靶心（集成级场景核销）。
- 分轮拍板（2026-11-02）：round 1 全量覆盖 7 FR——validate 孤儿 FR 规则（spec 0012/0013 先例）；round 2 留验收后残余风险。
- 术语：总览/走查/样张已登记 GLOSSARY 项目术语章（need 0012 定稿时登记）。
- 同步面：check.sh 模板资产与工作区副本、setup-workspace 模板（.gitignore / METHOD / GLOSSARY）、dev-accept / dev-plan / dev-implement 文案——全部随实现工票落。
- design 判据预期不命中：集成点全部机械枚举（六处分支 + 三处文案 + 模板同步），无架构权衡、模块划分显而易见 → 批准后直进 dev-plan；实现中若暴露设计级问题再回 dev-design。
- dogfood：本 spec 名下工单 ≥2 时，自身的开工即受 FR-7 门禁约束——总览的首次实战就是总览技能自己的实现。
- 总览走查记录（2026-11-03）：overview 0001-dev-overview-walkthrough.md 经用户走查并显式确认置 reviewed；走查暴露缝隙 0 处，三路归置清单为空（无 spec/工单修订被触发）；`check.sh ticket 0031` 被拦（缺 reviewed 总览 exit 1 → draft 拒绝 exit 1）→ 置 reviewed 后放行（exit 0）全链实测留档，供 [FR-1/5/7 | 集成级] A1 靶心验收核销（暴露缝隙按实际 0 处留档核销）。
