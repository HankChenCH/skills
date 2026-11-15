import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  fingerprintSkillDir,
  readLockfile,
  writeLockfile,
  LOCKFILE_NAME,
} from '../../src/lockfile.ts';

function makeSkillDir(t, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-lock-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}

// 期望值字面量：由 shasum -a 256 对「相对路径 + NUL + 文件字节」独立算出（printf 'a.txt\0hello\n' | shasum -a 256）
test('指纹 = sha256(排序后 逐文件 相对路径+NUL+字节)；单文件目录得到独立字面量', (t) => {
  const dir = makeSkillDir(t, { 'a.txt': 'hello\n' });
  assert.equal(
    fingerprintSkillDir(dir),
    'aed49f7730ca0736fe1a021375d1ca9b509a4e72910b422578df8b4b1930aeca',
  );
});

test('同一目录两次指纹一致（确定性）', (t) => {
  const dir = makeSkillDir(t, { 'SKILL.md': '# s', 'references/r.md': 'x' });
  assert.equal(fingerprintSkillDir(dir), fingerprintSkillDir(dir));
});

test('任一文件字节变化，指纹随之变化', (t) => {
  const before = fingerprintSkillDir(makeSkillDir(t, { 'a.txt': 'hello\n' }));
  const after = fingerprintSkillDir(makeSkillDir(t, { 'a.txt': 'world\n' }));
  assert.notEqual(before, after);
});

test('同名内容换文件名（路径参与指纹），指纹变化', (t) => {
  const before = fingerprintSkillDir(makeSkillDir(t, { 'a.txt': 'hello\n' }));
  const after = fingerprintSkillDir(makeSkillDir(t, { 'b.txt': 'hello\n' }));
  assert.notEqual(before, after);
});

test('读取缺失锁文件返回 null（无锁 = 未安装过）', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-proj-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(readLockfile(root), null);
});

test('损坏的锁文件显式报错且错误信息带文件路径', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-proj-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, LOCKFILE_NAME), '{ not json');
  assert.throws(() => readLockfile(root), (err) => err.message.includes(LOCKFILE_NAME));
});

test('写入后读回一致（包版本 + 逐技能名/指纹/安装时间）', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-proj-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const lockfile = {
    package: '@hankchen/infra',
    packageVersion: '0.1.0',
    skills: {
      'dev-spec': { fingerprint: 'f'.repeat(64), installedAt: '2026-11-15T00:00:00Z' },
    },
  };
  writeLockfile(root, lockfile);
  assert.deepEqual(readLockfile(root), lockfile);
});

test('重写同名技能条目为覆盖、不产生重复条目', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-proj-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeLockfile(root, {
    package: '@hankchen/infra',
    packageVersion: '0.1.0',
    skills: { a: { fingerprint: '1', installedAt: 't1' } },
  });
  writeLockfile(root, {
    package: '@hankchen/infra',
    packageVersion: '0.1.0',
    skills: { a: { fingerprint: '2', installedAt: 't2' } },
  });
  const lockfile = readLockfile(root);
  assert.deepEqual(Object.keys(lockfile.skills), ['a']);
  assert.equal(lockfile.skills.a.fingerprint, '2');
});
