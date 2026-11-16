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

export interface SkillLockEntry {
  fingerprint: string;
  installedAt: string;
}

export interface PluginLockEntry {
  version: string;
  profile: string;
  installedAt: string;
}

// plugins 区 20261115-495e 起新增：读旧格式锁文件（无 plugins 键）时为 undefined，
// 写侧以 `lockfile.plugins ?? {}` 合并补齐（插件安装编排）。
export interface InfraLockfile {
  package: string;
  packageVersion: string;
  skills: Record<string, SkillLockEntry>;
  plugins?: Record<string, PluginLockEntry>;
}

function* walkFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else {
      yield full;
    }
  }
}

export function fingerprintSkillDir(skillDir: string): string {
  const hash = crypto.createHash('sha256');
  for (const file of walkFiles(skillDir)) {
    const relPath = path.relative(skillDir, file).split(path.sep).join('/');
    hash.update(relPath);
    hash.update(Buffer.alloc(1, 0));
    hash.update(fs.readFileSync(file));
  }
  return hash.digest('hex');
}

export function lockfilePath(projectRoot: string): string {
  return path.join(projectRoot, LOCKFILE_NAME);
}

export function readLockfile(projectRoot: string): InfraLockfile | null {
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

export function writeLockfile(projectRoot: string, lockfile: InfraLockfile): void {
  fs.writeFileSync(lockfilePath(projectRoot), `${JSON.stringify(lockfile, null, 2)}\n`, 'utf8');
}
