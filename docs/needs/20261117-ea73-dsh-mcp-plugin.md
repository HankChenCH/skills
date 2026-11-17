---
id: 20261117-ea73
status: confirmed
created: 2026-11-17
confirmed: 2026-11-17
---
# infra 第二款 dsh 插件：MCP 对话内管理插件（对标 zcode 配置体验）

## 背景与业务目标

发起人（套件维护者）在日常使用 dsh 时发现：zcode 可以用声明式配置给智能体挂 MCP 扩展（`mcp.servers` / 插件 `.mcp.json`，Settings → MCP 管理面），而 dsh 接外部系统「十分不方便」（原话「在使用过程中发现dsh没有，像zcode一样可以配置mcp给智能体的扩展。导致dsh想要接外部系统调用十分不方便」2026-11-17）。**内联查证修正了事实前提**：dsh 并不缺 MCP 能力，缺的是配置体验——

- **dsh 官方 MCP 三件套均已发布 npm（2026-11-17 实证）**：`@deepseek-ai/dsh-mcp-client`（单 server 连接器：stdio / streamable-http 双 transport，工具以 `mcp__<serverName>__<tool>` 暴露，`${credential:…}` 模板展开 + 诊断脱敏，自动重连策略）；`@deepseek-ai/dsh-mcp-manager`（`Volatile` 配置驱动的 server 舰队：按 servers 配置 reconcile mcp-client 实例、聚合连接状态、向管理面提供 restart/probe 服务）；`@deepseek-ai/dsh-mcp-resources`（MCP resources 访问）。
- **现状痛点**：官方只提供 default-off 示例 overlay（memory 三个 server 的 cordis patch YAML），启用方式是 `--patch` 一次性传参或手改 profile 的 `cordis.patch.yml`；没有声明式管理入口，mcp-manager 的 restart/probe 管理面服务无用户可见消费者（来源：官方包内文档 mcp-memory.md、capability-seams.md、config-catalog.md，`@deepseek-ai/dsh@0.2.2-rc.3` tarball，2026-11-17）。
- **宿主框架已备好的承载**：Cordis `Volatile<T>` 配置可热提交进运行时引用（不重启生效，`loader/volatile-update` 通知），`fiber.update()` 的 commit waterfall 自带持久化请求（来源：`@deepseek-ai/cordis@4.1.0` README，2026-11-17）；`ctx.commands` 是官方人类命令注册面，`/plan` 即插件注册先例（来源：官方包内 docs/subsystems/commands.md、plan.md，2026-11-17）。

本票做**第二款 dsh 插件**（首个真实功能插件，承接 need 20261115-339e 非目标 1 预留）：一款 dsh bundle 插件，把官方 mcp-manager 挂进插件树，并提供**对话内管理**入口（用户拍板 2026-11-17，缺口重心只选此项），使 dsh 使用者不手写 Cordis patch YAML 即可增删启停 MCP server。

可验证业务目标：安装本插件后，dsh 使用者在会话内用对话内命令添加一个 stdio 或远程 HTTP MCP server，其工具（`mcp__…`）出现且可用；配置跨重启保留；全程不手写 YAML。不做的代价：dsh 用户接外部系统持续手写 Cordis patch、mcp-manager 舰队管理能力闲置、套件第二款插件无真实功能样例。

## 干系人与用户

| Actor | 要完成什么 | 成功标准 |
|---|---|---|
| dsh 使用者 | 会话内对话式增删启停 MCP server（stdio / 远程 HTTP 两类），不用学 Cordis patch 语法 | 添加后 `mcp__<名>__<工具>` 出现且可调用；移除/停用后消失；重启后配置保留；连接状态可查询 |
| infra 使用者 | 经 `npx @hankchen/infra` 的 `plugin add` 把本插件装进目标 dsh profile | 照 339e 流程完成安装，profile 落盘形态与官方格式一致（bundles 清单 + 依赖行） |
| 套件维护者 | 获得第二款插件的生产样例（真实功能插件照抄模板） | 照 339e 规范（四要素/发布面预编译/双包顺序）可独立演进与发布 |
| dsh 宿主 | 消费插件产物，官方命令可持续管理（开关/卸载） | 产物经官方 `dsh plugin add` 等价路径产生，插件树组合不破坏其他层 |

## 系统能力需求

- **FR-1** 插件加载后，dsh 会话内提供对话内管理入口，支持：列出（含连接状态）、添加、移除、启停 MCP server（原话「缺口重心=对话内管理」拍板 2026-11-17）。入口形态=**双入口**（拍板 D3 2026-11-17）：人类命令（`ctx.commands`，如 `/mcp …`）供使用者直接操作 + 模型可调用的管理工具供模型代办（「帮我加个 server」）。
- **FR-2** 添加 stdio server 支持配置：`command` / `args` / `env` / `cwd`；添加远程 server 支持配置：`url` / `headers`（两类 transport 都在范围，拍板 2026-11-17；字段对齐官方 `McpManagedServerEntry` 平铺结构）。
- **FR-3** 对话内做出的配置变更（添加/移除/启停）**跨重启保留**——持久化由插件负责，使用者不手写任何 YAML（能力要求；持久化机制归 spec/design，见 RQ1）。
- **FR-4** 配置变更即时生效路径：已运行连接的启停不要求重启 dsh（依托 Cordis Volatile 热提交；启动失败/重连预算耗尽的降级行为参照 mcp-client 既有语义）。
- **FR-5** 凭据不进明文清单：敏感值支持 `${credential:…}` 模板引用（对齐 mcp-client 既有展开与脱敏语义），体验层面怎么引导归 spec。
- **FR-6** 经 infra CLI `plugin add` 可安装进任意非 `desktop` profile（照 339e：编目条目、官方命令转发、安装后两落点对账、desktop 拒装）。
- **FR-7** 插件包为独立 npm 包，包名 `@hankchen/dsh-mcp`（陈述句 2026-11-17 无纠错沿用，命名沿 demo 先例），照 339e 全套规范：package.json 四要素 + `engines.dsh`、cordis.patch.yml 以包名引用自己、发布面预编译、双包发布顺序。
- **FR-8（验收线，拍板 D4）** 端到端验收：集成测试真跑官方 dsh（照 339e 集成级真跑先例进一层）加载本插件，经对话内入口添加 server 后对应 `mcp__…` 工具真实出现且可调用、配置跨重启保留（原话「端到端验收」拍板 2026-11-17）。
- **FR-9（调研交付物，方法论拍板 D1）** dev-research 产出系统调研报告作为 dev-spec 前置输入，覆盖两问（归置自 RQ1/RQ2）：① 对话内变更的持久化机制与落点（Cordis `fiber.update()` commit waterfall vs 插件自管配置文件）——堵 FR-3 实现路线；② `ctx.commands` 与模型工具两类入口在 web / tui / headless 各运行形态的可见性与交互约束——堵 FR-1 交互面范围。

## 场景

**主流程（安装 → 对话内接入一个远程 server）**
- Given 使用者已有 dsh profile（如 `web`），node ≥ 24.9.0
- When 跑 `npx @hankchen/infra`，`plugin add` 勾选本插件、选定 profile
- Then 官方命令转发安装，profile package.json 两落点齐备（FR-6）
- When 使用者进入 dsh 会话，用对话内管理入口添加远程 server（url + 鉴权 header 用凭据模板）
- Then 该 server 的 `mcp__<名>__<工具>` 出现在会话工具中且可调用（FR-1/FR-4）
- When 重启 dsh 再进会话
- Then 该 server 仍在清单中并自动连接（FR-3）

**异常流 A（连接失败）**：When 添加的 server 连不上（stdio 命令不存在 / url 不可达），Then 管理入口可查询到失败状态与原因线索（依托 mcp-manager 状态聚合），server 条目保留可修复（改配置或移除），不要求重启 dsh。〔依托 FR-4；重连预算耗尽注销语义沿 mcp-client 官方行为〕

**异常流 B（desktop profile）**：When 使用者选 `desktop` 装插件，Then 拒装并提示（照 339e，官方保留名）。

**异常流 C（registry 不可达）**：插件包经 npm registry 分发，README 给缓解路径（承 339e 同款口径）。

## 假设与风险

- **A1（风险→已归置）持久化机制选型**：对话内变更落到哪——Cordis `fiber.update()` 官方持久化链路，还是插件自管一份独立配置文件？影响 FR-3 实现路线；选错则迁移成本高。**已转 FR-9 调研交付物**（dev-research：mcp-manager 的 Volatile 配置写入路径 + Cordis commit waterfall 的持久化落点 + dsh-hmr 对 patch 文件改动的反应）。
- **A2（风险→已归置）命令入口在各运行形态的可用性**：两类入口在 web / tui / headless 各形态的可见性与交互约束（headless 一次性任务里人类命令无意义）。影响 FR-1 交互面范围。**已转 FR-9 调研交付物**。
- **A3（风险）官方组件版本漂移**：三件套中 mcp-resources 尚在 0.1.6-alpha、manager 0.2.2-rc.2 与 CLI latest（0.2.2-rc.1）版本错位，接口仍在快跑。代价：插件 pin 的引擎范围与 config 形态需跟进；不确定度：中。缓解：照 339e A2 同款收敛——只依赖官方公开 Config schema（config-catalog 生成物），不自实现落盘逻辑。
- **A4（假设）`engines.dsh` 校验对依赖包的适用面**：插件依赖 mcp-manager 后，版本豁免语义是否同样覆盖依赖包，以官方行为为准。5 分钟查证成本高（需真跑），转假设交 spec 实测。

## 范围与非目标

非目标（全部显式拍板，来源见开放问题）：
1. **配置文件驱动的用户编辑面不做**——用户不手写 YAML 是 FR-3 的能力要求，但「给使用者一份可手工编辑的声明式配置文件」不在范围（缺口重心拍板 2026-11-17 只选对话内管理）。
2. **Web 管理面（GUI 状态页/开关）不做**（缺口重心拍板 2026-11-17 未选）。
3. **特定 server 开箱包装不做**（如官方 memory 示例的开箱即用 bundle；缺口重心拍板未选，后续可另立轮）。
4. **MCP resources / prompts 能力面不做**——只管 server 舰队的工具接入；`ctx.mcpResources` 消费后置。
5. **插件自带 MCP server 形态不做**（zcode browser-use 式「插件即 server」是 zcode 侧形态，本票插件是 manager 挂载 + 管理入口）。
6. **不实现自有 MCP 协议栈**——连接、重连、凭据展开、状态聚合全部复用官方三件套，插件只做挂载与管理入口（拍板随蓝图确认 2026-11-17：缺口是配置体验不是能力）。

## 开放问题

（三路归置完成，开放问题清零；以下为拍板与归置记录）

- **D1 拍板** → 方法论=调研驱动（答复 2026-11-17；去向 FR-9 调研交付物）。
- **D2 拍板** → 接入场景=stdio 本地进程 + 远程 HTTP 两类都要（答复 2026-11-17；去向 FR-2）。
- **D2 拍板** → 缺口重心=只选「对话内管理」（答复 2026-11-17；去向 FR-1、非目标 1/2/3）。
- **D2 拍板** → 范围分发=通用插件 + infra 目录（答复 2026-11-17；去向 FR-6/FR-7）。
- **D3 拍板** → 入口形态=双入口（人类命令 + 模型工具；答复 2026-11-17；去向 FR-1）。
- **D4 拍板** → 验收线=端到端（真跑 dsh 加载 + 对话内添加生效；答复 2026-11-17；去向 FR-8，非目标 6 由待定改述为「不实现自有协议栈」）。
- **陈述句** → 包名 `@hankchen/dsh-mcp` 无纠错沿用（2026-11-17；去向 FR-7）。
- **归置 RQ1** → 持久化机制选型转 FR-9 调研交付物（调研报告是交付物，方法论 D1；去向 FR-9/A1）。
- **归置 RQ2** → 入口各形态可见性转 FR-9 调研交付物（去向 FR-9/A2）。

## 定稿记录

2026-11-17 念稿七节全貌，用户确认「确认」。D3=双入口、D4=端到端验收、包名陈述句三项均在念稿前拍板/无纠错沿用，随稿一并定稿。内联查证结论（官方三件套形态、Volatile/ctx.commands 承载、zcode 配置分层）以 2026-11-17 官方 tarball 与本机配置为据写入背景节；系统调研两项留待 FR-9 交付。
