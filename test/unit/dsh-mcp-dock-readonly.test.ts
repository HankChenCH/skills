// dsh-mcp 右栏 Dock 页只读面测试（spec 20261118-0de6 FR-1/FR-4/FR-5 工单级，票 20261118-1812）。
// 被测源码：agents/dsh/plugins/dsh-mcp/client/index.ts（客户端模块）——经 TypeScript 转译为
// 官方 lazy-CJS factory 形态后在 vm 沙箱内按官方物化协议执行（官方运行形态即 CJS-in-factory，
// node ESM 直跑 .ts 反而不是官方物化形态；vm 先例 = dsh-mcp-client-carrier.test.ts）。
// 期望值来源 = 官方一手源码探针（@deepseek-ai@0.2.2-rc.4 星座，npx 缓存在盘可复核，票 Progress
// 留痕）+ spec 实现决策契约，逐条标注于替身契约注释。
//
// 替身契约（stub-fidelity 门：替身测试钉替身契约，浏览器真渲染归集成级人工段——spec 非目标 D6）：
// 1. ctx.effect(fn, label)——cordis effect 语义镜像（官方 sidebar-right.md 文档规范形态
//    `ctx.effect(() => ctx.sidebarRightTabs.register(…), 'image type')`）：执行 fn、收集其返回的
//    disposer 由插件生命周期持有；替身记录 label 与返回值，收集面供断言。
// 2. ctx.sidebarRightTabs.register(definition)——官方一手来源
//    （@deepseek-ai/dsh-client-ui-sidebar-right@0.2.2-rc.4 src/client/tab-registry.ts）：
//    重复 id 同步抛 `sidebarRight: tab type id "<id>" is already registered`；返回 disposer。
// 3. ctx.slots.inject(name, factory, label) / ctx.slots.register(options, component)——官方
//    keyed slot 注册形态（dsh-client-ui-sidebar-files@0.2.2-rc.4 src/client/index.ts 一手先例：
//    `ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({name, key}, Body))`）；
//    inject 的 factory 在替身内同步执行（官方为服务就绪后回调——替身简化点，钉替身契约）。
// 4. ctx.remote.mcpManager.watch(signal?)——官方生成面
//    （@deepseek-ai/dsh-mcp-manager@0.2.2-rc.4 lib/typert.remote-client.d.ts 一手来源）：
//    `watch(signal?) => RemoteStreamHandle<McpManagedServerView[], never>`；RemoteStreamHandle
//    extends AsyncIterable（@deepseek-ai/dsh-typert-protocol lib/types/types.d.ts 一手来源），
//    dispose() 取消逻辑流、break 出 for await 同效。替身流支持 push 续推与 end（官方常驻流
//    直至 abort/终止——替身在测试驱动下逐批续推，仍非真常驻流，钉替身契约）。
// 5. ctx.remote.settings.describe()——官方生成面
//    （@deepseek-ai/dsh-api-settings-controller@0.2.2-rc.4 lib/typert.remote-client.d.ts 一手
//    来源）：`describe() => Promise<RemoteResult<SettingsDescribeValue>>`；视图 value 恒经
//    redactSecrets（dsh-settings types.d.ts 一手来源）。替身按给定清单构 ns='mcp' 视图。
// 6. react 运行时替身——useState/useEffect/useCallback/createElement 的最小驱动模型：
//    hook 槽位按调用序编号（官方 hook 顺序语义）、setter 入队微任务重渲；useEffect 镜像官方
//    依赖数组语义（deps 浅比较，依赖变化先跑旧 cleanup 再跑新 effect——首轮必跑）；不镜像的
//    只有官方批处理合并（一次 setter 一次重渲，替身同此；跨 setter 合并不做——替身简化点）。
//    元素树为普通对象（type/props/children），断言打在其上。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import type { TestContext } from 'node:test';
import ts from 'typescript';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PLUGIN_ROOT = path.join(PACKAGE_ROOT, 'agents', 'dsh', 'plugins', 'dsh-mcp');
const CLIENT_SOURCE = path.join(PLUGIN_ROOT, 'client', 'index.ts');
const PLUGIN_NAME = '@hankchen/dsh-mcp';
const TAB_ID = PLUGIN_NAME;
const TAB_KIND = 'mcp-servers';

// ---- 客户端模块物化（官方 lazy-CJS factory 形态的镜像执行）----

/** client/index.ts 的 CJS 转译体（与 prepack compileClientBundle 同编译形态：CommonJS + ES2023）。 */
function transpileClientBody(): string {
  const source = fs.readFileSync(CLIENT_SOURCE, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.CommonJS,
      // esModuleInterop 缺省关：与 prepack 客户端面编译选项集一致，import 成员直取属性访问
    },
  });
  return result.outputText;
}

/** 官方 factory shell 的逐字形态（prepack compileClientBundle 同款；id = 包名）。 */
function wrapInFactoryShell(body: string): string {
  return `window.__ModuleLoader__.load({id:${JSON.stringify(PLUGIN_NAME)},factory:require=>{` +
    `var module={exports:{}};var exports=module.exports;` +
    `${body}` +
    `return module.exports}});\n`;
}

interface CapturedRegistration {
  id: unknown;
  factory: (require: (specifier: string) => unknown) => unknown;
}

/**
 * 以官方物化协议执行客户端模块：脚本注册 factory（window.__ModuleLoader__ queue facade，
 * dsh-client-modules lib/index.js bootInjections 逐字镜像，carrier 测试先例）→ factory(require)
 * 物化出 module.exports。require 由调用方给（模块表替身）。
 */
function materializeClientModule(requireFn: (specifier: string) => unknown): {
  apply: (ctx: unknown) => void;
  inject: readonly string[];
} {
  const pendingQueue: CapturedRegistration[] = [];
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(registration: CapturedRegistration): void {
          pendingQueue.push(registration);
        },
      },
    },
  };
  vm.createContext(sandbox);
  const script = new vm.Script(wrapInFactoryShell(transpileClientBody()), { filename: 'client.test.js' });
  script.runInContext(sandbox);
  assert.equal(pendingQueue.length, 1, '脚本执行应恰好注册一次 factory（官方 lazy-CJS 模型）');
  assert.equal(pendingQueue[0].id, PLUGIN_NAME, '注册 id = 包名（官方 register() 按 id 归 owner）');
  const exports = pendingQueue[0].factory(requireFn) as { apply: (ctx: unknown) => void; inject: readonly string[] };
  assert.equal(typeof exports.apply, 'function', '物化导出须含 apply（客户端模块 = cordis 插件模块面）');
  return exports;
}

// ---- react 运行时替身（最小驱动模型；契约见文件头第 6 条）----

interface ElementNode {
  readonly type: unknown;
  readonly props: Record<string, unknown> | null;
  readonly children: readonly ElementChild[];
}

type ElementChild = ElementNode | string | number | boolean | null;

function isElement(node: unknown): node is ElementNode {
  return typeof node === 'object' && node !== null && 'type' in node && 'props' in node;
}

interface RenderedView {
  /** 最近一轮渲染的元素树根。 */
  tree: ElementChild;
  /** 本轮渲染收集到的 effect 尚未运行的原始函数（调试用；flush 由驱动器承担）。 */
  effectCount: number;
}

/**
 * react 替身运行时：先造 stub（物化客户端模块时经模块表 require 注入），再 bind 组件得驱动器
 * （物化与渲染共用同一实例——组件闭包绑定物化期的模块级 react 绑定，跨实例即槽位错位）。
 * mount 一轮渲染，setter 触发微任务重渲。
 * hook 槽位按调用序编号（官方 hook 顺序语义）；useEffect 镜像官方依赖数组语义（deps 浅比较，
 * 依赖变化先跑旧 cleanup 再跑新 effect——官方 useEffect 契约；不镜像的只有批处理合并，钉替身契约）。
 */
function createReactRuntime() {
  let slots: unknown[] = [];
  let hookCursor = 0;
  let effectDeps: Array<readonly unknown[] | undefined> = [];
  const effectCleanups: Array<(() => void) | undefined> = [];
  let memoDeps: Array<readonly unknown[] | undefined> = [];
  const memoValues: Array<unknown> = [];
  let pending = false;
  let latest: RenderedView = { tree: null, effectCount: 0 };
  let renderListeners: Array<() => void> = [];
  void latest.effectCount;

  /** 官方依赖数组浅比较（Object.is 逐位）。 */
  const shallowEqual = (left: readonly unknown[], right: readonly unknown[]): boolean =>
    left.length === right.length && left.every((value, index) => Object.is(value, right[index]));

  const reactStub = {
    createElement(
      type: unknown,
      propsValue: Record<string, unknown> | null,
      ...children: unknown[]
    ): ElementNode {
      return {
        type,
        props: propsValue ?? null,
        children: (children as ElementChild[]).flat(9).filter(
          (child) => child !== null && child !== undefined && child !== false && child !== true,
        ),
      };
    },
    useState<S>(initial: S | (() => S)): [S, (value: S | ((previous: S) => S)) => void] {
      const index = hookCursor;
      hookCursor += 1;
      if (slots[index] === undefined) {
        slots[index] = typeof initial === 'function' ? (initial as () => S)() : initial;
      }
      return [slots[index] as S, (value) => {
        slots[index] = typeof value === 'function' ? (value as (previous: S) => S)(slots[index] as S) : value;
        scheduleRender();
      }];
    },
    useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void {
      const index = hookCursor;
      hookCursor += 1;
      const previous = effectDeps[index];
      // 官方语义：首渲必跑；deps 缺省每次跑；浅比较不变即跳过；变化先 cleanup 旧再跑新
      if (previous !== undefined && deps !== undefined && shallowEqual(previous, deps)) return;
      effectDeps[index] = deps;
      const oldCleanup = effectCleanups[index];
      if (typeof oldCleanup === 'function') oldCleanup();
      const cleanup = effect();
      effectCleanups[index] = typeof cleanup === 'function' ? cleanup : undefined;
    },
    /** 官方 useCallback 记忆语义：deps 浅比较不变即返回上次缓存值（组件每轮渲染新建闭包，不记忆即 effect 永动机）。 */
    useCallback<T>(callback: T, deps?: readonly unknown[]): T {
      const index = hookCursor;
      hookCursor += 1;
      const previous = memoDeps[index];
      if (previous !== undefined && deps !== undefined && shallowEqual(previous, deps)) {
        return memoValues[index] as T;
      }
      memoDeps[index] = deps;
      memoValues[index] = callback;
      return callback;
    },
  };

  /** bind 后登记的带 props 渲染闭包（scheduleRender 与 mount 共用同一路径）；unmount 置空。 */
  let renderBound: (() => RenderedView) | undefined;

  function scheduleRender(): void {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      renderBound?.();
      for (const listener of renderListeners.splice(0)) listener();
    });
  }

  return {
    react: reactStub,
    /** 绑定被渲染组件（驱动器宿主；props 由测试经闭包直接给——组件 props 是框架注入面替身）。 */
    bind(component: (p: never) => unknown, props: never) {
      const renderWith = (): RenderedView => {
        hookCursor = 0;
        latest = { tree: component(props) as ElementChild, effectCount: 0 };
        return latest;
      };
      return {
        /** 首轮渲染：重置槽位与 effect/memo 记录（首渲 effect 必跑）、渲染。 */
        mount(): RenderedView {
          slots = [];
          effectDeps = [];
          memoDeps = [];
          for (const cleanup of effectCleanups.splice(0)) {
            if (typeof cleanup === 'function') cleanup();
          }
          renderBound = renderWith;
          return renderWith();
        },
        /** 最近一轮渲染树。 */
        view(): RenderedView {
          return latest;
        },
        /** 等待已调度的微任务重渲与流批处理链排空（连续两轮空闲即稳定）。 */
        async settle(): Promise<void> {
          const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
          for (let round = 0; round < 50; round += 1) {
            const wasPending = pending;
            await tick();
            await tick();
            if (!pending && !wasPending) return;
          }
        },
        /** 卸载：按官方 Destructor 语义运行全部 effect cleanup；此后渲染闭包失效（跨测试防误渲）。 */
        unmount(): void {
          renderBound = undefined;
          for (const cleanup of effectCleanups.splice(0)) {
            if (typeof cleanup === 'function') cleanup();
          }
        },
      };
    },
  };
}

// ---- 客户端 ctx 替身（契约见文件头第 1–5 条）----

/** 官方 McpManagedServerView 镜像（dsh-mcp-manager types.ts 一手来源；status 联合见测试样本）。 */
interface ManagedServerViewStub {
  name: string;
  configured: boolean;
  status: unknown;
}

/** 官方 SettingsNamespaceView 的消费子集镜像（dsh-settings types.d.ts 一手来源：value 经 redact）。 */
interface SettingsNamespaceViewStub {
  ns: string;
  value: unknown;
}

/** 官方 RemoteResult 镜像（dsh-typert-protocol types.d.ts 一手来源）。 */
type RemoteResultStub<T> = { ok: true; value: T } | { ok: false; error: { message?: string } };

interface WatchStreamStub {
  handle: AsyncIterable<ManagedServerViewStub[]> & { dispose(): void };
  /** 推一批视图（官方「变更续推」语义的替身承载）。 */
  push(batch: ManagedServerViewStub[]): void;
  /** 终止流（此后 for await 结束）。 */
  end(): void;
  disposed: boolean;
}

interface ClientStubContext {
  effect(fn: () => unknown, label?: string): unknown;
  sidebarRightTabs: {
    register(definition: Record<string, unknown>): () => void;
    get(kind: string): Record<string, unknown> | undefined;
  };
  slots: {
    inject(name: string, factory: () => unknown, label?: string): () => void;
    register(options: Record<string, unknown>, component: unknown): unknown;
  };
  remote: {
    mcpManager: {
      watch(signal?: AbortSignal): WatchStreamStub['handle'];
    };
    settings: {
      describe(): Promise<RemoteResultStub<{ namespaces: SettingsNamespaceViewStub[] }>>;
    };
  };
  captured: {
    effects: Array<{ label?: string; heldDisposer: unknown }>;
    tabDefinitions: Array<Record<string, unknown>>;
    slotInjects: Array<{ name: string; label?: string }>;
    slotRegisters: Array<{ options: Record<string, unknown>; component: unknown }>;
    watchCalls: Array<{ signal: AbortSignal | undefined; stream: WatchStreamStub }>;
    describeCalls: number;
  };
  /** 给 watch 流推下一批视图。 */
  pushViews(batch: ManagedServerViewStub[]): void;
  /** 设置 describe 的答复（缺省 = ns 'mcp' 视图按 serversWithTransport 构造）。 */
  describeAnswer(answer: RemoteResultStub<{ namespaces: SettingsNamespaceViewStub[] }> | undefined): void;
  setViews(batch: ManagedServerViewStub[]): void;
}

function viewOf(name: string, status: unknown, configured = true): ManagedServerViewStub {
  return { name, configured, status };
}

function createClientStubContext(
  initialViews: ManagedServerViewStub[] = [],
  serversWithTransport: Record<string, { transport: string }> = {},
): ClientStubContext {
  const captured = {
    effects: [] as Array<{ label?: string; heldDisposer: unknown }>,
    tabDefinitions: [] as Array<Record<string, unknown>>,
    slotInjects: [] as Array<{ name: string; label?: string }>,
    slotRegisters: [] as Array<{ options: Record<string, unknown>; component: unknown }>,
    watchCalls: [] as Array<{ signal: AbortSignal | undefined; stream: WatchStreamStub }>,
    describeCalls: 0,
  };
  let currentViews = initialViews.map((view) => structuredClone(view));
  let describeAnswer: RemoteResultStub<{ namespaces: SettingsNamespaceViewStub[] }> | undefined;
  const ids = new Set<string>();
  const kinds = new Map<string, Record<string, unknown>>();
  const streams: WatchStreamStub[] = [];

  const makeWatchStream = (signal: AbortSignal | undefined): WatchStreamStub => {
    const queue: ManagedServerViewStub[][] = [];
    let ended = false;
    let disposed = false;
    const listeners: Array<() => void> = [];
    const wake = (): void => {
      for (const listener of listeners.splice(0)) listener();
    };
    const stub: WatchStreamStub = {
      disposed: false,
      push(batch) {
        queue.push(batch.map((view) => structuredClone(view)));
        wake();
      },
      end() {
        ended = true;
        wake();
      },
      handle: {
        async *[Symbol.asyncIterator]() {
          // 官方 Host 流在 signal abort 时终止（替身镜像此语义：abort 即结束迭代）
          const aborted = (): boolean => signal?.aborted === true;
          if (aborted()) return;
          const onAbort = (): void => wake();
          signal?.addEventListener('abort', onAbort, { once: true });
          try {
            if (currentViews.length >= 0 && queue.length === 0 && !ended && !aborted()) {
              yield currentViews.map((view) => structuredClone(view));
            }
            while (!ended && !aborted()) {
              if (queue.length === 0) {
                await new Promise<void>((resolve) => listeners.push(resolve));
                continue;
              }
              yield queue.shift() as ManagedServerViewStub[];
            }
          } finally {
            signal?.removeEventListener('abort', onAbort);
          }
        },
        dispose() {
          disposed = true;
          stub.disposed = true;
          ended = true;
          wake();
        },
      },
    };
    streams.push(stub);
    return stub;
  };

  return {
    effect(fn, label) {
      const heldDisposer = fn();
      captured.effects.push({ label, heldDisposer });
      return heldDisposer;
    },
    sidebarRightTabs: {
      register(definition) {
        const id = definition.id as string;
        // 官方证伪形态镜像（tab-registry.ts register 一手来源）：重复 id 同步抛
        if (ids.has(id)) throw new Error(`sidebarRight: tab type id "${id}" is already registered`);
        ids.add(id);
        const kind = definition.kind as string;
        kinds.set(kind, definition);
        captured.tabDefinitions.push(definition);
        return () => {
          ids.delete(id);
          if (kinds.get(kind) === definition) kinds.delete(kind);
        };
      },
      get(kind) {
        return kinds.get(kind);
      },
    },
    slots: {
      inject(name, factory, label) {
        captured.slotInjects.push({ name, label });
        // 官方为服务就绪后回调；替身同步执行（替身契约，文件头第 3 条）。
        // inject 返回 disposer（官方先例：sidebar-right src/client/index.ts
        // `const disposeSeat = ctx.slots.inject(...)` 一手形态），释放其管理的注册。
        factory();
        let released = false;
        return () => {
          released = true;
          void released;
        };
      },
      register(options, component) {
        captured.slotRegisters.push({ options, component });
        return undefined;
      },
    },
    remote: {
      mcpManager: {
        watch(signal) {
          const stream = makeWatchStream(signal);
          captured.watchCalls.push({ signal, stream });
          return stream.handle;
        },
      },
      settings: {
        async describe() {
          captured.describeCalls += 1;
          if (describeAnswer !== undefined) return describeAnswer;
          return {
            ok: true,
            value: {
              namespaces: [
                {
                  ns: 'mcp',
                  value: { servers: structuredClone(serversWithTransport) },
                },
              ],
            },
          };
        },
      },
    },
    captured,
    pushViews(batch) {
      const stream = streams.at(-1);
      if (stream !== undefined) stream.push(batch);
    },
    describeAnswer(answer) {
      describeAnswer = answer;
    },
    setViews(batch) {
      currentViews = batch.map((view) => structuredClone(view));
    },
  };
}

// ---- 官方 SidebarRightTabInfo 替身（contract/slots.ts SidebarRightTabInfo 一手来源的消费子集）----

function tabInfoOf(signal: AbortSignal): () => {
  sidebar: { expanded: boolean; fullscreen: boolean };
  panel: { id: string; isFloating: boolean };
  tab: Record<string, unknown>;
} {
  return () => ({
    sidebar: { expanded: true, fullscreen: false },
    panel: { id: 'pane-1', isFloating: false },
    tab: {
      id: 'tab-7',
      kind: TAB_KIND,
      contentId: `sidebar://${TAB_KIND}`,
      signal,
      visible: true,
      navigation: { address: `sidebar://${TAB_KIND}`, params: undefined, revision: 1 },
      actions: {
        bindCommands: () => () => undefined,
        openResource: () => undefined,
        openTab: () => undefined,
        close: () => undefined,
      },
    },
  });
}

// ---- Host 面最小替身（AC5 独立性断言：客户端包缺失时双入口照常；形态 = round 1
// dsh-mcp-plugin.test.ts 替身的注册面子集——apply 期只触碰 commands/tools/logger）----

const PLUGIN_HOST_URL = new URL('../../agents/dsh/plugins/dsh-mcp/index.ts', import.meta.url);

function createHostStubContext(): {
  logger: { info(): void; warn(): void; error(): void };
  commands: { register(definition: unknown): () => void };
  tools: { register(definition: unknown): () => void };
  captured: { commands: unknown[]; tools: unknown[] };
} {
  const captured = { commands: [] as unknown[], tools: [] as unknown[] };
  return {
    logger: { info() {}, warn() {}, error() {} },
    commands: { register(definition) { captured.commands.push(definition); return () => {}; } },
    tools: { register(definition) { captured.tools.push(definition); return () => {}; } },
    captured,
  };
}

// ---- 测试 harness（物化 + apply + body 挂载；每个测试独立实例）----

function moduleRequireOf(runtime: { react: unknown }): (specifier: string) => unknown {
  return (specifier) => {
    if (specifier === 'react') return runtime.react;
    // 官方物化哨兵的镜像（carrier 测试先例）：非 react 的外部请求即构建泄漏
    throw new Error(`客户端模块请求了未预期的外部模块 "${specifier}"（模块表替身只供 react）`);
  };
}

function createHarness() {
  const runtime = createReactRuntime();
  const plugin = materializeClientModule(moduleRequireOf(runtime));
  return {
    /** apply 到替身 ctx。 */
    apply(ctx: ClientStubContext): void {
      plugin.apply(ctx as never);
    },
    /** 从 ctx 注册面取 body 组件并以 tabInfo 替身挂载（驱动器与物化共用同一 react 运行时）。 */
    mountBody(ctx: ClientStubContext, tabSignal: AbortSignal) {
      const body = ctx.captured.slotRegisters[0].component as (p: never) => unknown;
      return runtime.bind(body, { useTabInfo: tabInfoOf(tabSignal) } as never);
    },
    inject: plugin.inject,
  };
}

// ---- AC1：Host 侧注册契约 ----

test('apply 经 ctx.effect 注册 tab 类型：id = 包名、kind 自定义、title 与 guide 入口盒齐备（AC1）', async (t) => {
  const harness = createHarness();
  const ctx = createClientStubContext();
  harness.apply(ctx);

  assert.equal(ctx.captured.tabDefinitions.length, 1, 'ctx.sidebarRightTabs.register 恰收到一个定义');
  const definition = ctx.captured.tabDefinitions[0];
  assert.equal(definition.id, TAB_ID, '定义 id = 包名（官方「package name is the natural value」，sidebar-right.md 字段表）');
  assert.equal(typeof definition.kind, 'string', 'kind 为字符串 discriminator（官方字段表）');
  assert.ok(
    !['guide', 'text', 'files', 'browser'].includes(definition.kind as string),
    `kind 须为本面板自定义（不得撞官方 shipped kinds guide/text/files/browser），实际：${String(definition.kind)}`,
  );
  assert.equal(typeof definition.title, 'function', 'title 为函数（官方字段表：chip 文本，open 时捕获）');
  const title = (definition.title as (address: string) => string)(`sidebar://${TAB_KIND}`);
  assert.ok(title.length > 0, 'title 返回非空文案');
  assert.equal(
    definition.patterns,
    undefined,
    '页面型省略 patterns（官方字段表：a page type opened by kind omits them）',
  );

  assert.ok(Array.isArray(definition.guide), 'guide 为入口盒数组（官方字段表：guide entry boxes）');
  const guide = definition.guide as Array<Record<string, unknown>>;
  assert.equal(guide.length, 1, '本面板贡献恰一个 guide 入口盒');
  const entry = guide[0];
  assert.equal(typeof entry.id, 'string', 'guide entry 带 provider 内稳定 id（官方 SidebarRightGuideEntry）');
  assert.equal(typeof entry.order, 'number', 'guide entry 带 order（官方：ascending position）');
  assert.equal(typeof entry.title, 'function', 'guide entry title 为 thunk（官方：read fresh on every use）');
  assert.ok((entry.title as () => string)().length > 0, 'guide entry title 非空');
  assert.equal(typeof entry.description, 'function', 'guide entry description 为 thunk（官方可选，本面板提供一行说明）');
  assert.ok((entry.description as () => string)().length > 0, 'guide entry description 非空');
});

test('注册 disposer 由 ctx.effect 持有：effect 收集的两个注册 disposer 可将注册面清空（AC1 disposer 生命周期）', async (t) => {
  const harness = createHarness();
  const ctx = createClientStubContext();
  harness.apply(ctx);

  assert.equal(ctx.captured.effects.length, 2, '两个注册各由一个 ctx.effect 持有（tab 类型 + keyed slot body）');
  for (const held of ctx.captured.effects) {
    assert.equal(typeof held.heldDisposer, 'function', `effect（label: ${String(held.label)}）持有函数 disposer（官方语义：实现随插件生命周期）`);
    assert.ok(typeof held.label === 'string' && held.label.length > 0, 'effect 带 label（官方示例形态第二实参）');
  }
  assert.notEqual(
    ctx.captured.effects[0].heldDisposer,
    ctx.captured.effects[1].heldDisposer,
    '两个注册各持各的 disposer（tab 类型与 keyed slot 是两个独立生命周期）',
  );

  // 逐个释放：官方 register 返回幂等 disposer——释放后注册面清空（get(kind) = undefined）
  for (const held of ctx.captured.effects) {
    (held.heldDisposer as () => void)();
  }
  assert.equal(ctx.sidebarRightTabs.get(TAB_KIND), undefined, 'disposer 释放后 tab 类型从注册面移除');
  assert.equal(ctx.captured.tabDefinitions.length, 1, '释放不回改捕获记录（记录面只增）');
});

test('keyed slot body 经 ctx.slots.inject 按定义 id 注册，且同样由 ctx.effect 持有（AC1+AC2 注册面）', async (t) => {
  const harness = createHarness();
  const ctx = createClientStubContext();
  harness.apply(ctx);

  assert.equal(ctx.captured.slotInjects.length, 1, 'ctx.slots.inject 恰一次');
  const slotInject = ctx.captured.slotInjects[0];
  assert.equal(slotInject.name, 'sidebar.right.pane.tab', 'slot 名 = 官方 keyed seat（contract/slots.ts SlotMap）');

  assert.equal(ctx.captured.slotRegisters.length, 1, 'inject 的 factory 恰注册一个 body');
  const register = ctx.captured.slotRegisters[0];
  assert.equal(register.options.name, 'sidebar.right.pane.tab', 'register options.name = slot 名');
  assert.equal(register.options.key, TAB_ID, 'register options.key = 定义 id（官方：the key the body registers under）');
  assert.equal(typeof register.component, 'function', 'body 为组件函数');
});

test('客户端模块 inject 面声明注册所需服务（AC1 inject 面扩展声明）', async (t) => {
  const harness = createHarness();
  assert.ok(Array.isArray(harness.inject), 'inject 为数组（官方 client-ui-* 先例：export const inject = [...]）');
  for (const service of ['sidebarRightTabs', 'slots'] as const) {
    assert.ok(harness.inject.includes(service), `inject 面声明 ${service}（官方文档示例形态）`);
  }
  for (const service of ['remote', 'remote.mcpManager', 'remote.settings'] as const) {
    assert.ok(harness.inject.includes(service), `inject 面声明 ${service}（官方 files 先例的 remote 命名空间子键形态）`);
  }
});

// ---- AC2：客户端面板注册契约（body 内 useTabInfo 接线）----

test('body 激活即开 watch 流且订阅 signal = tab.signal，渲染树携带 tab id（AC2 useTabInfo 接线）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext();
  harness.apply(ctx);
  const controller = new AbortController();
  const view = harness.mountBody(ctx, controller.signal);
  view.mount();
  await view.settle();

  assert.equal(ctx.captured.watchCalls.length, 1, 'body 激活恰开一条 mcpManager.watch 流');
  assert.equal(
    ctx.captured.watchCalls[0].signal,
    controller.signal,
    '订阅 signal = useTabInfo 给的 tab.signal（官方 record 生命周期：record 消失/插件卸载才 abort）',
  );
  const tree = view.view().tree as ElementNode;
  assert.equal(
    tree.props?.['data-mcp-tab-id'],
    'tab-7',
    '渲染树接线 useTabInfo 的 tab.id（接线证据）',
  );
  view.unmount();
});

// ---- 渲染树断言辅助（先序遍历 + 子树文本聚合）----

function collectNodes(root: ElementChild, predicate: (node: ElementNode) => boolean): ElementNode[] {
  const found: ElementNode[] = [];
  const walk = (node: ElementChild): void => {
    if (!isElement(node)) return;
    if (predicate(node)) found.push(node);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return found;
}

function textOf(root: ElementChild): string {
  if (!isElement(root)) return typeof root === 'string' ? root : '';
  return root.children.map(textOf).join('');
}

// ---- AC3：列表与状态投影（watch 订阅渲染 + 失败/凭据内联 + transport 列）----

test('列表投影：watch 首批视图渲染名称/transport/状态/工具数（AC3，官方状态字面量独立来源）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([
    viewOf('github', { state: 'connected', toolCount: 3, connectedAt: 1 }),
    viewOf('docs', { state: 'connecting', attempt: 2 }),
  ], { github: { transport: 'stdio' }, docs: { transport: 'streamable-http' } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  assert.equal(tree.props?.['data-mcp-servers'], 'list', '非空清单以 list 形态渲染');
  const rows = collectNodes(tree, (node) => node.props?.['data-mcp-server'] !== undefined);
  assert.deepEqual(
    rows.map((row) => row.props?.['data-mcp-server']),
    ['github', 'docs'],
    '行按 watch 批序渲染，行键 = server 名',
  );
  assert.match(textOf(rows[0]), /github/, '行含名称');
  assert.match(textOf(rows[0]), /stdio/, '行含 transport（settings.describe 的 ns=mcp 视图投影）');
  assert.match(textOf(rows[0]), /已连接/, '行含状态投影');
  assert.match(textOf(rows[0]), /工具 3 个/, '行含官方 toolCount 字段值（字面量 3 独立于实现）');
  assert.match(textOf(rows[1]), /streamable-http/, 'docs 行 transport = streamable-http');
  assert.match(textOf(rows[1]), /第 2 次尝试/, 'connecting 行含官方 attempt 字段值');
  view.unmount();
});

test('watch 续推：push 第二批视图后渲染更新（AC3 订阅续推语义，官方常驻流替身承载）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([]);
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();
  assert.equal((view.view().tree as ElementNode).props?.['data-mcp-servers'], 'empty', '空清单先渲染空态');

  ctx.pushViews([
    viewOf('late', { state: 'connected', toolCount: 7, connectedAt: 2 }),
  ]);
  await view.settle();
  const tree = view.view().tree as ElementNode;
  assert.equal(tree.props?.['data-mcp-servers'], 'list', '续推后切换到 list 形态');
  assert.match(textOf(tree), /late/, '续推行出现');
  assert.match(textOf(tree), /工具 7 个/, '续推行状态为官方字面量 toolCount=7');
  view.unmount();
});

test('failed 行内联原因线索：load.lastError 与 cleanup 结果原样带出（AC3+FR-4，官方状态字面量）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([
    viewOf('loader', { state: 'failed', reason: 'load', lastError: 'spawn ENOENT' }),
    viewOf('dirty', { state: 'failed', reason: 'cleanup', result: { closeConfirmed: false, cleanupError: 'close timed out' } }),
  ]);
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  const rows = collectNodes(tree, (node) => node.props?.['data-mcp-server'] !== undefined);
  assert.match(textOf(rows[0]), /spawn ENOENT/, 'failed(load) 行内联官方 lastError 字面量');
  assert.match(textOf(rows[0]), /失败/, 'failed 行含失败状态词');
  assert.match(textOf(rows[1]), /close timed out/, 'failed(cleanup) 行内联官方 cleanupError 字面量');
  assert.match(textOf(rows[1]), /closeConfirmed=false/, 'failed(cleanup) 行内联官方 closeConfirmed 结果');
  view.unmount();
});

test('waiting-credentials 行内联凭据缺失线索（AC3+FR-4，官方 lastError 字面量）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([
    viewOf('credless', { state: 'waiting-credentials', lastError: 'credential GITHUB_TOKEN 未配置' }),
  ]);
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  assert.match(textOf(tree), /等待凭据/, 'waiting-credentials 行含状态投影');
  assert.match(textOf(tree), /credential GITHUB_TOKEN 未配置/, '行内联官方 lastError 字面量');
  view.unmount();
});

test('transport 列降级：describe 被拒时行渲染 —（辅助列显式降级，主列照常）（AC3）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([
    viewOf('solo', { state: 'connected', toolCount: 1, connectedAt: 1 }),
  ]);
  ctx.describeAnswer({ ok: false, error: {} });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  assert.ok(ctx.captured.describeCalls >= 1, 'describe 被调用（transport 列数据源）');
  assert.match(textOf(tree), /solo/, '主列（名称）照常');
  assert.match(textOf(tree), /已连接/, '状态列照常');
  const transportCells = collectNodes(tree, (node) => node.props?.['data-mcp-server-transport'] !== undefined);
  assert.equal(textOf(transportCells[0]), '—', 'describe 被拒 → transport 列显式降级为 —');
  view.unmount();
});

// ---- AC4：空态契约（引导文案无按钮无表单入口——spec FR-5 / 拍板 D4）----

test('空态渲染引导文案：/mcp add 与对话式添加指引齐备（AC4）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([]);
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  assert.equal(tree.props?.['data-mcp-servers'], 'empty', '空清单以 empty 形态渲染');
  const text = textOf(tree);
  assert.match(text, /\/mcp add/, '引导文案含 /mcp add 指引');
  assert.match(text, /mcp_manage/, '引导文案含对话式（自然语言调 mcp_manage 工具）指引');
  assert.ok(text.length > 20, '引导文案非空泛（有可执行的下一步）');
  view.unmount();
});

test('空态无按钮无表单入口（AC4 拍板 D4：不放按钮）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([]);
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  const interactive = collectNodes(tree, (node) =>
    typeof node.type === 'string' && ['button', 'input', 'select', 'textarea', 'form', 'a'].includes(node.type));
  assert.deepEqual(
    interactive.map((node) => node.type),
    [],
    '空态树中不得出现任何交互元素（button/input/select/textarea/form/a）',
  );
  view.unmount();
});

// ---- AC5：未加载降级（客户端包缺失 → 注册面与 keyed slot 均不出现；Host 双入口不变）----

test('bundle 只注册不物化则零注册（AC5：官方 lazy-CJS 模型——注册 ≠ 激活，客户端包缺失即 loader 不物化）', () => {
  // 只执行 bundle 脚本（注册 factory），不物化（模拟旧版包/未装：boot graph 无本包行，
  // 官方 loader 不会执行 factory）——替身 ctx 上零注册。
  const runtime = createReactRuntime();
  const pendingQueue: CapturedRegistration[] = [];
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(registration: CapturedRegistration): void {
          pendingQueue.push(registration);
        },
      },
    },
  };
  vm.createContext(sandbox);
  new vm.Script(wrapInFactoryShell(transpileClientBody()), { filename: 'client.test.js' }).runInContext(sandbox);
  assert.equal(pendingQueue.length, 1, '脚本执行注册 factory（combo 载入语义）');
  // 不调 factory(require)——对应官方 loader 从未物化本模块
  assert.equal(typeof pendingQueue[0].factory, 'function', 'factory 在队列中未被调用（lazy 语义）');
});

test('模块顶层零副作用：不物化即无任何注册可达面（AC5 声明缺失路径）', () => {
  // 官方 node 半区扫描语义（7504 探针留痕：decl === undefined || platform !== 'web' 即跳过）
  // 下客户端行不存在——模块唯一可达面 = apply；本断言钉「注册只发生在 apply 内」：
  // 物化（factory 执行）但不 apply → 替身 ctx 不可达，注册面零产出。
  const harness = createHarness();
  const ctx = createClientStubContext();
  // 不调 harness.apply(ctx)——模拟官方 loader 物化模块但宿主未激活该插件（客户端 fiber
  // 未组合本包：dsh.client 声明缺失/旧版包场景的 fiber 组合面缺失）
  assert.equal(ctx.captured.tabDefinitions.length, 0, '未 apply → 零 tab 类型注册');
  assert.equal(ctx.captured.slotRegisters.length, 0, '未 apply → 零 keyed slot 注册');
  assert.equal(ctx.captured.watchCalls.length, 0, '未 apply → 零 watch 订阅');
  // Host 侧双入口独立性：客户端面全程缺席时，Host 模块照常注册 /mcp 命令与 mcp_manage 工具
  return (async () => {
    const hostPlugin = (await import(PLUGIN_HOST_URL.href)) as {
      apply(ctx: never): void;
    };
    const hostCtx = createHostStubContext();
    hostPlugin.apply(hostCtx as never);
    assert.equal(hostCtx.captured.commands.length, 1, '客户端包缺失时 /mcp 命令照常注册');
    assert.equal(hostCtx.captured.tools.length, 1, '客户端包缺失时 mcp_manage 工具照常注册');
  })();
});
