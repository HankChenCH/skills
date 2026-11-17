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

/**
 * 官方 serverName 命名规则（@deepseek-ai/dsh-mcp-client@0.2.2-rc.2 src/index.ts
 * SERVER_NAME_PATTERN 一手来源，逐字同值）。
 */
const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/** 双入口提交的条目输入（平铺结构与官方 McpManagedServerEntry 的 ConfigInput 形态对齐；全可选字段见官方 schema 缺省）。 */
interface ServerEntryInput {
  transport: 'stdio' | 'streamable-http';
  command?: unknown;
  args?: unknown;
  env?: unknown;
  cwd?: unknown;
  url?: unknown;
  headers?: unknown;
  enabled?: unknown;
  toolCallTimeoutMs?: unknown;
  startupTimeoutMs?: unknown;
  closeTimeoutMs?: unknown;
  reconnect?: unknown;
}

/** 写操作结果：拒绝时带可定位信息（违规字段名 / 冲突对象）。 */
type WriteOutcome =
  | { ok: true; serverName: string; transport?: 'stdio' | 'streamable-http' }
  | { ok: false; error: string; field?: string; conflict?: McpManagedServerView };

type EntryValidation =
  | { ok: true; entry: Record<string, unknown> }
  | { ok: false; error: string; field: string };

/** 官方校验顺序镜像（manager validateEntries）：stdio = command→url→headers；http = url→command→args→env→cwd。 */
function validateAndNormalizeEntry(name: string, input: ServerEntryInput): EntryValidation {
  const path = `servers.${name}`;
  if (input.transport !== 'stdio' && input.transport !== 'streamable-http') {
    return { ok: false, field: 'transport', error: `${path}：transport 必须是 "stdio" 或 "streamable-http"` };
  }
  const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
  const isStringDict = (value: unknown): value is Record<string, string> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.values(value).every((item) => typeof item === 'string');
  const dictKeys = (value: unknown): string[] =>
    typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.keys(value) : [];

  // 字段类型校验（值类型归官方 z.string()/z.dict(String)/z.number() 的镜像；范围归官方）
  for (const field of ['command', 'cwd', 'url'] as const) {
    const value = input[field];
    if (value !== undefined && !isNonEmptyString(value) && value !== '') {
      return { ok: false, field, error: `${path}：字段 "${field}" 必须是字符串` };
    }
  }
  if (input.args !== undefined && (!Array.isArray(input.args) || !input.args.every((item) => typeof item === 'string'))) {
    return { ok: false, field: 'args', error: `${path}：字段 "args" 必须是字符串数组` };
  }
  if (input.env !== undefined && !isStringDict(input.env)) {
    return { ok: false, field: 'env', error: `${path}：字段 "env" 必须是字符串值对象（键→字符串）` };
  }
  if (input.headers !== undefined && !isStringDict(input.headers)) {
    return { ok: false, field: 'headers', error: `${path}：字段 "headers" 必须是字符串值对象（键→字符串）` };
  }
  for (const field of ['toolCallTimeoutMs', 'startupTimeoutMs', 'closeTimeoutMs'] as const) {
    if (input[field] !== undefined && typeof input[field] !== 'number') {
      return { ok: false, field, error: `${path}：字段 "${field}" 必须是数字（毫秒）` };
    }
  }
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') {
    return { ok: false, field: 'enabled', error: `${path}：字段 "enabled" 必须是布尔` };
  }
  if (input.reconnect !== undefined
    && (typeof input.reconnect !== 'object' || input.reconnect === null || Array.isArray(input.reconnect))) {
    return { ok: false, field: 'reconnect', error: `${path}：字段 "reconnect" 必须是对象（enabled/initialDelayMs/maxDelayMs/maxAttempts）` };
  }

  // 跨 transport 规则（官方 validateEntries 逐条镜像，拒绝信息指明字段；模板串语法校验归官方写时校验）
  const entry: Record<string, unknown> = { transport: input.transport };
  if (input.transport === 'stdio') {
    if (!isNonEmptyString(input.command)) {
      return { ok: false, field: 'command', error: `${path}：a stdio server requires "command"——字段 "command" 必填（非空字符串）` };
    }
    if (isNonEmptyString(input.url)) {
      return { ok: false, field: 'url', error: `${path}："url" is not a stdio field——字段 "url" 不是 stdio 字段，移除它或将 transport 改为 streamable-http` };
    }
    if (dictKeys(input.headers).length > 0) {
      return { ok: false, field: 'headers', error: `${path}："headers" is not a stdio field——字段 "headers" 不是 stdio 字段，移除它或将 transport 改为 streamable-http` };
    }
    entry.command = input.command;
    if (Array.isArray(input.args)) entry.args = input.args;
    if (dictKeys(input.env).length > 0) entry.env = input.env;
    if (isNonEmptyString(input.cwd)) entry.cwd = input.cwd;
  } else {
    if (!isNonEmptyString(input.url)) {
      return { ok: false, field: 'url', error: `${path}：a streamable-http server requires "url"——字段 "url" 必填（非空字符串）` };
    }
    if (isNonEmptyString(input.command)) {
      return { ok: false, field: 'command', error: `${path}："command" is not a streamable-http field——字段 "command" 不是 streamable-http 字段，移除它或将 transport 改为 stdio` };
    }
    if (Array.isArray(input.args) && input.args.length > 0) {
      return { ok: false, field: 'args', error: `${path}："args" is not a streamable-http field——字段 "args" 不是 streamable-http 字段，移除它或将 transport 改为 stdio` };
    }
    if (dictKeys(input.env).length > 0) {
      return { ok: false, field: 'env', error: `${path}："env" is not a streamable-http field——字段 "env" 不是 streamable-http 字段，移除它或将 transport 改为 stdio` };
    }
    if (isNonEmptyString(input.cwd)) {
      return { ok: false, field: 'cwd', error: `${path}："cwd" is not a streamable-http field——字段 "cwd" 不是 streamable-http 字段，移除它或将 transport 改为 stdio` };
    }
    entry.url = input.url;
    if (dictKeys(input.headers).length > 0) entry.headers = input.headers;
  }
  if (typeof input.enabled === 'boolean') entry.enabled = input.enabled;
  for (const field of ['toolCallTimeoutMs', 'startupTimeoutMs', 'closeTimeoutMs'] as const) {
    if (typeof input[field] === 'number') entry[field] = input[field];
  }
  if (typeof input.reconnect === 'object' && input.reconnect !== null && !Array.isArray(input.reconnect)) {
    entry.reconnect = input.reconnect;
  }
  return { ok: true, entry };
}

interface ManagementService {
  listServers(): McpManagedServerView[];
  addServer(name: string, input: ServerEntryInput): Promise<WriteOutcome>;
  removeServer(name: string): Promise<WriteOutcome>;
  setServerEnabled(name: string, enabled: boolean): Promise<WriteOutcome>;
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

/** settings 写被拒（revision 拒旧 / 官方写时校验）的统一归宿：转为 WriteOutcome 拒绝。 */
async function commitSettings(ctx: PluginContext, write: (settings: SettingsService) => Promise<void> | void): Promise<WriteOutcome | undefined> {
  try {
    await write(requireSettings(ctx));
    return undefined;
  } catch (error) {
    return { ok: false, error: `settings 写被拒（官方校验/revision 校验）：${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 管理服务：双入口唯一共调面。读通道直通官方 list()（原样投影——状态语义归官方，
 * 插件不加工）；写通道 = 官方 settings 持久化 API（add = update 合并写一条；remove =
 * mutate 路径置 null；启停 = mutate 只写 enabled 持久意图字段），提交后官方 reconcile
 * 承担生效语义（新增挂载/移除卸载/禁用卸载保条目/字段变化重建），插件不做实例管理。
 */
function createManagementService(ctx: PluginContext): ManagementService {
  return {
    listServers() {
      return requireMcpManager(ctx).list();
    },

    async addServer(name, input) {
      if (!SERVER_NAME_PATTERN.test(name)) {
        return { ok: false, field: 'serverName', error: `serverName "${name}" 违反官方命名规则 [A-Za-z0-9_-]{1,32}` };
      }
      const validation = validateAndNormalizeEntry(name, input);
      if (!validation.ok) return validation;
      const existing = requireMcpManager(ctx).list().find((view) => view.name === name);
      if (existing !== undefined) {
        return {
          ok: false,
          error: `server "${name}"：名称已被既有条目或插件注册占用——先移除同名条目或换名`,
          conflict: existing,
        };
      }
      const refused = await commitSettings(ctx, (settings) =>
        settings.update(SETTINGS_NAMESPACE, { servers: { [name]: validation.entry } }));
      return refused ?? { ok: true, serverName: name, transport: input.transport };
    },

    async removeServer(name) {
      const existing = requireMcpManager(ctx).list().find((view) => view.name === name);
      if (existing === undefined) {
        return { ok: false, error: `server "${name}"：无此条目——/mcp list 查看现存 server` };
      }
      if (!existing.configured) {
        return { ok: false, error: `server "${name}"：无配置条目（已移除但清理未完成，重启宿主方可清账）` };
      }
      const refused = await commitSettings(ctx, (settings) =>
        settings.mutate(SETTINGS_NAMESPACE, `servers.${name}`, null));
      return refused ?? { ok: true, serverName: name };
    },

    async setServerEnabled(name, enabled) {
      const existing = requireMcpManager(ctx).list().find((view) => view.name === name);
      if (existing === undefined || !existing.configured) {
        return { ok: false, error: `server "${name}"：无配置条目——/mcp list 查看现存 server` };
      }
      const refused = await commitSettings(ctx, (settings) =>
        settings.mutate(SETTINGS_NAMESPACE, `servers.${name}.enabled`, enabled));
      return refused ?? { ok: true, serverName: name };
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
  '说明：`--` 之后的 token 全部作为 server 参数（含 -- 开头者）；选项值与参数值不含空格，',
  '含空格或复杂值请用 mcp_manage 工具入口。敏感值用 ${credential:REF} 模板引用',
  '（env/headers/command/args/cwd/url 均可），优先于明文。',
].join('\n');

/** 命令行 parse 出的选项与位置参数。 */
interface ParsedOptions {
  positional: string[];
  cwd?: string;
  env: Record<string, string>;
  headers: Record<string, string>;
}

/** 解析 `--key=value` 选项 token（值不含空格）；裸 `--` 之后的 token 全部归位置参数。 */
function parseAddOptions(tokens: string[], allowedKeys: ReadonlySet<string>): ParsedOptions | string {
  const parsed: ParsedOptions = { positional: [], env: {}, headers: {} };
  let optionsEnded = false;
  for (const token of tokens) {
    if (!optionsEnded && token === '--') {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && token.startsWith('--')) {
      const withoutDashes = token.slice(2);
      const separator = withoutDashes.indexOf('=');
      const key = separator === -1 ? withoutDashes : withoutDashes.slice(0, separator);
      const value = separator === -1 ? undefined : withoutDashes.slice(separator + 1);
      if (!allowedKeys.has(key) || value === undefined || value.length === 0) {
        return `未知或不完整选项 "${token}"——可用：${[...allowedKeys].map((name) => `--${name}=<值>`).join(' ')}（裸 -- 之后的 token 全部作为 server 参数）`;
      }
      if (key === 'cwd') {
        parsed.cwd = value;
      } else {
        const dict = key === 'env' ? parsed.env : parsed.headers;
        const kvSeparator = value.indexOf('=');
        if (kvSeparator <= 0) return `选项 --${key}=<K=V> 的值必须形如 键=值，实际："${value}"`;
        dict[value.slice(0, kvSeparator)] = value.slice(kvSeparator + 1);
      }
      continue;
    }
    parsed.positional.push(token);
  }
  return parsed;
}

/** add 子命令执行体：解析 → 管理服务 → 回复文本。tokens 已剥去 "add"（tokens[0] = transport）。 */
async function executeAdd(service: ManagementService, tokens: string[]): Promise<string> {
  const transport = tokens[0];
  if (transport !== 'stdio' && transport !== 'remote' && transport !== 'streamable-http') {
    return `add 需要 stdio 或 remote 传输类型：/mcp add stdio <name> <command> … 或 /mcp add remote <name> <url> …`;
  }
  const name = tokens[1];
  const firstField = tokens[2];
  if (name === undefined || firstField === undefined) {
    return transport === 'stdio'
      ? '用法：/mcp add stdio <name> <command> [参数…] [--cwd=<目录>] [--env=<K=V>]…'
      : '用法：/mcp add remote <name> <url> [--header=<K=V>]…';
  }
  const rest = tokens.slice(3);
  if (transport === 'stdio') {
    const parsed = parseAddOptions(rest, new Set(['cwd', 'env']));
    if (typeof parsed === 'string') return parsed;
    const outcome = await service.addServer(name, {
      transport: 'stdio',
      command: firstField,
      args: parsed.positional,
      ...(Object.keys(parsed.env).length > 0 ? { env: parsed.env } : {}),
      ...(parsed.cwd !== undefined ? { cwd: parsed.cwd } : {}),
    });
    return formatWriteOutcome(outcome, `已提交 server "${name}"（stdio）`);
  }
  const parsed = parseAddOptions(rest, new Set(['header']));
  if (typeof parsed === 'string') return parsed;
  if (parsed.positional.length > 0) return `remote 传输只有 url 一个位置参数，多余的 "${parsed.positional[0]}" 无法解析`;
  const outcome = await service.addServer(name, {
    transport: 'streamable-http',
    url: firstField,
    ...(Object.keys(parsed.headers).length > 0 ? { headers: parsed.headers } : {}),
  });
  return formatWriteOutcome(outcome, `已提交 server "${name}"（streamable-http）`);
}

/** 写结果 → 命令回复文本：成功带状态查询指引，拒绝带原因（冲突/字段/官方拒写）。 */
function formatWriteOutcome(outcome: WriteOutcome, successLine: string): string {
  if (outcome.ok) {
    return `${successLine}——已写官方 settings（命名空间 ${SETTINGS_NAMESPACE}），官方 reconcile 即时生效；/mcp list 查看状态。`;
  }
  const conflictNote = outcome.conflict === undefined
    ? ''
    : `（冲突对象：${outcome.conflict.name}，当前状态 ${describeStatus(outcome.conflict.status)}${outcome.conflict.configured ? '' : '，非配置条目'}）`;
  return `写被拒：${outcome.error}${conflictNote}`;
}

function createMcpCommand(service: ManagementService): CommandDefinition {
  return {
    name: MCP_COMMAND_NAME,
    description: '管理 MCP server：列出（含连接状态）、添加 stdio/远程、移除、启停；无需手写 Cordis patch。',
    execute(line) {
      const tokens = line.trim().split(/\s+/).filter((token) => token.length > 0);
      const subcommand = tokens[0] ?? 'help';
      if (subcommand === 'help') return MCP_USAGE;
      if (subcommand === 'list') return formatServerViews(service.listServers());
      if (subcommand === 'add') return executeAdd(service, tokens.slice(1));
      const name = tokens[1];
      if (subcommand === 'remove' || subcommand === 'enable' || subcommand === 'disable') {
        if (name === undefined) return `用法：/mcp ${subcommand} <name>`;
        return executeToggle(service, subcommand, name);
      }
      return `未知子命令 "${subcommand}"——可用子命令：\n${MCP_USAGE}`;
    },
  };
}

/** remove/enable/disable 共用执行体（启停 = 只写 enabled 持久意图字段）。 */
async function executeToggle(service: ManagementService, action: 'remove' | 'enable' | 'disable', name: string): Promise<string> {
  const outcome = action === 'remove'
    ? await service.removeServer(name)
    : await service.setServerEnabled(name, action === 'enable');
  const verb = action === 'remove' ? '移除' : action === 'enable' ? '启用' : '停用';
  return formatWriteOutcome(outcome, `已提交${verb} server "${name}"`);
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

/** 工具 add 请求体（schema 已声明；值类型再经管理服务校验，跨 transport 规则镜像官方）。 */
interface ManageToolRequest {
  action?: unknown;
  serverName?: unknown;
  transport?: unknown;
  command?: unknown;
  args?: unknown;
  env?: unknown;
  cwd?: unknown;
  url?: unknown;
  headers?: unknown;
  enabled?: unknown;
  toolCallTimeoutMs?: unknown;
  startupTimeoutMs?: unknown;
  closeTimeoutMs?: unknown;
  reconnect?: unknown;
}

function createManageTool(service: ManagementService): ToolDefinition {
  return {
    name: MANAGE_TOOL_NAME,
    description: '管理 dsh 宿主的 MCP server：列出（含连接状态与失败线索）、添加 stdio/streamable-http server、移除、启停。'
      + '变更经官方 Settings→ConfigEditor 持久化（重启保留、即时生效）。'
      + '敏感值用 ${credential:REF} 模板引用（env/headers/command/args/cwd/url 均可），优先于明文。',
    parameters: MANAGE_TOOL_PARAMETERS,
    async execute(args) {
      const request = args as ManageToolRequest;
      const action = request.action;
      if (typeof action !== 'string') {
        return { ok: false, error: `action 必填且为字符串（list/add/remove/enable/disable），实际：${String(action)}` };
      }
      if (action === 'list') {
        return { ok: true, action: 'list', servers: service.listServers() };
      }
      if (action === 'add') {
        if (typeof request.serverName !== 'string') {
          return { ok: false, error: 'add 需要 serverName（字符串）', field: 'serverName' };
        }
        const outcome = await service.addServer(request.serverName, {
          transport: request.transport as ServerEntryInput['transport'],
          command: request.command,
          args: request.args,
          env: request.env,
          cwd: request.cwd,
          url: request.url,
          headers: request.headers,
          enabled: request.enabled,
          toolCallTimeoutMs: request.toolCallTimeoutMs,
          startupTimeoutMs: request.startupTimeoutMs,
          closeTimeoutMs: request.closeTimeoutMs,
          reconnect: request.reconnect,
        });
        return outcome.ok ? { ...outcome, action } : { ...outcome };
      }
      if (action === 'remove' || action === 'enable' || action === 'disable') {
        if (typeof request.serverName !== 'string') {
          return { ok: false, error: `${action} 需要 serverName（字符串）`, field: 'serverName' };
        }
        const outcome = action === 'remove'
          ? await service.removeServer(request.serverName)
          : await service.setServerEnabled(request.serverName, action === 'enable');
        return outcome.ok ? { ...outcome, action } : { ...outcome };
      }
      return { ok: false, error: `未知 action "${action}"——支持：list/add/remove/enable/disable` };
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
