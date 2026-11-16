# AGENTS.md

## 这个仓库是什么

门禁式 SDLC 技能套件（31 个技能）+ 其 npm 安装器 `@hankchen/infra`。包根 = 仓库根，`files` 全量随包分发：

- **skills/** —— 31 个技能正源（sdlc 总控 / setup-\* / dev-\* 脊柱 / design-\* / ref-\* 参考层），安装器原样拷入目标项目。
- **agents/&lt;host&gt;/plugins/** —— 插件资产（两级布局，当前宿主 dsh：`agents/dsh/plugins/dsh-demo` 是 demo 插件兼维护者模板，规范见 docs/plugin-assets.md）。
- **src/ + bin/infra.ts** —— 安装器 CLI 源码（TypeScript ESM，**仓库内零构建直跑**：node 直接执行 .ts）。核心是表驱动：`asset-map.ts`（资产类型→安装机制，新增资产类型=加行不改流程代码）、`catalog.ts`（包内编目）、`installer.ts`（技能拷贝+软链+锁文件）、`plugin-install.ts`（经官方 `dsh plugin` 命令装插件）、`reconcile.ts`（安装后对账）、`lockfile.ts`（.infra-lock.json 记账）。
- **scripts/** —— 发布面：`prepack.ts`/`postpack.ts`（打包前把 src/bin 编译为同路径 .js 进 tarball、打包后还原仓库树）、`verify-pack.ts`（发布对账门）、`verify-bundle.ts`（插件 bundle 清单校验）。
- **test/unit、test/e2e** —— node:test（含 expect 驱动的交互 e2e）。
- **docs/** —— `METHOD.md`（流程规则唯一来源）、`sdlc-skills-blueprint.md`（设计真相源，**治理规则：先改文档再改技能**）、`plugin-assets.md`、`concepts.md`、`standards/`（编码标准分册）、needs/specs/designs/tickets/reviews/acceptance/adr/research（九类流程产物）。
- **.sdlc/** —— check.sh 门禁脚本、config.sh、hooks、trackers 适配器。

## 常用命令

```bash
pnpm test                    # 全量（unit + e2e）
pnpm run test:unit / test:e2e
pnpm run typecheck           # tsc --noEmit
pnpm pack && pnpm run verify:pack hankchen-infra-<版本>.tgz   # 发布对账（传参不带 --，pnpm 12 原样转发 --）
node .sdlc/check.sh phase|frontier|validate <file>|publish <file>|all   # 流程门禁
```

包管理器 pnpm（`packageManager` 钉 12.15.0）；Node ≥ 24.9.0（`.nvmrc` 钉 24.22.1，与 engines 的一致性由 `test/unit/node-baseline.test.ts` 守护）。

## 类型与运行形态（硬约束）

- ESM + nodenext + **显式 .ts 扩展名导入**（`allowImportingTsExtensions`）；`erasableSyntaxOnly`（禁 enum/namespace/参数属性）；strict 全开（唯一例外 `useUnknownInCatchVariables=false`）。tsconfig include 覆盖 src/bin/scripts/test/**agents/**（agents 插件模块是仓库正源，测试经动态 URL import 加载）。
- 发布面 emit 只走 `scripts/prepack.ts`（compiler API），**不走 tsconfig**；仓库树常态零构建——不要在仓内留 .js 编译产物。
- tsconfig.json 头部注释是这些拍板的权威记录，改动前先读。

## 已知坑

- **双态/双份同步资产**：改 skills/ 内容或 agents/ 插件后，README 技能清单、包内清单须同步——`verify-pack` 对账不过即拒绝发布（技能清单相等、插件清单相等、禁含 node_modules 三查）。
- **文件即契约**：`.github/workflows/regression-gate.yml` 被 `test/unit/ci-workflow.test.ts` 静态守护，改工作流必须同步过该测试。
- bash 兼容 darwin bash 3.2：变量展开紧邻多字节字符必须 `${VAR}` 花括号（docs/standards/bash-multibyte-bracing.md）；日志禁 `head -c` 截 UTF-8。
- node:test 前置门跳过纪律（t.skip 只标注不截断）：docs/standards/node-test-skip-gate.md；替身保真与证伪形态门：docs/standards/stub-fidelity-integration.md、falsified-form-gate.md。
- 文档与对话一律中文；文档呈现遵循 docs/standards/design-docs.md。

## 改动前必读

- 流程规则：docs/METHOD.md；术语与状态机：GLOSSARY.md。
- 改任何技能前先改 docs/sdlc-skills-blueprint.md 对应规格（治理规则「先改文档再改技能」）。
- 编码标准索引与兜底基线：CODING_STANDARDS.md。

<!-- sdlc:begin 由 setup-workspace 管理，勿在此块内手改 -->
## 开发流程（强制，不可协商）
完整规则见 docs/METHOD.md，术语与状态定义见 GLOSSARY.md。
- 改动源码前必须存在 status: approved 的 spec 与对应工单；小修走 [trivial] 豁免（retro 审计）。
- 提交必须通过 .sdlc/check.sh；禁止 --no-verify。
- 评审标准轴依据 CODING_STANDARDS.md 及其索引的 docs/standards/ 文件。
- 不确定当前阶段就运行 /sdlc，不要凭记忆推进。
<!-- sdlc:end -->