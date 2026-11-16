// 端到端：临时目录 + 真实 CLI 进程 + 真实文件系统（不 mock）。
// 交互路径经 expect(1) 提供 PTY——clack 需要真 TTY 才收按键；非交互路径直接 spawnSync（stdin 非 TTY）。
// 票 20261116-f761：skill 侧交互与非交互用例改写新命令面（skill add）。
// 票 20261116-bfcf 硬切：旧旗标（--all/--skills/--plugins）与裸跑两层菜单退役——旧输入按
// 未知旗标口径报错、裸跑打印顶层帮助；顶层命令面的 FR-2 文案矩阵与帮助定稿断言落本文件。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 期望值来源：src/program.ts 的 renderTopHelp（票 20261116-f761 新命令面顶层帮助；
// 文本字节定稿锚随硬切票 20261116-bfcf，此处只对账通道形态）。
import { renderTopHelp } from '../../src/program.ts';

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
// script(1) 在本机对非 TTY stdin 的 tcgetattr 限制）。KEYS 用 DOWN/SPACE/ENTER/CTRLC 记号；
// PATTERNS 与 KEYS 等长（空串 = 不等待）；cliArgs 为转交 CLI 的参数（硬切后缺省裸跑 =
// 打印顶层帮助退出 0，本文件交互用例均显式传参）。
function runInteractive(projectRoot: string, keys: string[], patterns: string[] = [], cliArgs = '') {
  const keyTokens = keys
    .map((key) => {
      if (key === '\x1b[B') return 'DOWN';
      if (key === ' ') return 'SPACE';
      if (key === '\r') return 'ENTER';
      if (key === '\x03') return 'CTRLC';
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
      patterns.join(','),
      cliArgs,
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

// skill add 无参交互勾选的等待锚：条目多选提示（按名排序后光标在第 0 项）
const PICK_PATTERN = '选择要安装的技能';

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

// ---------- [FR-1] skill add 带名免交互安装全链 ----------

test('[FR-1] skill add dev-spec dev-plan 真进程安装 2 项：拷贝 + 软链 + 锁文件 + 摘要 + 退出 0', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['skill', 'add', 'dev-spec', 'dev-plan']);
  assert.equal(code, 0, `带名安装应成功退出：${stderr}`);

  for (const name of ['dev-spec', 'dev-plan']) {
    const installed = path.join(project, '.agents/skills', name);
    assert.ok(fs.existsSync(path.join(installed, 'SKILL.md')), `${name}/SKILL.md 应落盘`);
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
    // agent 目录软链
    const link = path.join(project, '.claude/skills', name);
    assert.equal(fs.lstatSync(link).isSymbolicLink(), true, `.claude/skills/${name} 应为软链`);
    assert.equal(fs.readlinkSync(link), '../../.agents/skills/' + name, '软链应为相对路径');
  }

  // 锁文件记账：包版本 + 逐技能指纹/安装时间
  const lockfile: { packageVersion: string; skills: Record<string, { fingerprint: string; installedAt: string }> } =
    JSON.parse(fs.readFileSync(path.join(project, '.infra-lock.json'), 'utf8'));
  assert.equal(lockfile.packageVersion, rootVersion, '锁文件记录所装包的实际版本（=根 package.json）');
  assert.deepEqual(Object.keys(lockfile.skills).sort(), ['dev-plan', 'dev-spec']);
  for (const entry of Object.values(lockfile.skills)) {
    assert.match(entry.fingerprint, /^[0-9a-f]{64}$/);
    assert.match(entry.installedAt, /^\d{4}-\d{2}-\d{2}T/);
  }

  // 完成摘要列出安装项
  const output = stdout + stderr;
  assert.match(output, /已安装 2 项技能/, '摘要应记安装项数');
  assert.match(output, /dev-spec、dev-plan/, '摘要应列安装项名');
});

test('[FR-4] skill add 不存在的名字：报错列可用技能清单、退出 1、零落盘', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['skill', 'add', 'no-such-skill']);
  assert.equal(code, 1, '未知名应失败退出');
  const output = stdout + stderr;
  assert.match(output, /no-such-skill/, '报错应点名未知技能');
  assert.match(output, /可用条目/, '报错应列可用技能清单');
  assert.equal(fs.existsSync(path.join(project, '.agents')), false, '报错路径不得产生安装落盘');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '报错路径不得写锁文件');
});

test('[FR-4] 软链位置被真实文件占用：跳过并在完成摘要列出，使用者数据未覆盖', (t) => {
  const project = makeTargetProject(t);
  const userFile = path.join(project, '.claude/skills/dev-spec');
  fs.mkdirSync(path.dirname(userFile), { recursive: true });
  fs.writeFileSync(userFile, '使用者自有数据');

  const { code, stdout, stderr } = runCli(project, ['skill', 'add', 'dev-spec']);
  assert.equal(code, 0, `冲突跳过不应失败退出：${stderr}`);
  assert.equal(fs.readFileSync(userFile, 'utf8'), '使用者自有数据', '冲突位置真实文件不得被覆盖');
  const output = stdout + stderr;
  assert.match(output, /跳过软链（该位置已有真实文件，未改动使用者数据）/, '摘要应列软链冲突跳过');
  assert.match(output, /\.claude\/skills\/dev-spec/, '摘要应点名冲突位置');
  assert.ok(fs.existsSync(path.join(project, '.agents/skills/dev-spec/SKILL.md')), '技能本体应正常落盘');
});

test('[FR-4] 跨包版本两次 skill add：按当前包内容刷新、锁文件包版本与指纹更新、无重复条目', (t) => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-pack-'));
  t.after(() => fs.rmSync(workdir, { recursive: true, force: true }));

  const pack = (cwd: string) => {
    const result = spawnSync('npm', ['pack', '--pack-destination', workdir], { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, `npm pack 失败：${result.stderr}`);
    const name = result.stdout.trim().split('\n').pop()!;
    return path.join(workdir, name);
  };
  const tarballA = pack(packageRoot);

  // 版本 B：解包 A → 升版本（根版本 patch +1，恒高于当前包一档、随根版本自动错开）
  // → 改一个技能文件内容 → 重新打包
  const [major, minor, patch] = rootVersion.split('.').map(Number);
  const bumpedVersion = `${major}.${minor}.${patch + 1}`;
  const extracted = path.join(workdir, 'b');
  fs.mkdirSync(extracted);
  spawnSync('tar', ['-xzf', tarballA, '-C', extracted]);
  const pkgDir = path.join(extracted, 'package');
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  pkg.version = bumpedVersion;
  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(pkg, null, 2));
  const bumpedSkill = path.join(pkgDir, 'skills', PICK_NAMES[0], 'SKILL.md');
  fs.writeFileSync(bumpedSkill, `${fs.readFileSync(bumpedSkill, 'utf8')}\n<!-- e2e 升级标记 -->\n`);
  const tarballB = pack(pkgDir);

  const project = makeTargetProject(t);
  const binIn = (root: string) => path.join(root, 'node_modules', '@hankchen/infra', 'bin', 'infra.js');

  // 安装版本 A（模拟 npx @hankchen/infra@<根包当前版本>，tarballA 打自仓库根）；r 依次承载 npm install / runCli（含 code）/ node 直跑结果
  let r: { status?: number | null; code?: number | null; stdout?: string; stderr?: string; error?: Error | undefined } = spawnSync('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', tarballA], {
    cwd: project,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `安装 tarball A 失败：${r.stderr}`);
  r = runCli(project, ['skill', 'add', PICK_NAMES[0]]);
  assert.equal(r.code, 0, `版本 A 安装失败：${r.stderr}`);
  let lockfile = JSON.parse(fs.readFileSync(path.join(project, '.infra-lock.json'), 'utf8'));
  assert.equal(lockfile.packageVersion, rootVersion, '锁文件应记录版本 A（=根 package.json，tarballA 打自仓库根）');
  const contentA = fs.readFileSync(path.join(project, '.agents/skills', PICK_NAMES[0], 'SKILL.md'), 'utf8');
  assert.ok(!contentA.includes('升级标记'), '版本 A 落盘不应含版本 B 标记');

  // 升级到版本 B 并重跑（模拟 npx @hankchen/infra@<版本 B> + 幂等刷新）
  r = spawnSync('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', tarballB], {
    cwd: project,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `安装 tarball B 失败：${r.stderr}`);
  r = spawnSync(process.execPath, [binIn(project), 'skill', 'add', PICK_NAMES[0]], {
    cwd: project,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `版本 B 刷新失败：${r.stderr}`);
  const contentB = fs.readFileSync(path.join(project, '.agents/skills', PICK_NAMES[0], 'SKILL.md'), 'utf8');
  assert.ok(contentB.includes('升级标记'), '版本 B 落盘应为该版本内容（刷新生效）');
  lockfile = JSON.parse(fs.readFileSync(path.join(project, '.infra-lock.json'), 'utf8'));
  assert.equal(lockfile.packageVersion, bumpedVersion, '锁文件应记录版本 B');
  assert.deepEqual(Object.keys(lockfile.skills), [PICK_NAMES[0]], '升级重跑无重复条目');
});

// ---------- [FR-1/FR-3] skill add 交互路径（PTY）与非交互路径落盘一致 ----------

test('[FR-1] PTY skill add 无参勾选 2 项：落盘与免交互路径一致', async (t) => {
  const interactiveProject = makeTargetProject(t);
  // skill add 无第一层类型选择：pickKeys 首键（DOWN）前等条目多选提示渲染（盲发会在渲染窗口被吞）
  const picked = await runInteractive(interactiveProject, pickKeys(PICK_INDICES), [PICK_PATTERN], 'skill add');
  assert.equal(picked.code, 0, '交互勾选安装应成功退出');

  const namedProject = makeTargetProject(t);
  const { code, stderr } = runCli(namedProject, ['skill', 'add', `${PICK_NAMES[0]},${PICK_NAMES[1]}`]);
  assert.equal(code, 0, `免交互安装应成功退出：${stderr}`);

  const a = snapshot(interactiveProject);
  const b = snapshot(namedProject);
  assert.deepEqual(a, b, 'PTY 勾选与免交互路径的落盘快照应完全一致（除安装时间）');
});

test('[FR-1] PTY skill add 安装后锁文件记账：包版本 + 逐技能指纹/安装时间', async (t) => {
  const project = makeTargetProject(t);
  const picked = await runInteractive(project, pickKeys(PICK_INDICES), [PICK_PATTERN], 'skill add');
  assert.equal(picked.code, 0);
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

test('[FR-3] PTY skill add 勾选后取消（Ctrl-C）：退出 0 且零落盘', async (t) => {
  const project = makeTargetProject(t);
  const picked = await runInteractive(project, ['\x03'], [PICK_PATTERN], 'skill add');
  assert.equal(picked.code, 0, '取消应正常退出（现行交互纪律）');
  assert.equal(fs.existsSync(path.join(project, '.agents')), false, '取消不得产生安装落盘');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '取消不得写锁文件');
});

test('[FR-3] PTY skill add 确认空选：退出 0 且零落盘', async (t) => {
  const project = makeTargetProject(t);
  const picked = await runInteractive(project, ['\r'], [PICK_PATTERN], 'skill add');
  assert.equal(picked.code, 0, '空选确认应正常退出（现行交互纪律）');
  assert.equal(fs.existsSync(path.join(project, '.agents')), false, '空选不得产生安装落盘');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '空选不得写锁文件');
});

test('[FR-2] .claude 存在、.zcode 不存在：存在者得相对软链、不存在者跳过不报错', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['skill', 'add', `${PICK_NAMES[0]},${PICK_NAMES[1]}`]);
  assert.equal(code, 0, `存在缺失 agent 目录时进程不应报错：${stderr}`);

  for (const name of PICK_NAMES) {
    const link = path.join(project, '.claude/skills', name);
    assert.equal(fs.lstatSync(link).isSymbolicLink(), true, `.claude/skills/${name} 应为软链`);
    assert.equal(fs.readlinkSync(link), '../../.agents/skills/' + name, '软链应为相对路径');
    assert.equal(
      fs.realpathSync(link),
      fs.realpathSync(path.join(project, '.agents/skills', name)),
    );
  }
  assert.match(stdout + stderr, /跳过 \d+ 个 agent 目录/, '摘要应列不存在 agent 目录的跳过');
  assert.equal(fs.existsSync(path.join(project, '.zcode')), false, '不存在的 agent 目录不应被创建');
});

// ---------- [FR-1] --all 全装、非 TTY 守卫 ----------

test('[FR-1] skill add --all 全部技能免交互安装（与旧 --all 行为等价；旧旗标已硬切退役）', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['skill', 'add', '--all']);
  assert.equal(code, 0, `skill add --all 应成功退出：${stderr}`);

  const repoSkills = fs.readdirSync(REPO_SKILLS).sort();
  assert.deepEqual(fs.readdirSync(path.join(project, '.agents/skills')).sort(), repoSkills, '全量技能落盘');
  assert.match(stdout + stderr, new RegExp(`已安装 ${repoSkills.length} 项技能`), '摘要应记安装项数');
  const lockfile = JSON.parse(fs.readFileSync(path.join(project, '.infra-lock.json'), 'utf8'));
  assert.equal(Object.keys(lockfile.skills).length, repoSkills.length, '锁文件逐技能记账');
});

test('[FR-3] 非 TTY skill add 无参：守卫文案报错、退出 1、零落盘', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['skill', 'add']);
  assert.equal(code, 1, '非 TTY 无参应失败退出');
  assert.equal(stdout, '');
  // 守卫文案为 spec 命令面契约原文（含 plugin add 用法指引；plugin 侧行为随票 20261116-ccfb 验）
  assert.equal(
    stderr,
    '✗ 交互选择需要终端（TTY）；非交互请改用 skill add <名...>、skill add --all 或 plugin add <名...> --profile <名>\n',
  );
  assert.equal(fs.existsSync(path.join(project, '.agents')), false, '守卫路径不得产生安装落盘');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '守卫路径不得写锁文件');
});

// ---------- 帮助定稿（票 20261116-bfcf）：裸跑、顶层 -h/--help、逐命令 --help 三形态 ----------
// 定稿断言：通道形态（全文走 stdout + 恰一尾换行 + stderr 空 + 退出码 0）+ 顶层帮助含
// skill add 与 plugin add 用法示例且不含旧旗标名（--skills/--plugins 已退役）。

test('[FR-1] 裸跑打印顶层帮助：退出码 0、零落盘（两层菜单退役）', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, []);
  assert.equal(code, 0);
  assert.equal(stdout, `${renderTopHelp()}\n`, '裸跑应打印定稿顶层帮助（全文 stdout、恰一尾换行）');
  assert.equal(stderr, '');
  assert.equal(fs.existsSync(path.join(project, '.agents')), false, '裸跑不得产生安装落盘');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '裸跑不得写锁文件');
});

test('[FR-1] 顶层 --help 打印定稿命令面帮助：两命令用法示例、不含旧旗标名、退出码 0', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['--help']);
  assert.equal(code, 0);
  assert.equal(stdout, `${renderTopHelp()}\n`, '顶层帮助应全文走 stdout 且恰一尾换行');
  assert.equal(stderr, '');
  for (const needle of ['skill add dev-spec,dev-plan', 'skill add --all', 'plugin add @hankchen/dsh-demo --profile dev', 'npx @hankchen/infra']) {
    assert.ok(stdout.includes(needle), `顶层帮助应含新形态用法示例 ${needle}`);
  }
  for (const retired of ['--skills', '--plugins']) {
    assert.equal(stdout.includes(retired), false, `顶层帮助不得含旧旗标名 ${retired}`);
  }
});

test('[FR-1] 顶层 -h 与 --help 等价', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout } = runCli(project, ['-h']);
  assert.equal(code, 0);
  assert.equal(stdout, `${renderTopHelp()}\n`);
});

test('[FR-1] skill add --help 打印命令级帮助：用法与示例、不含旧旗标名、退出码 0', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['skill', 'add', '--help']);
  assert.equal(code, 0);
  assert.equal(stderr, '');
  for (const needle of ['skill add [名...]', '--all', 'skill add dev-spec,dev-plan']) {
    assert.ok(stdout.includes(needle), `skill add --help 应含 ${needle}`);
  }
  for (const retired of ['--skills', '--plugins']) {
    assert.equal(stdout.includes(retired), false, `skill add --help 不得含旧旗标名 ${retired}`);
  }
});

test('[FR-1] skill 无动词打印该命令帮助、退出码 0', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['skill']);
  assert.equal(code, 0);
  assert.equal(stderr, '');
  assert.ok(stdout.includes('add'), 'skill 命令帮助应列出 add 动词');
});

// ---------- [FR-2] 未知子命令/未知旗标新文案矩阵（票 20261116-bfcf 硬切定稿）----------
// 旧旗标（--all/--skills/--plugins）与任意未知 token 按 spec 命令面契约原文报错：
// 文案含实际输入 + 指路 --help，三通道逐字节（✗ 行走 stderr、stdout 空、退出码 1）、零落盘。
// --all×名互斥两序（spec S1「含顺序反转 2 例」）一并落本节。

test('[FR-2] 未知子命令 foo：未知命令文案（可用命令清单 + --help 指路）、退出 1、零落盘', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['foo']);
  assert.equal(code, 1);
  assert.equal(stdout, '');
  assert.equal(stderr, '✗ 未知命令「foo」；可用命令：skill、plugin（--help 查看用法示例）\n');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '报错路径不得写锁文件');
  assert.equal(fs.existsSync(path.join(project, '.agents')), false, '报错路径不得产生安装落盘');
});

test('[FR-2] 旧旗标 --skills dev-spec：未知旗标口径（实际旗标名 + 指路 --help）、退出 1、零落盘', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['--skills', 'dev-spec']);
  assert.equal(code, 1);
  assert.equal(stdout, '');
  assert.equal(stderr, '✗ 未知旗标「--skills」；运行 --help 查看全部命令与用法\n');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '报错路径不得写锁文件');
  assert.equal(fs.existsSync(path.join(project, '.agents')), false, '报错路径不得产生安装落盘');
});

test('[FR-2] 旧旗标 --all：未知旗标口径、退出 1、零落盘', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['--all']);
  assert.equal(code, 1);
  assert.equal(stdout, '');
  assert.equal(stderr, '✗ 未知旗标「--all」；运行 --help 查看全部命令与用法\n');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false);
});

test('[FR-2] 旧旗标 --plugins x --profile dev：未知旗标口径（首个命中即报）、退出 1、零落盘', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['--plugins', 'x', '--profile', 'dev']);
  assert.equal(code, 1);
  assert.equal(stdout, '');
  assert.equal(stderr, '✗ 未知旗标「--plugins」；运行 --help 查看全部命令与用法\n');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false);
});

test('[FR-2] skill add --foo：命令级任意旗标按未知旗标口径、退出 1、零落盘', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['skill', 'add', '--foo']);
  assert.equal(code, 1);
  assert.equal(stdout, '');
  assert.equal(stderr, '✗ 未知旗标「--foo」；运行 --help 查看全部命令与用法\n');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false);
  assert.equal(fs.existsSync(path.join(project, '.agents')), false);
});

test('[FR-2] 裸 -- 分隔符按未知旗标口径报错（旧矩阵边角口径随迁）、退出 1', (t) => {
  const project = makeTargetProject(t);
  const { code, stdout, stderr } = runCli(project, ['--']);
  assert.equal(code, 1);
  assert.equal(stdout, '');
  assert.equal(stderr, '✗ 未知旗标「--」；运行 --help 查看全部命令与用法\n');
  assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false);
});

test('[FR-2] --all 与名互斥两序（dev-spec --all / --all dev-spec）：同文案、退出 1、零落盘', (t) => {
  const mutexError = '✗ --all 与技能名互斥：全装与按条目指定只能选一\n';
  for (const argv of [['skill', 'add', 'dev-spec', '--all'], ['skill', 'add', '--all', 'dev-spec']]) {
    const project = makeTargetProject(t);
    const { code, stdout, stderr } = runCli(project, argv);
    assert.equal(code, 1, `互斥应失败退出：${argv.join(' ')}`);
    assert.equal(stdout, '');
    assert.equal(stderr, mutexError, `互斥文案逐字节（${argv.join(' ')}）`);
    assert.equal(fs.existsSync(path.join(project, '.infra-lock.json')), false, '互斥路径不得写锁文件');
    assert.equal(fs.existsSync(path.join(project, '.agents')), false, '互斥路径不得产生安装落盘');
  }
});

// ---------- [FR-1] 重跑幂等（skill add 新形态）：锁文件无重复条目、文件树不变 ----------

test('[FR-1] 重跑幂等（skill add 同名重跑）：锁文件无重复条目、文件树不变', (t) => {
  const project = makeTargetProject(t);
  const first = runCli(project, ['skill', 'add', PICK_NAMES[0]]);
  assert.equal(first.code, 0);
  const before = snapshot(project);
  const beforeLock = JSON.parse(fs.readFileSync(path.join(project, '.infra-lock.json'), 'utf8'));

  const second = runCli(project, ['skill', 'add', PICK_NAMES[0]]);
  assert.equal(second.code, 0);
  const after = snapshot(project);

  assert.deepEqual(after, before, '重跑（同包内容）落盘快照应不变');
  assert.deepEqual(Object.keys(after.lock!.fingerprints), Object.keys(beforeLock.skills), '锁文件技能键集不变');
  assert.equal(Object.keys(beforeLock.skills).length, 1, '无重复条目');
});
