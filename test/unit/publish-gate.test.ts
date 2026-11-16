// publish-gate 的拒绝行为（seam 落点：prepublishOnly 门脚本的外部可观察行为——退出码与
// stderr 指路）。证伪报告（票 20261116-c1d6）：0.2.0 以 npm publish 目录直发后 npx 主流程
// 不可用——npm publish 在 pack 内跑 prepack（bin 换载进 tarball）与 postpack（package.json
// 还原 bin→仓内 .ts 形态），之后、上传元数据之前**重读磁盘 manifest 作为发布元数据**
// （npm/cli lib/commands/publish.js："The purpose of re-reading the manifest is in case it
// changed"；registry 实证：0.2.0 tarball 内清单 bin 指 .js 而元数据 bin 指 .ts），npx 按元
// 数据建 bin 链接，node_modules 下执行 .ts 命中 ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING。
// tarball 通道由 prepack 换载 + verify-pack bin 查把守；目录直发通道在生命周期上无修复钩子
//（prepublishOnly 在 pack 前、publish/postpublish 在上传后），只能封死——本门即封死点。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = path.join(packageRoot, 'scripts', 'publish-gate.ts');

test('目录直发即拒绝：退出码 1，缺陷信息引用证伪报告并给出 tarball 放行通道', () => {
  const result = spawnSync(process.execPath, [GATE], { encoding: 'utf8' });
  assert.equal(result.status, 1, `目录直发应被门拒绝退出 1，实际 ${result.status}：${result.stdout}`);
  assert.match(
    result.stderr,
    /ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING/,
    '缺陷信息应引用证伪报告（falsified-form-gate：fixture 钉住、信息引用证伪）',
  );
  assert.match(result.stderr, /npm publish <tgz>/, '拒绝信息应给出 tarball 放行通道');
});

test('prepublishOnly 接线在 package.json scripts：目录直发通道恒过门（文件即契约）', async () => {
  const pkg = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  assert.equal(
    pkg.scripts?.prepublishOnly,
    'node scripts/publish-gate.ts',
    'prepublishOnly 必须接 publish-gate——npm publish 目录直发即触发拒绝',
  );
});
