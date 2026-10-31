# run-mechanics：dev-execute 操作细则

SKILL.md 只留控制流；本文件是它引用的操作细则，按引用章节加载。所有命令均在
2026-10-28 于临时 git 仓库演练实证（工单 0013：§1–§7，记录目录
/tmp/devx-drill/records/；工单 0014：§8 收口链，记录目录
/tmp/devx-drill/records/closeout-*.txt）；2026-10-31 票 0022 增补演练：§4 物化、
§7 合回前同步翻转副本与 merge-tree 干跑预检序、§8.4 done 落盘不提交、§5 多层
在飞续接（记录目录 /tmp/devx-0022-drill/records/）；2026-10-31 票 0023 增补演练：
§2 开工预检（呈现与拒绝零写入）、§4 派发回退链三档命中（记录目录
/tmp/devx-0023-drill/records/）。2026-10-31 票 0025 条文修订：§4 档 1 重写为整图
单运行并新增整图脚本形态细则、§5 续接推导同步——按蓝图 §11.17（v1.22）落，本节
既有命令与判据对档 1 图内承载同款适用。2026-10-31 票 0026 增补演练：整图运行的
图内行为（mock spec 9400 四票两页图、真 `.sdlc/check.sh` 门禁，记录目录
/tmp/devx-0026-drill/records/）——① 整链：开工确认恰一次、同层票阶段链 fan-out
并行实现+评审（9401 评审 approved 落盘时 9402/9403 仍 in-progress）、票 4 依赖
满足后由图接续派发（无新人工门）、合并确认图内一次问清（方式与 tag 同问），
拒绝 → 停在门、票全 implemented 且运行分支领先主干、worktree 未清（盘上状态即
运行状态），重入重新一次问清后显式确认才执行合并（commit-msg 门按 [#NNNN]
放行）；② 预演红：确定性门 exit 1 即拦截后续合回与派发（已 approved 候选不
合并、未派发票不建 worktree），升级提问带连坐阻塞面与指路，fix 票按 /dev-fix
开票后经脚本修订并入运行图，门红期间只放行 fix 票合回、转绿即解除拦截，
已完成步经 journal 缓存复用不重做；③ 候选序全冲突：merge-tree 干跑候选双双
冲突即停（零合并尝试、运行 worktree 零触碰），升级提问呈现逐候选冲突文件
清单 + 连坐阻塞面 + 指路（expand–contract 回 /dev-plan），决策前不自动解冲突、
盘上状态即运行状态；④ 中断续接：停跑时在办票 Progress 落断点行，续接按
journal 重放 + 盘上推导（不重走开工确认），已合回票不重做（合回提交恰一次、
评审报告不重复），在办票按 Progress 续（approved 未合回即合回、实现中段续跑
实现）、未开工票照图接续。
判断以 `.sdlc/check.sh` 输出与 `git` 实际行为为准，不凭记忆。

## 1. 约定总览

- **运行分支**：`run/<spec-id>`（如 `run/0006`）。
- **票分支**：`run/<spec-id>-t<ticket-id>`（如 `run/0006-t0012`；spec 0006 round 2）。
  约束：git ref 名空间同段互斥——`refs/heads/run/0006` 存在时不能建
  `refs/heads/run/0006/*`（D/F 冲突），票分支因此用扁平 `-t` 后缀与运行分支共存；
  `run/` 单前缀机械发现面不变（临时仓库实测共存无冲突）。
- **worktree 放置**：仓库同级约定目录 `<repo>-runs/`（与仓库目录平级，不入版本库，
  git 元数据自管理）。运行 worktree：`<repo>-runs/<spec-id>-run/`；票 worktree：
  `<repo>-runs/<spec-id>-t<NNNN>/`。
- **机械发现**：`git worktree list` 中分支以 `run/` 开头的条目即运行；主工作区条目
  （第一项）不计。

## 2. 建运行依赖顺序图

权威算法（票数 ≤ 数百时手工与 awk 均瞬时完成）：

1. 节点 = 点名 spec 名下全部工票（`docs/tickets/` 中 frontmatter `spec:` 匹配者）。
2. 边 = blocked-by。依赖分两类：spec 内依赖与外部依赖（指向其他 spec 的票）。
   - spec 内依赖状态为 done 或 implemented → 已满足，不再连边（done 票本身列
     图外"已完成"）。
   - 外部依赖状态非 done → 该票标"外部阻塞"，不参与分层；全图因此无第 1 层 →
     停下报告，不进入运行。运行中外部依赖转为 done → 按 §5.5 重算图后该票入层。
3. 分层：`layer(t) = 1 + max(layer(未满足的 spec 内依赖))`，无未满足依赖者为第 1 层。
   固定迭代超过票数轮不收敛 → 依赖环，停下报告（`check.sh ticket` 也会报环）。
4. 关键路径 = 最长票链（层数即深度，从最深层沿依赖回溯）。
5. 输出图：逐层一行列出票号(状态)，同层标注"无依赖可并行"；图外列已完成与外部
   阻塞；末行标注关键路径。

awk 辅助（在仓库根目录一次跑完；SPEC= 换成点名 spec）：

```sh
awk '
  FNR==1 { n++ }
  FNR==1 && $0=="---" { infm=1; next }
  infm && $0=="---" { infm=0; next }
  infm && index($0,"id:")==1     { id[n]=$2 }
  infm && index($0,"spec:")==1   { spec[n]=$2 }
  infm && index($0,"status:")==1 { st[n]=$2 }
  infm && index($0,"blocked-by:")==1 {
    v=$0; gsub(/blocked-by:[ \t]*\[?/,"",v); gsub(/\][ \t]*$/,"",v); gsub(/[ \t]/,"",v)
    m=split(v,a,","); deps[n]=""
    for(i=1;i<=m;i++) if(a[i]!="") deps[n]=deps[n]" "a[i]
  }
  END {
    for(i=1;i<=n;i++) if(spec[i]==SPEC) node[id[i]]=i
    for(iter=0; iter<=n+1; iter++) {
      changed=0
      for(i=1;i<=n;i++) {
        if(spec[i]!=SPEC || lay[i] || st[i]=="done") continue
        max=0; ready=1
        m=split(deps[i],d," ")
        for(j=1;j<=m;j++) if(d[j] in node) {
          k=node[d[j]]
          if(st[k]=="done"||st[k]=="implemented") continue
          if(lay[k]>0){ if(lay[k]>max) max=lay[k] } else ready=0
        }
        if(ready) { lay[i]=max+1; changed=1 }
      }
      if(!changed) break
    }
    if(iter>n) { print "CYCLE: 分层不收敛"; exit 1 }
    done_line=""
    for(i=1;i<=n;i++) if(spec[i]==SPEC && st[i]=="done") done_line=done_line" "id[i]
    if(done_line!="") printf "已完成（图外）：%s\n", done_line
    depth=0; for(i=1;i<=n;i++) if(lay[i]>depth) depth=lay[i]
    for(l=1;l<=depth;l++) {
      line=""
      for(i=1;i<=n;i++) if(lay[i]==l) line=line" "id[i]"("st[i]")"
      if(line!="") printf "第 %d 层（无依赖可并行）：%s\n", l, line
    }
    print "关键路径深度：" depth " 层"
  }
' SPEC=0001 docs/tickets/*.md
```

**开工预检（建图后、开工确认前执行一次；SKILL.md §3.2——报告并入开工确认，不硬拦、不新增人工门）**：

1. 逐层取同层票对，读各票正文 `**改动面：**` 行（dev-plan 落的预估触碰清单，
   口径 = 目录或模块名）。行缺失 → 该票标"**改动面未知**"：只入报告、不猜测、
   不推断，不参与相交判定；同层两票都无行 → 该对标"双方改动面未知"。
2. 相交判定：同层两票改动面行点名的目录/模块有交集 → 记**高重叠对**（票号 +
   重叠面）。已有 blocked-by 边串行的票对不同层，不入本层对——互斥处置已在
   拆票端消解（dev-plan 纪律，GLOSSARY"改动面互斥"）。
3. 代码现状粗扫交叉（只读）：对全部改动面行点名的目录/模块做 `ls`/`find` 级
   粗查，核对点名对象在当前代码中是否存在——点名对象不存在 → 报告中标注
   "改动面与代码现状不符"，不改判、不替票猜面。
4. 报告并入开工确认（SKILL.md §3.3）：高重叠对逐对列票号 + 重叠面 + 默认建议
   （串行化或回 /dev-plan 重切，落盘归 /dev-plan——FR-1 三选一是 dev-plan 的
   处置，编排只报告、不改票）；"改动面未知"票单列。预检不修改任何票、不建
   任何 worktree；用户确认按图开工则带着已知风险进入运行，合回冲突由 §7 预检序
   与 SKILL.md §8 异常流兜底。预检报告随运行摘要留档（§8.6）。

## 3. 运行建立

```sh
git worktree add "<repo>-runs/<spec-id>-run" -b "run/<spec-id>"
```

建立后**立即物化**：把主工作区当前过程档目录（docs/tickets、docs/reviews、
docs/acceptance）以盘上文件复制进运行 worktree——untracked、照旧不进任何提交
（ADR 0003 裁决 1；物化纪律对任何运行/票 worktree 一律成立，票 worktree 同款见
§4）。

核对清单（任一不满足即停，不派发）：

1. `git worktree list` 出现运行 worktree 条目，分支列为 `run/<spec-id>`。
2. 主工作区 `git branch --show-current` 仍为主分支（BASE_REF）。
3. 主工作区 `git status --short` 为空（零污染）。
4. 运行 worktree 内 `.sdlc/check.sh phase` 可运行且读到的票状态与主工作区一致
   （同一 .git，产物即盘上文件）。

## 4. 票 worktree 与派发

依赖已满足的每票（开工后先第 1 层；此后每次合回预演绿重查图派发新满足者），从运行
分支切出票分支与票 worktree：

```sh
git worktree add "<repo>-runs/<spec-id>-t<NNNN>" -b "run/<spec-id>-t<NNNN>" "run/<spec-id>"
```

- **派发判据**：票 frontmatter `blocked-by` 中 spec 内依赖全部已合回（§5.3 判据）
  或 done；blocked-by 未满足的票不建 worktree、不派发（演练：无票 worktree 条目）。
  流水线下派发时机跟着依赖满足走，不等"当前层凑齐"。
- **物化（建 worktree 后立即执行，ADR 0003 裁决 1）**：把主工作区当前过程档目录
  （docs/tickets、docs/reviews、docs/acceptance）以盘上文件复制进票 worktree——
  untracked、照旧不进任何提交。不物化 → 该 worktree 内门禁读不到过程档，
  dev-implement 出口提交会被 commit-msg hook 拦（fail-loud，非静默）。
- **派发回退链（能力探测 + 逐档回退；SKILL.md §5.1，探测对象与优先序按
  docs/research/0003 结论落具体原语，票 0020）**：开工确认前探测一次、命中档与
  原因随开工确认声明（SKILL.md §3.3），运行中不重探测。声明口径三处一致
  （SKILL.md §3.3 / 本节 / 蓝图 §11.17）：
  **开工确认声明本次形态（整图单运行 / 逐票派发 / 串行）与命中原因**，
  命中档 1 时说明与逐票档的编排模型差异（图承载全链 vs 主会话逐票编排）。
  中断续接（SKILL.md §7）
  不重走开工确认：续接会话按同宿主重新探测得同档，续接陈述中说明命中档即可。
  逐档判据与形态：
  - **档 1 整图单运行（声明式工作流）**：探测判据为**四能力齐备**——
    脚本控制流（fan-out/join 表达依赖）、确定性门（命令门承载预演）、
    运行内人工门（升级提问/洞穴）、
    运行记录与恢复（journal 重放 + 脚本修订缓存复用），缺任一顺位落档 2，
    旧"每票一个工作流运行"形态废除、不留档内中间形态。DeepSeek
    harness 的工作流属开发者预览且无恢复机制，不满足本档判据，该宿主落档 3 起步
    （docs/research/0003 推荐命中档）；Claude Code 档 1 定档由实现票按调研 0003
    时效条款核验运行内人工门能力后定（dynamic workflows 版本 ≥ v2.1.248 且
    计划/开关支持为既有调研信号）。
  - **档 2 后台子代理**：探测 = 子代理原语支持后台运行并回传单票完成通知（ZCode
    Agent `run_in_background` 完成时通知主会话；Claude Code 后台派发为默认）。
    形态：每票一个后台子代理执行 dev-implement 纪律全文，完成通知驱动后续编排、
    不轮询。DeepSeek harness 事件通知齐备但主会话可响应性未核验——落档 3 起步，
    实测核验后启用本档。
  - **档 3 同步子代理**：探测 = 子代理原语仅同步可用（四宿主均具备；Codex 子代理
    默认启用，但宿主等全部结果同步汇总、无单代理完成通知——探测自档 1/2 直接落
    本档，docs/research/0003）。形态：就绪票并行派发、等全部返回；返回即逐票编排
    评审，派发批次期间主会话不可响应用户输入（宿主形态，开工确认已声明）。
  - **档 4 串行逐票（兜底）**：以上判据全不满足——主会话逐票亲做 dev-implement
    纪律全文（仍逐票独立票分支与票 worktree、仍出口全量检查），做一票评一票
    合回一票。先行评审与主会话可响应性在本档不可达（宿主无并发原语的既有边界，
    spec 0012 非目标 ②）。本档不拒运行：回退链末端保证任何宿主可跑完全链。
  - 命中非档 1 → 命中原因随开工确认声明（形态 + 为什么落该档，如"宿主无声明式
    工作流原语，落后台子代理档"）。
- **整图脚本形态细则（档 1 命中时；承载 SKILL.md §5.1–§5.4、§6、§7、§8 的图内
  落点）**：
  - **生成与边界**：开工确认（图外）后主会话生成**一个**工作流脚本，把整张运行
    依赖顺序图声明进去——同层票 fan-out 并行、blocked-by 边用控制流表达；图仍
    会话内计算、不落盘，工作流脚本同为会话产物、不落盘为仓库产物（need 0010
    非目标 ③ 延续，蓝图 §11.17 边界）。
  - **参数形状**：票清单（spec 名下全部工票票号）、blocked-by 边、并行度上限以
    类型化参数传入；并行度默认上限 4 经工作流并发度参数承载，SKILL 调用参数
    透传覆盖。
  - **阶段结构（票阶段链）**：每票在图内一条链，依赖满足即启动，逐票在链内串行、
    跨票按依赖并行——建票 worktree 并物化过程档（ADR 0003 裁决 1，由脚本 git/
    文件门面承载；命令与核对清单同本节上文）→ 实现子代理执行 dev-implement 纪律
    全文（随派发传参考技能，既有约定）→ 评审子代理执行 dev-review 编排模式（报告
    契约 branch/tickets 不变，契约见蓝图 §11.7）→ merge-tree 干跑预检序 →
    合回 + 翻转副本同步（ADR 0003 裁决 2；细则见 §7）→
    预演确定性门（§6 同款命令与判据，由脚本命令门承载）。
    同层票在各自派发时基线上实现、合回后不重放基线
    （改动面互斥保证合回干净）。**收口链全入图**：fresh 全量检查（确定性门）→
    PR 准备（dev-ship 前半三节模板；平台建 PR 或本地清单完整呈现，跟 TRACKER）→
    pre-push 门 → 合并确认升级提问 → 执行合并 → 票 done 落盘不提交（ADR 0003
    裁决 3）→ 清理票/运行 worktree 与分支（先 worktree 后分支）→
    运行结算报告即出口报告（逐票终态 + 运行摘要 + 指路手动 /dev-accept）。
  - **评审承载**：图内评审子代理承载而非通知主会话介入——运行中间态无逐票完成
    通知，主会话介入须轮询，违背"通知驱动不轮询"约束；先行评审语义保持（票
    implemented 即启动其评审阶段，不等同层）；机械问题修后图内重跑该票评审阶段，
    不停运行；设计级阻断走异常流提问。
  - **人工门落点**：恰两次人工交互定位不变——开工确认图外（分层图 + 开工预检
    报告 + 本次形态声明呈现时）+ 合并确认图内（升级提问：合并方式与是否打 tag
    一并问清，显式确认才执行；拒绝 → 停在该门，盘上状态即运行状态，不强推、
    不清理）。五类异常流经升级提问/洞穴在图内停下问人，提问带连坐阻塞面与指路，
    语义零回退：沉默不算确认、不自动解冲突、不自动重试、不自动改 spec、合并未执行不清理。
  - **脚本修订补图续接**：异常流决策需开 fix 票时主会话按 /dev-fix 开 fix 票，
    随后以脚本修订把 fix 票并入运行图重算后续，已完成步经缓存复用不重做；修订
    不成 → 停机问人。spec 修订增删票同款（§5 第 5 条）。
- **并行度**：档 1 经工作流并发度参数承载（默认上限 4，SKILL 调用参数透传覆盖）；
  档 2/3 默认上限 4（SKILL.md 调用参数可覆盖），超出分批；档 4 天然串行。上限只
  约束同时在飞的实现票数，评审 / 合回 / 预演不受其限。
  命中档内每票工作全部在该票 worktree 内完成，各档纪律一致（dev-implement 全文）。
- **交接语义（gitignore 时代，替代旧"翻转随票分支提交"条文）**：`status:
  implemented` 翻转是纯盘上操作，落在票 worktree 的过程档副本上（ADR 0003 裁决
  2）；实现代码提交照常落票分支（dev-implement 出口门禁的检查与提交部分）。翻转
  副本在合回前由编排者同步到运行 worktree（§7 合回前同步）——这是 commit-msg
  放行 `[#NNNN]` 合回的前提。
- **隔离自证**：票 worktree 只见自己分支的改动（演练：两票 worktree 互不可见）；
  运行分支在合回前无该票内容。

## 5. 中断续接推导

1. `git worktree list`：有无 `run/<spec-id>` 条目 → 运行是否存在。
2. 逐票读 frontmatter status。**读取顺序**：运行 worktree 最新（已合回票的状态随
   合回前同步与合回落地）；在办票读其票 worktree——流水线下在办票可跨多层并存，
   逐票各读各的，不假定单层；主工作区在运行合回主干前是旧态，不作为运行进度依据
   （演练实锤：同一票文件主仓 ready、运行 worktree implemented）。
   done=完成；implemented=实现完成，细分两态——票 worktree docs/reviews/ 无
   approved 评审报告=评审环节在途（重新编排评审），有=待合回（走 §7）；in-progress=
   在办（读其 `## Progress` 拿断点）；ready=未开工（依赖已满足即照图派发，未满足
   继续等）。
3. 已合回判定（不变）：`git merge-base --is-ancestor "run/<spec-id>-t<NNNN>"
   "run/<spec-id>"`（或运行分支 `git log --format=%s` 含该票 `[#NNNN]` 合回提交）
   → implemented 且已合回。
4. 断点按票逐个推导，不按"层"定断点（流水线下多层可同时在飞）：已合回票（§5.3
   判定）不重做；implemented 未合回票按 §2 细分续接（评审在途 → 编排评审；
   approved → 走 §7 合回，同步翻转副本 + merge-tree 预检序）；in-progress 票续接
   其 Progress（可多张并行续接）；ready 票照图派发。层视图只用于展示与依赖满足
   判定，不是续接单位。
5. 票集变化（fix 票插入、spec 修订增删票）→ 回 SKILL.md §3 重算图，已完成票仍列
   图外，不重做；档 1 经**脚本修订补图**把 fix 票并入运行图重算后续（§4 整图脚本
   形态细则），已完成步经缓存复用不重做。
6. 断点落在收口链内（全部票已合回、预演绿，SKILL.md §6 未走完）→ 按序判定续接点：
   - PR 未建或停在合并确认前（运行分支领先 BASE_REF、票全 implemented）→ 从
     §8.1 起走收口；确认前中断的不补问已答过的问题，重新一次问清（单向门每轮
     都要显式确认）。
   - 合并已执行、票未 done（`git merge-base --is-ancestor run/<spec-id>
     <BASE_REF>` 为真、票仍 implemented）→ 从 §8.4 补 done。
   - 票已 done、worktree 未清（`git worktree list` 仍有 run/ 前缀条目）→ 从
     §8.5 清理续起。
   已合回票的评审不重做：评审报告经合回前同步在运行 worktree 盘上（docs/
   reviews/），pre-push 按覆盖面机械核对，缺了才补（SKILL.md §8 收口 pre-push
   异常）。
7. 档 1（整图单运行）中断续接：在上述盘上推导（第 1–6 条）之上**结合工作流运行
   记录恢复**续跑——运行记录（journal）可读 → 重放已完成步、缓存复用，已合回票
   不重做。盘上状态机不动：票 frontmatter + worktree 仍是唯一运行真源，运行记录
   与盘上推导冲突时以盘上为准（spec 0013 实现决策）；脚本不落盘，续接按同宿主
   重新探测得同档后重建/修订脚本承接（缓存复用不重做已完成步），修订不成 →
   停机问人。

## 6. 预演（每次合回后）

在**运行 worktree** 内（档 1 由脚本确定性门在运行 worktree 执行本节同款命令与
判据，门不过即拦截后续合回与派发）：

1. `.sdlc/check.sh all`——必须退出码 0。exit 0 但输出
   "⚠️ config.sh 未定义任何检查命令" → **视为红灯**（发现，不是跳过）：停下按
   SKILL.md §8 预演失败流报告。
2. spec 验收场景中标 [FR-N | 集成级] 且仓库已有自动化承载的测试（`CHECK_TEST`
   已覆盖的不再重复跑；无承载的集成场景留给 /dev-accept，运行不代跑）。
3. 预演记录进运行摘要：哪次合回、哪条命令、什么输出。

## 7. 机械合回

票评审 approved 且依赖满足后，在**运行 worktree** 内合回；每次合回前先做两件预备
（次序固定：先同步翻转副本，再 merge-tree 干跑预检序）。档 1 本节由脚本票阶段链
承载，命令、次序与判据不变；候选序全部冲突 → 升级提问停下问人（SKILL.md §8）：

```sh
git merge --no-ff "run/<spec-id>-t<NNNN>" -m "[#NNNN] 合回票 NNNN（评审 approved）"
```

- **合回前同步翻转副本（ADR 0003 裁决 2）**：gitignore 时代过程档不进 git，票
  worktree 内的 `status: implemented` 翻转与 docs/reviews/ 评审报告都是盘上文件，
  由编排者复制进运行 worktree 对应路径，只覆盖该票自己的文件、不触碰其他票。git
  在 commit-msg hook 触发前已把合并结果写进工作树，hook 读到的运行 worktree 票
  文件是这份副本——implemented → 放行；漏同步 → hook 拦（"还是 ready"），
  fail-loud——停下补同步，不绕门禁（两个方向均已演练实证）。评审报告随同步在盘，
  pre-push 覆盖面校验（§8.2）据此读取（ADR 0003 裁决 4）。
- **merge-tree 干跑预检序（"同层任一序"的机械语义 = 无冲突序优先）**：合回前对
  候选票（已 approved 且依赖已满足、未合回者，同层为常态——跨层先后由 blocked-by
  自然串行）逐个执行 `git merge-tree "run/<spec-id>" "run/<spec-id>-t<NNNN>"`：
  退出码 0 = 干净可合（输出仅一行结果树 OID）；1 = 冲突（首行 OID 后跟冲突条目，
  配 `--name-only` 取冲突文件名清单）。选干跑干净的候选先合；全部候选干跑皆冲突
  → SKILL.md §8 异常流停下问人。预检只排序、不做冲突内容的自动解决——merge-tree
  纯干跑，不触碰工作树与分支（演练实锤干跑与真合并同保真度）；干跑与真合并同受
  xdiff 上下文规则约束：改动区相邻（中间无未改行）的候选互报冲突，预检因此偏保守。
  实测 git 2.50.1（Apple Git-155，2026-10-31）：真实
  合并模式为**无选项双参数形态**，显式 `--write-tree` 反报 usage（exit 129），勿加。
- **放行前提**：合回前同步已做（翻转副本在运行 worktree）。票 worktree 内没翻
  （子代理缺出口翻转）→ 让票子代理补 dev-implement 出口门禁，不绕门禁。
- **预演衔接**：合回后立即跑 §6；绿灯才合回下一候选、派发新满足依赖的票。
- **冲突停机**：干跑全冲突候选（见预检序）或干跑干净但实际 merge 退出码 1 且
  `git diff --name-only --diff-filter=U` 非空（干跑与实合之间运行分支又前进了）→
  SKILL.md §8 异常流：停下问人；标准停机动作是 `git merge --abort` 还原运行
  worktree（票分支无损，重放 merge 即可复现冲突再按人的决策处理）。绝不自动解
  冲突（演练：先合回者过、后合回者 CONFLICT 停、abort 后工作树干净）。
- **合回信息**：`[#NNNN] 合回票 NNNN（评审 approved）`，正文可附评审报告编号；
  规范依据 ref-git-commit 合并规则。

## 8. 收口链（运行全绿后，SKILL.md §6）

档 1 收口链全入图（由整图脚本承载，人工交互仍恰两次——
开工确认图外 + 合并确认图内，后者经升级提问承载）；本节命令与判据对各档一致，
档 1 由图内相应阶段执行同款命令。

### 8.1 收口起点核对

在**运行 worktree** 内逐项核对（任一不满足不进 PR）：

1. 全部票已合回：`git branch --list "run/<spec-id>-t*"` 逐支
   `git merge-base --is-ancestor <票分支> run/<spec-id>` 为真。
2. 运行 worktree 干净：`git status --porcelain` 为空——票内容有残留 → 先处置
   （该修进修、该弃进 §8 异常流），不带病收口。
3. 重跑 `.sdlc/check.sh all` 作**收口门禁**：运行全绿（SKILL.md §5.5）到收口
   之间隔了中断/续接也无需重新核验票状态，但检查证据必须新鲜——出口报告
   Evidence 引本次输出。红灯 → SKILL.md §8 预演失败流。

### 8.2 PR 与 pre-push

- PR 正文三节（dev-ship 前半模板，一篇讲整张 spec）：
  - `## Summary`：运行视图——几层几票 + 逐票一句话（票号 + 交付什么），
    最小可表达视图讲清改动。
  - `## Evidence`：§8.1 收口门禁输出 + 逐票评审报告编号（docs/reviews/）。
  - `## Merge Danger`：单向门判定（合入 BASE_REF 后运行分支与票分支即清理，
    不可逆）+ 影响半径（spec 名下全部票 + BASE_REF 消费方）。
- 落点跟 TRACKER（dev-ship §3 同款）：github / gitlab → push 运行分支，`gh pr
  create` / `glab mr create`，CLI 未认证 → 抛决策问题，默认建议回落本地合并，
  不静默降级；local / codeup → 正文作为合并清单在会话中完整呈现。
- push 只推运行分支；票分支不推（随清理删本地）。
- `.sdlc/check.sh pre-push` 在运行 worktree 执行：它取运行分支领先 BASE_REF
  的提交，逐个 [#NNNN] 校验 implemented 票有 approved 评审覆盖（评审报告
  `branch` 记票分支、`tickets` 记该票，契约见蓝图 §11.7）→ 通过才进合并确认。

### 8.3 合并确认与执行

- 确认一次问清（单向门）：① 方式 merge commit / squash / fast-forward，跟仓库
   历史约定给建议；② 是否打 tag（默认不打，发布归 dev-release）。**显式确认才
   执行，沉默或"都行"不算；未执行合并的确认不作数——重入后重新一次问清
   （单向门）。拒绝 → 停，运行停在收口（§5 末条断点续接）。**
- 档 1：本确认经**升级提问**在图内承载（收口链入图，SKILL.md §6），问清内容与
   单向门语义不变——拒绝 → 停在合并确认门，盘上状态即运行状态（票全 implemented、
   运行分支领先 BASE_REF、worktree 未清），续接按 §5 末条；合并未执行不清理。
- 本地路径（TRACKER=local 或平台 PR 未建/回落）：在**主工作区**（已在 BASE_REF）
  执行——运行 worktree 占着运行分支，不切走它：
  `git merge --no-ff "run/<spec-id>"`，merge commit 首行讲清合入整张 spec 并带
  全部票的 `[#NNNN]` 引用（commit-msg 按 [#NNNN] 校验状态——演练实锤：合并信息
  不带票号引用被 hook 拦"既无 [#NNNN] 也无 [trivial]"，合并停在待完成态），
  正文列覆盖票与评审编号 → `git push`。fast-forward 若被仓库约定允许，历史即
  提交本身。
- 平台 PR 路径：按确认方式在平台合并，本地 `git pull` 同步 BASE_REF。
- 合并冲突（BASE_REF 在运行期间前进了）→ SKILL.md §8 合回冲突同款：停下问人，
  标准动作 `git merge --abort`。

### 8.4 票 → done

合并后在**主工作区**（BASE_REF 已含运行内容）：

1. 本 spec 名下全部工票逐张 `status` 改 `done`、追加 `done: <今日>`，逐张跑
   `.sdlc/check.sh validate <file>`。
2. **done 落盘不提交（ADR 0003 裁决 3）**：gitignore 时代过程档无可提交内容，
   不产生 [trivial] 提交——validate 通过即终态。审计链承载 = tracker 投影
   （单向不回删）+ 源码 `[#NNNN]` 引用 + 盘上状态。
3. TRACKER 指向平台 → 逐张 `publish` 投影（投影失败警告跳过不阻断，
   GLOSSARY"投影"语义）。

### 8.5 清理

顺序固定——分支被 worktree 占用时 `git branch -d` 拒绝执行：

```sh
git worktree remove "<repo>-runs/<spec-id>-t<NNNN>"   # 逐票 worktree
git worktree remove "<repo>-runs/<spec-id>-run"       # 运行 worktree（最后）
git branch -d run/<spec-id>-t<NNNN> …                 # 票分支：已随 --no-ff 合回，-d 放行
git branch -d run/<spec-id>                           # 运行分支：已合回 BASE_REF，-d 放行
git worktree prune
```

- **合并未执行不清理**：单向门未过，盘上证据即运行状态。
- 核对：`git worktree list` 无 run/ 前缀条目、`git branch --list "run/*"` 为空。
  任一残留 → 报告，不静默。

### 8.6 出口报告

三件齐了收口才算完成；全部是会话内陈述，不新增产物类型。档 1
运行结算报告即出口报告（随整图脚本运行收尾产出，构成同下）：

1. **逐票终态清单**：票号 | 评审报告 | 终态（全部 done）。
2. **运行摘要**：几层几票、关键路径、开工预检报告（高重叠对 / 改动面未知 / 粗扫
   不符与默认建议）、预演记录（哪次合回、哪条命令、什么输出）、异常与处置
   （无则写"无"）。
3. **指路**：手动 /dev-accept（集成级场景清单见 spec 验收场景节）。dev-execute
   不自动调用 dev-accept——验收是人的门，不是收口的尾巴。
