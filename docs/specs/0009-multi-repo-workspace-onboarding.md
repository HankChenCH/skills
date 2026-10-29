---
id: 0009
status: done
need: 0008
round: 1
created: 2026-10-29
approved: 2026-10-29
done: 2026-10-29
---
# setup-workspace 多仓工作区接入（根目录非仓库 + 多个子仓库）

## 问题陈述

多仓工作区（根目录不是 git 仓库，其下平铺 2–4 个或 8 个以上独立子仓库，跨仓库需求
高频）无法接入 SDLC 流程：setup-workspace 的前置校验 `git rev-parse` 失败即拒绝；
即便强行在某个子仓库内接入，流程产物与门禁也只覆盖单仓——前端 + 后端 + 上游微服务
这类跨仓库需求的 need/spec/工单无处归置，其余成员子仓库的提交无门禁、无回根指引。

## 方案

setup-workspace 增补第三种工作区形态"多仓工作区"：在根目录运行时识别形态，把根
git init 为工作区仓库并落全套流程基础设施；扫描根下第一层 git 仓库，经用户确认生成
成员清单；每个成员子仓库装提交门禁（转发到工作区仓库统一校验）与 AGENTS.md 哨兵
（回根指引）；重跑按清单 diff 增补新仓、经确认移出消失成员、幂等复原全部接入物；
工单可点名受影响成员。单仓 / monorepo 两形态行为不变；技能家族的 check.sh 调用方式
零改动。

## 用户故事

- 作为多仓工作区的开发者，我想在根目录一次 /setup-workspace 完成接入，以便不必逐仓库手工装流程。
- 作为开发者，我想让跨仓库需求的 need/spec/工单集中落在工作区仓库，以便一处追溯全局进度。
- 作为开发者，我想让成员子仓库的提交被工单门禁校验，以便源码提交与单仓形态同等纪律地挂在开工工单下。
- 作为在成员子仓库内开会话的 AI 执行者，我想让哨兵告知流程操作回根目录，以便不在子仓库里误走流程。
- 作为开发者，我想让 merge/revert 提交不被门禁误拦，以便正常 git 操作不被流程卡死。
- 作为新加入的开发者，我想 clone 全部仓库后重跑一次 setup 即恢复接入，以便入职零口头交接。
- 作为工作区主人，我想让非成员目录完全不被触碰，以便工作区里的杂物不被误收编。

## 实现决策

**形态判定（FR-1）**：SKILL §0 前置改三分支——`git rev-parse` 成功 → 现行单仓 /
monorepo 流程不变；失败但根下第一层存在 ≥1 个 git 仓库 → 进入多仓工作区模式；
失败且第一层无 git 仓库 → 维持现行拒绝、零写入。scan-signals 仓库类型节增补第三形态；
逐个候选按现行信号表分类（单仓 / monorepo，仅作确认清单的展示信息，成员不落 config）。

**工作区仓库（FR-2）**：根目录 git init 后按现行资产生成逻辑落全套——check.sh、
config.sh（仅缺失时生成）、trackers、METHOD.md、GLOSSARY、CODING_STANDARDS、
AGENTS.md 哨兵块、根 commit-msg/pre-push 转发 hook，语义与现行完全一致；docs/ 八个
产物目录照旧懒创建。跨仓库需求的 need/spec/工单即落根 docs/，全库编号唯一。

**成员清单（FR-3）**：独立清单文件落 `.sdlc/`（逐行一个成员目录名），归 setup 所有权
类、重跑按新确认结果整体重写——清单变更本就产生于重跑的确认流程。不写入 config.sh：
其所有权归用户且"绝不覆盖"，两者冲突。

**成员入册确认（FR-3）**：初始化与重跑新增决策步骤——一次列出全部候选（目录名 +
单仓 / monorepo 分类）并给默认建议（全部入册），用户只点名排除项；8+ 成员一轮交互
完成（need 0008 R1 的处置）。非成员目录零接触（need A2）。

**成员门禁（FR-4/FR-5）**：成员 `.git/hooks/commit-msg` 一行转发到工作区仓库的
check.sh commit-msg 子命令；转发必须把脚本工作目录锚定到工作区仓库根——否则
check.sh 的 git 仓库定位会落到成员仓库、校验对象错位。校验规则与现行完全一致：
`[#NNNN]` 存在且对应工单 in-progress/implemented，或 `[trivial]` 豁免。commit-msg
子命令新增机械豁免：提交信息头为 Merge/Revert 的提交放行（工作区仓库自身同步受益）。
成员不装 pre-push（need C3）。外来 hook 沿用现行处置：不覆盖，报告并给合并方案（need A3）。

**成员哨兵（FR-6）**：成员仓库 AGENTS.md 按现行三态规则（无标记文末追加 / 有标记块内
替换）落成员版哨兵块：内容含成员身份、所属工作区根指引、"流程操作（/sdlc、need/spec/
工单、check.sh）一律在工作区根进行、代码修改在成员仓库内正常进行"。哨兵落成员仓内
而非仅依赖根，即 need R2 的可达性处置。

**重跑 diff（FR-7/FR-10）**：多仓模式重跑扫描第一层并与清单求差——新增 git 仓库目录
→ 入册确认后补装门禁与哨兵、清单更新；清单内目录消失或不再是 git 仓库 → 报告异常
条目、经确认才移出清单，未确认前清单不动（need E2）；既有成员 → 幂等重装（sdlc-managed
标记判定）+ 根资产按所有权表覆盖/保留。

**新环境复原（FR-8）**：复原走重跑同一路径——clone 工作区仓库（自带 .sdlc/、docs/、
成员清单）与各成员子仓库后重跑；清单命中的成员视为已确认，直接幂等重装，全程不再
重复询问。

**根 .gitignore 成员登记（FR-2 衍生）**：工作区仓库的 .gitignore 由 setup 以带标记段
幂等增补成员目录条目，防嵌套 git 仓库被误收进工作区仓库索引；用户自有行一字不动。

**工单点名成员（FR-9）**：工单 frontmatter 增可选单行 `repos` 列表（值为成员清单中的
目录名）；validate 在该字段非空时逐值校验其在成员清单内，未填不校验；dev-plan 对
跨仓库工单应填。METHOD.md 工单模板同步该字段说明。

## 测试决策

- seam 一：check.sh commit-msg 的 Merge/Revert 豁免与 `[#NNNN]` 状态校验——临时仓库
  夹具（git init + docs/tickets 正反例 fixture），先例 spec 0006 的临时仓库复现手法。
- seam 二：成员转发机制——临时多仓夹具（根 + ≥1 成员）实测转发后 ROOT 锚定工作区根、
  状态校验与豁免分支行为、sdlc-managed 幂等重装。
- seam 三：validate 的 repos 字段校验——fixture 工单正反例（清单内值通过、清单外值报错、
  空值跳过）。
- 技能流程分支（形态判定、入册确认交互、diff 报告、哨兵落位）无自动化承载，靠验收
  场景人工走查——与 spec 0005 同法。

## 验收场景

- [FR-1 | 集成级] Given 根目录非 git 仓库且第一层含 ≥1 个 git 仓库，When 在根运行
  /setup-workspace，Then 进入多仓工作区模式完成初始化；Given 根非仓库且第一层无任何
  git 仓库，When 运行，Then 维持拒绝且零写入。
- [FR-2 | 集成级] Given 多仓模式初始化完成，When 检查根目录，Then 根为 git 仓库且
  check.sh、config.sh、trackers、METHOD.md、GLOSSARY、AGENTS.md 哨兵、根 hooks 全部
  就位，`check.sh phase` 与 `frontier` 正常输出（空库提示不报错）。
- [FR-3 | 集成级] Given 根下第一层混有 git 仓库与普通目录，When 入册确认，Then 清单
  只含被确认的仓库目录名，非成员目录无任何写入。
- [FR-4 | 工单级] Given 成员子仓库与工作区仓库内一张 in-progress 工单，When 成员内
  提交含 `[#NNNN]`，Then 放行；When 提交引用不存在或 ready/done 的工单，Then 拒绝并
  报原因；When 提交无引用且非豁免，Then 拒绝并提示 `[#NNNN]` / `[trivial]` 规则。
- [FR-5 | 工单级] Given 成员子仓库，When 提交信息头为 `Merge branch …` 或
  `Revert "…"`（无工单引用），Then 机械放行。
- [FR-6 | 集成级] Given 成员子仓库已入册，When 读其 AGENTS.md，Then 含成员身份与回根
  指引的哨兵块且块外内容一字不动；Given 技能家族任一 dev-* 技能，When 调用 check.sh，
  Then 调用方式与单仓形态一致（家族零改动）。
- [FR-7 | 集成级] Given 已接入的工作区，When 新 clone 一仓库进根并重跑，Then 其列为
  候选、经确认后入册并补装；When 清单内成员目录被移除后重跑，Then 报告缺失且经确认
  才从清单移出，未确认前清单一字不动。
- [FR-8 | 集成级] Given 新环境 clone 了工作区仓库与全部成员子仓库，When 重跑
  /setup-workspace，Then 清单命中成员全部幂等重装且全程无重复询问，`check.sh phase`
  正常输出。
- [FR-9 | 工单级] Given 工单 frontmatter `repos: [frontend, backend]` 且两值均在清单，
  When validate 该工单，Then 通过；When repos 含清单外值，Then validate 报错点名非法值；
  When repos 缺省，Then 不触发该校验。（实现实测边界，折回自验收 0001：repos 空列表
  同缺省跳过；多行书写按「repos 须单行书写」拒绝，先例 blocked-by；成员清单文件缺失
  时逐值报「不在成员清单（.sdlc/members.list）」不静默。）
- [FR-10 | 集成级] Given 新成员经重跑入册完成，When 检查该成员，Then 其门禁与哨兵和
  初始成员完全一致、清单已含该成员、其提交受门禁校验。
- [FR-9 | 集成级] Given 跨仓库需求工单点名 frontend 与 backend，When 两成员分别提交
  带该工单号 `[#NNNN]` 的 commit，Then 两边 hook 均放行、根 docs/ 可追溯该工单，
  工作区仓库自身的提交门禁行为不受影响。

## 非目标

- 成员子仓库不装 docs/、config.sh、trackers 等流程产物（need C1）。
- 技能家族不做锚点解析升级，`.sdlc/check.sh` 调用方式与现有技能文本不变（need C2）。
- 成员子仓库不装 pre-push、不跑 lint/test（need C3）。
- 成员子仓库不接线 L4 PreToolUse 拦截（need 0008 未决，如需另立）。
- 嵌套 git 仓库 / submodule 不收编为成员（need A1）。
- 现行单仓 / monorepo 两形态的初始化行为不变。

## 备注

- 来源：need 0008（confirmed 2026-10-29），round 1。
- 分轮拍板（2026-10-29）：round 1 全量覆盖 10 FR——validate 孤儿 FR 规则要求单张
  spec 场景覆盖 need 全部 FR（先例 spec 0006 备注）；MVP 票序切分归 dev-plan，建议
  票序按"形态判定 → 根仓+清单 → 成员门禁/哨兵 → diff/复原 → repos 字段"。
- need R1（8+ 成员确认交互）处置在实现决策"成员入册确认"：一轮交互、默认全入册、
  只点名排除。
- need R2（哨兵可达性）处置在实现决策"成员哨兵"：哨兵落成员仓内；个别不读 AGENTS.md
  的智能体回退为用户手动回根，不阻塞主流程。
