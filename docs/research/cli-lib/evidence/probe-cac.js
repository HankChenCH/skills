// cac 7.1.0 等价探针（v2）：无 strict 校验 → 未知旗标预扫描；help 自派发；
// 值必需检查补上（cac 把裸旗标解析成 true）；语义校验自持。
import { cac } from 'cac';
import { renderHelp } from '/tmp/r3-exp/fixtures/current-pkg/src/cli-args.js';

const FLAGS = ['--all', '--skills <名[,名...]> [-a, -b, ...]', '--plugins <名[,名...]> --profile <名> [-a, -b, ...]', '-h, --help'];
const KNOWN = new Set(['--all', '--skills', '--plugins', '--profile', '-h', '--help']);
const VALUE_FLAGS = new Set(['--skills', '--plugins', '--profile']);
const argv = process.argv.slice(2);
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  console.error('  运行 npx @hankchen/infra --help 查看全部旗标与示例。');
  process.exit(1);
};

for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a.startsWith('--') && !KNOWN.has(a)) fail(`未知旗标 ${a}；可用旗标：${FLAGS.join('、')}（--help 查看示例）`);
  if (!a.startsWith('-') && !(i > 0 && VALUE_FLAGS.has(argv[i - 1]))) {
    fail(`不接受位置参数「${a}」：本命令只认旗标，条目请用 --skills/--plugins 指定（--help 查看示例）`);
  }
}

const cli = cac('infra');
cli.option('--all', '安装全部技能');
cli.option('--skills <names>', '指定技能');
cli.option('--plugins <names>', '指定插件');
cli.option('--profile <name>', 'profile');
let parsed;
try { parsed = cli.parse(['node', 'infra', ...argv]); } catch (err) { fail(`未预期的解析错误：${err.message}`); }
const o = parsed.options;
if (o.h || o.help) { console.log(renderHelp()); process.exit(0); }
const split = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v);
const skills = typeof o.skills === 'string' ? split(o.skills) : o.skills === true ? undefined : o.skills;
const plugins = typeof o.plugins === 'string' ? split(o.plugins) : o.plugins === true ? undefined : o.plugins;
if (o.skills === true || o.skills === '') fail('--skills 需要至少一个技能名（如 --skills dev-spec,dev-plan）');
if (o.plugins === true || o.plugins === '') fail('--plugins 需要至少一个名字（如 --plugins a,b）');
if (o.profile === true || o.profile === '') fail('--profile 需要一个 profile 名（如 --profile dev）');
if (o.all && skills?.length) fail('--all 与 --skills 互斥：全装与按条目指定只能选一');
if ((o.all || skills?.length) && (plugins?.length || o.profile !== undefined)) {
  fail('--plugins/--profile 与 --all/--skills 互斥：插件安装与技能安装只能选一');
}
if (o.profile !== undefined && !plugins?.length) fail('--profile 需与 --plugins 配对使用（插件安装指定目标 dsh profile）');
const mode = o.all ? 'all' : skills?.length ? 'skills' : plugins?.length ? 'plugins' : 'interactive';
const out = { mode };
if (mode === 'skills') out.skills = skills;
if (mode === 'plugins') { out.plugins = plugins; out.profile = typeof o.profile === 'string' ? o.profile : null; }
console.log(JSON.stringify(out));
