// 包内资产编目（spec 20261115-8975 + 20261115-495e 插件编目决策）。
// copy 类行：列出来源目录下的条目名，读各条目 SKILL.md 的 description 作菜单提示。
// command 类行（listPlugins）：条目正名取各插件包 package.json 的 name（registry 名，
// 非目录名）、description 为菜单提示；目录缺失/包不完整（package.json 缺失、非法或缺
// name）时报错并列出缺陷——与技能编目同一错误口径。

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

export function listPlugins(packageRoot, row) {
  const sourceRoot = path.join(packageRoot, row.sourceDir);
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`包内来源目录缺失：${row.sourceDir}/（包内容不完整，疑似发布对账失败）`);
  }
  const defects = [];
  const plugins = [];
  const dirs = fs
    .readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const dir of dirs) {
    const pkgFile = path.join(sourceRoot, dir, 'package.json');
    let pkg = null;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
    } catch (err) {
      defects.push(`${dir}/：package.json 缺失或不是合法 JSON（${err.message}）——条目正名无从得出`);
    }
    if (pkg !== null) {
      if (typeof pkg.name !== 'string' || pkg.name === '') {
        defects.push(`${dir}/：package.json 缺 name——菜单条目正名取包名（registry 名），非目录名`);
      } else {
        plugins.push({
          name: pkg.name,
          description: typeof pkg.description === 'string' ? pkg.description : '',
        });
      }
    }
  }
  if (defects.length > 0) {
    throw new Error(`插件来源目录 ${row.sourceDir}/ 编目发现缺陷：\n${defects.map((d) => `  - ${d}`).join('\n')}`);
  }
  return plugins.sort((a, b) => (a.name < b.name ? -1 : 1));
}
