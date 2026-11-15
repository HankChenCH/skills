// 全仓 TS 线收尾断言（spec 20261115-f650 FR-3 收尾，票 20261115-e692）：源码目录全部 .ts、
// 无并存 .js 源文件。期望值独立来源 = 工票改动面与豁免清单（src/ bin/ scripts/ test/ 与
// agents/dsh/plugins/dsh-demo；node_modules 与编译产物不在仓库树常态内——编译 .js 仅存在于发布面
// tarball，postpack 清理 + .gitignore 兜底；interactive.exp 为 expect(1) Tcl 脚本，非 JS）。
// node_modules 跳过（票 20261115-cf39）：插件包 devDependencies 自持 typescript 后，pnpm install
// 在成员目录落盘 node_modules（gitignore 排除、非源码）——walker 照走会把依赖内的 .js 误计 offender。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// 断言范围 = 工票收尾清单的五个根；agents/ 只收 dsh 插件（多宿主多插件时逐目录各自是
// 完整 npm 包，收尾断言随目录加行扩展，不做投机遍历）。
const TS_SOURCE_ROOTS = ['src', 'bin', 'scripts', 'test', 'agents/dsh/plugins/dsh-demo'];

function collectFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue; // 依赖目录非源码（gitignore 同口径）
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(root);
  return files.sort();
}

test('src/ bin/ scripts/ test/ 与 agents/dsh/plugins/dsh-demo 全部为 .ts，无并存 .js 源文件', () => {
  const offenders: string[] = [];
  for (const root of TS_SOURCE_ROOTS) {
    for (const file of collectFiles(path.join(packageRoot, root))) {
      if (/\.(js|mjs|cjs)$/.test(file)) offenders.push(path.relative(packageRoot, file));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `TS 线收尾断言失败：源码目录存在非 .ts 脚本文件（expect(1) Tcl 豁免不含 .js）：\n${offenders.join('\n')}\n` +
      `若为 prepack 编译残留（发布中断未走 postpack 还原），先清理编译产物再复跑（node scripts/postpack.ts）`,
  );
});

test('四个源码目录各自至少含一个 .ts 文件（扫描非空，防空目录假绿）', () => {
  for (const root of ['src', 'bin', 'scripts', 'test']) {
    const tsFiles = collectFiles(path.join(packageRoot, root)).filter((file) => file.endsWith('.ts'));
    assert.ok(
      tsFiles.length > 0,
      `${root}/ 下没有任何 .ts 文件——目录为空或断言范围声明失真`,
    );
  }
});
