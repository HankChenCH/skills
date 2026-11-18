// dsh-mcp 右栏 Dock 页只读面（need 20261118-11f8 FR-1，spec 20261118-0de6 实现决策，票 20261118-1812）：
// 客户端模块两段注册装出 Dock 页——Host 侧注册契约（tab 类型定义 + keyed slot body 席位）与
// 客户端面板只读行为（watch 列表投影 / 空态引导 / 失败内联）。写操作面归后续票 322a，本票零写。
//
// 契约边界（官方一手来源，探针留痕工票 Progress；npx 缓存 @deepseek-ai@0.2.2-rc.4 星座在盘）：
// - 注册形态 = 官方文档规范示例（@deepseek-ai/dsh docs/subsystems/sidebar-right.md「Tab-type
//   registration」示例逐字形态）：apply 内 ctx.effect(() => ctx.sidebarRightTabs.register(定义),
//   label) 持有 disposer；body 席位 ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab',
//   () => ctx.slots.register({ name, key: 定义 id }, Body)), label)。官方先例 =
//   dsh-client-ui-sidebar-files@0.2.2-rc.4 src/client/index.ts apply（一手源码同形态）。
// - 定义字段表 = SidebarRightTabDefinition（dsh-client-ui-sidebar-right src/client/tab-registry.ts
//   一手来源）：id（实现身份，官方自然值 = 包名）、kind（discriminator，本面板自定义）、title
//   （chip 文本 thunk）、guide（入口盒数组，可从 guide 页打开本面板）。页面型省略 patterns
//   （官方：a page type opened by kind omits them）；priority 缺省 extension（外部插件语义）。
// - 数据通道 = 官方 Remote 只读面：ctx.remote.mcpManager.watch（@deepseek-ai/dsh-mcp-manager
//   lib/typert.remote-client.d.ts 生成面：watch(signal?) => RemoteStreamHandle<McpManagedServerView[],
//   never>；RemoteStreamHandle extends AsyncIterable —— @deepseek-ai/dsh-typert-protocol 一手
//   来源，dispose()/break 同效取消）；transport 列经 ctx.remote.settings.describe（
//   @deepseek-ai/dsh-api-settings-controller lib/typert.remote-client.d.ts 生成面；视图 value
//   恒 redact——dsh-settings types.d.ts）。零写通道（settings update/mutate 归票 322a）。
// - useTabInfo = 框架注入 prop（dsh-client-ui-sidebar-right src/client/contract/slots.ts：
//   sidebar.right.pane.tab 的 hookContext/inject 面；组件 props 解构而非全局 import——
//   FilesBody.tsx 一手先例 `const { tab } = useTabInfo()`）。
// - react 运行时 = 模块表 require（官方 client-ui bundle 逐字含 require("react")；模块表解析
//   顺序 platform seed table 优先——dsh-client-modules README），类型侧 react-runtime.d.ts
//   本地镜像，react 不入仓库依赖。
// - 单文件纪律（7504 延续）：客户端面单入口文件，拆多文件须先扩发布面为 bundling
//   （prepack 对多文件产物 fail loud）。
// 测试：test/unit/dsh-mcp-dock-readonly.test.ts（vm 官方物化形态替身 + 客户端 ctx 替身）。
import { createElement, useCallback, useEffect, useState } from 'react';

// ---- 官方形状（type-only 本地镜像；形状来源逐条标注）----

/** 官方 server 视图（@deepseek-ai/dsh-mcp-manager types.ts 一手来源，与 Host 面 index.ts 同源）。 */
interface McpManagedServerView {
  name: string;
  configured: boolean;
  status: McpManagedServerStatus;
}

/**
 * 官方状态联合（dsh-mcp-manager types.ts + lib/typert.remote-client.js zod schema 一手来源，
 * 与 Host 面 describeStatus 同源逐成员）：closed/waiting-credentials/connecting/connected/
 * reconnecting/failed/disabled。
 */
type McpManagedServerStatus =
  | { state: 'closed'; result: { closeConfirmed: boolean; cleanupError?: string } }
  | { state: 'waiting-credentials'; lastError: string }
  | { state: 'connecting'; attempt: number }
  | { state: 'connected'; toolCount: number; connectedAt: number }
  | { state: 'reconnecting'; attempt: number; maxAttempts: number; nextRetryAtMs: number; lastError: string }
  | { state: 'disabled' }
  | {
      state: 'failed';
      reason: 'gave-up' | 'reconnect-disabled' | 'unclosed-generation' | 'load' | 'cleanup';
      lastError?: string;
      result?: { closeConfirmed: boolean; cleanupError?: string };
    };

/** 官方 guide 入口盒（dsh-client-ui-sidebar-right src/client/tab-registry.ts SidebarRightGuideEntry 一手来源）。 */
interface SidebarRightGuideEntry {
  readonly id: string;
  readonly order: number;
  readonly title: () => string;
  readonly description?: () => string;
}

/** 官方 tab 类型定义（dsh-client-ui-sidebar-right src/client/tab-registry.ts SidebarRightTabDefinition 一手来源；页面型本面板只用到的字段）。 */
interface SidebarRightTabDefinition {
  readonly id: string;
  readonly kind: string;
  readonly title: (address: string) => string;
  readonly guide?: readonly SidebarRightGuideEntry[];
}

/**
 * 官方 Remote 流句柄（@deepseek-ai/dsh-typert-protocol lib/types/types.d.ts RemoteStreamHandle
 * 一手来源）：AsyncIterable + dispose 取消；break 出 for await 同效。
 */
interface RemoteStreamHandle<Out> extends AsyncIterable<Out> {
  dispose(): void;
}

/** 官方 Remote 结果（@deepseek-ai/dsh-typert-protocol types.d.ts RemoteResult 一手来源）。 */
type RemoteResult<T> = { ok: true; value: T } | { ok: false; error: { message?: string } };

/** 官方 settings 命名空间视图（dsh-settings types.d.ts SettingsNamespaceView 一手来源；value 恒 redact）。 */
interface SettingsNamespaceView {
  ns: string;
  value: unknown;
}

/** 官方 settings describe 答复（dsh-settings types.d.ts SettingsDescribeValue 一手来源）。 */
interface SettingsDescribeValue {
  namespaces: SettingsNamespaceView[];
}

/**
 * 框架注入的 tab 信息 hook（dsh-client-ui-sidebar-right src/client/contract/slots.ts
 * SidebarRightTabInfo 一手来源的消费子集：body 用 tab.signal 对齐订阅生命周期）。
 */
interface SidebarRightTabInfo {
  sidebar: { expanded: boolean; fullscreen: boolean };
  panel: { id: string; isFloating: boolean };
  tab: {
    id: string;
    signal: AbortSignal;
  } & Record<string, unknown>;
}

/**
 * 客户端模块的宿主上下文切面（服务由客户端 fiber 按 inject 导出注入；形状来源 = 官方
 * client-ui 包 apply 先例 + 各服务生成面）。inject 面在模块导出声明（见文件尾）。
 */
interface ClientContext {
  effect(fn: () => unknown, label: string): unknown;
  sidebarRightTabs: { register(definition: SidebarRightTabDefinition): () => void };
  slots: {
    // inject 的第三实参 label 为可选（官方 sidebar-right src/client/index.ts 两参先例；
    // label 声明走外层 ctx.effect 第二参——files src/client/index.ts apply 一手形态）
    inject(name: string, factory: () => unknown, label?: string): unknown;
    register(options: { name: string; key: string }, component: unknown): unknown;
  };
  remote: {
    mcpManager: { watch(signal?: AbortSignal): RemoteStreamHandle<McpManagedServerView[]> };
    settings: {
      describe(): Promise<RemoteResult<SettingsDescribeValue>>;
      update(namespace: string, patch: Record<string, unknown>): Promise<RemoteResult<unknown>>;
    };
  };
}

// ---- 写操作面（官方 client remote 写通道；写通道语义与 round 1 管理服务同源——
// spec 实现决策「添加/启停/移除语义」：UI 不绕过管理服务另起写路径，双入口与 UI 三面
// 共调同一官方 settings 写链路 ns='mcp'）----

/** DOM 输入事件的消费子集（受控组件 onChange 惯例形态；替身测试以同形字面量驱动）。 */
interface InputEventLike {
  target: { value: string };
}

/**
 * 官方 SettingsPathOpView 镜像（@deepseek-ai/dsh-settings lib/types/types.d.ts 一手来源；
 * Host 面 SettingsPathOp 同源同形：set 必带 value、删键 = unset 非 value:null）。
 */
type SettingsPathOp =
  | { op: 'set'; path: string[]; value: unknown }
  | { op: 'unset'; path: string[] };

/**
 * 官方 settings Remote 写面消费子集（@deepseek-ai/dsh-api-settings-controller
 * lib/typert.remote-client.d.ts 一手来源）：update 拒写经 {ok:false, error} 显式返回非抛出；
 * expectedRevision 官方形参可省（round 1 双入口同形态——本面板不传）。
 */
interface SettingsWriteFace {
  describe(): Promise<RemoteResult<SettingsDescribeValue>>;
  update(namespace: string, patch: Record<string, unknown>): Promise<RemoteResult<unknown>>;
}

/** 官方 SERVER_NAME_PATTERN（@deepseek-ai/dsh-mcp-client src/index.ts 一手来源，与 Host 面 index.ts 逐字同值）。 */
const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/** 写操作反馈（面板内联呈现；拒绝 = 本地轻校验或官方拒写，官方写时校验仍是后盾——round 1 纪律）。 */
type WriteFeedback = { ok: true; message: string } | { ok: false; error: string };

/** 添加表单提交草稿（组件归集的字符串原文；解析归一在写面单点——「ops 组装位置」归写面）。 */
interface AddFormDraft {
  transport: 'stdio' | 'streamable-http';
  name: string;
  command: string;
  argsText: string;
  cwd: string;
  envText: string;
  url: string;
  headersText: string;
}

/** 面板写面（UI 唯一写通道：与 round 1 双入口共调同一官方 settings 写链路，无旁路写路径）。 */
interface McpPanelWrites {
  addServer(draft: AddFormDraft): Promise<WriteFeedback>;
}

/**
 * K=V 每行一行的字典文本解析（/mcp add --env=<K=V> 同语义：键 trim、值取首个 = 之后
 * trim 原样、重键后者胜；空行跳过、无 = 的行即解析错误）。
 */
function parseDictText(text: string): Record<string, string> | string {
  const dict: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) return `字典行 "${trimmed}" 必须形如 键=值`;
    dict[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }
  return dict;
}

/**
 * 面板写面工厂（add 通道语义与 round 1 createManagementService.addServer 同源：命名规则
 * 镜像官方 SERVER_NAME_PATTERN、冲突守卫查当前 watch 视图（update 深合并会静默覆写同名
 * 条目）、写形态 = update('mcp', {servers:{…}}) 只含非空字段；轻校验 + 官方写时校验后盾，
 * 拒绝与官方拒写均显式内联不吞）。快照持有者由 apply 建立并随 watch 批刷新。
 */
function createMcpPanelWrites(
  channels: { settings: SettingsWriteFace },
  snapshot: { views: readonly McpManagedServerView[] },
): McpPanelWrites {
  const writeRefused = (result: RemoteResult<unknown>): string =>
    result.ok === true ? '' : `settings 写被拒（官方校验/revision 校验）：${result.error.message ?? '未知原因'}`;
  return {
    async addServer(draft) {
      const name = draft.name.trim();
      if (SERVER_NAME_PATTERN.test(name) === false) {
        return { ok: false, error: `serverName "${draft.name}" 违反官方命名规则 [A-Za-z0-9_-]{1,32}` };
      }
      if (snapshot.views.some((view) => view.name === name)) {
        return { ok: false, error: `server "${name}"：名称已被既有条目或插件注册占用——先移除同名条目或换名` };
      }
      const entry: Record<string, unknown> = { transport: draft.transport };
      if (draft.transport === 'stdio') {
        const command = draft.command.trim();
        if (command === '') return { ok: false, error: `server "${name}"：stdio 必填 "command"（非空字符串）` };
        entry.command = command;
        const args = draft.argsText.trim().split(/\s+/).filter((token) => token.length > 0);
        if (args.length > 0) entry.args = args;
        if (draft.envText.trim() !== '') {
          const env = parseDictText(draft.envText);
          if (typeof env === 'string') return { ok: false, error: `server "${name}"：${env}` };
          if (Object.keys(env).length > 0) entry.env = env;
        }
        const cwd = draft.cwd.trim();
        if (cwd !== '') entry.cwd = cwd;
      } else {
        const url = draft.url.trim();
        if (url === '') return { ok: false, error: `server "${name}"：streamable-http 必填 "url"（非空字符串）` };
        entry.url = url;
        if (draft.headersText.trim() !== '') {
          const headers = parseDictText(draft.headersText);
          if (typeof headers === 'string') return { ok: false, error: `server "${name}"：${headers}` };
          if (Object.keys(headers).length > 0) entry.headers = headers;
        }
      }
      try {
        const refused = writeRefused(await channels.settings.update('mcp', { servers: { [name]: entry } }));
        if (refused !== '') return { ok: false, error: refused };
        return { ok: true, message: `已提交 server "${name}"（${draft.transport}）——官方 reconcile 即时生效` };
      } catch (error) {
        return { ok: false, error: `settings 写失败：${error instanceof Error ? error.message : String(error)}` };
      }
    },
  };
}

// ---- 面板常量（id/kind design 定稿选型留痕工票 Progress）----

/** tab 实现身份 = 包名（官方字段表自然值；也是 keyed slot body 的注册键）。 */
const TAB_ID = '@hankchen/dsh-mcp';

/** 页面 discriminator（自定义 kind；不撞官方 shipped guide/text/files/browser）。 */
const TAB_KIND = 'mcp-servers';

/** guide 入口盒在 guide 页的位置（官方先例值 10/30 同域；外部插件取靠后档）。 */
const GUIDE_ORDER = 30;

// ---- 状态投影（官方状态联合逐成员的行内线索；与 Host 面 describeStatus 同源语义）----

/** 单条状态的一行描述：state + 官方给的失败线索（lastError/cleanup 结果），原样带出不加工。 */
function describeStatus(status: McpManagedServerStatus): string {
  switch (status.state) {
    case 'connected':
      return `已连接 · 工具 ${String(status.toolCount)} 个`;
    case 'connecting':
      return `连接中（第 ${String(status.attempt)} 次尝试）`;
    case 'reconnecting':
      return `重连中（第 ${String(status.attempt)}/${String(status.maxAttempts)} 次）：${status.lastError}`;
    case 'waiting-credentials':
      return `等待凭据（凭据引用缺失）：${status.lastError}`;
    case 'closed':
      return '已关闭';
    case 'disabled':
      return '已停用（条目保留，连接已卸载）';
    case 'failed':
      if (status.reason === 'load') return `失败（加载）：${status.lastError ?? '未知原因'}`;
      if (status.reason === 'cleanup') {
        const result = status.result ?? { closeConfirmed: false, cleanupError: undefined };
        return `失败（清理）：closeConfirmed=${String(result.closeConfirmed)}${result.cleanupError === undefined ? '' : `，${result.cleanupError}`}`;
      }
      return `失败（${status.reason}）${status.lastError === undefined ? '' : `：${status.lastError}`}`;
    default: {
      const exhaustive: never = status;
      return String(exhaustive);
    }
  }
}

/** transport 列的数据源：settings.describe 的 ns='mcp' 视图 → name→transport 映射（value 恒 redact，transport 非敏感照读）。 */
function transportsOf(describeValue: SettingsDescribeValue): Map<string, string> {
  const view = describeValue.namespaces.find((namespace) => namespace.ns === 'mcp');
  const servers = (view?.value as { servers?: Record<string, { transport?: unknown }> } | undefined)?.servers;
  const transports = new Map<string, string>();
  if (typeof servers === 'object' && servers !== null) {
    for (const [name, entry] of Object.entries(servers)) {
      if (typeof entry?.transport === 'string') transports.set(name, entry.transport);
    }
  }
  return transports;
}

// ---- 面板 body（watch 订阅投影 → 列表/空态/失败内联 + 写操作面：添加/行内编辑/启停移除重试）----

/**
 * body 的数据与写面（apply 期从 ctx.remote 投影 + 写面闭包；组件不持 ctx——官方 faces
 * 先例的闭包捕获形态）。snapshot 由 apply 建立、applyBatch 随批刷新，写面冲突守卫读。
 */
interface McpServersIo {
  watch(signal?: AbortSignal): RemoteStreamHandle<McpManagedServerView[]>;
  describe(): Promise<RemoteResult<SettingsDescribeValue>>;
  writes: McpPanelWrites;
  snapshot: { views: readonly McpManagedServerView[] };
}

/**
 * body 组件工厂：apply 期闭包捕获数据与写面（官方 client-ui faces 形态——组件函数不持
 * ctx）。框架按 keyed slot 注入 props（useTabInfo 由 slot 的 hookContext 提供——
 * contract/slots.ts SidebarRightTabInjected 一手形态；本组件只消费 useTabInfo，列表是
 * Host 全局数据不随 Session 变）。写操作全部经 io.writes 单点，组件零旁路调用。
 */
function createMcpServersBody(io: McpServersIo): (props: { useTabInfo(): SidebarRightTabInfo }) => unknown {
  return function McpServersBody(props) {
    const { useTabInfo } = props;
    const { tab } = useTabInfo();
    const [views, setViews] = useState<McpManagedServerView[]>([]);
    const [transports, setTransports] = useState<Map<string, string>>(new Map());
    const [streamError, setStreamError] = useState<string | undefined>(undefined);
    const [addTransport, setAddTransport] = useState<'stdio' | 'streamable-http'>('stdio');
    const [addDraft, setAddDraft] = useState<Record<string, string>>({});
    const [addNote, setAddNote] = useState<WriteFeedback | undefined>(undefined);
    const applyBatch = useCallback((batch: McpManagedServerView[]): void => {
      setViews(batch);
      io.snapshot.views = batch;
      // transport 列随批刷新：describe 一次性读（官方生成面无流形态）；读取失败列降级 '—'
      // （辅助列显式降级，主列状态照常投影）。
      void io.describe().then((answer) => {
        setTransports(answer.ok ? transportsOf(answer.value) : new Map());
      }).catch(() => {
        setTransports(new Map());
      });
    }, [io]);

    // 订阅生命周期对齐 tab 记录（官方 tab.signal 语义：record 消失或插件卸载才 abort，
    // 隐藏/切 Session 不断流——回来时数据已热）；组件卸载时 dispose 兜底（官方 handle 语义：
    // break 出 for await 同效取消，dispose 幂等）。
    useEffect(() => {
      let live = true;
      const stream = io.watch(tab.signal);
      void (async () => {
        try {
          for await (const batch of stream) {
            if (!live) return;
            applyBatch(batch);
          }
          if (live) setStreamError('列表流已结束（宿主终止了订阅）');
        } catch (error) {
          if (live) setStreamError(error instanceof Error ? error.message : String(error));
        } finally {
          void stream.dispose();
        }
      })();
      return () => {
        live = false;
        stream.dispose();
      };
    }, [tab.signal, applyBatch]);

    const changeAddField = (field: string): ((event: InputEventLike) => void) =>
      // 官方函数式更新语义：排队更新合并时各 onChange 都见最新草稿（官方 useState 契约）
      (event) => setAddDraft((previous) => ({ ...previous, [field]: event.target.value }));
    const submitAdd = useCallback(async (): Promise<void> => {
      const feedback = await io.writes.addServer({
        transport: addTransport,
        name: addDraft.name ?? '',
        command: addDraft.command ?? '',
        argsText: addDraft.args ?? '',
        cwd: addDraft.cwd ?? '',
        envText: addDraft.env ?? '',
        url: addDraft.url ?? '',
        headersText: addDraft.headers ?? '',
      });
      setAddNote(feedback);
      if (feedback.ok === true) setAddDraft({});
    }, [io, addTransport, addDraft]);

    if (streamError !== undefined) {
      return createElement('div', { 'data-mcp-servers': 'error', 'data-mcp-tab-id': tab.id },
        createElement('p', null, `MCP server 列表暂不可读：${streamError}`),
        createElement('p', null, '可稍后切走再切回本页重试；/mcp list 命令始终可用。'));
    }
    if (views.length === 0) {
      // 空态契约（spec FR-5 / 拍板 D4）：只渲染引导文案，无按钮无表单入口
      //（添加表单只在非空清单态渲染——D4 只约束空态，见工票 Progress 决策）
      return createElement('div', { 'data-mcp-servers': 'empty', 'data-mcp-tab-id': tab.id },
        createElement('p', null, '还没有配置任何 MCP server。'),
        createElement('p', null, '在会话里输入 /mcp add 添加（支持 stdio 命令与远程端点，敏感值用 ${credential:REF} 模板引用），或直接用自然语言让助手接入（它会调用 mcp_manage 工具）。'));
    }
    return createElement('div', { 'data-mcp-servers': 'list', 'data-mcp-tab-id': tab.id },
      createElement('ul', null, views.map((view) => createElement('li', { key: view.name, 'data-mcp-server': view.name },
        createElement('span', { 'data-mcp-server-name': view.name }, view.name),
        createElement('span', { 'data-mcp-server-transport': view.name }, transports.get(view.name) ?? '—'),
        createElement('span', { 'data-mcp-server-status': view.name }, describeStatus(view.status)),
        view.configured ? null : createElement('span', null, '（非配置条目：已移除但清理未完成）')))),
      createElement('div', { 'data-mcp-add-form': 'form' },
        createElement('select', {
          'data-mcp-add-transport': addTransport,
          value: addTransport,
          onChange: (event: InputEventLike) => setAddTransport(event.target.value === 'streamable-http' ? 'streamable-http' : 'stdio'),
        },
          createElement('option', { value: 'stdio' }, 'stdio'),
          createElement('option', { value: 'streamable-http' }, 'streamable-http')),
        createElement('input', {
          'data-mcp-add-field': 'name', value: addDraft.name ?? '', placeholder: 'server 名（[A-Za-z0-9_-]{1,32}）',
          onChange: changeAddField('name'),
        }),
        addTransport === 'stdio' ? [
          createElement('input', {
            'data-mcp-add-field': 'command', value: addDraft.command ?? '', placeholder: 'command（如 npx）',
            onChange: changeAddField('command'),
          }),
          createElement('input', {
            'data-mcp-add-field': 'args', value: addDraft.args ?? '', placeholder: '参数（空白分隔，可选）',
            onChange: changeAddField('args'),
          }),
          createElement('input', {
            'data-mcp-add-field': 'cwd', value: addDraft.cwd ?? '', placeholder: '工作目录（可选）',
            onChange: changeAddField('cwd'),
          }),
          createElement('textarea', {
            'data-mcp-add-field': 'env', value: addDraft.env ?? '', placeholder: '环境变量，每行 K=V（可选；值可用 ${credential:REF} 模板引用）',
            onChange: changeAddField('env'),
          }),
        ] : [
          createElement('input', {
            'data-mcp-add-field': 'url', value: addDraft.url ?? '', placeholder: 'MCP 端点 URL',
            onChange: changeAddField('url'),
          }),
          createElement('textarea', {
            'data-mcp-add-field': 'headers', value: addDraft.headers ?? '', placeholder: '请求头，每行 K=V（可选；值可用 ${credential:REF} 模板引用）',
            onChange: changeAddField('headers'),
          }),
        ],
        createElement('button', { 'data-mcp-add-submit': 'submit', onClick: () => void submitAdd() }, '添加 server'),
        addNote === undefined ? null : createElement('p', { 'data-mcp-add-note': 'note' },
          addNote.ok === true ? addNote.message : addNote.error)));
  };
}

// ---- tab 类型定义（Host 侧注册契约的定义构造）----

function mcpServersTabDefinition(): SidebarRightTabDefinition {
  return {
    id: TAB_ID,
    kind: TAB_KIND,
    title: () => 'MCP Servers',
    guide: [{
      id: 'servers',
      order: GUIDE_ORDER,
      title: () => 'MCP Servers',
      description: () => '查看已配置 MCP server 的连接状态与工具清单（只读）',
    }],
  };
}

// ---- 注册与激活（官方文档规范形态，见文件头注）----

/** 客户端 fiber 注入面：注册前必须存在的服务（官方 client-ui 先例的声明形态）。 */
export const inject = ['sidebarRightTabs', 'slots', 'remote', 'remote.mcpManager', 'remote.settings'];

export function apply(ctx: ClientContext): void {
  const snapshot = { views: [] as readonly McpManagedServerView[] };
  const body = createMcpServersBody({
    watch: (signal) => ctx.remote.mcpManager.watch(signal),
    describe: () => ctx.remote.settings.describe(),
    writes: createMcpPanelWrites({ settings: ctx.remote.settings }, snapshot),
    snapshot,
  });
  ctx.effect(() => ctx.sidebarRightTabs.register(mcpServersTabDefinition()), 'dsh-mcp: mcp-servers tab type');
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab', key: TAB_ID },
    body,
  )), 'dsh-mcp: mcp-servers tab body');
}
