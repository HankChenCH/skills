// .gitignore 插件包 prepack 产物形态守护（seam 落点：git check-ignore 的外部可观察行为）。
// 票 20261116-bec7：产物登记从具体插件路径通配化后，新增插件包免改 .gitignore——
// 本测试用「未来第二插件包」的形态路径钉住该承诺，并守护既有兜底面不被弱化。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function ignored(relativePath: string): boolean {
  // -q 只要退出码：0 = 命中 ignore 规则，1 = 未命中，128 = git 出错（按未命中上抛断言）
  const result = spawnSync('git', ['check-ignore', '-q', relativePath], { cwd: packageRoot });
  if (result.status === 128) {
    throw new Error(`git check-ignore 出错：${result.stderr}`);
  }
  return result.status === 0;
}

test('任意宿主/插件目录的 prepack 产物 index.js 均被 ignore 覆盖（未来第二插件包免改登记）', () => {
  assert.equal(ignored(path.join('agents', 'dsh', 'plugins', 'zz-fixture-probe', 'index.js')), true);
  assert.equal(ignored(path.join('agents', 'other-host', 'plugins', 'another-pkg', 'index.js')), true);
});

test('客户端面产物 client.js 同受两级布局通配覆盖（票 20261118-7504：prepack 客户端面编译兜底）', () => {
  assert.equal(ignored(path.join('agents', 'dsh', 'plugins', 'dsh-mcp', 'client.js')), true);
  assert.equal(ignored(path.join('agents', 'other-host', 'plugins', 'another-pkg', 'client.js')), true);
});

test('demo 插件既有产物路径仍被 ignore 覆盖', () => {
  assert.equal(ignored(path.join('agents', 'dsh', 'plugins', 'dsh-demo', 'index.js')), true);
});

test('清单换载备份与暂存目录形态任意深度命中', () => {
  assert.equal(ignored(path.join('agents', 'dsh', 'plugins', 'zz-fixture-probe', 'package.json.prepack-bak')), true);
  assert.equal(ignored(path.join('agents', 'dsh', 'plugins', 'zz-fixture-probe', '.prepack-stash', 'stash.json')), true);
});

test('不误伤：插件目录内非 prepack 产物的合法 .js 资产不被 ignore', () => {
  assert.equal(ignored(path.join('agents', 'dsh', 'plugins', 'dsh-demo', 'vendor', 'lib', 'util.js')), false);
  assert.equal(ignored(path.join('agents', 'dsh', 'plugins', 'zz-fixture-probe', 'runtime', 'plugin.js')), false);
});

test('根包兜底面保持：bin、src、根清单备份、暂存目录照旧命中', () => {
  assert.equal(ignored(path.join('bin', 'infra.js')), true);
  assert.equal(ignored(path.join('src', 'cli.js')), true);
  assert.equal(ignored('package.json.prepack-bak'), true);
  assert.equal(ignored(path.join('.prepack-stash', 'stash.json')), true);
});
