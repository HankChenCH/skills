---
id: 0003
created: 2026-10-31
---
# 四宿主并发原语对照调研：ZCode / Claude Code / Codex / DeepSeek harness

## 调研问题与用途

> 检索日期 2026-10-31。来源编号（S1–S21）见文末来源清单；本节末自述执行纪律。

- **Q1 ZCode 有哪些并发原语？** 要回答：ZCode 宿主可用的并发原语清单与形态。为什么重要：回退链（声明式工作流 > 后台子代理 > 同步子代理 > 串行逐票，spec 0012 实现决策）第 1 档命中判定。影响：FR-6（宿主自适应派发）。
- **Q2 Claude Code 有哪些并发原语？** 同 Q1。影响：FR-6。
- **Q3 Codex 有哪些并发原语？** 同 Q1；此前项目内对其无一手信息（need 0010 假设 A3），本问负责消解 A3。影响：FR-6、A3。
- **Q4 DeepSeek harness 有哪些并发原语？** 同 Q3。影响：FR-6、A3。

报告供票 0023（dev-execute 宿主自适应回退链）作设计输入；只陈述事实与代价，档位取舍归工单评审与用户。

**执行纪律自述（票 0020 验收标准 5）**：本轮按 dev-research 先并行派发 4 个后台检索代理；其中 3 个因平台并发额度失败，按其预案降级为主会话前台串行检索（ZCode、Claude Code、DeepSeek harness 三路），Codex 一路由后台代理完成返回。防编造核验：代理带回的关键结论逐条回原文——Codex 子代理页（S10）由主会话全文抓取比对，引句一致；Claude Code 四页、DeepSeek harness 四页由主会话直接抓取；ZCode 结论取自本机工具面与盘上技能文件（dev-research 认可的"代码本身"级一手来源），非训练记忆。检索工具全程可用，"停手"条款未触发。全文未标来源的陈述均为判断并注明依据。

## 结论速览

回退链四档命中矩阵（✓ 可用 / ✗ 不可用；括号内为依据来源编号）：

| 回退档 | ZCode | Claude Code | Codex | DeepSeek harness |
|---|---|---|---|---|
| 1 声明式工作流 | ✓ 最优（S1/S2） | ✓（S6/S7） | ✗ 无此原语（S10） | ✓ 但开发者预览、无恢复机制（S20） |
| 2 后台子代理（完成通知驱动） | ✓（S1） | ✓ 后台为默认（S4/S5） | ✗ 同步汇总语义，无单代理完成通知（判断，依据 S10） | ✓ 事件通知齐备（S18），主会话可响应性未核验 |
| 3 同步子代理 | ✓（S1） | ✓（S4） | ✓ 默认启用（S10） | ✓（S18） |
| 4 串行逐票（兜底） | ✓ 无需原语 | ✓ 无需原语 | ✓ 无需原语 | ✓ 无需原语 |

推荐命中档（**判断**，档位取舍归票 0023）：ZCode → 1；Claude Code → 1；Codex → 3；DeepSeek harness → 3 起步、2 待实测核验后启用、1 预览期不承载长编排（依据：其工作流无恢复机制且明示兼容性破坏，S17/S20）。

**A3 消解**：Codex 与 DeepSeek harness 均有一手来源确认的并发原语，"某宿主完全无并发原语"的前提不成立；串行档仅为兜底而非常态。

四宿主 × 四维覆盖矩阵（原语名 + 来源）：

| 维度 | ZCode | Claude Code | Codex | DeepSeek harness |
|---|---|---|---|---|
| 并发原语清单 | Agent 子代理、后台 Bash、CreateWorkflow 工作流（S1/S2） | 子代理、后台会话、dynamic workflows、后台 Bash（S4–S8） | 子代理（默认启用）、后台终端、云任务、exec/SDK（S10–S15） | subagent、jobs 后台任务、workflow 脚本（S18–S20） |
| 后台与状态回收 | 完成通知 + TaskOutput + 运行记录/恢复（S1） | 完成通知 + agent view/--json + /tasks + /workflows（S5/S6/S8） | /ps、/subagents、/agents、cloud list --json、exec JSONL（S11–S13） | subagent/end 事件、jobs 游标读取与 settled 事件（S18/S19） |
| 隔离能力 | 子代理独立上下文；命令沙箱（细节未核验）；无宿主级 worktree | 子代理独立上下文 + 可获独立 worktree；agent-view 会话自动迁入 worktree；teams 无隔离（官方警示）（S4/S5/S7） | 子代理继承父沙箱、无独立沙箱；托管 worktree；云任务独立 VM（S10/S14/S15） | 逐调用沙箱策略（bwrap/Landlock/Seatbelt/ACL）；子代理独立会话身份与可选 cwd（S18/S21） |
| 无子代理退化 | 串行 + 后台 Bash（判断，无公开文档背书） | worktree 并行会话 + 串行（官方对比页，S7/S9） | 多会话 + worktree、云任务并行、exec 脚本化（官方明示，S12/S13） | 未核验：无多实例并行官方表述；jobs 可承载后台命令（S19） |

## ZCode（本机 3.17.1 取证）

一手来源为本机安装的工具面与盘上文件（S1/S2）；公开文档 docs.z.ai 全索引无子代理、后台、工作流、沙箱页面（S3，2026-10-31 核验），故外部可点引用缺失，本节以"代码本身"为据。

- **子代理**：Agent 工具派发，独立上下文窗口；`run_in_background: true` 转后台，完成时自动通知主会话，不占主回合；可经消息继续既有代理（SendMessage 按 agentId 恢复，上下文保留）。〔来源 S1〕
- **后台任务**：Bash `run_in_background` 后台运行，跨回合存续、退出时重新唤起主会话；TaskOutput 阻塞/非阻塞取回，TaskStop 终止。〔来源 S1〕
- **声明式工作流**：CreateWorkflow 运行 TypeScript 编排脚本，编排多子代理、类型化中间结果、编译期检查；运行期支持洞穴填充（FillWorkflowHole）、升级提问（ResolveWorkflowQuestion）、运行记录与日志（GetWorkflowRun/ListWorkflowRuns）、停跑恢复（ResumeWorkflowRun，按 journal 重放已完成步）、脚本修订并复用已完成步缓存（AmendWorkflow）。捆绑技能 dynamic-workflows 随发行落盘。〔来源 S1/S2〕
- **隔离能力**：子代理独立上下文；Bash 命令带沙箱机制（工具面可见沙箱覆盖参数；沙箱细节未核验）。**判断**：宿主不提供子代理级 git worktree 隔离，并行写隔离靠方法论层 run-mechanics 的 worktree 物化（依据：工具面与捆绑技能均无 worktree 原语）。〔来源 S1〕
- **无子代理退化**：主会话串行逐票；长命令交后台 Bash。**判断**（依据：无官方"多会话并行"文档，退化方案即方法论自身的串行语义）。
- **未核验**：多实例/进程级并行（无公开文档）；命令沙箱细节；公开文档无对应页面，外部引用不可得。

## Claude Code

- **子代理**：Agent 工具（v2.1.63 由 Task 更名，别名兼容）；定义于 `.claude/agents/`；主会话派发默认后台——"a subagent that Claude spawns from your main conversation starts in the background"，结果"reach Claude as a completion notification in a later turn"；前台子代理阻塞主会话；并发默认 20（`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` 可调），嵌套最深 3 层。〔来源 S4〕
- **后台会话（agent view）**：`claude agents`、`--bg`/`/bg`、`/fork`；独立 supervisor 进程承载，关终端不停；编辑前自动迁入 `.claude/worktrees/` 独立 worktree；需输入/完成/失败推送通知；`claude agents --json` 输出 working/blocked/done/failed/stopped。〔来源 S5〕
- **声明式工作流**：dynamic workflows——运行时后台执行脚本，`agent()`/`pipeline()`/`parallel()` 编排子代理，schema 类型化结果；并发默认 16（1–256 可调）；`/workflows` 面板查看/暂停/恢复/重启；relaunch 按保存结果重放已完成代理；全付费计划可用（Pro 需 /config 开启），版本门槛 v2.1.248+。〔来源 S6/S7〕
- **后台任务**：Bash `run_in_background`，输出文件路径随启动返回、用 Read 读取（TaskOutput 于 v2.1.277 移除）；`/tasks` 列出与停止。〔来源 S8〕
- **隔离能力**：子代理独立上下文、不继承对话历史，可各获独立 worktree；agent teams 不做 worktree 隔离（官方警示按文件集划分工作）；"Two teammates editing the same file leads to overwrites"；Bash 命令沙箱存在但本次未核验细节。〔来源 S4/S5/S7〕
- **无子代理退化**：官方对比页给出五方式选择指导；worktree 并行会话（`claude --worktree <名>`）+ 串行为退化路径。〔来源 S7/S9〕
- **未核验**：Bash 命令沙箱细节；Projects 云端 threads（本报告按本机宿主口径不计入命中判定）。

## Codex

- **子代理**：默认启用——"Current Codex releases enable subagent workflows by default. Subagent activity appears in the ChatGPT desktop app, Codex CLI, and the IDE extension."；并行派发后由宿主等全部结果汇总——"Codex waits until all requested results are available, then returns a consolidated response."；内置 default/worker/explorer 三代理；自定义代理为 TOML 文件（`~/.codex/agents/` 或 `.codex/agents/`，必填 name/description/developer_instructions）；`[agents]` 配置含 `max_concurrent_threads_per_session`、`enabled`（默认 true）；`/subagents`、`/agents`、`codex agents` 检视线程。〔来源 S10/S11〕
- **后台任务**：后台终端（unified_exec）——`/ps` 查看命令与最近输出行、`/stop` 停止；`/daemon` 后台服务器；`codex queue --thread` 向既有会话后台投递消息；Goal 模式 `/goal` 设置/暂停/恢复长任务；云任务 `codex cloud exec` / `codex cloud list --json`（返回 status 等字段）+ `codex apply` 取回 diff。〔来源 S11/S12〕
- **声明式工作流**：无此原语——官方文档 "Workflows" 节为产品功能集（Projects/Scheduled tasks 等），非多智能体编排 DSL；编排逻辑由宿主持有（"ChatGPT or Codex handles orchestration across agents"），用户不能脚本声明并行与依赖。**判断**：Codex SDK/App Server（TS/Python，startThread/resumeThread）属进程级程序化编排，不是会话内声明式原语，不计入档 1（依据：S15 页面自述用途为"Control Codex as part of your CI/CD pipeline"）。〔来源 S10/S15〕
- **进程级方案**：`codex exec` 非交互模式（CI/流水线，默认只读沙箱，`--json` 事件流、`--output-schema` 结构化输出、`exec resume` 接力、`--worktree` 托管 worktree）；`/fork` 克隆会话并行探索；`/worktree` 托管 worktree（`$CODEX_HOME/worktrees`，detached HEAD）。**未核验**：官方无"并行运行多个 exec 实例"的明文背书。〔来源 S11/S13〕
- **隔离能力**：沙箱三档 read-only/workspace-write/danger-full-access，平台原生实现（macOS Seatbelt、Linux/WSL2 bubblewrap、Windows 原生）；子代理继承父沙箱策略——"Subagents inherit your current sandbox policy"，无独立沙箱；并行写官方警示——"Be more careful with parallel write-heavy workflows, because agents editing code at once can create conflicts"；云任务每任务独立 VM 与网络白名单。〔来源 S10/S14/S15〕
- **无子代理退化**：官方明示多会话 + worktree——"Use worktrees to give parallel coding chats separate checkouts"；另有云任务并行、exec 脚本化、Scheduled tasks。〔来源 S12/S13〕
- **未核验**：spawn_agent 工具官方 schema（官方文档不公布工具名，仅仓库 issue 侧证据）；子代理运行期间主会话可响应性官方未陈述；IDE 扩展入口细节。

## DeepSeek harness

形态：开源 agent harness（github.com/deepseek-ai/deepseek-harness，"Everything is a Plugin"，MIT，Cordis 框架，Web UI + SSH 启动，`npx @deepseek-ai/dsh`）；官方明示开发者预览——"THERE WILL BE COMPATIBILITY-BREAKING CHANGES."〔来源 S17〕

- **子代理**：subagent 子系统——`startActivation` 统一入口；两类后端：本地可续子代理（持久 Session）与外部一次性执行（Codex、Claude Code、ACP、DSH SDK 适配）；结果投递 `delivery: 'parent' | 'caller'`，parent 投递"会通知模型并进入父目录"；取消统一走 signal；并发无硬性数量上限（容量预留 + `maxDepth`/`depthLimit` 控制），"The service may call one provider concurrently for distinct children."〔来源 S18〕
- **后台与状态回收**：jobs 子系统——`JobRegistry.start(spec)` 创建，内置 bash kind（插件可声明扩展）；三种取回机制并行：游标式消耗读取 `read`、非消耗 `readAt`、事件流 `registered|progress|stopping|removed|settled|output`；`wait(id)` 等结算；`list/get/kill/remove` 生命周期管理；`maxConcurrentJobsPerOwner` 默认 10。〔来源 S19〕
- **工作流**：workflow 子系统——"由模型编写、会启动 subagent 的编排脚本"（普通 JS、顶层 await、return JSON 值）；`agent()` 启动归属父的子代理，`parallel()`/`pipeline()` 组合器带并发槽；`WorkflowResult` 含 value/stopReason/agentsStarted；`phase()` 仅进度展示；**无恢复机制**——文档只描述中断可检测（Chat 记录缺 run-end 即中断证据）；属可选能力，"不属于 agent loop"。〔来源 S20〕
- **隔离能力**：sandbox 子系统——argv 包装 + 平台后端（Linux bwrap/Landlock、macOS Seatbelt、Windows ACL 受限令牌）；`SandboxMode` 仅管控文件系统效果（read-only/workspace-write/danger-full-access）；策略逐调用携带，两个消费方可同时用不同边界；fail-closed——"静默的无隔离透传永远不合法"。子代理有独立会话身份；是否继承父上下文由 `inheritsParentContext` 标记；工作目录可选 `request.cwd`，缺省继承父目录；通信仅限相邻本地代理。〔来源 S18/S21〕
- **无子代理退化**：**未核验**——未见多实例/多会话并行的官方表述；jobs 后台 bash 可承载长命令（S19）。退化路径需票 0023 按"串行 + 后台命令"设计并实测。
- **未核验**：进程级并行官方表述；各子系统在具体部署中的启用面（workflow 消费方需显式启用，S20）。

## 对本方法论派发回退链的映射要点

1. **A3 消解（FR-5 → need 0010）**：四宿主全部有一手来源确认的并发原语；FR-6 不需要为任何宿主设计"完全无原语"分支，串行档仅作探测全失败的兜底。
2. **探测信号（FR-6 探测对象，判断，设计归票 0023）**：ZCode——CreateWorkflow/Agent 工具面存在性；Claude Code——dynamic workflows 可用性（版本 ≥ v2.1.248、全付费计划、Pro 需 /config 开启）与后台子代理默认行为；Codex——档 1/2 均无，探测直接落档 3（`[agents]` 默认启用）；DeepSeek harness——子系统属可选能力、按部署启用，探测须容忍"子系统未启用"而落档 3/4。
3. **FR-3（异步先行评审）逐宿主可行性**：ZCode 与 Claude Code 通知驱动语义直接成立（S1/S4/S5）；**判断**：Codex 的"票 implemented 即先行评审"在宿主原语层不可达——其编排等全部结果汇总，无单代理完成通知（依据 S10 原句）；DeepSeek harness 事件通知齐备但主会话可响应性未核验，需实测。
4. **隔离与改动面互斥的配合**：四宿主均无开箱即用的"多子代理同仓并行写隔离"（Claude Code 子代理可获独立 worktree、Codex 有进程级 `--worktree`，为部分例外）；spec 0012 的改动面互斥纪律在四宿主上仍是合回零冲突的必要前提，run-mechanics 的 worktree 物化（ADR 0003）不依赖宿主原语。
5. **后台与状态回收对"不轮询"约束的影响**：ZCode/Claude Code/DeepSeek harness 有完成通知或事件流；Codex 云任务与 exec 有状态查询（`codex cloud list --json`、JSONL 事件），但那属于进程级/云侧语义，不改变其子代理编排的同步汇总形态。
6. **否掉的方案（判断，供票 0023 参考）**：在 Codex 上用 SDK/App Server 自建编排层替代回退链——可编排线程，但等价于把 dev-execute 编排移出会话内，超出本方法论"运行依赖顺序图会话内计算、不落盘"的边界（need 0010 非目标 ③），且无声明式原语的复用收益。
7. **时效**：ZCode 证据为本机 3.17.1 快照；Claude Code 版本门槛多（v2.1.63 更名、v2.1.277 移除 TaskOutput 等）；Codex 近月仍有子代理相关发布（0.158–0.164，S16）；DeepSeek harness 明示兼容性破坏。票 0023 实现时请复核探测信号（快照意识条款）。

## 来源清单（检索日期均为 2026-10-31）

一手来源（官方文档 / 官方仓库 / 本机代码）：

- **ZCode 本机**：S1 = ZCode 3.17.1 本机会话工具面（Agent/Bash/TaskOutput/CreateWorkflow/AmendWorkflow/GetWorkflowRun/ListWorkflowRuns/ResumeWorkflowRun/FillWorkflowHole/ResolveWorkflowQuestion/SendMessage 等工具描述，本运行即该宿主）；S2 = `/Applications/ZCode.app/Contents/Resources/glm/packages/bundled-skills/skills/dynamic-workflows/SKILL.md`（ZCode 3.17.1 捆绑）
- **ZCode 公开文档**：S3 = docs.z.ai 与 docs.z.ai/llms.txt（全索引核验：无子代理/后台/工作流/沙箱页面）
- **Claude Code**：S4 = code.claude.com/docs/en/sub-agents；S5 = code.claude.com/docs/en/agent-view；S6 = code.claude.com/docs/en/workflows；S7 = code.claude.com/docs/en/agents；S8 = code.claude.com/docs/en/tools；S9 = code.claude.com/docs/en/common-workflows
- **Codex**：S10 = developers.openai.com/codex/agent-configuration/subagents（canonical learn.chatgpt.com/docs/agent-configuration/subagents）；S11 = developers.openai.com/codex/developer-commands；S12 = developers.openai.com/codex/long-running-work；S13 = developers.openai.com/codex/non-interactive-mode；S14 = developers.openai.com/codex/sandboxing；S15 = developers.openai.com/codex/app/worktrees、/codex/environments/cloud-environments、/codex/codex-sdk；S16 = github.com/openai/codex（README、docs/ 索引、GitHub Releases API 近 120 个 release）
- **DeepSeek harness**：S17 = github.com/deepseek-ai/deepseek-harness（README）；S18 = deepseek-harness.github.io/deepseek-harness/reference/subsystems/subagent.md；S19 = 同目录 jobs.md；S20 = 同目录 workflow.md；S21 = 同目录 sandbox.md

二手线索（仅作检索起点，不作为结论依据）：openai/codex 仓库 discussions/issues（#3898、#15250 等）、社区文章与论坛帖若干。
