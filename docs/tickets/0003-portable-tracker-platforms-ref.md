---
id: 0003
type: fix
spec: 0001
status: implemented
blocked-by: []
created: 2026-10-27
---
# 0003: 平台模型参考随技能分发（修复跨机器路径失效）

**做什么：** 用户发现 decisions.md 指引"读本仓库 docs/research/0001-…"在技能安装到其他机器后失效——技能安装只带 SKILL.md/assets/references，源仓库 docs/ 不跟随。修复：平台模型参考落入技能自身 `references/tracker-platforms.md`（随技能分发），decisions.md 改指技能内相对路径，SKILL.md 前置校验的完整性清单补入该文件；docs/research/0001 作为调研快照留档，头部注明可移植副本位置。全技能目录已扫描：同类"指向技能源仓库路径"的引用仅此一处（2026-10-27 grep 证据见 Progress）。

**验收标准：**
- [x] skills/setup-workspace/references/tracker-platforms.md 存在且内容自足（证据：结论速览 + GitHub/GitLab/Codeup 三节 + 映射要点 + 来源清单，与 research 0001 三平台事实逐节一致，仅引言改为技能视角）
- [x] decisions.md 选 GitLab 小节引用技能内相对路径，源仓库路径引用清零（证据：grep -rn "docs/research" skills/ = 0；decisions.md:20 现指向 references/tracker-platforms.md）
- [x] SKILL.md 前置校验完整性清单含 tracker-platforms.md，安装损坏可被检出（证据：SKILL.md:22）
- [x] run-tests.sh 全绿（证据：通过 61 / 失败 0，ALL PASSED）
- [x] research 0001 头部注明可移植副本位置与更新路径（证据：调研问题与用途节首行 blockquote）

**Blocked by：** 无

## Progress
2026-10-27 完成。同类问题全仓扫描（grep "docs/research|本仓库|workspace/skills|Desktop|../.." 于 skills/ --include=*.md）：仅 decisions.md:20 一处指向技能源仓库路径；其余"本仓库 / docs/"引用均语义指向目标工作区（setup 后存在），dev-review / ref-* / ref-git-commit 无源仓库路径，蓝图引用不随技能安装不算。修复：新增 references/tracker-platforms.md（含出处与更新规则：改技能侧文件、留档不回改）、decisions.md 改指技能内路径、SKILL.md 完整性清单补入、research 0001 加互指 blockquote。尾巴：无。评审注意：research 0001 与 references/tracker-platforms.md 为快照/活文件关系，已在两文件头部写明单向更新规则。
