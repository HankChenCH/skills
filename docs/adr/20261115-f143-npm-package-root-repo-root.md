---
id: 20261115-f143
status: accepted
created: 2026-11-15
---
# 20261115-f143: @hankchen/infra 包根 = 仓库根（零拷贝资产分发）

spec 20261115-8975 实现票 20261115-975c 的架构决策蒸馏。npm 包 `@hankchen/infra` 要求「零构建直跑 + 打包清单含 skills/ 全量」，而 npm `files` 清单只收**包目录内**文件、skills/ 在仓库根——若包放子目录必须引入拷贝/构建步骤（双份资产，dual-copy-assets 纪律的持续负担），与本仓库「纯 markdown 套件仓库」现状冲突。本 ADR 记录取舍。

## 裁决

1. **package.json 置于仓库根**（包根 = 仓库根）：`files: ["bin", "src", "skills"]` 直接引用仓库现状目录，零拷贝零双份——`npm pack` 产物中的技能即 `skills/` 原文件，发布对账（`scripts/verify-pack.mjs`：包内技能清单 = 仓库 skills/ 清单，不等即退出码 1）结构性成立，非靠流程纪律维持。
2. **零构建直跑**：无编译步骤，`bin` 直指 `bin/infra.js`；Node ≥ 20.12.0（与依赖链 @clack/prompts 1.9.0 engines 对齐——评审 20261115-438f 阻断修正确立，声明须与依赖链事实一致）。〔20261115-f650 修订：本裁决的**发布面语义**收窄——node 拒剥 node_modules 下 .ts（结构性约束，实测），仓库内直跑 .ts 保持、打包清单 bin 经 prepack 显式换载指向编译产物，见 docs/adr/20261115-f650-ts-repo-zero-build-publish-precompile.md；本册裁决 1/3 不受影响、整册不被取代。〕
3. **发布纪律**：升版本号 → `npm pack` → `verify:pack` 对账 → `npm publish --access public` → annotated tag `v<版本>`（dev-release 衔接）；semver 判据 = patch 内容修订 / minor 新增技能 / major 移除更名技能或安装目标软链规则变更（票 20261115-975c Progress 定稿）。

## 后果

- 正面：仓库根即包根，资产单源；对账是机械校验而非人工核对；新增资产类型（映射表加行）自动随包分发。
- 代价：仓库根成为 npm 包根——package.json / package-lock.json 入库、node_modules 与 *.tgz 需 .gitignore 维护（票 20261115-975c 已落）；仓库语义从「纯技能套件」扩为「套件 + 自身安装器」。
- 边界：本裁决与包名解耦——包名随 scope 可发布性调整（2026-11-15 用户拍板 `@hankghchen/infra` → `@hankchen/infra`，fix 票 20261115-b1b8，教训「名字未被占用 ≠ scope 可发布」已折回 need D4/A2）。

## 附注（2026-11-16，票 20261116-c1d6）

裁决 3 的根包发布通道自 2026-11-16 起改为 tarball 三步 `pnpm pack → pnpm run verify:pack <tgz> → npm publish <tgz>`：目录直发（`npm publish` / `pnpm publish` 不带 tarball）被根包 prepublishOnly 常驻门拒绝（`scripts/publish-gate.ts`）——npm publish 在 pack 内 postpack 还原 package.json（bin 回仓内 `.ts`）之后、上传元数据之前重读磁盘 manifest 作元数据，元数据 bin 恒为 `.ts`，npx 执行即命中 ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING（证伪报告：registry 0.2.0 元数据 bin=.ts 而 tarball bin=.js）；tarball 形态发布不跑仓库脚本、元数据取包内清单，结构上永不触门。细目见 docs/maintainer-guide.md「发布流程」。本册裁决正文不受影响。
