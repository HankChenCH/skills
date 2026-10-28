# 生成与升级细则（§3–§5 阶段按需加载）

一切文件生成以 assets/ 模板为唯一来源，禁止凭记忆手写。每完成一个目标，向用户报告一行"覆盖 / 保留 / 补缺"决策。

## 1. 各目标的确切写法

### .sdlc/check.sh

- 拷贝 `assets/check.sh` → `<repo>/.sdlc/check.sh`，`chmod +x`。
- 重跑整体覆盖（纯逻辑，无用户数据）。
- `.sdlc/`、`.sdlc/trackers/` 目录随写随建。

### .sdlc/hooks/l4-guard.sh

- 拷贝 `assets/hooks/l4-guard.sh` → `<repo>/.sdlc/hooks/l4-guard.sh`，`chmod +x`，重跑整体覆盖（纯逻辑）。
- `.sdlc/hooks/` 目录随写随建。脚本自包含（stdin JSON 判定，读 config.sh 的 CODE_DIRS），不依赖 check.sh；deny/放行语义见蓝图 §14 与 spec 0005。
- 平台接线（hooks 配置块）属智能体额外动作，见 §2——仅命中 ZCode 适配器时执行。

### .sdlc/trackers/{local,github,gitlab,codeup}.sh

- 拷贝 `assets/trackers/local.sh` → `<repo>/.sdlc/trackers/local.sh`，`chmod +x`，可整体覆盖。
- 决策 1 选了 github / gitlab / codeup → 追加拷贝 `assets/trackers/<决策1>.sh` 并 `chmod +x`，可整体覆盖；codeup 适配器所需的 CODEUP_TOKEN / CODEUP_ASSIGNEE / CODEUP_WORKITEM_TYPE 在收尾报告"config 待补项"中列出（写法见 references/decisions.md 决策 1）。
- 扫描发现的其他 `.sdlc/trackers/*.sh`（用户自定义适配器）**一律不动**。

### .sdlc/config.sh（仅缺失时生成）

```sh
# SDLC 流程配置（本文件归用户所有；setup-workspace 重跑绝不覆盖）
TRACKER=<决策1>
TRACKER_REPO="<决策1，local 时留空>"
BASE_REF=<探测：origin/HEAD 或 main，用户可改>
RUN_ENV=<决策2>
RUN_PREFIX="<决策2，构造法见 references/decisions.md>"
PKG_MGR=<决策2>
CODE_DIRS=<scan-signals §5 探测>

CHECK_LINT="<scan-signals §3 探测>"
CHECK_TYPE="<同上>"
CHECK_TEST="<同上>"
```

探测不到的项留空字符串，不编造。存在即跳过（读一下确认非空即可）。

### docs/METHOD.md

拷贝 `assets/METHOD.md` 整体覆盖（仅 setup 可写，无用户手改预期）。docs/ 目录随写随建。

### docs/standards/ 与 CODING_STANDARDS.md

- 按决策 3 执行导入/生成，细则见 references/decisions.md。
- CODING_STANDARDS.md 已存在非空内容 → 不动，只在收尾报告提醒可用决策 3 追加索引。

### GLOSSARY.md

- 不存在 → 用 `assets/GLOSSARY.md` 创建。
- 已存在 → 只补缺失的"流程术语与状态"章：检查是否含 `## 流程术语与状态` 标题；缺失则把 assets/GLOSSARY.md 的该章内容追加到文件**末尾**（项目术语章在前就在其后追加，保持既有内容一字不动）。已含该章 → 跳过。

### .git/hooks/commit-msg、pre-push

每个 hook 写成一行转发（以 commit-msg 为例，`sdlc-managed` 标记必须保留，幂等判定靠它）：

```sh
#!/bin/sh
# sdlc-managed: forward to .sdlc/check.sh（由 setup-workspace 安装，重装会覆盖本文件）
exec "$(git rev-parse --show-toplevel)/.sdlc/check.sh" commit-msg "$@"
```

pre-push 同理，子命令换为 `pre-push`（无参数转发）。写完 `chmod +x`。
轻门禁必须挂 commit-msg 而非 pre-commit：git 在 commit-msg 时点才写入 commit message，pre-commit 时消息尚不存在。

**外来 hook 处置**：已存在且不含 `sdlc-managed` → **不覆盖**；读出其内容摘要告知用户，给两个选项：把原有逻辑并进 check.sh 后重装，或用户自行串联（`exec` 前加调原 hook）。用户不选就跳过并列入收尾报告。

### docs/ 八个产物目录

**不创建**。留待第一个产物落盘时由对应技能创建，不留 .gitkeep。

## 2. AGENTS.md 收口（§4，最后一步执行）

哨兵块固定文本（措辞勿改，与 assets/METHOD.md、GLOSSARY.md 的引用关系已内置）：

```markdown
<!-- sdlc:begin 由 setup-workspace 管理，勿在此块内手改 -->
## 开发流程（强制，不可协商）
完整规则见 docs/METHOD.md，术语与状态定义见 GLOSSARY.md。
- 改动源码前必须存在 status: approved 的 spec 与对应工单；小修走 [trivial] 豁免（retro 审计）。
- 提交必须通过 .sdlc/check.sh；禁止 --no-verify。
- 评审标准轴依据 CODING_STANDARDS.md 及其索引的 docs/standards/ 文件。
- 不确定当前阶段就运行 /sdlc，不要凭记忆推进。
<!-- sdlc:end -->
```

三态：
1. 文件不存在 → 创建，内容为一级标题 `# AGENTS.md`、空行、哨兵块；收尾报告说明已代建。
2. 存在但无 `<!-- sdlc:begin` → 原内容不动，文末空一行后追加哨兵块。
3. 已有标记 → 只替换 `<!-- sdlc:begin …` 到 `<!-- sdlc:end -->` 之间的内容，块外一字不动。

智能体额外动作（命中 references/agent-adapters/ 时）在此一并执行——如 Claude Code：CLAUDE.md 不存在则创建一行 `@AGENTS.md`；已存在则在文末追加该行（已有则跳过）。ZCode：把 L4 的 PreToolUse hooks 块合并进工作区 `<repo>/.zcode/config.json`（模板与幂等语义见 references/agent-adapters/zcode.md）——文件不存在则创建；已存在则只替换/新增 `hooks` 键，其余内容（如 mcp 配置）一字不动；`hooks.enabled` 必须为 `true`（配置文件 hooks 缺省禁用），用户已有其他 hooks 一并保留，收尾报告说明置 true 的连带影响（原本禁用的配置 hooks 将一并生效）；合并后确认全文仍是可解析的 JSON，不可解析即回滚本次合并并报告。

## 3. 自检（§5 第 1 步）

依次运行并确认正常输出（在仓库根执行）：

```sh
<repo>/.sdlc/check.sh phase      # 空库各类型显示（无），不报错
<repo>/.sdlc/check.sh frontier   # 显示（空）提示
```

任一报错即安装损坏：停止，读报错修复（多为 config.sh 语法或可执行位），修完重跑自检。

## 4. 收尾报告模板（§5 第 2 步）

```markdown
## setup-workspace 完成报告

**本次动作**（覆盖/保留逐项）：
- 覆盖 .sdlc/check.sh；生成 .sdlc/config.sh（模板）；生成 .sdlc/trackers/local.sh
- 覆盖 docs/METHOD.md；GLOSSARY.md 补"流程术语与状态"章
- AGENTS.md <创建|追加哨兵块|替换块内内容>；hooks <安装 commit-msg/pre-push|发现外来 hook：说明>；L4 hook <已装（guard 脚本 + .zcode/config.json hooks 块，ZCode 会话）|未识别 ZCode 会话，未装平台接线，guard 脚本仍就位>
- 编码标准：<导入 N 份到 docs/standards/ | 引入 <lang> starter | 跳过>
- 识别智能体：<name|未识别，走通用流程>；仓库类型：<单仓库|monorepo（N 包）>

**探测画像**：语言 <…>；版本管理 <…>；包管理器 <…>；检查命令 <…或"未发现">

**config 待补项**：
- TRACKER_REPO（<原因>）
- CHECK_LINT/CHECK_TYPE/CHECK_TEST 留空（<原因>）
- <Codeup MCP / gh 登录等待办>

**下一步**：运行 /sdlc 查看流程状态总览（总控技能未实现时：告知"建议实现 sdlc 技能后使用"）。
```
