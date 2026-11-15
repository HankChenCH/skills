---
id: 20261115-f650-rq2
created: 2026-11-15
spec: 20261115-f650
ticket: 20261115-2b49
---
# RQ2 调研：pnpm workspace × npx 双包发布的兼容性与落地方案

## 调研问题与用途

round 2 pnpm 迁移票（need 20261115-fc48 FR-4）的直接输入。仓库形态由 ADR 20261115-f143 锁定：**包根 = 仓库根**（`@hankchen/infra` 的 `package.json` 置仓库根，`files: ["bin", "src", "skills", "plugins"]`），**双包发布**（CLI 包内嵌插件资产随包分发 + 插件包 `@hankchen/dsh-demo` 独立发布），**verify:pack 机械对账**（`scripts/verify-pack.mjs`：包内技能清单 = 仓库 `skills/` 清单、包内插件清单 = 仓库 `plugins/` 清单，不等即退出码 1）。本文回答四问：

1. pnpm publish 与 npm publish 的行为差异清单；
2. workspace 根打包形态：根包非 `private` 时能否 publish、成员目录是否被误打入、`workspace:*` 协议影响；
3. `package-lock.json` → `pnpm-lock.yaml` 迁移步骤与已知陷阱；
4. verify:pack 对账在 pnpm 打包产物上的适配点。

检索日期 2026-11-15；本机实测环境 pnpm 12.15.0 + node 24.22.1（macOS arm64），全部实验在 `/tmp` 下新建空目录完成，**仓库目录内未跑任何打包/安装实验**；发布路径实验一律指向死端口 registry（`http://127.0.0.1:1/`），绝无真实发布。实测结论标注**内联实测**并附命令与原始输出摘录（§内联实测记录）。

## 结论速览

**兼容性结论：pnpm workspace 形态与「包根 = 仓库根 + 双包发布 + verify:pack 对账」兼容，迁移无结构性障碍。**

| 维度 | 结论 | 证据 |
|---|---|---|
| 根包 publish | 可行。pnpm 对 workspace 根包无专属禁令，`private` 未声明时 publish 走完全部本地门禁直到网络步 | 内联实测 + [publish 文档](https://pnpm.io/cli/publish) |
| 成员目录卷入 | `pnpm pack` 严格按根 `files` 白名单收集：`plugins/` 在白名单内则成员源文件随包（verify:pack 查 1 的结构性前提保持），与 npm 逐字节同形态 | 内联实测（tar 清单对照） |
| 唯一新增风险 | 成员内嵌 `node_modules`（install 后生成）会被白名单卷入——npm/pnpm 同病，pnpm 下以符号链接为主（相对链接以链接条目入包、绝对链接被跳过、真实文件被卷入） | 内联实测 |
| `workspace:*` 协议 | pnpm pack/publish 自动改写为实际版本号；npm 会原样打进 tarball（坏包）。本仓根包无 `workspace:` 依赖，此差异暂不触达 | 内联实测 + [workspaces 文档](https://pnpm.io/workspaces) |
| lockfile 迁移 | `pnpm import` 单命令完成（workspace importers 覆盖根 + 成员）；本仓依赖树实测零版本漂移、零幽灵依赖暴露 | 内联实测 + [import 文档](https://pnpm.io/cli/import) |
| verify:pack | **零必需改动**：pnpm pack 产物 tar 根前缀仍为 `package/`，现行脚本实测全绿退出码 0；仅需命令面文案 npm → pnpm，另建议加一条「包内禁 `node_modules`」对账 | 内联实测 |
| 发布纪律 | ADR f143 升版本 → pack → verify:pack → publish 序列原样保留，仅 npm 换 pnpm；新增两道 pnpm 特有门：干净树 + 发布分支（`master`/`main`） | 内联实测 + [publish 文档](https://pnpm.io/cli/publish) |

---

## 问① pnpm publish 与 npm publish 行为差异清单

| # | 行为 | pnpm publish | npm publish | 来源 |
|---|---|---|---|---|
| 1 | `private: true` 拒绝 | 网络前显式拒绝，错误码 `ERR_PNPM_PRIVATE_PACKAGE`（「This package has been marked as private」） | 也拒绝（官方文档：「npm will refuse to publish it」），但实测检查次序在 auth 之后 | 内联实测 + [pnpm publish](https://pnpm.io/cli/publish) + [npm `package.json`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json) |
| 2 | git 检查 | **默认三道**：干净树 / 当前分支 = 发布分支（默认 `master`\|`main`，`publishBranch` 可覆盖）/ 与远端同步。实测错误码 `ERR_PNPM_GIT_UNCLEAN`、`ERR_PNPM_GIT_NOT_CORRECT_BRANCH`；`--no-git-checks` 跳过 | 无任何 git 检查 | 内联实测 + [pnpm publish](https://pnpm.io/cli/publish) |
| 3 | `workspace:` 协议 | pack/publish 时把 `workspace:*` / `workspace:~` / `workspace:^` 改写为对应实际版本（`workspace:*` → `1.5.0` 形态） | 原样保留 `workspace:*` 进 tarball——使用者装到无法解析的范围串，是坏包 | 内联实测 + [workspaces 文档](https://pnpm.io/workspaces) |
| 4 | workspace 内 `LICENSE` | workspace 内发包时自动把根 `LICENSE` 打进包（包无自带 `LICENSE` 时） | 无此行为 | [pnpm publish](https://pnpm.io/cli/publish) |
| 5 | 递归发布 | `-r publish` 发全部 workspace 包且**跳过版本已在 registry 的包**（`--force` 强发）；根包默认不在递归范围（`includeWorkspaceRoot` 默认 false） | 无 -r；`npm publish -w <dir>` 逐包，重发直接报 403 | [pnpm publish](https://pnpm.io/cli/publish) + [workspaces 文档](https://pnpm.io/workspaces) |
| 6 | provenance | 受信发布（trusted publishing）下**自动附加**，`--no-provenance` 关闭 | 需显式 `--provenance` | [pnpm publish](https://pnpm.io/cli/publish) |
| 7 | 发布后校验 | 12.7+ `--publish-wait-timeout`：等版本出现在 install 元数据并验证 tarball URL 返回 200 才算成功 | 发出即返回，无后续校验 | [pnpm publish](https://pnpm.io/cli/publish) |
| 8 | dry-run 的 private 检查 | `--dry-run` 短路全部检查（含 private 与 git），输出 `[WARN] Skip publishing ... (dry run)` | 同样短路 private（实测 dry-run 在 private:true 下照常打印成功样） | 内联实测 |
| 9 | --tag / --access / --otp / 生命周期脚本链 | 语义一致：`--tag` 默认 latest、`--access public|restricted`、`--otp`；脚本链同为 prepublishOnly → prepack → postpack → publish | 同 | [pnpm publish](https://pnpm.io/cli/publish) |
| 10 | 摘要产物 | `--report-summary` 写 `pnpm-publish-summary.json` | 无等价物 | [pnpm publish](https://pnpm.io/cli/publish) |

对本仓的直接影响：第 1 条要求根 `package.json` **不得声明 `private`**（ADR f143 现行形态无 private，兼容）；第 2 条与 dev-release「发布前干净树」纪律同向，只是从纪律变成机械门，属增益；第 3 条是 pnpm 独有的安全网（见问②）。

## 问② workspace 根打包形态

**根包非 `private` 时能否 publish：能。** pnpm 把 workspace 根包当普通包对待，pack/publish 均无根专属限制。[workspaces 文档](https://pnpm.io/workspaces)只约定「workspace 根必须有 `pnpm-workspace.yaml`、`packages` 列成员」，对根包自身的可发布性无任何约束；实测根包 `pnpm publish` 在通过 git 检查后一直走到 registry 请求步（内联实测，死端口）。唯一否决形态是显式 `private: true`（问①第 1 条）。

**成员目录是否被误打入：按 `files` 白名单精确收集，无误打也无误排。** 内联实测（fixture = 根包 `files` `["bin","src","skills","plugins"]` + `pnpm-workspace.yaml: [plugins/*]` + 成员 `plugins/dsh-demo`）：

- `pnpm pack` 产物逐条 = `npm pack` 产物逐条（`bin`/`src`/`skills` 全量 + `plugins/dsh-demo/{package.json,index.js,cordis.patch.yml}`），tar 根前缀同为 `package/`，tarball 命名同法（`rq2test-infra-0.1.0.tgz`，scope 去驼峰连字）；
- 根 `node_modules`、`pnpm-lock.yaml`、`pnpm-workspace.yaml` 一律不入包（实测计数 0）；
- 边界：**无 `files` 白名单时 `pnpm-workspace.yaml` 会入包**（实测）——本仓有白名单，不受影响，列此为异常流 A #10 陷阱。

成员内嵌 `node_modules` 是唯一实测到的卷入通道（npm/pnpm 同病，根级排除规则只看根目录）：成员有依赖时 `pnpm install` 在成员目录生成 `node_modules/`（内联实测：无依赖成员不生成；有依赖成员生成且内容为指向根 `node_modules/.pnpm/...` 的符号链接）。此时若成员目录在根 `files` 白名单内：**真实文件被卷入**（npm 与 pnpm 同实测复现）；**包内相对路径符号链接以链接条目入包**（装出来的包里是悬空链接）；**绝对路径符号链接被 pnpm 跳过**。缓解见异常流 A #3（成员零运行时依赖 + 问④ f 第三查）。

**`workspace:` 协议影响：**

- 现状（本仓）：根包依赖仅 `@clack/prompts`，无 `workspace:` 依赖——协议差异对现行发布**零影响**；双包之间不经依赖关系连接（插件包独立发布、CLI 包内嵌资产），round 2 无需引入 `workspace:` 依赖。
- 若未来根包依赖成员：`pnpm pack` 实测把 `"@rq2test/dsh-demo": "workspace:*"` 改写为 `"0.1.1"` 后再打 tarball（npm 对照组原样保留 `workspace:*`，打出坏包）——pnpm 形态下 `workspace:` 依赖可安全使用。
- 日常注意：workspace 内 `pnpm add` 保存依赖时按 `saveWorkspaceProtocol`（默认 `rolling`）可能写入 `workspace:` 前缀（[workspaces 文档](https://pnpm.io/workspaces)）——发布时会被改写、无功能风险，但 code review diff 时要知道这行是什么。

另有一条打包差异对本仓无感：workspace 内发包自动补根 `LICENSE`（问①第 4 条）——本仓根目录无 `LICENSE` 文件（2026-11-15 检视），不触发。

## 问③ `package-lock.json` → `pnpm-lock.yaml` 迁移步骤与已知陷阱

### 步骤（可复制，round 2 按此执行）

```bash
# 0. 前置：pnpm-workspace.yaml 先就位（官方要求 import 前声明 workspace）
cat > pnpm-workspace.yaml <<'EOF'
packages:
  - plugins/*
EOF

# 1. 从现行 package-lock.json 生成 pnpm-lock.yaml（workspace 场景一次覆盖根 + 成员 importers）
pnpm import

# 2. 核对版本漂移：把 pnpm-lock.yaml 里解析出的版本逐一与 package-lock.json 对照（异常流 A #5）

# 3. 重建安装布局（import 不生成 node_modules）
rm -rf node_modules && pnpm install

# 4. 同票内一次性切换，不留双锁：删 package-lock.json、提交 pnpm-lock.yaml
git rm package-lock.json && git add pnpm-lock.yaml pnpm-workspace.yaml

# 5. packageManager 字段固定版本（CI/贡献者自动对齐）
# package.json 增加: "packageManager": "pnpm@12.15.0"

# 6. 全量测试 + verify:pack 对账通过后合入
pnpm test && pnpm pack && pnpm run verify:pack -- hankchen-infra-<版本>.tgz
```

实测锚点：`pnpm import` 在单包场景无需 `pnpm-workspace.yaml` 即可运行；workspace 场景生成的 `pnpm-lock.yaml` `importers:` 同时覆盖 `.`（根）与 `plugins/dsh-demo`（成员）；pnpm 12.15.0 写出 `lockfileVersion: '9.0'`（均内联实测）。

### 已知陷阱

陷阱清单的单一事实源 = 下文「异常流 A 承接」表（12 条，触发条件 / 证据 / 缓解三列，编号唯一，不再另立编号体系）。本节只补四条迁移时点的实测细节，条目名后括注其在异常流 A 表中的编号：

- **幽灵依赖破裂（异常流 A #4）**：内联实测复现——fixture 装 `@clack/prompts` 后 `import("sisteransi")`，npm 扁平布局可解析、pnpm 严格布局即 `ERR_MODULE_NOT_FOUND`。**本仓暴露面为零**：grep 全仓 `src`/`bin`/`scripts`/`test`/`plugins` 的外部 import，唯一外部模块 `@clack/prompts` 即 `package.json` 声明依赖——全量测试直跑即防线，不开 `shamefully-hoist`，确有需要用 `public-hoist-pattern` 定点豁免（settings 放 `pnpm-workspace.yaml`，异常流 A #7）。
- **import 非一一转换（异常流 A #5）**：官方明示「not a one-to-one conversion」——源 lockfile 不满足 manifest 时按新解析走、版本可漂移（[import 文档](https://pnpm.io/cli/import)）。缓解即步骤 2 的 diff；本仓依赖树实测零漂移（npm 锁 `@clack/core` 1.6.0 / `@clack/prompts` 1.9.0 / `sisteransi` 2.0.0 / `fast-string-*` 与 pnpm-lock 解析结果逐一相同）。
- **lockfile 版本代差与 CI frozen（异常流 A #6）**：pnpm 12.15.0 写 `lockfileVersion` `'9.0'`；CI 内 `pnpm install` 自动 frozen-lockfile 且对 incompatible lockfile 直接失败（[CI 文档](https://pnpm.io/continuous-integration)：「pnpm also fails on incompatible lockfiles in CI」），`pnpm-lock.yaml` 漏提交也是红——这两条红是防漂移的正确行为，`packageManager` 固定版本即缓解。
- **双包管理器混用（异常流 A #12）**：`package-lock.json` 与 `pnpm-lock.yaml` 并存必漂移——迁移票内一次性切换（步骤 4），此后 CI 与文档统一 pnpm。

## 问④ verify:pack 对账在 pnpm 打包产物上的适配点

对账输入（读 `scripts/verify-pack.mjs`）：脚本只依赖三样——`tar -tzf` 读清单、`package/skills/<名>/SKILL.md` 与 `package/plugins/<名>/package.json` 两条前缀正则、`collectBundleDefects`（只读仓库目录的 bundle 校验，[`verify-bundle.mjs`](../../../scripts/verify-bundle.mjs)）。

**适配点逐项判定：**

- a. **tar 根前缀**：`pnpm pack` 产物根目录仍是 `package/`（内联实测 tar 清单）——两条正则零改动。
- b. **技能侧/插件侧清单对账**：pnpm pack 按白名单收集的产物与 npm pack 逐条相同（问②实测）——两查零改动。
- c. **bundle 校验**：只读仓库 `plugins/` 目录，与包管理器无关——零改动。
- d. **命令面文案**：脚本头部注释与用法的 `npm pack` / `npm run verify:pack` 表述随 round 2 文档改版换成 pnpm（非脚本逻辑）；`pnpm run verify:pack -- <tgz>` 传参与 npm 同法；tarball 文件名同法（问②实测）连示例都不用改。
- e. **实测背书**：现行脚本对 `pnpm pack` 产物原样运行全绿退出码 0（内联实测，见§内联实测记录 E1）。
- f. **建议增强（非必需，round 2 可选）**：加第三查「包内禁 `node_modules`」，封死异常流 A #3 陷阱的通道——在两查之间插入：

```js
// 查 1.5：workspace 形态下成员内嵌 node_modules 不得入包（RQ2 报告异常流 A #3）
const nestedNodeModules = [...list.stdout.split('\n')]
  .filter((entry) => entry.includes('node_modules/'));
if (nestedNodeModules.length > 0) {
  console.error('✗ 包内混入 node_modules 条目，拒绝发布：');
  for (const entry of nestedNodeModules) console.error(`  ${entry}`);
  process.exit(1);
}
```

---

## 结论：pnpm 落地方案四件（round 2 pnpm 迁移票的输入）

### 件 1：workspace 结构

```yaml
# pnpm-workspace.yaml（仓库根，新增）
packages:
  - plugins/*
```

```jsonc
// package.json（仓库根 = 包根，改动仅一处：追加 packageManager；不得加 private）
{
  "name": "@hankchen/infra",
  // ...现行字段全部保持（files/bin/scripts 不动）...
  "packageManager": "pnpm@12.15.0"
}
```

- 包根 = 仓库根不变（ADR f143），根包无 `private` 字段（问②实测前提）。
- 成员 = `plugins/dsh-demo`（round 1 后为 `agents/` 布局时改 patterns，结构原则不变：成员目录即完整 npm 包）。
- 不加 `shamefully-hoist`、不加 hoist 豁免（幽灵依赖，异常流 A #4：本仓暴露面为零）；其余 settings 取默认（`sharedWorkspaceLockfile` 默认 true——单根锁，正是双包仓想要的形态）。

### 件 2：发布命令序列（双包，替代 ADR f143 第 3 条的 npm 形态）

```bash
# 通用前提：干净树 + master/main 分支（pnpm publish 默认 git 检查，见问①#2）

# ── 先发插件包（registry 侧新版本先就位，顺序与现行纪律一致）──
pnpm --filter @hankchen/dsh-demo pack          # 产物落仓库根：hankchen-dsh-demo-<版本>.tgz（--pack-destination 默认取当前目录，内联实测）
pnpm --filter @hankchen/dsh-demo publish --access public
# 等价稳妥形态：(cd plugins/dsh-demo && pnpm pack && pnpm publish --access public)  # 此形态产物落 plugins/dsh-demo/ 下

# ── 后发 CLI 包（verify:pack 对账先行）──
pnpm pack                                       # 仓库根 → hankchen-infra-<版本>.tgz
pnpm run verify:pack -- hankchen-infra-<版本>.tgz
pnpm publish --access public                    # 根包 publish（非 private 实测可行）
git tag -a v<版本> -m "v<版本>" && git push origin v<版本>   # annotated tag 照旧
```

- `--access public` 必带（scope 包默认 restricted，与 npm 同理）。
- 双包间无 `workspace:` 依赖（见问②），`pnpm publish` 的协议改写能力是备用安全网而非依赖项。
- CI 自动化发布不在本轮（need 非目标）；pnpm 的 git 三检查与 `--report-summary` 可作为将来 CI 发布的机械门与留痕输入。

### 件 3：lockfile 迁移步骤

见问③步骤块（六步可复制）：`pnpm-workspace.yaml` 先行 → `pnpm import` → 版本漂移 diff → 重建 `node_modules` → 双锁切换同票完成 → `packageManager` 固定 + 全量测试与对账背书。

### 件 4：verify:pack 改造方案

- **零必需改动**（问④ a–e：正则前缀、两查、bundle 校验全部原样成立，实测全绿）。
- **可选增强**：问④ f 的「包内禁 `node_modules`」第三查，五行插入，封死成员 `node_modules` 卷入通道；round 2 迁移票可随票带上（或按 diff 最小化原则另立小票）。
- 命令面文案（脚本头注释 `npm pack` → `pnpm pack`）随 round 2 文档改版一并处理，非本调研范围。

---

## 异常流 A 承接：workspace / lockfile 已知陷阱清单与逐条缓解

need 20261115-fc48 异常流 A（「workspace 打包/publish/lockfile 迁移形态与预期不符 → RQ2 系统调研兜底」）的承接清单；每条 = 触发条件 + 证据 + 缓解：

| # | 陷阱 | 触发条件 | 证据 | 缓解 |
|---|---|---|---|---|
| 1 | 根包 publish 被拒 `ERR_PNPM_PRIVATE_PACKAGE` | 根 `package.json` 带 `private: true` | 内联实测（死端口） | 迁移票不引入 private 字段；方案件 1 已锁定 |
| 2 | publish 被拒 `ERR_PNPM_GIT_UNCLEAN` / `ERR_PNPM_GIT_NOT_CORRECT_BRANCH` | 脏树 / 非 `master`\|`main` 分支 | 内联实测（两条错误原文） | 与 dev-release 干净树纪律同向；确需绕过时 `--no-git-checks` 显式声明 |
| 3 | 成员内嵌 `node_modules` 被 pack 卷入 | 成员有运行时依赖 + `pnpm install` 后根包打包 | 内联实测（真实文件入包、相对链接悬空入包、绝对链接被跳过） | 成员保持零运行时依赖（现状成立）+ verify:pack 第三查（问④ f） |
| 4 | 幽灵依赖运行时爆 `ERR_MODULE_NOT_FOUND` | 源码 `import` 了未声明依赖 | 内联实测复现 + 本仓 grep 暴露面为零 | 迁移票跑全量测试即防线（49+ 例直跑）；不开 `shamefully-hoist` |
| 5 | import 版本漂移 | 源 lockfile 不满足 manifest | 官方文档明示 + 本仓实测零漂移 | 迁移步骤 2 的 diff 对照背书 |
| 6 | CI 红：incompatible lockfile / lockfile 未提交 | CI pnpm 版本 ≠ 本地 / `pnpm-lock.yaml` 漏提交 | [CI 文档](https://pnpm.io/continuous-integration) | `packageManager` 固定版本；frozen 红是防漂移的正确行为 |
| 7 | settings 写错位置（`package.json` `pnpm` 字段被忽略） | 从旧文档/旧仓拷 hoist 配置 | [package_json 文档](https://pnpm.io/package_json) | settings 一律进 `pnpm-workspace.yaml` |
| 8 | 依赖带构建脚本被静默拦截 | 新依赖带 `postinstall` | pnpm ≥10 默认行为 + 本仓现状无（实测） | 需要时 `onlyBuiltDependencies` 显式放行并留痕 |
| 9 | workspace 声明双写漂移 | 根 `workspaces` 字段与 `pnpm-workspace.yaml` 并存 | [workspaces 文档](https://pnpm.io/workspaces)（已存在则永不改写） | 迁移以 `pnpm-workspace.yaml` 为唯一声明源 |
| 10 | `pnpm-workspace.yaml` 混进发布包 | 根包无 `files` 白名单 | 内联实测 | 本仓有白名单；verify:pack 第三查兜底 |
| 11 | `workspace:` 前缀混进根 manifest 让 reviewer 困惑 | workspace 内 `pnpm add` 成员（`saveWorkspaceProtocol` 默认 rolling） | [workspaces 文档](https://pnpm.io/workspaces) + 问② | 发布时自动改写无功能风险；code review 时按已知形态放行 |
| 12 | 双包管理器混用 | 迁移后 `package-lock.json` 与 `pnpm-lock.yaml` 并存 | 设计约束：两把锁互不感知，各自解析必漂移 | 迁移票内一次性切换（问③步骤 4），此后 CI 与文档统一 pnpm |

---

## 内联实测记录

环境：pnpm 12.15.0（`pnpm --version`，fnm 安装）、node 24.22.1、macOS arm64。四个 fixture 全在 `/tmp`（`pnpm-rq2-exp1` 根打包 / `exp1b` npm 对照 / `exp3` 单包迁移 / `exp4` workspace 迁移），fixture 复刻本仓形态（根 `files` `["bin","src","skills","plugins"]` + 成员包带 bundle 四要素）。仓库目录内零实验。

### E1 根打包 + verify:pack

```text
$ pnpm pack
package: @rq2test/infra@0.1.0
Tarball Contents
bin/infra.js
package.json
plugins/dsh-demo/cordis.patch.yml
plugins/dsh-demo/index.js
plugins/dsh-demo/package.json
skills/alpha/SKILL.md
skills/beta/SKILL.md
src/lib.js
Tarball Details
rq2test-infra-0.1.0.tgz

$ tar -tzf rq2test-infra-0.1.0.tgz | sort
package/bin/infra.js
package/package.json
package/plugins/dsh-demo/cordis.patch.yml
package/plugins/dsh-demo/index.js
package/plugins/dsh-demo/package.json
package/skills/alpha/SKILL.md
package/skills/beta/SKILL.md
package/src/lib.js

$ node scripts/verify-pack.mjs rq2test-infra-0.1.0.tgz
✓ 对账通过：包内技能清单 = 仓库 skills/ 清单（2 项）
✓ 对账通过：包内插件清单 = 仓库 plugins/ 清单，且每插件过 bundle 校验（1 项）
（退出码 0）

$ npm pack 对照：Tarball Contents 逐条与上表相同；node_modules 注入后两边各卷入 1 条
package/plugins/dsh-demo/node_modules/fake/x.js
```

### E2 publish 门禁（死端口 registry http://127.0.0.1:1/，零真实发布）

```text
$ node -e '...p.private=true...' && pnpm publish --registry http://127.0.0.1:1/ --no-git-checks
📦 @rq2test/infra@0.1.0 → http://127.0.0.1:1/
Error: ERR_PNPM_PRIVATE_PACKAGE
  × This package has been marked as private
  help: Remove the 'private' field from the package.json to publish it.

$ （去 private、脏树）pnpm publish
Error: ERR_PNPM_GIT_UNCLEAN
  × Unclean working tree. Commit or stash changes first.

$ （干净树 + feature 分支）pnpm publish
Error: ERR_PNPM_GIT_NOT_CORRECT_BRANCH
  × Branch is not on 'master|main'.

$ （去 private、干净树、默认分支）pnpm publish --registry http://127.0.0.1:1/
📦 @rq2test/infra@0.1.0 → http://127.0.0.1:1/
Error: × the publish request failed: error sending request for url
  （——本地门禁全部通过，到达网络步）

$ private:true + npm publish --registry http://127.0.0.1:1/
npm error code ENEEDAUTH …（npm 的 auth 检查先于 private，最终同样拒绝）
```

### E2d workspace: 协议改写

```text
$ 根 dependencies 加 "@rq2test/dsh-demo": "workspace:*" 后：
$ pnpm pack && tar -xzOf *.tgz package/package.json
dependencies: {"@clack/prompts":"^1.9.0","@rq2test/dsh-demo":"0.1.1"}     ← pnpm 已改写
$ npm pack 对照（同一 fixture）
dependencies: {"@clack/prompts":"^1.9.0","@rq2test/dsh-demo":"workspace:*"} ← npm 原样保留
```

### E3 单包 lockfile 迁移 + 幽灵依赖

```text
$ npm install → package-lock.json lockfileVersion: 3；node_modules 顶层含传递依赖
  @clack fast-string-truncated-width fast-string-width fast-wrap-ansi sisteransi
$ pnpm import
Done in 17ms using pnpm v12.15.0
$ head -3 pnpm-lock.yaml
lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
$ rm -rf node_modules && pnpm install → node_modules 顶层仅 @clack
$ node -e 'import("sisteransi")…' → pnpm 下失败: ERR_MODULE_NOT_FOUND
$ node -e 'import("@clack/prompts")…' → @clack/prompts 直接依赖 OK
$ 版本对照：npm 锁 @clack/core 1.6.0 / prompts 1.9.0 / sisteransi 2.0.0 / fast-* 3.0.3|3.0.2|0.2.2
  = pnpm-lock 解析结果逐一同（零漂移）
```

### E4 workspace 迁移 + 成员 `node_modules` 形态

```text
$ （根 + plugins/dsh-demo[deps: sisteransi] 双包 fixture）npm install → lockfileVersion 3
$ pnpm import → pnpm-lock.yaml importers: 覆盖 "." 与 "plugins/dsh-demo"
$ rm -rf node_modules && pnpm install
$ ls plugins/dsh-demo/node_modules → sisteransi（符号链接 → ../../../node_modules/.pnpm/...）
$ 无依赖成员（E1 fixture）install 后无 node_modules 生成
$ 无 files 白名单时 pnpm pack 产物含：package/plugins/dsh-demo/node_modules/sisteransi（链接条目）
  与 package/pnpm-workspace.yaml；本仓有白名单，不触达
$ 成员白名单内符号链接行为：相对链接入包（lrwxrwxrwx 条目）、绝对路径链接被跳过、真实文件被卷入
```

## 引文（一手来源，检索日期均为 2026-11-15）

- pnpm publish 命令文档（-r 递归、`LICENSE` 补包、git 检查、publishBranch、provenance、publish-wait-timeout、生命周期脚本链、64 MiB 上限）：https://pnpm.io/cli/publish
- pnpm pack 命令文档（`files` 白名单、--pack-destination/--out、--recursive、--json/SRI、gzip level）：https://pnpm.io/cli/pack
- pnpm Workspaces（`pnpm-workspace.yaml`、npm workspaces 自动生成、linkWorkspacePackages、saveWorkspaceProtocol、includeWorkspaceRoot、`workspace:` 协议与发布改写规则）：https://pnpm.io/workspaces
- pnpm import 命令文档（源 lockfile 顺序、非一一转换声明、workspace 先声明要求）：https://pnpm.io/cli/import
- pnpm package_json（packageManager、publishConfig.*、不再读 pnpm 字段的声明）：https://pnpm.io/package_json
- pnpm CI 指南（CI 自动 frozen-lockfile、incompatible lockfile 失败、--no-frozen-lockfile）：https://pnpm.io/continuous-integration
- npm `package.json` 文档（private 字段拒绝发布的官方原文）：https://docs.npmjs.com/cli/v11/configuring-npm/package-json
- pnpm limitations（npm 扁平布局 vs pnpm 符号链接布局语义不可全等——幽灵依赖陷阱的结构性根因）：https://pnpm.io/limitations
- 仓库侧对账输入：`scripts/verify-pack.mjs`、`scripts/verify-bundle.mjs`（本仓 worktree 2026-11-15 版本）；ADR 20261115-f143（包根 = 仓库根 + 发布纪律 + semver 判据）
