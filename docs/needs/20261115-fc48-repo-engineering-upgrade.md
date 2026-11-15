---
id: 20261115-fc48
status: fulfilled
created: 2026-11-15
confirmed: 2026-11-15
fulfilled: 2026-11-15
---
# 仓库工程化升级：agents 分层目录 + 全仓 TypeScript（无构建直跑）+ pnpm + 最小 CI

## 背景与业务目标

仓库已从「纯技能集」长出真实工程物——`@hankchen/infra` 安装器（src/ 13 个 ESM JS 模块 + bin/ + scripts/ 对账）、dsh-demo 插件独立 npm 包、35 个测试文件（need 20261114-1f2f、20261115-339e 交付）——但工程骨架仍是 npm + 无 CI + 目录平铺。need 20261115-339e 验收折回已留痕缺口：**残余风险 1「仓库无 CI 工作流配置，24 系基线缺自动回归门」+ 下一轮建议 1「补最小 CI 工作流（node 24 + npm test）」**。

发起人目标（原话「工程已经接入cli模式，目录设计应该更具工程化思想」「编程语言改为typescript」「包管理改为pnpm」2026-11-15）：目录按工程惯例分层（`.github` / `agents/<宿主>/` / `skills` / `src`），语言升 TypeScript，包管理换 pnpm。定稿阶段追加两条（2026-11-15）：**CLI 引入专门依赖**承担子命令/参数解析——「现在命令行的子命令、参数解析都是自己处理，需要引入专门做命令行的依赖来处理，以后命令会越来越多，现在引入可以避免腐化」；**agents/ 布局先调研后设计**——「agents/<宿主>/plugins这个设计是为了兼容其他宿主的扩展，可能其他宿主支持的不是插件而是hooks之类的其他方法，先调研其他宿主的扩展工具把目录结构设计全了，相当于提前定好了布局规范」。可验证目标：改造完成后全量测试绿、`verify:pack` 对账通过、对外安装行为不变、CI 在 GitHub 上跑通回归门、agents/ 布局规范覆盖调研到的宿主扩展机制类型。不做的代价：CI 回归门缺口延续（贡献者环境漂移时全量测试静默退化，339e 已点名）；插件增多后平铺 `plugins/` 失去宿主语义、布局规范不先行则每接一个宿主动一次结构；手写解析随命令增多腐化；JS 无类型约束的维护面随 CLI 复杂度增长。

时机论据（内联查证 2026-11-15）：真实引用 `plugins/` 路径的代码点仅 7 处（asset-map sourceDir、verify-pack 对账、根 files 白名单、4 个测试文件）+ 规范文档 plugin-assets.md §1.1/§1.3/§1.4；现存插件只有一个 demo——**现在是改布局成本最低的时刻**。

## 干系人与用户

| Actor | 要完成什么 | 成功标准 |
|---|---|---|
| 套件维护者 | 让工程骨架支撑后续演进（宿主分层 / 类型约束 / 工作区 / 回归门） | 四件改造全落地，全量测试绿，verify:pack 对账通过 |
| 外部使用者 | 无感知继续使用 `npx @hankchen/infra` | npx 命令、两层菜单、技能落盘、插件转发全部行为不变 |
| CI（GitHub Actions） | push/PR 自动回归 | 回归门工作流跑通；dsh 集成测试靠既有前置门自跳 |
| 未来 agent 宿主 | 按 `agents/<宿主>/` 模式照抄接入 | 规范文档（plugin-assets.md）改版后模式清晰可照抄 |

## 系统能力需求

- **FR-1** 目录重组（调研先行、规范定全）：`agents/<宿主>/` 为按宿主分层的扩展资产目录，**不预设子目录只有 plugins**——各宿主的扩展机制类型（插件 / hooks / 命令 / 规则等）以 RQ4 调研报告为输入，按 `agents/<宿主>/<机制>/` 模式把布局规范一次设计全（提前定规范）；demo 插件落 `agents/dsh/plugins/dsh-demo/`（每个插件目录仍是各自完整 npm 包，package.json 独立演进）作为首个实例；`skills/` 留顶层不动，CLI 工程物归位 `src/ bin/ scripts/ test/`；治理规则「先改文档再改技能」——规范文档（plugin-assets.md 视调研结论升格或扩展）先行改版；7 处代码引用（src/asset-map.js sourceDir、scripts/verify-pack.mjs 对账路径、根 package.json files、4 个测试文件）与规范文档（蓝图、README 发布节）行为等价迁移（溯源：原话「agents dsh plugins」+「可能其他宿主支持的不是插件而是hooks之类的其他方法，先调研其他宿主的扩展工具把目录结构设计全了，相当于提前定好了布局规范」；拍板 D3/D10 2026-11-15）。
- **FR-2** `.github/` 落最小回归门工作流：push/PR 触发，node 24（与 .nvmrc/engines 对齐）+ 全量测试 + verify:pack 对账；dsh 集成测试在 CI 依赖既有前置门显式跳过（溯源：原话「.github（按github ci规范）」+ need 20261115-339e 下一轮建议 1；范围口径拍板 D5——发布自动化不在本轮）。
- **FR-3** 全仓 TypeScript、**无构建直跑**形态：安装器链路（src/ bin/ scripts/ test/）与 demo 插件全部 .ts 化，行为等价迁移；执行形态=源码直发，node ≥24.9 运行时默认剥类型（本机实测可行），`tsc --noEmit` 承担类型检查（CI + 开发期），erasable 语法约束（无 enum/namespace/参数属性）已知并接受（溯源：原话「编程语言改为typescript」；拍板 D4 全仓含插件、D8 形态 A 2026-11-15）。
- **FR-4** 包管理 npm → pnpm：pnpm-lock.yaml 替代 package-lock.json、`packageManager` 字段、workspace 化（root + agents/dsh/plugins/* 成员包）、CI 与文档同步（溯源：原话「包管理改为pnpm」2026-11-15；落地细节承 FR-6 调研）。
- **FR-5** 行为不变防线：对外安装行为全部保持原样——`npx @hankchen/infra` 命令形态、两层菜单、技能落 `.agents/skills/` + 软链、插件经官方命令转发、`--plugins` 旗标名；既有全量测试（49+ 例）绿是本轮一切改动的验收底线（拍板 D2 2026-11-15）。
- **FR-6** 调研交付物（三条研究问题，均出带一手来源的系统调研报告；拍板 D1/D6/D9/D10 2026-11-15）：
  - **RQ2 pnpm workspace × npx 双包发布**：pnpm publish 与 npm publish 差异、workspace 根打包是否受成员影响、package-lock → pnpm-lock 迁移陷阱、verify:pack 适配面——支撑 FR-4 落地与 plugin-assets.md §1.4 发布纪律改版。
  - **RQ3 CLI 库选型对比**：候选库（commander / yargs / cac / citty / clipanion 等）按硬维度对比——ESM/TS 原生支持、**包体积（npx 冷启动体感，硬约束）**、子命令模型扩展性（命令将增多）、help 生成能力、维护活跃度——支撑 FR-8 选型。
  - **RQ4 agent 宿主扩展机制普查**：输入=AGENT_DIRS 已有 20+ 宿主目录清单（src/agent-dirs.js，取自 vercel-labs/skills 支持面）；产出=各宿主的扩展机制类型（插件 / hooks / 命令 / 规则 / 子代理等）与官方目录约定——支撑 FR-1 的 agents/ 布局规范设计与规范文档改版。
- **FR-7** dsh 端到端 `.ts` 加载实测义务：FR-3 迁移后，以 .ts 形态插件经官方命令装进测试 profile 并真实启动加载（apply 日志可见即证）；证伪则回退方案=插件包发布前编译（回退触发条件与形态归 spec）（拍板 D7 2026-11-15；**显式推翻 need 20261115-339e 非目标 2「启用验证留给宿主侧」口径——本轮主动补一次实测**）。
- **FR-8** CLI 引入专门依赖：以成熟的 CLI 库承担非交互旗标解析、互斥校验、help 生成与子命令组织，替换手写 cli-args.js（125 行解析面）；对外命令形态行为等价（旗标语义、错误口径、--help 内容不变或等价，FR-5 防线约束），为后续命令增多留可扩展骨架（溯源：原话「现在命令行的子命令、参数解析都是自己处理，需要引入专门做命令行的依赖来处理，以后命令会越来越多，现在引入可以避免腐化」2026-11-15；选型承 RQ3，拍板 D9）。

## 场景

**主流程（先调研定规范，四件+两件一次落位）**
- Given 仓库现行布局（plugins/ 平铺、全 JS、npm、无 CI、手写解析）
- When RQ4 宿主扩展机制调研完成，agents/ 布局规范先行定稿（规范文档先行，治理规则）
- Then demo 插件落 `agents/dsh/plugins/dsh-demo/` 且为完整 npm 包；`.github/workflows` 回归门在位；src/bin/scripts/test 与插件全为 .ts；pnpm-lock.yaml 在位；CLI 库承担解析（手写 cli-args.js 退役）
- And 全量测试绿 + `verify:pack` 对账通过 + CI 回归门在 GitHub 跑绿
- And 对外安装行为逐项不变（FR-5 防线：旗标语义、错误口径、--help 内容等价）

**场景 2（.ts 端到端，FR-7）**
- Given .ts 形态 demo 插件经官方命令装进测试 profile
- When dsh 启动该 profile
- Then 插件 apply 日志可见（加载成功）
- 异常流：加载失败 → 触发 FR-7 回退方案（插件包发布前编译），形态归 spec〔指向 A1〕

**异常流 A（pnpm 迁移陷阱）**：workspace 打包/publish/lockfile 迁移形态与预期不符 → RQ2 系统调研兜底（对应 FR-6、A2）。

**异常流 B（CI 环境）**：runner 无 node 24 → setup 步骤按 .nvmrc/engines 对齐（对应 A3）；dsh 集成测试在 CI 无官方命令/registry 时按既有前置门显式跳过、不假绿。

**异常流 C（宿主机制异类）**：RQ4 调研发现某宿主扩展机制非插件形态（hooks / 命令 / 规则等）→ `agents/<宿主>/<机制>/` 目录模式承接，不硬塞 plugins 子目录；布局规范按机制类型分册写全（对应 FR-1、FR-6）。

**异常流 D（冷启动增重）**：RQ3 选型的候选库使 npx 冷启动体感明显变差 → 体积为硬维度一票否决，换轻量候选或维持最小引入面（对应 FR-8、A4）。

## 假设与风险

- **A1（风险）dsh 宿主端到端加载 .ts 插件**：读码证据=插件加载链走原生 ESM（@deepseek-ai/cordis-plugin-loader 1.1.0，createRequire + internal esm loader + import.meta.resolve，2026-11-15 内联查证），node ≥24.9 下 import .ts 即走默认类型剥离（本机局部实测通过）；但端到端（真启动加载）未实测。处置：拍板升格为本轮实测义务（FR-7、D7），残余仅证伪后回退成本（发布前编译，机械）。- **20261115-f650 round 1 验证结果：证伪（按预案合规处置）**——FR-7 端到端实测宿主拒载 node_modules 下 .ts（ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING，失败点定位 node:internal stripTypeScriptModuleTypes 按物理路径拒载；dsh 加载链只改 resolve 路由不涉转译）；控制组 .js 预编译包同链真跑加载成功（回退方案预验证通过）。证伪报告 docs/research/dsh-ts-loading/fr7-dsh-ts-loading-falsification.md。残余：插件包当前仍零构建形态（main 直指 index.ts），回退落位（发布前 tsc 预编译）是 round 2 决策项。原不确定度：低。- **20261115-ed9f round 2 验证结果：回退落地生效，残余消除**——插件包发布面预编译落地（票 20261115-cf39），预编译 .js 包经官方命令真装真启动 apply 日志可见（验收 20261116-b5d3 S10 自动化 5373ms + 实操双证）；发布态 .ts 形态已被 bundle 校验器常驻拒绝钉住（证伪知识固化为发布门）。
- **A2（风险）pnpm workspace × npx 双包发布交互**：pnpm pack 对 files 白名单的遵循有先验（与 npm pack 高度一致），但 workspace 根打包、`workspace:*` 协议、lockfile 迁移、verify:pack 适配是真未知。代价：发布纪律改版走样则双包顺序对账失效。- **20261115-f650 round 1 验证结果：验证通过（round 1 口径）**——RQ2 报告四问全答 + 落地方案四件 + 陷阱 12 条逐条缓解（docs/research/pnpm-workspace/，pnpm 12.15.0 内联实测 E1–E4）；本轮未实际迁移，实际迁移的残余不确定度折 round 2 执行票。原不确定度：中 → 交 RQ2 系统调研（FR-6），不靠猜。- **20261115-ed9f round 2 验证结果：验证通过（实际迁移收口）**——pnpm workspace 迁移落地（票 20261115-d5f4），双锁 9 依赖条目零漂移、frozen install 绿；发布演练三件套（pack + verify:pack + dry-run）本机真验 pnpm-lock.yaml 逐字节零弄脏、无需缓解（验收 S12）；RQ2 两处实测偏离（`--` 原样转发、dry-run 照走 git 门）已实证并留痕票 Progress。
- **A3（假设）GitHub Actions runner 的 node 24 可用性**：官方 runner images 持续跟进主流 node 大版本。过滤闸判定：5 分钟可查证但属 CI 实操细节，查证收益不抵 spec 期直接实测兜底，故留假设。不确定度：低。**20261115-f650 round 1 验证结果：本轮未触发**——workflow 已落（node-version-file 读 .nvmrc=24.22.1，取版不可用则 setup 步骤原生显式失败）；真实 runner 观测留维护者在 Actions 页执行（FR-2 集成级人工段）。**20261115-ed9f round 2：本轮未触发**——workflow 仅改依赖安装步（npm→pnpm frozen + cache: pnpm），取版机制未动；静态契约测试绿（验收 S14）。
- **A4（风险）CLI 库引入的 npx 冷启动增重**：安装器经 `npx @hankchen/infra` 裸跑，新依赖的体积直接进使用者冷启动体感（现状仅 @clack/prompts 一个依赖）。代价：选重了则每个使用者每次 npx 都变慢。处置：RQ3 把包体积列为硬维度（异常流 D 一票否决线）。- **20261115-f650 round 1 验证结果：验证通过（round 1 口径）**——RQ3 实测五维对比：commander 676 KB（否决线 56%）冷启动中位 2.30 s 低于现行包 3.60 s；yargs 三重超线显式否决（docs/research/cli-lib/，evidence/ 16 案例等价探针矩阵逐字节一致）；本轮未引入依赖，引入动作折 round 2。原不确定度：低（机械可测）。- **20261115-ed9f round 2 验证结果：验证通过（引入收口）**——commander 15.1.0 引入落地（票 20261115-eed0），依赖面恰 commander 无增重回退；十六案例矩阵 + 边角集 + 插件语义表逐字节等价实测（验收 S6），锁 minor ^15.1.0。

### 20261115-f650 round 1 折回（验收 20261115-1457 passed 后蒸馏）

残余风险（逐条）：
1. package-lock.json 提交态 bin 字段为发布换载形态（bin/infra.js）与 package.json 仓库形态（bin/infra.ts）不同步——npm install 自动同步不碍使用；round 2 pnpm 迁移票核对同构问题（pack 换载回写是否弄脏 pnpm-lock.yaml）。
2. agents-layout.md §4.4「本分支尚无 .github/ 目录」被后合入的 CI 票时序过期——round 2 迁移票顺手修正。
3. 工票 20261115-7784 验收 checkbox 未勾登记（落库链完整，形式不一致）——可补登记。
4. FR-2 集成级人工段——**已核销（2026-11-15）**：fix 20261115-1a89（CI runner 缺 pnpm 致 FR-5 集成测试红，PR #242）合并后 Actions run 43724564151 全绿——FR-5 真跑 pass、FR-7 pnpm 就绪后真跑（.ts 形态证伪态 skip 报因、控制组 pass）、全量 151/150/0/1。
5. 基线既有测试债：test/e2e/plugin-install.test.ts:151 断言实匹配根包版本而非插件落盘版本（保护意图可静默失效）——独立小票修复，未进 round 1。
6. FR-7 回退未落位：插件包仍零构建形态，宿主实测拒载 node_modules 下 .ts——round 2 决策落位（证伪报告与回退方案已成文）。

下一轮建议（默认建议：开 round 2，范围 = 分轮拍板既定主线 + 上述残余折回项）：布局规范落地迁移（agents/ 建立 + 引用面迁移 + §4.4 修正）+ pnpm 迁移（RQ2 方案为准）+ CLI 库引入（RQ3 方案为准）+ FR-7 回退落位（插件包预编译）；无公开扩展机制文档宿主（Codemaker/Jazz/Terramind/Tinycloud）接入前单独补调研。

## 范围与非目标

非目标（全部显式拍板）：
1. **CI 发布自动化**（双包发布 workflow、secrets、provenance）——拍板 D5「只回归门」，后续可补轮。
2. **对外安装行为变更**（npx 命令、菜单、落盘、转发、旗标名）——拍板 D2 行为不变防线。
3. **skills/ 内容与结构变更**——拍板 D3「留顶层不动」。
4. **demo 插件真实功能设计**——维持 need 20261115-339e 非目标 1。
5. **其他 agent 宿主的扩展接入实现**——本轮做 RQ4 调研 + agents/ 布局规范设计（拍板 D10），各宿主实际接入留后续轮（原 plugin-assets.md §1.5 扩展模式由新规范承载）。
6. **TS 预编译 dist 形态**——拍板 D8 选无构建直跑后，B 方案进非目标；若未来 erasable 约束不可承受再开轮迁 B。
7. **存量已发布包（@hankchen/infra 0.1.1、@hankchen/dsh-demo 0.1.1）的回收/替换**——包随下一版本自然演进，不发补丁专票。

## 开放问题

- **D1 拍板** → 方法论选调研驱动（原话选择「调研驱动」2026-11-15，否决建议的决策卡为主；去向 FR-6）。
- **D2 拍板** → 范围边界：本轮=仓库工程化改造，对外安装行为不变、仅包内 files 路径随目录重组而变（原话「确认」2026-11-15；去向 FR-5、非目标 2）。
- **D3 拍板** → 目录语义：agents/<宿主>/plugins/<插件目录>（各自完整 npm 包）+ skills 顶层不动 + .github 最小 CI（原话「确认」2026-11-15；去向 FR-1/FR-2、非目标 3）。
- **D4 拍板** → TS 范围：全仓 TS 含 demo 插件（原话选择「全仓 TS」2026-11-15，否决建议的「demo 保持 JS」；去向 FR-3、FR-7、A1）。
- **D5 拍板（DC1）** → CI 只做回归门，发布自动化非目标（原话选择「只回归门」2026-11-15；去向 FR-2、非目标 1）。
- **D6 拍板（DC2）** → RQ2 交 dev-research 系统调研、RQ1 当场决策卡（原话选择 2026-11-15；去向 FR-6、FR-3）。
- **D7 拍板（DC3）** → dsh 端到端 .ts 加载本轮实测（原话选择「本轮实测」2026-11-15；推翻 need 20261115-339e 非目标 2 口径；去向 FR-7、场景 2、A1）。
- **D8 拍板（RQ1 决策卡）** → TS 执行形态=无构建直跑（strip + tsc --noEmit，erasable-only 约束已知并接受）（原话选择「A 无构建直跑」2026-11-15；去向 FR-3、非目标 6）。
- **D9 拍板（定稿追加）** → CLI 引入专门依赖承担子命令/参数解析，替换手写解析，避免随命令增多腐化（原话「现在命令行的子命令、参数解析都是自己处理，需要引入专门做命令行的依赖来处理，以后命令会越来越多，现在引入可以避免腐化」2026-11-15；去向 FR-8、RQ3、A4、异常流 D）。
- **D10 拍板（定稿追加）** → agents/ 布局先调研后设计：调研各宿主扩展工具（可能非插件而是 hooks 等），把目录结构一次设计全，提前定好布局规范（原话「agents/<宿主>/plugins这个设计是为了兼容其他宿主的扩展，可能其他宿主支持的不是插件而是hooks之类的其他方法，先调研其他宿主的扩展工具把目录结构设计全了，相当于提前定好了布局规范」2026-11-15；去向 FR-1、RQ4、异常流 C、非目标 5）。
- **RQ2/RQ3/RQ4 研究问题转正** → FR-6 调研交付物（三要素齐备见 FR-6 内列；RQ2 拍板 D6，RQ3 源自 D9，RQ4 源自 D10）。

### 20261115-ed9f round 2 核销（验收 20261116-b5d3 passed 后蒸馏）

round 1 折回残余逐条：#1 lockfile bin 换载核对——已收口：pnpm pack 换载回写实测不弄脏 pnpm-lock.yaml（演练前后 porcelain 空 + git diff 空，验收 S12），无需缓解；#2 agents-layout §4.4 时序过期——已修正核销（票 20261115-30f2，agents-layout.md:153 明文）；#3 工票 20261115-7784 验收 checkbox 补登记——不可补（round 1 过程档已清扫无载体），以本注记为核销说明（形式项，落库链实质已由 tracker 投影与源码 [#NNNN] 引用承载）；#4 FR-2 集成级人工段——round 1 已核销；#5 e2e 断言债——已修复核销（票 20261115-dafb：断言改锚插件落盘版本，双向红绿验证，验收 S11）；#6 FR-7 回退落位——已落位核销（票 20261115-cf39：发布面预编译 + 集成真装真启动 apply 日志可见，验收 S8/S9/S10，FR-7 证伪闭环）。

round 2 残余风险（1 条瑕疵，不阻塞）：docs/standards/agents-layout.md:150 历史注记引用已退役的 src/cli-args.ts:37 与已迁走的 test/unit/menu.test.ts 断言面——不影响功能与行为，下轮触碰该文档时顺手更新。同源建议级收口清单（均留痕于各票评审报告「范围外备注」）：agents-layout §4.2 index.js 括注过期、§4.3 引用面清单缺 4 处实证项、collectFn 死计算与 cli.ts 头注分工句、ci-workflow 契约测试缺负向断言、verify-pack 注释「两查→三查」、坏包 fixture 链接形态覆盖、plugin-assets tag 步骤人工门口径、插件编译诊断带行号、幂等门 catch 归宿、plugin-package 断言降耦合、tar 错误上下文拼接、§三 gitignore 登记句、.gitignore 通配化、RQ3 §10.4-4 commander 年更登记落点。

round 2 下一轮建议：不开轮——残余全部为建议级文档/测试回写项，无功能与行为风险；默认建议随后续 [trivial] 顺手处理或下轮触碰相关文件时带上。
