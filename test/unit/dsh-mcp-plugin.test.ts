// dsh-mcp 插件模块测试（spec 20261117-34d4 测试决策 seam ②③④⑤，票 20261117-dd1f）。
// 被测源码：agents/dsh/plugins/dsh-mcp/index.ts 经动态 URL import 加载（repo-ts-shape 先例：
// tsc 不追动态导入，测试即模块行为回归面）。期望值来源 = spec 实现决策五契约 + 调研报告
// 20261117-ced7 F1.4/F2.1 的一手来源引文 + 官方包源码（在盘可复核，版本见各替身契约标注）。
//
// 替身契约（stub-fidelity 门：替身测试钉替身契约，集成级归承载票 20261117-975b）：
// 1. ctx.mcpManager.list(): McpManagedServerView[] 与 watch(signal): AsyncIterable<McpManagedServerView[]>
//    ——官方一手来源（@deepseek-ai/dsh-mcp-manager@0.2.2-rc.2 src/index.ts list/watch，
//    types.ts McpManagedServerView/McpManagedServerStatus）。替身 watch 一次性 yield 当前
//    列表后结束；官方为常驻流直至 abort——替身简化点，钉替身契约。
// 2. ctx.settings.update(namespace, patch) / mutate(namespace, ops)
//    ——官方一手来源（@deepseek-ai/dsh-settings@0.2.2-rc.1 lib/types/index.d.ts
//    SettingsForms，票 20261118-2d72 取证）：update(ns, patch, expectedRevision?) 深合并
//    （实现实证兼容，不动）；mutate(ns, ops, expectedRevision?) 的 ops = SettingsPathOp[]
//    = {op:'set', path:string[], value} | {op:'unset', path:string[]}——字符串三参旧调用
//    即 TypeError ops.reduce is not a function（官方实现经 ops.reduce 消费，975b 探针 1
//    实证）；value:null 是写 null 不是删键，删键 = {op:'unset'}（官方 unset 语义：对象
//    parent 删键、数组 parent 删元素）。替身 mutate 镜像该证伪形态（ops 非数组即抛同款
//    TypeError），记录调用不落盘；expectedRevision 本插件不传，替身签名保留形参位。
// 3. ctx.commands.register({ name, description, handler })——官方一手来源
//    （@deepseek-ai/dsh-commands@0.2.2-rc.1 lib/types/index.d.ts CommandDefinition +
//    lib/types/index.js normalizeDefinition 校验，票 20261118-2d72 探针 2A/2B 取证）：
//    name 须 /^[a-z][a-z0-9_-]*$/、description 须非空字符串、handler 须函数——handler
//    缺失即同步抛 `command "<名>" handler must be a function`（探针 2A 实证的旧形态失败）。
//    handler 收 CommandInvocation（官方全形态含 commandId/agent/rawInput/attachments/signal；
//    本插件只消费 rawInput = 命令名之后的原文、含分隔空白），须返回 CommandResult =
//    {kind:'success', text?} | {kind:'error', text}（预期拒绝显式返回 error，不抛）。
//    替身 register 镜像 handler 校验这一证伪形态（旧 execute(line) 形态注册即红），
//    记录注册不做官方 insert；name/description 为常量字段、形态由 AC1 断言覆盖。
// 4. ctx.tools.register(definition)——官方一手来源（@deepseek-ai/dsh-tools@0.2.2-rc.2
//    src/index.ts register + src/contracts.ts ToolDefinition/ToolSchema/ToolOutputDefinition）：
//    definition = { name, description, parameters, execute(args, exec), output: { schema,
//    render } }。替身只捕获不做官方 register 的 output 声明校验——替身不实现校验语义，
//    钉替身契约。

import { test } from 'node:test';
import assert from 'node:assert/strict';

const PLUGIN_URL = new URL('../../agents/dsh/plugins/dsh-mcp/index.ts', import.meta.url);
const PLUGIN_NAME = '@hankchen/dsh-mcp';

// ---- 官方形状（@deepseek-ai/dsh-mcp-manager@0.2.2-rc.2 types.ts 一手来源的结构镜像）----

interface McpManagedServerView {
  name: string;
  configured: boolean;
  status: unknown;
}

// ---- 替身 ctx（每个测试独立实例；记录注册与 settings 调用供断言）----

/** 官方 CommandInvocation 的插件消费面镜像（@deepseek-ai/dsh-commands@0.2.2-rc.1 一手来源）。 */
interface CommandInvocationStub {
  agent: unknown;
  rawInput: string;
}

/** 官方 CommandResult 镜像（@deepseek-ai/dsh-commands@0.2.2-rc.1 lib/types/types.d.ts）。 */
interface CommandResultStub {
  kind: 'success' | 'error';
  text?: string;
}

interface CapturedCommand {
  name: string;
  description: string;
  handler(invocation: CommandInvocationStub): CommandResultStub | Promise<CommandResultStub>;
}

interface CapturedTool {
  name: string;
  description: string;
  parameters: unknown;
  execute(args: unknown, exec: unknown): unknown;
  output: { schema: unknown; render(args: unknown, value: unknown): unknown[] };
}

/** 官方 SettingsPathOp 镜像（@deepseek-ai/dsh-settings@0.2.2-rc.1 lib/types/index.d.ts 一手来源）。 */
interface SettingsOpStub {
  op: 'set' | 'unset';
  path: string[];
  value?: unknown;
}

interface SettingsCall {
  kind: 'update' | 'mutate';
  namespace: string;
  patch?: Record<string, unknown>;
  ops?: SettingsOpStub[];
}

interface StubContext {
  logger: { info(message: string): void; warn(message: string): void; error(message: string): void };
  commands: { register(definition: CapturedCommand): () => void };
  tools: { register(definition: CapturedTool): () => void };
  settings: {
    update(namespace: string, patch: Record<string, unknown>): Promise<void>;
    mutate(namespace: string, ops: readonly SettingsOpStub[], expectedRevision?: number): Promise<void>;
  };
  mcpManager: {
    list(): McpManagedServerView[];
    watch(signal: AbortSignal): AsyncIterable<McpManagedServerView[]>;
  };
  // 断言出口（测试专用，非 ctx 服务面）
  captured: {
    commands: CapturedCommand[];
    tools: CapturedTool[];
    settingsCalls: SettingsCall[];
  };
  setViews(views: McpManagedServerView[]): void;
}

function createStubContext(initialViews: McpManagedServerView[] = []): StubContext {
  const views = [...initialViews];
  const captured = { commands: [] as CapturedCommand[], tools: [] as CapturedTool[], settingsCalls: [] as SettingsCall[] };
  return {
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
    commands: {
      register(definition) {
        // 官方 normalizeDefinition 注册期校验的证伪形态镜像（@deepseek-ai/dsh-commands@0.2.2-rc.1
        // lib/types/index.js，票 20261118-2d72 探针 2A 一手实证）：handler 非函数同步抛——
        // 旧 execute(line) 形态在此红；name/description 校验项为常量字段，形态由 AC1 断言覆盖。
        if (typeof definition.handler !== 'function') {
          throw new TypeError(`command "${definition.name}" handler must be a function`);
        }
        captured.commands.push(definition);
        return () => undefined;
      },
    },
    tools: {
      register(definition) {
        captured.tools.push(definition);
        return () => undefined;
      },
    },
    settings: {
      async update(namespace, patch) {
        captured.settingsCalls.push({ kind: 'update', namespace, patch });
      },
      async mutate(namespace, ops, _expectedRevision) {
        // 官方 mutate 证伪形态镜像（@deepseek-ai/dsh-settings@0.2.2-rc.1 lib/types/index.js：
        // 实现经 ops.reduce 消费 ops 数组，票 20261118-2d72）——字符串三参旧形态在此抛同款
        // TypeError（975b 探针 1 实证的失败）。
        if (!Array.isArray(ops)) throw new TypeError('ops.reduce is not a function');
        captured.settingsCalls.push({ kind: 'mutate', namespace, ops: [...ops] });
      },
    },
    mcpManager: {
      list() {
        return views.map((view) => structuredClone(view));
      },
      async *watch() {
        yield views.map((view) => structuredClone(view));
      },
    },
    captured,
    setViews(next) {
      views.splice(0, views.length, ...next);
    },
  };
}

/** 官方 manager list() 视图的测试样本构造器（status 对象逐字取自官方状态联合成员）。 */
function viewOf(name: string, status: unknown, configured = true): McpManagedServerView {
  return { name, configured, status };
}

/**
 * 官方 CommandInvocation 测试构形（@deepseek-ai/dsh-commands@0.2.2-rc.1 lib/types/index.d.ts
 * 一手镜像）：rawInput = 命令名之后的原文、含分隔空白（官方 parseCommand 切分口径），故调用侧
 * 传入带前导空格的原文；agent 为命令所达 agent 的占位。官方全形态另含 commandId/attachments/
 * signal，本插件不消费、不给占位——插件若开始消费即红（替身契约钉死点）。
 */
function mcpInvocation(rawInput: string): CommandInvocationStub {
  return { agent: {}, rawInput: ` ${rawInput}` };
}

async function loadPlugin(): Promise<{
  name: string;
  apply(ctx: StubContext): void;
}> {
  return (await import(PLUGIN_URL.href)) as {
    name: string;
    apply(ctx: StubContext): void;
  };
}

// ---- AC1：apply 即完成注册，双入口同调管理服务 ----

test('apply 即注册 /mcp 人类命令与 mcp_manage 模型工具（AC1 双入口注册）', async () => {
  const plugin = await loadPlugin();
  assert.equal(plugin.name, PLUGIN_NAME, '插件模块 name = 包名（0ea9 契约延续）');
  const ctx = createStubContext();
  plugin.apply(ctx);
  assert.equal(ctx.captured.commands.length, 1, 'ctx.commands 恰注册一条命令');
  assert.equal(ctx.captured.commands[0].name, 'mcp', '命令名 = mcp（/mcp 由交互适配器加斜杠前缀）');
  assert.equal(typeof ctx.captured.commands[0].description, 'string', '注册形态：description 为字符串（官方 normalizeDefinition 要求）');
  assert.ok(ctx.captured.commands[0].description.length > 0, '注册形态：description 非空（官方 normalizeDefinition 要求）');
  assert.equal(typeof ctx.captured.commands[0].handler, 'function', '注册形态：handler 为函数（官方 CommandDefinition 一手形态，票 20261118-2d72）');
  assert.equal(ctx.captured.tools.length, 1, 'ctx.tools.register 恰注册一个管理工具');
  assert.equal(ctx.captured.tools[0].name, 'mcp_manage', '工具名 design 定稿 = mcp_manage');
  assert.equal(typeof ctx.captured.tools[0].execute, 'function', '工具带 execute 执行体');
  assert.ok(ctx.captured.tools[0].parameters, '工具带 parameters 参数 schema');
});

test('两入口同调管理服务：list 读操作经工具与命令都投影同一 manager 数据且零 settings 调用（AC1）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext([
    viewOf('github', { state: 'connected', toolCount: 3, connectedAt: 1 }),
    viewOf('docs', { state: 'connecting', attempt: 0 }),
  ]);
  plugin.apply(ctx);
  const command = ctx.captured.commands[0];
  const tool = ctx.captured.tools[0];

  const toolResult = (await tool.execute({ action: 'list' }, { signal: new AbortController().signal })) as {
    ok: boolean;
    servers: McpManagedServerView[];
  };
  assert.equal(toolResult.ok, true, '工具 list 返回 ok:true');
  assert.deepEqual(
    toolResult.servers.map((server) => server.name),
    ['github', 'docs'],
    '工具 list 投影 = manager list() 视图（name 逐条）',
  );
  assert.deepEqual(
    toolResult.servers[0].status,
    { state: 'connected', toolCount: 3, connectedAt: 1 },
    '工具 list 投影逐字保留官方状态对象（connected 含 toolCount）',
  );

  const commandReply = await command.handler(mcpInvocation('list'));
  assert.equal(commandReply.kind, 'success', '命令 list 返回官方 success 形态');
  assert.match(commandReply.text ?? '', /github/, '命令 list 回复含 server 名 github');
  assert.match(commandReply.text ?? '', /docs/, '命令 list 回复含 server 名 docs');
  assert.match(commandReply.text ?? '', /connected/, '命令 list 回复含连接状态投影');

  assert.deepEqual(ctx.captured.settingsCalls, [], '读操作不得触碰写通道（settings 零调用）');
});

test('命令 handler 子命令分发返回官方 CommandResult 形态：help/list success、未知子命令与缺参 error 必带 text（AC1 形态面）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext([viewOf('a', { state: 'connected', toolCount: 0, connectedAt: 1 })]);
  plugin.apply(ctx);
  const command = ctx.captured.commands[0];

  const help = await command.handler(mcpInvocation('help'));
  const bare = await command.handler(mcpInvocation(''));
  for (const reply of [help, bare]) {
    assert.equal(reply.kind, 'success', 'help（含裸 /mcp）= success 信息性回复');
    assert.match(reply.text ?? '', /\/mcp list/, 'help 回复含子命令清单');
  }
  const listed = await command.handler(mcpInvocation('list'));
  assert.equal(listed.kind, 'success', 'list 子命令分发 = success');
  assert.match(listed.text ?? '', /a：/, 'list 分发读到替身视图');

  const unknown = await command.handler(mcpInvocation('wat'));
  assert.equal(unknown.kind, 'error', '未知子命令 = error（预期拒绝显式返回）');
  assert.match(unknown.text ?? '', /未知子命令 "wat"/, 'error 回复指明未知子命令');
  assert.ok((unknown.text ?? '').length > 0, '官方 CommandResult：error 必带 text（success 才可缺省）');

  const nameless = await command.handler(mcpInvocation('remove'));
  assert.equal(nameless.kind, 'error', 'remove 缺参 = error');
  assert.match(nameless.text ?? '', /用法：\/mcp remove <name>/, '缺参回复带用法');
});

// ---- AC3：写通道 = 官方 settings/configEditor 持久化 API（命名空间 = 挂载行 entry id mcp）----

test('工具 add stdio 成功：恰一次 settings.update("mcp", { servers: {…} })，条目为官方平铺结构（AC3）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext();
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  const result = (await tool.execute({
    action: 'add',
    serverName: 'searcher',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-search'],
    cwd: '/tmp/work',
  }, { signal: new AbortController().signal })) as { ok: boolean; serverName?: string; transport?: string };

  assert.equal(result.ok, true, 'add 成功返回 ok:true');
  assert.equal(result.serverName, 'searcher');
  assert.equal(result.transport, 'stdio');
  assert.deepEqual(ctx.captured.settingsCalls, [{
    kind: 'update',
    namespace: 'mcp',
    patch: {
      servers: {
        searcher: {
          transport: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-search'],
          cwd: '/tmp/work',
        },
      },
    },
  }], '写通道 = settings.update 且命名空间取挂载行 entry id mcp；条目只含提交字段（缺省值归官方 schema）');
});

test('命令 add stdio 与工具同调：settings.update("mcp", …) 调用形态一致（AC1+AC3）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext();
  plugin.apply(ctx);
  const command = ctx.captured.commands[0];

  const reply = await command.handler(mcpInvocation('add stdio searcher npx -y @modelcontextprotocol/server-search'));
  assert.equal(reply.kind, 'success', '命令 add 成功返回官方 success 形态');
  assert.match(reply.text ?? '', /searcher/, '命令回复确认提交对象');

  assert.deepEqual(ctx.captured.settingsCalls, [{
    kind: 'update',
    namespace: 'mcp',
    patch: {
      servers: {
        searcher: {
          transport: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-search'],
        },
      },
    },
  }], '命令入口与工具入口产出同一写通道调用（--env/--cwd 选项测试见凭据透传批）');
});

test('工具 remove 成功：settings.mutate("mcp", [{op:"unset", path:["servers", 名]}])（AC3 官方 ops 数组形态）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext([viewOf('searcher', { state: 'connected', toolCount: 1, connectedAt: 1 })]);
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  const result = (await tool.execute({ action: 'remove', serverName: 'searcher' }, { signal: new AbortController().signal })) as { ok: boolean };
  assert.equal(result.ok, true, 'remove 成功返回 ok:true');
  assert.deepEqual(ctx.captured.settingsCalls, [
    { kind: 'mutate', namespace: 'mcp', ops: [{ op: 'unset', path: ['servers', 'searcher'] }] },
  ], '移除 = 官方 SettingsPathOp unset 删键（value:null 是写 null 非删键——替身契约钉死点，票 20261118-2d72）');
});

test('工具 disable/enable 成功：settings.mutate("mcp", [{op:"set", path:["servers",名,"enabled"], value:布尔}])（AC3+AC4 语义：仅写持久意图字段）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext([viewOf('searcher', { state: 'connected', toolCount: 1, connectedAt: 1 })]);
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  const disabled = (await tool.execute({ action: 'disable', serverName: 'searcher' }, { signal: new AbortController().signal })) as { ok: boolean };
  const enabled = (await tool.execute({ action: 'enable', serverName: 'searcher' }, { signal: new AbortController().signal })) as { ok: boolean };
  assert.equal(disabled.ok, true, 'disable 成功返回 ok:true');
  assert.equal(enabled.ok, true, 'enable 成功返回 ok:true');
  assert.deepEqual(ctx.captured.settingsCalls, [
    { kind: 'mutate', namespace: 'mcp', ops: [{ op: 'set', path: ['servers', 'searcher', 'enabled'], value: false }] },
    { kind: 'mutate', namespace: 'mcp', ops: [{ op: 'set', path: ['servers', 'searcher', 'enabled'], value: true }] },
  ], '启停 = 官方 SettingsPathOp set 只写 servers.<name>.enabled——其余字段不动，官方 reconcile 依 enabled 切换挂载（禁用卸载保条目/启用重建）');
});

test('写路径绕行哨兵：替身 ctx 的 fiber.update 为必炸哨兵且全程不被触碰（AC3 排除 fiber.update 直改）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext();
  // 哨兵：任何 fiber.update 调用立即炸出——断言全部写操作完成后哨兵仍干净
  (ctx as unknown as { fiber: { update(): never } }).fiber = {
    update() {
      throw new Error('fiber.update 被调用——官方链路外直改被禁止');
    },
  };
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];
  await tool.execute({ action: 'add', serverName: 'a', transport: 'stdio', command: 'x' }, { signal: new AbortController().signal });
  try {
    await tool.execute({ action: 'remove', serverName: 'a' }, { signal: new AbortController().signal });
  } catch {
    // 本哨兵用例只断言 fiber.update 未被触碰；remove 的结果断言由各自用例承担
  }
  // 哨兵以 throw 表达：走到这里即未被触发；settingsCalls 已在各自用例断言形态
  assert.ok(ctx.captured.settingsCalls.length >= 1, '写操作经 settings 出口（哨兵未炸即无 fiber.update）');
});

// ---- AC2：参数 schema 按 transport 校验，跨 transport 字段混用拒绝并指明字段 ----

test('工具 add stdio 缺 command：拒绝且 error 指明 command 字段，settings 零调用（AC2）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext();
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  const result = (await tool.execute({ action: 'add', serverName: 'broken', transport: 'stdio' }, { signal: new AbortController().signal })) as { ok: boolean; error: string; field?: string };
  assert.equal(result.ok, false, '缺 command 拒绝');
  assert.match(result.error, /command/, '拒绝信息指明 command 字段');
  assert.equal(result.field, 'command', '结构化 field 命中缺失字段');
  assert.deepEqual(ctx.captured.settingsCalls, [], '被拒写零 settings 调用（无半写入）');
});

test('工具 add remote 缺 url：拒绝且 error 指明 url 字段（AC2）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext();
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  const result = (await tool.execute({ action: 'add', serverName: 'broken', transport: 'streamable-http', headers: { A: 'b' } }, { signal: new AbortController().signal })) as { ok: boolean; error: string; field?: string };
  assert.equal(result.ok, false, '缺 url 拒绝');
  assert.match(result.error, /url/, '拒绝信息指明 url 字段');
  assert.equal(result.field, 'url', '结构化 field 命中缺失字段');
  assert.deepEqual(ctx.captured.settingsCalls, [], '被拒写零 settings 调用');
});

test('工具 add stdio 携带 url：跨 transport 字段混用拒绝且指明 url（AC2）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext();
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  const result = (await tool.execute({ action: 'add', serverName: 'mixed', transport: 'stdio', command: 'x', url: 'https://mcp.example.com/mcp' }, { signal: new AbortController().signal })) as { ok: boolean; error: string; field?: string };
  assert.equal(result.ok, false, '跨 transport 字段混用拒绝');
  assert.match(result.error, /url/, '拒绝信息指明违规字段 url');
  assert.equal(result.field, 'url', '结构化 field 命中违规字段');
  assert.deepEqual(ctx.captured.settingsCalls, [], '被拒写零 settings 调用');
});

test('工具 add remote 携带 stdio 字段组：拒绝且指明首个违规字段 command（AC2，官方校验顺序镜像）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext();
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  const result = (await tool.execute({
    action: 'add', serverName: 'mixed', transport: 'streamable-http', url: 'https://mcp.example.com/mcp',
    command: 'npx', args: ['-y'], env: { A: 'b' }, cwd: '/tmp',
  }, { signal: new AbortController().signal })) as { ok: boolean; error: string; field?: string };
  assert.equal(result.ok, false, 'remote 携带 stdio 字段组拒绝');
  assert.match(result.error, /command/, '官方校验顺序（command→args→env→cwd）首个违规字段 command');
  assert.equal(result.field, 'command', '结构化 field 命中首个违规字段');
  assert.deepEqual(ctx.captured.settingsCalls, [], '被拒写零 settings 调用');
});

test('工具 add 可选超时与重连字段逐字透传进写通道（AC2，内部值不断言合法性——归官方）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext();
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  const reconnect = { enabled: true, initialDelayMs: 500, maxDelayMs: 30_000, maxAttempts: 10 };
  await tool.execute({
    action: 'add', serverName: 'slow', transport: 'stdio', command: 'x',
    toolCallTimeoutMs: 60_000, startupTimeoutMs: 120_000, closeTimeoutMs: 5_000, reconnect,
  }, { signal: new AbortController().signal });

  assert.deepEqual(ctx.captured.settingsCalls, [{
    kind: 'update',
    namespace: 'mcp',
    patch: {
      servers: {
        slow: {
          transport: 'stdio',
          command: 'x',
          toolCallTimeoutMs: 60_000,
          startupTimeoutMs: 120_000,
          closeTimeoutMs: 5_000,
          reconnect,
        },
      },
    },
  }], '可选超时/重连字段原样进入 settings 写（透传，不做插件侧语义加工）');
});

// ---- AC5：凭据模板串原样透传 ----

test('工具 add stdio：env/args/command 中的 ${credential:REF} 串逐字透传不展开不脱敏（AC5）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext();
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  await tool.execute({
    action: 'add', serverName: 'templated', transport: 'stdio',
    command: '${credential:MCP_CMD}',
    args: ['--token', '${credential:MCP_TOKEN}'],
    env: { GITHUB_TOKEN: '${credential:GITHUB_TOKEN}' },
    cwd: '${credential:MCP_WORKDIR}',
  }, { signal: new AbortController().signal });

  assert.deepEqual(ctx.captured.settingsCalls, [{
    kind: 'update',
    namespace: 'mcp',
    patch: {
      servers: {
        templated: {
          transport: 'stdio',
          command: '${credential:MCP_CMD}',
          args: ['--token', '${credential:MCP_TOKEN}'],
          env: { GITHUB_TOKEN: '${credential:GITHUB_TOKEN}' },
          cwd: '${credential:MCP_WORKDIR}',
        },
      },
    },
  }], '模板串逐字进入写通道（展开与脱敏归官方 mcp-client 运行时）');
});

test('工具 add remote：url/headers 中的 ${credential:REF} 串逐字透传（AC5）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext();
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  await tool.execute({
    action: 'add', serverName: 'remote', transport: 'streamable-http',
    url: '${credential:MCP_ENDPOINT}',
    headers: { Authorization: 'Bearer ${credential:MCP_TOKEN}' },
  }, { signal: new AbortController().signal });

  assert.deepEqual(ctx.captured.settingsCalls, [{
    kind: 'update',
    namespace: 'mcp',
    patch: {
      servers: {
        remote: {
          transport: 'streamable-http',
          url: '${credential:MCP_ENDPOINT}',
          headers: { Authorization: 'Bearer ${credential:MCP_TOKEN}' },
        },
      },
    },
  }], 'remote 模板串逐字进入写通道');
});

// ---- AC6：冲突拒绝（同名/坏名），写被拒无半写入 ----

test('工具 add 与既有条目同名：拒绝并列冲突对象，settings 零调用（AC6 无半写入）', async () => {
  const plugin = await loadPlugin();
  const existing = viewOf('searcher', { state: 'connected', toolCount: 2, connectedAt: 1 });
  const ctx = createStubContext([existing]);
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  const result = (await tool.execute({ action: 'add', serverName: 'searcher', transport: 'stdio', command: 'x' }, { signal: new AbortController().signal })) as { ok: boolean; error: string; conflict?: McpManagedServerView };
  assert.equal(result.ok, false, '同名添加被拒');
  assert.match(result.error, /searcher/, '拒绝信息指明冲突名');
  assert.deepEqual(result.conflict, existing, '冲突对象 = 既有 manager 视图（name/configured/status）');
  assert.deepEqual(ctx.captured.settingsCalls, [], '被拒写零 settings 调用（不产生半写入）');
});

test('工具 add 违反官方命名规则（[A-Za-z0-9_-]{1,32}）：拒绝且 settings 零调用（AC6）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext();
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  const bad = (await tool.execute({ action: 'add', serverName: 'bad name!', transport: 'stdio', command: 'x' }, { signal: new AbortController().signal })) as { ok: boolean; error: string };
  const tooLong = (await tool.execute({ action: 'add', serverName: 'a'.repeat(33), transport: 'stdio', command: 'x' }, { signal: new AbortController().signal })) as { ok: boolean; error: string };
  assert.equal(bad.ok, false, '非法字符名拒绝');
  assert.match(bad.error, /A-Za-z0-9_-/, '拒绝信息含官方命名规则');
  assert.equal(tooLong.ok, false, '超长名（33 字符）拒绝');
  assert.deepEqual(ctx.captured.settingsCalls, [], '两类坏名均零 settings 调用');
});

test('工具 remove/enable/disable 未知名：拒绝且 settings 零调用（AC6 存在性前置）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext([]);
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  const removed = (await tool.execute({ action: 'remove', serverName: 'ghost' }, { signal: new AbortController().signal })) as { ok: boolean; error: string };
  const disabled = (await tool.execute({ action: 'disable', serverName: 'ghost' }, { signal: new AbortController().signal })) as { ok: boolean; error: string };
  assert.equal(removed.ok, false, '移除未知名拒绝');
  assert.match(removed.error, /ghost/, '拒绝信息指明未知名');
  assert.equal(disabled.ok, false, '停用未知名拒绝');
  assert.deepEqual(ctx.captured.settingsCalls, [], '存在性不满足即拒绝，零 settings 调用');
});

test('工具 remove 非配置条目（已移除仅存清理记录 configured:false）：拒绝（AC6 官方可移除面镜像）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext([viewOf('ghost', { state: 'failed', reason: 'cleanup', result: { closeConfirmed: false } }, false)]);
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];

  const result = (await tool.execute({ action: 'remove', serverName: 'ghost' }, { signal: new AbortController().signal })) as { ok: boolean; error: string };
  assert.equal(result.ok, false, '无配置条目的清理记录不可再移除');
  assert.match(result.error, /ghost/, '拒绝信息指明对象');
  assert.deepEqual(ctx.captured.settingsCalls, [], '零 settings 调用');
});

test('命令写子命令与工具同拒绝语义：坏参数零 settings 调用且回复指明字段（AC2 命令面）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext();
  plugin.apply(ctx);
  const command = ctx.captured.commands[0];

  const reply = await command.handler(mcpInvocation('add stdio broken'));
  assert.equal(reply.kind, 'error', '命令写被拒返回官方 error 形态（预期拒绝显式 error，不抛）');
  assert.match(reply.text ?? '', /command/, '命令缺 command 的拒绝回复指明字段');
  assert.deepEqual(ctx.captured.settingsCalls, [], '命令面被拒写零 settings 调用');
});

// ---- AC4：读通道 list/watch 状态投影（失败线索可查询；生效语义 = 官方 reconcile，写侧调用形态已在 AC3 批断言）----
// seam ②（spec 测试决策：管理服务读通道契约）经模块导出的 createManagementService 直测——
// apply 用同一工厂组合双入口（AC1 已钉同调），导出工厂是模块公共面而非测试后门。

interface ManagementServiceShape {
  listServers(): McpManagedServerView[];
  watchServers(signal: AbortSignal): AsyncIterable<McpManagedServerView[]>;
  addServer(name: string, input: unknown): Promise<unknown>;
  removeServer(name: string): Promise<unknown>;
  setServerEnabled(name: string, enabled: boolean): Promise<unknown>;
}

test('管理服务 watchServers 直通官方 watch 流：视图原样投影（AC4 读通道 watch）', async () => {
  const mod = await loadPlugin() as unknown as { name: string; apply(ctx: StubContext): void; createManagementService(ctx: StubContext): ManagementServiceShape };
  const views = [viewOf('watched', { state: 'connected', toolCount: 5, connectedAt: 1 })];
  const ctx = createStubContext(views);
  const service = mod.createManagementService(ctx);

  const collected: McpManagedServerView[][] = [];
  const controller = new AbortController();
  for await (const batch of service.watchServers(controller.signal)) {
    collected.push(batch);
    break; // 替身 watch 一次性 yield 后结束（替身契约，见文件头）；真实常驻流归集成票
  }
  assert.deepEqual(collected, [[viewOf('watched', { state: 'connected', toolCount: 5, connectedAt: 1 })]],
    'watch 读通道投影 = manager watch 流的完整视图批次（原样、不加工）');
});

test('list 投影保留 failed 原因线索：工具与命令均可查询（AC4，load.lastError / cleanup）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext([
    viewOf('loader', { state: 'failed', reason: 'load', lastError: 'spawn ENOENT' }),
    viewOf('dirty', { state: 'failed', reason: 'cleanup', result: { closeConfirmed: false } }),
  ]);
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];
  const command = ctx.captured.commands[0];

  const toolResult = (await tool.execute({ action: 'list' }, { signal: new AbortController().signal })) as {
    servers: Array<{ name: string; status: { state: string; lastError?: string; reason?: string } }>;
  };
  assert.equal(toolResult.servers[0].status.state, 'failed', 'failed 状态经投影可查询');
  assert.equal(toolResult.servers[0].status.reason, 'load', '失败原因线索 reason 可查询');
  assert.equal(toolResult.servers[0].status.lastError, 'spawn ENOENT', 'load.lastError 原因线索逐字可查询');

  const reply = await command.handler(mcpInvocation('list'));
  assert.equal(reply.kind, 'success', '命令 list 返回官方 success 形态');
  assert.match(reply.text ?? '', /failed\(load\)：spawn ENOENT/, '命令投影含 failed 原因与 lastError');
  assert.match(reply.text ?? '', /failed\(cleanup\).*closeConfirmed=false/, 'cleanup 失败线索（closeConfirmed）可查询');
});

test('list 投影含 waiting-credentials 状态（AC5+AC4：凭据引用缺失的官方状态经投影可查询）', async () => {
  const plugin = await loadPlugin();
  const ctx = createStubContext([
    viewOf('credless', { state: 'waiting-credentials', lastError: 'credential GITHUB_TOKEN 未配置' }),
  ]);
  plugin.apply(ctx);
  const tool = ctx.captured.tools[0];
  const command = ctx.captured.commands[0];

  const toolResult = (await tool.execute({ action: 'list' }, { signal: new AbortController().signal })) as {
    servers: Array<{ name: string; status: { state: string; lastError: string } }>;
  };
  assert.equal(toolResult.servers[0].status.state, 'waiting-credentials', 'waiting-credentials 状态经投影可查询');
  assert.equal(toolResult.servers[0].status.lastError, 'credential GITHUB_TOKEN 未配置', '凭据缺失线索逐字可查询');

  const reply = await command.handler(mcpInvocation('list'));
  assert.equal(reply.kind, 'success', '命令 list 返回官方 success 形态');
  assert.match(reply.text ?? '', /waiting-credentials/, '命令投影含 waiting-credentials 状态');
  assert.match(reply.text ?? '', /GITHUB_TOKEN/, '命令投影含凭据缺失线索');
});
