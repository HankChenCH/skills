import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSET_MAP,
  SKILLS_TYPE,
  PLUGINS_TYPE,
  isInstallableRow,
  isCommandRow,
  findRow,
  expandSymlinkRule,
} from '../../src/asset-map.js';

// 行模型（spec 20261115-495e 实现决策「映射表行模型扩展」）：
//   copy 类行    = type + mechanism:'copy' + sourceDir + installTarget + symlinkRule（技能，行为不变）
//   command 类行 = type + mechanism:'command' + sourceDir（插件：条目正名取包 package.json name，安装按 registry 名转发）
//   占位行       = 仅 type（机制不变：「规范」退第三行）

test('映射表含「技能」行：来源 skills/、目标 .agents/skills/', () => {
  const row = findRow(ASSET_MAP, '技能');
  assert.deepEqual(
    { type: row.type, sourceDir: row.sourceDir, installTarget: row.installTarget },
    { type: '技能', sourceDir: 'skills', installTarget: '.agents/skills' },
  );
});

test('映射表含「插件」command 类行：来源 plugins/、机制 command', () => {
  const row = findRow(ASSET_MAP, PLUGINS_TYPE);
  assert.deepEqual(
    { type: row.type, mechanism: row.mechanism, sourceDir: row.sourceDir },
    { type: '插件', mechanism: 'command', sourceDir: 'plugins' },
  );
});

test('copy 类行（技能）恰有五字段（类型名/机制/来源目录/安装目标/软链规则）', () => {
  const row = findRow(ASSET_MAP, SKILLS_TYPE);
  assert.deepEqual(
    Object.keys(row).sort(),
    ['type', 'mechanism', 'sourceDir', 'installTarget', 'symlinkRule'].sort(),
    `行 ${row.type} 字段集不符`,
  );
});

test('command 类行（插件）恰有三字段（类型名/机制/来源目录）', () => {
  const row = findRow(ASSET_MAP, PLUGINS_TYPE);
  assert.deepEqual(
    Object.keys(row).sort(),
    ['type', 'mechanism', 'sourceDir'].sort(),
    `行 ${row.type} 字段集不符`,
  );
});

test('行序：技能第一、插件第二、「规范」占位退第三行', () => {
  assert.deepEqual(ASSET_MAP.map((row) => row.type), ['技能', '插件', '规范']);
});

test('映射表类型名唯一', () => {
  const names = ASSET_MAP.map((row) => row.type);
  assert.equal(new Set(names).size, names.length);
});

test('机制分发：copy 行 isCommandRow=false、command 行 isCommandRow=true', () => {
  assert.equal(isCommandRow(findRow(ASSET_MAP, SKILLS_TYPE)), false);
  assert.equal(isCommandRow(findRow(ASSET_MAP, PLUGINS_TYPE)), true);
});

test('技能行与插件行可安装，占位行（规范）不可安装', () => {
  assert.equal(isInstallableRow(findRow(ASSET_MAP, SKILLS_TYPE)), true);
  assert.equal(isInstallableRow(findRow(ASSET_MAP, PLUGINS_TYPE)), true);
  const placeholder = findRow(ASSET_MAP, '规范');
  assert.ok(placeholder, '映射表应含「规范」占位行');
  assert.equal(isInstallableRow(placeholder), false);
});

test('未知资产类型显式报错并带可用类型清单', () => {
  assert.throws(() => findRow(ASSET_MAP, '不存在'), (err) => {
    return err instanceof Error && err.message.includes('技能');
  });
});

test('软链规则展开：<agentDir>/<skillName> 占位符替换为实参', () => {
  const expanded = expandSymlinkRule('<agentDir>/skills/<skillName>', '.claude', 'dev-spec');
  assert.equal(expanded, '.claude/skills/dev-spec');
});
