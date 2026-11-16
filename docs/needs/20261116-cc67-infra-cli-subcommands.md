---
id: 20261116-cc67
status: fulfilled
created: 2026-11-16
confirmed: 2026-11-16
fulfilled: 2026-11-17
---
# @hankchen/infra 命令行子命令化 + src 命令目录式分层（旗标模式硬切退役）

## 背景与业务目标

`@hankchen/infra` 当前对外是旗标模式：`npx @hankchen/infra` 裸跑进两层交互菜单，免交互走 `--all` / `--skills <名[,名...]>` / `--plugins <名[,名...]> --profile <名>`（src/cli.ts）。对内，`bin/infra.ts` 299 行集五件事于一身——旗标分发、两层交互菜单、插件安装编排、技能/插件完成摘要、错误出口——src/ 下 11 个模块平铺，无命令层与内核层之分。

需求发起人（套件维护者）的目标（原话「我想把现在--skills，--plugins这类参数项改为子命令……同时把src的目录往工程化更近一步，分目录管理这些子命令和对应逻辑，而不是像现在一样散列在此处」2026-11-16）：对外命令面升级为子命令形态（发起时样例 `npx @hankchen/infra skills add`、`npx @hankchen/infra plugin @hankchen/dsh-demo --profile dev`，样例的不对称形态经拍板 D2 修正为全单数对称式），对内 src 按子命令分目录管理。这是 need 20261115-fc48 拍板 D9「引入 CLI 库承担子命令/参数解析，以后命令会越来越多，现在引入可以避免腐化」预留方向的兑现：RQ3 选型 commander 15 的动机面就是子命令模型（调研报告 §3「`.command()` + 生命周期钩子」），本 need 把这条预留线用起来。

可验证目标：本 need「场景」节每条命令复制可执行且行为如述；旧旗标输入按未知旗标口径报错；全量测试绿（`pnpm test`）+ 发布对账过（`pnpm pack && pnpm run verify:pack <tgz>`）；README.md 与 docs/getting-started.md 命令示例同步新形态；此后新增一个子命令 = 在 `src/commands/` 加一个目录 + `src/cli.ts` 注册一处，不改安装内核。

不做的代价：命令面与 dsh 官方命令形态（`dsh plugin --profile <名> add <包>`，子命令风格）持续割裂；bin 入口随命令增多继续膨胀腐化；fc48 D9 防腐化拍板停留在解析库层面，未落到结构层面。

## 干系人与用户

| Actor | 要完成什么 | 成功标准 |
|---|---|---|
| 外部使用者 | 用子命令形态在自己的项目里安装/升级套件资产（`skill add` / `plugin add`） | 场景节样张命令复制可执行；出错时错误文案可读并列出可用项或指路帮助 |
| 套件维护者 | src 分层可承载命令增多；测试与文档随契约同步；维护升级叙事 | 新增子命令只加 commands/ 目录 + cli.ts 注册一处；`pnpm test` 全绿 + verify:pack 过 |
| 已装 0.1.x 的使用者 | 从旗标形态迁移到子命令形态 | `--help` 与 README 给出新形态；旧旗标报错文案指路 `--help`；锁文件 `.infra-lock.json` 语义不变（重跑 `skill add` 即刷新） |

## 系统能力需求

- **FR-1** 子命令形态（溯源：原话「使用变成：npx @hankchen/infra skills add / npx @hankchen/infra plugin @hankchen/dsh-demo --profile dev」2026-11-16 + 拍板 D2/D4/D5/D6）：
  - 裸跑 `npx @hankchen/infra`（无子命令）→ 打印帮助后退出（退出码 0），不进交互菜单；
  - `npx @hankchen/infra skill add [名...]`：无参数 → 进技能条目多选（交互勾选）；带名（空格分隔 variadic 或逗号分隔均收）→ 免交互安装指定技能；`--all` → 免交互安装全部技能；
  - `npx @hankchen/infra plugin add [名...] --profile <名>`：无参数 → 进插件条目多选 + 目标 profile 选择（既有 profile 单选，无既有项时输入新名）；带名 + `--profile` → 免交互安装指定插件到该 profile；
  - 帮助分级：顶层 `--help`（含子命令清单与用法示例）+ 逐命令 `--help`（如 `skill add --help`）。
- **FR-2** 旧旗标硬切退役（拍板 D3）：`--all` / `--skills` / `--plugins` / `--profile` 不再作为旗标被识别——`--profile` 随 `plugin add` 子命令保留为该子命令的选项，其余旧旗标一律按未知旗标口径报错并在文案中指路 `--help`；十六案例解析矩阵（test/unit/cli.test.ts）按子命令语义整体重推，不保留旗标语义的逐字节防线。
- **FR-3** 交互路径保留且零落盘底线不变（拍板 D5）：`skill add` / `plugin add` 无参进入的交互勾选、取消、空选路径一律零落盘（延续现 bin/infra.ts 交互纪律）；条目多选菜单语义延续（按名排序、带描述提示，复用现 src/menu.ts `skillOptions` 形态）；两层菜单第一层（资产类型单选）随裸跑改帮助而退役。
- **FR-4** 安装内核行为不变（行为等价归位，不重写）：技能「整目录替换拷贝 + agent 目录相对软链 + 冲突跳过 + `.infra-lock.json` 记账 + 重跑覆盖刷新」、未知名显式报错并列可用清单（现 src/installer.ts:71 口径）、`desktop` profile 官方保留名拒装、dsh 不在 PATH 自动回退 `npx @deepseek-ai/dsh`、插件经官方命令转发 + 装后对账——全部维持现状（溯源：need 20261114-1f2f FR-1/FR-2/FR-4 与 need 20261115-339e 的既有验收行为）。
- **FR-5** src 命令目录式分层（拍板 D8，方向样张已确认，文件级切分归 dev-design）：`src/commands/<命令>/` 承载各子命令定义（注册、参数旗标声明、交互、编排、摘要），`src/core/`（或同义命名，dev-design 定名）归位安装内核模块（asset-map / installer / plugin-install / catalog / lockfile / reconcile / agent-dirs / dsh-command / dsh-profiles / menu），`src/cli.ts` 承担程序装配与子命令注册，`bin/infra.ts` 瘦成入口装配壳；测试目录与包发布清单（package.json files、verify:pack 对账）随路径迁移同步。
- **FR-6** 文档与测试随契约同步：README.md、docs/getting-started.md 命令示例全部改写为新形态；`--help` 文案重写（子命令清单 + 示例）；test/unit/cli.test.ts 解析矩阵按子命令语义重推、test/e2e（install / plugin-install / dsh-plugin-integration）调用参数改新形态；GLOSSARY.md 安装器相关词条按需补子命令形态描述。

## 场景

**主流程 1（指定技能免交互安装）**
- Given 使用者在一个 git 项目根目录
- When `npx @hankchen/infra skill add dev-spec dev-plan`
- Then 2 项技能整目录拷入 `.agents/skills/`，对项目内已存在的 agent 目录建软链，`.infra-lock.json` 记账，退出码 0，完成摘要列出安装项与软链情况

**主流程 2（交互装技能）**
- When `npx @hankchen/infra skill add`（无参）
- Then 进技能条目多选（空格勾选、回车确认）；选毕安装同主流程 1；取消或空选 → 零落盘退出

**主流程 3（全装）**
- When `npx @hankchen/infra skill add --all`
- Then 全部技能免交互安装，行为同现行 `--all`

**主流程 4（装插件）**
- When `npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev`
- Then 校验插件在套件包内 → 经官方命令 `dsh plugin --profile dev add @hankchen/dsh-demo`（dsh 不在 PATH 回退 npx）安装 → 对账落点 → 锁文件记账，退出码 0

**主流程 5（交互装插件）**
- When `npx @hankchen/infra plugin add`（无参）
- Then 进插件条目多选 → 选毕进 profile 选择（既有 profile 单选；无既有项时输入新名）→ 安装同主流程 4；取消或空选 → 零落盘退出

**主流程 6（帮助）**
- When 裸跑 `npx @hankchen/infra`，或带 `-h`/`--help`，或 `skill add --help`
- Then 打印对应层级帮助（顶层含子命令清单与用法示例；逐命令含该命令的参数旗标说明），退出码 0，零落盘

**异常流 A（旧旗标）**：When `npx @hankchen/infra --skills dev-spec`，Then 按未知旗标口径报错（退出码 1）并在文案中指路 `--help`（对应 FR-2）。
**异常流 B（缺 profile）**：When `npx @hankchen/infra plugin add @hankchen/dsh-demo`（无 `--profile`），Then 报错并列出既有 profile（无既有项时说明可用任意新名），退出码 1。
**异常流 C（未知名）**：When `skill add 不存在的名字`，Then 报错并列出可用技能清单，退出码 1，零落盘。
**异常流 D（保留名）**：When `plugin add <包> --profile desktop`，Then 拒装并说明 desktop 为官方保留名，不执行任何官方命令（对应 FR-4 既有行为）。
**异常流 E（未知子命令）**：When `npx @hankchen/infra foo`，Then 报未知命令口径错误并指路帮助（具体文案形态归 spec，从现行「未知旗标」文案风格派生）。

## 假设与风险

- **A1（假设）版本策略 0.2.0**：破坏性变更以 0.x minor 承载（0.1.1 → 0.2.0）；已发布 0.1.x 的对外使用面≈维护者本人，无兼容层负担。代价：低（版本号随手可调）。不确定度：低。过滤闸判定：涉意图（版本叙事），留定稿确认。**验证结果：验证通过**（验收 20261116-dd67：package.json `"version": "0.2.0"`，锁文件 `packageVersion: 0.2.0` 四处实操实证）。
- **A2（假设）帮助文案与错误文案形态**：顶层/逐命令帮助的具体排版、未知子命令与未知旗标的具体文案归 spec/design 重推，测试断言锚定关键行（子命令名、指路口径）而非全文逐字节。代价：低。不确定度：低。**验证结果：验证通过**（验收实操：帮助五形态齐备退出 0、错误文案均含实际旗标名/可用清单 + 指路 `--help` 关键行，顶层帮助旧旗标名 grep 计数 0）。
- **A3（风险）测试面整体重写量**：十六案例矩阵 + 3 个 e2e 文件的调用参数随契约重推，是本轮最大体力面；旧矩阵不保留逐字节防线（FR-2 拍板），新矩阵以场景节六主流程 + 五异常流为蓝本。代价：工时为主，机械。不确定度：低。**验证结果：验证通过**（fresh `check.sh all` 559 passed；承载票集成 e2e 真装真启动过；新矩阵与实操行为一致反向印证）。
- **A4（风险）交互菜单 PTY 依赖**：`skill add` / `plugin add` 无参路径仍需真 TTY（clack 依赖），既有 e2e 已用 expect(1) PTY 方案覆盖同类路径，无新增技术不确定度。代价：低。**验证结果：验证通过**（本轮验收未直接触发交互路径——无人值守介质无交互终端；PTY 用例由 fresh 559 passed 覆盖，非 TTY 守卫分支实测退出 1 零落盘）。

### 验收折回（20261116-dd67，round 1 passed）

**残余风险**（均不阻塞）：
1. ~~集成级人工场景 `npx @hankchen/infra@0.2.0 skill add <名>` **未核销**~~ → **已补核（2026-11-17）**：0.2.0 发布后部署验证证伪出发布 bin 元数据脱钩缺陷（registry 元数据 bin=.ts / tarball 包内 .js，npx 挂 ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING；票 20261116-c1d6 修复，v0.2.1 承载），场景在 0.2.1 上核销——全新 git 项目 `npx -y @hankchen/infra@0.2.1 skill add dev-spec` EXIT=0、技能落盘、锁文件 `"packageVersion": "0.2.1"`，registry 元数据 `bin = { infra: 'bin/infra.js' }` 同步核验。
2. verify:pack 三查未在验收轮重跑（工单级不重跑口径，间接证据链完整：收口门禁绿 + 分层在位 + prepack 机制在位）；发布流程中 verify:pack 为必经门，风险自然收敛——发布时点已实跑（v0.2.1 四查含新增 bin 查全过）。
3. 验收测试 profile `accept-2c58-f` 遗留 `~/.dsh/profiles/`（无影响，可随手删）。

**下一轮建议**（依据：逐票评审建议项 + 验收残余风险归纳）：
1. 文档巡检 [trivial] 票：docs/maintainer-guide.md:30 src 模块表预存过期（仍列 cli.ts/menu.ts 且 `../src/cli.ts` 链接已随硬切断裂）。
2. dev-implement 票面 checkbox 勾选纪律（ccfb/bfcf/ae48 三票漏勾）留痕 dev-retro 审计。
3. contractMessageFor 按 err.code 先行分发、正则只做名值提取（commander 升级措辞漂移防护；评审 20261116-9e44 标准轴 #1）。
4. 顶层帮助负向断言单点收敛到 install.test（评审 20261116-9e44 标准轴 #2）。
5. dsh 观测仪器（writeCaptureInstrument/bootAndWatch）两处同款复制约百行，第三处拷贝前抽共享测试 helper（评审 20261116-a66a 标准轴 #3）。
6. command-layers.test 增「src/commands/** 禁 import program.ts」静态断言（评审 20261116-06b0 Spec 轴 #3）。
7. prepack 幂等门按错误码区分 typescript 缺失与瞬时故障（评审 20261116-a66a 偶发观察：并行负载下一次快败三查不复现）。

## 范围与非目标

非目标（全部显式拍板）：
1. **list / remove / check 等动词的实现**——本轮只落 add + 帮助（拍板 D7）；commands/ 目录结构预留动词位（如将来 `skill list` 落 `src/commands/skill/list.ts`），实现留下轮。
2. **裸跑交互菜单（两层菜单第一层）**——裸跑改打印帮助（拍板 D4），资产类型选择层退役；类型语义由子命令表达。
3. **新资产类型接入**（规范等占位类型的安装实现）——asset-map 占位行数据保留为扩展点，本轮无任何新命令或安装逻辑。
4. **安装内核语义重写**——core 模块行为等价归位迁移，不改行为（拍板：FR-4 行为不变）。
5. **CI 发布自动化、插件功能演进**——维持 fc48/339e 既有非目标口径。

## 开放问题

（无悬置——三路归置完成，以下为拍板记录）

- **D1 拍板** → 澄清方法论选用例驱动（原话选择「用例驱动（推荐）」2026-11-16；去向场景节六主流程五异常流）。
- **D2 拍板** → 命令形态全单数对称式：`skill add` / `plugin add`（原话选择「全单数式」2026-11-16，修正发起样例 `skills add`/`plugin <名>` 的不对称；`plugin` 与 dsh 官方子命令同名对齐；去向 FR-1）。
- **D3 拍板** → 旧旗标硬切退役，不设过渡兼容层（原话选择「硬切退役（推荐）」2026-11-16；去向 FR-2）。
- **D4 拍板** → 裸跑无子命令 → 打印帮助退出，不进交互（原话选择「跳帮助」2026-11-16；去向 FR-1、非目标 2）。
- **D5 拍板** → `skill add` 无参交互勾选、`plugin add` 无参交互选择（原话各选「推荐」项 2026-11-16；去向 FR-1/FR-3、主流程 2/5）。
- **D6 拍板** → 多值参数空格 variadic + 逗号分隔双收，统一并集保序去重（原话选择「空格+逗号双收（推荐）」2026-11-16；去向 FR-1）。
- **D7 拍板** → 本轮动词集只 add + 帮助，list/remove 结构预留不实现（原话选择「只 add（推荐）」2026-11-16；去向非目标 1）。
- **D8 拍板** → src 分层命令目录式：commands/<命令>/ + core/ + cli.ts 装配 + bin 瘦入口（原话选择「命令目录式（推荐）」2026-11-16；去向 FR-5）。
