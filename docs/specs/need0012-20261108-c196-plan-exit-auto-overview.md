---
id: 20261108-c196
status: approved
need: 0012
round: 2
created: 2026-11-08
approved: 2026-11-08
---
# dev-overview round 2：plan 出口自动衔接总览合成

## 问题陈述

Round 1（spec 0014，验收 passed 2026-11-03）交付的总览流程在真实使用中暴露流程停摆：dev-plan 出口对名下票 ≥2 的 spec 只放一句建议文案（"建议先 /dev-overview 走查再开工"），不触发任何动作；dev-overview 入口要求用户点名 spec 才开始合成。结果是：≥2 票 spec 在 dev-implement 入口被开工门禁硬拦，但通往放行的第一步（总览合成）没有任何环节自动发生——流程卡在等人手动执行 /dev-overview。

其中"合成 draft 总览"是纯机械动作（五节模板、纯读既有产物），不占用户判断力；需要人的是走查与显式确认（need 0012 立项初衷：走查在开工前暴露形状错误）。当前流程把机械动作也压给了人。

来源（用户 2026-11-08 体感反馈原话）："约定spec拆票大于2票建议overview，但是现在变成门禁，不overview不能implement，而plan之后又不会自动overview，卡着等人手动执行，整个流程变得很呆傻。建议要么自动overview，要么改为非必要门禁。"经分诊（dev-fix 会话，2026-11-08）：实现与 spec 0014 完全一致，属需求缺口而非缺陷；用户在修订方向上拍板方案 3（中间态）——plan 出口自动生成 draft 总览，门禁本体不变。

## 方案

dev-plan 出口行为升级：名下工单全部 publish 之后，统计本 spec 名下 ready 票数，≥2 → 立即链式调用 dev-overview（先例：dev-spec 出口调 dev-plan、dev-fix 出口调 dev-implement），替代原建议文案；单票 → 不调用（门禁豁免，总览冗余，行为不变）。dev-overview 入口新增免点名分支：由 dev-plan 出口进入时，spec 取调用方携带的编号，跳过点名环节；用户手动进入的行为不变。

合成、走查、三路归置、reviewed 显式确认全部沿用 round 1 交付物，本轮不触碰。开工门禁本体零改动：≥2 票 spec 开工仍须 reviewed 总览（need 0012 拍板 D3 维持），拦的永远是"没走查"，不是"没生成"；draft 落盘后用户当场走查确认 → reviewed → 首票放行，推迟走查 → draft 留盘，重入从走查续接（round 1 既有分支）。阈值口径本轮确认维持 ≥2 票（用户口述"大于 2 票"不采纳，以 need 0012 FR-7 与拍板 D3 原文为准）。

## 用户故事

- 作为需求人，我拆完票之后不必记得手动跑 /dev-overview——plan 出口 draft 总览已自动合成好，我只需走查与拍板。
- 作为实现会话，我在开工入口的拦阻语义不变：拦的是"没走查确认"；draft 已在盘上，指路文案指向的走查随时可续接。
- 作为流程维护者，总览仍只由 dev-overview 合成（五节模板与硬纪律单一出处），dev-plan 只负责衔接不负责合成，不出现第二份合成逻辑。

## 实现决策

- **dev-plan 出口衔接（FR-8）**：出口门禁第 4 步中，"名下票 ≥2 的 spec 建议先 /dev-overview 走查再开工"的建议文案替换为衔接规则：统计本轮拆票落盘后名下 ready 票数，≥2 → 立即链式调用 dev-overview 并携带本轮 spec 编号，合成与走查环节结束后回到开工点名决策问题（"从哪张开工"）；单票 → 不调用，出口止于 frontier 呈现与开工点名。衔接被推迟走查或会话中断时，出口指路 /dev-overview（draft 在盘上，重入从走查续接）。
- **dev-overview 免点名入口（FR-8）**：入口门禁第 1 步"确定 spec"新增分支——由 dev-plan 出口进入时直接取携带的 spec 编号，跳过点名；其余入口校验（spec approved、名下 ≥1 票 ready、既有 draft 从走查续接）不变；用户手动进入路径不变。技能 description 同步补"由 dev-plan 出口自动进入"触发场景。
- **既有 draft 遇补票**：本轮补票后重走 plan 出口、衔接进入时既有 draft 不重新合成，从走查续接；走查中核对全景矩阵与盘上票集，指不回新票的格子按差距清单既有机制归置（先更新产物，再更新总览对应格子）。
- **合成与走查行为零改动（FR-1..FR-7 回归面）**：五节模板、三条硬纪律、样张媒介判定、UI 原型规格、三路归置、reviewed 显式确认、过程档生命周期（ADR 0002）——全部沿 round 1。
- **check.sh 与 METHOD 零改动**：门禁判定、总览类型注册、状态机（draft→reviewed）、validate、run worktree 物化清单（ADR 0003，docs/overviews/ 已在清单内）均不含衔接逻辑——衔接是技能层编排行为，不进机械校验，不新增流程状态。

## 测试决策

- seam ①：dev-plan 出口衔接——真实 spec 演练：≥2 票 spec 拆票全部 publish 后 dev-overview 被自动调起、draft 落盘且 validate 通过；单票 spec 拆票后出口不调 dev-overview。
- seam ②：dev-overview 免点名入口——衔接进入免点名直入合成；手动进入仍走点名；既有 draft 时衔接进入从走查续接不重复合成（round 1 重入分支复用）。
- seam ③：门禁回归——衔接生成的 draft 在 dev-implement 入口被拦（draft ≠ reviewed，`check.sh ticket` 非零退出含指路）；走查显式确认置 reviewed 后放行；单票 spec 无总览放行。既有同类测试先例：spec 0014 门禁四态演练、spec 0012 开工预检演练。
- seam ④：推迟走查路径——衔接后用户推迟，draft 留盘且 `git status` 干净（过程档），后续手动 /dev-overview 从走查续接，置 reviewed 后 implement 放行。
- 集成级以临时演练工作区核销（spec 0014 seam ① 先例：临时 git 仓库装配技能文本与 check.sh）。

## 验收场景

- [FR-8 | 工单级] Given approved spec 名下 3 票 ready 且拆票全部 publish，When dev-plan 走到出口，Then dev-overview 被自动调起，docs/overviews/ 落盘 draft 总览且 validate 通过，全程无要求用户点名 spec 的环节。
- [FR-8 | 工单级] Given 单票 spec 拆票完成，When dev-plan 走到出口，Then 不调 dev-overview，出口止于 frontier 呈现与开工点名问题。
- [FR-8 | 工单级] Given 既有 draft 总览且本轮补票后重走 plan 出口，When 衔接进入 dev-overview，Then 不重新合成、从走查续接；走查核对全景矩阵与盘上票集，指不回新票的格子进差距清单并按既有机制归置。
- [FR-7 | 工单级] Given 衔接生成的 draft 总览，When dev-implement 入口运行 `check.sh ticket`，Then 非零退出、输出缺口（总览 draft）与指路 /dev-overview；走查显式确认置 reviewed 后同一命令放行。
- [FR-7 | 工单级] Given 单票 spec 无总览，When 开工，Then 入口不查总览直接放行（豁免分支不变）。
- [FR-1 | 工单级] Given 衔接合成完成，When 检查 draft 总览，Then 五节齐备、每段含可溯源标注（need FR-N / spec 场景 / ticket NNNN）、validate 通过——合成纪律不因衔接路径放宽。
- [FR-5 | 工单级] Given 衔接后当场走查暴露缝隙，When 三路归置，Then spec/票先更新、总览对应格子后更新、差距清单清零后经显式确认置 reviewed（round 1 行为回归）。
- [FR-2 | 工单级] Given 衔接合成的全景矩阵存在指不回票的 FR，When 走查，Then 该格子标缺口并进差距清单，不因自动衔接被静默略过。
- [FR-3 | 工单级] Given 衔接合成完成，When 检查黄金场景走查节，Then 含 2–3 条第二人称叙事与至少一条异常流，剧本可在 spec 验收场景逐句对上。
- [FR-4 | 工单级] Given 衔接合成的 spec 为 CLI 类，When 检查样张节，Then 输出样例呈正常/空/错误三态；Given UI 类，Then 三态原型落系统临时目录且 `git status` 干净。
- [FR-6 | 工单级] Given 衔接生成的 draft 总览，When `git status`，Then 总览被 `.gitignore` 排除、仓库干净；spec 验收收口后随蒸馏清扫删除。
- [FR-8 | 集成级] Given 临时演练工作区（装配本轮交付的技能文本与 check.sh）中一张 approved 且 3 票 ready 的 spec，When 从 dev-plan 出口走到首票开工，Then 全程无手动触发总览合成的动作：draft 自动落盘、走查显式确认置 reviewed、首票放行；draft 未走查时开工被拦且指路文案指向的续接入口可走通。

## 非目标

- 不改开工门禁语义（拍板 D3 维持）：≥2 票仍硬拦"无 reviewed 总览"，单票豁免；不把门禁降级为建议或事后提醒。【本轮拍板：方案 3 中间态，2026-11-08】
- 不自动置 reviewed：走查与显式确认不自动化（need 0012 立项核心——走查暴露形状错误），沉默不算确认。
- 不做 plan 出口之外的自动触发：dev-spec 出口、spec 置 done 等环节均不衔接；不做跨 spec 批量合成（拍板 D5：总览粒度 = 单 spec）。
- 不改 dev-execute / dev-review / dev-ship / dev-fix / dev-accept；不改 check.sh、METHOD、总览产物契约与状态机。
- 不改阈值：≥2 票维持，不采纳口述的"大于 2 票"（≥3）口径。

## 备注

- 输入：need 0012 round 2；触发源为用户体感反馈（2026-11-08）与方案 3 拍板，分诊判定属需求缺口而非实现缺陷（实现与 spec 0014 一致），故走 spec 修订轮不开 fix 票。
- 分轮拍板：round 2 范围 = plan 出口衔接 + dev-overview 免点名入口 + 既有 draft 遇补票的续接核对；其余条目全部为 round 1 行为回归确认。round 3 留验收后残余风险。
- 词汇：衔接 = 管线既有的技能链式调用语义（dev-spec→dev-plan、dev-fix→dev-implement 先例），非新术语，不登记 GLOSSARY。
- 生效时点：本 spec 自身的 plan 已按 round 1 行为走完，衔接能力自本 spec 验收起对后续功能生效；集成级场景以临时演练工作区核销。
