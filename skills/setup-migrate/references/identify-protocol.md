# 套件识别协议（特征清单、只读纪律与 E1）

主文档 §2 识别的本细则。识别对象只有 **matt** 与 **superpower** 两套点名套件，
**不做通用识别器**；识别全程**只读**：不改、不建、不删目标仓库任何文件
（含临时文件）。

## 识别报告（三类痕迹，逐类覆盖）

识别产出迁移报告，交用户过目后才进入翻译处置（主文档 §3）；三类逐一覆盖，
查无该类痕迹时显式写「未发现」，不略节：

1. **技能目录生命周期技能清单**——逐个列技能名与安装位置（判据见下方两套清单）。
2. **tracker 外来 issue 清单**——逐条列 issue 编号、平台、triage 标签与开闭状态。
3. **本地痕迹**——本地 tracker 目录、规则文件、配置目录等，逐件列路径与证据。

## matt 特征清单（2026-10-29 一手核验；来源：蓝图 §10.3 / §11.19）

- **技能目录中的生命周期类技能十四项**：to-spec、to-tickets、to-questionnaire、
  implement、implement-spec、code-review、tdd、research、domain-modeling、
  prototype、triage、handoff、retro、diagnosing-bugs。写作类（writing-* 等）
  按 §10.3 判据保留，不进本清单、不处置。
- **tracker 上带五枚 triage 标签的 spec / ticket issue**：标签为
  needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix。
- **本地 markdown tracker 目录**：`.scratch/`。
- **GLOSSARY-MAP.md**（仓库根或 docs/ 下）。
- **docs/agents/ 配置目录**。

## superpower 特征清单（来源：docs/research/0002-superpower-skills-suite.md，检索 2026-10-29；结论对 v7.0.1 快照负责）

按配置 / 磁盘 / 目标仓库三层识别；插件名**精确匹配** `superpowers`
（及 `superpowers@<marketplace>` 完整键）——同一 marketplace 的 `superpowers-*`
兄弟插件不是本套件，命中时按 E1 标「未处理」：

- **配置层**：`enabledPlugins` 含 `superpowers@claude-plugins-official` 或
  `superpowers@superpowers-marketplace`（值 true）；`known_marketplaces.json` 含
  `obra/superpowers-marketplace` 条目；`installed_plugins.json` 含 superpowers
  条目（version 字段读出安装版本，旧版本命中提示人工复核）。
- **磁盘层**：`~/.claude/plugins/cache/<marketplace>/superpowers/<版本>/` 目录树，
  `~/.claude/plugins/marketplaces/<marketplace>/` 克隆。
- **目标仓库层**：`docs/superpowers/specs/` 与 `docs/superpowers/plans/` 及其中
  设计文档 / 实现计划；`.superpowers/sdd/` 残留工作区
  （ledger / brief / report / plan-path）。
- 技能分类：15 个技能全部为生命周期/流程类或框架元类，写作类为 0——
  **不可用 writing- 前缀作写作类判据**（writing-plans / writing-skills 不是写作类）。
- 非 Claude Code harness（Codex / Cursor 等）的痕迹未列入本清单（调研 D3 不可考），
  命中时按 E1 标「未处理」；调研不可考范围（历史版本特征 / 元技能处置归属 /
  其他 harness）在用户拍板前一律「未处理」，不擅自处置。

## 只读纪律与 E1（非点名痕迹）

- 识别只读：本阶段允许的动作只有读文件、列目录、对 tracker 做只读查询；
  识别报告呈给用户，不落盘——落盘发生在清单收口（主文档 §3）。
- 识别出**非点名套件**的痕迹（未列入上述两套清单的一切套件痕迹）→
  对账清单标「未处理」并在备注提示用户，**不擅自处置**（E1）；
  点名清单之外的任何"看起来像"都不构成处置依据。
