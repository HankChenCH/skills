---
id: 0005
type: feature
spec: 0003
status: implemented
blocked-by: []
created: 2026-10-27
---
# 0005: 新增 ref-testing 参考技能（六类测试参考 + 场景路由）

**做什么：** 先改蓝图再写技能（治理规则）：蓝图升 v1.4（§7.1 ref-testing 条目扩写、§7.2 引用矩阵加注、§10.1/§10.2 登记、§11.3 两级结构规格），然后实现 skills/ref-testing/——SKILL.md（总标准 + 通则 + 六场景路由表 + 反模式表 + 自查口令）与 references/ 六文件（红绿循环/表格驱动/集成/e2e/压力容量/混沌，各含加载时机、好用例标准、好/差对照、反模式、自查口令），符号链接安装到 ~/.zcode/skills/，新术语登记 GLOSSARY.md。

**验收标准：**
- [x] 蓝图升 v1.4，五处条款（§7.1/§7.2/§10.1/§10.2/§11.3）登记 ref-testing 六类参考与场景路由，先于技能文件落盘（证据：版本行 L10"版本 1.4"+ 新增 v1.4 修订记录；grep -c ref-testing 蓝图 = 9；§10.2 L404 标 ✅、§11.3 L445 两级结构；编辑按蓝图→技能顺序执行，spec 0003 FR-1 规定顺序）
- [x] SKILL.md ≤60 行，description 含"内部参考"与 dev-implement/dev-fix 装载时机，路由表六场景且声明"一次只载一个"，反模式表三条（证据：wc -l = 45；L3 description 四段齐；路由表六场景 L25–30；"一次只载一个" L21；反模式三行 L38–40）
- [x] references/ 六文件各 30–60 行，骨架齐全（加载时机/标准/好差对照/反模式/自查口令）（证据：wc -l = chaos 50 / e2e 57 / integration 60 / red-green 51 / stress-capacity 49 / table-driven 56；每文件骨架四要素 grep 各命中 4）
- [x] ~/.zcode/skills/ref-testing 符号链接指向本仓库 skills/ref-testing（证据：ls -la 显示 lrwxr-xr-x 指向 /Users/chenguoheng/Desktop/workspace/skills/skills/ref-testing，readlink 输出一致，与既有四个 ref-* 同法）
- [x] GLOSSARY.md 登记新术语（稳态假设）（证据：grep "稳态假设" GLOSSARY.md 命中项目术语条目；另在流程术语"关键机制"登记"红绿循环"）
- [x] 蓝图 §13.2 自测适用项执行并记录（证据：Progress 五条记录）

**Blocked by：** 无

## Progress
2026-10-27 完成：蓝图 v1.4（版本行、v1.4 修订记录、§7.1 扩写、§7.2 加注、§10.1 行更新、§10.2 标 ✅、§11.3 两级结构规格）→ skills/ref-testing/SKILL.md（45 行，通则 + 六场景路由 + 反模式表 + 自查口令）→ references/ 六文件（49–60 行，统一骨架）→ 符号链接安装 → GLOSSARY 登记。§13.2 自测：① 触发——description 含内部身份、dev-implement/dev-fix 装载时机与直连引导（静态核验；行为验证待新会话技能列表刷新）；② 拒绝路径——参考技能无入口门禁，拒绝行为 = 不响应独立测试请求，description 已声明转 dev-implement/dev-fix；③ 重入——N/A（无状态参考，不写产物）；④ 产物校验——技能文件非八类产物，validate 不适用，对照蓝图 §11.3/§13.1 逐项 grep 核验通过（行数/骨架/路由表/反模式表）；⑤ 衔接——装载时机已登记蓝图 §7.2/§7.3，消费者 dev-implement（批 1 余项）与 dev-fix（批 2）建成前由本技能承载标准。尾巴：无。
2026-10-27 评审（review 0003，双轴）：标准轴 1 条阻断（stress-capacity 好例目标折算吞吐与拐点数字矛盾）已修复并复审通过，1 条建议（蓝图 §7.2 注记自引用措辞）已采纳；Spec 轴缺失/超范围 0，1 条走样记录（GLOSSARY 另登记"红绿循环"，判定属 FR-4"等"字覆盖、不构成阻断）。两轴阻断清零，review 0003 approved。
