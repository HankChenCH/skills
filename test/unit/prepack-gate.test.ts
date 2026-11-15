// prepack 出口把关（票 20261115-e692，d437 评审 20261115-4293 延后项）：emit 产物中残留相对
// .ts specifier 即拒绝发布。背景：prepack 的 specifier 改写只覆盖 from 与动态 import 两形，
// 裸副作用 import '…' 等未覆盖形态若残留，安装消费链在 node_modules 下命中 node 官方拒剥
// 行为（ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING，nodejs/node#57215，d437 Progress 取证）
// ——把关是改写之后的最后一道网，与既有 shebang 把关同法（逐条列出、exit 1）。
// 期望值独立来源 = 上述 node 官方行为与改写正则的形态清单；把关判定单点自带剥注释
// （emit 未设 removeComments、注释字样不得触发），复用 verify-bundle 的 stripComments。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectResidualTsSpecifiers } from '../../scripts/prepack.ts';

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
