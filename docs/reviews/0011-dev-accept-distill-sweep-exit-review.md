---
id: 0011
status: approved
tickets: [0017]
branch: main
created: 2026-10-29
---
# 0011: dev-accept 蒸馏清扫出口（SKILL 文本契约 + 端到端）评审

评审对象：提交 44ecf03 + 367e92b + a8af4f9（基线 38ef443 = BASE_REF main），单票
模式，工单 0017（spec 0007 approved）。改动 3 文件 +298/−5：dev-accept SKILL.md
（passed 出口重写为固定四步序列、禁止事项改写为"rejected 不变、蒸馏例外"、
description 补蒸馏清扫）、run-tests.sh（oseq 顺序断言助手 + 文本契约节 7 断言 +
端到端节 12 断言）。本仓库无 CODING_STANDARDS.md，标准轴依据 ref-implementation
与 ref-review 基线执行（备注见下）。

## 标准轴 findings
- [skills/setup-workspace/tests/run-tests.sh:96] oseq 的 `pos -le prev` 守卫分支实际
  不可达——滑动窗口 `rest` 永远自前一词之后截取，pos 天然严格递增。可删去以减分支，
  或留作空词误用时的防呆并加一行注释说明其触发条件 —— 不可达分支是死代码味道
  （ref-review 基线），但属测试助手的防御性写法，不影响断言正确性（建议）
- [skills/setup-workspace/tests/run-tests.sh:88] `txt="$(cat "$f"; printf X)"; txt="${txt%X}"`
  的尾换行守卫对顺序断言无功能影响（截尾后各偏移仍内部一致，仅 FAIL 文案里的偏移
  数与原始文件字节差一个尾换行）；直接 `txt="$(cat "$f")"` 即可 —— 简化可读性
  （建议）

## Spec 轴 findings
- [ticket 0017 / spec 0007] 缺失：无。四条 AC 逐条核销：AC1/AC2 由文本契约节
  （oseq 序列四步 + E3 前置 + 禁止事项表述 + description）断言；AC3 由端到端节
  （恰一个 [trivial] 提交承载全部编辑与 4 个过程档删除、盘面零残留、github.map
  保留 issues/41）；AC4 由"残留校验活体探针"（done 未清扫 validate 必红）+
  "置 done 且清扫后全库 validate 通过"断言。
- [ticket 0017 / spec 0007] 走样：无。SKILL 四步与 spec 实现决策逐句对齐（蒸馏四路
  ①②③④ 落点、"未折回不得清扫" E3 边界、置 done 后 validate 含残留扫描、
  "publish 照旧"沿用既有出口语义、need 置 fulfilled 判定原文保留）；rejected 出口
  与"不改 spec 正文"禁令原样保留，蒸馏②显式标注为唯一例外。
- [ticket 0017 / spec 0007] 超范围：无。check.sh 本体与两份副本零改动；
  METHOD.md / GLOSSARY 未动（归工单 0018）。

## 范围外备注
- 本仓库根目录无 CODING_STANDARDS.md（AGENTS.md 哨兵引用它）；standards 资产仅在
  skills/setup-workspace/assets/standards/（生成给目标仓库）。本仓库标准轴退回
  ref 基线执行，属仓库自身待接入项，不是本票缺陷。
- `.sdlc/config.sh` 未定义任何 CHECK_* 命令，check.sh all 按设计输出"未定义任何
  检查命令"的发现；仓库实际测试入口是 run-tests.sh，建议后续接入 config.sh。
- check.sh commit-msg 的 [trivial] 判定 grep 整个 message 文件：正文里出现字面
  `[trivial]`（如引用规范文案）即走豁免分支、跳过 [#NNNN] 校验——本票第一笔提交
  正文提及触发过一次，已改写规避；宜将豁免判定限定在首行（真问题，范围外，记录）。
- phase 中 0004 / 0010 / 0011 长期停留 implemented（历史轮次状态未翻 done），
  建议在 dev-ship 流程或 retro 中收尾确认。

## 汇总
标准轴阻断 0 / 建议 2；Spec 轴阻断 0 / 建议 0。结论：approved
