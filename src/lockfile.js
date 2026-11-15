// .infra-lock.json 记账（spec 20261115-8975 锁文件决策）。
//
// 结构：{ package, packageVersion, skills: { <技能名>: { fingerprint, installedAt } } }
// skills 以对象承载：同名技能重装即覆盖，结构性排除重复条目。
// 指纹 = sha256(按相对路径排序逐个喂入 「相对路径 + NUL + 文件字节」)，与拷贝方式无关、可跨机复算。

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const LOCKFILE_NAME = '.infra-lock.json';
export const PACKAGE_NAME = '@hankchen/infra';

function* walkFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else {
      yield full;
    }
  }
}

export function fingerprintSkillDir(skillDir) {
  const hash = crypto.createHash('sha256');
  for (const file of walkFiles(skillDir)) {
    const relPath = path.relative(skillDir, file).split(path.sep).join('/');
    hash.update(relPath);
    hash.update(Buffer.alloc(1, 0));
    hash.update(fs.readFileSync(file));
  }
  return hash.digest('hex');
}

export function lockfilePath(projectRoot) {
  return path.join(projectRoot, LOCKFILE_NAME);
}

export function readLockfile(projectRoot) {
  const file = lockfilePath(projectRoot);
  if (!fs.existsSync(file)) {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`锁文件 ${LOCKFILE_NAME} 不是合法 JSON（${err.message}）`);
  }
  if (typeof parsed !== 'object' || parsed === null || typeof parsed.skills !== 'object' || parsed.skills === null) {
    throw new Error(`锁文件 ${LOCKFILE_NAME} 结构不符（需含 package/packageVersion/skills 字段）`);
  }
  return parsed;
}

export function writeLockfile(projectRoot, lockfile) {
  fs.writeFileSync(lockfilePath(projectRoot), `${JSON.stringify(lockfile, null, 2)}\n`, 'utf8');
}
