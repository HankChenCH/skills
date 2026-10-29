---
id: 0003
status: fulfilled
confirmed: 2026-10-28
fulfilled: 2026-10-29
created: 2026-10-28
---
# L4 平台层拦截 hook（PreToolUse guard）

## 背景与业务目标

蓝图批 3 的最后一项基础设施（来源：用户 2026-10-28 指令"按技能蓝图规划，实现L4 hooks"；蓝图 §3 L4、§5.5 CODE_DIRS、§14——具体拦截规则授权批 3 设计）。四层防御的 L1（哨兵块）、L2（技能入口）、L3（git hooks）都已就位，但 L3 只拦"入库提交"：一个明知故犯的 agent 会话仍可以 `git commit --no-verify` 跳过轻门禁，也可以在没有任何在办工单时直接编辑源码（spec 0004 显式把 L4 留在本轮）。L4 把防御推进到平台工具调用层：在命令与编辑到达工具之前就拦下，绕过不再需要等 retro 审计追认。

业务目标：ZCode 会话里，绕过门禁的动作在发生前被拦下并给出正道指引；同时门禁自身的任何故障绝不锁死正常工作——拦截是增强，不是新的单点故障。

## 干系人与用户

- 仓库主人（唯一用户）：期望明知故犯的绕过（`--no-verify`、无票改源码）在 agent 会话内被当场拦下，理由说清后果与正道。
- AI 执行者（被拦对象兼受益者）：期望 deny 理由可读、指路明确（/dev-implement），误拦时能看懂为什么并被引导改写命令。
- 流程技能（dev-implement 等）：期望既有流程零改动——开工置 in-progress 后编辑源码照常放行。
- 人在终端手敲：不在 L4 作用域（L3 + retro 审计兜底），如实不装绿。

成功标准：ZCode 会话中含 `--no-verify` 的命令被拒且理由指明后果与正道；CODE_DIRS 配置后无在办工单的源码编辑被拒、有则放行；guard 自身任何异常（非 sdlc 工作区、stdin 异常、配置缺失）一律放行，不阻塞任何正常工具调用。

## 系统能力需求

- FR-1 `--no-verify` 拦截：Bash 工具调用中命令含 `--no-verify` 字面量，或为 `git commit -n` 短形式时，拦截该调用并给出理由（说明绕过的门禁与正道：带 [#NNNN] 或 [trivial] 正常提交）。
- FR-2 无在办工单的源码编辑拦截：Edit/Write 工具调用的目标文件经归一化后落在 config.sh CODE_DIRS 某目录下，且 docs/tickets/ 不存在 `status: in-progress` 的工单时，拦截并指路 /dev-implement；存在任一在办工单即放行；CODE_DIRS 留空则本规则整体不生效；docs/ 与 .sdlc/ 不受本规则约束。
- FR-3 失效安全：判定脚本在非 sdlc 工作区（缺 .sdlc/config.sh）、不在 git 仓库、stdin 非法或为空、无法解析工具输入等一切自身异常下放行（exit 0），永不因 guard 故障阻塞工具调用；check.sh 与 git hooks 语义零改动。
- FR-4 setup 接线：assets/ 分发 guard 脚本（重跑可整体覆盖）；ZCode 会话中 setup 把 PreToolUse hooks 块合并进工作区 `.zcode/config.json`（`enabled: true`、幂等、文件既有内容不动、hooks 块归 setup 其余归用户）；zcode/claude-code 适配器话术现状化（Claude Code 标注同构候选载体，本批不接线）。
- FR-5 文档与台账同步：蓝图（§3/§5.2/§5.5/§14 + §10.2 标注）、METHOD.md（assets 与本仓两份）、GLOSSARY.md 关键机制、concepts.md、README 台账与实物一致。

## 场景

- Given sdlc 工作区，When agent 提交含 `git commit --no-verify` 的 Bash 命令，Then 调用被拦，理由含"绕过门禁"与正道提示；When 改为正常 `git commit -m "[#0010] …"`，Then 放行。
- Given CODE_DIRS 配置了源码目录且无在办工单，When agent 编辑该目录下文件，Then 调用被拦且理由指路 /dev-implement；When dev-implement 已把某工单置 in-progress，Then 同样编辑放行。
- Given CODE_DIRS 留空（本仓现状），When agent 编辑任何文件，Then L4 不做源码编辑拦截（规则 B 不生效），`--no-verify` 拦截照常。
- Given 非 sdlc 目录打开的会话或 guard 收到非法输入，When 任意工具调用，Then 一律放行（失效安全）。
- Given 全新仓库在 ZCode 会话跑 setup-workspace，Then `.sdlc/hooks/l4-guard.sh` 就位、`.zcode/config.json` 合入 hooks 块且既有内容不动、收尾报告含 L4 行。

## 假设与风险

- A1（中代价 × 低不确定）：ZCode hook runner 的契约（stdin snake_case JSON、exit 语义、deny JSON 严格 schema）随版本漂移。缓解：只依赖随版本发布的一手文档（diagnosing-hooks 技能）与主程序 schema 实证（2026-10-28 核验：stdin 含 `tool_name`/`tool_input`/`cwd`；PreToolUse 输出分支恰为 `hookEventName`/`permissionDecision`/`permissionDecisionReason`/`additionalContext`/`updatedInput` 五键）；漂移的表现是放行或 hook 报错日志，不锁死工作（fail-open）；L1/L3 兜底仍在。（验证：通过——deny 三键 schema 与实证一致，本验收会话即在 hook 链下运行；来源：验收报告 0005）
- A2（低代价 × 中不确定）：`.zcode/config.json` 由用户手工维护其他配置，合并可能写坏。缓解：合并只动 hooks 块且以既有文件为底稿（技能用编辑工具操作，不跑 JSON 重写脚本）；合并后校验 JSON 可解析再收尾。（验证：通过——本仓 hooks 块在位、JSON 可解析、其余键未动；来源：验收报告 0005）
- A3（低代价 × 低不确定）：规则 A 子串匹配会误拦讨论性命令（如 `echo "别用 --no-verify"`）。安全方向误报，deny 理由引导改写；已知悉接受。（验证：通过——安全方向误报，deny 理由引导改写；来源：验收报告 0005）
- A4（低代价 × 中不确定）：hooks 配置改动的生效时机（运行中会话是否热加载）未核验。缓解：列为集成级验收场景（新开会话验证），文档注明"改动后建议重开会话"。（验证：本轮未触发——热加载时机留新会话验证，转残余风险；来源：验收报告 0005）

## 范围与非目标

范围：`.sdlc/hooks/l4-guard.sh`（assets 分发 + 本仓安装）、run-tests.sh L4 用例组、setup-workspace 接线（SKILL.md/generation.md/适配器参考）、本仓 `.zcode/config.json` hooks 块合并、蓝图/METHOD/GLOSSARY/concepts/README 同步。

非目标：不做 Claude Code settings.json 接线（脚本保持载体无关，候选载体留未来）；不拦经 Bash 间接改源码的命令（sed -i 等，L1/L3 兜底）；不做文件级工单归属（任一在办工单放行全部 CODE_DIRS 编辑，L4 是粗粒度兜底）；不改 check.sh 子命令与任何门禁语义；不做 allow/ask 分级（仅 deny）；不动 AGENTS.md 哨兵块。

## 开放问题

（无未决问题。拍板记录：）
- D1 判定脚本独立于 check.sh（`.sdlc/hooks/l4-guard.sh` 自包含）→ 热路径隔离（每次工具调用都跑）+ check.sh 保持纯 git 门禁；解析惯用法与 check.sh 同源（awk frontmatter），代价是少量重复（去向 FR-3）。
- D2 "无工单"判据 = docs/tickets/ 无 `status: in-progress` 工单 → 与 dev-implement"入口校验通过后立即置 in-progress"的时序吻合；ready 不放行（未开工先改码正是要拦的）（去向 FR-2）。
- D3 deny 通道 = stdout JSON `permissionDecision`（带理由直达模型）而非 exit 2 → 理由可见性优先；schema 漂移时最坏废一次输出（fail-open）（去向 FR-1/2、假设 A1）。
- D4 载体范围 = 本批只接 ZCode；Claude Code stdin/exit 语义同构，接线留未来（去向 FR-4）。
- D5 本仓 CODE_DIRS 保持留空 → config.sh 归用户所有，源码编辑拦截是否激活（及把哪些目录列入）由用户拍板；机制经夹具测试验证（去向 FR-2）。

### round 1 验收折回（2026-10-29，验收报告 0005）

- 残余风险：新开会话中 `--no-verify` 的 deny 真实到达、hooks 配置热加载时机未验证；全新夹具仓库在 ZCode 会话的完整 setup 未跑。放行腿已获真实会话证据（本验收会话全程经 hook 链零阻断），deny 腿有机械实证（guard 实跑 + L4 用例组）。
- 下一轮建议：新开会话发一次 `git commit --no-verify` 验证 deny 真实到达会话；跑一次全新 setup-workspace 的完整安装。
