#!/usr/bin/env node
// 插件包 bundle 清单校验器（spec 20261115-495e FR-2，规范文档 docs/plugin-assets.md §1.2–§1.3）。
// 接口窄：进插件包目录，出缺陷清单（空 = 通过）。核对 dsh 官方 bundle 形态四要素——
//   1. package.json 声明 dsh.bundle.patch（缺它装进 profile 只作普通依赖、不进插件树，need F1）；
//   2. files 清单含 patch 文件（npm 白名单外文件不随包分发，清单缺文件 = 装出去的包坏）；
//   3. patch 清单以包名引用自己（patch 声明作用于插件包自己）；
//   4. 插件模块导出 name 与 apply(ctx)（静态读源码；套件约定 ESM + 内联导出，照抄 demo 即在此形态内）。
// scripts/verify-pack.mjs 的插件侧复用本实现；独立调用：
//
//   node scripts/verify-bundle.mjs <插件包目录>...

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// package.json 里的声明值（'./cordis.patch.yml'）与 files 条目（'cordis.patch.yml'）同法归一后再比对
function normalizeEntry(entry) {
  return entry.replace(/^\.\//, '');
}

// 要素 3 的判定：包名作为 YAML 键出现在映射行（'@scope' 开头按 YAML 规则须带引号，引号两侧都收）
function patchSelfReferencesName(patchText, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^[\\s-]*['"]?${escaped}['"]?\\s*:`, 'm').test(patchText);
}

export function collectBundleDefects(pluginDir) {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(pluginDir, 'package.json'), 'utf8'));
  } catch (error) {
    return [`${pluginDir}：package.json 无法读取（${error.message}）`];
  }
  const name = pkg.name;
  const defects = [];

  if (!name) {
    defects.push(`${path.basename(pluginDir)}：package.json 缺 name——patch 引用名无从对账`);
  }

  // 要素 1：dsh.bundle.patch 声明。声明缺失时后续两查（files 含 patch、patch 引用名）
  // 无从定位 patch 文件，随要素 1 一并缺位，不再各自造一条连带缺陷。
  const patchDeclared = pkg.dsh?.bundle?.patch;
  const patchTarget =
    typeof patchDeclared === 'string' && patchDeclared !== '' ? normalizeEntry(patchDeclared) : null;
  if (!patchTarget) {
    defects.push(`${name ?? path.basename(pluginDir)}：package.json 缺 dsh.bundle.patch 声明——没有它装进 profile 只作普通依赖、不进插件树`);
  }

  // 要素 2：files 清单含 patch 文件
  if (patchTarget) {
    const files = Array.isArray(pkg.files) ? pkg.files.map(normalizeEntry) : null;
    if (!files) {
      defects.push(`${name}：package.json 缺 files 清单——patch 文件不会随包分发`);
    } else if (!files.includes(patchTarget)) {
      defects.push(`${name}：files 清单缺 ${patchTarget}——npm 白名单外文件不随包分发，装出去的包没有清单`);
    }
  }

  // 要素 3：patch 清单以包名引用自己
  if (patchTarget && name) {
    let patchText;
    try {
      patchText = fs.readFileSync(path.join(pluginDir, patchTarget), 'utf8');
    } catch (error) {
      defects.push(`${name}：patch 文件读不到（${patchTarget}，${error.message}）`);
    }
    if (patchText !== undefined && !patchSelfReferencesName(patchText, name)) {
      defects.push(`${name}：patch 清单未以包名引用自己（${patchTarget} 里没有以 ${name} 为键的行）`);
    }
  }

  // 要素 4：插件模块导出 name 与 apply(ctx)
  const mainEntry =
    typeof pkg.main === 'string' && pkg.main !== '' ? normalizeEntry(pkg.main) : null;
  if (!mainEntry) {
    defects.push(`${name ?? path.basename(pluginDir)}：package.json 缺 main——无法定位插件模块入口`);
  } else {
    let source;
    try {
      source = fs.readFileSync(path.join(pluginDir, mainEntry), 'utf8');
    } catch (error) {
      defects.push(`${name ?? path.basename(pluginDir)}：插件模块文件读不到（${mainEntry}，${error.message}）`);
    }
    if (source !== undefined) {
      if (!/\bexport\s+(?:const|let|var)\s+name\b/.test(source)) {
        defects.push(`${name ?? path.basename(pluginDir)}：插件模块（${mainEntry}）未导出 name`);
      }
      if (!/\bexport\s+(?:(?:async\s+)?function|(?:const|let|var))\s+apply\b/.test(source)) {
        defects.push(`${name ?? path.basename(pluginDir)}：插件模块（${mainEntry}）未导出 apply(ctx)`);
      }
    }
  }

  return defects;
}

function runCli(args) {
  if (args.length === 0) {
    console.error('用法：node scripts/verify-bundle.mjs <插件包目录>...');
    return 1;
  }
  let failed = 0;
  for (const dir of args) {
    const defects = collectBundleDefects(dir);
    if (defects.length > 0) {
      failed += 1;
      console.error(`✗ bundle 校验不过：${dir}`);
      for (const defect of defects) console.error(`  - ${defect}`);
    } else {
      console.log(`✓ bundle 校验通过（四要素齐备）：${dir}`);
    }
  }
  return failed > 0 ? 1 : 0;
}

const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === thisFile;
if (invokedDirectly) {
  process.exit(runCli(process.argv.slice(2)));
}
