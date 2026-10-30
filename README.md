# skills

**门禁式 SDLC 技能集——把「团队 + AI 协作开发」的流程规矩变成机器门禁。**

23 个技能驱动一条脊柱流水线，八类落盘产物承载全部流程状态，一个门禁脚本让规矩变成机器判断，把一次软件变更从想法送到验收——全程可中断、可审计、可续接：

```
need（澄清）→ spec（规格）→ plan（拆票）→ implement（实现）→ review（评审）→ ship（交付）→ accept（验收）
```

## 致谢

本套技能受 [Matt Pocock 的 skills 套件](https://github.com/mattpocock/skills)（"Skills for Real Engineers"，MIT 许可）启发。那套「小而可组合、对话即工作流」的技能是本方法论的直接起点；实践暴露出的主要短板——「指令式规范有规矩无检查」——成了本套件的第一设计目标。

## 它解决什么问题

AI 协作开发的三种常见失控：

- **规范靠自觉**：指令式技能把规矩写在文字里，想跳就跳——先写代码后补规格、绕过评审直接合并，没人拦得住。
- **状态在对话里**：进度活在会话记忆中，上下文一断，做到哪一步就丢了。
- **产物无接口**：技能之间靠对话衔接，说不清「这张工单被哪次评审覆盖过」。

本套件的回答是一条设计公理：**能机械检查的绝不只写成指令**。校验逻辑下沉到 `.sdlc/check.sh`，git hooks 与技能共用同一套判断；流程状态全部写在产物 frontmatter 上，盘上即真相。防线共四层：

| 层 | 机制 | 拦住谁 |
|---|---|---|
| L1 常驻指令 | AGENTS.md 哨兵块，任何会话一进仓库就可见 | 忘了调技能的 agent 会话 |
| L2 技能入口 | 流程技能开头校验上游产物，不满足即拒绝并指路 | 想跳步的调用 |
| L3 机械层 | git hooks（commit-msg / pre-push）跑 check.sh | 一切入库提交，含人在终端手敲 |
| L4 可选增强 | 平台 PreToolUse hook：拦 `--no-verify`、拦无在办工单的源码编辑 | 明知故犯的绕过 |

小改动（typo、纯文档）走 `[trivial]` 标记豁免，留痕 commit message，由 /dev-retro 事后审计。

## 几个有特色的设计

- **需求澄清方法论**：dev-clarify 不上来就问——先按信号选方法（视点分析 / 用例驱动 / 风险分轮 / 原型驱动 / 调研驱动，五法亮牌、可换可组合）；开放问题沿「查证 → 陈述句确认 → 决策卡 → 可点原型 → 转假设」的校准阶梯逐级处置，能用低成本解决的不升级，清零才定稿。
- **V 模型钳制式开发**：左臂自上而下分解——need 拆成 spec、spec 拆成工票；右臂自下而上验证——工票对单元测试、spec 对集成级场景、need 对业务成功标准。往下拆多细，右边就有等价的验证在等着，实现被两条臂夹在中间跑不偏；拆票用 tracer-bullet 垂直切片，每票独自切穿左右两臂，任何时刻停下都有可运行的增量。
- **整 spec 编排（dev-execute）**：把 V 模型走成自动流水——点名一张 approved spec，按依赖序并行实现、逐票双轴评审，每合回一票就全量验证一次（右臂逐级上行），全绿后一次出 PR，出口指路 dev-accept 做集成验收；全程人只在开工与合并两个点确认。
- **MVP 分轮循环**：spec 带 `round`，round 1 只覆盖风险最大的最小范围；验收报告的「残余风险 / 下一轮建议」就是回转点，need 终态 fulfilled 有机械化退出条件。
- **双轴评审**：标准轴查「写得对不对」（编码标准 + 坏味道基线），Spec 轴查「做的是不是要的」（缺失 / 走样 / 超范围）；两轴独立出具、不互相稀释，阻断清零才放行。

## 快速上手

依赖：git 与 bash。tracker 投影可选 GitHub（`gh`）/ GitLab（`glab`）/ 云效 Codeup（个人访问令牌），都不配则走本地文件模式，不影响任何门禁。

1. **安装技能**：把 [skills/](./skills/) 下各子目录拷贝或软链到智能体的技能目录（ZCode 为 `~/.zcode/skills/`）。内置 ZCode 与 Claude Code 的接入参考，其他智能体走通用流程。
2. **接入仓库**：在目标 git 仓库的会话里运行 `/setup-workspace`。它会扫描仓库、问你三件事（产物与 issue 出口、执行环境、编码标准来源），然后生成门禁脚本、配置与 tracker 适配器，并装好 git hooks。幂等可重跑，永不触碰源码。
3. **开工**：
   - `/sdlc` —— 随时盘点：走到哪个阶段、可开工哪些工票、被哪个门禁挡住。
   - `/dev-clarify` —— 从一个模糊想法开始；需求已清晰可直接 `/dev-spec`。
   - 脊柱上的技能出口**默认自动串联**下一个，只在决策点停下问你；也可以 `/sdlc next` 让总控自动推进到下一个决策点。
   - 点名一张 approved spec 交给 `/dev-execute`，整 spec 编排：worktree 并行实现、逐票评审、一次合并收口，全程人只决策两次（开工、合并）。

一轮最小闭环：

```
/dev-clarify → /dev-spec → /dev-plan → /dev-implement → /dev-review → /dev-ship → /dev-accept
```

## 技能清单（23 个）

**总控与初始化**

| 技能 | 职责 |
|---|---|
| [sdlc](./skills/sdlc/SKILL.md) | 流程总控（只读）：盘点现状、报告被哪个门禁挡住；next 模式自动推进到下一个决策点 |
| [setup-workspace](./skills/setup-workspace/SKILL.md) | 交互式初始化/升级工作区：生成门禁脚本与配置、装 git hooks，幂等可重跑 |
| [setup-reconstruct](./skills/setup-reconstruct/SKILL.md) | 存量项目知识逆向扫描：分轮只读读码，产出带 文件:行 证据与扫描基线的套件形态沉淀物，确认后落盘，重跑即增量对齐（按需服务，手动触发） |
| [setup-migrate](./skills/setup-migrate/SKILL.md) | 存量项目套件迁移：识别 matt / superpower 安装痕迹，外来产物逐件翻译映射、tracker issue 关闭、生命周期技能处置，两态接入本套件门禁，对账清单逐件留痕（按需服务，手动触发） |

**脊柱（一次变更的必经门禁线）**

| 技能 | 职责 |
|---|---|
| [dev-clarify](./skills/dev-clarify/SKILL.md) | 想法 → need：方法论亮牌路由 + 校准阶梯，开放问题三路归置清零 |
| [dev-spec](./skills/dev-spec/SKILL.md) | need/对话 → spec：固定模板，验收场景带 FR 追溯（孤儿报错），round 1 圈风险最大的最小范围 |
| [dev-plan](./skills/dev-plan/SKILL.md) | spec → 工票：tracer-bullet 垂直切片，`blocked-by` 阻塞边 |
| [dev-implement](./skills/dev-implement/SKILL.md) | 按票实现：入口校验状态与依赖，出口跑全量检查 |
| [dev-review](./skills/dev-review/SKILL.md) | 双轴评审：标准轴（写得对不对）+ Spec 轴（做的是不是要的），两轴阻断清零才放行 |
| [dev-ship](./skills/dev-ship/SKILL.md) | 交付：PR 三节模板（Summary / Evidence / Merge Danger）、合并、工票 done |
| [dev-accept](./skills/dev-accept/SKILL.md) | 集成验收：逐条运行集成级场景、核销 FR 与业务成功标准，need 终态 fulfilled |

**编排与循环**

| 技能 | 职责 |
|---|---|
| [dev-execute](./skills/dev-execute/SKILL.md) | 整 spec 编排运行：依赖序 worktree 并行实现、逐票评审、一次合并收口 |
| [dev-fix](./skills/dev-fix/SKILL.md) | 缺陷分诊定级 → 开 fix 工票 → 送入实现链 |
| [dev-retro](./skills/dev-retro/SKILL.md) | 复盘：机械审计豁免与绕过信号，沉淀流程改进 |

**按需服务（不进自动串联链，手动触发）**

| 技能 | 职责 |
|---|---|
| [dev-design](./skills/dev-design/SKILL.md) | spec → 技术方案（design/ADR；ADR 三条件命中才写） |
| [dev-research](./skills/dev-research/SKILL.md) | 技术调研 → 带一手来源引用的调研报告 |
| [dev-release](./skills/dev-release/SKILL.md) | 语义化版本 + CHANGELOG + 发布检查单（tag 与推送是单向门，必须问人） |
| [dev-docs](./skills/dev-docs/SKILL.md) | 面向人的文档维护：每条行为断言先核验后落笔 |

**参考层（内部参考，被流程技能装载，不独立调用）**

[ref-writing](./skills/ref-writing/SKILL.md)、[ref-implementation](./skills/ref-implementation/SKILL.md)、[ref-review](./skills/ref-review/SKILL.md)、[ref-testing](./skills/ref-testing/SKILL.md)、[ref-git-commit](./skills/ref-git-commit/SKILL.md)——分别定义「什么是好」的文档、实现、评审、测试与提交信息。

## 接入后的工作区

```
<repo>/
├── .sdlc/                  # 流程基础设施（机器物）
│   ├── check.sh            # 门禁脚本
│   ├── config.sh           # 本仓库配置（用户所有，setup 绝不覆盖）
│   ├── hooks/              # L4 平台层拦截判定脚本
│   └── trackers/           # tracker 适配器（local/github/gitlab/codeup，可扩展）
├── docs/                   # 流程产物（人文物）
│   ├── METHOD.md           # 流程规则唯一来源
│   ├── needs/ specs/ designs/ tickets/ reviews/ acceptance/ adr/ research/
│   └── standards/          # 编码标准（增量导入）
├── AGENTS.md               # sdlc 哨兵块
├── GLOSSARY.md             # 流程术语与项目术语
├── CODING_STANDARDS.md     # 编码标准索引 + 兜底基线
└── CHANGELOG.md            # 懒创建，仅需要发布流程的项目
```

- **八类产物各有固定状态机**（如 spec：draft → approved → done），frontmatter 是 check.sh 的解析依据——产物目录加 git log 就是完整审计链。状态机详见 [docs/METHOD.md](./docs/METHOD.md) §5。
- **check.sh 常用子命令**：`phase` 全库状态总览；`frontier` 可开工的工票；`validate <file>` 产物模板与 FR 追溯校验；`publish <file>` 投影到 tracker；`all` 全量 lint/typecheck/test。提交走轻门禁（message 带 `[#NNNN]` 或 `[trivial]`），push 前走重门禁（implemented 工票必须有 approved 评审覆盖）。

## 文档

| 文档 | 说明 |
|---|---|
| [docs/METHOD.md](./docs/METHOD.md) | **流程规范**：原则、门禁、工作区规范、产物状态机、check.sh 与 config.sh 参考 |
| [docs/sdlc-skills-blueprint.md](./docs/sdlc-skills-blueprint.md) | **设计蓝图**（唯一设计真相源）：设计原则、流程拓扑、全部技能规格（§11）、进度台账（§10.2）；治理规则「先改文档再改技能」 |
| [docs/concepts.md](./docs/concepts.md) | **概念定位档案**：全部概念的定义、来源（外部出处/方法自创）与落点 |
| [docs/sessions/](./docs/sessions/) | 设计会话纪要：方法论定稿过程的决策记录 |
| [GLOSSARY.md](./GLOSSARY.md) | 术语表：流程术语与状态定义 |

## 项目状态

23 个技能已全部实现。流程规则的唯一来源是 [docs/METHOD.md](./docs/METHOD.md)，设计真相源是 [docs/sdlc-skills-blueprint.md](./docs/sdlc-skills-blueprint.md)（治理规则：先改文档再改技能）。
