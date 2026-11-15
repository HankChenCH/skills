#!/usr/bin/env node
// postpack：还原 prepack 换载的 package.json（bin 回到仓内 .ts 形态）+ 清理发到仓库树的
// 编译产物（bin/*.js、src/**/*.js）——tarball 已含拷贝与换载后的清单，仓库树回到零构建
// 直跑常态。.gitignore 同时兜底 pack 中途失败的场景（失败时发出的 .js 与清单备份不入 git，
// 下次 prepack 的幂等守卫会先还原备份再改写）。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- 清单还原：备份在 = prepack 换载过，用备份覆盖回原态 ----
const manifestBackupPath = path.join(packageRoot, 'package.json.prepack-bak');
if (fs.existsSync(manifestBackupPath)) {
  fs.copyFileSync(manifestBackupPath, path.join(packageRoot, 'package.json'));
  fs.rmSync(manifestBackupPath);
  console.log('✓ postpack：package.json 已还原（bin 回到仓内 bin/infra.ts 形态）');
}

function collectJs(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (full.endsWith('.js')) {
        files.push(full);
      }
    }
  };
  walk(root);
  return files.sort();
}

let removed = 0;
for (const dir of ['src', 'bin']) {
  for (const file of collectJs(path.join(packageRoot, dir))) {
    fs.rmSync(file);
    removed += 1;
  }
}
console.log(`✓ postpack：仓库树编译产物已清理（${removed} 个 .js），恢复零构建直跑常态`);
