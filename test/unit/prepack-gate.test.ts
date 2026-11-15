// prepack 出口把关（票 20261115-e692，d437 评审 20261115-4293 延后项）：emit 产物中残留相对
// .ts specifier 即拒绝发布。背景：prepack 的 specifier 改写只覆盖 from 与动态 import 两形，
// 裸副作用 import '…' 等未覆盖形态若残留，安装消费链在 node_modules 下命中 node 官方拒剥
// 行为（ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING，nodejs/node#57215，d437 Progress 取证）
// ——把关是改写之后的最后一道网，与既有 shebang 把关同法（逐条列出、exit 1）。
// 期望值独立来源 = 上述 node 官方行为与改写正则的形态清单；把关判定单点自带剥注释
// （emit 未设 removeComments、注释字样不得触发），复用 verify-bundle 的 stripComments。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectResidualTsSpecifiers, restoreStashInto } from '../../scripts/prepack.ts';

test('裸副作用 import 的相对 .ts specifier 被收集（改写正则未覆盖的形态）', () => {
  const residuals = collectResidualTsSpecifiers(`import './registry.ts';\nexport const x = 1;\n`);
  assert.deepEqual(residuals, ['./registry.ts'], `应逐条收集残留 specifier，实际：${JSON.stringify(residuals)}`);
});

test('from 形态的残留同样被收集（对改写后仍残留的兜底）', () => {
  const residuals = collectResidualTsSpecifiers(`export * from './util.ts';\n`);
  assert.deepEqual(residuals, ['./util.ts'], `应逐条收集残留 specifier，实际：${JSON.stringify(residuals)}`);
});

test('已改写 .js、非相对 specifier 与 URL 不误报', () => {
  const source = [
    `import { x } from './x.js';`,
    `const y = await import('./y.js');`,
    `import fs from 'node:fs';`,
    `import pkg from 'some-pkg/x.ts';`,
    `const home = 'https://example.com//a.ts';`,
    ``,
  ].join('\n');
  assert.deepEqual(
    collectResidualTsSpecifiers(source),
    [],
    `合法产物不应误报，实际：${JSON.stringify(collectResidualTsSpecifiers(source))}`,
  );
});

test('注释中的引号 .ts 路径不触发（剥注释后判定）', () => {
  const source = [
    `// 迁移自 './old.ts'（历史路径留档）`,
    `/* 模板示例：import './demo.ts' */`,
    `import './ok.js';`,
    ``,
  ].join('\n');
  assert.deepEqual(
    collectResidualTsSpecifiers(source),
    [],
    `注释字样不应触发把关，实际：${JSON.stringify(collectResidualTsSpecifiers(source))}`,
  );
});

// ---- 成员依赖目录 stash 还原（票 20261115-cf39 评审 20261115-* 标准轴阻断项回归钉）----
// 期望值独立来源：还原语义 = 暂存物（pack 时点原物）回原位、空 stash 目录移除；
// 冲突场景来自真实序列——上次 pack 中途失败残留 stash，随后 pnpm install 把成员
// node_modules 重建为非空目录，下次还原面对非空 dest。

test('stash 还原 round-trip：暂存条目按编码路径回原位并清空 stash 目录', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prepack-stash-roundtrip-'));
  const stashDir = path.join(root, '.prepack-stash');
  const memberRel = ['agents', 'dsh', 'plugins', 'demo', 'node_modules'];
  const dest = path.join(root, ...memberRel);
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, 'pkg'), 'pack 时原物');
  fs.mkdirSync(stashDir);
  fs.renameSync(dest, path.join(stashDir, memberRel.join('__')));

  const restored = restoreStashInto(stashDir, root);

  assert.equal(restored, 1, '应还原 1 条');
  assert.equal(fs.readFileSync(path.join(dest, 'pkg'), 'utf8'), 'pack 时原物', '暂存物应回原位');
  assert.equal(fs.existsSync(stashDir), false, '空 stash 目录应移除');
  fs.rmSync(root, { recursive: true, force: true });
});

test('pack 失败残留 stash 且 dest 已被重建为非空目录时，还原覆盖重建物而非 ENOTEMPTY 裸栈', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prepack-stash-conflict-'));
  const stashDir = path.join(root, '.prepack-stash');
  const memberRel = ['agents', 'dsh', 'plugins', 'demo', 'node_modules'];
  const stashed = path.join(stashDir, memberRel.join('__'));
  fs.mkdirSync(stashed, { recursive: true });
  fs.writeFileSync(path.join(stashed, 'pkg'), 'pack 时原物');
  const dest = path.join(root, ...memberRel);
  fs.mkdirSync(dest, { recursive: true }); // pnpm install 重建为非空目录
  fs.writeFileSync(path.join(dest, 'pkg'), 'install 重建物');

  const restored = restoreStashInto(stashDir, root); // 修复前：renameSync 对非空 dest 抛 ENOTEMPTY

  assert.equal(restored, 1, '应还原 1 条');
  assert.equal(
    fs.readFileSync(path.join(dest, 'pkg'), 'utf8'),
    'pack 时原物',
    '应以 pack 时原物覆盖重建物（重建物由同一 lockfile 决定、内容等价）',
  );
  assert.equal(fs.existsSync(stashDir), false, '空 stash 目录应移除');
  fs.rmSync(root, { recursive: true, force: true });
});
