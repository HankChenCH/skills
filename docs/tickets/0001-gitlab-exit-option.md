---
id: 0001
type: feature
spec: 0001
status: done
blocked-by: []
created: 2026-10-27
done: 2026-10-28
---
# 0001: setup-workspace 出口增加 GitLab 选项并入库平台模型参考

**做什么：** 用户在 setup-workspace 决策 1 能选 GitLab 作为产物与 issue 出口：蓝图与 assets/METHOD.md 的 TRACKER 枚举扩为 local|github|gitlab|codeup，SKILL.md 决策 1 与 references/decisions.md 增 GitLab 分支（`glab auth status` 验证、失败明确回落 local、TRACKER_REPO 取 `group/project`），tests 增 gitlab 的 publish 警告放行用例；同时按 spec 0001 清单核验 research 0001（tracker 平台模型参考文档）并在 decisions.md 挂引用。

**验收标准：**
- [x] 蓝图 §5.5 / §11.1 / §14 与 assets/METHOD.md §8 的 TRACKER 枚举含 gitlab（证据：grep -ci gitlab——蓝图 6、assets/METHOD.md 3、根 METHOD.md 3、SKILL.md 2、decisions.md 3、GLOSSARY 资产与根副本各 1、tests 2）
- [x] SKILL.md 决策 1 与 references/decisions.md 含 GitLab 分支：glab 验证、回落 local 明确告知、`group/project` 标识、批 3 如实相告（证据：两文件已按 spec 改毕，diff 可查）
- [x] tests/run-tests.sh 增 TRACKER=gitlab 警告放行用例，全量测试通过且零回归（证据：bash run-tests.sh 输出"通过 61 / 失败 0，ALL PASSED"，含新用例"gitlab 适配器未实现同样警告并放行"）
- [x] references/decisions.md 的 GitLab 小节引用 research 0001（证据：第 4 条指引含文件名 docs/research/0001-tracker-platform-issue-pr-models.md）
- [x] research 0001 按 spec 0001「验收场景」第三条的清单核验通过（证据：五节齐全——结论速览覆盖对象模型/编号引用/状态评审/API 与 CLI/映射要点，各节均带一手来源与检索日期 2026-10-27）

**Blocked by：** 无

## Progress
2026-10-27 完成：蓝图（版本行升 v1.2 含修订记录、§5.2/§5.4/§5.5/§10.2 批3/§11.1/§14）、assets 与根 METHOD.md、SKILL.md 决策1、decisions.md（问法模板/选 GitLab 小节/通用说明）、GLOSSARY 资产与根副本、tests 增 gitlab 用例，61/61 全绿。尾巴：无。评审注意：decisions.md 的 GitLab 小节引用本仓库 research 0001 路径，该引用面向技能实现者（批 3），目标仓库内不存在此路径属预期。
