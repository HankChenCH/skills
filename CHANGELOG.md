# Changelog

本项目的所有显著变更记录于此。
格式遵循 Keep a Changelog（https://keepachangelog.com），版本遵循语义化版本。

## [v0.2.1] - 2026-11-17

### Fixed

- 发布 bin 元数据脱钩：`npm publish` 目录直发在打包后重读磁盘清单作上传元数据，registry 0.2.0 元数据 bin=`bin/infra.ts` 而 tarball 包内已换载为 `bin/infra.js`，npx 按元数据建 bin 链接即挂 `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`（票 20261116-c1d6）——修复：verify-pack 新增常驻 bin 查（包内清单 bin 必须指 `.js` 且目标在包内）+ `prepublishOnly` 门封死目录直发（npm/pnpm 双通道实证均被拦），唯一放行通道改 tarball 三步 `pnpm pack → pnpm run verify:pack <tgz> → npm publish <tgz>`；maintainer-guide 与 ADR 20261115-f143 附注同步发布通道

## [v0.2.0] - 2026-11-16

### Added

- `skill add [名...]` 子命令：带名免交互安装（空格 variadic 与逗号分隔双收、并集保序去重）、`--all` 全装、无参 PTY 条目多选、取消/空选零落盘、未知名列可用清单、跨包版本重跑刷新、软链冲突跳过（spec 20261116-2c58 FR-1/FR-4，票 20261116-f761）
- `plugin add [名...] --profile <名>` 子命令：无参交互（插件多选 + profile 单选/无既有项输入新名）、无名预置 profile、缺 `--profile` 三行结构报错、`desktop` 官方保留名拒装 shim 零调用、dsh 不在 PATH 自动 npx 回退、装后对账 + 锁文件记账（spec 20261116-2c58 FR-1/FR-4，票 20261116-ccfb）
- 分级帮助：顶层 `--help`（含 `skill add` / `plugin add` 用法示例）+ 逐命令 `--help`；裸跑 / `skill` / `plugin` 无动词打印对应层级帮助退出 0；非 TTY 交互守卫文案（spec 20261116-2c58 FR-1/FR-3，票 20261116-f761/bfcf）
- src 三层分层：`src/program.ts` 程序装配层 / `src/commands/<命令>/` 命令定义层 / `src/kernel/` 安装内核层，「新增子命令 = 加命令目录 + 装配层注册一处」由分层契约测试守护（spec 20261116-2c58 FR-5，票 20261116-1875/f761；ADR 20261116-af69）

### Changed

- **破坏性**：命令面硬切子命令形态——旧旗标 `--all` / `--skills` / `--plugins` 退役，改按未知旗标口径报错并指路 `--help`；两层交互菜单与旧旗标解析状态机整体退役（spec 20261116-2c58 FR-2 拍板 D3，票 20261116-bfcf）
- README 与 docs/getting-started 命令示例改子命令形态，含 0.1.x 升级叙事（重跑 `skill add` 即刷新）；GLOSSARY 安装器词条补子命令描述（spec 20261116-2c58 FR-6，票 20261116-bfcf）
- 包版本 0.1.1 → 0.2.0（0.x minor 承载破坏性变更，need A1；票 20261116-bfcf）

### Fixed

- setup-workspace 门禁遗留哨兵（run-tests.sh:3435）断言锚随内容迁往 docs/getting-started.md——README 拆分（324332f）遗留的 `check.sh all` 红灯（票 20261116-ae48）

## [v0.1.1] - 2026-11-16

### Added

- agents/`<宿主>`/`<机制>`/ 两级扩展布局：包分发面随 `agents` 目录全量（files 白名单 `plugins` → `agents`），demo 插件迁位 `agents/dsh/plugins/dsh-demo/`，新宿主接入只加映射行（need 20261115-fc48 FR-1/FR-3，票 20261115-30f2）
- 发布面预编译管线：根包与插件包 prepack/postpack 钩子（tsc emit 同路径 .js 进 tarball + 打包清单换载/还原；spec 20261115-f650 D8 修订与 FR-7 回退，票 20261115-d437/cf39）
- CI 回归门 workflow（push/pull_request 触发：frozen 安装 → typecheck → 全量测试 → pnpm pack 后对账三查；spec 20261115-f650 FR-2，票 20261115-52d5）

### Changed

- 依赖管理 npm → pnpm workspace：双锁切换、`packageManager` 钉 12.15.0、CI frozen 安装（need 20261115-fc48 FR-4，票 20261115-d5f4）
- CLI 旗标解析 commander 15 承载，手写 cli-args 退役——对外文案/行为逐字节不变（FR-5 防线十六案例矩阵守护，FR-8，票 20261115-eed0）
- 发布对账扩展「包内禁 node_modules」查（RQ2 异常流 A）+ 对账键升级 `<宿主>/<插件目录>` 复合键（票 20261115-d5f4/30f2）

### Fixed

- 插件包 .ts 直发形态被宿主拒载（FR-7 端到端证伪：ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING）→ 发布 tarball 预编译 .js 形态，registry `@hankchen/dsh-demo@0.1.1` 真装真启动实证（票 20261115-cf39，run 43792529968）
