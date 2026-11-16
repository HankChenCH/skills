import { test } from 'node:test';
import assert from 'node:assert/strict';

import { typeOptions, skillOptions } from '../../src/kernel/menu.ts';
import { ASSET_MAP } from '../../src/kernel/asset-map.ts';

// 旗标解析与 --help 断言已随 commander 迁移（工单 20261115-eed0）迁至 test/unit/cli.test.ts。

// ---------- 菜单构造（第一层由映射表生成，占位行带占位提示） ----------

test('第一层选项由映射表生成：每个类型一行', () => {
  const options = typeOptions(ASSET_MAP);
  assert.deepEqual(options.map((o) => o.value), ASSET_MAP.map((row) => row.type));
});

test('占位类型选项带「本轮不可安装」提示，可安装类型显示来源→目标', () => {
  const options = typeOptions(ASSET_MAP);
  const specs = options.find((o) => o.value === '规范')!;
  assert.match(specs.hint, /不可安装/);
  const skills = options.find((o) => o.value === '技能')!;
  assert.match(skills.hint, /\.agents\/skills/);
});

test('插件类型选项提示为官方命令转发语义，不显示 undefined 安装目标', () => {
  const options = typeOptions(ASSET_MAP);
  const plugins = options.find((o) => o.value === '插件')!;
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
