import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSET_MAP,
  SKILLS_TYPE,
  isInstallableRow,
  findRow,
  expandSymlinkRule,
} from '../../src/asset-map.js';

const FOUR_FIELDS = ['type', 'sourceDir', 'installTarget', 'symlinkRule'].sort();

test('映射表含「技能」行：来源 skills/、目标 .agents/skills/', () => {
  const row = findRow(ASSET_MAP, '技能');
  assert.deepEqual(
    { type: row.type, sourceDir: row.sourceDir, installTarget: row.installTarget },
    { type: '技能', sourceDir: 'skills', installTarget: '.agents/skills' },
  );
});

test('映射表每行恰有四字段（类型名/来源目录/安装目标/软链规则）', () => {
  for (const row of ASSET_MAP) {
    assert.deepEqual(Object.keys(row).sort(), FOUR_FIELDS, `行 ${row.type} 字段集不符`);
  }
});

test('映射表类型名唯一', () => {
  const names = ASSET_MAP.map((row) => row.type);
  assert.equal(new Set(names).size, names.length);
});

test('技能行可安装，占位行（规范）不可安装', () => {
  assert.equal(isInstallableRow(findRow(ASSET_MAP, '技能')), true);
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
