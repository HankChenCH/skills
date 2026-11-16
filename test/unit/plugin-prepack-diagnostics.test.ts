// 插件包 prepack 编译诊断的外部可观察行为（seam 落点：scripts/prepack.ts 子进程 stderr）。
// 票 20261116-d30c：诊断行须带 file:line 定位（比照根包 scripts/prepack.ts 先例），
// 编译失败时维护者能直接定位坏文件坏行，不必逐文件自查。
// 探针方案：插件目录副本置于包根（不在 agents/ 枚举面内），typescript 经
// createRequire 向上解析命中根 node_modules——副本内注入类型错误即得真实诊断路径，
// 诊断失败先于清单换载，探针零副作用，t.after 清理。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PLUGIN_DIR = path.join(packageRoot, 'agents', 'dsh', 'plugins', 'dsh-demo');
const PROBE_FILES = ['index.ts', 'package.json', 'cordis.patch.yml'];

test('编译诊断逐条带 file:line 定位（比照根包 prepack 先例）', (t) => {
  const probe = path.join(packageRoot, `zz-diag-probe-${process.pid}`);
  fs.mkdirSync(path.join(probe, 'scripts'), { recursive: true });
  for (const file of PROBE_FILES) {
    fs.copyFileSync(path.join(PLUGIN_DIR, file), path.join(probe, file));
  }
  fs.copyFileSync(path.join(PLUGIN_DIR, 'scripts', 'prepack.ts'), path.join(probe, 'scripts', 'prepack.ts'));
  const originalIndex = fs.readFileSync(path.join(probe, 'index.ts'), 'utf8');
  fs.writeFileSync(
    path.join(probe, 'index.ts'),
    `${originalIndex}\nconst broken: number = '诊断定位探针：字面量与注解类型不符';\n`,
  );
  t.after(() => fs.rmSync(probe, { recursive: true, force: true }));

  const result = spawnSync(process.execPath, [path.join(probe, 'scripts', 'prepack.ts')], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 1, `编译失败应中止打包退出 1，实际 ${result.status}：${result.stdout}`);
  assert.match(result.stderr, /编译诊断 1 条/, '应报告诊断条数');
  assert.match(result.stderr, /index\.ts:\d+/, '诊断行应带 file:line 定位（现状缺失即本票红态）');
  // 诊断失败先于清单换载：探针 package.json 应保持源码态（main 仍指 .ts）
  const probeManifest = JSON.parse(fs.readFileSync(path.join(probe, 'package.json'), 'utf8'));
  assert.equal(probeManifest.main, 'index.ts', '诊断中止不得污染打包清单');
});
