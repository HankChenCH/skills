---
id: 0010
type: feature
spec: 0005
status: implemented
blocked-by: []
created: 2026-10-28
---
# 0010: l4-guard 判定脚本与测试用例组

**做什么：** 新增 `skills/setup-workspace/assets/hooks/l4-guard.sh`（stdin JSON → 规则 A/B 判定 → deny JSON 或静默放行，失效安全贯穿，spec 0005 实现决策的全部契约），run-tests.sh 新增 L4 用例组覆盖拦截/放行/失效安全矩阵。check.sh 零改动。

**验收标准：**
- [x] assets/hooks/l4-guard.sh 存在且可执行，规则 A（--no-verify 长形式与 git commit -n 短形式 deny、正常命令放行）、规则 B（CODE_DIRS 命中无票 deny、in-progress 放行、ready deny、docs/仓库外/CODE_DIRS 空放行）、失效安全（缺 config.sh、非法 JSON、空 stdin、缺字段全放行）行为与 spec 0005 实现决策一致（FR-1/FR-2/FR-3｜证据：run-tests.sh L4 用例组全绿）
- [x] run-tests.sh 新增 L4 用例组 ≥13 条，断言 exit 码 + deny JSON 标记 + 理由子串（FR-1/FR-2/FR-3｜证据：run-tests.sh 输出 121/121——原 99 + L4 组 22 条全绿）
- [x] check.sh 零改动（assets 与本仓实例均不动）（FR-3｜证据：git diff 不含 check.sh）

**Blocked by：** （无）

## Progress
- 红绿循环：先落 L4 用例组 22 条（红：脚本缺失 23 失败，含暴露的 git-hook 端到端组对上一段夹具的隐式依赖），再实现 assets/hooks/l4-guard.sh（绿：121/121 全绿）。
- 红步副产物：git hook 转发端到端组改为自备 new_repo + in-progress 工单夹具（消除段间耦合，行为断言不变，仍 2 条）。
- 实现要点：json_str 用 `\([^\"]*\)` 截取（贪婪 `.*` 会跨字段误吞后续 JSON）；file_path 归一化（相对锚根、目录取物理路径）；规则 A 的 -n 短形式用 `git commit` 段内独立 token 正则（不跨 `;|&`）；deny JSON 恰好三键（hookEventName/permissionDecision/permissionDecisionReason），stderr 同步日志行。
- 无尾巴。
