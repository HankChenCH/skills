#!/usr/bin/env node
// publish-gate：prepublishOnly 常驻拒绝门（票 20261116-c1d6，falsified-form-gate.md——被真实
// registry 证伪的发布形态固化为永不放行的门，不留 skip 立档）。
// 证伪报告：0.2.0 以 `npm publish`（目录直发）发出后 npx 主流程不可用。机理：npm publish 在
// pack 内先跑 prepack（bin 换载进 tarball）再跑 postpack（package.json 还原 bin→bin/infra.ts），
// 之后、上传元数据之前重读磁盘 manifest 作为发布元数据（npm/cli lib/commands/publish.js：
// "The purpose of re-reading the manifest is in case it changed"；registry 实证：0.2.0 tarball
// 内清单 bin 指 bin/infra.js 而元数据 bin 指 bin/infra.ts）——npx 按「元数据」建 bin 链接，在
// node_modules 下执行 .ts 命中 ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING。目录直发通道在
// 生命周期上无修复钩子（prepublishOnly 在 pack 前、publish/postpublish 在上传后，重读发生在
// postpack 还原之后），只能封死：本门即封死点。
// 唯一放行通道：pnpm pack → pnpm run verify:pack <tgz> → `npm publish <tgz>`——tarball 形态
// 发布不跑任何仓库生命周期脚本，发布元数据直接取自已过 verify-pack bin 查的包内清单。
// 逃生口留痕：`npm publish --ignore-scripts` 跳过本门（opt-in，发布检查单纪律兜底）。
process.exitCode = 1;
console.error(
  [
    '✗ 目录直发被拒绝（prepublishOnly 门，票 20261116-c1d6）',
    'npm publish 直发目录时，发布元数据在 postpack 还原后重读自磁盘，bin 恒为仓内 bin/infra.ts 形态——',
    'registry 元数据与 tarball 脱钩，npx 建出的 bin 链接在 node_modules 下执行 .ts，命中',
    'ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING（0.2.0 实证，npx 主流程不可用）。',
    '改走 tarball 通道：pnpm pack → pnpm run verify:pack <tgz> → npm publish <tgz>',
    '（tarball 发布不跑仓库脚本，发布元数据 = 已过 verify-pack 的包内清单）。',
  ].join('\n'),
);
