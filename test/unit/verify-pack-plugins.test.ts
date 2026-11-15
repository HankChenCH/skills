// 发布对账的插件两查（seam 落点：verify-pack CLI 的外部可观察行为）。
// 契约（spec 20261115-495e FR-2 / docs/plugin-assets.md §1.4，agents/ 两级布局随
// spec 20261115-ed9f 迁移）：
//   查 1 包内 agents/*/plugins/ 清单 = 仓库 agents/*/plugins/ 清单（<宿主>/<目录名> 复合键）；
//   查 2 每个仓库插件目录过 bundle 校验；任一不满足退出码 1；既有 skills 对账行为不变。
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

// staging 一个满足「包内清单 = 仓库清单」的 tarball：skills 按 SKILL.md 标记、agents/ 整树拷贝
// （agents/<宿主>/plugins/<插件目录>/ 两级布局随仓库原样进包）。
// options：omitPlugin（从包内抽走某插件使其缺席）、addExtraPlugin（塞进仓库没有的幽灵插件）、
// injectNodeModules（成员内嵌 node_modules——RQ2 异常流 A #3 的卷入通道：pnpm install 后
// 成员目录生成的 node_modules 被 files 白名单卷入包）。
// 抽走/塞入均落在 dsh 宿主名下——fixture 镜像本仓库现态（唯一宿主 dsh），多宿主接入时随仓库扩展。
async function stageTarball(
  root: string,
  { omitPlugin = null, addExtraPlugin = false, injectNodeModules = false }: {
    omitPlugin?: string | null;
    addExtraPlugin?: boolean;
    injectNodeModules?: boolean;
  } = {},
) {
  const stage = path.join(root, 'stage', 'package');
  await mkdir(path.join(stage, 'skills'), { recursive: true });
  await mkdir(path.join(stage, 'agents', 'dsh', 'plugins'), { recursive: true });
  for (const skill of await readdir(path.join(packageRoot, 'skills'))) {
    await mkdir(path.join(stage, 'skills', skill), { recursive: true });
    await writeFile(path.join(stage, 'skills', skill, 'SKILL.md'), '# fixture\n');
  }
  const agentsDir = path.join(packageRoot, 'agents');
  for (const host of await readdir(agentsDir)) {
    const hostPlugins = path.join(agentsDir, host, 'plugins');
    for (const plugin of await readdir(hostPlugins)) {
      // fixture 模拟 pack 产物语义：成员依赖目录（node_modules）不随包——真实 pack 永不卷入
      //（票 20261115-cf39 起插件包 devDependencies 自持 typescript，仓库目录落盘 node_modules）
      await cp(path.join(hostPlugins, plugin), path.join(stage, 'agents', host, 'plugins', plugin), {
        recursive: true,
        filter: (source) => !source.includes('node_modules'),
      });
    }
  }
  if (omitPlugin) {
    await rm(path.join(stage, 'agents', 'dsh', 'plugins', omitPlugin, 'package.json'));
  }
  if (addExtraPlugin) {
    await mkdir(path.join(stage, 'agents', 'dsh', 'plugins', 'ghost-plugin'), { recursive: true });
    await writeFile(path.join(stage, 'agents', 'dsh', 'plugins', 'ghost-plugin', 'package.json'), '{}');
  }
  if (injectNodeModules) {
    // 模拟被卷入的成员 node_modules：真实文件与包内相对符号链接两种形态都算条目
    // （RQ2 问②实测：真实文件被卷入、相对链接以链接条目入包——对账只看清单行，两种都该拦）。
    const nested = path.join(stage, 'agents', 'dsh', 'plugins', 'dsh-demo', 'node_modules', 'sisteransi');
    await mkdir(nested, { recursive: true });
    await writeFile(path.join(nested, 'package.json'), '{"name":"sisteransi","version":"0.0.0"}');
    await mkdir(path.join(nested, 'lib'), { recursive: true });
    await writeFile(path.join(nested, 'lib', 'index.js'), 'export {};\n');
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
  assert.match(result.stdout, /✓ 对账通过：包内插件清单 = 仓库 agents\/\*\/plugins\/ 清单/, '插件清单对账应有独立通过行');
  assert.match(result.stdout, /bundle 校验/, '插件过校验应在通过行言明');
});

test('包内缺仓库有的插件即拒绝发布：退出码 1 并点名缺失插件的复合键', async (t) => {
  const tarball = await stageTarball(await makeTempRoot(t), { omitPlugin: 'dsh-demo' });
  const result = runVerifyPack(tarball);
  assert.equal(result.status, 1, `应拒绝发布，实际退出码 ${result.status}：${result.stdout}`);
  assert.match(result.stderr, /缺失/);
  assert.match(result.stderr, /dsh\/dsh-demo/, '缺陷须点名缺失插件的 <宿主>/<目录> 复合键');
});

test('包内多出仓库没有的插件即拒绝发布：退出码 1 并点名多出插件的复合键', async (t) => {
  const tarball = await stageTarball(await makeTempRoot(t), { addExtraPlugin: true });
  const result = runVerifyPack(tarball);
  assert.equal(result.status, 1, `应拒绝发布，实际退出码 ${result.status}：${result.stdout}`);
  assert.match(result.stderr, /多出/);
  assert.match(result.stderr, /dsh\/ghost-plugin/, '缺陷须点名多出插件的 <宿主>/<目录> 复合键');
});

test('仓库插件坏清单即拒绝发布：退出码 1 并点名具体缺陷', async (t) => {
  // 查 2 校验的是仓库插件目录（发出去的内容 = 仓库内容，由查 1 对账成立）。
  // 校验器自身的拒绝行为已由 verify-bundle 测试覆盖；此处只证
  // verify-pack 真的把校验结果接进退出码——用一个不会被打包影响的方式：
  // 给仓库 agents/dsh/plugins/ 临时放进一个坏插件目录（测试结束清理），查 1/查 2 应双双点名它。
  const root = await makeTempRoot(t);
  const badPlugin = path.join(packageRoot, 'agents', 'dsh', 'plugins', 'zz-bad-fixture');
  await mkdir(badPlugin, { recursive: true });
  await writeFile(path.join(badPlugin, 'package.json'), JSON.stringify({ name: 'zz-bad-fixture' }));
  t.after(() => rm(badPlugin, { recursive: true, force: true }));
  const tarball = await stageTarball(root);
  const result = runVerifyPack(tarball);
  assert.equal(result.status, 1, `坏清单插件应拒绝发布，实际退出码 ${result.status}：${result.stdout}`);
  assert.match(result.stderr, /zz-bad-fixture/, '缺陷须点名坏清单插件');
  assert.match(result.stderr, /dsh\.bundle\.patch/, '缺陷须点名缺失的要素');
});

test('包内混入 node_modules 即拒绝发布：退出码 1 并逐条列出条目（RQ2 异常流 A #3）', async (t) => {
  // 坏包 fixture：成员内嵌 node_modules 被 files 白名单卷入（pnpm install 后生成的
  // agents/dsh/plugins/dsh-demo/node_modules 进包）——结构性坏包（悬空链接/异机路径），
  // 与清单对账正交：包内插件清单仍 = 仓库清单（fixture 未增删插件），但 node_modules
  // 禁入查必须独立把它拦下。
  const tarball = await stageTarball(await makeTempRoot(t), { injectNodeModules: true });
  const result = runVerifyPack(tarball);
  assert.equal(result.status, 1, `含 node_modules 的坏包应拒绝发布，实际退出码 ${result.status}：${result.stdout}`);
  assert.match(result.stderr, /node_modules/, '拒绝信息应点名 node_modules');
  assert.match(
    result.stderr,
    /package\/agents\/dsh\/plugins\/dsh-demo\/node_modules\/sisteransi/,
    '应逐条列出卷入条目的包内路径',
  );
});

test('根包 files 清单含 agents（插件资产随 agents/ 两级布局随包分发，ADR 20261115-f143）', async () => {
  const pkg = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  assert.ok(
    pkg.files.includes('agents'),
    `files 清单应含 agents（与 skills 同法），实际：${JSON.stringify(pkg.files)}`,
  );
});
