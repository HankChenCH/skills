// 集成级端到端承载——web 形态（spec 20261118-0de6 验收场景 [FR-8|集成级|承载票 20261118-6df0]
// 与 [FR-4|集成级|承载票 20261118-6df0]；D6 拍板数据链路自动 + UI 人工，不引入浏览器自动化）：
// 临时 DSH_HOME + 真实官方 dsh web 形态（显式钉 next/rc 兼容星座版本真跑，ADR ad91）+
// 本地 pack 的 @hankchen/dsh-mcp tarball（官方 `dsh plugin add <tarball>` 真装进 web profile），
// boot 官方 web 应用（--no-open --port 0），在 HTTP/Remote 线层端到端断言：
// combo 路由分发本包 client bundle（boot graph entry + /plugins/??… 200 + 写面代码在场）→
// watch 流（/api/remote.mux）返回列表 → settings 写落盘 profile cordis.patch.yml →
// restart/probe Remote 可调 → 连接失败流贯穿（failed + 原因线索 + 条目保留 + restart 后状态可见）。
//
// 「UI 面路径」的自动化承载口径（工票 20261118-6df0 裁量留痕）：写面 createMcpPanelWrites
// 未从 client bundle 导出（模块导出面只有 inject/apply，产物检视实证）→ 按工票预案走
// 「同一模块通道」线级断言：客户端写面调用的官方 Remote 通道（gateway HTTP unary POST +
// mux WebSocket 流）由测试进程以同一 envelope（{type:'client-request',rpcId,method,
// payload:{args}}，dsh-client-connection src/client/rpc.ts 一手来源）与同一 entry 构造形态
// （client/index.ts addServer：stdio = transport/command/args[/env/cwd]、远程 =
// transport/url[/headers]、无 enabled/reconnect 键）驱动；浏览器渲染与点击交互归验收人工段。
//
// 设计发现与修复（2026-11-18 本票真跑实证 → fix 票 20261118-08f8 修复合回）：本票首跑暴露
// 官方 web 形态的 dsh-web-app bundle patch 自带 mcp-manager 行，而插件 cordis.patch.yml 无条件
// 自带 id: mcp 的 manager 行——两行同供 mcpManager 服务，插件行 duplicate 失败（boot 警告
// "1 entry did not activate"），且官方 Settings ns 随行 id 派生（web 组合 ns = 'mcp-manager'）
// 使插件写面硬编码 ns 'mcp' 被官方拒。08f8 修复 = ①manager 补位行条件化（startedBundles 含
// dsh-web-app 即 disabled，web 组合官方行独供）；②Host/客户端写面 ns 改 describe 派生（唯一
// servers 域，零/多在场 fail loud）。本测试据此钉 web 组合的修复后契约：boot 日志无 duplicate/
// 兼容门禁用警告（激活卫生面），describe 恰一个 servers 域且 ns 字面 = mcp-manager（官方行
// id 派生值，独立钉值），写腿经该 ns 承载（与插件派生结果同一通道同一落点）。profile 显式钉
// 同版 manager（AD91 纪律）在本形态仍是必要条件而非可选步骤：不钉时插件依赖把 profile 级
// manager 解析到旧 rc，官方行与插件行一并被 boot 兼容门禁用（"disabling profile plugin row"
// 真跑实证），宿主将完全无 manager。
//
// 线层一手来源（npx 缓存 @deepseek-ai@0.2.2-rc.4 星座在盘，探针实证留痕工票 Progress）：
// - 认证 = `GET /?token=<launch token>` 换签名 cookie（dsh-client-connection README
//   Browser authentication 节；token 由 dsh-web-app 打印在启动行）；Host/Origin 信任栅栏对
//   loopback 直连放行。静态资产（含 /plugins combo）公开，RPC 与 mux 需 cookie。
// - unary = `POST /api/<endpoint>`，body = Connection envelope；端点名 = generated remote
//   贡献键（settings/describe、settings/update、settings/mutate、mcpManager/restart、
//   mcpManager/probe——dsh-api-remotes lib/client.js 生成面）；describe 无参、update =
//   {ns,patch}、mutate = {ns,ops}、restart/probe = {name}（参数名一手提取）。
// - 流 = `/api/remote.mux` WebSocket 文本帧：uplink {type:'open',streamId,endpoint,payload}、
//   downlink {type:'item'|'error'|'end',streamId,...}（dsh-api-gateway src/stream-protocol.ts
//   一手来源）；宿主每 2s 发 Ping，须回 Pong 否则两拍后被断（websocketHeartbeatIntervalMs）。
//
// 前置门跳过纪律（docs/standards/node-test-skip-gate.md）：环境门写成返回 boolean 的门
// 函数 + 测试体内联 return 截断——t.skip 只标注不截断，门函数返回 false 时调用方必须
// 立即 return；门内硬断言照常抛错 = 真失败。口径（工单 AC4）：node <24 / pnpm 不可用 /
// registry 不可达 / 兼容星座不可达（ad91 显式钉版组合不可得）/ web boot 不可达（启动行
// 超时，宿主日志尾留因）。发布版对账（FR-6）沿 round 1 dsh-mcp-e2e-integration.test.ts
// 第二 test 形态——期望版本运行时读仓库包清单，0.2.0 随版本 bump 自动纳入对账，本文件不重复。
//
// 替身保真（docs/standards/stub-fidelity-integration.md）：真实协作者 = 官方 dsh web 宿主
// （boot/token/认证/combo 路由/gateway/settings/manager/reconcile 全官方链路）+ 官方 mcp-client
// 连接的 echo MCP server；受控替身只两件——测试自带的 echo MCP server（newline-delimited
// JSON-RPC 实现 MCP stdio 协议）与临时 DSH_HOME。官方写入的落盘字面（patch YAML 格式）不作
// 钉字面断言——只断言语义（条目名 + 关键字段齐备）；线层 envelope/端点名/参数名按一手来源
// 钉死（它们本身就是被测契约：combo 路由与 Remote 通道的 wire form）。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import { load as loadYaml } from 'js-yaml';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertPluginPreconditions } from '../../src/kernel/dsh-command.ts';
import { MANAGER_PACKAGE } from '../../src/kernel/readiness.ts';
import { withPackLock } from './dsh-mcp-pack-lock.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLUGIN_DIR = path.join(packageRoot, 'agents', 'dsh', 'plugins', 'dsh-mcp');
// 期望值独立来源：插件包名/版本运行时读仓库包清单，不写死字面量
const PKG_MANIFEST = JSON.parse(fs.readFileSync(path.join(PLUGIN_DIR, 'package.json'), 'utf8')) as {
  name: string;
  version: string;
};
const PKG = PKG_MANIFEST.name;
const PROFILE = 'dsh-mcp-web-e2e'; // 测试 profile 名固定（可重复确定；非官方保留名）
const SERVER_NAME = 'webuiecho'; // 主流程 server 名（echo 工具 → probe 结果 toolNames 断言）
const DEAD_NAME = 'deadwebui'; // 异常流 server 名（不可达 url）
// 官方 web 组合的 server 配置命名空间 = dsh-web-app bundle patch 的 manager 行 id 派生
// （真跑实证 ns 清单含 'mcp-manager'；08f8 修复后插件写面 describe 派生的落点与它同域）。
// 测试钉此字面 = 官方组合契约的独立期望值（与插件运行时派生互为印证，非同源推算）。
const OFFICIAL_MCP_NS = 'mcp-manager';
const MUX_PATH = '/api/remote.mux'; // Gateway Remote 流路由（dsh-api-gateway stream-protocol 一手常量）

// npx 冷启动要拉官方星座，profile 准备给足 10 分钟；web 启动观测 3 分钟（含 npx 冷缓存）；
// 连接等待 90s；失败流 gave-up 等待 4 分钟（官方重连默认预算 500ms 指数退避至 30s × 10 次
// ≈ 121.5s，dsh-mcp-client RECONNECT_DEFAULTS 一手来源）；restart 后新预算可见等待 30s。
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;
const BOOT_TIMEOUT_MS = 3 * 60 * 1000;
const CONNECT_TIMEOUT_MS = 90 * 1000;
const GAVEUP_TIMEOUT_MS = 4 * 60 * 1000;
const RESTART_VISIBLE_TIMEOUT_MS = 30 * 1000;

// 前置门探测出的兼容星座版本（显式钉组合；probeConstellation 成功后赋值）
let dshPinnedVersion = '';
let managerPinnedVersion = '';

function makeTempDir(t: TestContext, prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 集成 PATH = node bin 目录 + 标准系统目录（round 1 先例同款）：npx/pnpm 可解析
function integrationPath() {
  return [path.dirname(process.execPath), '/usr/bin', '/bin'].join(path.delimiter);
}

// —— 前置门探测（返回结构化结果；不满足 = 已可 skip 报因，调用方内联 return）——

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

// npm view --json 的结构化探测（pkg 与 field 必须是独立 argv——round 1 真跑实证）；失败按
// 原因分类（registry 不可达 = 环境口径）
function npmViewJson(pkg: string, field?: string): { ok: true; json: unknown } | { ok: false; reason: string } {
  const probe = spawnSync('npm', ['view', pkg, ...(field !== undefined ? [field] : []), '--json'], { encoding: 'utf8', timeout: 60 * 1000 });
  if (probe.status === 0) {
    try {
      return { ok: true, json: JSON.parse(probe.stdout) };
    } catch {
      return { ok: false, reason: `npm view ${pkg} 输出非 JSON——registry 响应异常` };
    }
  }
  const output = `${probe.stderr ?? ''}${probe.stdout ?? ''}`;
  const reason = probe.error
    ? `npm 不可用（${(probe.error as NodeJS.ErrnoException).code ?? probe.error.message}）`
    : output.trim().split('\n').slice(-3).join('；') || `退出码 ${probe.status}`;
  return { ok: false, reason };
}

/**
 * 兼容星座探测（真跑分支版本口径，ADR ad91）：官方 dsh dist-tags.next 与 manager
 * dist-tags.next 必须同 rc 同版（manager peer 精确钉同 rc 套件）。不满足 = 星座不可达
 * → skip 留因，不判失败。
 */
function probeConstellation(): { ok: false; reason: string } | { ok: true; dshVersion: string; managerVersion: string } {
  const dshTags = npmViewJson('@deepseek-ai/dsh', 'dist-tags');
  if (!dshTags.ok) {
    return { ok: false, reason: `前置门：registry 探测失败（环境问题，非回归）——${dshTags.reason}` };
  }
  const next = (dshTags.json as { next?: unknown }).next;
  if (typeof next !== 'string' || !/^\d+\.\d+\.\d+-rc\.\d+$/.test(next)) {
    return {
      ok: false,
      reason: `前置门：官方 dsh 无 next/rc 兼容星座可钉（dist-tags.next=${JSON.stringify(next)}）——latest 主包无兼容 manager，星座不可达期间集成场景以前置门 skip 兜底（ADR ad91）`,
    };
  }
  const managerTags = npmViewJson('@deepseek-ai/dsh-mcp-manager', 'dist-tags');
  if (!managerTags.ok) {
    return { ok: false, reason: `前置门：registry 探测失败（环境问题，非回归）——${managerTags.reason}` };
  }
  const managerNext = (managerTags.json as { next?: unknown }).next;
  if (managerNext !== next) {
    return {
      ok: false,
      reason: `前置门：dsh 与 dsh-mcp-manager 兼容星座不可达（manager dist-tags.next=${JSON.stringify(managerNext)} ≠ dsh next=${next}）——manager peer 精确钉同 rc 套件，同版组合才真跑`,
    };
  }
  return { ok: true, dshVersion: next, managerVersion: managerNext };
}

// —— 前置门（返回 boolean；false = 已 t.skip 报因，调用方须立即 return）——

function assertGate(t: TestContext): boolean {
  try {
    assertPluginPreconditions({ nodeVersion: process.version, profile: PROFILE });
  } catch (err) {
    t.skip(`前置门（环境问题，非回归）：${err.message}`);
    return false;
  }
  const pnpmReason = probePnpm();
  if (pnpmReason !== undefined) {
    t.skip(pnpmReason);
    return false;
  }
  const star = probeConstellation();
  if (!star.ok) {
    t.skip(star.reason);
    return false;
  }
  dshPinnedVersion = star.dshVersion;
  managerPinnedVersion = star.managerVersion;
  return true;
}

// —— profile 准备编排（全部走官方/标准工具链）——

interface CommandResult {
  code: number | null;
  error?: Error;
  output: string;
}

function runCommand(command: string, args: string[], options: { timeout: number; cwd?: string; dshHome?: string }): CommandResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? packageRoot,
    encoding: 'utf8',
    timeout: options.timeout,
    maxBuffer: 16 * 1024 * 1024,
    env: {
      ...process.env,
      PATH: integrationPath(),
      ...(options.dshHome !== undefined ? { DSH_HOME: options.dshHome } : {}),
    },
  });
  return { code: result.status, error: result.error, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

function assertCommandOk(step: string, result: CommandResult) {
  assert.equal(
    result.code,
    0,
    `${step} 应成功退出（${result.error?.message ?? ''}）：${result.output.slice(-2000)}`,
  );
}

// 本地 pack 插件 tarball（发布面 prepack 两面编译经 pnpm pack 生命周期钩子自动生效，
// postpack 还原仓库树）；产物路径显式输出到临时目录，仓库树不留 tgz。
// pack 互斥 = 共享 helper dsh-mcp-pack-lock.ts（评审 137e 建议 #5 单点化：锁身份核验/
// 陈锁阈值/退避轮询三修复单点承载，round 1 同一 helper）。
async function packPluginTarball(t: TestContext): Promise<string> {
  const destDir = makeTempDir(t, 'dsh-mcp-web-e2e-pack-');
  const tarball = path.join(destDir, `hankchen-dsh-mcp-${PKG_MANIFEST.version}.tgz`);
  await withPackLock(() => {
    const result = runCommand('pnpm', ['pack', '--pack-destination', destDir], { timeout: INSTALL_TIMEOUT_MS, cwd: PLUGIN_DIR });
    assertCommandOk('pnpm pack（插件发布面预编译）', result);
    assert.ok(fs.existsSync(tarball), `pack 产物应在目标目录：${tarball}（输出：${result.output.slice(-500)}）`);
    // 仓库树零构建纪律的兜底核对：pack 钩子结束后包目录不应残留编译产物（postpack 已还原）
    assert.equal(fs.existsSync(path.join(PLUGIN_DIR, 'index.js')), false, 'postpack 应已还原仓库树（包目录无 index.js 残留）');
    assert.equal(fs.existsSync(path.join(PLUGIN_DIR, 'client.js')), false, 'postpack 应已还原仓库树（包目录无 client.js 残留）');
  });
  return tarball;
}

// 从官方 web 模板初始化 profile（--dump-config 只组合落盘不挂载宿主）
function initWebProfile(dshHome: string) {
  const result = runCommand(
    'npx', ['--yes', `@deepseek-ai/dsh@${dshPinnedVersion}`, '--profile', PROFILE, '--from-default-profile', 'web', '--dump-config'],
    { timeout: INSTALL_TIMEOUT_MS, dshHome },
  );
  assertCommandOk('官方 dsh 初始化 web profile', result);
}

// 官方 `dsh plugin add <tarball>` 真装（官方命令 + pnpm 转发真实拉取）
function pluginAddTarball(dshHome: string, tarball: string) {
  const result = runCommand(
    'npx', ['--yes', `@deepseek-ai/dsh@${dshPinnedVersion}`, 'plugin', '--profile', PROFILE, 'add', tarball],
    { timeout: INSTALL_TIMEOUT_MS, dshHome },
  );
  assertCommandOk(`官方 dsh plugin add ${PKG} tarball`, result);
}

// profile 内显式钉同版 manager（web 形态必要步骤，见文件头设计发现节；round 1 同法先例：
// 插件依赖 ^0.2.2-rc.2 的 pnpm 解析只落旧 rc，宿主与 manager 同 rc 才满足兼容门 + peer 星座）
function pinManager(dshHome: string) {
  const profileDir = path.join(dshHome, 'profiles', PROFILE);
  const result = runCommand('pnpm', ['add', `@deepseek-ai/dsh-mcp-manager@${managerPinnedVersion}`], { timeout: INSTALL_TIMEOUT_MS, cwd: profileDir });
  assertCommandOk(`profile 显式钉 manager@${managerPinnedVersion}`, result);
}

// profile 内实装版本对账（依赖行落盘形态以官方写入为准——替身保真纪律断言「落点齐备」，
// 实装版本经 profile 内 node_modules 包清单钉死）
function assertProfileMountPoints(dshHome: string) {
  const profileDir = path.join(dshHome, 'profiles', PROFILE);
  const profilePkg = JSON.parse(fs.readFileSync(path.join(profileDir, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    dsh?: { profile?: { bundles?: string[] } };
  };
  const depRange = profilePkg.dependencies?.[PKG];
  assert.ok(typeof depRange === 'string' && depRange.length > 0, `插件依赖行应落盘：${JSON.stringify(profilePkg.dependencies)}`);
  const installedVersion = JSON.parse(
    fs.readFileSync(path.join(profileDir, 'node_modules', ...PKG.split('/'), 'package.json'), 'utf8'),
  ) as { version: string };
  assert.equal(installedVersion.version, PKG_MANIFEST.version, 'profile 内实装插件版本应等于仓库包版本');
  const managerInstalledVersion = JSON.parse(
    fs.readFileSync(path.join(profileDir, 'node_modules', '@deepseek-ai', 'dsh-mcp-manager', 'package.json'), 'utf8'),
  ) as { version: string };
  assert.equal(managerInstalledVersion.version, managerPinnedVersion, 'profile 内实装 manager 版本应等于显式钉版（同 rc 兼容星座）');
  assert.ok(
    Array.isArray(profilePkg.dsh?.profile?.bundles) && profilePkg.dsh.profile.bundles.includes(PKG),
    `bundles 行应含包名：${JSON.stringify(profilePkg.dsh?.profile?.bundles)}`,
  );
}

// —— 测试资产：echo MCP server（随临时目录生成销毁，不触仓库源；round 1 同法）——

const ECHO_SERVER_FILE = 'mcp-echo-server.mjs';

function writeEchoServer(dir: string) {
  fs.writeFileSync(path.join(dir, ECHO_SERVER_FILE), `// 最小 MCP stdio server（测试资产，票 20261118-6df0 自动生成，勿手工维护）：
// newline-delimited JSON-RPC 2.0，暴露一个 echo 工具，供官方 mcp-client 真实连接与工具拉取。
import { createInterface } from 'node:readline';
import process from 'node:process';
const write = (message) => process.stdout.write(JSON.stringify(message) + '\\n');
const TOOLS = [{
  name: 'echo',
  description: '回声工具：原样返回传入的 text 参数',
  inputSchema: { type: 'object', properties: { text: { type: 'string', description: '要回声的文本' } }, required: ['text'], additionalProperties: false },
}];
createInterface({ input: process.stdin }).on('line', (line) => {
  const trimmed = line.trim();
  if (trimmed.length === 0) return;
  let request;
  try { request = JSON.parse(trimmed); } catch { return; }
  if (request.method === 'initialize') {
    write({ jsonrpc: '2.0', id: request.id, result: {
      protocolVersion: request.params?.protocolVersion ?? '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'webui-echo-server', version: '0.1.0' },
    } });
    return;
  }
  if (request.method === 'notifications/initialized' || request.method === 'notifications/cancelled') return;
  if (request.method === 'ping') { write({ jsonrpc: '2.0', id: request.id, result: {} }); return; }
  if (request.method === 'tools/list') { write({ jsonrpc: '2.0', id: request.id, result: { tools: TOOLS } }); return; }
  if (request.id !== undefined) write({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'method not found: ' + request.method } });
});
`);
}

// —— 官方 web 宿主 boot（detached 进程组纪律沿 round 1：直接 SIGKILL npx 会留下存活的
// dsh 孙进程；settle 时整组 SIGKILL 并销毁流）——

interface WebBoot {
  port: number;
  token: string;
  bootLog: string;
}

function bootWebHost(t: TestContext, options: { dir: string; dshHome: string }): Promise<{ ok: true; boot: WebBoot } | { ok: false; bootLog: string }> {
  const child: ChildProcess = spawn(
    'npx',
    ['--yes', `@deepseek-ai/dsh@${dshPinnedVersion}`, '--profile', PROFILE, '--no-open', '--port', '0'],
    {
      cwd: options.dir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DSH_HOME: options.dshHome, PATH: integrationPath() },
      detached: true,
    },
  );
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
  let bootLog = '';
  // 显式 utf8 解码：多字节签名跨块截断时默认 Buffer 拼接会产生烂码（round 1 教训）
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => { bootLog += chunk; });
  child.stderr?.on('data', (chunk: string) => { bootLog += chunk; });
  return new Promise((resolve) => {
    // web 启动行（dsh-web-app shell 打印）：`dsh web: http://127.0.0.1:<port>/?token=<token>`
    const URL_PATTERN = /dsh web: http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/;
    const poll = setInterval(() => {
      const match = bootLog.match(URL_PATTERN);
      if (match) {
        clearInterval(poll);
        clearTimeout(deadline);
        resolve({ ok: true, boot: { port: Number(match[1]), token: match[2], bootLog } });
      }
    }, 500);
    const deadline = setTimeout(() => {
      clearInterval(poll);
      // web boot 形态不可达 = 工单 skip 口径（留宿主日志尾作因），不判失败
      resolve({ ok: false, bootLog });
    }, BOOT_TIMEOUT_MS);
    deadline.unref();
  });
}

// —— web Remote 线层驱动（认证交换 / unary / mux 流；envelope 形态见文件头一手来源）——

/** `GET /?token=<launch token>` 换签名会话 cookie（宿主 303 重定向到干净 `./`）。 */
function exchangeSessionCookie(port: number, token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: `/?token=${token}` }, (res) => {
      const cookies = res.headers['set-cookie'];
      const cookie = cookies?.[0]?.split(';')[0];
      if (res.statusCode !== 303 || cookie === undefined || cookie.length === 0) {
        const body: string[] = [];
        res.on('data', (chunk: string) => body.push(chunk));
        res.on('end', () => reject(new Error(`token 交换应 303 + set-cookie（实际 HTTP ${res.statusCode}）：${body.join('').slice(-300)}`)));
        return;
      }
      res.resume();
      resolve(cookie);
    }).on('error', reject);
  });
}

/** 官方 web index（认证会话页）原文——boot graph 注入其内。 */
function fetchIndex(port: number, cookie: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: '/', headers: { cookie } }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) reject(new Error(`GET / 应 200（实际 HTTP ${res.statusCode}）`));
        else resolve(data);
      });
    }).on('error', reject);
  });
}

/** 官方静态资产 GET（combo 路由走此通道；资产公开但带 cookie 亦合法）。 */
function fetchAsset(port: number, target: string, cookie: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: target, headers: { cookie } }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
    }).on('error', reject);
  });
}

/** Remote 线结果（Connection envelope 的 result 成员，形态与 dsh-typert-protocol RemoteResult 同源）。 */
interface RpcOutcome {
  ok: boolean;
  value?: unknown;
  error?: { code: string; message: string; details?: unknown };
}

/**
 * unary RPC：`POST /api/<endpoint>`，body = Connection envelope
 * {type:'client-request',rpcId,method,payload:{args}}（dsh-client-connection src/client/rpc.ts
 * createWebConnectionRpc 一手形态）。HTTP 层非 200 = 认证/信任栅栏拒绝，显式抛错。
 */
function rpcCall(port: number, cookie: string, endpoint: string, args: Record<string, unknown>): Promise<RpcOutcome> {
  const rpcId = `e2e-${crypto.randomBytes(8).toString('hex')}`;
  const body = JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload: { args } });
  return new Promise((resolve, reject) => {
    const request = http.request(
      { host: '127.0.0.1', port, path: `/api/${endpoint}`, method: 'POST', headers: { 'content-type': 'application/json', cookie, 'content-length': Buffer.byteLength(body) } },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`POST /api/${endpoint} 应 200（实际 HTTP ${res.statusCode}）：${data.slice(-300)}`));
            return;
          }
          let envelope: unknown;
          try {
            envelope = JSON.parse(data);
          } catch {
            reject(new Error(`POST /api/${endpoint} 响应非 JSON：${data.slice(-300)}`));
            return;
          }
          const row = envelope as { type?: unknown; rpcId?: unknown; result?: RpcOutcome };
          if (row.type !== 'server-response' || row.rpcId !== rpcId || typeof row.result?.ok !== 'boolean') {
            reject(new Error(`POST /api/${endpoint} 响应 envelope 不合 Connection 契约：${data.slice(-300)}`));
            return;
          }
          resolve(row.result);
        });
      },
    );
    request.on('error', reject);
    request.end(body);
  });
}

// —— 最小 WebSocket mux 客户端（文本帧；不 offer permessage-deflate，宿主按协商语义不下发
// 压缩帧；宿主 Ping 必须回 Pong——心跳两拍无活动即被断，websocketHeartbeatIntervalMs）——

function encodeClientFrame(opcode: number, payload: Buffer): Buffer {
  const mask = crypto.randomBytes(4);
  const masked = Buffer.from(payload);
  for (let i = 0; i < masked.length; i += 1) masked[i] = masked[i] ^ mask[i % 4];
  if (payload.length < 126) {
    return Buffer.concat([Buffer.from([0x80 | opcode, 0x80 | payload.length]), mask, masked]);
  }
  const header = Buffer.alloc(4);
  header[0] = 0x80 | opcode;
  header[1] = 0x80 | 126;
  header.writeUInt16BE(payload.length, 2);
  return Buffer.concat([header, mask, masked]);
}

function decodeServerFrame(buffer: Buffer): { opcode: number; payload: Buffer; rest: Buffer } | null {
  if (buffer.length < 2) return null;
  const opcode = buffer[0] & 0x0f;
  const len7 = buffer[1] & 0x7f;
  let offset = 2;
  let length = len7;
  if (len7 === 126) {
    if (buffer.length < 4) return null;
    length = buffer.readUInt16BE(2);
    offset = 4;
  } else if (len7 === 127) {
    if (buffer.length < 10) return null;
    length = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }
  if (buffer.length < offset + length) return null;
  return { opcode, payload: buffer.subarray(offset, offset + length), rest: buffer.subarray(offset + length) };
}

/** Gateway mux 流帧（dsh-api-gateway src/stream-protocol.ts RemoteStreamServerMessage 一手形态）。 */
interface MuxFrame {
  type: 'item' | 'error' | 'end';
  streamId: string;
  value?: unknown;
  error?: { code: string; message: string; details?: object };
}

interface MuxStream {
  frames: MuxFrame[];
  send(message: unknown): void;
  close(): void;
}

function openMuxStream(port: number, cookie: string): Promise<MuxStream> {
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1',
      port,
      path: MUX_PATH,
      headers: {
        cookie,
        connection: 'Upgrade',
        upgrade: 'websocket',
        'sec-websocket-key': crypto.randomBytes(16).toString('base64'),
        'sec-websocket-version': '13',
      },
    });
    request.on('upgrade', (_res, socket) => {
      // 帧缓冲：subarray 视图携带 ArrayBufferLike，累加器显式放宽类型参数（Strict 全开）
      let buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
      const stream: MuxStream = {
        frames: [],
        send(message) {
          socket.write(encodeClientFrame(0x1, Buffer.from(JSON.stringify(message), 'utf8')));
        },
        close() {
          socket.destroy();
        },
      };
      socket.on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        for (;;) {
          const frame = decodeServerFrame(buffer);
          if (frame === null) break;
          buffer = frame.rest;
          if (frame.opcode === 9) {
            socket.write(encodeClientFrame(0xA, frame.payload)); // ping → pong
          } else if (frame.opcode === 0x1) {
            try {
              stream.frames.push(JSON.parse(frame.payload.toString('utf8')) as MuxFrame);
            } catch {
              // 非本流协议的文本帧（宿主日志面）——不影响断言面，忽略
            }
          }
        }
      });
      resolve(stream);
    });
    request.on('response', (res) => reject(new Error(`mux 升级应 101（实际 HTTP ${res.statusCode}）`)));
    request.on('error', reject);
    request.end();
  });
}

/**
 * 轮询 mux 流帧直到 watch item 满足谓词（item.value = 官方 McpManagedServerView[] 全量批次）。
 * 返回 matched=false 时附已见末帧快照供失败定位（e2e 失败留证据纪律）。
 */
async function waitForWatchItem(
  stream: MuxStream,
  predicate: (views: Array<Record<string, unknown>>) => boolean,
  options: { timeoutMs: number; fromIndex?: number },
): Promise<{ matched: boolean; lastSeen: string }> {
  const deadline = Date.now() + options.timeoutMs;
  // 起始偏移（评审 137e 阻断 4）：restart 类「此后应发生」断言由调用方快照帧位传入，
  // 只对快照后帧求值——从流头重扫会被 restart 前 stale 帧满足，断言空转失效。
  let index = options.fromIndex ?? 0;
  let lastSeen = '（无 item 帧）';
  while (Date.now() < deadline) {
    while (index < stream.frames.length) {
      const frame = stream.frames[index];
      index += 1;
      // error 帧提前 fail（评审 137e 建议 #8）：流级失败不可能再被 item 满足，带详情即返
      if (frame.type === 'error') {
        return { matched: false, lastSeen: `mux 流 error 帧：${JSON.stringify(frame.error)}` };
      }
      if (frame.type !== 'item' || !Array.isArray(frame.value)) continue;
      const views = frame.value as Array<Record<string, unknown>>;
      lastSeen = JSON.stringify(views);
      if (predicate(views)) return { matched: true, lastSeen };
    }
    await sleep(500);
  }
  return { matched: false, lastSeen };
}

function viewOf(views: Array<Record<string, unknown>>, name: string): Record<string, unknown> | undefined {
  return views.find((view) => view.name === name);
}

function statusOf(view: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  return view?.status as Record<string, unknown> | undefined;
}

// —— 落盘断言（round 1 同法：官方 YAML 格式不作钉字面断言，真解析后深找条目对象按字段断言）——

function findEntry(node: unknown, key: string): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findEntry(item, key);
      if (hit) return hit;
    }
    return null;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === key && v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
      const hit = findEntry(v, key);
      if (hit) return hit;
    }
  }
  return null;
}

// —— 主链路真跑 ——

test(`[FR-8|集成级] ${PKG} 真 boot dsh web 形态：combo 路由分发 client bundle → Remote 数据链路（watch/settings 写/restart/probe）端到端；含连接失败流贯穿（FR-4）`, async (t) => {
  if (!assertGate(t)) return;

  // —— 准备段：临时 DSH_HOME（绝不指向 ~/.dsh——round 1 环境事故教训）+ 官方链路装插件 ——
  const dshHome = makeTempDir(t, 'dsh-mcp-web-e2e-home-');
  const workDir = makeTempDir(t, 'dsh-mcp-web-e2e-work-');
  const tarball = await packPluginTarball(t);
  initWebProfile(dshHome);
  pluginAddTarball(dshHome, tarball);
  pinManager(dshHome);
  assertProfileMountPoints(dshHome);
  writeEchoServer(workDir);

  // —— boot 官方 web 应用（--port 0 = OS 择口，无端口占用耦合；启动行不可达 = skip 口径留因）——
  const booted = await bootWebHost(t, { dir: workDir, dshHome });
  if (!booted.ok) {
    t.skip(`前置门：web boot 形态不可达（${BOOT_TIMEOUT_MS / 1000}s 内无 dsh web 启动行）——宿主日志尾：${booted.bootLog.slice(-800)}`);
    return;
  }
  const { port, token } = booted.boot;

  // —— boot 激活卫生（08f8 修复验证面）：无行激活失败（duplicate service 形态）、无兼容门
  // 禁用（"disabling profile plugin row" = 行版本与宿主不同 rc 的组合病灶；钉版 + 行条件化
  // 修复后两者都不应再现。官方补位行在 web 组合按 disabled 表达式静默禁用，不产生告警）——
  assert.ok(
    !booted.boot.bootLog.includes('did not activate'),
    `boot 日志不应含行激活失败（08f8 后 web 组合官方行独供 mcpManager）：宿主日志：${booted.boot.bootLog.slice(-1500)}`,
  );
  assert.ok(
    !booted.boot.bootLog.includes('disabling profile plugin row'),
    `boot 日志不应含兼容门禁用行（钉版组合下行版本应与宿主同 rc）：宿主日志：${booted.boot.bootLog.slice(-1500)}`,
  );

  // —— 认证交换：launch token → 签名会话 cookie（浏览器会话同一通道）——
  const cookie = await exchangeSessionCookie(port, token);

  // —— combo 路由腿：boot graph 含本包 entry（dsh.client 声明 + inject 边）→ combo URL 200 分发本包 bundle ——
  const indexHtml = await fetchIndex(port, cookie);
  const graphMatch = indexHtml.match(/globalThis\["__DSH_BOOT__"\] = (\{[\s\S]*?\})<\/script>/);
  assert.ok(graphMatch, `web index 应注入 __DSH_BOOT__ graph（dsh-client-modules index-injection 契约）；实际尾部：${indexHtml.slice(-500)}`);
  const graph = JSON.parse(graphMatch[1]) as {
    entries: Array<{ id: string; url: string; rev: string; inject?: string[] }>;
    batches: Array<{ phase: string; url: string; entries: string[] }>;
  };
  const entry = graph.entries.find((row) => row.id === PKG);
  assert.ok(entry, `boot graph entries 应含本包 ${PKG}（dsh.client 声明经官方扫描入表）；实际 ids：${graph.entries.map((row) => row.id).join(', ')}`);
  // combo 路由形态（dsh-client-modules.md 一手契约）：/plugins/??<包名>/client.js&rev=<rev>
  assert.match(
    entry.url,
    new RegExp(`^plugins/\\?\\?${PKG.replace(/\//g, '\\/')}\\/client\\.js&rev=[0-9a-f]+$`),
    `本包 entry url 应为版本化单资源 combo 引用：${entry.url}`,
  );
  // inject 边 = package.json dsh.client.inject 声明（客户端面板依赖的两个官方包边）
  assert.ok(
    entry.inject?.includes('@deepseek-ai/dsh-api-remotes') && entry.inject?.includes('@deepseek-ai/dsh-client-ui-sidebar-right'),
    `本包 entry inject 边应含官方 remote facade 与 sidebar-right（dsh.client.inject 声明）：${JSON.stringify(entry.inject)}`,
  );
  assert.ok(
    graph.batches.some((batch) => batch.entries.includes(PKG)),
    `本包 entry 应落在某个初始 combo 批次内（每 entry 恰属一批）：${JSON.stringify(graph.batches.map((batch) => batch.entries))}`,
  );
  // combo 脚本真分发：GET 组合 URL → 200 + lazy-CJS factory 注册 + 本包写面代码在场
  const combo = await fetchAsset(port, `/${entry.url}`, cookie);
  assert.equal(combo.status, 200, `combo 路由 GET ${entry.url} 应 200（实际 HTTP ${combo.status}）`);
  assert.ok(combo.body.includes('__ModuleLoader__'), 'combo 脚本应含官方 ModuleLoader 注册面（lazy-CJS factory 形态）');
  assert.ok(combo.body.includes(PKG), `combo 脚本应含本包注册 id：${PKG}`);
  assert.ok(combo.body.includes('createMcpPanelWrites'), 'combo 脚本应含本包写面工厂（Dock 页写操作通道的载体代码随包分发）');

  // —— watch 流腿：mux 开流 → 订阅即推全量列表 ——
  const watch = await openMuxStream(port, cookie);
  t.after(() => watch.close());
  watch.send({ type: 'open', streamId: 'e2e-watch', endpoint: 'mcpManager/watch', payload: { args: {} } });
  const initial = await waitForWatchItem(watch, () => true, { timeoutMs: CONNECT_TIMEOUT_MS });
  assert.ok(initial.matched, `watch 流订阅应推送全量列表批次（${CONNECT_TIMEOUT_MS / 1000}s 内无 item 帧）`);
  const initialViews = JSON.parse(initial.lastSeen) as Array<Record<string, unknown>>;
  // 首批内容契约（评审 137e 建议 #9 内容级替换永真断言）：每项具备官方 McpManagedServerView
  // 的关键字段形（dsh-mcp-manager types 一手形状）
  assert.ok(
    initialViews.every((view) => typeof view['name'] === 'string' && 'configured' in view && view['status'] !== null && typeof view['status'] === 'object'),
    `watch 首批应符合 McpManagedServerView 形：${initial.lastSeen.slice(0, 400)}`,
  );

  // —— settings 写腿（同一模块通道）：describe 派生域真跑 update（08f8 后插件写面同一派生
  // 语义：唯一 servers 域；测试另钉字面 mcp-manager = 官方组合契约独立期望值）→ watch 推送
  // 新条目 → 官方 reconcile 挂载连接 → 落盘 cordis.patch.yml ——
  const describe = await rpcCall(port, cookie, 'settings/describe', {});
  assert.ok(describe.ok, `settings/describe 应成功：${JSON.stringify(describe.error)}`);
  const namespaces = (describe.value as { namespaces?: Array<{ ns: string; value?: unknown }> }).namespaces ?? [];
  const serversDomains = namespaces.filter(
    (row) => row.value !== null && typeof row.value === 'object' && !Array.isArray(row.value) && 'servers' in (row.value as object),
  );
  assert.equal(
    serversDomains.length,
    1,
    `server 配置域应恰一个（零/多在场 = 组合契约破坏，插件派生 fail loud 同语义）：${JSON.stringify(serversDomains.map((row) => row.ns))}`,
  );
  assert.equal(
    serversDomains[0]?.ns,
    OFFICIAL_MCP_NS,
    `server 配置域应为官方行 id 派生的 ${OFFICIAL_MCP_NS}：实际 ${serversDomains[0]?.ns}（全 ns：${namespaces.map((row) => row.ns).join(', ')}）`,
  );
  const addResult = await rpcCall(port, cookie, 'settings/update', {
    ns: OFFICIAL_MCP_NS,
    // entry 形态 = client/index.ts addServer 的 stdio 构造（transport/command/args，无 enabled 键）
    patch: { servers: { [SERVER_NAME]: { transport: 'stdio', command: 'node', args: [path.join(workDir, ECHO_SERVER_FILE)] } } },
  });
  assert.ok(addResult.ok, `settings/update（ns ${OFFICIAL_MCP_NS}，UI 面 entry 形态）应成功：${JSON.stringify(addResult.error)}`);
  const connected = await waitForWatchItem(
    watch,
    (views) => statusOf(viewOf(views, SERVER_NAME))?.state === 'connected',
    { timeoutMs: CONNECT_TIMEOUT_MS },
  );
  assert.ok(connected.matched, `${SERVER_NAME} 应经官方 reconcile 连接成功（watch 推送）——末帧：${connected.lastSeen.slice(0, 500)}`);

  // —— restart/probe 腿（同一模块通道的 mcpManager Remote 面）——
  const restartResult = await rpcCall(port, cookie, 'mcpManager/restart', { name: SERVER_NAME });
  assert.ok(restartResult.ok, `mcpManager/restart(${SERVER_NAME}) 应可调且成功：${JSON.stringify(restartResult.error)}`);
  // restart 前快照帧位（评审 137e 阻断 4）：重建断言只对快照后帧求值——restart 前已投递的
  // connected 帧（写腿阶段）不得满足「restart 后重建」
  const framesBeforeRestart = watch.frames.length;
  const rebuilt = await waitForWatchItem(
    watch,
    (views) => statusOf(viewOf(views, SERVER_NAME))?.state === 'connected',
    { timeoutMs: CONNECT_TIMEOUT_MS, fromIndex: framesBeforeRestart },
  );
  assert.ok(rebuilt.matched, `restart 后 ${SERVER_NAME} 应重建连接（watch 推送）——末帧：${rebuilt.lastSeen.slice(0, 500)}`);
  const probeResult = await rpcCall(port, cookie, 'mcpManager/probe', { name: SERVER_NAME });
  assert.ok(probeResult.ok, `mcpManager/probe(${SERVER_NAME}) 应可调：${JSON.stringify(probeResult.error)}`);
  const probeValue = probeResult.value as { ok?: boolean; toolNames?: string[]; durationMs?: number };
  assert.equal(probeValue.ok, true, `probe 应投成功结果（官方 McpProbeResult）：${JSON.stringify(probeValue)}`);
  assert.ok(
    Array.isArray(probeValue.toolNames) && probeValue.toolNames.includes('echo'),
    `probe 结果 toolNames 应含 echo（宿主已真拉 server 工具清单）：${JSON.stringify(probeValue)}`,
  );

  // —— 落盘腿：profile cordis.patch.yml 出现持久化条目（官方 Settings→ConfigEditor 写盘）——
  const profilePatch = fs.readFileSync(path.join(dshHome, 'profiles', PROFILE, 'cordis.patch.yml'), 'utf8');
  const patchDoc = loadYaml(profilePatch) as unknown;
  const persisted = findEntry(patchDoc, SERVER_NAME);
  assert.ok(persisted, `profile cordis.patch.yml 应含 ${SERVER_NAME} 持久化条目（js-yaml 真解析）：\n${profilePatch}`);
  assert.equal(persisted['transport'], 'stdio', `持久化条目 transport 应为 stdio：${JSON.stringify(persisted)}`);
  assert.equal(persisted['command'], 'node', `持久化条目 command 应为 node：${JSON.stringify(persisted)}`);
  assert.match(
    JSON.stringify(persisted['args']),
    new RegExp(ECHO_SERVER_FILE.replace(/\./g, '\\.')),
    `持久化条目 args 应含 echo server 说明符：${JSON.stringify(persisted)}`,
  );

  // —— 失败流腿（FR-4，同一模块通道添加连不上的 server）：watch 推送 failed + 原因线索 →
  // 条目保留 → restart 后状态可见，全程不重启宿主 ——
  const deadAdd = await rpcCall(port, cookie, 'settings/update', {
    ns: OFFICIAL_MCP_NS,
    // entry 形态 = client/index.ts addServer 的 streamable-http 构造（transport/url，无 reconnect 键
    // ——UI 面不暴露高级字段，重连预算走官方默认：500ms 指数退避至 30s × 10 次 → gave-up）
    patch: { servers: { [DEAD_NAME]: { transport: 'streamable-http', url: 'http://127.0.0.1:9/mcp' } } },
  });
  assert.ok(deadAdd.ok, `settings/update 添加 ${DEAD_NAME}（不可达 url）应成功提交：${JSON.stringify(deadAdd.error)}`);
  const failed = await waitForWatchItem(
    watch,
    (views) => {
      const status = statusOf(viewOf(views, DEAD_NAME));
      return status?.state === 'failed' && status?.reason === 'gave-up';
    },
    { timeoutMs: GAVEUP_TIMEOUT_MS },
  );
  assert.ok(failed.matched, `${DEAD_NAME} 应投 failed(gave-up)（官方重连预算耗尽）——末帧：${failed.lastSeen.slice(0, 600)}`);
  const failedViews = JSON.parse(failed.lastSeen) as Array<Record<string, unknown>>;
  const failedStatus = statusOf(viewOf(failedViews, DEAD_NAME)) as { lastError?: string } | undefined;
  assert.ok(
    typeof failedStatus?.lastError === 'string' && failedStatus.lastError.length > 0,
    `failed 状态应带 lastError 原因线索：${JSON.stringify(failedStatus)}`,
  );
  // 条目保留：failed 帧的全量批次里条目仍在（configured=true），且落盘持久化
  assert.equal(viewOf(failedViews, DEAD_NAME)?.configured, true, `${DEAD_NAME} 失败后条目应保留（configured=true）`);
  const patchAfterDead = loadYaml(fs.readFileSync(path.join(dshHome, 'profiles', PROFILE, 'cordis.patch.yml'), 'utf8')) as unknown;
  const deadPersisted = findEntry(patchAfterDead, DEAD_NAME);
  assert.ok(deadPersisted, `${DEAD_NAME} 条目应持久化到 profile cordis.patch.yml：\n${JSON.stringify(deadPersisted)}`);
  assert.equal(deadPersisted['url'], 'http://127.0.0.1:9/mcp', `${DEAD_NAME} 持久化条目应保留不可达 url 原样：${JSON.stringify(deadPersisted)}`);

  // restart 后状态可见（同一 Remote 面可调，不重启宿主）：新预算 → connecting/reconnecting
  // 周期重推；同样 restart 前快照帧位——restart 前 failed(gave-up) 帧（含 connecting 历史）
  // 不得满足「restart 后状态可见」（评审 137e 阻断 4 第二调用点）
  const deadRestart = await rpcCall(port, cookie, 'mcpManager/restart', { name: DEAD_NAME });
  assert.ok(deadRestart.ok, `mcpManager/restart(${DEAD_NAME}) 应可调：${JSON.stringify(deadRestart.error)}`);
  const framesBeforeDeadRestart = watch.frames.length;
  const visible = await waitForWatchItem(
    watch,
    (views) => {
      const state = statusOf(viewOf(views, DEAD_NAME))?.state;
      return state === 'connecting' || state === 'reconnecting';
    },
    { timeoutMs: RESTART_VISIBLE_TIMEOUT_MS, fromIndex: framesBeforeDeadRestart },
  );
  assert.ok(visible.matched, `restart 后 ${DEAD_NAME} 应以新预算重投连接周期（watch 推送可见）——末帧：${visible.lastSeen.slice(0, 500)}`);
});

// —— FR-7 集成承载（spec 20261119-7a9a 验收场景 [FR-7|集成级|承载票 20261119-d0ff]）——
//
// 剥依赖后端到端回归：本地 pack 修订后插件 tarball（f3e4 产物：dependencies 无 manager、
// 可选 peer ^0.2.2-rc.2）经官方命令装进临时 web profile，真跑 boot 断言四件事：
// ① /mcp 命令注册可用——注册观测仪器经官方解析面 commands.find(agentLike,'mcp') 发现 +
//    handler('list') 真调返回 kind=success；
// ② mcp_manage 工具注册可用——tools.get 发现 + 只读 list execute 真调返回 ok=true；
// ③ 官方 manager 行 active——正面链 = 观测仪器 inject mcpManager 激活成功（web 组合唯一
//    provider 是官方行：插件补位行按 startedBundles 条件让位，让位失效则两行 duplicate
//    留 "did not activate"，下方负面断言同位拦截）+ 供给 manager 实装版本 = 运行时同版
//    （兼容星座钉版）+ mcpManager/watch mux 流收到全量批次（Remote 面真活）；负面面 =
//    boot 日志无行激活失败、无兼容门禁用（与上方 FR-8 用例同口径）；
// ④ 安装本插件后 profile 依赖树无 manager 副本（FR-1 集成面）——断言点在 manager 供给
//    步骤之前：官方 web 模板 dependencies 为空（一手探针 2026-11-20：--from-default-profile
//    web 落盘 dependencies:{} + nodeLinker:hoisted + autoInstallPeers:false）、插件已剥依赖
//    （实装清单 dependencies 无 manager，剥依赖产物经 pack→官方装往返存活的工件级锚）、
//    pnpm 12 对可选 peer 两形态均不自动装（f3e4 实证）三因共证；node_modules 全树扫
//    （含嵌套层，hoisted 布局下副本只可能以名为 dsh-mcp-manager 的目录存在）。manager
//    供给按就绪核验处方段 2 同形态补装（src/kernel/readiness.ts managerPrescriptionLines
//    一手文本：pnpm --dir "<profile>" add manager@<运行时版>）——供给责任移交安装流
//    （spec 方案 2），供给后钉实装版本 = 运行时同版。
//
// 前置门四条件（ad91 形态映射，工单 AC4）：node 版本 ≥24.9.0 / registry 可达 / 兼容星座
// 可达——复用上方 assertGate 三探测，各 skip 留因（版本家族正则沿既有 rc 宽松匹配，不硬钉）；
// 「包已 pack」= 本地 pack 真跑（tarball 形态不依赖 registry 发布，ad91「包未发布」条件的
// 本形态映射，round 1 sdk 用例同款口径），pack 命令失败 skip 留输出尾；仓库树残留核对在
// skip 捕获面之外保持真失败（postpack 还原被破坏 = 永不放行形态，falsified-form-gate 纪律）。
//
// 真实协作者 = 官方 dsh web 宿主（boot/token/认证/loader/gateway/manager 全官方链路）；
// 受控替身两件 = 临时 DSH_HOME + 注册观测仪器（--patch overlay 测试资产，随临时目录生成
// 销毁；round 1 sdk 形态同款仪器方法，本形态不退出宿主进程）。写通道端到端归 round 1
// sdk 用例（/mcp add 全流）与本文件上方 FR-8 用例（Remote 线层全流，零修改回归基线）——
// 本用例只钉剥依赖后的注册面与供给链，不重复承载。

const OBSERVER_MODULE_FILE = 'dsh-mcp-web-fr7-observer.mjs';
const OBSERVER_PATCH_FILE = 'dsh-mcp-web-fr7-observer.patch.yml';
// 观测签名（emit 行格式与 observer 源共享口径；'PROBE ' 前缀区分宿主自身日志）
const SIG_COMMAND_FOUND = /PROBE commands\.find\(mcp\): FOUND/;
const SIG_TOOL_FOUND = /PROBE tools\.get\(mcp_manage\): FOUND/;
const SIG_COMMAND_LIST_OK = /PROBE mcp list: kind=success/;
const SIG_TOOL_LIST_OK = /PROBE mcp_manage list: ok=true/;
const SIG_OBSERVER_CRASH = /PROBE OBSERVER-CRASH:/;
// 仪器观测等待预算（仪器 apply 后延迟 2s 驱动；宿主 boot 完成时签名通常已在盘）
const OBSERVER_TIMEOUT_MS = 60 * 1000;

// 前置门条件「包已 pack」：本地 pack 剥依赖修订后的插件 tarball。pack 命令失败（含依赖未装
// 的 MODULE_NOT_FOUND 等环境形态）→ skip 留输出尾；仓库树残留核对（postpack 还原）抛错
// 穿透 skip 捕获面 = 真失败。
async function packTarballOrSkip(t: TestContext): Promise<string | null> {
  const destDir = makeTempDir(t, 'dsh-mcp-web-fr7-pack-');
  const tarball = path.join(destDir, `hankchen-dsh-mcp-${PKG_MANIFEST.version}.tgz`);
  let packed = false;
  let failure = '';
  await withPackLock(() => {
    const result = runCommand('pnpm', ['pack', '--pack-destination', destDir], { timeout: INSTALL_TIMEOUT_MS, cwd: PLUGIN_DIR });
    if (result.code !== 0) {
      failure = `pnpm pack 退出码 ${result.code}（${result.error?.message ?? ''}）：${result.output.slice(-800)}`;
      return;
    }
    // 仓库树零构建纪律的兜底核对——发布面还原回归必须真失败，不吃下方 skip
    assert.equal(fs.existsSync(path.join(PLUGIN_DIR, 'index.js')), false, 'postpack 应已还原仓库树（包目录无 index.js 残留）');
    assert.equal(fs.existsSync(path.join(PLUGIN_DIR, 'client.js')), false, 'postpack 应已还原仓库树（包目录无 client.js 残留）');
    if (!fs.existsSync(tarball)) {
      failure = `pack 产物不在目标目录：${tarball}（输出：${result.output.slice(-500)}）`;
      return;
    }
    packed = true;
  });
  if (!packed) {
    t.skip(`前置门：包未 pack（本地 pnpm pack 未产出 tarball——环境不可达，留因不静默）——${failure}`);
    return null;
  }
  return tarball;
}

// FR-1 集成面：安装本插件后 profile 依赖树无 manager 副本。三面断言：
// 声明面（profile dependencies）/ 实装树面（node_modules 全树扫）/ 插件自带依赖面
// （实装插件清单 dependencies——剥依赖产物经 pack→官方装往返的工件级锚）。
function scanManagerCopies(root: string): string[] {
  const hits: string[] = [];
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // 目录不存在（无 node_modules）= 无副本
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === 'dsh-mcp-manager') {
        hits.push(path.relative(root, full));
        continue; // 副本内部不再下钻
      }
      walk(full);
    }
  };
  walk(root);
  return hits;
}

function assertProfileTreeWithoutManagerCopy(dshHome: string): void {
  const profileDir = path.join(dshHome, 'profiles', PROFILE);
  // Given 自证：常规安装路径形态在场（官方 web 模板 pnpm-workspace.yaml 一手探针形态）
  const workspaceYaml = fs.readFileSync(path.join(profileDir, 'pnpm-workspace.yaml'), 'utf8');
  assert.match(workspaceYaml, /autoInstallPeers:\s*false/, 'profile 工作区应处 autoInstallPeers:false（FR-1 Given 的常规安装路径）');
  const profilePkg = JSON.parse(fs.readFileSync(path.join(profileDir, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  assert.ok(
    typeof profilePkg.dependencies?.[PKG] === 'string' && profilePkg.dependencies[PKG].length > 0,
    `插件依赖行应落盘（官方 add 写入）：${JSON.stringify(profilePkg.dependencies)}`,
  );
  assert.equal(
    profilePkg.dependencies?.[MANAGER_PACKAGE],
    undefined,
    `profile 依赖声明不应含 manager（供给前）：${JSON.stringify(profilePkg.dependencies)}`,
  );
  const hits = scanManagerCopies(path.join(profileDir, 'node_modules'));
  assert.deepEqual(hits, [], `profile 依赖树不应出现 manager 副本（FR-1 集成面）：${JSON.stringify(hits)}`);
  const installedPlugin = JSON.parse(
    fs.readFileSync(path.join(profileDir, 'node_modules', ...PKG.split('/'), 'package.json'), 'utf8'),
  ) as { dependencies?: Record<string, string> };
  assert.equal(
    installedPlugin.dependencies?.[MANAGER_PACKAGE],
    undefined,
    '实装插件包清单 dependencies 不应含 manager（剥依赖产物经 pack→官方装往返存活）',
  );
}

// manager 供给（就绪核验处方段 2 同形态，供给责任移交安装流）：pnpm --dir "<profile>" add
// manager@<运行时版>；供给后钉实装版本 = 兼容星座同版（boot 兼容门 peer 精确钉同 rc）。
function supplyManagerPerPrescription(dshHome: string): void {
  const profileDir = path.join(dshHome, 'profiles', PROFILE);
  const result = runCommand('pnpm', ['--dir', profileDir, 'add', `${MANAGER_PACKAGE}@${managerPinnedVersion}`], { timeout: INSTALL_TIMEOUT_MS });
  assertCommandOk(`按处方段 2 补装 manager@${managerPinnedVersion}`, result);
  const supplied = JSON.parse(
    fs.readFileSync(path.join(profileDir, 'node_modules', ...MANAGER_PACKAGE.split('/'), 'package.json'), 'utf8'),
  ) as { version: string };
  assert.equal(supplied.version, managerPinnedVersion, '安装流供给的 manager 实装版本应等于运行时同版（兼容星座钉版）');
}

// 注册观测仪器（round 1 sdk 形态同款方法：apply 内同步解引用服务实例——生命周期实证
// apply 返回后 ctx proxy get 被拒；延迟 2s 等插件行注册完成再驱动观测；本形态不退出宿主）。
// inject: [commands, tools, mcpManager] 任一缺席本行 pending 不激活 → 无任何 PROBE 行 →
// 测试签名等待超时失败（仪器激活本身就是官方 manager 行供出服务的正面证据）。
function writeRegistrationObserver(dir: string): string {
  fs.writeFileSync(path.join(dir, OBSERVER_MODULE_FILE), `// 注册观测仪器（测试资产，票 20261119-d0ff 自动生成，勿手工维护）：
// 观测面 = 注册 seam 的外部可观察行为：/mcp 经官方解析面 commands.find(agentLike,'mcp')
// （伪 agent {id} 安全：scopeChainOf 未知 scope 键只落 global 层，round 1 真跑实证）+
// handler('list') 真调；mcp_manage 经 tools.get + 只读 list execute 真调。
// 结果行写 stderr（宿主 boot 日志捕获），'PROBE ' 前缀与测试断言共享常量口径。
const emit = (line) => process.stderr.write('PROBE ' + line + '\\n');
const AGENT = { id: 'dsh-mcp-web-fr7-agent' };
async function main(services) {
  const commandDef = services.commands.find(AGENT, 'mcp');
  emit('commands.find(mcp): ' + (commandDef ? 'FOUND' : 'MISSING'));
  const toolDef = services.tools.get('mcp_manage');
  emit('tools.get(mcp_manage): ' + (toolDef ? 'FOUND' : 'MISSING'));
  if (commandDef) {
    const listResult = await commandDef.handler({ agent: AGENT, rawInput: 'list' });
    emit('mcp list: kind=' + listResult.kind + ' text=' + JSON.stringify(listResult.text));
  }
  if (toolDef) {
    const listOutcome = await toolDef.execute({ action: 'list' }, { signal: new AbortController().signal });
    emit('mcp_manage list: ok=' + String(listOutcome?.ok === true)
      + ' servers=' + JSON.stringify(Array.isArray(listOutcome?.servers) ? listOutcome.servers.length : null));
  }
  emit('observer done');
}
export const name = 'dsh-mcp-web-fr7-observer';
export function apply(ctx) {
  const services = { commands: ctx.commands, tools: ctx.tools };
  emit('observer applied: commands=' + typeof services.commands + ' tools=' + typeof services.tools);
  setTimeout(() => {
    main(services).catch((err) => emit('OBSERVER-CRASH: ' + (err && err.stack ? err.stack : String(err))));
  }, 2000);
}
`);
  const patchPath = path.join(dir, OBSERVER_PATCH_FILE);
  fs.writeFileSync(patchPath, `# 测试仪器挂载（--patch overlay；条目相对说明符按本文件所在目录解析）
- insert:
    - id: dsh-mcp-web-fr7-observer
      name: './${OBSERVER_MODULE_FILE}'
      inject: [commands, tools, mcpManager]
`);
  return patchPath;
}

interface ObserverBoot {
  ok: boolean;
  port: number;
  token: string;
  log: () => string;
}

// boot 官方 web 宿主（--patch 挂观测仪器；detached 进程组纪律沿既有 bootWebHost 同款——
// 直接 SIGKILL npx 会留下存活的 dsh 孙进程，settle 时整组收杀）。
function bootWebWithObserver(
  t: TestContext,
  options: { dir: string; dshHome: string; observerPatch: string },
): Promise<ObserverBoot> {
  const child: ChildProcess = spawn(
    'npx',
    ['--yes', `@deepseek-ai/dsh@${dshPinnedVersion}`, '--profile', PROFILE, '--patch', options.observerPatch, '--no-open', '--port', '0'],
    {
      cwd: options.dir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DSH_HOME: options.dshHome, PATH: integrationPath() },
      detached: true,
    },
  );
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
  let bootLog = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => { bootLog += chunk; });
  child.stderr?.on('data', (chunk: string) => { bootLog += chunk; });
  return new Promise((resolve) => {
    const URL_PATTERN = /dsh web: http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/;
    const poll = setInterval(() => {
      const match = bootLog.match(URL_PATTERN);
      if (match) {
        clearInterval(poll);
        clearTimeout(deadline);
        resolve({ ok: true, port: Number(match[1]), token: match[2], log: () => bootLog });
      }
    }, 500);
    const deadline = setTimeout(() => {
      clearInterval(poll);
      // web boot 形态不可达 = skip 口径（留宿主日志尾作因），不判失败
      resolve({ ok: false, port: 0, token: '', log: () => bootLog });
    }, BOOT_TIMEOUT_MS);
    deadline.unref();
  });
}

// 轮询累积 boot 日志直到签名命中（或崩溃签名提前失败）；失败附日志尾快照供定位
//（e2e 失败留证据纪律）。日志跨 chunk 拼接由显式 utf8 解码保证（多字节签名不烂码）。
async function waitForBootSignature(
  readLog: () => string,
  pattern: RegExp,
  options: { timeoutMs: number },
): Promise<{ matched: boolean; snapshot: string }> {
  const deadline = Date.now() + options.timeoutMs;
  for (;;) {
    const log = readLog();
    if (pattern.test(log)) return { matched: true, snapshot: log.slice(-800) };
    if (SIG_OBSERVER_CRASH.test(log)) return { matched: false, snapshot: log.slice(-1200) };
    if (Date.now() >= deadline) return { matched: false, snapshot: log.slice(-1200) };
    await sleep(500);
  }
}

async function expectObserverSignature(readLog: () => string, pattern: RegExp, what: string): Promise<void> {
  const outcome = await waitForBootSignature(readLog, pattern, { timeoutMs: OBSERVER_TIMEOUT_MS });
  assert.ok(outcome.matched, `${what}（${OBSERVER_TIMEOUT_MS / 1000}s 内未观测到签名）——宿主日志尾：${outcome.snapshot}`);
}

test(`[FR-7|集成级] ${PKG} 剥依赖后真跑回归：官方命令装进 web profile → 真 boot → /mcp 命令与 mcp_manage 工具注册可用、官方 manager 行 active、安装后依赖树无 manager 副本`, async (t) => {
  // 前置门四条件：node 版本 / pnpm / registry / 兼容星座（assertGate 内各 skip 留因）+
  // 包已 pack（packTarballOrSkip skip 留输出尾）
  if (!assertGate(t)) return;

  // —— 准备段：临时 DSH_HOME（绝不指向 ~/.dsh）+ 官方链路装剥依赖插件（无供给步骤）——
  const dshHome = makeTempDir(t, 'dsh-mcp-web-fr7-home-');
  const workDir = makeTempDir(t, 'dsh-mcp-web-fr7-work-');
  const tarball = await packTarballOrSkip(t);
  if (tarball === null) return;
  initWebProfile(dshHome);
  pluginAddTarball(dshHome, tarball);

  // —— FR-1 集成面：安装本插件后（供给前）profile 依赖树无 manager 副本 ——
  assertProfileTreeWithoutManagerCopy(dshHome);

  // —— manager 供给责任移交安装流（处方段 2 同形态补装，钉运行时同版）——
  supplyManagerPerPrescription(dshHome);

  // —— boot 官方 web 宿主（--patch 挂注册观测仪器；启动行不可达 = skip 口径留因）——
  const observerPatch = writeRegistrationObserver(workDir);
  const booted = await bootWebWithObserver(t, { dir: workDir, dshHome, observerPatch });
  if (!booted.ok) {
    t.skip(`前置门：web boot 形态不可达（${BOOT_TIMEOUT_MS / 1000}s 内无 dsh web 启动行）——宿主日志尾：${booted.log().slice(-800)}`);
    return;
  }

  // —— 激活卫生（与上方 FR-8 用例同口径的负面面）：无行激活失败、无兼容门禁用 ——
  assert.ok(
    !booted.log().includes('did not activate'),
    `boot 日志不应含行激活失败（官方行独供 mcpManager、插件补位行让位生效）：宿主日志：${booted.log().slice(-1500)}`,
  );
  assert.ok(
    !booted.log().includes('disabling profile plugin row'),
    `boot 日志不应含兼容门禁用行（供给 manager 与宿主同 rc）：宿主日志：${booted.log().slice(-1500)}`,
  );

  // —— 注册观测签名：/mcp 命令与 mcp_manage 工具注册可用（FOUND = 注册面；list 真调 =
  // 功能面经官方解析通道走通）。仪器激活（PROBE observer applied）即官方 manager 行供出
  // mcpManager 服务的正面证据——inject 三服务任一缺席仪器行 pending 不激活、签名必超时 ——
  await expectObserverSignature(booted.log, SIG_COMMAND_FOUND, '/mcp 命令应在官方宿主注册（commands.find 经官方解析面发现）');
  await expectObserverSignature(booted.log, SIG_TOOL_FOUND, 'mcp_manage 工具应在官方宿主注册（tools.get 发现）');
  await expectObserverSignature(booted.log, SIG_COMMAND_LIST_OK, '/mcp list 应经官方解析面真调成功（kind=success）');
  await expectObserverSignature(booted.log, SIG_TOOL_LIST_OK, 'mcp_manage list 应经工具面真调成功（ok=true）');

  // —— 官方 manager Remote 面真活（line 级正面证据）：认证交换 → mux watch 开流 →
  // 订阅即推全量列表批次（manager 行 active 的 Remote 消费面）——
  const cookie = await exchangeSessionCookie(booted.port, booted.token);
  const watch = await openMuxStream(booted.port, cookie);
  t.after(() => watch.close());
  watch.send({ type: 'open', streamId: 'fr7-watch', endpoint: 'mcpManager/watch', payload: { args: {} } });
  const initial = await waitForWatchItem(watch, () => true, { timeoutMs: CONNECT_TIMEOUT_MS });
  assert.ok(initial.matched, `mcpManager/watch 订阅应推送全量列表批次（官方 manager 行 Remote 面真活；${CONNECT_TIMEOUT_MS / 1000}s 内无 item 帧）——末帧：${initial.lastSeen.slice(0, 400)}`);
  assert.ok(
    Array.isArray(JSON.parse(initial.lastSeen) as unknown),
    `watch 首批应为 McpManagedServerView 全量数组：${initial.lastSeen.slice(0, 200)}`,
  );
});
