#!/usr/bin/env bash
# L4 平台层拦截 hook——PreToolUse 判定脚本（由 setup-workspace 安装，重跑可整体覆盖）。
# 契约见蓝图 §3 L4 / §14 与 spec 0005：stdin 收平台载荷（snake_case JSON，取
# tool_name 与 tool_input 的 command/file_path 字段）。
#   规则 A：Bash 命令含 --no-verify（或 git commit 段内独立 -n 短形式）→ deny；
#   规则 B：Edit/Write 目标落在 CODE_DIRS 下且 docs/tickets/ 无 in-progress 工单 → deny。
# 放行 = 无输出 exit 0；deny = stdout 单行 JSON（平台严格 schema，不添 extra key）
# + stderr 同步一行供日志。失效安全：一切自身异常（非 sdlc 工作区、stdin 非法、
# 字段缺失、配置留空）一律放行——门禁故障不锁死工作，L1/L3 兜底仍在。
# 依赖：bash 3.2+、sed、grep、awk、git；不依赖 check.sh（热路径自包含）。
set -u

deny() {
  printf '{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}\n' "$1"
  echo "L4 deny: $1" >&2
  exit 0
}

# json_str JSON KEY：提取 KEY 对应的字符串值（值内含转义引号时截断到首个引号——
# 本脚本只做子串与路径前缀判定，截断不产生漏判所需的假阳性）
json_str() {
  printf '%s' "$1" | sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p"
}

# fm_status FILE：打印产物 frontmatter 的 status 标量（解析惯用法同 check.sh）
fm_status() {
  awk '
    NR==1 && $0=="---" { infm=1; next }
    infm && $0=="---" { exit }
    infm && index($0, "status:")==1 {
      v=substr($0, 8)
      gsub(/^[ \t]+/, "", v); gsub(/[ \t]+$/, "", v)
      print v; exit
    }
  ' "$1"
}

# any_inprogress：docs/tickets/ 存在 status: in-progress 的工单时返回 0
any_inprogress() {
  local f
  for f in "$ROOT"/docs/tickets/*.md; do
    [ -f "$f" ] || return 1
    [ "$(fm_status "$f")" = "in-progress" ] && return 0
  done
  return 1
}

# norm_path RAW：把 file_path 归一为仓库锚定的绝对路径（相对路径锚定仓库根；
# 目录存在则取物理路径，失败保持词法路径——归一不出结果按仓库外处理，放行）
norm_path() {
  local p="$1" d b
  case "$p" in
    /*) ;;
    *) p="$ROOT/$p" ;;
  esac
  d="$(dirname "$p")"; b="$(basename "$p")"
  if [ -d "$d" ]; then
    d="$(cd "$d" 2>/dev/null && pwd -P)" || d="$(dirname "$p")"
  fi
  printf '%s/%s\n' "$d" "$b"
}

input="$(cat 2>/dev/null)" || exit 0
[ -n "$input" ] || exit 0
tool_name="$(json_str "$input" tool_name)"
[ -n "$tool_name" ] || exit 0
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
ROOT="$(cd "$ROOT" 2>/dev/null && pwd -P)" || exit 0
[ -f "$ROOT/.sdlc/config.sh" ] || exit 0

# ---- 规则 A：--no-verify 后门（长形式全量覆盖；-n 短形式限 git commit 段内独立 token）----
if [ "$tool_name" = "Bash" ]; then
  cmd="$(json_str "$input" command)"
  case "$cmd" in
    *--no-verify*)
      deny "该命令含 --no-verify，会绕过 commit-msg 门禁（[#NNNN] 工单状态与 [trivial] 豁免校验）。请正常提交：功能/修复提交首行带 [#NNNN]，小修带 [trivial]（留痕待 dev-retro 审计）。"
      ;;
  esac
  if printf '%s\n' "$cmd" | grep -Eq 'git[[:space:]]+commit[^;|&]*[[:space:]]-n([[:space:]]|$)'; then
    deny "该命令的 git commit -n 是 --no-verify 短形式，同样绕过 commit-msg 门禁。请去掉 -n 正常提交（[#NNNN] 或 [trivial]）。"
  fi
  exit 0
fi

# ---- 规则 B：无在办工单的源码编辑 ----
case "$tool_name" in
  Edit|Write) ;;
  *) exit 0 ;;
esac
fp="$(json_str "$input" file_path)"
[ -n "$fp" ] || exit 0
# shellcheck disable=SC1091
. "$ROOT/.sdlc/config.sh"
: "${CODE_DIRS:=}"
[ -n "$CODE_DIRS" ] || exit 0
p="$(norm_path "$fp")"
hit=""
for d in $CODE_DIRS; do
  case "$d" in
    /*) t="$d" ;;
    *) t="$ROOT/$d" ;;
  esac
  if [ -d "$t" ]; then t="$(cd "$t" 2>/dev/null && pwd -P)" || t="$ROOT/$d"; fi
  case "$p" in
    "$t"/*) hit=1; break ;;
  esac
done
[ -n "$hit" ] || exit 0
if any_inprogress; then exit 0; fi
rel="${p#"$ROOT"/}"
deny "检测到对源码（${rel}）的编辑，但当前没有 in-progress 工单。请先运行 /dev-implement 开工对应工单（入口校验通过后状态置 in-progress）再改源码；纯文档改动不受此限，CODE_DIRS 配置见 .sdlc/config.sh。"
