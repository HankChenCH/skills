# next 模式路由表

进入 next 模式才加载本文件。路由表按优先级自上而下匹配，**命中即停**：
第一个命中的行决定下一个该用 Skill 工具调用的技能。一切状态判断以
`.sdlc/check.sh phase` 与 `frontier` 的输出为准，不凭记忆。

## 路由表（按优先级）

| # | 盘上状态 | 下一个动作 | 停在哪（决策点/门禁） |
|---|---|---|---|
| 1 | 存在 in-progress 工单 | dev-implement <NNNN>（重入，续接其 ## Progress） | 无决策点，出口自动进 dev-review |
| 2 | 存在 implemented 工单，且没有任何 approved review 覆盖它 | dev-review | 阻断项修复策略 |
| 3 | 存在 implemented 工单，且已被某张 approved review 覆盖 | dev-ship | **合并确认**（单向门） |
| 4 | frontier 多张可开工票同属一张 approved spec | 问询：整 spec 编排（默认，调 dev-execute <spec-id>）/ 单票（按"多张 ready 工单"原语义） | **编排 or 单票**；选单票且仍多张 → 再按默认最小编号问 |
| 5 | frontier 非空（存在 ready 工单） | dev-implement；多张时先问用户（默认最小编号） | 单张无决策点；多张在总控问 |
| 6 | 存在 spec approved 且它名下还没有任何工单 | dev-plan | 拆分粒度确认 |
| 7 | 存在 spec draft（开放问题未清或未获批准） | dev-spec | **spec 批准**、MVP 分轮范围 |
| 8 | 存在 design draft | dev-design（批 2） | 方案定稿 |
| 9 | 存在 need draft（开放问题未清零），或全库无产物 | dev-clarify（批 2） | need 定稿 |
| 10 | 某张 spec 名下工单全部 done 且无对应 acceptance | dev-accept | 开不开下一轮 |
| 11 | 验收 passed 且有残余风险，或 need 尚未 fulfilled | 总控直接问：是否开下一轮（默认建议：开 round N+1，进 dev-spec） | 循环回转点 |
| 12 | 全部 need fulfilled | 无——闭环完成，报告即可 | — |

匹配不到或状态互相矛盾 → 如实报告盘上状态，请用户裁决，禁止猜测。

## 规则

- **推进 = 用 Skill 工具调用目标技能**，不代替它执行任何步骤。被调技能会在自己的
  门禁或决策点停下；它抛出的决策问题原样转达给用户，必须带默认建议，本轮到此为止。
- **多张 ready 工单**：dev-implement 规定工单由用户点名，总控不得替用户挑——
  列出 frontier 清单，默认建议从最小编号开工，用户确认后再调用。
- **多票同 spec 先问编排**：行 4 的命中条件 = frontier 中 ≥2 张可开工票的
  `spec:` 字段同指一张 `status: approved` 的 spec。命中 → 先问"整 spec 编排 /
  单票"，默认建议编排（调 dev-execute <spec-id>，它自己处理重入续接）；
  选单票 → 按"多张 ready 工单"走原语义。单张可开工票、或多张票无两张同属
  一张 spec → 不问编排，直接按表路由。同属判断只看票 frontmatter `spec:`
  字段与 spec 状态，不凭记忆。
- **断链**：目标技能不在 Skill 工具可用列表中 → 停下报告："流程走到 dev-X，
  该技能未实现（蓝图批 2/3）"。指路：等技能实现，或按 docs/METHOD.md 手动推进。
  禁止越权代劳目标技能的写入动作。
- **一次 next 只推进到一个决策点**。用户答复后再次 next：重新过水位线（见
  context-watermark.md），再按本表路由。
