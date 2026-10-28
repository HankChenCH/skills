---
id: 0005
status: approved
approved: 2026-10-28
need: 0003
round: 1
created: 2026-10-28
---
# L4 平台层拦截 hook（PreToolUse guard）

## 问题陈述

四层防御的 L1–L3 已就位，但一个明知故犯的 agent 会话仍有两个不改不难的绕过面：`git commit --no-verify` 直接跳过 commit-msg 轻门禁（L3 只拦"入库提交"，拦不到提交命令本身）；或在没有任何在办工单时直接编辑源码（L1 靠自觉、L3 只在提交时追认）。事后 retro 审计能发现但不能阻止。蓝图 §14 把具体拦截规则留给批 3 设计，本规格即该设计的落盘。

## 方案

新增平台层拦截脚本 `.sdlc/hooks/l4-guard.sh`（assets 随技能分发），由 ZCode 的 PreToolUse hook 在每次 Bash/Edit/Write 工具调用前执行：读 stdin 的工具调用描述，命中两条规则之一则经 stdout JSON 回 `permissionDecision: deny` 与理由，其余一律静默放行。规则 A 拦 `--no-verify`（含 `git commit -n` 短形式）；规则 B 拦"CODE_DIRS 下且无在办工单"的源码编辑。setup-workspace 在 ZCode 会话中安装脚本并合并 `.zcode/config.json` 的 hooks 块。失效安全贯穿：guard 的任何自身异常都是放行。

## 用户故事

- 作为仓库主人，我想让含 `--no-verify` 的命令在到达工具前被拦下并说明它绕过了什么、正道是什么，以便绕过从"事后追认"变成"当场拦截"。
- 作为仓库主人，我想让无在办工单的源码编辑被拦并指路 /dev-implement，以便源码改动永远挂在一张开工的工单下。
- 作为 AI 执行者，我想让 deny 理由可读且给出下一步，以便被拦后能自己走正道而不必人来救。
- 作为 dev-implement 流程，我想让"置 in-progress 后编辑源码"照常放行，以便既有流程零改动。
- 作为任何仓库的用户，我想让 guard 自身故障时一切照旧放行，以便门禁增强不引入新的单点故障。

## 实现决策

**判定脚本（`.sdlc/hooks/l4-guard.sh`，bash 3.2 + awk/sed/grep/git，与 check.sh 同依赖面）**：

- I/O 契约：stdin 收 ZCode hook 载荷（snake_case JSON，取 `tool_name` 与 `tool_input` 的 `command`/`file_path` 字段；sed 提取，容忍转义——检测子串不受影响）；放行 = 无输出 exit 0；拦截 = stdout 单行 `{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"<理由>"}`（ZCode 严格 schema，恰好五键分支中的三键，不添 extra key）+ stderr 同步一行供日志，exit 0。
- 规则 A（FR-1）：`tool_name=Bash` 且命令含 `--no-verify` 字面量，或匹配 `git commit` 段内的独立 `-n` token（`git[[:space:]]+commit[^;|&]*[[:space:]]-n([[:space:]]|$)`，不跨命令分隔符），→ deny，理由含"绕过 commit-msg 门禁"与正道（`[#NNNN]` / `[trivial]`）。子串匹配的讨论性误报是已接受取舍（need 0003 A3）。
- 规则 B（FR-2）：`tool_name` 为 Edit/Write（matcher 覆盖 ApplyPatch 别名）且 `file_path` 归一化后（相对路径锚定仓库根、目录存在则取物理路径）落在 CODE_DIRS 某目录（空格分隔、锚定仓库根）之下，且 `docs/tickets/*.md` 中无 `status: in-progress`（awk 解析 frontmatter，惯用法同 check.sh 的 fm_get），→ deny 并指路 /dev-implement。CODE_DIRS 留空 → 规则 B 整体不生效；docs/ 与 .sdlc/ 因不在 CODE_DIRS 而天然放行。
- 失效安全（FR-3）：以下一律无输出 exit 0——不在 git 仓库、缺 `.sdlc/config.sh`、stdin 空或非法、字段提取失败；`set -u` 下先取默认值再使用，任何非预期路径以放行收场。
- 独立于 check.sh（need 0003 D1）：自包含解析、零 check.sh 改动；判定脚本归 setup 所有权类（重跑可整体覆盖）。

**载体接线（FR-4）**：`.zcode/config.json` 顶层 `hooks` 块——`{"enabled": true, "events": {"PreToolUse": [{"matcher": "Bash|Edit|Write", "hooks": [{"type": "process", "command": "bash", "args": ["${ZCODE_PROJECT_DIR}/.sdlc/hooks/l4-guard.sh"], "timeoutMs": 10000}]}]}}`（process 型免 shell 引号与可执行位问题；`enabled: true` 必需——配置文件 hooks 默认禁用）。合并语义：hooks 块归 setup（幂等重写），文件其余内容（如 mcp 配置）归用户一字不动；仅命中 ZCode 适配器时执行；合并后 JSON 可解析才收尾。

**setup 接线（FR-4）**：assets 增 `hooks/l4-guard.sh`；SKILL.md 前置校验清单与 §3 生成表补 `.sdlc/hooks/`；generation.md 补安装细则与 ZCode 会话额外动作（hooks 块合并）及收尾报告模板行；zcode.md 接入差异改为现状化安装说明；claude-code.md 标注"同构候选载体，本批不接线"（snake_case stdin 与 exit 语义同构，脚本载体无关）。

**文档同步（FR-5）**：蓝图 v1.14（§3 L4 行、§5.2 目录树与所有权表、§5.5 CODE_DIRS 注记、§14 现状化 + §10.2 批 3 标注）、METHOD.md 两份（§3 表加 L4 行、§4.1 树与接线段、§8 CODE_DIRS 注记）、GLOSSARY 两份关键机制词条、concepts.md 条目现状化、README 台账。

## 测试决策

- seam：`l4-guard.sh` 的 stdin JSON 解析与两条规则判定。沿用 run-tests.sh 的 `new_repo` 夹具 + `t`/`tn` 断言骨架，输入用 `printf '%s' '<json>' | bash <assets>/hooks/l4-guard.sh` 直接喂，离线可重复。
- 用例矩阵：规则 A（--no-verify 长形式、git commit -n 短形式、正常提交放行、--no-verify 出现在 push 段）、规则 B（CODE_DIRS 命中无票 deny / 有 in-progress 票放行 / ready 票 deny / docs 编辑放行 / CODE_DIRS 空放行 / 仓库外路径放行 / 多目录命中）、失效安全（缺 config.sh、非法 JSON、空 stdin、缺 stdin 字段）。断言：exit 码 + stdout 含 `permissionDecision":"deny`（拦截）或输出为空（放行）+ 理由子串。
- 既有同类先例：run-tests.sh 的 publish 用例组与 git hook 端到端组。真实 ZCode 会话触发不进自动化（集成级场景人工验收，同 tracker 真实凭据先例）。

## 验收场景

- [FR-1 | 工单级] Given sdlc 夹具仓库，When stdin 喂 `{"tool_name":"Bash","tool_input":{"command":"git commit --no-verify -m x"}}`，Then exit 0，stdout 为合法 deny JSON（含 `permissionDecision":"deny` 与"绕过"字样），stderr 有同步日志行。
- [FR-1 | 工单级] When 命令为 `git commit -n -m x` 或 `git commit -n`，Then 同样 deny；When 命令为 `git commit -m "[#0010] ok"` 或 `git push`，Then 无输出放行。
- [FR-2 | 工单级] Given CODE_DIRS="lib app" 且 docs/tickets/ 只有 ready 工单，When stdin 喂 Edit 调用 `file_path=<root>/lib/a.py`，Then deny 且理由含"dev-implement"；When 该票置 in-progress 后同输入，Then 放行。
- [FR-2 | 工单级] Given 同仓，When Edit `file_path=<root>/docs/specs/0005-*.md` 或 Write 仓库外路径，Then 放行；When CODE_DIRS 留空时 Edit `<root>/lib/a.py`，Then 放行。
- [FR-3 | 工单级] Given 缺 `.sdlc/config.sh` 的 git 仓库、非法 JSON、空 stdin、缺 `tool_name` 字段四类输入，Then 全部无输出 exit 0；check.sh 与 git hooks 相关用例全绿不回归（99+ 用例基线不降）。
- [FR-5 | 工单级] Given 文档同步完成，When 比对两份 METHOD.md、两份 GLOSSARY.md 并 grep 蓝图 §3/§5.2/§5.5/§14 与 concepts/README，Then 同名文件逐字一致、L4 表述与实物一致（含 §10.2 批 3 标注随实现补记）。
- [FR-4 | 工单级] Given assets/hooks/l4-guard.sh 与 setup 文本更新，When 全仓 grep 适配器 L4 话术，Then zcode.md 为安装现状、claude-code.md 为"候选载体本批不接线"，无"本批只装 git hooks"残留；夹具仓库手工合并 hooks 块后 JSON 可解析且既有键不动。
- [FR-1、FR-2 | 集成级] Given 真实 ZCode 会话与本仓安装（CODE_DIRS 按用户配置），When 实际发出 `--no-verify` 命令与无票源码编辑，Then 会话内收到 deny 理由；改为正常提交或在办编辑则放行。（留验收阶段，新开会话验证——hooks 配置生效时机未核验）
- [FR-4 | 集成级] Given 全新夹具仓库在 ZCode 会话完整跑 setup-workspace，Then `.sdlc/hooks/l4-guard.sh` 就位、`.zcode/config.json` hooks 块合入且 enabled:true、收尾报告含 L4 行。（留验收阶段）

## 非目标

不做 Claude Code settings.json 接线（脚本保持载体无关）；不拦经 Bash 间接改源码的命令（sed -i、重定向等）；不做文件级工单归属与 per-file 精确放行；不改 check.sh 子命令、git hooks 与任何门禁语义；不做 allow/ask 分级与交互式确认；不动 AGENTS.md 哨兵块；不做 hooks 配置热加载行为核验（留验收）。

## 备注

来源：need 0003（2026-10-28，用户指令"按技能蓝图规划，实现L4 hooks"触发，即日批准——同 spec 0004 先例，用户指令即批准依据）。一手契约：ZCode 随版本发布的 diagnosing-hooks 技能（七事件、matcher 正则、exit 0/2、严格 JSON schema、`enabled: true` 缺省禁用）+ 主程序 schema 实证（stdin snake_case 载荷与 PreToolUse 输出五键分支，2026-10-28 核验）。蓝图 v1.14（2026-10-28）先行定稿 §3/§5.2/§5.5/§14 契约。规则 A 子串误报与 Bash 间接改码两个边界已知悉接受（安全方向失效 + L1/L3 兜底）。
