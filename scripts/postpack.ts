#!/usr/bin/env node
// postpack：清理 prepack 发到仓库树的编译产物（bin/*.js、src/**/*.js）——tarball 已含拷贝，
// 清理不影响打包产物，仓库树回到零构建直跑常态。.gitignore 同时兜底 pack 中途失败的场景
//（失败时发出的 .js 残留不入 git，下次 pack 的 postpack 会再清一遍）。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
