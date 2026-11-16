// 端到端：临时目录 + 真实 CLI 进程 + 真实文件系统（不 mock）。
// 交互路径经 script(1) 提供 PTY——clack 需要真 TTY 才收按键；旗标路径直接 spawnSync。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 期望值来源：src/cli.ts 的 renderHelp（文本字节的对账锚在 test/unit/cli.test.ts 对
// 迁移前参照 evidence/probe-ref-matrix.txt 的逐字转录，此处只对账通道形态）。
import { renderHelp } from '../../src/cli.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = path.join(packageRoot, 'bin', 'infra.ts');
// 根包版本单一事实源（票 20261116-0fdd）：锁文件 packageVersion 断言期望值随根 package.json 走，字面量退役
const rootVersion = (JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as { version: string }).version;
const REPO_SKILLS = path.join(packageRoot, 'skills');

// 交互路径勾选目标（按技能名排序后的下标）：design-brief=1、dev-clarify=5，两者 references/ 齐备
const PICK_INDICES = [1, 5];
const PICK_NAMES = ['design-brief', 'dev-clarify'];

function makeTargetProject(t: TestContext, { agentDirs = ['.claude'] }: { agentDirs?: string[] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-e2e-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q'], { cwd: root });
  for (const dir of agentDirs) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  return root;
}

function runCli(projectRoot: string, args: string[]) {
  const result = spawnSync(process.execPath, [BIN, ...args], { cwd: projectRoot, encoding: 'utf8' });
  return { ...result, code: result.status, error: result.error };
}


// 经 expect(1) 在真实 PTY 中跑交互式 CLI 并逐键注入（expect 于 PTY 内 spawn，避开
// script(1) 在本机对非 TTY stdin 的 tcgetattr 限制）。KEYS 用 DOWN/SPACE/ENTER 记号。
function runInteractive(projectRoot: string, keys: string[]) {
  const keyTokens = keys
    .map((key) => {
      if (key === '\x1b[B') return 'DOWN';
      if (key === ' ') return 'SPACE';
      if (key === '\r') return 'ENTER';
      throw new Error(`runInteractive 不认识的键：${JSON.stringify(key)}`);
    })
    .join(',');
  const result = spawnSync(
    'expect',
    [
      path.join(packageRoot, 'test', 'e2e', 'interactive.exp'),
      process.execPath,
      BIN,
      projectRoot,
      keyTokens,
    ],
    { cwd: projectRoot, encoding: 'utf8', timeout: 120000 },
  );
  if (result.status === null || result.error) {
    throw new Error(`expect runner 异常：${result.error?.message ?? 'signal ' + result.signal}`);
  }
  return { code: result.status, output: result.stdout + result.stderr };
}

// 交互勾选键序：初始光标在第 0 项；逐级下移到目标下标空格勾选，回车确认
function pickKeys(indices: number[]): string[] {
  const keys = [];
  let cursor = 0;
  for (const target of indices) {
    while (cursor < target) {
      keys.push('\x1b[B');
      cursor += 1;
    }
    keys.push(' ');
  }
  keys.push('\r');
  return keys;
}

const sha256 = (bytes: Buffer | string): string => crypto.createHash('sha256').update(bytes).digest('hex');

function listFilesRecursive(dir: string, base: string = dir): string[] {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full, base));
    } else {
      out.push(path.relative(base, full));
    }
  }
  return out.sort();
}

// 落盘快照：技能文件内容指纹 + 软链表 + 锁文件（指纹与包版本；安装时间天然变化，不比）
function snapshot(projectRoot: string) {
  const snap: {
    skills: Record<string, string>;
    links: Record<string, string>;
    lock: { packageVersion: string; fingerprints: Record<string, string> } | null;
  } = { skills: {}, links: {}, lock: null };
  const skillsRoot = path.join(projectRoot, '.agents/skills');
  if (fs.existsSync(skillsRoot)) {
    for (const rel of listFilesRecursive(skillsRoot)) {
      snap.skills[rel] = sha256(fs.readFileSync(path.join(skillsRoot, rel)));
    }
  }
  for (const agentDir of ['.claude', '.zcode']) {
    const linksRoot = path.join(projectRoot, agentDir, 'skills');
    if (fs.existsSync(linksRoot)) {
      for (const name of fs.readdirSync(linksRoot)) {
        snap.links[`${agentDir}/skills/${name}`] = fs.readlinkSync(path.join(linksRoot, name));
      }
    }
  }
  const lockPath = path.join(projectRoot, '.infra-lock.json');
  if (fs.existsSync(lockPath)) {
    const lockfile: { packageVersion: string; skills: Record<string, { fingerprint: string }> } = JSON.parse(
      fs.readFileSync(lockPath, 'utf8'),
    );
    snap.lock = {
      packageVersion: lockfile.packageVersion,
      fingerprints: Object.fromEntries(
        Object.entries(lockfile.skills).map(([name, entry]) => [name, entry.fingerprint]),
      ),
    };
  }
  return snap;
}

test('[FR-1] 全新 git 项目交互选装部分技能：所选齐备落盘、未选不落盘', async (t) => {
  const project = makeTargetProject(t);
  const { code } = await runInteractive(project, ['\r', ...pickKeys(PICK_INDICES)]);
  assert.equal(code, 0, '交互安装应成功退出');

  for (const name of PICK_NAMES) {
    const installed = path.join(project, '.agents/skills', name);
    assert.ok(fs.existsSync(path.join(installed, 'SKILL.md')), `${name}/SKILL.md 应落盘`);
    assert.ok(fs.statSync(path.join(installed, 'references')).isDirectory(), `${name}/references/ 应落盘`);
    // 落盘内容与包内来源逐文件一致（原样拷贝）
    const sourceFiles = listFilesRecursive(path.join(REPO_SKILLS, name));
    assert.deepEqual(listFilesRecursive(installed), sourceFiles, `${name} 目录树应与包内一致`);
    for (const rel of sourceFiles) {
      assert.equal(
        sha256(fs.readFileSync(path.join(installed, rel))),
        sha256(fs.readFileSync(path.join(REPO_SKILLS, name, rel))),
        `${name}/${rel} 内容应与包内一致`,
      );
    }
  }
  const installedNames = fs.readdirSync(path.join(project, '.agents/skills')).sort();
  assert.deepEqual(installedNames, [...PICK_NAMES].sort(), '未勾选技能不应落盘');
});

test('[FR-1] 交互安装后锁文件记账：包版本 + 逐技能指纹/安装时间', async (t) => {
  const project = makeTargetProject(t);
  await runInteractive(project, ['\r', ...pickKeys(PICK_INDICES)]);
  const lockfile: { package: string; packageVersion: string; skills: Record<string, { fingerprint: string; installedAt: string }> } = JSON.parse(
    fs.readFileSync(path.join(project, '.infra-lock.json'), 'utf8'),
  );
  assert.equal(lockfile.package, '@hankchen/infra');
  assert.equal(lockfile.packageVersion, rootVersion, '锁文件记录所装包的实际版本（=根 package.json）');
  assert.deepEqual(Object.keys(lockfile.skills).sort(), [...PICK_NAMES].sort());
  for (const entry of Object.values(lockfile.skills)) {
    assert.match(entry.fingerprint, /^[0-9a-f]{64}$/);
    assert.match(entry.installedAt, /^\d{4}-\d{2}-\d{2}T/);
  }
});

test('[FR-2] .claude 存在、.zcode 不存在：存在者得相对软链、不存在者跳过不报错', async (t) => {
  const project = makeTargetProject(t);
  const { code } = await runInteractive(project, ['\r', ...pickKeys(PICK_INDICES)]);
  assert.equal(code, 0, '存在缺失 agent 目录时进程不应报错');

  for (const name of PICK_NAMES) {
    const link = path.join(project, '.claude/skills', name);
    assert.equal(fs.lstatSync(link).isSymbolicLink(), true, `.claude/skills/${name} 应为软链`);
    assert.equal(fs.readlinkSync(link), '../../.agents/skills/' + name, '软链应为相对路径');
    assert.equal(
      fs.realpathSync(link),
      fs.realpathSync(path.join(project, '.agents/skills', name)),
    );
  }
  assert.equal(fs.existsSync(path.join(project, '.zcode')), false, '不存在的 agent 目录不应被创建');
});

test('[FR-6] 第一层选占位类型（规范）：确认后零动作退出', async (t) => {
  const project = makeTargetProject(t);
  // 第一层序 = 技能、插件、规范：下移两次到占位行（规范退第三行，spec 20261115-495e）
  const { code } = await runInteractive(project, ['\x1b[B', '\x1b[B', '\r']);
  assert.equal(code, 0, '占位类型确认应正常退出');
  assert.equal(fs.existsSync(path.join(project, '.agents')), false, '占位类型不应产生安装动作');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '占位类型不应写锁文件');
});

test('[FR-6] 旗标路径与交互路径落盘一致（内容指纹 + 软链 + 锁文件指纹）', async (t) => {
  const interactiveProject = makeTargetProject(t);
  await runInteractive(interactiveProject, ['\r', ...pickKeys(PICK_INDICES)]);

  const flagProject = makeTargetProject(t);
  const { code, stderr } = runCli(flagProject, ['--skills', `${PICK_NAMES[0]},${PICK_NAMES[1]}`]);
  assert.equal(code, 0, `旗标安装应成功退出：${stderr}`);

  const a = snapshot(interactiveProject);
  const b = snapshot(flagProject);
  assert.deepEqual(a, b, '两条路径的落盘快照应完全一致（除安装时间）');
});

test('[FR-6] --all 免交互安装全部 31 项技能', (t) => {
  const project = makeTargetProject(t);
  const { code, stderr } = runCli(project, ['--all']);
  assert.equal(code, 0, `--all 应成功退出：${stderr}`);
  const repoSkills = fs.readdirSync(REPO_SKILLS).sort();
  assert.deepEqual(fs.readdirSync(path.join(project, '.agents/skills')).sort(), repoSkills);
  const lockfile = JSON.parse(fs.readFileSync(path.join(project, '.infra-lock.json'), 'utf8'));
  assert.equal(Object.keys(lockfile.skills).length, repoSkills.length);
});

test('[FR-1] 重跑幂等：锁文件无重复条目、文件树不变', (t) => {
  const project = makeTargetProject(t);
  const first = runCli(project, ['--skills', PICK_NAMES[0]]);
  assert.equal(first.code, 0);
  const before = snapshot(project);
  const beforeLock = JSON.parse(fs.readFileSync(path.join(project, '.infra-lock.json'), 'utf8'));

  const second = runCli(project, ['--skills', PICK_NAMES[0]]);
  assert.equal(second.code, 0);
  const after = snapshot(project);

  assert.deepEqual(after, before, '重跑（同包内容）落盘快照应不变');
  assert.deepEqual(Object.keys(after.lock!.fingerprints), Object.keys(beforeLock.skills), '锁文件技能键集不变');
  assert.equal(Object.keys(beforeLock.skills).length, 1, '无重复条目');
});

test('[FR-6] --help 列明全部旗标与示例、退出码 0', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout } = runCli(project, ['--help']);
  assert.equal(code, 0);
  for (const needle of ['--all', '--skills', '--help', 'npx @hankchen/infra']) {
    assert.ok(stdout.includes(needle), `--help 输出应含 ${needle}`);
  }
});

// 通道锚点（工单 20261115-eed0，RQ3 §10.3 出口通道映射）：文本字节由 test/unit/cli.test.ts
// 对迁移前参照转录守卫；此处守卫真实入口的通道形态——stdout 载全文 + 恰一尾换行、
// stderr 空、退出码 0（npx 裸跑入口的 --help 出口契约）。
test('[FR-5] --help 通道逐字节：全文走 stdout、单尾换行、stderr 空', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['--help']);
  assert.equal(code, 0);
  assert.equal(stdout, `${renderHelp()}\n`);
  assert.equal(stderr, '');
});

// 互斥报错三通道（RQ3 §6.3 矩阵参照 evidence/probe-ref-matrix.txt --all --skills dev-spec 行）：
// 报错原文 + 提示行走 stderr、stdout 空、退出码 1——bin ✗ 出口契约在真实入口逐字节守护。
test('[FR-5] 互斥报错通道逐字节：文案与提示行走 stderr、退出码 1', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['--all', '--skills', 'dev-spec']);
  assert.equal(code, 1);
  assert.equal(stdout, '');
  assert.equal(
    stderr,
    '✗ --all 与 --skills 互斥：全装与按条目指定只能选一\n' +
      '  运行 npx @hankchen/infra --help 查看全部旗标与示例。\n',
  );
});

test('[FR-5] 本地双版本 tarball：指定版本安装对应内容、锁文件记录该版本', (t) => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-pack-'));
  t.after(() => fs.rmSync(workdir, { recursive: true, force: true }));

  const pack = (cwd: string) => {
    const result = spawnSync('npm', ['pack', '--pack-destination', workdir], { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, `npm pack 失败：${result.stderr}`);
    const name = result.stdout.trim().split('\n').pop()!;
    return path.join(workdir, name);
  };
  const tarballA = pack(packageRoot);

  // 版本 B：解包 A → 升版本 0.2.0 → 改一个技能文件内容 → 重新打包
  const extracted = path.join(workdir, 'b');
  fs.mkdirSync(extracted);
  spawnSync('tar', ['-xzf', tarballA, '-C', extracted]);
  const pkgDir = path.join(extracted, 'package');
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  pkg.version = '0.2.0';
  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(pkg, null, 2));
  const bumpedSkill = path.join(pkgDir, 'skills', PICK_NAMES[0], 'SKILL.md');
  fs.writeFileSync(bumpedSkill, `${fs.readFileSync(bumpedSkill, 'utf8')}\n<!-- e2e v0.2.0 标记 -->\n`);
  const tarballB = pack(pkgDir);

  const project = makeTargetProject(t);
  const binIn = (root: string) => path.join(root, 'node_modules', '@hankchen/infra', 'bin', 'infra.js');

  // 安装版本 A（模拟 npx @hankchen/infra@0.1.0）；r 依次承载 npm install / runCli（含 code）/ node 直跑结果
  let r: { status?: number | null; code?: number | null; stdout?: string; stderr?: string; error?: Error | undefined } = spawnSync('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', tarballA], {
    cwd: project,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `安装 tarball A 失败：${r.stderr}`);
  r = runCli(project, ['--skills', PICK_NAMES[0]]);
  assert.equal(r.code, 0, `版本 A 安装失败：${r.stderr}`);
  let lockfile = JSON.parse(fs.readFileSync(path.join(project, '.infra-lock.json'), 'utf8'));
  assert.equal(lockfile.packageVersion, rootVersion, '锁文件应记录版本 A（=根 package.json，tarballA 打自仓库根）');
  const contentA = fs.readFileSync(path.join(project, '.agents/skills', PICK_NAMES[0], 'SKILL.md'), 'utf8');
  assert.ok(!contentA.includes('v0.2.0 标记'), '版本 A 落盘不应含版本 B 标记');

  // 升级到版本 B 并重跑（模拟 npx @hankchen/infra@0.2.0 + 幂等刷新）
  r = spawnSync('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', tarballB], {
    cwd: project,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `安装 tarball B 失败：${r.stderr}`);
  r = spawnSync(process.execPath, [binIn(project), '--skills', PICK_NAMES[0]], {
    cwd: project,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `版本 B 刷新失败：${r.stderr}`);
  const contentB = fs.readFileSync(path.join(project, '.agents/skills', PICK_NAMES[0], 'SKILL.md'), 'utf8');
  assert.ok(contentB.includes('v0.2.0 标记'), '版本 B 落盘应为该版本内容（刷新生效）');
  lockfile = JSON.parse(fs.readFileSync(path.join(project, '.infra-lock.json'), 'utf8'));
  assert.equal(lockfile.packageVersion, '0.2.0', '锁文件应记录版本 B');
  assert.deepEqual(Object.keys(lockfile.skills), [PICK_NAMES[0]], '升级重跑无重复条目');
});
