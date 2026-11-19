---
id: 20261119-5625
status: fulfilled
created: 2026-11-19
confirmed: 2026-11-19
fulfilled: 2026-11-19
---
# /mcp add 选项值含引号添加期拒收（快通道追认登记）

## 背景与业务目标

2026-11-19 会话实测（用户原话「请求头：Authorization="Bearer xxxtoken"，添加会连接失败」）：`/mcp add` 斜杠命令按空白切 token、不做引号剥离——`--header=Authorization="Bearer …"` 被劈裂后引号原样入库（头值成为 `"Bearer`），settings 写成功、失败延迟到 server 连接期才以 failed 状态暴露。业务目标：带引号的选项值在**添加期**即拒收并指明复杂值入口，失败不延迟、不错误数据落盘。

## 干系人与用户

- dsh 使用者：用 `/mcp` 斜杠命令接 remote server，期望错值当场被拒而不是静默入库后连接失败。

## 系统能力需求

- FR-1 Given `/mcp add` 的选项值（cwd/env/header）含引号字符（`"` 或 `'`），When 解析，Then 添加期返回 error 拒收：信息点名引号问题、给出 `mcp_manage` 工具与右栏面板替代入口、建议敏感值走 `${credential:REF}` 模板，settings 零调用。
- FR-2 usage 帮助文本同步该边界（选项值不含空格、引号拒收、复杂值走工具/面板入口）。

## 场景

- Given `--header=Authorization="Bearer tok"`（token 化后值段含引号），When add，Then error 拒收且 settings 零调用。
- 不变式：`mcp_manage` 工具入口结构化传参不受影响（值含空格/引号合法）。

## 假设与风险

- 假设：本插件场景合法选项值不含引号字符（HTTP 头值语法可含引号但无需求实例）；如需斜杠命令直接支持带空格/引号值（引号感知解析），另立 need（round-3 候选，20261119-6698 retro 已记录）。

## 备注（快通道追认登记，retro 20261119-6698 采纳 A 项）

- 本 need 为 retro 追认补登记：变更已随 `@hankchen/dsh-mcp@0.3.2` 发布（commit 7a25c54，2026-11-19），red-green 单测（test/unit/dsh-mcp-plugin.test.ts『命令 add 选项值含引号…』28/28 绿）与全量门禁（559 项）为验收证据。
- 原始通道误差（源码改动误用 [trivial] 承载）由 retro 20261119-6698 豁免审计判定滥用并经用户采纳 A 项补登记；根因（AGENTS.md「小修」措辞与 GLOSSARY 通道定义口径差）由采纳 B 项消解。
