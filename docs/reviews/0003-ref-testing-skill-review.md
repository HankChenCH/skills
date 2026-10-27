---
id: 0003
status: approved
tickets: [0005]
branch: main
created: 2026-10-27
approved: 2026-10-27
---
# 0003: ref-testing 参考技能（ticket 0005 / spec 0003）双轴评审

评审依据：spec 0003（approved）+ ticket 0005 全文。CODING_STANDARDS.md 不存在（与本仓库 review 0002 先例一致），标准轴依据 ref-implementation 七条标准 + ref-review 坏味道基线，叠加蓝图 §11.3/§13.1 技能格式规范。评审对象：蓝图 v1.4 修订（版本行/修订记录/§7.1/§7.2/§10.1/§10.2/§11.3）、skills/ref-testing/SKILL.md、references/ 六文件、GLOSSARY 两条登记、~/.zcode/skills/ref-testing 符号链接（提交 3299807 及其评审修复）。

## 标准轴 findings

- [skills/ref-testing/references/stress-capacity.md:30-34] 好例数字自相矛盾：目标"导入 5000 行 ≤ 2s"折算吞吐需 ≥2500 行每秒，同例实测拐点却写约 500 行每秒，结论"容量满足 FR-3"不成立——标准技能里的好例自身失真，会教出错误结论（正确性缺陷）。（阻断）**已修复**：目标折算显式化，梯度改为 1500/2500/3500、拐点约 3200 行每秒 > 所需 2500，结论改为带余量与瓶颈归因；行数保持 49（30–60 达标）。**复审通过**。
- [docs/sdlc-skills-blueprint.md:322] §7.2 新增注记"ref-testing 按 §7.2 的固定时机装载"在 §7.2 内自引用，表述循环。（建议）**已修复**：改为"dev-implement / dev-fix 按上表固定时机装载 ref-testing 本体"。

核验记录（无其余 findings）：知识单源——SKILL.md 通则与其余五份细则对通则的引用是"引用"而非重抄，反模式表（SKILL.md 三条通用）与各细则反模式节（分类特有）不重复；路由表六场景与 references/ 文件一一对应，无死链（六文件均存在）；术语来自 GLOSSARY（seam、工单级/集成级）或首次出现给定义（稳态假设已登记）；边界进了路由规则（"两可时按更接近实际失败的一层选"）而非注释；无投机泛化（六类之外未擅自加类，未匹配场景自然落回通则，符合 YAGNI）；diff 最小化——提交仅含 spec 验收范围内文件。

## Spec 轴 findings

- [ticket 0005 / spec 0003] 走样（记录，非阻断）：GLOSSARY 除 FR-4 字面的"稳态假设"外，另在流程术语·关键机制章登记了"红绿循环"。判定：FR-4"新术语（稳态假设等）"的"等"字覆盖；且红绿循环是蓝图/METHOD 共用的流程词汇，放项目术语章反而不合其格式约定，登记位置是更正确的选择。不构成需要回退的偏离，留档供 retro 参考。
- 逐 FR 核销：FR-1 蓝图五处条款 + v1.4 修订记录齐（grep 证据见票）；FR-2 SKILL.md 45 行、description 四段、路由六行、反模式三行；FR-3 六文件 49–60 行、骨架四要素逐文件命中；FR-4 符号链接 readlink 一致 + GLOSSARY 命中。缺失 0；超范围 0（改动文件全部在 spec 验收范围内）。

## 范围外备注

- 消费者技能 dev-implement（批 1 余项）/ dev-fix（批 2）未实现，引用矩阵的运行时装载行为待其建成后验证（ticket Progress 已记）。
- `.zcode/` 目录 untracked，与本工单无关，未纳入提交。

## 汇总

标准轴阻断 0 / 建议 0（1 条阻断已修复并复审核销，1 条建议已采纳）；Spec 轴阻断 0 / 建议 0（另有 1 条走样记录，判定不构成阻断）。结论：approved。
