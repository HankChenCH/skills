---
id: 20261118-0de6
status: done
need: 20261118-11f8
round: 1
created: 2026-11-18
approved: 2026-11-18
done: 2026-11-18
---
# dsh MCP 管理面右栏 Dock 页 + 插件包发布核销（round 1 全 FR）

## 问题陈述

`@hankchen/dsh-mcp` 0.1.0 已实现对话内双入口管理（round 1 验收 20261118-ef01 passed）但未发布（`npm view` E404，验收残余风险 1 挂核销义务）；dsh web 使用者的图形化管理面缺位——列含状态、添加、编辑、启停只能敲 `/mcp` 或唤模型。本票补两件事：把插件包（升级含 UI）发布出去并核销发布后对账义务；给 dsh Web Client 贡献右栏 Dock 页管理面板（need 20261118-11f8 拍板形态 B）。

## 方案

round 1 = need 全 FR 一轮（分轮拍板 2026-11-18：全 FR 一轮；理由——发布是既有流程执行非新机制，A1 构建复刻已有一手契约与官方先例，拆轮会把发布义务再悬挂一轮）：

1. **发布核销先行可独立演示**（need FR-6）：按 plugin-assets.md §1.4 双包顺序 publish `@hankchen/dsh-mcp` 0.1.0（功能面同 round 1 验收版）与初始化器新版本；发布后跑 registry 发布版对账 test + `npm view` 版本对账（round 1 集成测试第二 test 承接，版本对账目标随 UI 轮版本升级）。发布动作属维护者单向门，验收时点执行（沿 round 1 人工条目先例）。
2. **客户端载体**（need FR-7）：插件包升级含客户端能力——package.json 增 `dsh.client` 声明（`platform: 'web'`）与 `exports["./client"]` 指向构建产物；构建格式复刻官方 lazy-CJS factory 形态（官方 clientBundle preset 不随 npm 分发，参照官方先例包与 client-modules 文档一手契约，具体构建工具链选型归 design）。
3. **右栏 Dock 页**（need FR-1）：Host 侧 apply 内 `ctx.sidebarRightTabs.register` 注册 tab 类型（id = 包名、自定义 kind、`title`、guide 入口盒——官方字段契约 sidebar-right.md 一手来源）；客户端侧经 keyed slot `sidebar.right.pane.tab`（按定义 id 键控）注册面板 body。官方限制「All tabs require a foreground Session」如实承接（need 异常流 B）。
4. **Dock 页四操作全走 round 1 官方链路**（need FR-2/3/4）：列表与状态经 `ctx.remote.mcpManager` 的 `watch()` 流；添加经 settings `update`；行内编辑经 settings `mutate`（凭据未重输即保留——官方语义）；移除/启停经 `mutate` ops；failed 条目重试经 `restart`/`probe` Remote。零新持久化机制、零官方内部替身。
5. **发布面预编译扩展**（need FR-7 延续 ADR f650）：prepack 从只编译 index.ts 扩为 Host 面 + 客户端面两面编译，打包清单同步换载（client 产物入 files），postpack 还原；`verify-bundle` 校验器随之扩展核客户端声明。

## 用户故事

- 作为 dsh web 使用者，我想在右栏 Dock 页看到全部 MCP server 的名称、transport、连接状态与工具数，以便不敲命令掌握接入全貌。
- 作为 dsh web 使用者，我想在 Dock 页内添加 stdio/远程 server（凭据用模板串），以便图形化完成接入。
- 作为 dsh web 使用者，我想行内编辑 server 配置并保存即生效，以便改配置不用删了重建。
- 作为 dsh web 使用者，我想在 Dock 页启停、移除 server、对失败条目点重试，以便全程不离开图形界面。
- 作为 dsh web 使用者，我想空清单时看到会话内添加方式的引导文案，以便知道下一步去哪（不放按钮，拍板 D4）。
- 作为 infra 使用者，我想从 registry 安装已发布的 `@hankchen/dsh-mcp`，以便不依赖仓库源码。
- 作为套件维护者，我想让插件客户端包的构建复刻形成可照抄先例，以便后续 UI 型插件不再摸索构建格式。

## 实现决策

- **客户端包声明契约（need FR-7）**：package.json 增 `"dsh": {"client": {"platform": "web", …}}` 与 `"exports": {"./client": <构建产物路径>}`（官方 client-modules.md 一手契约：声明 + export 两处齐备才进客户端路由表）；具体 inject 边与 immediately 归 design。bundle 构建产物为 lazy-CJS factory 形态（官方格式；构建工具链与产物文件名归 design，参照官方先例包）。
- **Host 侧注册契约（need FR-1）**：插件 apply 内 `ctx.sidebarRightTabs.register({ id: '@hankchen/dsh-mcp', kind: <自定义>, title(address), guide: {…} })`——id 取包名（官方自然值建议）、kind 为本面板自定义 discriminator、guide 盒作为 guide 页入口（可从 guide 页打开本面板）；注册返回的 disposer 由 `ctx.effect` 持有（官方语义：实现随插件生命周期）。inject 面扩展声明 `sidebarRightTabs`/`slots`。
- **客户端面板契约（need FR-1）**：面板 body 经 keyed slot `sidebar.right.pane.tab` 按 Host 侧定义 id 注册；面板内经 `useTabInfo()` 获取 tab 状态（官方 hook）；数据面只调官方 Remote——`ctx.remote.mcpManager` 的 `watch()`（订阅即推全量、变更续推）与 settings Remote 的 `update`/`mutate`/`describe`（读 redact）。客户端侧的 remote 访问接线形态归 design。
- **manager 行组合策略（need FR-1/FR-2 载体；票 20261118-08f8 修订，round 1 无条件挂载作废）**：mcpManager 服务提供者随组合恰一个——web/desktop 组合复用官方 bundle 预挂行（rc.4 一手：官方 web 形态 bundle patch 自带 `id: mcp-manager` 的 mcp-manager 行，官方注释明言它是 installed plugins 注册 server 的官方载体），sdk/headless/acp 自定义 profile 无官方预挂、由本插件行补位（id = mcp，round 1 已验收形态）。条件机制沿官方 patch 行先例 `disabled: !!js` 表达式（web-app preset 一手形态；求值作用域 = loader ctx，boot 先 provide profileContext 后挂载条目）；判据 = profileContext 的 startedBundles 含官方 manager 预挂 bundle（rc.4 星座中 dsh-web-app 唯一自带该行）——含则插件行禁用（官方行独供）、不含则插件行在场（补位独供），两态各自恰一个提供者，无 duplicate。
- **settings 命名空间口径（need FR-2/FR-3/FR-4；票 20261118-08f8 修订，round 1「web 上为 mcp」口径作废）**：官方 settings 以 Loader entry id 为命名空间（dsh-settings write/describe 一手：ns = 条目 options.id，未知 ns 写即拒 `No configurable plugin entry`），行 id 随组合变化——web/desktop 组合为官方行 id，补位组合为插件行 id；故写面 ns 不硬编码：写时经 settings describe 派生实际生效 manager 配置域——manager Config 唯一 volatile 顶层字段 `servers`（default 恒解析在场），取 value.servers 在场的唯一 ns 为写目标，零在场或多于一个在场即拒绝写（fail loud 不猜测）；读面（transport 列、编辑基线）同口径派生。
- **行内编辑语义（need FR-3）**：编辑保存 = settings `mutate(ns, ops[])` 路径算子（round 1 已验证的官方形态，ns 按「settings 命名空间口径」派生）；凭据字段显示脱敏值（官方读永远 redact），保存时未重输的凭据路径不出现在 ops 里（官方 mutate「preserving secrets absent from a client response」语义）——面板不重传凭据值。
- **添加/启停/移除语义（need FR-2/FR-4）**：复用 round 1 管理服务已验收的写通道语义（add = settings `update(ns, { servers: … })` 深合并；remove = `{op:'unset'}`；启停 = `{op:'set', enabled}`；ns 均按「settings 命名空间口径」派生）；UI 面不绕过管理服务另起写路径——双入口与 UI 三面共调同一写链路（round 1「单一管理服务共调」契约延续）。
- **空态契约（need FR-5）**：空清单渲染引导文案（指向 `/mcp add` 与对话式添加），无按钮无表单入口（拍板 D4）。
- **失败态契约（need FR-4）**：failed/waiting-credentials 行内联原因线索（官方状态联合体投影）；重试按钮调 `ctx.remote.mcpManager` 的 `restart`/`probe`（probe 不触碰 live instance，disabled 条目可 probe）。
- **发布面预编译扩展（need FR-7）**：prepack 两面编译——Host 面 index.ts → index.js（现行）+ 客户端面源码 → bundle 产物；files 白名单扩为 index.js + cordis.patch.yml + client 产物；postpack 还原不变；`verify-bundle` 扩核 `dsh.client` 声明与 client export 存在（四要素之上第五查）。
- **发布纪律（need FR-6）**：双包顺序照 plugin-assets.md §1.4（先插件包 pack→verify-bundle→publish，再初始化器 verify:pack 三查→publish）；版本随 UI 升级语义化 bump（具体版本号归 design）；发布后核销 = registry 发布版对账 test + `npm view` 版本对账（round 1 残余风险 1 义务清账）；发布前 `npm view` 核验官方兼容星座并留痕（ADR ad91 纪律延续）。
- **infra 侧**：无代码改动预期——编目/菜单/安装转发/对账复用既有机制；verify-bundle 扩核客户端声明属插件侧校验器演进（若落包内 scripts 则随包，落套件 scripts 则套件票承载，归 dev-plan 裁量）。

## 测试决策

- **seam 清单**：①客户端包声明与发布态校验（`dsh.client`/`exports["./client"]`/files 含 client 产物——verify-bundle 扩展 + 发布对账三查）；②Host 侧注册契约（替身 ctx 断言 sidebarRightTabs 定义字段与 disposer 生命周期）；③客户端面板行为（替身 remote 断言 watch 订阅/编辑 ops 形态/凭据未重输不重传/空态渲染/失败内联）；④发布面两面编译（pack 产物含 index.js + client bundle、无 .ts 源码、postpack 还原）；⑤发布后核销（registry 版本对账——沿 round 1 集成测试第二 test 形态）。
- 既有先例：round 1 的 `test/unit/dsh-mcp-plugin.test.ts` 替身契约纪律（官方形状逐条标注来源）、`test/e2e/dsh-mcp-e2e-integration.test.ts` 真跑前置门四条件（node/registry/发布/兼容星座——ADR ad91）；`dsh-plugin-integration` 先例。
- 官方组件真实行为（combo 路由分发、Remote 流、reconcile）以集成级为界，单测不替身官方内部。

## 验收场景

- [FR-7 | 工单级] Given 升级后插件包，When 运行 verify-bundle 扩展校验，Then 四要素 + `dsh.client` 声明 + `exports["./client"]` 存在 + files 含 client 产物齐备即通过；移除任一即拒绝并列缺陷。
- [FR-7 | 工单级] When `pnpm --filter @hankchen/dsh-mcp pack`，Then tarball 含 index.js 与 client 构建产物、不含 .ts 源码；postpack 后仓库树还原（git status 干净）。
- [FR-1 | 工单级] Given 替身 ctx，When 插件 apply，Then `ctx.sidebarRightTabs.register` 收到定义（id = 包名、自定义 kind、title、guide 入口盒）且 disposer 被 ctx.effect 持有；inject 面含 `sidebarRightTabs`/`slots`。
- [FR-1 | 工单级] Given 替身客户端框架，When 客户端模块激活，Then keyed slot `sidebar.right.pane.tab` 按定义 id 注册面板 body，body 内经 `useTabInfo()` 接线。
- [FR-2 | 工单级] Given 添加表单两 transport 形态，When 提交 stdio 条目（command/args/env/cwd）与远程条目（url/headers 含 `${credential:REF}` 模板串），Then 经管理服务 add 路径提交（settings `update` 形态），模板串原样透传不展开。
- [FR-3 | 工单级] Given 行内编辑已配置条目，When 修改非凭据字段保存，Then `mutate(ns, ops[])` 只含被改路径；凭据字段显示脱敏值且未重输时 ops 不含凭据路径（官方保留语义）。
- [FR-4 | 工单级] Given 列表行操作，When 启停/移除/重试，Then 分别对应官方语义（`{op:'set', enabled}` / `{op:'unset'}` / `restart` 或 `probe` Remote 调用）；重试对 disabled 条目走 probe。
- [FR-5 | 工单级] Given 空清单状态，When 渲染，Then 显示引导文案（含 `/mcp add` 与对话式添加指引）且无按钮无表单入口。
- [FR-1 | 工单级] Given 客户端未加载（未发布版或旧版包），When 检视，Then Dock 页注册不发生（客户端包缺失时 Host 注册面与 keyed slot 均不出现），会话内双入口行为不变（need 异常流 C）。
- [FR-6 | 工单级] When 检视发布对账，Then 包内 agents 清单 = 仓库清单、禁 node_modules、bundle 五查（四要素+客户端声明）通过；双包顺序文档一致。
- [FR-8 | 集成级 | 承载票 NNNN] Given 临时 DSH_HOME + 兼容星座真跑组合（ADR ad91 显式钉版）+ 已发布插件包，When 真实 boot dsh web 形态，Then combo 路由分发本包 client bundle（`/plugins/??…` 含本包）、Remote 数据链路断言可用（watch 返回列表、settings 写经 UI 面路径成功落盘 cordis.patch.yml、restart/probe 可调）。〔验收边界注记（20261118-0123 蒸馏）：发布前承载物 = 本地 pack tarball 经官方 plugin add（同一打包面，verify-pack 对账保障）；发布核销后由 registry 对账 test 闭合「已发布」口径。settings 写经 UI 面 = 客户端 api 调用形态，三参 `[ns, patch/ops, expectedRevision]` 必传位（gateway 数参校验层），revision 取写前 describe 同源读值（ADR 20261118-6037）。〕
- [FR-4 | 集成级 | 承载票 NNNN] Given 集成环境同上，When UI 面路径添加一个连不上的 server，Then watch 流推送 failed 状态与原因线索、条目保留、restart 后状态可见，全程不要求重启（need 异常流 A 沿 round 1 集成语义）。
- [FR-6 | 集成级 | 人工：npm publish 属单向门，发布动作在验收时点由维护者执行] Given 双包发布完成，When `npm view @hankchen/dsh-mcp version` 与 `npm view @hankchen/infra` 对账，Then registry 版本与仓库包清单一致、registry 发布版对账 test 通过（round 1 残余风险 1 核销）。
- [FR-1 | 集成级 | 人工：浏览器渲染与点击交互需真浏览器观察（D6 拍板不引入浏览器自动化）] Given dsh web 会话，When 打开右栏 Dock 页走查列含状态/添加/行内编辑/启停/空态/失败内联全操作，Then 呈现与交互符合本 spec 契约且截图留痕（need FR-8 人工段）。
- [FR-1 | 集成级 | 人工：非前台会话的官方既定行为需真浏览器观察] Given 无前台会话的界面状态，When 打开 Dock 页，Then 官方 per-Session 限制行为如实呈现（不可用或官方形态），不报错不破坏（need 异常流 B）。

## 非目标

- 会话内双入口改动（round 1 已验收能力，UI 是第三入口非替代；need 非目标 1）。
- 一级 Settings 页（契约未随 npm 分发，形态 B 已拍板；need 非目标 2）。
- MCP resources/prompts 能力面（need 非目标 3）。
- 桌面端专项适配（预期共享客户端栈 A3，差异留验收记录；need 非目标 4）。
- 视觉细节（配色字体等归 design；need 非目标 5）。
- @hankchen/infra 编目/安装机制改动（零改动预期；need 非目标 6）。
- 浏览器自动化测试依赖引入（D6 拍板：数据链路自动 + UI 人工）。

## 备注

- 修订留痕（票 20261118-08f8，2026-11-18，无人值守运行 spec 20261118-0de6 中修订，status 保持 approved 不降级）：6df0 集成真跑（rc.4 星座多轮取证）实证 round 1 两契约缺陷——①web 组合官方 web 形态 bundle patch 预挂 `mcp-manager` 行与插件无条件 `mcp` 行同供 mcpManager 服务，插件行 duplicate 失败（boot 警告 "1 entry did not activate"）；②官方 Settings 命名空间随行 id 派生，插件写面硬编码 ns `mcp` 在 web 组合全部被拒（`settings/rejected: No configurable plugin entry "mcp"`）。实现决策节据此修订两契约：manager 行组合策略（官方预挂复用 + 插件行补位 + `disabled: !!js` 官方先例条件机制）与 settings 命名空间口径（describe 派生、与实际生效行 id 对齐、不硬编码）。一手探针出处（rc.4 星座在盘可复核）：web 形态 bundle patch 的 mcp-manager 行、dsh-app-boot profileContext 类型与 boot 时序（先 provide 后挂载）、cordis-plugin-loader disabled `!!js` 求值、dsh-settings write/describe 的 ns=entry id 定位与拒写文案、dsh-mcp-manager Config volatile servers schema、rc.4 星座内 servers 配置域唯一性。
- 溯源：need 20261118-11f8（confirmed 2026-11-18，issue #279）；调研 20261117-ced7（issue #269）；round 1 验收 20261118-ef01（issue #275，残余风险 1 = 发布核销义务）；ADR 20261118-ad91（钉版 fail-loud + 集成前置门）、20261115-f143（包根=仓库根）、20261115-f650（发布面预编译）。
- 契约一手来源：`@deepseek-ai/dsh@0.2.2-rc.3` 包内 docs/subsystems/sidebar-right.md（tab 类型注册字段表、keyed slot、foreground Session 限制）与 client-modules.md（`dsh.client` 声明、combo 路由、rebuilt 面）；调研 20261117-ced7 F3.1–F3.5。
- 分轮拍板：round 1 = 全 FR 一轮（2026-11-18 用户认可；依据见方案节）。
- 实现细节选型（客户端构建工具链与产物形态、kind 命名、guide 盒参数、客户端 remote 接线形态、版本号、verify-bundle 扩核落点包内/套件）归 design 与 dev-plan，本 spec 只锁契约。
