# Changelog

本项目的所有显著变更记录于此。
格式遵循 Keep a Changelog（https://keepachangelog.com），版本遵循语义化版本。

## [v0.1.1] - 2026-11-16

### Added

- agents/`<宿主>`/`<机制>`/ 两级扩展布局：包分发面随 `agents` 目录全量（files 白名单 `plugins` → `agents`），demo 插件迁位 `agents/dsh/plugins/dsh-demo/`，新宿主接入只加映射行（need 20261115-fc48 FR-1/FR-3，票 20261115-30f2）
- 发布面预编译管线：根包与插件包 prepack/postpack 钩子（tsc emit 同路径 .js 进 tarball + 打包清单换载/还原；spec 20261115-f650 D8 修订与 FR-7 回退，票 20261115-d437/cf39）
- CI 回归门 workflow（push/pull_request 触发：frozen 安装 → typecheck → 全量测试 → pnpm pack 后对账三查；spec 20261115-f650 FR-2，票 20261115-52d5）

### Changed

- 依赖管理 npm → pnpm workspace：双锁切换、`packageManager` 钉 12.15.0、CI frozen 安装（need 20261115-fc48 FR-4，票 20261115-d5f4）
- CLI 旗标解析 commander 15 承载，手写 cli-args 退役——对外文案/行为逐字节不变（FR-5 防线十六案例矩阵守护，FR-8，票 20261115-eed0）
- 发布对账扩展「包内禁 node_modules」查（RQ2 异常流 A）+ 对账键升级 `<宿主>/<插件目录>` 复合键（票 20261115-d5f4/30f2）

### Fixed

- 插件包 .ts 直发形态被宿主拒载（FR-7 端到端证伪：ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING）→ 发布 tarball 预编译 .js 形态，registry `@hankchen/dsh-demo@0.1.1` 真装真启动实证（票 20261115-cf39，run 43792529968）
