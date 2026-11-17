import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listPlugins } from '../../src/kernel/catalog.ts';
import { ASSET_MAP, findRow } from '../../src/kernel/asset-map.ts';

// 插件编目（spec 20261115-495e 实现决策「插件编目」+ spec 20261115-ed9f agents/ 两级枚举）：
// command 类行的菜单条目来自枚举根下各宿主的 plugins/ 机制目录中各插件包的 package.json
// ——name 为条目正名（registry 名，非目录名）、description 为菜单提示；枚举根缺失/包不
// 完整时报错并列出缺陷（缺陷点名 <宿主>/<目录> 复合键，同技能编目错误口径）。

const PLUGIN_ROW = findRow(ASSET_MAP, '插件');

// plugins 键 = 「<宿主>/<插件目录名>」复合键，fixture 按两级布局落盘 agents/<宿主>/plugins/<目录名>/
function makePackage(t: TestContext, plugins: Record<string, Record<string, unknown> | null>) {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-plugincat-'));
  t.after(() => fs.rmSync(packageRoot, { recursive: true, force: true }));
  for (const [key, pkg] of Object.entries(plugins)) {
    const [host, dirName] = key.split('/');
    const dir = path.join(packageRoot, 'agents', host!, 'plugins', dirName!);
    fs.mkdirSync(dir, { recursive: true });
    if (pkg !== null) {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
    }
  }
  return packageRoot;
}

test('条目正名取包 package.json 的 name，而非目录名', (t) => {
  const packageRoot = makePackage(t, {
    'dsh/dsh-demo': { name: '@hankchen/dsh-demo', description: 'demo 插件' },
  });
  const entries = listPlugins(packageRoot, PLUGIN_ROW);
  assert.deepEqual(entries.map((e) => e.name), ['@hankchen/dsh-demo']);
});

test('description 为菜单提示；缺 description 的包提示为空字符串', (t) => {
  const packageRoot = makePackage(t, {
    'dsh/a': { name: '@hankchen/a', description: 'A 提示' },
    'dsh/b': { name: '@hankchen/b' },
  });
  const entries = listPlugins(packageRoot, PLUGIN_ROW);
  assert.deepEqual(entries.map((e) => e.description), ['A 提示', '']);
});

test('多插件条目按正名排序（跨宿主同一排序口径）', (t) => {
  const packageRoot = makePackage(t, {
    'dsh/z': { name: '@hankchen/z' },
    'other/a': { name: '@hankchen/a' },
  });
  const entries = listPlugins(packageRoot, PLUGIN_ROW);
  assert.deepEqual(entries.map((e) => e.name), ['@hankchen/a', '@hankchen/z']);
});

test('宿主目录缺 plugins/ 机制目录不报错（按需建目录，agents-layout §1.3）', (t) => {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-plugincat-'));
  t.after(() => fs.rmSync(packageRoot, { recursive: true, force: true }));
  fs.mkdirSync(path.join(packageRoot, 'agents', 'skills-only-host', 'skills'), { recursive: true });
  const entries = listPlugins(packageRoot, PLUGIN_ROW);
  assert.deepEqual(entries, []);
});

test('枚举根缺失显式报错（同技能编目口径）', (t) => {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-plugincat-'));
  t.after(() => fs.rmSync(packageRoot, { recursive: true, force: true }));
  assert.throws(() => listPlugins(packageRoot, PLUGIN_ROW), (err) => {
    return err instanceof Error && err.message.includes('agents');
  });
});

test('插件目录缺 package.json：报错并列出该缺陷（复合键点名宿主段）', (t) => {
  const packageRoot = makePackage(t, { 'dsh/empty': null, 'dsh/ok': { name: '@hankchen/ok' } });
  assert.throws(() => listPlugins(packageRoot, PLUGIN_ROW), (err) => {
    return (
      err instanceof Error &&
      err.message.includes('dsh/empty') &&
      err.message.includes('package.json')
    );
  });
});

test('package.json 缺 name：报错并列出该缺陷（正名无从得出）', (t) => {
  const packageRoot = makePackage(t, { 'dsh/noname': { description: '没有名字' } });
  assert.throws(() => listPlugins(packageRoot, PLUGIN_ROW), (err) => {
    return (
      err instanceof Error &&
      err.message.includes('dsh/noname') &&
      err.message.includes('name')
    );
  });
});

// ---- 真实仓库编目确认（spec 20261117-34d4 FR-6，票 20261117-218b：第二款插件包）----
// 来源目录事实与编目行为分离：前者钉 agents/ 两级布局下新包的存在性（编目为目录派生，
// 包在即编目在），后者钉 listPlugins 对新包的正名/提示提取。期望值独立来源 =
// agents/dsh/plugins/dsh-mcp/package.json 文件本身（不从实现推导）。

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('真实来源目录 agents/dsh/plugins/ 含 dsh-mcp 包目录（新包随包分发的来源事实）', () => {
  const pluginDirs = fs
    .readdirSync(path.join(REPO_ROOT, 'agents', 'dsh', 'plugins'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.ok(
    pluginDirs.includes('dsh-mcp'),
    `agents/dsh/plugins/ 应含 dsh-mcp 包目录（编目为目录派生），实际：${pluginDirs.join('、')}`,
  );
});

test('编目收录 dsh-mcp：条目正名 = 包 name、菜单提示 = 包 description（FR-6）', () => {
  const entries = listPlugins(REPO_ROOT, PLUGIN_ROW);
  const mcpPkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'agents', 'dsh', 'plugins', 'dsh-mcp', 'package.json'), 'utf8'),
  ) as { name: string; description: string };
  const entry = entries.find((e) => e.name === mcpPkg.name);
  assert.ok(entry, `编目应含 ${mcpPkg.name}，实际：${entries.map((e) => e.name).join('、')}`);
  assert.equal(
    entry.description,
    mcpPkg.description,
    '菜单提示应逐字取包 package.json 的 description',
  );
});
