// 插件包（agents/dsh/plugins/）的外部可观察面，期望值逐条来自 spec 20261115-495e
// 实现决策与 docs/plugin-assets.md §1.2–§1.3、need 20261115-339e F1/F3/F4、
// fix 票 20261115-f158（patch 清单官方顶层数组形态取证 + 版本 0.1.1）、
// spec 20261115-ed9f 插件预编译契约（FR-7 证伪回退，round 2 票 20261115-cf39）：
// 包形态四要素、engines 声明、patch 清单官方形态且以包名引用自己、模块真实可加载、
// 发布面预编译钩子（源码态 .ts 保持，打包面 prepack 换载 .js——spec 20261115-f650 的
// .ts 零构建直发契约经 FR-7 端到端实测证伪后退役）。
// 公共包契约参数化覆盖两款插件包（票 20261117-218b，承接评审 20261117-2188 建议 3 的
// patch 契约无自动化断言缺口；spec 20261117-34d4 FR-7 兜底），不按包复制测试：
// demo = 单 insert 行自挂载；dsh-mcp = 恰两 insert 行（mcp-manager 挂载行 id mcp 带
// inject [credentials] + 本插件模块行 id dsh-mcp-manage 带 inject [mcpManager, commands,
// tools, settings]——行契约与 inject 语义取 spec 实现决策与票 20261117-dd1f 裁决）。
// patch 断言用真解析器（js-yaml，declarative-artifact-strict-parse 口径）替代 regex 行
// 匹配，顶层数组与 insert 行 id/name/inject 逐字段等值。
// demo 特例保留两个包历史约束：版本高于已烧版 0.1.0、apply 打一条加载日志。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { load as loadYaml } from 'js-yaml';

const PLUGIN_NAME = '@hankchen/dsh-demo';
const PLUGIN_DIR = new URL('../../agents/dsh/plugins/dsh-demo/', import.meta.url);
const PLUGINS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'agents', 'dsh', 'plugins');

interface InsertRow {
  id: string;
  name: string;
  inject?: string[];
}

interface PluginFixture {
  dir: string;
  name: string;
  inserts: InsertRow[];
  // dsh 字段全文档期望（deepEqual 钉住无多余无缺失）：demo = 纯 Host 插件（bundle 一键）；
  // dsh-mcp = 双面插件（bundle + client——spec 20261118-0de6 FR-7 客户端载体，票 20261118-7504）
  dsh: Record<string, unknown>;
}

// 两款插件包参数化 fixture：insert 行期望 = 各包 cordis.patch.yml 定稿（独立来源 =
// spec/裁决文本，不从实现推导）。dsh-mcp 两行的语义：mcp-manager 官方只在 Web/Desktop
// profile 自带，headless/sdk/acp 自定义 profile 不含，故插件自带挂载行（ced7 F2.3）；
// credentials 在 manager 行、四服务在插件行（票 20261117-dd1f：插件只透传凭据模板串）。
// dsh.client 期望 = 官方 client-modules.md 一手契约（client-modules.md「The scan」节）+
// 官方 parseDshClient 校验形态（dsh-client-modules@0.2.2-rc.4 lib/client.js 探针，票
// 20261118-7504 Progress 留痕）：platform 必带 'web'、inject 显式空数组（载体无包依赖边，
// 照 dsh-client-modules 先例）、immediately 省略（application 相位，官方 UI 先例全不标）。
const PLUGINS: PluginFixture[] = [
  {
    dir: 'dsh-demo',
    name: PLUGIN_NAME,
    inserts: [{ id: 'dsh-demo-load-log', name: PLUGIN_NAME }],
    dsh: { bundle: { patch: './cordis.patch.yml' } },
  },
  {
    dir: 'dsh-mcp',
    name: '@hankchen/dsh-mcp',
    inserts: [
      { id: 'mcp', name: '@deepseek-ai/dsh-mcp-manager', inject: ['credentials'] },
      { id: 'dsh-mcp-manage', name: '@hankchen/dsh-mcp', inject: ['mcpManager', 'commands', 'tools', 'settings'] },
    ],
    dsh: {
      bundle: { patch: './cordis.patch.yml' },
      client: {
        platform: 'web',
        inject: ['@deepseek-ai/dsh-api-remotes', '@deepseek-ai/dsh-client-ui-sidebar-right'],
      },
    },
  },
];

interface PluginPackageJson {
  name: unknown;
  version: unknown;
  type: unknown;
  main: unknown;
  files?: string[];
  scripts?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
  engines?: Record<string, unknown>;
  dsh?: { bundle?: unknown; client?: Record<string, unknown> };
}

async function readPackageJson(dir: string): Promise<PluginPackageJson> {
  return JSON.parse(await readFile(path.join(PLUGINS_ROOT, dir, 'package.json'), 'utf8')) as PluginPackageJson;
}

function readModule(dir: string): Promise<{ name: unknown; apply: unknown }> {
  return import(pathToFileURL(path.join(PLUGINS_ROOT, dir, 'index.ts')).href) as Promise<{ name: unknown; apply: unknown }>;
}

// ---------- 公共包契约（参数化覆盖两款插件包）----------

for (const plugin of PLUGINS) {
  test(`${plugin.dir} 包名与版本：registry 可发布形态——${plugin.name}、合法 semver`, async () => {
    const pkg = await readPackageJson(plugin.dir);
    assert.equal(pkg.name, plugin.name, '条目正名/安装转发/锁文件记账一律取包名（plugin-assets §1.2）');
    // 版本断言降耦合（票 20261116-94c1）：钉合法 semver 形不钉具体值，使升版发布不红；
    // demo 的版本耐久约束（高于已烧版 0.1.0）由下方 demo 特例承载
    assert.match(
      String(pkg.version),
      /^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/,
      `版本须为合法 semver（prerelease 为点分标识符，npm publish 拒收下划线等非法字符），实际：${pkg.version}`,
    );
  });

  test(`${plugin.dir} 包四要素齐备（源码态）：type module、main 直指 .ts 模块、files 含 .ts 与清单、dsh.bundle.patch`, async () => {
    const pkg = await readPackageJson(plugin.dir);
    assert.equal(pkg.type, 'module', '插件模块按 ESM 加载（plugin-assets §1.2）');
    // 源码态 main 直指 .ts 模块（e692 契约保留为仓库源码态形态）；发布态（tarball）由 prepack
    // 换载为 index.js（FR-7 证伪回退）——发布面形态归 pack 产物断言（集成承载测试证 tarball 清单）。
    assert.equal(pkg.main, 'index.ts', '源码态 main 直指 .ts 插件模块（发布态换载归 prepack）');
    assert.ok(
      pkg.files?.includes('cordis.patch.yml') && pkg.files?.includes('index.ts'),
      `源码态 files 须含 cordis.patch.yml 与 .ts 模块文件，实际：${JSON.stringify(pkg.files)}`,
    );
    assert.deepEqual(pkg.dsh, plugin.dsh, 'dsh 凭据全文档等值（bundle + client 两面按包定稿）');
  });

  test(`${plugin.dir} 发布面预编译契约：prepack/postpack 钩子在位 + devDependencies 含 typescript（FR-7 证伪回退）`, async () => {
    const pkg = await readPackageJson(plugin.dir);
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

  test(`${plugin.dir} engines：node 基线 >=24.9.0，dsh 兼容范围覆盖官方当前运行时 0.2.2-rc.1`, async () => {
    const pkg = await readPackageJson(plugin.dir);
    assert.equal(pkg.engines?.node, '>=24.9.0', '与官方 dsh 的 node 前置对齐（need F4）');
    // 官方当前运行时版本（need F4 查证 + 2026-11-15 npm view 复核：0.2.2-rc.1）须落在
    // engines.dsh 声明的兼容范围内（plugin-assets §1.2：发布前对官方当前版本核验）。
    const match = String(pkg.engines?.dsh).match(/^>=\s*(\d+)\.(\d+)\.(\d+)/);
    assert.ok(match, `engines.dsh 须是 ">=主.次.补" 形态的范围声明，实际：${pkg.engines?.dsh}`);
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
      `engines.dsh 兼容下限 ${pkg.engines?.dsh} 高于官方当前运行时 0.2.2-rc.1，官方运行时不在兼容范围内`,
    );
  });

  test(`${plugin.dir} cordis.patch.yml 为官方顶层数组形态，insert 行 = design 定稿（id/name/inject 逐字段等值）`, () => {
    // 官方 loader 只加载顶层数组（dsh 0.2.2-rc.1 取证，ticket 20261115-f158）：顶层 YAML 数组，
    // 元素 = PatchOptions；insert 元素 = EntryOptions，须 id + name——name 是宿主从 profile 的
    // node_modules 解析的模块说明符。deepEqual 全文档等值同时钉住：顶层数组、恰一 PatchOptions、
    // insert 行无多余无缺失、id/name/inject 值与定稿一致（评审 20261117-2188 建议 3 缺口承接）。
    const patch = loadYaml(fs.readFileSync(path.join(PLUGINS_ROOT, plugin.dir, 'cordis.patch.yml'), 'utf8'));
    assert.deepEqual(patch, [{ insert: plugin.inserts }]);
  });

  test(`${plugin.dir} 插件模块真实可加载：导出 name = 包名 与 apply(ctx)`, async () => {
    const mod = await readModule(plugin.dir);
    assert.equal(mod.name, plugin.name, 'name 取包名字符串（plugin-assets §1.3）');
    assert.equal(typeof mod.apply, 'function');
  });

  test(`${plugin.dir} 通过 bundle 校验器（四要素齐备）`, async () => {
    const { collectBundleDefects } = await import('../../scripts/verify-bundle.ts');
    assert.deepEqual(collectBundleDefects(path.join(PLUGINS_ROOT, plugin.dir)), []);
  });
}

// ---------- dsh-mcp 客户端载体契约（spec 20261118-0de6 FR-7，票 20261118-7504；不进参数化）----------
// 期望值独立来源 = 官方 client-modules.md「The scan」一手契约 + dsh-client-modules@0.2.2-rc.4
// 探针（票 Progress 留痕）：客户端载体两处齐备才进客户端路由表——package.json 声明 dsh.client
// 与导出 exports["./client"]；产物路径约定 client.js（官方 combo 资源名硬编码 <包名>/client.js）。

test('dsh-mcp 客户端声明齐备：dsh.client = {platform web, inject 服务提供者包边}（官方 parseDshClient 校验形态）', async () => {
  const pkg = await readPackageJson('dsh-mcp');
  // 全文档等值钉住无多余键：官方 parseDshClient 只认 platform/inject/external/immediately，
  // 平台非 web 的声明不进 web 插件表（官方 node 半区扫描 platform !== 'web' 即跳过）。
  // inject 边 = 客户端面板 apply 消费服务的提供者包（官方 files 先例形态）：
  // api-remotes = remote/remote.mcpManager/remote.settings 命名空间，client-ui-sidebar-right =
  // sidebarRightTabs 服务；slots 属平台层（官方 client-ui 先例均不列——bootstrap 相位必然在）。
  assert.deepEqual(pkg.dsh?.client, {
    platform: 'web',
    inject: ['@deepseek-ai/dsh-api-remotes', '@deepseek-ai/dsh-client-ui-sidebar-right'],
  });
});

test('dsh-mcp exports 两处齐备："." 指源码态模块 + "./client" 指 client 构建产物路径（官方 clientExportOf 形态）', async () => {
  const pkg = await readPackageJson('dsh-mcp') as PluginPackageJson & { exports?: Record<string, unknown> };
  // 官方 clientExportOf 接受字符串或 {default} 对象——字符串是最窄合法形态；
  // "." 必存（exports 存在即约束包根解析，缺 "." 条目宿主 import 插件即 ERR_PACKAGE_PATH_NOT_EXPORTED）
  assert.equal(pkg.exports?.['.'], './index.ts', '源码态 exports["."] 与 main 同指源码模块');
  assert.equal(pkg.exports?.['./client'], './client.js', 'exports["./client"] 指向构建产物 client.js（官方 combo 资源名约定）');
});

test('dsh-mcp 源码态 files 含客户端源码目录 client（发布态换载归 prepack）', async () => {
  const pkg = await readPackageJson('dsh-mcp');
  assert.ok(
    pkg.files?.includes('client'),
    `源码态 files 须含 client 源码目录，实际：${JSON.stringify(pkg.files)}`,
  );
});

// ---------- demo 特例（包历史约束，不进参数化）----------

test('demo 包版本高于已烧版 0.1.0（npm 同版本不可重发的耐久约束）', async () => {
  const pkg = await readPackageJson('dsh-demo');
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

test('demo 模块 apply 打含插件名的加载日志（demo 内容契约：官方「Your first plugin」最小形态）', async () => {
  const mod = (await import(new URL('index.ts', PLUGIN_DIR).href)) as {
    name: string;
    apply(ctx: { logger: { info(message: unknown): void } }): void;
  };
  const logs: unknown[] = [];
  mod.apply({ logger: { info: (message: unknown) => logs.push(message) } });
  assert.equal(logs.length, 1, 'apply 应恰好打一条加载日志');
  assert.match(logs[0] as string, new RegExp(PLUGIN_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '日志须含插件名');
});
