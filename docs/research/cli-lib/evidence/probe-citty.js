// citty 0.2.2 等价探针（v3）：citty 导出的 parseArgs 不做 strict 校验也不带 schema 值
// 消耗 → 状态机全量复刻 cli-args.js（未知旗标/位置参数/值必需/互斥/配对/help 派发），
// citty 仅提供 token 化底座（其 runCommand 内建 help 无法逐字覆盖，不可用）。
import { renderHelp } from '/tmp/r3-exp/fixtures/current-pkg/src/cli-args.js';

const FLAGS = ['--all', '--skills <名[,名...]> [-a, -b, ...]', '--plugins <名[,名...]> --profile <名> [-a, -b, ...]', '-h, --help'];
const KNOWN = new Set(['--all', '--skills', '--plugins', '--profile', '-h', '--help']);
const argv = process.argv.slice(2);
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  console.error('  运行 npx @hankchen/infra --help 查看全部旗标与示例。');
  process.exit(1);
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
        throw new Error(`不接受位置参数「${a}」：本命令只认旗标，条目请用 --skills/--plugins 指定（--help 查看示例）`);
    }
  }
  if (mode === 'plugins' && state.profile === undefined) state.profile = null;
  else if (mode !== 'plugins' && state.profile !== undefined) {
    throw new Error('--profile 需与 --plugins 配对使用（插件安装指定目标 dsh profile）');
  }
} catch (err) {
  if (err.message.startsWith('不接受位置参数') && KNOWN.has(argv[argv.indexOf(err.message.match(/「([^」]+)」/)?.[1]) ?? -1])) {
    // 未知旗标经状态机 default 分支落地：-- 开头者按未知旗标口径重述
  }
  const m = err.message.match(/不接受位置参数「(--[^\」]+)」/);
  if (m) fail(`未知旗标 ${m[1]}；可用旗标：${FLAGS.join('、')}（--help 查看示例）`);
  fail(err.message);
}
const out = { mode };
if (mode === 'skills') out.skills = state.skills;
if (mode === 'plugins') { out.plugins = state.plugins; out.profile = state.profile ?? null; }
console.log(JSON.stringify(out));
