---
id: 0003
spec: 20261118-0de6
status: draft
created: 2026-11-18
---
# dsh MCP Dock 页界面设计方案（美化轮）

## 对象与输入

界面对象：dsh Web Client 右栏 Dock 页「MCP Servers」面板（Web 对象分册，浏览器内嵌管理控制台）。约束输入：brief 0002（approved，单角色三要素 + 跨切同基线）；基线：docs/standards/design-web.md（已读入，全程跟随）；现状：`agents/dsh/plugins/dsh-mcp/client/index.ts`（892 行，裸 createElement 无样式层——美化 = 建 token 化样式层，布局与功能不变）。设计机制依据（官方一手）：`dsh-client-ui-theme`（--dsw-* token 体系 + ThemeSnapshot 分发）、`dsh-client-ui-*` 组件 CSS Modules（消费范式参照）。

## 布局方案

单列清单布局（列表为主区，无主从下钻——面板窄栏从属地位）。每条布局决策注明满足的约束（brief 0002）：

1. **面板头**：标题「MCP Servers」+ server 计数（次信息 12px）+「添加」常驻按钮（primary 形态，头部右侧）。〔满足：添加路径 ≤3 步第 1 步常驻可见〕
2. **server 行卡**：单行自足——名称（label-primary 14px 加权）+ transport（label-tertiary 12px）+ 状态徽章（右侧，pill 圆角）+ 工具数（12px）；行卡 radius-md、border-l2 1px、bg-layer-1 底。〔满足：单行自足、次信息不与状态争权重、密度单列〕
3. **异常突出**：failed / waiting-credentials 行的状态徽章用 state-error 色系徽章 + 行卡内联原因块（等宽字体 12px、bg-layer-2 底、左侧 3px state-error 提示条）——原因默认内联可见（异常行信息不折叠）。〔满足：异常行优先于正常行被看见、失败线索内联〕
4. **行内操作条**：行卡底部动作行——connected：停用/编辑；disabled：启用/移除/编辑；failed & waiting-credentials：重试/移除（移除带一次确认）。ghost 形态 12px 按钮，动作触发即时中间态（connecting… / probing…）。〔满足：启停/重试行内一步、动作后果可见；移除一次确认（brief 假设 2 已成立）〕
5. **添加表单**：点「添加」在清单上方展开（非弹窗）——transport 下拉切换 stdio/远程字段组（同表单内切换，已填字段保留）；提交/取消在表单底部。〔满足：添加 ≤3 步、transport 切换不换页不丢字段；表单按需展开不常驻〕
6. **行内编辑表单**：点「编辑」行卡切换为编辑态（同位展开）——可变字段呈现，凭据字段显示脱敏占位（`[redacted]`）+「未重输即保留」提示文案；保存即生效。〔满足：编辑 ≤2 步、凭据脱敏语义的视觉呈现〕
7. **空态**：引导文案（/mcp add 与对话式添加指引），无按钮无表单入口。〔满足：FR-5 / D4 拍板〕
8. **错误降级**：watch 流错误时面板内呈现错误块（错误摘要 mono 体 + 「切走再切回重试；/mcp list 命令始终可用」指引）——不崩溃不白屏。〔满足：round 1 已实现降级语义的视觉承接〕
9. **加载态**：watch 首批未到时 skeleton 行（3 条骨架 + 「正在读取」提示）。〔满足：加载态可感知，白屏不可接受〕

**移动端适配决策：选断点 ≤767px**（brief 密度节已委托；基线引官方窄视口规则）。断点下变化：面板本为侧栏窄栏无多列可收——表单字段转全宽竖排、行内操作按钮允许换行、字号阶梯不变（12/14px 档不缩）。桌面 >767px 按上述布局。不做独立移动布局（面板从属会话区，移动访问场景为会话主场景的附带查看，约束未提移动专属需求）。

## 视觉决策与基线跟随

（全程跟随 design-web.md，逐项对齐；token 值以宿主 ThemeSnapshot 注入为准，原型内嵌快照仅供独立预览。）

- **配色**：全量 `var(--dsw-alias-*)`——面板底 bg-layer-1、表单/内联块底 bg-layer-2、主文字 label-primary、次信息 label-tertiary、边框 border-l2、错误 state-error-primary、按钮 primary-fill/ghost 系。零硬编码色值。〔基线配色项〕
- **字体**：不写死字体族（继承宿主三路用户设置）；品牌场景不用 Montserrat（面板无品牌头部）。〔基线字体项〕
- **字号**：14px 正文（名称/引导/表单输入）+ 12px 次信息（transport/工具数/计数/原因线索）两档——语义 token 可用时用 `--dsw-font-*` 组合 token（基线假设 2：design-ui 实现时全量提取档位）。〔基线字号阶梯项〕
- **圆角**：行卡/表单 radius-md(12px)、内联提示条 radius-xs(4px)、状态徽章 pill(999px)、面板容器 radius-lg(16px)——全 token 引用。〔基线圆角阶梯项〕
- **间距**：px 直值参照官方组件实况（行卡内 10–12px、动作条 gap 6px、区块间 8px、面板 padding 12px）——基线「无全局 spacing token」口径。〔基线间距项〕
- **elevation**：面板容器 radius-lg + border-l2（无阴影或 elevation-soft 档）；行卡无阴影（bg/border 区分层级——少即是多章法）。〔基线 elevation 项〕
- **状态徽章**：四态可辨识（connected 绿系/failed 红系/waiting 黄系/disabled 灰系底色 + 文字），不只靠色相（文字标签同现）——WCAG 文字色区分。〔基线状态色规则 + web 分册对比度口径〕

## 原型（四态）

`/tmp/design-ui-dock.html`（75 行，单文件零依赖；浅色/深色切换 + 正常/加载/空/错误四态切换；主流程可点通：添加表单展开/提交、启停切换、重试、编辑展开、移除确认）。token 快照内嵌（static 色值取自官方 client.js 一手来源：bluish-{00,50,100,150,400,600,750,850,875,950,1000}、red-{400,600}）仅供独立预览——实现时值来自宿主 ThemeSnapshot 注入。打开命令：`open /tmp/design-ui-dock.html`。

## 硬指标自查

1. 正文对比度 ≥4.5:1：**通过**——正文 label-primary（#0f1115）on bg-layer-1（#fff）对比度 ≈17:1；dark label-primary（#f9fafb）on bg-layer-1（#232324）≈15:1；官方正文即此组合（宿主默认对，实况即证据）。failed 内联文字 state-error-primary dark=#f25a5a on #232324 ≈4.6:1 / light=#ec1313 on #fff ≈4.6:1——**通过**（边缘档，如实测低于 4.5 实现 时加深一档 state 色，属 token 内选择非偏离）。
2. 正文字号 ≥14px：**通过**——正文/表单输入 14px；12px 仅 transport/工具数/计数/原因线索等辅助信息（web 分册「12px 仅限标签辅助信息」口径）。
3. 触控目标 ≥44px：**豁免**——桌面指针设备场景（侧栏面板属桌面 web，D6/round 1 同口径），按钮实高约 26px 符合桌面密度惯例。
4. 间距与字号阶梯符合基线：**通过**——圆角/字号/间距全按基线阶梯与官方实况（见视觉决策）；无阶梯外取值。

## 偏离与豁免

全程跟随基线 design-web.md，无偏离。豁免一条：触控目标 44px（硬指标 3）——桌面指针设备豁免（基线密度项面板从属会话区，桌面 web 场景）。

## 述标素材

- **风格跟随声明**：全程跟随基线 design-web.md（配色 alias 面/三路字体/密度/圆角与字号阶梯/组件观感六项逐项对齐，零硬编码）；实现时校验点 = bundle 内无 `#[0-9a-f]{3,6}` 直值色、无 font-family 写死、全部取色经 `var(--dsw-alias-*)`。
- **交 design-deliver 定稿的清单**：本稿布局方案 9 条 + 视觉决策 7 项 + 原型（临时路径 `/tmp/design-ui-dock.html`，定稿落 docs/designs/assets/）+ 硬指标自查结果 + 豁免 1 条（触控目标）。
