#!/usr/bin/env node
// 插件包发布面预编译（spec 20261115-ed9f 插件预编译契约，票 20261115-cf39；FR-7 证伪回退闭环）：
// node 对「物理路径位于 node_modules 之下」的 .ts 一律拒绝剥类型
// （ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING，官方有意设计、无旗标逃生），registry
// tarball 必须载可直跑 .js——证伪报告 docs/research/dsh-ts-loading/fr7-dsh-ts-loading-falsification.md
// （加载链五步定位 + 控制组唯一归因 + 回退方案真跑预验证）。
// 仓库源码态不变（main 直指 index.ts，零构建直跑与 link: 开发形态可用）；仅打包面两步：
//   1. tsc emit index.ts → 同路径 index.js（flags = FR-7 控制组实证组合）；
//   2. 打包清单换载发布态：备份 package.json → main: index.js、exports["."] → ./index.js、
//      files: [index.js, cordis.patch.yml, client.js]（不含 .ts 源码——spec 预编译契约明文）；
//      postpack 还原仓库树，.gitignore 兜底 pack 中途失败场景。
// 客户端面编译（spec 20261118-0de6 FR-7，票 20261118-7504）：client/index.ts → 包根 client.js，
// 形态 = 官方 lazy-CJS factory（一手来源 dsh-client-modules@0.2.2-rc.4 lib/client.js 全部官方
// bundle 逐字形态，探针留痕工票 Progress）：脚本执行只注册 factory——
//   window.__ModuleLoader__.load({id:'<包名>',factory:require=>{var module={exports:{}};
//   var exports=module.exports;<CJS 编译体>return module.exports}});
// 工具链 = 复用 typescript devDependency 的 compiler API（官方 tsdown preset 不随 npm 分发，
// 零新依赖纪律，选型留痕工票 Progress）；单入口文件（包单文件纪律，客户端面拆多文件须先扩
// 发布面为 bundling——本脚本对多文件产物 fail loud）。
// 钩子选 prepack：pnpm pack / pnpm publish 都会执行；prepublishOnly 不作用于 pack，
// 而发布契约锁「pack 产物即 .js 形态」。比照根包发布面预编译先例（scripts/prepack.ts，票 20261115-d437）。

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectStyleContractDefects } from './style-contract.ts';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(pluginRoot, 'index.ts');
const EMITTED = path.join(pluginRoot, 'index.js');
const CLIENT_SOURCE = path.join(pluginRoot, 'client', 'index.ts');
// react 类型镜像（client/react-runtime.d.ts ambient declare module 'react'）——客户端面
// import 'react' 的解析前提（react 不入仓库依赖，运行时经模块表 seed 表解析；票 20261118-1812）
const CLIENT_REACT_SHIM = path.join(pluginRoot, 'client', 'react-runtime.d.ts');
const CLIENT_EMITTED = path.join(pluginRoot, 'client.js');
const manifestPath = path.join(pluginRoot, 'package.json');
const manifestBackupPath = `${manifestPath}.prepack-bak`;

// 发布态 files 白名单（spec 预编译契约：files 含编译产物与 cordis.patch.yml、不含 .ts 源码；
// 票 20261118-7504 增客户端产物 client.js——官方 combo 路由资源名硬编码 <包名>/client.js）
const PUBLISHED_FILES = ['index.js', 'cordis.patch.yml', 'client.js'];

// ---- 客户端面编译（票 20261118-7504）：client/index.ts CJS emit → 官方 lazy-CJS factory shell 包装。
// 模块形态 CommonJS：factory 闭包内的编译体要的就是 CJS 语义（exports 赋值 + require 调用——
// 官方 bundle 编译体同形态，跨包依赖 require("react") 由模块表同步 require 解析）。
// emit 回调捕获产物不落盘中间文件；客户端面多文件产物 fail loud（单文件纪律，见文件头注）。----
function compileClientBundle(typescript: typeof import('typescript'), packageName: string): string {
  if (!fs.existsSync(CLIENT_SOURCE)) {
    console.error(`✗ prepack：客户端面入口缺失（${path.relative(pluginRoot, CLIENT_SOURCE)}）——package.json 已声明 dsh.client 与 exports["./client"]，声明无产物装进 profile 官方启动即抛（composition error），中止打包`);
    process.exit(1);
  }
  if (!fs.existsSync(CLIENT_REACT_SHIM)) {
    console.error(`✗ prepack：react 类型镜像缺失（${path.relative(pluginRoot, CLIENT_REACT_SHIM)}）——客户端面 import 'react' 无解析前提（react 不入仓库依赖，类型侧由该镜像声明），中止打包`);
    process.exit(1);
  }
  // shim（.d.ts）只参与模块解析不产 emit 产物——单文件 emit 检查不受影响
  const program = typescript.createProgram([CLIENT_SOURCE, CLIENT_REACT_SHIM], {
    target: typescript.ScriptTarget.ES2023,
    module: typescript.ModuleKind.CommonJS,
    moduleResolution: typescript.ModuleResolutionKind.Node10,
    skipLibCheck: true,
    noEmit: false,
    declaration: false,
    removeComments: true, // 浏览器载荷不携开发注释（官方 bundle 无注释形态）
  });
  const diagnostics = typescript
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.category === typescript.DiagnosticCategory.Error);
  if (diagnostics.length > 0) {
    console.error(`✗ prepack：客户端面编译诊断 ${diagnostics.length} 条，中止打包：`);
    for (const diagnostic of diagnostics) {
      const position = diagnostic.file
        ? `${path.relative(pluginRoot, diagnostic.file.fileName)}:${typescript.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start ?? 0).line + 1}`
        : '（无文件）';
      console.error(`  - ${position}：${typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
    }
    process.exit(1);
  }
  const outputs = new Map<string, string>();
  const emitResult = program.emit(undefined, (fileName, text) => {
    outputs.set(fileName, text);
  });
  const emitErrors = emitResult.diagnostics.filter(
    (diagnostic) => diagnostic.category === typescript.DiagnosticCategory.Error,
  );
  if (emitResult.emitSkipped || emitErrors.length > 0) {
    console.error(`✗ prepack：客户端面 emit 未完成（emitSkipped=${emitResult.emitSkipped}，emit 错误 ${emitErrors.length} 条），中止打包`);
    process.exit(1);
  }
  const entryOutput = outputs.get(CLIENT_SOURCE.replace(/\.ts$/, '.js'));
  if (entryOutput === undefined) {
    console.error(`✗ prepack：客户端面 emit 未产出入口编译体（${path.basename(CLIENT_SOURCE)} → .js），中止打包`);
    process.exit(1);
  }
  if (outputs.size > 1) {
    console.error(`✗ prepack：客户端面编译产出 ${outputs.size} 个文件（${[...outputs.keys()].map((file) => path.relative(pluginRoot, file)).join('、')}）——客户端面当前为单入口文件纪律，拆多文件须先扩发布面为 bundling，中止打包`);
    process.exit(1);
  }
  // 官方 lazy-CJS factory shell（dsh-client-modules@0.2.2-rc.4 lib/client.js 官方 bundle 逐字形态；
  // id 取包名——官方 register() 经 stripClientSuffix 按 id 归 owner，错名即错行）
  return `window.__ModuleLoader__.load({id:${JSON.stringify(packageName)},factory:require=>{` +
    `var module={exports:{}};var exports=module.exports;` +
    `${entryOutput}` +
    `return module.exports}});\n`;
}

// ---- 发布打包全流程（npm/pnpm prepack 生命周期钩子；被 import 时惰化不执行，见文件尾守卫）----
function runPrepack(): void {
  // ---- 幂等门（比照根包 scripts/prepack.ts）：tarball 解包目录重打包场景 typescript 不可
  // 解析 → 要求编译产物已在位且清单已换载，跳过编译；否则 fail loud（先 pnpm install）----
  let typescript: typeof import('typescript');
  try {
    typescript = createRequire(import.meta.url)('typescript');
  } catch (err) {
    // 留痕吞掉的原因（票 20261116-d30c）：typescript 缺失是幂等门的预期分支，但
    // node_modules 损坏等其它解析失败混同于此——一行 warn 说明走分支的真实原因
    console.warn(`• prepack：typescript 不可解析（${err instanceof Error ? err.message : String(err)}），按幂等门分支处置`);
    const published = fs.existsSync(EMITTED);
    const manifest: { main?: string } = published
      ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      : {};
    if (published && manifest.main === 'index.js' && fs.existsSync(CLIENT_EMITTED)) {
      console.log('• prepack：编译产物已在位（tarball 解包目录重打包场景），跳过编译');
      return;
    }
    console.error('✗ prepack：typescript 不可解析且发布态未就绪——先 pnpm install（devDependencies 含 typescript）');
    process.exit(1);
  }

  // ---- 编译：index.ts → index.js（同路径 emit；flags = FR-7 控制组实证组合，不改）----
  const program = typescript.createProgram([SOURCE], {
    target: typescript.ScriptTarget.ES2023,
    module: typescript.ModuleKind.NodeNext,
    moduleResolution: typescript.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
    noEmit: false,
    declaration: false,
  });
  const diagnostics = typescript
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.category === typescript.DiagnosticCategory.Error);
  if (diagnostics.length > 0) {
    console.error(`✗ prepack：编译诊断 ${diagnostics.length} 条，中止打包：`);
    for (const diagnostic of diagnostics) {
      // 诊断行带 file:line 定位（比照根包 scripts/prepack.ts 先例）：编译失败可直接定位坏行
      const position = diagnostic.file
        ? `${path.relative(pluginRoot, diagnostic.file.fileName)}:${typescript.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start ?? 0).line + 1}`
        : '（无文件）';
      console.error(`  - ${position}：${typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
    }
    process.exit(1);
  }
  const emitResult = program.emit();
  const emitErrors = emitResult.diagnostics.filter(
    (diagnostic) => diagnostic.category === typescript.DiagnosticCategory.Error,
  );
  if (emitResult.emitSkipped || emitErrors.length > 0) {
    console.error(`✗ prepack：emit 未完成（emitSkipped=${emitResult.emitSkipped}，emit 错误 ${emitErrors.length} 条），中止打包`);
    process.exit(1);
  }
  if (!fs.existsSync(EMITTED)) {
    console.error(`✗ prepack：emit 未产出 ${path.basename(EMITTED)}，中止打包`);
    process.exit(1);
  }

  // ---- 客户端面编译：client/index.ts → 包根 client.js（lazy-CJS factory 形态，票 20261118-7504）----
  const sourceManifest: { name?: string } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (typeof sourceManifest.name !== 'string' || sourceManifest.name === '') {
    console.error('✗ prepack：package.json 缺 name——客户端 bundle 注册 id 无从取值（官方按 id 归 owner），中止打包');
    process.exit(1);
  }
  const clientBundle = compileClientBundle(typescript, sourceManifest.name);
  // 样式契约门（spec 20261118-8a57 FR-7，票 20261118-eb6a；design 0004 述标实现校验点）：
  // 产物零 hex 直值色、零写死 font-family——缺陷即中止打包（fail loud，比照编译诊断门先例）
  const styleDefects = collectStyleContractDefects(clientBundle);
  if (styleDefects.length > 0) {
    console.error(`✗ prepack：客户端产物样式契约 ${styleDefects.length} 条缺陷，中止打包（design 0004 契约：取色全走 var(--dsw-alias-*) token、字体族只许 var() 引用）：`);
    for (const defect of styleDefects) {
      console.error(`  - [${defect.rule}] ${defect.snippet}`);
    }
    process.exit(1);
  }
  fs.writeFileSync(CLIENT_EMITTED, clientBundle);
  console.log('✓ prepack：客户端面编译完成（client/index.ts → client.js，lazy-CJS factory 形态，样式契约通过）');

  // ---- 清单换载：打包清单 main/exports/files 直指发布态（备份 → 改写；postpack 用备份还原
  // 仓库树）。exports["."] 与 main 同步换载：exports 字段存在即约束包根解析（Node 语义），
  // 发布态 "." 指 index.ts 而包内只有 index.js = 悬空导出（票 20261118-7504）；"./client" 两态
  // 同指 ./client.js（客户端 bundle 无 .ts 形态，浏览器不可剥类型——不存在换载问题）。
  // 幂等守卫：上次 pack 中途失败残留的备份先还原，再基于还原后的原态改写，避免叠改。----
  if (fs.existsSync(manifestBackupPath)) {
    fs.copyFileSync(manifestBackupPath, manifestPath);
    fs.rmSync(manifestBackupPath);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const exportsSwapped =
    typeof manifest.exports === 'object' && manifest.exports !== null && manifest.exports['.'] === './index.js';
  if (
    manifest.main !== 'index.js'
    || !exportsSwapped
    || JSON.stringify(manifest.files) !== JSON.stringify(PUBLISHED_FILES)
  ) {
    fs.copyFileSync(manifestPath, manifestBackupPath);
    manifest.main = 'index.js';
    manifest.exports['.'] = './index.js';
    manifest.files = PUBLISHED_FILES;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log('✓ prepack：打包清单已换载发布态（main 与 exports["."] → index.js，files → 两面编译产物 + cordis.patch.yml）');
  }
  console.log('✓ prepack：发布面编译完成（index.ts → index.js，client/index.ts → client.js）');
}

// ---- 直跑守卫：pnpm/npm prepack 生命周期钩子（node scripts/prepack.ts）真实执行；
// 被 import 时惰化——与根包 scripts/prepack.ts 同机制。----
const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === thisFile;
if (invokedDirectly) runPrepack();
