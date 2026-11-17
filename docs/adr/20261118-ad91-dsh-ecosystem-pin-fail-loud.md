---
id: 20261118-ad91
status: accepted
created: 2026-11-18
---
# 20261118-ad91: dsh 官方发布星座错位期间的插件依赖策略——如实钉版 fail-loud + 集成前置门兜底

## 背景

`@hankchen/dsh-mcp`（spec 20261117-34d4）依赖官方 `@deepseek-ai/dsh-mcp-manager` 挂载 server 舰队引擎。实现期实证（票 20261117-975b 三轮真实 boot 探针 + 票 20261118-2d72 npm view 逐一核验）：官方各包**peer 精确钉同 rc 兄弟套件**（manager 0.2.2-rc.X 的 peer 钉 dsh-tools/mcp-client/util-values/typert-protocol 0.2.2-rc.X），而主包 `@deepseek-ai/dsh` 的 npm `latest` 标签（0.2.2-rc.1）没有兼容 manager——`latest` 星座组合无法安装，兼容组合只存在于 `next` 标签（0.2.2-rc.2+）。官方 `dsh plugin install --allow-version` 豁免路径被探针证伪：精确版本豁免后 boot 兼容门再次禁用 manager 行，双豁免后 manager activate 因 peer 解析缺 `ReconnectSchema` 导出失败，连带插件行 pending、settings 命名空间 `mcp` 不存在——豁免不可达。

## 决策

1. **插件依赖如实钉版，不做兼容性伪装**：`engines.dsh: ">=0.2.2-rc.2"`（显式排除无兼容 manager 的官方 latest rc.1）、`dependencies.@deepseek-ai/dsh-mcp-manager: "^0.2.2-rc.2"`（覆盖 rc.2/3/4 与 0.2.2 正式版、prerelease 语义不误吸 0.3.x）。错配组合（latest 宿主 + 本插件）被官方安装门显式拒绝——fail-loud 优于静默错配（静默错配的失败形态是插件 pending 无提示，排障成本远高于安装期拒绝）。
2. **集成验证用显式钉版本组合真跑，不由 latest 不可用阻塞**：集成测试前置门四条件（node <24 / registry 不可达 / 包未发布 / 兼容星座不可达），真跑分支显式钉 `dsh@<dist-tags.next>` + 同版 manager；latest 错位期间端到端覆盖不静默消失（skip 必须留因，版本家族正则不得硬钉——评审 20261118-923e 阻断 1 的教训）。
3. **不绕开官方 manager 自实现管理面**（spec 非目标 6 的延续）：生态错位是官方发布节奏问题，插件侧唯一正确动作是如实声明 + 显式拒绝，官方补发兼容星座后无需改插件即可直装（`engines` 无上界 + manager 范围覆盖式声明）。

## 后果

- 正面：错配在安装期显式暴露（用户可执行动作明确：切 next 标签宿主）；官方对齐 latest 后零改动直装；集成覆盖随生态前移自动恢复真跑。
- 代价：latest 宿主用户当前装不上本插件（README「已知边界」写明）；发布面必须随官方星座演进观察（`npm view` 核验留痕进发布纪律）。
- 复核触发点：官方 latest 升至 rc.2+ 时本 ADR 的背景事实失效，届时钉版范围无需改（已覆盖），此 ADR 记录的错位处置不再活跃。
