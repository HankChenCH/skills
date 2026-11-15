#!/usr/bin/env node
// 发布前机械对账：npm pack 产物里的资产清单必须 = 仓库清单，不等即拒绝（退出码 1）。
// 技能侧（spec 20261115-8975）：包内技能清单 = 仓库 skills/ 清单。
// 插件侧两查（spec 20261115-495e FR-2，docs/plugin-assets.md §1.4）：
//   查 1 包内 plugins/ 清单 = 仓库 plugins/ 清单；
//   查 2 每个仓库插件目录过 bundle 清单校验（复用 scripts/verify-bundle.mjs；
//       查 1 成立时包内内容 = 仓库内容，校验仓库目录即校验发出去的内容）。
// 发布流程属单向门，本入口供 dev-release / 维护者在 `npm pack` 之后、`npm publish` 之前调用：
//
//   npm run verify:pack -- <tarball 路径>       # 例：hankchen-infra-0.1.0.tgz

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collectBundleDefects } from './verify-bundle.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(packageRoot, 'skills');
const PLUGINS_DIR = path.join(packageRoot, 'plugins');

const tarball = process.argv[2];
if (!tarball) {
  console.error('用法：npm run verify:pack -- <tarball 路径>（npm pack 产物）');
  process.exit(1);
}
if (!fs.existsSync(tarball)) {
  console.error(`✗ 找不到 tarball：${tarball}`);
  process.exit(1);
}

const list = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' });
if (list.status !== 0) {
  console.error(`✗ 无法读取 tarball：${list.stderr}`);
  process.exit(1);
}

// tarball 内技能 = 含 package/skills/<名>/SKILL.md 的目录名
const packed = new Set();
for (const entry of list.stdout.split('\n')) {
  const match = entry.match(/^package\/skills\/([^/]+)\/SKILL\.md$/);
  if (match) {
    packed.add(match[1]);
  }
}

const repo = new Set(
  fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name),
);

const missing = [...repo].filter((name) => !packed.has(name)).sort();
const extra = [...packed].filter((name) => !repo.has(name)).sort();

if (missing.length > 0 || extra.length > 0) {
  console.error('✗ 包内技能清单与仓库 skills/ 清单不一致，拒绝发布：');
  if (missing.length > 0) {
    console.error(`  缺失（仓库有、包内无）：${missing.join('、')}`);
  }
  if (extra.length > 0) {
    console.error(`  多出（包内有、仓库无）：${extra.join('、')}`);
  }
  process.exit(1);
}

console.log(`✓ 对账通过：包内技能清单 = 仓库 skills/ 清单（${repo.size} 项）`);

// ---------- 插件两查 ----------
if (!fs.existsSync(PLUGINS_DIR)) {
  console.error('✗ 仓库缺 plugins/ 目录——插件资产无从对账，拒绝发布');
  process.exit(1);
}

// 查 1：tarball 内插件 = 含 package/plugins/<名>/package.json 的目录名
const packedPlugins = new Set();
for (const entry of list.stdout.split('\n')) {
  const match = entry.match(/^package\/plugins\/([^/]+)\/package\.json$/);
  if (match) {
    packedPlugins.add(match[1]);
  }
}

const repoPlugins = fs
  .readdirSync(PLUGINS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const missingPlugins = repoPlugins.filter((name) => !packedPlugins.has(name)).sort();
const extraPlugins = [...packedPlugins].filter((name) => !repoPlugins.includes(name)).sort();

let pluginFailed = false;
if (missingPlugins.length > 0 || extraPlugins.length > 0) {
  pluginFailed = true;
  console.error('✗ 包内插件清单与仓库 plugins/ 清单不一致，拒绝发布：');
  if (missingPlugins.length > 0) {
    console.error(`  缺失（仓库有、包内无）：${missingPlugins.join('、')}`);
  }
  if (extraPlugins.length > 0) {
    console.error(`  多出（包内有、仓库无）：${extraPlugins.join('、')}`);
  }
}

// 查 2：每个仓库插件目录过 bundle 清单校验（缺陷消息已点名哪个插件缺哪个要素）
const bundleDefects = repoPlugins.flatMap((name) => collectBundleDefects(path.join(PLUGINS_DIR, name)));
if (bundleDefects.length > 0) {
  pluginFailed = true;
  console.error('✗ 仓库插件未过 bundle 清单校验，拒绝发布：');
  for (const defect of bundleDefects) {
    console.error(`  - ${defect}`);
  }
}

if (pluginFailed) {
  process.exit(1);
}
console.log(
  `✓ 对账通过：包内插件清单 = 仓库 plugins/ 清单，且每插件过 bundle 校验（${repoPlugins.length} 项）`,
);
