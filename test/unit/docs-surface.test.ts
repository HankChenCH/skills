// 面向使用者的文档命令面静态断言（spec 20261116-2c58 FR-6，票 20261116-bfcf）。
//
// README.md 与 docs/getting-started.md 的命令示例必须与新命令面同相：含 `skill add` /
// `plugin add` 形态示例与升级叙事，不含已退役旧旗标名（--skills/--plugins）与裸跑两层菜单
// 旧形态描述；GLOSSARY 安装器词条含子命令形态描述。期望值独立来源 = spec FR-6 验收场景原文
// 与票面文档纪律（非实现推导）——命令面再变时，本测试与文档同批改。
// （手法的先例：ci-workflow.test.ts「文件即契约」静态守护。）

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(packageRoot, rel), 'utf8');

// 已退役旧形态（FR-6 负向断言清单）：旧旗标名 + 裸跑两层菜单叙事
const RETIRED_TOKENS = ['--skills', '--plugins', '两层菜单'];

test('README 快速上手：skill add 形态示例、不含旧旗标与两层菜单旧形态', () => {
  const readme = read('README.md');
  assert.ok(readme.includes('npx @hankchen/infra skill add'), 'README 应含 skill add 形态示例');
  for (const token of RETIRED_TOKENS) {
    assert.equal(readme.includes(token), false, `README 不得含旧形态 ${token}`);
  }
});

test('getting-started：skill add 与 plugin add 形态示例齐备、不含旧旗标与两层菜单旧形态', () => {
  const guide = read(path.join('docs', 'getting-started.md'));
  for (const needle of [
    'npx @hankchen/infra skill add',
    'npx @hankchen/infra skill add --all',
    'npx @hankchen/infra plugin add @hankchen/dsh-demo --profile',
    'npx @hankchen/infra plugin add',
  ]) {
    assert.ok(guide.includes(needle), `getting-started 应含 ${needle}`);
  }
  for (const token of RETIRED_TOKENS) {
    assert.equal(guide.includes(token), false, `getting-started 不得含旧形态 ${token}`);
  }
});

test('getting-started：升级叙事含「重跑 skill add 即刷新」与 0.1.x 使用者指路', () => {
  const guide = read(path.join('docs', 'getting-started.md'));
  assert.ok(guide.includes('重跑即升级'), '应含重跑刷新叙事');
  assert.match(guide, /从 0\.1\.x 升级[^]*?skill add/, '应含 0.1.x 使用者改跑 skill add 即刷新的升级指路');
});

test('GLOSSARY 安装器词条：含子命令形态描述（skill add / plugin add --profile）', () => {
  const glossary = read('GLOSSARY.md');
  for (const needle of ['skill add [名...]', 'plugin add [名...] --profile <名>']) {
    assert.ok(glossary.includes(needle), `GLOSSARY 安装器词条应含子命令形态 ${needle}`);
  }
});
