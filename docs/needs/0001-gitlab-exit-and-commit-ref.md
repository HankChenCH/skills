---
id: 0001
status: confirmed
created: 2026-10-27
confirmed: 2026-10-27
---
# 出口平台扩展（GitLab）与提交/合并信息规范

## 背景与业务目标

setup-workspace 于 2026-10-26 完成并首次实战接入本仓库（2026-10-27）。用户审核后提出三条修改建议：① 产物与 issue 出口当前只有 local / GitHub / 云效 Codeup 三选，缺 GitLab——主流托管平台覆盖不全；② 批 3 实现 tracker 适配器时，三平台的 issue 与 PR/MR 模型没有现成参考，届时必然重复调研；③ 提交与合并信息规范目前散落两处（蓝图 §5.6 的 `[#NNNN]` 规则、dev-implement 范文 §3 的提交节奏），没有"什么是好"的独立标准可加载。

业务目标：出口选项覆盖个人开发者的主流托管平台；平台模型知识一处沉淀供适配器实现直接引用；提交/合并信息有唯一的标准文件，实现与评审共用。

## 干系人与用户

用户即"个人 + AI 协作开发"的开发者本人（本仓库唯一干系人）：
- 作为仓库主人，要能在初始化工作区时把产物出口设为 GitLab；
- 作为批 3 适配器实现者，要能从一份参考文档直接拿到三平台的对象模型、编号规则、API/CLI 入口；
- 作为开发者与 AI 协作方，要能在实现（dev-implement）与交付（dev-ship）时加载同一份提交/合并信息标准。

## 系统能力需求

- **FR-1**：setup-workspace 决策 1（产物与 issue 出口）提供 GitLab 选项；选中时经验证写入 `TRACKER=gitlab`；验证不通过时明确告知并回落 local，不静默降级。
- **FR-2**：存在一份 tracker 平台模型参考文档，覆盖 GitHub / GitLab / 云效 Codeup 的 issue 与 PR/MR 模型：对象与字段、状态、编号与引用语法、评审模型、API/CLI 入口、对 tracker 的映射要点；每条结论带一手来源与检索日期。
- **FR-3**：存在 ref-git-commit 参考技能，定义规范提交与合并信息（提交粒度、首行结构与工单引用、正文写法、合并方式与合并信息）；由 dev-implement（提交节奏）与 dev-ship（PR/合并）在指定时机加载。

## 场景

- Given 用户运行 setup-workspace 到决策 1，When 选择 GitLab 且凭据验证通过，Then config.sh 写入 `TRACKER=gitlab` 与对应仓库标识，收尾报告如实说明适配器属批 3。
- Given 用户选择 GitLab 但凭据验证不通过，Then 明确告知"验证失败，已回落 local"，不静默降级。
- Given 批 3 适配器开工，When 实现者打开参考文档，Then 三平台模型、编号语法与映射陷阱可直接取用，无需重新调研。
- Given dev-implement 正在提交或 dev-ship 正在准备合并，When 按引用矩阵加载 ref-git-commit，Then 提交/合并信息有可对照的标准（首行带 [#NNNN]、一次提交一件事等）。

## 假设与风险

- 假设：GitLab 侧的凭据验证走官方 `glab` CLI 的 `glab auth status`（与 GitHub 验 `gh auth status` 对齐）。错了代价低（换验证方式不影响 FR-1 行为），不确定度低。
- 风险：三平台 API/文档随版本漂移（GitLab issue 已迁入 work items 框架即一例）。代价：参考文档误导适配器实现；不确定度：中。缓解：文档每条带来源与检索日期，并写明"实现时复核"。
- 风险：ref-git-commit 使参考技能从 4 个变 5 个，蓝图 §7 的计数表述与引用矩阵需同步，漏改则文档漂移。代价：低；缓解：并入同一工单验收。

## 范围与非目标

范围：setup-workspace 决策流与 config 模板的 GitLab 选项（含蓝图 / METHOD.md 文案同步与测试）；tracker 平台模型参考文档；ref-git-commit 技能与蓝图登记（三层架构、引用矩阵、清单、批次）。

非目标：不实现 gitlab / github / codeup 的 publish 适配器本体（批 3 事项，本变更只留选项与参考文档）；不改 check.sh 门禁逻辑（publish 分支已核实为 TRACKER 无关，见 .sdlc/check.sh:449-461）；不新增 Codeup MCP 指引细化（仍按蓝图 §14 留批 3）。

## 开放问题

（已全部拍板，2026-10-27 用户"全同意"按默认建议执行：）

- ① GitLab 凭据验证方式：**采用 `glab auth status`**（与 GitHub 的 gh 对齐），未安装/未登录则明确告知回落 local。
- ② ref-git-commit 的加载时机：**仅 dev-implement（开工装载）+ dev-ship（装载）**，不挂 dev-review——评审轴已有 ref-review/ref-implementation，避免上下文膨胀。
