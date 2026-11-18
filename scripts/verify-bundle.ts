#!/usr/bin/env node
// 插件包 bundle 清单校验器（spec 20261115-495e FR-2，规范文档 docs/plugin-assets.md §1.2/§1.4；
// 双态口径归 spec 20261115-ed9f 插件预编译契约，票 20261115-cf39；客户端载体三查归
// spec 20261118-0de6 FR-7 五查扩展，票 20261118-7504）。
// 接口窄：进插件包目录（源码态）或发布 tarball（发布态），出缺陷清单（空 = 通过）。
//
// 源码态（collectBundleDefects，仓库插件目录）——核对 §1.2 清单四要素与 §1.4 两项附录：
//   1. package.json type: "module"（要素表第 1 行：插件模块按 ESM 加载，CJS 形态宿主加载即抛错）；
//   2. package.json 声明 dsh.bundle.patch（缺它装进 profile 只作普通依赖、不进插件树，need F1）；
//   3. files 清单含 patch 文件（npm 白名单外文件不随包分发，清单缺文件 = 装出去的包坏）；
//   4. patch 清单为官方 loader 可解析的 PatchOptions[]（要素表第 4 行「以包名引用自己」的官方
//      形态，ticket 20261115-f158 取证：顶层须 YAML 数组、元素须映射、insert 元素须 id + name、
//      引用名 = 包名）；
//   5. 插件模块导出 name 与 apply(ctx)（§1.4 附录二；main 直指模块作为定位入口随查；main 允许
//      .ts 形态——源码态语义映射：仓库声明 index.ts，发布打包时由包内 prepack 换载为编译产物
//      index.js（FR-7 回退，spec 20261115-ed9f），故 .ts main 在源码态合法；.js main 亦合法
//      （换载后目录态）。静态读源码，套件约定 ESM + 内联导出，照抄 demo 即在此形态内。
//      导出识别在剥注释后的文本上做：.ts 文档注释天然引用导出名、type 声明形似导出，裸正则
//      会误放行幽灵导出）。
//   6–8. 客户端载体三查（有 dsh.client 声明的包）：dsh.client 声明 ⇔ exports["./client"] ⇔
//      files 含 client 源码目录三元组一致 + 形态逐字段镜像官方 parseDshClient/clientExportOf
//      （dsh-client-modules@0.2.2-rc.4 一手来源，票 20261118-7504 Progress 留痕）；无声明包
//      三查全跳（纯 Host 插件合法）。源码态不查产物本体——零构建纪律，client.js 只存在于
//      发布面；源码态查 client/ 源码目录在盘且在 files（包内 prepack 构建输入契约）。
//
// 发布态（collectPublishedBundleDefects / collectTarballBundleDefects，插件包自有 registry
// tarball——dsh 官方命令安装的消费者拿到的就是它）——FR-7 证伪定案（node 拒载 node_modules 下
// .ts，ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING 无旗标逃生，证伪报告
// docs/research/dsh-ts-loading/fr7-dsh-ts-loading-falsification.md）后发布面必须 .js 形态：
//   1–5. 四要素语义同源码态（模块从 .js 编译产物解析导出）；
//   6. main 须指 .js（main 指 .ts 即 FR-7 证伪形态，缺陷引用证伪报告）；
//   7. files 白名单须含编译产物（main 入口）；
//   8. 目录内无 .ts 源码残留（spec 预编译契约：发布 tarball 不含 .ts）。
//   9–11. 客户端载体三查语义同源码态，files 查换为产物本体：exports 路径在 files 清单且
//      client bundle 文件在包内（pack 对缺盘文件只 warn 不报错，声明了产物而包内缺文件 =
//      装出去官方启动即抛 missing bundle composition error）。
// tarball 入口按 pnpm/npm pack 产物 package/ 单包布局解包后走目录口径。
//
// scripts/verify-pack.ts 的插件侧复用源码态实现（根初始化器包内嵌插件目录 = 编目数据，
// 源码态语义；发布态口径供插件包 publish 面把关）。独立调用：
//
//   node scripts/verify-bundle.ts <插件包目录>...          # 源码态
//   node scripts/verify-bundle.ts --tarball <tarball>...   # 发布态

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 被校验插件包 package.json 的清单切片（四要素 + 客户端载体相关字段；其余键不进核对范围）。
interface PluginPackageJson {
  name?: string;
  type?: string;
  files?: string[];
  main?: string;
  exports?: Record<string, unknown>;
  dsh?: { bundle?: { patch?: string }; client?: unknown };
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

// ---------- 客户端载体三查（spec 20261118-0de6 FR-7 五查扩展，票 20261118-7504） ----------
//
// 契约一手来源（探针留痕工票 Progress）：dsh-client-modules@0.2.2-rc.4 lib/client.js 的
// parseDshClient（声明形态校验）与 lib/index.js 的 clientExportOf（导出解析）+ node 半区扫描
// （decl === undefined || decl.platform !== 'web' 即跳过；声明无导出 → 官方启动抛 composition
// error「declares dsh.client but exports no "./client" bundle」，fiber FAILED）。两函数逐形态
// 镜像官方：替身契约照真实签名（first-party-api-probing 纪律）。
//
// 三元组一致性 = 三查的判定骨架：dsh.client 声明 ⇔ exports["./client"] ⇔ files 含 client 面。
// 任一在而其余缺即缺陷（声明无导出 = 官方启动失败；导出无声明 = 官方扫描不认的半配置面）；
// 全部缺席 = 无客户端面的纯 Host 插件（dsh-demo 形态，合法）。
// files 查按态分派：源码态 = client 源码目录（suite 客户端面布局约定 = 包内 prepack 构建输入
// 契约）；发布态 = exports 指向的产物文件本体随包（清单声明了产物而 tarball 缺文件 = 装出去
// 官方启动即抛 missing bundle）。

// 源码态客户端面源码目录（suite 布局约定：agents/<宿主>/plugins/<包>/client/index.ts，
// 包内 prepack 客户端面编译的单入口；拆多文件须先扩发布面，见各包 prepack）
const CLIENT_SOURCE_DIR = 'client';

// 官方 parseDshClient 逐形态镜像（lib/client.js 一手来源；错误文案保留官方原文关键段）：
// dsh.client 须对象；platform 须字符串；inject/external 存在须字符串数组；immediately
// 存在须布尔。platform 非 web 不判缺陷——官方 node 半区扫描只把 platform==='web' 进表，
// 非 web 是惰性声明（官方语义：形态合法即可，进不进表归官方）。
function collectClientDeclarationDefects(displayName: string, decl: unknown): string[] {
  const defects: string[] = [];
  if (typeof decl !== 'object' || decl === null || Array.isArray(decl)) {
    defects.push(
      `${displayName}：dsh.client 声明须为对象（官方 parseDshClient：非对象声明官方启动即抛）——实际：${JSON.stringify(decl)}`,
    );
    return defects;
  }
  const declaration = decl as Record<string, unknown>;
  if (typeof declaration.platform !== 'string') {
    defects.push(
      `${displayName}：dsh.client.platform 须为字符串（官方 parseDshClient：dsh.client.platform must be a string）——实际：${JSON.stringify(declaration.platform)}`,
    );
  }
  for (const field of ['inject', 'external'] as const) {
    const value = declaration[field];
    if (value !== undefined && (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))) {
      defects.push(
        `${displayName}：dsh.client.${field} 须为字符串数组（官方 parseDshClient：dsh.client.${field} must be a string array）——实际：${JSON.stringify(value)}`,
      );
    }
  }
  if (declaration.immediately !== undefined && typeof declaration.immediately !== 'boolean') {
    defects.push(
      `${displayName}：dsh.client.immediately 须为布尔（官方 parseDshClient：dsh.client.immediately must be a boolean）——实际：${JSON.stringify(declaration.immediately)}`,
    );
  }
  return defects;
}

// 官方 clientExportOf 逐形态镜像（lib/index.js 一手来源）：exports 须对象；exports["./client"]
// 接受字符串或含字符串 default 的对象，归一为相对路径。返回 { path } 或 { defect }。
function clientExportPath(
  displayName: string,
  exportsField: unknown,
): { path?: string; defect?: string } {
  if (typeof exportsField !== 'object' || exportsField === null || Array.isArray(exportsField)) {
    // 官方 clientExportOf 对非对象 exports 返回 undefined（→ 扫描报声明无导出），不另抛——
    // 镜像同语义：无导出可用，交由三查的声明侧缺陷承担
    return {};
  }
  const client = (exportsField as Record<string, unknown>)['./client'];
  if (client === undefined) return {};
  if (typeof client === 'string') return { path: client };
  if (typeof client === 'object' && client !== null) {
    const fallback = (client as Record<string, unknown>).default;
    if (typeof fallback === 'string') return { path: fallback };
  }
  return {
    defect:
      `${displayName}：exports["./client"] 须为字符串或含字符串 default 的对象（官方 clientExportOf：` +
      `must be a string or an object with a string default）——实际：${JSON.stringify(client)}`,
  };
}

// 客户端载体三查主体。双态差异只在 files 查：源码态查 client 源码目录（目录在盘且在 files
// 清单），发布态查产物文件（exports 路径在 files 清单且文件在盘——pack 对 files 清单里缺盘
// 的文件只 warn 不报错，声明了产物而包内缺文件 = 装出去官方启动即抛，必须在发布面拦下）。
function collectClientDefects(
  displayName: string,
  name: string | undefined,
  pluginDir: string,
  pkg: PluginPackageJson,
  files: string[] | null,
  published: boolean,
): string[] {
  const defects: string[] = [];
  const clientDeclared = pkg.dsh?.client !== undefined;
  if (clientDeclared) {
    defects.push(...collectClientDeclarationDefects(displayName, pkg.dsh?.client));
  }

  const exportResolved = clientExportPath(displayName, pkg.exports);
  if (exportResolved.defect !== undefined) {
    defects.push(exportResolved.defect);
  }
  const clientArtifact =
    typeof exportResolved.path === 'string' && exportResolved.path !== ''
      ? normalizeEntry(exportResolved.path)
      : null;

  // 一致性查（连带抑制同要素 2/3/4 先例：形态坏时对端无从谈一致，各自缺陷已列，不再叠报）
  if (clientDeclared && clientArtifact === null && exportResolved.defect === undefined) {
    defects.push(
      `${displayName}：package.json 声明了 dsh.client 但 exports 无 "./client" 导出` +
        `（官方扫描：declares dsh.client but exports no "./client" bundle——composition error，` +
        `官方启动即抛且 fiber FAILED）`,
    );
  }
  if (!clientDeclared && clientArtifact !== null) {
    defects.push(
      `${displayName}：package.json 有 exports["./client"] 导出但缺 dsh.client 声明` +
        `（官方扫描只认 dsh.client 声明包——半配置面：导出永远不被分发，客户端路由表不进）`,
    );
  }

  if (clientDeclared && clientArtifact !== null && name) {
    if (published) {
      if (!files) {
        defects.push(`${name}：package.json 缺 files 清单——客户端产物不会随包分发`);
      } else if (!files.includes(clientArtifact)) {
        defects.push(
          `${name}：files 清单缺客户端产物 ${clientArtifact}——白名单外文件不随包分发，` +
            `装出去的包缺 bundle（官方启动即抛 composition error）`,
        );
      }
      let bundleReadable = false;
      try {
        bundleReadable = fs.statSync(path.join(pluginDir, clientArtifact)).isFile();
      } catch {
        bundleReadable = false;
      }
      if (!bundleReadable) {
        defects.push(
          `${name}：客户端产物文件读不到（${clientArtifact}）——发布 tarball 缺 bundle 本体，` +
            `官方启动即抛 missing bundle composition error`,
        );
      }
    } else {
      // 源码态：files 查 = client 源码目录（suite 布局约定 = 包内 prepack 构建输入契约；
      // 产物 client.js 在源码树常态不存在——零构建纪律，发布态才查产物本体）
      if (!files) {
        defects.push(`${name}：package.json 缺 files 清单——客户端面源码目录不在分发清单`);
      } else if (!files.includes(CLIENT_SOURCE_DIR)) {
        defects.push(
          `${name}：files 清单缺客户端面源码目录 ${CLIENT_SOURCE_DIR}——` +
            `声明了 dsh.client 而客户端源码不入包清单（构建输入缺位）`,
        );
      }
      let sourceDirReadable = false;
      try {
        sourceDirReadable = fs.statSync(path.join(pluginDir, CLIENT_SOURCE_DIR)).isDirectory();
      } catch {
        sourceDirReadable = false;
      }
      if (!sourceDirReadable) {
        defects.push(
          `${name}：客户端面源码目录读不到（${CLIENT_SOURCE_DIR}/）——声明了 dsh.client 而` +
            `客户端源码缺盘，包内 prepack 客户端面编译无从进行`,
        );
      }
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
// 套件插件模块形态（照抄 demo 即在此形态内）。误判两方向均有界：漏认方向 = 校验器误报未导出
// （fail-loud 有界）；漏剥方向 = 静默放行，由宿主真实加载链兜底（集成承载票 20261115-13c4）。
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

export { stripComments };

// 源码态口径：仓库插件目录（main 允许 .ts——语义映射到发布态 index.js，见文件头注 5）
export function collectBundleDefects(pluginDir: string): string[] {
  return collectBundleDefectsFor(pluginDir, false);
}

// 发布态口径：插件包自有 registry tarball 解包后的目录（或等价发布态目录）。
// FR-7 回退后发布面必须 .js 形态：main 指 .js、files 含编译产物、无 .ts 源码。
export function collectPublishedBundleDefects(pluginDir: string): string[] {
  return collectBundleDefectsFor(pluginDir, true);
}

// 发布态 tarball 入口：pnpm/npm pack 产物 package/ 单包布局，解包到临时目录后走发布态目录口径。
export function collectTarballBundleDefects(tarballPath: string): string[] {
  if (!fs.existsSync(tarballPath)) {
    return [`tarball 不存在：${tarballPath}`];
  }
  const list = spawnSync('tar', ['-tzf', tarballPath], { encoding: 'utf8' });
  if (list.status !== 0) {
    return [`tarball 无法读取（${tarballPath}，${(list.stderr ?? '').trim()}）`];
  }
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-bundle-tarball-'));
  try {
    const extract = spawnSync('tar', ['-xzf', tarballPath, '-C', workDir], { encoding: 'utf8' });
    if (extract.status !== 0) {
      return [`tarball 解包失败（${tarballPath}，${(extract.stderr ?? '').trim()}）`];
    }
    const packageDir = path.join(workDir, 'package');
    if (!fs.existsSync(packageDir)) {
      return [`tarball 缺 package/ 目录（非 pack 产物布局）——${tarballPath}`];
    }
    return collectPublishedBundleDefects(packageDir);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

// 双态判定单点：published = false 源码态 / true 发布态。两态差异只在 main 形态要求
// （发布态须 .js）、files 含编译产物与 .ts 残留禁入三项；四要素语义两态同源。
function collectBundleDefectsFor(pluginDir: string, published: boolean): string[] {
  let pkg: PluginPackageJson;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(pluginDir, 'package.json'), 'utf8'));
  } catch (error) {
    return [`${pluginDir}：package.json 无法读取（${error.message}）`];
  }
  const name = pkg.name;
  const displayName = name ?? path.basename(pluginDir);
  const defects: string[] = [];

  if (!name) {
    defects.push(`${displayName}：package.json 缺 name——patch 引用名无从对账`);
  }

  // 要素 1：type 须为 module（§1.2 要素表第 1 行；两态同查）
  if (pkg.type !== 'module') {
    defects.push(
      `${displayName}：package.json 缺 type: "module"——插件模块按 ESM 加载，CJS 形态宿主加载即抛错（实际：${pkg.type ?? '缺'}）`,
    );
  }

  // 要素 2：dsh.bundle.patch 声明。声明缺失时后续两查（files 含 patch、patch 引用名）
  // 无从定位 patch 文件，随要素 1 一并缺位，不再各自造一条连带缺陷。
  const patchDeclared = pkg.dsh?.bundle?.patch;
  const patchTarget =
    typeof patchDeclared === 'string' && patchDeclared !== '' ? normalizeEntry(patchDeclared) : null;
  if (!patchTarget) {
    defects.push(`${displayName}：package.json 缺 dsh.bundle.patch 声明——没有它装进 profile 只作普通依赖、不进插件树`);
  }

  // 要素 3：files 清单含 patch 文件
  const files = Array.isArray(pkg.files) ? pkg.files.map(normalizeEntry) : null;
  if (patchTarget) {
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

  // 要素 5：插件模块导出 name 与 apply(ctx)。源码态 main 允许 .ts（语义映射）；发布态
  // 须 .js——FR-7 证伪定案：node 对 node_modules 下 .ts 一律拒绝剥类型，.ts 主入口的
  // 发布包装进 profile 后宿主必拒载。
  const mainEntry =
    typeof pkg.main === 'string' && pkg.main !== '' ? normalizeEntry(pkg.main) : null;
  if (!mainEntry) {
    defects.push(`${displayName}：package.json 缺 main——无法定位插件模块入口`);
  } else {
    if (published && !mainEntry.endsWith('.js')) {
      defects.push(
        `${displayName}：发布态 main 须指编译产物 .js——main 指 .ts 是 FR-7 证伪形态` +
          `（node 拒载 node_modules 下 .ts：ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING，无旗标逃生；` +
          `见 docs/research/dsh-ts-loading/fr7-dsh-ts-loading-falsification.md）——实际：${mainEntry}`,
      );
    }
    if (published && files && !files.includes(mainEntry)) {
      defects.push(
        `${name}：发布态 files 清单缺编译产物 ${mainEntry}——白名单外文件不随包分发，装出去的包没有入口`,
      );
    }
    let source;
    try {
      source = fs.readFileSync(path.join(pluginDir, mainEntry), 'utf8');
    } catch (error) {
      defects.push(`${displayName}：插件模块文件读不到（${mainEntry}，${error.message}）`);
    }
    if (source !== undefined) {
      // 导出识别在剥注释后的文本上做（.ts 形态适配，票 20261115-e692）：注释字样不算导出
      const stripped = stripComments(source);
      if (!/\bexport\s+(?:const|let|var)\s+name\b/.test(stripped)) {
        defects.push(`${displayName}：插件模块（${mainEntry}）未导出 name`);
      }
      if (!/\bexport\s+(?:(?:async\s+)?function|(?:const|let|var))\s+apply\b/.test(stripped)) {
        defects.push(`${displayName}：插件模块（${mainEntry}）未导出 apply(ctx)`);
      }
    }
  }

  // 发布态 8：目录内无 .ts 源码残留（spec 预编译契约：发布 tarball 不含 .ts）。
  // 解包目录无 node_modules（pack 永不卷入），全树扫描。
  if (published) {
    const tsFiles: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (full.endsWith('.ts')) tsFiles.push(path.relative(pluginDir, full));
      }
    };
    walk(pluginDir);
    for (const tsFile of tsFiles.sort()) {
      defects.push(
        `${displayName}：发布态目录残留 .ts 源码 ${tsFile}（spec 预编译契约：发布 tarball 不含 .ts）`,
      );
    }
  }

  // 五查扩展（spec 20261118-0de6 FR-7，票 20261118-7504）：客户端载体三查——dsh.client 声明
  // ⇔ exports["./client"] ⇔ files 含 client 面，三元组一致性 + 形态镜像官方校验器。
  defects.push(...collectClientDefects(displayName, name, pluginDir, pkg, files, published));

  return defects;
}

function runCli(args: string[]): number {
  // 发布态模式：--tarball 后接插件包自有 tarball（pnpm pack 产物）
  if (args[0] === '--tarball') {
    const tarballs = args.slice(1);
    if (tarballs.length === 0) {
      console.error('用法：node scripts/verify-bundle.ts --tarball <插件包 tarball>...');
      return 1;
    }
    let failed = 0;
    for (const tarball of tarballs) {
      const defects = collectTarballBundleDefects(tarball);
      if (defects.length > 0) {
        failed += 1;
        console.error(`✗ 发布态 tarball 校验不过：${tarball}`);
        for (const defect of defects) console.error(`  - ${defect}`);
      } else {
        console.log(`✓ 发布态校验通过（.js 形态、四要素齐备、无 .ts 源码、客户端载体三查过）：${tarball}`);
      }
    }
    return failed > 0 ? 1 : 0;
  }
  if (args.length === 0) {
    console.error('用法：node scripts/verify-bundle.ts <插件包目录>...（源码态）');
    console.error('      node scripts/verify-bundle.ts --tarball <插件包 tarball>...（发布态）');
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
      console.log(`✓ bundle 校验通过（四要素齐备，客户端载体三查过或有声明即齐备）：${dir}`);
    }
  }
  return failed > 0 ? 1 : 0;
}

const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === thisFile;
if (invokedDirectly) {
  process.exit(runCli(process.argv.slice(2)));
}
