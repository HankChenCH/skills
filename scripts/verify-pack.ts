#!/usr/bin/env node
// 发布前机械对账：pnpm pack 产物里的资产清单必须 = 仓库清单，不等即拒绝（退出码 1）。
// 技能侧（spec 20261115-8975）：包内技能清单 = 仓库 skills/ 清单。
// 插件侧三查（spec 20261115-495e FR-2 立查 1/查 2，票 20261115-d5f4 加查 1.5 后三查；
// docs/plugin-assets.md §1.4；agents/ 两级布局随
// spec 20261115-ed9f 迁移，agents-layout.md §3.2——对账键为 <宿主>/<插件目录名> 复合键，
// 两侧同法构造，报错消息点名宿主段）：
//   查 1 包内 agents/*/plugins/ 清单 = 仓库 agents/*/plugins/ 清单；
//   查 1.5 包内禁 node_modules（spec 20261115-ed9f FR-4，RQ2 报告异常流 A #3 / 问④ f）：
//       workspace 形态下 pnpm install 在成员目录生成的 node_modules 若被根 files 白名单
//       卷入包，装出去即悬空链接/异机路径的结构性坏包——逐条列出即拒绝；
//   查 2 每个仓库插件目录过 bundle 清单校验（复用 scripts/verify-bundle.ts；
//       查 1 成立时包内内容 = 仓库内容，校验仓库目录即校验发出去的内容）。
// 发布流程属单向门，本入口供 dev-release / 维护者在 `pnpm pack` 之后、`pnpm publish` 之前调用
// （pnpm 12 起 `pnpm run` 原样转发 `--`，传参不带 `--`）：
//
//   pnpm run verify:pack <tarball 路径>       # 例：hankchen-infra-0.1.0.tgz

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collectBundleDefects } from './verify-bundle.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(packageRoot, 'skills');
const AGENTS_DIR = path.join(packageRoot, 'agents');

const tarball = process.argv[2];
if (!tarball) {
  console.error('用法：pnpm run verify:pack <tarball 路径>（pnpm pack 产物）');
  process.exit(1);
}
if (!fs.existsSync(tarball)) {
  console.error(`✗ 找不到 tarball：${tarball}`);
  process.exit(1);
}

const list = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' });
if (list.error || list.status !== 0) {
  // spawn 失败（tar 不在 PATH）时 error 持原因、stderr 为空——只拼 stderr 会出 null 空壳
  // （票 20261116-d30c）：原因取 error 优先（|| 落空串）、stderr 兜底；退出码段三态——
  // 有退出码 / spawn 失败 / 信号终止（status=null 且无 error，带 signal 名）
  const reason = list.error?.message || list.stderr?.trim() || '（无 stderr）';
  const exitNote =
    list.status !== null
      ? `tar 退出码 ${list.status}`
      : list.error
        ? 'tar 退出码未知（spawn 失败）'
        : `tar 被信号终止（${list.signal}）`;
  console.error(`✗ 无法读取 tarball：${reason}（${exitNote}）`);
  process.exit(1);
}

// tarball 内技能 = 含 package/skills/<名>/SKILL.md 的目录名
const packed = new Set<string>();
for (const entry of list.stdout.split('\n')) {
  const match = entry.match(/^package\/skills\/([^/]+)\/SKILL\.md$/);
  if (match) {
    packed.add(match[1]);
  }
}

const repo = new Set<string>(
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

// ---------- 插件三查（agents/<宿主>/plugins/ 两级布局） ----------
if (!fs.existsSync(AGENTS_DIR)) {
  console.error('✗ 仓库缺 agents/ 目录——插件资产无从对账，拒绝发布');
  process.exit(1);
}

// 仓库侧两级枚举：<宿主>/<插件目录名> 复合键（不同宿主可同名插件目录，单键会误合并）
interface RepoPlugin {
  key: string; // <宿主>/<插件目录名>
  dir: string; // 仓库内绝对路径
}
const repoPlugins: RepoPlugin[] = [];
for (const host of fs
  .readdirSync(AGENTS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()) {
  const pluginsDir = path.join(AGENTS_DIR, host, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    continue; // 按需建目录：宿主可只载明其他机制（agents-layout.md §1.3）
  }
  for (const name of fs
    .readdirSync(pluginsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    repoPlugins.push({ key: `${host}/${name}`, dir: path.join(pluginsDir, name) });
  }
}

// 查 1：tarball 内插件 = 含 package/agents/<宿主>/plugins/<名>/package.json 的复合键
const packedPlugins = new Set<string>();
for (const entry of list.stdout.split('\n')) {
  const match = entry.match(/^package\/agents\/([^/]+)\/plugins\/([^/]+)\/package\.json$/);
  if (match) {
    packedPlugins.add(`${match[1]}/${match[2]}`);
  }
}

const repoKeys = repoPlugins.map((plugin) => plugin.key);
const missingPlugins = repoKeys.filter((key) => !packedPlugins.has(key)).sort();
const extraPlugins = [...packedPlugins].filter((key) => !repoKeys.includes(key)).sort();

let pluginFailed = false;
if (missingPlugins.length > 0 || extraPlugins.length > 0) {
  pluginFailed = true;
  console.error('✗ 包内插件清单与仓库 agents/*/plugins/ 清单不一致，拒绝发布：');
  if (missingPlugins.length > 0) {
    console.error(`  缺失（仓库有、包内无）：${missingPlugins.join('、')}`);
  }
  if (extraPlugins.length > 0) {
    console.error(`  多出（包内有、仓库无）：${extraPlugins.join('、')}`);
  }
}

// 查 1.5：包内禁 node_modules（RQ2 报告异常流 A #3 / 问④ f）。与查 1 正交：清单可能
// 完全对得上（插件一个不多不少）而包内仍混着 install 后被白名单卷入的成员依赖目录——
// 逐条列出即拒绝，不给「装出去才知道」留通道。
const nestedNodeModules = list.stdout.split('\n').filter((entry) => entry.includes('node_modules/'));
if (nestedNodeModules.length > 0) {
  console.error('✗ 包内混入 node_modules 条目，拒绝发布（成员内嵌 node_modules 被 pack 卷入 = 结构性坏包）：');
  for (const entry of nestedNodeModules) {
    console.error(`  ${entry}`);
  }
  process.exit(1);
}

// 查 2：每个仓库插件目录过 bundle 清单校验（缺陷消息已点名哪个插件缺哪个要素）
const bundleDefects = repoPlugins.flatMap((plugin) => collectBundleDefects(plugin.dir));
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
  `✓ 对账通过：包内插件清单 = 仓库 agents/*/plugins/ 清单，且每插件过 bundle 校验（${repoPlugins.length} 项）`,
);
