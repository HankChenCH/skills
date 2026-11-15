// commander 适配面测试（工单 20261115-eed0；原 cli-args 单测自 menu.test.ts 迁入）。
//
// seam = src/cli.ts 的 parseArgs / renderHelp（bin/infra.ts 消费的唯一解析入口）。
// 期望值独立来源：RQ3 §6.3 迁移前参照输出（docs/research/cli-lib/evidence/
// probe-ref-matrix.txt，真实 cli-args 驱动逐字节留档）转录为字面量——不由实现推导。
// 报错文案断言逐字节一致（FR-5 防线）：✗ 行去掉 bin 层前缀即 err.message 原文。
// 案例清单 = RQ3 §11.4 十六案例矩阵 + §10.4 边角回归集 + spec 20261115-495e 插件旗标语义。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseArgs, renderHelp } from '../../src/cli.ts';
import type { ParsedArgs } from '../../src/cli.ts';

// ---- 参照转录（evidence/probe-ref-matrix.txt）：报错文案逐字 ----

const MUTEX_ALL_SKILLS = '--all 与 --skills 互斥：全装与按条目指定只能选一';
const MUTEX_PLUGINS_ALL = '--plugins/--profile 与 --all/--skills 互斥：插件安装与技能安装只能选一';
const PAIRING = '--profile 需与 --plugins 配对使用（插件安装指定目标 dsh profile）';
const SKILLS_EMPTY = '--skills 需要至少一个技能名（如 --skills dev-spec,dev-plan）';
const PLUGINS_EMPTY = '--plugins 需要至少一个名字（如 --plugins a,b）';
const PROFILE_EMPTY = '--profile 需要一个 profile 名（如 --profile dev）';
// 旗标清单文案（退役 cli-args.ts FLAGS.join('、') 原文，按参照输出转录）
const FLAG_LIST =
  '--all、--skills <名[,名...]> [-a, -b, ...]、--plugins <名[,名...]> --profile <名> [-a, -b, ...]、-h, --help';
const unknownFlag = (flag: string): string => `未知旗标 ${flag}；可用旗标：${FLAG_LIST}（--help 查看示例）`;
const positional = (arg: string): string =>
  `不接受位置参数「${arg}」：本命令只认旗标，条目请用 --skills/--plugins 指定（--help 查看示例）`;

// ---- RQ3 §11.4 十六案例矩阵：逐案例断言（报错行逐字文案、成功行完整解析结果）----

const MATRIX: Array<{ name: string; argv: string[]; error?: string; want?: ParsedArgs }> = [
  { name: '--help 进入帮助模式', argv: ['--help'], want: { mode: 'help' } },
  { name: '-h 与 --help 等价进入帮助模式', argv: ['-h'], want: { mode: 'help' } },
  { name: '--all 与 --skills 同用报互斥（--all 先行）', argv: ['--all', '--skills', 'dev-spec'], error: MUTEX_ALL_SKILLS },
  { name: '--plugins 与 --all 同用报互斥（插件侧先行）', argv: ['--plugins', 'x', '--all'], error: MUTEX_PLUGINS_ALL },
  { name: '未知长旗标报错并列出可用旗标清单', argv: ['--foo'], error: unknownFlag('--foo') },
  { name: '裸位置参数报错', argv: ['positional'], error: positional('positional') },
  { name: '--skills 缺值报错', argv: ['--skills'], error: SKILLS_EMPTY },
  { name: '--plugins 缺值报错', argv: ['--plugins'], error: PLUGINS_EMPTY },
  { name: '--profile 缺值报错', argv: ['--profile'], error: PROFILE_EMPTY },
  { name: '--profile 缺 --plugins 配对报错', argv: ['--profile', 'dev'], error: PAIRING },
  { name: '--skills 重复出现取并集保序', argv: ['--skills', 'a', '--skills', 'b'], want: { mode: 'skills', skills: ['a', 'b'] } },
  { name: '--skills 逗号分隔列表', argv: ['--skills', 'a,b'], want: { mode: 'skills', skills: ['a', 'b'] } },
  { name: '--all 免交互全装模式', argv: ['--all'], want: { mode: 'all' } },
  { name: '--plugins 配 --profile 记录目标', argv: ['--plugins', 'p', '--profile', 'dev'], want: { mode: 'plugins', plugins: ['p'], profile: 'dev' } },
  { name: '--plugins 缺 --profile 解析为 null（bin 层提示选择）', argv: ['--plugins', 'p'], want: { mode: 'plugins', plugins: ['p'], profile: null } },
  { name: '零旗标进入交互模式', argv: [], want: { mode: 'interactive' } },
];

// ---- RQ3 §10.4 边角回归集（迁移时新增守护，参照语义 = 退役 cli-args 实际行为）----

const EDGES: Array<{ name: string; argv: string[]; error?: string; want?: ParsedArgs }> = [
  { name: '--skills 值以 - 开头被当值（-h 不派发帮助，§10.4-1）', argv: ['--skills', '-h'], want: { mode: 'skills', skills: ['-h'] } },
  { name: '--skills 值为旗标形长名同样被当值', argv: ['--skills', '--all'], want: { mode: 'skills', skills: ['--all'] } },
  { name: '未知旗标先于 -h：help 不越过其前错误', argv: ['--foo', '-h'], error: unknownFlag('--foo') },
  { name: '互斥先于 -h：help 不越过其前错误', argv: ['--all', '--skills', 'dev-spec', '-h'], error: MUTEX_ALL_SKILLS },
  { name: '-h 即时派发优先于其后未知旗标', argv: ['-h', '--foo'], want: { mode: 'help' } },
  { name: '裸 -- 分隔符按未知旗标口径报错（§10.4-2）', argv: ['--'], error: unknownFlag('--') },
  { name: '单短旗标 -x 按位置参数口径报错', argv: ['-x'], error: positional('-x') },
  { name: '等号赋值形 --skills=a 不受支持（未知旗标口径）', argv: ['--skills=a'], error: unknownFlag('--skills=a') },
  { name: '未知旗标先于配对缺失报错（§10.4-3 组合序）', argv: ['--profile', 'dev', '--foo'], error: unknownFlag('--foo') },
  { name: '互斥先于缺值（--all --skills 无值）', argv: ['--all', '--skills'], error: MUTEX_ALL_SKILLS },
  { name: '重复 --profile 取最后出现', argv: ['--plugins', 'p', '--profile', 'dev', '--profile', 'qa'], want: { mode: 'plugins', plugins: ['p'], profile: 'qa' } },
  { name: '重复 --all 无副作用仍为全装', argv: ['--all', '--all'], want: { mode: 'all' } },
];

// ---- spec 20261115-495e 插件旗标语义（原 menu.test.ts 插件旗标解析节迁移）----

const PLUGIN_SEMANTICS: Array<{ name: string; argv: string[]; error?: string; want?: ParsedArgs }> = [
  { name: '--plugins 重复出现取并集且保序去重（与 --skills 同构）', argv: ['--plugins', '@a/one,@a/two', '--plugins', '@a/two,@a/three'], want: { mode: 'plugins', plugins: ['@a/one', '@a/two', '@a/three'], profile: null } },
  { name: '--profile 先于 --plugins 出现同样配对成功（顺序无关）', argv: ['--profile', 'dev', '--plugins', '@hankchen/dsh-demo'], want: { mode: 'plugins', plugins: ['@hankchen/dsh-demo'], profile: 'dev' } },
  { name: '--plugins 空串值按缺值报错（判空不判旗标形）', argv: ['--plugins', ''], error: PLUGINS_EMPTY },
  { name: '--profile 空串值按缺值报错', argv: ['--plugins', '@a/one', '--profile', ''], error: PROFILE_EMPTY },
  { name: '--all 与 --plugins 同用报互斥（--all 语义维持技能全部条目）', argv: ['--all', '--plugins', '@a/one'], error: MUTEX_PLUGINS_ALL },
  { name: '--plugins 与 --skills 同用报互斥', argv: ['--plugins', '@a/one', '--skills', 'dev-spec'], error: MUTEX_PLUGINS_ALL },
  { name: '--profile 与 --all 同用报配对缺失（--profile 只与 --plugins 配对）', argv: ['--all', '--profile', 'dev'], error: PAIRING },
  { name: '--skills 空串值按缺值报错', argv: ['--skills', ''], error: SKILLS_EMPTY },
  { name: '--skills 重复逗号列表并集保序去重', argv: ['--skills', 'a,b', '--skills', 'b,c'], want: { mode: 'skills', skills: ['a', 'b', 'c'] } },
  { name: '--skills 值逐项去空白并丢弃空段', argv: ['--skills', ' a , ,b '], want: { mode: 'skills', skills: ['a', 'b'] } },
];

for (const [group, rows] of [
  ['矩阵', MATRIX],
  ['边角', EDGES],
  ['插件语义', PLUGIN_SEMANTICS],
] as const) {
  for (const row of rows) {
    test(`${group}：${row.name}`, () => {
      if (row.error !== undefined) {
        assert.throws(() => parseArgs(row.argv), (err: Error) => err.message === row.error);
      } else {
        assert.deepEqual(parseArgs(row.argv), row.want);
      }
    });
  }
}

// ---- 帮助文本逐字节（evidence/probe-ref-matrix.txt --help 案例转录，bin console.log 再补尾换行）----

test('renderHelp 与迁移前参照逐字节一致', () => {
  assert.equal(renderHelp(), HELP_TEXT);
});

const HELP_TEXT = `@hankchen/infra —— 套件资产初始化 CLI

用法（在目标 git 项目根目录执行）：
  npx @hankchen/infra                      # 进入两层交互菜单（选类型 → 勾选技能/插件）
  npx @hankchen/infra@<semver>             # 指定版本安装（锁文件记录该版本）
  npx @hankchen/infra --all                # 免交互安装全部技能
  npx @hankchen/infra --skills dev-spec,dev-plan   # 免交互安装指定技能
  npx @hankchen/infra --skills dev-spec --skills ref-testing       # 可重复出现，取并集
  npx @hankchen/infra --plugins @hankchen/dsh-demo --profile dev   # 免交互安装插件到指定 dsh profile

旗标：
  --all                       安装技能类型全部条目（免交互）
  --skills <名[,名...]>       按条目指定安装；逗号分隔，可重复出现，取并集
  --plugins <名[,名...]>      免交互安装插件（registry 包名）；逗号分隔，可重复出现，取并集
  --profile <名>              插件安装的目标 dsh profile（与 --plugins 配对必填；desktop 为官方保留名拒装）
  -h, --help                  显示本帮助

行为：
  - 技能实体拷入项目 .agents/skills/<技能名>/（SKILL.md 与 references/ 随包原样齐备）
  - 对项目内已存在的 agent 目录（.claude、.zcode 等）建相对软链；不存在者跳过并列入完成摘要
  - 插件经宿主官方命令安装进 dsh profile（dsh 不在 PATH 自动改 npx @deepseek-ai/dsh）；
    node 版本须 ≥ 24.9.0；装后读 profile package.json 对账落点并记入 .infra-lock.json
  - 安装后在项目根写 .infra-lock.json 记账（包版本 + 逐技能指纹/逐插件版本与安装时间）
  - 重跑本命令 = 按当前包内容覆盖刷新已装资产并更新锁文件，无重复堆积`;
