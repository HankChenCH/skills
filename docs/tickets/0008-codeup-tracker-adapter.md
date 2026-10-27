---
id: 0008
type: feature
spec: 0004
status: ready
blocked-by: []
created: 2026-10-27
---
# 0008: codeup tracker 适配器

**做什么：** `TRACKER=codeup` 时，`check.sh publish <产物>` 把该产物镜像为 Projex 工作项（Task 类）并以 MARKDOWN 评论承载正文——坐标 `TRACKER_REPO=<organizationId>/<spaceIdentifier>`，令牌/负责人/工作项类型标识/接入点由 `CODEUP_TOKEN`/`CODEUP_ASSIGNEE`/`CODEUP_WORKITEM_TYPE`/`CODEUP_ENDPOINT` 提供；任一缺失或 API 失败警告跳过（exit 0）；更新语义 = 映射已存在时仅追加评论。两端点（CreateWorkitemV2、CreateWorkitemComment）为 2026-10-27 一手核验路径。

**验收标准：**
- [ ] CODEUP_TOKEN / CODEUP_ASSIGNEE / CODEUP_WORKITEM_TYPE 任一缺失：publish exit 0，stderr 指明缺哪个配置项，零 HTTP 调用（FR-3｜证据：run-tests.sh 用例绿）
- [ ] 配置齐备 + PATH 前置 fake curl：publish exit 0，依序调用创建与评论两端点，codeup.map 落 workitemIdentifier（FR-3｜证据：同上）
- [ ] 映射已有记录：二次 publish 仅追加评论、无第二次创建调用（FR-3｜证据：同上）
- [ ] assets/trackers/codeup.sh 与 .sdlc/trackers/codeup.sh 内容一致且可执行（FR-3｜证据：diff 为空 + 可执行位）

**Blocked by：** 无

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
