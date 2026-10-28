# run-mechanics：dev-execute 操作细则

SKILL.md 只留控制流；本文件是它引用的操作细则，按引用章节加载。所有命令均在
2026-10-28 于临时 git 仓库演练实证（工单 0013：§1–§7，记录目录
/tmp/devx-drill/records/；工单 0014：§8 收口链，记录目录
/tmp/devx-drill/records/closeout-*.txt）。
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

## 3. 运行建立

```sh
git worktree add "<repo>-runs/<spec-id>-run" -b "run/<spec-id>"
```

建立后核对清单（任一不满足即停，不派发）：

1. `git worktree list` 出现运行 worktree 条目，分支列为 `run/<spec-id>`。
2. 主工作区 `git branch --show-current` 仍为主分支（BASE_REF）。
3. 主工作区 `git status --short` 为空（零污染）。
4. 运行 worktree 内 `.sdlc/check.sh phase` 可运行且读到的票状态与主工作区一致
   （同一 .git，产物即盘上文件）。

## 4. 票 worktree 与并行派发

当前层每票，从运行分支切出票分支与票 worktree：

```sh
git worktree add "<repo>-runs/<spec-id>-t<NNNN>" -b "run/<spec-id>-t<NNNN>" "run/<spec-id>"
```

- **派发判据**：票 frontmatter `blocked-by` 中 spec 内依赖全部已合回（§5.3 判据）
  或 done；blocked-by 未满足的票不建 worktree、不派发（演练：无票 worktree 条目）。
- **并行派发**：同层每票一个子代理，子代理执行 dev-implement 纪律全文，全部工作在
  该票 worktree 内完成；并行度默认上限 4（SKILL.md 调用参数可覆盖），超出分批。
- **交接语义**：实现提交与 `status: implemented` 翻转一并落在票分支（dev-implement
  出口门禁）——这是 §7 合回被 commit-msg 放行的前提。
- **隔离自证**：票 worktree 只见自己分支的改动（演练：两票 worktree 互不可见）；
  运行分支在合回前无该票内容。

## 5. 中断续接推导

1. `git worktree list`：有无 `run/<spec-id>` 条目 → 运行是否存在。
2. 逐票读 frontmatter status。**读取顺序**：运行 worktree 最新（合回票的状态随
   合回落地）；在办票读其票 worktree；主工作区在运行合回主干前是旧态，不作为
   运行进度依据（演练实锤：同一票文件主仓 ready、运行 worktree implemented）。
   done=完成；implemented=评审 approved（是否已合回看下一步）；in-progress=在办
   （读其 `## Progress` 拿断点）；ready=未开工。
3. 已合回判定：`git merge-base --is-ancestor "run/<spec-id>-t<NNNN>" "run/<spec-id>"`
   （或运行分支 `git log --format=%s` 含该票 `[#NNNN]` 合回提交）→ implemented 且
   已合回。
4. 断点 = 首个"未合回"的票所在层：在办票续接其 Progress，未开工票照图派发；
   已合回票与其所在层不重做。
5. 票集变化（fix 票插入、spec 修订增删票）→ 回 SKILL.md §3 重算图，已完成票仍列
   图外，不重做。
6. 断点落在收口链内（全部票已合回、预演绿，SKILL.md §6 未走完）→ 按序判定续接点：
   - PR 未建或停在合并确认前（运行分支领先 BASE_REF、票全 implemented）→ 从
     §8.1 起走收口；确认前中断的不补问已答过的问题，重新一次问清（单向门每轮
     都要显式确认）。
   - 合并已执行、票未 done（`git merge-base --is-ancestor run/<spec-id>
     <BASE_REF>` 为真、票仍 implemented）→ 从 §8.4 补 done。
   - 票已 done、worktree 未清（`git worktree list` 仍有 run/ 前缀条目）→ 从
     §8.5 清理续起。
   已合回票的评审不重做：评审报告随票分支在盘上（docs/reviews/），pre-push 按
   覆盖面机械核对，缺了才补（SKILL.md §8 收口 pre-push 异常）。

## 6. 预演（每次合回后）

在**运行 worktree** 内：

1. `.sdlc/check.sh all`——必须退出码 0。exit 0 但输出
   "⚠️ config.sh 未定义任何检查命令" → **视为红灯**（发现，不是跳过）：停下按
   SKILL.md §8 预演失败流报告。
2. spec 验收场景中标 [FR-N | 集成级] 且仓库已有自动化承载的测试（`CHECK_TEST`
   已覆盖的不再重复跑；无承载的集成场景留给 /dev-accept，运行不代跑）。
3. 预演记录进运行摘要：哪次合回、哪条命令、什么输出。

## 7. 机械合回

票评审 approved 后，在**运行 worktree** 内按依赖序（分层序，同层任一序）执行：

```sh
git merge --no-ff "run/<spec-id>-t<NNNN>" -m "[#NNNN] 合回票 NNNN（评审 approved）"
```

- **放行前提**：状态翻转已随票分支提交（§4 交接语义）。git 在 commit-msg hook
  触发前已把合并结果写进工作树，hook 读到的运行 worktree 票文件是 implemented →
  校验放行；票分支缺翻转提交 → hook 拦（"还是 ready"）——停下让票子代理补出口
  提交，不绕门禁（两个方向均已演练实证）。
- **预演衔接**：合回后立即跑 §6；绿灯才合回下一票或调度下一层。
- **冲突停机**：merge 退出码 1 且 `git diff --name-only --diff-filter=U` 非空 →
  SKILL.md §8 异常流：停下问人；标准停机动作是 `git merge --abort` 还原运行
  worktree（票分支无损，重放 merge 即可复现冲突再按人的决策处理）。绝不自动解
  冲突（演练：先合回者过、后合回者 CONFLICT 停、abort 后工作树干净）。
- **合回信息**：`[#NNNN] 合回票 NNNN（评审 approved）`，正文可附评审报告编号；
  规范依据 ref-git-commit 合并规则。

## 8. 收口链（运行全绿后，SKILL.md §6）

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
2. 状态变更**一次** [trivial] 提交落 BASE_REF：首行写明"spec <NNNN> 全部工票
   → done"，正文留豁免理由（流程状态落盘，非绕门禁，dev-retro 审计基准内；
   dev-ship §4.3 同款语义）。
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

三件齐了收口才算完成；全部是会话内陈述，不新增产物类型：

1. **逐票终态清单**：票号 | 评审报告 | 终态（全部 done）。
2. **运行摘要**：几层几票、关键路径、预演记录（哪次合回、哪条命令、什么输出）、
   异常与处置（无则写"无"）。
3. **指路**：手动 /dev-accept（集成级场景清单见 spec 验收场景节）。dev-execute
   不自动调用 dev-accept——验收是人的门，不是收口的尾巴。
