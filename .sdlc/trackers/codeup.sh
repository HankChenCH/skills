#!/usr/bin/env bash
# codeup tracker 适配器：publish 的 REST 投影路径。会话检测到 Codeup MCP 工具时按
# METHOD §7.1 投影约定走 MCP 路径（零 REST 配置），本适配器是无 MCP 时的兜底，两路径同口径。
# 投影受理面（spec 20261119-20b1）：
#   need → 新建需求单（category=Req，标题 = 产物一级标题）；
#   带 need 谱系前缀（need<父ID>-）的 spec/design/adr/research → 对应需求单下追加 MARKDOWN 评论；
#   票与过程档（tickets/reviews/acceptance/overviews）、无 need 谱系的独立知识档 → 不投。
# 终态关闭：产物 frontmatter status ∈ GLOSSARY 终态集合时同步置状态——
#   done/fulfilled/passed/accepted/superseded/approved/reviewed/reconstructed → 已完成（内置 100014）；
#   rejected → 已取消（141230）。REST 直接用内置状态 ID，不做运行时工作流查询（端点未核验）。
# 坐标与凭据（可放 config.sh 或环境变量，环境优先）：
#   TRACKER_REPO=<organizationId>/<spaceIdentifier>  适配器路径必配坐标（bash 无法调 MCP，
#                                                    空间按仓库名自动匹配只在 MCP 路径成立）
#   CODEUP_TOKEN            云效个人访问令牌（pt- 前缀，请求头 x-yunxiao-token）
#   CODEUP_ASSIGNEE         负责人阿里云 accountID（CreateWorkitemV2 必填）
#   CODEUP_WORKITEM_TYPE    项目下需求类（Req）工作项类型标识（经 MCP get_work_item_types
#                           查询或 Projex 界面一次查得；类型列表端点未核验，不做运行时探测）
#   CODEUP_ENDPOINT         可选，默认中心版 https://devops.cn-hangzhou.aliyuncs.com
# 端点 CreateWorkitemV2（POST /organization/{org}/workitem）与 CreateWorkitemComment
# （POST /organization/{org}/workitems/comment）于 2026-10-27、UpdateWorkitem
# （PUT /organization/{org}/workitem/{id}，body {"status":"<状态ID>"}）于 2026-11-19 对照官方文档核验。
# 契约：调用错误（未知子命令/缺文件）exit 1；一切投影/关闭失败明确警告并 exit 0，不阻断技能出口链；
# 已关闭工作项重复终态关闭的非零按失败留痕，幂等无害。幂等靠映射文件三字段（盘上相对路径 /
# 工作项标识 / 对象 URL），知识档行第二列记其承载 need 的工作项标识（评论形态）；
# 同产物重复投影一律追加评论不新建。
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
# 文件名校验（spec 0017 决策 7）：投影只收产物名——旧四位或新时间戳 ID（可带谱系前缀），
# 畸形名是调用错误 exit 1，不进投影与映射
base="$(basename "$file")"
printf '%s\n' "$base" | grep -qE '^((need|spec|design|adr|research)([0-9]{4}|[0-9]{8}-[0-9a-f]{4})-[0-9]{8}-[0-9a-f]{4}|[0-9]{8}-[0-9a-f]{4}|[0-9]{4})-[a-z0-9]+(-[a-z0-9]+)*\.md$' \
  || { echo "codeup: 文件名不符合产物命名（NNNN-slug.md 或 [父类型父ID-]YYYYMMDD-4hex-slug.md）：$base" >&2; exit 1; }

rel="${file#"$REPO_ROOT"/}"

# ── 受理面判定（METHOD §7.1，按 docs/ 产物目录定类型，与环境配置无关先判定） ──
case "$rel" in
  docs/needs/*) kind="need" ;;
  docs/specs/*|docs/designs/*|docs/adr/*|docs/research/*) kind="knowledge" ;;
  docs/tickets/*|docs/reviews/*|docs/acceptance/*|docs/overviews/*)
    warn_skip "过程档不入云效（票/review/acceptance/overview 为过程产物）" ;;
  *) warn_skip "产物不在 docs/ 产物目录，无法判定类型" ;;
esac

# need 谱系前缀解析（need<父ID>-<本产物ID>- 形态，spec 0017 谱系命名）：父ID 为旧四位或新时间戳 ID
need_id=""
need_prefix="$(printf '%s\n' "$base" | grep -oE '^need([0-9]{4}|[0-9]{8}-[0-9a-f]{4})-[0-9]{8}-[0-9a-f]{4}-' || true)"
if [ -n "$need_prefix" ]; then
  need_id="${need_prefix#need}"
  need_id="${need_id%-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-}"
fi
if [ "$kind" = "knowledge" ] && [ -z "$need_id" ]; then
  warn_skip "无 need 谱系（文件名无 need<父ID>- 前缀，独立知识档不入云效）"
fi

[ -n "$TRACKER_REPO" ] || warn_skip "TRACKER_REPO 未配置（config.sh，格式 organizationId/spaceIdentifier；bash 无法调 MCP，空间自动匹配只在 MCP 路径成立）"
case "$TRACKER_REPO" in
  */*/*) warn_skip "TRACKER_REPO 应为 organizationId/spaceIdentifier（至多一个 /）：$TRACKER_REPO" ;;
  */*)   org="${TRACKER_REPO%%/*}"; space="${TRACKER_REPO#*/}" ;;
  *)     org=""; space="" ;;
esac
[ -n "$org" ] && [ -n "$space" ] || warn_skip "TRACKER_REPO 应为 organizationId/spaceIdentifier：$TRACKER_REPO"
[ -n "$CODEUP_TOKEN" ] || warn_skip "CODEUP_TOKEN 未配置（云效个人访问令牌，pt- 前缀）"
[ -n "$CODEUP_ASSIGNEE" ] || warn_skip "CODEUP_ASSIGNEE 未配置（负责人阿里云 accountID，CreateWorkitemV2 必填）"
[ -n "$CODEUP_WORKITEM_TYPE" ] || warn_skip "CODEUP_WORKITEM_TYPE 未配置（需求类 Req 工作项类型标识，经 MCP get_work_item_types 查询或 Projex 界面查得）"
command -v curl >/dev/null 2>&1 || warn_skip "curl 未安装"

# json_escape：stdin → stdout，产出 JSON 字符串体（无外层引号）：转义 \ " 换行 制表 回车
json_escape() {
  # RS="\001"（输入中不存在的字节）让 awk 把整个输入读成一条记录，gsub 才能跨行替换换行符
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

# close_workitem <wid> <status>：终态关闭（METHOD §7.1 终态映射，REST 直接用内置状态 ID）。
# 失败（含已关闭再关的非零）按失败留痕 stderr、不改退出码——投影已完成，关闭留待下次。
close_workitem() {
  local wid="$1" st="$2" target note resp code
  case "$st" in
    done|fulfilled|passed|accepted|superseded|approved|reviewed|reconstructed)
      target="100014" note="已完成" ;;
    rejected)
      target="141230" note="已取消" ;;
    *) return 0 ;;
  esac
  resp="$(curl -sS -X PUT "$CODEUP_ENDPOINT/organization/$org/workitem/$wid" \
    -H "x-yunxiao-token: $CODEUP_TOKEN" -H "Content-Type: application/json" \
    --data "{\"status\":\"$target\"}" -w '\n%{http_code}' 2>/dev/null)" || {
    echo "codeup: 工作项 ${wid} 终态关闭失败（curl 非零，可能已关闭）——投影已完成，关闭留待下次" >&2
    return 0
  }
  code="${resp##*$'\n'}"
  if [ "$code" = "200" ]; then
    echo "codeup: 工作项 ${wid} 随产物终态 ${st} 置${note}"
  else
    echo "codeup: 工作项 ${wid} 终态关闭失败（HTTP ${code:-无}，可能已关闭）——投影已完成，关闭留待下次" >&2
  fi
}

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
status="$(grep -m1 '^status:' "$file" | awk '{print $2}')"

if [ "$kind" = "knowledge" ]; then
  # 评论形态：挂到承载 need 的需求单下；本产物行第二列记 need 工作项标识（spec 实现决策 4）
  if [ -n "$existing" ]; then
    wid="${existing%%$'\t'*}"
  else
    wid="$(awk -F'\t' -v id="$need_id" '
      $1 ~ /^docs\/needs\// {
        key = substr($1, length("docs/needs/") + 1)
        sub(/^need/, "", key)
        if (index(key, id "-") == 1) { print $2; exit }
      }' "$MAP" 2>/dev/null)"
    [ -n "$wid" ] || warn_skip "映射文件无其 need（need${need_id}-）记录，先投影对应 need 再发布本产物"
  fi
  call_api "$CODEUP_ENDPOINT/organization/$org/workitems/comment" \
    "$(comment_of "$wid" "$content_json")" "（工作项 ${wid} 评论失败，映射未变）" >/dev/null
  if [ -n "$existing" ]; then
    echo "codeup: 已投影（追加评论）${rel} → 需求单 ${wid} 下评论"
  else
    printf '%s\t%s\t\n' "$rel" "$wid" >> "$MAP"
    echo "codeup: 已投影 ${rel} → 需求单 ${wid} 下评论（映射已记账）"
  fi
  exit 0
fi

# need 形态：建需求单或幂等追加评论；终态时关闭自己的工作项
if [ -n "$existing" ]; then
  wid="${existing%%$'\t'*}"
  call_api "$CODEUP_ENDPOINT/organization/$org/workitems/comment" \
    "$(comment_of "$wid" "$content_json")" "（工作项 ${wid} 评论失败，映射未变）" >/dev/null
  echo "codeup: 已投影（追加评论）${rel} → 需求单 ${wid}"
else
  create_payload="$(printf '{"subject":"%s","spaceIdentifier":"%s","category":"Req","workitemTypeIdentifier":"%s","assignedTo":"%s"}' \
    "$(printf '%s' "$title" | json_escape)" "$space" "$CODEUP_WORKITEM_TYPE" "$CODEUP_ASSIGNEE")"
  resp="$(call_api "$CODEUP_ENDPOINT/organization/$org/workitem" "$create_payload")"
  wid="$(printf '%s' "$resp" | grep -oE '"workitemIdentifier"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:[[:space:]]*"//; s/"$//')"
  [ -n "$wid" ] || warn_skip "响应中未找到 workitemIdentifier：${resp:-（空响应）}"
  call_api "$CODEUP_ENDPOINT/organization/$org/workitems/comment" \
    "$(comment_of "$wid" "$content_json")" \
    "（工作项 ${wid} 可能已创建但评论失败、映射未记录，重发会重复创建——请先人工核对 Projex）" >/dev/null
  printf '%s\t%s\t\n' "$rel" "$wid" >> "$MAP"
  echo "codeup: 已投影 ${rel} → 需求单 ${wid}"
fi
close_workitem "$wid" "$status"
