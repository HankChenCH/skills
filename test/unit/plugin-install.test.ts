import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { installPlugins } from '../../src/kernel/plugin-install.ts';
import type { CommandRunner } from '../../src/kernel/plugin-install.ts';
import { checkManagerReadiness, MANAGER_PACKAGE, managerPrescriptionLines } from '../../src/kernel/readiness.ts';
import type { Executor } from '../../src/kernel/dsh-command.ts';
import { readLockfile, writeLockfile, LOCKFILE_NAME } from '../../src/kernel/lockfile.ts';

// 批量插件安装编排（spec 20261115-495e 实现决策「命令组装与执行」批量语义 +「锁文件多类型」）：
// 逐条顺序执行官方命令（执行体注入——本套件不实跑），装后对账，锁文件插件区按对账结果
// 刷新；单条失败即中止并报告已完成/未完成清单；node 前置在第一次执行前。
// 注入桩模拟官方命令的两落点效果（dependencies 行 + dsh.profile.bundles 行，docs §2.3）。

const PKG = '@hankchen/dsh-demo';

// 模拟官方命令写入的 profile package.json 两落点切片（同 src/reconcile 的对账切片形态）
interface SimProfilePackage {
  dependencies?: Record<string, string>;
  dsh?: { profile?: { bundles?: string[] } };
}

function makeProject(t: TestContext) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-pluginstall-'));
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));
  return projectRoot;
}

function makeProfileDir(t: TestContext) {
  const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-plugprofile-'));
  t.after(() => fs.rmSync(profilePath, { recursive: true, force: true }));
  return profilePath;
}

// 官方命令模拟执行体：记录调用（断言组装形态与顺序用），并按官方语义写 profile 两落点
function makeOfficialSim(t: TestContext, profilePath: string, { failFor = [] }: { failFor?: string[] } = {}) {
  const calls: { command: string; args: string[] }[] = [];
  const run = ({ command, args }: { command: string; args: string[] }) => {
    calls.push({ command, args });
    const name = args.at(-1)!;
    if (failFor.includes(name)) {
      return { status: 1, stdout: '', stderr: 'npm error simulated failure' };
    }
    const pkgFile = path.join(profilePath, 'package.json');
    const pkg: SimProfilePackage = fs.existsSync(pkgFile) ? JSON.parse(fs.readFileSync(pkgFile, 'utf8')) : {};
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

function install(t: TestContext, { plugins = [PKG], now = '2026-11-15T00:00:00Z', run, projectRoot, profilePath, nodeVersion = 'v24.22.1' }: {
  plugins?: string[];
  now?: string;
  run?: CommandRunner;
  projectRoot: string;
  profilePath: string;
  nodeVersion?: string;
}) {
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

// 勾选转发安装对新包成立（spec 20261117-34d4 FR-6，票 20261117-218b）：两款真实插件包
// 走同一条命令组装路径（命令形态逐项等值）；期望包名独立来源 = agents/dsh/plugins/
// 包清单（编目正名，@hankchen/dsh-demo 与 @hankchen/dsh-mcp）。
const REAL_PLUGIN_NAMES = [PKG, '@hankchen/dsh-mcp'];

for (const name of REAL_PLUGIN_NAMES) {
  test(`免交互安装全链（${name}）：执行体收到的命令形态正确、对账通过、返回实际落盘版本`, (t) => {
    const projectRoot = makeProject(t);
    const profilePath = makeProfileDir(t);
    const sim = makeOfficialSim(t, profilePath);

    const result = install(t, { plugins: [name], projectRoot, profilePath, run: sim.run });

    assert.deepEqual(result, { profile: 'dev', installed: [{ name, version: '0.1.0' }] });
    assert.equal(sim.calls.length, 1, '官方命令应恰好执行一次');
    assert.equal(sim.calls[0].command, 'dsh');
    assert.deepEqual(sim.calls[0].args, ['plugin', '--profile', 'dev', 'add', name]);
  });
}

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

  const lockfile = readLockfile(projectRoot)!;
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

  const lockfile = readLockfile(projectRoot)!;
  assert.deepEqual(lockfile.skills, skillsBefore, '技能区条目应原样保留');
  assert.deepEqual(Object.keys(lockfile.plugins!), [PKG]);
});

test('重跑安装同一插件：插件区刷新为单条、无重复条目', (t) => {
  const projectRoot = makeProject(t);
  const profilePath = makeProfileDir(t);
  const sim = makeOfficialSim(t, profilePath);

  install(t, { projectRoot, profilePath, run: sim.run, now: '2026-11-15T00:00:00Z' });
  install(t, { projectRoot, profilePath, run: sim.run, now: '2026-11-15T09:00:00Z' });

  const lockfile = readLockfile(projectRoot)!;
  assert.deepEqual(Object.keys(lockfile.plugins!), [PKG], '重跑不应产生重复条目');
  assert.equal(lockfile.plugins![PKG].installedAt, '2026-11-15T09:00:00Z', '安装时间应按对账结果刷新');
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
      assert.match((err as Error).message, /@hankchen\/fail/, '报错须指明失败的插件');
      assert.match((err as Error).message, /@hankchen\/ok/, '报错须含已完成清单');
      assert.match((err as Error).message, /@hankchen\/never/, '报错须含未完成清单');
      return true;
    },
  );
  assert.equal(sim.calls.length, 2, '失败后不应继续执行后续官方命令');
  const lockfile = readLockfile(projectRoot)!;
  assert.deepEqual(Object.keys(lockfile.plugins!), ['@hankchen/ok'], '锁文件只记已完成的插件');
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
    (err) => (err as Error).message.includes('dsh.profile.bundles') && (err as Error).message.includes(profilePath),
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
    (err) => (err as Error).message.includes('22.23.4'),
  );
  assert.equal(sim.calls.length, 0, '拒装不得执行任何官方命令');
  assert.equal(fs.existsSync(path.join(projectRoot, LOCKFILE_NAME)), false, '拒装不得写锁文件');
});

// desktop 放行（spec 20261119-7a9a FR-3，票 20261119-443c）：官方 CLI 已放行 desktop 插件
// 管理（2026-11-19 实证，need 339e F4 结论失效），保留名拒装移除——desktop 走与普通
// profile 完全相同的 前置 → 转发 → 对账 → 记账 链。
test('目标 profile 为 desktop：前置放行，全链照旧（官方命令转发、对账、锁文件记账）', (t) => {
  const projectRoot = makeProject(t);
  const profilePath = makeProfileDir(t);
  const sim = makeOfficialSim(t, profilePath);

  const result = installPlugins({
    profile: 'desktop',
    plugins: [PKG],
    profilePath,
    dshInPath: true,
    projectRoot,
    packageVersion: '0.1.0',
    now: '2026-11-15T00:00:00Z',
    nodeVersion: 'v24.22.1',
    run: sim.run,
  });

  assert.deepEqual(result, { profile: 'desktop', installed: [{ name: PKG, version: '0.1.0' }] });
  assert.equal(sim.calls.length, 1, '官方命令应照常执行一次');
  assert.equal(sim.calls[0].command, 'dsh');
  assert.deepEqual(sim.calls[0].args, ['plugin', '--profile', 'desktop', 'add', PKG]);
  const lockfile = readLockfile(projectRoot)!;
  assert.deepEqual(lockfile.plugins, {
    [PKG]: { version: '0.1.0', profile: 'desktop', installedAt: '2026-11-15T00:00:00Z' },
  });
});

// ---------- 装后就绪核验（spec 20261119-7a9a 就绪核验契约，票 20261119-9bd3）----------
// seam ③：运行时版本探测替身（run 注入桩，形态沿本文件官方命令模拟执行体先例）；
// seam ④：处方文本契约（独立来源 = agents/dsh/plugins/dsh-mcp/README.md「已知边界」恢复配方）。
// 通过判据 = 运行时版本与 manager 解析副本精确同版（宿主 boot 兼容门 peer 精确钉同 rc 的镜像，
// ADR 20261118-ad91 一手实证）；四分支（同 rc / 异 rc / 缺副本 / 探测失败）各自独立可测。

const DIRECT_EXECUTOR: Executor = { command: 'dsh', launcher: [] };
const NPX_EXECUTOR: Executor = { command: 'npx', launcher: ['--yes', '@deepseek-ai/dsh'] };
// 包根（处方契约的 README 锚词独立来源用）：e2e 同款 import.meta.url 推导
const testPackageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// 探测替身：记录调用并按桩返回 --version 探测结果（模拟官方 CLI 输出形态）
function makeProbeStub(reply: { status: number; stdout: string; stderr?: string }) {
  const calls: { command: string; args: string[] }[] = [];
  const run: CommandRunner = ({ command, args }) => {
    calls.push({ command, args });
    return { status: reply.status, stdout: reply.stdout, stderr: reply.stderr ?? '' };
  };
  return { calls, run };
}

// manager 解析副本替身：按官方 pnpm 安装语义把 manager 写进 profile 依赖树
function makeManagerCopy(profilePath: string, version: string): void {
  const dir = path.join(profilePath, 'node_modules', '@deepseek-ai', 'dsh-mcp-manager');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: MANAGER_PACKAGE, version }));
}

function readiness({ profilePath, executor = DIRECT_EXECUTOR, run }: {
  profilePath: string;
  executor?: Executor;
  run: CommandRunner;
}) {
  return checkManagerReadiness({ profilePath, executor, run });
}

test('就绪核验（同 rc）：探测走安装同款执行体 --version、通过并返回两版本号', (t) => {
  const profilePath = makeProfileDir(t);
  makeManagerCopy(profilePath, '0.2.2-rc.5');
  const probe = makeProbeStub({ status: 0, stdout: '0.2.2-rc.5\n' });

  const outcome = readiness({ profilePath, run: probe.run });

  assert.deepEqual(outcome, { kind: 'pass', runtimeVersion: '0.2.2-rc.5', managerVersion: '0.2.2-rc.5' });
  assert.deepEqual(probe.calls, [{ command: 'dsh', args: ['--version'] }], '探测应沿安装同款执行体发 --version');
});

test('就绪核验（异 rc）：mismatch 携带运行时与 manager 两版本号', (t) => {
  const profilePath = makeProfileDir(t);
  makeManagerCopy(profilePath, '0.2.2-rc.2');
  const probe = makeProbeStub({ status: 0, stdout: '0.2.2-rc.5\n' });

  const outcome = readiness({ profilePath, run: probe.run });

  assert.deepEqual(outcome, { kind: 'mismatch', runtimeVersion: '0.2.2-rc.5', managerVersion: '0.2.2-rc.2' });
});

test('就绪核验（缺副本）：profile 依赖树无 manager 解析副本即 missing、带运行时版本', (t) => {
  const profilePath = makeProfileDir(t);
  const probe = makeProbeStub({ status: 0, stdout: '0.2.2-rc.5\n' });

  const outcome = readiness({ profilePath, run: probe.run });

  assert.deepEqual(outcome, { kind: 'missing', runtimeVersion: '0.2.2-rc.5', cause: 'absent' });
});

// 报因粒度（评审 20261120-4f76 建议 3）：missing 按实报因——absent 真缺副本（ENOENT）/
// unreadable 副本在但 package.json 读失败 / corrupt 不可解析或缺 version；分支行为不变
//（同归 missing fail-loud），只改报因粒度（ref-implementation #4 错误处理显式）。
test('就绪核验（缺副本报因粒度）：不可读与损坏各报实因', (t) => {
  const profilePath = makeProfileDir(t);
  const probe = makeProbeStub({ status: 0, stdout: '0.2.2-rc.5\n' });
  const managerPkgFile = path.join(profilePath, 'node_modules', '@deepseek-ai', 'dsh-mcp-manager', 'package.json');

  // 副本在但 package.json 落成目录 → 读 EISDIR = unreadable
  fs.mkdirSync(managerPkgFile, { recursive: true });
  const unreadable = readiness({ profilePath, run: probe.run });
  assert.deepEqual(unreadable, { kind: 'missing', runtimeVersion: '0.2.2-rc.5', cause: 'unreadable' });

  // 坏 JSON = corrupt（先清掉上一形态落成目录的 package.json 再写文件）
  fs.rmSync(managerPkgFile, { recursive: true, force: true });
  makeManagerCopy(profilePath, '0.2.2-rc.5');
  fs.writeFileSync(managerPkgFile, '{ not-json');
  const corruptJson = readiness({ profilePath, run: probe.run });
  assert.deepEqual(corruptJson, { kind: 'missing', runtimeVersion: '0.2.2-rc.5', cause: 'corrupt' });

  // JSON 合法但 version 缺失 = corrupt（副本损坏口径）
  fs.writeFileSync(managerPkgFile, JSON.stringify({ name: MANAGER_PACKAGE }));
  const corruptVersion = readiness({ profilePath, run: probe.run });
  assert.deepEqual(corruptVersion, { kind: 'missing', runtimeVersion: '0.2.2-rc.5', cause: 'corrupt' });
});

test('就绪核验（探测失败·非零退出）：probe-unavailable，不虚构版本', (t) => {
  const profilePath = makeProfileDir(t);
  makeManagerCopy(profilePath, '0.2.2-rc.5');
  const probe = makeProbeStub({ status: 1, stdout: '', stderr: 'npm error' });

  const outcome = readiness({ profilePath, run: probe.run });

  assert.deepEqual(outcome, { kind: 'probe-unavailable' });
});

test('就绪核验（探测失败·输出不可解析）：probe-unavailable', (t) => {
  const profilePath = makeProfileDir(t);
  const probe = makeProbeStub({ status: 0, stdout: 'dsh: unrecognized option\n' });

  const outcome = readiness({ profilePath, run: probe.run });

  assert.deepEqual(outcome, { kind: 'probe-unavailable' });
});

// 非法变体逐个喂解析入口（parse-normalization 规则 3/4 自查口径：解析失败显式落
// probe-unavailable、分支带尾锚）——四段版本不得截段、日期横幅不得错位命中。
test('就绪核验（探测失败·输出非法变体）：四段版本不截段、日期横幅不错位', (t) => {
  const profilePath = makeProfileDir(t);
  makeManagerCopy(profilePath, '0.2.2-rc.5');
  const illegal = ['1.2.3.4\n', '2026.11.19 dsh 0.2.2-rc.5\n'];
  for (const stdout of illegal) {
    const probe = makeProbeStub({ status: 0, stdout });
    const outcome = readiness({ profilePath, run: probe.run });
    assert.deepEqual(outcome, { kind: 'probe-unavailable' }, `输出 ${JSON.stringify(stdout)} 应落探测失败，不得静默接受为版本`);
  }
});

// 裸行形态（探针实证：官方 --version 输出 '0.2.2-rc.5\n' 裸行）逐行锚定取首个命中行：
// 横幅行 + 裸版本行共存时取裸版本行；v 前缀与行首尾空白容忍、整行非版本不命中。
test('就绪核验（探测·裸行形态）：多行取首个命中行，v 前缀与首尾空白可解析', (t) => {
  const profilePath = makeProfileDir(t);
  makeManagerCopy(profilePath, '0.2.2-rc.5');
  const probe = makeProbeStub({ status: 0, stdout: '2026.11.19 dsh\n v0.2.2-rc.5 \n' });

  const outcome = readiness({ profilePath, run: probe.run });

  assert.deepEqual(outcome, { kind: 'pass', runtimeVersion: '0.2.2-rc.5', managerVersion: '0.2.2-rc.5' });
});

test('就绪核验：dsh 不在 PATH 时探测沿 npx 执行体同款 launcher', (t) => {
  const profilePath = makeProfileDir(t);
  makeManagerCopy(profilePath, '0.2.2-rc.5');
  const probe = makeProbeStub({ status: 0, stdout: '0.2.2-rc.5\n' });

  readiness({ profilePath, executor: NPX_EXECUTOR, run: probe.run });

  assert.deepEqual(probe.calls, [{ command: 'npx', args: ['--yes', '@deepseek-ai/dsh', '--version'] }]);
});

// 处方文本契约（seam ④）：三段可复制，与 README「已知边界」恢复配方逐段一致——
// 锚词独立来源 = README 恢复配方原文（README 漂移即红，配方与处方是同一条契约的两面）。
test('处方文本契约：三段各含 README 恢复配方对应锚词，且版本与 profile 路径可复制替换', (t) => {
  const profilePath = makeProfileDir(t);
  const readme = fs.readFileSync(
    path.join(testPackageRoot, 'agents', 'dsh', 'plugins', 'dsh-mcp', 'README.md'),
    'utf8',
  );
  // README 恢复配方锚词在场（配方文本本身是契约的一半）
  for (const anchor of ['overrides', '重装 profile 依赖', 'plugin_manager set_plugin', 'GUI']) {
    assert.ok(readme.includes(anchor), `README 恢复配方应含锚词 ${anchor}`);
  }

  const segments = managerPrescriptionLines({ profilePath, runtimeVersion: '0.2.2-rc.5' });
  assert.equal(segments.length, 3, '处方恰三段');
  assert.ok(segments[0].includes('pnpm-workspace.yaml'), '段 1 应点名 profile 的 pnpm-workspace.yaml');
  assert.ok(segments[0].includes('overrides'), '段 1 应含覆盖配置写法锚词');
  assert.ok(segments[0].includes(`'${MANAGER_PACKAGE}': 0.2.2-rc.5`), '段 1 覆盖配置应钉运行时同版（可复制 YAML）');
  assert.ok(segments[1].includes('重装 profile 依赖'), '段 2 应含 README 段 2 锚词');
  assert.ok(segments[1].includes(`pnpm --dir "${profilePath}"`), '段 2 应是可复制执行的命令（带 profile 路径）');
  assert.ok(segments[1].includes(`${MANAGER_PACKAGE}@0.2.2-rc.5`), '段 2 补装应钉运行时同版');
  assert.ok(segments[2].includes('plugin_manager set_plugin'), '段 3 应含重载指引锚词（工具路径）');
  assert.ok(segments[2].includes('GUI'), '段 3 应含重载指引锚词（GUI 途径）');
});
