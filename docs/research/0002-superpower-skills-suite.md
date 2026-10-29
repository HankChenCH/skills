---
id: 0002
created: 2026-10-29
---
# superpower 技能套件调研：obra/superpowers 的技能清单、产物落点、安装痕迹与 matt 套件对比

## 调研问题与用途

> 本报告是 spec 0010（setup-migrate）FR-8 的调研前置：superpower 实现票（0013 识别清单、0014 翻译映射 superpower 部分）开工前须存在本报告。结论只对 main 分支 v7.0.1（commit `2ce8aa15d0`，2026-10-21）快照负责，实现时请复核。本机未安装该套件（`~/.claude` 不存在，全盘搜索无命中），全部事实来自官方 GitHub 仓库与 Claude Code 官方文档原文。

- **Q1 技能清单与分类**：obra/superpowers 有哪些技能、哪些属生命周期类哪些属写作类？——堵着 setup-migrate 的处置判据（生命周期类移除或归档，写作类保留）；影响 FR-4。
- **Q2 产物落点与形态**：生命周期产物（设计文档/计划/执行台账/评审结论）发布在哪、什么形态？——堵着翻译映射表 superpower 部分的产物对产物映射；影响 FR-2。
- **Q3 安装位置与识别特征**：装在哪些目录、留什么痕迹？——堵着识别特征清单 superpower 部分；影响 FR-1。
- **Q4 与 matt 套件的结构异同**：两套点名套件结构差在哪？——堵着"一套处置协议管两套件"的假设是否成立；影响 FR-2 / FR-3 / FR-4 的分套件差异。

## 结论速览

- **Q1**：共 15 个技能，全部在仓库 `skills/` 目录：生命周期/流程类 11 个（brainstorming → writing-plans → executing-plans / subagent-driven-development 等官方编排链），框架元/保障类 4 个（using-superpowers、verification-before-completion、diagnosing-superpowers、writing-skills），**内容写作类 0 个**（来源 1、2、8）。按蓝图 §10.3 判据，该套件整体按生命周期类处置；**`writing-plans` / `writing-skills` 名带 writing- 前缀但不是写作类**，按前缀分类会把它们误判。
- **Q2**：产物全部落在**目标仓库内**，不用任何 issue tracker：设计文档 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`（提交进 git）、实现计划 `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`（提交进 git）、执行台账与任务简报在 `.superpowers/sdd/<计划名>/`（git-ignored 临时区，终审后按协议删除）；评审结论不落盘（来源 1、3–7）。
- **Q3**：官方安装路 = Claude Code 插件：`/plugin install superpowers@claude-plugins-official` 或先 `marketplace add obra/superpowers-marketplace` 再安装；落盘 `~/.claude/plugins/cache/<marketplace>/superpowers/<版本>/`，痕迹在 `settings.json` 的 `enabledPlugins`、`~/.claude/plugins/installed_plugins.json`、`known_marketplaces.json`，以及仓库内 `hooks/hooks.json` 注册的 SessionStart hook（来源 2、9、10、11）。识别须**精确匹配插件名 `superpowers`**——同一 marketplace 另有 4 个 `superpowers-*` 前缀兄弟插件，按前缀识别会误伤（来源 11）。
- **Q4**：与 matt 的根本结构差异：matt 把 spec/ticket 发布到 issue tracker、本地几乎不留过程档、状态在五枚 triage 标签；superpower 产物与状态全在目标仓库文件 + git 历史、**无 tracker、无 issue 可关**（FR-3 的 issue 关闭路径对 superpower 无对象）。粒度也不同：matt 一票一个 issue，superpower 一张计划文件内含 Task N 子任务（来源 12 与本报告 Q2/Q3）。

### 待用户决策的支持范围（FR-8）

以下三项一手来源够不着（详见各节"不可考"），按 spec 0010 FR-8 路径回用户决策。**决策记录路径：拍板结果记进迁移对账清单备注（spec 0010 FR-8 原文）；未拍板前，票 0013/0014 按报告所得特征实现并在对账清单把对应痕迹标"未处理"。**

- **D1 历史版本差异**：结论仅对 v7.0.1 负责；用户实际安装可能是旧版，技能清单/路径可能不同（RELEASE-NOTES.md 约 112 KB 版本史未逐版核对，不可考）。候选：(a) 识别清单按 v7.0.1 特征落，同时读 `installed_plugins.json` 的 version 字段，旧版本命中时提示人工复核（推荐，成本低）；(b) 追溯 git 历史补齐旧版特征（成本高）；(c) 接受旧版漏检风险。
- **D2 框架元/保障类 4 技能的处置**：蓝图 §10.3 判据只有"生命周期类 vs 写作类"两档，superpower 写作类为 0；using-superpowers 等 4 个元技能不与 dev-\* 对位但同属该方法论且面向自动触发。候选：(a) 整套插件一并处置（`claude plugin uninstall`，处置单位是插件整体，最干净——推荐）；(b) 保留个别（如 verification-before-completion 的"完成前验证"价值独立）——实际等于不卸载插件、把个别技能移出发现路径，成本更高。
- **D3 非 Claude Code harness 的痕迹**：README 明示多 harness（Codex/Cursor/Gemini 等）各需单独安装，仓库内有 `.codex-plugin/`、`.cursor-plugin/` 等对应目录（一手），但各 harness 的落盘路径本次未调研（不可考）。候选：(a) 本轮识别清单只覆盖 Claude Code 痕迹，其他 harness 痕迹对账清单标"未处理"提示用户（待遇同非点名套件——推荐）；(b) 补一轮调研扩识别清单。

## 套件概况

- 官方仓库 github.com/obra/superpowers，自述 "An agentic skills framework & software development methodology that works."；作者 Jesse Vincent（GitHub ID: obra），MIT 协议，主语言 Shell。
  来源：https://api.github.com/repos/obra/superpowers（检索 2026-10-29）
- 活跃维护中：仓库创建 2025-10-09，最近 push 2026-10-23，main 最新 commit 2026-10-21（`2ce8aa15d0`，"Release v7.0.1: brainstorming retune, skills that better survive compaction…"）；插件版本号在 `.claude-plugin/plugin.json` 的 `version` 字段（7.0.1）。
  来源：https://api.github.com/repos/obra/superpowers/commits?per_page=1；https://raw.githubusercontent.com/obra/superpowers/main/.claude-plugin/plugin.json（检索 2026-10-29）
- 官方编排链（README "The Basic Workflow"）：brainstorming → using-git-worktrees → writing-plans → subagent-driven-development 或 executing-plans → test-driven-development → requesting-code-review → finishing-a-development-branch；README 原文："The agent checks for relevant skills before any task. **Mandatory workflows, not suggestions.**"
  来源：https://raw.githubusercontent.com/obra/superpowers/main/README.md（检索 2026-10-29）

## 技能清单与分类（Q1）

### 清单（15 个，全树核对无遗漏）

全仓库 SKILL.md 共 15 个，全部位于 `skills/` 下；下表 description 为 SKILL.md frontmatter 原文。

| 技能 | description（原文摘引） | 来源 |
|---|---|---|
| brainstorming | "You MUST use this before any creative work - creating features, … or planning anything new" | skills/brainstorming/SKILL.md |
| using-superpowers | "Use when starting any conversation - … requiring skill invocation before ANY response" | skills/using-superpowers/SKILL.md |
| writing-plans | "Use when you have a spec or requirements for a multi-step task, before touching code" | skills/writing-plans/SKILL.md |
| executing-plans | "Use when executing an implementation plan in the current session as the implementer yourself…" | skills/executing-plans/SKILL.md |
| subagent-driven-development | "Use when executing implementation plans with independent tasks in the current session" | skills/subagent-driven-development/SKILL.md |
| dispatching-parallel-agents | "Use when facing 2+ independent tasks that can be worked on without shared state…" | skills/dispatching-parallel-agents/SKILL.md |
| using-git-worktrees | "Use when starting feature work that needs isolation … or before executing implementation plans" | skills/using-git-worktrees/SKILL.md |
| test-driven-development | "Use when implementing any feature or bugfix, before writing implementation code" | skills/test-driven-development/SKILL.md |
| systematic-debugging | "Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes" | skills/systematic-debugging/SKILL.md |
| verification-before-completion | "Use when about to claim work is complete … evidence before assertions always" | skills/verification-before-completion/SKILL.md |
| requesting-code-review | "Use when completing tasks, implementing major features, or before merging…" | skills/requesting-code-review/SKILL.md |
| receiving-code-review | "Use when receiving code review feedback, before implementing suggestions…" | skills/receiving-code-review/SKILL.md |
| finishing-a-development-branch | "Use when implementation is complete, all tests pass, and you need to decide how to integrate" | skills/finishing-a-development-branch/SKILL.md |
| diagnosing-superpowers | "Use when a superpowers session went wrong and your human partner wants to know why…" | skills/diagnosing-superpowers/SKILL.md |
| writing-skills | "Use when creating new skills, editing existing skills, or verifying skills work" | skills/writing-skills/SKILL.md |

来源（本表全部行）：https://api.github.com/repos/obra/superpowers/contents/skills（目录核对，检索 2026-10-29）；各 SKILL.md 原文经 https://raw.githubusercontent.com/obra/superpowers/main/skills/<名>/SKILL.md 与 GitHub git blobs API 抓取（检索 2026-10-29）。

### 分类（判断，依据为 README 官方分组 + SKILL.md 互相引用，均已回原文核对）

- **生命周期/流程类 11 个**：brainstorming（spec 阶段；正文含 HARD-GATE："Nothing gets built until your human partner approves the design doc"，批准后 "invoke superpowers:writing-plans and no other skill"）、writing-plans（计划阶段，模板强制 REQUIRED SUB-SKILL 指向两个执行技能）、executing-plans 与 subagent-driven-development（实现阶段两变体，共用工作区与台账格式）、dispatching-parallel-agents（并行执行编排）、using-git-worktrees（README 流程第 2 步，分支隔离）、test-driven-development（RED-GREEN-REFACTOR）、systematic-debugging（4 阶段根因流程）、requesting-code-review 与 receiving-code-review（评审阶段，README："Critical issues block progress"）、finishing-a-development-branch（收尾：merge / PR / keep / discard 决策 + worktree 清理）。
- **框架元/保障类 4 个**（仍是该开发方法论的组成部分，非内容创作；处置归属见待决 D2）：using-superpowers（会话启动自举，"before ANY response"）、verification-before-completion（完成声明前的验证门禁，被 executing-plans、systematic-debugging 引用为流程内检查点）、diagnosing-superpowers（对 superpowers 自身会话的事后诊断与 bug 报告）、writing-skills（为该框架写/改技能的元技能，正文自述 "Writing skills IS Test-Driven Development applied to process documentation"）。
- **内容写作类：0 个**。README 官方分组（Testing / Debugging / Collaboration / Meta）里没有任何内容创作技能。
  来源：https://raw.githubusercontent.com/obra/superpowers/main/README.md 及上表各 SKILL.md（检索 2026-10-29）

**判据警示（判断）**：FR-4 不可用 `writing-` 前缀作写作类判据——writing-plans 是计划阶段流程技能、writing-skills 是框架元技能，按前缀会把两者误判。本工作区的 writing-beats / writing-for-agents / writing-fragments / writing-shape 属 matt 套件，与 superpower 无关，两套件的 writing-\* 不能混为一谈。

## 产物落点与形态（Q2）

### 落点表

| 产物类型 | 落点 | 形态要点 | 来源 |
|---|---|---|---|
| 设计文档（判断：≈ 本套件 spec） | 目标仓库 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`，"in a software repo, … committed" | 必含 Approaches 部分（方案对比与选定理由）；覆盖 intent/why、goals、non-goals、anti-goals、constraints、已定的 how、留给 builder 的部分；人批准前不许动工（HARD-GATE） | brainstorming/SKILL.md |
| 实现计划（判断：≈ 本套件工单集） | 目标仓库 `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`，"User preferences for plan location override this default" | 标题 `# [Feature Name] Implementation Plan`；头部字段 Goal / Architecture / Tech Stack / Spec（指向设计文档路径）/ Global Constraints / Review Focus；任务 `### Task N: [Component Name]` 含 Files（Create/Modify 精确路径）、Interfaces（Consumes/Produces 签名）、checkbox 步骤（`- [ ]`，Red-Green 顺序）与含精确 git 命令的 Commit 步骤 | writing-plans/SKILL.md |
| 任务简报 / 实现者报告 | `<repo-root>/.superpowers/sdd/<计划名去 .md>/task-<N>-brief.md`、`task-<N>-report.md` | brief 由脚本从计划文件按 `Task N` 标题抽取；report 只回报 status（DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED）、commits、测试摘要、concerns | subagent-driven-development/SKILL.md 及其 scripts/task-brief |
| 进度台账 ledger | `<workspace>/progress.md`（即 `.superpowers/sdd/<计划名>/progress.md`） | 首行身份行 `# SDD ledger — plan: <计划文件路径>`；完成行 `Task <N>: complete (commits <base>..<head>, tests: …)`；裁定行 `Ruling: …`；收尾行 `Final: fixed … RED→GREEN, suite N/N` | executing-plans/SKILL.md 及 scripts/task-done |
| 任务测试日志 | 同目录 `task-<N>-tests.log` | 测试完整输出 | executing-plans/scripts/task-done |
| 评审包 | 同目录 `review-<base7>..<head7>.diff` | `# Review package` + Commits + Files changed + Diff（git diff -U10） | subagent-driven-development/scripts/review-package |
| 评审结论 | 会话内子代理返回，**不要求写成仓库文件** | Strengths / Issues 分 Critical（Must Fix）/ Important / Minor；Critical 阻塞推进 | requesting-code-review/SKILL.md 及其 code-reviewer.md |
| 工作区归属标记 | `<workspace>/plan-path` | 一行，记录所属计划路径，防同名计划互踩 | scripts/sdd-workspace |

来源（本表全部行，检索 2026-10-29）：https://raw.githubusercontent.com/obra/superpowers/main/skills/brainstorming/SKILL.md；…/skills/writing-plans/SKILL.md；…/skills/executing-plans/SKILL.md；…/skills/subagent-driven-development/SKILL.md；…/skills/requesting-code-review/SKILL.md 与 …/code-reviewer.md；…/skills/subagent-driven-development/scripts/{sdd-workspace,task-brief,review-package}；…/skills/executing-plans/scripts/{task-start,task-done}

### 工作区与状态机制

- 工作区固定 `<repo-root>/.superpowers/sdd/<计划名>/`；slug 冲突时追加父目录名、再加计数器；`.superpowers/sdd/.gitignore` 写入 `*`（create-only，注释明言仓库可自带 .gitignore 以"version progress.md ledgers"）；executing-plans 与 subagent-driven-development 共用同一目录同一台账格式，可中途换执行方式续跑。
  来源：https://raw.githubusercontent.com/obra/superpowers/main/skills/subagent-driven-development/scripts/sdd-workspace（检索 2026-10-29）
- 状态 = 台账 + 计划 checkbox + git 历史："Track progress in a ledger file, not only in todos."；断点续跑读台账首行核对计划身份，有 `Task <N>: complete` 的任务跳过；"after compaction, trust the ledger and `git log` over your own recollection."
  来源：executing-plans/SKILL.md（检索 2026-10-29）
- 终审通过后**删除该计划的 `.superpowers/sdd/` 工作区**："delete this plan's workspace directory — the git history is the record now."（executing-plans 与 subagent-driven-development 原文一致）。长期留存的只有 spec、plan（目标仓库 docs/ 下，已提交）与 git 历史。
  来源：executing-plans/SKILL.md；subagent-driven-development/SKILL.md（检索 2026-10-29）
- 隔离工作区：using-git-worktrees 优先平台原生工具、回退手工 `git worktree add`（目录优先 `.worktrees/`，需 git-ignored）；分支命名无强制模板（不可考：原文未规定）。
  来源：https://raw.githubusercontent.com/obra/superpowers/main/skills/using-git-worktrees/SKILL.md（检索 2026-10-29）

### 外部平台发布

- 生命周期技能**没有任何 GitHub issue / project 集成**（相关 SKILL.md 与脚本均已抓取核对，无一处创建 issue）。唯一外联动作：finishing-a-development-branch 的 "Push and create a Pull Request" 选项（`git push -u origin <branch>` 后建 PR，遵循仓库既有 PR 模板）——面向人的集成决策，不是产物发布流程。
  来源：finishing-a-development-branch/SKILL.md（检索 2026-10-29）
- 全仓库唯一 issue 发布动作在 diagnosing-superpowers：`gh issue create --repo obra/superpowers --title … --body-file <path> --label bug --label automated-issue-report`，且须人批准后才执行——范围严格限定为向 superpowers 插件自身报 bug，与用户项目的生命周期产物无关。
  来源：https://raw.githubusercontent.com/obra/superpowers/main/skills/diagnosing-superpowers/references/github-issues.md（检索 2026-10-29）
- 上游仓库自吃狗粮实证：`docs/superpowers/specs/` 实存 22 个 `YYYY-MM-DD-<topic>-design.md`（另 2 个 `-results.md` 变体）；`docs/superpowers/plans/` 上游不存在（API 404）——与"计划是各目标仓库的产物"一致。
  来源：https://api.github.com/repos/obra/superpowers/contents/docs/superpowers/specs 与 …/contents/docs/superpowers/plans（检索 2026-10-29）

## 安装位置与识别特征（Q3）

### 安装方式与落盘（Claude Code）

- 官方支持两条路（README Installation 原文）：① `/plugin install superpowers@claude-plugins-official`（Anthropic 官方 marketplace）；② `/plugin marketplace add obra/superpowers-marketplace` → `/plugin install superpowers@superpowers-marketplace`。CLI 等价：`claude plugin marketplace add <owner>/<repo>`、`claude plugin install superpowers@<marketplace>`。
  来源：https://raw.githubusercontent.com/obra/superpowers/main/README.md；https://code.claude.com/docs/en/plugin-marketplaces；https://code.claude.com/docs/en/plugins/cli-reference.md（检索 2026-10-29）
- 落盘（Claude Code 官方文档明示）：插件文件在 `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`（`${CLAUDE_PLUGIN_ROOT}` 指向此处）；marketplace 克隆在 `~/.claude/plugins/marketplaces/<name>/`（根可被 `CLAUDE_CODE_PLUGIN_CACHE_DIR` 改写）。
  来源：https://code.claude.com/docs/en/plugins/loading.md（检索 2026-10-29）
- 插件内部结构（仓库 manifest 一手）：`skills/` 15 个技能目录；`hooks/hooks.json` 注册 SessionStart hook（matcher `startup|clear|compact`，执行 `"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd" session-start`）；`.claude-plugin/plugin.json`（name: superpowers）与 `.claude-plugin/marketplace.json`。
  来源：https://raw.githubusercontent.com/obra/superpowers/main/hooks/hooks.json；…/.claude-plugin/plugin.json；…/.claude-plugin/marketplace.json（检索 2026-10-29）
- 手动把技能拷进 `~/.claude/skills/<名>/` 或项目 `.claude/skills/<名>/`：目录路径为 Claude Code 官方 skills 位置，但 README 未提供此安装方式（判断：属第三方做法，非官方支持路径）；按技能目录名识别仍然有效。
  来源：https://code.claude.com/docs/en/skills（检索 2026-10-29）
- 版本与更新：`claude plugin update / uninstall superpowers@<marketplace>`、`claude plugin marketplace remove <name>`（连带卸载其插件）；自动更新每会话至多一次（首条消息后随机延迟至多十分钟），官方 marketplace 默认开、其他 marketplace 默认关；会话内生效需 `/reload-plugins`。README Updating 节仅说 "often automatic"。
  来源：https://code.claude.com/docs/en/plugins/cli-reference.md；loading.md；README（检索 2026-10-29）

### 识别特征清单（"装过"的证据，按置信分层）

| 层 | 特征 | 位置 | 置信 |
|---|---|---|---|
| 配置 | `enabledPlugins` 键 `"superpowers@claude-plugins-official"` 或 `"superpowers@superpowers-marketplace"`（值 true） | `~/.claude/settings.json`、项目 `.claude/settings.json` 或 `.claude/settings.local.json` | 键格式官方文档明示；superpowers 具体键值为安装命令推导（推断，高置信） |
| 配置 | `known_marketplaces.json` 含 source `obra/superpowers-marketplace` 条目（字段 source / installLocation / lastUpdated / autoUpdate） | `~/.claude/plugins/known_marketplaces.json` | 官方文档明示 |
| 配置 | `installed_plugins.json` 含 superpowers 条目（字段 scope / installPath / version，version 可读出安装版本——D1 决策的判读入口） | `~/.claude/plugins/installed_plugins.json` | 官方文档明示 |
| 磁盘 | `~/.claude/plugins/cache/superpowers-marketplace/superpowers/<版本>/` 目录树（`skills/` 15 技能目录 + `hooks/` + `.claude-plugin/plugin.json`） | 插件 cache | 路径模式官方明示；末段名来自安装命令与 manifest（推断，高置信） |
| 磁盘 | `~/.claude/plugins/marketplaces/superpowers-marketplace/` | marketplace 克隆 | 同上 |
| 目标仓库 | `docs/superpowers/specs/`、`docs/superpowers/plans/` 目录及其中文档 | 仓库内 | SKILL.md 原文 + 上游 dogfood 实证（一手） |
| 目标仓库 | `.superpowers/sdd/`（残留工作区：ledger / brief / report / `plan-path`）及其 `.gitignore`（内容 `*`） | 仓库内 | 脚本原文（一手）；"残留"只在中断时出现 |
| 注入 | 无 CLAUDE.md / AGENTS.md 改写证据；运行时注入走 SessionStart hook | 插件 hooks/hooks.json | hook 存在为一手；"不落额外文件"为基于 hook 机制的推断 |

来源：loading.md 与上表所列 URL（检索 2026-10-29）。

### 防误伤

- obra 的 superpowers-marketplace 共托管 10 个插件，其中 4 个与 `superpowers` 同前缀：superpowers-chrome（3.0.5）、superpowers-lab（0.5.0）、superpowers-developing-for-claude-code（0.3.1）、superpowers-dev（0.0.2026021001）；另有 episodic-memory、elements-of-style 等。
  来源：https://raw.githubusercontent.com/obra/superpowers-marketplace/main/.claude-plugin/marketplace.json（检索 2026-10-29）
- **识别必须精确匹配插件名 `superpowers`（及 `superpowers@<marketplace>` 完整键）**，不能见 `superpowers-*` 前缀就判装了本套件（判断：否则兄弟插件被误处置）。命中兄弟插件时对账清单按"未处理"行提示用户（spec 0010 E1 待遇）。

## 与 matt 套件的结构异同（Q4）

matt 侧事实来源：本机技能原文（`~/.zcode/skills/{to-spec,to-tickets,triage,setup-matt-pocock-skills}/SKILL.md`，2026-10-29 核验）与蓝图 §10.3 十四项生命周期清单；superpower 侧为本报告 Q1–Q3。

**相同**：都是"技能集 + 软件开发方法论"，覆盖 spec → 计划/工单 → 实现（TDD）→ 评审 → 收尾的对位流程；都有 per-repo 配置自举（matt: setup-matt-pocock-skills 写 `docs/agents/issue-tracker.md` 与标签词表；superpower: using-superpowers 会话自举）；都有显式状态机（matt: 五枚 triage 标签；superpower: 台账完成行 + 计划 checkbox）。

**不同**（按对迁移处置的影响排序）：

1. **产物归宿**：matt 把 spec / ticket 发布到 issue tracker（GitHub / GitLab / 本地 `.scratch/`，to-spec 原文 "publish it to the project issue tracker"）；superpower 产物与状态全在目标仓库文件 + git 历史，**无 tracker**。→ 迁移语义差异：matt 要关 issue（FR-3），superpower 无 issue 可关，FR-3 对 superpower 无对象；superpower 的"归宿"只有 docs/superpowers/ 存量文档翻译与 `.superpowers/` 残留清理。
2. **产物形态**：matt spec/ticket 正文在 tracker issue 里，本地几乎不留过程档；superpower 设计文档与计划是**已提交进目标仓库 git 的 markdown 文件**（specs 模板含 Approaches 取舍记录；plans 含 Task N / Files / Interfaces / checkbox）。
3. **工单粒度**：matt to-tickets 产 tracer-bullet 垂直切片票（一票一 issue、阻塞边为原生链接）；superpower 无独立票对象——一张计划文件内含多个 Task N（2–5 分钟粒度步骤）。→ FR-2 映射：plan 文件整体 ≈ 工单集，Task N ≈ 工单，而非 plan ≈ 单票。
4. **自动触发面**：matt 十四项生命周期技能中六项无 `disable-model-invocation`（tdd / code-review / research / domain-modeling / prototype / diagnosing-bugs，本机 frontmatter 核验）；superpower 全部 15 个技能 description 均为 "Use when…" 触发式且 using-superpowers 要求 "before ANY response"——自动触发面覆盖全套件。→ 两套件都是"绕开门禁链"的风险源，处置判据一致（生命周期类移除或归档）。
5. **发行与处置单位**：matt 技能散装拷进技能目录（无插件清单、无版本号）；superpower 是带版本（plugin.json 7.0.1）的 Claude Code plugin，有官方卸载命令。→ FR-4 处置差异：superpower 处置单位是插件整体（`claude plugin uninstall superpowers@<marketplace>` 或移除 enabledPlugins 键），不是逐技能删文件；装在 `~/.claude/plugins/` 属用户全局安装，按 spec 0010 须先经用户确认作用域。
6. **状态语义**：matt 状态在 tracker 标签（needs-triage → ready-for-agent → … → wontfix），可对照 spec 0010 分态规则直接判"开着的 / 已闭环 / wontfix"；superpower 状态在台账与 checkbox——**"未完成的外来工作" = 台账/计划中有未完成 Task**（如残留 `.superpowers/sdd/` 工作区或未勾 checkbox 的 plan），"已完成" = 终审通过且工作区已删（git 历史即记录）。无 wontfix 等价物。
7. **评审与诊断**：matt 有独立 triage 技能处理 issue/PR 队列；superpower 评审是会话内子代理（review-package diff → code-reviewer 模板，Critical 阻塞），**结论不落盘**，迁移无可翻译产物，只能从台账 Final 行与 git 历史还原。

## 对本项目的映射要点

- **FR-1（票 0013 识别清单 superpower 部分）**：按"配置 / 磁盘 / 目标仓库"三层落特征（见识别特征清单表）；插件名精确匹配防兄弟插件误伤；`installed_plugins.json` 的 version 字段是 D1（历史版本）的判读入口。仓库内痕迹：`docs/superpowers/`（specs / plans）、`.superpowers/`（sdd 残留）。
- **FR-2（票 0014 翻译映射 superpower 部分）**：产物对产物——design doc（已提交）≈ spec 形态（Approaches ≈ 实现决策；判断：已批准且已实现的历史 design doc 走沉淀形态 reconstructed）；plan（已提交）≈ 工单集（判断：已完成的 plan 不产正向 ticket——过程档不留僵尸，耐久内容折进对应沉淀 spec / 对账清单记行）；`.superpowers/sdd/` 残留工作区 = "未完成的外来工作"证据，按 spec 0010 分态规则落正向 ticket（ready）；评审结论无落盘产物，对账清单记"无落盘产物"；git 历史不动。**否掉的方案**："superpower 也有 tracker issue 需要关闭"——不成立，FR-3 仅对 matt 适用。
- **FR-4（处置判据）**：15 个技能中写作类 0 个，**不可用 `writing-` 前缀判写作类**；生命周期/流程类 11 个按蓝图 §10.3 移除或归档；框架元/保障类 4 个的归属是待决 D2。处置单位是插件整体；全局安装须用户确认作用域。
- **FR-8（调研不可行分支）**：本报告不可考范围 = D1（历史版本特征）/ D2（元技能处置归属）/ D3（非 Claude Code harness 痕迹）。决策路径已可执行：结论速览"待用户决策的支持范围"列明候选选项 → 用户拍板 → 决策记录进对账清单备注；未拍板前 0013/0014 按报告所得特征实现，对应痕迹对账清单标"未处理"。
- **局限**：结论只对 main v7.0.1（2026-10-21）快照负责；各技能仍在频繁重写（上游 2026-10 仍在重写 brainstorming），实现票动工时建议按"来源清单"复核关键 SKILL.md 是否变更。

## 来源清单（检索日期均为 2026-10-29）

编号供结论速览引用；正文各节另有逐条 `来源：URL（检索 2026-10-29）` 行。全部为本会话实际抓取的一手来源。

1. 仓库元数据与全树核对：https://api.github.com/repos/obra/superpowers ；…/commits?per_page=1 ；…/git/trees/main?recursive=1 ；…/contents/skills ；…/contents/docs/superpowers/specs ；…/contents/docs/superpowers/plans（404 实证）
2. README（安装命令、The Basic Workflow、What's Inside、Updating）：https://raw.githubusercontent.com/obra/superpowers/main/README.md
3. skills/brainstorming/SKILL.md（https://raw.githubusercontent.com/obra/superpowers/main/skills/brainstorming/SKILL.md）
4. skills/writing-plans/SKILL.md（同上路径模式）
5. skills/executing-plans/SKILL.md 与 …/skills/executing-plans/scripts/{task-start, task-done}
6. skills/subagent-driven-development/SKILL.md 与 …/skills/subagent-driven-development/scripts/{sdd-workspace, task-brief, review-package}
7. skills/requesting-code-review/SKILL.md 与 …/skills/requesting-code-review/code-reviewer.md
8. 其余 SKILL.md（清单表 description 引用，15 个均经 git blobs API 抓取原文）与 skills/diagnosing-superpowers/references/github-issues.md
9. manifest 与 hook：…/.claude-plugin/plugin.json ；…/.claude-plugin/marketplace.json ；…/hooks/hooks.json
10. Claude Code 官方文档：https://code.claude.com/docs/en/plugins/loading.md ；https://code.claude.com/docs/en/plugin-marketplaces ；https://code.claude.com/docs/en/plugins/cli-reference.md ；https://code.claude.com/docs/en/skills
11. obra/superpowers-marketplace：https://api.github.com/repos/obra/superpowers-marketplace 与 https://raw.githubusercontent.com/obra/superpowers-marketplace/main/.claude-plugin/marketplace.json
12. matt 侧本机一手：~/.zcode/skills/{to-spec, to-tickets, triage, setup-matt-pocock-skills}/SKILL.md；docs/sdlc-skills-blueprint.md §10.3

二手线索（未采信为事实来源）：https://blog.fsck.com/2025/10/09/superpowers/（作者博客，仅用于定位仓库）
