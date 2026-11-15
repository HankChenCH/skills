// yargs 18.2.0 等价探针（v3）：yargs .strict() 检测未知旗标（fail 重映射逐字文案）+
// 类型化值消耗；顺序敏感语义沿 argv 状态机复刻 cli-args.js；help 由状态机派发。
import yargsFactory from 'yargs';
import { hideBin } from 'yargs/helpers';
import { renderHelp } from '/tmp/r3-exp/fixtures/current-pkg/src/cli-args.js';

const FLAGS = ['--all', '--skills <名[,名...]> [-a, -b, ...]', '--plugins <名[,名...]> --profile <名> [-a, -b, ...]', '-h, --help'];
const argv = process.argv.slice(2);
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  console.error('  运行 npx @hankchen/infra --help 查看全部旗标与示例。');
  process.exit(1);
};
const KNOWN = new Set(['--all', '--skills', '--plugins', '--profile', '-h', '--help']);

// 先用状态机走一遍（help 即时派发；顺序敏感错误在此触发；未知旗标交 yargs strict 报）
let mode = 'interactive';
const state = {};
const walk = () => {
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
        const value = argv[i + 1];
        if (value === undefined || value === '') throw new Error('--skills 需要至少一个技能名（如 --skills dev-spec,dev-plan）');
        mode = 'skills';
        state.skills = [...new Set([...(state.skills ?? []), ...value.split(',').map((s) => s.trim()).filter(Boolean)])];
        i += 1; break;
      }
      case '--plugins': {
        if (mode === 'all' || mode === 'skills') throw new Error('--plugins/--profile 与 --all/--skills 互斥：插件安装与技能安装只能选一');
        mode = 'plugins';
        const value = argv[i + 1];
        if (value === undefined || value === '') throw new Error('--plugins 需要至少一个名字（如 --plugins a,b）');
        state.plugins = [...new Set([...(state.plugins ?? []), ...value.split(',').map((s) => s.trim()).filter(Boolean)])];
        i += 1; break;
      }
      case '--profile': {
        const value = argv[i + 1];
        if (value === undefined || value === '') throw new Error('--profile 需要一个 profile 名（如 --profile dev）');
        state.profile = value;
        i += 1; break;
      }
      case '-h':
      case '--help':
        console.log(renderHelp());
        process.exit(0);
        break;
      default:
        if (a.startsWith('--') && !KNOWN.has(a)) {
          throw new Error(`未知旗标 ${a}；可用旗标：${FLAGS.join('、')}（--help 查看示例）`);
        }
        if (!a.startsWith('-')) {
          const prev = i > 0 ? argv[i - 1] : null;
          if (prev === '--skills' || prev === '--plugins' || prev === '--profile') break; // 已被上一轮消费
          throw new Error(`不接受位置参数「${a}」：本命令只认旗标，条目请用 --skills/--plugins 指定（--help 查看示例）`);
        }
        break;
    }
  }
  if (mode === 'plugins' && state.profile === undefined) state.profile = null;
  else if (mode !== 'plugins' && state.profile !== undefined) {
    throw new Error('--profile 需与 --plugins 配对使用（插件安装指定目标 dsh profile）');
  }
};
try {
  walk();
} catch (err) {
  fail(err.message);
}

// yargs strict：未知 -- 旗标检测（值类型化消耗与状态机结果一致，此处仅作检测通道）
let failMsg = null;
try {
  yargsFactory(hideBin(['node', 'infra', ...argv]))
    .option('all', { type: 'boolean' })
    .option('skills', { type: 'array', string: true })
    .option('plugins', { type: 'array', string: true })
    .option('profile', { type: 'string' })
    .help(false)
    .strict()
    .fail((msg) => { failMsg = msg; throw new Error('__fail__'); })
    .parse();
} catch { /* fail handler 已记录 */ }
if (failMsg !== null) {
  const m = failMsg.match(/Unknown arguments?: (.+)/);
  const name = m ? m[1].split(',').map((s) => s.trim()).find((s) => s.startsWith('-')) : null;
  if (name) fail(`未知旗标 ${name}；可用旗标：${FLAGS.join('、')}（--help 查看示例）`);
}
const out = { mode };
if (mode === 'skills') out.skills = state.skills;
if (mode === 'plugins') { out.plugins = state.plugins; out.profile = state.profile ?? null; }
console.log(JSON.stringify(out));
