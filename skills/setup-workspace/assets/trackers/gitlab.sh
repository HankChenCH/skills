#!/usr/bin/env bash
# gitlab tracker 适配器：把 docs/ 产物投影为 TRACKER_REPO（group/project）下的 issue。
# 盘上是真相源：投影正文首行带盘上产物指针，映射文件记录"盘上路径 ↔ issue"支撑幂等更新。
# 由 setup-workspace 安装；check.sh publish 按 config.sh 的 TRACKER 调用本文件。
# 契约：调用错误（未知子命令/缺文件）exit 1；一切投影失败（配置缺失/glab 缺失/未认证/API 失败）
# 明确警告并 exit 0——不阻断技能出口链。
set -u

SDL_DIR="$(cd "$(dirname "$0")" && pwd -P)"    # <repo>/.sdlc/trackers
SDL_ROOT="$(cd "$SDL_DIR/.." && pwd -P)"       # <repo>/.sdlc（config.sh 所在）
REPO_ROOT="$(cd "$SDL_DIR/../.." && pwd -P)"   # <repo>（产物相对路径键的基准）
[ -f "$SDL_ROOT/config.sh" ] && . "$SDL_ROOT/config.sh"
: "${TRACKER_REPO:=}"

MAP="$SDL_DIR/gitlab.map"
DESC_MAX=60000   # 低于 GitLab issue 正文上限，留出指针行余量

cmd="${1:-}"
file="${2:-}"

warn_skip() { echo "gitlab: $*，投影跳过（产物已在盘上，docs/ 是真相源）" >&2; exit 0; }

[ "$cmd" = "publish" ] || { echo "gitlab: 未知子命令 ${cmd:-（空）}（支持 publish <file>）" >&2; exit 1; }
[ -f "$file" ] || { echo "gitlab: 找不到产物文件 ${file:-（空）}" >&2; exit 1; }
[ -n "$TRACKER_REPO" ] || warn_skip "TRACKER_REPO 未配置（config.sh，格式 group/project）"
command -v glab >/dev/null 2>&1 || warn_skip "glab 未安装（见 gitlab.com/cli 或 brew install glab）"
glab auth status >/dev/null 2>&1 || warn_skip "glab 未认证（glab auth status 失败，先 glab auth login）"

rel="${file#"$REPO_ROOT"/}"
title="$(grep -m1 '^# ' "$file" | sed 's/^#[[:space:]]*//')"
[ -n "$title" ] || title="$(basename "$file")"

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT
{
  printf '> 盘上产物：%s（盘上是真相源，本条为单向投影，请勿在此定稿）\n\n' "$rel"
  if [ "$(wc -c < "$file")" -gt "$DESC_MAX" ]; then
    head -c "$DESC_MAX" "$file"
    printf '\n\n> 内容超限已截断，全文见盘上文件。'
  else
    cat "$file"
  fi
} > "$body_file"
desc="$(cat "$body_file")"

existing="$(awk -F'\t' -v k="$rel" '$1 == k { print $2 "\t" $3; exit }' "$MAP" 2>/dev/null)"

if [ -n "$existing" ]; then
  num="${existing%%$'\t'*}"
  if ! glab issue update "$num" -R "$TRACKER_REPO" --title "$title" --description "$desc" >/dev/null 2>&1; then
    warn_skip "issue #${num} 更新失败（glab issue update 非零）"
  fi
  echo "gitlab: 已更新投影 ${rel} → issue #${num}"
else
  out="$(glab issue create -R "$TRACKER_REPO" --title "$title" --description "$desc" 2>/dev/null)" \
    || warn_skip "issue 创建失败（glab issue create 非零）"
  url="$(printf '%s\n' "$out" | grep -oE 'https?://[^[:space:]]*/issues/[0-9]+' | tail -n 1)"
  num="$(printf '%s\n' "${out:-}" | grep -oE '(issues/|#)[0-9]+' | grep -oE '[0-9]+' | tail -n 1)"
  [ -n "$num" ] || warn_skip "无法从 glab 输出解析 issue 编号：${out:-（空输出）}"
  printf '%s\t%s\t%s\n' "$rel" "$num" "${url:-}" >> "$MAP"
  echo "gitlab: 已投影 ${rel} → issue #${num}${url:+（${url}）}"
fi
