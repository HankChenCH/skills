---
id: 0011
type: feature
spec: 0005
status: ready
blocked-by: [0010]
created: 2026-10-28
---
# 0011: setup L4 接线、话术现状化与本仓安装

**做什么：** setup-workspace 接线 L4：assets 分发已就位（0010）基础上，SKILL.md 前置校验与 §3 生成表补 `.sdlc/hooks/`，generation.md 补安装细则、ZCode 会话额外动作（`.zcode/config.json` hooks 块合并：enabled:true、幂等、其余内容不动）与收尾报告模板行；zcode.md 接入差异现状化、claude-code.md 标注候选载体本批不接线；文档与台账同步（GLOSSARY 已随 need/spec 先行，此处 concepts.md/README/蓝图 §10.2 标注）；本仓安装（`.sdlc/hooks/l4-guard.sh` + `.zcode/config.json` hooks 块）并手工喂样例 JSON 验证 deny/放行。

**验收标准：**
- [ ] SKILL.md §0 校验清单含 hooks/，§3 生成表补 `.sdlc/hooks/l4-guard.sh` 行（FR-4｜证据：SKILL.md 对应节）
- [ ] generation.md：`.sdlc/hooks/` 安装细则 + ZCode 额外动作（hooks 块合并模板与幂等语义）+ §4 收尾报告模板含 L4 行（FR-4｜证据：generation.md 对应节）
- [ ] zcode.md 接入差异现状化（安装说明替换"本批只装 git hooks"）；claude-code.md 标注"同构候选载体，本批不接线"；全仓无"批 3 才装 L4"类过时话术残留（FR-4｜证据：grep）
- [ ] concepts.md PreToolUse 条目、README 台账（批 3 进度）、蓝图 §10.2 批 3 L4 hooks 标注完成与实物一致（FR-5｜证据：对应文件）
- [ ] 本仓安装完成：`.sdlc/hooks/l4-guard.sh` 就位可执行，`.zcode/config.json` hooks 块合入（enabled:true、既有内容不动、合并后 JSON 可解析），手工喂 deny/放行样例 JSON 行为正确（FR-4｜证据：安装记录与手工验证输出）

**Blocked by：** 0010

## Progress
- （未开工）
