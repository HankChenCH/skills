// 集成测试（spec 20261116-2c58 验收场景 [FR-1 | 集成级 | 承载票 20261116-ccfb]，承
// spec 20261115-495e 集成级先例）：以套件 .ts 插件包（@hankchen/dsh-demo，发布面为预编译
// 形态，证伪定案见 docs/research/dsh-ts-loading/）经新命令面 `plugin add` 真装进测试
// profile，真实启动该 profile 断言插件 apply 日志可见（宿主加载成功）。
//
// 真实协作者 = 官方 @deepseek-ai/dsh 命令（经 infra CLI 的 npx 执行体回退形态，真实拉取）
// + 真实 registry 包 @hankchen/dsh-demo；受控外部替身 = 临时 DSH_HOME 目录。与
// plugin-install.test 的「注入 shim 执行体」端到端不同，本文件实跑官方链路。
//
// 前置门跳过纪律（docs/standards/node-test-skip-gate.md）：环境门写成返回 boolean 的门
// 函数 + 测试体内联 return 截断——node:test 的 t.skip 只标注不截断，门函数返回 false 时
// 调用方必须立即 return，不满足环境显式报因跳过（不伪绿、不伪红）；门内硬断言
// （集成 PATH 无 dsh / registry 版本与仓库对账）照常抛错 = 真失败。
//
// 结构：前置门 → 安装段（plugin add 全链：官方命令 + profile 两落点 + 锁文件四元组 + 对账摘要）
//      → 启动段（--patch 仪器挂载，真启动 profile，apply 日志可见）
//      → 幂等段（重复安装：官方幂等语义为准，无异常退出、锁文件无重复条目）。
//
// apply 日志观测仪器：cordis logger 默认只写进程内环形缓冲、不落控制台，apply 日志须经
// --patch overlay 挂测试自有仪器（注册 ctx.logger.exporter 并转储 ctx.logger.buffer）方可
// 观测。仪器与启动观测与 dsh-ts-loading.test.ts 同款复制（本票不触碰其承载文件，共享抽取
// 留待后续工单）；仪器是测试资产，随临时目录生成销毁，不触仓库源。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertPluginPreconditions, commandExists } from '../../src/kernel/dsh-command.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = path.join(packageRoot, 'bin', 'infra.ts');
// 期望值独立来源：包名/版本运行时读仓库内包清单（发布后与 registry 最新版对账），不写死字面量
const DEMO_PKG = JSON.parse(fs.readFileSync(path.join(packageRoot, 'agents', 'dsh', 'plugins', 'dsh-demo', 'package.json'), 'utf8'));
const PKG = DEMO_PKG.name;
const PROFILE = 'infra-it'; // 测试 profile 名固定（可重复确定；非官方保留名）

// npx 冷启动要拉官方 @deepseek-ai/dsh 及其依赖，可能很慢：安装给足 10 分钟硬顶，启动观测 2 分钟
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;
const BOOT_TIMEOUT_MS = 2 * 60 * 1000;
const BOOT_POLL_MS = 1000;

// clack spinner/outro 输出含 ANSI 控制序列与折行；断言渲染文本前剥控制序列、压掉空白
//（同 plugin-install.test 的 plainText 口径）
const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const plainText = (output: string): string => output.replace(ANSI_RE, '').replace(/\s+/g, '');

function makeTempDir(t: TestContext, prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// 集成 PATH = node bin 目录 + 标准系统目录（/usr/bin、/bin）：npx/env node 可解析，
// 官方命令链内部经 sh 拉起包 bin（缺 /bin 时 npm exec 报 spawn sh ENOENT，见票 Progress 留痕），
// 且三个目录均无 dsh（下方门内硬断言把关）——CLI 的执行体探测必落 npx 回退形态（官方语义），
// 不受本机是否另装有 dsh 影响。
function integrationPath() {
  return [path.dirname(process.execPath), '/usr/bin', '/bin'].join(path.delimiter);
}

// registry 探测：E404 = 待发布；其余失败 = registry/环境问题。两类原因都显式报因，
// 区分「环境问题」与「回归」——探测失败只 skip 执行段，不伪装成代码失败。
function probeRegistryVersion(): { published: true; version: string } | { published: false; skipReason: string } {
  const probe = spawnSync('npm', ['view', PKG, 'version'], { encoding: 'utf8', timeout: 60 * 1000 });
  if (probe.status === 0) {
    return { published: true, version: probe.stdout.trim() };
  }
  const output = `${probe.stderr ?? ''}${probe.stdout ?? ''}`;
  if (/E404|404 .*not found/i.test(output)) {
    return {
      published: false,
      skipReason: `前置门：${PKG} 尚未发布到 registry（npm view E404）——执行段待发布后运行`,
    };
  }
  const reason = probe.error
    ? `npm 不可用（${(probe.error as NodeJS.ErrnoException).code ?? probe.error.message}）`
    : output.trim().split('\n').slice(-3).join('；') || `退出码 ${probe.status}`;
  return { published: false, skipReason: `前置门：registry 探测失败（环境问题，非回归）——${reason}` };
}

// pnpm 探测：官方 `dsh plugin` 命令把安装参数转发给 pnpm（缺 pnpm 时官方命令以退出码 127 失败）。
function probePnpm(): string | undefined {
  const probe = spawnSync('pnpm', ['--version'], {
    encoding: 'utf8',
    timeout: 30 * 1000,
    env: { ...process.env, PATH: integrationPath() },
  });
  if (probe.status === 0) return undefined;
  const reason = probe.error?.message ?? `退出码 ${probe.status}`;
  return `前置门：pnpm 不可用（官方 dsh plugin 命令转发 pnpm 执行，PATH=${integrationPath()}）——${reason}`;
}

// —— 前置门（返回 boolean；false = 已 t.skip 报因，调用方须立即 return）——

function assertGate(t: TestContext): boolean {
  try {
    assertPluginPreconditions({ nodeVersion: process.version, profile: PROFILE });
  } catch (err) {
    t.skip(`前置门（环境问题，非回归）：${err.message}`);
    return false;
  }
  // 门内硬断言（失败 = 真失败，不是 skip）：执行体形态确定性 + registry 版本对账 + pnpm 可用
  assert.equal(
    commandExists('dsh', { pathEnv: integrationPath() }),
    false,
    '集成 PATH 内不应存在 dsh（否则 npx 执行体形态不确定）——请检查 node 安装目录',
  );
  const probe = probeRegistryVersion();
  if (!probe.published) {
    t.skip(probe.skipReason);
    return false;
  }
  assert.equal(
    probe.version,
    DEMO_PKG.version,
    `registry 最新版本（${probe.version}）与仓库 ${PKG} 版本（${DEMO_PKG.version}）不一致——发布漂移，需对齐后再跑集成`,
  );
  const pnpmReason = probePnpm();
  if (pnpmReason !== undefined) {
    t.skip(pnpmReason);
    return false;
  }
  return true;
}

// —— CLI 新命令面安装（plugin add，npx 回退形态真实拉官方）——

function runInstallCli(projectRoot: string, dshHome: string) {
  const result = spawnSync(
    process.execPath,
    [BIN, 'plugin', 'add', PKG, '--profile', PROFILE],
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

function readProfilePkg(dshHome: string) {
  return JSON.parse(fs.readFileSync(path.join(dshHome, 'profiles', PROFILE, 'package.json'), 'utf8'));
}

// profile node_modules 下实装包的清单：scoped 包名 → 目录路径的截段只在此处定义
//（parse-normalization 规则 1），安装段与幂等段共用同一读取口径。
function readInstalledManifest(dshHome: string) {
  const manifestPath = path.join(dshHome, 'profiles', PROFILE, 'node_modules', ...PKG.split('/'), 'package.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function readLockfile(projectRoot: string) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, '.infra-lock.json'), 'utf8'));
}

// —— apply 日志观测仪器（与 dsh-ts-loading.test.ts 同款；cordis logger 默认不落控制台）——

const CAPTURE_MODULE_NAME = 'dsh-test-log-capture.mjs';
const CAPTURE_PATCH_NAME = 'dsh-test-log-capture.patch.yml';

// overlay 条目的相对说明符按 overlay 文件自身目录解析（dsh 0.2.2-rc.1 实测确认），
// 仪器模块与 patch 文件同放测试临时目录即可。
function writeCaptureInstrument(projectRoot: string): string {
  fs.writeFileSync(
    path.join(projectRoot, CAPTURE_MODULE_NAME),
    `// 测试仪器（票 20261116-ccfb 自动生成，勿手工维护）：注册 logger exporter 并转储既有缓冲，
// 使插件 apply 日志在无 TTY 启动下可见（cordis LoggerService 默认 exporter 只写环形缓冲）。
export const name = '${CAPTURE_MODULE_NAME}';
export function apply(ctx) {
  const emit = (msg) => {
    const args = (msg.args ?? []).map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    process.stderr.write('CAPTURED-LOG [' + msg.name + '] ' + msg.type + ': ' + args + '\\n');
  };
  ctx.logger.exporter({ export: emit });
  for (const msg of ctx.logger.buffer ?? []) emit(msg);
}
`,
  );
  const patchPath = path.join(projectRoot, CAPTURE_PATCH_NAME);
  fs.writeFileSync(
    patchPath,
    `# 测试仪器挂载（--patch overlay；条目相对说明符按本文件所在目录解析）
- insert:
    - id: dsh-test-log-capture
      name: './${CAPTURE_MODULE_NAME}'
`,
  );
  return patchPath;
}

// 成功态签名：仪器捕获行（仪器对每条 logger 消息写一行 `CAPTURED-LOG [name] type: args`）
const LOADED_SIG = new RegExp(`CAPTURED-LOG \\[[^\\]]+\\] info: 插件已加载：${PKG.replace('/', '\\/')}`);

interface BootOutcome {
  kind: 'loaded' | 'exited' | 'timeout';
  output: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

// 真实启动 profile 并观测输出（loaded / exited / timeout 三出口；结果态失败即真失败）。
// detached 起独立进程组：npx → dsh → 宿主孙进程整组可控（直接 SIGKILL npx 会留下存活的
// dsh 孙进程，其继承的 stdio 管道不关闭，测试进程事件循环将无法排空而挂起——
// dsh-ts-loading round 1 实测留痕）。settle 时整组 SIGKILL 并销毁流。
function bootAndWatch(t: TestContext, { profile, dshHome, projectRoot }: { profile: string; dshHome: string; projectRoot: string }): Promise<BootOutcome> {
  const patchPath = writeCaptureInstrument(projectRoot);
  const child: ChildProcess = spawn('npx', ['--yes', '@deepseek-ai/dsh', '--profile', profile, '--patch', patchPath], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, DSH_HOME: dshHome, PATH: integrationPath() },
    detached: true,
  });
  const killTree = () => {
    if (child.pid === undefined) return;
    try {
      process.kill(-child.pid, 'SIGKILL'); // 负 pid = 整个进程组
    } catch {
      try {
        child.kill('SIGKILL');
      } catch {
        // 进程组已不存在——清理目的已达成
      }
    }
  };
  t.after(killTree);
  let output = '';
  const collect = (chunk: Buffer | string) => {
    output += chunk;
  };
  // 显式 utf8 解码：多字节签名（「插件已加载：」等）跨块截断时默认 Buffer 拼接会产生
  // U+FFFD 烂码，签名匹配罕见假红（评审修复）
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', collect);
  child.stderr?.on('data', collect);
  const classify = (): BootOutcome['kind'] | undefined => (LOADED_SIG.test(output) ? 'loaded' : undefined);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (kind: BootOutcome['kind']) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearTimeout(deadline);
      killTree();
      // 销毁管道流：孙进程若在组杀前已写满缓冲或组杀失败，事件循环仍被管道挂住——
      // 显式销毁保证测试进程可退出（挂起即丢全部测试输出，round 1 实测留痕）
      child.stdout?.destroy();
      child.stderr?.destroy();
      resolve({ kind, output, exitCode: child.exitCode ?? null, signal: child.signalCode ?? null });
    };
    // 轮询只在签名命中时 settle；到点未命中由 deadline 定时器以 timeout settle
    const poll = setInterval(() => {
      const sig = classify();
      if (sig) finish(sig);
    }, BOOT_POLL_MS);
    const deadline = setTimeout(() => finish(classify() ?? 'timeout'), BOOT_TIMEOUT_MS);
    deadline.unref();
    child.on('error', () => finish('exited'));
    // 'close'：stdio 冲刷完毕后才触发，保证尾部日志已进 output
    child.on('close', () => finish(classify() ?? 'exited'));
  });
}

test(`[FR-1|集成级] ${PKG} 经 plugin add 真装进测试 profile 并真启动：apply 日志可见 + 幂等重装`, async (t) => {
  if (!assertGate(t)) return;

  // —— 安装段：临时项目 + 临时 DSH_HOME，新命令面 plugin add（对齐真实用法：git 项目根）——
  const projectRoot = makeTempDir(t, 'infra-integration-proj-');
  spawnSync('git', ['init', '-q'], { cwd: projectRoot });
  const dshHome = makeTempDir(t, 'infra-integration-dshhome-');

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
  const installedPkg = readInstalledManifest(dshHome);
  assert.equal(installedPkg.version, DEMO_PKG.version, 'profile 内实装版本应等于 registry 发布版本');
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

  // —— 启动段：真实启动该 profile，插件 apply 日志可见（spec 集成级场景 Then）——
  const outcome = await bootAndWatch(t, { profile: PROFILE, dshHome, projectRoot });
  assert.equal(
    outcome.kind,
    'loaded',
    `plugin add 真装后 profile 应可启动且 apply 日志可见（实际 ${outcome.kind}${outcome.exitCode !== null ? `，退出码 ${outcome.exitCode}` : ''}）。输出：${outcome.output}`,
  );
  assert.match(outcome.output, LOADED_SIG, '插件 apply 日志应经仪器捕获可见');

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
  assert.equal(readInstalledManifest(dshHome).version, DEMO_PKG.version, '重复安装后实装版本不变');
  assert.ok(profilePkgAfter.dsh.profile.bundles.includes(PKG), '重复安装后 bundles 行仍含包名');

  const lockfileAfter = readLockfile(projectRoot);
  assert.deepEqual(Object.keys(lockfileAfter.plugins), [PKG], '重复安装后锁文件无重复条目');
  assert.equal(lockfileAfter.plugins[PKG].version, depRange);
  assert.equal(lockfileAfter.plugins[PKG].profile, PROFILE);
});
