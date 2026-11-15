import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { installAssets } from '../../src/installer.ts';
import { readLockfile, lockfilePath, LOCKFILE_NAME } from '../../src/lockfile.ts';

// 测试用映射行：与 ASSET_MAP 技能行同构（表驱动分发用合成行复验，见末测试）
const SKILL_ROW = {
  type: '技能',
  sourceDir: 'skills',
  installTarget: '.agents/skills',
  symlinkRule: '<agentDir>/skills/<skillName>',
};

function makePackage(t, skills) {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-pkg-'));
  t.after(() => fs.rmSync(packageRoot, { recursive: true, force: true }));
  for (const [name, files] of Object.entries(skills)) {
    const dir = path.join(packageRoot, 'skills', name);
    for (const [rel, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), content);
    }
  }
  return packageRoot;
}

function makeProject(t, existingDirs = []) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-proj-'));
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));
  for (const dir of existingDirs) {
    fs.mkdirSync(path.join(projectRoot, dir), { recursive: true });
  }
  return projectRoot;
}

function install(t, { selected, agentDirs, packageRoot, projectRoot, row = SKILL_ROW }) {
  return installAssets({
    row,
    packageRoot,
    projectRoot,
    agentDirs,
    selected,
    packageVersion: '0.1.0',
    now: '2026-11-15T00:00:00Z',
  });
}

test('安装所选技能：SKILL.md 与 references/ 齐备落盘，未选技能不落盘', (t) => {
  const packageRoot = makePackage(t, {
    alpha: { 'SKILL.md': '# alpha', 'references/a.md': 'ref-a' },
    beta: { 'SKILL.md': '# beta', 'references/b.md': 'ref-b' },
  });
  const projectRoot = makeProject(t);
  install(t, { selected: ['alpha'], agentDirs: [], packageRoot, projectRoot });

  const installed = path.join(projectRoot, '.agents/skills/alpha');
  assert.equal(fs.readFileSync(path.join(installed, 'SKILL.md'), 'utf8'), '# alpha');
  assert.equal(fs.readFileSync(path.join(installed, 'references/a.md'), 'utf8'), 'ref-a');
  assert.equal(fs.existsSync(path.join(projectRoot, '.agents/skills/beta')), false, '未选技能不应落盘');
});

test('存在的 agent 目录获得相对软链，指向 .agents/skills/ 对应技能', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude']);
  install(t, { selected: ['alpha'], agentDirs: ['.claude', '.zcode'], packageRoot, projectRoot });

  const link = path.join(projectRoot, '.claude/skills/alpha');
  assert.equal(fs.lstatSync(link).isSymbolicLink(), true, '.claude/skills/alpha 应为软链');
  assert.equal(
    fs.readlinkSync(link),
    '../../.agents/skills/alpha',
    '软链必须是相对路径',
  );
  assert.equal(fs.realpathSync(link), fs.realpathSync(path.join(projectRoot, '.agents/skills/alpha')));
});

test('不存在的 agent 目录跳过并列入结果，不创建目录、不报错', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude']);
  const result = install(t, {
    selected: ['alpha'],
    agentDirs: ['.claude', '.zcode'],
    packageRoot,
    projectRoot,
  });

  assert.deepEqual(result.skippedAgentDirs.map((s) => s.dir), ['.zcode']);
  assert.deepEqual(result.linkedAgentDirs, ['.claude']);
  assert.equal(fs.existsSync(path.join(projectRoot, '.zcode')), false);
});

test('选中不存在的技能名显式报错并列出可选清单', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t);
  assert.throws(
    () => install(t, { selected: ['ghost'], agentDirs: [], packageRoot, projectRoot }),
    (err) => err.message.includes('alpha'),
  );
});

test('重跑幂等：内容刷新（源变则装后变）、过期文件被清除、锁文件无重复条目', (t) => {
  const packageRoot = makePackage(t, {
    alpha: { 'SKILL.md': 'v1', 'references/r.md': 'r1', 'extra.md': 'x' },
  });
  const projectRoot = makeProject(t, ['.claude']);
  install(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });

  // 源包内容演进：改文件、删过期文件
  fs.writeFileSync(path.join(packageRoot, 'skills/alpha/SKILL.md'), 'v2');
  fs.rmSync(path.join(packageRoot, 'skills/alpha/extra.md'));
  install(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });

  const installed = path.join(projectRoot, '.agents/skills/alpha');
  assert.equal(fs.readFileSync(path.join(installed, 'SKILL.md'), 'utf8'), 'v2', '重跑后应刷新为当前包内容');
  assert.equal(fs.existsSync(path.join(installed, 'extra.md')), false, '源里已删的文件重跑后不应残留');

  const lockfile = readLockfile(projectRoot);
  assert.deepEqual(Object.keys(lockfile.skills), ['alpha'], '重跑不应产生重复条目');
});

test('重跑刷新软链仍指向安装目标', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': 'v1' } });
  const projectRoot = makeProject(t, ['.claude']);
  install(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });
  install(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });

  const link = path.join(projectRoot, '.claude/skills/alpha');
  assert.equal(fs.lstatSync(link).isSymbolicLink(), true);
  assert.equal(fs.realpathSync(link), fs.realpathSync(path.join(projectRoot, '.agents/skills/alpha')));
});

test('软链位置被真实目录占用时记入冲突、不覆盖使用者数据', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude/skills/alpha']);
  fs.writeFileSync(path.join(projectRoot, '.claude/skills/alpha/user-file.txt'), 'keep me');

  const result = install(t, {
    selected: ['alpha'],
    agentDirs: ['.claude'],
    packageRoot,
    projectRoot,
  });

  assert.deepEqual(result.conflicts.map((c) => c.linkPath), ['.claude/skills/alpha']);
  assert.equal(
    fs.readFileSync(path.join(projectRoot, '.claude/skills/alpha/user-file.txt'), 'utf8'),
    'keep me',
  );
});

test('锁文件记录包版本 + 逐技能指纹/安装时间；先前安装的条目保留（合并记账）', (t) => {
  const packageRoot = makePackage(t, {
    alpha: { 'SKILL.md': '# alpha', 'references/r.md': 'r' },
    beta: { 'SKILL.md': '# beta' },
  });
  const projectRoot = makeProject(t);
  install(t, { selected: ['alpha'], agentDirs: [], packageRoot, projectRoot });
  install(t, { selected: ['beta'], agentDirs: [], packageRoot, projectRoot });

  const lockfile = readLockfile(projectRoot);
  assert.deepEqual(Object.keys(lockfile.skills).sort(), ['alpha', 'beta']);
  assert.equal(lockfile.package, '@hankchen/infra');
  assert.equal(lockfile.packageVersion, '0.1.0');
  assert.match(lockfile.skills.alpha.fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(lockfile.skills.beta.installedAt, '2026-11-15T00:00:00Z');
});

test('表驱动分发：合成映射行（非技能类型）驱动同一安装流程', (t) => {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-pkg-'));
  t.after(() => fs.rmSync(packageRoot, { recursive: true, force: true }));
  fs.mkdirSync(path.join(packageRoot, 'fake-src/thing'), { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'fake-src/thing/asset.txt'), 'data');
  const projectRoot = makeProject(t, ['.fakeagent']);

  const syntheticRow = {
    type: '测试资产',
    sourceDir: 'fake-src',
    installTarget: '.fake-target',
    symlinkRule: '<agentDir>/links/<skillName>',
  };
  const result = install(t, {
    selected: ['thing'],
    agentDirs: ['.fakeagent'],
    packageRoot,
    projectRoot,
    row: syntheticRow,
  });

  assert.equal(
    fs.readFileSync(path.join(projectRoot, '.fake-target/thing/asset.txt'), 'utf8'),
    'data',
    '来源目录按行字段解析',
  );
  assert.equal(
    fs.readlinkSync(path.join(projectRoot, '.fakeagent/links/thing')),
    '../../.fake-target/thing',
    '软链按行规则展开',
  );
});

test('空选择显式报错，不写任何文件', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t);
  assert.throws(
    () => install(t, { selected: [], agentDirs: [], packageRoot, projectRoot }),
    /选择/,
  );
  assert.equal(fs.existsSync(lockfilePath(projectRoot)), false, '空选择不应写锁文件');
});
