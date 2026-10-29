---
id: 0018
type: feature
spec: 0007
status: done
blocked-by: []
created: 2026-10-29
done: 2026-10-29
---
# 0018: METHOD/GLOSSARY 分档成文

**做什么：** 流程文档把分档判据成文并消除既有漂移——METHOD.md §4 总原则改为"知识档永久留存、过程档终态清扫以 git 历史为归档、归置手段是终态删除而非 gitignore"，§4.3 / §5 / §7 对齐；GLOSSARY 生成资产补齐活本已领先的词条（红绿循环、面向人的文档、项目术语章五条）并新增知识档 / 过程档 / 蒸馏 / 清扫四词条，两份恢复并保持逐字一致。

**验收标准：**
- [x] 活本 METHOD.md：§4 总原则为分档表述且保留"不往 .gitignore 加任何东西"；§4.3 对齐分档措辞；§5 spec.done 语义补"名下过程档已清扫"；§7 validate 行含 done 残留校验说明
- [x] `diff docs/METHOD.md skills/setup-workspace/assets/METHOD.md` 输出为空
- [x] `diff GLOSSARY.md skills/setup-workspace/assets/GLOSSARY.md` 输出为空（含新增四词条与既有漂移收口）
- [x] run-tests.sh 新增双份逐字一致断言用例（METHOD 与 GLOSSARY 各一）通过

**Blocked by：** 无

## Progress
- 交付：run-tests.sh 新增两份逐字一致断言（先红：GLOSSARY 活本领先生成资产九词条）；GLOSSARY 资产同步收口；METHOD §4/§4.3/§5/§7 分档成文并同步资产。证据：run-tests.sh 150/150 ALL PASSED。
- 遗留：config.sh 的 CHECK_TEST 未接 run-tests.sh，`check.sh all` 响亮警告无检查命令（用户自有文件，不在本票边界）。
- 评审注意：§5/§7 措辞与 check.sh 0016 实际报错（"spec 已置 done 但名下过程档未清扫"）对齐；GLOSSARY spec.done 行未同步补清扫语义（票面未要求）。
