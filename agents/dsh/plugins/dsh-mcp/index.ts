// dsh MCP 对话内管理插件（need 20261117-ea73，spec 20261117-34d4 实现决策，票 20261117-dd1f）：
// apply(ctx) 内组合单一管理服务，双入口共调——/mcp 人类命令（ctx.commands，可达面 = web + sdk，
// 调研 ced7 F2.1）与 mcp_manage 模型工具（ctx.tools.register，全形态可达）。
//
// 契约边界（spec 实现决策「管理服务契约/配置字段契约/人类命令契约/模型工具契约/即时生效契约/
// 凭据契约」）：
// - 写通道 = 官方 Settings→ConfigEditor 持久化链路（调研 ced7 F1.4：settings `update` 合并 /
//   `mutate` 按路径，每次写全量校验并拒过期 revision；映射要点 update('mcp', { servers: … })）。
//   命名空间 = 本包 patch 中 mcp-manager 行 entry id `mcp`（0ea9 定稿）。全程不自管配置文件、
//   不直改 patch 文件、不调 fiber.update。
// - 读通道 = ctx.mcpManager 的 list()/watch()（状态聚合 McpManagedServerStatus 含
//   failed/load.lastError/cleanup/waiting-credentials），插件原样投影不加工。
// - 生效语义 = 官方 reconcile（写通道提交后官方承担：新增挂载/移除卸载/禁用卸载保条目/
//   字段变化重建单实例），插件不做任何实例管理。
// - 凭据 = ${credential:REF} 模板串原样透传（不展开不脱敏，展开归官方 mcp-client 运行时）。
// - 校验规则逐条镜像官方 dsh-mcp-manager validateEntries（@deepseek-ai/dsh-mcp-manager@
//   0.2.2-rc.2 src/index.ts 一手来源，在盘可复核），拒绝时指明字段；官方写时校验仍是后盾。
// 单文件布局沿官方 manager 包先例（src/index.ts 单文件 604 行）；本包 prepack 只编译
// index.ts（0ea9 发布面契约，拆文件须先扩发布面——本票不动）。
// 测试：test/unit/dsh-mcp-plugin.test.ts（替身契约钉死注释见该文件头）。
import type { McpManagedServerStatus, McpManagedServerView } from '@deepseek-ai/dsh-mcp-manager';

// ---- 官方服务面（本地最小接口；形状来源逐条标注）----

/** 官方 mcp-manager 服务面（@deepseek-ai/dsh-mcp-manager@0.2.2-rc.2 src/index.ts list/watch）。 */
interface McpManagerService {
  list(): McpManagedServerView[];
  watch(signal: AbortSignal): AsyncIterable<McpManagedServerView[]>;
}

/**
 * 官方 settings 持久化写面（调研 ced7 F1.4 一手引文形态：update 合并 / mutate 按路径；
* 官方 settings 包不在本包依赖树，签名以报告引文为界，集成票复核）。value = null 表示移除该
 * 路径（替身契约钉死点，测试文件头有标注）。
 */
interface SettingsService {
  update(namespace: string, patch: Record<string, unknown>): Promise<void> | void;
  mutate(namespace: string, path: string, value: unknown): Promise<void> | void;
}

/** 官方 commands 服务注册面（替身契约：插件侧注册签名无一手来源，集成票复核——见测试文件头）。 */
interface CommandsService {
  register(definition: CommandDefinition): unknown;
}

/** 官方 tools 服务注册面（@deepseek-ai/dsh-tools@0.2.2-rc.2 src/contracts.ts 一手来源）。 */
interface ToolsService {
  register(definition: ToolDefinition): unknown;
}

interface CommandDefinition {
  name: string;
  description: string;
  execute(line: string): string | Promise<string>;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: unknown, exec: { signal: AbortSignal }): Promise<unknown>;
  output: { schema: Record<string, unknown>; render(args: unknown, value: unknown): unknown[] };
}

/** 插件消费的宿主上下文切面（服务存在性由 patch 行 inject 保证，见 cordis.patch.yml 注释）。 */
export interface PluginContext {
  logger: { info(message: string): void; warn(message: string): void; error(message: string): void };
  commands: CommandsService;
  tools: ToolsService;
  settings: SettingsService;
  mcpManager: McpManagerService;
}

// ---- 管理服务 ----

/** settings 命名空间 = patch 中 mcp-manager 行 entry id（0ea9 定稿；调研 ced7 F2.3 官方口径）。 */
const SETTINGS_NAMESPACE = 'mcp';

interface ManagementService {
  listServers(): McpManagedServerView[];
}

/** 服务缺失时显式报错（inject 声明失效 = 宿主组合 bug，错误须可定位而非 undefined 崩溃）。 */
function requireMcpManager(ctx: PluginContext): McpManagerService {
  if (ctx.mcpManager === undefined) {
    throw new Error('ctx.mcpManager 服务不可达：插件行 inject 声明失效或宿主组合缺 mcp-manager 行（cordis.patch.yml id: mcp）');
  }
  return ctx.mcpManager;
}

function requireSettings(ctx: PluginContext): SettingsService {
  if (ctx.settings === undefined) {
    throw new Error('ctx.settings 服务不可达：插件行 inject 声明失效或宿主组合缺 settings 服务');
  }
  return ctx.settings;
}

/**
 * 管理服务：双入口唯一共调面。读通道直通官方 list()（原样投影——状态语义归官方，
 * 插件不加工）；写通道在后续批次接通（settings 持久化 API，见 spec FR-3）。
 */
function createManagementService(ctx: PluginContext): ManagementService {
  return {
    listServers() {
      return requireMcpManager(ctx).list();
    },
  };
}

// ---- 状态投影（人类可读面；官方状态联合逐成员，见 manager types.ts + dsh-mcp-client types.ts）----

/** 单条状态的一行描述：state + 官方给的失败线索（lastError/cleanup 结果）。 */
function describeStatus(status: McpManagedServerStatus): string {
  switch (status.state) {
    case 'connected':
      return `connected（工具 ${String(status.toolCount)} 个）`;
    case 'connecting':
      return `connecting（第 ${String(status.attempt)} 次尝试）`;
    case 'reconnecting':
      return `reconnecting（第 ${String(status.attempt)}/${String(status.maxAttempts)} 次）：${status.lastError}`;
    case 'waiting-credentials':
      return `waiting-credentials（凭据引用缺失）：${status.lastError}`;
    case 'closed':
      return 'closed';
    case 'disabled':
      return 'disabled（条目保留，连接已卸载）';
    case 'failed':
      if (status.reason === 'load') return `failed(load)：${status.lastError}`;
      if (status.reason === 'cleanup') {
        return `failed(cleanup)：closeConfirmed=${String(status.result.closeConfirmed)}${status.result.cleanupError === undefined ? '' : `，${status.result.cleanupError}`}`;
      }
      return `failed(${status.reason})${status.lastError === undefined ? '' : `：${status.lastError}`}`;
    default: {
      const exhaustive: never = status;
      return String(exhaustive);
    }
  }
}

/** 列表的人类可读投影：每条 = name + configured 修正 + 状态行（失败线索原样带出）。 */
function formatServerViews(views: McpManagedServerView[]): string {
  if (views.length === 0) return '当前没有 MCP server。';
  const lines = views.map((entry) => {
    const suffix = entry.configured ? '' : '（非配置条目：已移除但清理未完成）';
    return `- ${entry.name}${suffix}：${describeStatus(entry.status)}`;
  });
  return `MCP server 共 ${String(views.length)} 条：\n${lines.join('\n')}`;
}

// ---- /mcp 人类命令（子命令语法 design 定稿，见 usage 文案）----

const MCP_COMMAND_NAME = 'mcp';

/** usage 文案含凭据模板引导（spec 凭据契约：入口提示语引导模板优先于明文）。 */
const MCP_USAGE = [
  '/mcp 子命令：',
  '  /mcp list —— 列出 server 与连接状态',
  '  /mcp add stdio <name> <command> [参数…] [--cwd=<目录>] [--env=<K=V>]…',
  '  /mcp add remote <name> <url> [--header=<K=V>]…',
  '  /mcp remove <name>',
  '  /mcp enable <name> | /mcp disable <name>',
  '敏感值用 ${credential:REF} 模板引用（env/headers/command/args/cwd/url 均可），优先于明文。',
].join('\n');

function createMcpCommand(service: ManagementService): CommandDefinition {
  return {
    name: MCP_COMMAND_NAME,
    description: '管理 MCP server：列出（含连接状态）、添加 stdio/远程、移除、启停；无需手写 Cordis patch。',
    execute(line) {
      const tokens = line.trim().split(/\s+/).filter((token) => token.length > 0);
      const subcommand = tokens[0] ?? 'help';
      if (subcommand === 'help') return MCP_USAGE;
      if (subcommand === 'list') return formatServerViews(service.listServers());
      // 写子命令在写通道批次接通（spec FR-2/FR-3）；此处先只认 list，拒绝未知子命令。
      return `未知子命令 "${subcommand}"——当前可用：/mcp list、/mcp help`;
    },
  };
}

// ---- mcp_manage 模型工具（工具名与参数 schema design 定稿）----

const MANAGE_TOOL_NAME = 'mcp_manage';

/**
 * 参数 schema（dsh-tools 强制子集支持的 JSON Schema 关键字：type/properties/required/
 * additionalProperties:boolean/items/enum）。跨 transport 字段混用的逐字段拒绝由管理服务
 * 校验承担（镜像官方 validateEntries，拒绝信息指明字段——oneOf 的分支错误指不出字段）。
 */
const MANAGE_TOOL_PARAMETERS: Record<string, unknown> = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['list', 'add', 'remove', 'enable', 'disable'], description: '管理动作' },
    serverName: { type: 'string', description: 'server 名（[A-Za-z0-9_-]{1,32}，即实例的 serverName 工具命名空间）' },
    transport: { type: 'string', enum: ['stdio', 'streamable-http'], description: 'add 必填：传输类型' },
    command: { type: 'string', description: 'stdio：可执行文件；值可为 ${credential:REF} 模板串' },
    args: { type: 'array', items: { type: 'string' }, description: 'stdio：参数列表（不经 shell 插值）' },
    env: { type: 'object', description: 'stdio：子进程附加环境变量（值为字符串，可为 ${credential:REF} 模板串）' },
    cwd: { type: 'string', description: 'stdio：子进程工作目录' },
    url: { type: 'string', description: 'streamable-http：MCP 端点 URL；值可为 ${credential:REF} 模板串' },
    headers: { type: 'object', description: 'streamable-http：附加请求头（值为字符串，可为 ${credential:REF} 模板串）' },
    enabled: { type: 'boolean', description: '持久意图：false 卸载连接但条目保留' },
    toolCallTimeoutMs: { type: 'number', description: '可选：单次工具调用超时毫秒数（官方默认）' },
    startupTimeoutMs: { type: 'number', description: '可选：启动预算毫秒数（官方默认 30000）' },
    closeTimeoutMs: { type: 'number', description: '可选：清理预算毫秒数（官方默认）' },
    reconnect: {
      type: 'object',
      description: '可选：重连策略（enabled/initialDelayMs/maxDelayMs/maxAttempts，字段校验归官方）',
    },
  },
  required: ['action'],
  additionalProperties: false,
};

function createManageTool(service: ManagementService): ToolDefinition {
  return {
    name: MANAGE_TOOL_NAME,
    description: '管理 dsh 宿主的 MCP server：列出（含连接状态与失败线索）、添加 stdio/streamable-http server、移除、启停。'
      + '变更经官方 Settings→ConfigEditor 持久化（重启保留、即时生效）。'
      + '敏感值用 ${credential:REF} 模板引用（env/headers/command/args/cwd/url 均可），优先于明文。',
    parameters: MANAGE_TOOL_PARAMETERS,
    async execute(args) {
      const request = args as { action?: string };
      if (request.action === 'list') {
        return { ok: true, action: 'list', servers: service.listServers() };
      }
      // 写 action 在写通道批次接通（spec FR-2/FR-3）；此处先只认 list。
      return { ok: false, error: `未知 action "${String(request.action)}"——当前支持：list` };
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          action: { type: 'string' },
          serverName: { type: 'string' },
          transport: { type: 'string', enum: ['stdio', 'streamable-http'] },
          servers: { type: 'array' },
          error: { type: 'string' },
          field: { type: 'string' },
          conflict: { type: 'object' },
        },
        required: ['ok'],
      },
      render(_args, value) {
        return [{ type: 'text', text: JSON.stringify(value) }];
      },
    },
  };
}

// ---- 插件入口 ----

export const name: string = '@hankchen/dsh-mcp';

export function apply(ctx: PluginContext): void {
  const service = createManagementService(ctx);
  ctx.commands.register(createMcpCommand(service));
  ctx.tools.register(createManageTool(service));
  ctx.logger.info(`插件已加载：${name}（/mcp 命令与 mcp_manage 工具已注册）`);
}
