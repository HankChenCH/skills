---
id: 0018
type: feature
spec: 0007
status: in-progress
blocked-by: []
created: 2026-10-29
---
# 0018: METHOD/GLOSSARY 分档成文

**做什么：** 流程文档把分档判据成文并消除既有漂移——METHOD.md §4 总原则改为"知识档永久留存、过程档终态清扫以 git 历史为归档、归置手段是终态删除而非 gitignore"，§4.3 / §5 / §7 对齐；GLOSSARY 生成资产补齐活本已领先的词条（红绿循环、面向人的文档、项目术语章五条）并新增知识档 / 过程档 / 蒸馏 / 清扫四词条，两份恢复并保持逐字一致。

**验收标准：**
- [ ] 活本 METHOD.md：§4 总原则为分档表述且保留"不往 .gitignore 加任何东西"；§4.3 对齐分档措辞；§5 spec.done 语义补"名下过程档已清扫"；§7 validate 行含 done 残留校验说明
- [ ] `diff docs/METHOD.md skills/setup-workspace/assets/METHOD.md` 输出为空
- [ ] `diff GLOSSARY.md skills/setup-workspace/assets/GLOSSARY.md` 输出为空（含新增四词条与既有漂移收口）
- [ ] run-tests.sh 新增双份逐字一致断言用例（METHOD 与 GLOSSARY 各一）通过

**Blocked by：** 无

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
