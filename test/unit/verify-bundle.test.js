// bundle 清单校验器（seam = spec 20261115-495e 测试决策 ②）。
// 校验器契约（spec FR-2 / docs/plugin-assets.md §1.2–§1.3）：进插件包目录，出缺陷清单——
// dsh 官方 bundle 四要素齐备且 patch 清单为官方 loader 可解析的 PatchOptions[] 形态 → 空清单；
// 人为移除任一要素或退回官方拒绝的形态 → 拒绝且缺陷点名缺的要素。
// 期望值独立来源：官方 dsh 0.2.2-rc.1 错误消息（「must be a top-level YAML array of
// loader patch entries」）与官方类型（@deepseek-ai/cordis-plugin-include PatchOptions、
// @deepseek-ai/cordis-plugin-loader EntryOptions：insert 元素须 id + name）；
// fixture 在临时目录真实读写，不 mock 文件系统。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { collectBundleDefects } from '../../scripts/verify-bundle.mjs';

const PLUGIN_NAME = '@hankchen/dsh-demo';

// 官方形态的 patch 清单（ticket 20261115-f158 取证）：顶层 YAML 数组，元素 = PatchOptions；
// insert 元素 = EntryOptions，须 id + name（name = 包名，宿主按模块说明符解析）。
const OFFICIAL_PATCH = `- insert:\n    - id: dsh-demo-load-log\n      name: '${PLUGIN_NAME}'\n`;

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
  await writeFile(path.join(dir, 'cordis.patch.yml'), OFFICIAL_PATCH);
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

test('缺 type: module 即拒绝，缺陷点名该要素', async (t) => {
  const dir = await writeValidPlugin(await makeTempRoot(t));
  await rewritePackageJson(dir, (pkg) => delete pkg.type);
  const defects = collectBundleDefects(dir);
  assert.equal(defects.length, 1, `应只报 type 一项，实际：${JSON.stringify(defects)}`);
  assert.match(defects[0], /type/);
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
    `- insert:\n    - id: other\n      name: '@someone/else'\n`,
  );
  const defects = collectBundleDefects(dir);
  assert.equal(defects.length, 1, `应只报引用名不符一项，实际：${JSON.stringify(defects)}`);
  assert.match(defects[0], /引用自己/);
  assert.match(defects[0], new RegExp(PLUGIN_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('patch 文件为顶层映射（官方 0.2.2-rc.1 拒绝的旧形态）即拒绝，缺陷点名顶层须为数组', async (t) => {
  const dir = await writeValidPlugin(await makeTempRoot(t));
  // 发布包 0.1.0 实际带出的坏形态：顶层 packages: 映射（官方报错全文见 ticket 20261115-f158）
  await writeFile(
    path.join(dir, 'cordis.patch.yml'),
    `packages:\n  '${PLUGIN_NAME}':\n    - insert:\n        id: dsh-demo-load-log\n`,
  );
  const defects = collectBundleDefects(dir);
  assert.equal(defects.length, 1, `应只报形态一项，实际：${JSON.stringify(defects)}`);
  assert.match(defects[0], /顶层/);
  assert.match(defects[0], /数组/);
  assert.match(defects[0], /packages/, '缺陷应点出实际看到的顶层键');
});

test('patch 文件为顶层数组但 insert 元素缺 name 即拒绝，缺陷点名缺 name', async (t) => {
  const dir = await writeValidPlugin(await makeTempRoot(t));
  await writeFile(path.join(dir, 'cordis.patch.yml'), `- insert:\n    - id: dsh-demo-load-log\n`);
  const defects = collectBundleDefects(dir);
  assert.equal(defects.length, 1, `应只报缺 name 一项，实际：${JSON.stringify(defects)}`);
  assert.match(defects[0], /insert/);
  assert.match(defects[0], /name/);
  assert.match(defects[0], /dsh-demo-load-log/, '缺陷应点名缺 name 的 insert 元素');
});

test('patch 文件为顶层数组但 insert 元素缺 id 即拒绝，缺陷点名缺 id', async (t) => {
  const dir = await writeValidPlugin(await makeTempRoot(t));
  await writeFile(
    path.join(dir, 'cordis.patch.yml'),
    `- insert:\n    - name: '${PLUGIN_NAME}'\n`,
  );
  const defects = collectBundleDefects(dir);
  assert.equal(defects.length, 1, `应只报缺 id 一项，实际：${JSON.stringify(defects)}`);
  assert.match(defects[0], /insert/);
  assert.match(defects[0], /\bid\b/);
});
