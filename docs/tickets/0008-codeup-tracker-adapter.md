---
id: 0008
type: feature
spec: 0004
status: done
blocked-by: []
created: 2026-10-27
done: 2026-10-28
---
# 0008: codeup tracker 适配器

**做什么：** `TRACKER=codeup` 时，`check.sh publish <产物>` 把该产物镜像为 Projex 工作项（Task 类）并以 MARKDOWN 评论承载正文——坐标 `TRACKER_REPO=<organizationId>/<spaceIdentifier>`，令牌/负责人/工作项类型标识/接入点由 `CODEUP_TOKEN`/`CODEUP_ASSIGNEE`/`CODEUP_WORKITEM_TYPE`/`CODEUP_ENDPOINT` 提供；任一缺失或 API 失败警告跳过（exit 0）；更新语义 = 映射已存在时仅追加评论。两端点（CreateWorkitemV2、CreateWorkitemComment）为 2026-10-27 一手核验路径。

**验收标准：**
- [x] CODEUP_TOKEN / CODEUP_ASSIGNEE / CODEUP_WORKITEM_TYPE 任一缺失：publish exit 0，stderr 指明缺哪个配置项，零 HTTP 调用（FR-3｜证据：run-tests.sh「codeup：缺 CODEUP_TOKEN/ASSIGNEE/WORKITEM_TYPE 警告」三条 ok，警告先于任何 curl 调用）
- [x] 配置齐备 + PATH 前置 fake curl：publish exit 0，依序调用创建与评论两端点，codeup.map 落 workitemIdentifier（FR-3｜证据：「codeup 依序调用创建与评论两端点」（awk 序断言）「投影正文带盘上指针」「映射落 workitemIdentifier」ok）
- [x] 映射已有记录：二次 publish 仅追加评论、无第二次创建调用（FR-3｜证据：「codeup 幂等：评论端点被调用」「无第二次创建调用」「映射仍一行」ok）
- [x] assets/trackers/codeup.sh 与 .sdlc/trackers/codeup.sh 内容一致且可执行（FR-3｜证据：diff 为空；两文件 rwxr-xr-x）

**Blocked by：** 无

## Progress
- 适配器 106 行：逐项配置校验（缺失即指名警告跳过）→ 投影正文（盘上指针 + 60KB 截断）→ awk JSON 转义（\ " 换行 制表 回车）→ create+comment 两端点（HTTP 200 校验，-w 取码）→ 成功后落 .map；更新语义 = 仅追加评论。
- 部分失败显式化：评论失败时警告注明"工作项可能已创建、映射未记录，重发会重复创建——先人工核对 Projex"。
- 真实 Codeup 凭据本机不可得，端点正确性依据 2026-10-27 一手核验 + fake 断言调用面；真实投影留给验收阶段。
