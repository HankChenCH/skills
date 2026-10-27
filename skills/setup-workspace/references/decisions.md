# 决策点操作细则（§2 决策阶段按需加载）

三个决策点全部"必须问 + 带默认建议 + 扫描已答的只复述"。可一次性问完（如 AskUserQuestion 多题），也可逐一问；无论哪种，用户只需回"嗯"或纠正。

## 决策 1：产物与 issue 出口

问法模板：

> 产物与 issue 发布到哪？① local（默认，一切留在本仓库 docs/）② GitHub ③ GitLab ④ 云效 Codeup。

**选 GitHub**：
1. 运行 `gh auth status` 验证登录态。
2. 通过 → 问 `owner/repo` 标识（或从 `git remote get-url origin` 解析，向用户复述确认），写 TRACKER_REPO。
3. 不通过 → 明确告知"gh 未登录，无法验证 GitHub 出口，已回落 local"；TRACKER 仍按用户意愿写 github 亦可，但必须在收尾报告的"config 待补项"中列出。

**选 GitLab**：
1. 运行 `glab auth status` 验证登录态。
2. 通过 → 问 `group/project` 标识（或从 `git remote get-url origin` 解析，向用户复述确认），写 TRACKER_REPO。
3. 不通过 → 明确告知"glab 未安装或未登录，无法验证 GitLab 出口，已回落 local"；TRACKER 仍按用户意愿写 gitlab 亦可，但必须在收尾报告的"config 待补项"中列出。
4. 平台模型参考（issue/合并请求模型、编号语法、API/CLI 入口）：实现 gitlab.sh 适配器前先读本技能 `references/tracker-platforms.md`（随技能分发，相对技能目录可达，跨机器可用）。

**选 Codeup**：
1. 检查当前会话是否已配置 Codeup MCP（列出可用 MCP 工具即可判断）。
2. 未配置 → 给出添加指引：按所用智能体的 MCP 配置方式添加 Codeup MCP server（具体指引待批 3 补充细化），并说明"配置后重启会话生效"。
3. CODEUP_TOKEN 只是适配器就绪前的手动替代，如实说明。
4. 不阻断初始化：TRACKER=codeup 照写，收尾报告列待办。

**通用说明（如实相告，不隐瞒）**：github/gitlab/codeup 的 publish 适配器属批 3；在此之前 `check.sh publish` 会输出"适配器尚未实现"警告并跳过，产物安全在盘上（docs/ 是真相源）。

## 决策 2：执行环境缺口

只问扫描（references/scan-signals.md §4）没答出的维度。问法模板（多语言/monorepo 按语言分列）：

> Node 项目：跑在本机还是 docker？（检测到 Dockerfile 但没发现版本钉子）版本管理用 nvm / mise / 不用？包管理器 npm / pnpm / yarn？（未发现 lockfile）

结果写入 config.sh：

| 字段 | 取值与来源 |
|---|---|
| RUN_ENV | local / docker（检测或用户答） |
| RUN_PREFIX | 可执行前缀，供 `check.sh all` 包裹命令。构造示例：<br>docker：`docker compose run --rm app`（服务名按 compose 文件定）<br>mise：`mise exec --`<br>asdf：`asdf exec`<br>nvm（无更好办法时）：留空并在收尾报告提示用户手填 |
| PKG_MGR | lockfile/packageManager 字段/用户回答 |
| CODE_DIRS | scan-signals §5 探测的源码目录 |

验证：写完 config 后可用 `RUN_PREFIX` 试跑一条无害命令（如 `"$RUN_PREFIX" node --version`）确认前缀可用；不可用则退回留空并告知。

## 决策 3：编码标准来源

问法模板：

> 编码标准用哪个？① 引入我仓库内置的兜底 starter（默认，按探测语言列出）② 我有自有/团队标准，从指定位置导入 ③ 两者都要（导入自有 + starter 兜底）④ 跳过，以后再说。

**导入自有标准（②/③）**：
1. 让用户给出来源：本地路径或 URL，可多个。
2. 逐个拉取：本地路径直接拷贝；URL 用 curl/WebFetch 获取（markdown 优先，无法获取时如实报告，请用户手动放到 docs/standards/）。
3. 存放：`docs/standards/<语义名>.md`——文件名 ASCII 小写短横线；**同名不覆盖**，冲突时加来源后缀并告知。
4. CODING_STANDARDS.md 写成"索引 + 兜底基线"：头部声明兜底地位，正文列出 docs/standards/ 各文件一行索引（文件名 + 一句内容概括）。若用户选了 ③，索引之后附上 starter 内容。

**仅 starter（①）**：按探测语言引入对应 assets/standards/<lang>.md 全文（多语言全部引入），作为 CODING_STANDARDS.md 正文。

**跳过（④）**：不创建 CODING_STANDARDS.md；收尾报告注明"标准轴暂无 repo 标准，评审将退回坏味道基线，建议尽快补充"。
