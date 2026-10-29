---
id: 0016
type: feature
spec: 0007
status: done
blocked-by: []
created: 2026-10-29
done: 2026-10-29
---
# 0016: validate 清扫门禁（双份同步）

**做什么：** 门禁把"闭单即收敛"变成机械事实——spec 置 done 后，validate 全库扫描其名下过程档（工单按 `spec` 字段、验收报告按 `spec` 字段、评审按 `tickets` 与名下工单有交集），有残留即拒绝并逐个列出文件路径；draft / approved 的 spec 完全不受影响；活本与生成资产两份 check.sh 同步携带该规则。

**验收标准：**
- [x] run-tests.sh 新增用例组：夹具仓库含 status: done 的 spec 且名下 ticket / review / acceptance 各一，validate 该 spec 退出非零且输出含三个残留文件路径（用例组「spec done 残留扫描（清扫门禁）」三条"残留被点名"，rc=1 且各含 docs/tickets/0001-old-cart.md、docs/reviews/0001-old-review.md、docs/acceptance/0001-old-round1.md）
- [x] 同用例组：删除三个残留文件后 validate 该 spec 退出零（用例"清扫后 done spec 校验通过"，rm 后 rc=0）
- [x] 同用例组：approved spec 名下产物齐全时 validate 通过（残留扫描不触发）；review 的 tickets 仅指向其他 spec 名下工单时不误报（用例"approved spec 不触发残留扫描"rc=0；tn"其他 spec 名下工单不误报""仅指向其他 spec 工单的评审不误报"）
- [x] `diff .sdlc/check.sh skills/setup-workspace/assets/check.sh` 输出为空（两份同步）
- [x] run-tests.sh 全量输出 ALL PASSED（既有用例基线不降）（128 通过 / 0 失败）

**Blocked by：** 无

## Progress
交付：validate 新增 done spec 名下过程档残留扫描（新函数 spec_residue，复用 fm_get/fm_list/pad4，仅对 status: done 触发），双份 check.sh 逐字同步，run-tests.sh 新增用例组（置于 L4 guard 组前并自带 new_repo，避免重置主夹具破坏后续组的状态依赖）。
评审注意：review 残留判定按 spec 0007 简单交集口径（与盘上名下工单有交集）——工单已删而评审残留的窗口不报，依赖 dev-accept 原子清扫；.sdlc/config.sh 的 CHECK_* 全空，check.sh all 走"未定义检查命令"提示分支（既有接线缺口，非本票改动面）。
证据：run-tests.sh 128/128 ALL PASSED；diff 两份 check.sh 为空；红阶段三条"残留被点名"以"退出码 0，期望 1"确认行为缺失后转绿。
