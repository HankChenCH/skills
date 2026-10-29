<!--
归档自 ZCode 会话 session_6cc2291bc6f073faba0bf8480ad2c62c（2026-10-25），
原路径 ~/.zcode/workspace/draft-11e07271-3766-4280-8b08-91cef365f421/sdlc-skills-blueprint.md，
2026-10-26 归档入本项目。自 v1.1 起进入修订期，治理规则（先改本文档再改技能）
继续适用；历次修订记录见下方版本行。
-->

# SDLC 技能集设计蓝图

> 版本 1.18 · 2026-10-29（初版 1.0 · 2026-10-25）· 本文档是这套技能集的唯一设计真相源。
>
> **v1.1 修订记录（setup-workspace 实现前定稿）**：§5.2 新增 docs/standards/，升级 GLOSSARY.md 与 CODING_STANDARDS.md 语义；§5.3 哨兵块文本更新（去 src/ 假定，增 GLOSSARY 与标准索引引用）；§5.4 ticket 允许 in-progress 重入、all 增加零检查命令行为与 RUN_PREFIX 包裹、publish 适配器缺失行为；§5.5 config.sh 新增 BASE_REF / RUN_ENV / RUN_PREFIX / PKG_MGR / CODE_DIRS；§6.1 增列表字段单行注记；§11.1 setup-workspace 规格全面细化（智能体识别、单仓/monorepo、环境探测、标准导入、按需加载）；§13.1 附件分 assets/ 与 references/ 两类；§14 starters 定稿落点与新增待定项。实现期间补记：轻门禁由 pre-commit 修正为 **commit-msg** hook（git 时点事实：pre-commit 阶段消息未写入，机械校验无从执行）。
>
> **v1.2 修订记录（spec 0001，2026-10-27）**：tracker 出口枚举全面增加 GitLab（§5.2/§5.5/§11.1/§14；选 GitLab 验 `glab auth status`，失败明确回落 local，适配器仍属批 3）；参考技能 4→5，新增 ref-git-commit——规范提交与合并信息（§7/§7.1/§7.2/§10.1/§10.2；dev-implement 开工装载、dev-ship 装载）。三平台 issue/PR 模型调研落盘 docs/research/0001，作批 3 tracker 适配器实现参考。
>
> **v1.3 修订记录（sdlc 实现，2026-10-27）**：§11.2 sdlc 总控规格操作化——默认模式报告固定结构（当前阶段/可做的事/被挡在哪/循环状态）；next 模式新增路由表（落技能 `references/next-mode.md`）、断链处理（目标技能未安装时报告并指路，禁止越权代劳）、多张可开工工单须问询（带默认建议）；新增**上下文 token 水位线**（`references/context-watermark.md`）：每次调用目标技能前评估会话上下文 token 用量占窗口百分比——绿 <30% 正常推进、黄 30%–50% 只推进单阶段且出口不自动串联、红 ≥50% 停止推进并建议新会话从盘上续接；拿不准按更高档执行，水位收窄的是推进距离，不是决策纪律。
>
> **v1.4 修订记录（ref-testing 实现，2026-10-27，spec 0003）**：ref-testing 规格化——测试细则从"红绿循环 + 集成两层"扩为六类测试参考（red-green 红绿循环 / table-driven 表格驱动 / integration 集成 / e2e / stress-capacity 压力与容量 / chaos 混沌），采用 SKILL.md（通则 + 场景路由）+ references/（六类细则）两级结构（§7.1/§7.2/§11.3）；通则新增"可重复确定"；§7.2 明确"固定时机装载技能本体、场景内按需加载细则"。
>
> **v1.5 修订记录（dev-implement 实现前定稿）**：§12 范文同步 §7.2 引用矩阵——§2 装载上下文补"再用 Skill 工具装载 ref-implementation、ref-testing、ref-git-commit；写测试前重读 ref-testing，细则按 ref-testing 场景路由表按需读取、一次只载一个"（v1.2 增补引用矩阵时范文漏同步；治理规则：先改文档再改技能）。
>
> **v1.6 修订记录（dev-implement 评审 0004，2026-10-27）**：§12 范文 §1.2 首条校验项补 in-progress 重入语义——原文只写"status: ready"，与 §5.4 门禁契约"ready（或 in-progress 重入续接）"及范文 §5 中断交接的续接前提矛盾（评审 0004 标准轴建议采纳；先改文档再同步技能）。
>
> **v1.7 修订记录（dev-retro 实现，2026-10-27）**：§11 改题"技能规格"并新增 §11.10 dev-retro——复盘报告定为 `docs/retros/` 轻产物（§5.2 目录树与所有权表随之调整；frontmatter 仅 `id`/`status`/`created`，不进 check.sh 门禁）；§10.2 批 2 要点补 dev-retro 条目。
>
> **v1.8 修订记录（dev-fix 实现，2026-10-27）**：新增 §11.11 dev-fix——dev-fix 定位为"分诊定级 + 开 fix 票 + 转入实现链"，实现复用 dev-implement 的红绿纪律（失败测试先行即复现），不自带实现循环；§8 决策点全表 dev-fix 出口相应改为"自动调 dev-implement（经其出口到达 dev-review）"，§7.2 注明 ref-testing 经 dev-implement 链装载，§6.4 工单模板产出者补 dev-fix。
>
> **v1.9 修订记录（dev-design 实现，2026-10-27）**：新增 §11.12 dev-design——design 定位为**可选产物**（ADR 三条件命中或结构非显而易见才做，入口亮牌可拒绝；spec approved 才进），不是必经门禁；design 与 adr 模板要点补入 §6.5（validate 对两者保持轻校验——仅 frontmatter 与状态，节同构靠模板内嵌保证）；§7.2 补 ref-writing 装载行，§8 决策点表补 dev-design 行。
>
> **v1.10 修订记录（dev-clarify 实现，2026-10-27）**：新增 §11.13 dev-clarify——管线入口，想法 → need，need → confirmed 的推进者。① 开放问题"清零"操作定义 = **三路归置**（有答案→正文对应节；答不了→过查证过滤闸转显式假设进「假设与风险」；明确不做→「范围与非目标」；节内允许留拍板记录，实盘 need 0001 先例），§6.2 模板与 check.sh 零改动，dev-spec 入口措辞同步为"仍有未拍板的问题"（拍板记录不算未决）；② 方法细则 references/ 化（五文件 viewpoint / use-case / risk-mvp / prototype / research，亮牌确认后一次载一个；§9 表保留为选择路由，首个带 references/ 的流程技能，先例 sdlc / ref-testing 两级结构）；③ 采集走**校准阶梯**（①查证→②陈述句确认→③决策卡→④可点 HTML 原型→⑤转假设）与**查证过滤闸**（转假设前必问"5 分钟能查证吗"，假设表里只剩真未知）；④ **决策卡**（呈现层，不落盘为独立产物）：来源/堵着什么/具体选项+长什么样/选错代价/默认建议引用用户原话/合法出口"说不清→转假设"，原则"概念归 AI，图例归用户"；⑤ 阶梯④ = **可点 HTML 原型**（单文件内联零依赖 ≤200 行、落临时目录不进仓库、三态切换、主流程可点通、用完即弃、走查转写场景节；ASCII 线框降为兜底）；⑥ §11.2 sdlc 新增 **RUP 阶段判读层**（LCO/LCA/IOC/PR 锚定现有状态机 + 工作流强度表，纯语义零新状态零新门禁；§2–§6 不动故 METHOD.md 零同步）；⑦ RUP 副接入：§9 用例驱动行补完整用例骨架（Actor→前置→主成功场景→扩展/异常流→后置），五部件各喂 need 一节；⑧ 经典产物映射注记入 §11.13 产物边界（SRS 即 spec 每轮一张，need ≈ Vision 稳定意图贯穿多轮——反 BRUF 有意设计；用例模型/DFD/分析模型/数据字典的"实"已被 need 场景节 / design 数据流节 / spec 实现决策内嵌 / GLOSSARY 吸收，不立 docs/analyses/——产物必须有下游消费者；模板固定骨架不固定深度）。明确不接：RUP 文档仪式（SAD、迭代计划全套）、九工作流映射成技能、阶段评审式门禁。
> **v1.11 修订记录（dev-research 实现，2026-10-27）**：新增 §11.14 dev-research——技术调研 → 带一手来源引用的报告（§10.1 批 3）。定位：脊柱上有位置（§4.1）但**不进自动串联链**——sdlc next-mode 路由表不加行，调研是按需服务不是必经门禁，用户手动或 dev-clarify 调研驱动联动触发；研究问题三要素（答什么/为什么重要/影响哪个 FR 或假设）承 §11.13 调研驱动细则的接口，入口亮牌"内联查证 vs 系统调研"分流，决策点 = 问题清单确认（防答非所问）；调研纪律：后台代理并行检索、只信一手来源（二手只能作线索须回溯）、每条结论带引用与检索日期、事实与判断分离，配防编造三招（关键结论回原文核验/一般抽验、禁止训练记忆冒充检索结果、检索不可用停手如实相告）；research 产物维持无状态轻校验（§6.1），节同构靠模板内嵌保证，报告是落盘时点的快照、过期重开新张不原地改写；出口指路（结论作 spec 实现决策依据 / 回决策卡拍板）不自动串联、不代拍板。docs/research/0001（tracker 三平台调研）为格式先例。另同步 dev-clarify 细则 research.md 两处过时"（批 3）"标注。
>
> **v1.12 修订记录（批 3 tracker 适配器实现前定稿，2026-10-27）**：适配器契约定稿——`publish <file>` 之外的投影失败（CLI 缺失/未认证/API 报错/坐标配置缺失）一律明确警告并跳过（exit 0），不阻断技能出口链（§5.4 措辞由"适配器未实现（批 3 的 github/gitlab/codeup）"改为"适配器未安装"，警告语义对自定义/未安装适配器长期成立）；投影形态 = github/gitlab 走官方 CLI（gh/glab）投到平台 issue，codeup 走 OpenAPI 直连（个人访问令牌 `x-yunxiao-token`）投到 Projex 工作项，正文首行带盘上产物指针、本地 `.map` 文件记"盘上路径 ↔ 平台对象"对照（盘上是真相源，不回读）；Codeup 坐标定稿 `TRACKER_REPO=<organizationId>/<spaceIdentifier>`，工作项类型标识不做运行时探测（类型列表端点未能在官方文档核验，"无来源不结论"），由配置项显式提供；§11.1 决策①与 §14 待定项同步（适配器随技能分发、Codeup MCP 指引以"适配器直连优先、MCP 可选"形态补入 decisions.md）。
> **v1.13 修订记录（dev-release 实现，2026-10-28）**：新增 §11.15 dev-release——版本 / CHANGELOG / 发布检查单 / 部署验证（§10.1 批 3）。定位仿 dev-research：脊柱上有位置（§4.1 交付 ship / release）但**不进自动串联链**——sdlc next-mode 路由表不加行，发布时机是人的决策不是必经门禁，用户手动触发；dev-ship 出口契约不变（合并后仍自动调 dev-accept）。发布点 tag 与推送是单向门必须问人；版本号按语义化版本映射逐条带来源确认（破坏性→major，0.x 期按 semver 惯例→minor；新用户可见能力→minor；缺陷修复→patch）；CHANGELOG.md 懒创建沿用 §5.2 所有权表既有约定（只补缺失骨架，Keep a Changelog 分类），**不开新 docs/ 产物目录、check.sh 零改动**——CHANGELOG 与 tag 不进 validate（与 retro 轻产物同理，门禁只管有真实代价的事）；§7.2 引用矩阵补 dev-release → ref-writing（CHANGELOG 条目落盘前），§8 决策点全表补 dev-release 行；§10.1 dev-ship 行漂移修正（"PR + 合并 + tag"→"PR + 合并；工单 → done"，tag 语义归 dev-release，与 §11.8 及 dev-ship 技能正文一致）。
> **v1.14 修订记录（批 3 L4 hooks 实现，2026-10-28，need 0003 / spec 0005）**：L4 平台层拦截落地——判定脚本 `.sdlc/hooks/l4-guard.sh`（§5.2 目录树与所有权表新增 `.sdlc/hooks/` 行，setup 可整体覆盖；check.sh 零改动，保持纯 git 门禁），拦截两规则：**A** Bash 命令含 `--no-verify`（或 `git commit -n` 短形式）→ deny；**B** Edit/Write 落在 CODE_DIRS 下且无 `in-progress` 工单 → deny 指路 /dev-implement（"无工单"判据 = 无在办工单；CODE_DIRS 留空则规则 B 不生效，docs/ 与 .sdlc/ 不属规则 B 作用域）。载体：ZCode 工作区 `<repo>/.zcode/config.json` 顶层 `hooks` 块（`enabled: true` 必需、PreToolUse 单 matcher `Bash|Edit|Write`、process 型经 bash 调 guard）——setup 仅在命中 ZCode 适配器时合并该块（hooks 块归 setup，文件其余内容归用户；与 .git/hooks 同类，机器侧接线不进版本库）；deny 经 stdout JSON `permissionDecision`（带理由）回平台，**失效安全**：非 sdlc 工作区、stdin 异常、配置缺失一律放行（fail-open，门禁故障不锁死工作，L1/L3 兜底）。Claude Code 为同构候选载体，本批只接 ZCode。§3 L4 行、§5.5 CODE_DIRS 注记、§14 待定项随之现状化。
> **v1.15 修订记录（dev-docs 实现，2026-10-28）**：新增 §11.16 dev-docs——面向人的文档（README/API/用户文档）维护（§10.1 批 3 末项，批 3 至此全清）。定位仿 dev-research / dev-release：脊柱上有位置（§4.1 反馈沉淀 fix / retro / docs）但**不进自动串联链**——sdlc next-mode 路由表不加行，文档维护是按需服务不是必经门禁，用户手动触发。核心纪律 = **先核验后落笔**：写进文档的每条行为断言（命令/参数/输出/路径/限制）按三档核验留档——实跑 / 读实现 / 测试为证，三档都够不着如实标注"未核验"，禁止"应该如此"式措辞；文档与实现冲突以实际行为为准是默认建议，但**改哪边必须问人**（用户认定代码错 → 转 dev-fix 开票，修完再对齐——文档不将就错误行为）。维护范围限定"面向人的文档"（GLOSSARY 新词条）：流程产物归各自技能、METHOD.md 归 setup、CHANGELOG 归 dev-release、源码内注释与 docstring 属源码走工单——四条边界全是拒绝路径。§7.2 引用矩阵 dev-docs → ref-writing 行 v1.9 已有，零改动；§8 决策点全表补 dev-docs 行；不开新产物目录、无 frontmatter、不进 validate（README 等人文物非八类产物，与 CHANGELOG 同理），check.sh 零改动。
> **v1.16 修订记录（dev-execute 规划定稿，2026-10-28，need 0004 / spec 0006）**：新增 §11.17 dev-execute——V 模型整 spec 编排运行技能（§10.1 清单 20 → 21）。定位：输入点名 approved spec，构建运行依赖顺序图（blocked-by 拓扑分层，会话内视图不落盘、check.sh 零改动），在运行分支 + 运行 worktree 中按依赖序推进整 spec：同层无依赖票每票独立 worktree 经子代理并行实现（dev-implement 纪律原文复用零改动，并行度默认上限 4、参数可覆盖）→ 逐票 dev-review 编排模式评审（显式工单范围 + diff 基线 = 运行分支，出口止于 approved，单票路径零改动，§11.7 随之补契约）→ approved 票机械合回（不设人工门）+ 每次合回后预演（`check.sh all`，V 模型右臂上行）→ 全绿一次 PR（dev-ship 前半三节模板）+ pre-push + 合并确认（单向门）→ 全部票 done → 清理 worktree → 指路手动 /dev-accept 不自动串联。人交互恰两次（开工确认 + 合并确认）；异常流（设计级阻断 / spec 缺口 / 预演失败 / 合回冲突）一律停下问人带连坐阻塞面与指路。多会话可各跑各的 spec（worktree 隔离互不阻塞）；sdlc 默认报告增"运行中 worktree"段、next-mode 路由表加行（多票同 approved spec → 问询编排默认 / 单票，§11.2 随之同步）。工票 0012–0015。
> **v1.17 修订记录（spec 0006 round 2 命名修订同步，2026-10-28，票 0013 重入）**：§11.17 分支命名行改为——运行分支 `run/<spec-id>`、票分支 `run/<spec-id>-t<ticket-id>`。起因：round 1 命名 `run/<spec-id>[/<ticket-id>]` 在 git ref 名空间不可实现（`run/0006` 存在时 `run/0006/0012` 被 D/F 冲突拒绝，票 0013 首轮演练临时仓库一手复现），spec 0006 round 2 修订为扁平 `-t` 后缀（实测共存无冲突），本行随票 0013 同步；§11.17 续接行补"frontmatter 以运行/票 worktree 为准，主工作区在运行合回主干前是旧态"（演练实锤）。版本行补正：v1.16 时漏更，本版一并更至 1.17。
> **v1.18 修订记录（setup-reconstruct 规划定稿，2026-10-29，need 0006 / spec 0008）**：新增 §11.18 setup-reconstruct——存量项目知识逆向扫描技能（§10.1 清单 21 → 22）。定位按需服务同 dev-docs：不进 sdlc next-mode 路由表，用户手动触发，出口报告 + 指路。核心契约：逆向产物五路落点——逆向 need / 逆向 spec 落盘即 status: reconstructed（不进 frontier 与待办语义）、逆向 ADR status: accepted、折叠内容进 AGENTS.md 哨兵块外项目速览 / GLOSSARY 项目术语章 / docs/standards/ + CODING_STANDARDS.md 索引，产物形态与既有模板同构，check.sh 唯一机械改动 = 状态机表 need / spec 两行各加 reconstructed（随票 0001 落地）；证据与置信纪律——每条行为断言句末带统一 文件:行 证据引用、证据格式全文统一可 grep，查无证据的推断三选一（补扫取证 / 显式低置信 + 理由 + 补证路径 / 移入「开放问题」）；每张产物带扫描基线节（commit SHA、扫描日期、已覆盖 / 未覆盖范围，未覆盖区不得读成不存在）；确认前置——扫描全程只读、草案先行，用户显式确认后才落盘；落盘两路——未接入仓库先按 setup-workspace 全流程接入再写产物一次完成，已接入仓库仅写逆向产物、同名不覆盖；重跑 = 增量对齐——按基线 commit → HEAD diff 只重验涉漂移断言，基线缺失回落全量扫描；分轮协议按顶层模块边界切轮、入口优先、每轮收口一次确认，补扫 = 带范围参数的重跑。蒸馏永不触碰 reconstructed 产物（正向 / 逆向双轨互不污染）。
> **用法**：在新会话中实现某个技能时，将本文档（至少 §2–§8 通用规范、目标技能的规格节、§12 文风基准）作为输入提供给 AI。实现过程中发现设计缺陷：**先改本文档，再改技能**，保证文档与实物不漂移。

## 1. 背景与目标

- **目标**：一套完全自有的、贯穿软件开发生命周期的技能集，供"个人 + AI 协作开发"使用。
- **核心痛点**：现有技能（Matt Pocock 套件）是指令式的，写了规矩但没有检查，容易被绕过。本套件的第一设计目标是**门禁不可绕**。
- **已拍板的三个决策**：① 完全自建，不包装现有技能；② 场景为人机协作（非团队流程）；③ 规范强度为门禁式（每阶段有检查清单，不过门不进下一阶段）。
- 规范放文档（docs/METHOD.md），项目 AGENTS.md 只做引用；一个 setup-workspace 技能负责初始化工作区。
- 流程拓扑 = **脊柱**（单次变更的门禁流水线）+ **V 模型右臂**（集成验收）+ **前端循环**（MVP 分轮迭代）。

## 2. 核心设计原则

1. **能机械检查的绝不只写成指令**。校验逻辑下沉到 `.sdlc/check.sh`，git hook 和技能用同一套判断；技能只保留判断性行为（怎么做、拒绝时怎么指路）。
2. **状态在盘上，不在对话里**。一切流程状态由产物 frontmatter 表达，会话可随时中断续接。
3. **以落盘产物为接口**。技能之间通过文件衔接，不通过对话记忆。
4. **默认串联、决策必问、门禁即停**（详见 §8）。
5. **讨论自由、产物收敛**。过程方法论可选（§9），输出文档格式固定（§6）。
6. **三层分工**：技能=行为，参考=标准（什么是好），脚本=判断逻辑。
7. **盘上主本、tracker 投影**。docs/ 永远是真相源，GitHub/云效 Codeup 只是发布目标，单向发布不回读。

## 3. 反绕过：四层防御

| 层 | 机制 | 拦住谁 |
|---|---|---|
| L1 常驻指令 | AGENTS.md 哨兵块（§5.3），任何会话一进仓库就可见 | 忘了调技能的 agent 会话 |
| L2 技能入口 | 每个流程技能开头调 check.sh 校验上游产物，不满足即拒绝并指路 | 想跳步的调用 |
| L3 机械层 | git hooks（commit-msg / pre-push）跑 check.sh | 一切入库提交，含人在终端手敲 |
| L4 可选增强 | ZCode PreToolUse hook（`.sdlc/hooks/l4-guard.sh`）：拦截含 `--no-verify` 的命令、无在办工单时的源码编辑 | 明知故犯的绕过（批 3 已落地 2026-10-28，契约见 §14） |

配套设计：

- **豁免通道**：typo、纯文档改动走 `[trivial]` 标记豁免，每次豁免留痕（commit message），dev-retro 审计豁免是否被滥用。
- **门禁分级**：commit 时只查轻量项（message 带 `[#NNNN]` 且工单状态合法，或带 `[trivial]`）；merge/push 前才查重项（分支上所有 implemented 工单都有 approved 评审）。
- **诚实的边界**：`--no-verify` 后门由 L4 封堵，靠 retro 审计兜底。

## 4. 流程拓扑

### 4.1 脊柱：七阶段

问题定义（clarify）→ 调研（research）→ 设计（spec / design / prototype）→ 规划（plan）→ 实现与质量（implement / review）→ 交付（ship / release）→ 反馈沉淀（fix / retro / docs）。

### 4.2 V 模型：右臂补集成验证

| V 左臂（分解） | V 右臂（验证） | 载体 |
|---|---|---|
| need 业务需求 | 业务成功标准核销 | dev-accept 验收报告 |
| spec 功能规格 | 跨工单集成场景 | spec 验收场景 → dev-accept |
| design 技术方案 | seam / 模块边界测试 | design 定义 seam，implement 遵守 |
| ticket 工单 | 单元 / 接口测试 | dev-implement 红绿循环 |

- **FR-N 需求编号贯穿全程**：need 里系统需求编号 FR-1、FR-2…；spec 验收场景必须标注覆盖哪个 FR；dev-accept 逐条核销。任何 FR 没有被验收场景覆盖，`check.sh validate` 报孤儿。
- **spec 固定含"验收场景"节**，每条带验证层级：`[FR-N | 工单级]`（dev-plan 时映射进具体工单）或 `[FR-N | 集成级]`（拆不进单票、必须集成后验证的场景——dev-accept 的运行清单）。集成风险在规划时显式化。
- **工单生命周期归 dev-ship，spec 生命周期归 dev-accept**：ship 只推 ticket → done；spec → done 由 accept 验收通过后推进。
- 结构性预防保留：dev-plan 的 tracer-bullet 垂直切片（每票切穿全部层）本身防集成病，dev-accept 是第二道保险。

### 4.3 循环模型：MVP 分轮

- need 模板固定含**"假设与风险"**节：模糊需求变成显式假设清单，按"错了代价 × 不确定度"排序。
- spec frontmatter 带 `round: N`：同一 need 可有多张 spec，round 1 覆盖风险最大的最小范围（MVP）。分轮决策在 dev-spec 与用户一起做，依据是风险表。
- dev-accept 的出口即回转点：验收报告固定含"假设验证结果 / 残余风险 / 下一轮建议"。
- **退出条件机械化**：need 终态 `fulfilled`，由 dev-accept 在"成功标准全部核销 + 无未接受风险"时推进。`/sdlc` 总览显示循环状态（如"need 0003：round 1 已验收，2 条残余风险 → 建议开 round 2"）。

## 5. 工作区规范（占用文件与目录）

### 5.1 三条总原则

1. **机器物与人文物分家**：`.sdlc/` 放流程基础设施，`docs/` 放流程产物，互不越界。
2. **一切流程产物进版本库**：不往 `.gitignore` 加任何东西——审计链的完整性是门禁体系的一部分。
3. **可升级、不覆盖**：setup-workspace 幂等重跑；"整体覆盖"还是"只补缺失"按 §5.2 所有权表严格执行。

### 5.2 目录总览与所有权

```
<repo>/
├── .sdlc/                      # 流程基础设施
│   ├── check.sh                # 门禁脚本（子命令见 5.4）
│   ├── config.sh               # 本仓库配置（tracker、检查命令、CODE_DIRS）
│   ├── hooks/                  # 平台层拦截 hook（l4-guard.sh，L4 载体判定脚本）
│   └── trackers/               # tracker 适配器（local/github/gitlab/codeup.sh，可扩展）
├── docs/
│   ├── METHOD.md               # 方法论全文（setup 生成与升级）
│   ├── needs/                  # 需求纪要     NNNN-slug.md
│   ├── research/               # 调研报告     NNNN-slug.md
│   ├── specs/                  # 规格         NNNN-slug.md
│   ├── designs/                # 技术方案     NNNN-slug.md
│   ├── tickets/                # 工单（feature 与 fix 同池编号）
│   ├── reviews/                # 评审报告     NNNN-slug.md
│   ├── acceptance/             # 验收报告     NNNN-slug.md
│   ├── retros/                 # 复盘报告     NNNN-slug.md（轻产物，不进 check.sh 门禁）
│   ├── standards/              # 用户自有/团队编码标准（setup 增量导入，可多份）
│   └── adr/                    # 架构决策记录 NNNN-slug.md
├── AGENTS.md                   # 追加 sdlc 哨兵块
├── GLOSSARY.md                 # 术语表：setup 首建"流程术语与状态"章，项目术语持续增长
├── CODING_STANDARDS.md         # 编码标准索引 + 兜底基线（索引指向 docs/standards/）
└── CHANGELOG.md                # 懒创建，仅需要发布流程的项目
```

`.git/hooks/commit-msg`、`pre-push`：setup 安装的一行转发脚本（`.sdlc/check.sh commit-msg` 等），不进版本库；换机器克隆后重跑 `/setup-workspace` 即恢复。轻门禁挂 commit-msg 而非 pre-commit——git 在 commit-msg 时点才写入 commit message，pre-commit 时消息尚不存在，机械校验无从谈起。L4 的平台侧接线与其同类：setup 在命中 ZCode 适配器时把 PreToolUse hooks 块合并进工作区 `<repo>/.zcode/config.json`（`enabled: true` 必需；hooks 块归 setup，文件其余内容归用户），机器侧接线不进版本库，判定逻辑全在版本化的 `.sdlc/hooks/l4-guard.sh` 里。

**目录懒创建**：setup 只建 `.sdlc/` 和 `docs/`，其余产物目录由第一个产物落盘时创建，不留 `.gitkeep`。

`docs/retros/` 是唯一的非门禁产物目录：复盘报告由 dev-retro 落盘，`validate` / `phase` / `publish` 不受理（§11.10），符合 §5.7"门禁只管有真实代价的事"；审计链价值靠版本库留痕，不靠门禁。

| 路径 | 首次创建 | 日常写入者 | setup-workspace 重跑时 |
|---|---|---|---|
| `.sdlc/check.sh` | setup | 仅 setup | **可整体覆盖**（纯逻辑） |
| `.sdlc/hooks/*` | setup | 仅 setup | 可整体覆盖（纯逻辑） |
| `.sdlc/trackers/*` | setup | 仅 setup | 可整体覆盖；已有自定义适配器不删 |
| `.sdlc/config.sh` | setup | **用户** | 仅缺失时生成模板，**绝不覆盖** |
| `docs/METHOD.md` | setup | 仅 setup | 可整体覆盖 |
| AGENTS.md 的 sdlc 块 | setup | 仅 setup | 只替换哨兵标记之间的内容 |
| GLOSSARY.md | setup（首建"流程术语与状态"章） | 对应技能与用户（项目术语） | 只补流程章，项目术语不动 |
| CODING_STANDARDS.md | setup（索引 + 兜底基线） | 用户与 dev-review | 已有内容不动 |
| docs/standards/* | setup 导入（§11.1 决策 3：标准来源） | 用户 | 同名文件不覆盖，只增不删 |
| CHANGELOG.md | 首个产物时 | 对应技能与用户 | 只补缺失骨架 |
| `docs/` 产物目录 | 首个产物时 | 对应技能 | 不触碰已有文件 |
| `.git/hooks/*` | setup | — | 幂等重装 |
| `src/` 及一切其他文件 | — | — | **永不触碰** |

### 5.3 AGENTS.md 哨兵块（L1 常驻指令）

```markdown
<!-- sdlc:begin 由 setup-workspace 管理，勿在此块内手改 -->
## 开发流程（强制，不可协商）
完整规则见 docs/METHOD.md，术语与状态定义见 GLOSSARY.md。
- 改动源码前必须存在 status: approved 的 spec 与对应工单；小修走 [trivial] 豁免（retro 审计）。
- 提交必须通过 .sdlc/check.sh；禁止 --no-verify。
- 评审标准轴依据 CODING_STANDARDS.md 及其索引的 docs/standards/ 文件。
- 不确定当前阶段就运行 /sdlc，不要凭记忆推进。
<!-- sdlc:end -->
```

块外永远是用户的；AGENTS.md 不存在时创建。

### 5.4 check.sh 子命令（8 个）

| 子命令 | 干什么 | 被谁调用 |
|---|---|---|
| `phase` | 扫全部产物 frontmatter，输出全库状态总览（含轮次与风险状态） | /sdlc、人 |
| `frontier` | 列出阻塞已清、可开工的工单 | dev-implement 入口 |
| `ticket NNNN` | 入口校验：工单 ready（或 in-progress 重入续接）、阻塞已清、spec approved | dev-implement 入口 |
| `all` | 全量 lint / typecheck / test（按 config.sh，经 `RUN_PREFIX` 包裹执行以适配 docker / 版本管理器）；仓库没定义任何检查命令时输出响亮警告并视为发现（exit 0），不静默跳过 | dev-implement 出口、dev-ship、dev-accept |
| `validate <file>` | 模板完整性校验：必填节齐全、frontmatter 合法、FR 编号规范、验收场景可追溯（无孤儿 FR）、工单依赖无环 | 各产物技能的出口门禁 |
| `commit-msg` | 轻门禁：message 带 `[#NNNN]` 且工单状态合法（in-progress/implemented），或带 `[trivial]`；挂载于 git commit-msg hook | git hook |
| `pre-push` | 重门禁：分支上所有 implemented 工单都被某张 approved 评审覆盖（review 的 `tickets: []` 声明覆盖面） | git hook |
| `publish <file>` | 按 config.sh 的 TRACKER 调用 `.sdlc/trackers/<TRACKER>.sh` 发布/镜像产物到对应平台；适配器未安装（缺对应文件）时明确警告并跳过（exit 0）；适配器自身的投影失败（CLI 缺失/未认证/API 报错/坐标配置缺失）同样警告跳过（exit 0），均不阻断技能出口链——产物在盘上已是真相源 | 各技能落盘后 |

### 5.5 config.sh

setup 时按项目类型探测预填，留空的项跳过；用户可改，重跑 setup 绝不覆盖：

```sh
# 流程配置
TRACKER=local        # local | github | gitlab | codeup（可扩展：新增 .sdlc/trackers/xxx.sh 即可）
TRACKER_REPO=""      # github: owner/repo；gitlab: group/project；codeup: 组织/仓库标识
BASE_REF=main        # pre-push 计算 merge-base 的基准分支

# 运行环境（setup 探测预填；all 的检查命令经 RUN_PREFIX 包裹执行）
RUN_ENV=local        # local | docker
RUN_PREFIX=""        # 例：docker "docker compose run --rm app"；版本管理 "mise exec --"
PKG_MGR=""           # npm | pnpm | yarn | pip | poetry | uv | cargo | go | maven …
CODE_DIRS=""         # 源码目录探测结果，空格分隔（L4 hook 规则 B 的作用域：留空则"无在办工单不得改源码"不生效；docs/ 与 .sdlc/ 永不列入），按仓库实际布局填，不做 src/ 假定

# 检查命令（包装仓库自己的命令）
CHECK_LINT="npm run lint"
CHECK_TYPE="npm run typecheck"
CHECK_TEST="npm run test"
```

**盘上主本、tracker 投影**：check.sh 的门禁读的是产物 frontmatter，所以 docs/ 永远是真相源；tracker 只是发布目标，单向发布不回读。

### 5.6 命名与杂项规则

- 产物文件名 `NNNN-slug.md`：四位零填充、每类产物独立递增、从 0001 起；slug 一律 ASCII 小写短横线（中文标题放正文 H1，slug 用英文词，无合适英文时用拼音）。
- 正文引用其他产物必须带类型限定（"spec 0003"、"ticket 0007"、"ADR 0002"）；裸编号只允许出现在 frontmatter 字段里。
- commit message 首行带 `[#NNNN]`（多工单 `[#7][#8]` 格式，按四位编号写）；豁免标记 `[trivial]`。
- 日期只记 `created` 和状态变更日（如 `approved`），不搞修订历史——那是 git 的事。
- 分支名不做硬门禁，只约定 `feat/<slug>` / `fix/<slug>`。

### 5.7 明确的"不做"

- 不设 `.scratch/` 草稿区：草稿就是 `status: draft` 的正式产物，杜绝第二真相源。
- 不 gitignore 任何流程产物：评审报告和工单是审计链本身。
- METHOD.md 不放产物模板：模板内嵌在写产物的技能里（执行者持有模板），METHOD.md 只写规则、状态机、目录规范，避免两处模板漂移。
- 门禁只管有真实代价的事：分支名等约定不进 check.sh。

## 6. 产物规范（固定格式）

### 6.1 frontmatter 与状态机总表（check.sh 解析依据，全流程单一真相）

| 产物 | frontmatter 字段 | 状态机（箭头上是推进者） |
|---|---|---|
| need | `id` `status` | draft →confirmed（dev-clarify）→fulfilled（dev-accept，末轮通过且成功标准核销、无未接受风险） |
| spec | `id` `status` `need?` `round` | draft →approved（dev-spec，须用户批准）→done（dev-accept 验收通过） |
| design | `id` `spec` `status` | draft →approved（dev-design） |
| ticket | `id` `type: feature\|fix` `spec` `blocked-by: []` `status` | ready（dev-plan）→in-progress / implemented（dev-implement）→done（dev-ship 合并后） |
| review | `id` `tickets: []` `branch` `status` | draft →approved（dev-review，两轴阻断项清零） |
| acceptance | `id` `spec` `round` `status` | draft →passed \| rejected（dev-accept） |
| adr | `id` `status` | accepted →superseded（被新 ADR 取代时） |
| research | `id` | 无状态，纯参考资料 |

> 列表字段（`blocked-by`、`tickets`）必须单行书写：`[]` 或 `[0006, 0008]`；多行列表不予解析，`validate` 报错。

### 6.2 need 模板（固定；方法论不同，落盘同构）

```markdown
---
id: 0003
status: draft
created: <date>
---
# <标题>

## 背景与业务目标          ← 业务需求层
## 干系人与用户            ← 用户需求层：谁、要完成什么、成功标准
## 系统能力需求            ← 系统需求层：FR-1、FR-2…
## 场景                    ← 用例走查落这里（Given/When/Then）
## 假设与风险              ← 循环模型的分轮依据，按代价×不确定度排序
## 范围与非目标
## 开放问题                ← 清零才准进 dev-spec（出口门禁）
```

### 6.3 spec 模板（固定）

```markdown
---
id: 0001
status: draft
need: 0003          # 可选
round: 1
created: <date>
---
# <标题>

## 问题陈述             ← 用户视角的问题
## 方案                 ← 用户视角的解决方案
## 用户故事             ← 编号长列表："作为<角色>，我想要<功能>，以便<收益>"
## 实现决策             ← 模块/接口/schema/API 契约；不含具体文件路径与代码。
                         原型产出的关键片段（状态机、schema、类型形状）可内嵌并注明来源
## 测试决策             ← seam 清单；既有同类测试作为先例
## 验收场景
- [FR-1 | 工单级] Given … When … Then …
- [FR-3 | 集成级] Given … When … Then …   ← dev-accept 的运行清单
## 非目标
## 备注
```

### 6.4 ticket 模板（固定；dev-plan / dev-fix 产出、dev-implement 增补）

```markdown
---
id: 0007
type: feature
spec: 0001
status: ready
blocked-by: []
created: <date>
---
# 0007: <标题>

**做什么：** 端到端行为（用户视角），非分层实现清单

**验收标准：**
- [ ] <可验证的条目，勾选时须有证据（哪个测试/什么输出）>

**Blocked by：** 无 | 编号列表

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
```

### 6.5 review / acceptance / design / adr 模板要点

- review：frontmatter 见 6.1；正文固定 `## 标准轴 findings`、`## Spec 轴 findings`（每条：文件:行 + 怎么改 + 为什么 + 阻断/建议分级）、`## 汇总`（各轴阻断数）。双轴独立报告，不合并重排。
- acceptance：正文固定 `## 场景结果`（逐条：场景/FR/证据/结论）、`## 假设验证`、`## 残余风险`、`## 下一轮建议`。
- design：正文固定 `## 模块划分`（每模块：职责 / 对外接口 / 依赖方向，依赖单向不成环）、`## 数据流`（一条典型路径从入口到存储，写清状态与所有权）、`## seam 清单`（每条：在哪测、测什么；是 spec 测试决策的细化）、`## ADR 索引`（本方案产生的 ADR 与一句话结论；无则写"无"）。不含具体文件路径与代码。
- adr：正文固定 `## 背景`（为什么现在决策）、`## 决策`（选了什么、放弃什么）、`## 后果`（正向 / 负向 / 后续约束）；只在 ADR 三条件命中时写。superseded 时追加日期、不删除。

### 6.6 文档一致性的三道机械保证

① 模板内嵌在技能里，每次生成同构；② `check.sh validate` 校验必填节、编号规范、FR 追溯；③ FR-N 追溯链把 need/spec/acceptance 互相锁死。不靠 AI 自觉。

## 7. 三层技能架构与参考层（ref-*）

```
L3 流程技能 dev-*（15 个）：驱动生命周期、持门禁、自动串联；用户与模型均可调用
L2 参考技能 ref-*（5 个）：定义"什么是好"；由流程技能在指定时机用 Skill 工具加载
L1 基础设施：check.sh + trackers/ + config.sh + METHOD.md + AGENTS.md 块
```

### 7.1 五个参考技能的内容要点

- **ref-writing（编写人类可理解文档）**：平实具体、例子优先、一段一个观点；术语一律来自 GLOSSARY 且首次出现给定义；禁用空洞抽象词（"提升效率""优化体验"），写成可验证的陈述；给数字、给命令、给文件名。
- **ref-implementation（什么是好的实现）**：代码读起来像叙事；命名表意；模块深（接口窄、做的事多）；错误处理显式；边界情况被处理而不是被注释；无投机泛化；diff 最小化——只改工单要求的。
- **ref-testing（什么是好的测试）**：通则——只测外部行为不测实现；期望值来自独立来源（已知字面量、算例、spec），禁止用与实现相同的逻辑算出；只在预定 seam 上测；一个测试一个行为；测试名即规格；失败信息能直接定位；可重复确定（不依赖执行顺序、真实时间与外部服务，随机须固定种子）。含反模式清单：实现耦合、同义反复、横向切片。细则按六类测试拆 references/（red-green 红绿循环、table-driven 表格驱动、integration 集成、e2e、stress-capacity 压力与容量、chaos 混沌），进入具体场景按 SKILL.md 路由表按需读取、一次只载一个（§11.3）。
- **ref-review（什么是好的评审行为）**：只评 diff 范围内的事；每条 finding 可执行（文件:行 + 怎么改 + 为什么）；分级"阻断 / 建议"；区分"违反标准"与"个人品味"，后者不阻断；双轴独立不互相稀释；内置 Fowler 代码坏味道基线清单（每条：是什么 → 怎么修），repo 已文档化的标准优先于基线，工具已强制的跳过。
- **ref-git-commit（规范的提交与合并信息）**：一次提交只做一件事（一个验收标准或一次红绿循环）；首行 `[#NNNN]`（豁免 `[trivial]`）+ 祈使句行为摘要，不报文件清单；正文写 diff 看不出来的"为什么"与证据；合并信息随合并方式收敛（merge commit 讲合入什么，squash 按首行规范重写，ff 历史即提交本身）；PR/MR 描述里的工单引用语法随平台，平台编号 ≠ 盘上工单编号（`Closes #N` 吃平台编号），三平台语法见 docs/research/0001。

### 7.2 引用矩阵（越靠近实现层，reference 越密）

| 流程技能 | 加载哪个参考 | 时机 |
|---|---|---|
| dev-clarify / dev-spec / dev-design / dev-research / dev-docs | ref-writing | 落盘前 |
| dev-implement | ref-implementation + ref-testing + ref-git-commit | 开工装载；写测试前重读 ref-testing |
| dev-execute | ref-implementation + ref-testing + ref-git-commit | 开工装载；收口 PR 正文与合并信息按 ref-git-commit |
| dev-review | ref-review + ref-implementation | 评审前 |
| dev-ship | ref-git-commit | PR 描述与合并信息落盘前 |
| dev-release | ref-writing | CHANGELOG 条目落盘前 |
| dev-fix | ref-testing（经 dev-implement 链装载，dev-fix 正文不重复装载） | 先写失败测试之前 |
| dev-accept / dev-retro | ref-writing | 报告落盘前 |

dev-implement / dev-fix 按上表固定时机装载 ref-testing **本体**（通则 + 路由）；写哪类测试，再按其场景路由表读取对应 references/ 细则，一次只载一个——装载时机固定，细则加载随场景。

### 7.3 参考技能的调用规则

- 不设 `disable-model-invocation`（需被 Skill 工具显式调用），但 description 写明"内部参考，由 XX 在 YY 时机加载，不直接响应独立请求"；用户直呼 ref-* 时，引导到对应流程技能。
- "什么是好"的知识只存一份、按需进上下文，不污染每个会话。

## 8. 自动化契约

**每个流程技能完成后的出口只允许三种形态之一，禁止做完沉默等指令：**

1. **自动调用**下一个技能（无决策点时，如 implement → review、ship 收尾 → accept）；
2. **抛出决策问题**，且必须带默认建议（用户只需回"嗯"或纠正）；
3. **被门禁拦停**，说明缺什么、指路（如"spec 0003 还是 draft，先 /dev-spec 完成批准"）。

**普适规则：任何流程技能中断时（用户喊停、上下文将尽、被卡住），先把当前进展写回产物的 `## Progress` 或状态字段，再停。**

### 决策点全表（其余全部自动串联）

| 技能 | 出口自动动作 | 必须问人的点 |
|---|---|---|
| dev-clarify | 建议进 dev-spec | 方法论亮牌确认；need 定稿 |
| dev-spec | publish → 进 dev-plan | **spec 批准**；MVP 分轮范围 |
| dev-design | publish design + ADR → 建议进 dev-plan | **方案批准**；ADR 级取舍 |
| dev-plan | publish 工单 → 提示 frontier | 拆分粒度确认 |
| dev-implement | **自动调 dev-review** | 无（spec 缺口时停下报告，属门禁回路） |
| dev-execute | 全部票 done 后停，指路 /dev-accept（不自动串联） | **开工确认**；**合并确认**（单向门）；异常流处置（预演失败 / 合回冲突 / 设计级阻断） |
| dev-review | 通过 → 自动准备 PR（dev-ship 前半；dev-execute 编排模式下止于 approved，PR 由编排方运行末统一准备） | 阻断项修复策略：机械问题自动修再审，设计级问题问人 |
| dev-ship | 全部工单 done → 自动调 dev-accept | **合并确认**（单向门） |
| dev-release | 无自动串联（指路 dev-retro） | **版本号确认**；**tag 与推送**（单向门）；部署验证判据 |
| dev-accept | 通过 → spec 标 done（末轮则 need 标 fulfilled） | 开不开下一轮（循环回转点） |
| dev-fix | 自动调 dev-implement（fix 票进实现链，经其出口到达 dev-review） | 定级与修复时机 |
| dev-retro | 产出改动清单 | 采纳哪些 |
| dev-docs | 无自动串联（指路 dev-fix / dev-release / dev-retro） | 变更清单确认；文档与实现冲突时改哪边（默认建议：以实际行为为准改文档） |

`/sdlc` 增加一个 `next` 模式：**自动推进到下一个决策点为止**——"你只管决策，重复劳动归流水线"。

## 9. 需求方法论选择器（内置于 dev-clarify）

**规则**：按信号选主方法（可组合），开场先向用户亮牌（"我建议用 X，因为 Y"），用户可否决换方法；无论用哪种方法聊，落盘都是同一个 need 模板（§6.2）。方法决定**怎么聊**，模板决定**落成什么样**。

| 方法 | 适用信号 | 核心动作 |
|---|---|---|
| 视点分析（业务/用户/系统三层） | 多干系人、业务流程复杂 | 逐层下钻：为什么做→谁用→系统要什么 |
| 用例驱动 | 交互密集、流程分支多 | RUP 用例骨架走查：Actor→前置→主成功场景→扩展/异常流→后置（成功标准） |
| 风险驱动 MVP 分轮 | 需求模糊、决策短期不确定 | 假设排序→圈最小可验证范围 |
| 原型驱动 | UI/体验说不清 | 联动 prototype，先做可点的 |
| 调研驱动 | 技术/外部依赖不确定 | 联动 dev-research |

经典需求工程三步（挖掘→分析→设计）对应管线位置：clarify（挖掘+分析）→ spec（设计）。

## 10. 技能总清单与建设计划

### 10.1 清单（22 个 = 17 流程 + 5 参考）

| 技能 | 层 | 一句话职责 |
|---|---|---|
| setup-workspace | 流程 | 交互式初始化/升级工作区（幂等） |
| setup-reconstruct | 流程 | 存量项目知识逆向扫描：分轮读码产出带证据与扫描基线的套件形态沉淀物，确认后落盘，重跑即增量对齐（按需服务） |
| sdlc | 流程 | 总控：报当前阶段、下一步、被哪个门禁挡住；`next` 模式自动推进到决策点 |
| dev-clarify | 流程 | 想法 → need（内置 §9 方法论选择器） |
| dev-research | 流程 | 技术调研 → 带来源引用的报告（后台代理执行） |
| dev-spec | 流程 | need/对话 → spec（固定模板、验收场景、分轮决策） |
| dev-design | 流程 | spec → 技术方案 + ADR（定义 seam） |
| dev-plan | 流程 | spec → 垂直切片工单 + 依赖边（标记集成级场景） |
| dev-implement | 流程 | 工单 → 实现（红绿循环、Progress 交接） |
| dev-execute | 流程 | 整 spec 编排运行：依赖序图 → worktree 并行实现 → 一次合并收口 |
| dev-review | 流程 | 双轴评审（标准轴 + Spec 轴）→ 评审报告 |
| dev-accept | 流程 | 集成验收：跑集成级场景、核销 FR、风险复审 |
| dev-ship | 流程 | PR + 合并；工单 → done |
| dev-release | 流程 | 版本 / CHANGELOG / 发布检查单 / 部署验证 |
| dev-fix | 流程 | 分诊定级 → 复现（失败测试先行）→ 修复 → 回归 |
| dev-retro | 流程 | 复盘 → 结论沉淀为可执行改动（标准/检查/技能修订）；审计 [trivial] 豁免 |
| dev-docs | 流程 | 面向人的文档（README/API/用户文档）维护 |
| ref-writing | 参考 | 编写人类可理解文档的标准 |
| ref-implementation | 参考 | 好实现的标准 |
| ref-testing | 参考 | 好测试的标准（含六类测试参考与场景路由） |
| ref-review | 参考 | 好评审行为的标准（含坏味道基线） |
| ref-git-commit | 参考 | 规范提交与合并信息的标准 |

### 10.2 批次与推荐实现顺序

- **批 1（13 个，最小闭环含质量标准）**，推荐顺序：
  1. setup-workspace（基础设施先就位）✅ 2026-10-26
  2. sdlc（总控）✅ 2026-10-27（next 模式路由表与上下文 token 水位线随 v1.3 定稿；§13.2 自测通过——拒绝/重入/只读/衔接断链四项实测，触发项因会话技能列表固定留待新会话复验）
  3. ref-writing ✅ 2026-10-27
  4. dev-spec ✅ 2026-10-27（规格即 §11.4，§6.3 模板内嵌正文；§13.2 自测：产物校验经 validate 正反往返实测通过，触发/拒绝/重入/衔接静态核验通过、行为验证待新会话）
   5. dev-plan ✅ 2026-10-27（规格即 §11.5，§6.4 模板内嵌正文；§13.2 自测：产物校验经 validate 正反往返实测通过——模板票过 validate/publish/frontier/ticket 四命令，多行 blocked-by、缺 Progress、缺验收标准、缺 spec 字段、依赖环、悬空引用、非法状态七类反例全拦；触发/拒绝/重入/衔接静态核验通过、行为验证待新会话）
    6. ref-testing、ref-implementation（均 ✅：ref-implementation 2026-10-26；ref-testing 2026-10-27，六类测试参考与场景路由随 v1.4 定稿）
  7. dev-implement ✅ 2026-10-27（规格即 §12 范文，随 v1.5/v1.6 同步开工装载与重入语义；§13.2 自测：拒绝/重入两项经门禁行为实测通过，触发/衔接静态核验通过、行为验证待新会话，产物校验不适用——技能文件非八类产物；评审 0004 两轴阻断 0、建议 1 项采纳核销，approved，并核销 review 0003 遗留装载验证项）
  8. ref-review ✅ 2026-10-26
  9. dev-review ✅ 2026-10-26（依赖的 ref-review / ref-implementation 同日完成；§13.2 端到端自测待 setup-workspace 就绪后补跑）
  10. dev-ship ✅ 2026-10-27（规格即 §11.8，PR 三节模板内嵌正文，PR 落点跟 config.sh 的 TRACKER 走不预设平台；§13.2 自测：pre-push 复用、重入判定 merge-base --is-ancestor、commit-msg [trivial] 豁免三项经门禁行为实测通过，触发/拒绝/衔接静态核验通过、行为验证待新会话，产物校验不适用——技能文件非八类产物）
  11. dev-accept ✅ 2026-10-27（规格即 §11.9，§6.5 模板内嵌正文；passed/rejected 判定机械化，fulfilled 前残余风险须逐条经用户显式接受；§13.2 自测：产物校验经 validate 正反往返实测通过——正例 draft/passed/rejected 三态过 validate，缺节、缺 spec、缺 round、非法状态、悬空 spec 引用五类反例全拦；拒绝依据经 phase 行为实测——工单含 implemented 时无"approved 且全 done"候选；publish 跳过路径实测 exit 0；触发/重入/衔接静态核验通过、行为验证待新会话）
  12. ref-git-commit（规范提交与合并信息；2026-10-27 经 spec 0001 增补）✅ 2026-10-27
- **批 2（4 个）**：dev-clarify（✅ 2026-10-27，规格即 §11.13，首个带 references/ 的流程技能——方法论亮牌五法路由 + 五细则文件，校准阶梯（查证→陈述句确认→决策卡→可点 HTML 原型→转假设）配查证过滤闸，开放问题三路归置清零 + 拍板记录；§13.2 自测：产物校验经 validate 正反往返实测通过——七节正例 draft/confirmed 两态过 validate、publish 缺省跳过 exit 0，缺节、非法状态、id 与文件名前缀不一致、slug 非法四类反例全拦；触发/拒绝/重入/衔接静态核验通过、行为验证待新会话；sdlc RUP 阶段判读层随本批落 §11.2）、dev-design（✅ 2026-10-27，规格即 §11.12，design 为可选产物——三条件命中才做、入口亮牌可拒绝；§13.2 自测：产物校验经 validate 行为实测通过——design draft/approved 两态与 adr accepted/superseded 两态过、非法状态拦截；触发/拒绝/重入/衔接静态核验通过、行为验证待新会话；产物节校验不适用——validate 对 design/adr 轻校验，节同构靠模板内嵌）、dev-fix（✅ 2026-10-27，规格即 §11.11，分诊定级 + 开 fix 票 + 自动调 dev-implement，不自带实现循环；§13.2 自测：产物校验经 validate/ticket/frontier 行为实测通过——合规 fix 票过三关，缺 spec、缺验收标准、缺 Progress、多行 blocked-by 四类反例全拦，done 状态 spec 的开票路径经 ticket 命令实测放行；触发/拒绝/重入/衔接静态核验通过、行为验证待新会话）、dev-retro（✅ 2026-10-27，规格即 §11.10，报告落 docs/retros/ 轻产物不进门禁；§13.2 自测：豁免审计命令链在本仓库 12 条 [trivial] 史上行为实测通过——grep 圈范围、逐条 git show 取证、绕过信号扫描三段均可机械执行，0692119 整树入库 2026 行为滥用判定阳性样本、b42d410 三文件纯文档为合规样本；触发/拒绝/重入/衔接静态核验通过、行为验证待新会话，产物校验不适用——复盘报告非门禁产物）
- **批 3**：dev-research（✅ 2026-10-27，规格即 §11.14，后台代理并行 + 只信一手来源 + 每条结论带引用与检索日期，出口指路不自动串联；§13.2 自测：产物校验经 validate 行为实测通过——正例无 status 无必填节照过，缺 frontmatter、id 与文件名前缀不一致、slug 非法三类反例全拦，publish 适配器缺失跳过路径实测 exit 0；触发/拒绝/重入/衔接静态核验通过，检索类行为（后台代理、一手来源核验）待首次实战验证）、dev-release（✅ 2026-10-28，规格即 §11.15，语义化版本映射 + CHANGELOG 懒创建 + 发布检查单——tag 与推送是单向门必须问人，出口指路不自动串联；§13.2 自测：触发/拒绝/重入/衔接静态核验通过、行为验证待新会话，产物校验不适用——CHANGELOG 非 validate 受理产物，版本映射与部署验证行为待首次实战验证）、dev-docs（✅ 2026-10-28，规格即 §11.16，先核验后落笔——每条行为断言按实跑 / 读实现 / 测试为证三档核验留档，够不着就标"未核验"；文档与实现冲突以实际行为为准是默认建议、改哪边必须问人；维护范围限面向人的文档，流程产物 / METHOD / CHANGELOG / 源码内 docstring 四条拒绝边界；按需服务不进自动串联链，check.sh 与 next-mode 路由表零改动；§13.2 自测：触发/拒绝/重入/衔接静态核验通过，产物校验不适用——README 等人文物非 validate 受理产物，核验与冲突分流行为待首次实战验证）、trackers 的 github/gitlab/codeup 适配器（✅ 2026-10-27，need 0002 + spec 0004，契约随 v1.12 定稿——投影=平台 issue / Codeup 工作项+MARKDOWN 评论，正文首行盘上指针，.map 三字段幂等，投影失败一律警告跳过 exit 0；codeup 仅用 2026-10-27 一手核验的 CreateWorkitemV2/CreateWorkitemComment 两端点，类型标识走 CODEUP_WORKITEM_TYPE 配置不做运行时探测；§13.2 自测：run-tests.sh 99 用例全绿——三平台以 PATH 替身断言调用面，红绿循环中修掉 bash 3.2 三陷阱（变量邻接全角括号报 unbound、pwd 未加 -P 致物理路径失配、适配器目录层级少上一级）；github 经本机真实凭据实证投影与幂等（HankChenCH/skills issue #1），gitlab/codeup 真实凭据路径留验收集成级场景）、L4 hooks（✅ 2026-10-28，need 0003 + spec 0005，契约随 v1.14 定稿——判定脚本 `.sdlc/hooks/l4-guard.sh` 自包含、check.sh 零改动，规则 A 拦 `--no-verify` 长形式与 `git commit -n` 短形式、规则 B 拦无 in-progress 工单的 CODE_DIRS 源码编辑，deny 经 stdout JSON permissionDecision 带理由，失效安全一律放行（fail-open）；载体 = 工作区 `.zcode/config.json` hooks 块（enabled:true 必需），setup 仅 ZCode 会话合并、其余内容不动；§13.2 自测：run-tests.sh 121 用例全绿——L4 组 22 条覆盖拦截/放行/失效安全矩阵，触发/拒绝/重入/衔接静态核验通过，产物校验不适用——guard 脚本非八类产物，真实 ZCode 会话触发与 hooks 配置生效时机留验收集成级场景）

批 2/3 技能要点：dev-clarify（想法→need；方法论亮牌五法路由 + references/ 细则；校准阶梯：查证→确认→决策卡→可点 HTML 原型→转假设，配查证过滤闸；开放问题三路归置清零；RUP 双接入——sdlc 里程碑判读层 + 用例骨架）；dev-design（spec→模块划分/数据流/seam/ADR；ADR 三条件：难逆转、无上下文会困惑、真实权衡）；dev-fix（先分诊定级，修复前必须先有失败测试）；dev-research（后台代理、只信一手来源、每条结论带引用）；dev-release（语义化版本 + CHANGELOG + 发布检查单）；dev-docs（面向人的文档，与实际行为一致性优先）；dev-retro（复盘 = 豁免审计 + 改动清单沉淀；结论三态合规/滥用/存疑、只认 diff 证据；报告落 docs/retros/ 轻产物，不进 check.sh 门禁）。

### 10.3 与 Matt Pocock 套件共存与归档

- `dev-` / `ref-` / `sdlc` / `setup-workspace` 命名不冲突，可平滑共存。
- 风险：Matt 的 tdd / code-review / research / domain-modeling 等允许模型自动调用，agent 可能自动选中它们绕开门禁链。批 1 建完试用确认后，把 Matt 的生命周期类技能（to-spec、to-tickets、to-questionnaire、implement、implement-spec、code-review、tdd、research、domain-modeling、prototype、triage、handoff、retro、diagnosing-bugs）移入归档目录；写作类（writing-* 等）不冲突，保留。

## 11. 技能规格

### 11.1 setup-workspace

- **职责**：交互式初始化/升级工作区，严格按 §5 生成一切；把接入方式适配到当前运行的智能体。SKILL.md 只留控制流（~70 行），操作细则下沉 `references/`（scan-signals / decisions / generation / agent-adapters），进入阶段前才按需 Read；逐字拷贝进目标仓库的模板放 `assets/`（check.sh / METHOD.md / GLOSSARY.md / trackers/local.sh / standards/）。
- **流程**：
  1. 前置校验：必须在 git 仓库内；assets/ 与 references/ 完整。**识别智能体**（环境变量 → 配置目录 → 技能安装路径），命中 `references/agent-adapters/<name>.md` 则全程应用其接入差异（如 Claude Code 需 CLAUDE.md 加 `@AGENTS.md` 转发行），未命中走通用流程——AGENTS.md 是跨智能体契约。
  2. 扫描（只读，先扫后问）：**仓库类型**（根级 workspace 标志 → monorepo 逐包扫描，否则整仓）；语言与框架（按包读 manifest）；检查命令（monorepo 优先聚合命令 turbo/nx/pnpm -r/go work）；环境已述项（Dockerfile/compose、版本管理文件、lockfile）；已有接入物（.sdlc/check.sh 存在 → 升级模式，全程按 §5.2 所有权表执行并逐项报告覆盖/保留/补缺）。
  3. 决策点（必须问、带默认建议，扫描已答的只复述不重问）：① 产物与 issue 出口 local（默认）/ GitHub / GitLab / 云效 Codeup——选 GitHub 验证 `gh auth status`，选 GitLab 验证 `glab auth status`，选 Codeup 引导添加 Codeup MCP；凭据/MCP 不通过回落 local 并明确告知，不静默降级；github/gitlab/codeup 的 publish 适配器随技能分发（assets/trackers/），setup 按所选出口安装对应文件并告知投影失败时的警告跳过语义（不阻断技能出口链）。② 执行环境缺口——每语言三问（跑在哪/版本管理/包管理器），仓库已描述的直接复述，结果写 config.sh 的 RUN_ENV/RUN_PREFIX/PKG_MGR/CODE_DIRS。③ 编码标准来源——内置 starter 只是兜底：问用户自有/团队标准及其来源（本地路径 / URL，可多个），导入 docs/standards/（增量、同名不覆盖），CODING_STANDARDS.md 写成"索引 + 兜底基线"；没有则引入匹配语言的 starter；可两者都要或跳过。
  4. 生成/升级：按 §5.2 所有权表逐项执行。config.sh 预填探测结果，绝不覆盖；GLOSSARY.md 首建"流程术语与状态"章（项目术语不动）；AGENTS.md **最后收口**（不存在则连带创建；无标记文末追加；有标记只替换标记之间内容），智能体额外动作在此一并执行；git hooks 幂等重装，外来 hook 不覆盖只报告；docs/ 八个产物目录懒创建；源码与一切用户文件永不触碰。
  5. 自检与收尾报告：跑 `check.sh phase` 与 `frontier` 确认可执行；报告四段——做了什么（含覆盖/保留决策、识别到的智能体与仓库类型）/ 探测画像（语言、包清单、版本管理、包管理器、聚合命令）/ config 待补项（TRACKER_REPO、留空的检查命令、未完成的 MCP/凭据）/ 建议跑 /sdlc（未安装则说明）。出口形态 = 报告 + 指路，无下游自动串联。
- **注意**：实现时先检查 `~/.zcode/skills` 与 `~/.agents/skills` 的镜像关系，确认技能实际生效路径。

### 11.2 sdlc（总控）

- 只读调度，不写产物。默认模式：调 `check.sh phase` + `frontier`，按固定结构报告——**当前阶段**（need/spec/工单各处于什么状态）、**可做的事**（frontier 工单、等待用户决策的点）、**被挡在哪**（最近一处不满足的门禁：缺什么 + 指路哪个技能）、**循环状态**（逐 need 报轮次进度：当前 round 是否已验收、验收报告里残余风险几条、是否建议开下一轮）、**运行中 worktree**（v1.16：`git worktree list` 发现 `run/` 前缀分支，逐分支读票状态列出；无运行时一行空态或省略，零写入不变）。
- `next` 模式：自动推进到下一个决策点为止（§8）。路由表（盘上状态 → 下一个该调用的技能 → 停在哪）落技能 `references/next-mode.md`，按优先级匹配、命中即停；多张 ready 工单必须问询（带默认建议——同属一张 approved spec 时默认整 spec 编排调 dev-execute，选单票则按 dev-implement 规定由用户点名、总控不得代挑）；目标技能未安装 → 报告断链并指路（蓝图批次或按 METHOD.md 手动推进），禁止越权代劳其写入动作。
- **上下文 token 水位线**（`references/context-watermark.md`）：每次调用目标技能前评估会话上下文 token 用量占窗口的百分比——**绿 <30%** 正常推进；**黄 30%–50%** 只推进单阶段、出口不自动串联下一技能；**红 ≥50%** 停止推进，建议新开会话重跑 /sdlc 从盘上续接。拿不准按更高档执行；水位收窄的是推进距离，不是决策纪律。
- **RUP 阶段判读（v1.10）**：默认模式报告追加"项目阶段"一句，按 need 的轮次与验收状态对齐 RUP 四里程碑，锚点全部复用现有状态（零新增状态、零新增门禁，纯判读层）：**LCO** 生命周期目标 = need confirmed（"值得做"已拍板）→ **LCA** 生命周期架构 = round 1 验收通过（架构基线立住、最大风险消掉）→ **IOC** 初始运行能力 = 每一轮验收通过（可运行增量检查点）→ **PR** 产品发布 = need fulfilled（发布退出，循环收口）。配套**工作流强度表**（初始/细化/构造/交付四期 × clarify、spec+design、plan+implement、review+ship、accept 五组技能的 ●◐○ 强度）用于建议措辞：如构造期 design 默认跳过（除非冒出新 ADR 级决策）、clarify 不重开、重心在 implement/review。RUP 重量级仪式（SAD 文档、阶段评审门禁、九工作流映射技能）不接。
- description 写宽："当用户问'现在该做什么''下一步''项目进展'，或要求继续推进开发流程时使用"。

### 11.3 ref-writing / ref-testing / ref-implementation / ref-review

- 内容要点见 §7.1；每个 30–60 行，格式=内嵌范例 + 反例对照（好/差并列展示），比抽象规则更有约束力。
- frontmatter description 注明内部参考身份与被谁在何时加载（§7.3）。
- **ref-testing 两级结构（v1.4）**：SKILL.md（≤60 行）只留总标准、通则、六场景路由表、反模式表与自查口令；references/ 六文件（red-green / table-driven / integration / e2e / stress-capacity / chaos）各 30–60 行，统一骨架=首句声明加载时机 → 好用例标准 → 好/差对照 → 反模式 → 自查口令。进入具体测试场景前才 Read 对应文件，一次只载一个（按需加载先例：sdlc 的 next-mode.md、setup-workspace 的 references/ 声明）。

### 11.4 dev-spec

- **输入**：当前对话 + need（若存在；不存在时先建议跑 dev-clarify 或直接从对话综合，但须在 spec 里注明来源）。
- **流程**：探索代码库 → 用 GLOSSARY 词汇、尊重相关 ADR → 起草固定模板（§6.3）→ 与用户定分轮范围（读 need 的假设与风险表）→ `check.sh validate` 过 → 用户批准（决策点，须显式确认）→ status: approved → publish → 建议进 dev-plan。
- **门禁**：出口 = validate 通过 + 用户批准记录（approved 日期）。验收场景必须覆盖 need 全部 FR，集成级场景显式标记。
- 落盘前加载 ref-writing。

### 11.5 dev-plan

- **输入**：approved 的 spec。
- **规则**：拆 tracer-bullet 垂直切片（每片切穿全部层、可独立演示、大小适配单个新会话上下文）；给阻塞边；`[FR-N | 工单级]` 场景映射进工单验收标准，**拆不进单票的场景必须显式留给集成级清单**；宽泛机械重构（重命名/改共享符号类型）不硬塞切片，按 expand–contract 序列拆（先并存、分批迁移、最后收缩，每批保 CI 绿）。
- **决策点**：拆分粒度、阻塞边正确性，向用户展示编号清单确认。
- **出口**：每张工单 validate 通过（验收标准齐、依赖无环）→ publish → 提示 frontier。

### 11.6 dev-implement

规格即 §12 范文全文，按它实现，不再另写。

### 11.7 dev-review

- **双轴**：标准轴（CODING_STANDARDS.md + ref-review 的坏味道基线，repo 文档化标准优先、工具已强制的跳过）+ Spec 轴（对照 spec/工单：缺失、走样、超范围）。两轴可并行子代理执行，聚合时分轴报告不合并重排。
- **出口**：两轴阻断项均为零 → review status: approved → 自动准备 PR（进入 dev-ship 前半）；有阻断项：机械问题自动修复后重审，设计级问题问人（决策点）。
- **编排模式（v1.16，为 dev-execute 而设）**：调用入参显式指定工单编号与 diff 基线（运行分支）时，评审范围只取入参工单、出口止于"报告 approved"，**不自动调 dev-ship**——PR 由编排方在运行末统一准备；无编排入参时单票路径逐字不变。评审报告 `branch` 记票分支、`tickets` 记入参工单，pre-push 在运行分支按覆盖面机械校验。
- 评审前加载 ref-review + ref-implementation。

### 11.8 dev-ship

- 前半（由 dev-review 自动触发）：准备 PR，正文模板：`## Summary`（用伪代码/调用树/文件树/mermaid 选最小可表达视图）+ `## Evidence`（Before/After 证据，测试结果或截图）+ `## Merge Danger`（单向门/双向门 + 影响半径）。
- **决策点**：合并确认（单向门，必须问人）。
- 合并后：该 spec 全部工单 → done；全部 done → 自动调 dev-accept。
- spec 的 done 不归它管（归 dev-accept）。

### 11.9 dev-accept

- **触发**：spec 全部工单 done 后自动（dev-ship 链）或手动。
- **做什么**：在集成后的代码上逐条运行 spec 的集成级验收场景；逐 FR 核销；运行 `check.sh all`；写验收报告（§6.5：场景结果/假设验证/残余风险/下一轮建议）。
- **出口**：passed → spec → done；若为末轮且成功标准核销、无未接受风险 → need → fulfilled。rejected → 缺陷开 fix 工单（dev-fix）、范围问题进下一轮建议。
- **决策点**：开不开下一轮（带默认建议）。
- 落盘前加载 ref-writing。

### 11.10 dev-retro

- **触发**：用户手动（复盘、回顾、审计豁免请求）；无上游状态前置，不进自动串联链——复盘是反馈回路的终点。
- **输入**：复盘范围内的 git 历史（默认自上次复盘报告以来，无则自仓库首次提交）、评审报告"留档供 retro 参考"条目、验收报告残余风险与下一轮建议、用户口述主题。
- **审计规则**：[trivial] 提交逐条对 diff 判定，结论三态合规 / 滥用 / 存疑（基准 = GLOSSARY"限 typo 与纯文档改动"；滥用信号 = 正文无豁免理由、涉及非文档文件、规模明显超出小修）；subject 既无 `[#NNNN]` 又无 `[trivial]` 的提交 = `--no-verify` 嫌疑信号（§3 诚实边界的兜底审计）；审计结论必须引用 diff 证据，只凭 commit message 不下结论。
- **出口**：改动清单三分类——标准修订（CODING_STANDARDS.md / docs/standards/ 增量条目）、检查增补（蓝图 + assets/check.sh 双写）、技能修订（先蓝图规格节后技能文件）——经用户逐条采纳后落实；复盘报告落盘 `docs/retros/NNNN-slug.md`（frontmatter 仅 `id`/`status`/`created`，draft → done，不进 check.sh 门禁）。无下游自动串联。
- **决策点**：复盘范围（带默认建议）；采纳哪些（逐条带默认建议，沉默不算确认，不采纳的记录理由）。
- 落盘前加载 ref-writing。

### 11.11 dev-fix

- **触发**：dev-accept rejected 指路、门禁对 done 工单的拒绝文案指路、用户直接报缺陷（"这个 bug""修复一下""线上出问题"）。
- **定位**：分诊定级 + 开 fix 票 + 转入实现链；**不自带实现循环**——失败测试先行（复现）、红绿修复、全量回归全部复用 dev-implement 的既有纪律，终经其出口到达 dev-review。
- **流程**：确定归属 spec（approved 或 done 均可，check.sh ticket 已受理；无法归属任何 spec = 需求缺口，指路 dev-clarify / dev-spec）→ 分诊定级（阻断 / 重要 / 一般 / 轻微四档，操作定义写进票；轻微且纯文档走 [trivial] 不开票，源码缺陷一律开票）→ 处置决策（现在修 / 排期——票保持 ready 进 frontier / 不修——记录理由）→ 开 `type: fix` 票（做什么 = 期望 vs 实际 + 复现路径；验收标准 = 失败测试转绿 + `check.sh all` 全绿）→ validate 通过 + publish → 处置为现在修则**自动调 dev-implement**。
- **决策点**：定级与修复时机（带默认建议，沉默不算确认）。
- **重入**：盘上已有 `ready` 的 fix 票 = 分诊已完成，列出让用户点名续接（禁止代挑）；`in-progress` 的 fix 票属 dev-implement 的重入域，dev-fix 指路不抢。

### 11.12 dev-design

- **触发**：用户手动（技术设计、方案、架构决策请求）；不进自动串联链的必经路径——design 是可选产物。
- **输入**：approved 的 spec（重点实现决策、测试决策、验收场景）；docs/adr/ 既有 ADR（新决策不得与之无声冲突）。
- **值得做的判据（入口亮牌）**：ADR 三条件（难逆转、无上下文会困惑、真实权衡）命中任一，或模块划分 / 数据流非显而易见。都不命中 → 亮牌"这张 spec 没有设计级问题，直接 dev-plan 更省"，用户坚持才做。
- **做什么**：起草 design（§6.5 要点：模块划分 / 数据流 / seam 清单 / ADR 索引）→ 命中三条件的决策逐条落 ADR（背景 / 决策 / 后果，status: accepted；被取代的旧 ADR 置 superseded 并追加日期）→ 用户批准（决策点）→ design status: approved。
- **出口**：publish design + ADR → spec 名下无工单则建议进 dev-plan；已有工单 → 提醒实现遵守 seam 清单。管线门禁不含 design（§11.5 dev-plan 输入只有 spec），design 的约束力靠评审与实现纪律，不靠硬门禁。
- **门禁**：出口 = validate 通过 + 用户批准记录。validate 对 design / adr 只查 frontmatter 与状态，节同构靠模板内嵌保证（§6.6 ①）——与 adr 同款轻校验。
- 落盘前加载 ref-writing。

### 11.13 dev-clarify

- **触发**：用户手动（"我有个想法""帮我把需求理清楚""我想做 X"）；/sdlc next 路由（全库无产物，或存在 need draft）；下游指路（dev-fix 需求缺口、dev-accept/dev-retro 开新需求）。管线入口，无上游状态前置。
- **输入**：用户的想法（一句话到一份草稿皆可）；盘上既有 need/spec（防重复立项、校准粒度）、GLOSSARY 项目术语；代码现状（先查后问的素材）。
- **值得做亮牌（入口，可拒绝）**：想法一句话可复述、无歧义、无未知 → 亮牌"直接 /dev-spec 对话综合（spec 备注注明来源）或 [trivial] 小修更省"，用户坚持才建 need——need 是思考工具，不是流程税。一张 need 只装一个想法；多想法同来各自立张、独立归置。
- **方法论亮牌（决策点①）**：按 §9 信号选主方法（可组合），开场亮牌"我建议用 X，因为 Y"，用户可否决、可中途换；确认后才 Read 该方法 references/ 文件，一次一个。方法决定怎么聊，模板（§6.2）决定落成什么样。
- **流程**：亮牌 → 装载上下文 → 按校准阶梯分层采集（业务→用户→系统，每批 3–5 问，答案随聊随落盘，上一层答案决定下一层问什么）→ 三路归置 → 定稿。
- **校准阶梯（普适纪律，横穿五法）**：开放问题按序处置，能停就停——① **查证**（代码/文档/网上一搜就有 → 自己查变事实，不问人）；② **陈述句确认**（查到了但涉意图 → 写成陈述句让用户纠错）；③ **决策卡**（要在 ≥2 个具体选项间选择 → 卡上拍板）；④ **可点 HTML 原型**（选项说不清，尤其 UI/UX → 做样品看着拍）；⑤ **转假设**（谁也定不了 → 四象限定级，round 1 最小实验裁决）。每往下一级都是"逼用户凭空想象"的成本在上升，能用上面就不用下面。
- **查证过滤闸**：转假设前必过——"5 分钟能不能查证？"能 → 查完变事实（进 FR/范围），禁止躺在假设表里；不能 → 才准转假设，并标注为什么查不了（外部依赖/要花钱/要等人）。假设表里只剩真未知。
- **决策卡（呈现层，不落盘为独立产物）**：要在 ≥2 个具体选项间选择、且查证解决不了的才升格；每 need ≤5 张，超了亮牌建议收窄范围。固定要素：**来源**（哪条 FR/场景/用户原话逼出）、**堵着什么**（不决策堵住哪些 FR）、**2–3 个具体选项**（各带"长什么样"一行 + ✅/❌ 各一条具体表现）、**选错的代价**（写可感知工作量如"半天 vs 迁移第三方插件"，不评高/低）、**来得及改到什么时候**、**默认建议**（理由必须引用用户自己的场景或原话）、**合法出口"说不清 → 转假设"**。呈现原则：**概念归 AI，图例归用户**——分类/溯源/算代价是技能的活，用户只看具体选项与图；溯源链纵向一条线（原话→场景→FR→决策）。反概念化清单（禁问法）："请权衡可逆性与影响半径"、"要考虑扩展性"、"按代价×不确定度排序"（应代之以具体代价对比、第 N 个用户出现时的差异、四象限图）。
- **可点 HTML 原型（阶梯④，细则 references/prototype.md）**：单文件 HTML（CSS/JS 全内联、零外部依赖、≤200 行），落系统临时目录不进仓库（环境支持内嵌预览则内嵌），给路径 + 打开命令；**三态必须切换可看**（正常/空/错误，各一个切换钮）、主流程可点通、异常流有入口；两方案对比 → 同文件双 tab 或并排；样品里每个写不出来的格子 = 一个待决策点，逐个升格决策卡——样品本身就是提问。纪律：样式花在状态可见性不花装饰（用户评配色 → 亮牌"视觉细节不在澄清范围"）；vanilla JS 最笨实现防偷跑成实现；用完即弃，拍板后交互走查转写进场景节（Given/When/Then）。媒介一行选：有界面 → HTML 原型（默认）；纯 CLI → 输出样例；API → 调用序列。ASCII 线框为兜底。
- **三路归置（"清零"的操作定义，§6.2 出口门禁；check.sh 零改动）**：每条开放问题必须有归属——① 有答案 → 写进正文对应节；② 答不了但可先假设 → 过查证过滤闸后转「假设与风险」，按"错了代价 × 不确定度"排序（四象限：高代价高不确定 = round 1 靶心；低代价高不确定 = 直接假设；高代价低不确定 = 先查证消掉；低代价低不确定 = 随手拍板）；③ 明确不做 → 「范围与非目标」。节内允许留**拍板记录**（实盘 need 0001 先例）：一行一条 `D2 → 结论（一句理由；去向 FR-N/假设 An/非目标）`；**"转调研"不许悬置**——要调研的变 FR（调研报告是交付物，need 0001 先例）或转假设，否则 need 未到可 confirmed 的诚实状态。
- **决策点②**：need 定稿——完整念一遍七节请求确认，沉默不算确认；通过 → `status: confirmed` + `confirmed: <今日>`。
- **出口门禁**：validate 通过 → publish → 提交留痕 `[trivial]` → 抛决策问题（§8 形态 2）："need NNNN 已 confirmed，建议 /dev-spec 开 round 1，范围可从假设与风险表中代价最高的圈起"——分轮归 dev-spec，只指路不代定。
- **重入**：盘上已有 draft need = 澄清进行中，列出候选（编号、标题、开放问题几条）请用户点名续接，禁止代挑、禁止新建；confirmed 的 need 不回 draft——用户明确要求补充时更新内容保持 confirmed，方向大变立新 need。
- **中断**：任何停下前，已确认的答案写回各节、未归置的留在开放问题，以 `status: draft` 落盘再停。状态在盘上，不在对话里。
- **产物边界（经典产物映射注记）**：SRS/PRD 即 spec（每轮一张），need ≈ Vision/立项（稳定意图、贯穿多轮）——反 BRUF 是有意设计。用例模型/数据流图/分析模型/数据字典的"实"已分别被 need 干系人与场景节、design 数据流节、spec 实现决策节内嵌（schema/状态机可内嵌并注明来源）、GLOSSARY 吸收，**不立 docs/analyses/ 类独立产物**——产物必须有下游消费者，无消费者的图文档会腐烂成第二真相源；复杂分析进 design/spec 正文（mermaid 内嵌），模板固定骨架不固定深度。唯一独立留痕的分析级产物是 ADR（有真实消费者：design 冲突检查/dev-review/retro）。副产品：新术语当场登记 GLOSSARY 项目术语章。
- **references/ 五文件**（各 30–60 行，统一骨架 = 首句声明加载时机 → 核心动作/问题清单 → 好/坏对照 → 落盘映射（聊出的东西进 need 哪节）→ 自查口令）：`viewpoint.md`（视点分析：三层下钻问题清单，含成功标准可验证化、Actor 全列出）；`use-case.md`（用例驱动：RUP 用例骨架 Actor→前置→主成功场景→扩展/异常流→后置，五部件各喂 need 一节，异常流 = 决策卡原材料）；`risk-mvp.md`（风险驱动：模糊陈述→可证伪假设操作法 + 代价×不确定度四象限，每格一句动作指令，round 1 靶心从图读出）；`prototype.md`（原型驱动：可点 HTML 原型操作法——触发信号、单文件骨架、三态切换、双方案对比、防跑偏三条、视觉出界话术、媒介选择）；`research.md`（调研驱动：内联查证/系统调研/事实核验三层分工——研究问题三要素（答什么/为什么重要/影响哪个 FR 或假设），dev-research 未安装时如实相告、轻量内联查证标注"未做系统调研"、只信一手来源带引用与检索日期）。
- **禁止事项**：替用户拍板；发明需求（FR 必须指得回用户原话或拍板记录，模型补写一律标"假设"）；跳过方法论亮牌，或把"说不清"悬置不归置；need 里写实现方案；样品进仓库、接真数据，或陪用户聊视觉细节；未经定稿置 confirmed。

### 11.14 dev-research

- **触发**：用户手动（"调研 X""X 和 Y 怎么选""查某平台支不支持 Z"）；dev-clarify 调研驱动联动（need 开放问题按三要素记的研究问题）。脊柱上有位置（§4.1）但**不进自动串联链**——sdlc next-mode 路由表不加行，调研是按需服务不是必经门禁。
- **输入**：研究问题，三要素格式最佳（答什么 / 为什么重要（堵着哪个决策）/ 影响哪个 FR 或假设）；模糊请求先规整成问题清单，要素缺口问用户补齐，禁止脑补研究目标。一报告一主题，不相干的问题各立各的。
- **值得做亮牌（入口，可拒绝）**：问题单来源、5 分钟能查证 → 亮牌"这是内联查证不是系统调研"（§9 调研驱动三层分工），用户坚持才立项——报告是思考工具，不是流程税。
- **决策点（开工前必问）**：问题清单确认——完整念一遍编号 + 三要素，请求确认，沉默不算确认。调研最大的浪费是答非所问。
- **调研纪律**：① **后台代理并行**——每个研究问题派一个后台子代理检索，主会话不被长检索阻塞；无后台代理能力则前台顺序执行并告知。② **只信一手来源**（官方文档、官方 API 参考、代码本身、标准 RFC）；二手内容（博客/教程/AI 生成）只能作线索，结论须回溯一手，找不到一手如实标注"未找到一手来源，以下为二手线索"。③ **每条结论带引用与检索日期**，无引用不进报告。④ **事实与判断分离**——有出处的标事实，推断的标"判断"并写依据。⑤ **防编造**——支撑关键决策（影响 FR/决策卡）的子代理结论逐条回原文核验，一般结论抽验，对不上原文的删掉重查；禁止训练记忆冒充检索结果（凭记忆要么本次检索验证、要么明确标注"未经本次检索验证"）；检索工具不可用 → 停手如实相告。⑥ **快照意识**——报告只对检索当日负责，时效敏感的结论注明"实现时请复核"。
- **产物**：`docs/research/NNNN-slug.md`，frontmatter 仅 `id`/`created`（§6.1 无状态、纯参考资料）；模板内嵌 SKILL.md（调研问题与用途 / 结论速览 / 分主体小节带来源 / 对本项目的映射要点 / 来源清单；格式先例 docs/research/0001）。validate 走 research 轻校验（无 status、无必填节），节同构靠模板内嵌保证。报告是落盘时点的快照：过期 = 重新调研出新报告，**不原地改写旧报告**。
- **出口**：念结论速览 → 抛决策问题指路——结论作 dev-spec 实现决策依据、方向取舍回 dev-clarify 决策卡、否掉的方案进「范围与非目标」；无自动串联、不代拍板。落盘前加载 ref-writing；出口三件套 = validate + publish + 提交留痕 `[trivial]`。
- **重入/中断**：无盘上中间态——问题确认前被打断直接重开（对话态成本低）；确认后被打断重跑检索（幂等）；未落盘即未发生。
- **禁止事项**：无来源下结论；训练记忆冒充检索；替用户拍板选型；报告里写实现方案；改动 need/spec 等其他产物；原地改写过期报告。

### 11.15 dev-release

- **触发**：用户手动（"发版""打个 tag""更新 CHANGELOG""升个版本号""release 一下"）；脊柱上有位置（§4.1 交付 ship / release）但**不进自动串联链**——sdlc next-mode 路由表不加行，发布时机是人的决策不是必经门禁；dev-ship 合并收尾后不自动调它（其决策点②文案只让渡："发布点 tag 的语义化版本与 CHANGELOG 归 dev-release"）。
- **定位**：把**一段已合入主干的历史**变成**一个有版本号、有 CHANGELOG 条目、过了检查单与部署验证的发布**。输入不是单张工单而是发布区间：上个版本 tag（无 tag 则自首次提交）到 HEAD。
- **重入判定先行**：CHANGELOG.md 存在且顶部最新版本节无对应 git tag → 发布做了一半，从检查单对应断点续接（§5 中断交接）；顶部版本节已有 tag 且已推送 → 报告"v<版本> 已发布"，无可续接。
- **入口门禁（全部通过才继续）**：① 当前分支 = config.sh 的 BASE_REF，工作树干净（`git status --porcelain` 为空），与远端同步（ahead/behind 均为零）——发布只从主干打，不同步说明有未落网的内容；② 发布区间非空——`git log <last-tag>..HEAD` 无提交 → 停止"无可发布内容"，不空发版本。区间内有 ready/in-progress 工单 → 如实列出（它们在分支上，不影响主干发布），用户裁决继续与否，不硬拦。
- **装载上下文**：config.sh（BASE_REF、TRACKER）→ `git log --oneline <last-tag>..HEAD` 与 diff 摘要 → 区间内 done 工单及其 spec（变更分类的盘上依据）→ 既有 CHANGELOG.md（沿用其格式；不存在则本次懒创建）。CHANGELOG 条目落盘前用 Skill 工具装载 ref-writing。
- **决策点① 版本号确认（开工前必问）**：按语义化版本给映射建议——破坏性变更（接口/schema/行为不兼容，依据 spec 实现决策或提交明示）→ major（0.x 期按 semver 惯例 → minor）；新用户可见能力（新 FR）→ minor；缺陷修复 → patch。完整念一遍区间变更清单（逐条带工单/spec/提交来源）+ 建议版本号 + 理由，请求确认。沉默不算确认。
- **发布检查单（顺序执行，逐项留证）**：
  1. `.sdlc/check.sh all` 全绿。仓库没定义任何检查命令 → 这本身就是发现：如实报告，不静默跳过。
  2. CHANGELOG.md 懒创建骨架 + 新版本条目：Keep a Changelog 分类（Added / Changed / Deprecated / Removed / Fixed / Security），无变化的分类不写；**每条指得回工单/spec/提交**。项目清单带版本字段（package.json / pyproject 等）→ 一并同步。
  3. 发布记账提交：`[trivial]` 并写明豁免理由（版本记账，无逻辑变更）——同 dev-ship §4.3 逻辑：这是发布状态落盘，不是绕门禁（dev-retro 可审计）。
  4. **决策点② tag 与推送（单向门，必须问人）**：建 annotated tag `v<版本>`（message = 本版一句话摘要）并推送（BASE_REF 与 tag 一起推）。TRACKER=github 且 gh 可用 → 附带问是否 `gh release create`（正文取 CHANGELOG 该版本节）。**用户显式确认才执行；沉默或"都行"不算确认。**
  5. **部署验证**：问清部署方式与验证判据（一条可判定的检查，如冒烟命令/健康检查）；有部署 → 部署后按判据验证并报告结果；库类产物（无部署面）→ 记"不适用"；验证执行不了 → 如实报告，不装绿。结果只在会话中报告，不回写 CHANGELOG。
- **出口**：报告四件——版本号、tag、CHANGELOG 位置、部署验证结果——然后指路："要沉淀这一周期，/dev-retro。"无自动串联、不代拍板。
- **中断交接**：状态在盘上——CHANGELOG 新版本节已写未提交 / 已提交未打 tag / 已打 tag 未推送 / 未部署验证，四处断点各自可续接；tag 已推送即发布完成，不可回撤。
- **禁止事项**：未经用户显式确认打 tag 或推送；检查有红灯仍发布；CHANGELOG 条目编造（每条必须指得回提交/工单/spec）；替用户定版本号；顺手修缺陷或动源码（回 dev-fix 开票）；改写已发布版本的条目（已发布不可变，纠错走下一个版本）。

### 11.16 dev-docs

- **触发**：用户手动（"更新 README""补个使用文档""API 文档过时了""文档跟代码对不上，改一下"）；脊柱上有位置（§4.1 反馈沉淀 fix / retro / docs）但**不进自动串联链**——sdlc next-mode 路由表不加行，文档维护是按需服务不是必经门禁（dev-research / dev-release 同款定位）；没有任何技能自动调它，ref-writing 的转介指向（"写文档转 dev-docs"）是其入口来源之一。
- **定位**：让**面向人的文档**（README、用户文档、API 文档等给人读的文档，术语见 GLOSSARY）与**仓库实际行为**一致——与实际行为一致性优先，文档说一不二的前提是代码确实这么干。维护对象不含流程产物（need/spec/design/ticket/review/acceptance/research/retro/adr 归各自技能）与 METHOD.md（归 setup）、CHANGELOG（归 dev-release）、源码内注释与 docstring（属源码文件，改动走工单、受 L4 规则 B 管）。
- **重入判定先行**：git status 已有本任务的未提交文档改动 → 上轮做了一半，列出改动文件问用户"续接还是放弃"，续接则从对应文档继续；无关改动如实列出，不属于本任务的不碰。
- **入口门禁（全部通过才继续）**：① 请求命中的文件属于面向人的文档——流程产物请求拒绝并指路对应技能（"写需求转 dev-clarify / dev-spec"）；② 变更范围可枚举——说不出要改哪些文件就不动笔，先去读仓库把范围找出来。
- **决策点① 变更清单确认（动笔前必问）**：完整念一遍——改哪些文件、每处改什么、依据是什么（哪条命令实测 / 哪个实现文件 / 哪个测试），请求确认。沉默不算确认。
- **一致性纪律（先核验后落笔）**：① **行为断言逐条核验**——写进文档的每条命令、参数、输出、路径、限制，按三档核验并留档：实跑（跑了，结果如何）/ 读实现（哪个文件哪段）/ 测试为证（哪个测试名）；三档都够不着 → 不写"应该如此"，如实标注"未核验"交用户裁决写不写。② **文档与实现冲突** → 以实际行为为准改文档是默认建议，但改哪边必须问人：用户认定代码错了 → 不改文档，转 dev-fix 开票，修完再回头对齐——文档不将就错误行为，代码不因文档将就。③ **术语一律来自 GLOSSARY**，首次出现给定义；自造词先登记再使用。④ 例子优先、命令写到可复制执行（ref-writing 通则全适用）。
- **落盘前用 Skill 工具装载 ref-writing**（§7.2）。
- **出口（指路，不自动串联）**：报告三件——改了哪些文档、每处的核验方式与结果、未核验项清单 → 提交留痕：纯文档改动 `[trivial]` 并写明豁免理由，或在办工单同批交付时挂 `[#NNNN]`；提交只 add 本任务改动的文件。然后指路：行为有缺陷 dev-fix、版本要发布 dev-release、要沉淀 dev-retro。
- **中断交接**：状态在盘上——已改未提交的文档就是断点（git status 可见），重入判定先行即指此；未落笔的意图不构成状态。
- **禁止事项**：无核验写行为断言（"应该""通常"式措辞）；冲突时默默选边（改文档还是改代码必须问人）；改流程产物、METHOD.md、CHANGELOG、源码文件；顺手修代码——回 dev-fix 开票；替 dev-release 写 CHANGELOG。

### 11.17 dev-execute

- **触发**：sdlc next 路由（frontier 多张可开工票同属一张 approved spec，问询默认编排）或用户手动（"把 spec NNNN 整个跑完""编排执行这张 spec"）。脊柱上有位置（§4.1 实现层），**进** next-mode 路由表（与 dev-research / dev-release 的按需服务定位相反：多票编排是多票场景的默认干道）。
- **定位**：把"实现整个 spec"收缩为恰两次人交互（开工确认 + 合并确认）。输入点名 approved spec，构建运行依赖顺序图（blocked-by 拓扑分层，会话内视图不落盘，check.sh 零改动），在运行分支 + 运行 worktree 中按依赖序推进：同层无依赖票每票独立 worktree 经子代理并行实现（dev-implement 纪律原文复用零改动，并行度默认上限 4、调用参数可覆盖）→ 逐票 dev-review 编排模式（§11.7）评审 → approved 票按依赖序机械合回（不设人工门）+ 每次合回后预演（`check.sh all` + 已有自动化承载的集成级测试，V 模型右臂上行）→ 全绿一次 PR（dev-ship 前半三节模板）+ pre-push → 合并确认（单向门，方式与是否 tag 一次问清）→ 全部票 done（[trivial] 状态提交，dev-ship 同款语义）→ 清理全部运行/票 worktree → 出口报告指路手动 /dev-accept，不自动串联。
- **状态与续接**：零新产物——票状态机 + 各 worktree 分支即运行状态；worktree 置仓库同级约定目录（checkout 不入版本库，git 元数据自管理），分支命名：运行分支 `run/<spec-id>`、票分支 `run/<spec-id>-t<ticket-id>`（v1.17 round 2 修订：git ref 名空间同段互斥——`run/0006` 存在时不能建 `run/0006/*`（D/F 冲突），票分支用扁平 `-t` 后缀与运行分支共存），供 `git worktree list` 机械发现；中断续接从 `git worktree list` + 票 frontmatter 与 ## Progress 推导（frontmatter 以运行/票 worktree 为准，主工作区在运行合回主干前是旧态）。多会话可各跑各的 spec（worktree 隔离互不阻塞）；后合并者冲突停在合并门问人。
- **异常流（一律停下问人，报告连坐阻塞面与指路）**：评审设计级阻断（机械问题仍自动修自动重审）；spec 缺口 → 指路 /dev-spec（门禁回路）；预演失败 → 指路 /dev-fix 开 fix 票、票并入图重算后续跑；合回冲突 → 问人怎么解，可指路 expand–contract 拆票回 /dev-plan。不自动重试、不自动解冲突。
- **决策点**：开工确认（依赖序图展示后）；合并确认（单向门）；异常流处置。
- **边界**：编排不拆票（拆分归 dev-plan）；一次运行只处理点名 spec 名下的票，fix 票插入也只重算本 spec 的图；术语"运行 / 运行依赖顺序图"见 GLOSSARY 项目术语章。

### 11.18 setup-reconstruct

- **触发**：用户手动（"把这个存量项目扫一遍接入""逆向出这个仓库的业务规则和架构""代码大改了，重扫对齐一下"）。归 setup-\* 家族，按需服务定位同 dev-docs / dev-research / dev-release：**不进自动串联链**——sdlc next-mode 路由表不加行，没有任何技能自动调它，扫描与重扫一律用户手动触发。
- **定位**：存量项目知识逆向扫描——对存量 git 仓库分轮只读读码，逆向推断并产出本套件知识档形态的沉淀物（术语「逆向产物」见 GLOSSARY 项目术语章），让后续会话只读沉淀物即可接续开发，不重复支付"理解这个项目"的全量扫描代价。技能由主文档与按需加载的参考文档构成（两级结构先例 ref-testing / dev-clarify）：主文档管入口门禁、流程骨架与禁止事项；参考文档承载逆向扫描协议（分轮切分、证据采集与置信标注）、产物模板与证据格式、增量对齐协议。可在任意 git 仓库运行，**不要求 check.sh 已存在**——入口前置只查 git 仓库与技能自身文件完整。
- **逆向产物五路落点（形态与既有模板同构，靠形态兼容换 check.sh 零扩展）**：① 逆向 need 落目标仓库 docs/needs/，编号接目录内最大号 +1（空目录从 0001 起），need 模板七节齐备，「开放问题」节收扫描推断不了、须仓库主人补答的问题——落盘即 status: **reconstructed**；② 逆向 spec 落 docs/specs/，spec 模板八节齐备，need 字段指向对应逆向 need（孤儿 FR 校验照常生效，迫使行为断言覆盖全部逆向业务规则），验收场景 [FR-N] 标签语义复用为"单模块内可对照证据核验 / 跨模块协作行为"——落盘即 status: **reconstructed**；③ 逆向 ADR 落 docs/adr/，status: accepted（描述的是当前在生效的决策，adr 状态机 accepted / superseded 零扩展）；④ 折叠内容三载体：AGENTS.md 哨兵块外追加项目速览段（架构一句话、入口位置、各沉淀物索引），GLOSSARY 项目术语章按既有格式追加领域术语，docs/standards/ 落逆向编码标准文件并在 CODING_STANDARDS.md 索引登记；⑤ 每张逆向产物带「扫描基线」节（术语「扫描基线」见 GLOSSARY）：commit SHA、扫描日期、已覆盖范围、未覆盖范围，附一句声明"未覆盖区不得读成不存在"。已接入仓库的同名标准文件与同名术语**不覆盖**，报告冲突交用户处置（setup-workspace 同名不覆盖先例）。
- **证据与置信纪律**：每条行为断言句末带统一格式的证据引用（相对路径:行号），多处证据并列可写；**证据格式全文统一可 grep**，为增量对齐的漂移定位提供机械抓手。查无证据的推断不得写成断言——三选一：补扫取证；显式标低置信 + 一句理由 + 补证路径；移入「开放问题」。
- **确认前置（不确认不落盘）**：扫描全程只读，产物先以草案呈报——逐张列产物要点、关键断言、证据抽样、低置信清单、未覆盖区——**用户显式确认后才写入**，沉默不算确认。
- **落盘两路**：无 check.sh 的仓库先按 setup-workspace 全流程执行接入（含其决策点），随后写入逆向产物，一次会话从白纸到可用；已接入仓库仅写入逆向产物，不重跑接入。技能本身不做 git 提交，落盘后报告提示仓库主人自行提交（纯文档改动适用 [trivial] 豁免，同 setup-workspace 家族先例）。
- **增量对齐（重跑语义）**：先读逆向产物的扫描基线 commit，取基线 commit → HEAD 的变更文件集；按证据引用把存量断言分为涉漂移 / 未涉漂移两组，**只重验涉漂移断言**（证据失效则重取证，或与用户确认后标过时），新增文件产出增量断言草案；全部更新走同一确认门后合并写入，不推倒未漂移部分；完成后逐张更新扫描基线为新 commit。基线缺失（如手写产物）回落全量扫描。
- **分轮协议**：切分依据 = 顶层模块边界（monorepo 按子项目，单仓按目录子树或分层），入口优先——构建入口、路由注册、schema 定义先扫，被引用多的模块次之；每轮以"可独立确认的一组沉淀物"为界收口一次确认；轮末更新基线的覆盖与未覆盖清单；用户可对未覆盖区发起补扫，补扫 = 带范围参数的重跑，在增量对齐协议下只动该范围。
- **check.sh 状态机表扩展（唯一机械改动）**：状态机表 need 行与 spec 行各追加 `reconstructed` 一个合法值——reconstructed 不进 frontier 与待办语义，phase 原样显示，done 残留门禁不触发，孤儿 FR 校验对逆向 spec 照常生效；validate 只查必填节不排新增节，扫描基线节零改动兼容。改动落在活本，与 setup-workspace 生成资产整文件复制同步。
- **边界（正向 / 逆向双轨互不污染）**：正向开发在已逆向仓库上照常开新 need/spec，dev-accept 蒸馏只折回正向产物，**蒸馏永不触碰 reconstructed 产物**；逆向产物时效由扫描基线显性化（对应哪个 commit、多旧），不做自动漂移检测与定时重扫。
- **出口（指路，不自动串联）**：报告三件——落盘产物清单、未覆盖区清单、提交提示；后续：知识过时再手动重扫（增量对齐），接入问题回 setup-workspace，正向开发走 /dev-clarify。
- **禁止事项**：未获用户显式确认即落盘（含任何"顺手写入"）；把查无证据的推断写成断言；扫描阶段改动目标仓库任何文件；覆盖既有同名标准文件与同名术语；替代仓库主人做 git 提交；自动触发重扫或定时漂移检测；进 sdlc next-mode 路由表。

## 12. dev-implement 范文（文风与浓度基准，全文照此实现）

````markdown
---
name: dev-implement
description: 按 docs/tickets/ 中的工单实现功能。入口校验工单状态、依赖与规格批准情况，不满足即拒绝并指路；实现遵守垂直切片与红绿测试纪律；出口跑全量检查、逐条勾验收标准并自动转入 dev-review。当用户要求实现功能、写代码、继续开发时使用——无工单的请求会在入口被拒绝并引导至 dev-spec。
---

# dev-implement：按工单实现

你只做一件事：把**一张已就绪的工单**变成**通过全量检查的实现**。
其余一切（无工单的编码请求、spec 未批准、依赖未完成）一律拒绝。
拒绝不是失礼，是本技能的职责。

## 0. 前置：工作区校验

- 仓库根目录必须存在 `.sdlc/check.sh`（由 /setup-workspace 生成）。
- 不存在 → 停止，告诉用户"本仓库未接入开发流程，先运行 /setup-workspace"，
  不要在未接入的仓库里直接开始编码。

## 1. 入口门禁（全部通过才继续）

1. **确定工单**。用户给了工单号或路径 → 用它；没给 → 运行
   `.sdlc/check.sh frontier`，列出"阻塞已全部完成、可以开工"的工单供用户选择。
   禁止猜测或自行挑一张没被点名的工单。
2. 运行 `.sdlc/check.sh ticket <NNNN>`，它校验并输出：
   - 工单存在且 `status: ready`（或 `in-progress` 重入，见 §5）
   - Blocked by 的所有工单 `status: implemented 或 done`
   - 关联 spec 存在且 `status: approved`
3. 任一不满足 → **停止**，转述缺什么、下一步该跑哪个技能
   （例如"spec 0003 还是 draft，先 /dev-spec 完成批准"），不写任何代码。

全部通过后：立即把工单 frontmatter 的 `status` 改为 `in-progress`。

## 2. 装载上下文

按顺序读：工单全文 → 关联 spec 的对应章节 → docs/adr/ 中与改动区域相关的
ADR → GLOSSARY.md → CODING_STANDARDS.md。
再用 Skill 工具装载三个参考：ref-implementation、ref-testing、ref-git-commit；
写测试前重读 ref-testing，写哪类测试再按其场景路由表读取对应细则，一次只载一个。

然后用三五句话向用户复述：这张工单交付什么、验收标准是哪几条、打算动哪些模块。
有偏差，用户此刻纠正的成本最低。

## 3. 实现纪律

- **垂直推进**：一次只做一个验收标准，从测试到实现端到端打通
  （数据、接口、UI、测试同步动），不做"先把模型全写完再写接口"的横向分层。
- **红绿循环**：每个行为先写一个失败的测试，再写刚好让它通过的实现。
  测试只写在 spec 预定的接口边界（seam）上，只断言外部行为。
  - 禁止：mock 内部协作者、测私有方法、断言值用与实现相同的逻辑算出。
  - 禁止：为让测试变绿而删测试、改弱断言、加条件跳过。
- **边界**：只做工单内的事。发现 spec 有错或缺口 → 停在该点上报告，
  建议回 /dev-spec 修订（这是回路，不是失败）；需要大范围 prefactor →
  停下来建议拆新工单。顺手重构无关代码是 review 的必抓项。
- **提交节奏**：每完成一个验收标准或一次绿循环即可提交，message 一律带
  [#NNNN]，一次提交只做一件事。
- **频繁检查**：每轮跑当次测试文件，阶段性跑 lint/typecheck，
  全量检查留到出口。

## 4. 出口门禁（全部通过才算完）

1. 运行 `.sdlc/check.sh all`（全量 lint / typecheck / test，包装仓库自己的
   检查命令），必须全绿。仓库没有定义任何检查命令 → 这本身就是发现：报告
   用户并建议接入，不要静默跳过。
2. 逐条核对工单的验收标准 checkbox。每勾一条都必须说得出证据（哪个测试、
   什么输出）；说不出证据的不许勾。
3. 工单 frontmatter `status` 改为 `implemented`，在工单 `## Progress` 节
   追加三行以内的摘要：做了什么、留了什么尾巴、评审时值得注意什么。
4. 有未提交内容 → 提交（带 [#NNNN]）。
5. **立即用 Skill 工具调用 dev-review**。评审是必经门，不是可选步骤，
   不要问用户"要不要评审"。

## 5. 中断与交接

会话可能在任何时刻结束。凡是停下（用户喊停、上下文将尽、被卡住）：
先把当前进展写进工单的 `## Progress`（做到哪一步、下一个动作、卡在哪），
保持 `status: in-progress`，再停。状态在盘上，不在对话里。

## 禁止事项（任何时候）

- 无工单时创建或修改 src/ ——引导走 /dev-spec → /dev-plan。
- 使用 --no-verify，或以任何方式绕过 .sdlc/check.sh 提交。
- 删测试、改弱断言、跳过失败的检查来"完成"工单。
- 实现验收标准之外的功能。
````

**范文体现的写法要求（所有技能照此）**：开头一句定性职责并预告拒绝行为；门禁步骤可执行且拒绝路径写得和 happy path 一样认真；纪律用操作性规则不用口号；每个出口动作明确（自动调用/问人/拦停指路三选一）；全文 70 行左右——技能全文每次进上下文，长篇教科书是每个会话的税。description 是第一道网：写得宽，让直连请求（"帮我写代码"）也能命中，然后在入口被拦下指路。

## 13. 实现规范与验收清单

### 13.1 文件与格式

- 安装位置：`~/.zcode/skills/<技能名>/SKILL.md`；frontmatter 只有 `name` 与 `description`（不设 disable-model-invocation，流程技能要可被模型自动调用）。
- slug 英文、内容中文；description 中文，写得宽（承接直连请求），并说明拒绝/衔接行为；参考技能按 §7.3 注明内部身份。
- 附件分两类放同目录：`assets/`（逐字拷贝进目标仓库的模板，如 check.sh、METHOD.md、GLOSSARY.md、trackers、standards）与 `references/`（执行者按需加载的操作参考，不进目标仓库，如 scan-signals、decisions、generation、agent-adapters）。SKILL.md 只留控制流：进入阶段前才 Read 对应 reference，一次一个。

### 13.2 每个技能建完的自测清单

1. **触发测试**：用 3 句典型用户话术（含一句"没走流程"的直连请求）验证 description 能命中。
2. **门禁拒绝路径**：造一个不满足条件的环境（如无 spec、spec 未批准），确认技能拒绝、说清缺什么、指路正确——拒绝路径是这套技能的灵魂，必须测。
3. **重入测试**：中断后（Progress 已写）重新调用，能从盘上状态续接。
4. **产物校验**：产出/修改的文件过 `check.sh validate`。
5. **衔接测试**：出口三形态（自动调用/决策问题/拦停）按 §8 契约正确执行。

### 13.3 治理

- 本文档是唯一真相源：实现中发现设计缺陷，先改文档再改技能；技能文件头部不写"来源/变更说明"类注释。
- 每建完一个技能，在本文档 §10.2 对应条目后标注完成日期。
- METHOD.md 由 setup-workspace 从本蓝图 §2–§6 生成，二者规则部分保持一致。

## 14. 待定与未来扩展

- tracker 适配器（github/gitlab/codeup）已随批 3 落地（2026-10-27）：github/gitlab 走官方 CLI（gh/glab）投到平台 issue，codeup 走 OpenAPI 直连（个人访问令牌 `x-yunxiao-token`）投到 Projex 工作项；CreateWorkitemV2 与 CreateWorkitemComment 端点已于 2026-10-27 对照官方文档核验（`POST /organization/{organizationId}/workitem`、`POST /organization/{organizationId}/workitems/comment`），工作项类型列表端点未能在官方文档核验，类型标识由配置项显式提供、不做运行时探测。tracker 扩展只需新增 `.sdlc/trackers/xxx.sh` + config 枚举，流程技能零改动；平台模型参考 docs/research/0001（2026-10-27 快照，实现时已复核）。
- L4 PreToolUse hook 已随批 3 落地（2026-10-28，need 0003 / spec 0005）：判定脚本 `.sdlc/hooks/l4-guard.sh` 自包含（自带 frontmatter 解析，读 config.sh），规则 A = Bash 命令含 `--no-verify` 字面量或 `git commit -n` 短形式 → deny；规则 B = Edit/Write 的 `file_path` 归一化后落在 CODE_DIRS 某目录下且 docs/tickets/ 无 `in-progress` 工单 → deny 并指路 /dev-implement。deny 经 stdout JSON `{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":…}`（ZCode 严格 schema，extra key 即废）回平台，stderr 同步一行供日志；其余一切（含 stdin 异常、非 sdlc 工作区、配置缺失）exit 0 放行——失效安全为 fail-open。载体接线：`.zcode/config.json` 顶层 `hooks` 块，单 matcher `Bash|Edit|Write`，`type: "process"` 经 bash 调 guard（可执行位无关、无 shell 引号陷阱），`${ZCODE_PROJECT_DIR}` 定位仓库。已知边界（如实不装绿）：规则 A 的 `--no-verify` 为子串匹配，讨论性命令会误拦（安全方向误报，理由文本引导改写）；经 Bash 间接改源码（sed -i 等）不在规则 B 作用域，靠 L1/L3 兜底；ZCode hooks 配置是否热加载未核验，改动后建议重开会话验证（集成级场景）。Claude Code 的 PreToolUse 与此同构（snake_case stdin + exit 语义），脚本保持载体无关，settings.json 接线留未来扩展。
- 团队规范 starter（TS / Python / Go / Java）定稿于 skills/setup-workspace/assets/standards/（2026-10-26，随 setup-workspace 实现定稿）。
- monorepo 按包门禁（逐包 check、逐包编号）批 1 不做：基础设施全库一份（.sdlc/ 与 docs/ 在根、产物编号全库唯一），setup 只做逐包扫描与聚合检查命令预填；按包门禁未来按需扩展。
- 智能体接入参考（setup-workspace 的 references/agent-adapters/）首批仅 zcode 与 claude-code；未识别的智能体走通用流程（AGENTS.md 为跨智能体契约），新增智能体加参考文件即可，技能正文零改动。
- Codeup MCP 配置指引已于 2026-10-27 补入 setup-workspace references/decisions.md，形态为"适配器直连优先（个人访问令牌 + OpenAPI，零 MCP 依赖），MCP 为对话内操作工作项的可选增强"。
- 若未来需要团队协作场景（多人分支策略、评审分派），作为新技能扩展，不动现有门禁结构。
