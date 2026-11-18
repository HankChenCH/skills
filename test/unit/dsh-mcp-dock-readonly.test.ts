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
//    redactSecrets（dsh-settings types.d.ts 一手来源）。替身缺省按给定清单构 ns='mcp' 视图
//    （headless 补位组合），describeAnswer 可整表改写（web 组合 ns='mcp-manager' 用例——票
//    20261118-08f8：面板 ns 派生自 describe 中 value.servers 在场的唯一域，不硬编码）。
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
  let latest: RenderedView = { tree: null };

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
    });
  }

  return {
    react: reactStub,
    /** 绑定被渲染组件（驱动器宿主；props 由测试经闭包直接给——组件 props 是框架注入面替身）。 */
    bind(component: (p: never) => unknown, props: never) {
      const renderWith = (): RenderedView => {
        hookCursor = 0;
        latest = { tree: component(props) as ElementChild };
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

/**
 * 官方 SettingsNamespaceView 的消费子集镜像（dsh-settings types.d.ts 一手来源：value 经
 * redact）。revision = 官方视图 required 字段（票 1dc4 探针：dsh-settings src/index.ts
 * monotonic 写入即 +1，从未写过的行 revision 0）——写面 expectedRevision 的读值来源。
 */
interface SettingsNamespaceViewStub {
  ns: string;
  value: unknown;
  revision: number;
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
      /** 官方 remote 重试面（dsh-mcp-manager lib/typert.remote-client.d.ts 一手来源，探针留痕票 Progress）。 */
      restart(name: string): Promise<RemoteResultStub<unknown>>;
      probe(name: string, signal?: AbortSignal): Promise<RemoteResultStub<unknown>>;
    };
    settings: {
      describe(): Promise<RemoteResultStub<{ namespaces: SettingsNamespaceViewStub[] }>>;
      /**
       * 官方 remote 写面（dsh-api-settings-controller lib/typert.remote-client.d.ts 一手来源）。
       * 三参形态 = 票 1dc4 探针实证：expectedRevision: number | undefined 为 TS 必传位
       * （契约 acceptsUndefined: true；gateway prepareInvocation 按 descriptor.parameters.length
       * 数参在 codec 之前，acceptsUndefined 不豁免传参个数——round 1 替身按 2 参镜像即替身
       * 保真缺口，真机 `expected 3 argument(s), got 2` 暴露）。
       */
      update(namespace: string, patch: Record<string, unknown>, expectedRevision: number | undefined): Promise<RemoteResultStub<unknown>>;
      mutate(namespace: string, ops: readonly unknown[], expectedRevision: number | undefined): Promise<RemoteResultStub<unknown>>;
      /** 官方 settings remote 同命名空间其余写面（哨兵：被触即记账+抛——写AC5 旁路守卫）。 */
      replace(namespace: string, section: Record<string, unknown>): Promise<RemoteResultStub<unknown>>;
      openSettingsDocument(signal?: AbortSignal): Promise<RemoteResultStub<unknown>>;
    };
  };
  captured: {
    effects: Array<{ label?: string; heldDisposer: unknown }>;
    tabDefinitions: Array<Record<string, unknown>>;
    slotInjects: Array<{ name: string; label?: string }>;
    slotRegisters: Array<{ options: Record<string, unknown>; component: unknown }>;
    watchCalls: Array<{ signal: AbortSignal | undefined; stream: WatchStreamStub }>;
    describeCalls: number;
    /** 写通道捕获：add = update 形态；编辑/启停/移除 = mutate ops 形态（round 1 同源字面；expectedRevision = 票 1dc4 三参形态第三位）。 */
    updateCalls: Array<{ namespace: string; patch: Record<string, unknown>; expectedRevision: number | undefined }>;
    mutateCalls: Array<{ namespace: string; ops: unknown[]; expectedRevision: number | undefined }>;
    restartCalls: string[];
    probeCalls: string[];
    /** 旁路哨兵：官方 settings remote 其余写面被触即记账（替身契约——面板写面只许走 update/mutate）。 */
    bypassCalls: string[];
  };
  /** 给 watch 流推下一批视图。 */
  pushViews(batch: ManagedServerViewStub[]): void;
  /** 设置 describe 的答复（缺省 = ns 'mcp' 视图按 serversWithTransport 构造）。 */
  describeAnswer(answer: RemoteResultStub<{ namespaces: SettingsNamespaceViewStub[] }> | undefined): void;
  /** 设置 update/mutate 的答复（缺省 ok；拒写形态 = {ok:false, error:{message}}）。 */
  refuseWrites(message: string): void;
  /** 设置 restart 的答复（缺省 ok）。 */
  restartAnswer(answer: RemoteResultStub<unknown>): void;
  /** 设置 probe 的答复（缺省 ok:true 空结果）。 */
  probeAnswer(answer: RemoteResultStub<unknown>): void;
}

function viewOf(name: string, status: unknown, configured = true): ManagedServerViewStub {
  return { name, configured, status };
}

function createClientStubContext(
  initialViews: ManagedServerViewStub[] = [],
  // ns 'mcp' 的 describe 读值条目（官方读值恒 redact——dsh-settings types.d.ts；本 ns 的
  // Config schema 无 secret role 声明，模板串原样在场即非秘密引用形态，探针留痕票 Progress）。
  // ns 'mcp' = headless 补位组合的插件行 id（票 20261118-08f8：web 组合用 describeAnswer
  // 改写为 mcp-manager——面板按 value.servers 域派生 ns，不硬编码）
  serversWithTransport: Record<string, unknown> = {},
): ClientStubContext {
  const captured = {
    effects: [] as Array<{ label?: string; heldDisposer: unknown }>,
    tabDefinitions: [] as Array<Record<string, unknown>>,
    slotInjects: [] as Array<{ name: string; label?: string }>,
    slotRegisters: [] as Array<{ options: Record<string, unknown>; component: unknown }>,
    watchCalls: [] as Array<{ signal: AbortSignal | undefined; stream: WatchStreamStub }>,
    describeCalls: 0,
    updateCalls: [] as Array<{ namespace: string; patch: Record<string, unknown>; expectedRevision: number | undefined }>,
    mutateCalls: [] as Array<{ namespace: string; ops: unknown[]; expectedRevision: number | undefined }>,
    restartCalls: [] as string[],
    probeCalls: [] as string[],
    bypassCalls: [] as string[],
  };
  let currentViews = initialViews.map((view) => structuredClone(view));
  let describeAnswer: RemoteResultStub<{ namespaces: SettingsNamespaceViewStub[] }> | undefined;
  let writeAnswer: RemoteResultStub<unknown> = { ok: true, value: {} };
  let restartAnswer: RemoteResultStub<unknown> = { ok: true, value: undefined };
  let probeAnswer: RemoteResultStub<unknown> | undefined;
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
            if (queue.length === 0 && !ended && !aborted()) {
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
        // `const disposeSeat = ctx.slots.inject(...)` 一手形态）；本替身注册面为
        // 捕获记录（只增不删），disposer 仅承载「函数形态」契约。
        factory();
        return () => {};
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
        async restart(name) {
          captured.restartCalls.push(name);
          return restartAnswer;
        },
        async probe(name) {
          captured.probeCalls.push(name);
          return probeAnswer ?? { ok: true, value: { ok: true, toolNames: [], durationMs: 0, closeConfirmed: true } };
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
                  // 官方从未写入行的自然值（dsh-settings src/index.ts 一手：首次 revision 0）
                  revision: 0,
                },
              ],
            },
          };
        },
        // 官方 remote 写面形态（dsh-api-settings-controller lib/typert.remote-client.d.ts）：
        // 拒写经 {ok:false, error} 显式返回非抛出；捕获记录不落盘。捕获即结构克隆——
        // vm 沙箱对象与宿主原型隔离，克隆让断言面统一为宿主原型（替身契约钉死点）
        // 官方 remote 写面形态（dsh-api-settings-controller lib/typert.remote-client.d.ts）：
        // 拒写经 {ok:false, error} 显式返回非抛出；捕获记录不落盘。捕获即结构克隆——
        // vm 沙箱对象与宿主原型隔离，克隆让断言面统一为宿主原型（替身契约钉死点）。
        // 第三参照真实签名镜像并捕获（票 1dc4 替身保真：替身签名 = 真实签名）
        async update(namespace, patch, expectedRevision) {
          captured.updateCalls.push({ namespace, patch: structuredClone(patch), expectedRevision });
          return writeAnswer;
        },
        async mutate(namespace, ops, expectedRevision) {
          captured.mutateCalls.push({ namespace, ops: structuredClone([...ops]), expectedRevision });
          return writeAnswer;
        },
        // 官方 settings remote 其余写面哨兵（dsh-api-settings-controller
        // lib/typert.remote-client.d.ts 一手形态：replace / openSettingsDocument 同在
        // settings 命名空间）——面板写面只许走 update/mutate，被触即记账+抛出（round 1
        // fiber.update 哨兵先例）
        async replace() {
          captured.bypassCalls.push('settings.replace');
          throw new Error('旁路哨兵：settings.replace 被调用——官方链路外写通道被禁止');
        },
        async openSettingsDocument() {
          captured.bypassCalls.push('settings.openSettingsDocument');
          throw new Error('旁路哨兵：settings.openSettingsDocument 被调用');
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
    refuseWrites(message) {
      writeAnswer = { ok: false, error: { message } };
    },
    restartAnswer(answer) {
      restartAnswer = answer;
    },
    probeAnswer(answer) {
      probeAnswer = answer;
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

// =====================================================================================
// 写操作面（票 20261118-322a：spec FR-2/FR-3/FR-4 工单级契约）——在本文件替身 harness 上扩展：
// 交互辅助（点击/改值直接调元素 props 处理器）+ 写通道捕获替身（上方 ctx 扩展）。
// 期望值来源 = round 1 dsh-mcp-plugin.test.ts 同源字面（官方 settings update/mutate 形态）
// + 官方 remote 一手探针（restart/probe 形态，票 Progress 留痕）。
// =====================================================================================

/** 按 data-* 属性值取节点（行内交互定位；找不到即断言失败——行为未实现红得其所）。 */
function nodeWith(tree: ElementChild, attr: string, value: string): ElementNode {
  const found = collectNodes(tree, (node) => node.props?.[attr] === value);
  assert.ok(found.length > 0, `交互定位失败：${attr}=${value} 的元素不在渲染树中（行为缺失即红）`);
  return found[0];
}

/** 模拟点击（props.onClick 直接调用——替身元素树即交互面）。 */
function clickButton(tree: ElementChild, attr: string, value: string): void {
  const node = nodeWith(tree, attr, value);
  const handler = node.props?.onClick as (() => void) | undefined;
  assert.equal(typeof handler, 'function', `${attr}=${value} 缺 onClick 处理器`);
  assert.ok(handler);
  handler();
}

/** 模拟输入（受控 onChange + {target:{value}} 事件字面量——react 受控输入惯例形态）。 */
function changeInput(tree: ElementChild, attr: string, value: string, inputValue: string): void {
  const node = nodeWith(tree, attr, value);
  const handler = node.props?.onChange as ((event: { target: { value: string } }) => void) | undefined;
  assert.equal(typeof handler, 'function', `${attr}=${value} 缺 onChange 处理器`);
  assert.ok(handler);
  handler({ target: { value: inputValue } });
}

/** 已连上条目的 watch 视图样本（官方 connected 字面量；非配置守卫另用 configured=false 变体）。 */
function connectedView(name: string): ManagedServerViewStub {
  return viewOf(name, { state: 'connected', toolCount: 2, connectedAt: 1 });
}

// ---- 写AC1：添加提交契约（stdio/远程两形态、update 形态、模板串透传、冲突与轻校验守卫）----

test('添加表单 stdio 提交：settings.update("mcp", {servers:{…}}) 恰一次，条目只含非空字段且 ${credential:REF} 模板串原样透传（写AC1）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('github')], { github: { transport: 'stdio' } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  changeInput(tree, 'data-mcp-add-field', 'name', 'deployer');
  changeInput(tree, 'data-mcp-add-field', 'command', 'npx');
  changeInput(tree, 'data-mcp-add-field', 'args', '-y mcp-server');
  changeInput(tree, 'data-mcp-add-field', 'env', 'GITHUB_TOKEN=${credential:GITHUB_TOKEN}');
  changeInput(tree, 'data-mcp-add-field', 'cwd', '/work');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-add-submit', 'submit');
  await view.settle();

  assert.deepEqual(ctx.captured.updateCalls, [
    {
      namespace: 'mcp',
      patch: {
        servers: {
          deployer: {
            transport: 'stdio',
            command: 'npx',
            args: ['-y', 'mcp-server'],
            env: { GITHUB_TOKEN: '${credential:GITHUB_TOKEN}' },
            cwd: '/work',
          },
        },
      },
      expectedRevision: 0,
    },
  ], '添加 = settings.update 三参深合并形态、命名空间 = 挂载行 entry id mcp、expectedRevision = describe 读值 0（round 1 add 同源字面 + 票 1dc4 三参）；模板串原样透传不展开（展开归官方 mcp-client 运行时）');
  assert.deepEqual(ctx.captured.mutateCalls, [], '添加不经 mutate（round 1 add = update 形态，写通道语义同源）');
  view.unmount();
});

test('添加表单远程提交：url/headers 形态 update，headers 模板串透传（写AC1）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('github')], { github: { transport: 'stdio' } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  changeInput(tree, 'data-mcp-add-transport', 'stdio', 'streamable-http');
  await view.settle();
  const switched = view.view().tree as ElementNode;
  changeInput(switched, 'data-mcp-add-field', 'name', 'remote1');
  changeInput(switched, 'data-mcp-add-field', 'url', 'https://mcp.example.com/mcp');
  changeInput(switched, 'data-mcp-add-field', 'headers', 'Authorization=${credential:AUTH}');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-add-submit', 'submit');
  await view.settle();

  assert.deepEqual(ctx.captured.updateCalls, [
    {
      namespace: 'mcp',
      patch: {
        servers: {
          remote1: {
            transport: 'streamable-http',
            url: 'https://mcp.example.com/mcp',
            headers: { Authorization: '${credential:AUTH}' },
          },
        },
      },
      expectedRevision: 0,
    },
  ], '远程形态 = transport streamable-http + url/headers，expectedRevision = describe 读值（round 1 add remote 同源字面 + 票 1dc4 三参）；headers 模板串原样透传');
  view.unmount();
});

test('添加重名拒绝：零写调用且内联报错点名 server（写AC1 冲突守卫，round 1「名称已被既有条目占用」同语义）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('github')], { github: { transport: 'stdio' } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  changeInput(tree, 'data-mcp-add-field', 'name', 'github');
  changeInput(tree, 'data-mcp-add-field', 'command', 'npx');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-add-submit', 'submit');
  await view.settle();

  assert.deepEqual(ctx.captured.updateCalls, [], '重名提交不产生任何 settings 写调用（update 深合并会静默覆写——round 1 冲突守卫同语义）');
  const note = nodeWith(view.view().tree as ElementNode, 'data-mcp-add-note', 'note');
  assert.match(textOf(note), /github/, '内联报错点名冲突 server 名');
  view.unmount();
});

test('添加非法名拒绝（官方命名规则 [A-Za-z0-9_-]{1,32}）：零写调用（写AC1 轻校验）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('github')], { github: { transport: 'stdio' } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  changeInput(tree, 'data-mcp-add-field', 'name', 'bad name!');
  changeInput(tree, 'data-mcp-add-field', 'command', 'npx');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-add-submit', 'submit');
  await view.settle();

  assert.deepEqual(ctx.captured.updateCalls, [], '非法名提交零写调用（官方 SERVER_NAME_PATTERN 镜像，官方写时校验仍是后盾）');
  const note = nodeWith(view.view().tree as ElementNode, 'data-mcp-add-note', 'note');
  assert.match(textOf(note), /命名规则/, '内联报错说明命名规则');
  view.unmount();
});

test('stdio 缺 command 拒绝：零写调用（写AC1 必填守卫）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('github')], { github: { transport: 'stdio' } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  changeInput(tree, 'data-mcp-add-field', 'name', 'empty');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-add-submit', 'submit');
  await view.settle();

  assert.deepEqual(ctx.captured.updateCalls, [], '缺 command 零写调用（a stdio server requires "command"，官方校验镜像）');
  const note = nodeWith(view.view().tree as ElementNode, 'data-mcp-add-note', 'note');
  assert.match(textOf(note), /command/, '内联报错指明缺失字段');
  view.unmount();
});

// ---- 写AC2：行内编辑契约（mutate ops 只含被改路径；凭据未重输不进 ops——官方 mutate
// 「Apply field edits without restating redacted secrets」保留语义，dsh-settings lib/index.js
// mutate docstring 一手出处）----

/** 编辑态样本：stdio 条目含凭据模板 env 值（官方 describe 读值形态——mcp ns 无 secret role，模板串原样在场）。 */
function editSampleServers(): Record<string, unknown> {
  return {
    docs: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'srv'],
      env: { GITHUB_TOKEN: '${credential:GITHUB_TOKEN}', LOG_KEY: 'info', OLD_KEY: 'x' },
      cwd: '/work',
    },
  };
}

/** 按行操作定位并点击（data-mcp-action + data-mcp-action-server 双键定位——多行同名按钮）。 */
function clickRowAction(tree: ElementChild, server: string, action: string): void {
  const found = collectNodes(tree, (node) =>
    node.props?.['data-mcp-action'] === action && node.props?.['data-mcp-action-server'] === server);
  assert.ok(found.length > 0, `行操作定位失败：server=${server} action=${action} 不在渲染树中（行为缺失即红）`);
  const handler = found[0].props?.onClick as (() => void) | undefined;
  assert.ok(handler, `行操作 server=${server} action=${action} 缺 onClick 处理器`);
  handler();
}

test('打开编辑：表单显示 describe 读值（凭据 env 以 K=V 每行一行投影），零改动保存零写调用并提示无变更（写AC2）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('docs')], editSampleServers());
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  clickRowAction(view.view().tree as ElementNode, 'docs', 'edit');
  await view.settle();

  const envNode = nodeWith(view.view().tree as ElementNode, 'data-mcp-edit-field', 'env');
  assert.equal(
    envNode.props?.value,
    'GITHUB_TOKEN=${credential:GITHUB_TOKEN}\nLOG_KEY=info\nOLD_KEY=x',
    '编辑表单 env 显示 describe 读值（官方读值投影；凭据字段以模板串在场即脱敏形态）',
  );
  clickButton(view.view().tree as ElementNode, 'data-mcp-edit-save', 'docs');
  await view.settle();

  assert.deepEqual(ctx.captured.updateCalls, [], '零改动不产生 update');
  assert.deepEqual(ctx.captured.mutateCalls, [], '零改动不产生 mutate——未重输的凭据不重传（保留语义的不变量：无 touched 即无 op）');
  const note = nodeWith(view.view().tree as ElementNode, 'data-mcp-edit-note', 'note');
  assert.match(textOf(note), /无变更/, '零改动保存提示无变更');
  view.unmount();
});

test('编辑只改 cwd：mutate ops 恰一条 set 且路径 = servers.docs.cwd，凭据 env 路径不在 ops（写AC2 只含被改路径）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('docs')], editSampleServers());
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  clickRowAction(view.view().tree as ElementNode, 'docs', 'edit');
  await view.settle();
  changeInput(view.view().tree as ElementNode, 'data-mcp-edit-field', 'cwd', '/new');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-edit-save', 'docs');
  await view.settle();

  assert.deepEqual(ctx.captured.mutateCalls, [
    { namespace: 'mcp', ops: [{ op: 'set', path: ['servers', 'docs', 'cwd'], value: '/new' }], expectedRevision: 0 },
  ], '编辑 = mutate(ns, ops[], expectedRevision) 且只含被改路径（round 1 官方 ops 形态 + 票 1dc4 三参）；凭据 env 未重输 → 零 env op（官方保留语义）');
  assert.deepEqual(ctx.captured.updateCalls, [], '编辑不经 update（round 1 编辑 = mutate 形态）');
  view.unmount();
});

test('编辑 env 触碰：改值/新增行产 per-key set、删行产 unset，保留行同值零 op（写AC2 字典 per-key ops）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('docs')], editSampleServers());
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  clickRowAction(view.view().tree as ElementNode, 'docs', 'edit');
  await view.settle();
  // 触碰 env 域：凭据行原样保留（未重输）、改 LOG_KEY 值、增 NEW_KEY、删 OLD_KEY 行
  changeInput(view.view().tree as ElementNode, 'data-mcp-edit-field', 'env',
    'GITHUB_TOKEN=${credential:GITHUB_TOKEN}\nLOG_KEY=debug\nNEW_KEY=v2\n');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-edit-save', 'docs');
  await view.settle();

  assert.deepEqual(ctx.captured.mutateCalls, [
    {
      namespace: 'mcp',
      ops: [
        { op: 'set', path: ['servers', 'docs', 'env', 'LOG_KEY'], value: 'debug' },
        { op: 'set', path: ['servers', 'docs', 'env', 'NEW_KEY'], value: 'v2' },
        { op: 'unset', path: ['servers', 'docs', 'env', 'OLD_KEY'] },
      ],
      expectedRevision: 0,
    },
  ], '字典域 per-key ops：被改键 set、新增键 set、被删键 unset；凭据行同值保留 → 零凭据 op（不重传）');
  view.unmount();
});

// ---- 写AC3：启停/移除契约（官方 ops 形态 {op:'set', enabled} / {op:'unset'}；
// 生效语义 = 官方 reconcile：禁用卸载保条目、移除消失——round 1 同源字面）----

test('停用/启用：mutate [{op:"set", path:["servers",名,"enabled"], value:布尔}] 官方形态恰一次（写AC3）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('docs')], { docs: { transport: 'stdio' } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  clickRowAction(view.view().tree as ElementNode, 'docs', 'disable');
  await view.settle();
  assert.deepEqual(ctx.captured.mutateCalls, [
    { namespace: 'mcp', ops: [{ op: 'set', path: ['servers', 'docs', 'enabled'], value: false }], expectedRevision: 0 },
  ], '停用 = 官方 set 只写 servers.<名>.enabled 持久意图字段（禁用卸载保条目语义的写形态）');

  // 官方 reconcile 推送停用后状态 → 行操作切换为启用
  ctx.pushViews([viewOf('docs', { state: 'disabled' })]);
  await view.settle();
  clickRowAction(view.view().tree as ElementNode, 'docs', 'enable');
  await view.settle();
  assert.deepEqual(ctx.captured.mutateCalls[1], {
    namespace: 'mcp', ops: [{ op: 'set', path: ['servers', 'docs', 'enabled'], value: true }], expectedRevision: 0,
  }, '启用 = 同形 set op，value: true');
  assert.equal(ctx.captured.mutateCalls.length, 2, '两次启停恰两次 mutate（写通道单点）');
  view.unmount();
});

test('移除：mutate [{op:"unset", path:["servers",名]}] 官方删键形态恰一次（写AC3；value:null 是写 null 非删键——round 1 钉死点）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('docs')], { docs: { transport: 'stdio' } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  clickRowAction(view.view().tree as ElementNode, 'docs', 'remove');
  await view.settle();
  assert.deepEqual(ctx.captured.mutateCalls, [
    { namespace: 'mcp', ops: [{ op: 'unset', path: ['servers', 'docs'] }], expectedRevision: 0 },
  ], '移除 = 官方 SettingsPathOp unset 删键（生效语义 = 官方 reconcile 卸载并消失）');
  assert.deepEqual(ctx.captured.updateCalls, [], '移除不经 update');
  view.unmount();
});

test('非配置条目（configured=false，清理未完成）零写操作按钮（写AC3 生效语义守卫）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([viewOf('ghost', { state: 'closed', result: { closeConfirmed: true } }, false)]);
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  const actions = collectNodes(tree, (node) => node.props?.['data-mcp-action'] !== undefined);
  assert.deepEqual(
    actions.map((node) => node.props?.['data-mcp-action-server']),
    [],
    '清理未完成的条目不得出现任何写操作按钮（编辑/启停/移除——round 1 removeServer 同守卫语义）',
  );
  view.unmount();
});

// ---- 写AC4：重试契约（failed → restart Remote；disabled → probe Remote，probe 不触碰
// live instance——官方 remote 形态 @deepseek-ai/dsh-mcp-manager lib/typert.remote-client.d.ts
// 一手来源，探针留痕工票 Progress；结果投影官方 McpProbeResult 字面量）----

test('failed 行重试：mcpManager.restart(name) 恰一次且零 settings 写调用（写AC4）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([viewOf('loader', { state: 'failed', reason: 'load', lastError: 'spawn ENOENT' })]);
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  clickRowAction(view.view().tree as ElementNode, 'loader', 'retry');
  await view.settle();

  assert.deepEqual(ctx.captured.restartCalls, ['loader'], 'failed 重试 = 官方 restart Remote');
  assert.deepEqual(ctx.captured.probeCalls, [], 'failed 行不走 probe（探测归 disabled 条目）');
  assert.deepEqual(ctx.captured.updateCalls, [], '重试零 update');
  assert.deepEqual(ctx.captured.mutateCalls, [], '重试零 mutate（重试是 Remote 调用非配置写）');
  view.unmount();
});

test('disabled 行探测：mcpManager.probe(name) 恰一次且不触 restart，成功结果内联官方 McpProbeResult 字面量（写AC4）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([viewOf('sleeper', { state: 'disabled' })]);
  ctx.probeAnswer({ ok: true, value: { ok: true, toolNames: ['a', 'b'], durationMs: 12, closeConfirmed: true } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  clickRowAction(view.view().tree as ElementNode, 'sleeper', 'probe');
  await view.settle();

  assert.deepEqual(ctx.captured.probeCalls, ['sleeper'], 'disabled 探测 = 官方 probe Remote（不触碰 live instance）');
  assert.deepEqual(ctx.captured.restartCalls, [], 'disabled 行不走 restart（无 live 实例可重启——官方语义 probe 承载）');
  const note = nodeWith(view.view().tree as ElementNode, 'data-mcp-write-note', 'note');
  assert.match(textOf(note), /探测成功/, '探测成功状态内联');
  assert.match(textOf(note), /2 个/, '工具数投影官方 toolNames 字面量（2 个键）');
  assert.match(textOf(note), /12/, '耗时投影官方 durationMs 字面量（12ms）');
  view.unmount();
});

test('探测失败结果内联官方 stage 与诊断 message（写AC4 失败投影）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([viewOf('sleeper', { state: 'disabled' })]);
  ctx.probeAnswer({ ok: true, value: { ok: false, stage: 'connect', message: 'ECONNREFUSED', durationMs: 5, closeConfirmed: true } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  clickRowAction(view.view().tree as ElementNode, 'sleeper', 'probe');
  await view.settle();

  const note = nodeWith(view.view().tree as ElementNode, 'data-mcp-write-note', 'note');
  assert.match(textOf(note), /connect/, '失败阶段投影官方 stage 字面量');
  assert.match(textOf(note), /ECONNREFUSED/, '失败诊断投影官方 message 字面量');
  view.unmount();
});

// ---- 写AC5：写路径同源（UI 写操作与 round 1 双入口共调同一管理服务单点，无旁路写路径）。
// 断言形态 = 全动作序列 + 通道计数 + 旁路哨兵（round 1「fiber.update 必炸哨兵」先例的
// 客户端面移植：官方 settings remote 其余写面被触即记账）。守卫型测试：被禁行为本就未
// 发生，红语义 = 旁路一旦引入即红（期望值字面来源 = round 1 dsh-mcp-plugin.test.ts 同形字面）。

test('写路径单点：添加/编辑/启停/移除/重试/探测全动作序列各通道恰一次调用、字面与 round 1 同源、旁路哨兵零触碰（写AC5）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext(
    [connectedView('docs'), viewOf('loader', { state: 'failed', reason: 'load', lastError: 'spawn ENOENT' }), viewOf('sleeper', { state: 'disabled' })],
    { docs: { transport: 'stdio', command: 'npx', env: { TOKEN: '${credential:TOKEN}' }, cwd: '/work' } },
  );
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  // ① 添加：update('mcp', {servers:{…}})——round 1 工具/命令 add 同形字面
  let tree = view.view().tree as ElementNode;
  changeInput(tree, 'data-mcp-add-field', 'name', 'searcher');
  changeInput(tree, 'data-mcp-add-field', 'command', 'node');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-add-submit', 'submit');
  await view.settle();

  // ② 行内编辑 docs：mutate 只含被改路径——round 1 编辑语义同形
  clickRowAction(view.view().tree as ElementNode, 'docs', 'edit');
  await view.settle();
  changeInput(view.view().tree as ElementNode, 'data-mcp-edit-field', 'cwd', '/deploy');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-edit-save', 'docs');
  await view.settle();

  // ③ 官方 reconcile 推送含新条目批 → 停用 searcher：{op:set, enabled}——round 1 同形
  ctx.pushViews([connectedView('docs'), connectedView('searcher'),
    viewOf('loader', { state: 'failed', reason: 'load', lastError: 'spawn ENOENT' }), viewOf('sleeper', { state: 'disabled' })]);
  await view.settle();
  clickRowAction(view.view().tree as ElementNode, 'searcher', 'disable');
  await view.settle();

  // ④ 移除 searcher：{op:unset}——round 1 同形
  clickRowAction(view.view().tree as ElementNode, 'searcher', 'remove');
  await view.settle();

  // ⑤⑥ 重试/探测：mcpManager Remote 直调
  clickRowAction(view.view().tree as ElementNode, 'loader', 'retry');
  await view.settle();
  clickRowAction(view.view().tree as ElementNode, 'sleeper', 'probe');
  await view.settle();

  assert.deepEqual(ctx.captured.updateCalls, [
    { namespace: 'mcp', patch: { servers: { searcher: { transport: 'stdio', command: 'node' } } }, expectedRevision: 0 },
  ], 'UI 添加 = round 1 双入口同一写通道字面（ns=mcp、update 三参深合并形态——票 1dc4）');
  assert.deepEqual(ctx.captured.mutateCalls, [
    { namespace: 'mcp', ops: [{ op: 'set', path: ['servers', 'docs', 'cwd'], value: '/deploy' }], expectedRevision: 0 },
    { namespace: 'mcp', ops: [{ op: 'set', path: ['servers', 'searcher', 'enabled'], value: false }], expectedRevision: 0 },
    { namespace: 'mcp', ops: [{ op: 'unset', path: ['servers', 'searcher'] }], expectedRevision: 0 },
  ], 'UI 编辑/启停/移除 = round 1 双入口同一 ops 字面（SettingsPathOp 形态逐条同源；expectedRevision = 各次写前 describe 读值——票 1dc4 三参形态）');
  assert.deepEqual(ctx.captured.restartCalls, ['loader'], '重试 = restart Remote 单次');
  assert.deepEqual(ctx.captured.probeCalls, ['sleeper'], '探测 = probe Remote 单次');
  assert.deepEqual(ctx.captured.bypassCalls, [], '旁路哨兵零触碰（settings.replace / openSettingsDocument 未被任何 UI 动作调用——写通道单点，无旁路写路径）');
  view.unmount();
});

// ---- 拒绝/失败支路覆盖（评审 20261118-2fb3 阻断条目修复：refuseWrites / restartAnswer
// 两个替身旋钮接线——写面全部官方拒绝/失败分支的错误归宿：内联报错点名官方原因 +
// 零后续写副作用；「若回归把官方拒写误当成功，这些测试红」）----

test('官方拒写：添加提交被 {ok:false} 拒 → 内联报错点名官方原因、草稿保留、恰一次写尝试零后续写（写AC1 拒写支路）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('github')], { github: { transport: 'stdio' } });
  ctx.refuseWrites('官方校验器拒绝该条目');
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  const tree = view.view().tree as ElementNode;
  changeInput(tree, 'data-mcp-add-field', 'name', 'deployer');
  changeInput(tree, 'data-mcp-add-field', 'command', 'npx');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-add-submit', 'submit');
  await view.settle();

  assert.deepEqual(
    ctx.captured.updateCalls.map((call) => call.namespace),
    ['mcp'],
    '恰一次写尝试（官方拒写不触发重试/换通道 fallback 写）',
  );
  assert.deepEqual(ctx.captured.mutateCalls, [], '拒写零后续写副作用（不经 mutate 兜底）');
  const note = nodeWith(view.view().tree as ElementNode, 'data-mcp-add-note', 'note');
  const noteText = textOf(note);
  assert.match(noteText, /settings 写被拒/, '内联报错点名拒写通道（官方校验/revision 校验）');
  assert.match(noteText, /官方校验器拒绝该条目/, '官方 error.message 原样带出（不吞不加工）');
  const nameInput = nodeWith(view.view().tree as ElementNode, 'data-mcp-add-field', 'name');
  assert.equal(nameInput.props?.value, 'deployer', '拒写不清草稿——用户输入保留可修正重提');
  view.unmount();
});

test('restart 拒绝：failed 行重试被 {ok:false} 拒 → 内联报错点名 Remote 原因、零 settings 写（写AC4 restart 拒绝支路）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([viewOf('loader', { state: 'failed', reason: 'load', lastError: 'spawn ENOENT' })]);
  ctx.restartAnswer({ ok: false, error: { message: '远程端不可达' } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  clickRowAction(view.view().tree as ElementNode, 'loader', 'retry');
  await view.settle();

  assert.deepEqual(ctx.captured.restartCalls, ['loader'], '重试恰一次 Remote 调用');
  assert.deepEqual(ctx.captured.updateCalls, [], 'Remote 拒绝不落 settings 写');
  assert.deepEqual(ctx.captured.mutateCalls, [], 'Remote 拒绝不落 settings 写');
  const note = nodeWith(view.view().tree as ElementNode, 'data-mcp-write-note', 'note');
  const noteText = textOf(note);
  assert.match(noteText, /重试被拒/, '内联报错点名 restart Remote 拒绝');
  assert.match(noteText, /远程端不可达/, '官方 error.message 原样带出');
  view.unmount();
});

test('describe 被拒：打开编辑与保存均内联「当前配置不可读」点名官方原因、零写调用（写AC2 describe 失败支路）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('docs')], { docs: { transport: 'stdio', command: 'npx' } });
  ctx.describeAnswer({ ok: false, error: { message: '会话已过期' } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  // 打开编辑：openEdit 的 describe 被拒支路 → 行内注记点名
  clickRowAction(view.view().tree as ElementNode, 'docs', 'edit');
  await view.settle();
  const openNote = nodeWith(view.view().tree as ElementNode, 'data-mcp-edit-note', 'note');
  const openText = textOf(openNote);
  assert.match(openText, /当前配置不可读/, '打开编辑即内联报错（不吞 describe 拒绝）');
  assert.match(openText, /会话已过期/, '官方 error.message 原样带出');

  // 保存：editServer 的 describe 被拒支路（ops 基线读失败拒绝写）→ 同点名零写
  clickButton(view.view().tree as ElementNode, 'data-mcp-edit-save', 'docs');
  await view.settle();
  const saveNote = nodeWith(view.view().tree as ElementNode, 'data-mcp-edit-note', 'note');
  assert.match(textOf(saveNote), /当前配置不可读/, '保存路径同一守卫（describe 读失败不产写）');
  assert.deepEqual(ctx.captured.mutateCalls, [], 'describe 被拒零 mutate（diff 基线缺失即拒写）');
  assert.deepEqual(ctx.captured.updateCalls, [], 'describe 被拒零 update');
  view.unmount();
});

// ---- settings ns 口径（票 20261118-08f8）：面板写/读面 ns 与实际生效 manager 行 id 对齐 ----
// 期望值独立来源 = rc.4 一手探针（工票 Progress 留痕）：官方 settings write 以
// entry.options.id === ns 定位（dsh-settings lib/index.js write 一手），web 组合 ns =
// mcp-manager（dsh-web-app patch 一手），round 1 硬编码 mcp 在 web 组合全部被官方拒
// （settings/rejected: No configurable plugin entry "mcp"，6df0 真跑复现）。派生口径 =
// describe 视图 value.servers 在场的唯一 ns（manager Config 唯一 volatile 顶层字段、
// default 恒解析在场；rc.4 星座无第二 servers 域）；域不在场即拒绝写（fail loud 不猜测）。

test('web 组合 ns 对齐：describe 报 mcp-manager 域时，添加/编辑/启停/移除与 transport 列全部对齐 mcp-manager（票 08f8）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('docs')]);
  ctx.describeAnswer({
    ok: true,
    value: {
      // 两域 revision 故意不同值（3 vs 7）：写面 expectedRevision 断言钉死 = 写目标域
      // （mcp-manager）的视图 revision——证伪「任意视图 revision」或「2 参缺位」回归（票 1dc4）
      namespaces: [
        { ns: 'llm-deepseek', value: { model: 'deepseek-chat' }, revision: 3 },
        { ns: 'mcp-manager', value: { servers: { docs: { transport: 'stdio', command: 'npx', cwd: '/work' } } }, revision: 7 },
      ],
    },
  });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  // 读面：transport 列投影自 mcp-manager 域（ns 派生读路径）
  const transportCell = nodeWith(view.view().tree as ElementNode, 'data-mcp-server-transport', 'docs');
  assert.equal(textOf(transportCell), 'stdio', 'transport 列投影自派生出的 mcp-manager 域（非硬编码 ns）');

  // 添加：update ns = mcp-manager
  let tree = view.view().tree as ElementNode;
  changeInput(tree, 'data-mcp-add-field', 'name', 'searcher');
  changeInput(tree, 'data-mcp-add-field', 'command', 'node');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-add-submit', 'submit');
  await view.settle();
  assert.deepEqual(ctx.captured.updateCalls, [
    { namespace: 'mcp-manager', patch: { servers: { searcher: { transport: 'stdio', command: 'node' } } }, expectedRevision: 7 },
  ], '添加写通道 ns/expectedRevision = describe 派生的实际生效 manager 行 id 及其视图 revision（round 1 硬编码 mcp 在 web 组合被官方拒写——本测试即其回归面；票 1dc4 三参形态）');

  // 编辑：ops 基线读 mcp-manager 域、mutate ns = mcp-manager
  clickRowAction(view.view().tree as ElementNode, 'docs', 'edit');
  await view.settle();
  const envNode = nodeWith(view.view().tree as ElementNode, 'data-mcp-edit-field', 'cwd');
  assert.equal(envNode.props?.value, '/work', '编辑表单显示值读自 mcp-manager 域（读面同口径派生）');
  changeInput(view.view().tree as ElementNode, 'data-mcp-edit-field', 'cwd', '/deploy');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-edit-save', 'docs');
  await view.settle();

  // 启停/移除：mutate ns = mcp-manager
  clickRowAction(view.view().tree as ElementNode, 'docs', 'disable');
  await view.settle();
  clickRowAction(view.view().tree as ElementNode, 'docs', 'remove');
  await view.settle();

  assert.deepEqual(ctx.captured.mutateCalls, [
    { namespace: 'mcp-manager', ops: [{ op: 'set', path: ['servers', 'docs', 'cwd'], value: '/deploy' }], expectedRevision: 7 },
    { namespace: 'mcp-manager', ops: [{ op: 'set', path: ['servers', 'docs', 'enabled'], value: false }], expectedRevision: 7 },
    { namespace: 'mcp-manager', ops: [{ op: 'unset', path: ['servers', 'docs'] }], expectedRevision: 7 },
  ], '编辑/启停/移除三通道 ns 与 expectedRevision 全部 = mcp-manager 域视图 revision 7（写/读面与实际生效 manager 行 id 对齐；票 1dc4 三参形态）');
  view.unmount();
});

test('describe 无 servers 配置域（组合缺 manager 提供者）：添加与编辑拒绝并指明原因，零写调用（票 08f8 fail loud）', async () => {
  const harness = createHarness();
  const ctx = createClientStubContext([connectedView('docs')]);
  ctx.describeAnswer({ ok: true, value: { namespaces: [{ ns: 'llm-deepseek', value: { model: 'deepseek-chat' }, revision: 1 }] } });
  harness.apply(ctx);
  const view = harness.mountBody(ctx, new AbortController().signal);
  view.mount();
  await view.settle();

  // 添加：派生拒绝 → 内联报错点名，零写调用
  let tree = view.view().tree as ElementNode;
  changeInput(tree, 'data-mcp-add-field', 'name', 'deployer');
  changeInput(tree, 'data-mcp-add-field', 'command', 'npx');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-add-submit', 'submit');
  await view.settle();
  const addNote = nodeWith(view.view().tree as ElementNode, 'data-mcp-add-note', 'note');
  const addText = textOf(addNote);
  assert.match(addText, /servers 配置域/, '添加内联报错指明 servers 配置域未在场');
  assert.match(addText, /manager/i, '添加内联报错指明 manager 提供者缺位');
  assert.deepEqual(ctx.captured.updateCalls, [], '派生失败零 update（不猜测 ns）');
  assert.deepEqual(ctx.captured.mutateCalls, [], '派生失败零 mutate');

  // 编辑：保存路径同守卫 → 同拒绝零写
  clickRowAction(view.view().tree as ElementNode, 'docs', 'edit');
  await view.settle();
  clickButton(view.view().tree as ElementNode, 'data-mcp-edit-save', 'docs');
  await view.settle();
  const editNote = nodeWith(view.view().tree as ElementNode, 'data-mcp-edit-note', 'note');
  assert.match(textOf(editNote), /servers 配置域/, '编辑保存同一派生守卫');
  assert.deepEqual(ctx.captured.updateCalls, [], '编辑派生失败零 update');
  assert.deepEqual(ctx.captured.mutateCalls, [], '编辑派生失败零 mutate');
  view.unmount();
});
