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

// 行模型（TS 迁移，票 20261115-d437）：按 mechanism 判别的 union。
// 占位行用 `?: undefined` 补齐同名字段，使 union 成员的公共字段访问保持总型一致
//（runtime 对象形态与迁移前逐字段相同，不新增任何键）。
export interface CopyRow {
  type: string;
  mechanism: 'copy';
  sourceDir: string;
  installTarget: string;
  symlinkRule: string;
}

export interface CommandRow {
  type: string;
  mechanism: 'command';
  sourceDir: string;
}

export interface PlaceholderRow {
  type: string;
  mechanism?: undefined;
  sourceDir?: undefined;
  installTarget?: undefined;
  symlinkRule?: undefined;
}

export type AssetRow = CopyRow | CommandRow | PlaceholderRow;

export const SKILLS_TYPE = '技能';
export const PLUGINS_TYPE = '插件';

export const ASSET_MAP: AssetRow[] = [
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

export function isCommandRow(row: AssetRow): row is CommandRow {
  return row.mechanism === 'command';
}

export function isInstallableRow(row: AssetRow): row is CopyRow | CommandRow {
  if (isCommandRow(row)) {
    return Boolean(row.sourceDir);
  }
  return Boolean(row.installTarget) && Boolean(row.symlinkRule);
}

// 按类型名取映射行；已知类型名（SKILLS_TYPE/PLUGINS_TYPE 字面量）走重载返回窄行型，
// 未知类型名（交互菜单运行时取值）返回总型，调用侧以 isCommandRow/isInstallableRow 判别收窄。
export function findRow(map: AssetRow[], typeName: typeof SKILLS_TYPE): CopyRow;
export function findRow(map: AssetRow[], typeName: typeof PLUGINS_TYPE): CommandRow;
export function findRow(map: AssetRow[], typeName: string): AssetRow;
export function findRow(map: AssetRow[], typeName: string): AssetRow {
  const row = map.find((entry) => entry.type === typeName);
  if (!row) {
    const available = map.map((entry) => entry.type).join('、');
    throw new Error(`未知资产类型「${typeName}」；映射表中可用类型：${available}`);
  }
  return row;
}

export function expandSymlinkRule(rule: string, agentDir: string, skillName: string): string {
  return rule.replaceAll('<agentDir>', agentDir).replaceAll('<skillName>', skillName);
}
