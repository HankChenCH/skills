// clipanion 4.0.0-rc.4 等价探针（v4）：clipanion 内建 help 拦截与 -h 歧义使 schema 无法
// 自然复刻 -h/--help → 顺序敏感语义与 help 派发走 argv 状态机；cli.process() 仅作
// 未知旗标/多余位置参数检测通道（UnknownSyntaxError 按消息模式重映射逐字文案）。
import { Cli, Command, Option } from 'clipanion';
import { renderHelp } from '/tmp/r3-exp/fixtures/current-pkg/src/cli-args.js';

const FLAGS = ['--all', '--skills <名[,名...]> [-a, -b, ...]', '--plugins <名[,名...]> --profile <名> [-a, -b, ...]', '-h, --help'];
const KNOWN = new Set(['--all', '--skills', '--plugins', '--profile', '-h', '--help']);
const argv = process.argv.slice(2);
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  console.error('  运行 npx @hankchen/infra --help 查看全部旗标与示例。');
  process.exit(1);
};

class InfraCommand extends Command {
  all = Option.Boolean('--all', false);
  skills = Option.Array('--skills');
  plugins = Option.Array('--plugins');
  profile = Option.String('--profile', { required: false });
  async execute() {}
}
const cli = new Cli({ binaryLabel: 'infra', binaryName: 'infra' });
cli.register(InfraCommand);

// 顺序敏感语义状态机（复刻 cli-args.js 错误触发顺序；help 即时派发）
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
      default: break; // 未知旗标/位置参数交 cli.process 检测
    }
  }
  if (mode === 'plugins' && state.profile === undefined) state.profile = null;
  else if (mode !== 'plugins' && state.profile !== undefined) {
    throw new Error('--profile 需与 --plugins 配对使用（插件安装指定目标 dsh profile）');
  }
} catch (err) {
  fail(err.message);
}

// cli.process：未知 -- 旗标与位置参数检测（UnknownSyntaxError 重映射）
try {
  const result = await cli.process(argv);
  void result;
} catch (err) {
  const msg = String(err.message ?? '');
  const unsupported = msg.match(/Unsupported option name \("([^"]+)"\)/);
  if (unsupported) {
    fail(`未知旗标 ${unsupported[1]}；可用旗标：${FLAGS.join('、')}（--help 查看示例）`);
  }
  const extraneous = msg.match(/Extraneous positional argument \("([^"]+)"\)/);
  if (extraneous) {
    fail(`不接受位置参数「${extraneous[1]}」：本命令只认旗标，条目请用 --skills/--plugins 指定（--help 查看示例）`);
  }
  // -h/--help 触发内建 help 歧义（已在前置状态机派发，正常不会到达）
}

const out = { mode };
if (mode === 'skills') out.skills = state.skills;
if (mode === 'plugins') { out.plugins = state.plugins; out.profile = state.profile ?? null; }
console.log(JSON.stringify(out));
