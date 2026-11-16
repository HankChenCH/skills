// 分层结构契约（票 20261116-f761，承 8975「结构断言验证」先例的静态断言手法）。
//
// 断言 spec 20261116-2c58 的分层拍板在仓库树上成立：
//   1. 三层在位——程序装配层（src/program.ts）、命令定义层（src/commands/<名>/，每子命令
//      一目录）、安装内核层（src/kernel/ 十模块，票 20261116-1875 归位）。
//   2. 方向单一——内核零上行依赖（只准 intra-kernel './' 导入）；命令定义层经叶模块
//      src/context.ts 取上下文，不反向 import 装配层。
//   3. 「新增子命令 = 加命令目录 + 装配层注册一处」口径——commands/*/index.ts（命令工厂）
//      只被 src/program.ts 引用，装配层对每个命令目录恰好注册一次。
//   4. bin 为装配瘦壳——相对导入只指向程序装配层，不直触内核/命令定义/旧旗标路径。
// 期望值独立来源 = spec 分层实现决策与工票改动面（目录与模块清单为既定事实，非实现推导）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readSource = (rel: string): string => fs.readFileSync(path.join(packageRoot, rel), 'utf8');

// 安装内核十模块清单（票 20261116-1875 归位时的既定事实）
const KERNEL_MODULES = [
  'agent-dirs',
  'asset-map',
  'catalog',
  'dsh-command',
  'dsh-profiles',
  'installer',
  'lockfile',
  'menu',
  'plugin-install',
  'reconcile',
];

function commandDirs(): string[] {
  return fs
    .readdirSync(path.join(packageRoot, 'src', 'commands'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function collectTsFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (full.endsWith('.ts')) files.push(full);
    }
  };
  walk(root);
  return files;
}

test('三层在位：程序装配层、命令定义层（每子命令一目录）、安装内核层', () => {
  assert.ok(fs.existsSync(path.join(packageRoot, 'src', 'program.ts')), '程序装配层 src/program.ts 应在位');
  const dirs = commandDirs();
  assert.ok(dirs.includes('skill'), '命令定义层应含 skill 命令目录');
  for (const dir of dirs) {
    assert.ok(
      fs.existsSync(path.join(packageRoot, 'src', 'commands', dir, 'index.ts')),
      `命令目录 src/commands/${dir}/ 应有 index.ts（命令工厂）`,
    );
  }
  const kernelFiles = fs
    .readdirSync(path.join(packageRoot, 'src', 'kernel'))
    .filter((name) => name.endsWith('.ts'))
    .sort();
  assert.deepEqual(
    kernelFiles,
    KERNEL_MODULES.map((m) => `${m}.ts`),
    '安装内核层应为十模块（票 20261116-1875 归位清单）',
  );
});

test('安装内核零上行依赖：kernel/*.ts 只准 intra-kernel 相对导入', () => {
  const offenders: string[] = [];
  for (const name of KERNEL_MODULES) {
    const source = readSource(path.join('src', 'kernel', `${name}.ts`));
    if (/from\s+'\.\.\//.test(source)) {
      offenders.push(`src/kernel/${name}.ts`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `内核出现上行导入（装配层/命令定义层/旧旗标路径），分层方向被破坏：\n${offenders.join('\n')}`,
  );
});

test('命令工厂注册收敛装配层一处：commands/*/index.ts 仅被 src/program.ts 引用', () => {
  const offenders: string[] = [];
  for (const file of [...collectTsFiles(path.join(packageRoot, 'src')), ...collectTsFiles(path.join(packageRoot, 'bin'))]) {
    const source = fs.readFileSync(file, 'utf8');
    for (const dir of commandDirs()) {
      if (source.includes(`commands/${dir}/index.ts`) && path.relative(packageRoot, file) !== path.join('src', 'program.ts')) {
        offenders.push(`${path.relative(packageRoot, file)}（引用 commands/${dir}/index.ts）`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `命令工厂被装配层之外引用——新增子命令必须只改命令目录 + 装配层注册一处：\n${offenders.join('\n')}`,
  );
});

test('装配层对每个命令目录恰好注册一次（新增子命令 = 加命令目录 + 注册一处）', () => {
  const programSource = readSource(path.join('src', 'program.ts'));
  const dirs = commandDirs();
  for (const dir of dirs) {
    const occurrences = programSource.split(`commands/${dir}/index.ts`).length - 1;
    assert.equal(occurrences, 1, `装配层应恰好引用 src/commands/${dir}/index.ts 一次（现 ${occurrences} 次）`);
  }
  const registrations = programSource.split('program.addCommand(').length - 1;
  assert.equal(
    registrations,
    dirs.length,
    `装配层 addCommand 注册数（${registrations}）应等于命令目录数（${dirs.length}）`,
  );
});

test('bin 为装配瘦壳：相对导入只指向程序装配层', () => {
  const source = readSource(path.join('bin', 'infra.ts'));
  const relativeImports = [...source.matchAll(/from\s+'(\.[^']+)'/g)].map((match) => match[1]);
  assert.deepEqual(
    relativeImports.filter((spec) => spec !== '../src/program.ts'),
    [],
    `bin 只准 import 程序装配层（../src/program.ts）——内核/命令定义/旧旗标路径/clack 一律经装配层，现含：${relativeImports.join('、')}`,
  );
});
