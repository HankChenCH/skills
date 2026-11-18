// dsh-mcp 客户端产物样式契约测试（spec 20261118-8a57 FR-7 工单级，票 20261118-eb6a）。
// 被测契约（design 0004 述标 approved 实现校验点）：client 产物内零 `#[0-9a-f]{3,6}` 直值色、
// 零 `font-family:` 写死——取色全走 var(--dsw-alias-*) token（浅色/深色主题自动随宿主）。
// 断言面 = prepack 同形态编译产物（CommonJS + ES2023 + removeComments）——spec「断言面只扫
// 产出代码」：注释不进断言面，token 快照演示注释天然豁免（编译即剥离）。
// 发布门（fail loud）：样式契约缺陷令插件 prepack 中止打包退出 1（探针形态 =
// plugin-prepack-diagnostics.test.ts 先例：插件目录副本置于包根 agents/ 枚举面外，零副作用）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { collectStyleContractDefects } from '../../agents/dsh/plugins/dsh-mcp/scripts/style-contract.ts';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PLUGIN_ROOT = path.join(PACKAGE_ROOT, 'agents', 'dsh', 'plugins', 'dsh-mcp');
const CLIENT_SOURCE = path.join(PLUGIN_ROOT, 'client', 'index.ts');
const CLIENT_REACT_SHIM = path.join(PLUGIN_ROOT, 'client', 'react-runtime.d.ts');

/** client/index.ts 的编译产物文本（与 prepack compileClientBundle 同编译形态：CJS + ES2023 + 剥注释）。 */
function compileClientProduct(): string {
  const source = fs.readFileSync(CLIENT_SOURCE, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.CommonJS,
      removeComments: true,
    },
  });
  return result.outputText;
}

// ---- 扫描器公开接口的拒绝/放行形态（样式契约门的证伪形态常驻：扫描器烂成恒过即在此红）----

test('样式契约扫描器：hex 直值与写死 font-family 各报一条缺陷、token 消费零缺陷（FR-7 拒绝形态）', () => {
  const hexDefects = collectStyleContractDefects('color: #0f1115; border: 1px solid #fff');
  assert.equal(hexDefects.length, 2, '两个 hex 直值各报一条（#0f1115 6 位、#fff 3 位都在契约面）');
  assert.deepEqual(
    hexDefects.map((defect) => defect.rule),
    ['hex-color', 'hex-color'],
    '缺陷规则名 = hex-color',
  );
  assert.match(hexDefects[0].snippet, /#0f1115/, '缺陷 snippet 带原值上下文，可定位');

  const fontDefects = collectStyleContractDefects('font-family: ui-monospace, monospace');
  assert.equal(fontDefects.length, 1, '字面字体族 = 写死，报缺陷');
  assert.equal(fontDefects[0].rule, 'font-family', '缺陷规则名 = font-family');

  const tokenized = collectStyleContractDefects(
    'color: var(--dsw-alias-label-primary); ' +
      'background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); ' +
      'font-family: var(--ds-font-family-code); ' +
      'border-radius: var(--dsw-radius-md);',
  );
  assert.deepEqual(tokenized, [], 'token 化取色 + var() 字体引用 + token 圆角 = 零缺陷（契约放行形态）');
});

// ---- client 产物契约（spec FR-7：断言面 = 产物代码）----

test('client 产物零 hex 直值色、零写死 font-family：prepack 同形态编译产物全扫通过（FR-7）', () => {
  const product = compileClientProduct();
  const defects = collectStyleContractDefects(product);
  const hexDefects = defects.filter((defect) => defect.rule === 'hex-color');
  assert.deepEqual(
    hexDefects.map((defect) => defect.snippet),
    [],
    '产物内零 #[0-9a-f]{3,6} 直值色（取色全走 var(--dsw-alias-*)）——出现即样式层回退成裸样式',
  );
  const fontDefects = defects.filter((defect) => defect.rule === 'font-family');
  assert.deepEqual(
    fontDefects.map((defect) => defect.snippet),
    [],
    '产物内零写死 font-family（字体族只许 var() token 引用——继承宿主 text/code 用户设置）',
  );
});

test('client 产物含 token 化样式层：面板样式类与四态徽章 token 随产物编译在盘（FR-8 client bundle 含样式层证据）', () => {
  const product = compileClientProduct();
  assert.match(product, /dsh-mcp-panel/, '面板根样式类在产物中（样式层非空壳）');
  assert.ok(
    (product.match(/--dsw-alias-/g) ?? []).length >= 10,
    `取色经 --dsw-alias-* token 的消费点须成规模（实况 ≥10 处），实际 ${String((product.match(/--dsw-alias-/g) ?? []).length)}`,
  );
  assert.match(product, /--dsw-alias-state-success-primary/, 'connected 徽章 success token（四态可辨识之一）');
  assert.match(product, /--dsw-alias-state-error-primary/, 'failed 徽章/异常提示条 error token');
  assert.match(product, /--dsw-alias-state-warn-primary/, 'waiting-credentials 徽章 warn token');
  assert.match(product, /--ds-font-family-code/, '等宽线索块引用宿主 code 字体用户设置（不写死字体族）');
});

test('深色主题按钮文字配对与 pill 兜底（验收 63b1 rejected 回归面，票 20261118-d63d）', () => {
  const product = compileClientProduct();
  assert.match(
    product,
    /color:var\(--dsw-alias-label-primary-foreground\)/,
    'primary 底按钮文字 = label-primary-foreground（浅 bluish-00 白 / 深 bluish-1000 黑随主题翻转——rc.5 官方组件 primary-fill 配对先例），深色下白底黑字可读',
  );
  assert.doesNotMatch(
    product,
    /label-on-color/,
    '零 label-on-color 消费（恒白 bluish-00 不随主题翻转，深色下与翻转浅底 ≈1:1——63b1 硬伤根因，零残留即防回归）',
  );
  assert.match(
    product,
    /border-radius:var\(--dsw-radius-pill,999px\)/,
    '徽章 pill 引用带直值兜底（宿主 rc.5 主题未分发 --dsw-radius-pill，无兜底解析为直角——63b1 瑕疵根因）',
  );
});

// ---- prepack 发布门（fail loud：违规产物中止打包；门不误伤 token 化产物）----
// 探针形态（plugin-prepack-diagnostics.test.ts 先例）：插件目录副本置于包根（不在 agents/
// 枚举面内），node_modules 以目录符号链接接回真身（Host 面 @deepseek-ai/dsh-mcp-manager
// 类型解析前提；探针目录随 t.after 清理，符号链接只摘链不递归真身）。

const PROBE_FILES = [
  'index.ts',
  'package.json',
  'cordis.patch.yml',
  path.join('client', 'index.ts'),
  path.join('client', 'react-runtime.d.ts'),
  path.join('scripts', 'prepack.ts'),
  path.join('scripts', 'style-contract.ts'),
];

function makeProbeCopy(t: import('node:test').TestContext, suffix: string): string {
  const probe = path.join(PACKAGE_ROOT, `zz-style-probe-${suffix}-${process.pid}`);
  fs.mkdirSync(path.join(probe, 'client'), { recursive: true });
  fs.mkdirSync(path.join(probe, 'scripts'), { recursive: true });
  for (const file of PROBE_FILES) {
    fs.copyFileSync(path.join(PLUGIN_ROOT, file), path.join(probe, file));
  }
  fs.symlinkSync(path.join(PLUGIN_ROOT, 'node_modules'), path.join(probe, 'node_modules'), 'dir');
  t.after(() => fs.rmSync(probe, { recursive: true, force: true }));
  return probe;
}

test('prepack 样式契约门：产物注入 hex 直值即中止打包退出 1 并点名样式契约（fail loud 发布门）', (t) => {
  const probe = makeProbeCopy(t, 'violate');
  const clientSource = fs.readFileSync(path.join(probe, 'client', 'index.ts'), 'utf8');
  fs.writeFileSync(
    path.join(probe, 'client', 'index.ts'),
    `${clientSource}\nconst styleContractProbe = '#0f1115';\n`,
  );

  const result = spawnSync(process.execPath, [path.join(probe, 'scripts', 'prepack.ts')], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 1, `样式契约违规应中止打包退出 1，实际 ${String(result.status)}`);
  assert.match(result.stderr, /样式契约/, 'stderr 点名样式契约（维护者一眼知因）');
  assert.match(result.stderr, /#0f1115/, '缺陷 snippet 原值在 stderr（可定位）');
  // 契约失败先于清单换载：探针 package.json 保持源码态
  const probeManifest = JSON.parse(fs.readFileSync(path.join(probe, 'package.json'), 'utf8')) as { main?: string };
  assert.equal(probeManifest.main, 'index.ts', '契约中止不得污染打包清单');
});

test('prepack 样式契约门放行 token 化产物：干净副本打包成功且 client 产物在盘（门不误伤）', (t) => {
  const probe = makeProbeCopy(t, 'clean');

  const result = spawnSync(process.execPath, [path.join(probe, 'scripts', 'prepack.ts')], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `token 化产物应放行打包，实际 ${String(result.status)}：${result.stderr}`);
  assert.equal(fs.existsSync(path.join(probe, 'client.js')), true, '客户端产物 client.js 已编译在盘（发布态）');
  assert.match(
    fs.readFileSync(path.join(probe, 'client.js'), 'utf8'),
    /dsh-mcp-panel/,
    '样式层随 client 产物编译入盘（FR-7 样式层随产物入 tarball 的打包面前置证据）',
  );
});
