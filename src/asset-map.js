// 「资产类型 → 安装目标」映射表（spec 20261115-8975 实现决策）。
//
// 每行恰四字段：
//   type         类型名（菜单第一层显示名）
//   sourceDir    来源目录（包内相对路径）
//   installTarget 安装目标（项目内相对路径）
//   symlinkRule  agent 目录软链规则；<agentDir> 与 <skillName> 为展开占位符
//
// 三字段皆为 null 的行是占位行：菜单显示类型名但不可安装。
// 新增资产类型 = 在 ASSET_MAP 加一行，不改安装流程代码。

export const SKILLS_TYPE = '技能';

export const ASSET_MAP = [
  {
    type: SKILLS_TYPE,
    sourceDir: 'skills',
    installTarget: '.agents/skills',
    symlinkRule: '<agentDir>/skills/<skillName>',
  },
  {
    type: '规范',
    sourceDir: null,
    installTarget: null,
    symlinkRule: null,
  },
];

export function isInstallableRow(row) {
  return row.sourceDir !== null && row.installTarget !== null && row.symlinkRule !== null;
}

export function findRow(map, typeName) {
  const row = map.find((entry) => entry.type === typeName);
  if (!row) {
    const available = map.map((entry) => entry.type).join('、');
    throw new Error(`未知资产类型「${typeName}」；映射表中可用类型：${available}`);
  }
  return row;
}

export function expandSymlinkRule(rule, agentDir, skillName) {
  return rule.replaceAll('<agentDir>', agentDir).replaceAll('<skillName>', skillName);
}
