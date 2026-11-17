// CI 回归门 workflow 的静态校验（spec 20261115-f650 测试决策 seam ②，FR-2 工单级；
// pnpm 迁移随 spec 20261115-ed9f FR-4 更新契约——依赖安装步换 pnpm）。
// seam = .github/workflows/regression-gate.yml 文件本身——声明式工件的外部可观察面，
// 断言只打在文件解析后的结构与原文上，不执行任何步骤。
// 期望值全部来自 spec CI workflow 契约字面（触发 push+pull_request、node 24 经 .nvmrc、
// 步骤链 checkout → node setup → 依赖安装 → tsc --noEmit → 全量测试 → verify:pack、
// 无 secrets 键），不从实现推导。
// 步骤链 checkout → node setup → corepack enable → 依赖安装 → tsc --noEmit → 全量测试
// → verify:pack（corepack enable 见票 20261116-c5f5）。
// pnpm 契约（spec 20261115-ed9f，RQ2 方案）：依赖安装 = pnpm install --frozen-lockfile
// （显式传参留痕——CI 本就自动 frozen；incompatible lockfile / pnpm-lock.yaml 漏提交
// 直接红，RQ2 异常流 A #6 的正确红）；pnpm 版本两处钉——全局安装步钉主版本 12（仅供
// setup-node cache 取版哈希；dsh 集成测试转发由 corepack shim 承担，票 20261116-c5f5），
// packageManager 字段钉精确版 12.15.0（lockfile
// packageManagerDependencies 记账，frozen 安装强制对齐）；setup-node 缓存随 pnpm
// lockfile（cache: pnpm），故全局 pnpm 安装步须先于 setup-node。
// 解析防线两层（票 20261116-0304 后并陈）：① js-yaml（devDep，仅测试面）承「严格可
// 解析」真解析器防线——内置子集解析器的 KEY_RE 不校验平纯标量冒号空格（4de56c7 步名
// 「cache: pnpm」漏入致 GitHub 0s startup failure 的缺口），由真解析器封死；② 本文件
// 内置的 YAML 子集解析器（块映射 / 块序列 / 字面块标量 / flow 序列 / 全行注释）承结构
// 契约断言（步骤链、secrets 遍历等），解析失败带行号显式报错（坏缩进、tab、非 key 行
// 都拒绝）。
// 环境缺失处置的取证口径：dsh 集成测试自带前置门（node/registry 不满足显式 skip 报因，
// 见 test/e2e/dsh-plugin-integration.test.ts）；交互 e2e 的 expect 缺失时红（runInteractive
// throw，非假绿）——workflow 内显式 apt 安装 expect 使交互段真跑（design 定夺：装了就真跑，
// runner 镜像不保证预装 expect）。
// 评审加固项同为 seam 契约：actions 钉完整 commit SHA（可变 tag 非供应链信任锚）、
// verify 步骤 shell: bash（-eo pipefail，pnpm pack 失败不被 tail 掩码）、解析器拒重复键
// 与非法块标量缩进（坏点一律带行号显式报错）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load as loadYaml } from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW_REL = path.join('.github', 'workflows', 'regression-gate.yml');
const WORKFLOW_PATH = path.join(packageRoot, WORKFLOW_REL);

type YamlNode = string | number | boolean | null | YamlNode[] | { [key: string]: YamlNode };

function isMapping(value: YamlNode): value is { [key: string]: YamlNode } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface Line {
  indent: number;
  text: string; // 去缩进后的原文（注释行与空行保留标记，解析时跳过）
  lineNo: number;
}

function scanLines(raw: string): Line[] {
  return raw.split('\n').map((line, i) => {
    const withoutCR = line.replace(/\r$/, '');
    const tabAt = withoutCR.search(/[\t]/);
    if (/^[\t ]*\t/.test(withoutCR)) {
      throw new Error(`YAML 解析失败（第 ${i + 1} 行）：缩进含 tab——YAML 缩进只允许空格`);
    }
    if (tabAt !== -1 && tabAt < withoutCR.search(/\S/) && withoutCR.trim() !== '') {
      throw new Error(`YAML 解析失败（第 ${i + 1} 行）：缩进含 tab`);
    }
    const indent = withoutCR.length - withoutCR.trimStart().length;
    return { indent, text: withoutCR.trim(), lineNo: i + 1 };
  });
}

function skipIgnorable(lines: Line[], idx: number): number {
  while (idx < lines.length && (lines[idx].text === '' || lines[idx].text.startsWith('#'))) {
    idx += 1;
  }
  return idx;
}

const KEY_RE = /^([A-Za-z0-9_.-]+):(?:[ \t]+(.*))?$/;

// 解析标量：全引号剥引号、flow 序列拆元素，其余按原文（本文件断言需要的都是字符串）
function parseScalar(rawText: string, lineNo: number): YamlNode {
  const text = rawText.trim();
  if (text === '') return null;
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((item) => {
      const v = item.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        return v.slice(1, -1);
      }
      return v;
    });
  }
  if (
    (text.startsWith('"') && text.endsWith('"') && text.length >= 2) ||
    (text.startsWith("'") && text.endsWith("'") && text.length >= 2)
  ) {
    return text.slice(1, -1);
  }
  if (text.startsWith('#')) {
    throw new Error(`YAML 解析失败（第 ${lineNo} 行）：值缺失`);
  }
  return text;
}

// 字面块标量：吞掉所有缩进更深的后续行（原样保留），遇到缩进 <= 键缩进即止。
// 内容基线 = 首个非空内容行的缩进——合法 YAML 只要求内容深于键缩进，不固定「键 +2」；
// 基线定后出现更浅（但仍深于键缩进）的行，相对缩进为负：显式抛带行号解析错误，
// 不让 RangeError 裸奔，也不误伤合法的浅缩进块。
function consumeBlockScalar(lines: Line[], idx: number, baseIndent: number): [string, number] {
  const parts: string[] = [];
  let contentIndent = -1;
  let i = idx;
  while (i < lines.length) {
    const line = lines[i];
    if (line.text === '') {
      parts.push('');
      i += 1;
      continue;
    }
    if (line.indent <= baseIndent) break;
    if (contentIndent === -1) {
      contentIndent = line.indent;
    } else if (line.indent < contentIndent) {
      throw new Error(
        `YAML 解析失败（第 ${line.lineNo} 行）：块标量内容缩进浅于内容基线（${line.indent} < ${contentIndent}）但深于键缩进——缩进不一致，拒绝解析`
      );
    }
    parts.push(' '.repeat(line.indent - contentIndent) + line.text);
    i += 1;
  }
  return [parts.join('\n'), i];
}

function parseStructure(lines: Line[], idx: number, indent: number): [YamlNode, number] {
  idx = skipIgnorable(lines, idx);
  if (idx >= lines.length || lines[idx].indent < indent) return [null, idx];
  if (lines[idx].indent > indent) {
    throw new Error(`YAML 解析失败（第 ${lines[idx].lineNo} 行）：缩进深度超出当前层（${lines[idx].indent} > ${indent}）`);
  }
  if (lines[idx].text.startsWith('- ') || lines[idx].text === '-') {
    return parseSequence(lines, idx, indent);
  }
  return parseMapping(lines, idx, indent);
}

function parseSequence(lines: Line[], idx: number, indent: number): [YamlNode, number] {
  const items: YamlNode[] = [];
  while (true) {
    idx = skipIgnorable(lines, idx);
    if (idx >= lines.length || lines[idx].indent < indent) break;
    if (lines[idx].indent > indent) {
      throw new Error(`YAML 解析失败（第 ${lines[idx].lineNo} 行）：序列项缩进不齐`);
    }
    if (!(lines[idx].text.startsWith('- ') || lines[idx].text === '-')) break;
    if (lines[idx].text === '-') {
      // 项内容在后续更深层
      const [value, next] = parseStructure(lines, idx + 1, indent + 2);
      items.push(value);
      idx = next;
      continue;
    }
    // 把 "- " 视作两列缩进，项内容以 mapping/标量从 indent+2 起解析
    const itemLine: Line = { indent: indent + 2, text: lines[idx].text.slice(2), lineNo: lines[idx].lineNo };
    const withReplaced = lines.slice();
    withReplaced[idx] = itemLine;
    const itemText = itemLine.text;
    if (KEY_RE.test(itemText) && !itemText.includes('|')) {
      const [value, next] = parseMapping(withReplaced, idx, indent + 2);
      items.push(value);
      idx = next;
    } else {
      const [value, next] = parseStructure(withReplaced, idx, indent + 2);
      items.push(value);
      idx = next;
    }
  }
  return [items, idx];
}

function parseMapping(lines: Line[], idx: number, indent: number): [YamlNode, number] {
  const result: { [key: string]: YamlNode } = {};
  while (true) {
    idx = skipIgnorable(lines, idx);
    if (idx >= lines.length || lines[idx].indent < indent) break;
    if (lines[idx].indent > indent) {
      throw new Error(`YAML 解析失败（第 ${lines[idx].lineNo} 行）：映射内缩进深度超出当前层`);
    }
    const line = lines[idx];
    if (line.text.startsWith('- ')) break;
    const match = KEY_RE.exec(line.text);
    if (!match) {
      throw new Error(`YAML 解析失败（第 ${line.lineNo} 行）：非 "key: value" 行落在映射层——${line.text.slice(0, 40)}`);
    }
    const key = match[1];
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      throw new Error(
        `YAML 解析失败（第 ${line.lineNo} 行）：映射出现重复键 "${key}"——重复键被静默覆盖即盲区，解析即拒`
      );
    }
    const rawValue = match[2] ?? '';
    if (rawValue === '|' || rawValue === '|-' || rawValue === '>') {
      const [block, next] = consumeBlockScalar(lines, idx + 1, indent);
      result[key] = block;
      idx = next;
      continue;
    }
    if (rawValue === '') {
      // 空值：下一结构行更深 → 嵌套结构；否则 null
      const probe = skipIgnorable(lines, idx + 1);
      if (probe < lines.length && lines[probe].indent > indent) {
        const [nested, next] = parseStructure(lines, probe, lines[probe].indent);
        result[key] = nested;
        idx = next;
        continue;
      }
      result[key] = null;
      idx += 1;
      continue;
    }
    result[key] = parseScalar(rawValue, line.lineNo);
    idx += 1;
  }
  return [result, idx];
}

function parseWorkflowYaml(raw: string): YamlNode {
  const lines = scanLines(raw);
  const [doc, idx] = parseStructure(lines, 0, 0);
  const rest = skipIgnorable(lines, idx);
  if (rest < lines.length) {
    throw new Error(`YAML 解析失败（第 ${lines[rest].lineNo} 行）：顶层结构后仍有未归属内容`);
  }
  return doc;
}

interface Step {
  name: string;
  uses?: string;
  shell?: string;
  run?: string;
  with: Record<string, string>;
}

function readWorkflowDoc(): YamlNode {
  if (!fs.existsSync(WORKFLOW_PATH)) {
    throw new Error(`workflow 文件缺失：${WORKFLOW_REL}（行为未实现）`);
  }
  return parseWorkflowYaml(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
}

function readWorkflowSteps(doc: YamlNode): Step[] {
  assert.ok(isMapping(doc), 'workflow 顶层须是映射');
  const jobs = doc['jobs'];
  assert.ok(isMapping(jobs), 'jobs 须是映射');
  const jobNames = Object.keys(jobs);
  assert.equal(jobNames.length, 1, `回归门为单 job 运行时，实际 jobs：${jobNames.join('、')}`);
  const job = jobs[jobNames[0]];
  assert.ok(isMapping(job), 'job 定义须是映射');
  const steps = job['steps'];
  assert.ok(Array.isArray(steps) && steps.every(isMapping), `steps 须是映射序列，实际：${JSON.stringify(steps)}`);
  return steps.map((step) => {
    const withRaw = step['with'];
    const withMap: Record<string, string> = {};
    if (isMapping(withRaw)) {
      for (const [k, v] of Object.entries(withRaw)) withMap[k] = String(v);
    }
    return {
      name: String(step['name'] ?? ''),
      uses: step['uses'] === undefined ? undefined : String(step['uses']),
      shell: step['shell'] === undefined ? undefined : String(step['shell']),
      run: step['run'] === undefined ? undefined : String(step['run']),
      with: withMap,
    };
  });
}

test('workflow 文件存在且 YAML 可解析（坏点报行号）', () => {
  const doc = readWorkflowDoc();
  assert.ok(isMapping(doc), 'workflow 解析结果须是顶层映射');
});

test('触发同时声明 push 与 pull_request', () => {
  const doc = readWorkflowDoc();
  assert.ok(isMapping(doc), 'workflow 顶层须是映射');
  const on = doc['on'];
  assert.ok(isMapping(on), `on 触发器须是映射（含 push/pull_request 键），实际：${JSON.stringify(on)}`);
  for (const trigger of ['push', 'pull_request']) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(on, trigger),
      `触发器缺 ${trigger}——spec 契约要求 push 与 pull_request 同时在位`
    );
  }
});

test('node 24 取版声明在位：setup-node 读 .nvmrc，且 .nvmrc 钉住 node 24 主版本', () => {
  const doc = readWorkflowDoc();
  const steps = readWorkflowSteps(doc);
  const setup = steps.find((s) => typeof s.uses === 'string' && s.uses.startsWith('actions/setup-node@'));
  assert.ok(setup, '缺 actions/setup-node 步骤——runner 取版无承载');
  assert.equal(
    setup.with['node-version-file'],
    '.nvmrc',
    `setup-node 须以 node-version-file: .nvmrc 取版（版本不可用时该步骤原生显式失败），实际 with：${JSON.stringify(setup.with)}`
  );
  const nvmrc = fs.readFileSync(path.join(packageRoot, '.nvmrc'), 'utf8').trim();
  assert.match(nvmrc, /^24\./, `.nvmrc 须钉住 node 24 主版本（spec：node 24），实际：${nvmrc}`);
  assert.equal(
    setup.with['cache'],
    'pnpm',
    `setup-node 缓存须随 pnpm lockfile（cache: pnpm）——依赖管理已迁 pnpm（spec 20261115-ed9f FR-4），npm 缓存无 lockfile 可依，实际 with：${JSON.stringify(setup.with)}`
  );
});

test('步骤链契约齐备且有序：checkout → node setup → corepack enable → pnpm install --frozen-lockfile → typecheck → test → verify:pack', () => {
  const steps = readWorkflowSteps(readWorkflowDoc());
  const chain: Array<{ label: string; match: (s: Step) => boolean }> = [
    {
      label: 'checkout（uses 钉完整 commit SHA，可变 tag 非供应链信任锚）',
      match: (s) => typeof s.uses === 'string' && /^actions\/checkout@[0-9a-f]{40}$/.test(s.uses),
    },
    {
      label: 'node setup（uses 钉完整 commit SHA）',
      match: (s) => typeof s.uses === 'string' && /^actions\/setup-node@[0-9a-f]{40}$/.test(s.uses),
    },
    {
      label: 'pnpm shim 就位（corepack enable 于 node setup 之后：cache 取版的全局 pnpm 落旧 node bin，setup-node 切版改写 PATH 后须按 packageManager 钉的 12.15.0 在新 bin 重建 shim——票 20261116-c5f5）',
      match: (s) => s.run === 'corepack enable',
    },
    {
      label: '依赖安装（pnpm install --frozen-lockfile；frozen 显式留痕，incompatible lockfile 红 = 防漂移的正确行为，RQ2 异常流 A #6）',
      match: (s) => s.run === 'pnpm install --frozen-lockfile',
    },
    { label: 'typecheck（tsc --noEmit 经脚本）', match: (s) => s.run === 'pnpm run typecheck' },
    { label: '全量测试 pnpm test', match: (s) => s.run === 'pnpm test' },
    {
      label: 'verify:pack 对账（先 pnpm pack 出 tarball 再对账；shell: bash 带 -eo pipefail，pack 失败不被 tail 掩码；pnpm 12 起 `pnpm run` 原样转发 `--`，传参不带 `--`——本机 12.15.0 实测）',
      match: (s) =>
        typeof s.run === 'string' &&
        s.shell === 'bash' &&
        s.run.includes('pnpm pack') &&
        s.run.includes('pnpm run verify:pack'),
    },
  ];
  let cursor = -1;
  for (const req of chain) {
    const idx = steps.findIndex((step, i) => i > cursor && req.match(step));
    assert.ok(
      idx > cursor,
      `步骤链缺「${req.label}」或其顺序先于前序契约步骤——已有链：${steps.map((s) => s.name || s.uses || s.run).join(' → ')}`
    );
    cursor = idx;
  }
});

test('交互 e2e 的 expect 前置由安装步骤真实供应（装了就真跑，非跳过）', () => {
  const steps = readWorkflowSteps(readWorkflowDoc());
  const expectIdx = steps.findIndex(
    (s) => typeof s.run === 'string' && s.run.includes('apt-get install') && s.run.includes('expect')
  );
  assert.ok(
    expectIdx >= 0,
    '缺 expect 安装步骤（apt-get install expect）——ubuntu runner 不保证预装 expect，缺装时交互 e2e 直接红而非跳过'
  );
  const testIdx = steps.findIndex((s) => s.run === 'pnpm test');
  assert.ok(
    expectIdx < testIdx,
    'expect 安装步骤必须先于 pnpm test——否则交互 e2e 跑时 expect 仍未就绪'
  );
});

test('pnpm 全局安装步先于 setup-node（setup-node cache: pnpm 取版哈希的前置；dsh 集成前置由 corepack shim 承担，票 20261116-c5f5）', () => {
  // 缺陷钉住（fix 票 20261115-1a89）：Actions 首跑红——既有 FR-5 集成测试真跑段经官方
  // dsh plugin add 转发 pnpm，runner PATH 无 pnpm 时 spawn ENOENT 使安装中止（exit 127），
  // 断言红（run 43722887029）。pnpm 安装步骤必须先于 pnpm test，装了就真跑（与 expect
  // 同款定夺：补前置门跳过会让集成覆盖永久缺失）。
  // 本步前置定位 = setup-node cache: pnpm 的取版哈希（spec 20261115-ed9f FR-4）——
  // 故顺序契约加一条：先于 setup-node。dsh 集成前置已由 corepack enable 重建的 shim
  // 承担（切版后全局 pnpm 出 PATH，票 20261116-c5f5）。
  const steps = readWorkflowSteps(readWorkflowDoc());
  const pnpmIdx = steps.findIndex(
    (s) => typeof s.run === 'string' && /npm\s+install\s+-g\s+pnpm@/.test(s.run)
  );
  assert.ok(
    pnpmIdx >= 0,
    '缺 pnpm 安装步骤（npm install -g pnpm@<主版本>）——runner 镜像不预装 pnpm，缺装时官方 dsh plugin 命令转发 pnpm 执行即 ENOENT，FR-5 集成测试红'
  );
  const testIdx = steps.findIndex((s) => s.run === 'pnpm test');
  assert.ok(
    pnpmIdx < testIdx,
    'pnpm 安装步骤必须先于 pnpm test——否则 dsh 集成测试跑时 pnpm 仍未就绪'
  );
  const setupIdx = steps.findIndex(
    (s) => typeof s.uses === 'string' && s.uses.startsWith('actions/setup-node@')
  );
  assert.ok(
    pnpmIdx < setupIdx,
    'pnpm 安装步骤必须先于 setup-node——setup-node 的 cache: pnpm 需要 pnpm 已在 PATH，缺装时该步骤红'
  );
});

test('全文件无 secrets：结构无 secrets 键、原文无 secrets 表达式', () => {
  const raw = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const doc = readWorkflowDoc();
  const offenders: string[] = [];
  const walk = (node: YamlNode, pathSoFar: string): void => {
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${pathSoFar}[${i}]`));
      return;
    }
    if (isMapping(node)) {
      for (const [key, value] of Object.entries(node)) {
        if (key === 'secrets') offenders.push(`${pathSoFar}.${key}`);
        walk(value, `${pathSoFar}.${key}`);
      }
    }
  };
  walk(doc, '$');
  assert.deepEqual(offenders, [], `workflow 出现 secrets 键——契约禁止：${offenders.join('、')}`);
  assert.doesNotMatch(raw, /\$\{\{\s*secrets\./, 'workflow 原文出现 ${{ secrets. }} 表达式——契约禁止');
});

test('负向契约：workflow 不引用 plugins/ 目录路径，依赖安装不退回 npm install/ci', () => {
  const raw = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  // 契约面 = 执行行（YAML 注释非执行面，票 20261116-c5f5：注释提及 npm install -g 不算违规）
  const execLines = raw.split('\n').filter((line) => !line.trim().startsWith('#'));
  // agents-layout §4.4 声明「全部步骤无 plugins/ 目录路径引用」——目录迁移契约此前无测试承载
  // （缺口声明：本断言行级过滤仅豁免全行注释，行尾注释仍会命中；npm 面已改解析后执行值，plugins 面留此口径）
  const pluginPathLines = execLines.filter((line) => line.includes('plugins/'));
  assert.deepEqual(
    pluginPathLines,
    [],
    `workflow 不得引用 plugins/ 目录路径（agents/ 迁移契约），命中行：${JSON.stringify(pluginPathLines)}`,
  );
  // 依赖安装纪律（票 20261115-d5f4）：pnpm install --frozen-lockfile——不得退回 npm；
  // 豁免 = npm install -g pnpm@<版>（runner 引导装 pnpm 本身，票 20261115-1a89 既定机制）
  // npm 禁令改解析后执行值集合（js-yaml 相邻测试已装载同文件）：run/uses 值不含注释
  const doc2 = loadYaml(raw) as { jobs?: Record<string, { steps?: Array<{ run?: string; uses?: string }> }> };
  const execValues = Object.values(doc2.jobs ?? {})
    .flatMap((job) => job.steps ?? [])
    .map((step) => [step.run, step.uses])
    .flat()
    .filter((v): v is string => typeof v === 'string');
  const npmDepViolations = execValues
    .filter((v) => /\bnpm (install|ci)\b/.test(v) && !/npm install -g pnpm@/.test(v));
  assert.deepEqual(
    npmDepViolations,
    [],
    `项目依赖安装不得使用 npm install/ci（pnpm workspace 契约；引导装 pnpm 豁免），命中：${JSON.stringify(npmDepViolations)}`,
  );
});

test('packageManager 字段钉 pnpm@12.15.0——corepack enable 的 shim 版本依此字段（票 20261116-c5f5）', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.packageManager, 'pnpm@12.15.0', `corepack shim 版本源自此字段，缺失或漂移即静默换版，实际：${pkg.packageManager}`);
});

test('scripts.test 串行形态：pnpm test 展开 = unit 先、e2e 后（文件即契约，评审 20261118-6352 建议 1 承接）', () => {
  // CI「全量测试 pnpm test」步骤的实际执行面 = scripts.test 的展开形态：test/e2e/ 与
  // test/unit/ 的互斥串行处置（插件票先 unit 后 e2e 的合回机制载体，fix 票 20261118-f2e3
  // 定稿）要求两段齐全且顺序固定——改单段或换序都会静默丢失一段覆盖，故钉死串行字面量
  // （先例：publish-gate.test.ts 断言 scripts.prepublishOnly 接线）。
  const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  assert.equal(
    pkg.scripts?.test,
    'pnpm run test:unit && pnpm run test:e2e',
    `pnpm test 须串行先 unit 后 e2e（&& 串行、顺序固定，e2e 段缺失即静默丢覆盖），实际：${pkg.scripts?.test}`,
  );
});

test('workflow 过严格 YAML 解析（真解析器防线，杜绝平纯标量含冒号空格类结构缺陷）', () => {
  // 票 20261116-0304 红绿：4de56c7 步名含未引号「cache: pnpm」（冒号+空格）——平纯标量
  // 非法，GitHub plan 阶段 0s startup failure 且自写解析器（本文件 KEY_RE）不校验此类。
  // 防线 = 真解析器（js-yaml）全文件解析，解析报错即红；YAML 合法性是 workflow 的
  // 发布前置面，与步骤链契约同级。
  const raw = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  let parsed: unknown;
  try {
    parsed = loadYaml(raw);
  } catch (err) {
    assert.fail(
      `workflow YAML 严格解析失败（GitHub 将 0s startup failure）：${
        err instanceof Error ? err.message.split('\n').slice(0, 3).join(' / ') : String(err)
      }`,
    );
  }
  assert.ok(parsed && typeof parsed === 'object', '解析结果须为映射');
  const doc = parsed as { on?: unknown; jobs?: unknown };
  assert.ok(doc.on && doc.jobs, 'on 触发器与 jobs 须在位');
});
