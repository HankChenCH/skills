import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { profilesRoot, listProfiles } from '../../src/kernel/dsh-profiles.ts';

// profile 解析（spec 20261115-495e 实现决策「profile 解析」Q2 拍板）：
// profile 根 = $DSH_HOME/profiles/（缺省 ~/.dsh/profiles/）；列举既有 profile 按目录名排序。

test('DSH_HOME 设置时：profile 根 = $DSH_HOME/profiles', () => {
  assert.equal(profilesRoot({ env: { DSH_HOME: '/tmp/dsh-home' }, homedir: '/home/u' }), '/tmp/dsh-home/profiles');
});

test('DSH_HOME 未设置时：profile 根 = ~/.dsh/profiles', () => {
  assert.equal(profilesRoot({ env: {}, homedir: '/home/u' }), '/home/u/.dsh/profiles');
});

test('列举既有 profile：根下目录按名排序', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-dshprofiles-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'work'));
  fs.mkdirSync(path.join(root, 'dev'));
  assert.deepEqual(listProfiles(root), ['dev', 'work']);
});

test('根下的非目录条目不算 profile', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-dshprofiles-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'dev'));
  fs.writeFileSync(path.join(root, 'notes.txt'), 'not a profile');
  assert.deepEqual(listProfiles(root), ['dev']);
});

test('profile 根不存在（从未初始化 dsh）：列为空而非报错', () => {
  assert.deepEqual(listProfiles('/nonexistent-infra-dshhome/profiles'), []);
});
