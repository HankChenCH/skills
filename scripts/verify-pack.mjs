#!/usr/bin/env node
// 发布前机械对账（spec 20261115-8975 资产随包分发决策）：npm pack 产物里的技能清单
// 必须 = 仓库 skills/ 清单，不等即拒绝（退出码 1）。发布流程属单向门，本入口供
// dev-release / 维护者在 `npm pack` 之后、`npm publish` 之前调用：
//
//   npm run verify:pack -- <tarball 路径>       # 例：hankghchen-infra-0.1.0.tgz
//
// 维护者段（README 发布步骤与 registry 缓解路径）由安装故事票补写。

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(packageRoot, 'skills');

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
