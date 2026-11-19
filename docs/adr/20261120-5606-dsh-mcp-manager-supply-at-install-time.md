---
id: 20261120-5606
status: accepted
created: 2026-11-20
---
# 20261120-5606: dsh-mcp manager 供给责任移交安装流（依赖副本剥离 + 装后就绪核验）

取代 ADR 20261118-ad91 决策 1（插件 dependencies 携带 manager 副本 + peer 精确钉同 rc 的覆盖式范围声明）；ad91 的集成前置门条款（兼容星座真跑四条件 skip 留因）保留不变。

## 背景

2026-11-19 desktop profile 实证：官方命令装好的 `@hankchen/dsh-mcp@0.3.1` 完全不可用（/mcp 不被命令面板识别、右栏面板报错、插件管理器视角 fiber pending，devtools 无错）。根因链（boot 日志实锤 `dsh: disabling profile plugin row "mcp-manager": … incompatible with dsh 0.2.2-rc.5`）：

1. 插件依赖声明 `@deepseek-ai/dsh-mcp-manager: ^0.2.2-rc.2` 被 profile 的 `minimumReleaseAge` 供应链门解析到最老满足版 rc.2；
2. desktop 宿主运行时实跑 rc.5——运行时可超前于 app 壳版本与 npm latest，三层版本各自漂移；
3. 宿主 boot 兼容门按「peer 精确钉同 rc」校验 manager，失败即静默禁用 manager 行——连官方预挂行一起。

结论：ad91 决策 1 的「覆盖式范围声明」被证伪——宿主强制 manager ≡ 运行时同 rc，发布期静态版本范围无法跨宿主版本保证。同日实证官方 CLI 已放行 desktop 插件管理（need 20261115-339e F4 的拒装结论失效）。

## 决策

1. **插件不携带 manager 依赖副本**：package.json `dependencies` 键整体移除（不止移除 manager 项）；兼容意图以可选 peer 表达——`peerDependencies` `^0.2.2-rc.2` + `peerDependenciesMeta.optional: true`。范围取值沿用 ad91 决策 1 的认证范围字面（round 2 证伪的是「dependencies 携带」条款，非范围语义；覆盖 rc.2/3/4 与 0.2.2 正式版、不误吸 0.3.x）——本条同时作为该范围的 design 拍板落盘，核销 spec 20261119-7a9a 实现决策「版本范围归 design」的欠账（评审 20261119-47e1 Spec 轴建议 1）。
2. **manager 供给责任移交安装流**：初始化器 `plugin add` 完成两落点对账后对目标 profile 执行装后就绪核验——探测运行时 dsh 版本（安装流同款执行体 `--version`；desktop 真实运行时归 app 独占可超前 CLI 代理值，核验与处方以代理值为准）对账 profile 依赖树中 manager 解析版；非精确同版或缺副本 → 进程退出非零并输出三段可复制处方（profile 级依赖覆盖写法 / manager 补装命令 / 插件管理器重载指引，与插件 README「已知边界」恢复配方逐段一致）；探测失败降级警告继续安装，不虚构通过。官方直装用户沿 README 处方。
3. **desktop 目标放行**：保留名清单移除 desktop（本轮实现整体删除）；boot/dump 类 profile 级操作不在初始化器命令面，无行为变化。
4. **发布面常驻拒绝门**：verify-bundle 双态判定单点（`collectBundleDefectsFor`）固化依赖面拒绝校验——任何插件 bundle dependencies 携带 `@deepseek-ai/dsh-mcp-manager` 即缺陷（源码态与 tarball 发布态同查，verify-pack 复用同一判定函数），缺陷信息引用本事故（falsified-form-gate 证伪形态常驻门，先例 FR-7）。

## 后果

- **正**：任何安装形态装本插件不再使 profile 依赖树出现 manager 副本，从根上杜绝「副本劫持官方行解析」；manager 版本决策发生在安装时点（可观测运行时）而非发布时点（不可观测），插件发布不再被宿主版本演进击穿；desktop 与其他 profile 同一套安装体验。
- **负**：核验失败中断安装流（fail-loud），修复依赖用户执行三段处方——自动写覆盖配置并补装为显式非目标，另立需求；desktop 真机端到端确认（FR-8）归人工实操（Electron 运行时 CLI 不可驱动），本轮以 web 形态真跑 + 探针实证两层佐证。
- **中性**：插件代码对 manager 的消费只经宿主注入服务面（`ctx.mcpManager`、挂载行解析），不经自身 import——挂载行契约（cordis.patch.yml 两行 + `!!js` 条件禁用）保持 round 1 形态不变。

## 证据

验收 20261120-83bf（passed，承载 = 合并候选）：FR-1 真装观测零副本（红→绿实测过事故解析形态三处副本）；FR-7 集成真跑（剥依赖 tarball 官方装进 web profile：/mcp + mcp_manage 注册、官方 manager 行 active、依赖树无副本三面断言 + 证伪探针）；readiness 探针实证留痕（2026-11-20 本机 desktop profile——事故现场——manager 副本直达落点坐实、registry manager dist-tags.latest = rc.2 漂移形态确定）。
