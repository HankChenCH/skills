import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { installPlugins } from '../../src/plugin-install.ts';
import { readLockfile, writeLockfile, LOCKFILE_NAME } from '../../src/lockfile.ts';

// 批量插件安装编排（spec 20261115-495e 实现决策「命令组装与执行」批量语义 +「锁文件多类型」）：
// 逐条顺序执行官方命令（执行体注入——本套件不实跑），装后对账，锁文件插件区按对账结果
// 刷新；单条失败即中止并报告已完成/未完成清单；node/desktop 前置在第一次执行前。
// 注入桩模拟官方命令的两落点效果（dependencies 行 + dsh.profile.bundles 行，docs §2.3）。

const PKG = '@hankchen/dsh-demo';

function makeProject(t) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-pluginstall-'));
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));
  return projectRoot;
}

function makeProfileDir(t) {
  const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-plugprofile-'));
  t.after(() => fs.rmSync(profilePath, { recursive: true, force: true }));
  return profilePath;
}

// 官方命令模拟执行体：记录调用（断言组装形态与顺序用），并按官方语义写 profile 两落点
function makeOfficialSim(t, profilePath, { failFor = [] } = {}) {
  const calls = [];
  const run = ({ command, args }) => {
    calls.push({ command, args });
    const name = args.at(-1);
    if (failFor.includes(name)) {
      return { status: 1, stdout: '', stderr: 'npm error simulated failure' };
    }
    const pkgFile = path.join(profilePath, 'package.json');
    const pkg = fs.existsSync(pkgFile) ? JSON.parse(fs.readFileSync(pkgFile, 'utf8')) : {};
    pkg.dependencies = { ...(pkg.dependencies ?? {}), [name]: '0.1.0' };
    pkg.dsh = {
      ...(pkg.dsh ?? {}),
      profile: { bundles: [...(pkg.dsh?.profile?.bundles ?? []), name] },
    };
    fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
    return { status: 0, stdout: '', stderr: '' };
  };
  return { calls, run };
}

function install(t, { plugins = [PKG], now = '2026-11-15T00:00:00Z', run, projectRoot, profilePath, nodeVersion = 'v24.22.1' }) {
  return installPlugins({
    profile: 'dev',
    plugins,
    profilePath,
    dshInPath: true,
    projectRoot,
    packageVersion: '0.1.0',
    now,
    nodeVersion,
    run,
  });
}

test('免交互安装全链：执行体收到的命令形态正确、对账通过、返回实际落盘版本', (t) => {
  const projectRoot = makeProject(t);
  const profilePath = makeProfileDir(t);
  const sim = makeOfficialSim(t, profilePath);

  const result = install(t, { projectRoot, profilePath, run: sim.run });

  assert.deepEqual(result, { profile: 'dev', installed: [{ name: PKG, version: '0.1.0' }] });
  assert.equal(sim.calls.length, 1, '官方命令应恰好执行一次');
  assert.equal(sim.calls[0].command, 'dsh');
  assert.deepEqual(sim.calls[0].args, ['plugin', '--profile', 'dev', 'add', PKG]);
});

test('dsh 不在 PATH：执行体收到 npx @deepseek-ai/dsh 形态', (t) => {
  const projectRoot = makeProject(t);
  const profilePath = makeProfileDir(t);
  const sim = makeOfficialSim(t, profilePath);

  installPlugins({
    profile: 'dev',
    plugins: [PKG],
    profilePath,
    dshInPath: false,
    projectRoot,
    packageVersion: '0.1.0',
    now: '2026-11-15T00:00:00Z',
    run: sim.run,
  });

  assert.equal(sim.calls[0].command, 'npx');
  assert.deepEqual(sim.calls[0].args, ['--yes', '@deepseek-ai/dsh', 'plugin', '--profile', 'dev', 'add', PKG]);
});

test('锁文件插件区逐插件记 包名/版本/profile/安装时间', (t) => {
  const projectRoot = makeProject(t);
  const profilePath = makeProfileDir(t);
  const sim = makeOfficialSim(t, profilePath);

  install(t, { projectRoot, profilePath, run: sim.run });

  const lockfile = readLockfile(projectRoot);
  assert.deepEqual(lockfile.plugins, {
    [PKG]: { version: '0.1.0', profile: 'dev', installedAt: '2026-11-15T00:00:00Z' },
  });
});

test('锁文件插件区新增不触碰技能区既有条目', (t) => {
  const projectRoot = makeProject(t);
  const profilePath = makeProfileDir(t);
  const skillsBefore = { 'dev-spec': { fingerprint: 'f'.repeat(64), installedAt: '2026-11-14T00:00:00Z' } };
  writeLockfile(projectRoot, {
    package: '@hankchen/infra',
    packageVersion: '0.1.0',
    skills: skillsBefore,
  });
  const sim = makeOfficialSim(t, profilePath);

  install(t, { projectRoot, profilePath, run: sim.run });

  const lockfile = readLockfile(projectRoot);
  assert.deepEqual(lockfile.skills, skillsBefore, '技能区条目应原样保留');
  assert.deepEqual(Object.keys(lockfile.plugins), [PKG]);
});

test('重跑安装同一插件：插件区刷新为单条、无重复条目', (t) => {
  const projectRoot = makeProject(t);
  const profilePath = makeProfileDir(t);
  const sim = makeOfficialSim(t, profilePath);

  install(t, { projectRoot, profilePath, run: sim.run, now: '2026-11-15T00:00:00Z' });
  install(t, { projectRoot, profilePath, run: sim.run, now: '2026-11-15T09:00:00Z' });

  const lockfile = readLockfile(projectRoot);
  assert.deepEqual(Object.keys(lockfile.plugins), [PKG], '重跑不应产生重复条目');
  assert.equal(lockfile.plugins[PKG].installedAt, '2026-11-15T09:00:00Z', '安装时间应按对账结果刷新');
});

test('批量多条逐条顺序执行官方命令', (t) => {
  const projectRoot = makeProject(t);
  const profilePath = makeProfileDir(t);
  const sim = makeOfficialSim(t, profilePath);
  const plugins = ['@hankchen/one', '@hankchen/two'];

  const result = install(t, { plugins, projectRoot, profilePath, run: sim.run });

  assert.deepEqual(sim.calls.map((c) => c.args.at(-1)), plugins, '应按勾选顺序逐条执行');
  assert.deepEqual(result.installed.map((p) => p.name), plugins);
});

test('单条失败即中止：锁文件只记已完成的，报错带已完成/未完成清单', (t) => {
  const projectRoot = makeProject(t);
  const profilePath = makeProfileDir(t);
  const sim = makeOfficialSim(t, profilePath, { failFor: ['@hankchen/fail'] });

  assert.throws(
    () => install(t, { plugins: ['@hankchen/ok', '@hankchen/fail', '@hankchen/never'], projectRoot, profilePath, run: sim.run }),
    (err) => {
      assert.match(err.message, /@hankchen\/fail/, '报错须指明失败的插件');
      assert.match(err.message, /@hankchen\/ok/, '报错须含已完成清单');
      assert.match(err.message, /@hankchen\/never/, '报错须含未完成清单');
      return true;
    },
  );
  assert.equal(sim.calls.length, 2, '失败后不应继续执行后续官方命令');
  const lockfile = readLockfile(projectRoot);
  assert.deepEqual(Object.keys(lockfile.plugins), ['@hankchen/ok'], '锁文件只记已完成的插件');
});

test('对账缺落点同样中止并带清单（异常流 C 口径）', (t) => {
  const projectRoot = makeProject(t);
  const profilePath = makeProfileDir(t);
  // 模拟官方命令「装了但没写 bundles 行」的残缺效果
  const brokenRun = () => {
    fs.writeFileSync(
      path.join(profilePath, 'package.json'),
      JSON.stringify({ dependencies: { [PKG]: '0.1.0' } }),
    );
    return { status: 0, stdout: '', stderr: '' };
  };

  assert.throws(
    () => install(t, { projectRoot, profilePath, run: brokenRun }),
    (err) => err.message.includes('dsh.profile.bundles') && err.message.includes(profilePath),
  );
  const lockfile = readLockfile(projectRoot);
  const recorded = lockfile === null ? [] : Object.keys(lockfile.plugins ?? {});
  assert.deepEqual(recorded, [], '对账不过不记账');
});

test('node 低于基线：第一时刻拒装，官方命令一次都不执行', (t) => {
  const projectRoot = makeProject(t);
  const profilePath = makeProfileDir(t);
  const sim = makeOfficialSim(t, profilePath);

  assert.throws(
    () => install(t, { projectRoot, profilePath, run: sim.run, nodeVersion: 'v22.23.4' }),
    (err) => err.message.includes('22.23.4'),
  );
  assert.equal(sim.calls.length, 0, '拒装不得执行任何官方命令');
  assert.equal(fs.existsSync(path.join(projectRoot, LOCKFILE_NAME)), false, '拒装不得写锁文件');
});

test('目标 profile 为 desktop：拒装，官方命令一次都不执行', (t) => {
  const projectRoot = makeProject(t);
  const profilePath = makeProfileDir(t);
  const sim = makeOfficialSim(t, profilePath);

  assert.throws(
    () =>
      installPlugins({
        profile: 'desktop',
        plugins: [PKG],
        profilePath,
        dshInPath: true,
        projectRoot,
        packageVersion: '0.1.0',
        now: '2026-11-15T00:00:00Z',
        run: sim.run,
      }),
    (err) => err.message.includes('desktop'),
  );
  assert.equal(sim.calls.length, 0, '拒装不得执行任何官方命令');
});
