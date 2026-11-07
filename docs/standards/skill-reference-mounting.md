# skill-reference-mounting

参考技能挂载的双落点纪律。来源：spec 20261107-2f42 运行评审 20261107-36a7 阻断 1——仅写 frontmatter description 的挂载在执行链路不可达（实测 Skill 工具装载返回不含 frontmatter，执行者看不到那句话）。

## 规则

1. **挂载 = 发现面 + 执行面双落点**：frontmatter description 只达发现面（技能列表枚举时可见），技能装载后执行者看不到它。凡「A 技能要在 B 技能会话内加载参考 C」必须两处齐：description 含挂载语（发现面）+ B 正文装载上下文/纪律节写装载动作行（执行面，形如「……时用 Skill 工具装载 C」，照 design-ui ref-writing 装载行先例）。
2. **蓝图 §7.2 引用矩阵同批登记**：装载关系落 docs/sdlc-skills-blueprint.md §7.2 矩阵行，作为全库装载关系的成文单点；家族枚举值新增时按 dual-copy-assets #5 全库枚举点 grep 同批改（README 参考层、docs/concepts.md 内部参考条目）。

## 反例

只在 description 追加「加载 ref-C」、正文零提及——装载后指令不可达，挂载意图落空；发现面有语、执行面无动作，两处缺一即挂载失效。
