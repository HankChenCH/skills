import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// node 基线声明的外部可观察面：package.json engines（npm 安装时强制）与 .nvmrc（fnm/nvm 进场版本）。
// 期望值 24.9.0 来自官方 @deepseek-ai/dsh 的 engines 前置（spec 20261115-495e FR-6），
// 本包基线不得低于它，两处声明之间不得互相矛盾。

const OFFICIAL_DSH_NODE_FLOOR = [24, 9, 0];

function versionFloorOf(range) {
  const match = range.match(/^>=\s*(\d+)\.(\d+)\.(\d+)$/);
  assert.ok(match, `声明须是 ">=主.次.补" 形态，实际：${range}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function noLowerThan(version, floor) {
  const [major, minor, patch] = version;
  const [floorMajor, floorMinor, floorPatch] = floor;
  if (major !== floorMajor) return major > floorMajor;
  if (minor !== floorMinor) return minor > floorMinor;
  return patch >= floorPatch;
}

test('包 engines.node 基线不低于官方 dsh 要求的 24.9.0', async () => {
  const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  const floor = versionFloorOf(pkg.engines.node);
  assert.ok(
    noLowerThan(floor, OFFICIAL_DSH_NODE_FLOOR),
    `engines.node 基线 ${pkg.engines.node} 低于官方 dsh 要求的 >=24.9.0`
  );
});
