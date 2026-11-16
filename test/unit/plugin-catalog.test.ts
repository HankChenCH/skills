import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
