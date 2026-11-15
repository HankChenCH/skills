// 发布对账的插件两查（seam 落点：verify-pack CLI 的外部可观察行为）。
// 契约（spec 20261115-495e FR-2 / docs/plugin-assets.md §1.4）：
//   查 1 包内 plugins/ 清单 = 仓库 plugins/ 清单；查 2 每个插件目录过 bundle 校验；
//   任一不满足退出码 1；既有 skills 对账行为不变。
// fixture：临时目录真实 staging + 真实 tar 打包，不 mock 文件系统；对账脚本以子进程真实运行。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm, cp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VERIFY_PACK = path.join(packageRoot, 'scripts', 'verify-pack.ts');

async function makeTempRoot(t: TestContext) {
  const root = await mkdtemp(path.join(tmpdir(), 'verify-pack-plugins-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

// staging 一个满足「包内清单 = 仓库清单」的 tarball：skills 按 SKILL.md 标记、plugins 整目录拷贝。
// options：omitPlugin（从包内抽走某插件使其缺席）、addExtraPlugin（塞进仓库没有的幽灵插件）。
async function stageTarball(root: string, { omitPlugin = null, addExtraPlugin = false }: { omitPlugin?: string | null; addExtraPlugin?: boolean } = {}) {
  const stage = path.join(root, 'stage', 'package');
  await mkdir(path.join(stage, 'skills'), { recursive: true });
  await mkdir(path.join(stage, 'plugins'), { recursive: true });
  for (const skill of await readdir(path.join(packageRoot, 'skills'))) {
    await mkdir(path.join(stage, 'skills', skill), { recursive: true });
    await writeFile(path.join(stage, 'skills', skill, 'SKILL.md'), '# fixture\n');
  }
  const pluginsDir = path.join(packageRoot, 'plugins');
  const repoPlugins = await readdir(pluginsDir);
  for (const plugin of repoPlugins) {
    await cp(path.join(pluginsDir, plugin), path.join(stage, 'plugins', plugin), { recursive: true });
  }
  if (omitPlugin) {
    await rm(path.join(stage, 'plugins', omitPlugin, 'package.json'));
  }
  if (addExtraPlugin) {
    await mkdir(path.join(stage, 'plugins', 'ghost-plugin'), { recursive: true });
    await writeFile(path.join(stage, 'plugins', 'ghost-plugin', 'package.json'), '{}');
  }
  const tarball = path.join(root, 'fixture.tgz');
  spawnSync('tar', ['-czf', tarball, '-C', path.dirname(stage), 'package']);
  return tarball;
}

function runVerifyPack(tarball: string) {
  return spawnSync(process.execPath, [VERIFY_PACK, tarball], { encoding: 'utf8' });
}

test('对账通过：包内插件 = 仓库插件且每插件过校验，skills 对账行为不变（退出码 0）', async (t) => {
  const tarball = await stageTarball(await makeTempRoot(t));
  const result = runVerifyPack(tarball);
  assert.equal(result.status, 0, `应对账通过，实际退出码 ${result.status}：${result.stderr}`);
  assert.match(result.stdout, /✓ 对账通过：包内技能清单 = 仓库 skills\/ 清单/, '既有 skills 对账输出不变');
  assert.match(result.stdout, /✓ 对账通过：包内插件清单 = 仓库 plugins\/ 清单/, '插件清单对账应有独立通过行');
  assert.match(result.stdout, /bundle 校验/, '插件过校验应在通过行言明');
});

test('包内缺仓库有的插件即拒绝发布：退出码 1 并点名缺失插件', async (t) => {
  const tarball = await stageTarball(await makeTempRoot(t), { omitPlugin: 'dsh-demo' });
  const result = runVerifyPack(tarball);
  assert.equal(result.status, 1, `应拒绝发布，实际退出码 ${result.status}：${result.stdout}`);
  assert.match(result.stderr, /缺失/);
  assert.match(result.stderr, /dsh-demo/, '缺陷须点名缺失的插件');
});

test('包内多出仓库没有的插件即拒绝发布：退出码 1 并点名多出插件', async (t) => {
  const tarball = await stageTarball(await makeTempRoot(t), { addExtraPlugin: true });
  const result = runVerifyPack(tarball);
  assert.equal(result.status, 1, `应拒绝发布，实际退出码 ${result.status}：${result.stdout}`);
  assert.match(result.stderr, /多出/);
  assert.match(result.stderr, /ghost-plugin/, '缺陷须点名多出的插件');
});

test('仓库插件坏清单即拒绝发布：退出码 1 并点名具体缺陷', async (t) => {
  // 查 2 校验的是仓库插件目录（发出去的内容 = 仓库内容，由查 1 对账成立）。
  // 校验器自身的拒绝行为已由 verify-bundle.test.js 四条破坏测试覆盖；此处只证
  // verify-pack 真的把校验结果接进退出码——用一个不会被打包影响的方式：
  // 给仓库 plugins/ 临时放进一个坏插件目录（测试结束清理），查 1/查 2 应双双点名它。
  const root = await makeTempRoot(t);
  const badPlugin = path.join(packageRoot, 'plugins', 'zz-bad-fixture');
  await mkdir(badPlugin, { recursive: true });
  await writeFile(path.join(badPlugin, 'package.json'), JSON.stringify({ name: 'zz-bad-fixture' }));
  t.after(() => rm(badPlugin, { recursive: true, force: true }));
  const tarball = await stageTarball(root);
  const result = runVerifyPack(tarball);
  assert.equal(result.status, 1, `坏清单插件应拒绝发布，实际退出码 ${result.status}：${result.stdout}`);
  assert.match(result.stderr, /zz-bad-fixture/, '缺陷须点名坏清单插件');
  assert.match(result.stderr, /dsh\.bundle\.patch/, '缺陷须点名缺失的要素');
});

test('根包 files 清单含 plugins（插件资产随包分发，ADR 20261115-f143）', async () => {
  const pkg = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  assert.ok(
    pkg.files.includes('plugins'),
    `files 清单应含 plugins（与 skills 同法），实际：${JSON.stringify(pkg.files)}`,
  );
});
