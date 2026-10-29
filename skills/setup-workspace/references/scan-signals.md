# 扫描信号表（§1 扫描仓库阶段按需加载）

只读扫描，不改任何文件。扫描产出一份"探测画像"，供决策点复述与 config.sh 预填。所有信号都是"存在即命中"，找不到就留空留待询问。

## 1. 仓库类型判定

命中任一根级文件 → **monorepo**（逐包扫描）：

| 信号文件 | 包发现方式 |
|---|---|
| pnpm-workspace.yaml | 读 `packages:` 通配符展开 |
| package.json `"workspaces"` | 通配符展开 |
| turbo.json / nx.json / lerna.json / rush.json | 同上（读对应 workspace 定义） |
| go.work | `use` 指令逐行列出 |
| Cargo.toml `[workspace] members` | 通配符展开 |
| pom.xml `<modules>` | 逐 module 列出 |
| settings.gradle(.kts) | 逐 include 列出 |

均未命中 → **单仓库**（整仓一次扫描）。monorepo 时基础设施仍全库一份：`.sdlc/` 与 `docs/` 在根，产物编号全库唯一。

**第三形态：多仓工作区**（SKILL §0 判定进入多仓工作区模式时，上方根级信号表不适用于根，本节改扫根下第一层）：

- 第一层扫描信号：对根下每个第一层子目录（**跳过点目录**，如 `.zcode/`、`.claude/`）判定——`git -C <目录> rev-parse --show-toplevel` 成功且解析回该目录本身（物理路径一致，`pwd -P` 对齐，防符号链接类路径差异误判）→ 该目录为成员候选仓库。git 只向上探测仓库，深于第一层的嵌套仓库 / submodule 天然不入候选（不收编）。
- 第一层无任何候选 → 回落 SKILL §0 第三分支：拒绝、零写入。
- 有候选 → 根为工作区仓库根，候选逐个按上方信号表分类（单仓 / monorepo），分类仅作入册确认清单的展示信息，成员不落 config；非候选目录（普通目录与被跳过的点目录）零接触。

## 2. 语言与框架（按包扫 manifest）

| 信号文件 | 语言 | 框架线索（读文件内容） |
|---|---|---|
| package.json | Node/TS | dependencies 里的 next/vue/nuxt/express/nestjs/react… |
| pyproject.toml | Python | project.dependencies 里的 django/fastapi/flask… |
| requirements.txt / setup.py | Python | 同上（文本 grep） |
| go.mod | Go | module 名与 go 版本指令 |
| pom.xml / build.gradle(.kts) | Java/Kotlin | spring-boot、quarkus 等依赖坐标 |
| Cargo.toml | Rust | axum/actix/tokio 等依赖 |
| Gemfile | Ruby | rails/sinatra |
| Makefile | 任意 | 仅为检查命令线索，不算语言 |

## 3. 检查命令探测（config.sh 的 CHECK_* 预填）

- **单仓库**：读 package.json 的 `scripts`（有 `lint`/`typecheck`/`test` 才预填对应项）、Makefile 的目标、pyproject 的工具配置（ruff/mypy/pytest 存在才预填）、go.mod（预填 `go vet ./...` / `go test ./...`）、Cargo.toml（`cargo clippy` / `cargo test`）、pom.xml（`mvn verify`）。
- **monorepo**：优先聚合命令——turbo/nx 的 `lint`/`test` 任务、`pnpm -r lint`、`go work vet ./...`、根 Makefile 目标。找不到聚合命令：逐包记录各自命令，CHECK_* 留空，收尾报告列出待用户补聚合方式。
- **只预填，不发明**：仓库里没有的命令不编造；探测不到就留空。

## 4. 环境已述项（决策点 2 只问缺口）

| 维度 | 信号文件 | 结论 |
|---|---|---|
| 运行环境 | Dockerfile / docker-compose.yml / compose.yaml / .devcontainer/ | RUN_ENV=docker |
| 版本管理 | .nvmrc / .node-version | Node 版本已钉，版本管理器 nvm/fnm |
| | .python-version | pyenv/asdf |
| | mise.toml / .mise.toml | mise（RUN_PREFIX 候选 `mise exec --`） |
| | .tool-versions | asdf |
| | go.mod `go 1.x` 指令 | Go 版本已钉 |
| 包管理器 | package-lock.json → npm；pnpm-lock.yaml → pnpm；yarn.lock → yarn；bun.lockb → bun | PKG_MGR |
| | poetry.lock → poetry；uv.lock → uv；Pipfile → pipenv；requirements.txt → pip | PKG_MGR |
| | Cargo.lock → cargo；go.sum → go；pom.xml → maven；*.gradle → gradle | PKG_MGR |
| | package.json `packageManager` 字段 | 优先级最高，直接采用 |

三个维度各语言独立判定；已钉的直接复述，未钉的进决策点 2 询问。

## 5. 源码目录（CODE_DIRS 预填）

按实际布局探测，**不做 src/ 假定**：语言惯例目录存在才填——`src/`、`lib/`、`app/`、`cmd/ + internal/`（Go）、`packages/*/src`（monorepo 通配）、`Sources/`（Swift）、Java 的 `src/main/java`。多个目录空格分隔；纯文档/配置仓库可留空。

## 6. 已有接入物（升级模式判定）

- `.sdlc/check.sh` 存在 → **升级模式**：全程按所有权表执行，每步报告"覆盖/保留/补缺"。
- AGENTS.md：是否存在、是否已含 `<!-- sdlc:begin` 标记。
- GLOSSARY.md：是否存在、是否已含"流程术语与状态"章。
- CODING_STANDARDS.md：是否存在非空内容。
- docs/standards/：已有文件清单（导入时同名跳过）。
- .git/hooks/commit-msg、pre-push：是否存在且是否为本体系转发脚本（含 `sdlc-managed` 标记）。
