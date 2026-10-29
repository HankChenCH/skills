---
id: 0001
status: done
need: 0001
round: 1
created: 2026-10-27
approved: 2026-10-27
done: 2026-10-29
---
# GitLab 出口选项、平台模型参考与 ref-git-commit 技能

## 问题陈述

用户初始化工作区后发现三件事缺位：想把产物出口设为 GitLab 却没有该选项；批 3 要写 tracker 适配器，但三平台的 issue 与 PR/MR 模型没有现成参考，届时只能重新调研；提交与合并信息的规范散落在蓝图与范文里，没有一份"什么是好"的标准可以在实现与交付时加载。

## 方案

三件事，全部落在既有扩展点上（不改门禁逻辑）：

1. **GitLab 出口选项**：决策 1 的选项集从 local / GitHub / 云效 Codeup 扩为四选。选 GitLab 时验证 `glab auth status`：通过则问 GitLab 仓库标识（`group/project`，可从 `git remote get-url origin` 解析后复述确认）写入 `TRACKER_REPO`；不通过（未安装/未登录）则明确告知回落 local，不静默降级。publish 适配器仍属批 3，向用户如实相告（与 GitHub/Codeup 同一话术）。
2. **平台模型参考文档**：research 0001（2026-10-27 已产出）作为 tracker 平台模型的唯一参考，覆盖三平台对象模型、编号与引用语法、状态与评审模型、API/CLI 入口、映射要点，每条带一手来源与检索日期；工单落地时按本 spec 清单核验并在 decisions.md 中挂引用。
3. **ref-git-commit 技能**：新增第 5 个参考技能，定义规范提交与合并信息；蓝图 §7 三层架构、§7.1 内容要点、§7.2 引用矩阵（dev-implement 开工装载、dev-ship 装载）、§10.1 清单（19→20）、§10.2 批次归属同步登记。

## 用户故事

- 作为仓库主人，我想在 setup 决策 1 选择 GitLab 作为出口，以便在自己惯用的平台上跟踪产物投影。
- 作为适配器实现者（批 3 的我），我想打开一份带来源的平台模型参考，以便各适配器开工时不重复调研、不踩编号空间的坑。
- 作为开发者与 AI，我想在提交与合并时有同一份标准可对照，以便提交历史可读、`[#NNNN]` 门禁信息始终一致。

## 实现决策

- **蓝图修订（先文档后技能）**：§5.5 config.sh 注释 TRACKER 枚举改 `local | github | gitlab | codeup`；§11.1 流程 3 决策①补 GitLab 分支；§7 架构图与 §7.1 参考技能 4→5（补 ref-git-commit 内容要点）；§7.2 引用矩阵加 dev-implement / dev-ship 两行；§10.1 清单加行（19→20）；§10.2 批 1 增补 ref-git-commit（随批 1 余量）、批 3 的适配器组补 gitlab；§14 待定项更新（GitLab 适配器入批 3 调研，参考文档已就绪）。
- **assets 同步**：setup-workspace 的 assets/METHOD.md §8 TRACKER 注释同步枚举；仓库根 docs/METHOD.md 为其生成物，随之保持一致。config.sh 模板（references/generation.md 内）TRACKER 取值说明同步。GLOSSARY.md 无需改动（流程术语已覆盖）。
- **setup-workspace 技能**：SKILL.md 决策 1 文案加 GitLab 选项（一行）；references/decisions.md 决策 1 增 GitLab 小节——验证 `glab auth status`、通过后问 `group/project`（或从 remote 解析复述确认）、不通过明确告知回落 local、适配器属批 3 如实相告，并引用 research 0001 作为适配器实现参考；check.sh 不改（publish 分支 TRACKER 无关，已核实 .sdlc/check.sh:449-461 的 case 落入 `*` 警告分支）。
- **测试**：tests/run-tests.sh 镜像现有 github 用例（run-tests.sh:643-644）增 TRACKER=gitlab 的 publish 警告放行用例；补断言 setup 产物含 gitlab 字样的文案用例（若现有结构支持）。
- **ref-git-commit 内容**：按蓝图 §11.3 格式（30–60 行、内嵌范例 + 好/差对照、frontmatter 注明内部参考身份与加载时机）。内容要点：提交粒度（一次提交一件事，对应一个验收标准或一次绿循环）；首行结构（`[#NNNN]` / `[trivial]` 前缀 + 祈使句摘要，说"做了什么"不说"改了哪个文件"）；正文写什么（为什么这么改、副作用与证据，不重复 diff 能看出的 what）；合并信息（merge commit 保留时机、squash 时 message 收敛为首行规范、PR/MR 描述里的工单引用语法随平台——引用 research 0001）。安装到 `~/.zcode/skills/ref-git-commit`（符号链接，与 dev-review 同法）。

## 测试决策

- seam：check.sh publish 的 TRACKER 分派行为；tests/run-tests.sh 的夹具仓库（TMP + config.sh 注入）。
- 既有同类先例：TRACKER=github 的"适配器未实现警告并放行"用例（run-tests.sh:643-644），gitlab 用例照此镜像。
- 断言方式：沿用 `t <名称> <期望exit> <命令> <期望输出子串>` 的测试骨架，不引入新框架。

## 验收场景

- [FR-1 | 工单级] Given 全新夹具仓库运行 setup-workspace，When 决策 1 选 GitLab 且 `glab auth status` 通过，Then config.sh 写入 `TRACKER=gitlab` 与 `TRACKER_REPO=<group/project>`。
- [FR-1 | 工单级] Given 决策 1 选 GitLab 且 glab 未安装或未登录，When 流程走到验证步，Then 明确告知"glab 未登录，无法验证 GitLab 出口，已回落 local"并写 `TRACKER=local`，不静默。
- [FR-2 | 工单级] Given docs/research/0001 存在，When 按本 spec 清单核验（三平台对象模型/编号引用语法/状态与评审模型/API/CLI 入口/映射要点五节齐全），Then 每节有一手来源与检索日期，references/decisions.md 的 GitLab 小节挂有该引用。
- [FR-3 | 工单级] Given skills/ref-git-commit/SKILL.md 存在，When 对照蓝图 §11.3 与 §12 文风基准检查，Then 30–60 行、含好/差对照、frontmatter 注明内部参考身份与加载时机，且蓝图 §7/§7.2/§10.1/§10.2 均已登记。
- [FR-3 | 集成级] Given 未来 dev-implement / dev-ship 实现（批 1 余项），When 其按蓝图 §7.2 引用矩阵开工装载，Then 无需再改 ref-git-commit 本体即可获得提交/合并信息标准。

## 非目标

不实现任何平台的 publish 适配器脚本（.sdlc/trackers/{github,gitlab,codeup}.sh，批 3）；不改 .sdlc/check.sh；不动 dev-review / ref-review / ref-implementation 已完成物；不做 Codeup MCP 配置指引细化（蓝图 §14 留批 3）。

## 备注

决策 1 的 GitHub 与云效 Codeup 选项行为不变；本仓库当前 config.sh 的 `TRACKER=github` 不受影响。research 0001 于 2026-10-27 随本 spec 调研产出，属 research 产物（无状态、纯参考），其入库核验由工单 0001 承担。
