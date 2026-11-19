---
id: 20261119-7a9a
status: done
need: 20261117-ea73
round: 2
created: 2026-11-19
approved: 2026-11-19
done: 2026-11-20
---
# manager 依赖与宿主运行时解耦 round 2：依赖副本剥离 + 安装流就绪核验

## 问题陈述

2026-11-19 desktop profile 实证：按官方命令装好的 `@hankchen/dsh-mcp@0.3.1` 完全不可用（`/mcp` 不被命令面板识别、右栏面板报 "no active Remote method exports this endpoint"、插件管理器视角本体行 fiber `pending`），且当时 devtools console 无错、`--dump-config` 合成树一切正常。根因链（boot 日志实锤 `dsh: disabling profile plugin row "mcp-manager": … incompatible with dsh 0.2.2-rc.5`）：

1. 插件依赖声明 `@deepseek-ai/dsh-mcp-manager: ^0.2.2-rc.2` 被 profile 的 `minimumReleaseAge` 供应链门解析到**最老满足版** rc.2；
2. desktop 宿主运行时实跑 rc.5——运行时可超前于 app 壳版本（rc.3）与 npm `latest`（rc.1），三层版本各自漂移；
3. 宿主 boot 兼容门按「peer 精确钉同 rc」校验 manager，失败即**静默禁用 manager 行——连官方预挂行一起**：插件依赖副本把 profile 内 manager 解析劫持到了过旧版本，插件在此形态下是负资产（不装反而更稳）；
4. 本插件行因 `inject: [mcpManager]` 等不到服务而 pending（该 pending 是 inject 语义的正确行为）。

结论：ADR 20261118-ad91 决策 1 的「覆盖式范围声明（^rc.2 覆盖 rc.2/3/4 与 0.2.2 正式版）」被证伪——宿主强制 manager ≡ 运行时同 rc，发布期静态版本范围无法跨宿主版本保证。同日另实证：官方 CLI 对 desktop 的插件管理已放行（`dsh plugin --profile desktop add/remove` 成功；boot/dump 类 profile 级操作仍归 Electron app 独占），need 20261115-339e F4 的「desktop 拒装」结论失效，初始化器的保留名拒装依据不复存在。

## 方案

round 2 = 依赖解耦 + 安装流就绪核验（分轮拍板 2026-11-19：用户选方向 a + c，安装器需求并轮）：

1. **插件不再携带 manager 依赖副本**（方向 a）：package.json 运行时依赖移除 manager，兼容意图改用可选 peer 声明——任何安装形态下，安装本插件不得使 profile 依赖树出现 manager 副本，从根上杜绝「副本劫持官方行解析」。
2. **manager 供给责任移交安装流**（方向 c）：manager 必须与运行时同 rc 才能过宿主兼容门，而运行时版本只在安装时点可观测——初始化器装完插件后对目标 profile 执行就绪核验（运行时 dsh 版本 vs manager 解析/在场状态），不齐或缺副本即 fail-loud 退出并给出可复制执行的修复处方；官方直装用户沿 README 已落档处方（c6a4a83）。
3. **desktop 目标放行**：初始化器对 desktop 的拒装移除（官方命令转发、两落点对账、锁文件记账全链照旧；boot/dump 类操作本就不在初始化器命令面）。
4. **文档随代码对齐**：README 安装方式与已知边界中「初始化器拒装 desktop」相关表述随本轮代码修订同步（已知边界主体现状 c6a4a83 已落，不重写）。

## 用户故事

- 作为 dsh 使用者，我想让插件安装后不破坏宿主自带的 MCP 管理器，以便装插件只增不减、宿主与插件同时可用。
- 作为 dsh 使用者，我想让安装器在装完时告诉我「manager 版本与运行时是否匹配」，以便不匹配当场拿到可复制的修复处方，而不是装完看似成功、重启后静默不可用。
- 作为 desktop app 使用者，我想经套件初始化器把插件装进 desktop profile，以便与其他 profile 同一套安装体验。
- 作为套件维护者，我想让 manager 的版本决策发生在安装时点（可观测运行时）而非发布时点（不可观测），以便插件发布不再被宿主版本演进击穿。

## 实现决策

- **依赖面契约**：插件 package.json `dependencies` 不含 `@deepseek-ai/dsh-mcp-manager`；兼容意图以可选 peer 声明表达（`peerDependencies` + optional 元数据，版本范围归 design），保证常规安装路径（pnpm `autoInstallPeers: false` 的 profile 工作区、npm 常规模式）不自动带入 manager 副本。插件代码对 manager 的消费只经宿主注入服务面（`ctx.mcpManager`、挂载行解析），不经自身 import。
- **挂载行契约不变**：cordis.patch.yml 两行结构与 `!!js` 条件禁用逻辑保持 round 1 形态（web/desktop 组合官方行独供、补位行条件在场）；manager 模块的解析可用性责任在安装流（下条），不在插件包。
- **就绪核验契约**：初始化器 `plugin add` 完成两落点对账后，对目标 profile 执行：① 探测运行时 dsh 版本（探测来源归 design：官方 CLI、插件管理器 API 或 boot 日志，择一即可）；② 读 profile 依赖树中 manager 的解析版本（无副本视为「缺 manager」）；③ 两者 major.minor.patch 的 rc 段不同（或缺）→ 进程退出非零并输出处方：profile 级依赖覆盖配置写法 + manager 补装命令 + 插件管理器重载指引，三段均可复制执行（处方文本形态对照 README「已知边界」恢复配方）。探测失败（无法取得运行时版本）→ 降级为警告继续安装并提示手工核验途径，不虚构通过。
- **desktop 放行契约**：保留名清单移除 desktop；`plugin add --profile desktop` 与交互勾选均放行，后续官方命令转发、两落点对账、锁文件记账、`verify-pack` 三查全部沿用既有实现。boot/dump 类操作不在初始化器命令面，无行为变化。
- **发布纪律**：版本 bump + 双包顺序发布照 plugin-assets.md §1.4；ADR 层面新增决策记录（取代 ADR 20261118-ad91 决策 1 的钉版条款、保留其集成前置门条款），归 design 阶段落盘。

## 测试决策

- **seam 清单**：① 依赖面（package.json 断言：dependencies 无 manager、可选 peer 形态正确）；② 安装器 desktop 放行（带名安装与交互勾选两路径，官方命令转发替身形态沿既有 plugin-install 测试先例）；③ 就绪核验（运行时版本探测替身：同 rc 通过 / 异 rc 或缺副本 fail-loud + 处方文本断言 / 探测失败降级警告，三分支各自独立可测）；④ 处方文本契约（三段可复制、与 README 恢复配方一致）；⑤ 发布面（verify-bundle 四要素 + verify-pack 三查回归）。
- 既有先例：plugin-install 的 unit + e2e 测试形态（node:test、交互 expect 驱动、替身保真门）；发布对账沿 34d4/8a57 的 registry 对账 test 形态。
- 官方宿主行为（boot 兼容门、挂载行解析）以集成级为界，单测不替身官方内部。

## 验收场景

- [FR-1 | 工单级] Given 插件包目录，When 检视 package.json，Then `dependencies` 不含 `@deepseek-ai/dsh-mcp-manager`，可选 peer 声明在场且 optional 元数据正确；Given 常规安装路径（profile 工作区 `autoInstallPeers: false`），When 安装本插件，Then profile 依赖树不出现 manager 副本。
- [FR-2 | 工单级] Given 两面编译发布态，When verify-bundle / verify-pack，Then 四要素与三查通过，包内插件清单不变。
- [FR-3 | 工单级] Given 初始化器 `plugin add`，When 目标 profile 为 desktop（带名与交互勾选两路径），Then 不再拒装、转发官方命令成功、两落点对账与锁文件记账照旧；保留名清单为空或不含 desktop。
- [FR-4 | 工单级] Given 目标 profile 运行时 dsh 版本与 manager 解析版精确同版（蒸馏 20261120-83bf 按实际边界行为修订：实现镜像宿主 boot 兼容门「peer 精确钉同 rc」形态采用精确比对，较原文「同 rc」字面收紧、fail-loud 安全；范围拍板见 ADR 20261120-5606），When 装后就绪核验，Then 核验通过并在完成摘要中报告两版本号。
- [FR-5 | 工单级] Given 运行时与 manager 解析版非精确同版（或缺 manager 副本；原文「rc.X ≠ rc.Y」为精确比对在 prerelease 域的子集，验收 20261120-83bf 裁决不构成走样），When 装后就绪核验，Then 进程退出非零、输出三段处方（依赖覆盖写法 / 补装命令 / 重载指引），三段均可复制执行且与 README 恢复配方一致。
- [FR-6 | 工单级] Given 运行时版本探测失败（无可用来源），When 装后就绪核验，Then 输出警告并继续完成安装（退出零），警告含手工核验途径，不输出「核验通过」字样。
- [FR-7 | 集成级 | 承载票 NNNN] Given 兼容星座真跑组合（ADR ad91 集成前置门形态）web 形态，When 真实 boot 并安装修订后插件，Then `/mcp` 命令与 `mcp_manage` 工具注册可用、官方 manager 行 active、profile 依赖树无 manager 副本（8a57 FR-8 既有集成测试零修改通过为回归基线）。
- [FR-8 | 集成级 | 人工：desktop 运行时归 Electron app 独占，CLI 无法驱动真实 desktop boot] Given desktop profile 走完整安装流（初始化器直装 + 就绪核验），When app 重启加载，Then manager 行与本插件行双 active、`/mcp list` 与右栏面板可用——2026-11-19 事故三联征不复现；操作截图与 boot 日志留痕。
- [FR-9 | 工单级] Given 调研报告 20261117-ced7（round 1 已核销交付物），When 本轮决策检索其结论，Then manager 挂载面结论（Web/Desktop 官方预挂、headless/sdk/acp 补位——F2.3）与本轮「供给责任移交安装流」方案一致，报告无需增补（已于 2026-11-17 落盘）。

## 非目标

- 核验失败后的自动修复（自动写覆盖配置并补装）——本轮只做核验 + fail-loud 处方，自动供给另立需求。
- 官方宿主 boot 兼容门与挂载行解析机制的替官方决策——插件侧只保证不劫持 + 处方指引。
- 官方 npm `latest` 星座错位本身（官方发布节奏；ADR ad91 复核触发点条款不变）。
- Dock 页 UI 功能与样式（8a57 已终态）。

## 备注

- 本 spec 由对话综合（2026-11-19 desktop 事故处置会话），无独立 need 纪要；锚定 need 20261117-ea73——scope 为 spec 34d4（round 1）验收后的残余风险。
- 分轮拍板 2026-11-19：用户在「a 依赖降级为可选/peer + c 装后核验 fail-loud 处方 + 安装器需求并轮（含保留名放行）」与「b 维持现状仅文档兜底」之间显式选 a+c（原话「按推荐进行」）。
- 文档前置已完成：README「已知边界」与 plugin-assets.md 官方侧边界修正已随 c6a4a83（2026-11-19，[trivial]）落档；本轮文档义务仅剩随代码修订的表述对齐。
- 事故证据链与诊断过程留痕于当日会话：三层状态模型（合成树 ≠ 运行时 ≠ 插件管理器开关）、症状三联征、boot 日志金标准，均已写入 README「已知边界」条目。
