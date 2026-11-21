// 投影同步静态断言（spec 20261119-20b1，票 20261119-2521）。
//
// 投影判定树单点在 METHOD「投影约定」节，各技能 publish 步骤只引用不复述；本文件守护
// 文档面单点与分发副本一致性：METHOD §7.1 三级判定树 / MCP 发现链 / 受理面 / 终态映射、
// publish 行、GLOSSARY「投影」词条、蓝图 v1.41 修订记录（§5.4 / §11.1 / §14）、
// 双份资产逐字同文（dual-copy-assets 纪律：改动落活本、assets 整文件复制同步）。
// 期望值独立来源 = spec 20261119-20b1 实现决策 1–7 与验收场景 FR-7 原文（非实现推导）。
// （手法先例：ci-workflow.test.ts「文件即契约」静态守护、docs-surface.test.ts 文档面守护。）

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(packageRoot, rel), 'utf8');

test('METHOD 投影约定节：三级判定树、MCP 发现链、受理面、终态映射单点齐备', () => {
  const method = read(path.join('docs', 'METHOD.md'));
  for (const needle of [
    // 三级判定树（MCP → REST 适配器 → 警告跳过 exit 0）
    '### 7.1 投影约定',
    'Codeup MCP 工具 → 走 MCP 路径（投影零 REST 配置）',
    'REST 适配器路径',
    '警告并跳过（exit 0）',
    // MCP 发现链（组织 / 空间自动匹配与回写记忆化 / Req 默认类型 / 当前用户负责人）
    'get_current_organization_info',
    'search_projects',
    '唯一命中直接用',
    '回写 config.sh `TRACKER_REPO` 记忆化',
    'get_work_item_types',
    'get_current_user',
    // 投影受理面（need 建单 / 谱系知识档评论 / 票与过程档及独立知识档跳过）
    '过程档不入云效',
    '无 need 谱系',
    'MARKDOWN 评论',
    // 终态映射（终态集合 → 已完成 100014 / rejected → 已取消 141230）
    '已完成（内置状态 100014）',
    '已取消（141230）',
  ]) {
    assert.ok(method.includes(needle), `METHOD 投影约定节应含 ${needle}`);
  }
});

test('METHOD publish 行：指向 §7.1 投影约定并声明双路径同口径', () => {
  const method = read(path.join('docs', 'METHOD.md'));
  for (const needle of ['按 §7.1 投影约定执行', '两路径同口径']) {
    assert.ok(method.includes(needle), `METHOD publish 行应含 ${needle}`);
  }
  assert.equal(
    method.includes('codeup 工作项关闭暂不实现'),
    false,
    'METHOD publish 行不得残留「codeup 工作项关闭暂不实现」旧口径',
  );
});

test('GLOSSARY「投影」词条：双路径同口径形态与 codeup 终态关闭齐备', () => {
  const glossary = read('GLOSSARY.md');
  for (const needle of [
    'METHOD「投影约定」',
    'Codeup MCP',
    'need 建需求单（Req 类）',
    '已取消（141230）',
  ]) {
    assert.ok(glossary.includes(needle), `GLOSSARY「投影」词条应含 ${needle}`);
  }
  assert.equal(glossary.includes('codeup 工作项关闭暂不实现'), false, 'GLOSSARY 投影词条不得残留 codeup 关闭暂不实现旧口径');
});

test('蓝图 v1.41：修订记录、§5.4 publish 行、§11.1 决策①、§14 指引条目齐备', () => {
  const blueprint = read(path.join('docs', 'sdlc-skills-blueprint.md'));
  assert.ok(blueprint.includes('v1.41 修订记录'), '蓝图应含 v1.41 修订记录');
  for (const needle of [
    // §11.1 决策① Codeup 分支 MCP 优先形态（v1.43 起 TRACKER=codeup 为前置门语境）
    'MCP 优先：选 Codeup 出口即 TRACKER=codeup，检测到 Codeup MCP 即投影零 REST 配置',
    // §14 MCP 指引条目反转（v1.12 旧形态退役）
    'MCP 优先（零 REST 配置投影',
    // §5.4 publish 行双路径同口径 + codeup 终态映射
    'need 建需求单（category=Req）',
    '已完成 100014',
  ]) {
    assert.ok(blueprint.includes(needle), `蓝图应含 ${needle}`);
  }
});

test('分发副本逐字同文：METHOD / GLOSSARY 活本与 assets 模板', () => {
  // dual-copy-assets 纪律 #4：改动落活本，assets 用整文件复制保持逐字一致。
  // 活本 docs/METHOD.md 与根 GLOSSARY.md，assets 模板不带 docs/ 层级。
  for (const [liveRel, assetRel] of [
    [path.join('docs', 'METHOD.md'), 'METHOD.md'],
    ['GLOSSARY.md', 'GLOSSARY.md'],
  ] as const) {
    const live = read(liveRel);
    const asset = read(path.join('skills', 'setup-workspace', 'assets', assetRel));
    assert.equal(asset, live, `${liveRel} 与 assets 模板应逐字一致`);
  }
});

test('分发副本逐字同文：codeup.sh 活本与 assets 分发副本', () => {
  const live = read(path.join('.sdlc', 'trackers', 'codeup.sh'));
  const asset = read(path.join('skills', 'setup-workspace', 'assets', 'trackers', 'codeup.sh'));
  assert.equal(asset, live, 'codeup.sh 活本与 assets 分发副本应逐字一致');
});

// 七技能 publish 步骤引用话术（spec 实现决策 1：只引用投影约定 + 会话自查 MCP，不复制判定树全文）。
// 话术全库唯一出处 = 本常量与七份 SKILL.md；METHOD §7.1 是约定本体，技能层只保留这一句引用。
const PUBLISH_CITATION =
  '投影按 METHOD「投影约定」执行：config.sh TRACKER=codeup 且会话有 Codeup MCP 工具走 MCP 路径零 REST 配置，其余一律走 REST 适配器同口径，失败警告跳过 exit 0 不阻断。';
const SEVEN_SKILLS = [
  'dev-clarify',
  'dev-spec',
  'dev-plan',
  'dev-accept',
  'dev-ship',
  'dev-fix',
  'dev-quick-implement',
] as const;

test('七技能 publish 步骤：投影约定引用 + MCP 自查话术逐字齐备', () => {
  for (const skill of SEVEN_SKILLS) {
    const text = read(path.join('skills', skill, 'SKILL.md'));
    assert.ok(text.includes(PUBLISH_CITATION), `${skill} publish 步骤应含投影约定引用话术`);
  }
});

test('七技能不复制判定树全文（发现链与终态映射细节不出技能层）', () => {
  for (const skill of SEVEN_SKILLS) {
    const text = read(path.join('skills', skill, 'SKILL.md'));
    for (const token of [
      'get_current_organization_info',
      'search_projects',
      'get_work_item_types',
      '100014',
      '141230',
    ]) {
      assert.equal(text.includes(token), false, `${skill} 不得复制判定树细节 ${token}`);
    }
  }
});

test('setup 决策 1 Codeup 分支：MCP 优先（零配置）+ 适配器兜底（三项 REST 配置）形态', () => {
  const decisions = read(path.join('skills', 'setup-workspace', 'references', 'decisions.md'));
  for (const needle of [
    'MCP 优先（零配置）',
    '适配器兜底（三项 REST 配置）',
    '回写 config.sh `TRACKER_REPO` 记忆化',
  ]) {
    assert.ok(decisions.includes(needle), `决策 1 Codeup 分支应含 ${needle}`);
  }
  assert.equal(
    decisions.includes('适配器直连优先'),
    false,
    '决策 1 不得残留「适配器直连优先」旧形态',
  );
});

test('setup SKILL.md 与 generation.md：MCP 优先话术同步', () => {
  const skill = read(path.join('skills', 'setup-workspace', 'SKILL.md'));
  const generation = read(path.join('skills', 'setup-workspace', 'references', 'generation.md'));
  for (const [name, text] of [
    ['SKILL.md', skill],
    ['generation.md', generation],
  ] as const) {
    assert.ok(text.includes('MCP 优先'), `${name} 应含 MCP 优先话术`);
    assert.ok(text.includes('三项 REST 配置'), `${name} 应含适配器兜底配置清单话术`);
  }
});

// ── fix 票 20261121-6089：MCP 路径加 TRACKER=codeup 前置门 ──
// 缺陷：旧判定树第一级只看「会话有无 Codeup MCP 工具」，TRACKER=github/gitlab/local 的项目在
// 挂了云效 MCP 的会话里被 MCP 路径截胡（浪费发现链调用、产物投错远端），违反 spec 20261119-20b1
// 非目标「github/gitlab 腿零改动」。期望值独立来源 = 票 20261121-6089 验收标准与 v1.43 修订拍板话术。

test('METHOD 判定树：MCP 路径以 TRACKER=codeup 为前置门，TRACKER≠codeup 项目不被截胡', () => {
  const method = read(path.join('docs', 'METHOD.md'));
  // 新门话术存在：判定树第一级以 TRACKER=codeup 起头
  assert.ok(
    method.includes('`TRACKER=codeup` 且会话检测到 Codeup MCP 工具 → 走 MCP 路径（投影零 REST 配置）'),
    '§7.1 判定树第一级应含 TRACKER=codeup 前置门',
  );
  // 旧无门形态退役：缺陷文本本身不得残留
  assert.equal(
    method.includes('**三级判定树**：会话检测到 Codeup MCP 工具'),
    false,
    '§7.1 判定树不得残留无 TRACKER 门的旧形态',
  );
  // §7 publish 行同口径
  assert.ok(
    method.includes('TRACKER=codeup 且会话检测到 Codeup MCP 工具走 MCP 路径'),
    '§7 publish 行应含 TRACKER=codeup 前置门话术',
  );
});

test('七技能 publish 步骤投影话术：含 TRACKER=codeup 前置门，旧无门话术退役', () => {
  for (const skill of SEVEN_SKILLS) {
    const text = read(path.join('skills', skill, 'SKILL.md'));
    assert.ok(text.includes('TRACKER=codeup'), `${skill} 投影话术应含 TRACKER=codeup 前置门`);
    assert.equal(
      text.includes('先自查会话有无 Codeup MCP 工具'),
      false,
      `${skill} 不得残留无门旧话术`,
    );
  }
});

test('蓝图 v1.43 与 setup 侧：TRACKER=codeup 前置门修订齐备', () => {
  const blueprint = read(path.join('docs', 'sdlc-skills-blueprint.md'));
  assert.ok(blueprint.includes('v1.43 修订记录'), '蓝图应含 v1.43 修订记录');
  assert.ok(
    blueprint.includes('TRACKER=codeup 时 MCP 优先'),
    '蓝图 §14 应含 TRACKER=codeup 时 MCP 优先话术',
  );
  const decisions = read(path.join('skills', 'setup-workspace', 'references', 'decisions.md'));
  assert.ok(
    decisions.includes('TRACKER=codeup）且检测到 Codeup MCP'),
    '决策 1 MCP 优先分支应含 TRACKER=codeup 语境门',
  );
});
