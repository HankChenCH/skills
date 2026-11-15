---
id: 20261115-495e
status: done
need: 20261115-339e
round: 1
created: 2026-11-15
approved: 2026-11-15
done: 2026-11-15
---
# infra 第二类资产「插件」：dsh demo 插件 + 命令转发安装（round 1 全 FR）

## 问题陈述

`@hankchen/infra` 初始化器目前只能安装目录拷贝型资产（技能 → `.agents/skills/` + 软链）；agent 宿主的插件生态接入没有统一路径（need 20261115-339e 背景）。首个宿主 DeepSeek Harness（dsh）的官方插件是 **npm 包**（dsh bundle：package.json 声明 `dsh.bundle.patch` + 随包 `cordis.patch.yml`，need F1），装进 `~/.dsh/profiles/<名>/` 依赖官方命令 `dsh plugin --profile <名> add <包>`（need F2）——安装机制是「包安装 + 清单编辑」，与技能的「文件拷贝 + 软链」根本不同；且官方 CLI 本体 `@deepseek-ai/dsh` 不一定在使用者 PATH 上（本机实测不在，need F5）、要求 node ≥24.9.0（need F4，本机 v22.23.4）。缺一条「以 demo 插件立规范、CLI 可装、落盘可对账」的通路，后续每接一个新宿主都要重新发明。

## 方案

round 1 = need 全 FR 最小闭环（need FR-1～FR-6）：

1. **demo 插件**（need FR-2）：新建独立 npm 包 `@hankchen/dsh-demo`（registry 未占用，need F5 实测），内容 = dsh 官方「Your first plugin」最小形态——`name` + `apply(ctx)` 打一条加载日志 + `dsh.bundle.patch`/`cordis.patch.yml` 两清单文件；源码以完整包形态放套件仓库 `plugins/dsh-demo/`（ADR 20261115-f143 包根=仓库根：`files` 清单加 `plugins` 即随包分发，对账结构性成立）；独立发布 npm registry。
2. **映射表加行 + 行模型扩展**（need FR-1）：映射表行新增「安装机制」维度——copy 类行（技能，行为不变）与 command 类行（插件：目录枚举 + 官方命令转发，不落项目文件）；「插件」为第二行，「规范」占位退第三行。
3. **CLI 命令转发安装**（need FR-3）：交互路径「插件」类型下批量勾选 → 选目标 profile → 逐条转发官方命令（`dsh` 在 PATH 直接执行；不在 PATH 组装 `npx @deepseek-ai/dsh plugin --profile <名> add <包>`）；免交互旗标 `--plugins`/`--profile`；node 版本前置硬拦；`desktop` 保留名拒装；安装后读 profile package.json 对账两处落点（依赖行 + `dsh.profile.bundles` 行）。
4. **规范两层落盘**（need FR-4）：新增插件生产约定文档（源码布局、清单逐字段、发布纪律、新宿主接入模式）+ README 插件安装故事；demo 源码即活样例。
5. **node 基线升级**（need FR-6，前置）：项目 node 基线整体升 ≥24（fnm 管理），包 engines/CI 对齐。

分轮拍板依据：need A1（node 前置）代价最高且是其余一切的前提，FR-6 必须前置进本轮；A2（官方格式演进）由「转发官方命令」把漂移面压到命令组装一处，不需要拆轮防御；A3/A4 是低不确定度残余，验收实测即可。除 demo 插件外不做任何真实功能插件（need 非目标 1）。

## 用户故事

- 作为外部使用者，我想在两层菜单选「插件」批量勾选套件插件并选定 dsh profile 一键安装，以便不读 dsh 文档也能接入插件。
- 作为外部使用者，我想在 dsh 不在 PATH 时安装器自动改用 npx 运行官方命令，以便不预装全局 dsh 也能装插件。
- 作为外部使用者，我想在 node 版本不满足时第一时刻被拦下并拿到升级指引，以便不浪费一次注定失败的 npx 拉取。
- 作为外部使用者，我想在安装完成摘要里看到「依赖行 + bundles 行」两处落点的对账结果，以便确信落盘形态符合官方规范。
- 作为外部使用者，我想用 `--plugins`/`--profile` 旗标免交互安装，以便脚本化复现同一套插件安装。
- 作为套件维护者，我想让 demo 插件源码 + 生产约定文档成为照抄模板，以便接入下一个 agent 宿主时只加映射行与适配说明。
- 作为套件维护者，我想让插件发布前有机械校验（bundle 清单四字段齐备 + 包内/仓库内容对账），以便发出去的插件包永不含坏清单。
- 作为套件维护者，我想让项目 node 基线升到 ≥24，以便官方 dsh 的 engines 前置在开发与验收环境成立。

## 实现决策

- **插件包形态（need FR-2）**：`@hankchen/dsh-demo`，语义化版本独立演进（首发 0.1.0）；package.json 四要素——`type: module` + `main` 直指插件模块 + `files` 含 `cordis.patch.yml` 与模块文件 + `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`；`cordis.patch.yml` 以包名 `@hankchen/dsh-demo` 引用自己（insert 行 id 归 design）；插件模块导出 `name` 与 `apply(ctx)`，apply 行为 = 打一条含插件名的加载日志；`engines.dsh` 声明兼容范围（具体范围归 design，发布前对官方当前版本核验，need F3）。
- **仓库布局随 ADR f143**（need FR-2）：仓库根 `plugins/<插件目录名>/` 各自是完整 npm 包；包 `files` 清单加 `plugins`（与 skills 同法，新增资产自动随包分发）；发布对账扩展两查——包内 plugins/ 清单 = 仓库 plugins/ 清单；每个插件目录过 bundle 清单校验（四要素齐备、patch 引用名 = 包名），任一不满足拒绝发布。
- **映射表行模型扩展（need FR-1）**：每行声明安装机制——copy 类行维持现有四字段与行为（技能不变）；command 类行字段为类型名、来源目录（枚举插件目录）、条目正名取各包 package.json `name`（非目录名，安装按 registry 名转发）；新增 command 类宿主 = 加行，不改安装流程骨架（表驱动性质保持，need 20261114-1f2f FR-4 扩展点）。占位行机制不变（「规范」退第三行）。
- **插件编目（need FR-1）**：command 类行的菜单条目来自来源目录下各插件包的 package.json——`name` 为条目正名、`description` 为菜单提示；目录缺失/包不完整时报错并列出缺陷（同技能编目的错误口径）。
- **命令组装与执行（need FR-3，拍板 D2）**：组装器产出官方命令 `plugin --profile <名> add <包名>`，执行体二选一——`dsh` 可执行文件在 PATH 则直接执行；否则以 `npx @deepseek-ai/dsh` 为执行体（`--yes` 免确认拉取与否归 design）；执行体可注入，测试不实跑官方命令。批量 = 勾选多条逐条顺序执行，单条失败即中止并报告已完成/未完成清单。
- **前置检查（need FR-3，异常流 A/B）**：node 版本 < 24.9.0 → 拒装，报当前版本与升级指引（fnm/nvm 命令示例）；目标 profile 名 = `desktop` → 拒装并说明官方保留名行为（need F4）；两检查在执行官方命令前发生。
- **profile 解析（need FR-3，Q2 拍板）**：profile 根 = `$DSH_HOME/profiles/`（缺省 `~/.dsh/profiles/`）；交互路径列出既有 profile 供选（目录名排序），无既有项时提示可输入新名（官方流程会初始化 base-backed profile，need F2）；免交互路径 `--profile <名>` 必填（插件安装缺它即报错并列出既有项）。
- **安装后对账（need FR-5）**：逐插件读目标 profile 的 package.json 断言两处落点——dependencies 含该包、`dsh.profile.bundles` 数组含该包名；齐备 → 摘要记成功并记实际落盘版本；缺任一 → 报错指明缺失落点与 profile 路径。摘要与技能路径同风格（装了什么、装到哪个 profile、对账结果、锁文件记账提示）。
- **锁文件多类型（承 need FR-5）**：`.infra-lock.json` 增插件区——逐插件记 包名/版本/profile/安装时间；技能区结构与既有语义不动；重跑安装同一插件 = 再次转发官方命令、以官方幂等语义为准（need A4），锁文件按对账结果刷新。
- **非交互旗标（need FR-1/FR-3）**：新增 `--plugins <名[,名...]>` 与 `--profile <名>`（两者配对用于插件安装，可重复出现取并集的规则与 `--skills` 同构）；`--all` 语义维持「技能全部条目」不变（避免无 profile 时插件安装被隐式触发）；`--help` 列新旗标与插件安装示例。
- **规范文档（need FR-4）**：新增《插件资产规范》文档两层内容——生产约定（仓库布局、清单四要素、发布纪律双包顺序：先插件包后初始化器、新宿主接入模式 = 加映射行 + 命令适配）与运行时形态（dsh 官方格式逐字段，引 need F1/F2 为据）；README 增插件安装故事（两层菜单用法、`--plugins`/`--profile` 示例、node ≥24.9.0 前置、registry 受限缓解路径、desktop 例外）；文档落点与 README 段落结构归 design。
- **node 基线（need FR-6）**：包 `engines.node` 升 `>=24.9.0`（与官方 dsh engines 对齐）；版本声明文件（`.nvmrc`/`.node-version` 之一）与 CI 运行时同步；现有全量测试在新基线通过（迁移中暴露的兼容问题就地修）。
- **测试 seam**：①映射表行模型与机制分发；②插件包 bundle 清单校验器；③命令组装器（PATH 探测、npx 回退形态、profile/desktop/node 三前置判定、批量顺序）；④profile 列举（DSH_HOME 覆盖）；⑤安装后对账读取；⑥锁文件多类型读写；⑦插件编目；⑧旗标扩展解析（`--plugins`/`--profile` 配对与互斥）。

## 测试决策

- seam 清单见实现决策末条（①～⑧）；既有先例 = spec 20261115-8975 的四 seam 单测 + 临时目录端到端（node:test，不 mock 文件系统），插件侧沿用同一纪律。
- 命令组装与前置检查以注入执行体断言「组装出什么命令、何时拒」，不真跑官方命令；profile 对账以 fixture profile 目录断言读写行为。
- 真实官方命令端到端（含官方幂等语义实测，need A4）为集成级：临时 `DSH_HOME` + 真实 `dsh`/npx 执行体 + 已发布的 `@hankchen/dsh-demo`，需 node ≥24 环境、registry 可达——作为验收阶段承载票执行（见验收场景末条），不在常规单测/端到端组内。

## 验收场景

- [FR-1 | 工单级] Given 两层菜单第一层，When 检视类型项，Then 「插件」可选、「技能」行为不变、「规范」显示占位不可选且位列第三。
- [FR-1 | 工单级] Given 选「插件」类型，When 第二层展示，Then 条目 = demo 插件（正名为包名 `@hankchen/dsh-demo`，提示为包 description），支持空格多选批量勾选。
- [FR-3 | 工单级] Given 勾选插件与目标 profile，When 确认安装且 `dsh` 在 PATH，Then 按条目顺序逐条执行 `dsh plugin --profile <名> add @hankchen/dsh-demo`；`dsh` 不在 PATH 时执行体为 `npx @deepseek-ai/dsh`（执行体注入断言组装形态，不实跑）。〔实际边界（验收 20261115-967d）：官方落盘 profile 依赖行为语义化范围（实测 `^0.1.1`）非精确版本，对账与锁件记录实际落盘原文。〕
- [FR-3 | 工单级] Given `$DSH_HOME` 指向临时目录且其 profiles/ 下有 ≥2 个 profile，When 交互选择目标 profile，Then 列表为该目录既有项按名排序；选 `desktop` 则拒装并说明官方保留名行为，进程不进入安装。
- [FR-3 | 工单级] Given node 版本 < 24.9.0（可用注入或环境模拟），When 发起插件安装，Then 拒装并报当前版本与 fnm/nvm 升级指引，不执行任何官方命令（need 异常流 A）。
- [FR-1 | 工单级] When 带 `--plugins @hankchen/dsh-demo --profile <名>` 跑，Then 免交互完成与交互路径一致的安装；缺 `--profile` 则报错并列出既有 profile；`--help` 列两旗标与示例。
- [FR-5 | 工单级] Given fixture profile（package.json 已含依赖行与 `dsh.profile.bundles` 行），When 运行安装后对账，Then 摘要记成功并记录实际落盘版本；Given fixture 缺 bundles 行，Then 报错指明缺失落点与 profile 路径（need 异常流 C 的失败呈现口径同此条）。
- [FR-5 | 工单级] When 安装完成，Then `.infra-lock.json` 插件区出现该插件（包名/版本/profile/安装时间），技能区既有条目不变；重跑安装后插件区按对账结果刷新、无重复条目。
- [FR-2 | 工单级] Given demo 插件目录，When 运行 bundle 校验器，Then 四要素（`dsh.bundle.patch`、`files` 含 cordis.patch.yml、patch 引用名 = 包名、模块导出 name+apply）齐备即通过；人为移除任一要素即拒绝并列出缺陷。〔实际边界（验收 20261115-967d）：cordis.patch.yml 须为官方 loader 可解析的顶层数组形态（PatchOptions[]，insert 元素 id+name 必填）——0.1.0 顶层映射形态被官方拒装，经 fix 20261115-f158 修复；校验器增核该结构。〕
- [FR-2 | 工单级] When 检视发布对账，Then 包内 plugins/ 清单 = 仓库 plugins/ 清单，且每个插件目录过 bundle 校验，不满足即拒绝发布（现有 skills 对账行为不变）。
- [FR-4 | 工单级] Given 《插件资产规范》文档，When 检索，Then 含生产约定（仓库布局、清单四要素、双包发布顺序、新宿主接入模式）与运行时形态（dsh 格式逐字段）两层；Given README，When 检索插件安装，Then 有两层菜单用法、`--plugins`/`--profile` 示例、node ≥24.9.0 前置、registry 受限缓解路径、desktop 例外（need 异常流 A/B/C 对外口径）。
- [FR-6 | 工单级] When 检视仓库基线声明，Then 包 engines.node = `>=24.9.0`、版本声明文件与 CI 运行时同步为 24 系；且现有全量测试（技能侧 49 例 + 本轮新增）在新基线全绿。
- [FR-5 | 集成级 | 承载票 NNNN] Given node ≥24 环境、registry 可达、`@hankchen/dsh-demo` 已发布、临时 `DSH_HOME`，When 经 CLI 真实执行安装（npx 执行体形态），Then 官方命令成功、profile package.json 两处落点齐备、锁文件插件区记录、完成摘要对账成功；重复安装一次，Then 以官方幂等语义为准且无异常（need A4 实测）。
- [FR-2 | 集成级 | 人工：npm publish 属单向门，发布动作在验收时点由维护者执行] Given `@hankchen/dsh-demo` 已发布，When `npm view @hankchen/dsh-demo` 与 registry 对账，Then 版本与仓库 plugins/dsh-demo/package.json 一致。

## 非目标

- 插件真实功能设计——demo 只打加载日志（need 非目标 1）。
- 在 dsh 内启动/加载插件的验证——启用验证归 dsh 侧（need 非目标 2；集成级端到端止于落盘对账）。
- 其他 agent 宿主的插件适配——规范文档承载接入模式，实现留后续轮（need 非目标 3）。
- repository 插件形态（`.dsh-plugin` 目录）——只做 bundle 形态（need 非目标 4，定稿拍板）。
- 插件卸载/升级的 CLI 包装——官方 `dsh plugin` 命令手动可管（need 非目标 5）；`--all` 不扩展到插件。
- `desktop` profile 安装（need 非目标 6）。
- update/remove/list 专项子命令（承 spec 20261115-8975 非目标，本轮不因插件类型重启该议题）。

## 备注

- 溯源：need 20261115-339e（confirmed 2026-11-15，issue #218）；D1（独立 npm 包）/D2（转发官方命令经 npx）/Q1/Q2/释义五项拍板见 need 开放问题节；官方格式事实 F1–F5 与查证出处见 need 背景节。
- ADR 延续：20261115-f143 包根=仓库根（plugins/ 入 files 清单即随包分发）；发布纪律（对账 → 版本 → publish → annotated tag）沿既有流程扩展双包顺序。
- 分轮拍板：round 1 = 全 FR（FR-1～FR-6），FR-6 node 基线为前置票（2026-11-15 用户念稿批准；依据——need A1 node 前置代价最高且为前提，A2 漂移面已被转发路线压到命令组装一处，A3/A4 验收实测即可）。
- 实现细节选型（patch 行 id、engines.dsh 具体范围、npx `--yes` 与否、文档落点、CI 具体动作）归 design 阶段定稿，本 spec 只锁契约。
