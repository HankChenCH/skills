# 智能体接入参考：ZCode

## 识别信号（任一命中即认定为 ZCode）

- 环境变量含 `ZCODE_` 前缀（如 ZCODE_*、ZCODE_SESSION 相关变量）。
- 本技能经 `~/.zcode/skills/` 路径加载（SKILL.md 路径含 `/.zcode/skills/`）。
- 存在 `~/.zcode/` 配置目录且无更强的其他智能体信号。

## 接入差异

1. **AGENTS.md 原生生效**：ZCode 会话自动读取仓库根 AGENTS.md，哨兵块写入即生效，无额外动作。
2. **技能路径**：本技能安装于 `~/.zcode/skills/setup-workspace`（通常是指向源仓库的符号链接）；assets/ 与 references/ 经同一目录可达，无需复制。
3. **hooks 位点（L4，已接线）**：setup 把 L4 判定脚本与平台接线一并装好——
   - 拷贝 `assets/hooks/l4-guard.sh` → `<repo>/.sdlc/hooks/l4-guard.sh`（`chmod +x`，可整体覆盖；安装细则见 generation.md）。
   - 把下列 `hooks` 块合并进工作区 `<repo>/.zcode/config.json`（文件不存在则创建；已存在只动 `hooks` 键，其余内容一字不动）：

     ```json
     {
       "hooks": {
         "enabled": true,
         "events": {
           "PreToolUse": [
             {
               "matcher": "Bash|Edit|Write",
               "hooks": [
                 { "type": "process", "command": "bash", "args": ["${ZCODE_PROJECT_DIR}/.sdlc/hooks/l4-guard.sh"], "timeoutMs": 10000 }
               ]
             }
           ]
         }
       }
     }
     ```

   - `enabled: true` 必需——配置文件 hooks 缺省禁用；matcher 是对工具名的区分大小写正则（`Bash`、`Edit`、`Write`，Edit/Write 覆盖 ApplyPatch 别名）。
   - 合并幂等：重跑整块替换 `hooks` 键；合并后确认 JSON 可解析；用户已有其他 hooks 一并保留，收尾报告说明 `enabled` 置 true 的连带影响（原本禁用的配置 hooks 将一并生效）。
   - deny 行为与失效安全（fail-open）语义见蓝图 §14 与 spec 0005；收尾报告含 L4 行。
