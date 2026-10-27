---
id: 0006
type: feature
spec: 0004
status: implemented
blocked-by: []
created: 2026-10-27
---
# 0006: github tracker 适配器

**做什么：** `TRACKER=github` 时，`check.sh publish <产物>` 把该产物投影为 `TRACKER_REPO`（owner/repo）下的 GitHub issue——正文首行盘上指针、映射文件支撑幂等更新；gh 缺失/未认证/API 失败一律警告跳过（exit 0）不阻断技能出口链；适配器同时落 setup-workspace assets/（模板）与本仓 .sdlc/trackers/（实例）。

**验收标准：**
- [x] 夹具仓库 TRACKER=github + PATH 前置已认证 fake gh：publish exit 0，fake 日志含一次 issue create，github.map 新增一行（盘上路径 + 编号 + URL）（FR-1｜证据：run-tests.sh「github 投影收到一次 issue create」「github 映射落行（路径与编号与URL）」ok）
- [x] 映射已有记录：二次 publish 走 issue edit，无第二次 create，映射仍一行（FR-1｜证据：「github 幂等：二次 publish 走 issue edit」「无第二次 create」「映射仍一行」ok；另经本仓真实凭据复投 specs/0004 复核——更新 issue #1 不重建）
- [x] gh 不在 PATH 或 auth status 失败：exit 0，stderr 说明原因，fake 零调用（FR-1｜证据：「gh 未认证警告跳过且零创建」「未认证路径无 create 调用」「gh 缺失警告跳过」「TRACKER_REPO 缺失警告跳过」ok）
- [x] assets/trackers/github.sh 与 .sdlc/trackers/github.sh 内容一致且可执行（FR-1｜证据：diff 为空；两文件 rwxr-xr-x）

**Blocked by：** 无

## Progress
- 适配器 74 行：前置校验（TRACKER_REPO/gh 安装/认证，逐项警告跳过 exit 0）→ 投影正文（首行盘上指针 + 60KB 截断）→ 映射查 existing 分 create/edit → 成功后落 .map。
- 红绿中修掉三个真缺陷：bash 3.2 变量紧邻全角括号报 unbound（${var} 括起）、pwd 未加 -P 与 check.sh 物理路径失配（/var 符号链接）、ROOT 少上一级目录（.sdlc/trackers/.. ≠ 仓库根）。
- 无尾巴；评审注意点：投影消息前缀已消重（tn 用例护住）；check.sh all 零检查命令为既有发现，已如实报告。
