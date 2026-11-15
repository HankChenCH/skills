---
id: 20261115-f650-fr7
created: 2026-11-15
spec: 20261115-f650
ticket: 20261115-13c4
---
# FR-7 端到端实测证伪报告：.ts 零构建插件包经官方 dsh 宿主加载链不可加载

## 结论速览

**证伪态成立。** .ts 零构建形态的 `@hankchen/dsh-demo`（本仓 `plugins/dsh-demo/`）经官方命令真实装进临时 `DSH_HOME` 测试 profile、真实启动后，**宿主拒载**：node 以 `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` 拒绝对 profile `node_modules` 下 `.ts` 文件剥类型，插件 entry 未激活，apply 日志不可见。spec FR-7 两条互斥场景中，「宿主拒载 → 显式证伪报告 + 回退方案成文」一条触发。

失败点定位（读码复核 + 控制实验双重确认）：**node 对「物理路径位于 node_modules 之下」的文件一律拒绝剥类型**（官方有意设计，无旗标逃生）——dsh 的模块拦截只改写 resolve 阶段的路由，load/translate 阶段仍是 node 默认 ESM 机，拒载就发生在那里。`.ts` 格式本身可剥（link 形态旁证：物理文件在 node_modules 外时同一宿主链加载成功）。

**回退方案已真跑预验证**：同一官方链路装入「发布前 tsc 预编译」的 .js 形态包，启动加载成功、apply 日志可见——回退方案（插件包发布面预编译，主 CLI 零构建不变）机制成立，作为 round 2 决策输入就绪。触发条件（端到端实测失败 **且** 读码复核确认宿主加载链不支持）两条均已满足。

## 实测契约与执行环境

- spec 契约（need FR-7，集成级）：临时 `DSH_HOME` + 测试 profile + .ts 形态 demo 插件经官方命令（npx 执行体）安装 + 真实启动该 profile 断言 apply 日志可见；前置门沿既有纪律（node ≥24.9 + registry 可达，不满足显式跳过报因）。
- 实测环境（2026-11-15，macOS arm64）：node v24.22.1（≥24.9 满足）、npm 11.19.1、pnpm 12.15.0（官方 `dsh plugin` 转发 pnpm 执行）、官方 `@deepseek-ai/dsh` 0.2.2-rc.1（registry latest，npx 执行体拉取）与插件包 engines `dsh >=0.2.2-rc.1` 对齐。
- 全部实验在 `/tmp` 新建目录完成，仓库目录内未跑任何安装实验；插件以 `npm pack` 出的 tarball 经 `npx --yes @deepseek-ai/dsh plugin --profile <测试profile> add <tarball绝对路径>` 安装（官方命令的 pnpm add 语义接受 tarball/路径说明符，`@deepseek-ai/dsh-plugin-manager/install-spec` 读码确认）。
- apply 日志观测仪器：cordis LoggerService 默认 exporter 只写进程内环形缓冲（1000 条），不落控制台；dsh boot 仅注册 warn/error 捕获 exporter。成功态的 apply 日志要可见，须由测试经 `--patch` overlay 挂一个注册 `ctx.logger.exporter` 并转储 `ctx.logger.buffer` 的仪器插件（测试自有仪器，非宿主改动；仪器经 overlay 相对说明符解析到 overlay 文件自身目录）。证伪态无需仪器即可见（失败警告走 stderr），本实测对两种形态都挂了同一仪器以对齐观测口径。

## 证伪证据（原始输出摘录）

**安装段（成功）**：tarball 含 `package.json` / `index.ts` / `cordis.patch.yml`（.ts 发布形态），官方命令安装成功，profile `node_modules/@hankchen/dsh-demo/` 下实装 `index.ts`，profile manifest 记 `file:<tarball>` 依赖行 + bundles 行含包名。

**启动段（拒载，stderr 原文）**：

```text
dsh: warning: 1 entry did not activate
dsh-demo-load-log (@hankchen/dsh-demo): failed to import: Error [ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING]: Stripping types is currently unsupported for files under node_modules, for "file:///private/tmp/.../profiles/<测试profile>/node_modules/@hankchen/dsh-demo/index.ts"
    at stripTypeScriptModuleTypes (node:internal/modules/typescript:189:11)
    at ModuleLoader.<anonymous> (node:internal/modules/esm/translators:680:29)
    at #translate (node:internal/modules/esm/loader:438:29)
    ...
```

同一启动内仪器捕获（对齐口径）：`CAPTURED-LOG [include] error: {"code":"ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING"}`，且无任何 `[info] 插件已加载` 行——apply 未执行。宿主层面失败是隔离的（patch 行正常组栈、仅该 entry 未激活、boot 不崩溃、进程存活），不拖垮其余 bundle。

## 失败点定位（加载链读码复核）

加载链五步，拒载发生在第 5 步：

1. **patch 组栈（通过）**：profile `dsh.profile.bundles` → 插件包自带 `cordis.patch.yml`（`insert: [{id: dsh-demo-load-log, name: '@hankchen/dsh-demo'}]`）→ overlay。patch 行只是声明，不加载模块。
2. **entry 导入入口**：`@deepseek-ai/cordis-plugin-loader` 的 `Module.import(name)`——非 `cordis:` 前缀时：宿主装有 internal 解析器则 `loader.internal.import(name, baseUrl)`；否则 `createResolve(baseUrl)`（profile 包作用域锚定的 `import.meta.resolve` helper）取绝对 file URL 后 `import()`。
3. **internal 解析器只管路由**：dsh 的运行时解析（`@deepseek-ai/dsh-app-boot` profile-resolution，node-addon 挂入 node 内部 ESM/CJS resolver）把裸说明符**改写解析目标**到 profile `node_modules`——`@hankchen/dsh-demo` → `…/profiles/<测试profile>/node_modules/@hankchen/dsh-demo`（package.json `main: index.ts`）。
4. **load/translate 阶段无转译参与者**：拦截只覆盖 resolve；模块内容加载仍由 node 默认 ESM 机执行（错误栈全在 `node:internal/modules/esm/*`）。
5. **node 拒载（失败点）**：`node:internal/modules/typescript` 的 `stripTypeScriptModuleTypes` 对「物理路径位于 node_modules 之下」的 `.ts` 抛 `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`——官方有意设计（阻止包作者直发 .ts，nodejs/node#57215），无旗标逃生；loader 的 `__rewriteRelativeImportExtension` 只改写 `./`/`../` 相对说明符，对本路径（绝对 file URL）不生效，且即便改写也只是换扩展名而非转译。

**唯一归因（控制实验）**：同一官方链路、同一临时 DSH_HOME 流程、同一仪器，装入「发布前 tsc 预编译」的 .js 形态包（`main: index.js`）——启动加载成功，`CAPTURED-LOG [@hankchen/dsh-demo] info: 插件已加载：@hankchen/dsh-demo` 可见。链上其余环节（官方命令安装、profile 初始化、compat 审查、patch 组栈、cordis mount、logger 仪器）全部被控制组洗清，失败点唯一落在「.ts 物理文件位于 node_modules 之下」。

**旁证（机制是按路径不是按格式）**：`link:` 协议安装（pnpm 符号链接，模块物理路径在仓库源码目录、不含 node_modules 段）——同一 .ts 文件经同一宿主链加载成功、apply 日志可见。即 node 的拒载键在模块文件路径的 node_modules 祖先关系；`link:` 是开发期形态，registry/tarball 消费者永远拿到 node_modules 下的真实文件，不触达本契约的发布形态，不构成回退。

## 回退方案（round 2 决策输入）

**方案**：插件包发布面预编译（spec「demo 插件 .ts 化契约」回退预案原文：「插件包单独预编译（发布前 tsc）」）——比照主 CLI 发布面预编译先例（spec 备注运行中修订，D8 收窄为「仓库内零构建 + 发布面预编译」，机制已由 prepack 承载 emit 落地）。主 CLI 零构建直跑不变，插件仓库内形态不变。

**机制已被控制组预验证**：tsc emit 的 `index.js` 经同一官方链路加载成功、apply 日志可见（见上）。回退不是盲拍，是已实证的通路。

**round 2 落地改动面清单（按 spec 契约边界，本票不动）**：

1. `plugins/dsh-demo/` 打包前 tsc emit `index.js`（源码 erasable-only，emit 无损；可用仓 tsconfig 同族 flags：`--target es2023 --module nodenext --moduleResolution nodenext --skipLibCheck`，控制组即用此组合）。
2. `package.json`：`main` → `index.js`；`files` 增 `index.js`（保留 `index.ts` 供导航可读，比照主 CLI 发布面「编译 .js + .ts 源码」双形态）；版本 bump 走既有发布纪律。
3. bundle 校验器（`scripts/verify-bundle.ts`，票 e692 已适配 .ts 形态）复核对 `main: index.js` 形态的接受度——校验器解析模块导出的方式需同时覆盖 .js/.ts 双形态。
4. `verify:pack` 对账（包内插件清单 = 仓库清单，路径不变）不受影响。

**触发条件判定**：spec 预设「端到端实测失败且读码复核确认宿主加载链不支持」——两条件本报告均已满足并留证（实测原始输出 + 加载链五步定位 + 控制组唯一归因）。round 2 可直接以本报告为决策输入开票实施，无需重新实验。

## 对测试的影响（两态互斥的测试编码）

承载测试 `test/e2e/dsh-ts-loading.test.ts` 将本报告结论编码为两态互斥：真跑段观察到 `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` 签名 → **显式跳过并报因**（注明证伪态、引用本报告路径、附证据行——沿仓库既有纪律：环境/契约既定事实显式跳过，不假绿不弱断言）；观察到 apply 日志（仪器捕获行）→ 成功态断言通过（若未来 node/dsh 放开则测试自动转绿）。控制组测试（预编译 .js 形态全链路绿）同文件常驻——它同时是仪器有效性的回归与回退方案的常驻预验证，此测试不因证伪态跳过（前置门不满足仍按纪律显式跳过），结果态失败即真失败。
