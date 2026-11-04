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
    overview) echo overviews ;;
    review) echo reviews ;;    acceptance) echo acceptance ;;
    adr) echo adr ;;           research) echo research ;;
    *) return 1 ;;
  esac
}

type_of() {
  case "$1" in
    "$DOCS"/needs/*) echo need ;;          "$DOCS"/specs/*) echo spec ;;
    "$DOCS"/designs/*) echo design ;;      "$DOCS"/tickets/*) echo ticket ;;
    "$DOCS"/overviews/*) echo overview ;;
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
    overview) echo "draft reviewed" ;;
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

# ref_key REF：双格式引用规整键（spec 0017）——新时间戳 ID（YYYYMMDD-4hex，可带 -slug 尾）
# 取完整 ID 段原样返回；旧纯数字（可带 -slug 尾）截号段补零四位，超四位数字（裸日期串
# 等非法引用形态）不透传。供关联字段等值比较、依赖图键与文件名 ID 段提取用；无法规整返回 1。
ref_key() {
  local r="$1"
  case "$r" in
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]*)
      printf '%s\n' "${r:0:13}"; return 0 ;;
  esac
  r="${r%%-*}"
  case "$r" in ''|*[!0-9]*) return 1 ;; esac
  [ "${#r}" -le 4 ] || return 1
  pad4 "$r"
}

# artifact_file TYPE REF：按 NNNN（旧，可带 -slug 尾）或 YYYYMMDD-4hex（新，可带 -slug 尾）
# 定位产物文件；找不到返回 1。新格式先匹配（含谱系前缀文件名 *-<ID>-*.md），未命中再走
# 旧四位路径（spec 0017 决策 5）；旧路径限 ≤4 位纯数字，防止裸日期串误撞新格式文件。
artifact_file() {
  local dir ref newid pad f
  dir="$(dir_of_type "$1")" || return 1
  ref="$2"
  case "$ref" in
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]*)
      newid="${ref:0:13}"
      for f in "$DOCS/$dir/${newid}"-*.md; do
        [ -f "$f" ] || continue
        echo "$f"; return 0
      done
      for f in "$DOCS/$dir/"*-"${newid}"-*.md; do
        [ -f "$f" ] || continue
        echo "$f"; return 0
      done
      return 1
      ;;
  esac
  ref="${ref%%-*}"
  pad="$(ref_key "$ref")" || return 1
  for f in "$DOCS/$dir/${pad}"-*.md; do
    [ -f "$f" ] || continue
    echo "$f"; return 0
  done
  return 1
}

# artifact_name_id BASE：解析产物文件名 → 输出「ID段」或「谱系前缀 ID段」（前缀形如
# <父类型><父ID>，spec 0017 决策 1/4）；识别顺序：带前缀新格式、无前缀新格式、旧四位格式。
# 不识别返回 1（输出空）。frontmatter id 必须与输出的 ID 段一致。
artifact_name_id() {
  local b="${1%.md}"
  if printf '%s\n' "$b" | grep -qE '^(need|spec|design|adr|research)([0-9]{4}|[0-9]{8}-[0-9a-f]{4})-([0-9]{8}-[0-9a-f]{4})-[a-z0-9]+(-[a-z0-9]+)*$'; then
    printf '%s\n' "$b" | sed -E 's/^(need|spec|design|adr|research)([0-9]{4}|[0-9]{8}-[0-9a-f]{4})-([0-9]{8}-[0-9a-f]{4})-.*/\1\2 \3/'
    return 0
  fi
  if printf '%s\n' "$b" | grep -qE '^([0-9]{8}-[0-9a-f]{4})-[a-z0-9]+(-[a-z0-9]+)*$'; then
    printf '%s\n' "${b:0:13}"
    return 0
  fi
  if printf '%s\n' "$b" | grep -qE '^[0-9]{4}-[a-z0-9]+(-[a-z0-9]+)*$'; then
    printf '%s\n' "${b%%-*}"
    return 0
  fi
  return 1
}

title_of() { head -n 30 "$1" | grep -m1 '^# ' | sed 's/^#[[:space:]]*//'; }

# 依赖环检测：读全部工单的 blocked-by 建图，输出 "CYCLE a -> b -> a" 或无输出。
# 节点键与边键同走 ref_key 规整，键空间单一：新格式工单互指环可检出（票 0038 评审核销）。
ticket_cycles() {
  local f id deps edges="" pad
  for f in "$DOCS/tickets"/*.md; do
    [ -f "$f" ] || return 0
    id="$(ref_key "$(basename "$f" .md)")" || continue
    deps=""
    for d in $(fm_list "$f" blocked-by); do
      pad="$(ref_key "$d")" && deps="$deps $pad"
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
# 名下关系：ticket / acceptance / overview 的 spec 字段指向该 spec；review 的 tickets 与名下工单有交集。
# SPECID 经 ref_key 规整，新旧双格式等值比较（spec 0017）。
# 供 validate 清扫门禁使用：done 的 spec 名下过程档必须为零。
spec_residue() {
  local sid f tspec t tids tid
  sid="$(ref_key "$1" 2>/dev/null)" || return 0
  tids=" "
  for f in "$DOCS"/tickets/*.md; do
    [ -f "$f" ] || continue
    tspec="$(ref_key "$(fm_get "$f" spec)" 2>/dev/null)" || continue
    [ "$tspec" = "$sid" ] || continue
    echo "${f#"$ROOT"/}"
    tid="$(ref_key "$(basename "$f" .md)")" || continue
    tids="$tids$tid "
  done
  for dir in acceptance overviews; do
    for f in "$DOCS"/"$dir"/*.md; do
      [ -f "$f" ] || continue
      tspec="$(ref_key "$(fm_get "$f" spec)" 2>/dev/null)" || continue
      [ "$tspec" = "$sid" ] && echo "${f#"$ROOT"/}"
    done
  done
  for f in "$DOCS"/reviews/*.md; do
    [ -f "$f" ] || continue
    for t in $(fm_list "$f" tickets); do
      tid="$(ref_key "$t" 2>/dev/null)" || continue
      case "$tids" in
        *" $tid "*) echo "${f#"$ROOT"/}"; break ;;
      esac
    done
  done
}

# overview_gate SPEC_ID：FR-7 开工门禁——名下票 ≥2 的 spec 须有 reviewed 总览才准开工。
# 名下关系与 spec_residue 同一定义（票 frontmatter spec 字段指向该 spec）。
# 单票豁免放行；缺失或 draft 总览 → 非零退出并指路 /dev-overview。仅在 spec approved/done 后调用。
overview_gate() {
  local sid own tf tspec of ospec found draft
  sid="$(ref_key "$1" 2>/dev/null)" || return 0
  own=0
  for tf in "$DOCS"/tickets/*.md; do
    [ -f "$tf" ] || continue
    tspec="$(ref_key "$(fm_get "$tf" spec)" 2>/dev/null)" || continue
    [ "$tspec" = "$sid" ] || continue
    own=$((own+1))
  done
  if [ "$own" -le 1 ]; then
    [ "$own" -eq 1 ] && info "✓ spec $1 单票，免总览门禁"
    return 0
  fi
  found=""; draft=""
  for of in "$DOCS"/overviews/*.md; do
    [ -f "$of" ] || continue
    ospec="$(ref_key "$(fm_get "$of" spec)" 2>/dev/null)" || continue
    [ "$ospec" = "$sid" ] || continue
    if [ "$(fm_get "$of" status)" = "reviewed" ]; then found="$of"; break; fi
    [ -n "$draft" ] || draft="$of"
  done
  if [ -n "$found" ]; then
    info "✓ spec $1 名下 ${own} 张票，总览 $(basename "$found") 已 reviewed"
    return 0
  fi
  if [ -n "$draft" ]; then
    echo "✗ spec $1 名下 ${own} 张票，总览 $(basename "$draft") 还是 draft——开工前置：在 /dev-overview 完成走查（缝隙归置清零 + 用户显式确认）置 reviewed"
  else
    echo "✗ spec $1 名下 ${own} 张票，缺 reviewed 总览（docs/overviews/）——开工前置：先 /dev-overview 合成总览、走查归置并确认后置 reviewed"
  fi
  return 1
}

# ---------- 子命令 ----------

cmd_phase() {
  info "== SDLC 状态总览（${ROOT}）=="
  local t dir f any extra v
  for t in need spec design ticket overview review acceptance adr research; do
    dir="$(dir_of_type "$t")"
    any=0
    for f in "$DOCS/$dir"/*.md; do
      [ -f "$f" ] || continue
      any=1; extra=""
      case "$t" in
        spec)
          v="$(fm_get "$f" need)";   [ -n "$v" ] && extra="$extra need=$v"
          v="$(fm_get "$f" round)";  [ -n "$v" ] && extra="$extra round=$v" ;;
        design|ticket|acceptance|overview)
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
  [ -n "${1:-}" ] || die "用法：check.sh ticket NNNN 或 YYYYMMDD-4hex"
  local disp f
  case "$1" in
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]*)
      disp="${1:0:13}" ;;
    *)
      local ref="${1%%-*}"
      case "$ref" in ''|*[!0-9]*) die "工单号必须是 NNNN-slug 或 YYYYMMDD-4hex：$1" ;; esac
      disp="$(pad4 "$ref")" || die "非法工单号：$1"
      ;;
  esac
  f="$(artifact_file ticket "$1")" || die "工单 ${disp} 不存在（docs/tickets/）"
  local rc=0 st dep dep_f dst spec_id spec_f sst
  st="$(fm_get "$f" status)"
  case "$st" in
    ready)       info "✓ 工单 $disp 就绪（status: ready，新开工）" ;;
    in-progress) info "✓ 工单 $disp 重入（status: in-progress，从 ## Progress 续接）" ;;
    implemented) die "工单 $disp 已 implemented——评审走 /dev-review，不要重复开工" ;;
    done)        die "工单 $disp 已 done——缺陷请走 /dev-fix 开新工单" ;;
    *)           die "工单 $disp 状态非法：${st}（先运行 check.sh validate 检查该文件）" ;;
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
      # FR-7 开工门禁：spec 批准之后校验 reviewed 总览（名下 ≥2 票才触发，单票豁免）
      if [ "$sst" = "approved" ] || [ "$sst" = "done" ]; then
        overview_gate "$spec_id" || rc=1
      fi
    else
      echo "✗ 关联 spec $spec_id 不存在"; rc=1
    fi
  fi
  ticket_cycles >/dev/null 2>&1 || {
    echo "✗ 工单依赖存在环：$(ticket_cycles | sed 's/^CYCLE //')"
    rc=1
  }
  if [ "$rc" = 0 ]; then info "ticket ${disp}：入口校验通过"; else info "ticket ${disp}：入口校验未通过（见上）"; fi
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

commit_refs() { # [MSGFILE]，缺省读 stdin -> 工单号（旧补零四位 / 新 YYYYMMDD-4hex 原样），去重每行一个
  local src="${1:--}"
  awk '{
    line=$0
    while (match(line, /\[#[0-9]+(-[0-9a-f]+)?\]/)) {
      print substr(line, RSTART+2, RLENGTH-3)
      line=substr(line, RSTART+RLENGTH)
    }
  }' "$src" | sort -u | while IFS= read -r r; do
    case "$r" in
      [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]) printf '%s\n' "$r" ;;
      *) p="$(pad4 "$r")" || continue
         printf '%s\n' "$p" ;;
    esac
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
✗ commit message 既无 [#NNNN] 也无 [#YYYYMMDD-4hex]，也无 [trivial]。
  规则：功能/修复提交带 [#NNNN] 或 [#YYYYMMDD-4hex]（对应工单须 in-progress/implemented）；
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
            [ "$(ref_key "$t" 2>/dev/null)" = "$d" ] && { cov=1; break; }
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

# cmd_claim TYPE SLUG [PARENT_TYPE PARENT_REF]：原子取号入口（spec 0017）。
# 一次调用完成：生成 YYYYMMDD-4hex 候选号 → 以排他创建（noclobber）落占位文件占号 →
# 撞号重掷随机段重试 → 返回最终产物文件名（仓库相对路径，占位由调用会话写正文覆盖）。
# 父为知识档（need/spec/design/adr/research）必带谱系前缀 <父类型><父ID>-；父为过程档不带。
cmd_claim() {
  [ $# -ge 2 ] || die "用法：check.sh claim <type> <slug> [父类型 父ID]"
  local type="$1" slug="$2" prefix="" ptype pid pfile dir path id hexseg attempt dup g
  dir="$(dir_of_type "$type")" || die "未知产物类型：${type}（须为九类产物之一）"
  printf '%s\n' "$slug" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$' \
    || die "slug 非法（限 ASCII 小写/数字/短横线）：$slug"
  if [ $# -ge 4 ]; then
    ptype="$3"; pid="$4"
    dir_of_type "$ptype" >/dev/null || die "未知父产物类型：${ptype}（须为九类产物之一）"
    pfile="$(artifact_file "$ptype" "$pid")" || die "父产物 $ptype $pid 不存在（docs/）"
    pid="$(fm_get "$pfile" id)"   # 前缀取父产物 frontmatter id（唯一事实源）
    case "$ptype" in
      need|spec|design|adr|research) prefix="$ptype$pid-" ;;
    esac
  fi
  mkdir -p "$DOCS/$dir"
  for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16; do
    hexseg="$(od -An -N2 -tx1 /dev/urandom | tr -d ' \n')"
    [ "${#hexseg}" -eq 4 ] || die "随机段异常（${#hexseg} 字符）：$hexseg（检查 od 与系统熵源）"
    id="$(date +%Y%m%d)-$hexseg"
    path="$DOCS/$dir/${prefix}${id}-${slug}.md"
    # 唯一键是 ID 段而非全路径：同目录已有同 ID 产物（任意 slug、任意前缀位置）即重掷。
    # ID 在文件名中的位置只有两种：无前缀时居首（ID-*），有前缀时居父前缀之后（*-ID-*）。
    dup=0
    for g in "$DOCS/$dir/${id}"-*.md "$DOCS/$dir/"*-"${id}"-*.md; do
      [ -f "$g" ] || continue
      dup=1; break
    done
    [ "$dup" = 1 ] && continue
    if ( set -C; : > "$path" ) 2>/dev/null; then
      # 并发同掷核验：创建后同 ID 异文件在场即删自身重掷（互见者让位，恒至一者存活）
      dup=0
      for g in "$DOCS/$dir/${id}"-*.md "$DOCS/$dir/"*-"${id}"-*.md; do
        [ -f "$g" ] || continue
        [ "$g" = "$path" ] && continue
        dup=1; break
      done
      if [ "$dup" = 1 ]; then rm "$path"; continue; fi
      printf '%s\n' "${path#"$ROOT"/}"
      return 0
    fi
    [ -e "$path" ] || die "占位文件创建失败：$path（目录不可写？）"
  done
  die "取号连续 16 次撞号，放弃（${prefix}$(date +%Y%m%d)-* 段拥挤或随机源异常）"
}

cmd_validate() {
  [ -n "${1:-}" ] || die "用法：check.sh validate <file>"
  local file
  file="$(abs_path "$1")"
  [ -f "$file" ] || die "找不到文件：$file"
  local type
  type="$(type_of "$file")" || die "无法识别产物类型（文件须位于 docs/ 九个产物目录内）：$file"
  local ERRORS=0
  err() { echo "  ✗ $*"; ERRORS=$((ERRORS+1)); }
  local base id status spec_id need_id need_file frs covered missing round dep t any residue r
  base="$(basename "$file")"

  # --- 通用：frontmatter、id、文件名、状态（id 与文件名双格式，spec 0017 决策 1）---
  fm_open "$file"    || err "缺 frontmatter（首行须为 ---）"
  fm_closed "$file"  || err "frontmatter 未闭合（缺第二个 ---）"
  id="$(fm_get "$file" id)"
  case "$id" in
    [0-9][0-9][0-9][0-9]) ;;
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]) ;;
    *) err "frontmatter id 必须是四位数字或 YYYYMMDD-4hex：${id:-（空）}" ;;
  esac
  local name_parse="" name_id="" name_prefix=""
  name_parse="$(artifact_name_id "$base" 2>/dev/null)" || name_parse=""
  if [ -z "$name_parse" ]; then
    err "文件名不符合产物命名（NNNN-slug.md 或 [父类型父ID-]YYYYMMDD-4hex-slug.md，slug 限 ASCII 小写/数字/短横线）：$base"
  else
    # shellcheck disable=SC2086
    set -- $name_parse
    if [ $# -eq 2 ]; then name_prefix="$1"; name_id="$2"; else name_id="$1"; fi
    [ "$name_id" = "$id" ] \
      || err "id 与文件名前缀不一致（文件名 ID 段 ${name_id}，frontmatter id ${id}）：$base"
  fi
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
        for residue in $(spec_residue "$id"); do
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
    overview)
      check_sections "$file" "全景一行|全景矩阵|黄金场景走查|样张|差距清单"
      spec_id="$(fm_get "$file" spec)"
      if [ -n "$spec_id" ]; then
        artifact_file spec "$spec_id" >/dev/null 2>&1 || err "关联 spec $spec_id 不存在"
      else
        err "缺 frontmatter 字段 spec"
      fi
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
  phase                 全库状态总览（九类产物 + frontier）
  frontier              列出阻塞已清、可开工的工单
  claim <type> <slug> [父类型 父ID]
                        原子取号：生成 YYYYMMDD-4hex 候选号、排他创建占位、撞号重掷，
                        返回产物文件名（父为知识档自动带谱系前缀）
  ticket NNNN           dev-implement 入口校验（ready/重入、阻塞已清、spec approved、多票 spec 须 reviewed 总览）
  all                   全量 lint/typecheck/test（按 .sdlc/config.sh，经 RUN_PREFIX 包裹）
  validate <file>       产物模板完整性与追溯校验（必填节/frontmatter/FR 追溯/依赖环/done 残留扫描）
  commit-msg <msgfile>  轻门禁：[#NNNN] / [#YYYYMMDD-4hex] 且工单 in-progress/implemented，或 [trivial]；Merge/Revert 信息头机械放行
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
    claim)      cmd_claim "$@" ;;
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
