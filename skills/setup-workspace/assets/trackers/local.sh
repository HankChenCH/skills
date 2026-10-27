#!/usr/bin/env bash
# local tracker 适配器：docs/ 即真相源，本地流程无外发动作。
# 由 setup-workspace 安装；check.sh publish 按 config.sh 的 TRACKER 调用本文件。
set -u

cmd="${1:-}"
file="${2:-}"

case "$cmd" in
  publish)
    [ -f "$file" ] || { echo "local: 找不到产物文件 $file" >&2; exit 1; }
    echo "local: $(basename "$file") 已在盘上（docs/ 是真相源，无需外发）"
    ;;
  *)
    echo "local: 未知子命令 ${cmd}（支持 publish <file>）" >&2
    exit 1
    ;;
esac
