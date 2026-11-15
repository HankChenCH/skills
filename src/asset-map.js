// 「资产类型 → 安装目标」映射表（spec 20261115-8975 实现决策 + 20261115-495e 行模型扩展）。
//
// 每行以 mechanism 声明安装机制（表驱动，新增资产类型 = 加行不改安装流程代码）：
//   copy 类行（技能）：文件拷贝 + 软链，落项目文件。字段：
//     type          类型名（菜单第一层显示名）
//     sourceDir     来源目录（包内相对路径）
//     installTarget 安装目标（项目内相对路径）
//     symlinkRule   agent 目录软链规则；<agentDir> 与 <skillName> 为展开占位符
//   command 类行（插件）：官方命令转发，不落项目文件；条目正名取各包 package.json name
//   （registry 名，非目录名）。字段：type、sourceDir（枚举插件目录）。
//   占位行：仅 type，菜单显示但不可安装（机制不变）。

export const SKILLS_TYPE = '技能';
export const PLUGINS_TYPE = '插件';

export const ASSET_MAP = [
  {
    type: SKILLS_TYPE,
    mechanism: 'copy',
    sourceDir: 'skills',
    installTarget: '.agents/skills',
    symlinkRule: '<agentDir>/skills/<skillName>',
  },
  {
    type: PLUGINS_TYPE,
    mechanism: 'command',
    sourceDir: 'plugins',
  },
  {
    type: '规范',
  },
];

export function isCommandRow(row) {
  return row.mechanism === 'command';
}

export function isInstallableRow(row) {
  if (isCommandRow(row)) {
    return Boolean(row.sourceDir);
  }
  return Boolean(row.installTarget) && Boolean(row.symlinkRule);
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
