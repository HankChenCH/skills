# @hankchen/dsh-mcp

dsh MCP 对话内管理插件：装进 dsh profile 即获得对话内增删启停 MCP server 的能力，全程不手写 Cordis patch YAML。

## 安装

方式一（推荐）：套件初始化器勾选安装——

```bash
npx @hankchen/infra
```

选「插件」类型、勾选 `@hankchen/dsh-mcp`、选定目标 dsh profile；安装器转发官方安装命令，完成后对账两处落点（profile 的 package.json 依赖行 + `dsh.profile.bundles` 行）并记入 `.infra-lock.json`。

方式二：官方命令直装——

```bash
dsh plugin --profile <名> add @hankchen/dsh-mcp
# dsh 不在 PATH 时经官方 npm 包转发同一条命令：
npx @deepseek-ai/dsh plugin --profile <名> add @hankchen/dsh-mcp
```

## 启用

装进 profile 即启用，无额外开关：包自带 `cordis.patch.yml` 随 profile 加载，插入两行——官方 MCP 管理器 `@deepseek-ai/dsh-mcp-manager`（官方只在 Web/Desktop profile 自带该管理器，headless/sdk/acp 自定义 profile 由本插件自带挂载行补齐）与本插件模块。宿主加载本插件后即具备对话内管理入口（列含状态/添加/移除/启停）。

## 凭据：用 `${credential:…}` 模板，不用明文

server 条目的 `env` / `headers` / `command` / `args` / `cwd` / `url` 值支持 `${credential:REF}` 模板串引用凭据。添加 server 时优先用模板而非明文：模板串原样进清单，凭据展开与日志脱敏（失败诊断与工具输出中替换为 `[redacted]`）由官方运行时承担，密钥不落配置文件；明文密钥会直接写进 profile 的 `cordis.patch.yml`，能免则免。

## 已知边界

- **官方兼容星座未定（2026-11-18 核验，票 20261118-2d72）**：官方 `@deepseek-ai/dsh-mcp-manager` 0.2.2-rc.2+ 的 peer 精确钉同 rc 兄弟套件，要求宿主 dsh ≥ `0.2.2-rc.2`；官方 npm `latest` 标签仍是 `0.2.2-rc.1`（rc.2+ 在 `next` 下未升级）。本插件因此声明 `engines.dsh >=0.2.2-rc.2`——装进 latest（rc.1）宿主 profile 会被版本声明显式拒绝，属预期 fail-loud 而非缺陷；官方发布兼容星座后无需改插件即可直装。
- **`desktop` profile 装不了**：`desktop` 是官方保留 profile 名，官方 CLI 拒绝对其做插件管理；套件安装器同样在执行官方命令前拒装并说明。
- **registry 访问受限**：插件安装链路比技能安装多三处 npm registry 访问（npx 拉官方 CLI `@deepseek-ai/dsh`、装本插件包、profile 依赖经 pnpm 安装）。内网、公司代理环境先配镜像或代理再安装：

  ```bash
  # 走公共镜像源
  npm config set registry https://registry.npmmirror.com
  # 或走 HTTP 代理
  npm config set proxy http://127.0.0.1:7890
  npm config set https-proxy http://127.0.0.1:7890
  ```

  恢复默认：`npm config delete registry`、`npm config delete proxy`、`npm config delete https-proxy`。
