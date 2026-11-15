---
id: 20261115-f650
status: accepted
created: 2026-11-15
---
# 20261115-f650: TypeScript 双形态——仓库内零构建直跑 + 发布面 prepack 预编译

spec 20261115-f650 实现票 20261115-d437 的架构决策蒸馏（运行中 spec 修订，无人值守自主处置留痕于 spec 备注与票 Progress）。拍板 D8 原文「源码 .ts 直发 + bin 直指 .ts 入口」的发布面形态被实现期前提核实证伪；本 ADR 记录取舍与边界。

## 事实（证伪依据）

node 对 **node_modules 目录祖先下的 .ts 文件一律拒绝剥类型**（`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`，`node:internal/modules/typescript` 的 `stripTypeScriptModuleTypes` 按物理路径判定）——官方有意设计（阻止包作者直发 .ts，nodejs/node#57215），无旗标逃生，`--experimental-strip-types` / `--experimental-transform-types` 同拒。npm install 与 npx 的全部消费路径都在 node_modules 内，故「发布面直发 .ts」结构性不可行。仓内路径不受影响：node ≥24.9 直跑 .ts、node:test 原生支持均已实测。FR-7 实测进一步证实该约束对 dsh 宿主加载链同样成立（拒载键在路径不在格式；`link:` 形态同文件可载）。

## 裁决

1. **仓库内零构建直跑保持**：src/ bin/ scripts/ test/ 源码全 .ts，开发与测试直跑（node 默认剥类型）；语法 erasable-only（无 enum/namespace/参数属性）；类型检查 `tsc --noEmit` 独立于运行（CI 步骤 + 本地脚本）。开发/测试体验与 D8 原意一致。
2. **发布面预编译**：`npm pack`/publish 前 tsc emit（`scripts/prepack.ts` 承载），tarball 含编译 .js + .ts 源码（导航可读），bin 直指编译产物。机制 = **prepack 显式换载**（备份 package.json → 改写 bin → postpack 还原）——`publishConfig.bin` 不作用于 `npm pack` 打包清单（实测），故不能走声明式配置；幂等守卫覆盖 pack 中途失败与解包重打包场景；出口把关（残留相对 .ts specifier 扫描 exit 1）防裸副作用导入漏网。
3. **对账不变**：`verify:pack` 的 skills/plugins 清单核对在预编译产物上照常成立（路径未变）；编译产物入 .gitignore 兜底（`src/**/*.js` 等递归形态，与脚本递归 walk 对齐）。

## 对 20261115-f143 的关系

f143「包根 = 仓库根」（裁决 1）与发布对账纪律（裁决 3）继续生效；其裁决 2「零构建直跑：bin 直指 bin/infra.js」的**发布面语义**由本 ADR 收窄为「仓库内直跑 .ts + 打包清单 bin 指向 prepack 编译产物」。f143 整册不被取代（已在其裁决 2 加注指向本册）。

## 后果

- 正面：仓库开发/测试零构建体验完整保留；发布面获得编译产物消费兼容性（npm install / npx / dsh 宿主加载全链真实可跑——验收 20261115-1457 实证）；插件包回退预案（FR-7 证伪后启用）与本机制同构，round 2 可复用。
- 代价：发布流程引入编译步骤（prepack/postpack 两个脚本 + devDeps typescript）；lockfile 的 bin 字段会被换载态回写污染（验收残余风险 1——npm install 自动同步不碍使用，round 2 pnpm 迁移票核对同构）；发布中断残留依赖 postpack 还原 + gitignore 兜底。
- 边界：本裁决只覆盖主 CLI；demo 插件包当前仍零构建形态（main 直指 index.ts），其回退落位（发布前 tsc 预编译）是 round 2 决策项（FR-7 证伪报告 docs/research/dsh-ts-loading/fr7-dsh-ts-loading-falsification.md 为决策输入）。
