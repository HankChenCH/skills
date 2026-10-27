---
id: 0006
type: feature
spec: 0004
status: ready
blocked-by: []
created: 2026-10-27
---
# 0006: github tracker 适配器

**做什么：** `TRACKER=github` 时，`check.sh publish <产物>` 把该产物投影为 `TRACKER_REPO`（owner/repo）下的 GitHub issue——正文首行盘上指针、映射文件支撑幂等更新；gh 缺失/未认证/API 失败一律警告跳过（exit 0）不阻断技能出口链；适配器同时落 setup-workspace assets/（模板）与本仓 .sdlc/trackers/（实例）。

**验收标准：**
- [ ] 夹具仓库 TRACKER=github + PATH 前置已认证 fake gh：publish exit 0，fake 日志含一次 issue create，github.map 新增一行（盘上路径 + 编号 + URL）（FR-1｜证据：run-tests.sh 用例绿）
- [ ] 映射已有记录：二次 publish 走 issue edit，无第二次 create，映射仍一行（FR-1｜证据：同上）
- [ ] gh 不在 PATH 或 auth status 失败：exit 0，stderr 说明原因，fake 零调用（FR-1｜证据：同上）
- [ ] assets/trackers/github.sh 与 .sdlc/trackers/github.sh 内容一致且可执行（FR-1｜证据：diff 为空 + ls -l 可执行位）

**Blocked by：** 无

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
