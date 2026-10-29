---
id: 0002
type: feature
spec: 0008
status: done
blocked-by: []
created: 2026-10-29
done: 2026-10-29
---
# 0002: 蓝图 §11.18 与 README 技能清单同步

**做什么：** 按蓝图治理规则"先改本文档再改技能"，在技能实现前把 setup-reconstruct 落进设计真相源：新增 §11.18 规格节（定位按需服务、入口门禁、逆向产物五路落点、证据与置信纪律、确认与落盘两路、增量对齐、分轮协议、禁止事项）、§10.1 技能总清单 21 → 22、版本修订记录一条；README 技能表 setup-\* 区加一行。本票是纯文档先行票，为 0003 的技能实现提供对齐基准。

**验收标准：**
- [x] 蓝图含 §11.18 setup-reconstruct 规格节，内容与 spec 0008 实现决策一致（grep 可查：reconstructed、证据格式、确认前置、增量对齐、禁止事项五关键词齐备）
- [x] 蓝图 §10.1 技能总清单计数 21 → 22 且 setup-reconstruct 行在列；版本行升 v1.18 并附修订记录（注明 need 0006 / spec 0008 来源）
- [x] README 技能表 setup-\* 区含 setup-reconstruct 行，一句话定位与蓝图节一致
- [x] METHOD.md 与 GLOSSARY 活本零改动（git diff 仅触及蓝图与 README 两个文件）

**Blocked by：** 无

## Progress
蓝图落 §11.18 规格节（触发/定位/五路落点/证据与置信/确认前置/落盘两路/增量对齐/分轮/状态机扩展/双轨边界/出口/禁止事项）、§10.1 升 22 = 17 流程 + 5 参考、版本行 v1.18 带 need 0006 / spec 0008 修订记录；README 总控与初始化表加行、三处计数同步（含项目状态行如实注明第 22 个实现接续中）。五关键词 grep 红先绿后（改动前全 0，改动后 reconstructed 4 / 证据格式 3 / 确认前置 2 / 增量对齐 7 / 禁止事项 7）；METHOD 与 GLOSSARY 活本零改动，check.sh all 159/159 全绿。尾巴：README 行指向的 skills/setup-reconstruct/SKILL.md 由票 0003 落地，此前的断链是文档先行的既定形态；评审注意点：README 行落位"总控与初始化"表（setup-\* 区字面），若评审认为应归"按需服务"区需回票调整。
