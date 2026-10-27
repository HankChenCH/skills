---
id: 0001
status: approved
tickets: [0001, 0002]
branch: main
created: 2026-10-27
approved: 2026-10-27
---
# 0001: GitLab 出口选项与 ref-git-commit 技能（spec 0001）双轴评审

评审依据：spec 0001（approved）+ ticket 0001 / 0002 全文。CODING_STANDARDS.md 不存在（本仓库 setup 决策 3 = 跳过），标准轴依据 ref-implementation 七条标准 + ref-review 坏味道基线。仓库尚无提交，无分支 diff 可取，评审对象 = 两张工单声明的改动文件集（蓝图、assets/METHOD.md、docs/METHOD.md、GLOSSARY 资产与根副本、SKILL.md、decisions.md、run-tests.sh、skills/ref-git-commit/SKILL.md）。

## 标准轴 findings

无阻断，无建议。核验记录：改动均为既有结构的镜像扩展（decisions.md 的选 GitLab 小节镜像选 GitHub 小节；测试用例镜像 TRACKER=github 用例），无重复逻辑收敛点、无投机泛化、无死代码；ref-git-commit/SKILL.md 53 行，开头定性、规则可执行、好/差对照齐全，符合 §12 文风基准。

## Spec 轴 findings

- [ticket 0001 / spec 0001] 超范围（建议）：GLOSSARY（资产 + 根副本）"盘上主本"条与蓝图 §5.4 publish 行的平台枚举同步为含 gitlab——spec 实现决策未逐字列出这两处（spec 只列 §5.5/§11.1/§14，GLOSSARY 一行写的是"无项目术语变更"）。判定：FR-1 枚举一致性的必要延伸，漏改反而是走样，不构成偏离 spec 的阻断；本次不改回。建议后续 spec 的测试决策写明"枚举出现点全仓 grep 复核"，不依赖实现者自觉。
- [ticket 0001 / spec 0001] 缺失核验为不成立（记录，非 finding）：spec 测试决策"补断言 setup 产物含 gitlab 字样的文案用例（若现有结构支持）"——tests/run-tests.sh 的夹具为手工构造（cp assets → TMP），没有运行技能文本的结构，条件不成立，未加用例。references/generation.md 的 config 模板 TRACKER 字段无枚举可同步，同样核验为无需改动。

## 范围外备注

- README.md 两处"19 个技能"已随手同步为 20（纯文档计数同步，与 GLOSSARY 同类；严格说在两票声明范围之外，披露于此）。
- docs/concepts.md:306 与 docs/sessions/2026-10-25-*.md 中的"19 个 / 4 个"为 2026-10-25 设计会话的归档记录，保持原样不改（改归档即篡改历史）。
- 仓库尚无提交：commit-msg 轻门禁与 pre-push 重门禁至今未被真实提交触发过（测试套件内已覆盖其逻辑）。首次提交时将首次实战。
- /sdlc 总控未实现，本变更全程按 METHOD.md 手动驱动（need → research → spec → plan → implement → review）。

## 汇总

标准轴阻断 0 / 建议 0；Spec 轴阻断 0 / 建议 1。结论：approved（两条建议均不阻断，随报告留档）。
