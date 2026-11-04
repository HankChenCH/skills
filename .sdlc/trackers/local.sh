#!/usr/bin/env bash
# local tracker 适配器：docs/ 即真相源，本地流程无外发动作。
# 由 setup-workspace 安装；check.sh publish 按 config.sh 的 TRACKER 调用本文件。
set -u

cmd="${1:-}"
file="${2:-}"

case "$cmd" in
  publish)
    [ -f "$file" ] || { echo "local: 找不到产物文件 $file" >&2; exit 1; }
    # 文件名校验（spec 0017 决策 7）：与其他适配器同判——旧四位或新时间戳 ID（可带谱系
    # 前缀）才认产物；畸形名是调用错误 exit 1，不因 TRACKER=local 而放宽
    base="$(basename "$file")"
    printf '%s\n' "$base" | grep -qE '^((need|spec|design|adr|research)([0-9]{4}|[0-9]{8}-[0-9a-f]{4})-[0-9]{8}-[0-9a-f]{4}|[0-9]{8}-[0-9a-f]{4}|[0-9]{4})-[a-z0-9]+(-[a-z0-9]+)*\.md$' \
      || { echo "local: 文件名不符合产物命名（NNNN-slug.md 或 [父类型父ID-]YYYYMMDD-4hex-slug.md）：$base" >&2; exit 1; }
    echo "local: $(basename "$file") 已在盘上（docs/ 是真相源，无需外发）"
    ;;
  *)
    echo "local: 未知子命令 ${cmd}（支持 publish <file>）" >&2
    exit 1
    ;;
esac
