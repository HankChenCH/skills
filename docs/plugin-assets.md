# 插件资产规范

插件是套件第二类资产（GLOSSARY「agent 插件」词条）：面向特定 agent 宿主的扩展包，以宿主官方插件格式分发，经宿主官方命令安装进目标 profile——「包安装 + 清单编辑」，与技能的「文件拷贝 + 软链」根本不同。本文档分两层，各有一位读者：

- **一、生产约定**（维护者照抄）：插件源码在套件仓库怎么摆、package.json 清单怎么写、怎么发布、怎么接入下一个 agent 宿主。
- **二、运行时形态**（逐字段事实）：首个宿主 DeepSeek Harness（dsh）官方插件格式的逐字段要求与安装机制。以 need 20261115-339e 背景节内联查证结论 F1/F2（2026-11-15，官方文档与本机 profile 实测）为据，不臆造格式细节；官方格式演进时以官方文档与 demo 实测回改本文。

活样例：`agents/dsh/plugins/dsh-demo/`——demo 插件 `@hankchen/dsh-demo`，内容为 dsh 官方「Your first plugin」最小形态（导出 `name` + `apply(ctx)` 打一条加载日志）。本文档与 demo 源码互为印证：文档写约定，源码给实例；若实现与本文有出入，以合入后的实现为准回改文档。

## 一、生产约定（套件侧）

### 1.1 仓库布局

- 插件源码放 `agents/<宿主>/<机制段>/<插件目录名>/`（agents/ 布局规范 docs/standards/agents-layout.md，宿主段 = 宿主标识如 `dsh`，机制段当前为 `plugins`），**每个插件目录各自是完整的 npm 包**（有自己的 package.json，语义化版本独立演进）。
- 包根 = 仓库根（ADR 20261115-f143）：初始化器包 `@hankchen/infra` 的 `files` 清单加入 `agents`（与 skills 同法），`agents/` 两级布局下的新增宿主与插件目录自动随包分发，无需改安装器代码。
- **条目正名是包名，不是目录名**：菜单条目、安装转发、锁文件记账一律取插件包 package.json 的 `name`（registry 名，如 `@hankchen/dsh-demo`）；`description` 取为菜单提示语。

### 1.2 package.json 清单四要素

每个插件包的 package.json 必须齐备四要素（以 demo 为例）：

| 要素 | 值 | 作用 |
|---|---|---|
| `type` | `"module"` | 插件模块按 ESM 加载 |
| `main` | 源码态直指插件模块源码（如 `"index.ts"`）；发布打包时由包内 prepack 换载为编译产物 `index.js`（FR-7 证伪回退，见 §1.4 发布面预编译） | 宿主加载插件的入口 |
| `files` | 源码态含 `cordis.patch.yml` 与模块源码；发布态（tarball）为编译产物 `index.js` + `cordis.patch.yml`、不含 .ts 源码 | npm 白名单外文件不随包分发，清单缺文件 = 装出去的包坏 |
| `dsh` | `{"bundle": {"patch": "./cordis.patch.yml"}}` | dsh 识别插件的凭据；缺它见 §2.2 警告 |

随四要素一并要求两项声明：

- `engines.dsh` 声明兼容的 dsh 运行时版本范围（dsh 侧强校验，不符需显式豁免，need F3）；发布前对官方当前版本核验。
- `description` 一句话提示——初始化器第二层菜单直接取它展示（§1.1）。

### 1.3 插件模块与 patch 清单

- 插件模块导出 `name`（取包名字符串）与 `apply(ctx)`；demo 的 apply 只打一条含插件名的加载日志（真实功能设计是后续轮的事，need 非目标 1）。
- `cordis.patch.yml` 随包携带，**以包名引用自己**（patch 声明作用于 `@hankchen/dsh-demo` 自己）；具体行结构以 `agents/dsh/plugins/dsh-demo/cordis.patch.yml` 为准，本文不重抄。

### 1.4 发布纪律（双包顺序，pnpm 形态）

发布沿既有流程（对账 → 升版本 → publish → annotated tag，ADR 20261115-f143 与 README 维护者节），包管理器为 pnpm（spec 20261115-ed9f FR-4 迁移，RQ2 落地方案为准），插件引入一条硬顺序与机械对账三查。

**pnpm publish 的两道 git 门（npm 没有的新门）**：`pnpm publish` 默认检查，任一不满足即拒绝——

- **干净树**：工作树有未提交内容即拒，错误码 `ERR_PNPM_GIT_UNCLEAN`；
- **发布分支**：当前分支须为 `master` / `main`，否则拒，错误码 `ERR_PNPM_GIT_NOT_CORRECT_BRANCH`。

（两条错误码均为 RQ2 调研问①内联实测原文；确需绕过时 `--no-git-checks` 显式声明。）与 dev-release「发布前干净树」纪律同向，只是从纪律升级为机械门。

**发布面预编译（FR-7 证伪回退，插件包发布前必经）**：node 对 node_modules 下 .ts 一律拒绝剥类型（`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`，官方有意设计、无旗标逃生；端到端实测定案见 `docs/research/dsh-ts-loading/fr7-dsh-ts-loading-falsification.md`）——插件源码态保持 .ts（仓库零构建直跑不变），发布 tarball 必须 .js 形态。插件包自带 `prepack`/`postpack` 钩子（选 prepack：pnpm pack/publish 都执行，pack 产物即 .js）：prepack tsc emit `index.js` + 打包清单换载发布态（main → index.js、files → 编译产物 + cordis.patch.yml、不含 .ts 源码），postpack 还原仓库树（编译产物与清单备份经 .gitignore 兜底不入库）。publish 前对插件包 tarball 跑发布态校验：

```bash
node scripts/verify-bundle.ts --tarball <插件包 tarball>   # main 指 .js、files 白名单两件、无 .ts 源码、四要素齐备
```

**发布通道注记（2026-11-18，0.3.0/0.3.1 两版实证）**：`pnpm publish` 对 `@hankchen/dsh-mcp` 的 PUT 被 registry 以 404 `{"error":"Not found"}` 拒绝（账号/owner/registry 指向均核验正常：whoami hankchen、owner 同人、registry npmjs）；同 tarball 经 `npm publish <tgz> --access public` 成功——本仓插件包发布走 **npm CLI tarball 通道**（与根包 bin 门三步法同形态：`pnpm pack` → `verify-bundle --tarball` → `npm publish <tgz>`）。pnpm 侧 404 成因未深究（客户端 PUT 形态差异疑似），两道 git 门仍由 pnpm 前置把关时适用（干净树/分支门在 pnpm publish 路径上；npm publish 路径以提交前门禁与维护者纪律对齐）。

**双包发布顺序 = 先插件包，后初始化器。** 初始化器的菜单条目与安装转发都以 registry 包名为准——先发初始化器、插件包未上 registry，使用者勾选即装失败。命令序列（RQ2 件 2；`--access public` 必带，scope 包默认 restricted）：

```bash
# 前提：干净树 + master/main 分支（上方两道门）
pnpm --filter @hankchen/dsh-demo pack                          # prepack 钩子出 .js 形态 tarball
node scripts/verify-bundle.ts --tarball hankchen-dsh-demo-<版本>.tgz   # 发布态校验（上方一节）
pnpm --filter @hankchen/dsh-demo publish --access public   # 先发插件包
pnpm pack                                                  # 后发初始化器，对账先行
pnpm run verify:pack hankchen-infra-<版本>.tgz
pnpm publish --access public
git tag -a v<版本> -m "v<版本>" && git push origin v<版本>
```

（`pnpm run verify:pack` 传参不带 `--`：pnpm 12 起 `pnpm run` 原样转发 `--`，与 npm 不同，本机 12.15.0 实测。）

命令块末行的 `git tag` 与 `git push` 是人工门——须问人确认后再执行，不随上方命令批量粘贴；边界与完整检查单见 `/dev-release`（README「维护者：发布流程」同口径）。

发布初始化器前，对账在既有技能清单核对之外扩展三查，任一不满足拒绝发布（退出码 1）：

1. **包内 agents/*/plugins/ 清单 = 仓库 agents/*/plugins/ 清单**（与 skills 对账同法，按 `<宿主>/<插件目录名>` 复合键两侧同法构造，`scripts/verify-pack.ts` 的插件侧扩展）；
2. **包内禁 node_modules**——workspace 形态下 `pnpm install` 在成员目录生成的依赖目录若被 files 白名单卷入包，装出去即悬空链接/异机路径的结构性坏包；对账逐条列出即拒绝（RQ2 报告异常流 A #3 / 问④ f）；
3. **每个插件目录过 bundle 清单校验**——四要素齐备（§1.2）、`cordis.patch.yml` 引用名 = 包名、模块导出 name + apply。

技能侧既有对账行为不变。

### 1.5 新宿主接入模式

接入下一个 agent 宿主只做三件事，不改安装流程骨架（映射表表驱动，承 need 20261114-1f2f FR-4 既定扩展点）：

1. **映射表加一行 command 类行**。映射表每行声明「安装机制」——copy 类行（技能：文件拷贝 + 软链，落项目文件）行为不变；command 类行（插件：来源目录枚举 + 官方命令转发，不落项目文件）字段 = 类型名、来源目录（插件枚举根，两级枚举 `agents/<宿主>/plugins/`）。
2. **命令适配**。在命令组装处声明该宿主的官方安装命令形态（dsh = `plugin --profile <名> add <包>`，见 §2.3），前置检查与安装后对账的读法按宿主官方机制对应调整。
3. **插件包照抄本规范**。仓库布局、发布纪律照 §1.1–§1.4；§二 的运行时形态只对 dsh 有效，新宿主换成其官方格式逐字段重写。

来源目录缺失或条目身份缺陷（缺 package.json、package.json 非法、缺 `name` 字段——条目正名不可得）时，编目报错并列出缺陷清单，与技能编目同一错误口径；清单四要素的完整性校验归 §1.4 发布对账第二查（拒绝发布），不在编目时重复把关。

## 二、运行时形态（dsh 官方格式）

> 依据：need 20261115-339e 背景节内联查证 F1/F2（2026-11-15；官方文档与 `~/.dsh/profiles/desktop/package.json` 实测）。

### 2.1 插件是什么

dsh（DeepSeek Harness，everything-is-a-plugin 架构，基于 Cordis 框架）的一切组件皆插件，插件 = **npm 包**，导出 `apply(ctx)` 模块（`name` / `inject` 可选）。套件插件与 dsh 内生组件同构，官方命令可继续管理（开关/卸载）。

### 2.2 逐字段要求

| 字段 | 要求 | 依据 |
|---|---|---|
| package.json `dsh.bundle.patch` | 声明 `"dsh": {"bundle": {"patch": "./cordis.patch.yml"}}`，指向随包 patch 文件 | F1 |
| `cordis.patch.yml` | 随包携带，按包名引用自己 | F1 |
| 模块导出 | `apply(ctx)`（`name` 官方可选，套件约定必写） | F1 |
| `engines.dsh` | dsh 运行时版本强校验，不符需显式豁免 | F3 |

**缺 `dsh.bundle` 字段的后果**：装进 profile 只作普通依赖、不进插件树——官方警告原文「declares no dsh.bundle - installed as a plain dependency, not a profile layer」。这是 §1.2 四要素里 `dsh` 字段不能缺的原因。

### 2.3 安装机制与两处落点

官方安装命令：

```
dsh plugin --profile <名> add <包>
```

该命令转发 pnpm 把包安装进 `~/.dsh/profiles/<名>/`（`DSH_HOME` 可覆盖根目录），并把包名追加进该 profile 的 package.json——**两处落点**：

1. `dependencies` 出现该包的依赖行；
2. `dsh.profile.bundles` 数组追加该包名（有序清单）。

两处落点齐备 = 安装符合官方格式。初始化器安装后逐插件读 profile package.json 对账这两处，缺任一即报错并指明缺失落点与 profile 路径。

### 2.4 官方侧边界

- 安装前置：官方 CLI `@deepseek-ai/dsh` 要求 node ≥ 24.9.0（F4）；`dsh` 不在 PATH 时初始化器经 `npx @deepseek-ai/dsh` 转发同一条官方命令。
- profile 名 `desktop` 为官方保留名，官方 CLI 拒绝对其做插件管理（F4）；初始化器同样在执行前拒装（README「desktop 例外」）。
- 只采用 bundle 形态（npm 包 + dsh.bundle 清单）；repository 插件形态（`.dsh-plugin` 目录）不在套件范围（need 定稿拍板）。
- 插件卸载/升级由官方 `dsh plugin` 命令手动管理，套件不做 CLI 包装（need 非目标 5）。

## 三、照抄检查单（新插件包）

1. `agents/<宿主>/plugins/<目录名>/` 建完整 npm 包：package.json 过 §1.2 四要素 + `engines.dsh` + `description`；
2. 插件模块导出 `name` + `apply(ctx)`；`cordis.patch.yml` 以包名引用自己（照抄 `agents/dsh/plugins/dsh-demo/`）；
3. 发布面预编译照抄 demo 的 `prepack`/`postpack` 钩子（§1.4：emit 编译产物 + 清单换载/还原，devDependencies 自持 typescript）；同批登记 .gitignore：emit 产物（`index.js`）与清单备份不入库（demo 登记形态见仓库根 .gitignore 的 prepack 段）——漏登记则打包中途失败残留的产物会被提交入库；
4. **先发插件包**（pack 后过 `verify-bundle --tarball` 发布态校验，`pnpm publish --access public`，过 §1.4 两道 git 门），**再发初始化器**（§1.4 双包顺序）；
5. 初始化器发布对账三查过（§1.4）方可 publish。
