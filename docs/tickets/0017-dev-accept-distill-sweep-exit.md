---
id: 0017
type: feature
spec: 0007
status: done
blocked-by: [0016]
done: 2026-10-29
created: 2026-10-29
---
# 0017: dev-accept 蒸馏清扫出口

**做什么：** /dev-accept 验收通过后的收口从"只置状态"升级为固定序列——蒸馏（need「假设与风险」逐条标注验证结果并补写残余风险与下一轮建议 → spec 验收场景按实际边界行为修订 → 有架构分量的决策新立 ADR → 模式学习追加进 standards/）→ 清扫（删除该 spec 名下全部工单、评审、验收报告，含本次报告本身；tracker 投影不回删）→ spec 置 done → 蒸馏编辑 + 删除 + 置 done 恰一个 `[trivial]` 提交收口；rejected 时"不改 spec 正文"禁令原样保留。

**验收标准：**
- [x] run-tests.sh 文本契约断言：skills/dev-accept/SKILL.md passed 出口含序列四步及其顺序（蒸馏 → 清扫 → 置 done → 原子提交）与 E3 前置（下一轮建议与残余风险先折回 need 再清扫）
- [x] 同断言：禁止事项呈"rejected 禁改 spec 正文不变、passed 蒸馏例外"表述；frontmatter description 含蒸馏清扫一句话
- [x] run-tests.sh 端到端用例：夹具仓库按序列模拟执行后，git log 恰一个 `[trivial]` 提交承载全部编辑与删除，盘面该 spec 名下过程档为零，映射文件仍记录已发布对象编号
- [x] 端到端用例内断言：置 done 后 validate 全库通过（依赖 0016 的残留校验，校验空转即本用例失败）

**Blocked by：** 0016

## Progress
四条 AC 由 run-tests.sh 新增 19 断言核销（文本契约 7 + 端到端 12，148/148 全绿，红先观察后绿）；SKILL.md §4.4 重写为固定四步序列，check.sh 本体零改动。
无尾巴；端到端含残留校验活体探针（done 未清扫 validate 必红），校验空转用例即红。
评审注意：oseq 助手展开一律 ${var}（bash 3.2 的 $var 紧跟多字节字符误切词）；仓库 config.sh 仍无 CHECK_* 命令（check.sh all 为发现非跳过）。
