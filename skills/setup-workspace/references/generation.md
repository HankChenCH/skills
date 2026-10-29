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

### 多仓工作区模式（仅 SKILL §0 判定进入该模式时执行）

- **工作区仓库**：根目录 `git init -b main`（分支 2 前提即根非仓库，无需防重）。随后按本节以上各目标在根落全套：check.sh、l4-guard、trackers、config.sh（仅缺失时生成）、METHOD.md、GLOSSARY、CODING_STANDARDS、AGENTS.md 哨兵（§2）、根 commit-msg/pre-push 转发，语义与单仓完全一致；docs/ 八个产物目录照旧懒创建。根不装成员源码：CODE_DIRS 与 CHECK_* 探测不到即留空；fresh init 无 origin/HEAD，BASE_REF 落 `main` 默认值。
- **成员清单 `.sdlc/members.list`**：决策 4 确认后落盘，逐行一个成员目录名（相对根、无斜杠、按扫描顺序）；归 setup 所有权，重跑按新确认结果**整体重写**。被排除的候选不落行。`.sdlc/` 随写随建。
- **根 .gitignore 成员标记段**：登记成员目录，防嵌套 git 仓库被误收进工作区仓库索引。段格式（标记行措辞勿改，幂等判定靠 begin/end 标记）：

  ```
  # sdlc:members begin（setup-workspace 管理，勿手改；重跑按成员清单整体重写）
  frontend/
  backend/
  # sdlc:members end
  ```

  - .gitignore 不存在或无 begin 标记 → 文末追加：已有内容时先空一行再落段，新文件直接落段；段内为成员清单逐行 `<目录名>/`。
  - 已有 begin 标记 → 只重写 begin/end 之间的行；标记行与块外内容一字不动，不重复追加段。
  - 成员为零（用户排除全部候选）时段内留空，标记行保留。用户自有行（标记段外的任何行）任何情况下不动。

- **成员 hook `<成员>/.git/hooks/commit-msg`（成员提交门禁转发；只装 commit-msg，不装 pre-push——成员不跑 lint/test，need C3）**：转发模板如下，`sdlc-managed` 标记保留（幂等判定靠它，重装整体覆盖）：

  ```sh
  #!/bin/sh
  # sdlc-managed: forward to workspace root .sdlc/check.sh（由 setup-workspace 安装，重装会覆盖本文件）
  msg="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
  cd "$(dirname "$(git rev-parse --show-toplevel)")" && exec ./.sdlc/check.sh commit-msg "$msg"
  ```

  两步各有硬理由：git 传给 hook 的是相对成员仓库的消息文件路径，先取绝对路径，否则锚定后路径失效、读错消息文件；check.sh 以 `git rev-parse --show-toplevel` 自定位仓库根，成员内触发会落到成员仓库、根 docs/tickets/ 被读空——先 `cd` 锚定到工作区仓库根再 `exec`，成员提交校验的才是工作区仓库根 docs/tickets/ 里的工单。外来 hook 沿用本节以上「.git/hooks/commit-msg、pre-push」条款：不覆盖，报告并给合并方案。成员被单独 clone 到工作区根之外时转发会因找不到 check.sh 拦截提交——那是安装损坏信号，重跑 /setup-workspace 复原。

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

### 成员 AGENTS.md 哨兵块（仅多仓工作区模式）

多仓工作区模式下，对每个入册成员子仓库落**成员版**哨兵块（成员内不落根版流程块）；
固定文本如下，落装时 `<成员目录名>` 替换为成员清单中的目录名（措辞勿改）：

```markdown
<!-- sdlc:begin 由 setup-workspace 管理，勿在此块内手改 -->
## 开发流程（本仓库是 SDLC 多仓工作区的成员子仓库）
本仓库 `<成员目录名>` 是多仓工作区的成员子仓库，所属工作区仓库在上级目录：need/spec/工单、docs/、.sdlc/ 等流程产物全在工作区根。
- 流程操作（/sdlc、need/spec/工单、check.sh）一律回工作区根进行，本仓库内不落流程产物。
- 代码修改在本仓库内照常进行；提交须带 [#NNNN] 或 [trivial] 豁免，成员 commit-msg hook 会转发到工作区根校验。
- 完整规则见工作区根 docs/METHOD.md，术语与状态定义见工作区根 GLOSSARY.md。
<!-- sdlc:end -->
```

三态与根版同规则：
1. 文件不存在 → 创建：一级标题 `# AGENTS.md`、空行、成员哨兵块；收尾报告说明已代建。
2. 存在但无 `<!-- sdlc:begin` 标记 → 原内容不动，文末空一行后追加成员哨兵块。
3. 已有标记 → 只替换 `<!-- sdlc:begin …` 到 `<!-- sdlc:end -->` 之间的内容为成员哨兵块。

块外内容任何情况下一字不动；幂等重装靠标记判定，同文本重跑文件零变化。

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
- 识别智能体：<name|未识别，走通用流程>；仓库类型：<单仓库|monorepo（N 包）|多仓工作区（N 成员）>
- 多仓工作区：<git init 根为工作区仓库；成员清单 .sdlc/members.list 落 N 名（<目录名、…>）；用户排除：<目录名、…|无>；.gitignore 标记段 <追加|重写>；非成员目录零接触>

**探测画像**：语言 <…>；版本管理 <…>；包管理器 <…>；检查命令 <…或"未发现">

**config 待补项**：
- TRACKER_REPO（<原因>）
- CHECK_LINT/CHECK_TYPE/CHECK_TEST 留空（<原因>）
- <Codeup MCP / gh 登录等待办>

**下一步**：运行 /sdlc 查看流程状态总览（总控技能未实现时：告知"建议实现 sdlc 技能后使用"）。
```
