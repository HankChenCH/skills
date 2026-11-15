// demo 插件包（plugins/dsh-demo/）的外部可观察面，期望值逐条来自 spec 20261115-495e
// 实现决策与 docs/plugin-assets.md §1.2–§1.3、need 20261115-339e F1/F3/F4、
// fix 票 20261115-f158（patch 清单官方顶层数组形态取证 + 版本 0.1.1）：
// 包形态四要素、engines 声明、patch 清单官方形态且以包名引用自己、模块真实可加载并打加载日志。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PLUGIN_NAME = '@hankchen/dsh-demo';
const PLUGIN_DIR = new URL('../../plugins/dsh-demo/', import.meta.url);

async function readPluginFile(name: string) {
  return readFile(new URL(name, PLUGIN_DIR), 'utf8');
}

async function readPluginJson(name: string) {
  return JSON.parse(await readPluginFile(name));
}

test('demo 包名与版本：@hankchen/dsh-demo 0.1.1（0.1.0 已发布且含坏清单，npm 同版本不可重发）', async () => {
  const pkg = await readPluginJson('package.json');
  assert.equal(pkg.name, PLUGIN_NAME);
  assert.equal(pkg.version, '0.1.1');
});

test('demo 包四要素齐备：type module、main 直指 .ts 模块、files 含 .ts 与清单、dsh.bundle.patch', async () => {
  const pkg = await readPluginJson('package.json');
  assert.equal(pkg.type, 'module', '插件模块按 ESM 加载（plugin-assets §1.2）');
  // .ts 形态契约（spec 20261115-f650 demo 插件 .ts 化，票 20261115-e692）：main 直指 .ts 模块
  assert.equal(pkg.main, 'index.ts', 'main 直指 .ts 插件模块（plugin-assets §1.2 的 .ts 形态）');
  assert.ok(
    pkg.files.includes('cordis.patch.yml') && pkg.files.includes('index.ts'),
    `files 须含 cordis.patch.yml 与 .ts 模块文件，实际：${JSON.stringify(pkg.files)}`,
  );
  assert.deepEqual(pkg.dsh, { bundle: { patch: './cordis.patch.yml' } }, 'dsh 识别插件的凭据（plugin-assets §1.2）');
});

test('demo 包发布形态零构建：无 build/prepack/prepare 脚本（spec 20261115-f650 .ts 化契约）', async () => {
  const pkg = await readPluginJson('package.json');
  const buildScripts = Object.keys(pkg.scripts ?? {}).filter((key) =>
    /^(build|prepack|prepare|postpack)$/.test(key),
  );
  assert.deepEqual(
    buildScripts,
    [],
    `插件包须保持零构建形态（打包即源码直发），实际带编译类脚本：${JSON.stringify(buildScripts)}`,
  );
});

test('demo 包 engines：node 基线 >=24.9.0，dsh 兼容范围覆盖官方当前运行时 0.2.2-rc.1', async () => {
  const pkg = await readPluginJson('package.json');
  assert.equal(pkg.engines.node, '>=24.9.0', '与官方 dsh 的 node 前置对齐（need F4）');
  // 官方当前运行时版本（need F4 查证 + 2026-11-15 npm view 复核：0.2.2-rc.1）须落在
  // engines.dsh 声明的兼容范围内（plugin-assets §1.2：发布前对官方当前版本核验）。
  const match = pkg.engines.dsh?.match(/^>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, `engines.dsh 须是 ">=主.次.补" 形态的范围声明，实际：${pkg.engines.dsh}`);
  const floor = match.slice(1, 4).map(Number);
  const OFFICIAL_DSH_RUNTIME = [0, 2, 2];
  const atLeast = (version: number[], base: number[]) =>
    version[0] !== base[0]
      ? version[0] > base[0]
      : version[1] !== base[1]
        ? version[1] > base[1]
        : version[2] >= base[2];
  assert.ok(
    atLeast(OFFICIAL_DSH_RUNTIME, floor),
    `engines.dsh 兼容下限 ${pkg.engines.dsh} 高于官方当前运行时 0.2.2-rc.1，官方运行时不在兼容范围内`,
  );
});

test('cordis.patch.yml 为官方顶层数组形态且以包名引用自己（ticket 20261115-f158 取证）', async () => {
  // 官方 loader 只加载顶层数组（dsh 0.2.2-rc.1：must be a top-level YAML array of
  // loader patch entries）；insert 元素 = EntryOptions，须 id + name，name = 包名。
  const patch = await readPluginFile('cordis.patch.yml');
  assert.match(patch, /^- insert:/m, 'patch 清单顶层须为 YAML 数组（- insert: 开头）');
  assert.match(patch, /id:\s*dsh-demo-load-log\b/, 'insert 元素 id 沿用 design 定稿');
  assert.match(
    patch,
    /name:\s*['"]@hankchen\/dsh-demo['"]\s*$/,
    'insert 元素 name = 包名（宿主按模块说明符解析）',
  );
});

test('插件模块真实可加载：导出 name=包名 与 apply(ctx)，apply 打含插件名的加载日志', async () => {
  const mod = await import(new URL('index.ts', PLUGIN_DIR).href);
  assert.equal(mod.name, PLUGIN_NAME, 'name 取包名字符串（plugin-assets §1.3）');
  assert.equal(typeof mod.apply, 'function');
  const logs: unknown[] = [];
  mod.apply({ logger: { info: (message: unknown) => logs.push(message) } });
  assert.equal(logs.length, 1, 'apply 应恰好打一条加载日志');
  assert.match(logs[0] as string, new RegExp(PLUGIN_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '日志须含插件名');
});

test('demo 包通过 bundle 校验器（四要素齐备）', async () => {
  const { collectBundleDefects } = await import('../../scripts/verify-bundle.ts');
  const { fileURLToPath } = await import('node:url');
  assert.deepEqual(collectBundleDefects(fileURLToPath(PLUGIN_DIR)), []);
});
