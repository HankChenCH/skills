---
id: 20261116-2c58
status: approved
need: 20261116-cc67
round: 1
created: 2026-11-16
approved: 2026-11-16
---
# @hankchen/infra 子命令化 + src 命令目录式分层（round 1：单轮全量交付）

## 问题陈述

`@hankchen/infra` 对外是旗标模式（`--all` / `--skills <名[,名...]>` / `--plugins <名[,名...]> --profile <名>`，裸跑进两层交互菜单），对内 `bin/infra.ts` 299 行集旗标分发、两层交互菜单、插件安装编排、完成摘要、错误出口五件事于一身，src/ 11 个模块平铺无层次。使用者侧命令面与 dsh 官方命令形态（`dsh plugin --profile <名> add <包>`，子命令风格）割裂；维护者侧命令继续增多时 bin 平铺堆积加速腐化——need 20261115-fc48 D9 引入 CLI 库时预留的「子命令扩展」方向尚未兑现到结构层面。

## 方案

对外（need FR-1/FR-2/FR-3）：命令面硬切为子命令形态——裸跑与无动词调用打印对应层级帮助（退出码 0，不进交互）；`skill add [名...]` 无参进技能条目多选、带名免交互安装（空格 variadic 与逗号分隔双收，`--all` 全装）；`plugin add [名...] --profile <名>` 无参进插件条目多选 + profile 选择、带名免交互安装；旧旗标 `--all/--skills/--plugins` 按未知旗标口径报错并指路帮助（`--profile` 随 `plugin add` 保留为选项）；帮助分级（顶层 + 逐命令）。

对内（need FR-5）：src 拆三层——程序装配层（组装 commander 程序、注册子命令）、命令定义层（每个子命令一个目录，承载该命令的参数旗标声明、交互、编排调用与摘要渲染）、安装内核层（现 10 个模块行为等价归位，仅 import 路径迁移）；bin 入口瘦成装配壳。安装内核语义零变化（need FR-4）；文档与测试随契约同步（need FR-6）。

本轮单轮全量交付（分轮拍板 2026-11-16：命令面、分层、测试重推、文档同步为同一次垂直切片，不拆轮）。

## 用户故事

- 作为外部使用者，我想要 `npx @hankchen/infra skill add dev-spec,dev-plan` 一条命令免交互装技能，以便脚本化初始化项目。
- 作为外部使用者，我想要 `npx @hankchen/infra skill add` 无参进入勾选菜单，以便不记技能名时交互挑选。
- 作为外部使用者，我想要 `npx @hankchen/infra skill add --all`，以便一条命令装全量。
- 作为外部使用者，我想要 `npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev`，以便与 dsh 官方命令同构的心智装插件。
- 作为外部使用者，我想要裸跑与任何命令下 `--help` 都能给我对应层级的用法，以便不查文档。
- 作为已装 0.1.x 的使用者，我想要旧旗标输入报错时直接指路 `--help`，以便一眼知道新形态怎么写。
- 作为套件维护者，我想要命令定义与安装内核分层、每个子命令自成目录，以便命令增多时只加目录加注册、内核不被反复触碰。
- 作为套件维护者，我想要解析矩阵与 e2e 随新契约重推，以便新命令面有等强度的回归防线。

## 实现决策

- **解析架构转向（退役顺序状态机）**：commander 子命令模型原生承担路由与 token 消耗——程序声明 `skill`、`plugin` 两个命令组，各挂 `add` 动词命令；RQ3 时代「旗标顺序敏感语义状态机」（互斥/配对/值必需按 argv 首个命中抛错）整体退役，不再保留独立状态机模块。旧语义三类承接口：skill 与 plugin 安装互斥由子命令路由天然隔离；`--profile <名>` 值必需由 commander 选项声明承担（缺值经 exitOverride 翻 ✗ 通道）；`--all` 与名并集互斥、空 token 过滤、profile 配对由命令处理器轻量校验承担。错误统一走 bin 出口 ✗ 通道（`✗ <文案>` + 退出码 1），与现行风格一致。
- **命令面契约（文案原文级，测试锚定）**：
  - 裸跑 `npx @hankchen/infra`、`skill`、`plugin`（无动词）→ 打印对应层级帮助、退出码 0、零落盘；
  - `-h` / `--help`（顶层与逐命令）→ 帮助、退出码 0。**契约变化注记**：旧形态「`--skills -h` 把 -h 取值为技能名」随旗标退役不再存在，`-h` 恒为帮助（commander 选项解析先于位置参数收集）；
  - 未知子命令：`✗ 未知命令「foo」；可用命令：skill、plugin（--help 查看用法示例）`；
  - 未知旗标（含全部旧旗标名与任意 `--foo`）：`✗ 未知旗标「--skills」；运行 --help 查看全部命令与用法`（旗标名替换为实际输入）；
  - `--all` 与名并集互斥：`✗ --all 与技能名互斥：全装与按条目指定只能选一`（先后顺序无关；`plugin add` 无 `--all`）；
  - 名过滤后为空：`✗ skill add 需要至少一个技能名（如 skill add dev-spec,dev-plan）`；plugin 侧同构为 `✗ plugin add 需要至少一个插件名（如 plugin add @hankchen/dsh-demo --profile dev）`；
  - `plugin add <名...>` 缺 `--profile`：沿用现行三行结构——`✗ 插件安装需要 --profile <名> 指定目标 dsh profile。` + 既有 profile 列表行（无既有项时输出「未发现既有 profile……可用任意新名」行）+ 示例行（改新形态 `plugin add @hankchen/dsh-demo --profile dev`）；
  - `--profile` 缺值：`✗ --profile 需要一个 profile 名（如 plugin add @hankchen/dsh-demo --profile dev）`；
  - 非 TTY 交互守卫（新增错误路径）：`skill add` / `plugin add` 无参且 stdin 非 TTY → `✗ 交互选择需要终端（TTY）；非交互请改用 skill add <名...>、skill add --all 或 plugin add <名...> --profile <名>`、退出码 1、零落盘。
- **名归一化语义（载体迁移、语义同构）**：位置参数逐 token 拆逗号、trim、滤空段、按首现保序去重——与旧 `--skills`/`--plugins` 值语义完全同构（空格 variadic + 逗号双收为拍板 D6 扩展），如 `skill add a b,c d` → `[a, b, c, d]`、`skill add a a` → `[a]`。`plugin add <名...> --profile dev`（无名但有 profile）→ 进插件多选、profile 用给定值不再提示。
- **交互层**：条目多选菜单构造保留（按名排序、描述提示，与现行 `skillOptions` 形态一致）；两层菜单第一层（资产类型单选）构造随裸跑改帮助退役删除；clack 依赖保留；取消（Ctrl-C）与空选确认 → 退出码 0、零落盘（现行交互纪律延续）。
- **分层（承 need FR-5 / D8 拍板方向）**：程序装配层只做组装与注册；命令定义层每子命令一目录，承载注册、参数旗标声明、交互、内核编排调用与完成摘要渲染；安装内核层为现 10 模块（映射表、技能安装器、插件安装编排、编目、锁文件、对账、agent 目录清单、dsh 命令组装、dsh profile 枚举、菜单构造）行为等价归位——**导出签名与行为零变化，仅 import 路径迁移**；bin 入口瘦成装配壳（读版本、装配、派发、✗ 出口）。asset-map 规范占位行数据保留为扩展点。
- **发布与版本**：包版本 0.2.0（承 need A1，0.x minor 承载破坏性变更）；发布对账三查（技能清单相等、插件清单相等、禁含 node_modules）不变，打包清单随 src 分层路径同步。
- **文档同步**：README 安装节与 docs/getting-started.md 命令示例全部改写新形态（含升级叙事「重跑 skill add 即刷新」）；`--help` 文案重写为子命令清单 + 用法示例；GLOSSARY 安装器相关词条补子命令形态描述。

## 测试决策

seam 清单（既有同类测试为先例）：

- **S1 解析矩阵（重写 test/unit/cli.test.ts）**：按六主流程 + 五异常流 + 边角重推，替换旧十六案例矩阵（FR-5 逐字节防线随旗标契约退役；旧矩阵与证据 docs/research/cli-lib/evidence/ 保留为历史事实不删）。矩阵至少覆盖：裸跑/`skill`/`plugin` 无动词三形态帮助退出 0；顶层与逐命令 `-h`/`--help`；`skill add` 空格、逗号、混合、重复去重保序（4 例）；`--all`；`--all`×名互斥（含顺序反转 2 例）；空串 token 过滤后为空报错（2 例）；`plugin add` 带/缺 `--profile`；`--profile` 缺值；未知子命令；未知旗标（顶层旧旗标名 + 命令级任意旗标 2 例）；非 TTY 交互守卫。断言三通道（stdout/stderr/退出码）+ 关键行锚定（文案原文见实现决策）。
- **S2 命令处理器校验（unit）**：名归一化纯函数单测（拆分/trim/滤空/去重保序）；`--all`×名互斥判定；`--profile` 配对判定。
- **S3 交互构造与守卫（更新 test/unit/menu.test.ts）**：类型单选构造退役删除的静态断言；条目多选构造语义不变；非 TTY 守卫分支。
- **S4 端到端真进程（更新 test/e2e/）**：install.test.ts / plugin-install.test.ts 调用参数全改新形态（含 PTY expect(1) 交互路径、取消/空选零落盘、锁文件记账、重跑刷新、软链冲突跳过、desktop 拒装、dsh shim 断言收到 `plugin --profile dev add <包>`、npx 回退形态）；dsh-plugin-integration.test.ts 改新形态并维持前置门跳过纪律。
- **S5 发布对账**：`verify:pack` 三查（src 分层完整随包、技能清单、插件清单）；既有内核单测（installer/lockfile/reconcile/catalog/dsh-*）行为断言不动，import 路径随迁移更新后必须全绿。

## 验收场景

- [FR-1 | 工单级] Given 全新 git 项目根目录，When `skill add dev-spec dev-plan`，Then 2 项技能整目录拷入 `.agents/skills/`、对已存在 agent 目录建软链、`.infra-lock.json` 记账、完成摘要列出安装项、退出码 0。
- [FR-1 | 工单级] Given PTY 环境，When `skill add`（无参）勾选 2 项确认，Then 落盘结果与免交互路径一致。
- [FR-1 | 工单级] When `skill add --all`，Then 全部技能免交互安装，行为与旧 `--all` 等价。
- [FR-1 | 工单级] Given dsh shim 注入 PATH，When `plugin add @hankchen/dsh-demo --profile dev`，Then shim 收到 `['plugin', '--profile', 'dev', 'add', '@hankchen/dsh-demo']`，装后对账通过、锁文件记账。
- [FR-1 | 工单级] Given PTY 环境与既有 profile，When `plugin add`（无参）选插件 + 选 profile，Then shim 调用与所选组合一致。
- [FR-1 | 工单级] Given `plugin add --profile dev`（无名但有 profile）进交互，Then 仅提示插件多选、不再提示 profile，shim 调用用预置 profile。
- [FR-1 | 工单级] When 裸跑、顶层 `-h`/`--help`、`skill add --help` 三形态各跑一次，Then 打印对应层级帮助、退出码 0、零落盘；顶层帮助含 `skill add` 与 `plugin add` 用法示例且不含旧旗标名；`skill` / `plugin` 无动词裸打显示该命令帮助、退出码 0。
- [FR-1 | 工单级] When `skill add a b,c d` / `skill add a,a` 各跑解析，Then 归一化为并集保序去重（`[a,b,c,d]` / `[a]`）。
- [FR-2 | 工单级] When `--skills dev-spec`、`--all`、`--plugins x --profile dev`、`skill add --foo` 各跑一次，Then 均按未知旗标口径报错（文案含实际旗标名并指路 `--help`）、退出码 1、零落盘。
- [FR-2 | 工单级] When `foo`（未知子命令）跑一次，Then 报未知命令文案（含可用命令清单与 `--help` 指路）、退出码 1。
- [FR-3 | 工单级] Given PTY 环境，When `skill add` 勾选后取消（Ctrl-C）、确认空选各跑一次，Then 退出码 0 且零落盘。
- [FR-3 | 工单级] Given stdin 非 TTY，When `skill add`（无参）与 `plugin add`（无参）各跑一次，Then 非 TTY 守卫文案报错、退出码 1、零落盘。
- [FR-4 | 工单级] When `skill add 不存在的名字`，Then 报错列出可用技能清单、退出码 1、零落盘（内核行为迁移后仍成立）。
- [FR-4 | 工单级] When `plugin add @hankchen/dsh-demo --profile desktop`，Then 拒装并说明 desktop 为官方保留名，shim 零调用。
- [FR-4 | 工单级] When `plugin add @hankchen/dsh-demo`（缺 `--profile`），Then 三行结构报错（需 --profile + 既有 profile 列表或无既有说明 + 新形态示例行）、退出码 1。
- [FR-4 | 工单级] Given PATH 无 dsh，When `plugin add <包> --profile dev`，Then 官方调用回退为 `['--yes', '@deepseek-ai/dsh', 'plugin', '--profile', 'dev', 'add', <包>]`。
- [FR-4 | 工单级] When 同项目两次 `skill add <名>`（跨包版本），Then 已装技能按当前包内容刷新、锁文件包版本与指纹更新、无重复条目。
- [FR-4 | 工单级] Given 软链位置已被真实文件占用，When `skill add <名>`，Then 冲突位置跳过并在完成摘要列出，使用者数据未覆盖。
- [FR-5 | 工单级] When 运行分层结构静态契约测试，Then 程序装配/命令定义/安装内核三层在位、命令定义与内核无反向依赖，且结构断言口径下「新增子命令 = 加命令目录 + 装配层注册一处」成立（承 8975「结构断言验证」先例）。
- [FR-5 | 工单级] When `pnpm pack && pnpm run verify:pack <tgz>`，Then 三查全过（src 分层完整随包、技能清单相等、插件清单相等）。
- [FR-6 | 工单级] When 静态断言 README.md 与 docs/getting-started.md，Then 含 `skill add` 与 `plugin add` 形态示例与升级叙事、不含 `--skills`/`--plugins`/裸跑两层菜单旧形态；GLOSSARY 安装器词条含子命令形态描述。
- [FR-1 | 集成级 | 承载票 NNNN] Given 维护者本机 dsh 可用，When 以 .ts 插件包经 `plugin add` 装进测试 profile 并真启动，Then 插件 apply 日志可见（前置门跳过纪律：无 dsh/registry 环境显式 skip 不假绿）。
- [FR-1 | 集成级 | 人工：需包已发布至 npm registry 方可执行，发布属单向门在验收时点完成] Given 0.2.0 已发布，When 在全新项目跑 `npx @hankchen/infra@0.2.0 skill add <名>`，Then 安装成功、锁文件记录 0.2.0（留验收阶段人工执行）。

## 非目标

1. `skill list` / `plugin list` / `skill remove` 等动词的实现（目录结构预留动词位，实现留下轮；承 need 非目标 1）。
2. 裸跑两层交互菜单与资产类型选择层（退役；承 need 非目标 2）。
3. 新资产类型（规范等）的安装实现与占位交互（承 need 非目标 3）。
4. 安装内核语义重写（行为等价归位；承 need 非目标 4）。
5. CI 发布自动化（承 need 20261115-fc48 非目标）。
6. `--version` 旗标（本轮不加；需要时下轮顺手）。
7. `--skills=名` 等号赋值形的兼容（旧形态口径未支持，新形态同样不支持，报未知旗标）。

## 备注

- 输入：need 20261116-cc67（confirmed，issue #258），round 1 覆盖其全部 FR；分轮拍板「单轮全量」（2026-11-16）。
- 版本策略承 need A1：0.1.1 → 0.2.0。
- 旧解析矩阵的逐字节防线（RQ3 §6.3 + FR-5 防线注记）随旗标契约退役；探针证据目录保留为历史事实，不改写。
- commander 子命令模型（`.command()` DSL）为 RQ3 §3 已列官方特性，本轮无新增选型风险；解析架构由「库骨架 + 我侧状态机」转向「库原生子命令 + 处理器轻量校验」，属 need FR-2 拍板「不保留旗标语义逐字节防线」的直接后果。
