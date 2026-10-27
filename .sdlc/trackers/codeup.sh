#!/usr/bin/env bash
# codeup tracker 适配器：把 docs/ 产物投影为云效 Projex 工作项（Task 类），正文以 MARKDOWN 评论承载。
# 坐标与凭据（可放 config.sh 或环境变量，环境优先）：
#   TRACKER_REPO=<organizationId>/<spaceIdentifier>
#   CODEUP_TOKEN            云效个人访问令牌（pt- 前缀，请求头 x-yunxiao-token）
#   CODEUP_ASSIGNEE         负责人阿里云 accountID（CreateWorkitem 必填）
#   CODEUP_WORKITEM_TYPE    项目下 Task 类工作项类型标识（OpenAPI Explorer 查得后一次性填入；
#                           类型列表端点未核验，故不做运行时探测）
#   CODEUP_ENDPOINT         可选，默认中心版 https://devops.cn-hangzhou.aliyuncs.com
# 端点 CreateWorkitemV2（POST /organization/{org}/workitem）与 CreateWorkitemComment
# （POST /organization/{org}/workitems/comment）于 2026-10-27 对照官方文档核验。
# 契约：调用错误（未知子命令/缺文件）exit 1；一切投影失败明确警告并 exit 0，不阻断技能出口链。
# 更新语义：映射已存在时仅追加评论（追加式投影，不调工作项更新接口）。
set -u

SDL_DIR="$(cd "$(dirname "$0")" && pwd -P)"    # <repo>/.sdlc/trackers
SDL_ROOT="$(cd "$SDL_DIR/.." && pwd -P)"       # <repo>/.sdlc（config.sh 所在）
REPO_ROOT="$(cd "$SDL_DIR/../.." && pwd -P)"   # <repo>（产物相对路径键的基准）
[ -f "$SDL_ROOT/config.sh" ] && . "$SDL_ROOT/config.sh"
: "${TRACKER_REPO:=}"
: "${CODEUP_ENDPOINT:=https://devops.cn-hangzhou.aliyuncs.com}"
: "${CODEUP_TOKEN:=}" "${CODEUP_ASSIGNEE:=}" "${CODEUP_WORKITEM_TYPE:=}"

MAP="$SDL_DIR/codeup.map"
DESC_MAX=60000   # 评论正文字节上限（官方建议描述区 <1M，此处取保守值）

cmd="${1:-}"
file="${2:-}"

warn_skip() { echo "codeup: $*，投影跳过（产物已在盘上，docs/ 是真相源）" >&2; exit 0; }

[ "$cmd" = "publish" ] || { echo "codeup: 未知子命令 ${cmd:-（空）}（支持 publish <file>）" >&2; exit 1; }
[ -f "$file" ] || { echo "codeup: 找不到产物文件 ${file:-（空）}" >&2; exit 1; }
[ -n "$TRACKER_REPO" ] || warn_skip "TRACKER_REPO 未配置（config.sh，格式 organizationId/spaceIdentifier）"
case "$TRACKER_REPO" in
  */*/*) warn_skip "TRACKER_REPO 应为 organizationId/spaceIdentifier（至多一个 /）：$TRACKER_REPO" ;;
  */*)   org="${TRACKER_REPO%%/*}"; space="${TRACKER_REPO#*/}" ;;
  *)     org=""; space="" ;;
esac
[ -n "$org" ] && [ -n "$space" ] || warn_skip "TRACKER_REPO 应为 organizationId/spaceIdentifier：$TRACKER_REPO"
[ -n "$CODEUP_TOKEN" ] || warn_skip "CODEUP_TOKEN 未配置（云效个人访问令牌，pt- 前缀）"
[ -n "$CODEUP_ASSIGNEE" ] || warn_skip "CODEUP_ASSIGNEE 未配置（负责人阿里云 accountID，CreateWorkitem 必填）"
[ -n "$CODEUP_WORKITEM_TYPE" ] || warn_skip "CODEUP_WORKITEM_TYPE 未配置（Task 类工作项类型标识，OpenAPI Explorer 查得）"
command -v curl >/dev/null 2>&1 || warn_skip "curl 未安装"

# json_escape：stdin → stdout，产出 JSON 字符串体（无外层引号）：转义 \ " 换行 制表 回车
json_escape() {
  awk 'BEGIN { RS = "\001" }
    { gsub(/\\/, "\\\\"); gsub(/"/, "\\\""); gsub(/\t/, "\\t"); gsub(/\r/, "\\r"); gsub(/\n/, "\\n"); printf "%s", $0 }'
}

# call_api <url> <json> [失败提示附注]：POST 并校验 HTTP 200，成功输出响应体
call_api() {
  local resp code body
  resp="$(curl -sS -X POST "$1" \
    -H "x-yunxiao-token: $CODEUP_TOKEN" -H "Content-Type: application/json" \
    --data "$2" -w '\n%{http_code}' 2>/dev/null)" || warn_skip "curl 调用失败：$1 ${3:-}"
  code="${resp##*$'\n'}"
  body="${resp%$'\n'*}"
  [ "$code" = "200" ] || warn_skip "API 非 200（HTTP ${code:-无}）：${body:-（空响应）} ${3:-}"
  printf '%s' "$body"
}

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
content_json="$(json_escape < "$body_file")"

comment_of() {  # <workitemIdentifier> <contentJson> → 评论请求体
  printf '{"content":"%s","workitemIdentifier":"%s","formatType":"MARKDOWN"}' "$2" "$1"
}

existing="$(awk -F'\t' -v k="$rel" '$1 == k { print $2 "\t" $3; exit }' "$MAP" 2>/dev/null)"

if [ -n "$existing" ]; then
  wid="${existing%%$'\t'*}"
  call_api "$CODEUP_ENDPOINT/organization/$org/workitems/comment" \
    "$(comment_of "$wid" "$content_json")" "（工作项 ${wid} 评论失败，映射未变）" >/dev/null
  echo "codeup: 已投影（追加评论）${rel} → 工作项 ${wid}"
else
  create_payload="$(printf '{"subject":"%s","spaceIdentifier":"%s","category":"Task","workitemTypeIdentifier":"%s","assignedTo":"%s"}' \
    "$(printf '%s' "$title" | json_escape)" "$space" "$CODEUP_WORKITEM_TYPE" "$CODEUP_ASSIGNEE")"
  resp="$(call_api "$CODEUP_ENDPOINT/organization/$org/workitem" "$create_payload")"
  wid="$(printf '%s' "$resp" | grep -oE '"workitemIdentifier"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:[[:space:]]*"//; s/"$//')"
  [ -n "$wid" ] || warn_skip "响应中未找到 workitemIdentifier：${resp:-（空响应）}"
  call_api "$CODEUP_ENDPOINT/organization/$org/workitems/comment" \
    "$(comment_of "$wid" "$content_json")" \
    "（工作项 ${wid} 可能已创建但评论失败、映射未记录，重发会重复创建——请先人工核对 Projex）" >/dev/null
  printf '%s\t%s\t\n' "$rel" "$wid" >> "$MAP"
  echo "codeup: 已投影 ${rel} → 工作项 ${wid}"
fi
