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
4. 平台模型参考（issue/合并请求模型、编号语法、API/CLI 入口）：本技能 `references/tracker-platforms.md`（随技能分发，跨机器可用）——适配器实现与维护时以它为起点，端点与字段以当时官方文档复核。

**选 Codeup**：
1. 检查当前会话是否已配置 Codeup MCP（列出可用 MCP 工具即可判断）。
2. 如实说明两条路径：**适配器直连优先**——publish 投影只需个人访问令牌与坐标，零 MCP 依赖，请用户准备四项：`TRACKER_REPO=<organizationId>/<spaceIdentifier>`（organizationId 见云效访问链接 `https://devops.aliyun.com/organization/<OrganizationId>`）、`CODEUP_TOKEN`（个人访问令牌，`pt-` 前缀）、`CODEUP_ASSIGNEE`（负责人阿里云 accountID）、`CODEUP_WORKITEM_TYPE`（项目下 Task 类工作项类型标识，OpenAPI Explorer 查得）；可写入 config.sh 或环境变量。**MCP 为可选增强**——只在需要对话内直接操作工作项时才配置：按所用智能体的 MCP 配置方式添加云效 OpenAPI MCP server，并说明"配置后重启会话生效"；未配置不影响适配器。
3. 不阻断初始化：TRACKER=codeup 照写，适配器照装，待补项进收尾报告。

**通用说明（如实相告，不隐瞒）**：github/gitlab/codeup 的 publish 适配器随本技能分发（assets/trackers/），生成阶段按所选出口安装；投影失败（CLI 缺失/未认证/API 报错/配置缺失）一律警告跳过（exit 0），不阻断技能出口链——产物在盘上（docs/ 是真相源）。

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

## 决策 4：成员入册确认（仅多仓工作区模式）

问法模板（一轮列全，8+ 成员也不拆问）：

> 根下扫到这些 git 仓库，均建议入册为成员子仓库：
> - frontend —— 单仓（Node/TS）
> - backend —— monorepo（pnpm workspace，3 包）
>
> 默认全部入册；要排除哪个？回"嗯"表示全入册。

规则：

- **一次列全**：全部候选同轮列出，每行"目录名 + 分类（单仓 / monorepo）"；分类取自 scan-signals §1 第三形态的展示信息。不逐个问，不拆多轮。
- **默认全入册，只点名排除**：用户回"嗯"或类似肯定即全入册；排除只认显式点名的目录（"排除 notes"）。普通目录与被跳过的点目录不在候选内，不列出、不询问。
- **非成员目录零接触**：确认环节及其后的生成阶段，对未入册目录不产生任何写入（含隐藏文件）。
- 确认结果即成员清单，落盘写法见 references/generation.md「多仓工作区模式」节；被排除的候选在收尾报告多仓行中如实列出。
