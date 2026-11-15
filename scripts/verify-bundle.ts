#!/usr/bin/env node
// 插件包 bundle 清单校验器（spec 20261115-495e FR-2，规范文档 docs/plugin-assets.md §1.2/§1.4）。
// 接口窄：进插件包目录，出缺陷清单（空 = 通过）。核对 §1.2 清单四要素与 §1.4 两项附录——
//   1. package.json type: "module"（要素表第 1 行：插件模块按 ESM 加载，CJS 形态宿主加载即抛错）；
//   2. package.json 声明 dsh.bundle.patch（缺它装进 profile 只作普通依赖、不进插件树，need F1）；
//   3. files 清单含 patch 文件（npm 白名单外文件不随包分发，清单缺文件 = 装出去的包坏）；
//   4. patch 清单为官方 loader 可解析的 PatchOptions[]（要素表第 4 行「以包名引用自己」的官方
//      形态，ticket 20261115-f158 取证：顶层须 YAML 数组、元素须映射、insert 元素须 id + name、
//      引用名 = 包名）；
//   5. 插件模块导出 name 与 apply(ctx)（§1.4 附录二；main 直指模块作为定位入口随查，main 允许
//      .ts 形态——spec 20261115-f650 demo 插件 .ts 化契约；静态读源码，套件约定 ESM + 内联导出，
//      照抄 demo 即在此形态内。导出识别在剥注释后的文本上做：.ts 文档注释天然引用导出名、
//      type 声明形似导出，裸正则会误放行幽灵导出）。
// scripts/verify-pack.ts 的插件侧复用本实现；独立调用：
//
//   node scripts/verify-bundle.ts <插件包目录>...

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 被校验插件包 package.json 的清单切片（四要素相关字段；其余键不进核对范围）。
interface PluginPackageJson {
  name?: string;
  type?: string;
  files?: string[];
  main?: string;
  dsh?: { bundle?: { patch?: string } };
}

// package.json 里的声明值（'./cordis.patch.yml'）与 files 条目（'cordis.patch.yml'）同法归一后再比对
function normalizeEntry(entry: string): string {
  return entry.replace(/^\.\//, '');
}

// ---------- 官方补丁形态读取（要素 4 的判定单点，块状 YAML 方言） ----------
//
// 官方语义取证（ticket 20261115-f158，dsh 0.2.2-rc.1 npx 缓存）：
//   - 补丁文件 = 顶层 YAML 数组，元素 = PatchOptions（@deepseek-ai/cordis-plugin-include
//     lib/types/patch.d.ts：id? / insert? / name? / config? / group? / disabled?…）；
//   - insert 元素 = EntryOptions（@deepseek-ai/cordis-plugin-loader lib/types/config/entry.d.ts）：
//     id 与 name 必填——id「Stable id inside the containing entry tree」（运行时变更按 id
//     回路由到被插入的条目），name「Module specifier imported by the entry tree」；
//   - 官方解析器强校验两道：顶层须数组、元素须映射（dsh-app-boot lib/index.js parsePatchList，
//     缺陷消息「must be a top-level YAML array of loader patch entries」）；逐元素字段按类型契约。
// 读取范围声明：块状形态（官方文档、官方 profile patch 模板注释与 demo 所写）。流式形态
// （insert: [...]）按空列表读——空列表插不进任何条目、引用不到自己，交给引用检查报缺。

// 块状 YAML 行的统一中间形态：缩进列数 + 去空白文本。
interface PatchLine {
  indent: number;
  text: string;
}

// insert 列表项：EntryOptions 的键值切片（核对只取 id/name，其余键原样保留不判）。
type InsertEntry = Record<string, string>;

// readPatchItem 的三态结果：映射（含 insert 切片或 null = 无 insert 键）/ 标量 / 读不出。
// 标量与读不出态以 `insert?: undefined` 补齐同名字段——引用检查可对整个 items 集合统一
// 取 insert ?? []（非映射元素无 insert = 空列表，与迁移前运行时取值一致）。
type PatchItem =
  | { kind: 'mapping'; insert: InsertEntry[] | null }
  | { kind: 'scalar'; insert?: undefined }
  | { kind: 'unreadable'; insert?: undefined };

// readPatchOverlay 的三态结果：顶层数组（items）/ 顶层映射（官方拒绝的旧形态）/ 读不出。
type PatchOverlay =
  | { form: 'array'; items: PatchItem[] }
  | { form: 'mapping'; firstKey: string }
  | { form: 'unreadable' };

function stripQuotes(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"')))) {
    return v.slice(1, -1);
  }
  return v;
}

// 'key:' 或 'key: value'；键允许带引号。不匹配返回 null。
function splitKeyValue(text: string): { key: string; value: string } | null {
  const match = text.match(/^('[^']*'|"[^"]*"|[^:]+):(.*)$/);
  if (!match) return null;
  return { key: stripQuotes(match[1]), value: match[2].trim() };
}

function isDashLine(line: PatchLine): boolean {
  return line.text === '-' || line.text.startsWith('- ');
}

// 读一个 insert 列表项：头内容 + 与头内容对齐的续行键。返回 { id, name, ... } 或 null（非映射元素）。
function readInsertEntry(dashLine: PatchLine, bodyLines: PatchLine[]): InsertEntry | null {
  const entry: InsertEntry = {};
  let keyIndent: number | null = null;
  if (dashLine.text !== '-') {
    keyIndent = dashLine.indent + 2;
    const headPair = splitKeyValue(dashLine.text.slice(2));
    if (!headPair) return null;
    entry[headPair.key] = stripQuotes(headPair.value);
  }
  for (const line of bodyLines) {
    if (isDashLine(line)) break; // 下一个列表项开始
    if (keyIndent === null) keyIndent = line.indent;
    if (line.indent === keyIndent) {
      const pair = splitKeyValue(line.text);
      if (!pair) return null;
      entry[pair.key] = stripQuotes(pair.value);
    }
  }
  return entry;
}

// 读一个顶层元素（loader patch 条目）。返回：
//   { kind: 'mapping', insert: [{ id, name }] | null }——insert 为 null 表示无 insert 键；
//   { kind: 'scalar' }——非映射元素（官方拒绝：entry must be a mapping）；
//   { kind: 'unreadable' }——块状方言读不出键值结构。
function readPatchItem(dashLine: PatchLine, bodyLines: PatchLine[]): PatchItem {
  let keyIndent: number | null = null;
  let insert: InsertEntry[] | null = null;
  let insertListIndent: number | null = null;
  let entryBody: { dash: PatchLine; rest: PatchLine[] } | null = null;
  const finishEntry = (): boolean => {
    if (entryBody) {
      const parsed = readInsertEntry(entryBody.dash, entryBody.rest);
      if (!parsed) return false;
      // entryBody 只在 insert 列表开列后写入，此处 insert 必非 null
      insert!.push(parsed);
      entryBody = null;
    }
    return true;
  };
  if (dashLine.text !== '-') {
    keyIndent = dashLine.indent + 2;
    const headPair = splitKeyValue(dashLine.text.slice(2));
    if (!headPair) return { kind: 'scalar' };
    if (headPair.key === 'insert') {
      insert = [];
      insertListIndent = keyIndent;
    } else {
      return { kind: 'mapping', insert: null };
    }
  } else if (bodyLines.length > 0) {
    // 裸破折号（键在后续缩进行）与「- 键: 值」同行形态同为合法块状映射，走同一段键识别：
    // 首个续行定元素键缩进；首行为破折号（元素是列表）或非键值文本则非映射（官方拒绝形态）
    const first = bodyLines[0];
    if (isDashLine(first)) return { kind: 'scalar' };
    const firstPair = splitKeyValue(first.text);
    if (!firstPair) return { kind: 'scalar' };
    keyIndent = first.indent;
    if (firstPair.key === 'insert') {
      insert = [];
      insertListIndent = keyIndent;
    } else {
      return { kind: 'mapping', insert: null };
    }
  } else {
    return { kind: 'scalar' }; // 裸破折号无续行：空元素，非键值映射
  }
  for (const line of bodyLines) {
    if (entryBody && (isDashLine(line) || line.indent <= insertListIndent!)) {
      if (!finishEntry()) return { kind: 'unreadable' };
    }
    if (insert !== null && isDashLine(line) && line.indent >= insertListIndent!) {
      if (entryBody) {
        if (!finishEntry()) return { kind: 'unreadable' };
      }
      entryBody = { dash: line, rest: [] };
      continue;
    }
    if (entryBody) {
      entryBody.rest.push(line);
      continue;
    }
    if (line.indent === keyIndent) {
      const pair = splitKeyValue(line.text);
      if (!pair) return { kind: 'unreadable' };
      if (pair.key === 'insert') {
        insert = [];
        insertListIndent = keyIndent;
      } else if (keyIndent !== null) {
        // 元素的其他键（config/disabled/...）不在检查范围；其后更深行不归属任何区域，忽略
        return { kind: 'mapping', insert };
      }
    }
  }
  if (!finishEntry()) return { kind: 'unreadable' };
  return { kind: 'mapping', insert };
}

// 读整个 patch 文档 →
//   { form: 'array', items: readPatchItem 结果数组 }（空文档 = 空数组：插不进条目，交给引用检查）
//   { form: 'mapping', firstKey }（顶层映射 = 官方拒绝的旧形态）
//   { form: 'unreadable' }（混合/怪异缩进等块状方言读不出的形态）
function readPatchOverlay(patchText: string): PatchOverlay {
  const lines: PatchLine[] = patchText
    .split('\n')
    .map((raw) => ({ indent: raw.match(/^\s*/)![0].length, text: raw.trim() }))
    .filter((line) => line.text !== '' && !line.text.startsWith('#'));
  if (lines.length === 0) return { form: 'array', items: [] };
  const minIndent = Math.min(...lines.map((line) => line.indent));
  const shallow = lines.filter((line) => line.indent === minIndent);
  if (shallow.some((line) => !isDashLine(line))) {
    const keyLine = shallow.find((line) => !isDashLine(line))!;
    const first = splitKeyValue(keyLine.text);
    if (first && shallow.every((line) => !isDashLine(line))) {
      return { form: 'mapping', firstKey: first.key };
    }
    return { form: 'unreadable' };
  }
  const items: PatchItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indent !== minIndent) continue;
    const body: PatchLine[] = [];
    for (let j = i + 1; j < lines.length && lines[j].indent > minIndent; j++) body.push(lines[j]);
    items.push(readPatchItem(lines[i], body));
  }
  return { form: 'array', items };
}

// 要素 4：官方可解析的 PatchOptions[] 结构 + 引用名 = 包名。结构缺陷与引用缺陷不连带
// 重复计——结构坏时引用检查无从谈起，只报结构缺陷（与要素 2/3 的连带抑制同法）。
function collectPatchDefects(name: string, patchTarget: string, patchText: string): string[] {
  const defects: string[] = [];
  const overlay = readPatchOverlay(patchText);
  if (overlay.form === 'mapping') {
    defects.push(
      `${name}：patch 清单顶层须为 YAML 数组（官方 loader 只加载 loader patch 条目数组：` +
        `must be a top-level YAML array of loader patch entries）——实际是顶层映射（键 ${overlay.firstKey}）`,
    );
    return defects;
  }
  if (overlay.form === 'unreadable') {
    defects.push(
      `${name}：patch 清单无法按官方补丁形态解读（顶层须为 YAML 数组的 loader patch 条目；` +
        `本检查器读块状 YAML）——${patchTarget}`,
    );
    return defects;
  }
  let structureBroken = false;
  overlay.items.forEach((item, index) => {
    if (item.kind === 'scalar') {
      structureBroken = true;
      defects.push(
        `${name}：patch 清单第 ${index + 1} 项须为映射（loader patch 条目）——实际是标量或列表`,
      );
    } else if (item.kind === 'unreadable') {
      structureBroken = true;
      defects.push(
        `${name}：patch 清单第 ${index + 1} 项无法按官方补丁形态解读（元素须为键值映射）——${patchTarget}`,
      );
    } else {
      for (const entry of item.insert ?? []) {
        const missing = ['id', 'name'].filter((field) => !entry[field]);
        if (missing.length > 0) {
          structureBroken = true;
          defects.push(
            `${name}：patch 清单第 ${index + 1} 项的 insert 元素缺 ${missing.join(' 与 ')}` +
              `（EntryOptions 须 id + name：id 供运行时按 id 回路由，name 是被导入的模块说明符）` +
              `——元素（id: ${entry.id ?? '缺'}，name: ${entry.name ?? '缺'}）`,
          );
        }
      }
    }
  });
  if (!structureBroken) {
    const referenced = overlay.items.some((item) =>
      (item.insert ?? []).some((entry) => entry.name === name),
    );
    if (!referenced) {
      defects.push(
        `${name}：patch 清单未以包名引用自己（${patchTarget} 须有 insert 元素 name = ${name}）`,
      );
    }
  }
  return defects;
}

// 剥注释（字符串感知，票 20261115-e692 .ts 形态适配）：导出识别前先把行注释与块注释逐字符
// 换成空格（保留换行与字符位，防 token 粘连）。机制取舍：AST 解析需 typescript 依赖，而本
// 校验器被 verify-pack（发布对账）与测试直跑复用、scripts/ 零运行时依赖纪律（ADR
// 20261115-f143 零构建直跑）不可假设它——.ts 形态引入的真实噪声 = 文档注释天然引用导出名
// 与 type 声明形似导出，剥注释 + 既有词法锚定（export const/let/var/function）即可覆盖；
// 套件约定 ESM + 内联导出（见要素 5 头注），在此约定内正则匹配足够。
// 字符串感知：'…'、"…"、`…` 内的 // 与 /* 不开注释（插件模块日志串含 URL 属常态）；转义对
// （\\、\' 等）不终结字符串。已知边界：模板串按到闭反引号为止、不展开 ${} 内嵌引号——超出
// 套件插件模块形态（照抄 demo 即在此形态内），误判影响有界（漏认一个导出会被引用检查兜住）。
function stripComments(source: string): string {
  type State = 'code' | 'single' | 'double' | 'template' | 'line' | 'block';
  let state: State = 'code';
  let out = '';
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!;
    const next = source[i + 1] ?? '';
    if (state === 'code') {
      if (ch === '/' && next === '/') {
        state = 'line';
        out += '  ';
        i++;
        continue;
      }
      if (ch === '/' && next === '*') {
        state = 'block';
        out += '  ';
        i++;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') state = ch === "'" ? 'single' : ch === '"' ? 'double' : 'template';
      out += ch;
      continue;
    }
    if (state === 'single' || state === 'double' || state === 'template') {
      out += ch;
      if (ch === '\\') {
        out += next;
        i++;
        continue;
      }
      if ((state === 'single' && ch === "'") || (state === 'double' && ch === '"') || (state === 'template' && ch === '`')) {
        state = 'code';
      }
      continue;
    }
    if (state === 'line') {
      if (ch === '\n') {
        state = 'code';
        out += ch;
      } else {
        out += ' ';
      }
      continue;
    }
    // block：*/ 收口，其余逐字符空格化（换行保留）
    if (ch === '*' && next === '/') {
      state = 'code';
      out += '  ';
      i++;
    } else {
      out += ch === '\n' ? '\n' : ' ';
    }
  }
  return out;
}

export function collectBundleDefects(pluginDir: string): string[] {
  let pkg: PluginPackageJson;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(pluginDir, 'package.json'), 'utf8'));
  } catch (error) {
    return [`${pluginDir}：package.json 无法读取（${error.message}）`];
  }
  const name = pkg.name;
  const defects: string[] = [];

  if (!name) {
    defects.push(`${path.basename(pluginDir)}：package.json 缺 name——patch 引用名无从对账`);
  }

  // 要素 1：type 须为 module（§1.2 要素表第 1 行）
  if (pkg.type !== 'module') {
    defects.push(
      `${name ?? path.basename(pluginDir)}：package.json 缺 type: "module"——插件模块按 ESM 加载，CJS 形态宿主加载即抛错（实际：${pkg.type ?? '缺'}）`,
    );
  }

  // 要素 2：dsh.bundle.patch 声明。声明缺失时后续两查（files 含 patch、patch 引用名）
  // 无从定位 patch 文件，随要素 1 一并缺位，不再各自造一条连带缺陷。
  const patchDeclared = pkg.dsh?.bundle?.patch;
  const patchTarget =
    typeof patchDeclared === 'string' && patchDeclared !== '' ? normalizeEntry(patchDeclared) : null;
  if (!patchTarget) {
    defects.push(`${name ?? path.basename(pluginDir)}：package.json 缺 dsh.bundle.patch 声明——没有它装进 profile 只作普通依赖、不进插件树`);
  }

  // 要素 3：files 清单含 patch 文件
  if (patchTarget) {
    const files = Array.isArray(pkg.files) ? pkg.files.map(normalizeEntry) : null;
    if (!files) {
      defects.push(`${name}：package.json 缺 files 清单——patch 文件不会随包分发`);
    } else if (!files.includes(patchTarget)) {
      defects.push(`${name}：files 清单缺 ${patchTarget}——npm 白名单外文件不随包分发，装出去的包没有清单`);
    }
  }

  // 要素 4：patch 清单为官方 loader 可解析的 PatchOptions[]，且引用名 = 包名
  if (patchTarget && name) {
    let patchText;
    try {
      patchText = fs.readFileSync(path.join(pluginDir, patchTarget), 'utf8');
    } catch (error) {
      defects.push(`${name}：patch 文件读不到（${patchTarget}，${error.message}）`);
    }
    if (patchText !== undefined) {
      defects.push(...collectPatchDefects(name, patchTarget, patchText));
    }
  }

  // 要素 5：插件模块导出 name 与 apply(ctx)
  const mainEntry =
    typeof pkg.main === 'string' && pkg.main !== '' ? normalizeEntry(pkg.main) : null;
  if (!mainEntry) {
    defects.push(`${name ?? path.basename(pluginDir)}：package.json 缺 main——无法定位插件模块入口`);
  } else {
    let source;
    try {
      source = fs.readFileSync(path.join(pluginDir, mainEntry), 'utf8');
    } catch (error) {
      defects.push(`${name ?? path.basename(pluginDir)}：插件模块文件读不到（${mainEntry}，${error.message}）`);
    }
    if (source !== undefined) {
      // 导出识别在剥注释后的文本上做（.ts 形态适配，票 20261115-e692）：注释字样不算导出
      const stripped = stripComments(source);
      if (!/\bexport\s+(?:const|let|var)\s+name\b/.test(stripped)) {
        defects.push(`${name ?? path.basename(pluginDir)}：插件模块（${mainEntry}）未导出 name`);
      }
      if (!/\bexport\s+(?:(?:async\s+)?function|(?:const|let|var))\s+apply\b/.test(stripped)) {
        defects.push(`${name ?? path.basename(pluginDir)}：插件模块（${mainEntry}）未导出 apply(ctx)`);
      }
    }
  }

  return defects;
}

function runCli(args: string[]): number {
  if (args.length === 0) {
    console.error('用法：node scripts/verify-bundle.ts <插件包目录>...');
    return 1;
  }
  let failed = 0;
  for (const dir of args) {
    const defects = collectBundleDefects(dir);
    if (defects.length > 0) {
      failed += 1;
      console.error(`✗ bundle 校验不过：${dir}`);
      for (const defect of defects) console.error(`  - ${defect}`);
    } else {
      console.log(`✓ bundle 校验通过（四要素齐备）：${dir}`);
    }
  }
  return failed > 0 ? 1 : 0;
}

const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === thisFile;
if (invokedDirectly) {
  process.exit(runCli(process.argv.slice(2)));
}
