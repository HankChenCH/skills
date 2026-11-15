// commander 15.1.0 等价探针（v3）：commander 负责 token 消耗 + 未知旗标/多余位置参数检测
// （exitOverride 错误码重映射逐字文案），顺序敏感语义（互斥/值必需/配对）沿 argv 顺序
// 状态机复刻 cli-args.js；helpInformation 覆盖逐字 help。
import { Command } from 'commander';
import { renderHelp } from '/tmp/r3-exp/fixtures/current-pkg/src/cli-args.js';

const FLAGS = ['--all', '--skills <名[,名...]> [-a, -b, ...]', '--plugins <名[,名...]> --profile <名> [-a, -b, ...]', '-h, --help'];
const KNOWN = new Set(['--all', '--skills', '--plugins', '--profile', '-h', '--help']);
const argv = process.argv.slice(2);
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  console.error('  运行 npx @hankchen/infra --help 查看全部旗标与示例。');
  process.exit(1);
};
const splitNames = (v, prev = []) => [...(prev ?? []), ...v.split(',').map((s) => s.trim()).filter(Boolean)];

const program = new Command();
program.helpInformation = () => `${renderHelp()}\n`;
program.exitOverride();
program.showSuggestionAfterError(false);
program.allowExcessArguments();
program.allowUnknownOption();
program.configureOutput({ writeErr: () => {} });
program.option('--all', '安装全部技能');
program.option('--skills [names]', '指定技能', splitNames);
program.option('--plugins [names]', '指定插件', splitNames);
program.option('--profile [name]', 'profile');

let opts;
try {
  program.parse(argv, { from: 'user' });
  opts = program.opts();
} catch (err) {
  if (err.code === 'commander.helpDisplayed') process.exit(0);
  fail(`未预期的解析错误：${err.message}`);
}

// 顺序敏感语义状态机（复刻 cli-args.js 错误触发顺序）
const getVal = (i) => argv[i + 1];
const merge = (existing, value, flag) => {
  if (value === undefined || value === '') throw new Error(`${flag} 需要至少一个名字（如 ${flag} a,b）`);
  return [...(existing ?? []), ...value.split(',').map((s) => s.trim()).filter(Boolean)];
};
let mode = 'interactive';
const state = {};
try {
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  switch (a) {
    case '--all':
      if (mode === 'skills') throw new Error('--all 与 --skills 互斥：全装与按条目指定只能选一');
      if (mode === 'plugins') throw new Error('--plugins/--profile 与 --all/--skills 互斥：插件安装与技能安装只能选一');
      mode = 'all'; break;
    case '--skills': {
      if (mode === 'all') throw new Error('--all 与 --skills 互斥：全装与按条目指定只能选一');
      if (mode === 'plugins') throw new Error('--plugins/--profile 与 --all/--skills 互斥：插件安装与技能安装只能选一');
      const value = getVal(i);
      if (value === undefined || value === '') throw new Error('--skills 需要至少一个技能名（如 --skills dev-spec,dev-plan）');
      mode = 'skills';
      state.skills = [...new Set([...(state.skills ?? []), ...value.split(',').map((s) => s.trim()).filter(Boolean)])];
      i += 1; break;
    }
    case '--plugins': {
      if (mode === 'all' || mode === 'skills') throw new Error('--plugins/--profile 与 --all/--skills 互斥：插件安装与技能安装只能选一');
      mode = 'plugins';
      state.plugins = merge(state.plugins, getVal(i), '--plugins');
      i += 1; break;
    }
    case '--profile': {
      const value = getVal(i);
      if (value === undefined || value === '') throw new Error('--profile 需要一个 profile 名（如 --profile dev）');
      state.profile = value;
      i += 1; break;
    }
    default:
      if (a.startsWith('--') && !KNOWN.has(a)) {
        throw new Error(`未知旗标 ${a}；可用旗标：${FLAGS.join('、')}（--help 查看示例）`);
      }
      if (!a.startsWith('-')) {
        throw new Error(`不接受位置参数「${a}」：本命令只认旗标，条目请用 --skills/--plugins 指定（--help 查看示例）`);
      }
      break;
  }
}
} catch (err) { fail(err.message); }
if (mode === 'plugins' && state.profile === undefined) state.profile = null;
else if (mode !== 'plugins' && state.profile !== undefined) {
  fail('--profile 需与 --plugins 配对使用（插件安装指定目标 dsh profile）');
}
const operands = program.args.filter((x) => !String(x).startsWith('-'));
if (operands.length > 0) fail(`不接受位置参数「${operands[0]}」：本命令只认旗标，条目请用 --skills/--plugins 指定（--help 查看示例）`);
const out = { mode };
if (mode === 'skills') out.skills = state.skills;
if (mode === 'plugins') { out.plugins = state.plugins; out.profile = state.profile ?? null; }
console.log(JSON.stringify(out));
