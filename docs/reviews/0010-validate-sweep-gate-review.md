---
id: 0010
status: approved
tickets: [0016]
branch: main
created: 2026-10-29
---
# 0010: validate 清扫门禁（done spec 残留扫描）评审

评审对象：提交 4220402 + 046bc24（基线 7a5771f = BASE_REF main），单票模式，
工单 0016（spec 0007 approved）。改动 4 文件 +338/−11：两份 check.sh（新函数
spec_residue + cmd_validate 接线 + usage 行）、run-tests.sh 新用例组（置于
L4 guard 组前并自带 new_repo，避免重置主夹具破坏后续组状态依赖）、工单 0016
证据落盘。仓库无 CODING_STANDARDS.md（既有事实），标准轴以 ref-implementation
标准 + ref-review 坏味道基线为依据。

## 标准轴 findings

- [skills/setup-workspace/assets/check.sh:200] spec_residue 对 spec / tickets
  字段值直接 pad4，而 artifact_file 等全部既有引用路径均容忍 slug 形态
  （`ref="${2%%-*}"` 取 - 前缀）——工单写 `spec: 0001-swept` 可通过既有全部
  校验，却被残留门禁静默漏扫，与 FR-4"有残留即拒绝"的机械保证相悖。修法：
  三处循环先取 - 前缀再 pad4，与 artifact_file 语义对齐。已按红绿修复
  （新增用例先红后绿，129/129 ALL PASSED，提交 046bc24），复审通过。
  （阻断，已修复并复审核销）

其余核对通过：spec_residue 是深模块（单参入、路径行出，名下关系定义写在
注释里，复用 fm_get/fm_list/pad4 无新解析器，符合 spec 实现决策）；畸形字段
（空值、非数字）经 pad4 失败逐条跳过，与 ticket_cycles 的扫描容忍度一致；
残留路径按 slug 命名规则无空白，`for residue in $(...)` 分词与既有
`for dep in $(fm_list ...)` 风格一致；门禁仅对 status: done 触发，draft /
approved 零影响（用例"approved spec 不触发残留扫描"与既有全量绿共证）；
diff 最小，usage 行随命令行为同步更新，无超范围改动。测试侧：七条用例一测
一行为、名字即规格、期望值为字面路径非镜像计算；评审交集首版误用工单文件名
比对（0001-old-cart 对 0001）被新增用例当场抓出后修正——红绿循环实际生效
的直接证据。

## Spec 轴 findings

（无）

逐条核对工单 0016 五条验收标准全部有证据：三条"残留被点名"用例（rc=1 且
输出各含 ticket / review / acceptance 残留路径，slug 形态第四条覆盖引用
变体）；清扫后 rc=0；approved 不触发 + 两条 tn（他 spec 工单、仅指向他 spec
工单的评审均不误报）；两份 check.sh diff 为空（评审修复后复验）；全量
129/129 ALL PASSED，既有 125 用例基线不降。FR-4 语义逐项落地：名下关系三
映射（ticket/acceptance 按 spec 字段、review 按 tickets 与名下工单交集）、
逐个列出文件路径、判定复用既有解析器、双份同步。

## 范围外备注

- .sdlc/config.sh 的 CHECK_LINT/CHECK_TYPE/CHECK_TEST 全空，`check.sh all`
  走"未定义任何检查命令"提示分支——既有接线缺口，非本票改动面，建议后续
  单独立票接入。
- spec 0007 的 dev-accept 出口序列（工单 0017）尚未实现，现实流程中 spec
  暂不会置 done；本门禁先行落地无副作用（approved/draft 不触发），0017
  落地后由 validate 在清扫序列第 3 步收口。

## 汇总

标准轴阻断 0（评审中发现 1 项 slug 漏扫阻断，已红绿修复并复审核销）/ 建议 0；
Spec 轴阻断 0 / 建议 0。结论：approved。
