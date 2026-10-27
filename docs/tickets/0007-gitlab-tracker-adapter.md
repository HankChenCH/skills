---
id: 0007
type: feature
spec: 0004
status: implemented
blocked-by: []
created: 2026-10-27
---
# 0007: gitlab tracker 适配器

**做什么：** `TRACKER=gitlab` 时，`check.sh publish <产物>` 把该产物投影为 `TRACKER_REPO`（group/project）下的 GitLab issue——契约与 github 适配器镜像（首行盘上指针、映射幂等、失败警告跳过 exit 0），CLI 换 glab；适配器同时落 assets/ 与本仓实例。

**验收标准：**
- [x] 夹具仓库 TRACKER=gitlab + PATH 前置已认证 fake glab：publish exit 0，fake 日志含一次 issue create，gitlab.map 新增一行（FR-2｜证据：run-tests.sh「gitlab 投影收到一次 issue create」「gitlab 映射落行（路径与编号与URL）」ok）
- [x] 映射已有记录：二次 publish 走 issue update，无第二次 create（FR-2｜证据：「gitlab 幂等：二次 publish 走 issue update」「update 存在」「无第二次 create」「映射仍一行」ok）
- [x] glab 不在 PATH 或 auth status 失败：exit 0，stderr 说明原因，fake 零调用（FR-2｜证据：「glab 未认证警告跳过且零创建」「未认证路径无 create 调用」「glab 缺失警告跳过」「TRACKER_REPO 缺失警告跳过」ok）
- [x] assets/trackers/gitlab.sh 与 .sdlc/trackers/gitlab.sh 内容一致且可执行（FR-2｜证据：diff 为空；两文件 rwxr-xr-x）

**Blocked by：** 无

## Progress
- 与 github 适配器同构（88 行）：前置校验逐项警告跳过、投影正文首行盘上指针 + 60KB 截断、.map 幂等分 create/update；差异点 = 描述经 --description 传参、编号从输出按 issues/N 或 #N 宽松解析（解析不出警告跳过）。
- github 轮沉淀的三条 bash 3.2 教训（${var} 括起、pwd -P、目录层级）直接预用，一轮转绿（87/87）。
- 真实 glab 凭据本机不可得，真实投影留给验收阶段集成级场景。
