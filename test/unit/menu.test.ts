import { test } from 'node:test';
import assert from 'node:assert/strict';

import { skillOptions } from '../../src/kernel/menu.ts';
import { resolveSkillSelection } from '../../src/commands/skill/names.ts';
import { resolvePluginSelection } from '../../src/commands/plugin/names.ts';

// 交互构造与守卫域（spec 20261116-2c58 测试决策 S3；解析矩阵域归 cli.test.ts，真实进程
// 三通道归 e2e）。票 20261116-f761：skill add 无参交互分支与非 TTY 守卫断言落本文件。
// 票 20261116-ccfb：plugin add 交互分支（预置 profile 与否）同域落本文件。
// 票 20261116-bfcf：第一层资产类型单选构造（typeOptions）随裸跑改帮助退役删除；非 TTY
// 守卫断言全仓库只在本文件保留一份（承接 20261116-f761 评审标准轴 #3 同域分工口径），
// plugin add 无参非 TTY 分支的真实进程行为由 e2e（plugin-install FR-3）逐字节承接。

// ---------- 条目多选构造（按名排序、描述提示，技能与插件共用） ----------

test('第二层技能选项按名排序并带描述', () => {
  const options = skillOptions(['beta', 'alpha'], { alpha: 'A 描述', beta: 'B 描述' });
  assert.deepEqual(options.map((o) => o.value), ['alpha', 'beta']);
  assert.equal(options[0].hint, 'A 描述');
});

test('第二层无描述的技能提示为空字符串而非 undefined', () => {
  const options = skillOptions(['alpha'], {});
  assert.equal(options[0].hint, '');
});

// ---------- skill add 无参交互分支与非 TTY 守卫（spec S3 交互守卫域）----------

test('无参且有 TTY：进交互勾选分支', () => {
  assert.deepEqual(resolveSkillSelection({ tokens: [], all: false, isTTY: true }), { kind: 'interactive' });
});

// 非 TTY 守卫文案 = spec 命令面契约原文（两命令共用同一条，含 plugin add 用法指引）
const ERR_TTY_GUARD =
  '交互选择需要终端（TTY）；非交互请改用 skill add <名...>、skill add --all 或 plugin add <名...> --profile <名>';

test('无参且非 TTY：按守卫文案报错（spec 契约原文，全仓库单点断言）', () => {
  assert.deepEqual(resolveSkillSelection({ tokens: [], all: false, isTTY: false }), {
    kind: 'error',
    message: ERR_TTY_GUARD,
  });
});

// ---------- plugin add 交互分支（spec S3 交互守卫域）----------

test('plugin add 无参且有 TTY：进交互分支（不预置 profile，进插件多选 + profile 选择）', () => {
  assert.deepEqual(resolvePluginSelection({ tokens: [], profile: undefined, isTTY: true }), {
    kind: 'interactive',
    presetProfile: undefined,
  });
});

test('plugin add 无名但有 --profile dev：进交互分支且预置 profile（不再提示 profile）', () => {
  assert.deepEqual(resolvePluginSelection({ tokens: [], profile: 'dev', isTTY: true }), {
    kind: 'interactive',
    presetProfile: 'dev',
  });
});
