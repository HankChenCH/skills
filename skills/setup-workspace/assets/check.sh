#!/usr/bin/env bash
# SDLC 门禁脚本——全部机械判断的单一落点（由 setup-workspace 安装，重跑可整体覆盖）。
# 依赖：bash 3.2+、awk、grep、sed、git；所有判断以 docs/ 产物 frontmatter 为唯一事实。
# 用法：check.sh <子命令> [参数]，help 查看全部子命令。
set -u

# ---------- 基础 ----------

die()  { echo "ERROR: $*" >&2; exit 1; }
info() { echo "$*"; }

abs_path() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    *)  printf '%s\n' "$(cd "$(dirname "$1")" && pwd -P)/$(basename "$1")" ;;
  esac
}

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "不在 git 仓库内，无法定位 .sdlc/"
ROOT="$(cd "$ROOT" && pwd -P)"   # 物理路径，避免 /var 等符号链接导致路径前缀不匹配
SDL="$ROOT/.sdlc"
DOCS="$ROOT/docs"

# ---------- frontmatter 解析 ----------

# fm_get FILE KEY：打印标量值（去首尾空白），缺失或无值输出空
fm_get() {
  awk -v key="$2" '
    NR==1 && $0=="---" { infm=1; next }
    infm && $0=="---" { exit }
    infm && index($0, key":")==1 {
      v=substr($0, length(key)+2)
      gsub(/^[ \t]+/, "", v); gsub(/[ \t]+$/, "", v)
      print v; exit
    }
  ' "$1"
}

# fm_list FILE KEY：打印单行列表元素（每行一个）；[a, b] 或 []
fm_list() {
  fm_get "$1" "$2" | awk '
    {
      gsub(/^[ \t]*\[/, ""); gsub(/\][ \t]*$/, ""); gsub(/[ \t]/, "")
      if ($0=="") exit
      n=split($0, a, ",")
      for (i=1;i<=n;i++) if (a[i]!="") print a[i]
    }
  '
}

# fm_bare_key FILE KEY：key 存在但无值（裸 "key:"，疑似多行列表）时返回 0
fm_bare_key() {
  awk -v key="$2" '
    NR==1 && $0=="---" { infm=1; next }
    infm && $0=="---" { exit }
    infm && index($0, key":")==1 {
      v=substr($0, length(key)+2)
      gsub(/^[ \t]+/, "", v); gsub(/[ \t]+$/, "", v)
      if (v=="") bare=1
      exit
    }
    END { exit (bare?0:1) }
  ' "$1"
}

fm_open()  { [ "$(head -n 1 "$1")" = "---" ]; }
fm_closed() {
  awk 'NR==1&&$0=="---"{infm=1;next} infm&&$0=="---"{ok=1} END{exit(ok?0:1)}' "$1"
}

# has_sec FILE 节名：存在 "## 节名" 标题行
has_sec() {
  awk -v pat="^##[ \t]+$2[ \t]*$" '$0 ~ pat { found=1 } END { exit (found?0:1) }' "$1"
}

# sec_body FILE 节名：打印该节正文（到下一个 ## 标题为止）
sec_body() {
  awk -v pat="^##[ \t]+$2[ \t]*$" '
    $0 ~ pat { body=1; next }
    body && /^## / { exit }
    body { print }
  ' "$1"
}

# ---------- 产物模型 ----------

dir_of_type() {
  case "$1" in
    need) echo needs ;;        spec) echo specs ;;
    design) echo designs ;;    ticket) echo tickets ;;
    review) echo reviews ;;    acceptance) echo acceptance ;;
    adr) echo adr ;;           research) echo research ;;
    *) return 1 ;;
  esac
}

type_of() {
  case "$1" in
    "$DOCS"/needs/*) echo need ;;          "$DOCS"/specs/*) echo spec ;;
    "$DOCS"/designs/*) echo design ;;      "$DOCS"/tickets/*) echo ticket ;;
    "$DOCS"/reviews/*) echo review ;;      "$DOCS"/acceptance/*) echo acceptance ;;
    "$DOCS"/adr/*) echo adr ;;             "$DOCS"/research/*) echo research ;;
    *) return 1 ;;
  esac
}

allowed_list() {
  case "$1" in
    need) echo "draft confirmed fulfilled reconstructed" ;;
    spec) echo "draft approved done reconstructed" ;;
    design) echo "draft approved" ;;
    ticket) echo "ready in-progress implemented done" ;;
    review) echo "draft approved" ;;
    acceptance) echo "draft passed rejected" ;;
    adr) echo "accepted superseded" ;;
    *) echo "" ;;
  esac
}

status_allowed() { # VALUE TYPE
  local v t; v="$1"; t="$2"
  for w in $(allowed_list "$t"); do [ "$v" = "$w" ] && return 0; done
  return 1
}

# pad4 N：四位零填充；非数字返回失败
pad4() {
  case "$1" in ''|*[!0-9]*) return 1 ;; esac
  printf '%04d' "$((10#$1))"
}

# artifact_file TYPE REF：按 NNNN 或 NNNN-slug 定位产物文件；找不到返回 1
artifact_file() {
  local dir ref pad f
  dir="$(dir_of_type "$1")" || return 1
  ref="${2%%-*}"
  case "$ref" in ''|*[!0-9]*) return 1 ;; esac
  pad="$(pad4 "$ref")" || return 1
  for f in "$DOCS/$dir/${pad}"-*.md; do
    [ -f "$f" ] || continue
    echo "$f"; return 0
  done
  return 1
}

title_of() { head -n 30 "$1" | grep -m1 '^# ' | sed 's/^#[[:space:]]*//'; }

# 依赖环检测：读全部工单的 blocked-by 建图，输出 "CYCLE a -> b -> a" 或无输出
ticket_cycles() {
  local f id deps edges="" pad
  for f in "$DOCS/tickets"/*.md; do
    [ -f "$f" ] || return 0
    id="$(basename "$f" .md)"; id="${id%%-*}"
    deps=""
    for d in $(fm_list "$f" blocked-by); do
      pad="$(pad4 "$d")" && deps="$deps $pad"
    done
    edges="$edges$id$deps
"
  done
  printf '%s' "$edges" | awk '
    {
      id=$1; n[id]=NF-1
      for (i=2;i<=NF;i++) dep[id "," i-1]=$i
    }
    function dfs(v,   i, d) {
      if (mark[v]==1) { cyc=v; return 1 }
      if (mark[v]==2) return 0
      mark[v]=1; sp++; stack[sp]=v
      for (i=1;i<=n[v];i++) {
        d=dep[v "," i]
        if (d!="" && (d in n) && dfs(d)) return 1
      }
      mark[v]=2; sp--
      return 0
    }
    END {
      for (v in n) {
        sp=0
        if (dfs(v)) {
          line=""; started=0
          for (i=1;i<=sp;i++) {
            if (started || stack[i]==cyc) { started=1; line=line stack[i] " -> " }
          }
          print "CYCLE " line cyc
          exit 1
        }
      }
      exit 0
    }
  '
}

# spec_residue SPECID：输出该 spec 名下仍在盘上的过程档路径（相对仓库根，每行一个）。
# 名下关系：ticket / acceptance 的 spec 字段指向该 spec；review 的 tickets 与名下工单有交集。
# 供 validate 清扫门禁使用：done 的 spec 名下过程档必须为零。
spec_residue() {
  local sid="$1" f tspec t tids tid
  tids=" "
  for f in "$DOCS"/tickets/*.md; do
    [ -f "$f" ] || continue
    tspec="$(fm_get "$f" spec)"; tspec="${tspec%%-*}"
    tspec="$(pad4 "$tspec" 2>/dev/null)" || continue
    [ "$tspec" = "$sid" ] || continue
    echo "${f#"$ROOT"/}"
    tid="$(basename "$f" .md)"; tid="${tid%%-*}"
    tids="$tids$tid "
  done
  for f in "$DOCS"/acceptance/*.md; do
    [ -f "$f" ] || continue
    tspec="$(fm_get "$f" spec)"; tspec="${tspec%%-*}"
    tspec="$(pad4 "$tspec" 2>/dev/null)" || continue
    [ "$tspec" = "$sid" ] && echo "${f#"$ROOT"/}"
  done
  for f in "$DOCS"/reviews/*.md; do
    [ -f "$f" ] || continue
    for t in $(fm_list "$f" tickets); do
      tid="$(pad4 "${t%%-*}" 2>/dev/null)" || continue
      case "$tids" in
        *" $tid "*) echo "${f#"$ROOT"/}"; break ;;
      esac
    done
  done
}

# ---------- 子命令 ----------

cmd_phase() {
  info "== SDLC 状态总览（${ROOT}）=="
  local t dir f any extra v
  for t in need spec design ticket review acceptance adr research; do
    dir="$(dir_of_type "$t")"
    any=0
    for f in "$DOCS/$dir"/*.md; do
      [ -f "$f" ] || continue
      any=1; extra=""
      case "$t" in
        spec)
          v="$(fm_get "$f" need)";   [ -n "$v" ] && extra="$extra need=$v"
          v="$(fm_get "$f" round)";  [ -n "$v" ] && extra="$extra round=$v" ;;
        design|ticket|acceptance)
          v="$(fm_get "$f" spec)";   [ -n "$v" ] && extra="$extra spec=$v" ;;
      esac
      printf '%-11s %s %s%s\n' "$t" "$(basename "$f" .md)" "$(fm_get "$f" status)" "$extra"
    done
    [ "$any" = 0 ] && printf '%-11s （无）\n' "$t"
  done
  local ids; ids="$(frontier_ids)"
  if [ -n "$ids" ]; then printf 'frontier    %s\n' "$(echo "$ids" | tr '\n' ' ')"; else printf 'frontier    （空）\n'; fi
  return 0
}

# frontier_ids：可开工工单（ready 且 blocked-by 全部 implemented/done），每行一个 basename
frontier_ids() {
  local f dep dep_f st ok
  for f in "$DOCS/tickets"/*.md; do
    [ -f "$f" ] || return 0
    [ "$(fm_get "$f" status)" = "ready" ] || continue
    ok=1
    for dep in $(fm_list "$f" blocked-by); do
      dep_f="$(artifact_file ticket "$dep")" || { ok=0; break; }
      st="$(fm_get "$dep_f" status)"
      case "$st" in implemented|done) ;; *) ok=0; break ;; esac
    done
    [ "$ok" = 1 ] && basename "$f" .md
  done
  return 0
}

cmd_frontier() {
  local ids f title
  ids="$(frontier_ids)"
  if [ -z "$ids" ]; then
    info "frontier：（空）当前没有阻塞已清、可开工的工单"
  else
    info "frontier：可开工工单"
    for i in $ids; do
      f="$(artifact_file ticket "$i")"
      title="$(title_of "$f")"
      info "  $i  $title"
    done
  fi
  return 0
}

cmd_ticket() {
  [ -n "${1:-}" ] || die "用法：check.sh ticket NNNN"
  local ref="${1%%-*}"
  case "$ref" in ''|*[!0-9]*) die "工单号必须是数字或 NNNN-slug：$1" ;; esac
  local pad f
  pad="$(pad4 "$ref")" || die "非法工单号：$1"
  f="$(artifact_file ticket "$ref")" || die "工单 $pad 不存在（docs/tickets/${pad}-*.md）"
  local rc=0 st dep dep_f dst spec_id spec_f sst
  st="$(fm_get "$f" status)"
  case "$st" in
    ready)       info "✓ 工单 $pad 就绪（status: ready，新开工）" ;;
    in-progress) info "✓ 工单 $pad 重入（status: in-progress，从 ## Progress 续接）" ;;
    implemented) die "工单 $pad 已 implemented——评审走 /dev-review，不要重复开工" ;;
    done)        die "工单 $pad 已 done——缺陷请走 /dev-fix 开新工单" ;;
    *)           die "工单 $pad 状态非法：${st}（先运行 check.sh validate 检查该文件）" ;;
  esac
  for dep in $(fm_list "$f" blocked-by); do
    dep_f="$(artifact_file ticket "$dep")" \
      || { echo "✗ 阻塞工单 $dep 不存在"; rc=1; continue; }
    dst="$(fm_get "$dep_f" status)"
    case "$dst" in
      implemented|done) info "✓ 阻塞 $dep 已完成（${dst}）" ;;
      *)                echo "✗ 阻塞未清：工单 $dep 状态 ${dst}（等它 implemented/done）"; rc=1 ;;
    esac
  done
  spec_id="$(fm_get "$f" spec)"
  if [ -z "$spec_id" ]; then
    echo "✗ 工单缺 frontmatter 字段 spec"; rc=1
  else
    if spec_f="$(artifact_file spec "$spec_id")"; then
      sst="$(fm_get "$spec_f" status)"
      case "$sst" in
        approved) info "✓ 关联 spec $spec_id 已批准" ;;
        done)     info "✓ 关联 spec $spec_id 已验收（done）" ;;
        draft)    echo "✗ spec $spec_id 还是 draft，先 /dev-spec 完成批准"; rc=1 ;;
        *)        echo "✗ spec $spec_id 状态非法：$sst"; rc=1 ;;
      esac
    else
      echo "✗ 关联 spec $spec_id 不存在"; rc=1
    fi
  fi
  ticket_cycles >/dev/null 2>&1 || {
    echo "✗ 工单依赖存在环：$(ticket_cycles | sed 's/^CYCLE //')"
    rc=1
  }
  if [ "$rc" = 0 ]; then info "ticket ${pad}：入口校验通过"; else info "ticket ${pad}：入口校验未通过（见上）"; fi
  return "$rc"
}

cmd_all() {
  local cfg="$SDL/config.sh"
  [ -f "$cfg" ] || die "缺 $SDL/config.sh——先运行 /setup-workspace"
  # shellcheck disable=SC1090
  . "$cfg"
  : "${CHECK_LINT:-}" "${CHECK_TYPE:-}" "${CHECK_TEST:-}" "${RUN_PREFIX:-}"
  local any=0 rc=0
  local name cmd
  for name in CHECK_LINT CHECK_TYPE CHECK_TEST; do
    case "$name" in
      CHECK_LINT) cmd="$CHECK_LINT" ;;
      CHECK_TYPE) cmd="$CHECK_TYPE" ;;
      CHECK_TEST) cmd="$CHECK_TEST" ;;
    esac
    [ -n "$cmd" ] || continue
    any=1
    echo "== $name: $cmd =="
    if [ -n "$RUN_PREFIX" ]; then
      eval "$RUN_PREFIX $cmd" || { echo "✗ $name 失败"; rc=1; }
    else
      eval "$cmd" || { echo "✗ $name 失败"; rc=1; }
    fi
  done
  if [ "$any" = 0 ]; then
    echo "⚠️  config.sh 未定义任何检查命令（CHECK_LINT/CHECK_TYPE/CHECK_TEST 全空）。"
    echo "    这是发现，不是跳过：门禁无法替你保证质量。请在 .sdlc/config.sh 填入仓库自己的检查命令后重跑。"
    return 0
  fi
  [ "$rc" = 0 ] && info "✓ 全量检查通过"
  return "$rc"
}

commit_refs() { # [MSGFILE]，缺省读 stdin -> 四位零填充、去重的工单号（每行一个）
  local src="${1:--}"
  awk '{
    line=$0
    while (match(line, /\[#[0-9]+\]/)) {
      print substr(line, RSTART+2, RLENGTH-3)
      line=substr(line, RSTART+RLENGTH)
    }
  }' "$src" | sort -u | while IFS= read -r r; do
    p="$(pad4 "$r")" || continue
    printf '%s\n' "$p"
  done
}

cmd_commit_msg() {
  local msg="${1:-}"
  [ -n "$msg" ] || die "用法：check.sh commit-msg <msgfile>（由 git commit-msg hook 传入）"
  [ -f "$msg" ] || die "找不到 commit message 文件：$msg"
  if grep -qF '[trivial]' "$msg"; then
    info "✓ [trivial] 豁免提交（留痕于 commit message，dev-retro 审计）"
    return 0
  fi
  # Merge/Revert 信息头是 git 操作产物而非署名工作，机械放行（要求带空格/引号的完整头形态）
  local first_line
  first_line="$(head -n 1 "$msg")"
  case "$first_line" in
    Merge\ *|'Revert "'*)
      info "✓ Merge/Revert 信息头机械放行（合并/回退无需工单引用）"
      return 0
      ;;
  esac
  local refs rc=0 d f st
  refs="$(commit_refs "$msg")"
  if [ -z "$refs" ]; then
    cat >&2 <<'EOT'
✗ commit message 既无 [#NNNN] 也无 [trivial]。
  规则：功能/修复提交带 [#NNNN]（对应工单须 in-progress/implemented）；
  小修（typo、纯文档）带 [trivial]（每次豁免留痕，dev-retro 审计）。
EOT
    return 1
  fi
  for d in $refs; do
    if f="$(artifact_file ticket "$d")"; then
      st="$(fm_get "$f" status)"
      case "$st" in
        in-progress|implemented) info "✓ [$d] 状态 $st" ;;
        ready)  echo "✗ 工单 $d 还是 ready——先 /dev-implement 开工再提交"; rc=1 ;;
        done)   echo "✗ 工单 $d 已 done——回归问题请开新 fix 工单（/dev-fix）"; rc=1 ;;
        *)      echo "✗ 工单 $d 状态非法：$st"; rc=1 ;;
      esac
    else
      echo "✗ 提交引用的工单 $d 不存在（docs/tickets/）"; rc=1
    fi
  done
  [ "$rc" = 0 ] && info "✓ commit-msg 门禁通过"
  return "$rc"
}

cmd_pre_push() {
  cat >/dev/null 2>&1   # 消费 git 从 stdin 传入的行，避免管道破裂
  local cfg="$SDL/config.sh"
  [ -f "$cfg" ] || die "缺 $SDL/config.sh——先运行 /setup-workspace"
  # shellcheck disable=SC1090
  . "$cfg"
  : "${BASE_REF:=main}"
  local base mb
  base="$(git rev-parse --verify --quiet "refs/heads/$BASE_REF" \
     || git rev-parse --verify --quiet "refs/remotes/origin/$BASE_REF" || true)"
  [ -n "$base" ] || die "找不到基准分支 ${BASE_REF}（本地与 origin 都没有）——检查 .sdlc/config.sh 的 BASE_REF"
  mb="$(git merge-base "$base" HEAD 2>/dev/null)" \
    || die "无法计算与 $BASE_REF 的 merge-base（当前 HEAD 不含该历史？）"
  local subjects refs rc=0 d f st cov rv t
  subjects="$(git log --format=%s "$mb..HEAD")"
  if [ -z "$subjects" ]; then
    info "✓ 分支无领先提交，pre-push 通过"
    return 0
  fi
  refs="$(printf '%s\n' "$subjects" | commit_refs)"
  if [ -z "$refs" ]; then
    echo "⚠️  分支有领先提交但均未引用任何工单——若含源码改动，这是绕过门禁的信号（dev-retro 审计点）"
    return 0
  fi
  for d in $refs; do
    if ! f="$(artifact_file ticket "$d")"; then
      echo "✗ 分支提交引用的工单 $d 不存在"; rc=1; continue
    fi
    st="$(fm_get "$f" status)"
    case "$st" in
      done) info "✓ [$d] 已 done" ;;
      implemented)
        cov=0
        for rv in "$DOCS"/reviews/*.md; do
          [ -f "$rv" ] || continue
          [ "$(fm_get "$rv" status)" = "approved" ] || continue
          for t in $(fm_list "$rv" tickets); do
            [ "$(pad4 "$t")" = "$d" ] && { cov=1; break; }
          done
          [ "$cov" = 1 ] && break
        done
        if [ "$cov" = 1 ]; then
          info "✓ [$d] 已被 approved 评审覆盖"
        else
          echo "✗ [$d] 已 implemented 但无 approved 评审覆盖——先走 /dev-review 出报告，评审的 tickets: [] 须声明覆盖 [$d]"; rc=1
        fi
        ;;
      ready|in-progress)
        echo "✗ [$d] 在分支上有提交但状态是 ${st}——先完成实现（/dev-implement）置 implemented"; rc=1 ;;
      *) echo "✗ 工单 $d 状态非法：$st"; rc=1 ;;
    esac
  done
  [ "$rc" = 0 ] && info "✓ pre-push 门禁通过"
  return "$rc"
}

cmd_publish() {
  [ -n "${1:-}" ] || die "用法：check.sh publish <file>"
  local file
  file="$(abs_path "$1")"
  [ -f "$file" ] || die "找不到产物文件：$file"
  local cfg="$SDL/config.sh"
  [ -f "$cfg" ] || die "缺 $SDL/config.sh——先运行 /setup-workspace"
  # shellcheck disable=SC1090
  . "$cfg"
  : "${TRACKER:=local}"
  local adapter="$SDL/trackers/$TRACKER.sh"
  if [ -f "$adapter" ]; then
    "$adapter" publish "$file"
    return $?
  fi
  case "$TRACKER" in
    local) die "TRACKER=local 但缺 ${adapter}——安装损坏，重跑 /setup-workspace" ;;
    *)
      echo "⚠️  TRACKER=$TRACKER 的适配器未安装（缺 ${adapter}）。产物已在盘上（docs/ 是真相源），本次发布跳过；重跑 /setup-workspace 可装上，或参照 trackers/local.sh 自写适配器。"
      return 0
      ;;
  esac
}

cmd_validate() {
  [ -n "${1:-}" ] || die "用法：check.sh validate <file>"
  local file
  file="$(abs_path "$1")"
  [ -f "$file" ] || die "找不到文件：$file"
  local type
  type="$(type_of "$file")" || die "无法识别产物类型（文件须位于 docs/ 八个产物目录内）：$file"
  local ERRORS=0
  err() { echo "  ✗ $*"; ERRORS=$((ERRORS+1)); }
  local base id status pad spec_id need_id need_file frs covered missing round dep t any residue r
  base="$(basename "$file")"

  # --- 通用：frontmatter、id、文件名、状态 ---
  fm_open "$file"    || err "缺 frontmatter（首行须为 ---）"
  fm_closed "$file"  || err "frontmatter 未闭合（缺第二个 ---）"
  id="$(fm_get "$file" id)"
  case "$id" in ''|*[!0-9]*) err "frontmatter id 必须是四位数字：${id:-（空）}" ;; esac
  pad="$(pad4 "$id" 2>/dev/null || echo 0000)"
  case "$base" in "$pad"-*) ;; *) err "id 与文件名前缀不一致（应为 ${pad}-slug.md）：$base" ;; esac
  echo "$base" | grep -qE '^[0-9]{4}-[a-z0-9]+(-[a-z0-9]+)*\.md$' \
    || err "文件名不符合 NNNN-slug.md（slug 限 ASCII 小写/数字/短横线）：$base"
  status="$(fm_get "$file" status)"
  if [ "$type" != research ]; then
    if [ -z "$status" ]; then
      err "缺 frontmatter 字段 status"
    else
      status_allowed "$status" "$type" || err "status 非法（$type 允许：$(allowed_list "$type")）：$status"
    fi
  fi

  check_sections() {
    local IFS='|'
    local s
    for s in $2; do has_sec "$1" "$s" || err "缺必填节：## $s"; done
  }

  case "$type" in
    need)
      check_sections "$file" "背景与业务目标|干系人与用户|系统能力需求|场景|假设与风险|范围与非目标|开放问题"
      ;;
    spec)
      check_sections "$file" "问题陈述|方案|用户故事|实现决策|测试决策|验收场景|非目标|备注"
      need_id="$(fm_get "$file" need)"
      if [ -n "$need_id" ]; then
        if need_file="$(artifact_file need "$need_id")"; then
          frs="$(sec_body "$need_file" "系统能力需求" | grep -oE 'FR-[0-9]+' | sort -u)"
          if [ -z "$frs" ]; then
            err "关联 need 的「系统能力需求」节没有任何 FR-N 编号，无法追溯"
          else
            covered="$(sec_body "$file" "验收场景" | grep '\[FR-' | grep -oE 'FR-[0-9]+' | sort -u)"
            missing=""
            for fr in $frs; do
              printf '%s\n' "$covered" | grep -qx "$fr" || missing="$missing $fr"
            done
            [ -n "$missing" ] && err "孤儿 FR：验收场景未覆盖 need 的:$missing"
            sec_body "$file" "验收场景" | grep -qE '\[FR-[0-9]+[[:space:]]*\|[[:space:]]*(工单级|集成级)\]' \
              || err "验收场景条目须带 [FR-N | 工单级] 或 [FR-N | 集成级] 标签"
          fi
        else
          err "need 字段指向的 need $need_id 不存在"
        fi
      fi
      # 清扫门禁：done 的 spec 名下必无过程档残留（蒸馏清扫完成后才允许置 done）
      if [ "$status" = "done" ]; then
        for residue in $(spec_residue "$pad"); do
          err "spec 已置 done 但名下过程档未清扫：$residue"
        done
      fi
      ;;
    ticket)
      has_sec "$file" "Progress" || err "缺必填节：## Progress"
      grep -qE '^[[:space:]]*- \[( |x)\]' "$file" || err "缺验收标准条目（**验收标准：** 下至少一条 - [ ]）"
      fm_bare_key "$file" "blocked-by" && err "blocked-by 须单行书写：[] 或 [0006, 0008]"
      fm_bare_key "$file" "repos" && err "repos 须单行书写：[frontend, backend]"
      spec_id="$(fm_get "$file" spec)"
      if [ -n "$spec_id" ]; then
        artifact_file spec "$spec_id" >/dev/null 2>&1 || err "关联 spec $spec_id 不存在"
      else
        err "缺 frontmatter 字段 spec"
      fi
      for dep in $(fm_list "$file" blocked-by); do
        artifact_file ticket "$dep" >/dev/null 2>&1 || err "blocked-by 引用的工单 $dep 不存在"
      done
      # FR-9：repos 非空时逐值校验其在成员清单内，缺省不触发该校验
      for r in $(fm_list "$file" repos); do
        grep -qxF "$r" "$SDL/members.list" 2>/dev/null \
          || err "repos 值 $r 不在成员清单（.sdlc/members.list）"
      done
      ticket_cycles >/dev/null 2>&1 || err "工单依赖存在环：$(ticket_cycles | sed 's/^CYCLE //')"
      ;;
    review)
      check_sections "$file" "标准轴 findings|Spec 轴 findings|汇总"
      fm_bare_key "$file" "tickets" && err "tickets 须单行书写：[0007, 0008]"
      any=0
      for t in $(fm_list "$file" tickets); do
        any=1
        artifact_file ticket "$t" >/dev/null 2>&1 || err "tickets 引用的工单 $t 不存在"
      done
      [ "$any" = 1 ] || err "tickets 不能为空（评审须声明覆盖面，pre-push 依据它校验）"
      [ -n "$(fm_get "$file" branch)" ] || err "缺 frontmatter 字段 branch"
      ;;
    acceptance)
      check_sections "$file" "场景结果|假设验证|残余风险|下一轮建议"
      spec_id="$(fm_get "$file" spec)"
      if [ -n "$spec_id" ]; then
        artifact_file spec "$spec_id" >/dev/null 2>&1 || err "关联 spec $spec_id 不存在"
      else
        err "缺 frontmatter 字段 spec"
      fi
      round="$(fm_get "$file" round)"
      [ -n "$round" ] || err "缺 frontmatter 字段 round"
      ;;
    adr|research)
      : ;;
  esac

  if [ "$ERRORS" -gt 0 ]; then
    echo "validate：$base 未通过（$ERRORS 处，类型 ${type}）"
    return 1
  fi
  echo "validate：$base 通过（${type}）"
  return 0
}

usage() {
  cat <<'EOF'
用法：check.sh <子命令> [参数]
  phase                 全库状态总览（八类产物 + frontier）
  frontier              列出阻塞已清、可开工的工单
  ticket NNNN           dev-implement 入口校验（ready/重入、阻塞已清、spec approved）
  all                   全量 lint/typecheck/test（按 .sdlc/config.sh，经 RUN_PREFIX 包裹）
  validate <file>       产物模板完整性与追溯校验（必填节/frontmatter/FR 追溯/依赖环/done 残留扫描）
  commit-msg <msgfile>  轻门禁：[#NNNN] 且工单 in-progress/implemented，或 [trivial]；Merge/Revert 信息头机械放行
  pre-push              重门禁：分支上 implemented 工单须被 approved 评审覆盖
  publish <file>        按 TRACKER 发布产物（local=确认在盘）
  help                  本说明
EOF
}

main() {
  [ $# -ge 1 ] || { usage; exit 2; }
  local cmd="$1"; shift
  case "$cmd" in
    phase)      cmd_phase ;;
    frontier)   cmd_frontier ;;
    ticket)     cmd_ticket "$@" ;;
    all)        cmd_all ;;
  validate)   cmd_validate "$@" ;;
  commit-msg) cmd_commit_msg "$@" ;;
    pre-push)   cmd_pre_push "$@" ;;
    publish)    cmd_publish "$@" ;;
    help|-h|--help) usage ;;
    *) usage >&2; die "未知子命令：$cmd" ;;
  esac
}

main "$@"
