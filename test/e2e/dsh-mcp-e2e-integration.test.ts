// 集成级端到端承载（spec 20261117-34d4 验收场景 [FR-8|集成级|承载票 20261117-975b] +
// [FR-4|集成级|承载票 20261117-975b]，续做编排定稿 2026-11-18）：
// 临时 DSH_HOME + 真实官方 dsh（显式钉 next/rc 兼容星座版本真跑）+ 本地 pack 的
// @hankchen/dsh-mcp tarball（官方 `dsh plugin add <tarball>` 真装），boot 官方 sdk profile
// 端到端验证「装插件 → /mcp add → mcp__<名>__<工具> 出现 → patch 落盘 → 重启保留」
// 与连接失败异常流（failed + 原因线索 + 可移除 + 全程不重启）。
//
// 真跑形态编排（票 Progress 定稿，逐项有真跑实证留痕）：
// - profile = 官方 sdk 模板（--from-default-profile sdk）：sdk 组合自带 commands 子系统与
//   credentials 服务——headless 模板 credentials 默认 disabled，会令插件 manager 行
//   inject: [credentials] 永久 pending（真跑实证踩坑）；sdk 又是 /mcp 人类命令的一等
//   可达形态（调研 ced7 F2.1）。
// - 宿主常驻 = sdk-app 的 stdin-lifetime：spawn stdin 保持打开即不退出（真跑实证），
//   给驱动留出充足窗口；驱动全程无 LLM API 依赖（确定性、可重复）。
// - 驱动 = 测试仪器插件（--patch overlay 挂 root ctx）：apply 内同步解引用四服务实例
//   （生命周期实证：apply 返回后 fiber inactive、ctx proxy get 被拒），经官方解析面
//   commands.find(agentLike,'mcp') 调 handler 驱动 /mcp 子命令（伪 agent {id} 安全：
//   scopeChainOf 未知 scope 键只落 global 层，真跑实证），经 tools.get('mcp_manage').execute
//   驱动模型工具入口——两个入口都是本插件交付面的真实 seam。
// - "mcp__<名>__<工具> 出现且可调用"的落点：出现 = ctx.tools.get 工具面注册可见；
//   可调用 = manager 投影 connected.toolCount ≥ 1（宿主已真实拉取 server 工具清单）。
//   完整工具调用链（tools.execute 经官方 PTC executor + 模型步进）属官方执行面，不在
//   管理插件交付 seam 上，不在本测试断言范围（票 Progress 落点取舍留痕）。
//
// 版本选择口径（开工动作 2 定稿）：latest 安装面（当前 rc.1）无兼容 manager，真跑分支
// 不取 latest；优先显式钉 next/rc 同版星座（npm view dist-tags.next 探测，当前 0.2.2-rc.4）
// + profile 内显式钉同版 manager（插件依赖 ^0.2.2-rc.2 经 pnpm 实测只解析到 rc.2）。
// @hankchen/dsh-mcp 未发布期间主流程走本地 tarball（官方 plugin add <tarball> 真装）；
// registry 发布版对账见本文件第二个 test（发布后运行）。
//
// 前置门跳过纪律（docs/standards/node-test-skip-gate.md）：环境门写成返回 boolean 的门
// 函数 + 测试体内联 return 截断——t.skip 只标注不截断，门函数返回 false 时调用方必须
// 立即 return；门内硬断言照常抛错 = 真失败。四环境口径（工单 AC4 续做同步）：
// node <24 / registry 不可达 / 包未发布（本 test 走 tarball 不拦，由第二个 test 的
// 发布对账承担 skip 口径）/ 官方 dsh 与 dsh-mcp-manager 兼容星座不可达。
//
// 替身保真（docs/standards/stub-fidelity-integration.md）：真实协作者 = 官方 dsh 宿主 +
// 官方 mcp-manager/mcp-client/settings 链路；受控替身只两件——测试自带的 echo MCP server
// （newline-delimited JSON-RPC 实现 MCP stdio 协议，被官方 mcp-client 当真实 server 连接）
// 与临时 DSH_HOME 目录。官方写入的落盘字面（依赖行范围形态、patch YAML 格式）不作钉字面
// 断言——只断言语义（落点齐备、条目字段齐备），实际安装版本另经 profile 内实装包清单钉死。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertPluginPreconditions } from '../../src/kernel/dsh-command.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLUGIN_DIR = path.join(packageRoot, 'agents', 'dsh', 'plugins', 'dsh-mcp');
// 期望值独立来源：插件包名/版本运行时读仓库包清单，不写死字面量
const PKG_MANIFEST = JSON.parse(fs.readFileSync(path.join(PLUGIN_DIR, 'package.json'), 'utf8')) as {
  name: string;
  version: string;
};
const PKG = PKG_MANIFEST.name;
const PROFILE = 'dsh-mcp-e2e'; // 测试 profile 名固定（可重复确定；非官方保留名）
const SERVER_NAME = 'probeecho'; // 主流程 server 名（echo 工具 → mcp__probeecho__echo）
const DEAD_NAME = 'deadsvr'; // 异常流 server 名（不可达 url）

// npx 冷启动要拉官方星座，profile 准备给足 10 分钟；每段 boot 观测 3 分钟（含连接等待 90s）
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;
const STAGE_TIMEOUT_MS = 3 * 60 * 1000;
const CONNECT_TIMEOUT_MS = 90 * 1000;

// 前置门探测出的兼容星座版本（显式钉组合；probeConstellation 成功后赋值）
let dshPinnedVersion = '';
let managerPinnedVersion = '';

function makeTempDir(t: TestContext, prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// 集成 PATH = node bin 目录 + 标准系统目录（先例 dsh-plugin-integration 同款）：npx/pnpm/env
// 可解析；pnpm shim 与 node 同目录（fnm/corepack 布局），probePnpm 会对把关。
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

// npm view --json 的结构化探测（pkg 与 field 必须是独立 argv——合并成含空格单参数会被
// npm 当作本地路径解析，真跑实证）；失败按原因分类（registry 不可达 = 环境口径）
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
 * 兼容星座探测（真跑分支版本口径）：官方 dsh dist-tags.next 与 manager dist-tags.next
 * 必须同 rc 同版（manager peer 精确钉同 rc 套件，同版组合才满足 peer 星座）。
 * 不满足 = 星座不可达 → skip 留因（spec FR-8 修订句 20261118-2d72 兜底口径），不判失败。
 */
function probeConstellation(): { ok: false; reason: string } | { ok: true; dshVersion: string; managerVersion: string } {
  const dshTags = npmViewJson('@deepseek-ai/dsh', 'dist-tags');
  if (!dshTags.ok) {
    return { ok: false, reason: `前置门：registry 探测失败（环境问题，非回归）——${dshTags.reason}` };
  }
  const next = (dshTags.json as { next?: unknown }).next;
  if (typeof next !== 'string' || !/^0\.2\.2-rc\.\d+$/.test(next)) {
    return {
      ok: false,
      reason: `前置门：官方 dsh 无 next/rc 兼容星座可钉（dist-tags.next=${JSON.stringify(next)}）——官方 latest 主包无兼容 manager（peer 精确钉同 rc 套件），星座不可达期间集成场景以前置门 skip 兜底（spec FR-8 修订句 20261118-2d72）`,
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
      reason: `前置门：dsh 与 dsh-mcp-manager 兼容星座不可达（manager dist-tags.next=${JSON.stringify(managerNext)} ≠ dsh next=${next}）——manager peer 精确钉同 rc 套件，同版组合才真跑；错配组合不赌兼容性`,
    };
  }
  return { ok: true, dshVersion: next, managerVersion: managerNext };
}

// @hankchen/dsh-mcp 发布态探测：E404 = 待发布（skip 留因）；其余失败 = registry/环境问题
function probePublishedVersion(): { published: true; version: string } | { published: false; skipReason: string } {
  const probe = npmViewJson(PKG, 'version');
  if (probe.ok) {
    const version = (probe.json as unknown);
    if (typeof version !== 'string' || version.length === 0) {
      return { published: false, skipReason: `前置门：npm view ${PKG} version 输出异常——registry 响应异常` };
    }
    return { published: true, version };
  }
  if (/E404|could not be found|not found/i.test(probe.reason)) {
    return { published: false, skipReason: `前置门：${PKG} 尚未发布到 registry（npm view E404）——发布对账段待发布后运行（端到端主流程走本地 tarball 分支不受此门拦截）` };
  }
  return { published: false, skipReason: `前置门：registry 探测失败（环境问题，非回归）——${probe.reason}` };
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

// 本地 pack 插件 tarball（发布面 prepack 预编译经 pnpm pack 生命周期钩子自动生效，
// postpack 还原仓库树）；产物路径显式输出到临时目录，仓库树不留 tgz。
function packPluginTarball(t: TestContext): string {
  const destDir = makeTempDir(t, 'dsh-mcp-e2e-pack-');
  const result = runCommand('pnpm', ['pack', '--pack-destination', destDir], { timeout: INSTALL_TIMEOUT_MS, cwd: PLUGIN_DIR });
  assertCommandOk('pnpm pack（插件发布面预编译）', result);
  const tarball = path.join(destDir, `hankchen-dsh-mcp-${PKG_MANIFEST.version}.tgz`);
  assert.ok(fs.existsSync(tarball), `pack 产物应在目标目录：${tarball}（输出：${result.output.slice(-500)}）`);
  // 仓库树零构建纪律的兜底核对：pack 钩子结束后包目录不应残留编译产物（postpack 已还原）
  assert.equal(fs.existsSync(path.join(PLUGIN_DIR, 'index.js')), false, 'postpack 应已还原仓库树（包目录无 index.js 残留）');
  return tarball;
}

// 初始化 sdk profile（官方模板；--dump-config 只组合落盘不挂载宿主）
function initSdkProfile(dshHome: string) {
  const result = runCommand(
    'npx', ['--yes', `@deepseek-ai/dsh@${dshPinnedVersion}`, '--profile', PROFILE, '--from-default-profile', 'sdk', '--dump-config'],
    { timeout: INSTALL_TIMEOUT_MS, dshHome },
  );
  assertCommandOk('官方 dsh 初始化 sdk profile', result);
}

// 官方 `dsh plugin add <tarball>` 真装（官方命令 + pnpm 转发真实拉取）
function pluginAddTarball(dshHome: string, tarball: string) {
  const result = runCommand(
    'npx', ['--yes', `@deepseek-ai/dsh@${dshPinnedVersion}`, 'plugin', '--profile', PROFILE, 'add', tarball],
    { timeout: INSTALL_TIMEOUT_MS, dshHome },
  );
  assertCommandOk(`官方 dsh plugin add ${PKG} tarball`, result);
}

// profile 内显式钉同版 manager（插件依赖 ^0.2.2-rc.2 的 pnpm 解析实测只落 rc.2——
// 票 Progress 留痕；宿主与 manager 同 rc 才满足 manager peer 精确钉）
function pinManager(dshHome: string) {
  const profileDir = path.join(dshHome, 'profiles', PROFILE);
  const result = runCommand('pnpm', ['add', `@deepseek-ai/dsh-mcp-manager@${managerPinnedVersion}`], { timeout: INSTALL_TIMEOUT_MS, cwd: profileDir });
  assertCommandOk(`profile 显式钉 manager@${managerPinnedVersion}`, result);
}

// 两落点断言（docs/plugin-assets.md §2.3：dependencies 依赖行 + dsh.profile.bundles 行）。
// 依赖行落盘形态以官方语义为准（tarball 安装实测 = file: 协议路径，非语义化范围）：
// 断言「落点齐备」，不钉官方写入的字面；实装版本经 profile 内 node_modules 包清单钉死。
function assertProfileMountPoints(dshHome: string) {
  const profilePkg = JSON.parse(fs.readFileSync(path.join(dshHome, 'profiles', PROFILE, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    dsh?: { profile?: { bundles?: string[] } };
  };
  const depRange = profilePkg.dependencies?.[PKG];
  assert.ok(typeof depRange === 'string' && depRange.length > 0, `依赖行应落盘（官方写入的依赖声明）：${JSON.stringify(profilePkg.dependencies)}`);
  const installedVersion = JSON.parse(
    fs.readFileSync(path.join(dshHome, 'profiles', PROFILE, 'node_modules', ...PKG.split('/'), 'package.json'), 'utf8'),
  ) as { version: string };
  assert.equal(installedVersion.version, PKG_MANIFEST.version, 'profile 内实装插件版本应等于仓库包版本');
  const managerInstalledVersion = JSON.parse(
    fs.readFileSync(path.join(dshHome, 'profiles', PROFILE, 'node_modules', '@deepseek-ai', 'dsh-mcp-manager', 'package.json'), 'utf8'),
  ) as { version: string };
  assert.equal(managerInstalledVersion.version, managerPinnedVersion, 'profile 内实装 manager 版本应等于显式钉版（同 rc 兼容星座）');
  assert.ok(
    Array.isArray(profilePkg.dsh?.profile?.bundles) && profilePkg.dsh.profile.bundles.includes(PKG),
    `bundles 行应含包名：${JSON.stringify(profilePkg.dsh?.profile?.bundles)}`,
  );
  return depRange;
}

// —— 测试资产：echo MCP server + 驱动仪器（随临时目录生成销毁，不触仓库源）——

const ECHO_SERVER_FILE = 'mcp-echo-server.mjs';
const OBSERVER_FILE = 'observer.mjs';
const OBSERVER_PATCH_FILE = 'observer.patch.yml';
const RESULT_MARKER_DONE_1 = 'STAGE1-DONE';
const RESULT_MARKER_DONE_2 = 'STAGE2-DONE';
const RESULT_MARKER_FAIL_2 = 'STAGE2-FAIL';
const RESULT_FILE = 'e2e-result.log';

function writeEchoServer(dir: string) {
  fs.writeFileSync(path.join(dir, ECHO_SERVER_FILE), `// 最小 MCP stdio server（测试资产，票 20261117-975b 自动生成，勿手工维护）：
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
      serverInfo: { name: 'probe-echo-server', version: '0.1.0' },
    } });
    return;
  }
  if (request.method === 'notifications/initialized' || request.method === 'notifications/cancelled') return;
  if (request.method === 'ping') { write({ jsonrpc: '2.0', id: request.id, result: {} }); return; }
  if (request.method === 'tools/list') { write({ jsonrpc: '2.0', id: request.id, result: { tools: TOOLS } }); return; }
  if (request.method === 'tools/call') {
    const text = request.params?.arguments?.text;
    write({ jsonrpc: '2.0', id: request.id, result: { content: [{ type: 'text', text: typeof text === 'string' ? text : '' }] } });
    return;
  }
  if (request.id !== undefined) write({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'method not found: ' + request.method } });
});
`);
}

// 仪器 patch overlay：observer 挂 root ctx（inject 声明保证四服务先于 observer 激活）。
// credentials 不在此覆盖——sdk 模板默认启用（真跑实证）；若未来模板漂移，宿主启动会报
// pending credentials，断言失败附 boot 日志可定位（不防御性掩盖模板漂移）。
function writeObserverPatch(dir: string) {
  fs.writeFileSync(path.join(dir, OBSERVER_PATCH_FILE), `# 测试仪器挂载（--patch overlay；条目相对说明符按本文件所在目录解析）
- insert:
    - id: dsh-mcp-e2e-observer
      name: './${OBSERVER_FILE}'
      inject: [commands, settings, mcpManager, tools]
`);
}

function writeObserver(dir: string) {
  fs.writeFileSync(path.join(dir, OBSERVER_FILE), `// 驱动仪器（测试资产，票 20261117-975b 自动生成，勿手工维护）：
// apply 内同步解引用四服务实例（生命周期实证：apply 返回后 fiber inactive、ctx proxy get
// 被拒——异步段一律用服务实例引用，不经 ctx proxy），随后驱动两条管理入口：
// /mcp 经官方解析面 commands.find(agentLike,'mcp') 调 handler（伪 agent {id} 安全：
// scopeChainOf 未知 scope 键只落 global 层），mcp_manage 经 tools.get(...).execute。
// 结果行写入结果文件 + stderr（'PROBE ' 前缀），行格式与测试断言共享常量口径。
import fs from 'node:fs';
const RESULT = process.env.E2E_RESULT_FILE;
const STAGE = process.env.E2E_STAGE;
const ECHO_SERVER = process.env.E2E_ECHO_SERVER;
const emit = (line) => {
  process.stderr.write('PROBE ' + line + '\\n');
  if (RESULT) fs.appendFileSync(RESULT, line + '\\n');
};
const AGENT = { id: 'dsh-mcp-e2e-agent' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(predicate, { what, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;
  let lastSeen = undefined;
  while (Date.now() < deadline) {
    lastSeen = predicate();
    if (lastSeen.matched) return lastSeen;
    await sleep(2000);
  }
  emit(\`TIMEOUT waiting \${what}: final=\${JSON.stringify(lastSeen?.view ?? null)}\`);
  return lastSeen;
}

async function main({ commands, mcpManager, tools }) {
  emit(\`stage=\${STAGE} commands=\${typeof commands} mcpManager=\${typeof mcpManager} tools=\${typeof tools}\`);
  const commandDef = commands.find(AGENT, 'mcp');
  emit(\`commands.find(mcp): \${commandDef ? 'FOUND' : 'MISSING'}\`);
  if (!commandDef) throw new Error('mcp 命令未注册——插件加载失败（见宿主启动日志的 pending/error 段）');
  const toolDef = tools.get('mcp_manage');
  emit(\`tools.get(mcp_manage): \${toolDef ? 'FOUND' : 'MISSING'}\`);

  if (STAGE === '1') {
    // —— 主流程：/mcp add stdio（人类命令入口 handler 真跑 → 官方 settings 写通道）——
    const addResult = await commandDef.handler({ agent: AGENT, rawInput: \`add stdio ${SERVER_NAME} node \${ECHO_SERVER}\` });
    emit(\`add ${SERVER_NAME}: kind=\${addResult.kind} text=\${JSON.stringify(addResult.text)}\`);

    // 轮询 manager 投影到 connected（官方 reconcile 挂载 + mcp-client 连接 + 工具拉取）
    const connect = await waitFor(
      () => {
        const view = mcpManager.list().find((v) => v.name === '${SERVER_NAME}');
        return { matched: view?.status.state === 'connected', view };
      },
      { what: '${SERVER_NAME} connected', timeoutMs: ${CONNECT_TIMEOUT_MS} },
    );
    emit(\`${SERVER_NAME}: state=\${connect.view?.status.state} toolCount=\${connect.view?.status.toolCount} configured=\${connect.view?.configured}\`);

    // 工具面出现 mcp__<名>__<工具>（官方 mcp-client 已把 server 工具注册进工具面）
    const mcpTool = tools.get('mcp__${SERVER_NAME}__echo');
    emit(\`tools.get(mcp__${SERVER_NAME}__echo): \${mcpTool ? 'FOUND' : 'MISSING'}\`);

    // —— 异常流：mcp_manage 工具入口添加不可达 server（reconnect disabled → 立即 failed）——
    const deadAdd = await toolDef.execute(
      { action: 'add', serverName: '${DEAD_NAME}', transport: 'streamable-http', url: 'http://127.0.0.1:9/mcp', reconnect: { enabled: false } },
      { signal: new AbortController().signal },
    );
    emit(\`tool add ${DEAD_NAME}: ok=\${deadAdd?.ok} error=\${JSON.stringify(deadAdd?.error ?? null)}\`);
    const dead = await waitFor(
      () => {
        const view = mcpManager.list().find((v) => v.name === '${DEAD_NAME}');
        return { matched: view?.status.state === 'failed' || view?.status.state === 'closed', view };
      },
      { what: '${DEAD_NAME} failed', timeoutMs: 60000 },
    );
    emit(\`${DEAD_NAME} final: \${JSON.stringify(dead.view?.status ?? null)}\`);

    // /mcp list 读投影：两条 server，failed 带原因线索
    const listResult = await commandDef.handler({ agent: AGENT, rawInput: 'list' });
    emit(\`list projection: \${JSON.stringify(listResult.text)}\`);

    // 条目保留可移除（mutate unset 删键语义）
    const removeResult = await commandDef.handler({ agent: AGENT, rawInput: 'remove ${DEAD_NAME}' });
    emit(\`remove ${DEAD_NAME}: kind=\${removeResult.kind}\`);
    await sleep(2000);
    const afterRemove = mcpManager.list().find((v) => v.name === '${DEAD_NAME}');
    emit(\`${DEAD_NAME} after remove: \${afterRemove ? 'LISTED state=' + afterRemove.status.state : 'GONE'}\`);

    // 启停语义（mutate set enabled：禁用卸载保条目，重新启用重建连接）
    const disableResult = await commandDef.handler({ agent: AGENT, rawInput: 'disable ${SERVER_NAME}' });
    emit(\`disable ${SERVER_NAME}: kind=\${disableResult.kind}\`);
    await sleep(4000);
    const disabledView = mcpManager.list().find((v) => v.name === '${SERVER_NAME}');
    emit(\`${SERVER_NAME} after disable: state=\${disabledView?.status.state} configured=\${disabledView?.configured}\`);
    const enableResult = await commandDef.handler({ agent: AGENT, rawInput: 'enable ${SERVER_NAME}' });
    emit(\`enable ${SERVER_NAME}: kind=\${enableResult.kind}\`);
    await sleep(4000);
    const enabledView = mcpManager.list().find((v) => v.name === '${SERVER_NAME}');
    emit(\`${SERVER_NAME} after enable: state=\${enabledView?.status.state}\`);

    emit('${RESULT_MARKER_DONE_1}');
    setTimeout(() => process.exit(0), 2000);
    return;
  }

  if (STAGE === '2') {
    // 重启观察：profile patch 持久条目 → boot 即挂载 → 自动连接
    const reconnected = await waitFor(
      () => {
        const view = mcpManager.list().find((v) => v.name === '${SERVER_NAME}');
        return { matched: view?.status.state === 'connected', view };
      },
      { what: '${SERVER_NAME} reconnected after restart', timeoutMs: ${CONNECT_TIMEOUT_MS} },
    );
    emit(\`${SERVER_NAME} after restart: state=\${reconnected.view?.status.state} toolCount=\${reconnected.view?.status.toolCount}\`);
    emit(reconnected.matched ? '${RESULT_MARKER_DONE_2}' : '${RESULT_MARKER_FAIL_2}');
    setTimeout(() => process.exit(reconnected.matched ? 0 : 4), 1000);
  }
}

export const name = 'dsh-mcp-e2e-observer';
export function apply(ctx) {
  const services = { commands: ctx.commands, mcpManager: ctx.mcpManager, tools: ctx.tools, settings: ctx.settings };
  setTimeout(() => {
    main(services).catch((err) => {
      emit(\`PROBE-CRASH: \${err.stack ?? err}\`);
      setTimeout(() => process.exit(2), 2000);
    });
  }, 2000);
}
`);
}

// —— boot 观测（先例 dsh-plugin-integration 的 detached 进程组纪律同款）——

interface StageOutcome {
  kind: 'marker' | 'exited' | 'timeout';
  result: string; // 结果文件全文（仪器 emit 行）
  bootLog: string; // 宿主 stdout+stderr 全文（失败定位证据）
}

// 真实启动 profile 并观测：stdin 保持打开（sdk-app 的 stdin-lifetime 常驻宿主）；仪器
// 驱动完成后自 exit(0)。detached 起独立进程组：npx → dsh → 宿主孙进程整组可控（先例
// 实测：直接 SIGKILL npx 会留下存活的 dsh 孙进程，其继承的 stdio 管道不关闭，测试进程
// 事件循环将无法排空而挂起）。settle 时整组 SIGKILL 并销毁流。
function bootStage(t: TestContext, options: { dir: string; dshHome: string; stage: '1' | '2'; marker: string }): Promise<StageOutcome> {
  const { dir, dshHome, stage, marker } = options;
  const resultFile = path.join(dir, RESULT_FILE);
  fs.rmSync(resultFile, { force: true });
  const child: ChildProcess = spawn(
    'npx',
    ['--yes', `@deepseek-ai/dsh@${dshPinnedVersion}`, '--profile', PROFILE, '--patch', path.join(dir, OBSERVER_PATCH_FILE)],
    {
      cwd: dir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        DSH_HOME: dshHome,
        PATH: integrationPath(),
        E2E_RESULT_FILE: resultFile,
        E2E_STAGE: stage,
        E2E_ECHO_SERVER: path.join(dir, ECHO_SERVER_FILE),
      },
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
  // 显式 utf8 解码：多字节签名跨块截断时默认 Buffer 拼接会产生烂码（先例教训）
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => { bootLog += chunk; });
  child.stderr?.on('data', (chunk: string) => { bootLog += chunk; });
  const readResult = (): string => {
    try {
      return fs.readFileSync(resultFile, 'utf8');
    } catch {
      return '';
    }
  };
  return new Promise((resolve) => {
    let settled = false;
    const finish = (kind: StageOutcome['kind']) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearTimeout(deadline);
      killTree();
      child.stdout?.destroy();
      child.stderr?.destroy();
      resolve({ kind, result: readResult(), bootLog });
    };
    // 轮询：结果文件出现完成标记即 settle（marker 优先于进程退出——仪器 exit 前有缓冲间隔）
    const poll = setInterval(() => {
      if (readResult().includes(marker)) finish('marker');
    }, 1000);
    const deadline = setTimeout(() => finish('timeout'), STAGE_TIMEOUT_MS);
    deadline.unref();
    child.on('error', () => finish('exited'));
    child.on('close', () => finish(readResult().includes(marker) ? 'marker' : 'exited'));
  });
}

function assertMarkerReached(step: string, outcome: StageOutcome, marker: string) {
  assert.ok(
    outcome.result.includes(marker),
    `${step} 应到达标记 ${marker}（实际：\n【结果日志】${outcome.result || '（空）'}\n【宿主日志尾部】${outcome.bootLog.slice(-3000)}）`,
  );
}

test(`[FR-8|集成级] ${PKG} 真跑官方 dsh 端到端：装插件 → /mcp add → mcp__<名>__<工具> 出现 → 落盘 → 重启保留；含连接失败异常流（FR-4）`, async (t) => {
  if (!assertGate(t)) return;

  // —— 准备段：临时 DSH_HOME（绝不指向 ~/.dsh——前轮环境事故教训）+ 官方链路装插件 ——
  const dshHome = makeTempDir(t, 'dsh-mcp-e2e-home-');
  const workDir = makeTempDir(t, 'dsh-mcp-e2e-work-');
  const tarball = packPluginTarball(t);
  initSdkProfile(dshHome);
  pluginAddTarball(dshHome, tarball);
  pinManager(dshHome);
  assertProfileMountPoints(dshHome);

  writeEchoServer(workDir);
  writeObserver(workDir);
  writeObserverPatch(workDir);

  // —— stage1：宿主内驱动主流程 + 异常流（同一宿主内完成，全程不重启——FR-4 口径）——
  const stage1 = await bootStage(t, { dir: workDir, dshHome, stage: '1', marker: RESULT_MARKER_DONE_1 });
  assertMarkerReached('stage1（宿主内驱动）', stage1, RESULT_MARKER_DONE_1);

  // 双入口注册（/mcp 人类命令 + mcp_manage 模型工具）
  assert.match(stage1.result, /commands\.find\(mcp\): FOUND/, '插件 /mcp 命令应在官方宿主注册（handler 形态，官方解析面可发现）');
  assert.match(stage1.result, /tools\.get\(mcp_manage\): FOUND/, '插件 mcp_manage 工具应在官方宿主注册');
  // 添加（settings 命名空间 mcp 写通道真跑——前轮「No configurable plugin entry」已随 manager 行挂载消失）
  assert.match(stage1.result, new RegExp(`add ${SERVER_NAME}: kind=success`), `/mcp add stdio ${SERVER_NAME} 应成功提交（官方 settings 写通道）`);
  assert.match(stage1.result, /已写官方 settings（命名空间 mcp）/, '成功回复应指明官方 settings 写通道与命名空间 mcp');
  // 即时生效：官方 reconcile 挂载 + mcp-client 连接 + 工具拉取（toolCount ≥ 1 = 可调用投影）
  assert.match(
    stage1.result,
    new RegExp(`${SERVER_NAME}: state=connected toolCount=(\\d+) configured=true`),
    `${SERVER_NAME} 应经官方 reconcile 连接成功（工具拉取 toolCount ≥ 1）`,
  );
  const toolCountMatch = stage1.result.match(new RegExp(`${SERVER_NAME}: state=connected toolCount=(\\d+)`));
  assert.ok(toolCountMatch && Number(toolCountMatch[1]) >= 1, `connected 投影的 toolCount 应 ≥ 1（实际 ${toolCountMatch?.[1] ?? '缺失'}）`);
  // mcp__<名>__<工具> 出现
  assert.match(stage1.result, /tools\.get\(mcp__probeecho__echo\): FOUND/, 'mcp__probeecho__echo 应出现在宿主工具面');
  // 异常流：连不上的 server → failed + 原因线索
  assert.match(stage1.result, new RegExp(`tool add ${DEAD_NAME}: ok=true`), `mcp_manage 工具入口添加 ${DEAD_NAME} 应成功提交（写通道）`);
  assert.match(
    stage1.result,
    new RegExp(`${DEAD_NAME} final: \\{"state":"failed","reason":"[a-z-]+","lastError":"[^"]+"\\}`),
    `${DEAD_NAME} 应投影 failed 状态且带 lastError 原因线索`,
  );
  assert.match(
    stage1.result,
    new RegExp(`list projection: .*${DEAD_NAME}.*failed`),
    `/mcp list 读投影应含 ${DEAD_NAME} 的 failed 状态与线索`,
  );
  // 条目保留可移除（unset 删键）
  assert.match(stage1.result, new RegExp(`remove ${DEAD_NAME}: kind=success`), `${DEAD_NAME} 应可移除`);
  assert.match(stage1.result, new RegExp(`${DEAD_NAME} after remove: GONE`), `${DEAD_NAME} 移除后应从清单消失（unset 删键语义）`);
  // 启停语义（set enabled：禁用卸载保条目、重新启用重建连接）
  assert.match(stage1.result, new RegExp(`${SERVER_NAME} after disable: state=disabled configured=true`), '禁用应卸载连接但条目保留');
  assert.match(stage1.result, new RegExp(`${SERVER_NAME} after enable: state=connected`), '重新启用应重建连接');

  // —— 落盘断言：profile cordis.patch.yml 出现持久化条目（官方 Settings→ConfigEditor 写盘）——
  // 官方写入的 YAML 格式不作钉字面断言（替身保真纪律），只断言语义（条目名 + 关键字段齐备）
  const profilePatch = fs.readFileSync(path.join(dshHome, 'profiles', PROFILE, 'cordis.patch.yml'), 'utf8');
  assert.match(profilePatch, new RegExp(`${SERVER_NAME}:`), `profile cordis.patch.yml 应含 ${SERVER_NAME} 持久化条目：\n${profilePatch}`);
  assert.match(profilePatch, /transport: stdio/, '持久化条目应含 transport 字段');
  assert.match(profilePatch, /command: node/, '持久化条目应含 command 字段');
  assert.match(profilePatch, new RegExp(ECHO_SERVER_FILE.replace(/\./g, '\\.').replace(/\//g, '\\/')), '持久化条目应含 echo server 说明符');
  assert.match(profilePatch, /enabled: true/, '持久化条目应含 enabled 持久意图字段');
  assert.doesNotMatch(profilePatch, new RegExp(`${DEAD_NAME}:`), `已移除的 ${DEAD_NAME} 不应残留在落盘条目`);

  // —— stage2：重启 dsh 后 server 仍在并自动连接（官方持久化落盘 + 重载）——
  const stage2 = await bootStage(t, { dir: workDir, dshHome, stage: '2', marker: RESULT_MARKER_DONE_2 });
  assertMarkerReached('stage2（重启保留）', stage2, RESULT_MARKER_DONE_2);
  assert.match(
    stage2.result,
    new RegExp(`${SERVER_NAME} after restart: state=connected toolCount=(\\d+)`),
    `重启 dsh 后 ${SERVER_NAME} 应仍在并自动连接（持久化条目重载）`,
  );
});

test(`[FR-8|集成级] ${PKG} registry 发布版对账（发布后运行；包未发布期间 skip 留因）`, (t) => {
  try {
    assertPluginPreconditions({ nodeVersion: process.version, profile: PROFILE });
  } catch (err) {
    t.skip(`前置门（环境问题，非回归）：${err.message}`);
    return;
  }
  const probe = probePublishedVersion();
  if (!probe.published) {
    t.skip(probe.skipReason);
    return;
  }
  // 发布漂移 = 真失败（339e 集成级口径：registry 最新版本与仓库版本一致）
  assert.equal(
    probe.version,
    PKG_MANIFEST.version,
    `registry 最新版本（${probe.version}）与仓库 ${PKG} 版本（${PKG_MANIFEST.version}）不一致——发布漂移，需对齐后再跑发布对账`,
  );
});
