---
id: 0002
type: feature
spec: 0001
status: done
blocked-by: []
created: 2026-10-27
done: 2026-10-28
---
# 0002: 新增 ref-git-commit 参考技能

**做什么：** 先改蓝图再写技能（治理规则）：§7 三层架构与 §7.1 补第 5 个参考技能 ref-git-commit 的内容要点，§7.2 引用矩阵加 dev-implement（开工装载）与 dev-ship（装载）两行，§10.1 清单加行（19→20），§10.2 批 1 增补；然后实现 skills/ref-git-commit/SKILL.md——规范提交与合并信息（提交粒度、首行 `[#NNNN]`/`[trivial]` 结构、正文写法、合并方式与合并信息），并符号链接安装到 `~/.zcode/skills/`。

**验收标准：**
- [x] 蓝图 §7 / §7.1 / §7.2 / §10.1 / §10.2 均登记 ref-git-commit，参考技能计数 4→5（证据：grep -c ref-git-commit 蓝图 = 6 处；§7 架构图"5 个"、§10.1 标题"20 个 = 15 流程 + 5 参考"、批 1"13 个"）
- [x] SKILL.md frontmatter 注明内部参考身份与加载时机（§7.3），不设 disable-model-invocation（§13.1）（证据：description 首句"内部参考"+ dev-implement/dev-ship 装载说明 + 直连请求引导）
- [x] 内容覆盖提交粒度 / 首行结构 / 正文 / 合并信息四块，含好/差对照范例（§11.3 格式）（证据：§提交 5 条 + §合并 2 条 + §范例好/差三例）
- [x] 全文 30–60 行，符合 §12 文风基准（开头定性职责、约 70 行内）（证据：wc -l = 53）
- [x] 按蓝图 §13.2 自测清单执行并记录（触发/门禁拒绝/重入/产物校验/衔接）（证据：Progress 五条记录）
- [x] 安装后 Skill 工具可列出 ref-git-commit（证据：~/.zcode/skills/ref-git-commit 符号链接指向本仓库 skills/ref-git-commit，与 dev-review 同法；技能列表随新会话刷新）

**Blocked by：** 无

## Progress
2026-10-27 完成：蓝图登记（§7 计数、§7.1 要点、§7.2 矩阵 dev-implement+dev-ship、§10.1 清单、§10.2 批 1 增补并标 ✅）、skills/ref-git-commit/SKILL.md 落盘（53 行）、符号链接安装 ~/.zcode/skills/。§13.2 自测：① 触发——description 含内部身份与直连引导，静态核验过（行为验证待新会话，技能列表当前会话不刷新）；② 门禁拒绝——ref 技能无入口门禁，拒绝行为=不响应独立请求、description 已声明转 dev-implement/dev-ship；③ 重入——N/A（无状态参考，不写产物）；④ 产物校验——非八类产物，validate 不适用，对照 §11.3/§13.1 人工核验通过（53 行、好/差对照、frontmatter 仅 name/description）；⑤ 衔接——加载时机已入 §7.2 矩阵，消费者（dev-implement/dev-ship）为批 1 余项。尾巴：无。
