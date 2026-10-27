# tracker 平台模型参考：GitHub / GitLab / 云效 Codeup 的 issue 与合并请求

本文件是 setup-workspace 技能的可移植操作参考，随技能分发（SKILL.md 同目录 references/ 下），跨机器可达。用途：① 决策 1 选定 GitLab/GitHub/Codeup 出口后，了解目标平台的 issue 与 PR/MR 模型；② `.sdlc/trackers/` 适配器（github/gitlab/codeup）实现与维护时的平台模型参考。检索日期 2026-10-27，实现适配器时请复核（平台 API 随版本演进）。本技能源仓库另有本内容的调研留档（2026-10-27 快照）；平台模型有更新时先改本文件（走技能工单），留档保持调研时点快照不回改。

## 结论速览

| 维度 | GitHub | GitLab | 云效 Codeup |
|---|---|---|---|
| 代码评审对象 | pull request（PR） | merge request（MR） | 合并请求（MR） |
| 工单对象 | issue（属仓库） | issue（属项目，已并入 work items 框架） | 工作项（属 Projex 项目，不在代码库内） |
| 编号空间 | issue/PR/discussion 每仓库共用一个递增序列 | issue 与 MR 各自独立，每项目一套 iid | MR localId 每代码库一套；工作项 identifier 为全局字符串 |
| 引用语法 | `#N`、`GH-N`、`user/repo#N` | issue `#N`、MR `!N`、同组跨项目 `projectname#N` | 无等价短语法；跨产品需链接 |
| 关闭联动 | `Closes #N` 关键词（支持跨仓库） | `Closes #N` + 分支名以 issue 编号开头自动关联 | 提交信息关联工作项；无自动关闭语法证据 |
| 评审模型 | review 状态（approve/request changes），可请求 reviewer | assignee+reviewers、approval rules、未解决线程阻塞合并 | reviewers（hasReviewed）+ 卡点（allRequirementsPass） |
| CLI | `gh` | `glab` | 无官方专用 CLI，走 OpenAPI/SDK |
| API 寻址 | `/repos/{owner}/{repo}/issues|pulls` | `/projects/:id/issues|merge_requests`（iid） | OpenAPI：organizationId + repositoryId + localId / workitemIdentifier |

## GitHub

- **issue 模型**：轻量跟踪对象（缺陷/特性/任务），字段含 title、body、labels、milestones、issue types、assignees；支持 sub-issues（多级子任务树）与 dependencies（blocked by / blocks 显式依赖关系）；与 Projects 看板深度集成；支持模板与表单。创建渠道：网页、`gh` CLI、REST、GraphQL 等。
  来源：docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues（检索 2026-10-27）
- **编号与引用**：issue、pull request、discussion 在同一仓库共用一个递增编号序列；官方 autolinked references 把 `#N` 归为"Issue or pull request number"同一引用类型，另有 `GH-N` 与 `user/repo#N` 形式。
  来源：docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls；github.com/orgs/community/discussions/69759（官方答复：single shared counter）（检索 2026-10-27）
- **PR 模型**：head → base 分支；状态 open/closed/merged，另有 draft（过滤 `is:draft`）；评审状态可过滤 `review:none / review:required / review:approved / review:changes_requested`，可指定 reviewer。
  来源：docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests；docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests（检索 2026-10-27）
- **PR↔issue 关联**：PR 正文用 closing keywords 自动关闭 issue：`Closes #10`；跨仓库 `Fixes octo-org/octo-repo#100`；关键词大小写与冒号不敏感；也可在侧栏手动关联（每 PR 最多 10 个 issue）。
  来源：docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue（检索 2026-10-27）
- **API/CLI**：REST `/repos/{owner}/{repo}/issues`、`/repos/{owner}/{repo}/pulls`；GraphQL；CLI `gh`（`gh auth status`、`gh issue …`、`gh pr …`）。认证：`gh auth login` 或 PAT。

## GitLab

- **issue 模型**：issue 必属于某个 project（组级视图可跨项目）。字段：assignees（多个）、labels、milestones、iterations、due date、weight、health status、epics、机密 issue、boards。GitLab 18.7 起 issue 整体运行在统一 work items 框架上（GA），Markdown 引用格式 `[work_item:123]`（18.2 GA）。
  来源：docs.gitlab.com/ee/user/project/issues/（检索 2026-10-27）
- **MR 模型**：source → target 分支；target 默认 protected（Maintainer+ 可合并，Developer 只能并非保护分支）；assignee（通常是作者）+ reviewers 双角色，审批资格由项目 approval rules 决定；未解决 threads 阻塞合并（可配 "All threads must be resolved"，单条评论不阻塞）；标题带 `Draft:` 前缀即阻止合并直到移除；合并时可删源分支；目标合并后最多 4 个依赖 MR 自动重定向。
  来源：docs.gitlab.com/ee/user/project/merge_requests/；docs.gitlab.com/user/project/merge_requests/drafts（检索 2026-10-27）
- **MR↔issue 关联**：MR 描述或提交信息写 `Closes #1234`，合并自动关闭 issue；分支名以 issue 编号开头（如 `1234-fix-login`）创建 MR 时自动附带关闭模式。
  来源：docs.gitlab.com/ee/user/project/merge_requests/（检索 2026-10-27）
- **编号与引用**：issue `#N`；同组跨项目 `projectname#N`；MR 用 `!N`；组外用完整 URL；`#` 无法开头的场合可用 `GL-N` 前缀。issue 与 MR 的 iid 各自独立、每项目递增，API 按 `/projects/:id/issues/:iid`、`/projects/:id/merge_requests/:iid` 寻址。
  来源：docs.gitlab.com/user/project/issues/crosslinking_issues；API 端点形态见 docs.gitlab.com/ee/api/（检索 2026-10-27）
- **CLI**：官方 `glab`（`glab auth login/status`）。

## 云效 Codeup

- **双体系**：代码管理 Codeup（代码库、合并请求、评审、成员）与项目协作 Projex（工作项）分开。代码库对象带 `issuesEnabled` 布尔位（GitLab 血统），但 issue 级 OpenAPI 能力在 Projex 侧；工作项大类型：需求 Req、缺陷 Bug、任务 Task、风险 Risk、原始诉求 Request、主题 Topic。
  来源：help.aliyun.com/zh/yunxiao/developer-reference/api-devops-2021-06-25-listgrouprepositories（仓库字段）；help.aliyun.com/zh/yunxiao/developer-reference/api-devops-2021-06-25-createworkitemv2（检索 2026-10-27）
- **合并请求**：OpenAPI ListMergeRequests / GetMergeRequest / MergeChangeRequest；`localId` 定义为"合并请求局部 ID，表示代码库下的第几个合并请求"（每库独立序列）；字段含 reviewers（含 hasReviewed）、allRequirementsPass（卡点是否全部通过）、creationMethod（WEB/COMMAND）、supportMergeFFOnly、detailUrl 等。
  来源：help.aliyun.com/zh/yunxiao/developer-reference/mergechangerequest-merge-merge-request；api-devops-2021-06-25-getmergerequest（检索 2026-10-27）
- **工作项**：CreateWorkitemV2（category 枚举 Req/Bug/Task/Topic，需先查项目下工作项类型）；ListWorkitems 返回 identifier（字符串主键，如 `e8b26xxx…`）、subject、assignedTo（阿里云 accountID）、status（中文状态名，如"待处理"）、spaceIdentifier（= projectId）；另有 CreateWorkitemComment 与附件三步接口。
  来源：help.aliyun.com/zh/yunxiao/developer-reference/api-devops-2021-06-25-listworkitems、createworkitemv2、createworkitemcomment（检索 2026-10-27）
- **认证与坐标**：个人访问令牌（`pt-` 前缀，请求头 `x-yunxiao-token`；旧版令牌仅覆盖代码管理）或阿里云 AK+SK / STS（新接口 accessToken 字段可省）；调用须带 organizationId（企业标识，组织管理后台获取）；接入点分中心版/Region 版。
  来源：help.aliyun.com/zh/yunxiao/user-guide/personal-access-token；MergeChangeRequest 页（检索 2026-10-27）
- **提交关联**：提交信息可关联需求/任务/缺陷（"代码提交时关联相关的需求、任务或缺陷"），具体语法见云效"任务中的代码关联"文档。
  来源：help.aliyun.com/zh/yunxiao/user-guide/code-base-usage-issues（检索 2026-10-27）
- **CLI**：未见 gh/glab 等价的官方专用 CLI，走 OpenAPI Explorer / SDK / aliyun CLI。

## 对本方法论 tracker 的映射要点

1. **两套编号空间**：盘上工单编号（docs/tickets/NNNN）与平台编号（GitHub `#N`、GitLab `#N`/`!N`、Codeup localId/identifier）互不相同。适配器单向发布时必须显式记录映射：建议平台对象正文首行标注"盘上工单 NNNN"，适配器本地留"编号↔平台 ID"对照（盘上是真相源，不回读）。
2. **closing keywords 吃平台编号**：`Closes #N` 里的 N 是平台 issue 编号。若希望"平台合并动作联动关闭投影对象"，适配器必须用平台 issue id 拼写关键词，而不是盘上 NNNN；否则联动静默失效。
3. **评审投影不改门禁**：dev-review 的 approved 评审是本方法论的重门禁（pre-push 校验，依据 review 产物的 `tickets: []`）。平台侧的 approve / approval rules / 卡点只是投影展示，不改变盘上门禁语义；适配器失败时警告跳过（产物已在盘上）。
4. **Codeup 坐标更复杂**：GitHub 用 `owner/repo`、GitLab 用 `group/project`，Codeup 需要 organizationId + projectId（+ 代码库 ID），且工作项与合并请求跨产品。TRACKER_REPO 的取值格式与 config 字段扩展是 Codeup 适配器的第一个设计决策。
5. **版本漂移**：GitLab issue 已迁入 work items 框架（18.7 GA）即是一例。本文检索日期 2026-10-27；适配器维护时应以当时官方文档复核端点与字段（codeup 的 CreateWorkitemV2 / CreateWorkitemComment 两端点已于 2026-10-27 按此核验）。

## 来源清单（检索日期均为 2026-10-27）

- GitHub：docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues；…/using-issues/linking-a-pull-request-to-an-issue；…/using-issues/filtering-and-searching-issues-and-pull-requests；docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests；docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls；github.com/orgs/community/discussions/69759
- GitLab：docs.gitlab.com/ee/user/project/issues/；docs.gitlab.com/ee/user/project/merge_requests/；docs.gitlab.com/user/project/merge_requests/drafts；docs.gitlab.com/user/project/issues/crosslinking_issues；docs.gitlab.com/ee/api/
- Codeup：help.aliyun.com/zh/yunxiao/user-guide/personal-access-token；help.aliyun.com/zh/yunxiao/developer-reference/ 下的 api-devops-2021-06-25-listgrouprepositories / getmergerequest / listmergerequests（旧）、mergechangerequest-merge-merge-request、createworkitemv2、listworkitems、createworkitemcomment、workitemattachmentcreate；help.aliyun.com/zh/yunxiao/user-guide/code-base-usage-issues
