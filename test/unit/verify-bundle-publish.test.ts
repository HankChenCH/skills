// bundle 校验器发布态口径（spec 20261115-ed9f 测试决策 ③「插件包双态校验」，票 20261115-cf39）：
// 发布态 = 插件包自有 registry tarball（dsh 经官方命令安装的消费者拿到的就是它）——
// FR-7 证伪定案（node 拒载 node_modules 下 .ts）后，发布 tarball 必须 .js 形态：
// main 指 .js、files 含编译产物与 cordis.patch.yml、无 .ts 源码、四要素语义齐备。
// 源码态口径（collectBundleDefects，verify-bundle.test.ts 承载）保持不变：仓库源码目录
// main 直指 .ts，语义映射到发布态 index.js（prepack 换载）。
// 期望值独立来源：FR-7 证伪报告（docs/research/dsh-ts-loading/fr7-dsh-ts-loading-falsification.md，
// ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING + 控制组唯一归因）与 spec 20261115-ed9f
// 预编译契约（「main 指 .js、files 白名单含编译产物与 cordis.patch.yml、不含 .ts 源码」）；
// fixture 在临时目录真实组包 + 真实 tar 打包，不 mock 文件系统。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  collectPublishedBundleDefects,
  collectTarballBundleDefects,
} from '../../scripts/verify-bundle.ts';

const PLUGIN_NAME = '@hankchen/dsh-demo';
const OFFICIAL_PATCH = `- insert:\n    - id: dsh-demo-load-log\n      name: '${PLUGIN_NAME}'\n`;

async function makeTempRoot(t: TestContext) {
  const root = await mkdtemp(path.join(tmpdir(), 'verify-bundle-publish-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

// 发布态合法插件目录（独立 fixture，不引用仓库源码）：main 指 .js、files 白名单两件、
// 模块为编译产物 .js 形态。参数 = 插件目录本体（不嵌子目录——目录态与 tarball 态共用）。
async function writePublishedPlugin(dir: string) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name: PLUGIN_NAME,
        version: '0.1.1',
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

// 发布态 tarball fixture（package/ 单包布局 = pnpm pack 产物形态）：staging 目录名即 package/
// → 真实 tar 打包。manifest 变异经 mutate 直改 staging 清单；多塞文件经 extraFiles 落盘
//（如 .ts 源残留）。
async function stagePublishTarball(root: string, {
  mutate = () => {},
  extraFiles = [],
}: {
  mutate?: (pkg: Record<string, unknown>) => void;
  extraFiles?: Array<{ name: string; content: string }>;
} = {}) {
  const staging = path.join(root, 'package');
  const dir = await writePublishedPlugin(staging);
  const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  mutate(pkg);
  await writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  for (const extra of extraFiles) {
    await mkdir(path.dirname(path.join(dir, extra.name)), { recursive: true });
    await writeFile(path.join(dir, extra.name), extra.content);
  }
  const tarball = path.join(root, 'plugin-0.1.1.tgz');
  const pack = spawnSync('tar', ['-czf', tarball, '-C', root, 'package'], { encoding: 'utf8' });
  assert.equal(pack.status, 0, `fixture tar 打包应成功：${pack.stderr}`);
  return tarball;
}

async function rewritePublishedPackageJson(dir: string, mutate: (pkg: Record<string, unknown>) => void) {
  const pkgPath = path.join(dir, 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  mutate(pkg);
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2));
}

test('发布态合法插件目录通过校验（缺陷清单为空）：.js 主入口 + 白名单两件 + 编译产物在位', async (t) => {
  const dir = await writePublishedPlugin(path.join(await makeTempRoot(t), 'dsh-demo'));
  assert.deepEqual(collectPublishedBundleDefects(dir), []);
});

test('发布态合法 tarball 通过校验（pnpm pack 产物布局 package/）', async (t) => {
  const tarball = await stagePublishTarball(await makeTempRoot(t));
  assert.deepEqual(collectTarballBundleDefects(tarball), []);
});

test('发布态 main 指 .ts 即拒绝（FR-7 证伪形态：宿主拒载 node_modules 下 .ts），缺陷点名 .js 要求', async (t) => {
  // round 1 .ts 直发形态的常驻拒绝断言：证伪态知识从集成测试 skip 升级为发布门
  const root = await makeTempRoot(t);
  const dir = await writePublishedPlugin(root);
  await writeFile(
    path.join(dir, 'index.ts'),
    `export const name: string = '${PLUGIN_NAME}';\nexport function apply(ctx: unknown): void {}\n`,
  );
  await rewritePublishedPackageJson(dir, (pkg) => {
    pkg.main = 'index.ts';
    pkg.files = ['index.ts', 'cordis.patch.yml'];
  });
  const defects = collectPublishedBundleDefects(dir);
  assert.ok(defects.length >= 1, `应拒绝发布态 .ts 主入口，实际：${JSON.stringify(defects)}`);
  assert.match(defects.join('\n'), /main/, '缺陷应点名 main');
  assert.match(defects.join('\n'), /\.js/, '缺陷应点名 .js 形态要求');
});

test('发布态 tarball 内残留 .ts 源码即拒绝（无 .ts 源码契约），缺陷逐条点名', async (t) => {
  const tarball = await stagePublishTarball(await makeTempRoot(t), {
    extraFiles: [{ name: 'index.ts', content: `export const name: string = '${PLUGIN_NAME}';\n` }],
  });
  const defects = collectTarballBundleDefects(tarball);
  assert.ok(defects.length >= 1, `应拒绝含 .ts 的发布态 tarball，实际：${JSON.stringify(defects)}`);
  assert.match(defects.join('\n'), /\.ts/, '缺陷应点名 .ts 残留');
});

test('发布态 files 缺编译产物 index.js 即拒绝，缺陷点名 files', async (t) => {
  const root = await makeTempRoot(t);
  const dir = await writePublishedPlugin(root);
  await rewritePublishedPackageJson(dir, (pkg) => {
    pkg.files = ['cordis.patch.yml'];
  });
  const defects = collectPublishedBundleDefects(dir);
  assert.ok(
    defects.some((defect) => /files/.test(defect) && /index\.js/.test(defect)),
    `缺陷应点名 files 缺编译产物，实际：${JSON.stringify(defects)}`,
  );
});

test('发布态缺 dsh.bundle.patch 声明即拒绝（要素两态均拒：发布态侧）', async (t) => {
  const root = await makeTempRoot(t);
  const dir = await writePublishedPlugin(root);
  await rewritePublishedPackageJson(dir, (pkg) => {
    delete pkg.dsh;
  });
  const defects = collectPublishedBundleDefects(dir);
  assert.ok(
    defects.some((defect) => /dsh\.bundle\.patch/.test(defect)),
    `缺陷应点名 dsh.bundle.patch 缺失，实际：${JSON.stringify(defects)}`,
  );
});

test('发布态缺 type: module 即拒绝（要素两态均拒：发布态侧）', async (t) => {
  const root = await makeTempRoot(t);
  const dir = await writePublishedPlugin(root);
  await rewritePublishedPackageJson(dir, (pkg) => {
    delete pkg.type;
  });
  const defects = collectPublishedBundleDefects(dir);
  assert.ok(
    defects.some((defect) => /type/.test(defect)),
    `缺陷应点名 type 缺失，实际：${JSON.stringify(defects)}`,
  );
});

test('发布态模块未导出 name 与 apply 即拒绝（要素两态均拒：发布态侧），缺陷逐一点名', async (t) => {
  const root = await makeTempRoot(t);
  const dir = await writePublishedPlugin(root);
  await writeFile(path.join(dir, 'index.js'), `export const version = '0.1.1';\n`);
  const defects = collectPublishedBundleDefects(dir);
  assert.ok(
    defects.some((defect) => /未导出 name/.test(defect)),
    `缺陷应点名未导出 name，实际：${JSON.stringify(defects)}`,
  );
  assert.ok(
    defects.some((defect) => /未导出 apply/.test(defect)),
    `缺陷应点名未导出 apply，实际：${JSON.stringify(defects)}`,
  );
});

test('发布态 tarball 缺 main 指向的编译产物文件即拒绝（白名单声明了却没随包）', async (t) => {
  const root = await makeTempRoot(t);
  const dir = await writePublishedPlugin(root);
  await rm(path.join(dir, 'index.js'));
  const defects = collectPublishedBundleDefects(dir);
  assert.ok(
    defects.some((defect) => /index\.js/.test(defect)),
    `缺陷应点名编译产物缺失，实际：${JSON.stringify(defects)}`,
  );
});

// ---------- 客户端载体三查（spec 20261118-0de6 FR-7 五查扩展，票 20261118-7504；发布态口径）----------
// 发布态 files 查 = 产物本体：exports 路径在 files 清单且 client.js 文件在包内。pack 对 files
// 清单里缺盘的文件只 warn 不报错——「清单声明了产物而 tarball 缺文件」是 pack 静默漏过的形态，
// 装出去官方启动即抛 missing bundle composition error（dsh-client-modules@0.2.2-rc.4 一手契约，
// 票 Progress 留痕）。

// 发布态合法客户端载体插件：四要素 + client 声明三件（dsh.client / exports["./client"] /
// files 含 client.js）+ client.js 产物在盘。variant 供破坏测试变异。
async function writePublishedClientPlugin(dir: string) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name: PLUGIN_NAME,
        version: '0.2.0',
        type: 'module',
        main: 'index.js',
        exports: { '.': './index.js', './client': './client.js' },
        files: ['index.js', 'cordis.patch.yml', 'client.js'],
        dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web', inject: [] } },
      },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(dir, 'index.js'),
    `export const name = '${PLUGIN_NAME}';\n\nexport function apply(ctx) {\n  ctx.logger.info(\`插件已加载：\${name}\`);\n}\n`,
  );
  // client.js 产物 = 官方 lazy-CJS factory 形态（dsh-client-modules@0.2.2-rc.4 lib/client.js
  // 官方 bundle 逐字外壳；发布态校验只查文件在盘与形态契约归属 carrier 测试，此处取真实形态）
  await writeFile(
    path.join(dir, 'client.js'),
    `window.__ModuleLoader__.load({id:"${PLUGIN_NAME}",factory:require=>{var module={exports:{}};var exports=module.exports;exports.apply=function apply(){};return module.exports}});\n`,
  );
  await writeFile(path.join(dir, 'cordis.patch.yml'), OFFICIAL_PATCH);
  return dir;
}

test('发布态客户端载体齐备的插件目录通过校验（缺陷清单为空）', async (t) => {
  const dir = await writePublishedClientPlugin(path.join(await makeTempRoot(t), 'dsh-mcp'));
  assert.deepEqual(collectPublishedBundleDefects(dir), []);
});

test('发布态声明 dsh.client 而 files 缺 client.js 即拒绝，缺陷点名 files 与产物路径', async (t) => {
  const root = await makeTempRoot(t);
  const dir = await writePublishedClientPlugin(root);
  await rewritePublishedPackageJson(dir, (pkg) => {
    (pkg as { files?: string[] }).files = ['index.js', 'cordis.patch.yml'];
  });
  const defects = collectPublishedBundleDefects(dir);
  assert.ok(
    defects.some((defect) => /files/.test(defect) && /client\.js/.test(defect)),
    `缺陷应点名 files 缺客户端产物，实际：${JSON.stringify(defects)}`,
  );
});

test('发布态 files 含 client.js 而产物文件缺盘即拒绝（pack 静默漏过形态），缺陷点名产物文件', async (t) => {
  const root = await makeTempRoot(t);
  const dir = await writePublishedClientPlugin(root);
  await rm(path.join(dir, 'client.js'));
  const defects = collectPublishedBundleDefects(dir);
  assert.ok(
    defects.some((defect) => /client\.js/.test(defect) && /读不到|缺 bundle/.test(defect)),
    `缺陷应点名客户端产物文件缺失，实际：${JSON.stringify(defects)}`,
  );
});

test('发布态 tarball 客户端载体齐备通过（真实 tar 布局）', async (t) => {
  const root = await makeTempRoot(t);
  const staging = path.join(root, 'package');
  const dir = await writePublishedClientPlugin(staging);
  const tarball = path.join(root, 'plugin-0.2.0.tgz');
  const pack = spawnSync('tar', ['-czf', tarball, '-C', root, 'package'], { encoding: 'utf8' });
  assert.equal(pack.status, 0, `fixture tar 打包应成功：${pack.stderr}`);
  assert.deepEqual(collectTarballBundleDefects(tarball), []);
});
