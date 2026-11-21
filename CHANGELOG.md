# Changelog

本项目的所有显著变更记录于此。
格式遵循 Keep a Changelog（https://keepachangelog.com），版本遵循语义化版本。

## [v0.5.0] - 2026-11-21

### Added

- dev-design 双形态重定位——新增**分析形态**（spec 20261120-fedf，need 20261120-3afe，票 20261120-8594，PR #321；验收 20261121-22fc passed，561 pytest + unit/e2e/typecheck 全绿）：输入 confirmed 的 need，信号清单亮牌 + 用户点名进入，探索代码库后以 mermaid 三视图（流程模型 / 对象模型 / 数据模型）起草系统分析，固定「缺口与矛盾」节，沿 need 场景逐条走查批准（第一道门）→ 状态 `analyzed` → 指路 dev-spec；**方案形态**保留现状（approved spec 后回补模块划分/数据流/seam/ADR，第二道门独立批准）——同一张 design 产物两段续写。方法内容依据调研报告 20261120-0b9e，参考层四分册落 skills/dev-design/references/{flows,objects,data,walkthrough}.md。外部人工校验：need 20261120-3afe 全量 FR-1~FR-10 逐条核销。

### Changed

- 下游四技能接线设计产物消费面（票 20261120-ca88，提交 2087328）：dev-plan / dev-implement / dev-review / dev-clarify 引用话术接 design 产物；dev-spec 入口补缺口节读取归置与偏离记录制接线（提交 1a7b999）——spec「实现决策」可引用设计结论，偏离记录显式豁免留痕。
- check.sh 机械面适配双形态（票 20261120-8594，提交 c0f9bcb）：design 词表加 `analyzed` 中间态并立 design frontmatter 三态校验（need 谱系必填），新形态产物过 validate / publish 不靠自觉。
- 契约面文档同步（票 20261120-f4ba）：蓝图 §6.1 design 行改双形态契约并新增修订记录 v1.42（12fea63）、§6.5 design 模板补分析段四节（5922256）、§8/§11.12 决策点改两道门（fd6411e）；METHOD §5 状态机表 design 行同步 `analyzed` 中间态（57f2381）；GLOSSARY 双份登记「分析形态/方案形态」词条 + design.analyzed 状态行（b32ccb0）；docs/skills.md dev-design 清单行改双形态描述（07d3c81）。

### Fixed

- 投影判定树 MCP 路径加 `TRACKER=codeup` 前置门（票 20261121-6089，PR #323，提交 58c4a5c/0925396；评审 20261121-a2f8 阻断项修复）：TRACKER≠codeup（github/gitlab/local）的项目一律走对应 REST 适配器，即使会话挂了 Codeup MCP 工具也不走 MCP 路径。此前三级判定树第一级只看「会话检测到 Codeup MCP 工具」，全局配了云效 MCP 的用户任何 TRACKER 的项目 publish 都先执行 MCP 发现链（组织/空间/类型/负责人多次调用），产物可能投错目标（本仓库 TRACKER=github 实况复现：开票投影投向云效）。守 spec 20261119-20b1 非目标「github/gitlab 腿零改动」承诺。改动面：METHOD §7.1 判定树 + 七技能 publish 投影引用话术（PUBLISH_CITATION 同步契约对）+ 蓝图 v1.43 修订记录；静态守护测试契约升级——test/unit/codeup-projection-sync.test.ts 先红 5（判定树无门/七技能旧话术/无 v1.43）后转绿 13/13。

## [v0.4.0] - 2026-11-20

### Added

- Codeup MCP 投影路径——codeup 腿三级判定树（spec 20261119-20b1 FR-1/FR-3，票 20261119-2521，提交 a43b2c6/7636e8f）：TRACKER=codeup 时会话检测到 Codeup MCP 工具即走 MCP 路径（零 REST 配置——组织经 `get_current_organization_info`、空间按仓库名 `search_projects` 自动匹配（唯一命中直用/多命中问人并回写 `TRACKER_REPO` 记忆化）、Req 默认类型与当前用户负责人均由 MCP 工具发现）；未配 MCP 回落 REST 适配器同口径；路径失败警告跳过 exit 0、投影永不断出口链。判定树单点落 docs/METHOD.md §7.1「投影约定」+ 蓝图 v1.41（§5.4/§11.1/§14），七技能 publish 步骤引用话术（d7dc245）。外部人工校验：另一真实项目（已装本套件）开单实测 MCP 投影云效正确。
- codeup 腿产物终态同步关闭云效工作项（FR-5，a43b2c6）：产物 status 终态（GLOSSARY 终态集合 8 态）→ 已完成 100014、rejected → 已取消 141230（2026-11-19 需求工作流 `get_work_item_workflow` 一手实探 + UpdateWorkitem 官方文档核验；REST 路径用系统内置 ID，MCP 路径经 nameEn 解析回落内置 ID）。github 腿同款语义 v1.40 已有，本轮补齐 codeup 腿。

### Changed

- codeup.sh 适配器投影形态新口径（FR-2/FR-4/FR-6，a43b2c6）：由「全产物各自独立 Task 单」改为 need → Req 类需求单、带 need 谱系前缀的 spec/design/adr/research → 对应需求单下追加 MARKDOWN 评论（首行盘上指针行 + 全文，60000 字节超限截断注记）、票与过程档及无谱系独立知识档不投（stderr 说明后 exit 0）；幂等靠两路径共用映射文件 `codeup.map`（三字段契约不变，知识档行第二列记承载 need 的工作项标识），重复投影一律追加评论不新建。`CODEUP_WORKITEM_TYPE` 配置语义由 Task 类类型标识变更为需求类（Req）类型标识——已配四项 REST 的项目升级后需手动更新该值（经 MCP `get_work_item_types(category=Req)` 一次查得）；MCP 路径项目零配置零动作。
- setup-workspace 决策 1 Codeup 分支改「MCP 优先（零配置）+ 适配器兜底（三项 REST 配置）」（FR-7，8b3ba66）：decisions.md / SKILL.md / generation.md 同步，assets/trackers/codeup.sh 与 `.sdlc/trackers/codeup.sh` 双副本同文（cmp 逐字校验 + 静态断言常驻）。
- GLOSSARY「投影」「映射文件」词条随形态变更修订（7636e8f）：codeup 终态关闭补齐、投影约定引用 METHOD §7.1。

### Fixed

- legacy 守护套件 codeup 节同批重指向新契约（a43b2c6，spec 20261119-20b1 测试决策 round 1 缺口处置 d3242e6）：12 条断言保留 case id 与流结构重指向 need 夹具（建单/评论/映射/幂等），新增「无谱系知识档跳过 + 零平台调用」2 条——非删测非改弱；test/unit 新增适配器进程替身（假 curl，11 断言）与技能文档同步静态断言（10 断言）两文件常驻守护。

## [v0.3.0] - 2026-11-20

### Added

- 初始化器 `plugin add` 装后就绪核验（spec 20261119-7a9a FR-4/FR-5/FR-6，票 20261119-9bd3；新增 `src/kernel/readiness.ts` 窄接口内核）：装完插件即对账目标 profile 的运行时 dsh 版本与 manager 解析版——精确同版通过并在完成摘要报告两版本号；非精确同版或缺副本退出非零并输出三段可复制处方（profile 级依赖覆盖写法 / manager 补装命令 / 插件管理器重载指引，与插件 README「已知边界」恢复配方逐段一致）；探测失败降级警告继续安装、不虚构通过。核验仅对 `@hankchen/dsh-mcp` 触发，其余插件行为零变化；manager 副本落点经本机 desktop profile（2026-11-19 事故现场）一手探针实证留痕。

### Changed

- `@hankchen/dsh-mcp` 0.3.3：插件剥离 `@deepseek-ai/dsh-mcp-manager` 依赖副本——`dependencies` 键整体移除、兼容意图改可选 peer（`peerDependencies` `^0.2.2-rc.2` + `peerDependenciesMeta.optional`），任何安装形态装插件不再使 profile 依赖树出现 manager 副本，从根上杜绝「依赖副本劫持官方 manager 行解析」的 desktop 事故（spec 20261119-7a9a FR-1，票 20261119-f3e4；ADR 20261120-5606 取代 ADR 20261118-ad91 决策 1）。registry 已烧 0.3.2 仍为事故依赖面，升 0.3.3 后即修复
- 初始化器放行 desktop profile 插件安装：保留名拒装分支删除，`plugin add --profile desktop` 带名与交互勾选两路径放行，官方命令转发/两落点对账/锁文件记账照旧（官方 CLI 2026-11-19 实证已放行 desktop 插件管理，need 339e F4 拒装结论失效；spec 20261119-7a9a FR-3，票 20261119-443c）
- verify-bundle 双态判定单点固化依赖面常驻拒绝校验：任何插件 bundle `dependencies` 携带 `@deepseek-ai/dsh-mcp-manager` 即缺陷（源码态与 tarball 发布态同查，verify-pack 复用同一判定函数），缺陷信息引用 desktop 事故（falsified-form-gate 证伪形态常驻门；票 20261119-f3e4 评审阻断 1 修复）
- 就绪核验版本解析整行锚定 + 集成守卫 IO 错收窄：非法变体（截段/日期横幅错位）不再被静默接受为运行时版本；`scanManagerCopies` 只容忍根调用 ENOENT，其余 IO 错带路径上抛，消除 FR-1 集成级守卫假绿面（票 20261119-9bd3/d0ff 评审阻断修复，red-green 实证）

### Fixed

- `@hankchen/dsh-mcp` 0.3.3：README「已知边界」随依赖剥离对齐——副本劫持改述为历史形态、挂载行表述去依赖歧义（票 20261119-f3e4）

## [v0.2.4] - 2026-11-19

### Changed

- 随包插件树与流程文档更新：spec 20261119-7a9a（manager 依赖与宿主运行时解耦 round 2）批准落盘（issue #301）；README「已知边界」补 manager 版本对齐三联征与恢复配方、desktop 直装放行修正（c6a4a83）；design 0004 间距注记修订（53c113c）

### Fixed

- `@hankchen/dsh-mcp` 0.3.2：Dock 页面板卡外边距 8px——宿主侧栏容器自身零 padding，面板卡贴边呈现、边距 ≈0（用户截图实测；53c113c，样式契约断言钉值防回归）
- `@hankchen/dsh-mcp` 0.3.2：`/mcp add` 选项值含引号在添加期拒收并提示复杂值入口——此前引号原样入库、值内空格劈裂选项，失败延迟到连接期才暴露（7a25c54，red-green 单测）

## [v0.2.1] - 2026-11-17

### Fixed

- 发布 bin 元数据脱钩：`npm publish` 目录直发在打包后重读磁盘清单作上传元数据，registry 0.2.0 元数据 bin=`bin/infra.ts` 而 tarball 包内已换载为 `bin/infra.js`，npx 按元数据建 bin 链接即挂 `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`（票 20261116-c1d6）——修复：verify-pack 新增常驻 bin 查（包内清单 bin 必须指 `.js` 且目标在包内）+ `prepublishOnly` 门封死目录直发（npm/pnpm 双通道实证均被拦），唯一放行通道改 tarball 三步 `pnpm pack → pnpm run verify:pack <tgz> → npm publish <tgz>`；maintainer-guide 与 ADR 20261115-f143 附注同步发布通道

## [v0.2.0] - 2026-11-16

### Added

- `skill add [名...]` 子命令：带名免交互安装（空格 variadic 与逗号分隔双收、并集保序去重）、`--all` 全装、无参 PTY 条目多选、取消/空选零落盘、未知名列可用清单、跨包版本重跑刷新、软链冲突跳过（spec 20261116-2c58 FR-1/FR-4，票 20261116-f761）
- `plugin add [名...] --profile <名>` 子命令：无参交互（插件多选 + profile 单选/无既有项输入新名）、无名预置 profile、缺 `--profile` 三行结构报错、`desktop` 官方保留名拒装 shim 零调用、dsh 不在 PATH 自动 npx 回退、装后对账 + 锁文件记账（spec 20261116-2c58 FR-1/FR-4，票 20261116-ccfb）
- 分级帮助：顶层 `--help`（含 `skill add` / `plugin add` 用法示例）+ 逐命令 `--help`；裸跑 / `skill` / `plugin` 无动词打印对应层级帮助退出 0；非 TTY 交互守卫文案（spec 20261116-2c58 FR-1/FR-3，票 20261116-f761/bfcf）
- src 三层分层：`src/program.ts` 程序装配层 / `src/commands/<命令>/` 命令定义层 / `src/kernel/` 安装内核层，「新增子命令 = 加命令目录 + 装配层注册一处」由分层契约测试守护（spec 20261116-2c58 FR-5，票 20261116-1875/f761；ADR 20261116-af69）

### Changed

- **破坏性**：命令面硬切子命令形态——旧旗标 `--all` / `--skills` / `--plugins` 退役，改按未知旗标口径报错并指路 `--help`；两层交互菜单与旧旗标解析状态机整体退役（spec 20261116-2c58 FR-2 拍板 D3，票 20261116-bfcf）
- README 与 docs/getting-started 命令示例改子命令形态，含 0.1.x 升级叙事（重跑 `skill add` 即刷新）；GLOSSARY 安装器词条补子命令描述（spec 20261116-2c58 FR-6，票 20261116-bfcf）
- 包版本 0.1.1 → 0.2.0（0.x minor 承载破坏性变更，need A1；票 20261116-bfcf）

### Fixed

- setup-workspace 门禁遗留哨兵（run-tests.sh:3435）断言锚随内容迁往 docs/getting-started.md——README 拆分（324332f）遗留的 `check.sh all` 红灯（票 20261116-ae48）

## [v0.1.1] - 2026-11-16

### Added

- agents/`<宿主>`/`<机制>`/ 两级扩展布局：包分发面随 `agents` 目录全量（files 白名单 `plugins` → `agents`），demo 插件迁位 `agents/dsh/plugins/dsh-demo/`，新宿主接入只加映射行（need 20261115-fc48 FR-1/FR-3，票 20261115-30f2）
- 发布面预编译管线：根包与插件包 prepack/postpack 钩子（tsc emit 同路径 .js 进 tarball + 打包清单换载/还原；spec 20261115-f650 D8 修订与 FR-7 回退，票 20261115-d437/cf39）
- CI 回归门 workflow（push/pull_request 触发：frozen 安装 → typecheck → 全量测试 → pnpm pack 后对账三查；spec 20261115-f650 FR-2，票 20261115-52d5）

### Changed

- 依赖管理 npm → pnpm workspace：双锁切换、`packageManager` 钉 12.15.0、CI frozen 安装（need 20261115-fc48 FR-4，票 20261115-d5f4）
- CLI 旗标解析 commander 15 承载，手写 cli-args 退役——对外文案/行为逐字节不变（FR-5 防线十六案例矩阵守护，FR-8，票 20261115-eed0）
- 发布对账扩展「包内禁 node_modules」查（RQ2 异常流 A）+ 对账键升级 `<宿主>/<插件目录>` 复合键（票 20261115-d5f4/30f2）

### Fixed

- 插件包 .ts 直发形态被宿主拒载（FR-7 端到端证伪：ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING）→ 发布 tarball 预编译 .js 形态，registry `@hankchen/dsh-demo@0.1.1` 真装真启动实证（票 20261115-cf39，run 43792529968）
