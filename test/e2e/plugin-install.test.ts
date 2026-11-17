// 插件安装端到端（票 20261116-ccfb 改写新命令面 plugin add）：临时目录 + 真实 CLI 进程 +
// 真实文件系统（不 mock）。官方执行体在 OS 边界注入：PATH 里放 shim 可执行文件（记录 argv
// 并按官方语义写 profile 两落点），CLI 真实走 PATH 探测 → spawnSync → 对账 → 锁文件全链，
// 绝不实跑官方 dsh/npx。
// 票 20261116-bfcf 硬切：旧旗标 --plugins 路径退役（按未知旗标口径报错，矩阵在 install.test
// 顶层命令面节），本文件只承载 plugin add 新命令面。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderTopHelp } from '../../src/program.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = path.join(packageRoot, 'bin', 'infra.ts');
const PKG = '@hankchen/dsh-demo';
// 插件版本唯一来源 = 仓库插件包 package.json（shim 模拟官方安装当前包的实际版本，
// 断言与之共用；版本升位零改动）
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

// 经 expect(1) 在真实 PTY 中跑交互式 CLI（plugin add 两层：插件勾选 → profile 选择/预置跳过）。
// PATTERNS 与 KEYS 等长：发键前等对应提示文本渲染（盲发节奏会让连发菜单的按键在 prompt
// 切换窗口被吞，见 interactive.exp 头注）。cliArgs 为转交 CLI 的参数（如 "plugin add"）；
// KEYS 记号 DOWN/SPACE/ENTER/CTRLC 外支持 LIT-<文本> 直通（clack.text 字面输入）；
// binPath 可覆盖被测入口（缺省仓库 bin，暂存破损包场景传入暂存 bin）。
function runInteractiveIn(
  projectRoot: string,
  keys: string[],
  env: Record<string, string>,
  patterns: string[] = [],
  cliArgs = '',
  binPath = BIN,
) {
  const keyTokens = keys
    .map((key) => {
      if (key === '\x1b[B') return 'DOWN';
      if (key === ' ') return 'SPACE';
      if (key === '\r') return 'ENTER';
      if (key === '\x03') return 'CTRLC';
      if (key.startsWith('LIT-')) return key;
      throw new Error(`runInteractiveIn 不认识的键：${JSON.stringify(key)}`);
    })
    .join(',');
  const patternTokens = patterns.join(',');
  const result = spawnSync(
    'expect',
    [
      path.join(packageRoot, 'test', 'e2e', 'interactive.exp'),
      process.execPath,
      binPath,
      projectRoot,
      keyTokens,
      patternTokens,
      cliArgs,
    ],
    { cwd: projectRoot, encoding: 'utf8', timeout: 120000, env: { ...process.env, ...env } },
  );
  if (result.status === null || result.error) {
    throw new Error(`expect runner 异常：${result.error?.message ?? 'signal ' + result.signal}`);
  }
  return { code: result.status, output: result.stdout + result.stderr };
}

// 期望值独立来源（spec 20261116-2c58 命令面契约原文，tests 逐字锚定）
const PROFILE_REQUIRED_LISTED = [
  '✗ 插件安装需要 --profile <名> 指定目标 dsh profile。',
  '  既有 profile：dev、work',
  '  示例：npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev',
].join('\n') + '\n';
const PROFILE_REQUIRED_NONE = [
  '✗ 插件安装需要 --profile <名> 指定目标 dsh profile。',
  '  未发现既有 profile（$DSH_HOME/profiles/，缺省 ~/.dsh/profiles/）——可用任意新名。',
  '  示例：npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev',
].join('\n') + '\n';
const ERR_PROFILE_VALUE =
  '✗ --profile 需要一个 profile 名（如 plugin add @hankchen/dsh-demo --profile dev）\n';
const ERR_TTY_GUARD =
  '✗ 交互选择需要终端（TTY）；非交互请改用 skill add <名...>、skill add --all 或 plugin add <名...> --profile <名>\n';

// ---------- [FR-1] plugin add 带名免交互安装全链 ----------

test('[FR-1] dsh 在 PATH（注入 shim）：plugin add 免交互安装全链（argv/两落点/锁文件/摘要）', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);

  const { code, stdout, stderr } = runCliIn(project, ['plugin', 'add', PKG, '--profile', 'dev'], {
    DSH_HOME: dshHome,
    DSH_SHIM_LOG: shimLog,
    PATH: `${shimDir}${path.delimiter}${process.env.PATH}`,
  });
  assert.equal(code, 0, `安装应成功退出：${stderr}`);
  assert.match(stdout, new RegExp(PKG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '摘要应含插件包名');
  assert.match(
    stdout,
    new RegExp(
      `已安装插件 ${PKG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@${PLUGIN_VERSION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} → dsh profile dev`,
    ),
    '摘要应记插件落盘版本',
  );

  // 执行体收到的命令形态（组装断言在进程边界；spec FR-1 场景原文形态）
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

test('[FR-4] dsh 不在 PATH（仅 npx shim）：plugin add 自动回退 npx @deepseek-ai/dsh 执行体形态', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimDir = makeShimDir(t, ['npx']);
  const shimLog = makeShimLog(t);

  const { code, stdout, stderr } = runCliIn(project, ['plugin', 'add', PKG, '--profile', 'dev'], {
    DSH_HOME: dshHome,
    DSH_SHIM_LOG: shimLog,
    PATH: shimDir, // PATH 里没有 dsh，只有 npx shim
  });
  assert.equal(code, 0, `安装应成功退出：${stdout}${stderr}`);
  assert.deepEqual(readShimCalls(shimLog), [['--yes', '@deepseek-ai/dsh', 'plugin', '--profile', 'dev', 'add', PKG]]);
  const lockfile = readLockfileAt(project);
  assert.deepEqual(Object.keys(lockfile.plugins), [PKG]);
});

test('[FR-4] 重跑刷新（新形态）：锁文件插件区无重复条目', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);
  const env = { DSH_HOME: dshHome, DSH_SHIM_LOG: shimLog, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` };

  assert.equal(runCliIn(project, ['plugin', 'add', PKG, '--profile', 'dev'], env).code, 0);
  assert.equal(runCliIn(project, ['plugin', 'add', PKG, '--profile', 'dev'], env).code, 0);
  const lockfile = readLockfileAt(project);
  assert.deepEqual(Object.keys(lockfile.plugins), [PKG], '重跑不应产生重复条目');
  assert.deepEqual(lockfile.plugins[PKG].profile, 'dev');
  assert.deepEqual(lockfile.plugins[PKG].version, PLUGIN_VERSION);
});

// ---------- [FR-4] plugin add 校验报错路径（文案 = spec 命令面契约原文，逐字节） ----------

test('[FR-4] 缺 --profile 且有既有项：三行结构逐字节（既有列表 + 新形态示例行）', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['work', 'dev']);

  const { code, stdout, stderr } = runCliIn(project, ['plugin', 'add', PKG], { DSH_HOME: dshHome });
  assert.equal(code, 1, '缺 --profile 应失败退出');
  assert.equal(stdout, '');
  assert.equal(stderr, PROFILE_REQUIRED_LISTED);
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '报错路径不得写锁文件');
});

test('[FR-4] 缺 --profile 且无既有项：三行结构第二行为任意新名说明行', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t); // 无 profiles 目录

  const { code, stderr } = runCliIn(project, ['plugin', 'add', PKG], { DSH_HOME: dshHome });
  assert.equal(code, 1);
  assert.equal(stderr, PROFILE_REQUIRED_NONE);
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false);
});

test('[FR-4] --profile 缺值：spec 契约原文报错（commander 值必需经出口通道转译）', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);

  const { code, stdout, stderr } = runCliIn(project, ['plugin', 'add', PKG, '--profile'], { DSH_HOME: dshHome });
  assert.equal(code, 1);
  assert.equal(stdout, '');
  assert.equal(stderr, ERR_PROFILE_VALUE);
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false);
});

test('[FR-4] plugin add 不存在的插件名：报错列可用插件清单、退出 1、零落盘', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimLog = makeShimLog(t);

  const { code, stdout, stderr } = runCliIn(project, ['plugin', 'add', '@hankchen/no-such', '--profile', 'dev'], {
    DSH_HOME: dshHome,
    DSH_SHIM_LOG: shimLog,
  });
  assert.equal(code, 1, '未知插件名应失败退出');
  assert.equal(stdout, '');
  // 期望字面为编目快照（独立来源 = 仓库 agents/dsh/plugins/ 目录事实）：新插件包入编目后
  // 快照随之更新（票 20261117-0ea9：dsh-mcp 入包，可用清单两项，按编目 sort 序）。
  assert.equal(
    stderr,
    `✗ 以下插件不在套件包内：@hankchen/no-such；可用插件：${PKG}、@hankchen/dsh-mcp\n`,
  );
  assert.equal(fs.existsSync(shimLog), false, '未知插件名不得执行官方命令');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false);
});

test('[FR-4] --profile desktop：拒装并说明官方保留名，不执行任何官方命令', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['desktop']);
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);

  const { code, stdout, stderr } = runCliIn(project, ['plugin', 'add', PKG, '--profile', 'desktop'], {
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

test('[FR-3] 非 TTY plugin add 无参：守卫文案报错、退出 1、零落盘（双命令齐验之 plugin 侧）', (t) => {
  const project = makeProject(t);
  const { code, stdout, stderr } = runCliIn(project, ['plugin', 'add'], {});
  assert.equal(code, 1, '非 TTY 无参应失败退出');
  assert.equal(stdout, '');
  assert.equal(stderr, ERR_TTY_GUARD);
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '守卫路径不得写锁文件');
});

// ---------- [FR-1] plugin add 帮助定稿（票 20261116-bfcf）----------

test('[FR-1] 顶层 --help 含 plugin add 用法示例、不含旧旗标名', (t) => {
  const project = makeProject(t);
  const { code, stdout, stderr } = runCliIn(project, ['--help'], {});
  assert.equal(code, 0);
  assert.equal(stdout, `${renderTopHelp()}\n`, '顶层帮助应全文走 stdout 且恰一尾换行');
  assert.equal(stderr, '');
  for (const needle of [
    'npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev',
    'plugin add [名...] --profile <名>',
  ]) {
    assert.ok(stdout.includes(needle), `顶层帮助应含 ${needle}`);
  }
  for (const retired of ['--skills', '--plugins']) {
    assert.equal(stdout.includes(retired), false, `顶层帮助不得含旧旗标名 ${retired}`);
  }
});

test('[FR-1] plugin add --help 打印命令级帮助：用法与示例、不含旧旗标名、退出码 0', (t) => {
  const project = makeProject(t);
  const { code, stdout, stderr } = runCliIn(project, ['plugin', 'add', '--help'], {});
  assert.equal(code, 0);
  assert.equal(stderr, '');
  for (const needle of ['plugin add [名...]', '--profile <名>', 'plugin add @hankchen/dsh-demo --profile dev']) {
    assert.ok(stdout.includes(needle), `plugin add --help 应含 ${needle}`);
  }
  for (const retired of ['--skills', '--plugins']) {
    assert.equal(stdout.includes(retired), false, `plugin add --help 不得含旧旗标名 ${retired}`);
  }
});

test('[FR-1] plugin 无动词打印该命令帮助、退出码 0', (t) => {
  const project = makeProject(t);
  const { code, stdout, stderr } = runCliIn(project, ['plugin'], {});
  assert.equal(code, 0);
  assert.equal(stderr, '');
  assert.ok(stdout.includes('add'), 'plugin 命令帮助应列出 add 动词');
});

// ---------- [FR-1/FR-4] plugin add 交互路径（PTY，两层：插件勾选 → profile）----------

test('[FR-1] PTY plugin add 无参选插件 + 选 profile：shim 调用与所选组合一致、落盘与带名路径一致', async (t) => {
  const interactiveProject = makeProject(t);
  const interactiveHome = makeDshHome(t, ['work', 'dev']);
  const shimDir = makeShimDir(t, ['dsh']);
  const interactiveLog = makeShimLog(t);
  // 插件多选 SPACE 勾选唯一条目 → ENTER 确认（盲发，0.4s 节奏）→ profile 单选渲染后 ENTER 选首个（dev 居首）
  const picked = await runInteractiveIn(
    interactiveProject,
    [' ', '\r', '\r'],
    { DSH_HOME: interactiveHome, DSH_SHIM_LOG: interactiveLog, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` },
    ['选择要安装的插件', '', '选择目标 dsh profile'],
    'plugin add',
  );
  assert.equal(picked.code, 0, '交互插件安装应成功退出');
  assert.deepEqual(readShimCalls(interactiveLog), [['plugin', '--profile', 'dev', 'add', PKG]]);

  const namedProject = makeProject(t);
  const namedHome = makeDshHome(t, ['dev']);
  const namedLog = makeShimLog(t);
  const named = runCliIn(namedProject, ['plugin', 'add', PKG, '--profile', 'dev'], {
    DSH_HOME: namedHome,
    DSH_SHIM_LOG: namedLog,
    PATH: `${shimDir}${path.delimiter}${process.env.PATH}`,
  });
  assert.equal(named.code, 0, `带名安装应成功退出：${named.stderr}`);

  // 两路径落盘一致：profile package.json 完全一致；锁文件插件区同键同版本同 profile（安装时间除外）
  const a = JSON.parse(fs.readFileSync(path.join(interactiveHome, 'profiles', 'dev', 'package.json'), 'utf8'));
  const b = JSON.parse(fs.readFileSync(path.join(namedHome, 'profiles', 'dev', 'package.json'), 'utf8'));
  assert.deepEqual(a, b);
  const la = readLockfileAt(interactiveProject).plugins;
  const lb = readLockfileAt(namedProject).plugins;
  assert.deepEqual(Object.keys(la), Object.keys(lb));
  for (const name of Object.keys(la)) {
    assert.deepEqual(
      { version: la[name].version, profile: la[name].profile },
      { version: lb[name].version, profile: lb[name].profile },
    );
  }
});

test('[FR-1] PTY plugin add --profile dev 无名预置：仅提示插件多选、不再提示 profile、shim 用预置 profile', async (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['work', 'dev']);
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);
  // 只发插件多选两键；若实现仍提示 profile 选择，expect 将等不到 EOF 而超时 124 → 本测红
  const picked = await runInteractiveIn(
    project,
    [' ', '\r'],
    { DSH_HOME: dshHome, DSH_SHIM_LOG: shimLog, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` },
    ['选择要安装的插件', ''],
    'plugin add --profile dev',
  );
  assert.equal(picked.code, 0, '预置 profile 交互安装应成功退出');
  assert.match(plainText(picked.output), /已安装插件/, '应走完安装');
  assert.equal(plainText(picked.output).includes('选择目标dshprofile'), false, '预置 profile 时不得渲染 profile 选择提示');
  assert.deepEqual(readShimCalls(shimLog), [['plugin', '--profile', 'dev', 'add', PKG]]);
  const lockfile = readLockfileAt(project);
  assert.deepEqual(lockfile.plugins[PKG].profile, 'dev');
});

test('[FR-1] PTY plugin add 条目以正名呈现、提示为包 description，完成摘要逐条列对账结果', async (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);
  // 期望字面独立来源：agents/dsh/plugins/dsh-demo/package.json（正名 = name、提示 = description、版本随包）
  const demoPkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'agents', 'dsh', 'plugins', 'dsh-demo', 'package.json'), 'utf8'));

  const picked = await runInteractiveIn(
    project,
    [' ', '\r', '\r'],
    { DSH_HOME: dshHome, DSH_SHIM_LOG: shimLog, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` },
    ['选择要安装的插件', '', '选择目标 dsh profile'],
    'plugin add',
  );
  assert.equal(picked.code, 0, '交互插件安装应成功退出');

  const plain = plainText(picked.output);
  assert.ok(plain.includes(demoPkg.name), `条目应以正名呈现：${demoPkg.name}`);
  assert.ok(plain.includes(demoPkg.description.replace(/\s+/g, '')), `条目提示应为包 description：${demoPkg.description}`);
  assert.ok(
    plain.includes(`已安装插件${demoPkg.name}@${demoPkg.version}→dshprofiledev（对账：依赖行+bundles行齐备）`),
    '完成摘要应逐条列插件名/版本与对账状态',
  );
});

test('[FR-4] PTY plugin add 选 desktop profile：拒装并说明官方保留名、零官方调用、零锁文件', async (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['desktop', 'dev']); // 按名排序 desktop 居首，回车即选中它
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);

  const picked = await runInteractiveIn(
    project,
    [' ', '\r', '\r'],
    { DSH_HOME: dshHome, DSH_SHIM_LOG: shimLog, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` },
    ['选择要安装的插件', '', '选择目标 dsh profile'],
    'plugin add',
  );
  const output = picked.output.replace(ANSI_RE, '');
  assert.equal(picked.code, 1, '交互选 desktop 应拒装（退出码 1）');
  assert.match(output, /desktop/);
  assert.match(output, /保留/, '应说明官方保留名行为');
  assert.equal(fs.existsSync(shimLog), false, '拒装不得执行任何官方命令');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '拒装不得写锁文件');
});

// ---------- [FR-3] PTY 取消/空选（评审增量 #2，与 skill 侧 install.test 同款口径）----------

test('[FR-3] PTY plugin add 勾选后取消（Ctrl-C）：退出 0 且零落盘、零官方调用', async (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);

  const picked = await runInteractiveIn(
    project,
    ['\x03'],
    { DSH_HOME: dshHome, DSH_SHIM_LOG: shimLog, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` },
    ['选择要安装的插件'],
    'plugin add',
  );
  assert.equal(picked.code, 0, '取消应正常退出（现行交互纪律）');
  assert.equal(fs.existsSync(shimLog), false, '取消不得执行官方命令');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '取消不得写锁文件');
});

test('[FR-3] PTY plugin add 确认空选：退出 0 且零落盘、零官方调用', async (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);

  const picked = await runInteractiveIn(
    project,
    ['\r'],
    { DSH_HOME: dshHome, DSH_SHIM_LOG: shimLog, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` },
    ['选择要安装的插件'],
    'plugin add',
  );
  assert.equal(picked.code, 0, '空选确认应正常退出（现行交互纪律）');
  assert.equal(fs.existsSync(shimLog), false, '空选不得执行官方命令');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '空选不得写锁文件');
});

// ---------- [FR-1] PTY 无既有 profile 输入新名（评审增量 #3）----------

test('[FR-1] PTY plugin add 无既有 profile 输入新名：shim 收到该新名 profile、锁文件记账', async (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t); // 无 profiles 目录 → 交互提示输入新名
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);
  // SPACE 勾选 → ENTER 确认（盲发）→ 文本提示渲染后 LIT- 键入新名 → ENTER 提交（clack.text）
  const picked = await runInteractiveIn(
    project,
    [' ', '\r', 'LIT-infra-new', '\r'],
    { DSH_HOME: dshHome, DSH_SHIM_LOG: shimLog, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` },
    ['选择要安装的插件', '', '未发现既有 dsh profile', ''],
    'plugin add',
  );
  assert.equal(picked.code, 0, '输入新名安装应成功退出');
  assert.deepEqual(readShimCalls(shimLog), [['plugin', '--profile', 'infra-new', 'add', PKG]]);
  const lockfile = readLockfileAt(project);
  assert.deepEqual(lockfile.plugins[PKG].profile, 'infra-new');
});

// ---------- [FR-3|评审增量 #1 守护] 编目失败 = ✗ 通道 + 退出 1（取消/空选外无豁免）----------
// 触发方式：整包暂存到临时目录（node_modules 符号链接带回工具链，dsh-ts-loading 同款）并写坏
// 插件包清单——编目缺陷只可能来自包内容，暂存隔离不触仓库树；编目在首个提示渲染前失败，
// PTY 下等 ✗ 行渲染后补一键（无操作）走 EOF。

test('[FR-3] PTY plugin add 编目失败：✗ 通道退出 1、零官方调用、零锁文件', async (t) => {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-stagedefect-'));
  t.after(() => fs.rmSync(stage, { recursive: true, force: true }));
  const staged = path.join(stage, 'package');
  fs.cpSync(packageRoot, staged, {
    recursive: true,
    filter: (source) => {
      const rel = path.relative(packageRoot, source);
      if (rel === '') return true;
      const top = rel.split(path.sep)[0];
      return ['package.json', 'bin', 'src', 'skills', 'agents'].includes(top) && !source.includes('node_modules');
    },
  });
  fs.symlinkSync(path.join(packageRoot, 'node_modules'), path.join(staged, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(staged, 'agents', 'dsh', 'plugins', 'dsh-demo', 'package.json'), '{ not-json');

  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimDir = makeShimDir(t, ['dsh']);
  const shimLog = makeShimLog(t);

  const picked = await runInteractiveIn(
    project,
    ['\r'],
    { DSH_HOME: dshHome, DSH_SHIM_LOG: shimLog, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` },
    ['编目发现缺陷'],
    'plugin add',
    path.join(staged, 'bin', 'infra.ts'),
  );
  const output = picked.output.replace(ANSI_RE, '');
  assert.equal(picked.code, 1, '编目失败应按错误口径退出 1（非取消豁免的 0）');
  assert.match(output, /编目发现缺陷/, '应经 ✗ 通道点名编目缺陷');
  assert.equal(fs.existsSync(shimLog), false, '编目失败不得执行官方命令');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '编目失败不得写锁文件');
});

// ---------- [FR-2] 顶层旧旗标 --plugins 按未知旗标口径报错（硬切；矩阵在 install.test）----------

test('[FR-2] 旧旗标 --plugins x --profile dev：未知旗标口径、退出 1、零落盘、零官方调用', (t) => {
  const project = makeProject(t);
  const dshHome = makeDshHome(t, ['dev']);
  const shimLog = makeShimLog(t);

  const { code, stdout, stderr } = runCliIn(project, ['--plugins', PKG, '--profile', 'dev'], {
    DSH_HOME: dshHome,
    DSH_SHIM_LOG: shimLog,
  });
  assert.equal(code, 1);
  assert.equal(stdout, '');
  assert.equal(stderr, '✗ 未知旗标「--plugins」；运行 --help 查看全部命令与用法\n');
  assert.equal(fs.existsSync(shimLog), false, '旧旗标输入不得执行任何官方命令');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false);
});
