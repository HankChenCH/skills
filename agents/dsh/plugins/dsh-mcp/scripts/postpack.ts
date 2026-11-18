#!/usr/bin/env node
// postpack（票 20261115-cf39，比照根包 scripts/postpack.ts）：还原 prepack 换载的
// package.json（main/exports["."] 回源码态）+ 清理 emit 到仓库树的编译产物 index.js 与
// client.js——tarball 已含拷贝与换载后的清单，仓库树回零构建常态。.gitignore 同时兜底
// pack 中途失败的场景（失败时发出的产物与清单备份不入 git，下次 prepack 的幂等守卫会先
// 还原备份再改写）。（client.js 清理随票 20261118-7504 客户端面编译加入。）

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EMITTED = path.join(pluginRoot, 'index.js');
const CLIENT_EMITTED = path.join(pluginRoot, 'client.js');
const manifestBackupPath = path.join(pluginRoot, 'package.json.prepack-bak');

// ---- 清单还原：备份在 = prepack 换载过，用备份覆盖回原态 ----
if (fs.existsSync(manifestBackupPath)) {
  fs.copyFileSync(manifestBackupPath, path.join(pluginRoot, 'package.json'));
  fs.rmSync(manifestBackupPath);
  console.log('✓ postpack：package.json 已还原（main 回源码态 index.ts）');
}

// ---- 编译产物清理：仓库树常态无 .js（repo-ts-shape 断言范围含本插件目录）----
if (fs.existsSync(EMITTED)) {
  fs.rmSync(EMITTED);
  console.log('✓ postpack：仓库树编译产物已清理（index.js），恢复零构建常态');
}
if (fs.existsSync(CLIENT_EMITTED)) {
  fs.rmSync(CLIENT_EMITTED);
  console.log('✓ postpack：仓库树编译产物已清理（client.js），恢复零构建常态');
}
