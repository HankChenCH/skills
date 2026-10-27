---
id: 0007
type: feature
spec: 0004
status: ready
blocked-by: []
created: 2026-10-27
---
# 0007: gitlab tracker 适配器

**做什么：** `TRACKER=gitlab` 时，`check.sh publish <产物>` 把该产物投影为 `TRACKER_REPO`（group/project）下的 GitLab issue——契约与 github 适配器镜像（首行盘上指针、映射幂等、失败警告跳过 exit 0），CLI 换 glab；适配器同时落 assets/ 与本仓实例。

**验收标准：**
- [ ] 夹具仓库 TRACKER=gitlab + PATH 前置已认证 fake glab：publish exit 0，fake 日志含一次 issue create，gitlab.map 新增一行（FR-2｜证据：run-tests.sh 用例绿）
- [ ] 映射已有记录：二次 publish 走 issue update，无第二次 create（FR-2｜证据：同上）
- [ ] glab 不在 PATH 或 auth status 失败：exit 0，stderr 说明原因，fake 零调用（FR-2｜证据：同上）
- [ ] assets/trackers/gitlab.sh 与 .sdlc/trackers/gitlab.sh 内容一致且可执行（FR-2｜证据：diff 为空 + 可执行位）

**Blocked by：** 无

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
