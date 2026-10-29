---
id: 0010
type: feature
spec: 0009
status: ready
blocked-by: [0006]
created: 2026-10-29
---
# 0010: 工单 repos 字段与 validate 校验

**做什么：** 工单 frontmatter 增可选单行 `repos` 列表（值为成员清单中的目录名）：
validate 在该字段非空时逐值校验其在清单内、缺省不触发；METHOD.md 工单模板增字段
说明；dev-plan 增一行"跨仓库工单应填 repos"。

**验收标准：**
- [ ] validate fixture 工单：`repos: [a, b]` 且两值均在清单 → 通过；含清单外值 →
  报错点名非法值；字段缺省 → 不触发该校验（[FR-9]）
- [ ] METHOD.md 工单模板与 dev-plan SKILL.md 各增一行说明；改动后既有全部产物
  `check.sh validate` 回归通过

**Blocked by：** 0006

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
