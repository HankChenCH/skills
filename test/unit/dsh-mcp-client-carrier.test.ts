// dsh-mcp 客户端载体（spec 20261118-0de6 FR-7，票 20261118-7504）的外部可观察行为：
// prepack 客户端面编译产物 client.js 的 lazy-CJS factory 契约与发布面清单换载/还原。
// 契约期望值独立来源 = 官方 dsh-client-modules@0.2.2-rc.4 一手探针（票 Progress 留痕：
// lib/index.js bootInjections 的 queue facade 与 clientExportOf、lib/client.js 全部官方
// bundle 的注册形态、comboSearch 的 <包名>/client.js 资源名）：
//   - bundle 脚本执行只注册 factory：window.__ModuleLoader__.load({id, factory}) 进 pendingQueue；
//   - 物化 = factory(require) → module.exports（官方 create() 即此调用形态）；
//   - 注册 id = 包名（官方 register() 经 stripClientSuffix 归约出 owner，错名即错行）。
// 探针方案沿 plugin-prepack-diagnostics.test.ts 先例：插件目录副本置于包根（不在 agents/
// 枚举面内），typescript 经 createRequire 向上解析命中根 node_modules；prepack 真跑子进程，
// 不 mock 编译器、不 mock 文件系统；t.after 清理。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PLUGIN_DIR = path.join(packageRoot, 'agents', 'dsh', 'plugins', 'dsh-mcp');
const PLUGIN_NAME = '@hankchen/dsh-mcp';

// 探针副本清单：源码（Host 面 index.ts + 客户端面 client/）、清单、patch、两面编译脚本。
const PROBE_FILES = ['index.ts', 'package.json', 'cordis.patch.yml'];

function makeProbe(t: TestContext): string {
  const probe = path.join(packageRoot, `zz-carrier-probe-${process.pid}`);
  fs.mkdirSync(path.join(probe, 'scripts'), { recursive: true });
  fs.cpSync(path.join(PLUGIN_DIR, 'client'), path.join(probe, 'client'), { recursive: true });
  for (const file of PROBE_FILES) {
    fs.copyFileSync(path.join(PLUGIN_DIR, file), path.join(probe, file));
  }
  for (const script of fs.readdirSync(path.join(PLUGIN_DIR, 'scripts'))) {
    fs.copyFileSync(path.join(PLUGIN_DIR, 'scripts', script), path.join(probe, 'scripts', script));
  }
  // 依赖解析镜像真实插件目录：node_modules 以符号链接进探针（typescript 经 createRequire
  // 解析、@deepseek-ai/dsh-mcp-manager 类型解析同链路——Host 面编译的依赖面不变）
  fs.symlinkSync(path.join(PLUGIN_DIR, 'node_modules'), path.join(probe, 'node_modules'), 'dir');
  t.after(() => fs.rmSync(probe, { recursive: true, force: true }));
  return probe;
}

function runPrepack(probe: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [path.join(probe, 'scripts', 'prepack.ts')], {
    encoding: 'utf8',
  });
}

// 官方 queue facade 的逐字镜像（dsh-client-modules@0.2.2-rc.4 lib/index.js bootInjections
// 注入脚本：mode queue + load(registration){pendingQueue.push(registration)}）——bundle 执行
// 面的替身契约，来源注明在亡；不走真实 window。
interface CapturedRegistration {
  id: unknown;
  factory: unknown;
}

function executeBundleAsScript(bundlePath: string): CapturedRegistration[] {
  const registrations: CapturedRegistration[] = [];
  const pendingQueue: CapturedRegistration[] = [];
  const sandbox = {
    window: {
      __ModuleLoader__: {
        mode: 'queue',
        pendingQueue,
        load(registration: CapturedRegistration): void {
          pendingQueue.push(registration);
        },
      },
    },
  };
  vm.createContext(sandbox);
  const script = new vm.Script(fs.readFileSync(bundlePath, 'utf8'), { filename: 'client.js' });
  script.runInContext(sandbox);
  registrations.push(...pendingQueue);
  return registrations;
}

test('prepack 客户端面编译：client/index.ts → 包根 client.js（Host 面 index.js 同场双面编译）', (t) => {
  const probe = makeProbe(t);
  const result = runPrepack(probe);
  assert.equal(result.status, 0, `prepack 应成功，实际退出码 ${result.status}：${result.stderr}`);
  assert.ok(fs.existsSync(path.join(probe, 'client.js')), '客户端面产物 client.js 应落在包根（官方 combo 资源名约定）');
  assert.ok(fs.existsSync(path.join(probe, 'index.js')), 'Host 面产物 index.js 应同场编译（两面编译契约）');
});

test('client.js 是合法 lazy-CJS factory：脚本执行恰好注册一次，id = 包名，factory 可物化出插件模块面', (t) => {
  const probe = makeProbe(t);
  assert.equal(runPrepack(probe).status, 0);
  const registrations = executeBundleAsScript(path.join(probe, 'client.js'));
  assert.equal(
    registrations.length,
    1,
    `脚本执行应恰好注册一次（执行 bundle 只注册不物化——官方 lazy-CJS 模型），实际：${registrations.length} 次`,
  );
  const registration = registrations[0];
  assert.equal(registration.id, PLUGIN_NAME, '注册 id 须为包名（官方 register() 按 id 归 owner，错名即错行）');
  assert.equal(typeof registration.factory, 'function', 'factory 须为函数（官方 create() 以 factory(require) 物化）');
  // 物化契约：factory(require) → module.exports。官方 create() 给 bootstrap 传的 require 对
  // 任何外部请求即抛——载体最小入口零依赖，require 被调用即构建泄漏（镜像官方形态的证伪哨兵）。
  const materialized = (registration.factory as (require: (specifier: string) => unknown) => unknown)(
    (specifier) => {
      throw new Error(`官方物化哨兵：载体入口不应请求外部模块 "${specifier}"`);
    },
  );
  assert.ok(
    typeof materialized === 'object' && materialized !== null,
    `factory 应返回 module.exports 对象，实际：${String(materialized)}`,
  );
  assert.equal(
    typeof (materialized as { apply?: unknown }).apply,
    'function',
    '物化导出须含 apply（客户端模块 = cordis 插件模块面，官方 client-ui-* 形态）',
  );
});

test('client.js 无 .ts specifier 残留且无 ESM 语句（发布面 .js 形态契约在产物级成立）', (t) => {
  const probe = makeProbe(t);
  assert.equal(runPrepack(probe).status, 0);
  const bundle = fs.readFileSync(path.join(probe, 'client.js'), 'utf8');
  assert.doesNotMatch(bundle, /\bimport\s[\s"']/, 'bundle 不得含 ESM import 语句（classic script 执行即 SyntaxError）');
  assert.doesNotMatch(bundle, /\bexport\s+(?:const|let|var|function|default)\b/, 'bundle 不得含 ESM export 语句');
  assert.doesNotMatch(bundle, /from\s+['"][^'"]+\.ts['"]/, 'bundle 不得残留 .ts specifier（node_modules 下拒剥类型形态）');
});
