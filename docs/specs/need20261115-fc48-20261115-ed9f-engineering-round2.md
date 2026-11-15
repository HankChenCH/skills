---
id: 20261115-ed9f
status: approved
need: 20261115-fc48
round: 2
created: 2026-11-15
approved: 2026-11-15
---
# 仓库工程化升级 round 2：agents/ 迁移落地 + pnpm workspace + commander 15 + 插件包预编译回退

## 问题陈述

round 1（spec 20261115-f650，done）把全部不确定性消掉了，留下四个已定案但未落地的改造，一次收口：

1. **agents/ 目录迁移未落地**——布局规范已定稿（docs/standards/agents-layout.md），插件源码仍在平铺 `plugins/`；`agents/<宿主>/<机制>/` 模式不落地，规范就是纸上文章（need FR-1 round 2 深度）。
2. **pnpm 未迁移**——RQ2 结论「兼容无结构障碍」已出（根包可 publish、`pnpm import` 单命令、verify:pack 零必需改动），仓库仍 npm + package-lock.json（need FR-4）。
3. **手写解析仍在位**——RQ3 推荐 commander 15（冷启动 2.30s 优于现行 3.60s、help 十六案例逐字节等价已实证），cli-args.ts 125 行手写解析未替换（need FR-8）。
4. **FR-7 回退未落位**——证伪报告定案：node 官方设计拒载 node_modules 下 .ts（`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`，无旗标逃生），.ts 零构建插件发布形态不可行；预编译回退方案已真跑预验证（need 残余 #6）。插件包不落回退，发出去的包就是装不上的包。

另有残余折回小项随行：lockfile bin 换载核对（#1）、agents-layout.md §4.4 时序过期（#2）、验收 checkbox 补登记（#3）、e2e 断言债（#5，plugin-install.test.ts:151）。

## 方案

四条主线并行推进，全部以 round 1 交付物为准绳；行为不变防线（need FR-5）全轮延续：

1. **agents/ 迁移落地**（need FR-1 round 2 深度）：按 docs/standards/agents-layout.md 执行——demo 插件迁 `agents/dsh/plugins/dsh-demo/`（git mv 保历史）；7 处引用面同步迁移（映射表 sourceDir、verify:pack 对账路径、根 files、4 个测试文件）；规范连带文档改版落地（plugin-assets.md / README / 蓝图）；顺手修正 §4.4 时序过期（残余 #2）。
2. **pnpm workspace 迁移**（need FR-4）：按 RQ2 落地方案执行——`pnpm import` 生成 lockfile、pnpm-workspace.yaml（根 + agents/dsh/plugins/* 成员）、packageManager 字段、CI 步骤 npm→pnpm（workflow 静态契约测试同步）、verify:pack 加「包内禁 node_modules」对账 + 命令面文案更新、发布纪律两道 pnpm 门（干净树 / 发布分支）写进文档；核对残余 #1（pack 换载回写是否弄脏 pnpm-lock.yaml）。
3. **commander 15 引入**（need FR-8）：按 RQ3 迁移方案执行——现行五旗标语义库内映射、互斥校验与错误口径等价（文案逐字不变）、--help 经 helpInformation() 覆盖逐字节等价（RQ3 §6.2 已实证）；cli-args.ts 退役。
4. **插件包预编译回退**（need FR-7 回退，残余 #6）：插件仓库源码保持 .ts，**发布面预编译**——发布流程（或 prepublishOnly）tsc 编译，tarball 载 .js 形态（main 指 .js）；bundle 校验器适配发布形态校验；集成测试以预编译包真装真启动断言 apply 日志可见（round 1 集成基建与控制组已在，形态切换即可）。此回退不违反 need 非目标 6（该条约束主 CLI 无构建直跑，主 CLI 形态不动）。

小项：残余 #5 e2e 断言债独立小票修复；残余 #3 checkbox 补登记（形式项，随收口原子提交）。

## 用户故事

- 作为套件维护者，我想让插件源码落进 agents/dsh/plugins/ 且全部引用面同步，以便布局规范从文档变成现实、下个宿主照抄接入。
- 作为套件维护者，我想让包管理换 pnpm 并按 RQ2 方案落地（含发布纪律两道新门），以便依赖管理升级且双包发布对账不失效。
- 作为套件维护者，我想让 commander 15 承担旗标解析且 --help/错误文案逐字不变，以便命令增多有骨架、使用者零感知。
- 作为套件维护者，我想让插件包发布面预编译 .js（源码保持 .ts），以便发出去的包在官方宿主真实可加载（FR-7 证伪闭环）。
- 作为外部使用者，我想让本轮全部改造无感（npx 命令、菜单、安装行为、--help 全不变），以便我什么都不用改。

## 实现决策

- **目录迁移契约（need FR-1）**：git mv 保历史迁 `plugins/dsh-demo/` → `agents/dsh/plugins/dsh-demo/`（每目录仍各自完整 npm 包）；映射表 command 行 sourceDir 改指 agents/dsh/plugins；verify:pack 查 1 对账路径同步；根 files 白名单 plugins → agents；4 处测试路径断言更新；plugin-assets.md（§1.1/§1.3/§1.4 路径）、README 发布节、蓝图相应节改版；agents-layout.md §4.4「尚无 .github/」过期表述修正（残余 #2）。迁移后 verify:pack + 全量 e2e 全绿为等价性证据。
- **pnpm 迁移契约（need FR-4，RQ2 方案为准）**：`pnpm import`（workspace importers 覆盖根 + 成员）→ package-lock.json 退役、pnpm-lock.yaml 入库；pnpm-workspace.yaml 声明根 + agents/dsh/plugins/*；packageManager 字段钉 pnpm 版本；CI workflow 依赖安装步换 pnpm（workflow 静态契约测试 ci-workflow.test.ts 同步更新——该测试是 workflow 的守护面）；verify:pack 增「包内禁 node_modules」对账条 + 命令面文案 npm→pnpm；发布纪律文档（plugin-assets.md §1.4）增 pnpm 两道门（干净树 / 发布分支，RQ2 问②实证错误码）；残余 #1 核对结论留痕（pnpm pack 换载回写对 lockfile 的影响，报告已有先验、迁移票实测收口）；本地脚本 `npm test`/`npm run typecheck` 命令面按 pnpm 语义调整（CI 与文档同步）。
- **commander 契约（need FR-8，RQ3 方案为准）**：commander 15.1.0 引入（零运行时依赖，体积冷启动实测已过否决线）；五旗标（--all/--skills/--plugins/--profile/-h）语义映射 + 互斥校验等价 + 错误口径逐字不变（FR-5 防线）；--help 经 helpInformation() 覆盖复刻现行文本（RQ3 §6.2 十六案例逐字节等价已实证）；cli-args.ts 退役、其单测迁移为 commander 适配面测试；menu/installer 接线改造。版本升级只锁 minor（15.x），major 年更节奏单独评估（RQ3 §7）。
- **插件预编译契约（need FR-7 回退，残余 #6）**：插件包 devDependencies 加 typescript + 构建脚本（prepublishOnly 或等价钩子，钩子选型归 design）；仓库源码 .ts 保持、git 里无编译产物（.gitignore 排除）；发布 tarball 载 .js（main 指 .js、files 白名单含编译产物与 cordis.patch.yml、不含 .ts 源码）；bundle 校验器适配——仓库源码态校验四要素（含 .ts main 语义映射到发布态）与发布态校验（tarball 内 .js 形态）双态口径，具体归 design；双包发布顺序不变（先插件包后初始化器）。集成级验收 = 预编译形态包经官方命令真装进临时 profile + 真启动 + apply 日志可见（round 1 集成测试基建复用，形态从 .ts 切到预编译控制组）。
- **行为不变防线（need FR-5）**：延续 round 1 口径——npx 命令形态、两层菜单、技能安装落盘、插件安装转发、旗标语义与错误口径、--help 文本内容全部保持原样；全量测试（150+ 例）全绿是每条主线合回的验收底线；e2e 断言仅允许路径/形态等机械适配（插件落盘行为断言不变）。
- **小项契约**：残余 #5——plugin-install.test.ts:151 断言修正为匹配插件落盘版本（非根包版本），保护意图恢复（独立小票）；残余 #3——工票 20261115-7784 验收 checkbox 补登记（过程档已清扫则无载体，改为在 need 折回节标注「已补登记/不可补」的核销说明，收口时处理）。

## 测试决策

- 迁移等价性 seam = 既有全量测试体系（150+ 例）直跑：路径断言更新后全绿即迁移等价证据；新增 seam：①pnpm 形态的 verify:pack 对账（含 node_modules 禁入查、pnpm pack 产物 fixture）；②commander 适配面（五旗标映射 + 互斥报错文案逐字断言 + help 输出逐字节断言——沿 RQ3 §6.2 十六案例矩阵）；③插件包双态校验（源码态 .ts / 发布态 .js fixture 两套）。
- 集成级（FR-7 回退）沿 round 1 基建：临时 DSH_HOME + npx 官方命令 + 预编译包真装真启动断言 apply 日志；前置门纪律不变（node ≥24.9 + registry，不满足显式跳过报因）。
- CI workflow 改动由静态契约测试（ci-workflow.test.ts）守护——改 workflow 必同步改测试（round 1 既定纪律）。

## 验收场景

- [FR-1 | 工单级] Given agents/ 迁移落地，When 检视仓库，Then `agents/dsh/plugins/dsh-demo/` 在位且为完整 npm 包（git 历史保留）、仓库根无 plugins/、映射表/verify:pack/根 files/4 处测试路径全部指向新路径且全量测试全绿。
- [FR-1 | 工单级] Given 规范连带文档，When 检索，Then plugin-assets.md/README/蓝图的 plugins 路径表述已改版、agents-layout.md §4.4 过期表述修正（残余 #2 核销）。
- [FR-4 | 工单级] Given pnpm 迁移落地，When 检视仓库，Then pnpm-lock.yaml 在位且 package-lock.json 退役、pnpm-workspace.yaml 含根 + 插件成员、packageManager 字段钉版本、CI 依赖安装步为 pnpm 且静态契约测试绿。
- [FR-4 | 工单级] Given verify:pack 在 pnpm 形态运行，When 本地 `pnpm pack` + 对账，Then 退出码 0 且「包内禁 node_modules」查生效（fixture 一个含 node_modules 的坏包被拒绝）。
- [FR-4 | 工单级] Given 发布纪律文档，When 检索，Then pnpm 两道门（干净树/发布分支）与 verify:pack 命令面文案已更新；残余 #1 核对结论留痕（lockfile 不被 pack 换载弄脏或显式缓解）。
- [FR-8 | 工单级] Given commander 15 引入，When 逐项对照 RQ3 十六案例矩阵，Then 五旗标语义、互斥报错文案、--help 输出与迁移前逐字节等价；cli-args.ts 已退役（文件不存在），适配面测试全绿。
- [FR-5 | 工单级] Given 全部主线合回后，When 跑全量测试与全部 e2e，Then 全绿（150+ 例）且对外安装行为断言（菜单条目、安装落盘、插件转发、版本拦截）与迁移前一致。
- [FR-7 | 工单级] Given 插件包预编译改造，When 本地 `pnpm pack` 出 tarball，Then tarball 载 .js 形态（main 指 .js、files 含编译产物与 cordis.patch.yml、无 .ts 源码）；仓库源码态保持 .ts 且编译产物不入库。
- [FR-7 | 工单级] Given bundle 校验器，When 分别校验源码态与发布态 fixture，Then 双态口径各自通过/拒绝行为正确（缺要素两态均拒并列缺陷）。
- [FR-7 | 集成级 | 承载票 NNNN] Given node ≥24、registry 可达、临时 DSH_HOME，When 预编译形态插件包经官方命令装进测试 profile 且真实启动，Then 插件 apply 日志可见（FR-7 证伪闭环：回退方案落地后宿主可加载）。
- [FR-5 | 工单级]（残余 #5）Given plugin-install.test.ts:151 断言债，When 修复后跑该测试，Then 断言匹配插件落盘版本（构造版本不一致场景断言变红、一致场景变绿）。〔独立小票〕
- [FR-4 | 工单级]（残余 #1）Given pnpm 形态，When 发布流程演练（pack + verify:pack + dry-run），Then pnpm-lock.yaml 在 git 中无变更（pack 换载回写不弄脏 lockfile，或缓解措施生效并留痕）。
- [FR-3 | 工单级]（round 1 交付维持）Given 本轮全部主线合回后，When 检视仓库，Then 全仓 .ts 形态无回归（无 .js 源残留、`tsc --noEmit` 零错误、erasable 约束保持）——迁移与 commander 改造不引入形态回退。
- [FR-2 | 工单级]（round 1 交付维持）Given 本轮 CI workflow 有改动（依赖安装步 npm→pnpm），When 静态契约测试（ci-workflow.test.ts）运行，Then 绿——workflow 每次改动同步过守护测试的纪律延续，步骤链契约（checkout → setup → install → typecheck → test → verify:pack）保持。
- [FR-6 | 工单级]（round 1 交付为准绳）Given 三份调研报告与证伪报告为 round 1 交付物，When 本轮各主线实现，Then 落地动作与报告方案一致（迁移按 agents-layout.md、pnpm 按 RQ2 四件、commander 按 RQ3 迁移方案、预编译按证伪报告回退方案），任何偏差显式留痕进对应票 Progress 并说明理由。

## 非目标

- 无公开扩展机制文档宿主（Codemaker/Jazz/Terramind/Tinycloud）的接入与补调研——need 折回明文：接入前单独补调研。
- 其他宿主扩展机制的实际接入实现——need 非目标 5 维持。
- skills/ 内容与结构变更——need 非目标 3 维持。
- CI 发布自动化——need 非目标 1 维持。
- demo 插件真实功能设计——need 非目标 4 维持。
- 主 CLI 的预编译 dist 形态——need 非目标 6 维持（预编译回退仅插件包发布面，主 CLI 零构建不动）。
- commander major 升版跟进——本锁 15.x，年更节奏单独评估（RQ3 §7）。

## 备注

- 溯源：need 20261115-fc48（fulfilled 2026-11-15）round 1 折回节「下一轮建议」明文范围——布局规范落地迁移 + pnpm 迁移 + CLI 库引入 + FR-7 回退落位 + 残余 #1/#2/#5 折回项（#3 随收口处理）；round 1 spec 20261115-f650（done，验收 20261115-1457 passed 投影 #239）。
- 输入就绪度：RQ2 落地方案四件（pnpm-workspace/rq2-pnpm-workspace-dual-publish.md）、RQ3 迁移方案（cli-lib/spec20261115-f650-20261115-f4c0-rq3-cli-lib.md，commander 15.1.0 + 十六案例矩阵）、agents-layout.md 规范四节、FR-7 证伪报告（dsh-ts-loading/fr7-dsh-ts-loading-falsification.md，回退方案已真跑预验证）——四份 round 1 交付物即本 round 的实现准绳。
- ADR 延续：20261115-f143 包根=仓库根——pnpm 迁移按 RQ2「兼容无结构障碍」结论执行，A143 不需修订；插件包发布面预编译是 FR-7 证伪后的既定回退（need FR-7 明文预案），与非目标 6（主 CLI 无构建）不冲突。
- 实现细节选型（预编译钩子选型 prepublishOnly 或等价、校验器双态口径细则、workflow pnpm 步写法、pnpm-workspace 成员通配、commander 程序装配结构）归 design 阶段定稿，本 spec 只锁契约。
- 分轮拍板：round 2 为收口轮（round 1 折回节默认建议，2026-11-15 用户指令「开 round2」），无再分轮设计——四主线 + 小项一次收口。
