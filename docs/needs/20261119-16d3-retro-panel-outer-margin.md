---
id: 20261119-16d3
status: fulfilled
created: 2026-11-19
confirmed: 2026-11-19
fulfilled: 2026-11-19
---
# Dock 页面板卡与宿主容器外缘边距（快通道追认登记）

## 背景与业务目标

2026-11-19 用户截图实测（红框标注）：Dock 页面板卡相对宿主右侧栏容器**贴边呈现、外缘边距 ≈0**——宿主 Dock 容器自身零 padding，而面板根元素 `.dsh-mcp-panel` 无 margin 声明（面板内部 padding 12px 属 design 0004 既有口径，不受影响）。业务目标：面板卡与宿主容器之间出现可见呼吸边距，消除贴边局促。

## 干系人与用户

- dsh 使用者：右栏 Dock 页的浏览者，期望面板卡与侧栏容器有卡片式留白而非贴边。

## 系统能力需求

- FR-1 `.dsh-mcp-panel` 声明外边距 8px（取既有 6px gap / 10–12px padding 阶梯内中值），面板内部 padding 12px 口径不变。
- FR-2 该视觉决策以样式契约断言钉值（编译产物含 `.dsh-mcp-panel{…margin:8px…}`），防回归。

## 场景

- Given 编译产物，When 样式契约测试扫描，Then 断言面板外边距在场（red-green：test/unit/dsh-mcp-client-style-contract.test.ts『面板卡与宿主侧栏容器外缘呼吸感…』）。
- Given dsh 会话页面加载，When 打开 Dock 页，Then 面板卡与容器边缘出现 8px 留白（用户重载后目验）。

## 假设与风险

- 假设：8px 满足观感预期（用户未给目标值；如需再调属样式微调，沿本通道小步走）。

## 备注（快通道追认登记，retro 20261119-6698 采纳 A 项）

- 本 need 为 retro 追认补登记：变更已随 `@hankchen/dsh-mcp@0.3.2` 发布（commit 53c113c，2026-11-19），red-green 契约断言 + design 0004 注记修订（间距口径补外边距决策）+ 全量门禁（559 项）为验收证据。
- 原始通道误差（源码改动误用 [trivial] 承载）由 retro 20261119-6698 豁免审计判定滥用并经用户采纳 A 项补登记。
- 首版诊断曾误拧内部 padding（12→16px），用户截图纠正后改为外边距方案——误诊过程未产生落盘变更。
