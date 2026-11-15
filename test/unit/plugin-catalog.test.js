import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { listPlugins } from '../../src/catalog.js';
import { ASSET_MAP, findRow } from '../../src/asset-map.js';

// 插件编目（spec 20261115-495e 实现决策「插件编目」）：command 类行的菜单条目来自
// 来源目录下各插件包的 package.json——name 为条目正名（registry 名，非目录名）、
// description 为菜单提示；目录缺失/包不完整时报错并列出缺陷（同技能编目错误口径）。

const PLUGIN_ROW = findRow(ASSET_MAP, '插件');

function makePackage(t, plugins) {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-plugincat-'));
  t.after(() => fs.rmSync(packageRoot, { recursive: true, force: true }));
  for (const [dirName, pkg] of Object.entries(plugins)) {
    const dir = path.join(packageRoot, 'plugins', dirName);
    fs.mkdirSync(dir, { recursive: true });
    if (pkg !== null) {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
    }
  }
  return packageRoot;
}

test('条目正名取包 package.json 的 name，而非目录名', (t) => {
  const packageRoot = makePackage(t, {
    'dsh-demo': { name: '@hankchen/dsh-demo', description: 'demo 插件' },
  });
  const entries = listPlugins(packageRoot, PLUGIN_ROW);
  assert.deepEqual(entries.map((e) => e.name), ['@hankchen/dsh-demo']);
});

test('description 为菜单提示；缺 description 的包提示为空字符串', (t) => {
  const packageRoot = makePackage(t, {
    a: { name: '@hankchen/a', description: 'A 提示' },
    b: { name: '@hankchen/b' },
  });
  const entries = listPlugins(packageRoot, PLUGIN_ROW);
  assert.deepEqual(entries.map((e) => e.description), ['A 提示', '']);
});

test('多插件条目按正名排序', (t) => {
  const packageRoot = makePackage(t, {
    z: { name: '@hankchen/z' },
    a: { name: '@hankchen/a' },
  });
  const entries = listPlugins(packageRoot, PLUGIN_ROW);
  assert.deepEqual(entries.map((e) => e.name), ['@hankchen/a', '@hankchen/z']);
});

test('来源目录缺失显式报错（同技能编目口径）', (t) => {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-plugincat-'));
  t.after(() => fs.rmSync(packageRoot, { recursive: true, force: true }));
  assert.throws(() => listPlugins(packageRoot, PLUGIN_ROW), (err) => {
    return err instanceof Error && err.message.includes('plugins');
  });
});

test('子目录缺 package.json：报错并列出该缺陷', (t) => {
  const packageRoot = makePackage(t, { empty: null, ok: { name: '@hankchen/ok' } });
  assert.throws(() => listPlugins(packageRoot, PLUGIN_ROW), (err) => {
    return err instanceof Error && err.message.includes('empty') && err.message.includes('package.json');
  });
});

test('package.json 缺 name：报错并列出该缺陷（正名无从得出）', (t) => {
  const packageRoot = makePackage(t, { noname: { description: '没有名字' } });
  assert.throws(() => listPlugins(packageRoot, PLUGIN_ROW), (err) => {
    return err instanceof Error && err.message.includes('noname') && err.message.includes('name');
  });
});
