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
// 2. ctx.settings.update(namespace, patch) / mutate(namespace, path, value)
//    ——调研报告 F1.4 一手引文形态（「update 合并 / replace 重置继承 / mutate 按路径」
//    「Every write validates the complete Config and refuses stale revisions before
//    persistence」，映射要点 update('mcp', { servers: … })）。mutate 的 value = null =
//    移除该路径是替身契约钉死点（官方 settings 包不在依赖树，方法级签名以报告引文为界；
//    集成票复核）。替身记录调用不落盘。
// 3. ctx.commands.register({ name, description, execute(line) })——替身契约：官方命令
//    插件侧注册签名无一手来源（调研报告 F2.1 只核消费面 Remote list/execute），definition
//    形态与「execute 返回回复文本、预期拒绝不抛异常」为替身钉死契约，集成票复核。
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

interface CapturedCommand {
  name: string;
  description: string;
  execute(line: string): string | Promise<string>;
}

interface CapturedTool {
  name: string;
  description: string;
  parameters: unknown;
  execute(args: unknown, exec: unknown): unknown;
  output: { schema: unknown; render(args: unknown, value: unknown): unknown[] };
}

interface SettingsCall {
  kind: 'update' | 'mutate';
  namespace: string;
  patch?: Record<string, unknown>;
  path?: string;
  value?: unknown;
}

interface StubContext {
  logger: { info(message: string): void; warn(message: string): void; error(message: string): void };
  commands: { register(definition: CapturedCommand): () => void };
  tools: { register(definition: CapturedTool): () => void };
  settings: {
    update(namespace: string, patch: Record<string, unknown>): Promise<void>;
    mutate(namespace: string, path: string, value: unknown): Promise<void>;
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
      async mutate(namespace, path, value) {
        captured.settingsCalls.push({ kind: 'mutate', namespace, path, value });
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
  assert.equal(typeof ctx.captured.commands[0].execute, 'function', '命令带 execute 执行体');
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

  const commandReply = await command.execute('list');
  assert.match(commandReply, /github/, '命令 list 回复含 server 名 github');
  assert.match(commandReply, /docs/, '命令 list 回复含 server 名 docs');
  assert.match(commandReply, /connected/, '命令 list 回复含连接状态投影');

  assert.deepEqual(ctx.captured.settingsCalls, [], '读操作不得触碰写通道（settings 零调用）');
});
