// 安装器（spec 20261115-8975 安装行为决策）：表驱动——只认映射行字段，不含任何资产类型硬编码。
//
// installAssets({ row, packageRoot, projectRoot, agentDirs, selected, packageVersion, now }):
//   1. 校验 selected 非空且都在 row.sourceDir 下（未知名显式报错并列出可选清单）
//   2. 逐条目「整目录替换」拷进 row.installTarget/<名>（重跑 = 按当前包内容精确刷新，过期文件清除）
//   3. 对 agentDirs 中存在的目录按 row.symlinkRule 建相对软链；不存在者跳过并记账
//   4. 软链位置被真实文件/目录占用时记入冲突，不覆盖使用者数据
//   5. 合并写 .infra-lock.json（包版本 + 逐条目指纹/安装时间）

import fs from 'node:fs';
import path from 'node:path';

import { expandSymlinkRule } from './asset-map.ts';
import {
  PACKAGE_NAME,
  fingerprintSkillDir,
  readLockfile,
  writeLockfile,
} from './lockfile.ts';
import type { InfraLockfile } from './lockfile.ts';

// 可安装行的结构化入参：安装流程只消费这四个字段（copy 行与合成行同构，表驱动分发）。
interface InstallRow {
  type: string;
  sourceDir: string;
  installTarget: string;
  symlinkRule: string;
}

export interface InstallConflict {
  linkPath: string;
  agentDir: string;
  skill: string;
}

export interface InstallAssetsResult {
  installedSkills: string[];
  linkedAgentDirs: string[];
  skippedAgentDirs: { dir: string; reason: string }[];
  conflicts: InstallConflict[];
  lockfile?: InfraLockfile;
}

function availableEntries(sourceRoot: string): string[] {
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`来源目录不存在：${sourceRoot}`);
  }
  return fs
    .readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function installAssets({
  row,
  packageRoot,
  projectRoot,
  agentDirs,
  selected,
  packageVersion,
  now,
}: {
  row: InstallRow;
  packageRoot: string;
  projectRoot: string;
  agentDirs: string[];
  selected: string[];
  packageVersion: string;
  now: string;
}): InstallAssetsResult {
  if (!Array.isArray(selected) || selected.length === 0) {
    throw new Error('未选择任何条目：selected 为空，拒绝安装');
  }
  const sourceRoot = path.join(packageRoot, row.sourceDir);
  const available = availableEntries(sourceRoot);
  const missing = selected.filter((name) => !available.includes(name));
  if (missing.length > 0) {
    throw new Error(`以下条目不在来源目录 ${row.sourceDir}/ 中：${missing.join('、')}；可用条目：${available.join('、')}`);
  }

  const result: InstallAssetsResult = {
    installedSkills: [],
    linkedAgentDirs: [],
    skippedAgentDirs: [],
    conflicts: [],
  };

  const targetRoot = path.join(projectRoot, row.installTarget);
  const lockfile: InfraLockfile = readLockfile(projectRoot) ?? { package: PACKAGE_NAME, packageVersion, skills: {} };
  lockfile.package = PACKAGE_NAME;
  lockfile.packageVersion = packageVersion;

  for (const name of selected) {
    const source = path.join(sourceRoot, name);
    const target = path.join(targetRoot, name);
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true });
    lockfile.skills[name] = {
      fingerprint: fingerprintSkillDir(source),
      installedAt: now,
    };
    result.installedSkills.push(name);
  }

  for (const agentDir of agentDirs) {
    const agentRoot = path.join(projectRoot, agentDir);
    if (!fs.existsSync(agentRoot) || !fs.statSync(agentRoot).isDirectory()) {
      const reason = fs.existsSync(agentRoot) ? '非目录' : '不存在';
      result.skippedAgentDirs.push({ dir: agentDir, reason });
      continue;
    }
    result.linkedAgentDirs.push(agentDir);
    for (const name of result.installedSkills) {
      const linkRel = expandSymlinkRule(row.symlinkRule, agentDir, name);
      const linkPath = path.join(projectRoot, linkRel);
      const target = path.join(projectRoot, row.installTarget, name);
      if (fs.existsSync(linkPath) && !fs.lstatSync(linkPath).isSymbolicLink()) {
        result.conflicts.push({ linkPath: linkRel, agentDir, skill: name });
        continue;
      }
      fs.mkdirSync(path.dirname(linkPath), { recursive: true });
      if (fs.existsSync(linkPath) && fs.lstatSync(linkPath).isSymbolicLink()) {
        fs.unlinkSync(linkPath);
      }
      fs.symlinkSync(path.relative(path.dirname(linkPath), target), linkPath);
    }
  }

  writeLockfile(projectRoot, lockfile);
  result.lockfile = lockfile;
  return result;
}
