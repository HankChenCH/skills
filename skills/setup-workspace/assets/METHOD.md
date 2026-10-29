# SDLC 开发方法论

本文档是本仓库开发流程的唯一规则来源，由 setup-workspace 生成与升级。它回答四个问题：按什么流程做事（§2–§3）、工作区里每样东西归谁管（§4）、产物长什么样、状态如何流转（§5–§6）、提交与发布要过哪些门禁（§3、§7）。产物模板内嵌在写产物的技能里，本文只写规则，避免两处漂移。

## 1. 一句话

人机协作的门禁式开发流程：**状态在盘上不在对话里，以落盘产物为接口，能机械检查的绝不靠自觉**。

## 2. 核心原则

1. **能机械检查的绝不只写成指令**。校验逻辑下沉到 `.sdlc/check.sh`，git hook 和技能用同一套判断；技能只保留判断性行为。
2. **状态在盘上，不在对话里**。一切流程状态由产物 frontmatter 表达，会话随时可中断续接。
3. **以落盘产物为接口**。技能之间通过文件衔接，不通过对话记忆。
4. **默认串联、决策必问、门禁即停**。每个流程技能的出口只有三种形态：自动调下一个技能、抛出带默认建议的决策问题、被门禁拦停并指路。
5. **讨论自由、产物收敛**。过程方法论可选，落盘文档格式固定。
6. **盘上主本、tracker 投影**。docs/ 永远是真相源，GitHub/GitLab/云效 Codeup 只是发布目标，单向发布不回读。

## 3. 反绕过与豁免

| 层 | 机制 | 拦住谁 |
|---|---|---|
| L1 常驻指令 | AGENTS.md 哨兵块，任何会话一进仓库就可见 | 忘了调技能的 agent 会话 |
| L2 技能入口 | 每个流程技能开头调 check.sh 校验上游产物，不满足即拒绝并指路 | 想跳步的调用 |
| L3 机械层 | git hooks（commit-msg / pre-push）跑 check.sh | 一切入库提交，含人在终端手敲 |
| L4 可选增强 | 平台 PreToolUse hook（`.sdlc/hooks/l4-guard.sh`）：拦含 `--no-verify` 的命令、无在办工单时的源码编辑 | 明知故犯的绕过 |

- **豁免通道**：typo、纯文档改动走 `[trivial]` 标记，每次豁免留痕于 commit message，dev-retro 审计是否滥用。
- **门禁分级**：commit 时只查轻量项（message 带 `[#NNNN]` 且工单状态合法，或带 `[trivial]`）；push 前才查重项（分支上所有 implemented 工单都有 approved 评审覆盖）。
- **诚实的边界**：`--no-verify` 是 git 的后门，L4 在平台层拦截（仅 ZCode 会话内生效，人在终端手敲仍靠 retro 审计兜底），不假装它不存在。L4 失效安全为放行（fail-open）：门禁自身故障不锁死工作。

## 4. 工作区规范

### 4.1 目录与所有权

```
<repo>/
├── .sdlc/                      # 流程基础设施（机器物）
│   ├── check.sh                # 门禁脚本（仅 setup 可写，重跑可整体覆盖）
│   ├── config.sh               # 本仓库配置（用户所有，setup 绝不覆盖）
│   ├── hooks/                  # 平台层拦截 hook（l4-guard.sh，L4 判定脚本）
│   └── trackers/               # tracker 适配器（local/github/gitlab/codeup.sh，可扩展）
├── docs/                       # 流程产物（人文物）
│   ├── METHOD.md               # 本文档
│   ├── needs/ specs/ designs/ tickets/ reviews/ acceptance/ adr/ research/
│   └── standards/              # 用户自有/团队编码标准（增量导入，可多份）
├── AGENTS.md                   # sdlc 哨兵块（仅 setup 改块内内容）
├── GLOSSARY.md                 # 术语表：流程术语与状态 + 项目术语
├── CODING_STANDARDS.md         # 编码标准索引 + 兜底基线
└── CHANGELOG.md                # 懒创建，仅需要发布流程的项目
```

三条总原则：机器物与人文物分家（`.sdlc/` vs `docs/`）；流程产物按价值是否越过终态分档进版本库——知识档（need、spec、design、adr、research、standards）永久留存，过程档（ticket、review、acceptance）过程中照常进库、验收通过后随蒸馏清扫删除、以 git 历史为归档——归置手段是终态删除而非 gitignore，因此不往 `.gitignore` 加任何东西（审计链是门禁的一部分）；可升级不覆盖（setup 幂等重跑，按所有权表决定覆盖/保留/补缺）。`src/` 或其他源码目录——无论仓库实际布局如何——setup 永不触碰。

**目录懒创建**：setup 只建 `.sdlc/` 与 `docs/`，八个产物目录由第一个产物落盘时创建，不留 `.gitkeep`。

`.git/hooks/commit-msg`、`pre-push` 是 setup 安装的一行转发脚本（指向 `.sdlc/check.sh`），本身不进版本库；换机器克隆后重跑 setup-workspace 即恢复。轻门禁挂 commit-msg 而非 pre-commit：git 在 commit-msg 时点才写入 commit message。L4 的平台侧接线同类：setup 在 ZCode 会话中把 PreToolUse hooks 块合并进 `<repo>/.zcode/config.json`（`enabled: true` 必需，hooks 块归 setup、文件其余内容归用户），不进版本库，判定逻辑全在版本化的 `.sdlc/hooks/l4-guard.sh`。

### 4.2 命名与杂项

- 产物文件名 `NNNN-slug.md`：四位零填充、每类产物独立递增、从 0001 起；slug 一律 ASCII 小写短横线（中文标题放正文 H1，slug 用英文词，无合适英文时用拼音）。
- 正文引用其他产物必须带类型限定（"spec 0003"、"ticket 0007"、"ADR 0002"）；裸编号只允许出现在 frontmatter 字段里。
- commit message 首行带 `[#NNNN]`（多工单 `[#7][#8]`，按四位编号写）；豁免标记 `[trivial]`。
- 日期只记 `created` 和状态变更日（如 `approved`），不搞修订历史——那是 git 的事。
- 分支名不做硬门禁，只约定 `feat/<slug>` / `fix/<slug>`。

### 4.3 明确的"不做"

- 不设 `.scratch/` 草稿区：草稿就是 `status: draft` 的正式产物，杜绝第二真相源。
- 不 gitignore 任何流程产物：归置靠终态删除（验收后蒸馏清扫），不靠过程忽略——评审报告和工单是审计链本身。
- METHOD.md 不放产物模板：模板内嵌在写产物的技能里。
- 门禁只管有真实代价的事：分支名等约定不进 check.sh。

## 5. 产物与状态机

frontmatter 是 check.sh 的解析依据，全流程单一真相。列表字段（`blocked-by`、`tickets`）必须单行书写：`[]` 或 `[0006, 0008]`。

| 产物 | frontmatter 字段 | 状态机（箭头上是推进者） |
|---|---|---|
| need | `id` `status` | draft →confirmed（dev-clarify）→fulfilled（dev-accept，末轮通过且成功标准核销、无未接受风险） |
| spec | `id` `status` `need?` `round` | draft →approved（dev-spec，须用户批准）→done（dev-accept 验收通过，且名下过程档已清扫） |
| design | `id` `spec` `status` | draft →approved（dev-design） |
| ticket | `id` `type: feature\|fix` `spec` `blocked-by: []` `status` | ready（dev-plan）→in-progress / implemented（dev-implement）→done（dev-ship 合并后） |
| review | `id` `tickets: []` `branch` `status` | draft →approved（dev-review，两轴阻断项清零） |
| acceptance | `id` `spec` `round` `status` | draft →passed \| rejected（dev-accept） |
| adr | `id` `status` | accepted →superseded（被新 ADR 取代时） |
| research | `id` | 无状态，纯参考资料 |

各状态的含义与推进者详见 GLOSSARY.md 的"流程术语与状态"章。

**FR-N 追溯链**：need 里系统需求编号 FR-1、FR-2…；spec 验收场景必须标注覆盖哪个 FR（`[FR-N | 工单级]` 映射进工单，`[FR-N | 集成级]` 留给集成后验证）；任何 FR 没有被验收场景覆盖，`check.sh validate` 报孤儿。工单依赖图必须无环，`validate` 全库检查。

## 6. 流程拓扑

**脊柱**（单次变更的门禁流水线）：问题定义（clarify）→ 调研（research）→ 设计（spec / design / prototype）→ 规划（plan）→ 实现与质量（implement / review）→ 交付（ship / release）→ 反馈沉淀（fix / retro / docs）。

**V 模型右臂**（集成验证）：每个分解层有对应验证——need 对业务成功标准（dev-accept 核销）、spec 对集成级场景、design 对 seam 边界测试、ticket 对单元/接口测试。结构性预防靠 dev-plan 的 tracer-bullet 垂直切片（每票切穿全部层），dev-accept 是第二道保险。

**循环模型**（MVP 分轮）：need 模板固定含"假设与风险"节，按"错了代价 × 不确定度"排序；spec 带 `round: N`，round 1 覆盖风险最大的最小范围；dev-accept 的验收报告含"假设验证 / 残余风险 / 下一轮建议"，其出口即回转点。退出条件机械化：need 终态 `fulfilled`，由 dev-accept 在"成功标准全部核销 + 无未接受风险"时推进。

## 7. check.sh 子命令参考

| 子命令 | 干什么 | 被谁调用 |
|---|---|---|
| `phase` | 扫全部产物 frontmatter，输出全库状态总览（含轮次） | /sdlc、人 |
| `frontier` | 列出阻塞已清、可开工的工单 | dev-implement 入口 |
| `ticket NNNN` | 入口校验：工单 ready（或 in-progress 重入）、阻塞已清、spec approved | dev-implement 入口 |
| `all` | 全量 lint / typecheck / test（按 config.sh，经 RUN_PREFIX 包裹）；未定义任何检查命令时响亮警告并视为发现（不静默跳过） | dev-implement 出口、dev-ship、dev-accept |
| `validate <file>` | 模板完整性：必填节、frontmatter、id 与文件名、FR 追溯（孤儿报错）、依赖无环、done spec 名下过程档残留扫描（未清扫即报错并逐个列出文件） | 各产物技能的出口门禁 |
| `commit-msg` | 轻门禁：message 带 `[#NNNN]` 且工单 in-progress/implemented，或带 `[trivial]`；Merge/Revert 信息头机械放行（合并/回退无工单可挂）（挂 git commit-msg hook） | git hook |
| `pre-push` | 重门禁：分支上所有 implemented 工单都被某张 approved 评审覆盖 | git hook |
| `publish <file>` | 按 TRACKER 调用 `.sdlc/trackers/<TRACKER>.sh` 发布产物；适配器未安装或投影失败（CLI 缺失/未认证/API 报错）时明确警告并跳过，不阻断 | 各技能落盘后 |

## 8. config.sh 字段参考

```sh
TRACKER=local        # local | github | gitlab | codeup（可扩展：新增 .sdlc/trackers/xxx.sh）
TRACKER_REPO=""      # github: owner/repo；gitlab: group/project；codeup: 组织/仓库标识
BASE_REF=main        # pre-push 计算 merge-base 的基准分支
RUN_ENV=local        # local | docker
RUN_PREFIX=""        # 例：docker "docker compose run --rm app"；版本管理 "mise exec --"
PKG_MGR=""           # npm | pnpm | yarn | pip | poetry | uv | cargo | go | maven …
CODE_DIRS=""         # 源码目录，空格分隔（L4 hook 规则 B 作用域；留空则该规则不生效；docs/ 与 .sdlc/ 永不列入）
CHECK_LINT=""        # 例：npm run lint
CHECK_TYPE=""        # 例：npm run typecheck
CHECK_TEST=""        # 例：npm run test
```

setup 按项目类型探测预填，留空的项跳过；此文件归用户所有，重跑 setup 绝不覆盖。
