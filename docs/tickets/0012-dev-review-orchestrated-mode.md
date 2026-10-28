---
id: 0012
type: feature
spec: 0006
status: done
blocked-by: []
created: 2026-10-28
done: 2026-10-28
---
# 0012: dev-review 编排模式入参

**做什么：** dev-review 增加编排模式分支：dev-execute 以入参显式指定工单编号与 diff 基线（运行分支）时，评审范围只取入参工单，出口止于"报告 approved + 报告"，不自动调 dev-ship（PR 准备由编排方在运行末统一执行）；无编排入参时单票路径行为逐字不变。check.sh 零改动。

**验收标准：**
- [x] 编排模式：给定显式工单编号与基线分支，评审报告 `tickets`/`branch` 记入参值，两轴阻断清零后 `status: approved` 即停，全程无 dev-ship 调用（FR-3/FR-4/FR-6｜证据：临时仓库 /tmp/dx-0012-rehearsal 演练——红步对现文本走查编排场景三处行为缺失（无入参收窄、基线写死主干、出口无条件 dev-ship，phase 实测整表取 implemented {9001,9002}），绿步走查新文本：§1 确定模式、§1.2 入参工单逐一核对 implemented、§2 基线分岔、§4.2 止于 approved 并声明"可合回"，9002 不入范围不重审）
- [x] 单票路径回归：无编排入参时入口仍自动识别当前分支 implemented 工单、出口仍自动调 dev-ship，与改动前行为一致（FR-6｜证据：新旧文本对照——"当前分支上 implemented"自动识别与"立即用 Skill 工具调用 dev-ship"岔路逐字保留（SKILL.md L23/L58），仅外壳加模式分岔）
- [x] 影响面收敛：dev-implement、dev-ship、check.sh 零改动，改动仅 dev-review 技能文件（FR-6｜证据：git diff 范围 = skills/dev-review/SKILL.md + 本工票）

**Blocked by：** （无）

## Progress
- 红绿循环：红 = 现文本编排场景三处行为缺失（取证见验收标准一）；绿 = §1 增"确定模式"步 + §1.2 范围核对 + §2 基线分岔 + §4.2 出口分岔 + 禁止事项增一条，最小 diff，测试（演练夹具与期望）零改动。
- 编排入参为约定文本格式（"编排评审：工单 …，基线 …"），无机器解析——票 0013 的 dev-execute 按此格式调用，评审时注意两票契约咬合。
- 无尾巴；check.sh all 按本仓 config（无检查命令）响亮警告 exit 0，属已知状态非本票范围。
