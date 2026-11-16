# 维护者指南

面向本仓库的维护者。使用者文档见根 [README](../README.md) 与[安装与接入](./getting-started.md)。

## 仓库结构

包根即仓库根。`package.json` 的 `files` 白名单（bin、src、skills、agents、scripts）全量随包分发；docs/、test/、.sdlc/ 只属仓库、不进包。

```
ai-infra/
├── skills/                  # 31 个技能正源，安装器原样拷入目标项目
├── agents/<宿主>/plugins/   # 插件资产（两级布局：宿主/插件目录）；当前 dsh 宿主 + dsh-demo 插件
├── src/ + bin/infra.ts      # 安装器 CLI 源码（TypeScript ESM，仓库内零构建直跑：node 直接执行 .ts）
├── scripts/                 # 发布面：prepack/postpack（打包编译与还原）、verify-pack（发布对账）、verify-bundle（插件 bundle 校验）
├── test/unit、test/e2e      # node:test；e2e 含 expect 驱动的交互安装测试
├── docs/                    # 本仓库自己的流程产物（METHOD.md、蓝图、九类产物、standards/ 分册）
└── .sdlc/                   # 本仓库自身的门禁：check.sh、config.sh、hooks、trackers
```

安装器 CLI 的核心模块（src/，逐个头注释为职责准绳）：

| 模块 | 职责 |
|---|---|
| [asset-map.ts](../src/asset-map.ts) | 「资产类型 → 安装机制」映射表：copy 行（文件拷贝 + 软链）、command 行（官方命令转发）、占位行（菜单显示不可安装）；新增资产类型 = 加一行，不改安装流程代码 |
| [catalog.ts](../src/catalog.ts) | 包内资产编目：copy 类列来源目录条目并读各 SKILL.md 的 description 作菜单提示；command 类两级枚举 agents/&lt;宿主&gt;/plugins/，条目正名取各包 package.json 的 name |
| [installer.ts](../src/installer.ts) | 技能安装执行：逐条目整目录替换拷进目标（重跑 = 按当前包内容精确刷新）、按 symlinkRule 对既有 agent 目录建软链 |
| [plugin-install.ts](../src/plugin-install.ts) | 插件安装编排：前置检查 → 组装官方命令 → 执行 → 对账 → 锁文件记账；逐条顺序执行，单条失败即中止并报已完成/未完成清单 |
| [reconcile.ts](../src/reconcile.ts) | 插件安装后对账：核对 profile 的 package.json 依赖行与 `dsh.profile.bundles` 数组行两处落点 |
| [lockfile.ts](../src/lockfile.ts) | `.infra-lock.json` 记账：包名与版本 + 逐技能 sha256 指纹、安装时间 |
| [cli.ts](../src/cli.ts) / [menu.ts](../src/menu.ts) | commander 旗标解析适配面；两层菜单构造（第一层资产类型单选、第二层条目多选） |
| [agent-dirs.ts](../src/agent-dirs.ts) / [dsh-command.ts](../src/dsh-command.ts) / [dsh-profiles.ts](../src/dsh-profiles.ts) | agent 目录清单（软链落点）、dsh 官方命令组装、profile 根解析（`DSH_HOME` 可覆盖根目录） |

## 开发与类型形态

常用命令（package.json scripts，可复制执行）：

```bash
pnpm test                    # 全量（unit + e2e）
pnpm run test:unit / test:e2e
pnpm run typecheck           # tsc --noEmit
pnpm pack && pnpm run verify:pack hankchen-infra-<版本>.tgz   # 发布对账（传参不带 --，pnpm 12 原样转发 --）
node .sdlc/check.sh phase|frontier|validate <file>|publish <file>|all   # 本仓库流程门禁
```

包管理器 pnpm（`packageManager` 钉 12.15.0）；Node 下限 ≥ 24.9.0（`engines`，来自官方 `@deepseek-ai/dsh` 的 engines 前置），`.nvmrc` 钉 24.22.1——`.nvmrc` 进场版本不得低于 engines 基线，由 `test/unit/node-baseline.test.ts` 守护。

类型与运行形态硬约束（tsconfig.json 头部注释是这些拍板的权威记录）：

- ESM + nodenext + **显式 .ts 扩展名导入**（`allowImportingTsExtensions`）；`erasableSyntaxOnly`（禁 enum/namespace/参数属性）；strict 全开，唯一例外 `useUnknownInCatchVariables=false`。
- tsconfig include 覆盖 src/bin/scripts/test/agents/——测试与插件模块同受类型检查（agents 插件模块是仓库正源，测试经动态 URL import 加载）。
- **仓库树常态零构建**：node 直接执行 .ts；发布面 emit 只走 scripts/prepack.ts（compiler API：打包前把 src/bin 编译为同路径 .js 进 tarball，postpack 还原仓库树），不走 tsconfig——不要在仓内留 .js 编译产物。

已知坑（改前必查）：

- **双态/双份同步资产**：改 skills/ 内容或 agents/ 插件后，[skills.md](./skills.md) 技能清单、包内清单须同步——包侧由 verify-pack 机器对账把关（技能清单相等、插件清单相等、禁含 node_modules 三查，任一不过即拒绝发布，退出码 1）；技能清单当前靠人工同步，无机器门禁，改动时自查。
- **文件即契约**：`.github/workflows/regression-gate.yml` 被 `test/unit/ci-workflow.test.ts` 静态守护，改工作流必须同步过该测试。
- **bash 兼容 darwin bash 3.2**：变量展开紧邻多字节字符必须 `${VAR}` 花括号（[bash-multibyte-bracing.md](./standards/bash-multibyte-bracing.md)）；日志禁 `head -c` 截 UTF-8。
- **node:test 纪律**：前置门跳过纪律（t.skip 只标注不截断，[node-test-skip-gate.md](./standards/node-test-skip-gate.md)）；替身保真与证伪形态门（[stub-fidelity-integration.md](./standards/stub-fidelity-integration.md)、[falsified-form-gate.md](./standards/falsified-form-gate.md)）。

## 发布流程

npm 包 `@hankchen/infra` 的包根即仓库根，skills/ 全量随包分发。包管理器为 pnpm（`pnpm-workspace.yaml` 声明 workspace、`packageManager` 字段钉版）。发布三步，顺序固定：

1. **升版本号**：改 `package.json` 的 `version`。semver 判据——patch：既有技能内容修订；minor：新增技能；major：移除或更名技能、安装目标或软链规则变更（后两类会改变既有项目的落盘形态）。
2. **打包对账**：`pnpm pack` 产出 tarball 后跑对账校验——包内技能清单必须等于仓库 `skills/` 清单、包内插件清单等于仓库 `agents/*/plugins/` 清单且禁含 `node_modules` 条目、包内 package.json 的 `bin.infra` 必须指包内预编译 `.js`（bin 查，票 20261116-c1d6），任一不满足即拒绝发布（退出码 1）：

   ```bash
   pnpm pack
   pnpm run verify:pack hankchen-infra-<版本>.tgz
   ```

   （传参不带 `--`：pnpm 12 起 `pnpm run` 原样转发 `--`，与 npm 不同。）

3. **发布**：原样发出对账过的 tarball——`npm publish hankchen-infra-<版本>.tgz --access public`。目录直发（`npm publish` / `pnpm publish` 不带 tarball）被根包 prepublishOnly 常驻门（`scripts/publish-gate.ts`）拒绝：npm publish 在 pack 内跑 postpack 还原 package.json（bin 回仓内 `.ts` 形态）之后、上传元数据之前重读磁盘 manifest 作元数据，元数据 bin 恒为 `.ts`，装出去 npx 建链接执行 node_modules 下 `.ts` 即挂（0.2.0 实证，票 20261116-c1d6）；pnpm 通道同门实拦（pnpm 10 dist 在 pack 前无条件跑 prepublishOnly，本仓 pnpm 12.15.0 dry-run 实测被拒）。tarball 形态发布不跑任何仓库脚本，元数据取自已过对账的包内清单；`npm publish --ignore-scripts` 为 opt-in 逃生口，靠 `/dev-release` 发布检查单纪律兜底。原 pnpm publish 的两道 git 门（`ERR_PNPM_GIT_UNCLEAN` / `ERR_PNPM_GIT_NOT_CORRECT_BRANCH`）随通道切换不再生效，主干与干净工作树前置由 `/dev-release` 入口门承担；插件包发布与双包顺序见[插件资产规范](./plugin-assets.md) §1.4。发布是单向门，操作以 annotated git tag（`v<版本>`）留痕；完整检查单、CHANGELOG 纪律与「tag 与推送必须问人」的边界见 `/dev-release`。

依赖维护节奏：CLI 解析依赖 commander 锁 minor（`package.json` 钉 `^15.1.0`），官方 major 年更——14→15 间隔 12 个月，15 系已移除 `exitProcess` 改为 `exitOverride`（RQ3 调研实测先例，docs/research/cli-lib/ 报告 §10.4-4）。每年升 major 时以 `test/unit/cli.test.ts` 的十六案例等价矩阵（逐字节断言）为回归防线，全量 `pnpm test` 绿后再发版。

推送交付后**观测 Actions run 至终态**（FR-2 回归门是集成级兑现点）：0s startup failure 类静默红没有通知机制，以 Actions 页 run 列表巡检兜底——run 红先于一切后续交付（复盘 20261116-8af4：workflow YAML 非法致 main 全红 8+ 小时无人察觉）。
