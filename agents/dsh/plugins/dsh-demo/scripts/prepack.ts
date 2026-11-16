#!/usr/bin/env node
// 插件包发布面预编译（spec 20261115-ed9f 插件预编译契约，票 20261115-cf39；FR-7 证伪回退闭环）：
// node 对「物理路径位于 node_modules 之下」的 .ts 一律拒绝剥类型
// （ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING，官方有意设计、无旗标逃生），registry
// tarball 必须载可直跑 .js——证伪报告 docs/research/dsh-ts-loading/fr7-dsh-ts-loading-falsification.md
// （加载链五步定位 + 控制组唯一归因 + 回退方案真跑预验证）。
// 仓库源码态不变（main 直指 index.ts，零构建直跑与 link: 开发形态可用）；仅打包面两步：
//   1. tsc emit index.ts → 同路径 index.js（flags = FR-7 控制组实证组合）；
//   2. 打包清单换载发布态：备份 package.json → main: index.js、files: [index.js,
//      cordis.patch.yml]（不含 .ts 源码——spec 预编译契约明文）；postpack 还原仓库树，
//      .gitignore 兜底 pack 中途失败场景。
// 钩子选 prepack：pnpm pack / pnpm publish 都会执行；prepublishOnly 不作用于 pack，
// 而发布契约锁「pack 产物即 .js 形态」。比照根包发布面预编译先例（scripts/prepack.ts，票 20261115-d437）。

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(pluginRoot, 'index.ts');
const EMITTED = path.join(pluginRoot, 'index.js');
const manifestPath = path.join(pluginRoot, 'package.json');
const manifestBackupPath = `${manifestPath}.prepack-bak`;

// 发布态 files 白名单（spec 预编译契约：files 含编译产物与 cordis.patch.yml、不含 .ts 源码）
const PUBLISHED_FILES = ['index.js', 'cordis.patch.yml'];

// ---- 发布打包全流程（npm/pnpm prepack 生命周期钩子；被 import 时惰化不执行，见文件尾守卫）----
function runPrepack(): void {
  // ---- 幂等门（比照根包 scripts/prepack.ts）：tarball 解包目录重打包场景 typescript 不可
  // 解析 → 要求编译产物已在位且清单已换载，跳过编译；否则 fail loud（先 pnpm install）----
  let typescript: typeof import('typescript');
  try {
    typescript = createRequire(import.meta.url)('typescript');
  } catch {
    const published = fs.existsSync(EMITTED);
    const manifest: { main?: string } = published
      ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      : {};
    if (published && manifest.main === 'index.js') {
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

  // ---- 清单换载：打包清单 main/files 直指发布态（备份 → 改写；postpack 用备份还原仓库树）。
  // 幂等守卫：上次 pack 中途失败残留的备份先还原，再基于还原后的原态改写，避免叠改。----
  if (fs.existsSync(manifestBackupPath)) {
    fs.copyFileSync(manifestBackupPath, manifestPath);
    fs.rmSync(manifestBackupPath);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.main !== 'index.js' || JSON.stringify(manifest.files) !== JSON.stringify(PUBLISHED_FILES)) {
    fs.copyFileSync(manifestPath, manifestBackupPath);
    manifest.main = 'index.js';
    manifest.files = PUBLISHED_FILES;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log('✓ prepack：打包清单已换载发布态（main → index.js，files → 编译产物 + cordis.patch.yml）');
  }
  console.log('✓ prepack：发布面编译完成（index.ts → index.js）');
}

// ---- 直跑守卫：pnpm/npm prepack 生命周期钩子（node scripts/prepack.ts）真实执行；
// 被 import 时惰化——与根包 scripts/prepack.ts 同机制。----
const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === thisFile;
if (invokedDirectly) runPrepack();
