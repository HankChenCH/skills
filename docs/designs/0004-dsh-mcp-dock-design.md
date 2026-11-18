---
id: 0004
spec: 20261118-0de6
status: draft
created: 2026-11-18
---
# dsh MCP Dock 页美化述标：token 化样式层让插件 UI 与宿主不可分辨

## 界面设计

### 设计意图

Dock 页功能与布局经 round 1 验收（need 20261118-11f8 fulfilled），但实现为裸 createElement HTML（无样式层），渲染为浏览器默认观感——这是「样式丑且与 dsh 风格不统一」的直接根因，也是用户发起美化轮的动因。本述标的取舍：**布局与功能零变更、只建 token 化样式层**——所有取值经 `var(--dsw-alias-*)`（官方插件 UI 指定机制），使面板与宿主不可分辨；异常优先（failed/waiting-credentials 行视觉权重最高）以贴合开发者「扫一眼知健康度」的核心任务；动作全部行内一步、中间态即时可见（connecting…/probing…），不引入弹窗与二级页——管理操作高频而轻量，打断成本必须趋零。样式层机制选型（CSS Modules / style 注入形态）归实现票裁量，述标只锁 token 消费契约：bundle 内零硬编码色值、零写死字体族。

### 角色约束

单一角色：dsh web 使用者（开发者，后台操作员画像；brief 0002 approved）。三要素 → 布局决策映射（决策编号见 ui 草稿 0003）：

| brief 约束 | 布局决策 |
|---|---|
| 信息优先级：异常行优先被看见 | 决策 3（failed/waiting-credentials 行 state-error 徽章 + 原因内联块不折叠） |
| 信息优先级：单行自足、次信息不争权重 | 决策 2（名称 14px 加权 + transport/工具数 12px 次信息 + 状态徽章右侧 pill） |
| 信息优先级：失败线索仅异常行内联 | 决策 3（内联块 bg-layer-2 底 + 3px 提示条，非弹窗） |
| 信息优先级：面板不抢会话注意力 | 视觉决策（面板 border-l2 弱边框、行卡无阴影、bg-layer 差替代重装饰） |
| 密度：单列中低密度一屏 ≥5 行 | 决策 2（行卡紧凑 padding 10–12px，典型 1–10 server 全量可见） |
| 密度：表单按需展开不常驻 | 决策 5/6（添加/编辑均为展开态，不占常驻空间） |
| 路径：查状态 ≤1 步 | 决策 2（打开面板即扫全清单健康度，无下钻） |
| 路径：启停/重试行内一步、后果可见 | 决策 4（行内 ghost 按钮 + connecting…/probing… 即时中间态） |
| 路径：添加 ≤3 步、切换不换页不丢字段 | 决策 5（头部常驻钮 → 展开表单 → 提交；transport 同表单切换） |
| 路径：编辑 ≤2 步、凭据语义不打断 | 决策 6（行内展开、凭据 [redacted] 占位 + 未重输保留提示） |
| 空态无按钮（D4 拍板） | 决策 7（引导文案指向会话内方式） |
| 跨切：与 dsh 风格同基线 | 视觉决策全项（全量 --dsw-* token 消费） |

### 风格跟随声明

**全程跟随基线 design-web.md，零偏离。** 六项逐项对齐：① 配色——全量 `var(--dsw-alias-*)`（bg-layer/border/label/state-error/button 族），零硬编码色值；② 字体——不写死字体族（继承宿主 text/code/terminal 三路用户设置），面板内无品牌字体场景；③ 密度——侧栏单列中低密度一屏 ≥5 行、≤767px 断点下表单竖排按钮换行；④ 圆角与字号阶梯——radius-md/lg/xs/pill 全 token 引用、正文 14px + 辅助 12px 两档；⑤ 组件观感——CSS Modules 范式 + 官方组件实况间距直值（10–12px/6px gap）；⑥ 反例自查——无阶梯外取值、无误用 Chrome DevTools tokens、无自管双主题、无重阴影抢注意力。豁免一条（非偏离）：触控目标 44px 桌面指针设备豁免（ui 草稿硬指标 3，述标素材留痕）。实现校验点：bundle 内无 `#[0-9a-f]{3,6}` 直值色、无 font-family 写死、取色全走 token。

### 硬指标自查结果

1. 正文对比度 ≥4.5:1：**通过**——label-primary #0f1115 on bg-layer-1 #fff ≈17:1（light）、#f9fafb on #232324 ≈15:1（dark）；failed 内联文字 state-error-primary #ec1313 on #fff ≈4.6:1（light）/ #f25a5a on #232324 ≈4.6:1（dark）——边缘档留实现预案：实测低于 4.5 时加深一档 state 色（token 内选择，非基线偏离）。
2. 正文字号 ≥14px：**通过**——正文/表单输入/引导文案 14px；12px 仅 transport、工具数、计数、原因线索、徽章文字（web 分册「12px 仅限辅助信息」口径）。
3. 触控目标 ≥44px：**豁免**——桌面指针设备场景（面板属桌面 web 侧栏，round 1 D6 同口径），按钮实高约 26px 符合桌面密度惯例；豁免理由随本节留痕进述标。
4. 间距与字号阶梯符合基线：**通过**——圆角全 token（radius-md/lg/xs/pill）、字号两档（14/12）、间距 px 直值按官方组件实况（基线「无全局 spacing token」口径）；原型与规格无阶梯外取值。

## 原型

`docs/designs/assets/0004/dock-page.html`（75 行，单文件零依赖，git 可见）。打开命令：`open docs/designs/assets/0004/dock-page.html`。四态切换钮常驻（正常/加载/空/错误）+ 浅色/深色主题切换；主流程可点通（添加表单展开提交、启停切换、重试、编辑展开、移除一次确认）。token 快照内嵌（static 色值一手来源 `@deepseek-ai/dsh-client-ui-theme@0.2.2-rc.4` lib/client.js，2026-11-18 取证）仅供独立预览——实现时值来自宿主 ThemeSnapshot 注入。
