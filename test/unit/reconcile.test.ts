import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { reconcilePluginInstall } from '../../src/kernel/reconcile.ts';

// 安装后对账（spec 20261115-495e 实现决策「安装后对账」+ docs/plugin-assets.md §2.3）：
// 逐插件读目标 profile 的 package.json，断言两处落点——dependencies 含该包、
// dsh.profile.bundles 数组含该包名；齐备 → 出核对结果并带实际落盘版本；
// 缺任一 → 报错指明缺失落点与 profile 路径。fixture 两态用临时目录真实读写。

const PKG = '@hankchen/dsh-demo';

function makeProfile(t: TestContext, packageJson: Record<string, unknown> | "INVALID" | null) {
  const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-profile-'));
  t.after(() => fs.rmSync(profilePath, { recursive: true, force: true }));
  if (packageJson !== null) {
    fs.writeFileSync(
      path.join(profilePath, 'package.json'),
      packageJson === 'INVALID' ? '{ not json' : JSON.stringify(packageJson),
    );
  }
  return profilePath;
}

const COMPLETE_PROFILE = {
  name: 'dev',
  dependencies: { [PKG]: '0.1.0' },
  dsh: { profile: { bundles: [PKG] } },
};

test('两落点齐备：核对通过并记录实际落盘版本（dependencies 行的值）', (t) => {
  const profilePath = makeProfile(t, COMPLETE_PROFILE);
  const result = reconcilePluginInstall({ profilePath, packageName: PKG });
  assert.deepEqual(result, { ok: true, version: '0.1.0' });
});

test('缺 dsh.profile.bundles 行：报错指明该落点与 profile 路径', (t) => {
  const profilePath = makeProfile(t, { dependencies: { [PKG]: '0.1.0' } });
  assert.throws(
    () => reconcilePluginInstall({ profilePath, packageName: PKG }),
    (err) => (err as Error).message.includes('dsh.profile.bundles') && (err as Error).message.includes(profilePath),
  );
});

test('缺 dependencies 依赖行：报错指明该落点与 profile 路径', (t) => {
  const profilePath = makeProfile(t, { dsh: { profile: { bundles: [PKG] } } });
  assert.throws(
    () => reconcilePluginInstall({ profilePath, packageName: PKG }),
    (err) => (err as Error).message.includes('dependencies') && (err as Error).message.includes(profilePath),
  );
});

test('两落点全缺（装了别的包）：报错一并列出两处缺失落点', (t) => {
  const profilePath = makeProfile(t, { dependencies: { other: '1.0.0' } });
  assert.throws(
    () => reconcilePluginInstall({ profilePath, packageName: PKG }),
    (err) => (err as Error).message.includes('dependencies') && (err as Error).message.includes('dsh.profile.bundles'),
  );
});

test('profile 无 package.json（官方命令未完成安装）：报错带 profile 路径', (t) => {
  const profilePath = makeProfile(t, null);
  assert.throws(
    () => reconcilePluginInstall({ profilePath, packageName: PKG }),
    (err) => (err as Error).message.includes(profilePath) && (err as Error).message.includes('package.json'),
  );
});

test('profile package.json 非法：报错带 profile 路径而非静默', (t) => {
  const profilePath = makeProfile(t, 'INVALID');
  assert.throws(
    () => reconcilePluginInstall({ profilePath, packageName: PKG }),
    (err) => (err as Error).message.includes(profilePath),
  );
});
