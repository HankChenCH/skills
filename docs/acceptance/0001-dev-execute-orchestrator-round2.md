---
id: 0001
status: passed
spec: 0006
round: 2
created: 2026-10-28
---
# 0001: spec 0006 dev-execute（V 模型整 spec 编排运行）验收，round 2

验收对象：spec 0006 名下工票 0012（dev-review 编排模式）、0013（运行核心）、
0014（收口链）、0015（sdlc 总控接线），全部 `status: done`。验收分支 main
（= BASE_REF）。工单级场景已由各票在实现中于临时 git 仓库演练核销
（记录目录 /tmp/devx-drill/records/ 与 /tmp/devx-drill-0015/records/），
本报告只运行集成级场景并逐 FR 核销；工单级场景引用票级证据不重跑。

## 场景结果

- [FR-5 | 集成级] 双运行隔离 + 先后合并 —— **过**。证据（2026-10-28 实跑，
  /tmp/devx-drill-accept0006/records/）：同一仓库对 spec 0006 与 0007 同时建立
  两个运行（`git worktree add` × 4 全部成功，运行 A 活跃时运行 B 建立无 ref
  冲突，fr5-two-runs.txt 步骤 1–3）；内容隔离——运行 A worktree 内票 0201
  implemented 而 0301 仍 ready，运行 B worktree 内反之（步骤 4）；主工作区
  `git status --porcelain` 全程为空（步骤 5）。合并序：run/0006 → main 后
  run/0007 → main 两步均 exit 0（异文件互不阻塞，fr5-merge-sequence.txt
  步骤 6–7）；改同一文件的两个运行 run/0008、run/0009 先后合并——先者过、
  后者 `CONFLICT (content)` exit 1 停在合并门，`git diff --name-only
  --diff-filter=U` 列出冲突文件，`git merge --abort` 后工作树干净
  （步骤 9–12），与 spec「后者冲突即停在合并门问人」一致。

- [FR-8 | 集成级] sdlc 总控"运行中 worktree"段 + 零写入 —— **过**。证据
  （2026-10-28 实跑，/tmp/devx-drill-0015/records/）：存在运行 worktree 时按
  skills/sdlc/SKILL.md §1.2 新段走默认模式——`git worktree list` 发现两条
  `run/` 条目，票状态分别读自运行 worktree（0008 implemented）与票 worktree
  （0009 in-progress），主工作区旧态 ready 不作依据（green-fr8.txt 步骤 3–5）；
  盘点前后 `git status --porcelain` 均为空——零写入（步骤 0/6/7）；无运行时
  一行空态说明、命令退出码全 0（green-empty.txt 步骤 2–5）；路由行多票同
  approved spec 命中问询、单票与异 spec 反例走原语义（green-routing.txt
  场景 A/B/C）。

- [FR-1 | 工单级] 依赖序图 + 开工确认 / 拒绝路径 —— **过**（引用票 0013 证据）：
  fr1-graph.txt（分层图、关键路径、开工前零 worktree）、fr1-done-variant.txt
  （done 票列图外）、fr1-reject.txt（spec draft 拒绝 exit 1 且指路、零写入）。

- [FR-2 | 工单级] 运行 worktree 隔离 / 票分支共存 —— **过**（票 0013）：
  fr2-run-side.txt（建立后 `git worktree list` 可见运行条目、主工作区停留
  main 且 status 0 行）、fr2-ticket-coexist.txt（`run/0006` 存在时逐票建
  `run/0006-t0101/0102` 成功，无 D/F 冲突）。

- [FR-3 | 工单级] 同层并行实现 —— **过**（票 0013）：fr3-parallel-times.txt
  记录两票起止 epoch（1793162120→1793162123）完全重叠——执行时间重叠实锤；
  fr3-parallel.txt 记录两票 worktree 互不可见、blocked-by 未满足票未开工。

- [FR-4 | 工单级] 机械合回 + 逐票预演 —— **过**（票 0013/0014）：
  fr4-merge-rehearsal.txt（`--no-ff` 合回 + 合回后 `check.sh all`，红灯不调度
  后续）；合回信息缺 `[#NNNN]` 被 commit-msg hook 拦、补票号后放行
  （closeout-8 摘要记录，run-mechanics §8.3 据此修订）。

- [FR-6 | 工单级] 一次 PR + 合并确认 + 全 done + 清理 —— **过**（票 0014）：
  closeout-1-gate.txt（收口门禁复跑）、closeout-2-prepush.txt（pre-push 机械
  校验覆盖面）、closeout-3-pr.txt（三节正文）、closeout-5-resume-merge.txt
  （显式确认后合并）、closeout-6-done.txt（5 票 → done 一次 [trivial] 提交 +
  push）、closeout-7-cleanup.txt（worktree 与分支清理核对）。

- [FR-7 | 工单级] 出口报告 —— **过**（票 0014）：closeout-8-exit-report.txt
  含逐票终态清单（5 票 | 评审报告 | done）、运行摘要（3 层 5 票、关键路径、
  预演记录、异常处置）、指路手动 /dev-accept。

- [FR-9 | 工单级] 异常流停下问人 —— **过**（票 0013/0014）：合回冲突
  CONFLICT 后 `merge --abort` 还原、不自动解（fr4-merge-rehearsal.txt:59）；
  中断续接从盘上推导——closeout-4-interrupt.txt（合并确认前中断）、
  closeout-5-resume-merge.txt（重入重问单向门后合并成功）。

## 全量检查

`.sdlc/check.sh all`：exit 0，输出"⚠️ config.sh 未定义任何检查命令
（CHECK_LINT/CHECK_TYPE/CHECK_TEST 全空）"。按验收纪律如实记录：本仓库
config.sh 无检查命令是既有发现（setup-workspace 未配置，非本 spec 工票
引入），门禁无法替质量背书——建议单独接入（见下一轮建议）。

## 假设验证

- A1（同层并行票改同一文件频率低，兜底 E4 停机）—— **本轮未触发**：演练
  票互不相交，未度量真实冲突频率；停机兜底行为已实证（FR-9 冲突停门 +
  FR-5 步骤 10–12）。
- A2（每票完整 checkout，磁盘/安装时间随并行度线性）—— **本轮未触发**：
  演练为最小仓库未装依赖，未度量代价；spec 阶段已定默认并行度上限 4。
- A3（编排会话 token 消耗高，复用水位线）—— **本轮未触发**：演练在单会话
  驱动，未跑真实多子代理并行；水位线机制已在 sdlc 落地（context-watermark.md）。
- A4（多会话 publish 竞态面小，.map 幂等）—— **本轮未触发**：演练仓库
  TRACKER=local；.map 幂等已由 spec 0004 票级验收覆盖。

## 残余风险

- 真实会话级并行未验：FR-3/FR-5 的演练在单会话内按时间序模拟 git 层行为
  （worktree、分支、合并），两个真实 agent 会话同时各跑一张 spec 的调度面
  （子代理并行度、上下文水位、tracker 并发 publish）未被本验收覆盖。影响：
  首次实战可能暴露会话层问题；不阻塞——异常流全部停机问人（FR-9 已实证），
  无自动兜底放大风险。
- 技能文本的执行面依赖 AI 遵循：dev-execute/run-mechanics/sdlc 接线均为
  文本契约，验收证据是按文本执行的结果；不同会话的遵循度会有方差。影响：
  单次偏差可经评审与 retro 回路修正；不阻塞。

## 下一轮建议

- `.sdlc/config.sh` 接入检查命令：本仓库纯技能/文档，最小可行是 Markdown
  结构 lint（如技能文件行数上限、frontmatter 字段校验），让 `check.sh all`
  从"无命令警告"变为有牙齿的门禁。
- 首次真实运行 dev-execute 跑一张小 spec（2–3 票、一层并行），补齐残余
  风险 1 的会话级证据；预期产出回流 run-mechanics 修订（先例：合回信息
  缺票号被 hook 拦的修订）。
