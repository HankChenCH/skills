import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildPluginCommand,
  commandExists,
  resolveExecutor,
  assertPluginPreconditions,
} from '../../src/dsh-command.js';

// 命令组装器（spec 20261115-495e 实现决策「命令组装与执行」拍板 D2 +「前置检查」异常流 A/B）。
// 期望值字面量取 spec 原文：官方命令 = `plugin --profile <名> add <包>`；
// dsh 在 PATH 直接执行，否则以 npx @deepseek-ai/dsh 为执行体。
// 本套件不实跑官方命令——执行体探测结果在这里是注入的入参，测试只断言组装形态。

test('dsh 在 PATH：组装 `dsh plugin --profile dev add @hankchen/dsh-demo`', () => {
  const executor = resolveExecutor(true);
  const { command, args } = buildPluginCommand(executor, 'dev', '@hankchen/dsh-demo');
  assert.equal(command, 'dsh');
  assert.deepEqual(args, ['plugin', '--profile', 'dev', 'add', '@hankchen/dsh-demo']);
});

test('dsh 不在 PATH：组装 npx @deepseek-ai/dsh 执行体形态（--yes 免确认拉取）', () => {
  const executor = resolveExecutor(false);
  const { command, args } = buildPluginCommand(executor, 'dev', '@hankchen/dsh-demo');
  assert.equal(command, 'npx');
  assert.deepEqual(args, [
    '--yes',
    '@deepseek-ai/dsh',
    'plugin',
    '--profile',
    'dev',
    'add',
    '@hankchen/dsh-demo',
  ]);
});

test('执行体探测：PATH 目录下有可执行文件 dsh → true', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-path-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'dsh'), '#!/bin/sh\n', { mode: 0o755 });
  assert.equal(commandExists('dsh', { pathEnv: dir }), true);
});

test('执行体探测：同名文件存在但不可执行 → false（X_OK 判定）', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-path-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'dsh'), 'not executable', { mode: 0o644 });
  assert.equal(commandExists('dsh', { pathEnv: dir }), false);
});

test('执行体探测：PATH 各目录都没有 dsh → false', () => {
  assert.equal(commandExists('dsh', { pathEnv: '/nonexistent-infra-path' }), false);
});

test('node 低于 24.9.0：拒装，报当前版本与 fnm/nvm 升级指引', () => {
  assert.throws(
    () => assertPluginPreconditions({ nodeVersion: 'v22.23.4', profile: 'dev' }),
    (err) => {
      assert.match(err.message, /22\.23\.4/, '须报当前版本');
      assert.match(err.message, /24\.9\.0/, '须报基线');
      assert.match(err.message, /fnm/, '须给 fnm 指引');
      assert.match(err.message, /nvm/, '须给 nvm 指引');
      return true;
    },
  );
});

test('node 恰在基线 24.9.0：放行（>= 判定）', () => {
  assert.doesNotThrow(() => assertPluginPreconditions({ nodeVersion: 'v24.9.0', profile: 'dev' }));
});

test('目标 profile 为 desktop：拒装并说明官方保留名行为', () => {
  assert.throws(
    () => assertPluginPreconditions({ nodeVersion: 'v24.22.1', profile: 'desktop' }),
    (err) => {
      assert.match(err.message, /desktop/);
      assert.match(err.message, /保留/);
      return true;
    },
  );
});

test('node 与 profile 双不满足：node 前置先行（第一时刻拦截）', () => {
  assert.throws(
    () => assertPluginPreconditions({ nodeVersion: 'v22.23.4', profile: 'desktop' }),
    (err) => err.message.includes('22.23.4'),
  );
});
