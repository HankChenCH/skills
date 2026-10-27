---
name: dev-ship
description: 把已通过评审（review approved）的分支交付出去——准备 PR（Summary / Evidence / Merge Danger 三节）、跑全量检查、经用户确认后合并（单向门），合并后把该 spec 全部工单标记 done 并自动转入 dev-accept。当用户要求合并、发 PR、交付、上线这批改动、把工单标 done 时使用——没有 approved 评审覆盖或全量检查不绿时会在入口被拒绝并指路 dev-review。
---

# dev-ship：合并与交付

你只做一件事：把**一支评审已批准的分支**变成**合入主干、工单全部 done 的交付**。
其余一切（没评审就要合并、替用户拍板合并、动 spec 状态）一律拒绝。
拒绝不是失礼，是本技能的职责。

## 0. 前置：工作区校验

- 仓库根目录必须存在 `.sdlc/check.sh`（由 /setup-workspace 生成）。
- 不存在 → 停止："本仓库未接入开发流程，先运行 /setup-workspace"，不做任何交付。

## 1. 入口门禁（全部通过才继续）

1. **重入判定先行**：当前 HEAD 已合入 BASE_REF（`git merge-base --is-ancestor`
   HEAD <BASE_REF>）→ 合并已完成，跳到 §4.3 收尾：工单没标 done 就补标，
   已全部 done 就直接走衔接出口。
2. **确定评审**：在 docs/reviews/ 找覆盖当前分支 implemented 工单的评审
   （`branch` 字段定位分支），`status` 必须是 `approved`。找不到 → 停止并转述
   缺什么："ticket 0007 还没有 approved 评审覆盖，先 /dev-review 出报告"；
   还是 draft → "评审 0002 还是 draft，先 /dev-review 走完两轴清零"。
3. 运行 `.sdlc/check.sh pre-push`——合并前的重门禁，必须通过（它机械校验分支上
   全部 implemented 工单都有 approved 评审覆盖）。
4. 工作树必须干净（`git status --porcelain` 为空）；不干净 → 停下，让用户先处理。

## 2. 装载上下文

按顺序读：approved 评审全文 → 各工单及其 spec 的对应验收标准 → `git log/diff
<merge-base>..HEAD` 摘要。**再用 Skill 工具装载 ref-git-commit**：PR 描述与合并
信息的写法以它为准（工单引用语法随平台，平台编号 ≠ 盘上编号）。

然后用三五句话向用户复述：要交付哪几张工单、大致动了什么、合并方式建议。
有偏差，用户此刻纠正的成本最低。

## 3. 准备 PR

1. 运行 `.sdlc/check.sh all`（全量 lint / typecheck / test），必须全绿。仓库没有
   定义任何检查命令 → 这本身就是发现：如实告知用户，Evidence 里写明，不静默跳过。
2. 写 PR 正文，三节固定：
   - `## Summary`：伪代码 / 调用树 / 文件树 / mermaid，选**最小可表达**的视图讲清改动。
   - `## Evidence`：Before/After 证据——引用上一步全量检查的输出、关键测试结果或截图。
   - `## Merge Danger`：单向门（合入后不可逆）/ 双向门判定 + 影响半径（谁依赖它）。
3. 落点跟 `.sdlc/config.sh` 里 setup 定下的 `TRACKER` 走，不自行预设：
   - `github` / `gitlab` → push 分支，用 `gh` / `glab` 创建（或更新）PR；CLI 未认证
     → 明确告知，抛决策问题（默认建议回落本地合并），不静默降级。
   - `local`，或 `codeup`（publish 适配器只做产物投影，不承载 PR 创建）→ 把正文作为合并清单在会话中完整
     呈现，不让用户盲批。

## 4. 合并与收尾

### 4.1 合并确认（单向门，必须问人）

抛出决策问题，带默认建议，一次问清：① 合并方式（merge commit / squash /
fast-forward，跟仓库历史约定给建议）；② 是否打 tag（默认不打——发布点 tag 的
语义化版本与 CHANGELOG 归 dev-release）。**用户显式确认才执行；沉默或"都行"
不算确认。**

### 4.2 执行合并

TRACKER 指向平台且 PR 已建 → 按确认的方式在平台合并；否则本地执行：push 分支 →
切到 BASE_REF → 按确认方式合并（merge commit 首行讲清合入什么，squash 按首行
规范重写，fast-forward 历史即提交本身，见 ref-git-commit）→ push BASE_REF。

### 4.3 工单 → done（合并后）

1. 同步本地 BASE_REF（平台合并过就先 pull），逐张把本次交付覆盖的工单 frontmatter
   `status` 改为 `done` 并追加 `done: <今日>`；每张跑 `.sdlc/check.sh validate`
   与 `publish`。
2. 状态变更提交用 `[trivial]`——工单此刻已 done，[#NNNN] 轻门禁按设计拒绝引用
   done 工单的提交；这是流程状态落盘，不是绕门禁（dev-retro 可审计）。
3. 逐个检查关联 spec：名下工单已全部 done → **立即用 Skill 工具调用 dev-accept**。
   dev-accept 未实现 → 停下说明："spec 0001 工单已全部 done，等 dev-accept 实现
   后验收；集成级场景清单见该 spec 的验收场景节"。仍有工单未 done → 列出哪几张
   还开着，停，不串联。

## 5. 中断与交接

会话可能在任何时刻结束。停下前：合并尚未执行 → 无需额外落盘，盘上进度就是
approved 评审 + implemented 工单 + 平台 PR（TRACKER 指向平台时），重入从 §1.1
续接，平台已有 PR 则更新不重建；合并已执行、工单未标 done → 重入后 §1.1 直接跳
§4.3 补齐。状态在盘上，不在对话里。

## 禁止事项（任何时候）

- 未经用户显式确认执行合并——合并是单向门，沉默不是确认。
- 把未实现的工单标 done，或改动 spec 的 status——spec → done 归 dev-accept。
- 跳过 `.sdlc/check.sh all`，或检查有红灯时写出"全绿"证据。
- 在 PR / 合并信息里把盘上工单编号当平台编号用（`Closes NNNN` 联动不了任何东西）。
- 使用 --no-verify，或以任何方式绕过 .sdlc/check.sh。
- 顺手做版本号、CHANGELOG、部署验证——那是 dev-release 的事。
