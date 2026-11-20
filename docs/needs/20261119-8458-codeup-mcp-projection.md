---
id: 20261119-8458
status: fulfilled
fulfilled: 2026-11-20
confirmed: 2026-11-19
created: 2026-11-19
---
# codeup 投影支持 MCP 路径（need 建单 / spec 评论 / 票不投）

## 背景与业务目标

TRACKER=codeup 的产物投影目前只有一条腿：`check.sh publish` → `.sdlc/trackers/codeup.sh` REST 直连（curl + 个人访问令牌），被四项配置卡死——`TRACKER_REPO`、`CODEUP_TOKEN`、`CODEUP_ASSIGNEE`、`CODEUP_WORKITEM_TYPE`（最后一项还需人工查 OpenAPI Explorer），任一缺失即警告跳过、云效侧落空（来源：codeup.sh 第 39–48 行）。会话里配了 Codeup MCP 时本可直接建工作项、且能自动发现组织 / 项目 / 工单类型 / 负责人（`get_current_organization_info`、`search_projects`、`get_work_item_types`、`get_current_user` 均为现成工具），但规则把 MCP 定位成「可选增强」（蓝图 v1.12 / decisions.md 决策 1），技能出口链调的 `check.sh publish` 是 bash 子进程，结构性够不着会话内 MCP 工具。结果：开 need 之后想投云效，只能人肉凑齐四项 REST 配置（来源：用户原话「限定死 TRACKER_REPO 使得开 need 之后无法通过 mcp 创建工单」）。

同时本轮一并变更投影形态：现行口径是全产物各自独立投成 Task 类工作项；目标口径为 **need 建需求单、spec 及有谱系知识档作评论挂单下、票（过程档）不入云效**（来源：用户拍板「need 我认为是一需求单/工单，spec 作为评论投 need 对应的单下面，tickets 作为过程档不入云效」），且 MCP 路径与 REST 适配器兜底路径同口径。

业务目标：配了 Codeup MCP 的仓库，产物落盘后云效侧自动出现对应投影，全程零人肉配置；无 MCP 时兜底路径同口径可用；投影失败照旧警告跳过不阻断（蓝图 §5.4 契约不变）。

## 干系人与用户

- 仓库主人（目标仓库使用者）：目标仓库 TRACKER=codeup、会话配 Codeup MCP、未配 REST 四项——本轮主场景（来源：用户场景确认）。期望 need/spec 落盘后云效侧可见投影，无需准备任何 REST 配置。
- 流程技能（dev-clarify / dev-spec / dev-plan / dev-ship / dev-accept）：出口步骤的 publish 要能走 MCP 或兜底适配器，期望永不阻断出口链。
- AI 执行者：MCP 路径的投影动作由 agent 会话内执行（调 MCP 工具 + 维护映射文件），这是与现行 bash 适配器路径的本质形态差异。

成功标准：配 MCP 会话中 `publish` 一张 need 后，云效侧出现需求单且正文首行带盘上指针、映射文件新增记账；同一产物二次 publish 追加评论不新建；无 MCP 会话中同口径投影可用；全程未配置 TRACKER_REPO / CODEUP_TOKEN / CODEUP_ASSIGNEE / CODEUP_WORKITEM_TYPE 任何一项。

## 系统能力需求

- FR-1 MCP 投影路径：TRACKER=codeup 且会话检测到 Codeup MCP 工具时，产物落盘后的投影经 MCP 工具（`create_work_item` 建单、`create_work_item_comment` 挂评论）落云效，坐标 / 类型 / 负责人由 MCP 工具发现，零 REST 配置（来源：用户原话 + 拍板 D1）。
- FR-2 投影形态新口径：need → 云效需求单（工作项）；spec → 挂对应 need 单下评论；design / adr / research 带 need 谱系前缀的 → 挂对应 need 单下评论，独立产物不投；票（过程档）→ 不入云效（来源：用户拍板 D5 + D9）。
- FR-3 MCP 优先判定与三级回落：每次 publish 时自查会话有无 codeup MCP 工具——有走 MCP；无走 REST 适配器（同口径）；两者皆不可用警告跳过 exit 0（来源：拍板 D7 + 蓝图 §5.4 既有契约）。
- FR-4 兜底适配器同口径改造：`.sdlc/trackers/codeup.sh` 从「全产物独立 Task 单」改为 FR-2 新口径（need 建需求单 / spec 与有谱系知识档挂评论 / 票不投）（来源：拍板 D8）。
- FR-5 终态关闭：产物 status 处于终态（GLOSSARY 状态机集合）时，MCP 路径与适配器路径均把云效对应工作项置完成态，语义对齐 github 腿 v1.40 修订（来源：拍板 D3）。
- FR-6 幂等共账：两条路径共用映射文件 `codeup.map`（盘上相对路径 ↔ 工作项标识），同一产物重复投影追加评论不新建单（来源：两路径并存的逻辑必然 + spec 0004 既有映射语义）。
- FR-7 话术同步：setup-workspace decisions.md 决策 1 从「适配器直连优先、MCP 可选增强」改为「MCP 优先（推荐）、REST 四项为兜底」；蓝图 §5.4 / §11.1 / §14 与 METHOD.md 相关表述同步（治理规则：先改文档再改技能）。

## 场景

- 主流程（need）：Given 会话有 codeup MCP 工具且 TRACKER=codeup、REST 四项全未配置，When dev-clarify 出口 publish 一张 confirmed 的 need，Then 云效侧新建需求单、正文首行为盘上指针行、`codeup.map` 新增一行含盘上路径与工作项标识。
- 主流程（spec）：When publish 一张 spec，Then 其对应 need 需求单下追加一条 MARKDOWN 评论（非新建单）。
- 票不投：When publish 一张票（docs/tickets/ 产物），Then stderr 说明「票为过程档不入云效，投影跳过」且 exit 0。
- 无 MCP 兜底：Given 会话无 codeup MCP 工具，When publish 同一批产物，Then codeup.sh 以同口径投影（need 建单 / spec 评论 / 票不投）。
- 终态关闭：Given 某 need status=fulfilled，When publish，Then 对应云效需求单置完成态；重复 close 幂等无害。
- 异常流（谱系缺失）：When publish 一张 spec 但其 need 尚无映射记录，Then 警告跳过并指明「先投影对应 need」（对应 FR-2/FR-6，异常出口参照既有警告跳过契约）。
- 异常流（MCP 失败）：When MCP 工具调用报错，Then 警告跳过 exit 0，出口链不受影响。
- 幂等：Given 同一产物第二次 publish 且映射已有记录，Then 追加评论，不新建工作项。

## 假设与风险

- A1（中代价 × 中不确定）：云效 MCP server 工具面随版本演进漂移。缓解：投影失败警告跳过为既有契约，代价上限是「投影暂时不可用」，盘上真相源兜底。**验证结果（验收 20261120-3143）：验证通过（本轮触达面内）**——6 次 MCP 调用全部正常返回，类型面结构（categoryId/defaultType/nameEn/systemDefault）与 spec 记载一致，无漂移征兆；建单/评论/工作流查询面因环境受阻未触达。
- A2（低代价 × 高不确定）：云效需求单状态机的终态字段结构未知（与 GitHub issue 的 open/closed 二态不同构），终态关闭的具体状态值需 spec 阶段经 `get_work_item_types` / `get_work_item_workflow` 查证——**round 1 靶心候选**。**验证结果：本轮未触发（独立复核面）**——spec 备注已有实现期一手实探记录（需求工作流六态 100005/156603/142838/100012/100014/141230；REST `PUT .../workitem/{id}` body `{"status":"<ID>"}` 官方文档核验），与 §7.1 终态映射硬编码一致；验收组织级收证（Req 类存在、defaultType 为项目级属性）与之一致；工作流六态独立复核需空间坐标，受阻未触发。
- A3（低代价 × 低不确定）：MCP 路径的映射记账由 agent 会话内直接写 `codeup.map`，无脚本强制格式校验。后果与 spec 0004 已接受项同构：映射丢失 / 写错仅致可能重复建单，可接受。**验证结果：验证通过（形态侧）**——交付物实探 codeup.sh 记账/幂等查账实现与 §7.1 形态一致、双副本同文；行为侧（实际记账动作）因环境受阻未触发。
- **残余风险（验收 passed 折回，2026-11-20）**：① 场景 16 端到端未核销——云效组织（广东禹通）内无与仓库 ai-infra 匹配的项目，空间自动匹配恒零命中，MCP 路径建单/评论/终态关闭的实操链未实证；经负责人显式拍板「环境不解除继续」接受（非沉默），票第 9 条验收标准保持开放；解除路径 = 云效侧建 ai-infra 项目或将 `TRACKER_REPO` 回写云效空间标识后补验（测试 Given 形态见验收报告 20261120-3143，盘上过程档已随清扫删除、证据链在 issue #311 与报告编号可溯）。**人工校验补录（2026-11-20，负责人提供）：在另一真实项目（已安装本套件新环境）开单实测，MCP 投影云效正确工作、人工校验通过——MCP 路径 need 建单投影获真实环境人工实证；本仓库组织内环境仍未配置，spec 评论/幂等/终态投影的原环境补验路径保持开放。**② 评审（20261120-45fc）三条 spec 未定义中间形态语义待消歧：终态关闭触发面实现为仅 need 形态（建议 METHOD §7.1 补消歧句 + 替身测试零 PUT 负向断言）；父为 spec 的 design/adr/research（spec 前缀非 need 前缀）按现行口径判无谱系跳过（涉产品语义，归拍板：顺谱系链挂 need 单评论 vs 维持跳过）；受理面新增「产物不在 docs/ 产物目录 → 警告跳过」分支（保守正确，可补注记）。③ 范围外基线既有问题两项（另票处置）：codeup.sh `head -c` 截断含中文正文有半多字节字符风险（bash-multibyte-bracing 同型）；头注「环境优先」文案与实况相反（config.sh source 覆盖环境值）。
- **下一轮建议**：范围 = ②三条语义消歧（METHOD §7.1 补句 + 测试负向断言 + spec 前缀谱系拍板）与 ①环境补齐后场景 16 补验；③两项基线问题建议独立工票。

## 范围与非目标

范围：技能出口链 publish 步骤的 MCP 分支（dev-clarify / dev-spec / dev-plan / dev-ship / dev-accept 涉 publish 处）；`.sdlc/trackers/codeup.sh` 同口径改造与 skills/setup-workspace/assets/trackers/codeup.sh 分发副本；setup-workspace decisions.md / generation.md / SKILL.md 决策 1 话术；蓝图 v1.x 修订与 METHOD.md / GLOSSARY.md 术语同步（「投影」词条口径变更）。

非目标（全部来自显式拍板）：
- github / gitlab 腿不动（拍板 D6）：继续走 gh/glab CLI、全产物独立 issue 口径——**由此两腿投影形态分叉：codeup 腿 need 建单 / 知识档评论，github/gitlab 腿维持全产物独立对象**，此分叉为拍板结果非缺陷。
- 票不入云效含兜底路径（拍板 D5 + D8）。
- need 工作项中间态不同步：只做终态关闭，不做 in-progress 等中间态流转（拍板 D3 的边界推论，spec 可复核）。
- 平台 → 盘上回读 / 双向同步（need 0002 既有非目标延续）。
- 需求单完整状态机管理、评论删除等投影外互动（need 0002 既有非目标延续）。

## 开放问题

（无未决问题。拍板记录：）
- D1 目标形态 → 配 MCP 会话投影自动落云效，零 REST 四项配置（去向 FR-1）。
- D2 并存策略 → MCP 优先、适配器兜底（去向 FR-3）。
- D3 终态关闭 → 放开，两路径生效（去向 FR-5）。
- D4 主场景 → 目标仓库配 MCP、未配 REST 四项（去向干系人节）。
- D5 投影形态 → need 需求单 / spec 评论 / 票不投（用户原话，去向 FR-2）。
- D6 平台边界 → 只动 codeup 腿，github/gitlab 不动（去向非目标）。
- D7 判定时机 → 每次 publish 时自查会话工具（去向 FR-3）。
- D8 兜底口径 → 同口径改适配器（去向 FR-4）。
- D9 其他知识档 → 有 need 谱系的挂评论、独立不投（去向 FR-2）。
