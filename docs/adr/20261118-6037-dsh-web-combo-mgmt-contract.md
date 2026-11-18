---
id: 20261118-6037
status: accepted
created: 2026-11-18
---
# 20261118-6037: dsh web 组合下 MCP 管理面的组合派生契约——manager 行让位、ns 派生、client api 三参

## 背景

`@hankchen/dsh-mcp` 0.2.0（spec 20261118-0de6）为 round 1 的 sdk/headless/acp 组合设计了两项契约，集成真跑（票 20261118-6df0，rc.4 星座多轮取证）实证其在 **web/desktop 组合**下不成立：

1. 插件 cordis.patch.yml 无条件自带 `id: mcp` 的 manager 行——web 组合官方 `dsh-web-app` bundle patch 自带 `id: mcp-manager` 行（官方注释明言它是 installed plugins 注册 server 的官方载体），两行同供 `mcpManager` 服务 → 插件行 duplicate 失败（boot 警告 "1 entry did not activate"）。
2. 插件写面硬编码 settings ns `mcp`——官方 Settings 命名空间随 loader entry id 派生 → web 组合 ns = `mcp-manager`，全部写通道被官方拒（`settings/rejected: No configurable plugin entry "mcp"`）。
3. （重验环补充实证，票 20261118-1dc4）客户端写面经 gateway 的 client api 调用时，`prepareInvocation` 按 `descriptor.parameters.length` **严格数参**（`acceptsUndefined: true` 不豁免传参个数）——`settings/update`/`mutate` 契约为 `[ns, patch/ops, expectedRevision]` 三参必传位；2 参调用在真机浏览器全部写通道失败，而线层 envelope 命名参数形态（`{ns, patch}`）不经该校验层——两层测试面（线层 e2e + 2 参替身单测）双双漏过，人工浏览器走查才暴露。

## 决策

1. **manager 行组合化：官方预挂在场即让位**——插件行加 `disabled: !!js "ctx.get('profileContext')?.startedBundles?.includes('@deepseek-ai/dsh-web-app')"`（官方条件行先例；判据 = startedBundles 含官方预挂 bundle，rc.4 星座唯一自带 manager 行者）。web/desktop 组合官方行独供；sdk/headless/acp 组合插件行补位独供；非 dsh 启动条件求值假、行在场（round 1 行为保持）。未来桌面端若改用非 web-app bundle 预挂，需扩判据（已知边界）。
2. **settings ns 一律派生，不硬编码**——写面（Host 命令/工具 + 客户端面板）写前经 `settings.describe()` 定位「value.servers 在场的唯一配置域」取其 ns 与 revision；零/多在场即拒绝（fail loud 不猜测）。round 1「web 上为 mcp」口径作废。
3. **客户端 settings 写面显式三参**——update/mutate 第三参 `expectedRevision`（number）取紧邻写前同一次 describe 的写目标域 revision（editServer 的 ops diff 基线与 revision 同刻无窗口）——乐观并发保护，官方消费方先例同款；stale 冲突经 `SettingsRevisionConflict` → `{ok:false}` 由面板拒写投影内联。Host 侧走 dsh-settings in-process 服务面（`expectedRevision?` 真可选、不经 gateway 数参层），保持 2 参合法，不跟改。

## 后果

- 正面：web/desktop 与 sdk/headless/acp 双组合各恰一个 manager 提供者；写通道双组合全通（验收 20261118-0123 真机全操作复测 8/8）；官方版本演进只在 describe 派生点适配，无 ns 硬编码散布。
- 代价：条件判据与官方 bundle 名（dsh-web-app）耦合，官方重构组合载体时需跟进；写前多一次 describe 读（官方消费方同款成本）；第三参语义（revision 管理）成为写面类型契约的一部分，替身必须照三参镜像。
- 复核触发点：官方 dsh-web-app 更名或 manager 行迁移时；官方 client api 校验层形态变化时。
