// CI 回归门 workflow 的静态校验（spec 20261115-f650 测试决策 seam ②，FR-2 工单级）。
// seam = .github/workflows/regression-gate.yml 文件本身——声明式工件的外部可观察面，
// 断言只打在文件解析后的结构与原文上，不执行任何步骤。
// 期望值全部来自 spec CI workflow 契约字面（触发 push+pull_request、node 24 经 .nvmrc、
// 步骤链 checkout → node setup → 依赖安装 → tsc --noEmit → 全量测试 → verify:pack、
// 无 secrets 键），不从实现推导。
// 解析器 = 本文件内置的 YAML 子集解析器（块映射 / 块序列 / 字面块标量 / flow 序列 /
// 全行注释）：仓依赖树无 YAML 库且本票改动面禁止改 package.json，故以子集解析器承载
// 「yaml 可解析」这一 seam 检查；解析失败带行号显式报错（坏缩进、tab、非 key 行都拒绝）。
// 环境缺失处置的取证口径：dsh 集成测试自带前置门（node/registry 不满足显式 skip 报因，
// 见 test/e2e/dsh-plugin-integration.test.ts）；交互 e2e 的 expect 缺失时红（runInteractive
// throw，非假绿）——workflow 内显式 apt 安装 expect 使交互段真跑（design 定夺：装了就真跑，
// runner 镜像不保证预装 expect）。
// 评审加固项同为 seam 契约：actions 钉完整 commit SHA（可变 tag 非供应链信任锚）、
// verify 步骤 shell: bash（-eo pipefail，npm pack 失败不被 tail 掩码）、解析器拒重复键
// 与非法块标量缩进（坏点一律带行号显式报错）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
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
});

test('步骤链契约齐备且有序：checkout → node setup → npm ci → typecheck → test → verify:pack', () => {
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
    { label: '依赖安装 npm ci', match: (s) => s.run === 'npm ci' },
    { label: 'typecheck（tsc --noEmit 经脚本）', match: (s) => s.run === 'npm run typecheck' },
    { label: '全量测试 npm test', match: (s) => s.run === 'npm test' },
    {
      label: 'verify:pack 对账（先 npm pack 出 tarball 再对账；shell: bash 带 -eo pipefail，pack 失败不被 tail 掩码）',
      match: (s) =>
        typeof s.run === 'string' &&
        s.shell === 'bash' &&
        s.run.includes('npm pack') &&
        s.run.includes('npm run verify:pack --'),
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
  const testIdx = steps.findIndex((s) => s.run === 'npm test');
  assert.ok(
    expectIdx < testIdx,
    'expect 安装步骤必须先于 npm test——否则交互 e2e 跑时 expect 仍未就绪'
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
