# 智能体接入参考：ZCode

## 识别信号（任一命中即认定为 ZCode）

- 环境变量含 `ZCODE_` 前缀（如 ZCODE_*、ZCODE_SESSION 相关变量）。
- 本技能经 `~/.zcode/skills/` 路径加载（SKILL.md 路径含 `/.zcode/skills/`）。
- 存在 `~/.zcode/` 配置目录且无更强的其他智能体信号。

## 接入差异

1. **AGENTS.md 原生生效**：ZCode 会话自动读取仓库根 AGENTS.md，哨兵块写入即生效，无额外动作。
2. **技能路径**：本技能安装于 `~/.zcode/skills/setup-workspace`（通常是指向源仓库的符号链接）；assets/ 与 references/ 经同一目录可达，无需复制。
3. **hooks 位点**（批 3 L4）：ZCode PreToolUse hook 可拦截 `--no-verify` 与无工单的源码编辑；本批只装 git hooks，收尾报告不提 L4（未实现的东西不预告为已有）。
