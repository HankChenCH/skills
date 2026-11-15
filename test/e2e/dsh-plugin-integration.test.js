// 集成测试（spec 20261115-495e 验收场景 [FR-5 | 集成级 | 承载票 20261115-98b6]）：
// 真实协作者 = 官方 @deepseek-ai/dsh 命令（npx 执行体形态，真实拉取）+ 真实 registry 包
// @hankchen/dsh-demo；受控外部替身 = 临时 DSH_HOME 目录。与 plugin-install.test.js 的
// 「注入 shim 执行体」端到端不同，本文件实跑官方链路，因此前置门三查
// （node ≥ 24.9.0 / registry 探测 / 版本对账）不满足时显式报因跳过执行段——
// 发布前呈 skip 形态（无伪失败），发布后同一测试全量执行。
// 结构三段：前置门 → 执行段（真实安装 + profile 两落点 + 锁文件四元组 + 对账摘要）
//          → 幂等段（重复安装：以官方幂等语义为准，无异常退出、锁文件无重复条目）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertPluginPreconditions, commandExists } from '../../src/dsh-command.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = path.join(packageRoot, 'bin', 'infra.js');
// 期望值独立来源：包名/版本运行时读仓库内包清单（发布后与 registry 最新版对账），不写死字面量
const DEMO_PKG = JSON.parse(fs.readFileSync(path.join(packageRoot, 'plugins', 'dsh-demo', 'package.json'), 'utf8'));
const PKG = DEMO_PKG.name;
const PROFILE = 'infra-it'; // 测试 profile 名固定（可重复确定；非官方保留名）

// npx 冷启动要拉官方 @deepseek-ai/dsh 及其依赖，可能很慢：安装给足 10 分钟硬顶，探测 60 秒
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;
const PROBE_TIMEOUT_MS = 60 * 1000;

// clack spinner/outro 输出含 ANSI 控制序列与折行；断言渲染文本前剥控制序列、压掉空白
//（同 plugin-install.test.js 的 plainText 口径）
const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const plainText = (output) => output.replace(ANSI_RE, '').replace(/\s+/g, '');

function makeTempDir(t, prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// 集成 PATH = node bin 目录 + 标准系统目录（/usr/bin、/bin）：npx/env node 可解析，
// 官方命令链内部经 sh 拉起包 bin（缺 /bin 时 npm exec 报 spawn sh ENOENT，见票 Progress 留痕），
// 且三个目录均无 dsh（下方守卫断言把关）——CLI 的执行体探测必落 npx 回退形态（官方语义），
// 不受本机是否另装有 dsh 影响。
function integrationPath() {
  return [path.dirname(process.execPath), '/usr/bin', '/bin'].join(path.delimiter);
}

// registry 探测：E404 = 待发布；其余失败 = registry/环境问题。两类原因都显式报因，
// 区分「环境问题」与「回归」——探测失败只 skip 执行段，不伪装成代码失败。
function probeRegistryVersion() {
  const probe = spawnSync('npm', ['view', PKG, 'version'], { encoding: 'utf8', timeout: PROBE_TIMEOUT_MS });
  if (probe.status === 0) {
    return { published: true, version: probe.stdout.trim() };
  }
  const output = `${probe.stderr ?? ''}${probe.stdout ?? ''}`;
  if (/E404|404 .*not found/i.test(output)) {
    return {
      published: false,
      skipReason: `前置门：${PKG} 尚未发布到 registry（npm view E404）——执行段与幂等段待发布后运行`,
    };
  }
  const reason = probe.error
    ? `npm 不可用（${probe.error.code ?? probe.error.message}）`
    : output.trim().split('\n').slice(-3).join('；') || `退出码 ${probe.status}`;
  return { published: false, skipReason: `前置门：registry 探测失败（环境问题，非回归）——${reason}` };
}

function runInstallCli(projectRoot, dshHome) {
  const result = spawnSync(
    process.execPath,
    [BIN, '--plugins', PKG, '--profile', PROFILE],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: INSTALL_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, DSH_HOME: dshHome, PATH: integrationPath() },
    },
  );
  return {
    code: result.status,
    signal: result.signal,
    error: result.error,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function readProfilePkg(dshHome) {
  return JSON.parse(fs.readFileSync(path.join(dshHome, 'profiles', PROFILE, 'package.json'), 'utf8'));
}

function readLockfile(projectRoot) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, '.infra-lock.json'), 'utf8'));
}

test(`[FR-5|集成级] 经 npx 执行体真实安装 ${PKG}：profile 两落点 + 锁文件四元组 + 幂等重装`, (t) => {
  // —— 前置门（测试内自检；不满足显式报因跳过，非伪失败）——
  try {
    assertPluginPreconditions({ nodeVersion: process.version, profile: PROFILE });
  } catch (err) {
    t.skip(`前置门（环境问题，非回归）：${err.message}`);
    return;
  }
  const probe = probeRegistryVersion();
  if (!probe.published) {
    t.skip(probe.skipReason);
    return;
  }
  assert.equal(
    probe.version,
    DEMO_PKG.version,
    `registry 最新版本（${probe.version}）与仓库 ${PKG} 版本（${DEMO_PKG.version}）不一致——发布漂移，需对齐后再跑集成`,
  );

  // —— 执行段（发布后自动生效）：临时 DSH_HOME + 真实安装 + 落点对账 ——
  const projectRoot = makeTempDir(t, 'infra-integration-proj-');
  spawnSync('git', ['init', '-q'], { cwd: projectRoot }); // 对齐真实用法：目标项目为 git 项目根
  const dshHome = makeTempDir(t, 'infra-integration-dshhome-');
  assert.equal(
    commandExists('dsh', { pathEnv: integrationPath() }),
    false,
    '集成 PATH 内不应存在 dsh（否则 npx 执行体形态不确定）——请检查 node 安装目录',
  );

  const first = runInstallCli(projectRoot, dshHome);
  assert.equal(
    first.code,
    0,
    `首次安装应成功退出（${first.error?.message ?? `signal ${first.signal}`}）：${first.stdout}${first.stderr}`,
  );

  // profile package.json 两落点（docs/plugin-assets.md §2.3：dependencies 依赖行 + dsh.profile.bundles 行）。
  // 依赖行落盘形态以官方语义为准（实装观测 = 语义化范围 ^x.y.z，非精确版本）：断言「落点齐备」，
  // 不钉范围字面；实际安装版本另经 profile 内 node_modules 的包清单对 registry 版本钉死。
  const profilePkg = readProfilePkg(dshHome);
  const depRange = profilePkg.dependencies?.[PKG];
  assert.ok(typeof depRange === 'string' && depRange.length > 0, '依赖行应落盘（官方写入的依赖声明）');
  const installedPkg = JSON.parse(
    fs.readFileSync(path.join(dshHome, 'profiles', PROFILE, 'node_modules', ...PKG.split('/'), 'package.json'), 'utf8'),
  );
  assert.equal(installedPkg.version, probe.version, 'profile 内实装版本应等于 registry 发布版本');
  assert.ok(
    Array.isArray(profilePkg.dsh?.profile?.bundles) && profilePkg.dsh.profile.bundles.includes(PKG),
    'bundles 行应含包名',
  );

  // 完成摘要：CLI 忠实记录实际落盘值（依赖行原文）并宣告对账成功
  const summary = `已安装插件${PKG}@${depRange}→dshprofile${PROFILE}（对账：依赖行+bundles行齐备）`;
  assert.ok(plainText(first.stdout).includes(summary), `完成摘要应记对账成功，实际输出：${first.stdout}`);

  // 锁文件插件区四元组：包名 / 版本（= 对账读到的依赖行原文）/ profile / 安装时间
  const lockfile = readLockfile(projectRoot);
  assert.deepEqual(Object.keys(lockfile.plugins), [PKG], '锁文件插件区应恰含该包一条');
  assert.equal(lockfile.plugins[PKG].version, depRange);
  assert.equal(lockfile.plugins[PKG].profile, PROFILE);
  assert.match(lockfile.plugins[PKG].installedAt, /^\d{4}-\d{2}-\d{2}T/, '安装时间应为 ISO 时间戳');

  // —— 幂等段：重复安装一次，以官方幂等语义为准（need A4 实测）——
  const second = runInstallCli(projectRoot, dshHome);
  assert.equal(
    second.code,
    0,
    `重复安装不应异常退出（${second.error?.message ?? `signal ${second.signal}`}）：${second.stdout}${second.stderr}`,
  );
  assert.ok(plainText(second.stdout).includes(summary), '重复安装后完成摘要仍应对账成功');

  // 官方幂等语义为准：依赖行/实装版本不变，bundles 只断言「含包名」，不钉官方去重细节
  const profilePkgAfter = readProfilePkg(dshHome);
  assert.equal(profilePkgAfter.dependencies[PKG], depRange, '重复安装后依赖行不变');
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(dshHome, 'profiles', PROFILE, 'node_modules', ...PKG.split('/'), 'package.json'), 'utf8'),
    ).version,
    probe.version,
    '重复安装后实装版本不变',
  );
  assert.ok(profilePkgAfter.dsh.profile.bundles.includes(PKG), '重复安装后 bundles 行仍含包名');

  const lockfileAfter = readLockfile(projectRoot);
  assert.deepEqual(Object.keys(lockfileAfter.plugins), [PKG], '重复安装后锁文件无重复条目');
  assert.equal(lockfileAfter.plugins[PKG].version, depRange);
  assert.equal(lockfileAfter.plugins[PKG].profile, PROFILE);
});
