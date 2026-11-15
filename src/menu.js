// 两层菜单构造（spec 20261115-8975 非交互/交互决策）。
//
// 第一层 = 资产类型单选，选项直接由映射表行生成：可安装行显示「来源 → 目标」，
// 占位行显示「占位 · 本轮不可安装」（选中后由 CLI 显式退出、零动作）。
// 第二层 = 条目多选，按名排序、带描述提示。

import { isInstallableRow } from './asset-map.js';

export function typeOptions(map) {
  return map.map((row) => ({
    value: row.type,
    label: row.type,
    hint: isInstallableRow(row)
      ? `安装到 ${row.installTarget}/`
      : '占位 · 本轮不可安装',
  }));
}

export function skillOptions(names, descriptions) {
  return [...names].sort().map((name) => ({
    value: name,
    label: name,
    hint: descriptions[name] ?? '',
  }));
}
