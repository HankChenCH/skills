// 条目多选菜单构造（spec 20261115-8975 非交互/交互决策）：按名排序、带描述提示，
// 技能与插件共用。第一层资产类型单选构造（typeOptions）已随裸跑改帮助退役删除
//（spec 20261116-2c58、票 20261116-bfcf）——交互入口只剩 skill add / plugin add 的条目多选。

export interface MenuOption {
  value: string;
  label: string;
  hint: string;
}

export function skillOptions(names: string[], descriptions: Record<string, string>): MenuOption[] {
  return [...names].sort().map((name) => ({
    value: name,
    label: name,
    hint: descriptions[name] ?? '',
  }));
}
