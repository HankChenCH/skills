# 智能体接入参考：Claude Code

## 识别信号（任一命中即认定为 Claude Code）

- 环境变量 `CLAUDECODE=1`（或含 CLAUDE_ 前缀的会话变量）。
- 本技能经 `~/.claude/skills/` 路径加载。
- 存在 `~/.claude/` 配置目录且无更强的其他智能体信号。

## 接入差异

1. **CLAUDE.md 转发**：Claude Code 自动读 CLAUDE.md（不读 AGENTS.md）。AGENTS.md 收口后，确保仓库根 CLAUDE.md 含一行：

   ```markdown
   @AGENTS.md
   ```

   CLAUDE.md 不存在则创建（内容仅此一行）；已存在则文末追加（已有 `@AGENTS.md` 则跳过）；已有实质内容时追加前告知用户"加了一行引用，原内容不动"。

2. **技能路径**：若本技能经 `~/.zcode/skills/` 符号链接加载而会话是 Claude Code，assets/ 与 references/ 仍按 SKILL.md 同目录定位，符号链接可正常解析。
3. **hooks 位点（L4，候选载体，本版未接线）**：判定脚本 `.sdlc/hooks/l4-guard.sh` 与平台无关——snake_case stdin 载荷与 exit/JSON 语义同 Claude Code 的 PreToolUse hooks 同构。setup 会安装脚本本体（`.sdlc/hooks/`），但本版只接 ZCode 工作区，不写 `.claude/settings.json`；收尾报告不预告 L4（未接线的东西不预告为已有）。
