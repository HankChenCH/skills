// 包内资产编目（spec 20261115-8975 + 20261115-495e 插件编目决策；agents/ 两级枚举随
// spec 20261115-ed9f 迁移，agents-layout.md §3.3）。
// copy 类行：列出来源目录下的条目名，读各条目 SKILL.md 的 description 作菜单提示。
// command 类行（listPlugins）：从枚举根两级枚举 agents/<宿主>/plugins/ 下的插件包——条目
// 正名取各包 package.json 的 name（registry 名，非目录名）、description 为菜单提示；枚举根
// 缺失/包不完整（package.json 缺失、非法或缺 name）时报错并列出缺陷（缺陷点名
// <宿主>/<目录名> 复合键）——与技能编目同一错误口径。宿主目录无 plugins/ 机制目录时跳过
//（按需建目录，agents-layout.md §1.3：宿主载明哪几类机制就建哪几个，不建空目录）。

import fs from 'node:fs';
import path from 'node:path';

// 编目函数只消费行的 sourceDir 字段（结构化入参，不钉整行型——copy/command 行均可编目）。
interface SourceDirRow {
  sourceDir: string;
}

export interface PluginCatalogEntry {
  name: string;
  description: string;
}

export function listEntries(packageRoot: string, row: SourceDirRow): string[] {
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

export function readDescriptions(packageRoot: string, row: SourceDirRow, names: string[]): Record<string, string> {
  const descriptions: Record<string, string> = {};
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

export function listPlugins(packageRoot: string, row: SourceDirRow): PluginCatalogEntry[] {
  const enumRoot = path.join(packageRoot, row.sourceDir);
  if (!fs.existsSync(enumRoot)) {
    throw new Error(`包内来源目录缺失：${row.sourceDir}/（包内容不完整，疑似发布对账失败）`);
  }
  const defects: string[] = [];
  const plugins: PluginCatalogEntry[] = [];
  const hosts = fs
    .readdirSync(enumRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const host of hosts) {
    const pluginsDir = path.join(enumRoot, host, 'plugins');
    if (!fs.existsSync(pluginsDir)) {
      continue; // 按需建目录：宿主可只载明其他机制（agents-layout.md §1.3）
    }
    const dirs = fs
      .readdirSync(pluginsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const dir of dirs) {
      const entryKey = `${host}/${dir}`;
      const pkgFile = path.join(pluginsDir, dir, 'package.json');
      let pkg: Record<string, unknown> | null = null;
      try {
        pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
      } catch (err) {
        defects.push(`${entryKey}/：package.json 缺失或不是合法 JSON（${err.message}）——条目正名无从得出`);
      }
      if (pkg !== null) {
        if (typeof pkg.name !== 'string' || pkg.name === '') {
          defects.push(`${entryKey}/：package.json 缺 name——菜单条目正名取包名（registry 名），非目录名`);
        } else {
          plugins.push({
            name: pkg.name,
            description: typeof pkg.description === 'string' ? pkg.description : '',
          });
        }
      }
    }
  }
  if (defects.length > 0) {
    throw new Error(`插件来源目录 ${row.sourceDir}/ 编目发现缺陷：\n${defects.map((d) => `  - ${d}`).join('\n')}`);
  }
  return plugins.sort((a, b) => (a.name < b.name ? -1 : 1));
}
