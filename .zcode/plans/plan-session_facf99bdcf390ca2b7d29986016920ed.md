# dev-design 技能实现计划（草稿已经用户过目）

## 依据与关键判断

- check.sh 事实：validate 对 design/adr 只有通用校验（frontmatter/id/文件名/状态枚举），无必填节检查——与 adr 同款轻校验是既有设计。不改 check.sh，模板同构靠技能内嵌保证（§6.6 ①）。
- 定位：design 是可选产物（蓝图 §11.5 dev-plan 输入只有 spec，管线门禁不含 design），dev-design 入口有"不值得做就亮牌拒绝"分支（判据 = ADR 三条件命中或结构非显而易见），spec 必须 approved 才进。

## 改动清单（先文档后技能）

### 1. docs/sdlc-skills-blueprint.md（升 v1.9）

- 版本行 + v1.9 修订记录（design 可选产物定位、§6.5 补模板要点、§7.2/§8 补行、validate 轻校验说明）。
- §6.5 标题改"review / acceptance / design / adr 模板要点"，补 design 与 adr 两行要点（与草稿模板一致）。
- §7.2：dev-design 并入 ref-writing 行。
- §8 决策点表：dev-spec 行后插入 dev-design 行（出口 = publish design + ADR → 建议进 dev-plan；必问 = 方案批准、ADR 级取舍）。
- §11 末尾新增 §11.12 dev-design（触发/输入/亮牌判据/做什么/出口/门禁/ref 装载，与草稿一致）。

### 2. skills/sdlc/references/next-mode.md

第 7 行 `dev-design（批 2，常未安装）` → `dev-design（批 2）`；dev-clarify 行不动。

### 3. skills/dev-design/SKILL.md 新建

按已展示的草稿全文落盘（约 100 行，含 design/adr 两个模板 fence）。

### 4. GLOSSARY 双写（根 + assets）

关键机制章加 seam 术语：测试边界，测试只写在预定接口处；design 的 seam 清单是 spec 测试决策的细化，dev-implement 在其上落测试。

### 5. README 台账

批2 完成三例（dev-design：规格即蓝图 §11.12，可选产物定位），剩余 dev-clarify。

### 6. 安装 symlink

~/.zcode/skills/dev-design，与批1同法。

### 7. 自测（§13.2，结果写入 §10.2 批2标注）

行为实测：临时 design 样本过 validate（draft/approved 两态）+ 非法状态拦截；adr 样本 accepted/superseded 过 validate；测完即删并确认无残留。触发/拒绝/重入/衔接静态核验；产物节校验不适用（validate 对 design/adr 轻校验，如实标注）。

### 8. 入库提交

单提交 `[trivial]`："入库 dev-design 流程技能（蓝图 §11.12 按图施工，§10.2 标注完成）"，正文写明纯文档豁免理由；commit-msg 门禁确认放行。

## 明确不做

- check.sh 与 assets/check.sh 零改动。
- §12 范文不动（dev-implement 装载上下文不硬加 design——design 约束力靠评审，蓝图原设计即如此）。
- 不在本任务内真跑一次设计。