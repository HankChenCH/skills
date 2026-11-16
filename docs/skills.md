# 技能清单（31 个）

本清单与仓库 [skills/](../skills/) 目录人工同步（改技能时自查，当前无机器门禁守护清单本身）；31 个技能随 npm 包 `@hankchen/infra` 原样分发。

**总控与初始化**

| 技能 | 职责 |
|---|---|
| [sdlc](../skills/sdlc/SKILL.md) | 流程总控（只读）：盘点现状、报告被哪个门禁挡住；next 模式自动推进到下一个决策点 |
| [setup-workspace](../skills/setup-workspace/SKILL.md) | 交互式初始化/升级工作区：生成门禁脚本与配置、装 git hooks，幂等可重跑 |
| [setup-reconstruct](../skills/setup-reconstruct/SKILL.md) | 存量项目知识逆向扫描：分轮只读读码，产出带 文件:行 证据与扫描基线的套件形态沉淀物，确认后落盘，重跑即增量对齐（按需服务，手动触发） |
| [setup-migrate](../skills/setup-migrate/SKILL.md) | 存量项目套件迁移：识别 matt / superpower 安装痕迹，外来产物逐件翻译映射、tracker issue 关闭、生命周期技能处置，两态接入本套件门禁，对账清单逐件留痕（按需服务，手动触发） |

**脊柱（一次变更的必经门禁线）**

| 技能 | 职责 |
|---|---|
| [dev-clarify](../skills/dev-clarify/SKILL.md) | 想法 → need：方法论亮牌路由 + 校准阶梯，开放问题三路归置清零 |
| [dev-spec](../skills/dev-spec/SKILL.md) | need/对话 → spec：固定模板，验收场景带 FR 追溯（孤儿报错），round 1 圈风险最大的最小范围 |
| [dev-plan](../skills/dev-plan/SKILL.md) | spec → 工票：tracer-bullet 垂直切片，`blocked-by` 阻塞边 |
| [dev-overview](../skills/dev-overview/SKILL.md) | 开工前总览：need/spec/design 与名下工票合成五节总览、走查归置缝隙；名下票 ≥2 的 spec 须 reviewed 总览才准开工（单票豁免） |
| [dev-implement](../skills/dev-implement/SKILL.md) | 按票实现：入口校验状态与依赖，出口跑全量检查 |
| [dev-review](../skills/dev-review/SKILL.md) | 双轴评审：标准轴（写得对不对）+ Spec 轴（做的是不是要的），两轴阻断清零才放行 |
| [dev-ship](../skills/dev-ship/SKILL.md) | 交付：PR 三节模板（Summary / Evidence / Merge Danger）、合并、工票 done |
| [dev-accept](../skills/dev-accept/SKILL.md) | 集成验收：逐条运行集成级场景、核销 FR 与业务成功标准，need 终态 fulfilled |

**编排与循环**

| 技能 | 职责 |
|---|---|
| [dev-execute](../skills/dev-execute/SKILL.md) | 整 spec 编排运行：依赖序 worktree 并行实现、逐票评审、一次合并收口 |
| [dev-quick-implement](../skills/dev-quick-implement/SKILL.md) | 快通道（spec 20261111-1dcd 交付，规格见蓝图 §11.24）：一句话小改动三道门判过即自动补齐三件套，恰 2 次交互交付到合并；准入判定逐门留痕进自产 spec「## 备注」，dev-retro 可审计 |
| [dev-fix](../skills/dev-fix/SKILL.md) | 缺陷分诊定级 → 开 fix 工票 → 送入实现链 |
| [dev-retro](../skills/dev-retro/SKILL.md) | 复盘：机械审计豁免与绕过信号，沉淀流程改进 |

**按需服务（不进自动串联链，手动触发）**

| 技能 | 职责 |
|---|---|
| [dev-design](../skills/dev-design/SKILL.md) | spec → 技术方案（design/ADR；ADR 三条件命中才写） |
| [dev-research](../skills/dev-research/SKILL.md) | 技术调研 → 带一手来源引用的调研报告 |
| [dev-release](../skills/dev-release/SKILL.md) | 语义化版本 + CHANGELOG + 发布检查单（tag 与推送是单向门，必须问人） |
| [dev-docs](../skills/dev-docs/SKILL.md) | 面向人的文档维护：每条行为断言先核验后落笔 |

**界面设计（design-\* 套件）**

「场景约束 → 基线 → 设计 → 述标」链，随 spec 0015 交付：

| 技能 | 职责 |
|---|---|
| [design-brief](../skills/design-brief/SKILL.md) | 使用者角色 → 书面设计约束（信息优先级 / 密度 / 关键操作路径），链起点 |
| [design-baseline](../skills/design-baseline/SKILL.md) | 建立 / 读取项目设计语言基线（docs/standards/ 按平台分册 + 标准索引登记） |
| [design-ui](../skills/design-ui/SKILL.md) | 约束与基线下的多平台布局视觉决策：四态完备、Web 必含移动端适配决策、硬指标自查 |
| [design-deliver](../skills/design-deliver/SKILL.md) | 述标交付：design 产物「界面设计」节四小节 + 可点 HTML 原型落 designs/assets/，approved 门即述标评审门 |

**参考层（内部参考，被流程技能装载，不独立调用）**

[ref-writing](../skills/ref-writing/SKILL.md)、[ref-implementation](../skills/ref-implementation/SKILL.md)、[ref-review](../skills/ref-review/SKILL.md)、[ref-testing](../skills/ref-testing/SKILL.md)、[ref-git-commit](../skills/ref-git-commit/SKILL.md)、[ref-refactoring-ui](../skills/ref-refactoring-ui/SKILL.md)、[ref-b-side-design](../skills/ref-b-side-design/SKILL.md)——分别定义「什么是好」的文档、实现、评审、测试、提交信息、界面视觉设计与 B 端体验设计。
