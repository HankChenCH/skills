// 两层菜单构造（spec 20261115-8975 非交互/交互决策 + 20261115-495e 机制分发）。
//
// 第一层 = 资产类型单选，选项直接由映射表行按机制生成：copy 行显示「来源 → 目标」，
// command 行显示官方命令转发语义，占位行显示「占位 · 本轮不可安装」（选中后由 CLI 显式退出、零动作）。
// 第二层 = 条目多选，按名排序、带描述提示（技能与插件共用）。

import { isCommandRow, isInstallableRow } from './asset-map.js';

export function typeOptions(map) {
  return map.map((row) => ({
    value: row.type,
    label: row.type,
    hint: !isInstallableRow(row)
      ? '占位 · 本轮不可安装'
      : isCommandRow(row)
        ? '经宿主官方命令安装进 dsh profile'
        : `安装到 ${row.installTarget}/`,
  }));
}

export function skillOptions(names, descriptions) {
  return [...names].sort().map((name) => ({
    value: name,
    label: name,
    hint: descriptions[name] ?? '',
  }));
}
