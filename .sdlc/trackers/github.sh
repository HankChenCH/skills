#!/usr/bin/env bash
# github tracker 适配器：把 docs/ 产物投影为 TRACKER_REPO（owner/repo）下的 issue。
# 盘上是真相源：投影正文首行带盘上产物指针，映射文件记录"盘上路径 ↔ issue"支撑幂等更新。
# 由 setup-workspace 安装；check.sh publish 按 config.sh 的 TRACKER 调用本文件。
# 契约：调用错误（未知子命令/缺文件）exit 1；一切投影失败（配置缺失/gh 缺失/未认证/API 失败）
# 明确警告并 exit 0——不阻断技能出口链。
set -u

SDL_DIR="$(cd "$(dirname "$0")" && pwd -P)"    # <repo>/.sdlc/trackers
SDL_ROOT="$(cd "$SDL_DIR/.." && pwd -P)"       # <repo>/.sdlc（config.sh 所在）
REPO_ROOT="$(cd "$SDL_DIR/../.." && pwd -P)"   # <repo>（产物相对路径键的基准）
[ -f "$SDL_ROOT/config.sh" ] && . "$SDL_ROOT/config.sh"
: "${TRACKER_REPO:=}"

MAP="$SDL_DIR/github.map"
BODY_MAX=60000   # 低于 GitHub issue 正文 65536 字节上限，留出指针行余量

cmd="${1:-}"
file="${2:-}"

warn_skip() { echo "github: $*，投影跳过（产物已在盘上，docs/ 是真相源）" >&2; exit 0; }

[ "$cmd" = "publish" ] || { echo "github: 未知子命令 ${cmd:-（空）}（支持 publish <file>）" >&2; exit 1; }
[ -f "$file" ] || { echo "github: 找不到产物文件 ${file:-（空）}" >&2; exit 1; }
[ -n "$TRACKER_REPO" ] || warn_skip "TRACKER_REPO 未配置（config.sh，格式 owner/repo）"
command -v gh >/dev/null 2>&1 || warn_skip "gh 未安装（brew install gh 或见 cli.github.com）"
gh auth status >/dev/null 2>&1 || warn_skip "gh 未认证（gh auth status 失败，先 gh auth login）"

rel="${file#"$REPO_ROOT"/}"
title="$(grep -m1 '^# ' "$file" | sed 's/^#[[:space:]]*//')"
[ -n "$title" ] || title="$(basename "$file")"

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT
{
  printf '> 盘上产物：%s（盘上是真相源，本条为单向投影，请勿在此定稿）\n\n' "$rel"
  if [ "$(wc -c < "$file")" -gt "$BODY_MAX" ]; then
    head -c "$BODY_MAX" "$file"
    printf '\n\n> 内容超限已截断，全文见盘上文件。'
  else
    cat "$file"
  fi
} > "$body_file"

existing="$(awk -F'\t' -v k="$rel" '$1 == k { print $2 "\t" $3; exit }' "$MAP" 2>/dev/null)"

if [ -n "$existing" ]; then
  num="${existing%%$'\t'*}"
  if ! gh issue edit "$num" -R "$TRACKER_REPO" --title "$title" --body-file "$body_file" >/dev/null 2>&1; then
    warn_skip "issue #${num} 更新失败（gh issue edit 非零）"
  fi
  echo "github: 已更新投影 ${rel} → issue #${num}"
else
  url="$(gh issue create -R "$TRACKER_REPO" --title "$title" --body-file "$body_file" 2>/dev/null)" \
    || warn_skip "issue 创建失败（gh issue create 非零）"
  num="${url##*/}"
  case "$num" in
    ''|*[!0-9]*) warn_skip "无法从 gh 输出解析 issue 编号：${url:-（空输出）}" ;;
  esac
  printf '%s\t%s\t%s\n' "$rel" "$num" "$url" >> "$MAP"
  echo "github: 已投影 ${rel} → issue #${num}（${url}）"
fi
