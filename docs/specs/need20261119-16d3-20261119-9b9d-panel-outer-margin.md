---
id: 20261119-9b9d
status: done
need: 20261119-16d3
round: 1
created: 2026-11-19
approved: 2026-11-19
done: 2026-11-19
---
# Dock 页面板卡外缘边距 8px（快通道追认登记）

## 问题陈述

用户截图实测：Dock 页面板卡相对宿主右侧栏容器贴边（外缘边距 ≈0）——宿主容器自身零 padding，面板根元素无 margin 声明（need 20261119-16d3 背景节）。

## 方案

`.dsh-mcp-panel` 加 `margin:8px`（既有 6px gap / 10–12px padding 阶梯内中值）；样式契约断言钉值；design 0004 间距口径注记修订（先改文档再改代码）。

## 用户故事

- 作为 dsh 使用者，我想让面板卡与侧栏容器有卡片式留白，以便不出现贴边局促。

## 实现决策

- 外边距加在面板根元素单点（不动内部 padding 12px 口径、不动行卡/表单自身间距）。
- 视觉决策以编译产物契约断言钉值（`.dsh-mcp-panel{…margin:8px…}`），防回归。

## 测试决策

- 契约测试 red-green：编译产物断言 margin:8px 在场（test/unit/dsh-mcp-client-style-contract.test.ts）。

## 验收场景

- [FR-1 | 工单级] Given 编译产物，When 样式契约测试，Then `.dsh-mcp-panel` 外边距 8px 断言通过。
- [FR-2 | 人工：视觉观感需真页面目验] Given dsh 会话页面加载，When 打开 Dock 页，Then 面板卡与容器边缘出现 8px 留白（用户重载目验）。

## 非目标

- 面板内部 padding 调整、行卡/表单间距重排（design 0004 既有口径不变）。

## 备注（快通道追认登记）

- retro 20261119-6698 采纳 A 项补登记；实现已随 0.3.2 发布（commit 53c113c），验收证据 = red-green 契约断言（7/7 绿）+ design 0004 注记修订 + 全量门禁（559 项）。
- 首版诊断曾误拧内部 padding，用户截图纠正后定为外边距方案（误诊未产生落盘变更）。
