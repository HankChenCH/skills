# skills

个人软件开发生命周期（SDLC）方法论的项目仓库。2026-10-25 的设计会话《构建贯穿软件开发生命周期的个人方法论》已完成方法论定稿，产出一份设计蓝图；本仓库是那份蓝图与全部概念的归档地，也是后续实现 20 个技能的工作现场。

## 目录

| 路径 | 说明 |
|---|---|
| [skills/](./skills/) | **技能实现**：按蓝图实现的技能一律放这里，每个技能一个子目录（`skills/<技能名>/SKILL.md`，如 `skills/setup-workspace/`）。安装时拷贝/链接到 `~/.zcode/skills/`。 |
| [docs/sdlc-skills-blueprint.md](./docs/sdlc-skills-blueprint.md) | **SDLC 技能集设计蓝图**（唯一设计真相源）：设计原则、四层反绕过防御、流程拓扑（脊柱 + V 模型 + 循环）、工作区规范、产物模板与状态机、20 个技能的清单与规格、文风基准、自测清单。逐字归档自会话，治理规则（先改文档再改技能）继续适用。 |
| [docs/concepts.md](./docs/concepts.md) | **概念定位档案**：会话中提及的全部概念，每条含定位（是什么）、来源（外部出处 / 方法自创）、落点（蓝图章节 / 承载技能）。按流程拓扑、门禁、产物追溯、实现质量、AI 协作、平台六组组织。 |
| [docs/sessions/2026-10-25-sdlc-method-session.md](./docs/sessions/2026-10-25-sdlc-method-session.md) | **会话纪要**：7 轮决策时间线、每次拍板的内容、归档由来。 |

## 下一步

按蓝图 §10.2 的批次计划，在新会话中逐个实现技能。批 1 已完成 setup-workspace（2026-10-26，含 check.sh 门禁脚本与 60 项脚本化测试）、sdlc 总控（2026-10-27，含 next 模式路由表与上下文 token 水位线）以及 ref-implementation、ref-review、dev-review、ref-git-commit，下一个是 ref-writing。开工话术：

> 读 docs/sdlc-skills-blueprint.md 的 §2–§8、§7.1 和 §11.3，按 §12 的文风基准实现 ref-writing 技能，装到 `~/.zcode/skills/`，建完跑 §13.2 的自测清单。

每建完一个技能，在蓝图 §10.2 对应条目标注完成日期（蓝图兼作进度台账）。改动技能行为前先改蓝图（治理规则：先文档后技能）。
