---
id: 20261115-339e
status: fulfilled
created: 2026-11-15
fulfilled: 2026-11-15
confirmed: 2026-11-15
---
# infra 第二类资产：agent 插件（首个宿主 DeepSeek Harness，demo 定规范）

## 背景与业务目标

`@hankchen/infra` 初始化器（need 20261114-1f2f，已 fulfilled）的资产模型是「资产类型 → 安装目标」映射表（src/asset-map.js）：可安装行只有技能（→ `.agents/skills/` + agent 目录软链），「规范」为占位行。发起人要求新建第二类套件资产：**agent 插件**——面向特定 agent 宿主的扩展包，首个宿主为 DeepSeek Harness（dsh，开源 agent harness，everything-is-a-plugin 架构）。本票以一个 demo 插件设定插件资产的规范，使后续接入其他 agent 宿主时按同一模式扩展（原话「现在新建第二类infra资源：agent的plugin，首个agent为DeepSeek Harness，先做一个demo插件，本票目的是以demo来设定规范，扩展到其他agent的功能设计，并搭配cli来安装」2026-11-15）。

规范拆两层（拍板 3=C）：a) **插件运行时形态**——对齐 dsh 官方插件格式（npm 包 + dsh.bundle 清单，查证 F1）；b) **套件侧生产约定**——插件源码在套件仓库怎么摆、清单怎么写、怎么发布，其他宿主照抄。

可验证目标：demo 插件作为独立 npm 包发布到 registry；使用者跑 `npx @hankchen/infra`，选「插件」类型、勾选 demo 插件、选定目标 dsh profile，CLI 转发官方安装命令（dsh 不在 PATH 时经 npx 运行官方包），安装后 profile 落盘形态与官方格式逐字段一致。**启用验证（在 dsh 内加载插件）不在本票验收线**（拍板 5）。不做的代价：infra 只能装目录拷贝型资产，接 agent 插件生态无统一路径，后续每接一个新宿主重新发明一遍。

**内联查证结论（2026-11-15）**：
- **F1** 官方插件格式：插件 = npm 包，导出 `apply(ctx)` 模块（可选 `name`/`inject`），package.json 声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`，随包携带 cordis.patch.yml（按包名引用自己）。无 `dsh.bundle` 字段的包装进 profile 只作普通依赖、不进插件树（官方警告：「declares no dsh.bundle - installed as a plain dependency, not a profile layer」）。
- **F2** 官方安装机制：`dsh plugin --profile <名> add <包>` 转发 pnpm 装进 `~/.dsh/profiles/<名>/`（DSH_HOME 可覆盖），并把包名追加进该 profile package.json 的 `dsh.profile.bundles` 有序清单。本机 `~/.dsh/profiles/desktop/package.json` 实测确认该清单形态。
- **F3** 版本兼容：`engines.dsh`（或 DSH peer range）对 dsh 运行时版本强校验，不符需显式豁免。
- **F4** 官方 CLI 在 npm：`@deepseek-ai/dsh` v0.2.2-rc.1，解包 76KB，engines `node >=24.9.0`；`desktop` 为保留 profile 名，官方 CLI 拒绝对其做插件管理。
- **F5** 本机环境实测：dsh 不在 PATH；`~/.dsh` 存在（仅 desktop profile）；node v22.23.4（低于 F4 engines 要求）；pnpm 12.15.0 可用；npm 候选名 `@hankchen/dsh-demo` 未占用（E404）；scope `@hankchen` 已实证可发布（need 20261114-1f2f A2）。

## 干系人与用户

| Actor | 要完成什么 | 成功标准 |
|---|---|---|
| 外部使用者 | 经 infra CLI 把套件插件装进本机 dsh profile | 交互流程（选类型 → 勾插件 → 选 profile）完成安装；profile 落盘形态与官方格式逐字段一致 |
| 套件维护者 | 以 demo 插件立规范（生产约定 + 运行时形态），维护插件包发布纪律 | 规范文档 + demo 源码可照抄出一个新插件；插件改动经发布进 registry 可被安装 |
| DeepSeek Harness（dsh 宿主） | 消费安装产物：profile 依赖 + bundles 清单 | 产物经官方 `dsh plugin add` 等价路径产生，官方命令可继续管理（开关/卸载） |
| 未来 agent 宿主 | 接入新插件格式时按映射表加行 + 照抄生产约定 | 映射表加行不改安装流程骨架（need 20261114-1f2f FR-4 既定扩展点） |

## 系统能力需求

- **FR-1** 「插件」成为映射表第二行（可安装），原「规范」占位行退到第三行（拍板 1）。两层菜单中「插件」类型下列出套件插件条目（原话「cli可以list已有插件」），支持批量勾选（原话「用户选择后(批量)」）。
- **FR-2** demo 插件为**独立 npm 包发布**（拍板 D1）：候选包名 `@hankchen/dsh-demo`（registry 未占用，F5）；内容为官方最小插件形态——导出 `name` + `apply(ctx)`（apply 打一条加载日志）+ `dsh.bundle.patch`/`cordis.patch.yml` 两清单文件（Q1 拍板 2026-11-15），即官方「Your first plugin」教程形态（F1）。
- **FR-3** infra CLI 把勾选插件经**官方命令**装进使用者选定的 dsh profile（拍板 D2）：dsh 在 PATH 时直接执行，不在 PATH 时经 npx 运行官方包 `@deepseek-ai/dsh`（原话「转发官方命令通过npx deepseek-ai/dsh来避免前置dsh不在PATH」）；目标 profile 由菜单列出 `~/.dsh/profiles/` 现有项供选或旗标指定（Q2 拍板 2026-11-15）；`desktop` 保留名 profile 拒装并提示（F4）。
- **FR-4** 规范两层落盘（拍板 3=C）：a) 套件侧生产约定文档——插件源码目录约定、package.json 清单要求、发布纪律、如何按映射表接入新宿主；b) 插件运行时形态——官方格式逐字段要求（F1）。demo 源码即活样例。
- **FR-5** 验收线 = **CLI 能装 + 落盘形态符合规范**（拍板 5）：安装完成后目标 profile 的 package.json 出现依赖行 + `dsh.profile.bundles` 追加行，与官方 `dsh plugin add` 行为逐字段一致；不在 dsh 内启动验证。
- **FR-6** 套件项目 node 基线整体升级至 node ≥24（fnm 管理），包 engines/CI 与文档前置要求随之对齐（原话「本级node环境通过fnm管理，可以把本项目的node环境整体升级到nodejs24以上」2026-11-15，逐字留痕；官方 dsh engines 前置见 F4）。

## 场景

**主流程（交互安装插件）**
- Given 使用者本机可访问 npm registry（~/.dsh 首装时可由官方流程初始化）
- When 跑 `npx @hankchen/infra`，第一层选「插件」，批量勾选 demo 插件，选定目标 profile
- Then CLI 转发官方命令安装（dsh 在 PATH 用 dsh；否则 `npx @deepseek-ai/dsh plugin --profile <名> add @hankchen/dsh-demo`）
- And 安装完成后目标 profile 的 package.json 依赖行与 `dsh.profile.bundles` 追加行符合官方格式（FR-5）
- And 提示启用方式在 dsh 侧验证（本票不做，非目标 2）

**异常流 A（node 版本不满足）**：`@deepseek-ai/dsh` engines `node>=24.9.0`（F4）。本机基线经拍板整体升级至 ≥24（FR-6）。When 使用者 node 低于要求，Then CLI 检出并提示升级路径；是否硬拦归 spec。〔指向 A1〕

**异常流 B（desktop profile）**：When 使用者选 `desktop`，Then 拒装并说明官方保留名行为（F4）。

**异常流 C（registry 不可达）**：插件包与官方 CLI 均经 npm registry 分发。When registry 受限，Then README 给缓解路径（承 need 20261114-1f2f 异常流 A 同款口径）。〔指向 A3〕

## 假设与风险

- **A1（风险）外部使用者的 node 版本前置**：F4 要求 node ≥24.9.0。本机验收环境已拍板整体升级至 ≥24（FR-6，2026-11-15），验收受阻面消除；残余为外部使用者 node 前置门槛——文档写明前置、CLI 检出提示（异常流 A），npx 在旧 node 上的实际表现由 spec 实测。不确定度：低。
  - 验证通过（验收 20261115-967d）：CLI 拦截实证（单测+e2e 零官方命令）+ 集成级 ≥24 真跑成功；残余：外部使用者旧 node 下 npx 实际表现未实测（CLI 拦截与文档指引兜住）。
- **A2（风险）官方格式/命令语法演进**：dsh 处快速迭代（v0.2.2-rc.1，社区帖记录 rc 版本碎片化踩坑）。代价：转发语法或校验器需跟进；不确定度：中。缓解：转发路线（拍板 D2）已把漂移面压到「命令组装」一处，不自实现落盘。
  - 验证通过（验收 20261115-967d）：集成级对官方 0.2.2-rc.1 真实命令实测通过；本轮实际发生一次格式漂移（patch 清单形态），被集成级测试拦截、经 fix 票 20261115-f158 修复（0.1.1），漂移面收敛假设成立。
- **A3（风险）新增网络依赖面**：安装链路新增三次 registry 访问——npx 拉 `@deepseek-ai/dsh`（解包 76KB，F4）、装插件包、pnpm 装 profile 依赖。代价：网络受限下安装失败面变大；不确定度：低（registry 本机可达有先例，need 20261114-1f2f A2）。缓解：README 缓解路径（异常流 C）。
  - 验证通过（验收 20261115-967d）：集成级真实联网跑成功；受限内网失败面本轮未模拟，由 README 缓解路径承载（残余风险留痕）。
- **A4（假设）官方 `dsh plugin add` 对已装包的幂等语义**：重复安装行为以官方命令为准，CLI 不自行去重。查证成本高（需真跑官方命令），转假设交 spec 实测。
  - 验证通过（验收 20261115-967d）：集成测试幂等段真实重装兑现——重复安装退出 0 无异常、依赖行与实装版本不变、锁文件恰一条无重复（need A4 实测义务闭环）。

## 残余风险与下一轮建议（round 1 验收折回，验收 20261115-967d passed）

- **残余风险 1（瑕疵）**：仓库无 CI 工作流配置，24 系基线缺自动回归门；后续贡献者本地环境漂移时全量测试可能静默退化。不阻塞 passed。
- **残余风险 2（非缺陷）**：外部使用者 node <24.9.0 时 npx 拉官方包实际表现未实测；安装链路三处 registry 访问在受限内网下的失败面未模拟（README 缓解路径承载）。
- **下一轮建议 1**：补最小 CI 工作流（node 24 + npm test）。
- **下一轮建议 2**：评审留痕的建议级事项集中处置一轮（plugin-assets.md 依据声明与锚点措辞、verify-bundle name 非字符串守卫、e2e plainText 抽共享助手等）。
- **下一轮建议 3**：spec「测试决策」补「集成测试随套件运行、以前置门 skip 兜底」口径声明。

## 范围与非目标

非目标（均已显式拍板或标注待确认）：
1. 插件真实功能设计——demo 纯演示最小内容，真实用途插件后续开新轮（拍板 4：原话「纯演示性最小内容（后续再开新轮设计真实用途的插件）」）。
2. 在 dsh 内启动/加载验证——启用验证留给 DeepSeek Harness 侧（拍板 5：原话「启用验证留给 DeepSeek Harness 侧」）。
3. 其他 agent 宿主的插件适配——本票只 dsh；扩展模式由规范承载，「扩展到其他agent」为后续轮。
4. repository 插件形态（`.dsh-plugin` 目录）——只做 bundle 形态（F5 对外分发主形态；定稿拍板 2026-11-15）。
5. 插件卸载/升级的 CLI 包装——官方 `dsh plugin` 命令本身可管理，本票只做安装流。
6. `desktop` profile 安装——官方保留名拒管（F4）。

## 开放问题

- **D1 拍板** → demo 插件独立 npm 包发布（原话「按独立npm包发布」2026-11-15；去向 FR-2、A3）。
- **D2 拍板** → CLI 转发官方安装命令，dsh 不在 PATH 时经 npx 运行官方包（原话「转发官方命令通过npx deepseek-ai/dsh来避免前置dsh不在PATH」2026-11-15；去向 FR-3、A1/A2）。
- **拍板** → 插件第二行、规范占位退第三行（答复 2026-11-15；去向 FR-1）。
- **拍板** → 规范两层都要：生产约定 + 运行时形态（答复「3、C」2026-11-15；去向 FR-4）。
- **拍板** → demo 纯演示最小内容（答复 2026-11-15；去向非目标 1）。
- **拍板** → 验收线=CLI 能装+落盘符合规范（答复 2026-11-15；去向 FR-5、非目标 2）。
- **Q1 拍板（定稿 2026-11-15）** → demo 内容=官方「Your first plugin」最小形态（去向 FR-2、非目标 1）。
- **Q2 拍板（定稿 2026-11-15）** → profile 选择=菜单列出/旗标指定两态，desktop 拒装（去向 FR-3、异常流 B、非目标 6）。
- **拍板（定稿 2026-11-15）** → 只做 bundle 形态，排除 repository 形态（去向非目标 4）。
- **拍板（定稿 2026-11-15）** → 「list已有插件」=菜单列出套件插件条目（catalog）供勾选，非已装管理面（去向 FR-1、非目标 5）。
- **拍板（定稿 2026-11-15）** → 项目 node 基线经 fnm 整体升级至 ≥24（去向 FR-6、异常流 A、A1）。

## 定稿记录

2026-11-15 念稿七节全貌，用户确认「确认」，并补拍板：本机 node 经 fnm 管理、本项目 node 环境整体升级至 nodejs 24 以上（FR-6）。Q1/Q2/非目标4/释义四条陈述句无纠错即成立。
