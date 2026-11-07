---
id: 20261107-450d
status: confirmed
created: 2026-11-07
confirmed: 2026-11-07
---
# ref-refactoring-ui：Refactoring UI 方法论参考技能

## 背景与业务目标

design-* 链（design-brief → design-baseline → design-ui → design-deliver）里，design-baseline 解决"项目风格跟随什么"，design-ui 解决"按约束出布局与原型"，但两者都不携带"单界面怎么设计得好看"的通用章法——配色怎么起步、间距怎么定阶梯、层级怎么营造，目前靠模型通用知识，没有本仓库内的方法论参考。

《Refactoring UI》（Adam Wathan & Steve Schoger 著）是界面视觉设计方法论的系统总结，翻译仓库 https://github.com/read-x/refactoring-ui-zh 提供其官方目录结构的 9 章中文译文（commit `ec3aa73`，2026-11-07 快照）。用户原话：访问该仓库，取 01～09 markdown 文件，构建 ref-refactoring-ui 技能。

业务目标（可验证）：
- `skills/ref-refactoring-ui/` 存在，软链入 `~/.zcode/skills/` 后可被 Skill 工具加载。
- 9 个分册与原书 9 章一一对应，每条规则标注来源章。
- design-baseline / design-ui 两处挂载生效（frontmatter description 可查到「加载 ref-refactoring-ui」）。
- 公开仓库（github.com/HankChenCH/skills）内无原书译文段落、无原书图片文件——版权风险为零。

不做的代价：design-ui 出界面方案时继续裸靠通用知识，同一约束下产出质量不稳定，基线分册里"配色/字体/间距阶梯"各项目重推一遍。

## 干系人与用户

| Actor | 要完成什么 | 成功标准 |
|---|---|---|
| 设计执行会话（design-baseline / design-ui 内的 AI） | 建基线、出界面设计时加载本技能，按路由读分册，用其中规则支撑设计决策 | 设计决策能指回具体分册规则（如"间距取 4px 阶梯，见 layout-spacing.md"） |
| 仓库维护者（用户本人） | 构建技能、挂载两处、提交留痕 | `.sdlc/check.sh` 全绿；推 GitHub 后不构成对原书内容的再分发 |
| 原书作者与翻译仓库维护者 | 外部版权方，不参与 | 约束：译文与图片不授许可（翻译仓库 NOTICE 自述，仅其工具/文档为 MIT），技能内不得出现原文段落与图片文件 |

## 系统能力需求

- **FR-1** 能以 `ref-refactoring-ui` 技能提供 Refactoring UI 方法论参考：位于 `skills/ref-refactoring-ui/`，含 `SKILL.md` 与 `references/` 九个分册，软链后在 `~/.zcode/skills/` 可加载。（来源：用户原话"构建 ref-refactoring-ui 技能"）
- **FR-2** 九分册与原书 9 章一一对应：分册文件名用英文短横线体（如 `hierarchy.md`），册首注明对应原章序号与原章名（如"← 原书 02 层级就是一切"）。（来源：决策卡 D3）
- **FR-3** 分册内每条规则可溯源：标注来源原章；规则为蒸馏后的可执行形式（含正反例文字描述），不出现原书译文段落、不包含图片文件。（来源：决策卡 D1）
- **FR-4** `SKILL.md` 提供按任务路由：建基线、出布局、选配色、定排版、用图片、收尾打磨等任务各指到对应分册，并写明适用边界——仅图形界面（Web/移动端/桌面端），CLI 与文档视觉不适用。（来源：决策卡 D3 + 干系人场景）
- **FR-5** `SKILL.md` 附来源留痕：翻译仓库 URL 与内容快照 commit（`ec3aa73`），及"译文/图片版权归原书作者、本技能为蒸馏"的版权声明。（来源：决策卡 D1 + 版权约束）
- **FR-6** design-baseline 与 design-ui 两个技能的 frontmatter description 各追加「加载 ref-refactoring-ui」挂载语；其余技能不动。（来源：决策卡 D2）
- **FR-7** 分册体量对齐 ref-* 家风：每分册 ≤ 80 行（ref-testing 分册实为 49–60 行），总标准进 `SKILL.md`（对齐 ref-writing 的 45 行主文件体量）。（来源：家风查证）
- **FR-8** 蒸馏引入的新术语（如视觉层级、间距阶梯）按 ref-writing 规则登记 GLOSSARY 项目术语章。（来源：ref-writing 规则 4）

## 场景

主流程 1——建基线：
- Given design-baseline 被调用且项目无既有设计分册
- When 引导产出基线分册（配色/字体/密度/间距阶梯/组件观感/反例）
- Then 加载 ref-refactoring-ui，按路由读色彩、文字、布局分册，基线分册内容能指回对应规则

主流程 2——出界面设计：
- Given design-ui 被调用且持有 brief 约束与基线
- When 产出布局与视觉决策
- Then 按任务路由读层级、布局、层次等分册，设计决策引用分册规则

异常流 1——非图形界面任务：
- Given design-ui 正在处理 CLI 或文档视觉分册的设计
- When ref-refactoring-ui 已被加载
- Then 路由亮牌"仅图形界面适用"，不强行套用（FR-4）

异常流 2——原仓库不可达：
- Given 翻译仓库被删除或改写
- When 会话需要核对某条规则的原文语境
- Then 以 SKILL.md 记录的快照 commit 为准；蒸馏已完成入册，日常使用不依赖原仓库在线（FR-5）

## 假设与风险

- **A1** design-ui 是五平台路由（Web/移动端/桌面端/CLI/文档视觉），挂载后 CLI/文档视觉任务也会带上本技能——按 FR-4 在路由内写明适用边界处理，不改 design-ui 路由逻辑。代价：低；不确定度：低。验收 20261107-2e76：验证通过（实载 SKILL.md 适用边界明示 CLI/文档视觉不适用；design-ui 路由结构未动）。
- **A2** 蒸馏忠实度：AI 蒸馏可能偏离原书某条的原始意图。缓解：验收时抽样对照——按快照 commit 拉取原文核对 2～3 条规则/册。代价：中（返工个别分册）；不确定度：中。验收 20261107-2e76：验证通过（实现 18/18 抽样对照 + 评审独立抽验一致；转录双窗口检测 0 命中）。
- **A3** 内容以快照 `ec3aa73` 为准，原仓库后续更新不回溯同步。代价：低（方法论稳定，原书已出版多年）；不确定度：低。验收 20261107-2e76：验证通过（SKILL.md 来源节锚定快照 commit，蒸馏入册不依赖原仓库在线）。
- 折回（自验收 20261107-2e76「下一轮建议」，非风险）：若日后因其他事由修订 spec 20261107-2f42，可顺带把分册 `start-from-ephemeral.md` 改名为贴近路由信号的 `start-from-feature.md`（评审 20261107-36a7 建议级 finding，因与 FR-2 册名清单字面冲突未采纳；路由表可兜底发现）。

## 范围与非目标

范围：
- `skills/ref-refactoring-ui/`（`SKILL.md` + `references/` 九分册）
- `skills/design-baseline/SKILL.md`、`skills/design-ui/SKILL.md` 两处挂载（仅 frontmatter description）
- GLOSSARY 项目术语章登记新术语（如有）
- 软链 `~/.zcode/skills/ref-refactoring-ui`、`.sdlc/check.sh` 全绿、[trivial] 提交留痕

非目标（全部来自显式拍板）：
- 不全文嵌入原书译文与图片（决策卡 D1 + 版权约束：推公开 GitHub = 再分发无授权内容）
- 不改 design-ui 五分册路由结构与 design-baseline 流程逻辑（仅挂载描述）
- 不产出 docs/standards/ 设计基线分册（那是 design-baseline 对具体项目的产物，本技能是通用方法论参考）
- 不做原书翻译的修正、勘误或补译

## 开放问题

（已清零，三路归置完成）

拍板记录：
- D1 → 蒸馏成规则（SKILL.md + 九分册、附源链接留痕），版权约束排除全文嵌入（去向 FR-3/FR-5）
- D2 → 设计链挂载：design-baseline + design-ui 两处 description 追加加载语（去向 FR-6）
- D3 → 一比一九分册 + SKILL.md 按任务路由，分册文件名英文（去向 FR-2/FR-4）
