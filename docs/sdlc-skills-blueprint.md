<!--
归档自 ZCode 会话 session_6cc2291bc6f073faba0bf8480ad2c62c（2026-10-25），
原路径 ~/.zcode/workspace/draft-11e07271-3766-4280-8b08-91cef365f421/sdlc-skills-blueprint.md，
2026-10-26 归档入本项目。自 v1.1 起进入修订期，治理规则（先改本文档再改技能）
继续适用；历次修订记录见下方版本行。
-->

# SDLC 技能集设计蓝图

> 版本 1.4 · 2026-10-27（初版 1.0 · 2026-10-25）· 本文档是这套技能集的唯一设计真相源。
>
> **v1.1 修订记录（setup-workspace 实现前定稿）**：§5.2 新增 docs/standards/，升级 GLOSSARY.md 与 CODING_STANDARDS.md 语义；§5.3 哨兵块文本更新（去 src/ 假定，增 GLOSSARY 与标准索引引用）；§5.4 ticket 允许 in-progress 重入、all 增加零检查命令行为与 RUN_PREFIX 包裹、publish 适配器缺失行为；§5.5 config.sh 新增 BASE_REF / RUN_ENV / RUN_PREFIX / PKG_MGR / CODE_DIRS；§6.1 增列表字段单行注记；§11.1 setup-workspace 规格全面细化（智能体识别、单仓/monorepo、环境探测、标准导入、按需加载）；§13.1 附件分 assets/ 与 references/ 两类；§14 starters 定稿落点与新增待定项。实现期间补记：轻门禁由 pre-commit 修正为 **commit-msg** hook（git 时点事实：pre-commit 阶段消息未写入，机械校验无从执行）。
>
> **v1.2 修订记录（spec 0001，2026-10-27）**：tracker 出口枚举全面增加 GitLab（§5.2/§5.5/§11.1/§14；选 GitLab 验 `glab auth status`，失败明确回落 local，适配器仍属批 3）；参考技能 4→5，新增 ref-git-commit——规范提交与合并信息（§7/§7.1/§7.2/§10.1/§10.2；dev-implement 开工装载、dev-ship 装载）。三平台 issue/PR 模型调研落盘 docs/research/0001，作批 3 tracker 适配器实现参考。
>
> **v1.3 修订记录（sdlc 实现，2026-10-27）**：§11.2 sdlc 总控规格操作化——默认模式报告固定结构（当前阶段/可做的事/被挡在哪/循环状态）；next 模式新增路由表（落技能 `references/next-mode.md`）、断链处理（目标技能未安装时报告并指路，禁止越权代劳）、多张可开工工单须问询（带默认建议）；新增**上下文 token 水位线**（`references/context-watermark.md`）：每次调用目标技能前评估会话上下文 token 用量占窗口百分比——绿 <30% 正常推进、黄 30%–50% 只推进单阶段且出口不自动串联、红 ≥50% 停止推进并建议新会话从盘上续接；拿不准按更高档执行，水位收窄的是推进距离，不是决策纪律。
>
> **v1.4 修订记录（ref-testing 实现，2026-10-27，spec 0003）**：ref-testing 规格化——测试细则从"红绿循环 + 集成两层"扩为六类测试参考（red-green 红绿循环 / table-driven 表格驱动 / integration 集成 / e2e / stress-capacity 压力与容量 / chaos 混沌），采用 SKILL.md（通则 + 场景路由）+ references/（六类细则）两级结构（§7.1/§7.2/§11.3）；通则新增"可重复确定"；§7.2 明确"固定时机装载技能本体、场景内按需加载细则"。
>
> **用法**：在新会话中实现某个技能时，将本文档（至少 §2–§8 通用规范、目标技能的规格节、§12 文风基准）作为输入提供给 AI。实现过程中发现设计缺陷：**先改本文档，再改技能**，保证文档与实物不漂移。

## 1. 背景与目标

- **目标**：一套完全自有的、贯穿软件开发生命周期的技能集，供"个人 + AI 协作开发"使用。
- **核心痛点**：现有技能（Matt Pocock 套件）是指令式的，写了规矩但没有检查，容易被绕过。本套件的第一设计目标是**门禁不可绕**。
- **已拍板的三个决策**：① 完全自建，不包装现有技能；② 场景为人机协作（非团队流程）；③ 规范强度为门禁式（每阶段有检查清单，不过门不进下一阶段）。
- 规范放文档（docs/METHOD.md），项目 AGENTS.md 只做引用；一个 setup-workspace 技能负责初始化工作区。
- 流程拓扑 = **脊柱**（单次变更的门禁流水线）+ **V 模型右臂**（集成验收）+ **前端循环**（MVP 分轮迭代）。

## 2. 核心设计原则

1. **能机械检查的绝不只写成指令**。校验逻辑下沉到 `.sdlc/check.sh`，git hook 和技能用同一套判断；技能只保留判断性行为（怎么做、拒绝时怎么指路）。
2. **状态在盘上，不在对话里**。一切流程状态由产物 frontmatter 表达，会话可随时中断续接。
3. **以落盘产物为接口**。技能之间通过文件衔接，不通过对话记忆。
4. **默认串联、决策必问、门禁即停**（详见 §8）。
5. **讨论自由、产物收敛**。过程方法论可选（§9），输出文档格式固定（§6）。
6. **三层分工**：技能=行为，参考=标准（什么是好），脚本=判断逻辑。
7. **盘上主本、tracker 投影**。docs/ 永远是真相源，GitHub/云效 Codeup 只是发布目标，单向发布不回读。

## 3. 反绕过：四层防御

| 层 | 机制 | 拦住谁 |
|---|---|---|
| L1 常驻指令 | AGENTS.md 哨兵块（§5.3），任何会话一进仓库就可见 | 忘了调技能的 agent 会话 |
| L2 技能入口 | 每个流程技能开头调 check.sh 校验上游产物，不满足即拒绝并指路 | 想跳步的调用 |
| L3 机械层 | git hooks（commit-msg / pre-push）跑 check.sh | 一切入库提交，含人在终端手敲 |
| L4 可选增强 | ZCode PreToolUse hook：拦截含 `--no-verify` 的命令、无工单时的 src/ 编辑 | 明知故犯的绕过（批 3） |

配套设计：

- **豁免通道**：typo、纯文档改动走 `[trivial]` 标记豁免，每次豁免留痕（commit message），dev-retro 审计豁免是否被滥用。
- **门禁分级**：commit 时只查轻量项（message 带 `[#NNNN]` 且工单状态合法，或带 `[trivial]`）；merge/push 前才查重项（分支上所有 implemented 工单都有 approved 评审）。
- **诚实的边界**：`--no-verify` 后门由 L4 封堵，靠 retro 审计兜底。

## 4. 流程拓扑

### 4.1 脊柱：七阶段

问题定义（clarify）→ 调研（research）→ 设计（spec / design / prototype）→ 规划（plan）→ 实现与质量（implement / review）→ 交付（ship / release）→ 反馈沉淀（fix / retro / docs）。

### 4.2 V 模型：右臂补集成验证

| V 左臂（分解） | V 右臂（验证） | 载体 |
|---|---|---|
| need 业务需求 | 业务成功标准核销 | dev-accept 验收报告 |
| spec 功能规格 | 跨工单集成场景 | spec 验收场景 → dev-accept |
| design 技术方案 | seam / 模块边界测试 | design 定义 seam，implement 遵守 |
| ticket 工单 | 单元 / 接口测试 | dev-implement 红绿循环 |

- **FR-N 需求编号贯穿全程**：need 里系统需求编号 FR-1、FR-2…；spec 验收场景必须标注覆盖哪个 FR；dev-accept 逐条核销。任何 FR 没有被验收场景覆盖，`check.sh validate` 报孤儿。
- **spec 固定含"验收场景"节**，每条带验证层级：`[FR-N | 工单级]`（dev-plan 时映射进具体工单）或 `[FR-N | 集成级]`（拆不进单票、必须集成后验证的场景——dev-accept 的运行清单）。集成风险在规划时显式化。
- **工单生命周期归 dev-ship，spec 生命周期归 dev-accept**：ship 只推 ticket → done；spec → done 由 accept 验收通过后推进。
- 结构性预防保留：dev-plan 的 tracer-bullet 垂直切片（每票切穿全部层）本身防集成病，dev-accept 是第二道保险。

### 4.3 循环模型：MVP 分轮

- need 模板固定含**"假设与风险"**节：模糊需求变成显式假设清单，按"错了代价 × 不确定度"排序。
- spec frontmatter 带 `round: N`：同一 need 可有多张 spec，round 1 覆盖风险最大的最小范围（MVP）。分轮决策在 dev-spec 与用户一起做，依据是风险表。
- dev-accept 的出口即回转点：验收报告固定含"假设验证结果 / 残余风险 / 下一轮建议"。
- **退出条件机械化**：need 终态 `fulfilled`，由 dev-accept 在"成功标准全部核销 + 无未接受风险"时推进。`/sdlc` 总览显示循环状态（如"need 0003：round 1 已验收，2 条残余风险 → 建议开 round 2"）。

## 5. 工作区规范（占用文件与目录）

### 5.1 三条总原则

1. **机器物与人文物分家**：`.sdlc/` 放流程基础设施，`docs/` 放流程产物，互不越界。
2. **一切流程产物进版本库**：不往 `.gitignore` 加任何东西——审计链的完整性是门禁体系的一部分。
3. **可升级、不覆盖**：setup-workspace 幂等重跑；"整体覆盖"还是"只补缺失"按 §5.2 所有权表严格执行。

### 5.2 目录总览与所有权

```
<repo>/
├── .sdlc/                      # 流程基础设施
│   ├── check.sh                # 门禁脚本（子命令见 5.4）
│   ├── config.sh               # 本仓库配置（tracker、检查命令）
│   └── trackers/               # tracker 适配器（local/github/gitlab/codeup.sh，可扩展）
├── docs/
│   ├── METHOD.md               # 方法论全文（setup 生成与升级）
│   ├── needs/                  # 需求纪要     NNNN-slug.md
│   ├── research/               # 调研报告     NNNN-slug.md
│   ├── specs/                  # 规格         NNNN-slug.md
│   ├── designs/                # 技术方案     NNNN-slug.md
│   ├── tickets/                # 工单（feature 与 fix 同池编号）
│   ├── reviews/                # 评审报告     NNNN-slug.md
│   ├── acceptance/             # 验收报告     NNNN-slug.md
│   ├── standards/              # 用户自有/团队编码标准（setup 增量导入，可多份）
│   └── adr/                    # 架构决策记录 NNNN-slug.md
├── AGENTS.md                   # 追加 sdlc 哨兵块
├── GLOSSARY.md                 # 术语表：setup 首建"流程术语与状态"章，项目术语持续增长
├── CODING_STANDARDS.md         # 编码标准索引 + 兜底基线（索引指向 docs/standards/）
└── CHANGELOG.md                # 懒创建，仅需要发布流程的项目
```

`.git/hooks/commit-msg`、`pre-push`：setup 安装的一行转发脚本（`.sdlc/check.sh commit-msg` 等），不进版本库；换机器克隆后重跑 `/setup-workspace` 即恢复。轻门禁挂 commit-msg 而非 pre-commit——git 在 commit-msg 时点才写入 commit message，pre-commit 时消息尚不存在，机械校验无从谈起。

**目录懒创建**：setup 只建 `.sdlc/` 和 `docs/`，其余产物目录由第一个产物落盘时创建，不留 `.gitkeep`。

| 路径 | 首次创建 | 日常写入者 | setup-workspace 重跑时 |
|---|---|---|---|
| `.sdlc/check.sh` | setup | 仅 setup | **可整体覆盖**（纯逻辑） |
| `.sdlc/trackers/*` | setup | 仅 setup | 可整体覆盖；已有自定义适配器不删 |
| `.sdlc/config.sh` | setup | **用户** | 仅缺失时生成模板，**绝不覆盖** |
| `docs/METHOD.md` | setup | 仅 setup | 可整体覆盖 |
| AGENTS.md 的 sdlc 块 | setup | 仅 setup | 只替换哨兵标记之间的内容 |
| GLOSSARY.md | setup（首建"流程术语与状态"章） | 对应技能与用户（项目术语） | 只补流程章，项目术语不动 |
| CODING_STANDARDS.md | setup（索引 + 兜底基线） | 用户与 dev-review | 已有内容不动 |
| docs/standards/* | setup 导入（§11.1 决策 3：标准来源） | 用户 | 同名文件不覆盖，只增不删 |
| CHANGELOG.md | 首个产物时 | 对应技能与用户 | 只补缺失骨架 |
| `docs/` 八个产物目录 | 首个产物时 | 对应技能 | 不触碰已有文件 |
| `.git/hooks/*` | setup | — | 幂等重装 |
| `src/` 及一切其他文件 | — | — | **永不触碰** |

### 5.3 AGENTS.md 哨兵块（L1 常驻指令）

```markdown
<!-- sdlc:begin 由 setup-workspace 管理，勿在此块内手改 -->
## 开发流程（强制，不可协商）
完整规则见 docs/METHOD.md，术语与状态定义见 GLOSSARY.md。
- 改动源码前必须存在 status: approved 的 spec 与对应工单；小修走 [trivial] 豁免（retro 审计）。
- 提交必须通过 .sdlc/check.sh；禁止 --no-verify。
- 评审标准轴依据 CODING_STANDARDS.md 及其索引的 docs/standards/ 文件。
- 不确定当前阶段就运行 /sdlc，不要凭记忆推进。
<!-- sdlc:end -->
```

块外永远是用户的；AGENTS.md 不存在时创建。

### 5.4 check.sh 子命令（8 个）

| 子命令 | 干什么 | 被谁调用 |
|---|---|---|
| `phase` | 扫全部产物 frontmatter，输出全库状态总览（含轮次与风险状态） | /sdlc、人 |
| `frontier` | 列出阻塞已清、可开工的工单 | dev-implement 入口 |
| `ticket NNNN` | 入口校验：工单 ready（或 in-progress 重入续接）、阻塞已清、spec approved | dev-implement 入口 |
| `all` | 全量 lint / typecheck / test（按 config.sh，经 `RUN_PREFIX` 包裹执行以适配 docker / 版本管理器）；仓库没定义任何检查命令时输出响亮警告并视为发现（exit 0），不静默跳过 | dev-implement 出口、dev-ship、dev-accept |
| `validate <file>` | 模板完整性校验：必填节齐全、frontmatter 合法、FR 编号规范、验收场景可追溯（无孤儿 FR）、工单依赖无环 | 各产物技能的出口门禁 |
| `commit-msg` | 轻门禁：message 带 `[#NNNN]` 且工单状态合法（in-progress/implemented），或带 `[trivial]`；挂载于 git commit-msg hook | git hook |
| `pre-push` | 重门禁：分支上所有 implemented 工单都被某张 approved 评审覆盖（review 的 `tickets: []` 声明覆盖面） | git hook |
| `publish <file>` | 按 config.sh 的 TRACKER 把产物发布/镜像到对应平台；适配器未实现（批 3 的 github/gitlab/codeup）时明确警告并跳过（exit 0），不阻断技能出口链 | 各技能落盘后 |

### 5.5 config.sh

setup 时按项目类型探测预填，留空的项跳过；用户可改，重跑 setup 绝不覆盖：

```sh
# 流程配置
TRACKER=local        # local | github | gitlab | codeup（可扩展：新增 .sdlc/trackers/xxx.sh 即可）
TRACKER_REPO=""      # github: owner/repo；gitlab: group/project；codeup: 组织/仓库标识
BASE_REF=main        # pre-push 计算 merge-base 的基准分支

# 运行环境（setup 探测预填；all 的检查命令经 RUN_PREFIX 包裹执行）
RUN_ENV=local        # local | docker
RUN_PREFIX=""        # 例：docker "docker compose run --rm app"；版本管理 "mise exec --"
PKG_MGR=""           # npm | pnpm | yarn | pip | poetry | uv | cargo | go | maven …
CODE_DIRS=""         # 源码目录探测结果（批 3 L4 hook 消费），按仓库实际布局填，不做 src/ 假定

# 检查命令（包装仓库自己的命令）
CHECK_LINT="npm run lint"
CHECK_TYPE="npm run typecheck"
CHECK_TEST="npm run test"
```

**盘上主本、tracker 投影**：check.sh 的门禁读的是产物 frontmatter，所以 docs/ 永远是真相源；tracker 只是发布目标，单向发布不回读。

### 5.6 命名与杂项规则

- 产物文件名 `NNNN-slug.md`：四位零填充、每类产物独立递增、从 0001 起；slug 一律 ASCII 小写短横线（中文标题放正文 H1，slug 用英文词，无合适英文时用拼音）。
- 正文引用其他产物必须带类型限定（"spec 0003"、"ticket 0007"、"ADR 0002"）；裸编号只允许出现在 frontmatter 字段里。
- commit message 首行带 `[#NNNN]`（多工单 `[#7][#8]` 格式，按四位编号写）；豁免标记 `[trivial]`。
- 日期只记 `created` 和状态变更日（如 `approved`），不搞修订历史——那是 git 的事。
- 分支名不做硬门禁，只约定 `feat/<slug>` / `fix/<slug>`。

### 5.7 明确的"不做"

- 不设 `.scratch/` 草稿区：草稿就是 `status: draft` 的正式产物，杜绝第二真相源。
- 不 gitignore 任何流程产物：评审报告和工单是审计链本身。
- METHOD.md 不放产物模板：模板内嵌在写产物的技能里（执行者持有模板），METHOD.md 只写规则、状态机、目录规范，避免两处模板漂移。
- 门禁只管有真实代价的事：分支名等约定不进 check.sh。

## 6. 产物规范（固定格式）

### 6.1 frontmatter 与状态机总表（check.sh 解析依据，全流程单一真相）

| 产物 | frontmatter 字段 | 状态机（箭头上是推进者） |
|---|---|---|
| need | `id` `status` | draft →confirmed（dev-clarify）→fulfilled（dev-accept，末轮通过且成功标准核销、无未接受风险） |
| spec | `id` `status` `need?` `round` | draft →approved（dev-spec，须用户批准）→done（dev-accept 验收通过） |
| design | `id` `spec` `status` | draft →approved（dev-design） |
| ticket | `id` `type: feature\|fix` `spec` `blocked-by: []` `status` | ready（dev-plan）→in-progress / implemented（dev-implement）→done（dev-ship 合并后） |
| review | `id` `tickets: []` `branch` `status` | draft →approved（dev-review，两轴阻断项清零） |
| acceptance | `id` `spec` `round` `status` | draft →passed \| rejected（dev-accept） |
| adr | `id` `status` | accepted →superseded（被新 ADR 取代时） |
| research | `id` | 无状态，纯参考资料 |

> 列表字段（`blocked-by`、`tickets`）必须单行书写：`[]` 或 `[0006, 0008]`；多行列表不予解析，`validate` 报错。

### 6.2 need 模板（固定；方法论不同，落盘同构）

```markdown
---
id: 0003
status: draft
created: <date>
---
# <标题>

## 背景与业务目标          ← 业务需求层
## 干系人与用户            ← 用户需求层：谁、要完成什么、成功标准
## 系统能力需求            ← 系统需求层：FR-1、FR-2…
## 场景                    ← 用例走查落这里（Given/When/Then）
## 假设与风险              ← 循环模型的分轮依据，按代价×不确定度排序
## 范围与非目标
## 开放问题                ← 清零才准进 dev-spec（出口门禁）
```

### 6.3 spec 模板（固定）

```markdown
---
id: 0001
status: draft
need: 0003          # 可选
round: 1
created: <date>
---
# <标题>

## 问题陈述             ← 用户视角的问题
## 方案                 ← 用户视角的解决方案
## 用户故事             ← 编号长列表："作为<角色>，我想要<功能>，以便<收益>"
## 实现决策             ← 模块/接口/schema/API 契约；不含具体文件路径与代码。
                         原型产出的关键片段（状态机、schema、类型形状）可内嵌并注明来源
## 测试决策             ← seam 清单；既有同类测试作为先例
## 验收场景
- [FR-1 | 工单级] Given … When … Then …
- [FR-3 | 集成级] Given … When … Then …   ← dev-accept 的运行清单
## 非目标
## 备注
```

### 6.4 ticket 模板（固定；dev-plan 产出、dev-implement 增补）

```markdown
---
id: 0007
type: feature
spec: 0001
status: ready
blocked-by: []
created: <date>
---
# 0007: <标题>

**做什么：** 端到端行为（用户视角），非分层实现清单

**验收标准：**
- [ ] <可验证的条目，勾选时须有证据（哪个测试/什么输出）>

**Blocked by：** 无 | 编号列表

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
```

### 6.5 review / acceptance 模板要点

- review：frontmatter 见 6.1；正文固定 `## 标准轴 findings`、`## Spec 轴 findings`（每条：文件:行 + 怎么改 + 为什么 + 阻断/建议分级）、`## 汇总`（各轴阻断数）。双轴独立报告，不合并重排。
- acceptance：正文固定 `## 场景结果`（逐条：场景/FR/证据/结论）、`## 假设验证`、`## 残余风险`、`## 下一轮建议`。

### 6.6 文档一致性的三道机械保证

① 模板内嵌在技能里，每次生成同构；② `check.sh validate` 校验必填节、编号规范、FR 追溯；③ FR-N 追溯链把 need/spec/acceptance 互相锁死。不靠 AI 自觉。

## 7. 三层技能架构与参考层（ref-*）

```
L3 流程技能 dev-*（15 个）：驱动生命周期、持门禁、自动串联；用户与模型均可调用
L2 参考技能 ref-*（5 个）：定义"什么是好"；由流程技能在指定时机用 Skill 工具加载
L1 基础设施：check.sh + trackers/ + config.sh + METHOD.md + AGENTS.md 块
```

### 7.1 五个参考技能的内容要点

- **ref-writing（编写人类可理解文档）**：平实具体、例子优先、一段一个观点；术语一律来自 GLOSSARY 且首次出现给定义；禁用空洞抽象词（"提升效率""优化体验"），写成可验证的陈述；给数字、给命令、给文件名。
- **ref-implementation（什么是好的实现）**：代码读起来像叙事；命名表意；模块深（接口窄、做的事多）；错误处理显式；边界情况被处理而不是被注释；无投机泛化；diff 最小化——只改工单要求的。
- **ref-testing（什么是好的测试）**：通则——只测外部行为不测实现；期望值来自独立来源（已知字面量、算例、spec），禁止用与实现相同的逻辑算出；只在预定 seam 上测；一个测试一个行为；测试名即规格；失败信息能直接定位；可重复确定（不依赖执行顺序、真实时间与外部服务，随机须固定种子）。含反模式清单：实现耦合、同义反复、横向切片。细则按六类测试拆 references/（red-green 红绿循环、table-driven 表格驱动、integration 集成、e2e、stress-capacity 压力与容量、chaos 混沌），进入具体场景按 SKILL.md 路由表按需读取、一次只载一个（§11.3）。
- **ref-review（什么是好的评审行为）**：只评 diff 范围内的事；每条 finding 可执行（文件:行 + 怎么改 + 为什么）；分级"阻断 / 建议"；区分"违反标准"与"个人品味"，后者不阻断；双轴独立不互相稀释；内置 Fowler 代码坏味道基线清单（每条：是什么 → 怎么修），repo 已文档化的标准优先于基线，工具已强制的跳过。
- **ref-git-commit（规范的提交与合并信息）**：一次提交只做一件事（一个验收标准或一次红绿循环）；首行 `[#NNNN]`（豁免 `[trivial]`）+ 祈使句行为摘要，不报文件清单；正文写 diff 看不出来的"为什么"与证据；合并信息随合并方式收敛（merge commit 讲合入什么，squash 按首行规范重写，ff 历史即提交本身）；PR/MR 描述里的工单引用语法随平台，平台编号 ≠ 盘上工单编号（`Closes #N` 吃平台编号），三平台语法见 docs/research/0001。

### 7.2 引用矩阵（越靠近实现层，reference 越密）

| 流程技能 | 加载哪个参考 | 时机 |
|---|---|---|
| dev-clarify / dev-spec / dev-research / dev-docs | ref-writing | 落盘前 |
| dev-implement | ref-implementation + ref-testing + ref-git-commit | 开工装载；写测试前重读 ref-testing |
| dev-review | ref-review + ref-implementation | 评审前 |
| dev-ship | ref-git-commit | PR 描述与合并信息落盘前 |
| dev-fix | ref-testing | 先写失败测试之前 |
| dev-accept / dev-retro | ref-writing | 报告落盘前 |

dev-implement / dev-fix 按上表固定时机装载 ref-testing **本体**（通则 + 路由）；写哪类测试，再按其场景路由表读取对应 references/ 细则，一次只载一个——装载时机固定，细则加载随场景。

### 7.3 参考技能的调用规则

- 不设 `disable-model-invocation`（需被 Skill 工具显式调用），但 description 写明"内部参考，由 XX 在 YY 时机加载，不直接响应独立请求"；用户直呼 ref-* 时，引导到对应流程技能。
- "什么是好"的知识只存一份、按需进上下文，不污染每个会话。

## 8. 自动化契约

**每个流程技能完成后的出口只允许三种形态之一，禁止做完沉默等指令：**

1. **自动调用**下一个技能（无决策点时，如 implement → review、ship 收尾 → accept）；
2. **抛出决策问题**，且必须带默认建议（用户只需回"嗯"或纠正）；
3. **被门禁拦停**，说明缺什么、指路（如"spec 0003 还是 draft，先 /dev-spec 完成批准"）。

**普适规则：任何流程技能中断时（用户喊停、上下文将尽、被卡住），先把当前进展写回产物的 `## Progress` 或状态字段，再停。**

### 决策点全表（其余全部自动串联）

| 技能 | 出口自动动作 | 必须问人的点 |
|---|---|---|
| dev-clarify | 建议进 dev-spec | 方法论亮牌确认；need 定稿 |
| dev-spec | publish → 进 dev-plan | **spec 批准**；MVP 分轮范围 |
| dev-plan | publish 工单 → 提示 frontier | 拆分粒度确认 |
| dev-implement | **自动调 dev-review** | 无（spec 缺口时停下报告，属门禁回路） |
| dev-review | 通过 → 自动准备 PR（dev-ship 前半） | 阻断项修复策略：机械问题自动修再审，设计级问题问人 |
| dev-ship | 全部工单 done → 自动调 dev-accept | **合并确认**（单向门） |
| dev-accept | 通过 → spec 标 done（末轮则 need 标 fulfilled） | 开不开下一轮（循环回转点） |
| dev-fix | 自动调 dev-review | 定级与优先级 |
| dev-retro | 产出改动清单 | 采纳哪些 |

`/sdlc` 增加一个 `next` 模式：**自动推进到下一个决策点为止**——"你只管决策，重复劳动归流水线"。

## 9. 需求方法论选择器（内置于 dev-clarify）

**规则**：按信号选主方法（可组合），开场先向用户亮牌（"我建议用 X，因为 Y"），用户可否决换方法；无论用哪种方法聊，落盘都是同一个 need 模板（§6.2）。方法决定**怎么聊**，模板决定**落成什么样**。

| 方法 | 适用信号 | 核心动作 |
|---|---|---|
| 视点分析（业务/用户/系统三层） | 多干系人、业务流程复杂 | 逐层下钻：为什么做→谁用→系统要什么 |
| 用例驱动 | 交互密集、流程分支多 | 主流程 + 异常流走查 |
| 风险驱动 MVP 分轮 | 需求模糊、决策短期不确定 | 假设排序→圈最小可验证范围 |
| 原型驱动 | UI/体验说不清 | 联动 prototype，先做可点的 |
| 调研驱动 | 技术/外部依赖不确定 | 联动 dev-research |

经典需求工程三步（挖掘→分析→设计）对应管线位置：clarify（挖掘+分析）→ spec（设计）。

## 10. 技能总清单与建设计划

### 10.1 清单（20 个 = 15 流程 + 5 参考）

| 技能 | 层 | 一句话职责 |
|---|---|---|
| setup-workspace | 流程 | 交互式初始化/升级工作区（幂等） |
| sdlc | 流程 | 总控：报当前阶段、下一步、被哪个门禁挡住；`next` 模式自动推进到决策点 |
| dev-clarify | 流程 | 想法 → need（内置 §9 方法论选择器） |
| dev-research | 流程 | 技术调研 → 带来源引用的报告（后台代理执行） |
| dev-spec | 流程 | need/对话 → spec（固定模板、验收场景、分轮决策） |
| dev-design | 流程 | spec → 技术方案 + ADR（定义 seam） |
| dev-plan | 流程 | spec → 垂直切片工单 + 依赖边（标记集成级场景） |
| dev-implement | 流程 | 工单 → 实现（红绿循环、Progress 交接） |
| dev-review | 流程 | 双轴评审（标准轴 + Spec 轴）→ 评审报告 |
| dev-accept | 流程 | 集成验收：跑集成级场景、核销 FR、风险复审 |
| dev-ship | 流程 | PR + 合并 + tag；工单 → done |
| dev-release | 流程 | 版本 / CHANGELOG / 发布检查单 / 部署验证 |
| dev-fix | 流程 | 分诊定级 → 复现（失败测试先行）→ 修复 → 回归 |
| dev-retro | 流程 | 复盘 → 结论沉淀为可执行改动（标准/检查/技能修订）；审计 [trivial] 豁免 |
| dev-docs | 流程 | 面向人的文档（README/API/用户文档）维护 |
| ref-writing | 参考 | 编写人类可理解文档的标准 |
| ref-implementation | 参考 | 好实现的标准 |
| ref-testing | 参考 | 好测试的标准（含六类测试参考与场景路由） |
| ref-review | 参考 | 好评审行为的标准（含坏味道基线） |
| ref-git-commit | 参考 | 规范提交与合并信息的标准 |

### 10.2 批次与推荐实现顺序

- **批 1（13 个，最小闭环含质量标准）**，推荐顺序：
  1. setup-workspace（基础设施先就位）✅ 2026-10-26
  2. sdlc（总控）✅ 2026-10-27（next 模式路由表与上下文 token 水位线随 v1.3 定稿；§13.2 自测通过——拒绝/重入/只读/衔接断链四项实测，触发项因会话技能列表固定留待新会话复验）
  3. ref-writing ✅ 2026-10-27
  4. dev-spec
  5. dev-plan
   6. ref-testing、ref-implementation（均 ✅：ref-implementation 2026-10-26；ref-testing 2026-10-27，六类测试参考与场景路由随 v1.4 定稿）
  7. dev-implement
  8. ref-review ✅ 2026-10-26
  9. dev-review ✅ 2026-10-26（依赖的 ref-review / ref-implementation 同日完成；§13.2 端到端自测待 setup-workspace 就绪后补跑）
  10. dev-ship
  11. dev-accept
  12. ref-git-commit（规范提交与合并信息；2026-10-27 经 spec 0001 增补）✅ 2026-10-27
- **批 2（4 个）**：dev-clarify、dev-design、dev-fix、dev-retro
- **批 3**：dev-research、dev-release、dev-docs、trackers 的 github/gitlab/codeup 适配器、L4 hooks

批 2/3 技能要点：dev-design（spec→模块划分/数据流/seam/ADR；ADR 三条件：难逆转、无上下文会困惑、真实权衡）；dev-fix（先分诊定级，修复前必须先有失败测试）；dev-research（后台代理、只信一手来源、每条结论带引用）；dev-release（语义化版本 + CHANGELOG + 发布检查单）；dev-docs（面向人的文档，与实际行为一致性优先）。

### 10.3 与 Matt Pocock 套件共存与归档

- `dev-` / `ref-` / `sdlc` / `setup-workspace` 命名不冲突，可平滑共存。
- 风险：Matt 的 tdd / code-review / research / domain-modeling 等允许模型自动调用，agent 可能自动选中它们绕开门禁链。批 1 建完试用确认后，把 Matt 的生命周期类技能（to-spec、to-tickets、to-questionnaire、implement、implement-spec、code-review、tdd、research、domain-modeling、prototype、triage、handoff、retro、diagnosing-bugs）移入归档目录；写作类（writing-* 等）不冲突，保留。

## 11. 批 1 技能规格

### 11.1 setup-workspace

- **职责**：交互式初始化/升级工作区，严格按 §5 生成一切；把接入方式适配到当前运行的智能体。SKILL.md 只留控制流（~70 行），操作细则下沉 `references/`（scan-signals / decisions / generation / agent-adapters），进入阶段前才按需 Read；逐字拷贝进目标仓库的模板放 `assets/`（check.sh / METHOD.md / GLOSSARY.md / trackers/local.sh / standards/）。
- **流程**：
  1. 前置校验：必须在 git 仓库内；assets/ 与 references/ 完整。**识别智能体**（环境变量 → 配置目录 → 技能安装路径），命中 `references/agent-adapters/<name>.md` 则全程应用其接入差异（如 Claude Code 需 CLAUDE.md 加 `@AGENTS.md` 转发行），未命中走通用流程——AGENTS.md 是跨智能体契约。
  2. 扫描（只读，先扫后问）：**仓库类型**（根级 workspace 标志 → monorepo 逐包扫描，否则整仓）；语言与框架（按包读 manifest）；检查命令（monorepo 优先聚合命令 turbo/nx/pnpm -r/go work）；环境已述项（Dockerfile/compose、版本管理文件、lockfile）；已有接入物（.sdlc/check.sh 存在 → 升级模式，全程按 §5.2 所有权表执行并逐项报告覆盖/保留/补缺）。
  3. 决策点（必须问、带默认建议，扫描已答的只复述不重问）：① 产物与 issue 出口 local（默认）/ GitHub / GitLab / 云效 Codeup——选 GitHub 验证 `gh auth status`，选 GitLab 验证 `glab auth status`，选 Codeup 引导添加 Codeup MCP；凭据/MCP 不通过回落 local 并明确告知，不静默降级；github/gitlab/codeup 的 publish 适配器属批 3，如实相告。② 执行环境缺口——每语言三问（跑在哪/版本管理/包管理器），仓库已描述的直接复述，结果写 config.sh 的 RUN_ENV/RUN_PREFIX/PKG_MGR/CODE_DIRS。③ 编码标准来源——内置 starter 只是兜底：问用户自有/团队标准及其来源（本地路径 / URL，可多个），导入 docs/standards/（增量、同名不覆盖），CODING_STANDARDS.md 写成"索引 + 兜底基线"；没有则引入匹配语言的 starter；可两者都要或跳过。
  4. 生成/升级：按 §5.2 所有权表逐项执行。config.sh 预填探测结果，绝不覆盖；GLOSSARY.md 首建"流程术语与状态"章（项目术语不动）；AGENTS.md **最后收口**（不存在则连带创建；无标记文末追加；有标记只替换标记之间内容），智能体额外动作在此一并执行；git hooks 幂等重装，外来 hook 不覆盖只报告；docs/ 八个产物目录懒创建；源码与一切用户文件永不触碰。
  5. 自检与收尾报告：跑 `check.sh phase` 与 `frontier` 确认可执行；报告四段——做了什么（含覆盖/保留决策、识别到的智能体与仓库类型）/ 探测画像（语言、包清单、版本管理、包管理器、聚合命令）/ config 待补项（TRACKER_REPO、留空的检查命令、未完成的 MCP/凭据）/ 建议跑 /sdlc（未安装则说明）。出口形态 = 报告 + 指路，无下游自动串联。
- **注意**：实现时先检查 `~/.zcode/skills` 与 `~/.agents/skills` 的镜像关系，确认技能实际生效路径。

### 11.2 sdlc（总控）

- 只读调度，不写产物。默认模式：调 `check.sh phase` + `frontier`，按固定结构报告——**当前阶段**（need/spec/工单各处于什么状态）、**可做的事**（frontier 工单、等待用户决策的点）、**被挡在哪**（最近一处不满足的门禁：缺什么 + 指路哪个技能）、**循环状态**（逐 need 报轮次进度：当前 round 是否已验收、验收报告里残余风险几条、是否建议开下一轮）。
- `next` 模式：自动推进到下一个决策点为止（§8）。路由表（盘上状态 → 下一个该调用的技能 → 停在哪）落技能 `references/next-mode.md`，按优先级匹配、命中即停；多张 ready 工单必须问询（带默认建议——dev-implement 规定工单由用户点名，总控不得代挑）；目标技能未安装 → 报告断链并指路（蓝图批次或按 METHOD.md 手动推进），禁止越权代劳其写入动作。
- **上下文 token 水位线**（`references/context-watermark.md`）：每次调用目标技能前评估会话上下文 token 用量占窗口的百分比——**绿 <30%** 正常推进；**黄 30%–50%** 只推进单阶段、出口不自动串联下一技能；**红 ≥50%** 停止推进，建议新开会话重跑 /sdlc 从盘上续接。拿不准按更高档执行；水位收窄的是推进距离，不是决策纪律。
- description 写宽："当用户问'现在该做什么''下一步''项目进展'，或要求继续推进开发流程时使用"。

### 11.3 ref-writing / ref-testing / ref-implementation / ref-review

- 内容要点见 §7.1；每个 30–60 行，格式=内嵌范例 + 反例对照（好/差并列展示），比抽象规则更有约束力。
- frontmatter description 注明内部参考身份与被谁在何时加载（§7.3）。
- **ref-testing 两级结构（v1.4）**：SKILL.md（≤60 行）只留总标准、通则、六场景路由表、反模式表与自查口令；references/ 六文件（red-green / table-driven / integration / e2e / stress-capacity / chaos）各 30–60 行，统一骨架=首句声明加载时机 → 好用例标准 → 好/差对照 → 反模式 → 自查口令。进入具体测试场景前才 Read 对应文件，一次只载一个（按需加载先例：sdlc 的 next-mode.md、setup-workspace 的 references/ 声明）。

### 11.4 dev-spec

- **输入**：当前对话 + need（若存在；不存在时先建议跑 dev-clarify 或直接从对话综合，但须在 spec 里注明来源）。
- **流程**：探索代码库 → 用 GLOSSARY 词汇、尊重相关 ADR → 起草固定模板（§6.3）→ 与用户定分轮范围（读 need 的假设与风险表）→ `check.sh validate` 过 → 用户批准（决策点，须显式确认）→ status: approved → publish → 建议进 dev-plan。
- **门禁**：出口 = validate 通过 + 用户批准记录（approved 日期）。验收场景必须覆盖 need 全部 FR，集成级场景显式标记。
- 落盘前加载 ref-writing。

### 11.5 dev-plan

- **输入**：approved 的 spec。
- **规则**：拆 tracer-bullet 垂直切片（每片切穿全部层、可独立演示、大小适配单个新会话上下文）；给阻塞边；`[FR-N | 工单级]` 场景映射进工单验收标准，**拆不进单票的场景必须显式留给集成级清单**；宽泛机械重构（重命名/改共享符号类型）不硬塞切片，按 expand–contract 序列拆（先并存、分批迁移、最后收缩，每批保 CI 绿）。
- **决策点**：拆分粒度、阻塞边正确性，向用户展示编号清单确认。
- **出口**：每张工单 validate 通过（验收标准齐、依赖无环）→ publish → 提示 frontier。

### 11.6 dev-implement

规格即 §12 范文全文，按它实现，不再另写。

### 11.7 dev-review

- **双轴**：标准轴（CODING_STANDARDS.md + ref-review 的坏味道基线，repo 文档化标准优先、工具已强制的跳过）+ Spec 轴（对照 spec/工单：缺失、走样、超范围）。两轴可并行子代理执行，聚合时分轴报告不合并重排。
- **出口**：两轴阻断项均为零 → review status: approved → 自动准备 PR（进入 dev-ship 前半）；有阻断项：机械问题自动修复后重审，设计级问题问人（决策点）。
- 评审前加载 ref-review + ref-implementation。

### 11.8 dev-ship

- 前半（由 dev-review 自动触发）：准备 PR，正文模板：`## Summary`（用伪代码/调用树/文件树/mermaid 选最小可表达视图）+ `## Evidence`（Before/After 证据，测试结果或截图）+ `## Merge Danger`（单向门/双向门 + 影响半径）。
- **决策点**：合并确认（单向门，必须问人）。
- 合并后：该 spec 全部工单 → done；全部 done → 自动调 dev-accept。
- spec 的 done 不归它管（归 dev-accept）。

### 11.9 dev-accept

- **触发**：spec 全部工单 done 后自动（dev-ship 链）或手动。
- **做什么**：在集成后的代码上逐条运行 spec 的集成级验收场景；逐 FR 核销；运行 `check.sh all`；写验收报告（§6.5：场景结果/假设验证/残余风险/下一轮建议）。
- **出口**：passed → spec → done；若为末轮且成功标准核销、无未接受风险 → need → fulfilled。rejected → 缺陷开 fix 工单（dev-fix）、范围问题进下一轮建议。
- **决策点**：开不开下一轮（带默认建议）。
- 落盘前加载 ref-writing。

## 12. dev-implement 范文（文风与浓度基准，全文照此实现）

````markdown
---
name: dev-implement
description: 按 docs/tickets/ 中的工单实现功能。入口校验工单状态、依赖与规格批准情况，不满足即拒绝并指路；实现遵守垂直切片与红绿测试纪律；出口跑全量检查、逐条勾验收标准并自动转入 dev-review。当用户要求实现功能、写代码、继续开发时使用——无工单的请求会在入口被拒绝并引导至 dev-spec。
---

# dev-implement：按工单实现

你只做一件事：把**一张已就绪的工单**变成**通过全量检查的实现**。
其余一切（无工单的编码请求、spec 未批准、依赖未完成）一律拒绝。
拒绝不是失礼，是本技能的职责。

## 0. 前置：工作区校验

- 仓库根目录必须存在 `.sdlc/check.sh`（由 /setup-workspace 生成）。
- 不存在 → 停止，告诉用户"本仓库未接入开发流程，先运行 /setup-workspace"，
  不要在未接入的仓库里直接开始编码。

## 1. 入口门禁（全部通过才继续）

1. **确定工单**。用户给了工单号或路径 → 用它；没给 → 运行
   `.sdlc/check.sh frontier`，列出"阻塞已全部完成、可以开工"的工单供用户选择。
   禁止猜测或自行挑一张没被点名的工单。
2. 运行 `.sdlc/check.sh ticket <NNNN>`，它校验并输出：
   - 工单存在且 `status: ready`
   - Blocked by 的所有工单 `status: implemented 或 done`
   - 关联 spec 存在且 `status: approved`
3. 任一不满足 → **停止**，转述缺什么、下一步该跑哪个技能
   （例如"spec 0003 还是 draft，先 /dev-spec 完成批准"），不写任何代码。

全部通过后：立即把工单 frontmatter 的 `status` 改为 `in-progress`。

## 2. 装载上下文

按顺序读：工单全文 → 关联 spec 的对应章节 → docs/adr/ 中与改动区域相关的
ADR → GLOSSARY.md → CODING_STANDARDS.md。

然后用三五句话向用户复述：这张工单交付什么、验收标准是哪几条、打算动哪些模块。
有偏差，用户此刻纠正的成本最低。

## 3. 实现纪律

- **垂直推进**：一次只做一个验收标准，从测试到实现端到端打通
  （数据、接口、UI、测试同步动），不做"先把模型全写完再写接口"的横向分层。
- **红绿循环**：每个行为先写一个失败的测试，再写刚好让它通过的实现。
  测试只写在 spec 预定的接口边界（seam）上，只断言外部行为。
  - 禁止：mock 内部协作者、测私有方法、断言值用与实现相同的逻辑算出。
  - 禁止：为让测试变绿而删测试、改弱断言、加条件跳过。
- **边界**：只做工单内的事。发现 spec 有错或缺口 → 停在该点上报告，
  建议回 /dev-spec 修订（这是回路，不是失败）；需要大范围 prefactor →
  停下来建议拆新工单。顺手重构无关代码是 review 的必抓项。
- **提交节奏**：每完成一个验收标准或一次绿循环即可提交，message 一律带
  [#NNNN]，一次提交只做一件事。
- **频繁检查**：每轮跑当次测试文件，阶段性跑 lint/typecheck，
  全量检查留到出口。

## 4. 出口门禁（全部通过才算完）

1. 运行 `.sdlc/check.sh all`（全量 lint / typecheck / test，包装仓库自己的
   检查命令），必须全绿。仓库没有定义任何检查命令 → 这本身就是发现：报告
   用户并建议接入，不要静默跳过。
2. 逐条核对工单的验收标准 checkbox。每勾一条都必须说得出证据（哪个测试、
   什么输出）；说不出证据的不许勾。
3. 工单 frontmatter `status` 改为 `implemented`，在工单 `## Progress` 节
   追加三行以内的摘要：做了什么、留了什么尾巴、评审时值得注意什么。
4. 有未提交内容 → 提交（带 [#NNNN]）。
5. **立即用 Skill 工具调用 dev-review**。评审是必经门，不是可选步骤，
   不要问用户"要不要评审"。

## 5. 中断与交接

会话可能在任何时刻结束。凡是停下（用户喊停、上下文将尽、被卡住）：
先把当前进展写进工单的 `## Progress`（做到哪一步、下一个动作、卡在哪），
保持 `status: in-progress`，再停。状态在盘上，不在对话里。

## 禁止事项（任何时候）

- 无工单时创建或修改 src/ ——引导走 /dev-spec → /dev-plan。
- 使用 --no-verify，或以任何方式绕过 .sdlc/check.sh 提交。
- 删测试、改弱断言、跳过失败的检查来"完成"工单。
- 实现验收标准之外的功能。
````

**范文体现的写法要求（所有技能照此）**：开头一句定性职责并预告拒绝行为；门禁步骤可执行且拒绝路径写得和 happy path 一样认真；纪律用操作性规则不用口号；每个出口动作明确（自动调用/问人/拦停指路三选一）；全文 70 行左右——技能全文每次进上下文，长篇教科书是每个会话的税。description 是第一道网：写得宽，让直连请求（"帮我写代码"）也能命中，然后在入口被拦下指路。

## 13. 实现规范与验收清单

### 13.1 文件与格式

- 安装位置：`~/.zcode/skills/<技能名>/SKILL.md`；frontmatter 只有 `name` 与 `description`（不设 disable-model-invocation，流程技能要可被模型自动调用）。
- slug 英文、内容中文；description 中文，写得宽（承接直连请求），并说明拒绝/衔接行为；参考技能按 §7.3 注明内部身份。
- 附件分两类放同目录：`assets/`（逐字拷贝进目标仓库的模板，如 check.sh、METHOD.md、GLOSSARY.md、trackers、standards）与 `references/`（执行者按需加载的操作参考，不进目标仓库，如 scan-signals、decisions、generation、agent-adapters）。SKILL.md 只留控制流：进入阶段前才 Read 对应 reference，一次一个。

### 13.2 每个技能建完的自测清单

1. **触发测试**：用 3 句典型用户话术（含一句"没走流程"的直连请求）验证 description 能命中。
2. **门禁拒绝路径**：造一个不满足条件的环境（如无 spec、spec 未批准），确认技能拒绝、说清缺什么、指路正确——拒绝路径是这套技能的灵魂，必须测。
3. **重入测试**：中断后（Progress 已写）重新调用，能从盘上状态续接。
4. **产物校验**：产出/修改的文件过 `check.sh validate`。
5. **衔接测试**：出口三形态（自动调用/决策问题/拦停）按 §8 契约正确执行。

### 13.3 治理

- 本文档是唯一真相源：实现中发现设计缺陷，先改文档再改技能；技能文件头部不写"来源/变更说明"类注释。
- 每建完一个技能，在本文档 §10.2 对应条目后标注完成日期。
- METHOD.md 由 setup-workspace 从本蓝图 §2–§6 生成，二者规则部分保持一致。

## 14. 待定与未来扩展

- Codeup 适配器细节（API endpoint、token 权限）在批 3 实现时调研；GitHub/GitLab/Codeup 三平台的 issue 与 PR/MR 模型参考已落盘 docs/research/0001（2026-10-27），实现适配器前先读。tracker 扩展只需新增 `.sdlc/trackers/xxx.sh` + config 枚举，流程技能零改动。
- L4 PreToolUse hook 的具体拦截规则（--no-verify、无工单时的 src/ 编辑）批 3 设计。
- 团队规范 starter（TS / Python / Go / Java）定稿于 skills/setup-workspace/assets/standards/（2026-10-26，随 setup-workspace 实现定稿）。
- monorepo 按包门禁（逐包 check、逐包编号）批 1 不做：基础设施全库一份（.sdlc/ 与 docs/ 在根、产物编号全库唯一），setup 只做逐包扫描与聚合检查命令预填；按包门禁未来按需扩展。
- 智能体接入参考（setup-workspace 的 references/agent-adapters/）首批仅 zcode 与 claude-code；未识别的智能体走通用流程（AGENTS.md 为跨智能体契约），新增智能体加参考文件即可，技能正文零改动。
- Codeup MCP 的具体配置指引在批 3 适配器实现时补入 references/decisions.md。
- 若未来需要团队协作场景（多人分支策略、评审分派），作为新技能扩展，不动现有门禁结构。
