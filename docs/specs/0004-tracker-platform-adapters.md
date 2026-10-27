---
id: 0004
status: approved
approved: 2026-10-27
need: 0002
round: 1
created: 2026-10-27
---
# tracker 平台适配器（github / gitlab / codeup）

## 问题陈述

setup 决策 1 已支持选择 GitHub/GitLab/云效 Codeup 作为产物出口，但 `check.sh publish` 对这三类 `TRACKER` 只会输出"适配器尚未实现（计划批 3）"警告后跳过：用户选了平台，产物投影却没有出口。技能落盘后的 publish 调用（dev-spec、dev-plan、dev-clarify 等的出口步骤）在三类平台上全部落空；本仓库自身 `TRACKER=github` 同样如此。

## 方案

按蓝图 v1.12 定稿的契约实现三个适配器，投影形态与平台工单模型同构：github/gitlab 经官方 CLI（gh/glab）把产物镜像为平台 issue，codeup 经 OpenAPI 直连（个人访问令牌）镜像为 Projex 工作项并以评论承载正文。盘上是真相源：投影正文首行带盘上产物指针，适配器本地留"盘上路径 ↔ 平台对象"映射文件支撑幂等更新；一切投影失败（CLI 缺失、未认证、API 报错、配置缺失）明确警告并跳过（exit 0），不阻断技能出口链。setup-workspace 同步接线：按决策 1 安装所选适配器，清理全部"适配器属批 3"过时话术。

## 用户故事

- 作为选了 GitHub 出口的仓库主人，我想在产物落盘后于 `TRACKER_REPO` 看到同名投影 issue 且正文第一行指回盘上路径，以便在平台上跟踪而不必翻仓库。
- 作为选了 GitLab/Codeup 出口的仓库主人，我想要同样的投影能力，以便出口选择是真实选项而非占位。
- 作为流程技能（dev-spec/dev-plan 等），我想让 publish 在任何投影失败时警告跳过而不断链，以便落盘流程永远走得完。
- 作为重复 publish 的调用者，我想让同一产物只对应一个平台对象（更新而非新建），以便平台侧不被重复对象刷屏。

## 实现决策

**适配器契约（三者一致，与 local.sh 同构）**：

- 调用形：`<适配器> publish <产物绝对路径>`；check.sh 已按 `TRACKER` 分派并透传退出码。未知子命令或产物文件不存在 → 报错 exit 1（调用方 bug）；其余一切投影失败 → stderr 明确原因 + exit 0。
- 产物类型不区分：need/spec/ticket/review/acceptance/design/adr/research 八类同构处理，标题取产物 H1，正文取产物全文。
- 投影正文首行为盘上指针引用行：`> 盘上产物：<仓库相对路径>（盘上是真相源，本条为单向投影）`，其后接产物全文；全文超过平台对象尺寸上限时截断并注明"内容超限已截断，全文见盘上文件"。
- 幂等：适配器同目录映射文件 `<tracker>.map`，每行 `盘上相对路径<TAB>平台对象ID<TAB>对象URL`；有记录且对象可寻址 → 走更新（github/gitlab 更新 issue 标题与正文；codeup 追加一条新评论承载最新全文），无记录 → 创建。映射文件在投影成功后写入；丢失映射的后果仅是可能新建重复对象（可接受，备注注明）。

**各平台要点**：

- github：前置 `command -v gh` 与 `gh auth status`（任一不过 → 警告跳过）；`gh issue create -R <owner/repo>` 从输出 URL 解析 issue 编号，更新用 `gh issue edit`。
- gitlab：前置 `command -v glab` 与 `glab auth status`；`glab issue create -R <group/project>`（或等效 `-s` 寻址），更新用 `glab issue update <iid>`。
- codeup：`TRACKER_REPO=<organizationId>/<spaceIdentifier>`；令牌读环境变量 `CODEUP_TOKEN`（请求头 `x-yunxiao-token`）；负责人读 `CODEUP_ASSIGNEE`（阿里云 accountID，CreateWorkitemV2 必填）；工作项类型标识读 `CODEUP_WORKITEM_TYPE`（Task 类，由用户一次性查得后填入，运行时不探测——类型列表端点未能在官方文档核验）；接入点 `CODEUP_ENDPOINT` 可选覆盖，默认 `https://devops.cn-hangzhou.aliyuncs.com`（中心版）。创建 = `POST /organization/{organizationId}/workitem`（subject=投影标题，category=Task），正文评论 = `POST /organization/{organizationId}/workitems/comment`（formatType=MARKDOWN）；两端点于 2026-10-27 对照官方文档核验。更新语义 = 映射已存在时仅追加评论（不调工作项更新接口），投影为追加式。HTTP 用 curl，JSON 字段提取用 grep/sed；任何非预期响应按投影失败警告跳过。
- 共同：适配器自行定位仓库根（自身位置的上级目录）并读取 config.sh；不依赖当前工作目录。

**setup 接线**：generation 细则在 local.sh 之后按决策 1 追加安装所选适配器（可整体覆盖，用户自定义适配器照旧不动）；decisions.md 决策 1 的"通用说明"更新为现状（适配器随技能分发、投影失败警告跳过语义、codeup 需补的配置项清单），Codeup MCP 指引按蓝图 v1.12 以"适配器直连优先、MCP 为对话内操作的可选增强"形态落；SKILL.md 决策 1 的一句过时话术同步；check.sh 缺失适配器的警告文案由"尚未实现（计划批 3）"改为"未安装"（含重跑 setup 指引），蓝图 §5.4/§11.1/§14 与 METHOD.md 已随 v1.12 先行改定。

## 测试决策

- seam：`check.sh publish` 的适配器分派 + 三个适配器对 CLI/HTTP 的调用面。夹具仓库沿用 tests/run-tests.sh 的 `new_repo`，外部依赖全部用 PATH 注入替身（fake gh/glab/curl 记录调用日志、吐固定输出），离线可重复。
- 既有同类先例：run-tests.sh 的 publish 用例组（local 确认在盘、缺文件拒绝、github/gitlab 未实现警告放行）——后两者随文案改版同步改为"未安装警告放行"。
- 断言：exit 码 + 输出子串（`t`/`tn` 骨架）+ 替身调用日志内容（创建/更新调用序列、映射文件行数）。真实凭据路径不进自动化（集成级场景人工验收）。

## 验收场景

- [FR-1 | 工单级] Given 夹具仓库 TRACKER=github、PATH 前置已认证 fake gh，When publish 一张工单产物，Then exit 0，fake 日志含一次 issue create，`github.map` 新增一行含盘上路径与 fake 返回的编号/URL。
- [FR-1 | 工单级] Given 同一产物映射已存在，When 再次 publish，Then fake 日志走 issue edit 且无第二次 create，映射行仍一条。
- [FR-1 | 工单级] Given gh 不在 PATH（或 auth status 失败替身），When publish，Then exit 0，stderr 含"gh 缺失"或"未认证"原因，无任何 create 调用。
- [FR-2 | 工单级] Given 夹具仓库 TRACKER=gitlab、PATH 前置已认证 fake glab，When publish，Then 行为与 FR-1 三条镜像一致（create/update/未认证警告跳过）。
- [FR-3 | 工单级] Given TRACKER=codeup 且 CODEUP_TOKEN/CODEUP_ASSIGNEE/CODEUP_WORKITEM_TYPE 任一缺失，When publish，Then exit 0 且 stderr 指明缺哪个配置项。
- [FR-3 | 工单级] Given 配置齐备且 PATH 前置 fake curl，When publish，Then 依序调用创建与评论两个端点，`codeup.map` 落 workitemIdentifier；再次 publish 只追加评论不重复创建。
- [FR-4 | 工单级] Given assets/trackers/ 含四个适配器、generation/decisions/SKILL 文本更新，When 全仓 grep"批 3"适配器话术，Then 仅剩历史修订记录与批次清单等正当出现处；check.sh 缺失警告文案用例（夹具缺 github.sh）断言"未安装"且 exit 0。
- [FR-1、FR-2、FR-3 | 集成级] Given 真实凭据（gh/glab 已登录、CODEUP_* 配齐），When 对真实平台 publish 各一产物，Then 平台侧可见带盘上指针的投影、二次 publish 不产生重复对象、盘上产物零改动。（留验收阶段人工执行）
- [FR-4 | 集成级] Given 全新夹具仓库完整跑 setup-workspace 选 GitLab，Then 安装清单含 gitlab.sh、收尾报告无"适配器属批 3"话术。（留验收阶段）

## 非目标

不做 dev-ship 的 PR/MR 创建改动（其 SKILL.md 自含 gh/glab 路径，本轮不动 dev-ship）；不做平台→盘上回读、双向同步或评论聚合回盘；不改 pre-push/commit-msg 等任何门禁语义；Codeup 不做工作项状态流转与评论管理；不实现 dev-release、dev-docs、L4 hooks；不给 github/gitlab 增加 CLI 之外的 API 直连路径。

## 备注

来源：need 0002（2026-10-27，用户指令"按技能蓝图，实现 tracker 适配器"触发）；平台模型唯一参考 docs/research/0001 与 setup-workspace references/tracker-platforms.md；Codeup 两端点 2026-10-27 一手核验（help.aliyun.com CreateWorkitemV2 / CreateWorkitemComment 页），核验记录见 need 0002 拍板记录 D3/D4。蓝图 v1.12（2026-10-27）先行定稿适配器契约与 §5.4/§11.1/§14 措辞。映射文件丢失仅致重复对象的风险已知悉接受（单向投影、盘上真相源兜底）。
