// 插件安装端到端：临时目录 + 真实 CLI 进程 + 真实文件系统（不 mock）。
// 官方执行体在 OS 边界注入：PATH 里放 shim 可执行文件（记录 argv 并按官方语义写 profile
// 两落点），CLI 真实走 PATH 探测 → spawnSync → 对账 → 锁文件全链，绝不实跑官方 dsh/npx。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = path.join(packageRoot, 'bin', 'infra.ts');
const PKG = '@hankchen/dsh-demo';
// 插件版本唯一来源 = 仓库插件包 package.json（shim 模拟官方安装当前包的实际版本，
// 断言与之共用；版本升位零改动，ticket 20261115-f158：0.1.0 → 0.1.1）
const PLUGIN_VERSION = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'agents', 'dsh', 'plugins', 'dsh-demo', 'package.json'), 'utf8'),
).version;

// shim 模拟官方命令（docs/plugin-assets.md §2.3 两落点语义）：记录完整 argv，
// 解析 `plugin --profile <名> add <包>` 并写 profile 的 package.json——
// dependencies 追加依赖行（版本 = 仓库插件包当前版本，官方装的就是包的实际版本）、
// dsh.profile.bundles 追加包名。dsh 与 npx shim 共用本实现。
// shebang 用测试进程的绝对 node 路径：npx 形态测试的 PATH 只有 shim 目录，env node 不可用。
const SHIM_BODY = (nodeBin: string) => `#!${nodeBin}
const fs = require('node:fs');
const path = require('node:path');
const argv = process.argv.slice(2);
if (process.env.DSH_SHIM_LOG) {
  fs.appendFileSync(process.env.DSH_SHIM_LOG, JSON.stringify(argv) + '\\n');
}
const idx = argv.indexOf('plugin');
if (idx !== -1) {
  const profile = argv[idx + 2];
  const pkgName = argv[idx + 4];
  const dir = path.join(process.env.DSH_HOME, 'profiles', profile);
  fs.mkdirSync(dir, { recursive: true });
  const pkgFile = path.join(dir, 'package.json');
  const pkg = fs.existsSync(pkgFile) ? JSON.parse(fs.readFileSync(pkgFile, 'utf8')) : { name: profile };
  pkg.dependencies = { ...(pkg.dependencies || {}), [pkgName]: ${JSON.stringify(PLUGIN_VERSION)} };
  pkg.dsh = { ...(pkg.dsh || {}), profile: { bundles: [...((pkg.dsh?.profile?.bundles) || []), pkgName] } };
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
}
process.exit(0);
`;

function makeProject(t: TestContext) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-pluginse2e-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function makeDshHome(t: TestContext, profiles: string[] = []) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-dshhome-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  for (const name of profiles) {
    fs.mkdirSync(path.join(home, 'profiles', name), { recursive: true });
  }
  return home;
}

function makeShimDir(t: TestContext, names: string[]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-shim-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const name of names) {
    fs.writeFileSync(path.join(dir, name), SHIM_BODY(process.execPath), { mode: 0o755 });
  }
  return dir;
}

function makeShimLog(t: TestContext) {
  const log = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'infra-shimlog-')), 'calls.log');
  t.after(() => fs.rmSync(path.dirname(log), { recursive: true, force: true }));
  return log;
}

function runCliIn(projectRoot: string, args: string[], env: Record<string, string>) {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function readShimCalls(log: string) {
  return fs
    .readFileSync(log, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readLockfileAt(projectRoot: string) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, '.infra-lock.json'), 'utf8'));
}

// PTY 原始输出含 ANSI 控制序列与折行；断言渲染文本前剥控制序列、压掉空白
const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

function plainText(output: string): string {
  return output.replace(ANSI_RE, '').replace(/\s+/g, '');
}

// 经 expect(1) 在真实 PTY 中跑交互式 CLI（三层菜单：类型 → 插件勾选 → profile 选择）。
// PATTERNS 与 KEYS 等长：发键前等对应提示文本渲染（盲发节奏会让三层连发菜单的
// 按键在 prompt 切换窗口被吞，见 interactive.exp 头注）。
function runInteractiveIn(projectRoot: string, keys: string[], env: Record<string, string>, patterns: string[] = []) {
  const keyTokens = keys
    .map((key) => {
      if (key === '\x1b[B') return 'DOWN';
      if (key === ' ') return 'SPACE';
      if (key === '\r') return 'ENTER';
      throw new Error(`runInteractiveIn 不认识的键：${JSON.stringify(key)}`);
    })
    .join(',');
  const patternTokens = patterns.join(',');
  const result = spawnSync(
    'expect',
    [
      path.join(packageRoot, 'test', 'e2e', 'interactive.exp'),
      process.execPath,
      BIN,
      projectRoot,
      keyTokens,
      patternTokens,
    ],
    { cwd: projectRoot, encoding: 'utf8', timeout: 120000, env: { ...process.env, ...env } },
  );
  if (result.status === null || result.error) {
    throw new Error(`expect runner 异常：${result.error?.message ?? 'signal ' + result.signal}`);
  }
  return { code: result.status, output: result.stdout + result.stderr };
}

test('[FR-3] dsh 在 PATH（注入 shim）：--plugins --profile 免交互安装全链', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);

  const { code, stdout, stderr } = runCliIn(project, ['--plugins', PKG, '--profile', 'dev'], {
    DSH_HOME: dshHome,
    DSH_SHIM_LOG: shimLog,
    PATH: `${shimDir}${path.delimiter}${process.env.PATH}`,
  });
  assert.equal(code, 0, `安装应成功退出：${stderr}`);
  assert.match(stdout, new RegExp(PKG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '摘要应含插件包名');
  assert.match(stdout, /0\.1\.0/, '摘要应记实际落盘版本');

  // 执行体收到的命令形态（组装断言在进程边界）
  assert.deepEqual(readShimCalls(shimLog), [['plugin', '--profile', 'dev', 'add', PKG]]);

  // profile 两落点齐备（shim 按官方语义写入）
  const profilePkg = JSON.parse(fs.readFileSync(path.join(dshHome, 'profiles', 'dev', 'package.json'), 'utf8'));
  assert.equal(profilePkg.dependencies[PKG], PLUGIN_VERSION);
  assert.deepEqual(profilePkg.dsh.profile.bundles, [PKG]);

  // 锁文件插件区记账
  const lockfile = readLockfileAt(project);
  assert.deepEqual(lockfile.plugins[PKG], { version: PLUGIN_VERSION, profile: 'dev', installedAt: lockfile.plugins[PKG].installedAt });
  assert.match(lockfile.plugins[PKG].installedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('[FR-3] dsh 不在 PATH（仅 npx shim）：自动改 npx @deepseek-ai/dsh 执行体形态', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimDir = makeShimDir(t, ['npx']);
  const shimLog = makeShimLog(t);

  const { code, stdout, stderr } = runCliIn(project, ['--plugins', PKG, '--profile', 'dev'], {
    DSH_HOME: dshHome,
    DSH_SHIM_LOG: shimLog,
    PATH: shimDir, // PATH 里没有 dsh，只有 npx shim
  });
  assert.equal(code, 0, `安装应成功退出：${stdout}${stderr}`);
  assert.deepEqual(readShimCalls(shimLog), [['--yes', '@deepseek-ai/dsh', 'plugin', '--profile', 'dev', 'add', PKG]]);
  const lockfile = readLockfileAt(project);
  assert.deepEqual(Object.keys(lockfile.plugins), [PKG]);
});

test('[FR-1] 缺 --profile：报错并列出既有 profile', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['work', 'dev']);

  const { code, stderr } = runCliIn(project, ['--plugins', PKG], { DSH_HOME: dshHome });
  assert.equal(code, 1, '缺 --profile 应失败退出');
  assert.match(stderr, /--profile/);
  assert.match(stderr, /dev/, '应列出既有 profile dev');
  assert.match(stderr, /work/, '应列出既有 profile work');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '报错路径不得写锁文件');
});

test('[FR-3|异常流B] --profile desktop：拒装并说明官方保留名，不执行任何官方命令', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['desktop']);
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);

  const { code, stdout, stderr } = runCliIn(project, ['--plugins', PKG, '--profile', 'desktop'], {
    DSH_HOME: dshHome,
    DSH_SHIM_LOG: shimLog,
    PATH: `${shimDir}${path.delimiter}${process.env.PATH}`,
  });
  const output = stdout + stderr; // 安装失败经 clack 呈现（与技能失败路径同流）
  assert.equal(code, 1, 'desktop 应拒装');
  assert.match(output, /desktop/);
  assert.match(output, /保留/);
  assert.equal(fs.existsSync(shimLog), false, '拒装不得执行任何官方命令');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '拒装不得写锁文件');
});

test('[FR-5] 重跑刷新：锁文件插件区无重复条目、安装时间刷新', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);
  const env = { DSH_HOME: dshHome, DSH_SHIM_LOG: shimLog, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` };

  assert.equal(runCliIn(project, ['--plugins', PKG, '--profile', 'dev'], env).code, 0);
  const first = readLockfileAt(project);
  assert.deepEqual(Object.keys(first.plugins), [PKG]);

  assert.equal(runCliIn(project, ['--plugins', PKG, '--profile', 'dev'], env).code, 0);
  const second = readLockfileAt(project);
  assert.deepEqual(Object.keys(second.plugins), [PKG], '重跑不应产生重复条目');
  assert.deepEqual(second.plugins[PKG].profile, 'dev');
  assert.deepEqual(second.plugins[PKG].version, PLUGIN_VERSION);
});

test('[FR-1] 交互路径三层菜单（类型→插件→profile）与旗标路径落盘一致', async (t) => {
  const envOf = (dshHome: string, shimLog: string) => ({
    DSH_HOME: dshHome,
    DSH_SHIM_LOG: shimLog,
    PATH: `${makeShimDir(t, ['dsh'])}${path.delimiter}${process.env.PATH}`,
  });
  const interactiveProject = makeProject(t);
  const interactiveHome = makeDshHome(t, ['work', 'dev']);
  const interactiveLog = makeShimLog(t);
  // 第一层 DOWN 到插件 → ENTER；第二层 SPACE 勾选唯一条目 → ENTER；第三层回车选首个 profile（dev）
  const picked = await runInteractiveIn(
    interactiveProject,
    ['\x1b[B', '\r', ' ', '\r', '\r'],
    envOf(interactiveHome, interactiveLog),
    ['选择要安装的资产类型', '', '选择要安装的插件', '', '选择目标 dsh profile'],
  );
  assert.equal(picked.code, 0, '交互插件安装应成功退出');

  const flagProject = makeProject(t);
  const flagHome = makeDshHome(t, ['dev']);
  const flagLog = makeShimLog(t);
  const flagged = runCliIn(flagProject, ['--plugins', PKG, '--profile', 'dev'], envOf(flagHome, flagLog));
  assert.equal(flagged.code, 0, `旗标安装应成功退出：${flagged.stderr}`);

  // 两路径落盘一致：profile package.json 完全一致；锁文件插件区同键同版本同 profile（安装时间除外）
  const a = JSON.parse(fs.readFileSync(path.join(interactiveHome, 'profiles', 'dev', 'package.json'), 'utf8'));
  const b = JSON.parse(fs.readFileSync(path.join(flagHome, 'profiles', 'dev', 'package.json'), 'utf8'));
  assert.deepEqual(a, b);
  const la = readLockfileAt(interactiveProject).plugins;
  const lb = readLockfileAt(flagProject).plugins;
  assert.deepEqual(Object.keys(la), Object.keys(lb));
  for (const name of Object.keys(la)) {
    assert.deepEqual({ version: la[name].version, profile: la[name].profile }, { version: lb[name].version, profile: lb[name].profile });
  }
});

test('[FR-1] 交互第二层条目以正名呈现、提示为包 description，完成摘要逐条列对账结果', async (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);
  // 期望字面独立来源：agents/dsh/plugins/dsh-demo/package.json（正名 = name、提示 = description、版本随包）
  const demoPkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'agents', 'dsh', 'plugins', 'dsh-demo', 'package.json'), 'utf8'));

  // 第一层 DOWN 到插件 → ENTER；第二层 SPACE 勾选 → ENTER；第三层回车选 dev
  const picked = await runInteractiveIn(
    project,
    ['\x1b[B', '\r', ' ', '\r', '\r'],
    { DSH_HOME: dshHome, DSH_SHIM_LOG: shimLog, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` },
    ['选择要安装的资产类型', '', '选择要安装的插件', '', '选择目标 dsh profile'],
  );
  assert.equal(picked.code, 0, '交互插件安装应成功退出');

  const plain = plainText(picked.output);
  assert.ok(plain.includes(demoPkg.name), `第二层应以正名呈现条目：${demoPkg.name}`);
  assert.ok(plain.includes(demoPkg.description.replace(/\s+/g, '')), `第二层提示应为包 description：${demoPkg.description}`);
  assert.ok(
    plain.includes(`已安装插件${demoPkg.name}@${demoPkg.version}→dshprofiledev（对账：依赖行+bundles行齐备）`),
    '完成摘要应逐条列插件名/版本与对账状态',
  );
});

test('[FR-3|异常流B] 交互三层选 desktop：拒装并说明官方保留名，不执行官方命令、不写锁文件', async (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['desktop', 'dev']); // 按名排序 desktop 居首，回车即选中它
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);

  // 同款三层按键：类型→插件→profile；第三层回车选排序首项 desktop
  const picked = await runInteractiveIn(
    project,
    ['\x1b[B', '\r', ' ', '\r', '\r'],
    { DSH_HOME: dshHome, DSH_SHIM_LOG: shimLog, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` },
    ['选择要安装的资产类型', '', '选择要安装的插件', '', '选择目标 dsh profile'],
  );
  const output = picked.output.replace(ANSI_RE, '');
  assert.equal(picked.code, 1, '交互选 desktop 应拒装（退出码 1）');
  assert.match(output, /desktop/);
  assert.match(output, /保留/, '应说明官方保留名行为');
  assert.equal(fs.existsSync(shimLog), false, '拒装不得执行任何官方命令');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '拒装不得写锁文件');
});
