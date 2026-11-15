# agents/ 扩展资产布局规范

本规范定稿 `agents/<宿主>/<机制>/` 目录模式（need 20261115-fc48 FR-1 round 1 深度），输入 = RQ4 宿主普查报告的分类学（`docs/research/host-survey/20261115-agent-host-extension-survey.md`，T1–T8 机制类型 + 49 宿主逐个目录约定）。治理规则「先改文档再改技能」（`docs/concepts.md` 单一真相源）：本册先行定稿，目录迁移折 round 2 按本册执行——**本册描述目标态；round 2 迁移票（20261115-30f2）落地后 `agents/` 已是仓库现状，本册即现态描述**。

`docs/plugin-assets.md` 是插件资产的生产约定与 dsh 运行时形态，已按 §4.3 引用面清单回改至 `agents/` 布局（20261115-30f2），与本册同述现态：本册管宿主分层模式与机制枚举，plugin-assets.md 管插件包形态与发布纪律。升格进 `CODING_STANDARDS.md` 索引属后续 design 票事，本册落定时不改索引。

## 一、目录模式定义

### 1.1 三段模式

```text
agents/<宿主>/<机制>/<条目>
```

- 宿主层：一个宿主一个目录，承载该宿主全部扩展资产。
- 机制层：固定枚举（§1.3，来自 RQ4 分类学 T1–T8），一层只放一类机制。
- 条目层：逐机制定义形态与清单要素（§二）。

### 1.2 宿主段命名

- 宿主段 = 宿主标识，**不含前导点**：`AGENT_DIRS` 条目（`src/agent-dirs.ts`）去前导点，条目内路径分隔符 `/` 转连字符——`.deepagents/agent` → `deepagents-agent`、`.posit/assistant` → `posit-assistant`、`.tabnine/agent` → `tabnine-agent`。
- 非 `AGENT_DIRS` 宿主用惯用短名，首个实例：dsh（DeepSeek Harness，GLOSSARY 词条）。
- 宿主段不得再含 `/`——保证 `agents/*/<机制>` 恒为两层，发布对账与编目的两级枚举依赖此形状。

### 1.3 机制段枚举（RQ4 T1–T8 映射）

| 机制段 | RQ4 类 | 条目形态 | 建目录口径 |
|---|---|---|---|
| `skills/` | T1 | `<技能名>/SKILL.md` 目录 | 全宿主主干，一次设计全 |
| `commands/` | T2 | 命令文件（md 系 / TOML 系逐宿主） | 官方文档载明才建 |
| `hooks/` | T3 | hook 文件（目录型宿主） | 仅目录型建；配置声明型落宿主根文件条目 |
| `rules/` | T4 | 规则文件（目录型宿主） | 仅目录型建；单文件型落宿主根文件条目 |
| `agents/` | T5 | 子代理定义（md+frontmatter / json 逐宿主） | 官方文档载明才建 |
| `plugins/` | T6 | 插件包容器（各自完整 npm 包） | 官方文档载明才建 |
| （无机制段） | T7 | 宿主根文件条目（`mcp.json` 等配置） | 不入目录型扩展，落 `agents/<宿主>/<文件名>` |
| （逐宿主定名） | T8 | 其他专有形态（`prompts/`、`microagents/` 等） | 机制段取宿主官方目录名，逐条标注承接/不承接 |

按需建目录原则：宿主官方文档载明哪几类机制就建哪几个机制目录，**不建空目录**（仅 skills 宿主只建 `skills/`，RQ4 输入要点 2）。宿主根文件条目（T4 单文件规则、T7 配置）落 `agents/<宿主>/` 根，文件名逐宿主取官方约定（`AGENTS.md`、`CLAUDE.md`、`mcp.json`、`crush.json` 等），安装时由安装器映射到宿主读取的路径。

### 1.4 与顶层 skills/ 的分界

顶层 `skills/` 留置不动（need FR-1 拍板）：它是**跨宿主通用**技能资产，经 `.agents/skills/` 安装目标 + 软链分发，与本册无关。`agents/<宿主>/skills/` 模式供**宿主专属**技能条目使用（某技能只面向单一宿主、或需按宿主差异化时入位），两类资产并存，互不迁移。

### 1.5 宿主注记义务

每个宿主目录的四类特例必须注记在本册 §附 宿主注记表，防安装器按单一模式误判（RQ4 输入要点 5–7 及普查矩阵机制类型 O 类条的承接标注）：

- 项目级路径特例：Devin 推荐 `.agents/skills/`（`.devin/skills/` legacy）——映射行逐宿主标注。
- 本机级根变体：12+ 宿主本机根不在 `~/.<host>/`（`~/.config/`、`~/.codeium/`、`~/.snowflake/`、`~/.deepagents/` 系）——仓库树只镜像项目级布局，本机级差异由安装器映射表承担（`src/asset-map.ts` 映射表行的 `symlinkRule` 为既有先例）。
- 仅生态宿主（Codemaker、Jazz、Terramind、Tinycloud、MCPJam 自身、Mux 机制页）：只按生态表行建 skills 条目，注记「待宿主官方文档公开后复核」，不虚构其余机制。
- 不承接清单：memory 类平台内建对象（Windsurf/Augment memories、Devin Knowledge、MiniMax Heartbeat、Ona 组织级 skills）、Kiro specs（流程产物）、纯内建斜杠命令宿主（Rovo Dev、iFlow）——注记「不承接」。

## 二、各机制类型的清单要素

对齐插件包四要素的思路（`docs/plugin-assets.md` §1.2）：每类条目定义**身份要素**与**内容要素**，均可机械核验。核验时点两分——编目时核身份（缺失即编目报错，插件条目先例：缺 `name` 编目报错）；发布对账时核内容（缺失即拒绝发布，`verify:pack` 查 2 先例，见 §三）。

| 机制 | 身份要素 | 内容要素 | 依据 |
|---|---|---|---|
| T1 skills | 目录名（= frontmatter `name`，套件先例） | `<名>/SKILL.md` 在；frontmatter `name` + `description` 必填；附属文件随目录 | agentskills.io 开放规范 |
| T2 commands | 文件名（去扩展名 = 命令名） | 宿主官方格式可解析（md+frontmatter / TOML 逐宿主） | RQ4 §T2 格式两分 |
| T3 hooks（目录型） | 文件名 | 宿主 hook 格式可解析 | RQ4 §T3 |
| T3 hooks（配置声明型） | 宿主根文件条目文件名 | 该宿主配置格式可解析 | Command Code settings、ForgeCode `forge.yaml` 等 |
| T4 rules（目录型） | 文件名 | markdown 文件在 | `.roo/rules/` 等 8 宿主官方目录 |
| T4 rules（单文件型） | 宿主根文件条目文件名 | markdown 文件在 | `AGENTS.md` / `CLAUDE.md` 事实标准 |
| T5 agents | 定义文件名 | md+frontmatter 或 json 可解析（逐宿主） | RQ4 §T5 格式两分 |
| T6 plugins | 包 package.json `name`（正名是包名，非目录名） | dsh：四要素 + `engines.dsh`（沿 plugin-assets §1.2）；其他宿主逐宿主补映射 | plugin-assets §1.1–§1.2 |
| T7 配置文件条目 | 文件名（宿主官方命名） | JSON/YAML 可解析；不含 secrets | RQ4 §T7（无一入目录扩展） |
| T8 其他 | 逐宿主条目标注 | 随接入时按宿主官方格式定义 | RQ4 §T8 异类单列 |

插件容器（T6）条目 = `agents/<宿主>/plugins/<插件目录名>/` 整目录完整 npm 包，语义化版本独立演进——与现行 `plugins/` 顶层先例同构，仅宿主层新增。dsh 四要素为 `type`/`main`/`files`/`dsh`，另带 `description` 提示（沿 plugin-assets §1.2，不重抄）；其他宿主清单文件逐宿主映射（`plugin.json` / `qwen-extension.json` / Powers 清单），接入时补映射行。

## 三、发布纪律改造方案

### 3.1 对账现状（`scripts/verify-pack.ts`）

- 技能查：tarball 内 `package/skills/<名>/SKILL.md` 集合 = 仓库 `skills/` 一级目录集合。
- 插件查 1：tarball 内 `package/plugins/<名>/package.json` 集合 = 仓库 `plugins/` 一级目录集合（正则 `^package/plugins/([^/]+)/package\.json$`）。
- 插件查 2：仓库每个插件目录过 bundle 清单校验（`scripts/verify-bundle.ts` 复用，缺陷逐条点名）。
- 包分发：根 `package.json` `files` 白名单含 `"plugins"`（ADR 20261115-f143 包根 = 仓库根，零拷贝分发）。

### 3.2 路径变更方案（双包对账迁至 agents/ 路径）

| 变更点 | 现值 | 目标值 |
|---|---|---|
| `files` 白名单 | `"plugins"` | `"agents"` |
| 查 1 包内侧正则 | `^package/plugins/([^/]+)/package\.json$` | `^package/agents/([^/]+)/plugins/([^/]+)/package\.json$` |
| 查 1 仓库侧枚举 | `plugins/` 一级目录 | `agents/*/plugins/` 两级枚举 |
| 对账键 | 插件目录名 | `<宿主>/<插件目录名>` 复合键 |
| 查 2 bundle 校验 | 逐 `plugins/<名>/` 跑 | 逐 `agents/*/plugins/<名>/` 跑（校验逻辑不变，入参路径变） |

技能查不动（`skills/` 留顶层）。对账键升级为复合键的原因：新布局允许不同宿主下同名插件目录，单键会误合并；复合键两侧同法构造，报错消息点名宿主段，失败可定位。

### 3.3 编目枚举两级化

- `src/asset-map.ts` 插件行 `sourceDir: 'plugins'` → `'agents'`（枚举根）。
- `src/catalog.ts` `listPlugins` 从一级枚举改两级：枚举 `agents/` 下各宿主目录的 `plugins/` 机制目录，条目收集口径不变（正名取包 `name`、缺陷编目报错）。
- 条目正名仍是包名——菜单、安装转发、锁文件记账全部不变（对外行为不变防线，spec 20261115-f650 FR-5）。

### 3.4 原子性与结构性成立

- **原子性**：目录迁移、`files` 切换、`verify-pack` 路径切换、编目两级化、测试路径常量更新属同一条 round 2 迁移票，同一提交序列原子落地——任一项单独先行，对账或编目必红。发布命令序列本身不变（`pnpm pack` → `pnpm run verify:pack <tarball>` → `pnpm publish --access public` → annotated tag；pnpm 形态随 spec 20261115-ed9f FR-4 迁移更新，两道 git 门见 plugin-assets §1.4）。
- **结构性成立**：`agents/` 在仓库根 + `files` 白名单含 `agents` → 打包产物即仓库原文件，对账是机械校验而非流程纪律（ADR 20261115-f143 同构论据）。
- CI 步骤（spec 20261115-f650 FR-2 契约）调用 verify:pack 对账，命令名不变（pnpm 形态下为 `pnpm run verify:pack`，spec 20261115-ed9f FR-4）——脚本内路径变更不波及 workflow 与 README 发布节命令行。

## 四、demo 迁位方案（`agents/dsh/plugins/dsh-demo/`）

### 4.1 目标位与不变量

- 现位 `plugins/dsh-demo/` → 目标位 `agents/dsh/plugins/dsh-demo/`：宿主段 `dsh`（§1.2），机制段 `plugins`（T6 容器）。
- 不变量：整目录迁移，仍是完整 npm 包——包名 `@hankchen/dsh-demo`、版本、清单四要素、registry 发布面全部不变；迁移只动仓库内路径，不改任何对外行为。

### 4.2 迁移步骤（round 2 迁移票按序执行）

1. 建宿主/机制目录并整目录迁移：`mkdir -p agents/dsh/plugins && git mv plugins/dsh-demo agents/dsh/plugins/dsh-demo`（目标父目录先建，否则 `git mv` fatal；整目录：`package.json`、`index.ts`、`cordis.patch.yml` 随迁——迁移执行时 demo 已全仓 TS 化，源文件是 index.ts 非 index.js，`git show 85d3785` 可查）。
2. 根 `package.json` `files`：`"plugins"` → `"agents"`（§3.2）。
3. `src/asset-map.ts` 插件行 `sourceDir` 改 `'agents'`，`src/catalog.ts` `listPlugins` 两级化（§3.3）。
4. `scripts/verify-pack.ts` 路径切换：`PLUGINS_DIR` 枚举根 + 查 1 正则 + 复合键（§3.2）。
5. §4.3 引用面清单逐文件更新测试路径常量与 fixture。
6. 文档回改：`docs/plugin-assets.md` §1.1 仓库布局行改述 agents/ 布局，导语活样例行与 §1.3、§三 的 `plugins/dsh-demo/` 路径提法随迁；README 插件节免改（§4.4）。
7. 全量验证：`pnpm test` 全绿 → `pnpm pack` → `pnpm run verify:pack <tarball>` 对账绿。
8. 全部改动同一提交序列带 `[#工单号]` 提交，一步一验。

### 4.3 连带引用面清单（grep 实证，2026-11-15，运行分支）

第三方照抄本表即得全部连带改动点；行号随迁移前的运行分支为准。标注「补录」的 4 行为迁移票 20261115-30f2 执行时实证的原清单漏列项；补录后本表与迁移提交 85d3785 的触碰面一致。

| 位置 | 引用内容 | 迁移动作 |
|---|---|---|
| `src/asset-map.ts:54` | `sourceDir: 'plugins'` | 改 `'agents'`（§3.3） |
| `src/catalog.ts:49–84` | `listPlugins` 一级枚举消费 `sourceDir` | 两级枚举改造（行为等价迁移） |
| `scripts/verify-pack.ts:20` | `PLUGINS_DIR = path.join(packageRoot, 'plugins')` | 改 `agents` 两级枚举根 |
| `scripts/verify-pack.ts:76–79` | 查 1 正则 `package/plugins/` | 改 `package/agents/<宿主>/plugins/` + 复合键 |
| `scripts/prepack.ts:8` | 头注「skills/plugins 清单与路径不变」 | 措辞随迁改 `skills/agents`（补录） |
| `package.json:13` | `files` 含 `"plugins"` | 改 `"agents"` |
| `tsconfig.json:31` | `include` 数组含 `"plugins"` | 改 `"agents"`（补录） |
| `test/unit/asset-map.test.ts:31` | 期望行 `sourceDir: 'plugins'` | 改 `'agents'` |
| `test/unit/plugin-catalog.test.ts:20` | fixture 建包于 `packageRoot/plugins/<名>` | fixture 改两级布局 |
| `test/unit/plugin-catalog.test.ts:59` | 报错断言 `err.message.includes('plugins')` | 随枚举根文案核对改写 |
| `test/unit/plugin-package.test.ts:11` | `PLUGIN_DIR = …/../../plugins/dsh-demo/` | 改 `…/../../agents/dsh/plugins/dsh-demo/` |
| `test/unit/repo-ts-shape.test.ts:16` | `TS_SOURCE_ROOTS` 含 `'plugins/dsh-demo'` | 改 `'agents/dsh/plugins/dsh-demo'`（测试名与注释同批改，补录） |
| `test/unit/verify-pack-plugins.test.ts:29–44` | stage fixture `package/plugins/` 布局 | 改 `package/agents/<宿主>/plugins/` 布局 |
| `test/unit/verify-pack-plugins.test.ts:86` | 坏包 fixture 路径 `packageRoot/plugins/` | 随枚举根改两级 |
| `test/unit/verify-pack-plugins.test.ts:97–101` | 断言 `files.includes('plugins')` | 改 `'agents'` |
| `test/e2e/plugin-install.test.ts:19、275` | 读 `plugins/dsh-demo/package.json` | 改新路径 |
| `test/e2e/dsh-plugin-integration.test.ts:23` | 读 `plugins/dsh-demo/package.json` | 改新路径 |
| `test/e2e/dsh-ts-loading.test.ts:34` | `PLUGIN_DIR = path.join(packageRoot, 'plugins', 'dsh-demo')` | 改两级路径（补录） |
| `docs/plugin-assets.md:8、37、106` | `plugins/dsh-demo/` 路径提法 | 随迁位回改；§1.1 布局行改述 |
| `docs/standards/agents-layout.md`（本册） | 导语「本册描述目标态，落定前仓库根不存在 `agents/` 目录」 | 迁移落地后更新为既成事实表述 |

### 4.4 核对后不改面（清单完整性边界）

以下引用经 grep 实证**不受迁位影响**，迁移票不得顺手改动：

- `--plugins` 旗标与示例文本（`README.md:113–114`、`src/cli.ts:87`、`bin/infra.ts:242`、`test/unit/cli.test.ts`）：旗标名是 CLI 表面，非目录路径（初稿引 `src/cli-args.ts:37` 与 `test/unit/menu.test.ts`，两者已随 commander 迁移退役/迁走——工单 20261115-eed0）。
- 包名 `@hankchen/dsh-demo` 全部引用（`test/unit/plugin-install`、`dsh-command`、`reconcile`、`verify-bundle`、`menu` 等测试与包内文件）：条目正名是包名（plugin-assets §1.1），不随目录迁位变。
- `.infra-lock.json` 记账（`src/lockfile.ts`、`src/plugin-install.ts`）：插件区按包名记账，无仓库内路径。
- CI workflow：步骤调 verify:pack 对账命令名不变（pnpm 形态下为 `pnpm run verify:pack`，spec 20261115-ed9f FR-4）；`.github/workflows/regression-gate.yml` 已在位（spec 20261115-f650 FR-2 交付），全部步骤只调命令名（pnpm install --frozen-lockfile / pnpm run typecheck / pnpm test / pnpm pack + pnpm run verify:pack），无 `plugins/` 目录路径引用——本行清单初稿「本分支尚无 .github/ 目录」系时序过期表述，已修正（残余 #2 核销，票 20261115-30f2）。
- 历史知识档不回改：`docs/needs/`、`docs/specs/`、`docs/research/`（rq2 报告结论节已自注「round 1 后为 agents/ 布局时改 patterns」）。

### 4.5 need FR-1 引用清单核对结论

- need FR-1 原列「4 个测试文件」；grep 实证为 **6 个**（`asset-map`、`plugin-catalog`、`plugin-package`、`verify-pack-plugins`、`e2e/plugin-install`、`e2e/dsh-plugin-integration`）——本清单以实证为准。
- need FR-1 原列「README 发布节」；grep 实证 README 无 `plugins/` 目录路径引用（仅旗标名与包名）——**免改**，留痕免改依据于 §4.4。

## 附：宿主注记表

新宿主接入时按 RQ4 普查报告对应小节补行（机制类型、目录约定、特例注记）；首轮迁移仅落地 dsh 行。

| 宿主段 | 宿主 | 机制目录 | 特例注记 |
|---|---|---|---|
| `dsh` | DeepSeek Harness | `plugins/` | 插件经官方命令装 profile，不落项目文件；`desktop` 为官方保留 profile 名 |
