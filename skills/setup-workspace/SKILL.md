---
name: setup-workspace
description: 交互式初始化或升级本仓库的 SDLC 开发流程工作区——识别当前智能体并按接入参考适配，区分单仓库/monorepo/多仓工作区形态扫描，生成 .sdlc/check.sh 门禁脚本、config.sh（含运行环境探测）、tracker 适配器、docs/METHOD.md、GLOSSARY.md 流程术语与状态、CODING_STANDARDS.md 索引，最后写 AGENTS.md 哨兵块与 git hooks；幂等可重跑，按所有权表决定覆盖或补缺，永不触碰源码与用户文件。当用户要求初始化工作区、接入开发流程、安装 sdlc 门禁、setup workspace 时使用——根目录非 git 仓库且第一层也无 git 仓库、或要求改动规范之外的东西时会拒绝。
---

# setup-workspace：初始化/升级工作区

你只做一件事：把这个 **git 仓库**、或第一层平铺着 **git 仓库的多仓工作区根**，变成
**接入 SDLC 流程的工作区**，并把接入方式适配到**当前正在运行的智能体**。
不在 git 仓库内、第一层也没有 git 仓库、或要求改动工作区规范之外的东西，一律拒绝。
拒绝不是失礼，是本技能的职责。

**按需加载**：进入每个阶段前才 Read 对应 references/ 文件，一次只载一个；
assets/ 是逐字拷贝进目标仓库的模板，不得凭记忆手写替代。

## 0. 前置校验

- 形态判定三分支（以当前工作目录为根）：
  1. `git rev-parse --show-toplevel` 成功 → 单仓 / monorepo 现行流程，按 §1 继续。
  2. 失败但根下第一层存在 ≥1 个 git 仓库 → 进入**多仓工作区模式**（scan-signals §1
     第三形态）：根为工作区仓库根，第一层 git 仓库为成员子仓库候选；第一层扫描信号
     （跳过点目录）按 references/scan-signals.md §1 执行，非成员目录零接触。§1–§5
     照常推进，模式差异：§1 增重跑 diff（升级/复原）；§2 增决策 4（成员入册确认）；§3 增多仓生成行（git init 根、
     成员清单、.gitignore 标记段）；§5 报告增多仓行。
  3. 失败且第一层无任何 git 仓库 → 停止："这里不是 git 仓库，SDLC 工作区只初始化
     在 git 仓库内。"拒绝路径**零写入**：不创建、不修改任何文件。
- 校验 assets/ 与 references/ 完整（check.sh、METHOD.md、GLOSSARY.md、
  trackers/、hooks/、standards/、scan-signals.md、decisions.md、generation.md、
  tracker-platforms.md、agent-adapters/）；缺失 → 停止报告安装损坏。
- 识别智能体（信号与差异见 references/agent-adapters/）：命中 → 加载对应参考
  全程应用；未命中 → 通用流程（AGENTS.md 是跨智能体契约，无需特例）。

## 1. 扫描仓库（只读；先扫后问）

Read references/scan-signals.md，按其信号表扫出：仓库类型（单仓/monorepo；
多仓工作区模式下改扫第一层成员候选，见 scan-signals §1 第三形态）、
语言与框架、检查命令（monorepo 优先聚合命令）、环境已述项（运行环境/版本管理/
包管理器）、已有接入物（.sdlc/check.sh、AGENTS.md、GLOSSARY.md、
CODING_STANDARDS.md、docs/standards/）。存在 .sdlc/check.sh → 升级模式：
全程按 §3 所有权表执行，逐项报告"覆盖/保留/补缺"。

多仓工作区模式升级/重跑增 diff 步：扫描第一层并与 `.sdlc/members.list` 求差——新增
git 仓库列为候选，按 §2 决策 4 确认入册后补装门禁与哨兵（与初始成员完全一致）；清单内
成员目录消失或不再是 git 仓库 → 报告异常条目，经确认才移出，未确认前清单一字不动；
既有成员幂等重装。复原（新环境 clone 工作区仓库与成员后重跑）：清单命中成员视为已确认，
零重复询问。

## 2. 决策点（必须问，带默认建议；扫描已答的只复述不重问）

凭据验证、MCP 引导、字段映射、导入流程等细则见 references/decisions.md。

1. **产物与 issue 出口**：local（默认）/ GitHub / GitLab / 云效 Codeup。GitHub 验 gh；
   GitLab 验 glab；Codeup 引导添加 MCP。不通过 → 明确告知后回落 local，不静默降级。
2. **执行环境缺口**：每语言三问（跑在哪/版本管理/包管理器），仓库已述的直接复述；
   结果写 config.sh 的 RUN_ENV / RUN_PREFIX / PKG_MGR / CODE_DIRS。
3. **编码标准来源**（内置 starter 只是兜底）：自有/团队标准（本地路径或 URL，
   可多个）→ 增量导入 docs/standards/，CODING_STANDARDS.md 写成"索引+兜底"；
   没有 → starter 兜底（默认）；可两者都要；可跳过留待 dev-review 首评再补。
4. **成员入册确认（仅多仓工作区模式）**：一次列出全部候选（目录名 + 单仓 /
   monorepo 分类）并给默认建议（全部入册），用户只点名排除项；非成员目录零接触。
   问法与规则见 references/decisions.md 决策 4。

## 3. 生成与升级（每步报告"覆盖/保留/补缺"；确切写法见 references/generation.md）

| 目标 | 行为 |
|---|---|
| 根目录 git init（仅多仓工作区模式） | `git init -b main` 把根立为工作区仓库，再按本表落装；细则见 references/generation.md「多仓工作区模式」 |
| `.sdlc/check.sh` | 拷贝 assets/check.sh，chmod +x；可整体覆盖 |
| `.sdlc/hooks/l4-guard.sh` | 拷贝 assets/hooks/l4-guard.sh，chmod +x；可整体覆盖；命中 ZCode 适配器时另按适配器参考合并 `.zcode/config.json` hooks 块（L4 接线） |
| `.sdlc/trackers/` | 写 local.sh；决策 1 非 local 时加装所选适配器（github/gitlab/codeup）；用户自定义适配器不删 |
| `.sdlc/config.sh` | 仅缺失时按扫描与决策预填；**绝不覆盖** |
| `docs/METHOD.md` | 拷贝 assets/METHOD.md；可整体覆盖 |
| `docs/standards/` | 决策 3 导入的标准文件；同名不覆盖 |
| `CODING_STANDARDS.md` | 首建"索引+兜底"；已有内容不动 |
| `GLOSSARY.md` | 首建种入"流程术语与状态"章；已有只补该章，项目术语不动 |
| `.git/hooks/commit-msg`、`pre-push` | 一行转发，幂等重装；外来 hook **不覆盖**，报告并给手动合并方案 |
| 成员 `.git/hooks/commit-msg`（仅多仓工作区模式） | 一行转发到工作区仓库 check.sh commit-msg，先取消息文件绝对路径、cd 锚定工作区仓库根再 exec；**不装 pre-push**；外来 hook 处置同根（写法与理由见 references/generation.md「多仓工作区模式」） |
| 成员 AGENTS.md 哨兵块（仅多仓工作区模式） | 每个入册成员子仓库落成员版哨兵块（成员身份、工作区根指引、流程操作回根+代码照常），随 §4 三态收口；固定文本见 references/generation.md「AGENTS.md 收口」节成员小节 |
| docs/ 八个产物目录 | 懒创建，本技能不建、不留 .gitkeep |
| `.sdlc/members.list`（仅多仓工作区模式） | 按决策 4 确认结果逐行落成员目录名；setup 所有权，重跑整体重写 |
| 根 `.gitignore` 成员标记段（仅多仓工作区模式） | 带标记段幂等登记成员目录，防误收编；用户自有行一字不动；写法见 references/generation.md「多仓工作区模式」 |
| 源码与一切其他文件 | **永不触碰** |

## 4. AGENTS.md 收口（最后一步，其余全部落定后再写）

不存在 → 连带创建；无标记 → 文末追加块；有标记 → 只替换标记之间内容。
哨兵块措辞与智能体额外动作（如 CLAUDE.md 加 `@AGENTS.md` 转发行）以
references/generation.md 与 references/agent-adapters/ 为准。
多仓工作区模式：对每个入册成员子仓库照同三态落成员版哨兵块（成员身份、工作区根指引、
流程操作回根+代码照常），成员内不落根版流程块；固定文本见 references/generation.md
「AGENTS.md 收口」节成员小节。

## 5. 自检与收尾

运行 `.sdlc/check.sh phase` 与 `frontier`，必须正常输出（空库提示"暂无产物"）。
按 references/generation.md 的四段模板出收尾报告：做了什么（覆盖/保留决策、
智能体与仓库类型）/ 探测画像 / config 待补项 / 建议跑 /sdlc。
出口形态 = 报告 + 指路，无下游自动串联。

## 禁止事项（任何时候）

- 触碰源码与一切用户文件；往 .gitignore 加任何流程产物（唯一例外：多仓工作区模式的成员登记标记段，见 references/generation.md「多仓工作区模式」）。
- 覆盖 config.sh、自定义 tracker、外来 hooks、docs/standards/ 同名文件、GLOSSARY 项目术语。
- 凭据/MCP 验证失败时静默降级。
- 在仓库之外写入任何文件；初始化后顺手建产物目录或示例产物。
- 凭记忆手写哨兵块、配置或检查脚本——一律以 assets/ 模板为准。
