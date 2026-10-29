---
id: 0012
status: approved
tickets: [0018]
branch: main
created: 2026-10-29
---
# 0012: METHOD/GLOSSARY 分档成文（双份逐字一致断言）评审

评审对象：提交 e9611e1 + c94afec + 222eee6 + bbe742b（基线 e913494 = BASE_REF main
顶），单票模式，工单 0018（spec 0007 approved，FR-5）。改动 6 文件 +122/−9：其中
93 行为 spec 0007 与工单 0018 规划产物入库（[trivial]），实现本体为 METHOD 活本与
生成资产四处对齐（§4 总原则分档表述、§4.3 不做清单、§5 spec.done 语义、§7 validate
行）、GLOSSARY 生成资产补齐活本九词条（红绿循环、面向人的文档、项目术语五条、
知识档/过程档/蒸馏/清扫四条）、run-tests.sh 末尾新增双份逐字一致断言一组。

## 标准轴 findings

- 无

核查记录：测试名即规格（"两份 METHOD.md 逐字一致"），期望值独立于实现（diff 两侧
均为盘上产物，退出码 0 即票面 AC 本身），失败时 diff 输出直接列出漂移行可定位；
一断言一行为，两条互不耦合；断言节置于套件末尾、`ROOT` 由 `HERE` 推导，不依赖执行
顺序，不污染夹具。红先于绿被观察（GLOSSARY 断言在资产补齐前红，失败原因即漂移，
149/1）。diff 最小化：仅票内四处 + 断言节 + 套件头注释相应一行，未顺手改无关内容。
§5/§7 措辞与 check.sh:561 实际报错（"spec 已置 done 但名下过程档未清扫"）核对一致。

## Spec 轴 findings

- 无

逐条核销：AC1 ✓（METHOD.md:52 分档表述含三要素"知识档/过程档、价值是否越过终态、
终态删除而非 gitignore"，"不往 `.gitignore` 加任何东西"保留；:69 §4.3 对齐；:80
spec.done 补"且名下过程档已清扫"（spec 原文）；:108 validate 行含 done 残留扫描）。
AC2 ✓ 两份 METHOD diff 为空。AC3 ✓ 两份 GLOSSARY diff 为空，assets 新增 12 行恰为
九词条。AC4 ✓ run-tests.sh 150/150 ALL PASSED，两条新用例在列。spec FR-5 验收场景
全要素命中；测试决策"文档同步断言"两条均落；FR-1 零改动面核销（check.sh 未动，
既有 149 用例全过，基线不降）。

## 范围外备注

- .sdlc/config.sh 的 CHECK_LINT/CHECK_TYPE/CHECK_TEST 全空，`check.sh all` 响亮警告
  "未定义任何检查命令"。本仓库实际有套件（skills/setup-workspace/tests/run-tests.sh），
  建议后续由用户接线 CHECK_TEST（config.sh 用户自有，setup 不覆盖，不在本票边界）。
- GLOSSARY 状态表 spec.done 行仍为"验收通过（终态）"，未含清扫语义，与 METHOD §5
  轻微不同步；票面与 spec FR-5 均未要求，如要收口走 [trivial] 或 spec 修订。
- phase 显示工单 0004、0010 仍 status: implemented（历史遗留，非本票改动对象），
  retro 或 spec 0007 验收清扫时值得留意。

## 汇总

标准轴阻断 0 / 建议 0；Spec 轴阻断 0 / 建议 0。结论：approved
