---
id: rq4-host-survey
created: 2026-11-15
ticket: 20261115-2016
spec: 20261115-f650
---
# RQ4 调研：agent 宿主扩展机制普查（AGENT_DIRS 49 宿主）

## 调研问题与用途

`agents/<宿主>/` 布局规范定稿（票 20261115-7784，need 20261115-fc48 FR-1/D10）的直接输入：`src/agent-dirs.js` 的 AGENT_DIRS 清单（49 个目录条目，取自 vercel-labs/skills 支持面）内每个宿主的扩展机制类型（插件 / hooks / 斜杠命令 / 规则 / 子代理 / 其他）、官方目录约定（项目级与本机级）、分发形态（npm 包 / 目录拷贝 / 市场）。

检索日期：**2026-11-15**（全部条目同日检索；平台文档随版本演进，实现时复核）。

来源分级（逐宿主标注）：

- 【官方】宿主官方文档站页面。
- 【官方仓库】宿主官方 GitHub 仓库的 README / docs 文件。
- 【厂商博客】厂商自有域名出版物（官方出版物，非文档站；结论强度低于【官方】）。
- 【生态】vercel-labs/skills `docs/agents.md` 支持面表（本仓库 AGENT_DIRS 的直接来源，检索 2026-11-15：<https://github.com/vercel-labs/skills/blob/main/docs/agents.md>）。该表给出各宿主技能目录的项目级路径与全局路径，但它是生态兼容层视角，**非宿主官方文档**，凡仅此来源的目录约定均按二手标注。
- 【二手】社区 / 第三方媒体。

机制类型代号：**S** skills（SKILL.md 目录型，遵循 [agentskills.io](https://agentskills.io) 开放规范）、**C** 斜杠命令 / 命令文件、**H** hooks（生命周期钩子）、**R** 规则 / 指导文件（AGENTS.md / rules / steering / memory）、**A** 子代理（subagents / custom agents）、**P** 插件 / 打包分发（多机制捆绑 + 市场 / 注册表）、**M** MCP（工具接入）、**O** 其他专有形态。

## 结论速览（汇总矩阵）

| AGENT_DIRS 条目 | 宿主 | 机制类型 | 项目级目录 | 本机级目录（skills 为主） | 分发形态 | 来源级别 |
|---|---|---|---|---|---|---|
| `.aider-desk` | AiderDesk | S·A·R·M·P | `.aider-desk/skills/`【生态】 | `~/.aider-desk/skills/` | 目录拷贝 + 内置 | 官方仓库 + 生态 |
| `.adal` | AdaL | S·P | `.adal/skills/`【官方】 | `~/.adal/skills/` | 目录拷贝 + 插件 | 官方 |
| `.augment` | Augment | S·R·M | `.augment/skills/`【生态】；rules 见正文 | `~/.augment/skills/` | 目录拷贝 | 官方 + 生态 |
| `.bob` | IBM Bob | S·H·O | 未公开（`.bob/skills/`【生态】） | `~/.bob/skills/`【生态】 | 内置 + 目录拷贝 | 官方（目录仅生态） |
| `.claude` | Claude Code | S·C·H·R·A·P·M | `.claude/{skills,commands,agents,hooks…}/` | `~/.claude/{…}/` | 插件市场 + 目录拷贝 | 官方 |
| `.codeartsdoer` | CodeArts Agent | S·O | 未明示（`.codeartsdoer/skills/`【生态】） | `~/.codeartsdoer/skills/`【官方·Win 路径】 | 目录拷贝 + 内置 | 官方 |
| `.codebuddy` | CodeBuddy | S·C·R·M | `.codebuddy/{skills,commands…}/`【官方】 | 同构用户级 | 目录拷贝 | 官方 |
| `.codemaker` | Codemaker | （仅 skills 生态行） | `.codemaker/skills/`【生态】 | `~/.codemaker/skills/`【生态】 | 目录拷贝 | **无公开扩展机制文档** |
| `.codestudio` | Syncfusion Code Studio | O（prompts）·S【生态】 | `.codestudio/prompts/`【厂商博客】 | — | 目录拷贝 | 厂商博客 + 生态 |
| `.commandcode` | Command Code | S·H·M·P | `.commandcode/`（settings 声明 skills/hooks/MCP/mods） | `~/.commandcode/` | 目录拷贝 | 官方 |
| `.continue` | Continue | S·C·R·M·P | `.continue/{rules,skills…}/` + `config.yaml` | `~/.continue/{…}/` | Hub 市场 + 目录拷贝 | 官方 + 生态 |
| `.cortex` | Snowflake Cortex Code | S·M | `.cortex/skills/`【生态】 | `~/.snowflake/cortex/`（skills.json【官方】） | 内置捆绑 + 目录拷贝 | 官方 + 生态 |
| `.crush` | Crush | S·R·M | `.crush/skills/`【官方仓库】 | `~/.config/crush/skills/` | 目录拷贝 | 官方仓库 |
| `.deepagents/agent` | Deep Agents | S·A | 未明示（`~/.deepagents/agent/skills/`【生态】） | `~/.deepagents/agent/skills/`【生态】 | 目录拷贝 / 框架内建 | 官方（目录仅生态） |
| `.devin` | Devin | S·A·M·O | `.agents/skills/`（推荐）· `.devin/skills/`（legacy）【官方】 | `~/.config/devin/skills/` + `~/.agents/skills/` | 目录拷贝 + 云侧 Knowledge/Playbooks | 官方 |
| `.forge` | ForgeCode | S【生态】·R·M | 未明示（`.forge/skills/`【生态】） | `~/.forge/skills/`【生态】 | 目录拷贝 | 官方 + 生态 |
| `.goose` | Goose | S·C·R·M·P·O | `.goose/skills/`【生态】；`.goosehints`【官方】 | `~/.config/goose/skills/`【生态】 | 目录拷贝 + 配置注册 | 官方 + 生态 |
| `.grok` | Grok Build | S·P·A·R·M | `.grok/skills/` | `~/.grok/skills/`；插件 `~/.grok/plugins/` | 插件市场 + 目录拷贝 | 官方 |
| `.hermes` | Hermes Agent | S·C·H·M | 未明示（`.hermes/skills/`【生态】） | `~/.hermes/skills/`【官方仓库】 | Skills Hub 市场 + 目录拷贝 | 官方仓库 |
| `.iflow` | iFlow CLI | S·C·H·P·M | `.iflow/`（commands/workflow 等） | `~/.iflow/` | 在线市场 + 目录拷贝 | 官方 |
| `.inferencesh` | inference.sh | S·H | `.inferencesh/skills/`【生态】 | `~/.inferencesh/skills/` | 托管（cli.inference.sh）+ 目录拷贝 | 官方 + 生态 |
| `.jazz` | Jazz | — | — | — | — | **无公开扩展机制文档** |
| `.junie` | Junie | S·R·O | `.junie/{guidelines.md,skills…}` | `~/.junie/` | 目录拷贝 + 官方目录仓库 | 官方 |
| `.kilo` | Kilo Code | S·C·R·A·M | `.kilo/`（rules/workflows/skills 等） | `~/.kilo/skills/`【生态】 | 目录拷贝 + 官方 skills 仓库 | 官方 + 生态 |
| `.kiro` | Kiro | S·H·R·A·P·M·O | `.kiro/{skills,steering,hooks,agents,specs…}` | `~/.kiro/…` | Powers 打包 + 目录拷贝 | 官方 |
| `.kode` | Kode | S·C·A·P·H·M | `.kode/skills/`；插件 `.kode-plugin/plugin.json` | `~/.kode/` | 插件包（marketplace→plugin pack）+ 目录拷贝 | 官方仓库 |
| `.lingma` | Lingma | S【生态】·R | `.lingma/rules/`【官方】 | `~/.lingma/skills/`【生态】 | 目录拷贝 | 官方 + 生态 |
| `.mcpjam` | MCPJam | （仅 skills 生态行） | `.mcpjam/skills/`【生态】 | `~/.mcpjam/skills/`【生态】 | 目录拷贝 | **无宿主自身机制文档**（官方文档仅述及对外提供的 skill） |
| `.minimax` | MiniMax Code | S·C·P·O | `.minimax/skills/`【生态】（官方仓库自身用 `.agents/skills/`） | `~/.minimax/skills/`【生态】 | 目录拷贝 + 市场入口 | 官方 + 生态 |
| `.mux` | Mux（现 Xum） | S【生态】·R | 未明示（`.mux/skills/`【生态】） | `~/.mux/`（AGENTS.md，改名后 `~/.xum/`） | 目录拷贝 | 官方博客 + 二手（机制无文档页） |
| `.moxby` | Moxby | S·P·O | `.moxby/skills/`【生态】 | `~/.moxby/skills/`【生态】 | 官方市场（Mods/Missions/Skills） | 官方站（目录仅生态） |
| `.neovate` | Neovate | S【生态】·P（二手） | `.neovate/skills/`【生态】 | `~/.neovate/skills/`【生态】 | 目录拷贝 | 官方仓库（机制文档不全，见正文） |
| `.ona` | Ona | S·R | 仓库内 `SKILL.md` 目录（`AGENTS.md`） | 组织级 skills（平台侧） | 平台托管 + 目录拷贝 | 官方 |
| `.openhands` | OpenHands | S·O·M | `.openhands/{skills,microagents…}/` | `~/.openhands/skills/` | 目录拷贝 + 官方/社区 skills 仓库 | 官方 |
| `.pochi` | Pochi | S·A | `.pochi/skills/`【生态】 | `~/.pochi/skills/`【生态】 | 目录拷贝 | 官方（目录仅生态） |
| `.posit/assistant` | Posit Assistant | S·R | `.posit/assistant/skills/`【生态】 | `~/.posit/assistant/skills/`【生态】 | 目录拷贝 | 官方（目录仅生态） |
| `.qoder` | Qoder（CN 同规范） | S·R·M | `.qoder/rules/`【官方】；skills `.qoder/skills/`【生态】 | `~/.qoder/skills/`（CN：`~/.qoder-cn/`） | 目录拷贝 | 官方 + 生态 |
| `.qwen` | Qwen Code | S·C·P·M | `.qwen/{commands,skills,extensions…}/` | `~/.qwen/{…}/` | 扩展安装（git 来源）+ 目录拷贝 | 官方 |
| `.reasonix` | Reasonix | S | 未明示（`.reasonix/skills/`【生态】） | `~/.reasonix/skills/`【生态】 | 目录拷贝 | 官方仓库（目录仅生态） |
| `.roo` | Roo Code | S·R·A·M | `.roo/{rules,rules-<mode>,skills…}/`、`.roo/mcp.json`、`.roomodes` | `~/.roo/{rules,skills…}/` | 目录拷贝 | 官方 |
| `.rovodev` | Rovo Dev | S【生态】·R·C·H | 未明示（`.rovodev/skills/`【生态】） | `~/.rovodev/`（config） | 目录拷贝 | 官方 + 生态 |
| `.tabnine/agent` | Tabnine | S【生态】·R·A·M | `.tabnine/agent/agents/*.md`；`.tabnine/agent/skills/`【生态】 | `~/.tabnine/agent/…` | 目录拷贝 | 官方 + 生态 |
| `.terramind` | Terramind | — | — | — | — | **无公开扩展机制文档** |
| `.tinycloud` | Tinycloud | — | — | — | — | **无公开扩展机制文档** |
| `.trae` | Trae（CN 同规范） | S·R·M | `.trae/rules/project_rules.md`；`.trae/skills/`【官方】 | `~/.trae/skills/`（CN：`~/.trae-cn/`） | 目录拷贝 | 官方 |
| `.vibe` | Mistral Vibe | S·P·A·M | `.vibe/skills/` | `~/.vibe/`（`VIBE_HOME` 可覆盖） | 插件捆绑 + 目录拷贝 | 官方 |
| `.windsurf` | Windsurf | S·C·R·M·O | `.windsurf/{rules,workflows,skills…}/` | `~/.codeium/windsurf/skills/`【生态】 | 目录拷贝 | 官方 + 生态 |
| `.zcode` | ZCode | S·C·H·R·A·P·M | `.zcode/{skills,commands…}/` | `~/.zcode/{…}/` | 插件 + 目录拷贝 | 官方 |
| `.zencoder` | Zencoder（Zenflow 同源） | S·O | 未明示（`.zencoder/skills/`【生态】） | `~/.zencoder/skills/`【生态】 | 目录拷贝 | 官方（目录仅生态） |

> 「未明示」= 宿主官方文档未逐字给出该路径，路径取自【生态】表（vercel-labs/skills，即 AGENT_DIRS 的出处）。凡仅生态来源的目录约定，布局规范落地时应以宿主官方文档复核。

## 逐宿主清单

按 AGENT_DIRS 顺序（字母序）。每条：机制类型 → 目录约定（项目级 / 本机级）→ 分发形态 → 来源。

### 1. AiderDesk（`.aider-desk`）

- 机制：S（skills，`~/.aider-desk/skills/`，v0.85.0 起可按项目禁用）；A（Agent Profiles：工具组/审批规则/系统提示/subagent 设置）；R（External Rules 扩展，启动时加载）；M（标准 MCP）；P（Extension/SDK 形态：Claude Agent SDK、Cursor SDK、Verifier）。hooks / 斜杠命令 / 子代理目录约定：未检索到官方文档页。
- 目录：项目级 `.aider-desk/skills/`（生态表）；本机级 `~/.aider-desk/skills/`（官方 release 记载内置 agent-creator skill 即装于此）。
- 分发：目录拷贝 + 内置技能。
- 来源：【官方仓库】<https://github.com/magiksoft/aider-desk>（原 hotovo 组织迁移）及 release discussions（v0.48.0 / v0.61.0 / v0.85.0）。检索 2026-11-15。

### 2. AdaL（`.adal`）

- 机制：S + P（plugins）。官方文档明列三类技能来源：personal `~/.adal/skills/`、project `.adal/skills/`、plugin skills；另有把 Codex / Claude 位置发现的 skills 自动拷贝到 AdaL 位置的描述。
- 目录：项目级 `.adal/skills/`、本机级 `~/.adal/skills/`【官方】。
- 分发：目录拷贝 + 插件。
- 来源：【官方】<https://docs.sylph.ai/customize/plugins-and-skills>（AdaL by SylphAI）。检索 2026-11-15。

### 3. Augment（`.augment`）

- 机制：S（`.augment/skills/`，生态行）；R（官方 CLI 文档：自当前目录逐级向上加载 `AGENTS.md`，无则回退 `CLAUDE.md`；另有 `.augment/rules` 目录与 memories）；M（MCP）。hooks / 斜杠命令 / 子代理：未检索到官方文档页。
- 目录：规则项目级 `.augment/rules/` 与 `AGENTS.md`【官方】；skills 项目级 `.augment/skills/`、本机级 `~/.augment/skills/`【生态】。
- 分发：目录拷贝。
- 来源：【官方】<https://docs.augmentcode.com/cli/rules>；skills 目录【生态】表。检索 2026-11-15。

### 4. IBM Bob（`.bob`）

- 机制：S（约 40 个内置 skills 与 agentic workflows，含 DevSecOps 安全 workflows）；H（lifecycle hooks：注入仓库上下文、拦截受保护编辑、记录测试证据）；O（Agent/Ask/Plan 三模式、modernization workflows）。
- 目录：**自定义 skills 的落盘目录官方文档页未逐字公开**；生态行 `.bob/skills/`（项目）、`~/.bob/skills/`（本机）。
- 分发：内置 + 目录拷贝。
- 来源：【官方】<https://bob.ibm.com/docs>（IDE 页与 Workflows and skills 页）。检索 2026-11-15。目录约定仅【生态】来源，落地时需复核。

### 5. Claude Code（`.claude`）

- 机制：全家桶——S（skills）、C（slash commands，`~/.claude/commands/`）、H（hooks）、R（memory：`CLAUDE.md`）、A（subagents，`~/.claude/agents/`）、P（plugins：一个目录捆绑 skills/agents/hooks/MCP servers/commands，经 plugin marketplaces 分发）、M（MCP）。
- 目录：项目级与用户级均为 `.claude/` / `~/.claude/` 下对应子目录（`skills/`、`commands/`、`agents/`、`hooks/` 等）【官方】。
- 分发：插件市场（`/plugin marketplace add <repo>`）+ 目录拷贝。
- 来源：【官方】<https://code.claude.com/docs/en/plugins>（插件 = skills/agents/hooks/MCP/commands 的捆绑单元；另有 /hooks、/slash-commands、/sub-agents、/plugin-marketplaces 各页）。检索 2026-11-15。

### 6. CodeArts Agent（`.codeartsdoer`）

- 机制：S（官方 Skills 用户指南分 IDE 版与 CLI 版，SKILL.md 式目录）；O（Spec 驱动开发、多角色 Agent 团队协作）。hooks / commands / rules：未检索到独立官方页。
- 目录：本机级 `~/.codeartsdoer/skills/`（Windows `%USERPROFILE%\.codeartsdoer\skills`，官方用户指南原文）；项目级 `.codeartsdoer/skills/`【生态】。
- 分发：目录拷贝 + 内置。
- 来源：【官方】华为云 <https://support.huaweicloud.com/intl/en-us/usermanual-codeartsagent/codeartsagent_ug_0024.html>。检索 2026-11-15。

### 7. CodeBuddy（`.codebuddy`）

- 机制：S（SKILL.md 目录）；C（`.codebuddy/commands/` 自定义斜杠命令）；R（`codebuddy.md` 规则文件；规则三种调用方式：自动匹配 / 手动 `/skill-name` / 斜杠命令桥）；M（MCP）。hooks：生态兼容表标 No。
- 目录：项目级 `.codebuddy/`（skills、commands 子目录）【官方】（`.codebuddy` 目录结构专页）；本机级同构用户目录。
- 分发：目录拷贝。
- 来源：【官方】腾讯云 <https://intl.cloud.tencent.com/document/product/1316/84431>（目录结构）与 <https://www.codebuddy.ai/docs/ide/Features/Skills>（Skills）。检索 2026-11-15。

### 8. Codemaker（`.codemaker`）

- **无公开扩展机制文档**（本次检索未找到宿主官方文档站 / 官方仓库的扩展机制页，不虚构）。
- 仅【生态】行：项目 `.codemaker/skills/`、本机 `~/.codemaker/skills/`（Agent Skills 规范目录）。第三方（ChilliCream、Phaser 文档）提及该路径，属【二手】。
- 分发：目录拷贝（生态工具 `npx skills add` 可达）。
- 来源：【生态】<https://github.com/vercel-labs/skills/blob/main/docs/agents.md>。检索 2026-11-15。

### 9. Syncfusion Code Studio（`.codestudio`）

- 机制：O（可复用提示文件，厂商博客记载存于项目 `.codestudio/prompts/`）；S【生态】（`.codestudio/skills/` 行）。hooks / commands / rules：未检索到官方文档页。
- 目录：`.codestudio/prompts/`【厂商博客】；skills 目录【生态】。
- 分发：目录拷贝。
- 来源：【厂商博客】<https://medium.com/syncfusion/context-engineering-improving-ai-code-output-in-your-ide-ab707164797b> 与 <https://www.syncfusion.com/blogs/post/spec-driven-ai-dev-speckit-code-studio>（二手倾向，官方文档站扩展机制专页未检索到）。检索 2026-11-15。

### 10. Command Code（`.commandcode`）

- 机制：S（skills）、H（hooks：每次工具调用前后自动执行 shell 脚本）、M（MCP servers）、P（mods；settings 文件统一声明 model/permissions/hooks/MCP/skills/mods）。生态兼容表：hooks = Yes。
- 目录：settings 文件所在 `.commandcode/`（项目）/ `~/.commandcode/`（本机）【官方】（settings 页）；skills 目录行【生态】。
- 分发：目录拷贝。
- 来源：【官方】<https://commandcode.ai/docs/skills>、<https://commandcode.ai/docs/hooks>、<https://commandcode.ai/docs/settings>。检索 2026-11-15。

### 11. Continue（`.continue`）

- 机制：R（rules：`.continue/rules/` 目录或 `config.yaml` 内联规则）、C（prompts = 斜杠命令）、M（config.yaml 声明 MCP）、S（skills；官方 Hub 市场分发 skills/blocks）、P（Hub blocks 打包复用）。
- 目录：项目级 `.continue/rules/`、`.continue/skills/`【生态】，规则目录【官方】（config.yaml 亦可集中声明）；本机级 `~/.continue/skills/`【生态】。
- 分发：Hub 市场（hub.continue.dev）+ 目录拷贝。
- 来源：【官方】<https://docs.continue.dev/customize/rules>、<https://docs.continue.dev/customize/deep-dives/prompts>、<https://docs.continue.dev/customize/config-yaml>、<https://hub.continue.dev/>。检索 2026-11-15。

### 12. Snowflake Cortex Code（`.cortex`）

- 机制：S（内置捆绑 skills + 社区 SKILL.md skills；skills 配置 `~/.snowflake/cortex/skills.json` 由 CoCo Desktop 与 CLI 共享）；M（MCP 集成）。
- 目录：本机级 `~/.snowflake/cortex/`【官方】；项目级 `.cortex/skills/`【生态】。
- 分发：内置捆绑 + 目录拷贝。
- 来源：【官方】<https://docs.snowflake.com/en/user-guide/cortex-code/bundled-skills>、<https://docs.snowflake.com/en/user-guide/cortex-code/cortex-code-desktop/skills>。检索 2026-11-15。

### 13. Crush（`.crush`）

- 机制：S（Agent Skills 开放标准，`.crush/skills/`）、R（AGENTS.md 约定 + 自有 config docs）、M（MCP：stdio/http/sse 三传输，`crush.json` 配置，项目级或 `~/.config/crush/`）。hooks / 斜杠命令文件 / 子代理目录：官方 config 文档未列（生态兼容表 hooks = No）。
- 目录：项目级 `.crush/skills/`【官方仓库】；本机级 `~/.config/crush/skills/`【生态】（全局 skills 支持另有 open issue #2072 讨论中）。
- 分发：目录拷贝。
- 来源：【官方仓库】<https://github.com/charmbracelet/crush>（README #agent-skills、`docs/config/README.md`）。检索 2026-11-15。

### 14. Deep Agents（`.deepagents/agent`）

- 机制：S（SKILL.md 目录型，官方 skills 页：单文件 ≤10MB、启动仅读 frontmatter 的渐进加载）、A（子代理为框架内建特性）、O（filesystem tools 后端可插拔）。hooks / commands / rules：框架 API 形态，无目录约定官方页。
- 目录：本机级 `~/.deepagents/agent/skills/`【生态】；项目级生态表归入 `.agents/skills/` 共享路径。
- 分发：目录拷贝 / 框架内建。
- 来源：【官方】docs.langchain.com deep-agents「Skills」页（经检索摘要确认；<https://docs.langchain.com>）与【官方仓库】langchain-ai deep-agents。检索 2026-11-15。

### 15. Devin（`.devin`）

- 机制：S（官方 skills 页：优先 `.agents/skills/<name>/SKILL.md`，`.devin/skills/` 为 legacy 兼容；CLI 全局 `~/.agents/skills/` 与 `~/.config/devin/skills/`；skills 经 `devin skills` 子命令管理并可作为斜杠命令触发）、M（MCP，官方 extensibility 页）、A/O（云侧 Knowledge 与 Playbooks 为平台对象，非文件目录）。
- 目录：项目级 `.agents/skills/`（推荐）与 `.devin/skills/`（legacy）【官方】；本机级如上【官方】。
- 分发：目录拷贝（git 提交）+ 云平台。
- 来源：【官方】<https://docs.devin.ai/product-guides/skills>、<https://docs.devin.ai/cli/extensibility/skills/overview>、<https://docs.devin.ai/cli/extensibility/mcp/overview>、<https://docs.devin.ai/cli>。检索 2026-11-15。

### 16. ForgeCode（`.forge`）

- 机制：R（AGENTS.md + `forge.yaml` 的 `custom_rules` 块）、M（MCP，`forge mcp list`）、S【生态】（`.forge/skills/` 行）。hooks / commands / 子代理：未检索到官方文档页。
- 目录：规则见 `AGENTS.md` / `forge.yaml`【官方】；skills 项目级 `.forge/skills/`、本机级 `~/.forge/skills/`【生态】。
- 分发：目录拷贝。
- 来源：【官方】<https://forgecode.dev/docs/custom-rules-guide>。检索 2026-11-15。

### 17. Goose（`.goose`）

- 机制：M/P（extensions = MCP server，经 config 注册，官方扩展生态目录）、O（recipes：可复用工作流配方文件，社区 Recipes Cookbook）、R（`.goosehints` 项目提示文件）、S（skills 生态：skills MCP extension + `.goose/skills/` 生态行）、C（斜杠命令内建）、A（subagents）。
- 目录：项目级 `.goosehints`【官方】、`.goose/skills/`【生态】；本机级 `~/.config/goose/`（config.yaml）。
- 分发：目录拷贝 + 配置注册（MCP extensions）+ 社区食谱库。
- 来源：【官方】<https://block.github.io/goose>（docs 站：extensions、recipes、project hints 各页）。检索 2026-11-15。

### 18. Grok Build（`.grok`）

- 机制：S（`.grok/skills/` 项目级 + `~/.grok/skills/` 全局）、P（plugins + marketplaces，`~/.grok/plugins/`）、A（subagents）、R（AGENTS.md）、M（MCP）。
- 目录：如上【官方】（官方页 Skills, Plugins & Marketplaces）。
- 分发：插件市场 + 目录拷贝（生态 `npx skills add` 可达）。
- 来源：【官方】<https://docs.x.ai/build/features/skills-plugins-marketplaces>、<https://docs.x.ai/build/overview>。检索 2026-11-15。

### 19. Hermes Agent（`.hermes`）

- 机制：S（skills：`~/.hermes/skills/`，Skills Hub 市场可浏览/安装/发布/审计，可捆绑为单一 `/<name>` 斜杠命令）、H（四类生命周期 hook 系统）、O（可导入 OpenClaw / Claude Code / Codex CLI / Cursor 的设置、记忆与技能）。
- 目录：本机级 `~/.hermes/skills/`【官方仓库】；项目级 `.hermes/skills/`【生态】。
- 分发：Skills Hub 市场 + 目录拷贝。
- 来源：【官方仓库】<https://github.com/NousResearch/hermes-agent>（`website/docs/user-guide/features/skills.md`、`.../hooks.md`、`website/docs/reference/cli-commands.md`）。检索 2026-11-15。

### 20. iFlow CLI（`.iflow`）

- 机制：S（skill 体系，可从在线市场安装管理）、C（slash commands）、H（事件驱动 hooks：生命周期事件自动执行自定义命令）、P（workflow 扩展：`iflow workflow add <id>` 安装工作流包）、M（MCP）。
- 目录：项目级 / 本机级 `.iflow/` 与 `~/.iflow/`（官方教程树记载 skills / commands / workflow 安装落位）；精确子目录名以官方教程树为准。
- 分发：在线市场（技能 / 工作流）+ 目录拷贝。
- 来源：【官方】<https://platform.iflow.cn/en/cli/examples/skill> 与 <https://platform.iflow.cn/en/cli/examples>（教程树含 hooks、斜杠命令、workflow 各节）、【官方仓库】<https://github.com/iflow-ai/iflow-cli>。检索 2026-11-15。

### 21. inference.sh（`.inferencesh`）

- 机制：S（skills：说明/脚本/参考打包，托管于 cli.inference.sh；官方 skills 仓库提供 AI 能力技能集）、H（CLI setup 页记载 skills 目录与 hook 行为）、M（agent 工具接入）。
- 目录：项目级 `.inferencesh/skills/`、本机级 `~/.inferencesh/skills/`【生态】；CLI setup 页描述目录与 hook 行为【官方】。
- 分发：官方托管（cli.inference.sh）+ 目录拷贝 + 官方 skills 仓库（github.com/inference-sh/skills）。
- 来源：【官方】<https://inference.sh/docs>、【官方仓库】<https://github.com/inference-sh/skills>。检索 2026-11-15。

### 22. Jazz（`.jazz`）

- **无公开扩展机制文档**（检索仅见同名社区仓库，无宿主官方扩展机制文档；不虚构）。
- 仅【生态】行：项目 `.jazz/skills/`、本机 `~/.jazz/skills/`。
- 来源：【生态】vercel-labs/skills 表。检索 2026-11-15。

### 23. Junie（`.junie`）

- 机制：R（guidelines：IDE 形态读 `.junie/guidelines.md`，CLI 形态读 `AGENTS.md`；另有 `.junie/project-overview.md` 与 plans 产物）、S（官方 Agent skills 页）、O（官方 guidelines 目录仓库提供按技术栈的指引包）；M 经 JetBrains IDE 设置配置（非文件目录约定）。
- 目录：项目级 `.junie/`（guidelines.md、plans、skills）【官方】；本机级 `~/.junie/`（skills）【生态】。
- 分发：目录拷贝 + 官方 guidelines 仓库（JetBrains/junie-guidelines）。
- 来源：【官方】<https://junie.jetbrains.com/docs>（Getting started / Guidelines and memory / Agent skills 各节）、<https://github.com/JetBrains/junie-guidelines>。检索 2026-11-15。

### 24. Kilo Code（`.kilo`）

- 机制：S（官方 skills 页：Agent Skills 开放格式）、C（workflows：分步指令，斜杠命令式调用）、R（custom rules：项目级与全局）、A（custom modes/子代理生态）、M（MCP）。hooks：生态兼容表未列。
- 目录：项目级 `.kilo/`（rules / workflows / skills 子目录，官方 docs 载明机制；精确子目录名以 docs 为准）；skills 本机级 `~/.kilo/skills/`【生态】。
- 分发：目录拷贝 + 官方 skills 仓库（Kilo-Org/skills）。
- 来源：【官方】<https://kilo.ai/docs> 与 <https://kilo.ai/docs/customize/skills>。检索 2026-11-15。

### 25. Kiro（`.kiro`）

- 机制：S（`.kiro/skills/` 默认加载；自定义 agent 需在其 json 的 resources 声明 `skill://.kiro/skills/**/SKILL.md`）、H（agent hooks：`.kiro/hooks/`，事件触发 shell 命令或 agent 提示）、R（steering：`.kiro/steering/*.md`）、A（custom agents：`.kiro/agents/*.json`）、P（Kiro Powers：MCP 工具 + steering + hooks 捆绑安装）、M（`.kiro/settings/mcp.json` 工作区级 / `~/.kiro/settings/mcp.json` 用户级）、O（specs：`.kiro/specs/` 规格驱动开发产物）。
- 目录：如上，全部【官方】。
- 分发：Powers 打包安装 + 目录拷贝。
- 来源：【官方】<https://kiro.dev/docs/hooks>、kiro.dev/docs/steering、<https://kiro.dev/powers>、<https://kiro.dev/docs/cli/custom-agents/configuration-reference/#skill-resources>。检索 2026-11-15。

### 26. Kode（`.kode`）

- 机制：S（`.kode/skills/<name>/`，SKILL.md + frontmatter；Skill 工具自动调用 / 交互态斜杠命令）、P（完整插件：`.kode-plugin/plugin.json` 清单捆绑 commands/skills/agents/hooks/MCP servers；marketplace → plugin pack 安装流）、C（自定义斜杠命令：Markdown + YAML frontmatter）、A（专用子代理：独立系统提示 + 受限工具集 + 模型偏好，`@run-agent` 委派）、H（插件内 hooks）、M（MCP）。
- 目录：项目级 `.kode/skills/`【官方仓库】；本机级 `~/.kode/`【生态】。
- 分发：插件包（marketplace 流）+ 目录拷贝。
- 来源：【官方仓库】<https://github.com/shareAI-lab/kode/blob/main/docs/skills.md> 与 <https://github.com/shareAI-lab/Kode-CLI>。检索 2026-11-15。

### 27. Lingma（`.lingma`）

- 机制：R（项目规则：`.lingma/rules/` 目录，随仓库提交团队共享）、S【生态】（`.lingma/skills/` 行；新版灵码公告提及 skills 机制）。hooks / commands / 子代理：未检索到官方文档页。
- 目录：项目级 `.lingma/rules/`【官方】；skills 本机级 `~/.lingma/skills/`【生态】。
- 分发：目录拷贝。
- 来源：【官方】阿里云 <https://help.aliyun.com/zh/lingma/rules>。检索 2026-11-15。

### 28. MCPJam（`.mcpjam`）

- **宿主自身扩展机制无公开文档**：官方文档（CLI overview）仅述及「MCPJam skill」——即 MCPJam 为*其他* agent 提供的技能包，不是 MCPJam 自身的扩展机制（不虚构）。
- 仅【生态】行：项目 `.mcpjam/skills/`、本机 `~/.mcpjam/skills/`。
- 来源：【官方】<https://docs.mcpjam.com/cli/overview> +【生态】vercel-labs/skills 表。检索 2026-11-15。

### 29. MiniMax Code（`.minimax`）

- 机制：S（官方站/docs：Skills 专区——Skill Workshop、Personal library、Creating skills、Skills config、slash commands）、P（Plugins 专区）、O（Automation/Heartbeat）。生态兼容表未列该宿主。
- 目录：官方仓库自身技能取 `.agents/skills/`（仓库内 `SKILL.md` 实例）；安装目标项目级 `.minimax/skills/`、本机级 `~/.minimax/skills/`【生态】。
- 分发：目录拷贝 + 市场入口。
- 来源：【官方】<https://agent.minimax.io/docs/cli/features>、【官方仓库】<https://github.com/MiniMax-AI/minimax-code>。检索 2026-11-15。

### 30. Mux / Xum（`.mux`）

- 机制：S【生态】（`.mux/skills/` 行）；R（AGENTS.md / CLAUDE.md 等全局指令文件，官方博客与仓库 issue 佐证；项目由 steipete 创建、现归 Coder 维护并更名 Xum）。hooks / commands / 子代理目录约定：无公开文档页。
- 目录：本机级 `~/.mux/`（更名后 `~/.xum/`，含 AGENTS.md）；项目级 skills 目录【生态】。
- 分发：目录拷贝。
- 来源：【厂商博客】<https://coder.com/blog/running-parallel-self-hosted-coding-agents>；AGENTS.md 支持属【二手】（github.com/coder/xum issues 引用）。检索 2026-11-15。

### 31. Moxby（`.moxby`）

- 机制：S + P/O（官方市场分发 Mods、Missions、Skills 三类资产）。
- 目录：项目级 `.moxby/skills/`、本机级 `~/.moxby/skills/`【生态】（官方站未逐字给出目录）。
- 分发：官方市场（moxby.com/marketplace）+ 目录拷贝。
- 来源：【官方站】<https://moxby.com/marketplace> +【生态】vercel-labs/skills 表。检索 2026-11-15。

### 32. Neovate（`.neovate`）

- 机制：S（生态兼容表：basic skills Yes、allowed-tools Yes、hooks No）；P（插件系统——二手报道提及，官方 README 未展开，官方文档站未检索到）。hooks / commands / 子代理：无官方文档页。
- 目录：项目级 `.neovate/skills/`、本机级 `~/.neovate/skills/`【生态】。
- 分发：目录拷贝。
- 来源：【官方仓库】<https://github.com/neovateai/neovate-code>（README 无机制细节）；插件系统【二手】（CSDN 插件开发指南、知乎官方开源介绍转述）；skills 支持【生态】vercel-labs/skills 兼容性表。检索 2026-11-15。

### 33. Ona（`.ona`）

- 机制：S（Agent Skills：`SKILL.md` 落在仓库内，agent 按任务自动发现加载；组织级 skills 平台托管）、R（`AGENTS.md`）、O（PR 事件触发 background agents）。
- 目录：项目级 = 仓库内 skills 目录（官方文档：SKILL.md in repo）+ `AGENTS.md`【官方】；安装目标行 `.ona/skills/`【生态】。
- 分发：平台托管（组织级）+ 目录拷贝（仓库内）。
- 来源：【官方】<https://ona.com/docs/ona/skills>、<https://ona.com/docs/ona/getting-started>。检索 2026-11-15。

### 34. OpenHands（`.openhands`）

- 机制：S（skills：`.openhands/skills/`）、O（microagents：`.openhands/microagents/*.md`，frontmatter 带触发关键词的关键词触发型提示）、M（`mcp.json`）、O（`config.toml`）。
- 目录：项目级 `.openhands/{skills,microagents}/` 与 `mcp.json`【官方】；本机级 `~/.openhands/skills/`【生态】。
- 分发：目录拷贝 + 官方/社区 skills 仓库。
- 来源：【官方】<https://docs.openhands.dev/overview/skills/repo>（vercel related-links 引 docs.openhands.ai/modules/usage/how-to/using-skills）。检索 2026-11-15。

### 35. Pochi（`.pochi`）

- 机制：S（官方 skills 页：按提示自动发现并调用匹配技能）、A（Custom Agent：自定义系统提示与工具集）。hooks / commands / rules：无官方文档页；`.agents/skills` 支持在官方仓库 feature request（issue #1349）讨论中。
- 目录：项目级 `.pochi/skills/`、本机级 `~/.pochi/skills/`【生态】（官方 docs 未逐字给出）。
- 分发：目录拷贝。
- 来源：【官方】<https://docs.getpochi.com/skills>；目录【生态】vercel-labs/skills 表。检索 2026-11-15。

### 36. Posit Assistant（`.posit/assistant`）

- 机制：S（skills：自动按相关性加载 + 手动调用；配置文件含 skill search paths）、R（permission rules 等配置声明）。
- 目录：配置文件声明 skill 搜索路径【官方】；安装目标项目级 `.posit/assistant/skills/`、本机级 `~/.posit/assistant/skills/`【生态】。
- 分发：目录拷贝。
- 来源：【官方】<https://assistant.posit.co/docs/getting-started>、<https://posit-dev.github.io/assistant/docs/features/skills/>。检索 2026-11-15。

### 37. Qoder / Qoder CN（`.qoder`）

- 机制：R（rules：项目级 `.qoder/rules/` + user rules；触发方式可选模型决策 / 常开 / 手动）、S（skills：SKILL.md 目录，IDE 与 CLI 共用；官方 CLI Skills 页）、M（MCP）。hooks / 子代理：无官方文档页。
- 目录：项目级 `.qoder/rules/`【官方】、`.qoder/skills/`【生态】；本机级 `~/.qoder/skills/`【生态】（Qoder CN 同规范，本机级 `~/.qoder-cn/`）。
- 分发：目录拷贝。
- 来源：【官方】<https://docs.qoder.com>（Rules 与 CLI Skills 各页）。检索 2026-11-15。

### 38. Qwen Code（`.qwen`）

- 机制：C（custom commands：TOML 文件，项目级 `.qwen/commands/` + 本机级 `~/.qwen/commands/`）、P（extensions：`qwen-extension.json` 清单打包 commands / MCP servers / context / skills，`qwen extensions` 子命令与 `/extensions` 斜杠命令管理，git 来源安装）、S（skills：`.qwen/skills/`）、M（MCP）。
- 目录：如上【官方】。
- 分发：扩展安装（git URL）+ 目录拷贝。
- 来源：【官方】<https://qwenlm.github.io/qwen-code-docs/en/users/extension/introduction>、<https://qwenlm.github.io/qwen-code-docs/en/users/features/commands>、<https://qwenlm.github.io/qwen-code-docs/en/users/features/skills/>。检索 2026-11-15。

### 39. Reasonix（`.reasonix`）

- 机制：S（Agent Skills 兼容：与 Claude Code / Codex CLI 同构的技能体系，社区技能包生态）。hooks / commands / rules：无官方文档页。
- 目录：项目级 `.reasonix/skills/`、本机级 `~/.reasonix/skills/`【生态】（官方仓库未逐字给出）。
- 分发：目录拷贝。
- 来源：【官方仓库】<https://github.com/esengine/deepseek-reasonix> + DeepSeek 官方集成页 <https://api-docs.deepseek.com/quick_start/agent_integrations/reasonix>（宿主介绍，非机制目录）；目录【生态】。检索 2026-11-15。

### 40. Roo Code（`.roo`）

- 机制：R（custom instructions：`.roo/rules/` 递归读取 + 模式专属 `.roo/rules-<mode-slug>/`；legacy `.roorules`、`.clinerules`）、A（custom modes：`.roomodes` / 全局设置；每模式可挂专属规则目录）、S（官方 skills 页）、M（`.roo/mcp.json`）。hooks / commands 文件目录：无官方文档页。
- 目录：项目级 `.roo/{rules,rules-<mode>,mcp.json}`、skills `.roo/skills/`【生态行，官方 features/skills 页载机制】；本机级 `~/.roo/rules/` 等【官方 release 记载】。
- 分发：目录拷贝。
- 来源：【官方】<https://docs.roocode.com/features/custom-instructions>、<https://docs.roocode.com/features/custom-modes>、<https://docs.roocode.com/features/skills>。检索 2026-11-15。

### 41. Rovo Dev（`.rovodev`）

- 机制：R（`AGENTS.md` 项目指令——官方支持，issue 与社区佐证）、C（内建斜杠命令集，`/help` 列举；社区教程记载自定义斜杠命令流）、H（event hooks，社区文章记载于 `.rovodev` 配置域）、O（config 文件经 `acli rovodev config` 管理）、S【生态】（`.rovodev/skills/` 行）。
- 目录：本机/项目配置域 `.rovodev/`【官方 settings 页】；skills 目录【生态】。
- 分发：目录拷贝。
- 来源：【官方】<https://support.atlassian.com/rovo/docs/rovo-dev-cli-commands>、<https://support.atlassian.com/rovo/docs/manage-rovo-dev-cli-settings>、<https://support.atlassian.com/rovo/docs/use-rovo-dev-cli>；hooks/自定义命令细节属【二手】（Atlassian Community）。检索 2026-11-15。

### 42. Tabnine（`.tabnine/agent`）

- 机制：R（agent guidelines：AGENTS.md 式指引文件 + org/service-account 指令）、A（subagents：`.tabnine/agent/agents/*.md`，Markdown + YAML frontmatter）、M（MCP；release notes 记载 agent 定义新增 `auth` 块支持 OAuth2）、C（CLI commands）、S【生态】（`.tabnine/agent/skills/` 行）。
- 目录：项目级 `.tabnine/agent/agents/`【官方】、skills `.tabnine/agent/skills/`【生态】；本机级 `~/.tabnine/agent/`。
- 分发：目录拷贝。
- 来源：【官方】<https://docs.tabnine.com/main/getting-started/tabnine-cli/features/subagents>、<https://docs.tabnine.com/main/getting-started/tabnine-agent/guidelines>、<https://docs.tabnine.com/main/getting-started/tabnine-agent/mcp>。检索 2026-11-15。

### 43. Terramind（`.terramind`）

- **无公开扩展机制文档**（官方站为 agent 平台产品描述，未检索到扩展机制 / 目录约定文档页；不虚构）。
- 仅【生态】行：项目 `.terramind/skills/`、本机 `~/.terramind/skills/`。
- 来源：【生态】vercel-labs/skills 表 + 官方站 terramind.com（产品页）。检索 2026-11-15。

### 44. Tinycloud（`.tinycloud`）

- **无公开扩展机制文档**（检索见 `tinycloud onboard` 等命令行工具线索与二手技能格式描述，无宿主官方扩展机制文档页；不虚构）。
- 仅【生态】行：项目 `.tinycloud/skills/`、本机 `~/.tinycloud/skills/`。
- 来源：【生态】vercel-labs/skills 表。检索 2026-11-15。

### 45. Trae / Trae CN（`.trae`）

- 机制：R（rules：项目级 `.trae/rules/project_rules.md` + 用户级 `user_rules.md`）、S（官方 Skills 页；`.trae/skills/`）、M（MCP 手动配置，`.trae/mcp.json`）。hooks：无官方 hooks 页（第三方分析称其无 hook seam）。commands 文件目录：无官方文档页。
- 目录：如上【官方】；CN 版同规范，本机级 `~/.trae-cn/`【生态】。
- 分发：目录拷贝。
- 来源：【官方】<https://docs.trae.ai/ide/rules>、<https://docs.trae.ai/ide/skills>。检索 2026-11-15。

### 46. Mistral Vibe（`.vibe`）

- 机制：S（官方 skills 页：SKILL.md 目录，遵循 Agent Skills 规范；技能可带出自定义斜杠命令；项目级配置加载前做目录信任检查）、P（plugins：目录捆绑 skills / MCP servers / knowledge folders / subagents）、A（subagents）、M（MCP）、O（`config.toml` 配置；本机目录 `~/.vibe/`，`VIBE_HOME` 可覆盖）。
- 目录：项目级 `.vibe/skills/`、本机级 `~/.vibe/`【官方】。
- 分发：插件捆绑 + 目录拷贝。
- 来源：【官方】<https://docs.mistral.ai/vibe/code/cli/skills> 与 docs.mistral.ai/vibe（plugins / configuration 各页）。检索 2026-11-15。

### 47. Windsurf（`.windsurf`）

- 机制：R（rules：`.windsurf/rules/*.md`，可带 frontmatter；legacy `.windsurfrules`；memories 记忆体系）、C（workflows：`.windsurf/workflows/*.md`，斜杠命令式调用）、S（官方 skills 页：workspace skill 为 `.windsurf/skills/<skill-name>/SKILL.md`，另有全局 skills 目录）、M（`mcp_config.json`）。hooks：未检索到 Windsurf 官方 hooks 文档页（注意：检索中出现的「Devin Desktop 的 Cascade hooks」属 Devin 产品线，不计入）。
- 目录：如上【官方】；本机级 skills `~/.codeium/windsurf/skills/`【生态】。
- 分发：目录拷贝。
- 来源：【官方】<https://docs.windsurf.com/windsurf/cascade/skills>、<https://docs.windsurf.com/windsurf/cascade/memories>。检索 2026-11-15。

### 48. ZCode（`.zcode`）

- 机制：S（skill：SKILL.md 目录，目录名即技能名；本机级 `~/.zcode/skills/<name>/SKILL.md`；插件内技能须平铺 `skills/<name>/SKILL.md` 布局）、H（hooks）、C（commands）、R（memory + AGENTS.md）、A（subagents）、P（plugin：plugin.json 清单捆绑 skills/commands/hooks）、M（MCP services）。
- 目录：本机级 `~/.zcode/…`【官方】；项目级 `.zcode/skills/`【生态 + AGENT_DIRS 出处】。
- 分发：插件 + 目录拷贝。
- 来源：【官方】<https://zcode.z.ai/en/docs/skill>（侧栏含 /hooks、/commands、/plugin、/subagents、/memory、/mcp-services 各页）。检索 2026-11-15。

### 49. Zencoder / Zenflow（`.zencoder`）

- 机制：S（skills 于 Zenflow 与 IDE Agents 可用：按任务上下文自动选择 + 手动选择）、O（Zenflow 并行 agent 隔离环境、可编排外部 agent）。hooks / commands / rules / 子代理目录：无官方文档页。
- 目录：项目级 `.zencoder/skills/`、本机级 `~/.zencoder/skills/`【生态】（官方 docs 未逐字给出）。
- 分发：目录拷贝。
- 来源：【官方】<https://docs.zencoder.ai/welcome>；目录【生态】vercel-labs/skills 表。检索 2026-11-15。

## 结论：机制类型分类学（`agents/<宿主>/<机制>/` 布局模式）

以下分类学把 49 宿主的机制归并为八类（同类归并、异类单列），每类给出 `agents/<宿主>/<机制>/` 布局模式的条目形态。布局规范可按「机制类型 = 一级条目」设计：**宿主支持哪几类就建哪几个子目录，不支持的机制不建空目录**。

### T1 skills（SKILL.md 目录型）——普世主干

- **覆盖面：49 宿主中约 46 个有 skills 目录条目**（仅 Jazz / Terramind / Tinycloud 无条目），绝大多数遵循 agentskills.io 开放规范（`<name>/SKILL.md` 目录 + YAML frontmatter）。
- 布局模式：`agents/<宿主>/skills/<技能名>/SKILL.md`（+ 附属文件）。这是唯一可以一次设计全、跨宿主复用的机制类型。
- 形态分叉（布局规范需逐宿主映射，不能只写一条规则）：
  - 标准型：`.claude`、`.adal`、`.trae`、`.vibe`、`.windsurf`、`.grok`、`.kode`、`.roo`、`.kilo`、`.qwen` 等——`.<host>/skills/`。
  - 共享路径型：Devin 推荐 `.agents/skills/`（`.devin/skills/` 为 legacy）；Ona、Deep Agents、Mistral Vibe 等亦读共享路径。仓库若建 `agents/devin/skills/`，安装器需映射到 `.agents/skills/`。
  - 变体根路径型：Snowflake（`~/.snowflake/cortex/`）、Crush（`~/.config/crush/skills/`）、Devin（`~/.config/devin/skills/`）、Windsurf（`~/.codeium/windsurf/skills/`）、Deep Agents（`~/.deepagents/agent/skills/`）——本机级根不总是 `~/.<host>/`。
  - 声明型：Kiro CLI 自定义 agent 需在 `.kiro/agents/<agent>.json` 的 resources 里声明 `skill://` 才加载（默认 agent 例外）；Continue 可在 config.yaml 集中声明；Posit Assistant 用配置文件的 skill search paths。
- 本机级碎裂是主要风险点：仓库内 `agents/` 只镜像**项目级**布局；本机级路径差异由安装器映射表承担（`src/agent-dirs.js` symlinkRule 已有此先例）。

### T2 斜杠命令 / 命令文件——头部宿主机制，格式两分

- 覆盖面：Claude Code（`.claude/commands/`，Markdown）、CodeBuddy（`.codebuddy/commands/`）、Qwen Code（`.qwen/commands/*.toml`）、Kode（Markdown + YAML frontmatter）、Kilo（workflows）、Windsurf（`.windsurf/workflows/*.md`）、Continue（prompts）、iFlow / Rovo Dev（内建斜杠命令为主，文件化约定弱）、Hermes（skills 捆绑为斜杠命令）。
- 布局模式：`agents/<宿主>/commands/`（或宿主惯用名 workflows/prompts）。
- 格式分叉：**Markdown 系 vs TOML 系**（Qwen 独树一帜）。同类归并时按「命令文件」单列一类、格式差异记入宿主行。

### T3 hooks——生命周期钩子，非插件形态的主力条目（异常流 C）

- 覆盖面（官方文档成体系）：Claude Code、ZCode、Command Code（工具调用前后 shell）、Kiro（`.kiro/hooks/`）、Kode（插件内）、Hermes（四类 hook）、iFlow、IBM Bob（lifecycle hooks）；二手佐证：Rovo Dev（event hooks）。生态兼容表确认支持 hooks 的还有 Kiro CLI、Cline（不在本清单）；确认**不支持**的：Neovate、CodeBuddy、Snowflake、Zencoder、Kiro CLI 的 skills 资源声明除外。
- 布局模式：`agents/<宿主>/hooks/`（Claude/ZCode 系）或宿主专属文件（Kiro `.kiro/hooks/`、Command Code settings 内声明、ForgeCode `forge.yaml`）。
- 分类学结论：hooks 是**文件目录 + 配置声明**两种形态并存的一类，布局规范需按宿主给出「目录型」或「配置声明型」两种承接模式。

### T4 规则 / 指导文件（AGENTS.md / rules / steering / memory）——两形态

- 单文件约定型：`AGENTS.md`（事实标准：Augment、ForgeCode、Crush、Rovo Dev、Junie CLI 形态、Kode、Ona、Grok Build、Devin、ZCode、Mux/Xum 等）与 `CLAUDE.md`（Claude Code，多数宿主兼容读取）、`codebuddy.md`（CodeBuddy）、`.goosehints`（Goose）、`.junie/guidelines.md`（Junie IDE 形态）。
- 目录型：`.roo/rules/`（+ 模式专属目录）、`.qoder/rules/`、`.lingma/rules/`、`.windsurf/rules/`、`.trae/rules/`、`.continue/rules/`、`.augment/rules/`、Kiro `.kiro/steering/`。
- 布局模式：`agents/<宿主>/rules/`（目录型）+ 根级单文件（单文件型不进机制子目录，属宿主根文件条目）。
- 注意 memory 类（Windsurf memories、Augment memories、Devin Knowledge、MiniMax automation）多为产品内建对象，非文件目录分发——布局规范按「不承接」处理并在宿主行标注。

### T5 子代理（subagents / custom agents）——文件化两形态

- 覆盖面：Claude Code（`.claude/agents/`）、Tabnine（`.tabnine/agent/agents/*.md`）、Kode（agents）、Kiro（`.kiro/agents/*.json`）、Pochi（custom agents）、AiderDesk（agent profiles）、Grok Build（subagents）、ZCode（subagents）、Mistral Vibe（插件内）、Deep Agents（框架内建）。
- 布局模式：`agents/<宿主>/agents/`（Markdown/YAML frontmatter 系）或 JSON 定义文件（Kiro/Tabnine 部分）。
- 格式分叉：**Markdown+frontmatter 系 vs JSON 定义系**。

### T6 插件 / 打包分发（多机制捆绑）——分发形态的归并点

- 覆盖面（官方）：Claude Code plugins（marketplace）、Grok Build plugins + marketplaces、ZCode plugins、Kode plugins（`.kode-plugin/plugin.json`）、Qwen extensions（`qwen-extension.json`）、Kiro Powers、Mistral Vibe plugins、Command Code mods、Continue Hub、iFlow 市场、Hermes Skills Hub、Moxby 市场、AdaL plugins、MiniMax plugins、Snowflake bundled skills。
- 布局模式：`agents/<宿主>/<插件包名>/{skills,commands,hooks,agents…}/`——插件是 T1/T2/T3/T5 的**捆绑容器**，不是独立内容机制。布局规范把 T6 定义为「清单文件 + 机制子目录」的容器规范，各宿主清单文件名（plugin.json / qwen-extension.json / plugin.json（kode）/ powers 清单）逐宿主映射。
- 分发形态三分法（对布局规范的意义）：①市场/注册表分发（marketplace add、extensions install、Powers、Hub、Powers 市场）——包形态需对齐各宿主清单；②生态 CLI 安装（`npx skills add`，即 vercel-labs/skills 本尊）——本质是 T1 目录拷贝的自动化；③目录拷贝（git 提交 / 软链）——本仓库现行形态。**本仓库 agents/ 布局以③为主形态、以①的目标结构为准绳设计即可两栖**。

### T7 MCP（工具接入）——配置文件类，非目录型内容扩展

- 覆盖面：几乎所有宿主官方支持 MCP，但落点全是**配置文件**（`.roo/mcp.json`、`.windsurf/mcp_config.json`、`.trae/mcp.json`、`.kiro/settings/mcp.json`、`crush.json`、`config.yaml`（Continue）、`mcp.json`（OpenHands/Devin）、ZCode mcp-services 配置）。
- 分类学结论：MCP 不入 `agents/<宿主>/<机制>/` 目录型条目，布局规范中单列为「配置文件条目」，避免把配置文件伪装成目录扩展。

### T8 其他专有形态——异类单列，逐宿主标注

- OpenHands microagents（关键词触发提示，`.openhands/microagents/*.md`）——与 T1 形态最近但触发模型不同，单列。
- Kiro specs（`.kiro/specs/`，规格驱动产物目录）——流程产物，非扩展分发，单列标注「不承接」。
- Goose recipes（配方文件）与 `.goosehints`——专有工作流/提示形态，单列。
- Code Studio `.codestudio/prompts/`——提示文件目录，与 T2 近缘，单列标注。
- Devin Knowledge/Playbooks、Windsurf memories、MiniMax Heartbeat、Ona 组织级 skills、AiderDesk SDK 扩展——平台内建对象，标注「不承接（无文件目录约定）」。

### 异常流 C 承接：非插件形态机制的条目与目录约定

need 异常流 C：「某宿主扩展机制非插件形态（hooks/命令等）」→ 本分类学逐类给出非插件形态条目，全部有官方目录约定支撑，布局规范可承接：

- **hooks（T3）**：目录型（`agents/<宿主>/hooks/`）与配置声明型（Kiro hooks 目录、Command Code settings、ForgeCode forge.yaml）两模式，均有官方文档（code.claude.com/docs/hooks、zcode.z.ai/en/docs/hooks、commandcode.ai/docs/hooks、kiro.dev/docs/hooks）。
- **命令（T2）**：Markdown 系 `.claude/commands/`、`.codebuddy/commands/`、`.windsurf/workflows/` 有官方目录约定；TOML 系 `.qwen/commands/` 同。纯内建斜杠命令宿主（Rovo Dev、iFlow）标注「无可分发命令目录」。
- **规则（T4）**：目录型 8 宿主有官方 rules 目录约定；单文件型以根级 AGENTS.md/CLAUDE.md 条目承接。
- **子代理（T5）**：`.claude/agents/`、`.tabnine/agent/agents/`、`.kiro/agents/` 有官方目录约定。
- **仅 skills 宿主（最大群体）**：只建 `agents/<宿主>/skills/`，其余机制目录不建。

### 对布局规范定稿票（20261115-7784）的输入要点

1. **主干 = T1 skills**：`agents/<宿主>/skills/<技能名>/` 全清单通用；技能内容遵循 agentskills.io，一次设计全成立。
2. **可选机制条目 = T2 commands / T3 hooks / T4 rules / T5 agents**：仅对官方文档载明该机制的宿主建目录；条目内文件格式逐宿主两分（md 系 / toml 系；目录型 / 配置声明型）。
3. **容器条目 = T6 插件**：清单文件（plugin.json / qwen-extension.json / powers）+ 机制子目录；demo 迁位目标 `agents/dsh/plugins/dsh-demo/` 与 Claude/ZCode 系插件容器同构。
4. **配置文件条目 = T7 MCP**：不入目录型扩展，布局规范单列配置文件映射行。
5. **本机级路径映射表是硬需求**：12+ 个宿主本机级根不在 `~/.<host>/`（.config 系 / .codeium / .snowflake / .deepagents 等变体），安装器映射表（agent-dirs.js symlinkRule 前例）需扩展承载。
6. **项目级路径映射特例**：Devin 推荐 `.agents/skills/`（`.devin/skills/` legacy）；这些特例逐宿主写进布局规范的宿主行，避免安装器按单一模式误判。
7. **无公开文档宿主（Codemaker / Jazz / Terramind / Tinycloud / MCPJam 自身 / Mux 机制页）**：布局规范对这 6 个宿主仅按生态表行建 skills 条目，并在规范中标注「待宿主官方文档公开后复核」，不虚构其余机制。

## 来源与检索说明

- 全部检索日期：2026-11-15。宿主官方文档 URL 随版本演进，实现/评审时如 404 以宿主文档站站内检索复核。
- 【生态】主来源：vercel-labs/skills `docs/agents.md`（<https://github.com/vercel-labs/skills/blob/main/docs/agents.md>，本仓库 `src/agent-dirs.js` AGENT_DIRS 与本机级 skills 路径的出处）；技能开放规范：<https://agentskills.io>。
- 一手来源逐条附于各宿主小节；「无公开扩展机制文档」宿主（Codemaker、Jazz、Terramind、Tinycloud，及机制文档不全的 Neovate、MCPJam 自身、Mux）均显式标注、未虚构任何目录约定。
- 交叉核验记录：同一机制若有官方文档页与生态表行两个来源，正文以官方页为准、生态行补项目级路径；仅生态来源的路径已逐条标注「【生态】」。
