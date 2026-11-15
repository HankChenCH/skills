import { test } from 'node:test';
import assert from 'node:assert/strict';

import { typeOptions, skillOptions } from '../../src/menu.ts';
import { parseArgs, renderHelp } from '../../src/cli-args.ts';
import { ASSET_MAP } from '../../src/asset-map.ts';

// ---------- 菜单构造（第一层由映射表生成，占位行带占位提示） ----------

test('第一层选项由映射表生成：每个类型一行', () => {
  const options = typeOptions(ASSET_MAP);
  assert.deepEqual(options.map((o) => o.value), ASSET_MAP.map((row) => row.type));
});

test('占位类型选项带「本轮不可安装」提示，可安装类型显示来源→目标', () => {
  const options = typeOptions(ASSET_MAP);
  const specs = options.find((o) => o.value === '规范');
  assert.match(specs.hint, /不可安装/);
  const skills = options.find((o) => o.value === '技能');
  assert.match(skills.hint, /\.agents\/skills/);
});

test('插件类型选项提示为官方命令转发语义，不显示 undefined 安装目标', () => {
  const options = typeOptions(ASSET_MAP);
  const plugins = options.find((o) => o.value === '插件');
  assert.ok(!plugins.hint.includes('undefined'), `插件提示不得含 undefined：${plugins.hint}`);
  assert.match(plugins.hint, /官方命令/);
});

test('第二层技能选项按名排序并带描述', () => {
  const options = skillOptions(['beta', 'alpha'], { alpha: 'A 描述', beta: 'B 描述' });
  assert.deepEqual(options.map((o) => o.value), ['alpha', 'beta']);
  assert.equal(options[0].hint, 'A 描述');
});

test('第二层无描述的技能提示为空字符串而非 undefined', () => {
  const options = skillOptions(['alpha'], {});
  assert.equal(options[0].hint, '');
});

// ---------- 旗标解析 ----------

test('无旗标 = 交互模式', () => {
  assert.deepEqual(parseArgs([]), { mode: 'interactive' });
});

test('--all = 全装模式', () => {
  assert.deepEqual(parseArgs(['--all']), { mode: 'all' });
});

test('--skills 逗号分隔列表 = 指定模式', () => {
  const parsed = parseArgs(['--skills', 'dev-spec,dev-plan']);
  assert.deepEqual(parsed, { mode: 'skills', skills: ['dev-spec', 'dev-plan'] });
});

test('--skills 可重复出现，取并集且保序去重', () => {
  const parsed = parseArgs(['--skills', 'a,b', '--skills', 'b,c']);
  assert.deepEqual(parsed.skills, ['a', 'b', 'c']);
});

test('--skills 空值显式报错', () => {
  assert.throws(() => parseArgs(['--skills', '']), /--skills/);
});

test('--all 与 --skills 同用显式报错（互斥）', () => {
  assert.throws(() => parseArgs(['--all', '--skills', 'a']), /互斥/);
});

test('未知旗标显式报错并含旗标名', () => {
  assert.throws(() => parseArgs(['--magic']), /--magic/);
});

test('裸位置参数显式报错', () => {
  assert.throws(() => parseArgs(['dev-spec']), /用法|Usage|位置参数/);
});

test('-h 与 --help 等价，进入帮助模式', () => {
  assert.deepEqual(parseArgs(['-h']), { mode: 'help' });
  assert.deepEqual(parseArgs(['--help']), { mode: 'help' });
});

test('--help 文本列明全部旗标与示例', () => {
  const help = renderHelp();
  for (const needle of ['--all', '--skills', '--help', 'npx @hankchen/infra']) {
    assert.ok(help.includes(needle), `帮助文本应含 ${needle}`);
  }
});

// ---------- 插件旗标解析（spec 20261115-495e 实现决策「非交互旗标」） ----------

test('--plugins 逗号分隔列表 = 插件安装模式，缺 --profile 时为 null', () => {
  assert.deepEqual(parseArgs(['--plugins', '@hankchen/dsh-demo']), {
    mode: 'plugins',
    plugins: ['@hankchen/dsh-demo'],
    profile: null,
  });
});

test('--plugins 可重复出现取并集且保序去重（与 --skills 同构）', () => {
  const parsed = parseArgs(['--plugins', '@a/one,@a/two', '--plugins', '@a/two,@a/three']);
  assert.deepEqual(parsed.plugins, ['@a/one', '@a/two', '@a/three']);
});

test('--plugins 与 --profile 配对：profile 记录在解析结果', () => {
  const parsed = parseArgs(['--plugins', '@hankchen/dsh-demo', '--profile', 'dev']);
  assert.deepEqual(parsed, { mode: 'plugins', plugins: ['@hankchen/dsh-demo'], profile: 'dev' });
});

test('--profile 先于 --plugins 出现同样配对成功（顺序无关）', () => {
  const parsed = parseArgs(['--profile', 'dev', '--plugins', '@hankchen/dsh-demo']);
  assert.deepEqual(parsed, { mode: 'plugins', plugins: ['@hankchen/dsh-demo'], profile: 'dev' });
});

test('--plugins 空值显式报错', () => {
  assert.throws(() => parseArgs(['--plugins', '']), /--plugins/);
});

test('--profile 空值显式报错', () => {
  assert.throws(() => parseArgs(['--plugins', '@a/one', '--profile', '']), /--profile/);
});

test('--profile 单独出现（无 --plugins）显式报错：两旗标配对使用', () => {
  assert.throws(() => parseArgs(['--profile', 'dev']), /配对/);
});

test('--plugins 与 --all 同用显式报错（互斥；--all 语义维持技能全部条目）', () => {
  assert.throws(() => parseArgs(['--plugins', '@a/one', '--all']), /互斥/);
  assert.throws(() => parseArgs(['--all', '--plugins', '@a/one']), /互斥/);
});

test('--plugins 与 --skills 同用显式报错（互斥）', () => {
  assert.throws(() => parseArgs(['--plugins', '@a/one', '--skills', 'dev-spec']), /互斥/);
});

test('--profile 与 --all 同用显式报错（--profile 只与 --plugins 配对）', () => {
  assert.throws(() => parseArgs(['--all', '--profile', 'dev']), /配对/);
});

test('--help 文本列 --plugins/--profile 两旗标与插件安装示例', () => {
  const help = renderHelp();
  for (const needle of ['--plugins', '--profile', '--plugins @hankchen/dsh-demo --profile']) {
    assert.ok(help.includes(needle), `帮助文本应含 ${needle}`);
  }
});
