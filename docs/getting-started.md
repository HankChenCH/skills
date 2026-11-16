# 安装与接入

使用者视角的安装与接入详解。仓库总览见根 [README](../README.md)，流程规则唯一来源是 [METHOD.md](./METHOD.md)。

## 依赖

git 与 bash；安装资产另需 Node.js ≥ 24.9.0（升级指引见下方「安装插件」节）。tracker 投影可选 GitHub（`gh`）/ GitLab（`glab`）/ 云效 Codeup（个人访问令牌），都不配则走本地文件模式，不影响任何门禁。

## 两步接入，顺序固定

**先安装技能，后 `/setup-workspace` 接门禁**。只装了技能、没接门禁就点名流程技能（`/dev-spec`、`/dev-implement` 等）会在入口被校验拒绝——技能停下来提示「本仓库未接入开发流程，先运行 /setup-workspace」。两步都完成才能开工。

## 第 1 步：安装技能

在目标 git 项目根目录裸跑一条命令，进入两层菜单：

```bash
npx @hankchen/infra
```

第一层选资产类型（「技能」与「插件」可安装，插件见下方「安装插件」节；「规范」为占位，显示但不可安装），第二层空格勾选要装的条目、回车确认。安装器做完三件事：

- 所选技能实体拷入项目 `.agents/skills/<技能名>/`，内容随包原样分发（与仓库 [skills/](../skills/) 清单一致）；
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

## 安装插件（首个宿主：DeepSeek Harness）

插件是套件第二类资产：面向 agent 宿主的扩展包，以宿主官方格式分发。首个宿主为 DeepSeek Harness（dsh），套件随包提供 demo 插件 `@hankchen/dsh-demo`（内容与维护者照抄指南见[插件资产规范](./plugin-assets.md)）。插件安装不落项目文件——它把 npm 包经官方命令装进本机 dsh profile。

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

## 第 2 步：接入仓库

在目标 git 仓库的会话里运行 `/setup-workspace`。它会扫描仓库、问你三件事（产物与 issue 出口、执行环境、编码标准来源），然后生成门禁脚本、配置与 tracker 适配器，并装好 git hooks。幂等可重跑，永不触碰源码。

## 第 3 步：开工

- `/sdlc` —— 随时盘点：走到哪个阶段、可开工哪些工票、被哪个门禁挡住。
- `/dev-clarify` —— 从一个模糊想法开始；需求已清晰可直接 `/dev-spec`。
- 脊柱上的技能出口**默认自动串联**下一个，只在决策点停下问你；也可以 `/sdlc next` 让总控自动推进到下一个决策点。
- 点名一张 approved spec 交给 `/dev-execute`，整 spec 编排：worktree 并行实现、逐票评审、一次合并收口，全程人只决策两次（开工、合并）。

一轮最小闭环：

```
/dev-clarify → /dev-spec → /dev-plan → /dev-implement → /dev-review → /dev-ship → /dev-accept
```

## 接入后的工作区

在目标项目运行 `/setup-workspace` 后，工作区长成这样：

```
<repo>/
├── .sdlc/                  # 流程基础设施（机器物）
│   ├── check.sh            # 门禁脚本
│   ├── config.sh           # 本仓库配置（用户所有，setup 绝不覆盖）
│   ├── hooks/              # L4 平台层拦截判定脚本
│   └── trackers/           # tracker 适配器（local/github/gitlab/codeup，可扩展）
├── docs/                   # 流程产物（人文物）
│   ├── METHOD.md           # 流程规则唯一来源
│   ├── needs/ specs/ designs/ tickets/ overviews/ reviews/ acceptance/ adr/ research/
│   └── standards/          # 编码标准（增量导入）
├── AGENTS.md               # sdlc 哨兵块
├── GLOSSARY.md             # 流程术语与项目术语
├── CODING_STANDARDS.md     # 编码标准索引 + 兜底基线
└── CHANGELOG.md            # 懒创建，仅需要发布流程的项目
```

- **九类产物各有固定状态机**（如 spec：draft → approved → done），frontmatter 是 check.sh 的解析依据；知识档进版本库，过程档（工票 / 评审 / 验收 / 总览）被 .gitignore 排除、验收后蒸馏清扫——审计链主承载为 tracker 投影与源码提交 `[#NNNN]` 引用。状态机详见 [METHOD.md](./METHOD.md) §5。
- **check.sh 常用子命令**：`phase` 全库状态总览；`frontier` 可开工的工票；`validate <file>` 产物模板与 FR 追溯校验；`publish <file>` 投影到 tracker；`all` 全量 lint/typecheck/test。提交走轻门禁（message 带 `[#NNNN]` 或 `[trivial]`），push 前走重门禁（implemented 工票必须有 approved 评审覆盖）。
