# skills

**门禁式 SDLC 技能集——把「团队 + AI 协作开发」的流程规矩变成机器门禁。**

31 个技能（均已实现）驱动一条脊柱流水线，九类落盘产物承载全部流程状态，一个门禁脚本让规矩变成机器判断，把一次软件变更从想法送到验收——全程可中断、可审计、可续接：

```
need（澄清）→ spec（规格）→ plan（拆票）→ implement（实现）→ review（评审）→ ship（交付）→ accept（验收）
```

脊柱三点位另有不强制的设计建议：spec 出口建议「先述标再拆票」、实现时装载设计基线与设计原则、验收时对照述标核销——由 design-\* 界面设计套件承接（见下方技能清单）。

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
- **界面述标交付**：design-\* 套件让界面设计从使用者角色约束出发、跟随项目设计基线，产出四态完备（正常/空/加载/错误）的布局方案并过硬指标自查；交付时在 design 产物写「界面设计」节（设计意图 / 角色约束 / 风格跟随声明 / 自查结果）并附可点 HTML 原型，design 的 approved 门即述标评审门——像建筑设计院述标那样「听意图、看界面、提意见」。
- **小改动快通道**：dev-quick-implement 让「表格字段 A 改 B」一类小而真实的代码改动不必硬走七环节确认链——三道准入门（简单 / 低风险 / 不违反已有 ADR）判过即自动补齐 need、spec、工票三件套，此后只在开工确认与合并确认两个点被打断，其余（实现、全量检查、独立子代理快评、收尾）全自动；准入判定三道门逐门留痕写进自产 spec「## 备注」，dev-retro 可事后审计快通道是否被滥用。

## 快速上手

依赖：git 与 bash；安装资产另需 Node.js ≥ 24.9.0（升级指引见下方「安装插件」节）。tracker 投影可选 GitHub（`gh`）/ GitLab（`glab`）/ 云效 Codeup（个人访问令牌），都不配则走本地文件模式，不影响任何门禁。

接入按两步走，顺序固定：**先安装技能，后 `/setup-workspace` 接门禁**。只装了技能、没接门禁就点名流程技能（`/dev-spec`、`/dev-implement` 等）会在入口被校验拒绝——技能停下来提示「本仓库未接入开发流程，先运行 /setup-workspace」。两步都完成才能开工。

### 第 1 步：安装技能

在目标 git 项目根目录裸跑一条命令，进入两层菜单：

```bash
npx @hankchen/infra
```

第一层选资产类型（「技能」与「插件」可安装，插件见下方「安装插件」节；「规范」为占位，显示但不可安装），第二层空格勾选要装的条目、回车确认。安装器做完三件事：

- 所选技能实体拷入项目 `.agents/skills/<技能名>/`，内容随包原样分发（与仓库 [skills/](./skills/) 清单一致）；
- 对项目内已存在的 agent 目录（`.claude`、`.zcode` 等）建相对软链；不存在的跳过并列入完成摘要，不报错；
- 在项目根写 `.infra-lock.json` 记账：包版本 + 逐技能指纹/安装时间。

脚本与 CI 里免交互安装，落盘结果与菜单路径一致：

```bash
npx @hankchen/infra --all                        # 安装全部 31 项技能
npx @hankchen/infra --skills dev-spec,dev-plan   # 只装指定技能（逗号分隔）
npx @hankchen/infra --skills dev-spec --skills ref-testing   # 可重复出现，取并集
```

全部旗标与示例见 `npx @hankchen/infra --help`。

- **重跑即升级**：再跑一次同一条命令，已装技能按当前包内容覆盖刷新、锁文件同步更新，不重复堆积。
- **锁版本**：`npx @hankchen/infra@<版本>` 安装指定版本（如 `npx @hankchen/infra@0.1.0`），锁文件记录实际安装的版本号，团队以此对齐同一版本。

npm 访问受限（内网、公司代理）时，先配镜像或代理再跑安装：

```bash
# 走公共镜像源
npm config set registry https://registry.npmmirror.com

# 或走 HTTP 代理
npm config set proxy http://127.0.0.1:7890
npm config set https-proxy http://127.0.0.1:7890
```

恢复默认：`npm config delete registry`、`npm config delete proxy`、`npm config delete https-proxy`。

### 安装插件（首个宿主：DeepSeek Harness）

插件是套件第二类资产：面向 agent 宿主的扩展包，以宿主官方格式分发。首个宿主为 DeepSeek Harness（dsh），套件随包提供 demo 插件 `@hankchen/dsh-demo`（内容与维护者照抄指南见[插件资产规范](./docs/plugin-assets.md)）。插件安装不落项目文件——它把 npm 包经官方命令装进本机 dsh profile。

前置：**Node.js ≥ 24.9.0**（官方 dsh CLI 的 engines 要求），版本不足时安装器直接拒装并报当前版本。升级：

```bash
fnm install 24 && fnm use 24    # 或 nvm install 24 && nvm use 24
```

两层菜单安装：

```bash
npx @hankchen/infra
```

第一层选「插件」，第二层空格勾选要装的插件（条目正名为 npm 包名），回车后选定目标 profile——菜单列出 `~/.dsh/profiles/` 既有项（`DSH_HOME` 可覆盖根目录），无既有项时可输入新名。安装器把勾选包逐条转发官方命令 `dsh plugin --profile <名> add <包>`（`dsh` 不在 PATH 时自动改经 `npx @deepseek-ai/dsh` 运行）；完成摘要给出对账结果——profile 的 package.json 依赖行 + `dsh.profile.bundles` 行两处落点——并记入 `.infra-lock.json`。

脚本与 CI 里免交互安装，落盘结果与菜单路径一致：

```bash
npx @hankchen/infra --plugins @hankchen/dsh-demo --profile default
npx @hankchen/infra --plugins @hankchen/dsh-demo --plugins <另一包> --profile work   # 可重复出现，取并集
```

`--profile` 必填：插件安装缺它即报错并列出既有 profile。全部旗标与示例见 `npx @hankchen/infra --help`。

两个例外：

- **`desktop` profile 装不了**：`desktop` 是官方保留 profile 名，官方 CLI 拒绝对其做插件管理；安装器在执行官方命令前同样拒装并说明。
- **registry 访问受限**：插件安装链路比技能多三处 registry 访问（npx 拉 `@deepseek-ai/dsh`、装插件包、profile 依赖经 pnpm 安装）。内网、公司代理环境先按上方「npm 访问受限」配镜像或代理再跑。

### 第 2 步：接入仓库

在目标 git 仓库的会话里运行 `/setup-workspace`。它会扫描仓库、问你三件事（产物与 issue 出口、执行环境、编码标准来源），然后生成门禁脚本、配置与 tracker 适配器，并装好 git hooks。幂等可重跑，永不触碰源码。

### 第 3 步：开工

- `/sdlc` —— 随时盘点：走到哪个阶段、可开工哪些工票、被哪个门禁挡住。
- `/dev-clarify` —— 从一个模糊想法开始；需求已清晰可直接 `/dev-spec`。
- 脊柱上的技能出口**默认自动串联**下一个，只在决策点停下问你；也可以 `/sdlc next` 让总控自动推进到下一个决策点。
- 点名一张 approved spec 交给 `/dev-execute`，整 spec 编排：worktree 并行实现、逐票评审、一次合并收口，全程人只决策两次（开工、合并）。

一轮最小闭环：

```
/dev-clarify → /dev-spec → /dev-plan → /dev-implement → /dev-review → /dev-ship → /dev-accept
```

## 技能清单（31 个）

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
| [dev-overview](./skills/dev-overview/SKILL.md) | 开工前总览：need/spec/design 与名下工票合成五节总览、走查归置缝隙；名下票 ≥2 的 spec 须 reviewed 总览才准开工（单票豁免） |
| [dev-implement](./skills/dev-implement/SKILL.md) | 按票实现：入口校验状态与依赖，出口跑全量检查 |
| [dev-review](./skills/dev-review/SKILL.md) | 双轴评审：标准轴（写得对不对）+ Spec 轴（做的是不是要的），两轴阻断清零才放行 |
| [dev-ship](./skills/dev-ship/SKILL.md) | 交付：PR 三节模板（Summary / Evidence / Merge Danger）、合并、工票 done |
| [dev-accept](./skills/dev-accept/SKILL.md) | 集成验收：逐条运行集成级场景、核销 FR 与业务成功标准，need 终态 fulfilled |

**编排与循环**

| 技能 | 职责 |
|---|---|
| [dev-execute](./skills/dev-execute/SKILL.md) | 整 spec 编排运行：依赖序 worktree 并行实现、逐票评审、一次合并收口 |
| [dev-quick-implement](./skills/dev-quick-implement/SKILL.md) | 快通道（spec 20261111-1dcd 交付，规格见蓝图 §11.24）：一句话小改动三道门判过即自动补齐三件套，恰 2 次交互交付到合并；准入判定逐门留痕进自产 spec「## 备注」，dev-retro 可审计 |
| [dev-fix](./skills/dev-fix/SKILL.md) | 缺陷分诊定级 → 开 fix 工票 → 送入实现链 |
| [dev-retro](./skills/dev-retro/SKILL.md) | 复盘：机械审计豁免与绕过信号，沉淀流程改进 |

**按需服务（不进自动串联链，手动触发）**

| 技能 | 职责 |
|---|---|
| [dev-design](./skills/dev-design/SKILL.md) | spec → 技术方案（design/ADR；ADR 三条件命中才写） |
| [dev-research](./skills/dev-research/SKILL.md) | 技术调研 → 带一手来源引用的调研报告 |
| [dev-release](./skills/dev-release/SKILL.md) | 语义化版本 + CHANGELOG + 发布检查单（tag 与推送是单向门，必须问人） |
| [dev-docs](./skills/dev-docs/SKILL.md) | 面向人的文档维护：每条行为断言先核验后落笔 |

**界面设计（design-\* 套件）**

「场景约束 → 基线 → 设计 → 述标」链，随 spec 0015 交付：

| 技能 | 职责 |
|---|---|
| [design-brief](./skills/design-brief/SKILL.md) | 使用者角色 → 书面设计约束（信息优先级 / 密度 / 关键操作路径），链起点 |
| [design-baseline](./skills/design-baseline/SKILL.md) | 建立 / 读取项目设计语言基线（docs/standards/ 按平台分册 + 标准索引登记） |
| [design-ui](./skills/design-ui/SKILL.md) | 约束与基线下的多平台布局视觉决策：四态完备、Web 必含移动端适配决策、硬指标自查 |
| [design-deliver](./skills/design-deliver/SKILL.md) | 述标交付：design 产物「界面设计」节四小节 + 可点 HTML 原型落 designs/assets/，approved 门即述标评审门 |

**参考层（内部参考，被流程技能装载，不独立调用）**

[ref-writing](./skills/ref-writing/SKILL.md)、[ref-implementation](./skills/ref-implementation/SKILL.md)、[ref-review](./skills/ref-review/SKILL.md)、[ref-testing](./skills/ref-testing/SKILL.md)、[ref-git-commit](./skills/ref-git-commit/SKILL.md)、[ref-refactoring-ui](./skills/ref-refactoring-ui/SKILL.md)、[ref-b-side-design](./skills/ref-b-side-design/SKILL.md)——分别定义「什么是好」的文档、实现、评审、测试、提交信息、界面视觉设计与 B 端体验设计。

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

- **九类产物各有固定状态机**（如 spec：draft → approved → done），frontmatter 是 check.sh 的解析依据；知识档进版本库，过程档（工票 / 评审 / 验收 / 总览）被 .gitignore 排除、验收后蒸馏清扫——审计链主承载为 tracker 投影与源码提交 `[#NNNN]` 引用。状态机详见 [docs/METHOD.md](./docs/METHOD.md) §5。
- **check.sh 常用子命令**：`phase` 全库状态总览；`frontier` 可开工的工票；`validate <file>` 产物模板与 FR 追溯校验；`publish <file>` 投影到 tracker；`all` 全量 lint/typecheck/test。提交走轻门禁（message 带 `[#NNNN]` 或 `[trivial]`），push 前走重门禁（implemented 工票必须有 approved 评审覆盖）。

## 维护者：发布流程

npm 包 `@hankchen/infra` 的包根即仓库根，skills/ 全量随包分发。包管理器为 pnpm（`pnpm-workspace.yaml` 声明 workspace、`packageManager` 字段钉版）。发布三步，顺序固定：

1. **对账**：`pnpm pack` 产出 tarball 后跑对账校验——包内技能清单必须等于仓库 `skills/` 清单、包内插件清单等于仓库 `agents/*/plugins/` 清单且禁含 `node_modules` 条目，任一不满足即拒绝发布（退出码 1）：

   ```bash
   pnpm pack
   pnpm run verify:pack hankchen-infra-<版本>.tgz
   ```

   （传参不带 `--`：pnpm 12 起 `pnpm run` 原样转发 `--`，与 npm 不同。）

2. **升版本号**：改 `package.json` 的 `version`。semver 判据——patch：既有技能内容修订；minor：新增技能；major：移除或更名技能、安装目标或软链规则变更（后两类会改变既有项目的落盘形态）。
3. **发布**：`pnpm publish --access public`。pnpm publish 自带两道 git 门——工作树不干净（`ERR_PNPM_GIT_UNCLEAN`）或不在 `master`/`main` 分支（`ERR_PNPM_GIT_NOT_CORRECT_BRANCH`）都会被拒；插件包发布同门，双包顺序与对账三查见[插件资产规范](./docs/plugin-assets.md) §1.4。发布是单向门，操作以 annotated git tag（`v<版本>`）留痕；完整检查单、CHANGELOG 纪律与「tag 与推送必须问人」的边界见 `/dev-release`。

## 文档

| 文档 | 说明 |
|---|---|
| [docs/METHOD.md](./docs/METHOD.md) | **流程规范**：原则、门禁、工作区规范、产物状态机、check.sh 与 config.sh 参考 |
| [docs/sdlc-skills-blueprint.md](./docs/sdlc-skills-blueprint.md) | **设计蓝图**（唯一设计真相源）：设计原则、流程拓扑、全部技能规格（§11）、进度台账（§10.2）；治理规则「先改文档再改技能」 |
| [docs/concepts.md](./docs/concepts.md) | **概念定位档案**：全部概念的定义、来源（外部出处/方法自创）与落点 |
| [docs/plugin-assets.md](./docs/plugin-assets.md) | **插件资产规范**：套件插件的生产约定（仓库布局、清单四要素、双包发布顺序、新宿主接入）与 dsh 官方格式逐字段运行时形态 |
| [docs/sessions/](./docs/sessions/) | 设计会话纪要：方法论定稿过程的决策记录 |
| [GLOSSARY.md](./GLOSSARY.md) | 术语表：流程术语与状态定义 |

## 项目状态

31 个技能均已实现（含 design-\* 界面设计套件 4 个，spec 0015 交付；dev-quick-implement 快通道随 spec 20261111-1dcd 交付）。流程规则的唯一来源是 [docs/METHOD.md](./docs/METHOD.md)，设计真相源是 [docs/sdlc-skills-blueprint.md](./docs/sdlc-skills-blueprint.md)（治理规则：先改文档再改技能）。
