#!/usr/bin/env node
// 发布面预编译（spec 20261115-f650 拍板 D8 运行中修订，票 20261115-d437）：仓库内零构建直跑
// 不变，仅发布面在打包前把 src/ 与 bin/ 的 .ts 编译为同路径 .js 进 tarball——node 对
// node_modules 下 .ts 一律拒绝剥类型（ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING，官方有
// 意设计、无旗标逃生），npm install / npx 消费路径全命中，故 tarball 必须含可直跑 .js。
// tarball 形态：bin/infra.js（编译产物；打包清单 bin 由本脚本显式换载直指它——备份
// package.json → 改写 bin: bin/infra.js，postpack 还原）+ src/*.js +
// 全部 .ts 源码（导航可读）；skills/agents 清单与路径不变。
// 幂等门：tarball 解包目录重打包（install.test.js [FR-5] 双版本消费链）无 devDependencies
// 且编译产物已随包在位 → 跳过编译；否则 typescript 编译 + 错误诊断（非零即中止打包）。
// 发出物 specifier 改写：源码间导入用显式 .ts 扩展名（仓内剥类型直跑所需），编译 .js 中的
// 相对 .ts specifier 一律改写为 .js（NodeNext 形态，tsc emit 保留原 specifier 故需后处理）。
// 仓库树常态零构建直跑：postpack 清理发出物；.gitignore 兜底 pack 中途失败不入 git。

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments } from './verify-bundle.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_DIRS = ['src', 'bin'];

// 残留相对 .ts specifier 收集（出口把关的判定单点，可独立测试——票 20261115-e692，d437 评审
// 20261115-4293 延后项）：在剥注释后的源码上匹配引号字符串里以 ./ 或 ../ 开头、.ts 结尾的
// 导入说明符。emit 未设 removeComments、注释字样不得触发把关；模板串不是合法导入说明符
// 形态，不在匹配面。改写步骤只覆盖 from 与动态 import 两形，本把关对一切形态兜底。
export function collectResidualTsSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const match of stripComments(source).matchAll(/(['"])(\.\.?\/[^'"\n]*\.ts)\1/g)) {
    specifiers.push(match[2]!);
  }
  return specifiers;
}

// ---- workspace 成员依赖目录暂存（票 20261115-cf39）----
// 背景：插件包 devDependencies 自持工具链（FR-7 预编译契约，spec 20261115-ed9f 明文）后，
// pnpm install 在 agents/*/plugins/*/ 成员目录落盘 node_modules。根 files 白名单卷 agents/
// 整树，pack 会把成员依赖目录连同符号链接一起卷入包（RQ2 异常流 A #3 的卷入通道——
// RQ2 缓解前提「成员零运行时依赖」被 FR-7 契约打破），verify:pack 查 1.5（包内禁
// node_modules）会正确拒绝，发布流与 CI verify 步骤随之红。
// 处置比照本文件清单换载先例：pack 前把成员 node_modules 移到根 .prepack-stash/
//（.gitignore 兜底），postpack 原位还原；幂等守卫：上次 pack 中途失败残留的暂存先
// 还原再重新暂存，不叠改。查 1.5 守卫本体不动（它继续拦真坏包）。
const STASH_DIR = path.join(packageRoot, '.prepack-stash');

// 枚举 agents/<宿主>/plugins/<插件目录>/node_modules 的现存成员依赖目录
function collectMemberNodeModules(): string[] {
  const agentsDir = path.join(packageRoot, 'agents');
  if (!fs.existsSync(agentsDir)) return [];
  const found: string[] = [];
  for (const host of fs.readdirSync(agentsDir, { withFileTypes: true })) {
    if (!host.isDirectory()) continue;
    const pluginsDir = path.join(agentsDir, host.name, 'plugins');
    if (!fs.existsSync(pluginsDir)) continue;
    for (const plugin of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
      if (!plugin.isDirectory()) continue;
      const nodeModules = path.join(pluginsDir, plugin.name, 'node_modules');
      if (fs.existsSync(nodeModules)) found.push(nodeModules);
    }
  }
  return found.sort();
}

// 暂存键 = 仓库相对路径的 / → __ 编码（单层 stash 目录，还原时解码回原位）
const stashKeyOf = (absPath: string): string => path.relative(packageRoot, absPath).split(path.sep).join('__');

export function restoreStashedNodeModules(): number {
  if (!fs.existsSync(STASH_DIR)) return 0;
  let restored = 0;
  for (const entry of fs.readdirSync(STASH_DIR)) {
    const dest = path.join(packageRoot, ...entry.split('__'));
    fs.renameSync(path.join(STASH_DIR, entry), dest);
    restored += 1;
  }
  fs.rmdirSync(STASH_DIR);
  return restored;
}

function stashMemberNodeModules(): number {
  // 幂等守卫：上次 pack 中途失败残留的暂存先还原，再基于仓库原态重新暂存
  restoreStashedNodeModules();
  const members = collectMemberNodeModules();
  fs.mkdirSync(STASH_DIR, { recursive: true });
  for (const member of members) {
    fs.renameSync(member, path.join(STASH_DIR, stashKeyOf(member)));
  }
  return members.length;
}

function collectFiles(root: string, extension: string): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (full.endsWith(extension)) {
        files.push(full);
      }
    }
  };
  walk(root);
  return files.sort();
}

// 发出物路径 = 源文件同路径换 .js 后缀（无 outDir 同路径 emit）
const emittedJsPaths = (tsPaths: string[]): string[] =>
  tsPaths.map((file) => file.replace(/\.ts$/, '.js'));

// ---- 发布打包全流程（npm prepack 生命周期钩子；被测试 import 时惰化不执行，见文件尾守卫）----
function runPrepack(): void {
  // ---- 幂等门：无 typescript 可解析（tarball 解包目录重打包）→ 要求编译产物已在位并跳过 ----
  let typescript: typeof import('typescript');
  try {
    typescript = createRequire(import.meta.url)('typescript');
  } catch {
    const emitted = collectFiles(path.join(packageRoot, 'src'), '.js');
    const binJsExists = fs.existsSync(path.join(packageRoot, 'bin', 'infra.js'));
    if (!binJsExists || emitted.length === 0) {
      console.error('✗ prepack：typescript 不可解析且编译产物缺失——发布打包前先 pnpm install（devDependencies 含 typescript）');
      process.exit(1);
    }
    console.log('• prepack：编译产物已在位（tarball 解包目录重打包场景），跳过编译');
    process.exit(0);
  }

  // ---- 成员依赖目录暂存：根包打包面不卷 agents/ 下成员 node_modules（查 1.5 前置）----
  const stashed = stashMemberNodeModules();
  if (stashed > 0) {
    console.log(`✓ prepack：成员依赖目录已暂存（${stashed} 处 node_modules，postpack 原位还原）`);
  }

  // ---- 编译：src/ + bin/ 同路径 emit（无 outDir；rootDir 取输入公共根 = 包根）----
  // allowImportingTsExtensions 与 emit 在 config 层互斥（诊断 5096），此处经 compiler API 显式
  // 组合并过滤该已知配置码一条——源码形态 = .ts specifier（仓内剥类型直跑所需），发出物由
  // 下方改写步骤统一翻成 .js。其余全部错误诊断照常拦门，不静默。
  const fileNames = BUILD_DIRS.flatMap((rel) => collectFiles(path.join(packageRoot, rel), '.ts'));
  const program = typescript.createProgram(fileNames, {
    target: typescript.ScriptTarget.ES2023,
    module: typescript.ModuleKind.NodeNext,
    moduleResolution: typescript.ModuleResolutionKind.NodeNext,
    strict: true,
    useUnknownInCatchVariables: false,
    erasableSyntaxOnly: true,
    skipLibCheck: true,
    allowImportingTsExtensions: true,
    noEmit: false,
    declaration: false,
  });

  const diagnostics = typescript
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) =>
        diagnostic.category === typescript.DiagnosticCategory.Error && diagnostic.code !== 5096,
    );
  if (diagnostics.length > 0) {
    console.error(`✗ prepack：编译诊断 ${diagnostics.length} 条，中止打包：`);
    for (const diagnostic of diagnostics) {
      const position = diagnostic.file
        ? `${path.relative(packageRoot, diagnostic.file.fileName)}:${typescript.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start ?? 0).line + 1}`
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
    for (const diagnostic of emitErrors) {
      console.error(`  - ${typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
    }
    process.exit(1);
  }

  // ---- 发出物 specifier 改写：相对 .ts → .js（仅 import/export ... from 与动态 import 的字面量）----
  const SPECIFIER_TS = /(\bfrom\s*(['"])(\.\.?\/[^'"]*))\.ts(\2)/g;
  const DYNAMIC_IMPORT_TS = /(\bimport\s*\(\s*(['"])(\.\.?\/[^'"]*))\.ts(\2)/g;
  let rewrittenFiles = 0;
  for (const jsPath of emittedJsPaths(fileNames)) {
    const before = fs.readFileSync(jsPath, 'utf8');
    const after = before.replace(SPECIFIER_TS, '$1.js$4').replace(DYNAMIC_IMPORT_TS, '$1.js$4');
    if (after !== before) {
      fs.writeFileSync(jsPath, after);
      rewrittenFiles += 1;
    }
  }

  // ---- 出口把关：emit 产物残留相对 .ts specifier 即逐条列出中止打包（d437 评审延后项）----
  // 改写只覆盖 from/动态 import 两形；未覆盖形态（裸副作用 import '…' 等）若残留，安装消费
  // 链在 node_modules 下命中 node 拒剥类型（ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING）。
  const residuals: string[] = [];
  for (const jsPath of emittedJsPaths(fileNames)) {
    for (const specifier of collectResidualTsSpecifiers(fs.readFileSync(jsPath, 'utf8'))) {
      residuals.push(`${path.relative(packageRoot, jsPath)}：${specifier}`);
    }
  }
  if (residuals.length > 0) {
    console.error(`✗ prepack：emit 产物残留相对 .ts specifier ${residuals.length} 处——安装消费链会在 node_modules 下命中 node 拒剥类型，中止打包：`);
    for (const line of residuals) {
      console.error(`  - ${line}`);
    }
    process.exit(1);
  }

  // ---- 出口把关：bin 编译产物必须保住 shebang（npx / .bin 直跑形态依赖它）----
  const binJs = fs.readFileSync(path.join(packageRoot, 'bin', 'infra.js'), 'utf8');
  if (!binJs.startsWith('#!')) {
    console.error('✗ prepack：bin/infra.js 丢失 shebang——npx/.bin 直跑形态会坏，中止打包');
    process.exit(1);
  }

  console.log(
    `✓ prepack：发布面编译完成（${fileNames.length} 个 .ts → 同路径 .js；specifier 改写 ${rewrittenFiles} 个文件）`,
  );

  // ---- manifest 换载：打包清单的 bin 直指编译产物 bin/infra.js ----
  // publishConfig.bin 不作用于 npm pack 的打包清单（实测：打包后 manifest bin 仍为源码形态），
  // 故由本脚本显式换载：备份原 package.json → 写入换载后清单；postpack 用备份还原仓库树。
  // 幂等守卫：上次 pack 中途失败残留的备份先还原，再基于还原后的原态改写，避免叠改。
  const manifestPath = path.join(packageRoot, 'package.json');
  const manifestBackupPath = `${manifestPath}.prepack-bak`;
  if (fs.existsSync(manifestBackupPath)) {
    fs.copyFileSync(manifestBackupPath, manifestPath);
    fs.rmSync(manifestBackupPath);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.bin?.infra !== 'bin/infra.js') {
    fs.copyFileSync(manifestPath, manifestBackupPath);
    manifest.bin = { ...(manifest.bin ?? {}), infra: 'bin/infra.js' };
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log('✓ prepack：打包清单 bin 已换载 → bin/infra.js（postpack 还原仓库原态）');
  }
}

// ---- 直跑守卫：npm prepack 生命周期钩子（node scripts/prepack.ts）真实执行；
// 被测试 import 时惰化——出口把关函数可独立单测（同 scripts/verify-bundle.ts 的机制）。
const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === thisFile;
if (invokedDirectly) runPrepack();
