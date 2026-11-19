---
id: 20261119-20b1
status: approved
approved: 2026-11-19
need: 20261119-8458
round: 1
created: 2026-11-19
---
# codeup 投影 MCP 路径与同口径改造（need 建单 / 知识档评论 / 票不投）

## 问题陈述

作为在云效 Codeup 托管产物出口的仓库主人，我在会话里配了 Codeup MCP 后，投影仍被逼走 REST 直连：四项配置（`TRACKER_REPO`、`CODEUP_TOKEN`、`CODEUP_ASSIGNEE`、`CODEUP_WORKITEM_TYPE`）任一缺失，`check.sh publish` 只会警告跳过，云效侧什么都没有；而 MCP 工具明明能自动发现组织、项目、需求类型与负责人。同时现行「全产物各自独立 Task 单」的投影形态不符我对云效侧的期望——need 应是一张需求单，spec 是单下的评论，票是过程档不该进云效。投影这条审计链腿在我真实使用的仓库里实际是断的。

## 方案

把 codeup 投影改成双路径同口径：**会话检测到 Codeup MCP 工具即走 MCP**（零 REST 配置——组织与空间由 MCP 发现，空间按仓库名自动匹配、多命中问人并回写记忆化；类型与负责人由 MCP 查询），未配 MCP 回落 REST 适配器（三项配置照旧）。两路径统一新投影形态：need → 云效需求单（Req 类）；spec 与带 need 谱系前缀的 design/adr/research → 对应需求单下追加评论；票与独立知识档不投。产物 status 终态时两路径同步把需求单置 `已完成`（`rejected` 置 `已取消`）。幂等靠两路径共用的映射文件。投影约定（判定树）单点写进 METHOD，各技能 publish 步骤引用之，setup 决策 1 话术与蓝图/METHOD/GLOSSARY 同批修订。

## 用户故事

- 作为配了 Codeup MCP 的仓库主人，我想在 need/spec 落盘后云效侧自动出现需求单与评论、全程零 REST 配置，以便审计链不断而我不必人肉凑配置。
- 作为仓库主人，我想让 need 在云效是一张需求单、spec 与知识档是单下评论，以便云效侧结构与我的需求管理直觉同构，而不是一地散票。
- 作为仓库主人，我想让票与独立知识档留在盘上不进云效，以便过程档语义（盘上存在、清扫删除）在平台侧同样成立。
- 作为仓库主人，我想让产物终态时云效需求单自动置完成/取消，以便投影生命周期闭环，不用人工补关。
- 作为流程技能（dev-clarify/spec/plan/accept/ship/fix/quick-implement），我想让 publish 在任何路径失败时警告跳过不断链，以便落盘流程永远走得完。
- 作为 AI 执行者，我想要单点定义的投影判定树而非各技能复述，以便规则漂移只改一处。

## 实现决策

1. **投影约定单点定义**：三级判定树「会话有 Codeup MCP 工具 → MCP 路径；无 → REST 适配器路径；路径失败 → 警告跳过 exit 0」写进 METHOD（流程规则唯一来源）与蓝图 §5.4，各技能 publish 步骤只写「按投影约定执行 + 会话自查 MCP」一句话引用，不复制判定树全文。
2. **MCP 路径发现链**：`get_current_organization_info` 取组织；坐标优先取 config.sh `TRACKER_REPO`（既有键，语义 org/space 不变）；未配置则 `search_projects` 按仓库名与项目自定义码匹配——唯一命中直接用，多命中列出候选名让用户选，零命中问用户；选定后回写 config.sh `TRACKER_REPO` 记忆化（config.sh 归用户所有的既有所有权不变，回写可删）。类型经 `get_work_item_types(category=Req)` 取 `defaultType` 项；负责人经 `get_current_user` 取当前用户。
3. **投影形态（两路径同口径）**：need → Req 类需求单（标题 = 产物一级标题）；spec、design、adr、research 中带 need 谱系前缀者 → 对应需求单下追加 MARKDOWN 评论；票（docs/tickets/ 产物）与无谱系独立知识档不投，stderr 分别说明「过程档不入云效」「无 need 谱系」后 exit 0。评论正文与现行同构：首行盘上指针行 + 产物全文，超限截断并注记（上限沿用 60000 字节保守值）。
4. **幂等共账**：映射文件三字段契约不变（盘上相对路径 / 工作项标识 / 对象 URL），两路径共用；MCP 路径由 agent 会话内按同格式追加。知识档映射行的第二列记其承载 need 的工作项标识（评论形态）。同产物重复投影一律追加评论不新建。
5. **终态关闭映射**：产物 frontmatter `status` ∈ GLOSSARY 终态集合时关闭——done/fulfilled/passed/accepted/superseded/approved/reviewed/reconstructed → `已完成`；rejected → `已取消`（语义对齐 github 腿 v1.40 的 completed/not_planned）。MCP 路径投影前经 `get_work_item_workflow` 按 nameEn（Done / Canceled）解析状态标识，未命中回落系统内置 ID；REST 路径直接用系统内置 ID（已完成 100014 / 已取消 141230，2026-11-19 默认需求工作流实探来源），不做运行时工作流查询（对应工作流查询端点未核验，沿「无来源不结论」保守姿态）。关闭失败与投影失败同款警告跳过；已关再关按失败留痕幂等无害。
6. **REST 适配器改造**：创建沿用 CreateWorkitemV2（`POST /organization/{org}/workitem`），category 由 `Task` 改 `Req`；`CODEUP_WORKITEM_TYPE` 配置项语义变更为需求类类型标识（用户经 MCP 查询或 Projex 界面一次查得）；`CODEUP_ASSIGNEE` 照旧必填；终态关闭新增 UpdateWorkitem 调用（`PUT /organization/{org}/workitem/{id}`，body `{"status":"<状态ID>"}`，个人令牌同款鉴权，2026-11-19 对照官方文档核验）。三项配置任一缺失照旧警告跳过。`TRACKER_REPO` 对适配器路径仍是必配坐标（bash 无法调 MCP，自动匹配只在 MCP 路径成立）。
7. **setup 话术**：决策 1 的 Codeup 分支改为「MCP 优先——检测到 Codeup MCP 即投影零配置（空间自动匹配，多命中问人并回写记忆化）；未配 MCP 走适配器，需补组织坐标与三项 REST 配置」；generation.md / SKILL.md 决策 1 同步；蓝图（v1.41：§5.4 publish 行、§11.1 决策①、§14 MCP 指引条目）、METHOD publish 行、GLOSSARY「投影」词条（形态变更 + codeup 终态关闭补齐）同批修订，先改文档再动技能与适配器。

## 测试决策

seam 清单（先例：spec 0004 以 PATH 替身断言适配器调用面；该套件形态已随测试框架迁移演进，本轮新落执行器）：
- **适配器进程级替身**：以假 curl（PATH 前置或本地 HTTP 替身）断言 codeup 适配器外部可观察行为——exit 码、stderr 文案、HTTP 调用序列（创建 category=Req / 评论 / 终态关闭三段）、映射文件写入与幂等追加；含三项配置缺失逐项警告跳过、票与独立知识档跳过、终态/活跃态关闭分支。
- **技能与文档同步静态断言**：七个技能 publish 步骤含投影约定引用与 MCP 自查话术、决策 1 新话术、METHOD publish 行、GLOSSARY「投影」词条、蓝图 v1.41 修订记录——静态文本守护（先例：ci-workflow.test.ts 对工作流的静态守护、docs-surface.test.ts 的文档面守护）。
- **legacy 守护套件同批重指向**：`skills/setup-workspace/tests/`（经 config.sh CHECK_TEST 接入 check.sh all）的 codeup 节既有断言同批重指向新受理面契约——need 夹具建单/评论/映射/幂等 + 无谱系知识档跳过，保留既有 case id 与流结构，非删测非改弱（AGENTS.md「改行为必须同步过守护测试」同批纪律；round 1 实现期缺口处置，见备注）。
- **集成级人工段**：真实云效凭据 + 真实 MCP 会话环境下投影、幂等、终态关闭的人工验收（CI 无法复现真实凭据与 MCP 会话）。

## 验收场景

- [FR-1 | 工单级] Given 会话有 Codeup MCP 工具且 `TRACKER_REPO` 未配置，When publish 一张 need，Then 经 MCP 发现组织、按仓库名匹配空间（唯一命中）、取 Req 默认类型与当前用户为负责人，云效侧新建需求单，映射文件新增一行。
- [FR-1 | 工单级] Given 空间自动匹配命中多个候选，When publish，Then 列出候选名让用户选择，选定后 `TRACKER_REPO` 回写 config.sh；再次 publish 不再询问。
- [FR-2 | 工单级] Given 某 spec 的映射文件无记录但其 need 已有映射，When publish 该 spec，Then 在 need 需求单下追加一条 MARKDOWN 评论（非新建单），映射文件新增该 spec 行（第二列记 need 工作项标识）。
- [FR-2 | 工单级] Given 产物是票，When publish，Then stderr 说明「过程档不入云效，投影跳过」且 exit 0，无任何平台调用。
- [FR-2 | 工单级] Given 产物是无 need 谱系的独立知识档，When publish，Then stderr 说明「无 need 谱系，投影跳过」且 exit 0。
- [FR-3 | 工单级] Given 会话无 Codeup MCP 工具，When publish 同一批产物，Then 走 REST 适配器同口径投影（创建 category=Req、知识档评论、票与独立档跳过）。
- [FR-3 | 工单级] Given MCP 路径工具调用报错，When publish，Then stderr 明确原因并跳过 exit 0，出口链不受影响。
- [FR-4 | 工单级] Given 假 curl 替身与三项 REST 配置齐备，When publish need（活跃态）与 spec 各一，Then 替身收到一次 CreateWorkitemV2 调用（category=Req）与一次评论调用、无状态更新调用，映射文件两行。
- [FR-5 | 工单级] Given 产物 status=fulfilled，When publish（两路径各验一次），Then 对应需求单被置 `已完成`（REST 替身断言收到 `{"status":"100014"}` 更新调用；MCP 路径经工作流 nameEn=Done 解析或回落内置 ID）。
- [FR-5 | 工单级] Given 产物 status=rejected，When publish，Then 需求单被置 `已取消`（REST 替身断言收到 `{"status":"141230"}`）。
- [FR-5 | 工单级] Given 产物 status 为活跃态（draft/confirmed/ready/in-progress/implemented/blocked），When publish，Then 无任何状态更新调用，只投影。
- [FR-5 | 工单级] Given 对已关闭需求单重复终态 publish，When 关闭调用返回非零，Then 按失败留痕警告 exit 0，无其他副作用。
- [FR-6 | 工单级] Given 同一产物第二次 publish 且映射已有记录，When publish，Then 追加评论不新建，映射文件行数不变。
- [FR-6 | 工单级] Given 某 spec 的 need 在映射文件无记录，When publish 该 spec，Then stderr 指明「先投影对应 need」并跳过 exit 0（继承 need 异常流）。
- [FR-7 | 工单级] Given 改动落盘，When 跑同步静态断言用例，Then 七技能 publish 步骤含投影约定引用、决策 1 话术为 MCP 优先形态、METHOD publish 行 / GLOSSARY「投影」词条 / 蓝图 v1.41 修订记录齐备，且 skills/ 与 assets/ 分发副本一致。
- [FR-1, FR-2, FR-3, FR-5 | 集成级 | 人工：真实云效凭据与真实 MCP 会话环境无法在 CI 复现] Given 真实凭据环境，When 对真实项目投影 need/spec 各一、二次投影、终态投影，Then 云效侧可见需求单与评论、无重复对象、终态单状态正确。

## 非目标

- github / gitlab 腿零改动：继续 gh/glab CLI、全产物独立 issue 口径；两腿投影形态分叉（codeup 聚合 / github-gitlab 全产物独立）是 need 拍板结果而非缺陷。
- 票与独立知识档在两条路径上都不投（含兜底），不提供开关。
- need 需求单中间态（设计中/开发中/测试中）不同步：只做终态关闭。
- 平台 → 盘上回读 / 双向同步不变（need 0002 既有非目标）。
- 需求单完整状态机管理、评论删除、迭代/字段维护等投影外互动不做。
- Codeup MCP server 本身的安装与分发不在本轮（decisions.md 指引现状保持，MCP 配置归用户环境）。

## 备注

- 来源：need 20261119-8458（2026-11-19 confirmed，拍板记录 D1–D9 在其开放问题节），本 spec round 1 全覆盖其 7 条 FR。
- 本 spec 取代 spec 0004 的 codeup 腿口径（全产物独立 Task 单 → need 建单/知识档评论/票不投）；github/gitlab 腿契约不变。spec 0004 已 done，按 need 0002 既有非目标与 v1.40 修订记录演进，无活文档冲突。
- A2 靶心查证记录（2026-11-19 一手来源）：需求工作流六态经 MCP `get_work_item_workflow` 实探（默认需求工作流：待处理 100005 / 设计中 156603 / 开发中 142838 / 测试中 100012 / 已完成 100014 / 已取消 141230）；终态关闭 REST 调用面 `PUT /organization/{org}/workitem/{id}` body `{"status":"<ID>"}` 经官方文档核验（help.aliyun.com UpdateWorkitem）；需求类 category 标识 `Req` 经 `get_work_item_types` 响应证实（categoryId 字段）。
- 空间自动匹配为用户拍板（全零配置形态），代价已知悉：匹配歧义时以问人收口，回写记忆化降低重复询问。
- round 1 实现期缺口处置（2026-11-20，无人值守自主决策留痕）：票改动面漏列 legacy 守护套件 skills/setup-workspace/tests/legacy_stream.py——其 codeup 节 12 条断言中 5 条（case id run-tests.sh:884/885/886/888/890）在新受理面下必红（夹具为无谱系旧格式 adr，新契约下跳过不投影）。处置=收编入票改动面并同批重指向新契约（候选：拒绝上报停机问人 / 收编入面修订；所选=收编，理由=AGENTS.md「改行为必须同步过守护测试」同批纪律 + 受理面变更必然波及旧夹具断言，非删测非改弱）；测试决策补 legacy 重指向条目。
