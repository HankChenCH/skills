// 包内资产编目：列出映射行来源目录下的条目名，并读各条目 SKILL.md 的 description 作菜单提示。

import fs from 'node:fs';
import path from 'node:path';

export function listEntries(packageRoot, row) {
  const sourceRoot = path.join(packageRoot, row.sourceDir);
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`包内来源目录缺失：${row.sourceDir}/（包内容不完整，疑似发布对账失败）`);
  }
  return fs
    .readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function readDescriptions(packageRoot, row, names) {
  const descriptions = {};
  for (const name of names) {
    const skillMd = path.join(packageRoot, row.sourceDir, name, 'SKILL.md');
    descriptions[name] = '';
    if (!fs.existsSync(skillMd)) {
      continue;
    }
    const head = fs.readFileSync(skillMd, 'utf8').slice(0, 2048);
    const match = head.match(/^description:\s*(.+)$/m);
    if (match) {
      descriptions[name] = match[1].trim();
    }
  }
  return descriptions;
}
