# web 设计语言基线
## 适用范围

本仓库一切 web 界面交付：dsh 插件的 Web Client 内嵌面板（Dock 页、插件详情区块）与后续 UI 型插件的客户端界面。基座 = dsh 官方 Web Client 设计语言（`--dsw-*` token 体系），目标是插件 UI 与宿主风格不可分辨。

依据（一手来源，2026-11-18 取证）：官方安装 `@deepseek-ai/dsh-client-ui-theme@0.2.2-rc.4 星座` lib/client.js 内嵌 token stylesheets（139KB）、README（主题机制权威说明）、`dsh-web-frontend/dist/assets/index-*.css`（构建产物）、`dsh-client-ui-*` 组件 CSS Modules 源码（消费形态参照）。

## 配色

- **色板基座**：`--dsw-static-neutral-bluish-{00…1000}` 蓝灰中性阶梯（1000 档）。语义值一律经 **alias 层**引用，不直接引 static 值。
- **主题三态**：light / dark / system（`prefers-color-surface` 解析），由 `dsh-client-ui-theme` 经 ThemeSnapshot 分发；插件 UI 只消费 token 不自管主题状态。同一 alias 在两主题下映射不同 static 值（例：`--dsw-alias-bg-base` = light `bluish-00` / dark `bluish-950`；`--dsw-alias-brand-text` = light `bluish-1000` / dark `bluish-50`）。
- **常用 alias 面**（官方组件实况）：背景 `--dsw-alias-bg-layer-{1,2,3}`、`bg-base`；边框 `--dsw-alias-border-{l1,l2,l3,l4}`；文字 `--dsw-alias-label-{primary,primary-foreground,tertiary,on-color}`（primary-fill 底的文字配对 = `label-primary-foreground`——浅 bluish-00 白 / 深 bluish-1000 黑随主题翻转，rc.5 一手取证：官方组件 `background: primary-fill` + `color: foreground` 配对先例；`label-on-color` 恒白不随主题翻转，勿配翻转底）；状态 `--dsw-alias-state-error-primary`（语义色：正常用 brand/label 系、警示用 state 系，值随主题）；按钮 `--dsw-alias-button-{primary-fill,primary-hover,ghost-*,floating-*,tool-bar-*}`。
- **规则**：新 UI 一律 `var(--dsw-alias-*)` 取色；需要新语义色时经 `ctx.theme` 注册 alias-token override（官方机制），不硬编码色值。

## 字体

- **三路字体独立**：text（界面与对话正文）/ code（代码块与 `--ds-font-family-code` 标记文本）/ terminal（侧栏终端）——用户可在 Settings 分别设置，插件 UI 不写死字体族。
- **品牌字体**：Montserrat（brand-font.css，weight 300/400/500，OFL 授权），经 `--dsw-font-family-brand` 引用。
- **字号基线**：正文默认 14px（用户可调 10–22，逐档联动）、代码默认 11px（10–16）、终端默认 13px（10–20）；小字固定字号不随联动。插件 UI 用语义 token 取字号（见下），面板内不出现阶梯外固定字号。
- **行长**：面板内容区遵循 45–75 字符行长上限（typography 章法）；面板窄栏天然满足，表单与说明文本不超限。

## 密度

- 侧栏 Dock 面板：中低密度单列，一屏 ≥5 条目；行内自足（主信息 + 次信息单行扫全）。
- 主区（会话）优先：面板视觉总量以不抢会话区注意力为上限（弱边框、浅层次）。
- 视口响应：≤767px 视口（含窄桌面窗口）按官方窄视口规则竖排堆叠（官方 settings 行为参照）；断点方案归 design-ui。

## 间距与字号阶梯

- **圆角阶梯**（`--dsw-radius-*`）：xs 4px / sm 8px / md 12px / lg 16px / xl 20px / panel 28px / pill 999px。修订（2026-11-18，rc.5 一手取证）：宿主主题 stylesheet 实际只分发 xs/sm/md/lg/xl/panel 六档，pill 档未随主题分发（`--dsw-radius-pill` 不存在，解析为空）——插件侧引 pill 档必须带直值兜底（`var(--dsw-radius-pill, 999px)` 形态），基线记载的七档全分发与实况不符以本注记为准。
- **字号阶梯**：语义组合 token 族 `--dsw-font-<档>`（每档带 -font-family/-font-size/-font-style/-font-weight/-line-height 五元组，引用整组不拆散），已证实常用档 base-16 / m-18 / l-20（其余档清单归 design-ui 时全量提取——假设：档位全集以 token stylesheets 为准）。
- **间距**：官方无全局 spacing token——组件级 px 直值（官方组件实况：gap 10px、padding 18px 一类）；本基线沿用同法：间距用 px 直值、以官方组件实况为参照系，不发明 spacing token（假设：官方后续若引入 spacing token 则跟随，届时修订本册）。
- **elevation**：`--dsw-elevation-{soft,panel,prominent,stroke}` 四档 + `--dsw-shadow-lv{1,2,3}`；侧栏面板用 panel 档。

## 组件观感

- **写法范式**（官方组件实况 = CSS Modules 源码）：取色/圆角/阴影一律 `var(--dsw-alias-*)` / `var(--dsw-radius-*)` / `var(--dsw-elevation-*)`；字号 px 直值限 12px（次信息）/14px（正文）两档起步。
- **卡片/容器**：`--dsw-radius-lg` 圆角 + `--dsw-alias-border-l2` 边框（1px）+ bg-layer 层级区分，不用重阴影。
- **按钮**：按语义选 button alias 族——主要动作 primary-fill/hover、次动作 ghost 系、悬浮元素 floating 系、工具条 tool-bar 系；同一视图内按钮层级 ≤2 种。
- **状态色**：连接/健康度用 label 系 + state-error-primary；错误内联块以 state-error 文字色 + 左侧提示条（官方提示块形态参照），不整行大面积染红。
- **状态流转可见性**：异步动作给即时中间态（connecting…/probing…），完成后落定态；沿用官方 watch 流的推送节奏，不自行轮询。

## 反例

1. **不消费 `--dsw-*` token、自挑色值与字体**——现 Dock 页风格脱节的根因，美化轮首要纠正项。
2. **自管 light/dark 双套样式或写死主题**——主题状态归 `dsh-client-ui-theme`，插件只读 token。
3. **使用 Chrome DevTools tokens（`--sys-color-*`、`--ref-palette-*`）**——那是 `dsh-experimental-inspector`（devtools 工具）借用物，不属产品 UI。
4. **阶梯外取值**：字号 13/17/18px 直值（走 `--dsw-font-*` 组合 token 或 12/14 两档）、圆角 10px（走 radius 阶梯）。
5. **面板抢主会话注意力**：重阴影、强边框、大面积高饱和色块。
6. **同一视图按钮层级 >2 种或每按钮一种样式**——按 button alias 语义族收敛。

## 假设

1. 「间距无全局 token、组件级 px 直值」——官方 client-ui-* 源码实况归纳；官方后续若引入 spacing token，本册跟随修订。
2. `--dsw-font-*` 语义档全集未逐档提取（base-16/m-18/l-20 已证实），design-ui 消费时全量提取并回填本册。
3. 正文默认 14px 等三路字号默认值出自 theme README（10–22/10–16/10–20 可调区间同源）；未实测 Settings 面板复核。
