---
id: 0009
status: approved
tickets: [0015]
branch: main
created: 2026-10-28
---
# 0009: sdlc 总控接线（运行中 worktree 段 + next-mode 路由行）评审

评审对象：提交 1920f17（基线 3aef6f4 = BASE_REF main），单票模式，工单 0015
（spec 0006 approved）。改动 3 文件 +29/−13：skills/sdlc/SKILL.md §1.2、
skills/sdlc/references/next-mode.md、docs/tickets/0015 状态与证据落盘。
仓库无 CODING_STANDARDS.md（既有事实），标准轴以 ref-implementation 标准 +
ref-review 坏味道基线为依据。

## 标准轴 findings

- [skills/sdlc/SKILL.md:3] frontmatter description 枚举默认报告内容（"报告当前
  阶段、可开工的工单、被哪个门禁挡住、循环进度"）未含新增的"运行中 worktree"
  段——描述与正文固定结构出现一处漂移，且运行可见性正是本票新增的触发面；
  建议在枚举中补"进行中的运行"。不改不算错：description 是触发摘要，正文是
  权威，蓝图 §11.2 枚举的固定结构正文已对齐。（建议）

其余核对通过：段文本操作链完整可机械执行（发现命令 → 聚合规则 → 票状态读取
位置 → 空态 → 只读边界），命名与 spec/蓝图用语逐字一致（"运行中 worktree"）；
无行号硬引用（重入指向写成"其入口自会判定"而非 §编号，避开 run-mechanics
§7/§8 类引用错位——0014 评审同类问题本次未复现）；零写入边界与 SKILL.md
禁止事项、run-mechanics §1 发现口径（"主工作区条目不计"）一致；diff 最小，
无超范围改动。

## Spec 轴 findings

（无）

逐条核销：FR-8 段落存在且语义完整（发现/读票/空态/零写入四要素齐，
SKILL.md §1.2 第 2 条）＝票验收标准 1；路由行 4 + 规则条"多票同 spec 先问
编排"（命中条件 ≥2 张 frontier 票同指一张 approved spec、默认编排、单票原
语义、单张/异 spec 反例直路由）＝票验收标准 2 与 spec 实现决策"路由接线"条；
票状态读取顺序与 run-mechanics §5.2 一致（运行 worktree 最新、在办票读票
worktree、主工作区旧态不作依据），无状态源分叉。三条验收标准证据均为临时
仓库演练记录（/tmp/devx-drill-0015/records/，含改动前红记录），零写入以
git status 前后 diff 为证。无缺失、无走样、无超范围。

## 范围外备注

- `check.sh all` 报 config.sh 未定义任何检查命令（CHECK_LINT/CHECK_TYPE/
  CHECK_TEST 全空）——既有发现，非本票引入；纯技能/文档仓库接入何种检查命令
  值得单独议，不随本票处置。
- 路由行 4 与行 1 的优先级关系（主工作区存在 in-progress 票时先续办单票、
  运行靠默认报告与 dev-execute 重入兜底）语义自洽，随首个真实运行实战复验。

## 汇总

标准轴阻断 0 / 建议 1；Spec 轴阻断 0 / 建议 0。结论：approved。
