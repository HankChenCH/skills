// bundle 清单校验器（seam = spec 20261115-495e 测试决策 ②）。
// 校验器契约（spec FR-2 / docs/plugin-assets.md §1.2–§1.3）：进插件包目录，出缺陷清单——
// dsh 官方 bundle 四要素齐备 → 空清单；人为移除任一要素 → 拒绝且缺陷点名缺的要素。
// 期望值来自 spec 文本（四要素定义），fixture 在临时目录真实读写，不 mock 文件系统。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { collectBundleDefects } from '../../scripts/verify-bundle.mjs';

const PLUGIN_NAME = '@hankchen/dsh-demo';

async function makeTempRoot(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'verify-bundle-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

// 按 spec FR-2 四要素手工构造的合格插件包（独立 fixture，不引用仓库插件源码）
async function writeValidPlugin(root) {
  const dir = path.join(root, 'dsh-demo');
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name: PLUGIN_NAME,
        version: '0.1.0',
        type: 'module',
        main: 'index.js',
        files: ['index.js', 'cordis.patch.yml'],
        dsh: { bundle: { patch: './cordis.patch.yml' } },
      },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(dir, 'index.js'),
    `export const name = '${PLUGIN_NAME}';\n\nexport function apply(ctx) {\n  ctx.logger.info(\`插件已加载：\${name}\`);\n}\n`,
  );
  await writeFile(
    path.join(dir, 'cordis.patch.yml'),
    `packages:\n  '${PLUGIN_NAME}':\n    - insert:\n        id: dsh-demo-load-log\n`,
  );
  return dir;
}

async function rewritePackageJson(dir, mutate) {
  const pkgPath = path.join(dir, 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  mutate(pkg);
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2));
}

test('dsh bundle 四要素齐备的插件包通过校验（缺陷清单为空）', async (t) => {
  const dir = await writeValidPlugin(await makeTempRoot(t));
  assert.deepEqual(collectBundleDefects(dir), []);
});

test('缺 dsh.bundle.patch 声明即拒绝，缺陷点名该声明', async (t) => {
  const dir = await writeValidPlugin(await makeTempRoot(t));
  await rewritePackageJson(dir, (pkg) => delete pkg.dsh);
  const defects = collectBundleDefects(dir);
  assert.equal(defects.length, 1, `应只报声明缺失一项，实际：${JSON.stringify(defects)}`);
  assert.match(defects[0], /dsh\.bundle\.patch/);
});

test('files 清单缺 cordis.patch.yml 即拒绝，缺陷点名缺的文件', async (t) => {
  const dir = await writeValidPlugin(await makeTempRoot(t));
  await rewritePackageJson(dir, (pkg) => {
    pkg.files = ['index.js'];
  });
  const defects = collectBundleDefects(dir);
  assert.equal(defects.length, 1, `应只报 files 缺文件一项，实际：${JSON.stringify(defects)}`);
  assert.match(defects[0], /files/);
  assert.match(defects[0], /cordis\.patch\.yml/);
});

test('patch 清单未以包名引用自己即拒绝，缺陷点名包名', async (t) => {
  const dir = await writeValidPlugin(await makeTempRoot(t));
  await writeFile(
    path.join(dir, 'cordis.patch.yml'),
    `packages:\n  '@someone/else':\n    - insert:\n        id: other\n`,
  );
  const defects = collectBundleDefects(dir);
  assert.equal(defects.length, 1, `应只报引用名不符一项，实际：${JSON.stringify(defects)}`);
  assert.match(defects[0], /引用自己/);
  assert.match(defects[0], new RegExp(PLUGIN_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('插件模块未导出 name 与 apply 即拒绝，缺陷逐一点名', async (t) => {
  const dir = await writeValidPlugin(await makeTempRoot(t));
  await writeFile(path.join(dir, 'index.js'), `export const version = '0.1.0';\n`);
  const defects = collectBundleDefects(dir);
  assert.equal(defects.length, 2, `应报 name 与 apply 两项，实际：${JSON.stringify(defects)}`);
  assert.ok(
    defects.some((d) => /未导出 name/.test(d)),
    `缺陷应点名未导出 name：${JSON.stringify(defects)}`,
  );
  assert.ok(
    defects.some((d) => /未导出 apply/.test(d)),
    `缺陷应点名未导出 apply：${JSON.stringify(defects)}`,
  );
});
