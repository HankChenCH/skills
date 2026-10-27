---
id: 0005
status: approved
tickets: [0006, 0007, 0008, 0009]
branch: main
created: 2026-10-27
---
# 0005: tracker 平台适配器首轮评审（工单 0006–0009）

## 标准轴 findings

（依据：CODING_STANDARDS.md 本仓库不存在，退回 ref-implementation 标准 + ref-review 坏味道基线；lint/工具未覆盖 shell，全部人工判。）

- [skills/setup-workspace/assets/trackers/codeup.sh:66] json_escape 用 `RS="\001"` 整读输入，技巧非显而易见——补一行注释说明"不存在的分隔符让 awk 整体读成一条记录，gsub 才能跨行处理"。（建议，已采纳）
- [skills/setup-workspace/tests/run-tests.sh（github 节末）] 该节只复位 TRACKER_REPO 不复位 TRACKER，与 gitlab/codeup 节末"双复位"不对称，中间插节时会踩到残留 github 态——补 TRACKER=local 复位对齐。（建议，已采纳）
- [.sdlc/trackers/codeup.sh:84（call_api）] CODEUP_TOKEN 以 `-H "x-yunxiao-token: …"` 传参，令牌短暂暴露于进程列表；可改 `-H @file` 规避。（建议，未采纳：个人单机工具、curl 惯用法、暴露窗口毫秒级，复杂化不值得；真实多租户场景出现再议）

## Spec 轴 findings

- [ticket 0009 / spec 0004] 超范围（字面）：dev-ship SKILL.md:50 括注由"适配器批 3 未就绪"改为"publish 适配器只做产物投影，不承载 PR 创建"，而 spec 0004 非目标写明"本轮不动 dev-ship"。（阻断）→ 复审核销：该行与工单 0009 验收标准第 5 条（全仓清理批 3 适配器话术）存在起草冲突；两次用户批准的共同意图为"清过时话术、零行为变更"，该行恰为纯措辞零行为，按共同意图判合规保留。修订建议移交：下轮 spec 修订在非目标中为该行措辞豁免，消除条款冲突。
- 逐票对照：0006/0007/0008/0009 验收标准全部有证据勾选（run-tests.sh 用例名与 diff/可执行位核实）；spec 工单级场景 7 条全部映射进票且绿；缺失/走样未见——适配器契约逐条对上实现决策（首行盘上指针、60KB 截断、.map 三字段、gh edit/glab update/codeup 追加评论、CODEUP_* 配置与默认端点、自定位仓库根）。
- 集成级 3 条按规留给验收；其中 FR-1 因本机 gh 已认证顺带实证（specs/0004 投影至 HankChenCH/skills issue #1，复投走更新不重建，.map 落行）。

## 范围外备注

- github.sh 与 gitlab.sh 骨架重复（62 行 × 2）：有意取舍——蓝图 §14 契约"tracker 扩展只需新增单文件 .sdlc/trackers/xxx.sh"，抽公共库会让单文件自包含契约失效；重复止于骨架，平台差异（CLI/传参/解析）各自独立。
- GLOSSARY.md 登记两条项目术语（投影、映射文件）：dev-clarify 流程纪律要求（新术语当场登记），[trivial] e8b331d，非本 spec 范围内改动。
- 蓝图 v1.12 与 METHOD.md 同步发生在工单落盘前（治理规则先文档后技能），见过程提交 0760dd5。

## 汇总

标准轴阻断 0 / 建议 3（2 采纳、1 留档）；Spec 轴阻断 0 / 建议 0（1 项起草冲突经复审核销，修订建议已移交）。结论：approved。
