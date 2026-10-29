---
id: 0003
status: approved
tickets: [0004]
branch: main
created: 2026-10-29
---
# 0003: 票 0004 重跑语义评审（增量对齐与补扫协议 + seam 3 扩展）

评审对象：`a9006a8..HEAD` 两个提交（协议成文 + 票收口），双轴并行子代理评审。

## 标准轴 findings
- [skills/setup-workspace/tests/run-tests.sh:1165] 断言名「主文档按需指向两个参考文档」在本票接入第三参考后陈旧，且与新增的「主文档出口指向增量对齐细则」为同一性质检查分置两处——合并：断言改查三个参考指针并更名「指向三个参考文档」，删除重复断言 —— 陈旧标签误导后来者，重复断言徒增维护面（建议，已落实）
- [skills/setup-reconstruct/references/incremental-alignment.md:30] 「标过时」处的低置信格式补出处指向 artifact-templates.md「证据格式」——本技能按需加载一次只载一个参考，重跑 agent 只读本细则拿不到格式定义；scan-protocol.md:18 有同位先例（建议，已落实）

## Spec 轴 findings
- [ticket 0004 / spec 0008] 走样：run-tests.sh 1165 行断言名「两个参考文档」与三参考现状不符，断言体只查前两个指针（与标准轴第 1 条同点，合并核销）（建议，已落实）

Spec 轴逐项核对符合：FR-7 六要素（diff 定位 / 证据引用分组 / 只重验涉漂移三选一 / 确认门合并不推倒 / 基线逐张更新新 commit / 基线缺失回落全量）与 spec「增量对齐（FR-7、D3）」及蓝图 §11.18 语义一致；FR-5 四规则与场景 7 一一对应；四条验收标准证据属实（先红 185/7 实证、演练四项验证、validate 通过）；超范围核查通过——check.sh 与 assets 副本、METHOD/GLOSSARY 双份、正向流程技能零改动。

## 范围外备注
- README.md「21 个技能已全部实现，第 22 个……实现接续中」在 0004 收口后陈旧，归收口流程（[trivial] / dev-ship）处置，不计入本票。
- 工作区未提交的在途文件（specs 0010/0011、tickets 0011–0019、.sdlc/trackers/github.map）属其他 spec 工作现场，不在 `a9006a8..HEAD` 评审范围。

## 汇总
标准轴阻断 0 / 建议 2；Spec 轴阻断 0 / 建议 1。结论：approved——三条建议均为措辞/结构收敛，已在本票落实并复跑全量检查（run-tests.sh 191 / 191 ALL PASSED）。
