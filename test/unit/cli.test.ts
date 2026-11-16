// 解析矩阵域（spec 20261116-2c58 测试决策 S1，票 20261116-f761/20261116-ccfb 立骨架、
// 20261116-bfcf 硬切定稿）。
//
// seam = src/commands/skill/names.ts 与 src/commands/plugin/names.ts（名归一化与选择校验
// 纯函数）+ src/program.ts（未知命令/未知旗标契约文案纯函数）。期望值独立来源 =
// spec 20261116-2c58 实现决策原文（名归一化语义 + 错误文案逐字），不由实现推导。
// 旧旗标十六案例矩阵（RQ3 §11.4 + §10.4）随旗标契约硬切退役删除——FR-5 逐字节防线随
// 旗标退役不再保留；历史矩阵与证据 docs/research/cli-lib/evidence/ 留档不改写。
// 交互分支断言单边落 menu.test（交互构造与守卫域）；真实进程三通道（stdout/stderr/退出码）
// 断言在 e2e（install.test / plugin-install.test，含 spec 契约文案逐字节）。
// 硬切后新矩阵的 e2e 承接：--all×名互斥顺序反转 2 例、未知子命令、未知旗标（顶层旧旗标名 +
// 命令级任意旗标）、裸跑/无动词帮助——本文件锚定纯函数与文案原文，e2e 锚定三通道。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeNames, resolveSkillSelection } from '../../src/commands/skill/names.ts';
import {
  ERR_PROFILE_VALUE,
  profileRequiredLines,
  resolvePluginSelection,
} from '../../src/commands/plugin/names.ts';
import { unknownCommandMessage, unknownFlagMessage } from '../../src/program.ts';

// ---- spec 20261116-2c58 命令面契约文案（票 20261116-bfcf 硬切定稿）----
// 未知子命令/未知旗标为 spec 实现决策原文（文案模板取实际输入与实际注册清单，呈现归装配层）。

test('未知子命令文案 = spec 契约原文（可用命令清单 + --help 指路）', () => {
  assert.equal(
    unknownCommandMessage('foo', ['skill', 'plugin']),
    '未知命令「foo」；可用命令：skill、plugin（--help 查看用法示例）',
  );
});

test('未知旗标文案 = spec 契约原文：旧旗标名 --skills 同口径（实际输入 + --help 指路）', () => {
  assert.equal(unknownFlagMessage('--skills'), '未知旗标「--skills」；运行 --help 查看全部命令与用法');
});

test('未知旗标文案 = spec 契约原文：命令级任意旗标 --foo 同口径', () => {
  assert.equal(unknownFlagMessage('--foo'), '未知旗标「--foo」；运行 --help 查看全部命令与用法');
});

// ---- spec 20261116-2c58 skill add 名归一化矩阵（票 20261116-f761）----
// seam = src/commands/skill/names.ts。期望值 = spec 实现决策原文：
// 拆逗号/trim/滤空/首现保序去重（`skill add a b,c d` → [a, b, c, d]、`skill add a,a` → [a]）。

const ERR_ALL_MUTEX = '--all 与技能名互斥：全装与按条目指定只能选一';
const ERR_NAMES_EMPTY = 'skill add 需要至少一个技能名（如 skill add dev-spec,dev-plan）';

const NORMALIZE_ROWS: Array<{ name: string; tokens: string[]; want: string[] }> = [
  { name: '空格 variadic 逐个收集', tokens: ['dev-spec', 'dev-plan'], want: ['dev-spec', 'dev-plan'] },
  { name: '空格与逗号混合双收（spec 原例 a b,c d → [a,b,c,d]）', tokens: ['a', 'b,c', 'd'], want: ['a', 'b', 'c', 'd'] },
  { name: '重复名按首现保序去重（spec 原例 a,a → [a]）', tokens: ['a', 'a'], want: ['a'] },
  { name: '逐 token 拆逗号、trim、滤空段', tokens: [' a , ,b ', '  c  '], want: ['a', 'b', 'c'] },
  { name: '首现保序：后现重复让位于首现位置', tokens: ['b', 'a', 'b', 'c', 'a'], want: ['b', 'a', 'c'] },
  { name: '全空段过滤为空数组', tokens: ['', ',', ' , '], want: [] },
];

for (const row of NORMALIZE_ROWS) {
  test(`名归一化：${row.name}`, () => {
    assert.deepEqual(normalizeNames(row.tokens), row.want);
  });
}

// 选择校验（互斥判定在归一化之后 → 与名同给即互斥，与先后顺序无关；两序真实解析由 e2e
// `skill add dev-spec --all` / `skill add --all dev-spec` 承接，见 install.test）。
const SELECTION_ROWS: Array<{
  name: string;
  tokens: string[];
  all: boolean;
  isTTY: boolean;
  error?: string;
  want?: { kind: string; names?: string[] };
}> = [
  { name: '带名免交互：归一化后按名安装', tokens: ['dev-spec', 'dev-plan'], all: false, isTTY: false, want: { kind: 'names', names: ['dev-spec', 'dev-plan'] } },
  { name: '--all 全装', tokens: [], all: true, isTTY: false, want: { kind: 'all' } },
  { name: '--all 与名互斥（先后顺序无关）', tokens: ['dev-spec'], all: true, isTTY: true, error: ERR_ALL_MUTEX },
  { name: '--all 与多名并集互斥', tokens: ['dev-spec', 'dev-plan'], all: true, isTTY: true, error: ERR_ALL_MUTEX },
  { name: '空串 token 过滤后为空报错', tokens: [''], all: false, isTTY: true, error: ERR_NAMES_EMPTY },
  { name: '纯逗号空段 token 过滤后为空报错', tokens: [' , '], all: false, isTTY: false, error: ERR_NAMES_EMPTY },
  { name: '--all 与空段 token 同用按全装（无可互斥之名）', tokens: [' , '], all: true, isTTY: true, want: { kind: 'all' } },
];

for (const row of SELECTION_ROWS) {
  test(`选择校验：${row.name}`, () => {
    const selection = resolveSkillSelection({ tokens: row.tokens, all: row.all, isTTY: row.isTTY });
    if (row.error !== undefined) {
      assert.deepEqual(selection, { kind: 'error', message: row.error });
    } else {
      assert.deepEqual(selection, row.want);
    }
  });
}

// ---- spec 20261116-2c58 plugin add 新矩阵（票 20261116-ccfb）----
// seam = src/commands/plugin/names.ts。期望值独立来源 = spec 实现决策原文：名归一化与
// skill 侧同构（共享同一实现）、空名 / --profile 缺值两条错误文案逐字、缺 --profile 三行结构原文。
// 交互分支断言单边落 menu.test（票 20261116-bfcf 承接 20261116-ccfb 评审标准轴 #2 域分工收敛）。

const ERR_PLUGIN_NAMES_EMPTY =
  'plugin add 需要至少一个插件名（如 plugin add @hankchen/dsh-demo --profile dev）';

const PLUGIN_ROWS: Array<{
  name: string;
  tokens: string[];
  profile: string | undefined;
  isTTY: boolean;
  want: { kind: string; names?: string[]; profile?: string; message?: string };
}> = [
  {
    name: '带名免交互：归一化后按名安装（名与 --profile 顺序无关）',
    tokens: ['@hankchen/dsh-demo'],
    profile: 'dev',
    isTTY: false,
    want: { kind: 'names', names: ['@hankchen/dsh-demo'], profile: 'dev' },
  },
  {
    name: '空格 variadic 与逗号混合双收（与 skill 侧同构：a b,c d → [a,b,c,d]）',
    tokens: ['a', 'b,c', 'd'],
    profile: 'dev',
    isTTY: false,
    want: { kind: 'names', names: ['a', 'b', 'c', 'd'], profile: 'dev' },
  },
  {
    name: '重复名按首现保序去重（与 skill 侧同构：a,a → [a]）',
    tokens: ['a', 'a'],
    profile: 'dev',
    isTTY: false,
    want: { kind: 'names', names: ['a'], profile: 'dev' },
  },
  {
    name: '逐 token 拆逗号、trim、滤空段',
    tokens: [' a , ,b ', '  c  '],
    profile: 'qa',
    isTTY: false,
    want: { kind: 'names', names: ['a', 'b', 'c'], profile: 'qa' },
  },
  {
    name: '带名缺 --profile：三行结构分支',
    tokens: ['@hankchen/dsh-demo'],
    profile: undefined,
    isTTY: true,
    want: { kind: 'profile-required' },
  },
  {
    name: '空串 token 过滤后为空报空名错（与 skill 侧同构）',
    tokens: [''],
    profile: 'dev',
    isTTY: true,
    want: { kind: 'error', message: ERR_PLUGIN_NAMES_EMPTY },
  },
  {
    name: '纯逗号空段 token 过滤后为空报空名错',
    tokens: [' , '],
    profile: undefined,
    isTTY: false,
    want: { kind: 'error', message: ERR_PLUGIN_NAMES_EMPTY },
  },
  {
    name: '--profile 空串值按缺值口径报错（先于其余分支）',
    tokens: ['@hankchen/dsh-demo'],
    profile: '',
    isTTY: true,
    want: { kind: 'error', message: ERR_PROFILE_VALUE },
  },
  {
    name: '--profile 空白值按缺值口径报错',
    tokens: [],
    profile: '  ',
    isTTY: true,
    want: { kind: 'error', message: ERR_PROFILE_VALUE },
  },
];

for (const row of PLUGIN_ROWS) {
  test(`plugin 选择校验：${row.name}`, () => {
    const selection = resolvePluginSelection({ tokens: row.tokens, profile: row.profile, isTTY: row.isTTY });
    assert.deepEqual(selection, row.want);
  });
}

test('plugin 选择校验：--profile 缺值文案为 spec 契约原文', () => {
  assert.equal(ERR_PROFILE_VALUE, '--profile 需要一个 profile 名（如 plugin add @hankchen/dsh-demo --profile dev）');
});

// 缺 --profile 三行结构（spec 契约原文：沿用现行三行结构、示例行改新形态）
test('缺 --profile 三行结构：有既有项列既有 profile（按名排序由调用方注入）', () => {
  assert.deepEqual(profileRequiredLines(['dev', 'work']), [
    '插件安装需要 --profile <名> 指定目标 dsh profile。',
    '既有 profile：dev、work',
    '示例：npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev',
  ]);
});

test('缺 --profile 三行结构：无既有项输出任意新名说明行', () => {
  assert.deepEqual(profileRequiredLines([]), [
    '插件安装需要 --profile <名> 指定目标 dsh profile。',
    '未发现既有 profile（$DSH_HOME/profiles/，缺省 ~/.dsh/profiles/）——可用任意新名。',
    '示例：npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev',
  ]);
});
