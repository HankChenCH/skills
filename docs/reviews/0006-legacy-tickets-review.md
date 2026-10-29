---
id: 0006
status: approved
tickets: [0004, 0010, 0011]
branch: main
created: 2026-10-29
---
# 0006: 老票追补评审（sdlc 总控、l4-guard、setup 接线）

评审对象：工单 0004（spec 0002）、0010 / 0011（spec 0005）的交付物现状（已长期
在 main）。三票停在 implemented 是流程时序遗留（先于 pre-push 评审覆盖门禁成型），
本次按现状双轴评审后收口。证据基线：run-tests.sh 150/150（含 L4 用例组约 30 条与
git hook 端到端组）、全库 validate 全绿。

## 标准轴 findings

- 无

核查记录：skills/sdlc/SKILL.md 69 行纯控制流（原 56 行 + 评审 0009 覆盖的"运行中
worktree"段 13 行），判断性行为下沉 check.sh、技能只保留路由与问询，模块边界清晰；
references/ 两件（next-mode.md、context-watermark.md）按"场景路由、一次只载一个"
拆分，符合技能篇幅纪律。l4-guard.sh 111 行：规则 A/B 与失效安全路径全部显式写出
（deny JSON 恰三键、fail-open 放行），json_str 截取与 -n 短形式正则有注释说明约束，
行为由 L4 用例组矩阵锁定（拦截/放行/多段命令/失效安全 8 项）。setup 接线四处
（SKILL.md / generation.md / zcode.md / claude-code.md）话术现状一致，本仓
.zcode/config.json hooks 块 enabled:true、合并后 JSON 可解析、其余键未动。

## Spec 轴 findings

- 无

逐票核销：0004 六条 AC 全部带证据勾销（蓝图先行、56→69 行增长有评审归属、四段
报告只读、路由表 11 行、水位线用户定档留痕、符号链接安装）；0010 三条 AC 勾销
（guard 行为矩阵 = run-tests L4 组、22 条新增用例、check.sh 零改动）；0011 五条
AC 勾销（四处文本接线、三处台账、本仓安装与手工 deny/放行验证）。spec 0002 /
0005 的零改动面成立：check.sh 既有校验与 git hooks 行为零变化（既有用例基线
99→150 全程不降，无回退）。

## 范围外备注

- 本仓 CODE_DIRS 留空，规则 B（无票源码编辑拦截）在此仓库不生效——need 0003 D5
  用户决策项，工单 0011 已如实记录，非缺陷。
- spec 0005 两条"留验收阶段"集成项（真实新会话验证 deny、全新夹具 ZCode 会话跑
  setup）在验收报告中转记残余风险。

## 汇总

标准轴阻断 0 / 建议 0；Spec 轴阻断 0 / 建议 0。结论：approved
