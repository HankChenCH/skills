// 集成测试（spec 20261115-f650 验收场景 [FR-7 | 集成级 | 承载票 20261115-13c4]）：
// .ts 零构建形态 demo 插件经官方命令（npx 执行体 @deepseek-ai/dsh）装进临时 DSH_HOME
// 测试 profile，真实启动该 profile 断言插件 apply 日志可见（宿主加载 .ts 成功）。
//
// 两态互斥（spec FR-7 两条互斥场景，恰一条通过）：
// - 成功态：apply 日志可见 → 本测试断言通过；
// - 证伪态：宿主拒载 .ts（ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING 签名）→ 本测试
//   显式跳过并报因，引用证伪报告 docs/research/dsh-ts-loading/fr7-dsh-ts-loading-falsification.md
//   （失败点定位 + 回退方案成文，随票交付）——沿仓库既有纪律：契约既定事实显式跳过报因，
//   不假绿、不改弱断言；其余任何失败（安装失败、进程异常退出、超时）一律红，不落入两态。
//
// apply 日志观测仪器：cordis logger 默认只写进程内环形缓冲、不落控制台（dsh boot 仅捕获
// warn/error），成功态的 apply 日志须经 --patch overlay 挂测试自有仪器（注册
// ctx.logger.exporter 并转储 ctx.logger.buffer）方可观测。仪器是测试资产，随临时目录
// 生成销毁，不触仓库源。控制组测试用预编译 .js 形态（回退预案形态）走同一官方链路，
// 不因证伪态跳过（前置门不满足仍按纪律显式跳过）——它同时验证仪器有效性与回退方案通路，
// 结果态失败即真失败。
//
// 前置门（沿 spec 20261115-495e 集成级先例）：node ≥24.9 / registry 可达 / pnpm 可用
// （官方 dsh plugin 命令转发 pnpm 执行）/ 官方 dsh 版本满足插件 engines——不满足显式
// 跳过并报因，不伪装成代码失败；集成 PATH 内不得存在 dsh（npx 执行体形态确定性）。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertPluginPreconditions, commandExists } from '../../src/dsh-command.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLUGIN_DIR = path.join(packageRoot, 'plugins', 'dsh-demo');
// 期望值独立来源：包名/版本/engines 运行时读仓库内插件包清单，不写死字面量
const DEMO_PKG: {
  name: string;
  version: string;
  engines?: { node?: string; dsh?: string };
} = JSON.parse(fs.readFileSync(path.join(PLUGIN_DIR, 'package.json'), 'utf8'));
const PKG = DEMO_PKG.name;
const PROFILE_TS = 'infra-ts-e2e'; // .ts 形态测试 profile（固定名，可重复确定；非官方保留名）
const PROFILE_JS = 'infra-js-e2e'; // 控制组（预编译 .js 回退形态）测试 profile

// npx 冷启动要拉官方 @deepseek-ai/dsh 及其依赖，可能很慢：安装给足 10 分钟硬顶，启动观测 2 分钟
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;
const BOOT_TIMEOUT_MS = 2 * 60 * 1000;
const BOOT_POLL_MS = 1000;

// 成功态签名：仪器捕获行（仪器对每条 logger 消息写一行 `CAPTURED-LOG [name] type: args`）
const LOADED_SIG = new RegExp(`CAPTURED-LOG \\[[^\\]]+\\] info: 插件已加载：${PKG.replace('/', '\\/')}`);
// 证伪态签名：node 对 node_modules 下 .ts 拒绝剥类型的专属错误码（无旗标逃生，官方设计）
const REJECT_SIG = /ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING/;

// —— 通用夹具（沿 dsh-plugin-integration.test.ts 先例口径）——

function makeTempDir(t: TestContext, prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// 集成 PATH = node bin 目录 + 标准系统目录：npx/npm/pnpm 可解析，官方命令链内部经 sh
// 拉起 pnpm；三处目录均不应有 dsh（下方守卫断言把关）——执行体必落 npx 回退形态。
function integrationPath() {
  return [path.dirname(process.execPath), '/usr/bin', '/bin'].join(path.delimiter);
}

interface RunResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  error?: Error;
  stdout: string;
  stderr: string;
}

function runNpxDsh(args: string[], { dshHome, cwd, timeout }: { dshHome: string; cwd: string; timeout: number }): RunResult {
  const result = spawnSync('npx', ['--yes', '@deepseek-ai/dsh', ...args], {
    cwd,
    encoding: 'utf8',
    timeout,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, DSH_HOME: dshHome, PATH: integrationPath() },
  });
  return {
    code: result.status,
    signal: result.signal,
    error: result.error,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function failDetail(result: { error?: Error; status?: number | null; signal?: NodeJS.Signals | null; stdout?: string | Buffer; stderr?: string | Buffer }): string {
  const tail = `${String(result.stdout ?? '')}\n${String(result.stderr ?? '')}`.trim().split('\n').slice(-5).join('；');
  const cause = result.error?.message ?? `退出码 ${result.status ?? 'null'}${result.signal ? `（signal ${result.signal}）` : ''}`;
  return `${cause}${tail ? `；输出尾部：${tail}` : ''}`;
}

// —— 前置门（每测试独立自检；不满足显式报因跳过，非伪失败）——

// registry 探测：官方 @deepseek-ai/dsh 版本。失败 = registry/环境问题，显式报因跳过。
function probeOfficialDshVersion(): { version: string } | { skipReason: string } {
  const probe = spawnSync('npm', ['view', '@deepseek-ai/dsh', 'version'], {
    encoding: 'utf8',
    timeout: 60 * 1000,
    env: { ...process.env, PATH: integrationPath() },
  });
  if (probe.status === 0 && (probe.stdout ?? '').trim().length > 0) {
    return { version: probe.stdout.trim() };
  }
  const reason = probe.error
    ? `npm 不可用（${(probe.error as NodeJS.ErrnoException).code ?? probe.error.message}）`
    : `${probe.stdout ?? ''}${probe.stderr ?? ''}`.trim().split('\n').slice(-3).join('；') || `退出码 ${probe.status}`;
  return { skipReason: `前置门：registry 探测失败（环境问题，非回归）——${reason}` };
}

// pnpm 探测：官方 `dsh plugin` 命令把安装参数转发给 pnpm（缺 pnpm 时官方命令以退出码 127 失败）。
function probePnpm(): { skipReason?: string } {
  const probe = spawnSync('pnpm', ['--version'], {
    encoding: 'utf8',
    timeout: 30 * 1000,
    env: { ...process.env, PATH: integrationPath() },
  });
  if (probe.status === 0) return {};
  const reason = probe.error?.message ?? `退出码 ${probe.status}`;
  return { skipReason: `前置门：pnpm 不可用（官方 dsh plugin 命令转发 pnpm 执行，PATH=${integrationPath()}）——${reason}` };
}

// 插件 engines.dsh 下限核对（期望值来源 = 仓库插件包清单）：实测官方版本必须满足，
// 否则本次实测对象不是 spec 契约锁定的宿主版本——显式报因跳过。
// 比较器覆盖本仓实际用到的形态：核心三元组 + semver 预发布（如 0.2.2-rc.1）。
type SemverLike = { core: number[]; pre: string[] };

function parseSemverLike(text: string, what: string): SemverLike {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(text.trim());
  assert.ok(match, `${what}「${text}」不是可比较的 x.y.z[-预发布] 形态`);
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] ? match[4].split('.') : [],
  };
}

// semver 预发布逐段比较：数字段比数值、字母段比字典序、数字段 < 字母段、前缀相等时更长者为大
function comparePre(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return right.length - left.length; // 无预发布 > 有预发布
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const a = left[i];
    const b = right[i];
    if (a === undefined) return -1; // 前缀相等，短者小
    if (b === undefined) return 1;
    const aNum = /^\d+$/.test(a);
    const bNum = /^\d+$/.test(b);
    if (aNum && bNum) {
      const diff = Number(a) - Number(b);
      if (diff !== 0) return diff > 0 ? 1 : -1;
    } else if (aNum !== bNum) {
      return aNum ? -1 : 1; // 数字段 < 字母段
    } else if (a !== b) {
      return a > b ? 1 : -1;
    }
  }
  return 0;
}

function satisfiesEngineFloor(version: string, range: string): boolean {
  assert.ok(range.trim().startsWith('>='), `engines.dsh 范围「${range}」超出比较器支持的 >= 形态`);
  const floor = parseSemverLike(range.trim().slice(2), 'engines.dsh 下限');
  const actual = parseSemverLike(version, '官方 dsh 版本');
  for (let i = 0; i < 3; i += 1) {
    if (actual.core[i] !== floor.core[i]) return actual.core[i] > floor.core[i];
  }
  return comparePre(actual.pre, floor.pre) >= 0;
}

// 返回 false = 门未过已 t.skip（调用方须立即 return，勿再执行测试体）——node:test 的
// t.skip 只标注最终状态不停止执行，skip 后继续跑会白耗网络/时钟并把矛盾喷进报告
//（评审修复：前置门 skip 截断语义）。硬断言（执行体确定性/版本对账）照常抛错失败。
function assertGate(t: TestContext, profile: string): boolean {
  try {
    assertPluginPreconditions({ nodeVersion: process.version, profile });
  } catch (err) {
    t.skip(`前置门（环境问题，非回归）：${err.message}`);
    return false;
  }
  assert.equal(
    commandExists('dsh', { pathEnv: integrationPath() }),
    false,
    '集成 PATH 内不应存在 dsh（否则 npx 执行体形态不确定）——请检查 node 安装目录',
  );
  const registry = probeOfficialDshVersion();
  if ('skipReason' in registry) {
    t.skip(registry.skipReason);
    return false;
  }
  const pnpm = probePnpm();
  if (pnpm.skipReason) {
    t.skip(pnpm.skipReason);
    return false;
  }
  const floor = DEMO_PKG.engines?.dsh;
  assert.equal(typeof floor, 'string', '仓库插件包清单应声明 engines.dsh 下限');
  assert.ok(
    satisfiesEngineFloor(registry.version, floor as string),
    `官方 dsh 版本（${registry.version}）低于插件 engines.dsh 下限（${floor}）——实测对象漂移，需对齐后再跑集成`,
  );
  return true;
}

// —— apply 日志观测仪器（cordis logger 默认只进环形缓冲，不落控制台）——

const CAPTURE_MODULE_NAME = 'dsh-test-log-capture.mjs';
const CAPTURE_PATCH_NAME = 'dsh-test-log-capture.patch.yml';

// overlay 条目的相对说明符按 overlay 文件自身目录解析（dsh 0.2.2-rc.1 实测确认），
// 仪器模块与 patch 文件同放测试临时目录即可。
function writeCaptureInstrument(projectRoot: string): string {
  fs.writeFileSync(
    path.join(projectRoot, CAPTURE_MODULE_NAME),
    `// 测试仪器（票 20261115-13c4 自动生成，勿手工维护）：注册 logger exporter 并转储既有缓冲，
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

// —— 真实启动 profile 并观测输出（成功签名 / 证伪签名 / 退出 / 超时 四出口）——

interface BootOutcome {
  kind: 'loaded' | 'rejected' | 'exited' | 'timeout';
  output: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

function bootAndWatch(t: TestContext, { profile, dshHome, projectRoot }: { profile: string; dshHome: string; projectRoot: string }): Promise<BootOutcome> {
  const patchPath = writeCaptureInstrument(projectRoot);
  // detached 起独立进程组：npx → dsh → 宿主孙进程整组可控（直接 SIGKILL npx 会留下
  // 存活的 dsh 孙进程，其继承的 stdio 管道不关闭，测试进程事件循环将无法排空而挂起——
  // 本票实测留痕）。settle 时整组 SIGKILL 并销毁流。
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
  const classify = (): BootOutcome['kind'] | undefined => {
    if (LOADED_SIG.test(output)) return 'loaded';
    if (REJECT_SIG.test(output) && output.includes(PKG)) return 'rejected';
    return undefined;
  };
  return new Promise((resolve) => {
    let settled = false;
    const finish = (kind: BootOutcome['kind']) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearTimeout(deadline);
      killTree();
      // 销毁管道流：孙进程若在组杀前已写满缓冲或组杀失败，事件循环仍被管道挂住——
      // 显式销毁保证测试进程可退出（挂起即丢全部测试输出，本票实测留痕）
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

// —— 安装段共用：npm pack + 官方命令安装 + 实装形态对账 ——

// npm pack --json 输出解析：JSON 数组取 filename；解析失败回退正则（输出形态随 npm 版本漂移时仍可定位 tarball）
function resolvePackedTarball(packDir: string, stdout: string): string {
  try {
    const parsed: Array<{ filename?: string }> = JSON.parse(stdout);
    const filename = parsed[parsed.length - 1]?.filename;
    if (filename) return path.join(packDir, filename);
  } catch {
    // 回退到正则
  }
  const match = /([^\s"'`]+\.tgz)/.exec(stdout);
  assert.ok(match, `npm pack 输出中未找到 tarball 文件名：${stdout}`);
  return path.join(packDir, match[1]);
}

function installViaOfficialCommand(t: TestContext, { tarball, profile, dshHome, projectRoot, expectMain }: {
  tarball: string;
  profile: string;
  dshHome: string;
  projectRoot: string;
  expectMain: string;
}): void {
  const install = runNpxDsh(['plugin', '--profile', profile, 'add', tarball], { dshHome, cwd: projectRoot, timeout: INSTALL_TIMEOUT_MS });
  // failDetail 读 status 字段而 RunResult 记 code——调用处对齐，避免失败消息恒显「退出码 null」
  assert.equal(install.code, 0, `官方命令安装应成功（${failDetail({ ...install, status: install.code })}）`);
  // 实装形态对账：装入 profile 的必须是指定的形态（.ts 直发 / .js 预编译），而非 registry 旧版
  const manifest: { main?: string } = JSON.parse(
    fs.readFileSync(path.join(dshHome, 'profiles', profile, 'node_modules', ...PKG.split('/'), 'package.json'), 'utf8'),
  );
  assert.equal(manifest.main, expectMain, `profile 内实装包 main 应为 ${expectMain}（实装形态对账）`);
  assert.ok(
    fs.existsSync(path.join(dshHome, 'profiles', profile, 'node_modules', ...PKG.split('/'), expectMain)),
    `profile 内实装包应含 ${expectMain} 文件`,
  );
}

// —— 证伪报告落点（证伪态跳过报因引用）——
const FALSIFICATION_REPORT = 'docs/research/dsh-ts-loading/fr7-dsh-ts-loading-falsification.md';

test(`[FR-7|集成级] ${PKG} .ts 零构建形态经官方命令安装并真实启动 profile：插件 apply 日志可见（宿主加载 .ts）`, async (t) => {
  if (!assertGate(t, PROFILE_TS)) return;
  const projectRoot = makeTempDir(t, 'dsh-ts-e2e-proj-');
  const dshHome = makeTempDir(t, 'dsh-ts-e2e-home-');
  const packDir = makeTempDir(t, 'dsh-ts-e2e-pack-');

  // 安装段：本仓 .ts 形态（零构建直发）打包 → 官方命令装入测试 profile
  const pack = spawnSync('npm', ['pack', PLUGIN_DIR, '--pack-destination', packDir, '--json'], {
    cwd: packageRoot,
    encoding: 'utf8',
    timeout: 60 * 1000,
    env: { ...process.env, PATH: integrationPath() },
  });
  assert.equal(pack.status, 0, `npm pack 应成功（${failDetail(pack)}）`);
  const tarball = resolvePackedTarball(packDir, pack.stdout ?? '');
  installViaOfficialCommand(t, { tarball, profile: PROFILE_TS, dshHome, projectRoot, expectMain: 'index.ts' });

  // 启动段：真实启动该 profile，观测 apply 日志（成功态）或宿主拒载签名（证伪态）
  const outcome = await bootAndWatch(t, { profile: PROFILE_TS, dshHome, projectRoot });
  if (outcome.kind === 'loaded') {
    assert.match(outcome.output, LOADED_SIG, '成功态：插件 apply 日志应经仪器捕获可见');
    return;
  }
  if (outcome.kind === 'rejected') {
    const lines = outcome.output.split('\n');
    const evidenceLine =
      lines.find((line) => line.includes('failed to import'))
      ?? lines.find((line) => line.includes('ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING'))
      ?? '';
    // 证伪态（FR-7 两条互斥场景的另一条成立）：显式跳过报因 + 引用证伪报告，不弱断言不假绿
    t.skip(
      `证伪态成立（与成功态互斥）：宿主拒载 .ts——ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING，插件 entry 未激活、apply 日志不可见。` +
        `失败点定位与回退方案（插件包预编译）见 ${FALSIFICATION_REPORT}。证据行：${evidenceLine.trim()}`,
    );
    return;
  }
  assert.fail(
    `启动观测既未见 apply 日志也未见宿主拒载签名（${outcome.kind}${outcome.exitCode !== null ? `，退出码 ${outcome.exitCode}` : ''}${outcome.signal ? `，signal ${outcome.signal}` : ''}）——链路异常需排查。输出：${outcome.output}`,
  );
});

test(`[FR-7|控制组] ${PKG} 预编译 .js 形态（回退预案形态）经同一官方链路：插件 apply 日志可见`, async (t) => {
  if (!assertGate(t, PROFILE_JS)) return;
  const projectRoot = makeTempDir(t, 'dsh-js-e2e-proj-');
  const dshHome = makeTempDir(t, 'dsh-js-e2e-home-');
  const packDir = makeTempDir(t, 'dsh-js-e2e-pack-');
  const jsDir = path.join(packDir, 'emit');

  // 预编译段（回退预案机制本体）：仓内 tsc 对插件源码 emit index.js——只读插件源，产物落临时目录
  const tscBin = path.join(packageRoot, 'node_modules', '.bin', 'tsc');
  assert.ok(fs.existsSync(tscBin), '未找到仓内 tsc（node_modules 未安装？）——控制组需要 typescript 工具链');
  const emit = spawnSync(tscBin, [
    path.join(PLUGIN_DIR, 'index.ts'),
    '--outDir', jsDir,
    '--target', 'es2023',
    '--module', 'nodenext',
    '--moduleResolution', 'nodenext',
    '--skipLibCheck',
  ], { cwd: packageRoot, encoding: 'utf8', timeout: 60 * 1000 });
  assert.equal(emit.status, 0, `tsc emit 应成功（${failDetail(emit)}）`);
  const emittedJs = path.join(jsDir, 'index.js');
  assert.ok(fs.existsSync(emittedJs), 'tsc 应产出 index.js');

  // 组包段：.js 形态包清单由仓库清单派生（main/files 换 .js，其余字段同源），patch 随包原样携带
  const pkgDir = path.join(packDir, 'jsform');
  fs.mkdirSync(pkgDir);
  fs.copyFileSync(emittedJs, path.join(pkgDir, 'index.js'));
  fs.copyFileSync(path.join(PLUGIN_DIR, 'cordis.patch.yml'), path.join(pkgDir, 'cordis.patch.yml'));
  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({
    name: DEMO_PKG.name,
    version: DEMO_PKG.version,
    description: `${DEMO_PKG.name} 控制组形态（发布前 tsc 预编译，回退预案）——测试自动组装`,
    type: 'module',
    main: 'index.js',
    files: ['index.js', 'cordis.patch.yml'],
    engines: DEMO_PKG.engines,
    dsh: { bundle: { patch: './cordis.patch.yml' } },
  }, null, 2));
  const pack = spawnSync('npm', ['pack', pkgDir, '--pack-destination', packDir, '--json'], {
    cwd: packageRoot,
    encoding: 'utf8',
    timeout: 60 * 1000,
    env: { ...process.env, PATH: integrationPath() },
  });
  assert.equal(pack.status, 0, `npm pack 应成功（${failDetail(pack)}）`);
  const tarball = resolvePackedTarball(packDir, pack.stdout ?? '');

  // 安装 + 启动段：同一官方链路，控制组必须绿（仪器有效性 + 回退方案通路的常驻回归）
  // ——本测试不因证伪态跳过（前置门不满足仍按纪律显式跳过）
  installViaOfficialCommand(t, { tarball, profile: PROFILE_JS, dshHome, projectRoot, expectMain: 'index.js' });
  const outcome = await bootAndWatch(t, { profile: PROFILE_JS, dshHome, projectRoot });
  assert.equal(outcome.kind, 'loaded', `控制组：预编译 .js 形态应加载成功且 apply 日志可见（实际 ${outcome.kind}）。输出：${outcome.output}`);
  assert.match(outcome.output, LOADED_SIG, '控制组：插件 apply 日志应经仪器捕获可见');
});
