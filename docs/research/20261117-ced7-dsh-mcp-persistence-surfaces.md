---
id: 20261117-ced7
created: 2026-11-17
---
# dsh MCP 管理插件三问调研：运行时持久化 × 双入口形态覆盖 × Web UI 管理面

## 调研问题与用途

- **Q1** 对话内 MCP 配置变更经何种机制持久化、落到哪个文件、HMR 如何反应？——堵 FR-3 实现路线（官方持久链路 vs 插件自管配置文件）；影响 need 20261117-ea73 的 FR-3 与假设 A1。
- **Q2** `ctx.commands` 人类命令与 `ctx.tools.register` 模型工具在 web / tui / headless / sdk / sdk-minimal / acp 各运行形态的可见性与交互约束？——堵 FR-1 交互面范围；影响 FR-1 与假设 A2。
- **Q3** dsh 内置 Web Client 的插件 UI 扩展机制能否承载对标 zcode Settings→MCP 的管理页、mcp-manager 的管理面服务如何被 UI 消费？——为 need 非目标 2「Web 管理面不做」是否松动供事实与成本量级；只产事实，方向取舍归决策卡。

检索方式：三个后台子代理并行，材料为五个官方 npm 包解包产物（全部一手来源），关键结论已由主会话回原文逐条抽验吻合。探针目录 `/tmp/dsh-probe/`（临时），下文来源一律以 **包名@版本 + 包内路径** 记录，读者重新 `npm pack <包名>@<版本>` 解包即可复核。

## 结论速览

- **Q1**：官方持久链路端到端存在——插件经 `ctx.settings`（写通道委托 `ctx.configEditor`）对 `mcp` 命名空间写 `servers`，落盘 `$DSH_HOME/profiles/<profile>/cordis.patch.yml` 并热同步进运行时（volatile 提交不重挂载），重启保留；`fiber.update()` 直改与 `mcpManager.register()` 均不满足「重启保留」。（来源 1/2/8/10）
- **Q2**：模型工具全形态可用（逐步组装 schema，运行时增删有成熟机制）；人类命令实际可达面 ≈ web + sdk 两个形态（headless 组合存在但无触发面、acp 无证据、sdk-minimal 无命令子系统）；官方 mcp-manager 只在 Web/Desktop profile 挂载——插件需自带挂载行。（来源 5/6/7/12）
- **Q3**：Web Client 插件 UI 扩展机制丰富（含设置页级扩展点，但契约文档未随 npm 包分发）；mcp-manager 管理面已全 Remote 化（`ctx.remote.mcpManager` 的 watch/restart/probe）但**无任何官方 UI 消费页**；对标 zcode Settings→MCP 页成本量级【判断】中偏薄——数据面零成本，缺口在 UI 载体与客户端 bundle 构建。（来源 13/14/15/16）

## Q1 持久化机制与落点

**F1.1 Cordis 核心只发事件、不落盘；dsh profile 的 patch 行运行时变更不重启存活。** `fiber.update(config)` 默认（`noSave=false`）仅 `emit('internal/commit', fiber, config)`（来源 2，`src/fiber.ts:783-788`）；持久化执行者是 vendored Loader/Include 栈。Loader 升级指南明示：「Runtime changes to rows inserted by patches … update the parent's patches … **The parent of the `dsh` profile's root Include is the in-memory Loader**, so such changes … no longer survive a restart」（来源 1，`docs/upgrade-guide/v0.2.2-alpha.2/cordis-loader-entry-trees/guide.md:18`）。故插件直接 `fiber.update()` 改 patch 行的写回只进内存。

**F1.2 `Volatile<T>` 语义：volatile-only 变更热提交进运行引用、不重挂载；持久性取决于写入通道。** 「Loader commits volatile-only changes into the running references without restarting and notifies the owning fiber through `loader/volatile-update`」（来源 2，README.md:103-105）；「A volatile-only change … commits the new values into the running references and emits one instance-local `loader/volatile-update` … bypassing the target plugin's `internal/update`」（来源 1，`docs/cordis-tutorial/05-config.md:93-95`）。经 Settings/ConfigEditor 或手改 patch 文件来的 volatile 变化写在 patch 文件里 → 重启仍在；仅经内存 API 提交的 → 重启即失。

**F1.3 mcp-manager 自身无配置写方法；插件侧 `register()` 是生命周期内临时注册。** 「Configuration writes stay on the Settings Remote; **the manager adds no write method**, so a browser cannot define a server command」（来源 3，README.md:114）；「A registration lasts for the calling plugin's lifetime … the registration's disposal unmounts the server」（来源 3，README.md:104）。运行时公开面：`list(): McpManagedServerView[]`（`src/index.ts:269`）、`@Remote watch(signal)` 订阅即推全量、变更续推（`src/index.ts:313`）、`@Remote restart(name)` 替换实例并重置重连预算（`src/index.ts:347`）、`@Remote('probe') probeFromClient(name, signal)` 独立探测（`src/index.ts:363`）。manager 监听 `loader/volatile-update` → `entriesChanged('config reconcile')` → 串行 reconcile（`src/index.ts:240-252`）。

**F1.4 官方持久正道 = Settings → ConfigEditor，写 profile 的 cordis.patch.yml。** `ctx.configEditor`：「Persists profile config patches **under the application file lock and HMR queue**, then reconciles Loader entries」（来源 5，`docs/capability-seams.md:703`）；`ctx.settings`：「Forms project volatile Config fields from active profile entries and delegate validated edits to config-editor」（`capability-seams.md:704`）。落点文件由官方文档直陈：「Configure the reasoning levels … in `$DSH_HOME/profiles/<profile>/cordis.patch.yml`, **the same document the page writes** … the adapters re-read it on the next request, so nothing needs a restart」（来源 1，`docs/user/guide/providers.md:56-58`）。写语义：`update` 合并 / `replace` 重置继承 / `mutate` 按路径，「Every write validates the complete Config and refuses stale revisions before persistence」（来源 5，`docs/subsystems/settings.md:13`）。mcp-manager 侧确认：「Settings writes persist through ConfigEditor with revision checks; Loader updates the volatile configuration without remounting the manager」（来源 3，README.md:80），且写时校验拒绝坏条目——「a missing `command`, a cross-transport field, a malformed template … is refused at the write, so the document never stores a server the manager cannot act on」（README.md:80）。

**F1.5 插件运行时调 Settings 可达；官方 agent 先例是另一条路（configuration-only bundle）。** `ctx.settings` 为核心服务可被插件 inject；官方对 agent 运行时接 MCP 的推荐先例：「The agent writes a configuration-only bundle whose patch inserts `@deepseek-ai/dsh-mcp-client`, then installs it with `plugin_manager install_bundle`. With HMR enabled, the tools appear in the same running session」（来源 1，`docs/user/develop/practice/dynamic-cordis.md:13`）——该先例适合「静态声明一条 mcp-client」，不适合管理 manager 的 servers 表（两案并存，按需求选择）。未找到任何一手示例展示「插件在 apply 内直接 `fiber.update` 改别人配置并持久化」。

**F1.6 HMR 边界。** `dsh-hmr`（启用时）watch profile manifest + profile patch + home patch，变更经「one serialized reload」全层重组合；Loader 按 id diff 只 mount/unmount/reconfigure 变化项，volatile-only 变更被吸收为运行引用提交、不重挂载目标插件（来源 1，README.md:37 + `docs/cordis-tutorial/06-composition-and-hmr.md:44-59`）。形态差异：base 启用 config-only HMR；**headless/SDK/ACP 关闭、sdk-minimal 无、Web 当前 disabled**（`docs/architecture.md:27`；web-app patch 内 `id: hmr  disabled: true` 带 TODO「Re-enable shared HMR for Web」）。Settings→ConfigEditor 链路不依赖文件 watcher（configEditor 自己 reconcile Loader entries，`capability-seams.md:703`），故 Web 下会话内 Settings 写仍即时生效；手改 patch 文件在无 HMR 形态需重启。

## Q2 双入口形态覆盖

**F2.1 `ctx.commands` 是「交互适配器消费」的注册表：注册跟随 profile 组合，触发依赖适配器存在。** 「Interactive adapters use it to discover and directly execute plugin-owned commands for an exact agent without creating a model message」（来源 1，`docs/subsystems/commands.md:5`）；Remote 面 `@Remote list(agent)`（:157）/ `@Remote async execute(agent, line, …)`（:195），`commands/change` 事件驱动 UI 刷新（:208-219）。
- **web**：完整消费方——composer 的 `'/' | '@'` 管线（ui-slash）+ `ui-command` 命令面板（来源 13，web-app patch:191-197）。
- **sdk**：程序化消费方——`run()` 按 definition 身份识别原生命令，`/plan <task>`、goal 创建/恢复在 SDK 语义内等待完成（来源 1，`docs/upgrade-guide/v0.2.2-alpha.2/sdk-run-commands/guide.md`）。
- **headless**：一次性 runner（`dsh --profile headless "job"` 跑完即退，`docs/config-catalog.md:1714-1727` app 配置仅 task/sessionId/json/permissionMode/approvalPolicy）；命令在组合中注册但**未找到一手来源**证明存在调用 `execute()` 的适配器。
- **acp**：automation-only 协议，**未找到一手来源**证明暴露命令面。
- **sdk-minimal**：不装 dsh-base，命令子系统整体缺席，「unsupported slash input remains ordinary prompt text」（`docs/user/guide/python-sdk.md:194`）。
- **tui**：非出厂形态（出厂模板仅 web/headless/sdk/sdk-minimal/acp，`docs/architecture.md:17`；README 仅作「假设已安装」示例）。

**F2.2 模型工具全形态可用；运行时增删有成熟逐步准入机制。** 工具 schema 在每个步骤组装请求时由 `schemas()` 投影，`AgentLoop` 每拟议步骤调用 `ctx.tools.resolve()` 一次（来源 1，`docs/subsystems/tools.md:11,182`）；会话中途变化：`when` 条件逐步解析、步骤中途移除使未开始调用返回 `UNKNOWN_TOOL`、`tools/change` 事件通知、ToolSearch 用 scoped `restrict()` 替换（`docs/upgrade-guide/v0.2.1-rc.2/conditional-tools/guide.md`）。MCP 重挂载的工具空窗是既定行为：「A rebuild has a tool gap — its tools disappear from the model's set until the new instance finishes its initial sync」（来源 3，README.md:180）。

**F2.3 profile 构成与 MCP 管理器的挂载面。** 「[`dsh-base`] is the shared first layer of the `web`, `headless`, `sdk`, and `acp` profiles … [`dsh-sdk-minimal`] … does not apply `dsh-base`」（来源 1，`docs/architecture.md:23`）。**官方 mcp-manager 只被 Web 与 Desktop profile 挂载**：「The Web and Desktop profiles mount it as the `mcp-manager` row of `dsh-web-app`」（来源 3，README.md:28）——headless/sdk/acp 出厂组合**不含** MCP 管理器，本插件需自带挂载行；同段还给出两个实现注意：Settings 用条目 id（web 上为 `mcp`）作命名空间；含凭据模板时组合行需 `inject: [credentials]`。

**F2.4 官方命令先例的形态差异（佐证「同插件不同形态行为不同」）。** `command-goal`/`command-compact` 装在 dsh-base（来源 12，base patch:247-248,274-275）；web-app 禁用 `plan-mode`（patch:300-301）与 `command-compact`（:309-310）——web 的命令可达面由宿主 bundle 的 disable/移交决定；`/loop` 不是命令插件，是 `turn/end` 事件上 `followup()` 的模式（`docs/cookbook/extension-cookbook.md:108`）。

**J2.5【判断】双入口的形态覆盖面。** 人类命令实际可达 ≈ web（交互）+ sdk（程序化）；headless 无人输入、acp 对端为自动化程序、sdk-minimal 无命令子系统。模型工具入口全形态可达（组合包含该插件即可）。官方生态同时存在「全形态双入口」（/goal 的 command+tool 双 producer）与「限 web 的管理面」（mcp-manager 仅 Web/Desktop）两种铺法，本插件两者皆合法。此为事实推断，铺开面取舍归 dev-spec。

## Q3 Web UI 管理面

**F3.1 Web Client 是浏览器端 Cordis 应用，插件经客户端包机制进浏览器。** 「The Web Client is a browser-side Cordis application assembled from independently loaded plugins」（来源 1，`docs/subsystems/web-client.md:5`）；「A package joins the table by declaring `dsh.client` … and exporting its built bundle at `exports["./client"]`」（`docs/subsystems/client-modules.md:94`）。dsh-web-app 是「浏览器表面 bundle」：叠在 dsh-base 上插 webserver/网关行 + 约 30 个 `ui-*` 客户端插件 roster（来源 13，web-app patch）。构建注意：「The `clientBundle` tsdown preset that emits it lives in `packages/client/tsdown.client.ts` rather than in a published package, so a package outside this repository reproduces that build itself」（`docs/cookbook/adding-a-settings-card.md:60`）。

**F3.2 插件 UI 扩展机制全集（八类，来源 1 `docs/subsystems/`）。** ① ConversationNodeDefinition 会话内业务节点；② Web Client Slots（`ctx.slots.register/inject`，header/composer/fence 等壳位）；③ **设置页 + 导航图标扩展点**（`slots.md:17`：「[ui-settings] documents the settings page and navigation-icon extension points」——详情文档属仓库内部 `packages/client/ui-settings/README.md`，**未随 npm 包分发**）；④ Plugins 页 slots（`plugins.detail.actions/.badge/.section`）；⑤ 插件 volatile Config 字段自动渲染为设置卡片（schema 驱动表单）；⑥ 右栏 Sidebar tab（`ctx.sidebarRightTabs.register`，shipped 先例：文件树/browser/文档预览；限制：「All tabs require a foreground Session」，`sidebar-right.md:110`）；⑦ root 级菜单 slots；⑧ 客户端包载体本身。

**F3.3 mcp-manager 管理面已全 Remote 化，但无官方 UI 消费页。** 「Browser clients reach the manager as `ctx.remote.mcpManager`」（来源 3，README「Remote operations」段）；服务面 watch/restart/probe 见 F1.3。「Settings-driven」的 Settings 即官方 settings 子系统：`ctx.settingsController` 提供 `@Remote describe/update/replace/mutate`（读永远 redact secrets，来源 5，`docs/subsystems/settings.md`）。**未找到一手来源**证明存在已发布的 MCP 管理页：web-app@0.0.1-rc.1 的 lib grep `mcp` 零命中；`config-catalog.md:5122-5130` 的 `ui-settings-*` 清单（general/account/models/agent-loop/plugin-inventory/plugins/session-log/shell/subagent/web-search）**无 `ui-settings-mcp`**；web-app patch roster 无 mcp 行。版本注记：`dsh@0.2.2-rc.3` 的 package.json 依赖 `@deepseek-ai/dsh-web-app@0.2.2-rc.3`，而 npm 实验线 web-app 最新仅 0.0.1-rc.1——较新组合的前端产物不在本次探针内，无法验证其是否已内置 MCP 管理页。

**F3.4 对标 zcode Settings→MCP 页的现成度【判断】。** server 列表（`watch()` 流）与连接状态数据（`McpManagedServerStatus` 联合体含 failed/load.lastError/cleanup）——数据面现成，UI 呈现自写；启停（volatile `enabled` 经 Settings mutate 写 + `restart()` Remote）——半现成；编辑配置（Settings 表单系统：schema 驱动、revision 冲突检查、secret redact、`${credential:}` 校验）——现成但为通用表单非 MCP 专用编辑器；承载页本身——缺口（设置页级扩展点存在但契约文档在仓库外不可得，右栏 tab 是 per-Session 非 Settings 形态）。功能边界：用户层只能删除自己加的 server（inherited 只能覆盖/禁用）；无 OAuth 流程（来源 3，README.md:178）。

**J3.5【判断】成本量级：中（偏薄）。** 数据面接线零开发（watch/restart/probe + Settings Remote 全现成）；中等部分为自定义 React 页 + Remote 接线 + slots/tab 注册 + 复刻客户端 bundle 构建（lazy-CJS factory 格式，官方 preset 不随包分发）+ `dsh.client` 声明；官方先例充足（`ui-settings-plugin-inventory` 消费 `ctx.pluginManager` 即同类「Host 服务 + settings UI 包」模式）。滑向「厚」的风险项：若必须做独立一级 Settings 页，扩展点契约需逆向或依赖未分发文档，存在需上游配合的真实可能。「薄」档不成立——无现成 UI 可只消费。

## 对本项目的映射要点

- **FR-3 实现路线（Q1）**：「会话内增删启停 + 重启保留」官方链路端到端支撑存在：插件 inject `ctx.settings` → 对 `mcp` 命名空间 `update('mcp', { servers: … })` → ConfigEditor 落盘 profile cordis.patch.yml + volatile 热提交 → manager 自动 reconcile。**插件自管配置文件方案无必要**；`fiber.update()` 直改与 `register()` 临时注册均不满足重启保留，应排除出 FR-3 候选路线。选型拍板归 dev-spec/design。
- **FR-1 交互面（Q2）**：双入口可行；人类命令可达面 ≈ web + sdk，headless/acp/sdk-minimal 受组合或机制限制；模型工具全形态。**插件必须自带 mcp-manager 挂载行**（官方只挂 Web/Desktop，自定义 profile 的 headless/sdk/acp 不含）。实现注意两条：Settings 命名空间取条目 id；凭据模板需 `inject: [credentials]`。
- **非目标 2（Q3）**：Web UI 管理面技术可行、成本【判断】中偏薄、无现成页可消费；是否捡回范围归用户决策卡（调研不拍板）。若捡回，优先评估 Plugins 页注入或右栏 tab（契约可得）而非一级 Settings 页（契约未分发）。
- **A3 版本漂移印证**：web-app npm 实验线（0.0.1-rc.1）与 dsh 0.2.2-rc.3 依赖的 web-app@0.2.2-rc.3 错位真实存在；mcp-manager 挂载行的形态以较新组合为准，实现时请复核（快照意识：本报告只对 2026-11-17 负责）。
- **遗留（未找到一手来源）**：① 「哪个插件可改全局 MCP 面」的权限/策略约束（settings 文档未声明调用方限制）；② dsh-web-app@0.2.2-rc.3 前端产物是否已内置 MCP 管理页；③ headless/acp 是否存在命令适配器。三者实现前按需补查。
- **调研未否掉任何已立项方案**；非目标清单无需增删（Q3 事实供决策卡，不动 need）。

## 来源清单（检索日期 2026-11-17）

一手来源（npm 包，检索时解包于 `/tmp/dsh-probe/`，路径以包内相对路径记录）：

1. `@deepseek-ai/dsh@0.2.2-rc.3`（官方 CLI + 文档全集；`docs/`、`src/`）
2. `@deepseek-ai/cordis@4.1.0`（Cordis 框架；`README.md`、`src/fiber.ts`、`src/events.ts`）
3. `@deepseek-ai/dsh-mcp-manager@0.2.2-rc.2`（`README.md`、`src/index.ts`、`src/types.ts`）
4. `@deepseek-ai/dsh-web-app@0.0.1-rc.1`（npm 实验线最新；`README.md`、`cordis.patch.yml`、`lib/`）
5. `@deepseek-ai/dsh-base@0.0.1-rc.1`（`cordis.patch.yml`）

包内文档引用一览：`docs/subsystems/{commands,tools,settings,web-client,client-modules,slots,sidebar-right,conversation}.md`、`docs/capability-seams.md`、`docs/config-catalog.md`、`docs/architecture.md`、`docs/cordis-tutorial/{05-config,06-composition-and-hmr}.md`、`docs/cordis-api/{fiber,context,inherited}.md`、`docs/cookbook/{extension-cookbook,adding-a-settings-card}.md`、`docs/user/guide/{mcp-memory,providers,python-sdk}.md`、`docs/user/develop/practice/dynamic-cordis.md`、`docs/upgrade-guide/v0.2.2-alpha.2/{cordis-loader-entry-trees,sdk-run-commands}/guide.md`、`docs/upgrade-guide/v0.2.1-rc.2/conditional-tools/guide.md`。

zcode 侧对标形态（非本次研究问题，供 Q3 对标）：zcode 官方插件 `zcode-guide:diagnosing-mcp` 技能文档（本机 `~/.zcode/cli/plugins/cache/`，Settings→MCP 页功能面）。
