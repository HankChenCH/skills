---
id: 0002
status: fulfilled
confirmed: 2026-10-27
fulfilled: 2026-10-29
created: 2026-10-27
---
# tracker 平台适配器（github / gitlab / codeup）

## 背景与业务目标

蓝图批 3 的收尾项之一：为 `TRACKER=github/gitlab/codeup` 实现 `.sdlc/trackers/` 适配器，让 `check.sh publish` 把 docs/ 产物投影到用户选定的平台（来源：用户 2026-10-27 指令"按技能蓝图，实现 tracker 适配器"；蓝图 §10.2 批 3、§14；spec 0001 非目标显式把适配器留给本轮）。现状是三类出口选了也只会收到"适配器尚未实现（计划批 3）"警告后跳过，产物投影没有出口；本仓库自身 `TRACKER=github` 同样如此。

业务目标：选了平台的仓库，产物落盘的同时在平台上可见、可检索、可追溯回盘上编号；平台不可用时一切照旧（盘上是真相源），流程永不被投影卡住。

## 干系人与用户

- 仓库主人（唯一用户）：初始化 setup 时选 GitHub/GitLab/云效 Codeup 作为产物出口，期望 publish 后平台上能看到与 docs/ 同构的投影。
- 流程技能（dev-spec / dev-plan / dev-clarify 等）：落盘后调 publish，期望它永不阻断出口链。
- AI 执行者：按蓝图与调研报告（docs/research/0001）实现，不重新调研平台模型。

成功标准：`check.sh publish <file>` 在三平台各自真实凭据下 exit 0 且平台侧出现带盘上指针的投影；无凭据/无 CLI 时 exit 0 且 stderr 有明确原因。

## 系统能力需求

- FR-1 GitHub 投影：`TRACKER=github` 时，publish 将单个产物镜像为 `TRACKER_REPO`（owner/repo）下的 issue；正文首行标注盘上产物路径；同一产物重复 publish 更新原 issue 不新建；gh 缺失/未认证/API 失败时警告并跳过（exit 0）。
- FR-2 GitLab 投影：同 FR-1，平台对象为项目 issue，CLI 换 glab，坐标 `group/project`。
- FR-3 Codeup 投影：`TRACKER=codeup` 时，publish 将单个产物镜像为 Projex 工作项（Task 类）并附评论承载正文；坐标与令牌、负责人、工作项类型标识由配置显式提供；任一缺失或 API 失败时警告并跳过（exit 0）。
- FR-4 setup 接线与话术清理：setup-workspace 按决策 1 安装所选适配器文件；技能与门禁脚本中所有"适配器属批 3 未实现"的过时话术更新为现状（含 check.sh 缺失警告文案与蓝图 §5.4/§11.1/§14 的 v1.12 同步）。

## 场景

- Given 夹具仓库 `TRACKER=github` 且 PATH 上有已认证的 gh 替身，When `check.sh publish docs/tickets/0006-x.md`，Then 退出 0，替身收到一次 issue 创建调用，本地映射文件新增"盘上路径 ↔ issue 编号/URL"一行。
- Given 同一产物第二次 publish，When 映射文件已有记录，Then 走更新调用，不产生第二个 issue。
- Given 机器上没有 gh（或未登录），When publish，Then 退出 0，stderr 说明"gh 缺失/未认证，投影跳过，产物已在盘上"，技能出口链不受影响。
- Given `TRACKER=codeup` 且令牌未配置，When publish，Then 退出 0 并警告缺哪个配置项。
- Given 全新仓库跑 setup-workspace 决策 1 选 GitLab（glab 已登录），Then `.sdlc/trackers/gitlab.sh` 就位可执行，收尾报告不再出现"适配器属批 3"。

## 假设与风险

- A1（中代价 × 中不确定）：平台 API/CLI 行为随版本漂移。缓解：github/gitlab 只依赖 gh/glab 稳定子命令（auth status / issue create / issue edit）；codeup 仅用 2026-10-27 对官方文档核验过的两个端点（CreateWorkitemV2、CreateWorkitemComment），工作项类型标识由配置显式提供、不做运行时探测；投影失败一律警告跳过，漂移的代价上限是"投影暂时不可用"。（验证：通过——github 腿 2026-10-29 真实凭据实跑，调用面与替身断言一致；gitlab/codeup 本轮未触发；来源：验收报告 0004）
- A2（低代价 × 高不确定）：本仓库环境内无真实平台凭据，端到端投影只能由 fake CLI 替身验证，真实凭据路径留给验收阶段。缓解：替身断言的是调用面（参数、调用序列），真实调用面已由官方文档核验。（验证：通过——预设即本轮现实；github 腿已补真实凭据证据（issues #23/#24 新建、#7/#8/#16/#17/#20/#22 幂等更新）；来源：验收报告 0004）
- A3（低代价 × 低不确定）：gh issue create 的输出格式（打印 issue URL）被用于解析编号，格式变化会破坏解析。缓解：解析失败按投影失败处理（警告跳过），不影响盘上产物。（验证：通过——#23/#24 编号解析正确落映射；来源：验收报告 0004）

## 范围与非目标

范围：三个适配器脚本及其在 setup-workspace assets/ 的分发副本、run-tests.sh 用例、setup 侧接线（generation/decisions/SKILL 话术）、check.sh 缺失警告文案更新、蓝图/METHOD 同步（v1.12 已先行）。

非目标：不做 dev-ship 的 PR/MR 创建（其 SKILL.md 已自含 gh/glab 路径，与本轮适配器无关）；不做平台→盘上回读或双向同步；不改任何门禁语义（评审 approved 仍是 pre-push 重门禁，平台侧 approve 只是投影展示）；不做 Codeup 工作项状态流转、评论删除等投影之外的互动；不做批 3 其余项（dev-release、dev-docs、L4 hooks）。

## 开放问题

（无未决问题。拍板记录：）
- D1 投影目标对象 → issue（github/gitlab）/ Task 类工作项+评论（codeup）：产物是跟踪对象，与平台工单模型同构（去向 FR-1/2/3）。
- D2 失败语义 → 投影失败警告跳过 exit 0：蓝图 §5.4 既有契约，v1.12 仅扩展到"适配器自身失败"（去向 FR-1/2/3 验收标准）。
- D3 Codeup 类型标识 → 配置显式提供：类型列表端点未能在官方文档核验，"无来源不结论"（去向 FR-3、假设 A1）。
- D4 转调研项 → 无新增调研：docs/research/0001 已覆盖三平台模型，本轮仅补核验两个 Codeup 端点（已完成，2026-10-27）。

### round 1 验收折回（2026-10-29，验收报告 0004）

- 残余风险：gitlab / codeup 适配器真实凭据端到端未验证（本环境无凭据，替身调用面已核验）；全新夹具仓库完整 setup 选 GitLab 未跑。均不影响 github 主路径（本仓在用）。
- 下一轮建议：在具备 gitlab / codeup 凭据的环境各 publish 一个产物补实证；跑一次全新 setup-workspace 选 GitLab 的完整安装。
