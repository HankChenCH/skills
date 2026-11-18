// dsh-mcp guide 入口描述文案契约测试（票 20261118-d63d，验收 63b1 瑕疵回归面）：
// guide 入口描述自称「（只读）」与面板实际管理能力（添加/启停/编辑/移除，round 1 起）不符——
// 文案层面误导使用者。被测源码 = agents/dsh/plugins/dsh-mcp/client/index.ts 的 tab 类型定义
// guide 盒（vm 物化 + apply 到替身 ctx 后取定义，dock-readonly 测试同款替身形态的收窄子集）；
// 期望值独立来源 = 面板交付面的管理能力清单（acceptance 20261118-63b1 走查行 5 实证全操作可用）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CLIENT_SOURCE = path.join(PACKAGE_ROOT, 'agents', 'dsh', 'plugins', 'dsh-mcp', 'client', 'index.ts');

interface GuideEntry {
  title: () => string;
  description?: () => string;
}

interface CapturedDefinition {
  guide?: readonly GuideEntry[];
}

/** 物化客户端模块并 apply 到最小替身 ctx，返回捕获的 tab 类型定义（本测试只消费 guide 盒）。 */
function capturedTabDefinition(): CapturedDefinition {
  const source = fs.readFileSync(CLIENT_SOURCE, 'utf8');
  const body = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const queue: Array<{ factory: (require: (s: string) => unknown) => unknown }> = [];
  const captured: { definitions: CapturedDefinition[] } = { definitions: [] };
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(registration: { factory: (require: (s: string) => unknown) => unknown }): void {
          queue.push(registration);
        },
      },
    },
  };
  const ctx = {
    effect(fn: () => unknown): unknown {
      return fn();
    },
    sidebarRightTabs: {
      register(definition: CapturedDefinition): () => void {
        captured.definitions.push(definition);
        return () => undefined;
      },
    },
    slots: {
      inject(_name: string, factory: () => unknown): unknown {
        return factory();
      },
      register: () => undefined,
    },
    remote: {
      mcpManager: {
        watch: () => {
          throw new Error('guide 契约测试不触碰 watch');
        },
      },
    },
  };
  const reactStub = {
    createElement: () => undefined,
    useState: () => [undefined, () => undefined],
    useEffect: () => undefined,
    useCallback: (fn: unknown) => fn,
  };
  vm.runInNewContext(
    `window.__ModuleLoader__.load({id:'probe',factory:require=>{var module={exports:{}};var exports=module.exports;${body}return module.exports}});`,
    sandbox,
  );
  const exportsObject = queue[0].factory(() => reactStub) as { apply: (c: unknown) => void };
  exportsObject.apply(ctx);
  assert.equal(captured.definitions.length, 1, 'apply 恰注册一个 tab 类型定义（官方注册面契约）');
  return captured.definitions[0];
}

test('guide 入口描述与面板管理能力一致：不再自称「只读」且带管理动作语义（票 20261118-d63d）', () => {
  const definition = capturedTabDefinition();
  const entry = definition.guide?.[0];
  assert.ok(entry !== undefined, 'guide 盒在场（round 1 契约不回归）');
  assert.ok(entry.title().length > 0, 'guide title 非空（既有契约不回归）');
  const description = entry.description?.() ?? '';
  assert.ok(description.length > 0, 'guide description 非空（既有契约不回归）');
  assert.doesNotMatch(description, /只读/, '描述不得自称只读（面板自 round 1 起具全管理能力——63b1 瑕疵根因文案）');
  assert.match(
    description,
    /管理|添加|启停|编辑|移除/,
    '描述带管理动作语义（使用方可据此预期面板能力：添加/启停/编辑/移除）',
  );
});
