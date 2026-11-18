---
id: 20261118-11f8
status: fulfilled
created: 2026-11-18
confirmed: 2026-11-18
fulfilled: 2026-11-18
---
# dsh MCP 管理面图形界面（右栏 Dock 页）+ 插件包发布核销

## 背景与业务目标

need 20261117-ea73 round 1 已完整闭环（验收 20261118-ef01 passed：插件 `@hankchen/dsh-mcp` 0.1.0 实现对话内双入口管理——`/mcp` 命令 + 模型工具，经官方 Settings→ConfigEditor 链路持久化）。D5 拍板（2026-11-17）预留「Web UI 管理面独立后续轮，届时以本插件为载体再评估」——本票就是那一轮。

**评估依据已备好**（调研 20261117-ced7 Q3）：Web Client 插件 UI 扩展机制八类；mcp-manager 管理面已全 Remote 化（`ctx.remote.mcpManager` 的 watch/restart/probe）但无官方 UI 消费页；成本【判断】中偏薄——数据面零成本，缺口在 UI 载体与客户端 bundle 构建（官方 clientBundle preset 不随 npm 包分发，外部包需自行复刻）。

**原型走查拍板（2026-11-18，双形态可点原型 /tmp/need-mcp-ui-mock.html）**：承载形态 = **右栏 Dock 页**（形态 B，`sidebarRightTabs` 契约可得；否掉形态 A「Plugins 页详情区块」——原型对比后用户点名 B）；空态不放「添加」入口（空态只引导会话内添加方式文案）；编辑 = **行内编辑**（否掉「删除重建」，官方 Settings `mutate` 语义现成支撑：读永远 redact secrets、未重输的凭据保留原值）。

**发布前置（拍板 2026-11-18：发布前置进本轮）**：插件包 0.1.0 未发布（`npm view` E404 实测；验收 20261118-ef01 残余风险 1，核销义务挂发布后）——本票范围含发布：按 plugin-assets.md §1.4 双包顺序 publish 后核销 registry 发布版对账，UI 集成验收以已发布包为前置。

可验证业务目标：发布完成后，dsh web 使用者在右栏 Dock 页**图形化完成全部 server 管理**——列出（含连接状态）、添加、启停、行内编辑、移除——全程不敲命令、不唤模型；发布后 registry 发布版对账核销（残余风险 1 清账）。不做的代价：图形化管理体验缺位，UI 轮持续悬挂，round 1 验收留痕的发布义务不闭环。

## 干系人与用户

| Actor | 要完成什么 | 成功标准 |
|---|---|---|
| dsh web 使用者 | 右栏 Dock 页图形化管理 MCP server：列含状态、添加、启停、行内编辑、移除 | 操作即时生效（依托 round 1 官方 reconcile 链路）；重启保留；凭据不重输即保留；失败状态与原因内联可见 |
| infra 使用者 | 经 `npx @hankchen/infra` 装已发布的 `@hankchen/dsh-mcp`（含 UI 能力） | registry 版本与仓库一致（残余风险 1 核销）；发布版对账 test 通过 |
| 套件维护者 | 执行发布单向门（双包顺序）；获得第二款插件 UI 轮样例 | 发布后核销义务闭环；客户端包构建形态可复制（官方 preset 不分发，自行复刻的先例价值） |
| dsh 宿主 | 消费客户端包（`dsh.client` 声明 + 右栏 tab 注册） | 官方命令可持续管理；不破坏既有插件树组合 |

## 系统能力需求

- **FR-1** 插件向 dsh Web Client 注册**右栏 Dock 页**（形态 B 拍板 2026-11-18）：MCP server 管理面板，含列表（名称/transport/连接状态/工具数）与失败详情内联（failed 原因线索、waiting-credentials 提示）。〔来源：原型走查拍板；依托 ced7 F3.2 `sidebarRightTabs` 契约〕
- **FR-2** Dock 页内**添加** server：stdio（command/args/env/cwd）与远程（url/headers）两 transport 字段录入，凭据走 `${credential:…}` 模板串（round 1 契约延续）。〔来源：原型走查 + need 20261117-ea73 FR-2 同款字段〕
- **FR-3** Dock 页内**行内编辑**（拍板 2026-11-18）：可编辑已配置 server 的字段并保存（写通道 = 官方 Settings `mutate` 语义：凭据字段显示脱敏值、未重输即保留原值；写时官方全量校验 + revision 拒旧）。〔来源：原型拍板 + ced7 F3.3/F1.4〕
- **FR-4** Dock 页内**启停与移除**：启停即时生效（官方 reconcile：禁用卸载连接、条目保留；重建单实例）、移除即从清单消失；failed 条目可触发官方 `restart`/`probe`。〔来源：原型走查可点交互 + round 1 FR-4 语义复用〕
- **FR-5** 空态**不放添加入口**（拍板 2026-11-18）：空清单显示引导文案（指向会话内 `/mcp add` 或对模型说「帮我加一个 MCP server」），无按钮。〔来源：原型空态拍板〕
- **FR-6** **发布核销**：按 plugin-assets.md §1.4 双包顺序发布 `@hankchen/dsh-mcp`（含 UI）与初始化器，发布后跑 registry 发布版对账 test + `npm view` 版本对账（验收 20261118-ef01 残余风险 1 的核销义务）。〔来源：验收报告下一轮建议第一条 + 拍板「发布前置进本轮」〕
- **FR-7** 插件包演进为含客户端能力形态：package.json 增 `dsh.client` 声明与 `exports["./client"]`（ced7 F3.1 客户端包机制），bundle 清单与版本演进照 339e 规范（UI 加入后语义化版本升级）。
- **FR-8（验收口径，拍板 D6）** 双层验收：① 数据链路自动回归——集成级真跑 dsh web 断言客户端包加载成功 + Remote 数据链路（`ctx.remote.mcpManager` 的 watch/restart/probe、settings 写通道）可用；② UI 呈现与点击交互人工浏览验收一次并截图留痕（不引入浏览器自动化依赖）。〔原话拍板「数据链路自动+UI 人工」2026-11-18〕

## 场景

**主流程（发布 → 图形化管理全操作）**
- Given 维护者按双包顺序完成发布（FR-6），使用者 profile 已装最新版插件，dsh 以 web 形态启动
- When 打开右栏 Dock 页
- Then 列表显示已配置 server（名称/transport/状态/工具数），与 `/mcp list` 输出一致（FR-1）
- When 在 Dock 页添加一个远程 server（url + 凭据模板 header）
- Then 该 server 出现并自动连接，`mcp__…` 工具出现（FR-2；持久化与生效复用 round 1 链路）
- When 行内编辑该 server 的 url 并保存
- Then 修改即时生效（官方重建单实例），凭据字段未重输则保留（FR-3）
- When 重启 dsh 再开 Dock 页
- Then 清单与状态与重启前一致（round 1 持久化语义 + FR-1）

**异常流 A（连接失败与凭据缺失）**：When 添加/编辑后的 server 连不上或凭据缺失，Then 行内联显示 failed 原因线索或 waiting-credentials 提示，可触发重试（官方 probe/restart），条目保留可修复，不要求重启。〔依托 FR-4；与 round 1 异常流 A 同源〕

**异常流 B（非前台会话）**：官方限制「右栏 tab 需要前台会话」（ced7 F3.2 引 sidebar-right.md）——When 使用者在无前台会话的界面状态打开 Dock 页，Then 呈现官方既定行为（不可用或按官方形态展示），不报错不破坏。〔依托官方契约，实测归验收〕

**异常流 C（未发布/旧版本）**：When 插件未发布或 profile 装的是无 UI 的旧版本，Then Dock 页不存在（客户端包未加载），会话内双入口不受影响——UI 是增量能力非替代。〔依托 round 1 已验收行为〕

## 假设与风险

（验收 20261118-0123 passed 后蒸馏标注：验证结果 + 残余风险折回）

- **A1（风险）客户端 bundle 构建复刻**：官方 `clientBundle` tsdown preset 在 `packages/client/tsdown.client.ts`，不随 npm 包分发，外部包需自行复刻构建格式（lazy-CJS factory）——ced7 Q3 成本判断的核心组成；构建格式细节未在本机实证过。不确定度：中。缓解：ced7 已给出机制文档位置；实现时以官方 ui-settings-plugin-inventory 等先例包为参照。**验证通过**（验收 20261118-0123：复刻形态官方先例逐形态对照 + 真 boot 官方 loader 实际物化本包——combo 路由 200 含注册面与写面工厂）。
- **A2（风险）`sidebarRightTabs` 契约细节**：ced7 确认右栏 tab 机制存在且契约文档随包可得（docs/subsystems/sidebar-right.md），但 SlotMap/owner props 具体形态、per-Session 限制的实际行为未真跑过。不确定度：低-中。缓解：一手文档在探针包内可复核。**验证通过**（读面真机走查全过；写面 settings client api 形态断裂——三参签名——曾致首轮验收 rejected，已由 fix 20261118-1dc4 修复并真机全通道复验闭合，ADR 20261118-6037 立契）。
- **A3（假设）桌面端共享**：ced7 F3.1「桌面与 Web 共享同一客户端栈」——形态 B 预期桌面端同享；桌面安装 runtime 版本可能滞后于 npm 官方包。5 分钟查证成本高（需桌面端真跑），转假设交验收实测。**本轮未触发**（验收材料全为 web 形态，桌面无实测留痕；桌面端专项适配为 spec 非目标 4，桌面使用需求出现时随下轮实测）。
- **A4（风险）官方版本漂移**：沿 round 1 A3 同款（兼容星座 latest 标签错位、manager peer 精确钉版 fail-loud 已在 2d72 处置）；UI 轮新增客户端包面，官方前端产物演进可能带来新漂移。不确定度：中。缓解：照 2d72 口径——npm view 核验星座如实钉版，只依赖公开契约。**验证通过**（钉版纪律生效；漂移实际发生两处——web 组合 manager 行冲突/ns 错位与 client api 三参签名——均已按先改文档再改码处置：08f8 + 1dc4，ADR 20261118-6037 收录契约）。

### 残余风险（验收 20261118-0123 折回，含下一轮建议）

1. **FR-6 发布核销：已核销（20261118 fulfilled 门，用户显式授权发布）**——双包顺序发布完成：`@hankchen/dsh-mcp@0.2.0`（首发，pack → verify-bundle 五查 → publish）+ `@hankchen/infra@0.2.2`（bump，verify:pack 三查 → publish，annotated tag v0.2.2）；registry 对账一致（dsh-mcp 0.2.0 / infra 0.2.2）+ registry 发布版对账 test 真跑通过（2 pass / 0 skip，skip 门解除）。round 1 验收 20261118-ef01 残余风险 1 **清账**。
2. **Dock 页视觉打磨（用户显式需求，round 2 已拍板开轮）**：运行 20261118-0de6 合并确认时点用户拍板「先合并后开轮」——Dock 页样式布局美化（原生控件、无间距层级）作为下一轮范围，走 /dev-spec（round 2，spec 20261118-0de6 非目标 5 明示视觉细节归 design，本轮未承载）。
3. **编辑面板关闭行为瑕疵**：保存/取消后面板不自动关闭（多次复现，不影响写操作功能，重开可继续编辑）——留 round 2 UI 打磨一并处置。
4. **A3 桌面端无实测留痕**：桌面真跑需求出现时实测（本轮非目标）。

## 范围与非目标

非目标（显式拍板或沿 round 1 继承）：
1. **会话内双入口不动**——`/mcp` 命令与模型工具为 round 1 已验收能力，本轮只加 UI 不改它们（原型拍板 D4：空态无添加入口，添加引导指向会话内方式）。
2. **一级 Settings 页不做**——ced7 风险项（契约文档未随 npm 分发，逆向或上游依赖），形态 B 已拍板承载。
3. **MCP resources/prompts 能力面不做**（承 need 20261117-ea73 非目标 4）。
4. **桌面端专项适配不做**——预期共享（A3），不为桌面做专门页面；实测差异留验收记录。
5. **视觉细节不聊**——原型只服务状态可见性，配色字体等归 design（原型驱动纪律）。
6. **@hankchen/infra 侧无代码改动预期**——发布走既有双包流程与对账机制（round 1 FR-6 同款）。

## 开放问题

（三路归置完成，开放问题清零；以下为拍板记录）

- **D1 拍板** → 方法论 = 原型驱动（答复 2026-11-18；去向背景节原型走查）。
- **D2 拍板** → 发布前置进本轮（答复 2026-11-18；去向 FR-6、背景节）。
- **D3 拍板** → 承载形态 = 右栏 Dock 页形态 B，否掉形态 A（原型走查拍板 2026-11-18；去向 FR-1、非目标 2）。
- **D4 拍板** → 空态不放添加入口（原型走查拍板 2026-11-18；去向 FR-5）。
- **D5 拍板** → 编辑 = 行内编辑，否掉删除重建（原型走查拍板 2026-11-18；去向 FR-3）。
- **D6 拍板** → 验收线 = 数据链路自动回归 + UI 人工浏览留痕，不引入浏览器自动化（答复 2026-11-18；去向 FR-8）。
- **陈述句** → 行内编辑凭据语义 = 官方 Settings mutate（读 redact、未重输保留）已查证无纠错（ced7 F3.3；去向 FR-3）。
- **归置 D6 前置确认** → 原型双形态对比即 A/B 取舍的决策卡载体，拍板后原型文件弃用（原型驱动纪律：拍板在盘上，样品不留档）。

## 定稿记录

2026-11-18 念稿七节全貌，用户确认「确认」。D1–D6、凭据语义陈述句均在本会话拍板/查证后随稿定稿；原型三格（形态 B/空态无入口/行内编辑）与 D6 验收口径为用户显式拍板，原型文件已弃用不留档。
