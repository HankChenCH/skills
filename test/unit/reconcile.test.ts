import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { reconcilePluginInstall } from '../../src/kernel/reconcile.ts';

// 安装后对账（spec 20261115-495e 实现决策「安装后对账」+ docs/plugin-assets.md §2.3）：
// 逐插件读目标 profile 的 package.json，断言两处落点——dependencies 含该包、
// dsh.profile.bundles 数组含该包名；齐备 → 出核对结果并带实际落盘版本；
// 缺任一 → 报错指明缺失落点与 profile 路径。fixture 用临时目录真实读写；落点四态
// 参数化两款真实插件包（票 20261117-218b：对账对新包同成立），读盘错误路径单份 fixture。

const PKG = '@hankchen/dsh-demo';

// 对账落点四态参数化两款真实插件包（spec 20261117-34d4 FR-6，票 20261117-218b：
// 安装后对账对新包 @hankchen/dsh-mcp 同样成立）；版本字面量按包取不同值——返回版本
// 须等于 dependencies 行的实际落盘值而非常量（dsh-mcp 取其依赖线 mcp-manager 同版
// 0.2.2-rc.2 作 fixture 字面量）。读盘错误路径（无清单/非法 JSON）的错误信息与包名
// 无关，保留 PKG 单份 fixture。
const RECONCILE_TARGETS = [
  { name: PKG, version: '0.1.0' },
  { name: '@hankchen/dsh-mcp', version: '0.2.2-rc.2' },
];

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

for (const target of RECONCILE_TARGETS) {
  test(`两落点齐备：核对通过并记录实际落盘版本（dependencies 行的值，${target.name}）`, (t) => {
    const profilePath = makeProfile(t, {
      name: 'dev',
      dependencies: { [target.name]: target.version },
      dsh: { profile: { bundles: [target.name] } },
    });
    const result = reconcilePluginInstall({ profilePath, packageName: target.name });
    assert.deepEqual(result, { ok: true, version: target.version });
  });

  test(`缺 dsh.profile.bundles 行：报错指明该落点与 profile 路径（${target.name}）`, (t) => {
    const profilePath = makeProfile(t, { dependencies: { [target.name]: target.version } });
    assert.throws(
      () => reconcilePluginInstall({ profilePath, packageName: target.name }),
      (err) => (err as Error).message.includes('dsh.profile.bundles') && (err as Error).message.includes(profilePath),
    );
  });

  test(`缺 dependencies 依赖行：报错指明该落点与 profile 路径（${target.name}）`, (t) => {
    const profilePath = makeProfile(t, { dsh: { profile: { bundles: [target.name] } } });
    assert.throws(
      () => reconcilePluginInstall({ profilePath, packageName: target.name }),
      (err) => (err as Error).message.includes('dependencies') && (err as Error).message.includes(profilePath),
    );
  });

  test(`两落点全缺（装了别的包）：报错一并列出两处缺失落点（${target.name}）`, (t) => {
    const profilePath = makeProfile(t, { dependencies: { other: '1.0.0' } });
    assert.throws(
      () => reconcilePluginInstall({ profilePath, packageName: target.name }),
      (err) => (err as Error).message.includes('dependencies') && (err as Error).message.includes('dsh.profile.bundles'),
    );
  });
}

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
