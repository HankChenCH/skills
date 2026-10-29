---
id: 0007
type: feature
spec: 0009
status: ready
blocked-by: [0006]
created: 2026-10-29
---
# 0007: 成员提交门禁（转发 + Merge/Revert 豁免）

**做什么：** 成员子仓库的提交被工作区仓库统一校验：带开工工单 `[#NNNN]` 放行；引用
不存在或 ready/done 拒绝并报原因；无引用且非豁免拒绝并提示规则；Merge/Revert 头机械
放行（工作区仓库自身同步受益）。成员不装 pre-push；外来 hook 不覆盖、报告并给合并方案。

**验收标准：**
- [ ] 夹具成员内提交含 `[#NNNN]` 且工单 in-progress → 放行；引用不存在 / ready / done
  → 拒绝并报出对应原因（[FR-4]）
- [ ] 无引用非豁免提交 → 拒绝并提示 `[#NNNN]` / `[trivial]` 规则；信息头
  `Merge branch …` 与 `Revert "…"` → 机械放行（[FR-4]/[FR-5]）
- [ ] 转发把 check.sh 工作目录锚定到工作区仓库根（成员内触发的校验读的是根 docs/
  tickets/，贴 ROOT 解析证据）；成员 `.git/hooks/` 无 pre-push 被装
- [ ] check.sh commit-msg 豁免变更后，工作区仓库自身提交门禁回归通过（`[trivial]`
  提交实测过 hook）
- [ ] generation.md / SKILL §3 增成员 hook 一行转发细则（锚定工作区根的理由写明）与
  外来 hook 处置沿用条款

**Blocked by：** 0006

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
