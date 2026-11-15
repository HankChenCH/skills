---
id: 20261115-f650
status: done
need: 20261115-fc48
round: 1
created: 2026-11-15
approved: 2026-11-15
done: 2026-11-15
---
# 仓库工程化升级 round 1：三条调研 + 全仓 TypeScript（无构建直跑）+ 最小 CI + 布局规范定稿

## 问题陈述

仓库工程骨架落后于其真实工程物：`@hankchen/infra` 安装器（13 个 JS 模块）、dsh-demo 插件包、35 个测试文件在跑，但无 CI 回归门（need 20261115-339e 验收折回已点名）、代码无类型约束、目录平铺失去宿主语义、子命令解析手写（125 行，命令增多即腐化）。改造的最大不确定性不在写代码，而在三件事没人查证过：pnpm workspace 与「包根=仓库根 + 双包发布」的兼容性（含 workspace 根包 publish 与 `private` 字段的交互）、各 agent 宿主的扩展机制类型与目录约定（`agents/<宿主>/` 布局规范的输入，宿主可能用 hooks/命令而非插件）、CLI 库选型（硬约束 = npx 冷启动体积，现状仅 @clack/prompts 一个依赖）。这些结论不先落盘，目录改造、pnpm 迁移、CLI 库引入就都是盲拍。

## 方案

round 1 = 「调研先行、规范定稿、类型落地」三线（need FR-1～FR-8 全覆盖，深度分级见备注分轮拍板）：

1. **三条系统调研**（need FR-6）：
   - **RQ2 pnpm workspace × npx 双包发布**：pnpm publish 与 npm publish 差异、workspace 根打包是否受成员影响（含根包 `private` 字段与 publish 的交互）、package-lock → pnpm-lock 迁移陷阱、verify:pack 适配面——产出 pnpm 落地方案。
   - **RQ3 CLI 库选型**：候选（commander / yargs / cac / citty / clipanion 等）按硬维度对比——ESM/TS 原生、**npx 冷启动体积（实测数据）**、子命令模型扩展性、help 生成、维护活跃度——产出选型结论与迁移方案。
   - **RQ4 agent 宿主扩展机制普查**：输入 = AGENT_DIRS 已有 20+ 宿主清单（src/agent-dirs.js，取自 vercel-labs/skills 支持面）；产出 = 各宿主扩展机制类型（插件 / hooks / 命令 / 规则 / 子代理等）与官方目录约定，作为 `agents/<宿主>/<机制>/` 布局规范的输入。
2. **agents/ 布局规范定稿**（need FR-1 round 1 深度）：以 RQ4 结论为输入，按「先改文档再改技能」治理规则定稿布局规范（目录模式、各机制类型的清单要素、发布纪律改造方案、demo 迁位方案）；**目录迁移落地折 round 2**（规范先行，迁移以定稿规范为准绳）。
3. **全仓 TypeScript 无构建直跑**（need FR-3）：src/ bin/ scripts/ test/ 与 demo 插件全部 .ts 化，行为等价迁移；仓库内零构建直跑（运行时默认剥类型，node ≥24.9）、**发布面预编译**（node 拒剥 node_modules 下 .ts，见实现决策修订）、`tsc --noEmit` 承担类型检查进 CI；bundle 校验器适配 .ts 形态。
4. **最小 CI 回归门**（need FR-2）：`.github/workflows` push/PR 触发，node 24（对齐 .nvmrc/engines）+ 类型检查 + 全量测试 + verify:pack 对账；dsh 集成测试与交互 e2e 在环境不满足时按既有前置门显式跳过并报因，不假绿。
5. **dsh 端到端 .ts 实测**（need FR-7，集成级）：.ts 形态 demo 插件经官方命令装进临时 profile + dsh 真启动加载，apply 日志可见即证；证伪则显式证伪报告 + 回退方案（插件包发布前编译）作为 round 2 决策输入。

## 用户故事

- 作为套件维护者，我想拿到 pnpm workspace × 双包发布的调研结论与落地方案，以便 pnpm 迁移不再是盲拍、发布对账不失效。
- 作为套件维护者，我想拿到 CLI 库选型对比（含 npx 冷启动体积实测），以便引入解析库不拖慢每个使用者的每次安装。
- 作为套件维护者，我想拿到各宿主扩展机制普查与定稿的 agents/ 布局规范，以便接宿主不再动一次结构、布局一次设计全。
- 作为套件维护者，我想让全仓代码有类型检查（tsc --noEmit 进 CI），以便类型错误在合入前被拦而不是在运行时爆。
- 作为套件维护者，我想让 push/PR 自动跑全量测试与发布对账，以便贡献者环境漂移不再静默退化（need 20261115-339e 残余风险 1 兑现）。
- 作为外部使用者，我想让工程化改造完全无感（npx 命令、菜单、安装行为、--help 全不变），以便我什么都不用改。
- 作为外部使用者，我想让插件包 TS 化后依然能被 dsh 官方宿主真实加载，以便 TS 化不牺牲插件可用性。

## 实现决策

- **RQ2 调研契约**：报告必答四问——①pnpm publish 与 npm publish 行为差异清单；②workspace 根打包形态（根包非 `private` 时能否 publish、成员目录是否被误打入、`workspace:*` 协议影响）；③package-lock → pnpm-lock 迁移步骤与已知陷阱；④verify:pack 对账在 pnpm 打包产物上的适配点。结论节给出 pnpm 落地方案（workspace 结构、发布命令序列、对账改造方案），作为 round 2 pnpm 迁移票的输入。来源要求：pnpm 官方文档 + 本机实测（pnpm 12.15.0 已可用）。
- **RQ3 调研契约**：报告含候选库对比表，维度固定五项——ESM/TS 原生支持、包体积与 npx 冷启动耗时（**实测**：各候选装入后 `npm pack` 体积与冷启动 `time npx` 数据）、子命令/旗标模型扩展性、help 生成能力（等价复刻现行 --help 内容的可行性）、维护活跃度（最近发布时间、issue 响应）。结论节给出选型推荐 + 迁移方案（现行旗标语义映射表：--all/--skills/--plugins/--profile/-h 的库内表达 + 互斥校验 + 错误口径等价方案），作为 round 2 CLI 库引入票的输入。
- **RQ4 调研契约**：报告按宿主逐个列——扩展机制类型（插件 / hooks / 斜杠命令 / 规则 / 子代理 / 其他）、官方目录约定（项目级与本机级）、分发形态（npm 包 / 目录拷贝 / 市场）。范围 = AGENT_DIRS 清单内可查证到官方扩展机制文档的宿主（查不到的显式标「无公开扩展机制文档」，不虚构）；结论节给出 `agents/<宿主>/<机制>/` 布局模式的机制类型分类学，作为布局规范定稿输入。
- **布局规范定稿契约**（need FR-1 round 1 深度）：以 RQ4 结论为输入定稿规范文档——`agents/<宿主>/<机制>/` 目录模式定义、各机制类型的清单要素（对齐插件包四要素的思路逐机制定义）、发布纪律改造方案（双包对账路径变更方案）、demo 迁位方案（`agents/dsh/plugins/dsh-demo/`）；规范文档落点与是否升格/拆分 plugin-assets.md 归 design；目录迁移本身不在本轮落地（round 2 首批票，按定稿规范执行）。
- **TS 迁移形态（need FR-3，拍板 D8；20261115-d437 运行中修订，见备注）**：仓库内零构建直跑不变——src/ bin/ scripts/ test/ 源码全部 .ts，开发与测试直跑（node ≥24.9 默认剥类型，node:test 原生支持 .ts）；语法约束 = erasable-only（无 enum/namespace/参数属性，用 const 对象 + union 替代）；类型检查 = `tsc --noEmit` 独立于运行（CI 步骤 + 本地脚本）；tsconfig 策略（strict 程度、include 范围）归 design。**发布面预编译（修订点）**：node 对 node_modules 下 .ts 一律拒绝剥类型（`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`，官方有意设计、无旗标逃生，npm install / npx 消费路径全命中）——发布面比照插件包回退预案先例在打包前 tsc 编译（prepack 承载 emit），tarball 含编译 .js（bin 直指编译产物）与 .ts 源码（导航可读），skills/plugins 清单与路径不变。行为等价迁移：不改任何对外可观察行为，既有全量测试直跑 .ts 全绿即防线（node:test 原生支持 .ts 已实测）。
- **demo 插件 .ts 化契约**：插件包 `main` 直指 .ts 模块、`files` 清单含 .ts 文件与 cordis.patch.yml、四要素与 bundle 校验器适配 .ts 形态（校验器解析模块导出的方式对 .ts 的适配点归 design）；发布形态保持零构建。**回退预案**（FR-7 证伪时启用）：插件包单独预编译（发布前 tsc）——该先例机制已由 D8 修订扩展为主 CLI 发布面形态（见上条与备注）；回退触发条件 = 端到端实测失败且读码复核确认宿主加载链不支持，回退决策材料进 round 2 输入。
- **CI workflow 契约（need FR-2）**：触发 = push + pull_request；运行时 = 单 node 24（版本读 .nvmrc 或与 engines 一致的写法，具体归 design）；步骤链 = checkout → node setup → 依赖安装（本轮仍 npm，pnpm 折 round 2）→ tsc --noEmit → 全量测试 → verify:pack；环境缺失（dsh 集成测试的 node/registry 前置、交互 e2e 的 expect/PTY 前置）→ 既有前置门显式跳过并输出报因，不许假绿；workflow 文件不持 secrets（发布自动化是非目标）。
- **dsh 端到端实测契约（need FR-7，集成级）**：临时 `DSH_HOME` + 测试 profile + .ts 形态 demo 插件经官方命令（npx 执行体）安装 + 真实启动该 profile 断言 apply 日志可见；测试前置门沿既有纪律（node ≥24.9 + registry 可达，不满足显式跳过报因）。
- **行为不变防线（need FR-5 round 1 深度）**：本轮一切改动（TS 迁移、CI 落地、规范文档）不动对外行为——npx 命令形态、两层菜单、技能安装落盘、插件安装转发、`--plugins`/`--profile`/`--all`/`--skills`/`-h` 旗标语义与错误口径、--help 文本内容全部保持原样；cli-args.js 手写解析本轮不替换（FR-8 落地折 round 2）。

## 测试决策

- TS 迁移的 seam = 既有全量测试体系直跑 .ts（node:test 原生支持已实测，1 例样例通过）；不新增测试框架，迁移完成后既有 49 例 + 各票新增全绿即等价性证据。
- 新增 seam：①bundle 校验器对 .ts 形态插件包的校验（fixture：合法 .ts 插件包 / 缺要素的 .ts 包）；②CI workflow 的静态校验（yaml 可解析、步骤齐备、无 secrets 键）；③端到端实测脚本的前置门与显式跳过路径（沿 spec 20261115-495e 集成级先例：临时 DSH_HOME + 注入执行体断言组装、真跑段独立前置门）。
- 三份调研报告为文档产物，无自动化测试 seam；验收 = 报告契约节逐项核验（必答问题全答 + 一手来源 + 结论可执行）。

## 验收场景

- [FR-6 | 工单级] Given RQ2 报告，When 逐项核验，Then 四问全答（publish 差异 / 根打包形态含 private 交互 / lockfile 迁移陷阱 / verify:pack 适配点）且结论节含可执行的 pnpm 落地方案，来源含 pnpm 官方文档与本机实测记录。
- [FR-6 | 工单级] Given RQ3 报告，When 逐项核验，Then 候选库对比表五维度齐备且体积/冷启动为实测数据（非引用他人数字），结论节含选型推荐与现行旗标语义的库内映射方案。
- [FR-6 | 工单级] Given RQ4 报告，When 逐项核验，Then AGENT_DIRS 清单内宿主逐个列机制类型与目录约定（查不到官方文档的显式标注不虚构），结论节含 `agents/<宿主>/<机制>/` 的机制类型分类学。
- [FR-1 | 工单级] Given RQ4 结论与布局规范文档，When 检索规范，Then 含目录模式定义、各机制类型清单要素、发布纪律改造方案、demo 迁位方案四节；目录迁移不落地（agents/ 目录本轮不存在于仓库根，round 2 按规范执行）。
- [FR-2 | 工单级] Given workflow 文件，When 静态核验，Then 触发含 push 与 pull_request、node 24、步骤链含 tsc --noEmit + 全量测试 + verify:pack、无 secrets；Given 环境缺 dsh/registry/expect，When 全量测试运行，Then 对应测试显式跳过并输出报因（零静默假绿）。
- [FR-2 | 集成级 | 人工：CI 触发需推送 GitHub，验收时点由维护者在 Actions 页观测] Given workflow 已合入主干，When push/PR 发生，Then Actions 运行全绿（或前置门跳过段显式报因）。
- [FR-3 | 工单级] When 检视仓库，Then src/ bin/ scripts/ test/ 与 demo 插件全部为 .ts（无并存 .js 源文件），`node --test` 直跑全量全绿，`tsc --noEmit` 零错误，源码无 enum/namespace/参数属性（erasable-only）。
- [FR-3 | 工单级] Given 发布面预编译形态（仓库内零构建直跑不变，D8 修订），When 本地 `npm pack` + `verify:pack` 对账，Then 产物含编译 .js（bin 直指编译产物）与 .ts 源码、对账通过（包内 skills/plugins 清单 = 仓库清单，路径未变——目录迁移折 round 2）、安装后消费链可跑（tarball 装入后 bin 真实执行）。
- [FR-5 | 工单级] Given 迁移后 CLI，When 跑既有全部 e2e（交互 + 旗标 + 安装落盘 + 插件转发），Then 全绿且断言的输出文本/错误口径与迁移前一致（--help 文本、互斥报错、版本拦截文案逐字不变）。
- [FR-4 | 工单级] Given RQ2 结论节，When 检视落地方案，Then workspace 结构 / 发布命令序列 / lockfile 迁移步骤 / verify:pack 改造方案四件齐备（round 2 pnpm 票的输入就绪）；pnpm 本轮不实际迁移（package-lock.json 仍在）。
- [FR-8 | 工单级] Given RQ3 结论节，When 检视迁移方案，Then 选型结论 + 现行旗标语义映射表 + 互斥/错误口径等价方案齐备（round 2 CLI 库票的输入就绪）；cli-args.js 本轮不替换（手写解析仍在位）。
- [FR-7 | 集成级 | 承载票 NNNN] Given node ≥24、registry 可达、临时 DSH_HOME，When .ts 形态 demo 插件经官方命令装进测试 profile 且真实启动该 profile，Then 插件 apply 日志可见（宿主加载 .ts 成功）。
- [FR-7 | 集成级 | 承载票 NNNN] Given 端到端实测失败（宿主拒载 .ts），When 读码复核加载链，Then 显式证伪报告落盘（失败点定位）且回退方案（插件包预编译）成文为 round 2 决策输入；本条与上条互斥，恰一条通过。
- [FR-6 | 工单级]（异常流继承）Given RQ2 报告，When 检索异常流 A 承接，Then 含 workspace/lockfile 已知陷阱清单与逐条缓解（need 异常流 A）。
- [FR-2 | 工单级]（异常流继承）Given CI 环境无 node 24 或 runner 异常，When workflow 运行，Then setup 步骤按 .nvmrc/engines 对齐取版、失败显式报因不静默（need 异常流 B）。
- [FR-6 | 工单级]（异常流继承）Given 某宿主扩展机制非插件形态（hooks/命令等），When 查 RQ4 分类学，Then 有对应机制类型条目与目录约定，布局规范含承接模式（need 异常流 C）。
- [FR-6 | 工单级]（异常流继承）Given 某候选库使冷启动明显增重，When 查 RQ3 体积维度，Then 实测数据支撑否决线（超阈值候选显式标否决及数据）（need 异常流 D）。

## 非目标

- 目录迁移落地（agents/ 目录实际建立、7 处引用迁移、规范文档改版的最终落地执行）——round 2 按定稿规范执行（need FR-1 round 1 深度边界）。
- pnpm 实际迁移（lockfile/workspace/packageManager/CI 步骤切换）——round 2 以 RQ2 落地方案为准（need FR-4）。
- CLI 库实际引入与 cli-args.js 替换——round 2 以 RQ3 迁移方案为准（need FR-8）。
- CI 发布自动化（双包发布 workflow、secrets、provenance）——need 非目标 1。
- 对外安装行为变更——need 非目标 2（FR-5 防线）。
- skills/ 内容与结构变更——need 非目标 3。
- demo 插件真实功能设计——need 非目标 4。
- 其他宿主的扩展接入实现——need 非目标 5（本轮止于普查与规范）。
- 存量已发布包的回收/替换——need 非目标 7。

## 备注

- 溯源：need 20261115-fc48（confirmed 2026-11-15，issue #229）；D1–D10 拍板与 RQ2/RQ3/RQ4 研究问题三要素见 need 开放问题节；查证事实（node 24.22.1 直跑 .ts、node:test 原生支持、pnpm 12.15.0、e2e 前置门形态、cordis-plugin-loader 原生 ESM 读码）见 need 各节标注。
- ADR 延续：20261115-f143 包根=仓库根 + 零构建直跑——TS 无构建直跑（D8）与其同向强化；RQ2 的「根包 publish 与 private 交互」是 f143 在 pnpm workspace 形态下的延伸确认点，不与其冲突。
- 分轮拍板（2026-11-15 用户批准）：保守两轮——round 1 = 三条调研 + CI + TS 迁移（含 FR-7 实测），round 2 = 布局规范落地迁移 + pnpm + CLI 库（以 round 1 调研结论为输入）。need FR-1～FR-8 全覆盖过孤儿门禁（spec 0015 先例），深度分级：FR-1 round 1 = 规范定稿（迁移折 round 2）、FR-4/FR-8 round 1 = 调研结论就绪（落地折 round 2）、FR-5 = 全程防线（真实验收）。
- 实现细节选型（tsconfig 策略、bundle 校验器 .ts 适配点、workflow 具体动作写法、规范文档落点、CI 中 expect 的安装方式）归 design 阶段定稿，本 spec 只锁契约。
- 集成级两条 FR-7 场景互斥（成功证/证伪）——恰一条通过即 FR-7 兑现，证伪路径的交付物是证伪报告与回退方案（need FR-7 回退预案）。
- **运行中修订（2026-11-15，无人值守自主处置留痕；触发票 20261115-d437）**：拍板 D8 原文「源码 .ts 直发 + bin 直指 .ts 入口」的发布面形态被实现期前提核实证伪——node 对 node_modules 下 .ts 一律拒绝剥类型（`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`；编排会话独立复现双形态：入口直跑与依赖链解析均拒，无旗标逃生；官方设计动机 = 阻止包作者直发 .ts，nodejs/node#57215）。原查证声明「node 24.22.1 直跑通过」只覆盖仓内路径，未覆盖 npm install / npx 安装后消费面——而本 CLI 全部分发消费路径恰在 node_modules 内。候选与裁决：①**发布面预编译**（打包前 tsc emit，prepack 承载；比照插件包回退预案先例）——选定；②bin 薄 .js 入口 + 其余 .ts 直发——否决（限制命中 node_modules 下任何 .ts 的加载，含依赖链解析，单点 bin 改形无效）；③安装期编译（prepare）——否决（安装期工具链依赖破坏 npx 冷启动与离线安装）。ADR 20261115-f143「零构建直跑」的发布面语义由本修订收窄为「仓库内零构建 + 发布面预编译」，蒸馏时更新 ADR；仓库内开发/测试体验不变。FR-7 插件实测义务不变——其回退预案与本修订同机制，实测仍须真跑取证（证据随票 20261115-d437 Progress 与本备注留痕）。
