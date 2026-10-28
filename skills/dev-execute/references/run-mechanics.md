# run-mechanics：dev-execute 操作细则

SKILL.md 只留控制流；本文件是它引用的操作细则，按引用章节加载。所有命令均在
2026-10-28 于临时 git 仓库演练实证（工单 0013，记录目录 /tmp/devx-drill/records/）。
判断以 `.sdlc/check.sh` 输出与 `git` 实际行为为准，不凭记忆。

## 1. 约定总览

- **运行分支**：`run/<spec-id>`（如 `run/0006`）。
- **worktree 放置**：仓库同级约定目录 `<repo>-runs/`（与仓库目录平级，不入版本库，
  git 元数据自管理）。运行 worktree：`<repo>-runs/<spec-id>-run/`；票 worktree：
  `<repo>-runs/<spec-id>-t<NNNN>/`。
- **机械发现**：`git worktree list` 中分支以 `run/` 开头的条目即运行；主工作区条目
  （第一项）不计。
- **票分支命名**：**受阻待补**——spec 0006 现行约定 `run/<spec-id>/<ticket-id>` 与
  运行分支在 git ref 名空间冲突（D/F：`cannot lock ref … 'refs/heads/run/0006'
  exists`），不可实现；证据与推荐方案见工单 0013 Progress，经 /dev-spec round 2
  修订后本文件 §4、§7 补写。

## 2. 建运行依赖顺序图

权威算法（票数 ≤ 数百时手工与 awk 均瞬时完成）：

1. 节点 = 点名 spec 名下全部工票（`docs/tickets/` 中 frontmatter `spec:` 匹配者）。
2. 边 = blocked-by。依赖分两类：spec 内依赖与外部依赖（指向其他 spec 的票）。
   - spec 内依赖状态为 done 或 implemented → 已满足，不再连边（done 票本身列
     图外"已完成"）。
   - 外部依赖状态非 done → 该票标"外部阻塞"，不参与分层；全图因此无第 1 层 →
     停下报告，不进入运行。
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

**受阻待补**（同 §1 票分支命名；修订后落：切出命令、每票一 worktree 核对、
子代理并行派发的批量与超批处理、blocked-by 未满足不派发的机械判据）。

## 5. 中断续接推导

1. `git worktree list`：有无 `run/<spec-id>` 条目 → 运行是否存在。
2. 逐票读 frontmatter status：done=完成；implemented=评审 approved（是否已合回看
   下一步）；in-progress=在办（读其 `## Progress` 拿断点）；ready=未开工。
3. 已合回判定：运行分支 `git log --format=%s` 含该票 `[#NNNN]` 合回提交（或
   `git merge-base --is-ancestor <票分支> run/<spec-id>`）→ implemented 且已合回。
4. 断点 = 首个"未合回"的票所在层：在办票续接其 Progress，未开工票照图派发；
   已合回票与其所在层不重做。
5. 票集变化（fix 票插入、spec 修订增删票）→ 回 SKILL.md §3 重算图，已完成票仍列
   图外，不重做。

## 6. 预演（每次合回后）

在**运行 worktree** 内：

1. `.sdlc/check.sh all`——必须退出码 0。exit 0 但输出
   "⚠️ config.sh 未定义任何检查命令" → **视为红灯**（发现，不是跳过）：停下按
   SKILL.md §7 预演失败流报告。
2. spec 验收场景中标 [FR-N | 集成级] 且仓库已有自动化承载的测试（`CHECK_TEST`
   已覆盖的不再重复跑；无承载的集成场景留给 /dev-accept，运行不代跑）。
3. 预演记录进运行摘要：哪次合回、哪条命令、什么输出。

## 7. 机械合回

**受阻待补**（同 §1 票分支命名；修订后落：按依赖序的合回命令与信息格式
（ref-git-commit 合并规则 + [#NNNN]）、冲突判据与停机动作、合回后预演的衔接）。
