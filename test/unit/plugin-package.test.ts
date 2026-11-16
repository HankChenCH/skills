// demo 插件包（agents/dsh/plugins/dsh-demo/）的外部可观察面，期望值逐条来自 spec 20261115-495e
// 实现决策与 docs/plugin-assets.md §1.2–§1.3、need 20261115-339e F1/F3/F4、
// fix 票 20261115-f158（patch 清单官方顶层数组形态取证 + 版本 0.1.1）、
// spec 20261115-ed9f 插件预编译契约（FR-7 证伪回退，round 2 票 20261115-cf39）：
// 包形态四要素、engines 声明、patch 清单官方形态且以包名引用自己、模块真实可加载并打加载日志、
// 发布面预编译钩子（源码态 .ts 保持，打包面 prepack 换载 .js——spec 20261115-f650 的
// .ts 零构建直发契约经 FR-7 端到端实测证伪后退役）。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PLUGIN_NAME = '@hankchen/dsh-demo';
const PLUGIN_DIR = new URL('../../agents/dsh/plugins/dsh-demo/', import.meta.url);

async function readPluginFile(name: string) {
  return readFile(new URL(name, PLUGIN_DIR), 'utf8');
}

async function readPluginJson(name: string) {
  return JSON.parse(await readPluginFile(name));
}

test('demo 包名与版本：registry 可发布形态——@hankchen/dsh-demo、合法 semver 且高于已烧版 0.1.0', async () => {
  const pkg = await readPluginJson('package.json');
  assert.equal(pkg.name, PLUGIN_NAME);
  // 版本断言降耦合（票 20261116-94c1）：钉死 0.1.1 使每次升版发布必红——改断言合法
  // semver 形 + 耐久约束（高于已烧版 0.1.0，npm 同版本不可重发）；当前值一致性由
  // 既有 e2e 落盘版本断言承载（票 20261115-dafb）
  assert.match(
    String(pkg.version),
    /^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/,
    `版本须为合法 semver（prerelease 为点分标识符，npm publish 拒收下划线等非法字符），实际：${pkg.version}`,
  );
  // 序数比较：两侧同一纯编码（major*10^6+minor*10^3+patch，patch 段按本仓实践 <1000），
  // 先剥 prerelease 后缀——semver 下 prerelease 高于同版 release，只比 x.y.z；
  // 目标 = 已烧版字面量 '0.1.0'
  const semverCode = (v: string): number => {
    const release = v.split('-')[0];
    const [major, minor, patch] = release.split('.').map(Number);
    return major * 1_000_000 + minor * 1_000 + patch;
  };
  assert.ok(
    semverCode(String(pkg.version)) > semverCode('0.1.0'),
    `版本须高于已烧版 0.1.0（npm 同版本不可重发），实际：${pkg.version}`,
  );
});

test('demo 包四要素齐备（源码态）：type module、main 直指 .ts 模块、files 含 .ts 与清单、dsh.bundle.patch', async () => {
  const pkg = await readPluginJson('package.json');
  assert.equal(pkg.type, 'module', '插件模块按 ESM 加载（plugin-assets §1.2）');
  // 源码态 main 直指 .ts 模块（e692 契约保留为仓库源码态形态）；发布态（tarball）由 prepack
  // 换载为 index.js（FR-7 证伪回退）——发布面形态归 pack 产物断言（集成承载测试证 tarball 清单）。
  assert.equal(pkg.main, 'index.ts', '源码态 main 直指 .ts 插件模块（发布态换载归 prepack）');
  assert.ok(
    pkg.files.includes('cordis.patch.yml') && pkg.files.includes('index.ts'),
    `源码态 files 须含 cordis.patch.yml 与 .ts 模块文件，实际：${JSON.stringify(pkg.files)}`,
  );
  assert.deepEqual(pkg.dsh, { bundle: { patch: './cordis.patch.yml' } }, 'dsh 识别插件的凭据（plugin-assets §1.2）');
});

test('demo 包发布面预编译契约：prepack/postpack 钩子在位 + devDependencies 含 typescript（FR-7 证伪回退）', async () => {
  const pkg = await readPluginJson('package.json');
  // FR-7 证伪定案（docs/research/dsh-ts-loading/fr7-dsh-ts-loading-falsification.md）：node 拒载
  // node_modules 下 .ts（无旗标逃生），发布面必须预编译。钩子选 prepack（e692 零构建契约随之
  // 退役）：prepublishOnly 不作用于 pnpm pack，而发布契约锁「pack 产物即 .js 形态」。
  assert.equal(pkg.scripts?.prepack, 'node scripts/prepack.ts', '打包面编译钩子应为 prepack');
  assert.equal(pkg.scripts?.postpack, 'node scripts/postpack.ts', '打包后还原仓库树应为 postpack');
  assert.ok(
    typeof pkg.devDependencies?.typescript === 'string',
    '插件包应自持 typescript 工具链（workspace 成员独立可构建，spec 预编译契约明文）',
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
