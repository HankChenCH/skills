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

- **官方兼容星座未定（2026-11-18 核验，票 20261118-2d72）**：官方 `@deepseek-ai/dsh-mcp-manager` 0.2.2-rc.2+ 的 peer 精确钉同 rc 兄弟套件，要求宿主 dsh ≥ `0.2.2-rc.2`；官方 npm `latest` 标签仍是 `0.2.2-rc.1`（rc.2+ 已发布于 `next` 标签，`latest` 未跟进）。本插件因此声明 `engines.dsh >=0.2.2-rc.2`——装进 latest（rc.1）宿主 profile 会被版本声明显式拒绝，属预期 fail-loud 而非缺陷。官方发布兼容星座后无需改插件即可直装。（2026-11-19 补充：manager 解析版与运行时对齐是另一独立风险面，见下条——范围钉版不保证跨宿主成立，钉版策略修订归 ADR 通道。）
- **manager 解析版必须与宿主运行时同 rc（2026-11-19 desktop 实证）**：本插件的 `@deepseek-ai/dsh-mcp-manager: ^0.2.2-rc.2` 依赖会被 profile 的 `minimumReleaseAge` 供应链门解析到**最老满足版**（desktop 实解为 rc.2）；宿主运行时若已前移（desktop 实跑 rc.5），boot 兼容门按 peer 精确钉同 rc 校验失败，**静默禁用 manager 行——连官方预挂行一起**（本插件依赖副本会劫持官方行的模块解析）。症状三联征：`/mcp` 不被命令面板识别、右栏面板报 "no active Remote method exports this endpoint"、插件管理器视角本体行 fiber `pending`——此时 devtools console 无错、`--dump-config` 合成树一切正常，金标准证据只在 boot 日志：`dsh: disabling profile plugin row "mcp-manager": … incompatible with dsh …`。恢复配方：profile 的 `pnpm-workspace.yaml` 加 `overrides` 把 manager 钉到运行时同版 → 重装 profile 依赖 → 插件管理器开关重载（`plugin_manager set_plugin` 或 GUI）。
- **合成树 ≠ 运行时状态，装成 ≠ 跑得起来**：`--dump-config` 里行 `disabled: false` 不代表运行时启用——插件管理器的持久开关与 boot 兼容门禁用都作用在合成层之上（兼容门禁用时开关报 `overridden`）；客户端 bundle 只随页面加载注入，Host 行激活经开关重载或重启 app 生效。
- **`desktop` profile 直装已放行，初始化器仍拒装**：官方 CLI 对 desktop 的插件管理（`dsh plugin --profile desktop add/remove`）2026-11-19 实证放行（boot/dump 类 profile 级操作仍归 Electron app 独占）；套件初始化器按 2026-11-15 查证结论（need 339e F4）仍在执行前拒装 desktop（`RESERVED_PROFILES`），源码修订走正式通道，暂可经官方命令绕过。
- **registry 访问受限**：插件安装链路比技能安装多三处 npm registry 访问（npx 拉官方 CLI `@deepseek-ai/dsh`、装本插件包、profile 依赖经 pnpm 安装）。内网、公司代理环境先配镜像或代理再安装：

  ```bash
  # 走公共镜像源
  npm config set registry https://registry.npmmirror.com
  # 或走 HTTP 代理
  npm config set proxy http://127.0.0.1:7890
  npm config set https-proxy http://127.0.0.1:7890
  ```

  恢复默认：`npm config delete registry`、`npm config delete proxy`、`npm config delete https-proxy`。
