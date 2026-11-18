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
import type { ReactNode } from 'react';

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
    mcpManager: {
      watch(signal?: AbortSignal): RemoteStreamHandle<McpManagedServerView[]>;
      restart(name: string): Promise<RemoteResult<unknown>>;
      probe(name: string, signal?: AbortSignal): Promise<RemoteResult<unknown>>;
    };
    settings: {
      describe(): Promise<RemoteResult<SettingsDescribeValue>>;
      update(namespace: string, patch: Record<string, unknown>): Promise<RemoteResult<unknown>>;
      mutate(namespace: string, ops: readonly SettingsPathOp[]): Promise<RemoteResult<unknown>>;
    };
  };
}

// ---- 写操作面（官方 client remote 写通道；写通道语义与 round 1 管理服务同源——
// spec 实现决策「添加/启停/移除语义」：UI 不绕过管理服务另起写路径，双入口与 UI 三面
// 共调同一官方 settings 写链路；ns 不硬编码（票 20261118-08f8 修订，round 1「ns='mcp'」
// 口径作废）——写/读时经 describe 派生实际生效 manager 行 id，见 deriveMcpNamespace）----

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
  mutate(namespace: string, ops: readonly SettingsPathOp[]): Promise<RemoteResult<unknown>>;
}

/** 官方 SERVER_NAME_PATTERN（@deepseek-ai/dsh-mcp-client src/index.ts 一手来源，与 Host 面 index.ts 逐字同值）。 */
const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/**
 * manager 配置域标记（票 20261118-08f8，与 Host 面 isMcpConfigValue 同源同形）：官方 manager
 * Config 唯一 volatile 顶层字段 servers（@deepseek-ai/dsh-mcp-manager lib/index.js static
 * Config 一手；default {} 经 cordis resolveConfig→validate 恒解析在场），且 rc.4 星座无第二
 * 服务暴露 servers 配置域（星座全量探针）——以 value.servers 在场判定 manager 配置域。
 */
function isMcpConfigValue(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const servers = (value as { servers?: unknown }).servers;
  return typeof servers === 'object' && servers !== null && !Array.isArray(servers);
}

/**
 * mcp 配置域 ns 派生（票 20261118-08f8，spec「settings 命名空间口径」决策）：官方 settings
 * 以 Loader entry id 为 ns（dsh-settings write/describe 一手：ns = entry.options.id，未知
 * ns 写即拒 `No configurable plugin entry`），行 id 随组合变化——web/desktop 为官方预挂行
 * id mcp-manager（dsh-web-app patch 一手），补位组合为插件行 id mcp。写/读时经 describe
 * 派生实际生效域：value.servers 在场的唯一 ns；describe 被拒、零在场或多于一个在场即拒绝
 * （fail loud 不猜测）。
 */
async function deriveMcpNamespace(settings: SettingsWriteFace): Promise<{ namespace: string } | { refusal: string }> {
  let described: RemoteResult<SettingsDescribeValue>;
  try {
    described = await settings.describe();
  } catch (error) {
    return { refusal: `settings describe 失败：${error instanceof Error ? error.message : String(error)}` };
  }
  if (described.ok === false) {
    return { refusal: `settings describe 被拒：${described.error.message ?? '未知原因'}` };
  }
  const candidates = described.value.namespaces.filter((row) => isMcpConfigValue(row.value));
  if (candidates.length === 0) {
    return { refusal: 'settings describe 无 servers 配置域：mcp-manager 提供者未在场或未激活（组合缺 manager 行，无法定位写目标）' };
  }
  if (candidates.length > 1) {
    return { refusal: `settings describe 有 ${String(candidates.length)} 个 servers 配置域（${candidates.map((row) => row.ns).join('、')}）：manager 提供者不唯一，拒绝猜测写目标` };
  }
  return { namespace: candidates[0].ns };
}

/**
 * 官方 mcpManager Remote 重试面（@deepseek-ai/dsh-mcp-manager lib/typert.remote-client.d.ts
 * 一手来源，探针留痕工票 Progress）：restart(name) => RemoteResult<void>；
 * probe(name, signal?) => RemoteResult<McpProbeResult>（probe 不触碰 live instance，
 * disabled 条目可 probe——官方失败态契约）。
 */
interface McpManagerRetryFace {
  restart(name: string): Promise<RemoteResult<unknown>>;
  probe(name: string, signal?: AbortSignal): Promise<RemoteResult<unknown>>;
}

/** 官方 McpProbeResult 消费子集（@deepseek-ai/dsh-mcp-client lib/types/types.d.ts 一手来源）。 */
type McpProbeOutcome =
  | { ok: true; toolNames: string[]; durationMs: number }
  | { ok: false; stage: string; message: string; durationMs: number };

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

/**
 * 行内编辑提交草稿 = touched 集合（仅被用户改过的字段在场；未触字段零 op——官方 mutate
 * 「Apply field edits without restating redacted secrets」保留语义：未重输的凭据不重传，
 * dsh-settings lib/index.js mutate docstring 一手出处）。transport 不在编辑面（换 transport
 * = 移除重加，见工票 Progress 决策）。
 */
interface EditFormDraft {
  command?: string;
  argsText?: string;
  cwd?: string;
  url?: string;
  envText?: string;
  headersText?: string;
}

/** 面板写面（UI 唯一写通道：与 round 1 双入口共调同一官方 settings 写链路，无旁路写路径）。 */
interface McpPanelWrites {
  addServer(draft: AddFormDraft): Promise<WriteFeedback>;
  editServer(name: string, draft: EditFormDraft): Promise<WriteFeedback>;
  setServerEnabled(name: string, enabled: boolean): Promise<WriteFeedback>;
  removeServer(name: string): Promise<WriteFeedback>;
  retryServer(name: string): Promise<WriteFeedback>;
  probeServer(name: string): Promise<WriteFeedback>;
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
 * 编辑保存的 ops 组装（写面单点）：touched 字段逐一 diff 官方 describe 读值，只对实际
 * 变化的路径产 op——「mutate(ns, ops[]) 只含被改路径」。字典域（env/headers）per-key：
 * 触碰域内逐行 diff（同值行零 op——凭据行原样保留即不重传）、缺失行 unset；值空白行 =
 * 清除意图（键存在即 unset）。返回 string = 拒绝（必填字段被清空/字典行格式错）。
 */
function editOps(name: string, current: Record<string, unknown>, draft: EditFormDraft): SettingsPathOp[] | string {
  const ops: SettingsPathOp[] = [];
  const fieldPath = (field: string): string[] => ['servers', name, field];
  if (draft.command !== undefined) {
    const value = draft.command.trim();
    if (value === '') return `server "${name}"：stdio 必填 "command"（不可清空）`;
    ops.push({ op: 'set', path: fieldPath('command'), value });
  }
  if (draft.url !== undefined) {
    const value = draft.url.trim();
    if (value === '') return `server "${name}"：streamable-http 必填 "url"（不可清空）`;
    ops.push({ op: 'set', path: fieldPath('url'), value });
  }
  if (draft.cwd !== undefined) {
    const value = draft.cwd.trim();
    ops.push(value === '' ? { op: 'unset', path: fieldPath('cwd') } : { op: 'set', path: fieldPath('cwd'), value });
  }
  if (draft.argsText !== undefined) {
    const args = draft.argsText.trim().split(/\s+/).filter((token) => token.length > 0);
    ops.push(args.length === 0 ? { op: 'unset', path: fieldPath('args') } : { op: 'set', path: fieldPath('args'), value: args });
  }
  for (const [field, text] of [['env', draft.envText], ['headers', draft.headersText]] as const) {
    if (text === undefined) continue;
    const touched = parseDictText(text);
    if (typeof touched === 'string') return `server "${name}"：${touched}`;
    const currentDict = (typeof current[field] === 'object' && current[field] !== null
      ? current[field] : {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(touched)) {
      const path = [...fieldPath(field), key];
      if (value === '') {
        if (key in currentDict) ops.push({ op: 'unset', path });
        continue;
      }
      if (currentDict[key] !== value) ops.push({ op: 'set', path, value });
    }
    for (const key of Object.keys(currentDict)) {
      if (key in touched) continue;
      ops.push({ op: 'unset', path: [...fieldPath(field), key] });
    }
  }
  return ops;
}

/**
 * 面板写面工厂（add 通道语义与 round 1 createManagementService.addServer 同源：命名规则
 * 镜像官方 SERVER_NAME_PATTERN、冲突守卫查当前 watch 视图（update 深合并会静默覆写同名
 * 条目）、写形态 = update('mcp', {servers:{…}}) 只含非空字段；轻校验 + 官方写时校验后盾，
 * 拒绝与官方拒写均显式内联不吞）。快照持有者由 apply 建立并随 watch 批刷新。
 */
function createMcpPanelWrites(
  channels: { settings: SettingsWriteFace; mcpManager: McpManagerRetryFace },
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
      // ns 写前派生（票 08f8）：派生拒绝与官方拒写同走内联报错，零猜测零旁路
      const derived = await deriveMcpNamespace(channels.settings);
      if ('refusal' in derived) return { ok: false, error: derived.refusal };
      try {
        const refused = writeRefused(await channels.settings.update(derived.namespace, { servers: { [name]: entry } }));
        if (refused !== '') return { ok: false, error: refused };
        return { ok: true, message: `已提交 server "${name}"（${draft.transport}）——官方 reconcile 即时生效` };
      } catch (error) {
        return { ok: false, error: `settings 写失败：${error instanceof Error ? error.message : String(error)}` };
      }
    },

    async editServer(name, draft) {
      // ops 组装的 diff 基线 = 保存时点的官方 describe 读值（权威当前值，非组件打开表单
      // 时的快照——期间他人改动以最新读值为准；读值恒 redact，本 ns 凭据以模板串在场）
      let described: RemoteResult<SettingsDescribeValue>;
      try {
        described = await channels.settings.describe();
      } catch (error) {
        return { ok: false, error: `当前配置不可读（settings.describe 失败）：${error instanceof Error ? error.message : String(error)}` };
      }
      if (described.ok === false) {
        return { ok: false, error: `当前配置不可读（settings.describe 被拒）：${described.error.message ?? '未知原因'}` };
      }
      // ns 从同一次 describe 派生（票 08f8）：读基线与写目标同一实际生效 manager 行 id
      const domains = described.value.namespaces.filter((row) => isMcpConfigValue(row.value));
      if (domains.length !== 1) {
        return { ok: false, error: domains.length === 0
          ? 'settings describe 无 servers 配置域：mcp-manager 提供者未在场或未激活（组合缺 manager 行，无法定位写目标）'
          : `settings describe 有 ${String(domains.length)} 个 servers 配置域（${domains.map((row) => row.ns).join('、')}）：manager 提供者不唯一，拒绝猜测写目标` };
      }
      const namespace = domains[0].ns;
      const servers = (domains[0].value as { servers?: Record<string, Record<string, unknown>> } | undefined)?.servers;
      const current = servers?.[name];
      if (current === undefined) return { ok: false, error: `server "${name}"：无配置条目可编辑（/mcp list 查看现存 server）` };
      const ops = editOps(name, current, draft);
      if (typeof ops === 'string') return { ok: false, error: ops };
      if (ops.length === 0) return { ok: true, message: '无变更——未改任何字段，官方配置保持原样' };
      try {
        const refused = writeRefused(await channels.settings.mutate(namespace, ops));
        if (refused !== '') return { ok: false, error: refused };
        return { ok: true, message: `已提交 server "${name}" 的编辑（${String(ops.length)} 项变更）——官方 reconcile 即时生效（字段变化重建单实例）` };
      } catch (error) {
        return { ok: false, error: `settings 写失败：${error instanceof Error ? error.message : String(error)}` };
      }
    },

    // 启停/移除前置守卫与 round 1 管理服务同源（configured=false = 已移除清理未完成，
    // 无配置可写）；ops 形态 = 官方 {op:'set', enabled} / {op:'unset'}（生效语义归官方
    // reconcile：禁用卸载保条目、移除卸载并消失）；ns 写前派生（票 08f8）
    async setServerEnabled(name, enabled) {
      const existing = snapshot.views.find((view) => view.name === name);
      if (existing === undefined || existing.configured === false) {
        return { ok: false, error: `server "${name}"：无配置条目——/mcp list 查看现存 server` };
      }
      const derived = await deriveMcpNamespace(channels.settings);
      if ('refusal' in derived) return { ok: false, error: derived.refusal };
      try {
        const refused = writeRefused(await channels.settings.mutate(derived.namespace,
          [{ op: 'set', path: ['servers', name, 'enabled'], value: enabled }]));
        if (refused !== '') return { ok: false, error: refused };
        return { ok: true, message: `已提交 server "${name}" ${enabled ? '启用' : '停用'}——官方 reconcile 即时生效（禁用卸载保条目/启用重建）` };
      } catch (error) {
        return { ok: false, error: `settings 写失败：${error instanceof Error ? error.message : String(error)}` };
      }
    },

    async removeServer(name) {
      const existing = snapshot.views.find((view) => view.name === name);
      if (existing === undefined) {
        return { ok: false, error: `server "${name}"：无此条目——/mcp list 查看现存 server` };
      }
      if (existing.configured === false) {
        return { ok: false, error: `server "${name}"：无配置条目（已移除但清理未完成，重启宿主方可清账）` };
      }
      const derived = await deriveMcpNamespace(channels.settings);
      if ('refusal' in derived) return { ok: false, error: derived.refusal };
      try {
        const refused = writeRefused(await channels.settings.mutate(derived.namespace,
          [{ op: 'unset', path: ['servers', name] }]));
        if (refused !== '') return { ok: false, error: refused };
        return { ok: true, message: `已提交移除 server "${name}"——官方 reconcile 即时生效（条目卸载并消失）` };
      } catch (error) {
        return { ok: false, error: `settings 写失败：${error instanceof Error ? error.message : String(error)}` };
      }
    },

    // 重试面 = 官方 mcpManager Remote 直调（restart / probe），零 settings 写——失败态
    // 契约：failed 条目重试走 restart；disabled 条目走 probe（probe 不触碰 live instance）。
    // 结果投影官方 McpProbeResult 字面量（stage/message/toolNames/durationMs 原样带出）。
    async retryServer(name) {
      const existing = snapshot.views.find((view) => view.name === name);
      if (existing === undefined) {
        return { ok: false, error: `server "${name}"：无此条目——/mcp list 查看现存 server` };
      }
      try {
        const answer = await channels.mcpManager.restart(name);
        if (answer.ok === false) {
          return { ok: false, error: `重试被拒（restart Remote）：${answer.error.message ?? '未知原因'}` };
        }
        return { ok: true, message: `已提交 server "${name}" 重试（restart）——连接状态以列表刷新为准` };
      } catch (error) {
        return { ok: false, error: `restart 调用失败：${error instanceof Error ? error.message : String(error)}` };
      }
    },

    async probeServer(name) {
      const existing = snapshot.views.find((view) => view.name === name);
      if (existing === undefined) {
        return { ok: false, error: `server "${name}"：无此条目——/mcp list 查看现存 server` };
      }
      try {
        const answer = await channels.mcpManager.probe(name);
        if (answer.ok === false) {
          return { ok: false, error: `探测被拒（probe Remote）：${answer.error.message ?? '未知原因'}` };
        }
        const outcome = answer.value as McpProbeOutcome;
        if (outcome.ok === true) {
          return { ok: true, message: `探测成功：工具 ${String(outcome.toolNames.length)} 个（协商+列工具 ${String(outcome.durationMs)}ms；探测不触碰连接，条目保持原状）` };
        }
        return { ok: false, error: `探测失败（${outcome.stage}）：${outcome.message}（${String(outcome.durationMs)}ms）` };
      } catch (error) {
        return { ok: false, error: `probe 调用失败：${error instanceof Error ? error.message : String(error)}` };
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

/** transport 列的数据源：settings.describe 的 manager 配置域（ns 派生，票 08f8）→ name→transport 映射（value 恒 redact，transport 非敏感照读）。 */
function transportsOf(describeValue: SettingsDescribeValue): Map<string, string> {
  const view = describeValue.namespaces.find((namespace) => isMcpConfigValue(namespace.value));
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
    const [editingName, setEditingName] = useState<string | undefined>(undefined);
    const [editDraft, setEditDraft] = useState<Record<string, string>>({});
    const [editCurrent, setEditCurrent] = useState<Record<string, unknown> | undefined>(undefined);
    const [editNote, setEditNote] = useState<WriteFeedback | undefined>(undefined);
    const [rowNote, setRowNote] = useState<WriteFeedback | undefined>(undefined);
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

    /** 打开行内编辑：表单显示值取 describe 一次性读的快照（manager 配置域 ns 派生，票 08f8；ops 基线仍归写面保存时再读）。 */
    const openEdit = (view: McpManagedServerView): void => {
      setEditingName(view.name);
      setEditDraft({});
      setEditNote(undefined);
      void io.describe().then((answer) => {
        if (answer.ok === false) {
          setEditNote({ ok: false, error: `当前配置不可读（settings.describe 被拒）：${answer.error.message ?? '未知原因'}` });
          return;
        }
        const domain = answer.value.namespaces.find((row) => isMcpConfigValue(row.value));
        const servers = (domain?.value as { servers?: Record<string, Record<string, unknown>> } | undefined)?.servers;
        setEditCurrent(servers?.[view.name]);
      }).catch(() => {
        setEditNote({ ok: false, error: '当前配置不可读（settings.describe 失败）' });
      });
    };
    const closeEdit = (): void => {
      setEditingName(undefined);
      setEditDraft({});
      setEditNote(undefined);
      setEditCurrent(undefined);
    };
    const changeEditField = (field: string): ((event: InputEventLike) => void) =>
      // touched 模型：只记被改过的字段；未触字段不进草稿（ops 只含被改路径的前提）
      (event) => setEditDraft((previous) => ({ ...previous, [field]: event.target.value }));
    const submitEdit = useCallback(async (): Promise<void> => {
      if (editingName === undefined) return;
      const feedback = await io.writes.editServer(editingName, {
        command: editDraft.command,
        argsText: editDraft.args,
        cwd: editDraft.cwd,
        url: editDraft.url,
        envText: editDraft.env,
        headersText: editDraft.headers,
      });
      setEditNote(feedback);
    }, [io, editingName, editDraft]);

    const setEnabled = (name: string, enabled: boolean): void => {
      void io.writes.setServerEnabled(name, enabled).then(setRowNote);
    };
    const removeRow = (name: string): void => {
      void io.writes.removeServer(name).then(setRowNote);
    };
    const retryRow = (name: string): void => {
      void io.writes.retryServer(name).then(setRowNote);
    };
    const probeRow = (name: string): void => {
      void io.writes.probeServer(name).then(setRowNote);
    };

    /** 行内编辑表单（显示值 = describe 快照；被触字段覆盖显示）。 */
    const renderEditForm = (name: string, transport: string): ReactNode => {
      const entry = editCurrent ?? {};
      const currentText = (field: string): string => typeof entry[field] === 'string' ? entry[field] as string : '';
      const argsText = Array.isArray(entry.args) ? (entry.args as unknown[]).map(String).join(' ') : '';
      const dictText = (field: string): string => {
        const dict = typeof entry[field] === 'object' && entry[field] !== null ? entry[field] as Record<string, unknown> : {};
        return Object.entries(dict).map(([key, value]) => `${key}=${String(value)}`).join('\n');
      };
      const isStdio = transport === 'stdio';
      return createElement('div', { 'data-mcp-edit-form': name },
        createElement('span', null, `编辑 ${name}（transport ${transport} 只读；换 transport 请移除后重加）`),
        isStdio ? [
          createElement('input', {
            'data-mcp-edit-field': 'command', value: editDraft.command ?? currentText('command'),
            placeholder: 'command（不可清空）', onChange: changeEditField('command'),
          }),
          createElement('input', {
            'data-mcp-edit-field': 'args', value: editDraft.args ?? argsText,
            placeholder: '参数（空白分隔；清空 = 移除参数）', onChange: changeEditField('args'),
          }),
          createElement('input', {
            'data-mcp-edit-field': 'cwd', value: editDraft.cwd ?? currentText('cwd'),
            placeholder: '工作目录（清空 = 移除）', onChange: changeEditField('cwd'),
          }),
          createElement('textarea', {
            'data-mcp-edit-field': 'env', value: editDraft.env ?? dictText('env'),
            placeholder: '环境变量，每行 K=V；未改的行（含凭据模板串）保存时保留不重传；删行 = 移除该键；清空值 = 移除该键',
            onChange: changeEditField('env'),
          }),
        ] : [
          createElement('input', {
            'data-mcp-edit-field': 'url', value: editDraft.url ?? currentText('url'),
            placeholder: 'MCP 端点 URL（不可清空）', onChange: changeEditField('url'),
          }),
          createElement('textarea', {
            'data-mcp-edit-field': 'headers', value: editDraft.headers ?? dictText('headers'),
            placeholder: '请求头，每行 K=V；未改的行（含凭据模板串）保存时保留不重传；删行 = 移除该键；清空值 = 移除该键',
            onChange: changeEditField('headers'),
          }),
        ],
        createElement('button', { 'data-mcp-edit-save': name, onClick: () => void submitEdit() }, '保存'),
        createElement('button', { 'data-mcp-edit-cancel': name, onClick: closeEdit }, '取消'),
        editNote === undefined ? null : createElement('p', { 'data-mcp-edit-note': 'note' },
          editNote.ok === true ? editNote.message : editNote.error));
    };

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
        view.configured ? null : createElement('span', null, '（非配置条目：已移除但清理未完成）'),
        view.configured ? [
          createElement('button', {
            'data-mcp-action': view.status.state === 'disabled' ? 'enable' : 'disable',
            'data-mcp-action-server': view.name,
            onClick: () => setEnabled(view.name, view.status.state === 'disabled'),
          }, view.status.state === 'disabled' ? '启用' : '停用'),
          createElement('button', {
            'data-mcp-action': 'edit', 'data-mcp-action-server': view.name, onClick: () => openEdit(view),
          }, '编辑'),
          createElement('button', {
            'data-mcp-action': 'remove', 'data-mcp-action-server': view.name, onClick: () => removeRow(view.name),
          }, '移除'),
          // 失败态契约（spec FR-4）：failed 条目重试 = restart；disabled 条目探测 = probe
          view.status.state === 'failed' ? createElement('button', {
            'data-mcp-action': 'retry', 'data-mcp-action-server': view.name, onClick: () => retryRow(view.name),
          }, '重试') : null,
          view.status.state === 'disabled' ? createElement('button', {
            'data-mcp-action': 'probe', 'data-mcp-action-server': view.name, onClick: () => probeRow(view.name),
          }, '探测') : null,
        ] : null,
        editingName === view.name && view.configured ? renderEditForm(view.name, transports.get(view.name) ?? '') : null))),
      rowNote === undefined ? null : createElement('p', { 'data-mcp-write-note': 'note' },
        rowNote.ok === true ? rowNote.message : rowNote.error),
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
    writes: createMcpPanelWrites({ settings: ctx.remote.settings, mcpManager: ctx.remote.mcpManager }, snapshot),
    snapshot,
  });
  ctx.effect(() => ctx.sidebarRightTabs.register(mcpServersTabDefinition()), 'dsh-mcp: mcp-servers tab type');
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab', key: TAB_ID },
    body,
  )), 'dsh-mcp: mcp-servers tab body');
}
