---
id: 0002
status: passed
spec: 0007
round: 1
created: 2026-10-29
---
# 0002: spec 0007 验收后蒸馏与清扫（round 1）

## 场景结果

- [FR-2、FR-3、FR-4 | 集成级] 实跑 /dev-accept 于真实仓库（本报告即该运行的产物）。Given：main 分支，spec 0007 approved，名下工单 0016 / 0017 / 0018 全部 done（`check.sh phase` 输出可证），评审 0010 / 0011 / 0012 均 approved。When：本验收执行 passed 出口固定序列（蒸馏四路 → 清扫 → 置 done → 原子提交）。Then 逐条判据与验证命令：
  - 恰一个新提交承载蒸馏编辑、文件删除与 spec 置 done，提交信息带 `[trivial]`：`git rev-list --count <序列前基线>..HEAD` 输出 1，`git log --format=%s -1` 含 `[trivial]`，且 `git show --name-status --format= HEAD` 同时含 M（need）、A（adr、standards）、D（tickets / reviews / acceptance）条目；
  - validate 全库通过：对 docs/needs/*.md、docs/specs/*.md、docs/adr/*.md 逐个 `check.sh validate` 全部"通过"；
  - 盘上无该 spec 过程档残留：`find docs/tickets docs/reviews docs/acceptance -name '*.md'` 输出为空；
  - git 历史可考古被清扫文件：`git show --name-status HEAD` 列出被删的 7 个过程档（工单 0016 / 0017 / 0018，评审 0010 / 0011 / 0012，验收报告 0002 本报告）。
  - 结论：过
- 工单级场景不重跑，核销凭据：FR-4 由评审 0010（run-tests spec-done 残留扫描 19 断言）覆盖；FR-2 / FR-3 / FR-6 由评审 0011（SKILL 文本契约 + 夹具端到端 12 断言）覆盖；FR-5 / FR-1 由评审 0012（双份逐字一致断言，150/150）覆盖。本轮复跑证据：`bash skills/setup-workspace/tests/run-tests.sh` 通过 150 / 失败 0，ALL PASSED；`.sdlc/check.sh all` 退出码 0（附"config.sh 未定义任何检查命令"响亮警告——既存发现，见残余风险）。

## 假设验证

- A1 清扫提交直接落 main 可行（solo 场景）——验证通过：本序列即在 main 执行并被 commit-msg 门禁放行；团队受保护分支场景未触及，原判据（需改走 PR，步骤不变）维持。
- A2 协作者考古成本上升为已接受代价——验证通过：被清扫产物经 `git log -- docs/tickets/` 可考古，tracker 投影（issues #17/#18/#19/#21/#22 等）保留不回删，映射文件在盘。
- A3 validate 复杂度增量小——验证通过：check.sh 新增 spec_residue 单函数与一条校验分支，run-tests 既有 148 用例零破坏（148→150 仅新增）。

## 残余风险

- config.sh 未定义任何检查命令（CHECK_LINT / CHECK_TYPE / CHECK_TEST 全空），`check.sh all` 只能响亮警告，run-tests.sh 的 150 用例依赖会话手动执行。影响：出口门禁证据获取靠纪律，存在漏跑可能。不阻塞本验收（本轮已手动跑全绿）。

## 下一轮建议

- 无需为 spec 0007 开下一轮。两项收尾均不属本 spec 范围：① `.sdlc/config.sh` 接线 `CHECK_TEST="bash skills/setup-workspace/tests/run-tests.sh"`（用户自有文件，重跑 setup 不覆盖）；② GLOSSARY 状态表 spec.done 行是否补"名下过程档已清扫"语义（评审 0012 范围外备注）。均走 `[trivial]` 或并入后续工单。
