---
id: 0004
type: feature
spec: 0002
status: done
blocked-by: []
created: 2026-10-27
done: 2026-10-29
---
# 0004: 新增 sdlc 总控技能（next 路由 + 上下文 token 水位线）

**做什么：** 只读调度总控：默认模式调 `check.sh phase` + `frontier` 出四段盘点报告（当前阶段/可做的事/被挡在哪/循环状态）；next 模式按优先级路由表用 Skill 工具推进流水线到下一个决策点，多张 ready 工单问询（带默认建议），目标技能未安装报断链指路；每次调用目标技能前评估会话上下文 token 用量占窗口百分比并定档（绿 <30% / 黄 30%–50% / 红 ≥50%，用户 2026-10-27 定档），黄档单阶段收口不自动串联、红档停止推进建议新会话续接。蓝图先行修订至 v1.3（§11.2 操作化），再落 skills/sdlc/（SKILL.md + references/next-mode.md + references/context-watermark.md），符号链接安装。

**验收标准：**
- [x] 蓝图 v1.3 先于技能落盘：§11.2 细化（报告结构/路由表落点/水位线/断链）+ 修订记录（证据：蓝图版本行 v1.3 · 2026-10-27 与 §11.2 四条）
- [x] skills/sdlc/SKILL.md 为纯控制流（56 行），frontmatter 仅 name/description，description 覆盖三句典型话术（证据：wc -l = 56；文面核对"现在该做什么/项目进展/继续推进"均命中）
- [x] 默认模式报告四段齐全且只读（证据：check.sh phase + frontier 实跑正常；git status 运行前后 diff 为空）
- [x] next 模式路由表按优先级 11 行、断链指路、多工单问询规则齐备（证据：references/next-mode.md；本库实测 3 票 implemented 且被 approved 评审覆盖 → 命中 dev-ship → 如实报断链）
- [x] 水位线三档判据与话术规范落 references/context-watermark.md，30/50 定档标注来源与日期（证据：档位表"2026-10-27 用户定档"）
- [x] 安装到 ~/.zcode/skills/sdlc（符号链接，与既有技能同法）（证据：ls -la 链接指向本仓库 skills/sdlc）

**Blocked by：** 无

## Progress
2026-10-27 完成（实现先于补记，spec 0002 同日补记）：蓝图 v1.3、三个技能文件、符号链接安装。§13.2 自测：① 触发——文面核验过，真实触发留待新会话（技能列表会话内不刷新）；② 拒绝——临时 git 仓库无 .sdlc/check.sh，§0 停止并指路 setup-workspace；③ 重入——两次盘点输出逐字节一致；④ 产物校验——零写盘，git status 前后无变化；⑤ 衔接——dev-ship 断链报法实测；⑥ 水位线——档位落在自动压缩阈值（80–90%）之前，估算公式宁高勿低，黄/红档不跳过决策点。尾巴：无。评审注意：水位档位为用户定档，如需按模型调优改 references/context-watermark.md 并同步蓝图 §11.2。
