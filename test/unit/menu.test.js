import { test } from 'node:test';
import assert from 'node:assert/strict';

import { typeOptions, skillOptions } from '../../src/menu.js';
import { parseArgs, renderHelp } from '../../src/cli-args.js';
import { ASSET_MAP } from '../../src/asset-map.js';

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
