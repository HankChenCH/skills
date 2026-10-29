#!/usr/bin/env bash
# setup-workspace 门禁脚本测试套件：在临时仓库断言 assets/check.sh 各子命令行为，
# 并对 dev-accept 蒸馏清扫出口做 SKILL.md 文本契约与 git 端到端断言。
# 用法：tests/run-tests.sh；全部通过输出 "ALL PASSED"，否则列出失败项并以非零退出。
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
CHECK="$HERE/../assets/check.sh"
LOCAL="$HERE/../assets/trackers/local.sh"

PASS=0
FAIL=0
TMP=""

cleanup() { [ -n "$TMP" ] && rm -rf "$TMP"; }
trap cleanup EXIT

# t 描述 期望退出码 命令 [断言输出包含的子串]（在仓库内执行）
t() {
  local desc="$1" want="$2" cmd="$3" substr="${4:-}" out rc
  out="$(cd "$TMP" && export PATH="$TMP/.sdlc:$PATH" && eval "$cmd" 2>&1)"
  rc=$?
  if [ "$rc" != "$want" ]; then
    echo "FAIL: $desc —— 退出码 ${rc}，期望 $want"
    printf '%s\n' "$out" | sed 's/^/    | /'
    FAIL=$((FAIL+1)); return 1
  fi
  if [ -n "$substr" ]; then
    case "$out" in
      *"$substr"*) ;;
      *)
        echo "FAIL: $desc —— 输出不含「${substr}」"
        printf '%s\n' "$out" | sed 's/^/    | /'
        FAIL=$((FAIL+1)); return 1
        ;;
    esac
  fi
  echo "ok: $desc"; PASS=$((PASS+1))
}

# tn 描述 期望退出码 命令 断言输出不包含
tn() {
  local desc="$1" want="$2" cmd="$3" absent="$4" out rc
  out="$(cd "$TMP" && export PATH="$TMP/.sdlc:$PATH" && eval "$cmd" 2>&1)"
  rc=$?
  if [ "$rc" != "$want" ]; then
    echo "FAIL: $desc —— 退出码 ${rc}，期望 $want"
    printf '%s\n' "$out" | sed 's/^/    | /'
    FAIL=$((FAIL+1)); return 1
  fi
  case "$out" in
    *"$absent"*)
      echo "FAIL: $desc —— 输出不应包含「${absent}」"
      printf '%s\n' "$out" | sed 's/^/    | /'
      FAIL=$((FAIL+1)); return 1
      ;;
  esac
  echo "ok: $desc"; PASS=$((PASS+1))
}

# wfile 相对路径（内容从 stdin）：向 fixture 仓库写文件
wfile() {
  mkdir -p "$TMP/$(dirname "$1")"
  cat > "$TMP/$1"
}

# setfm 相对路径 键 值：改 frontmatter 标量字段
setfm() {
  sed -i.bak "s/^$2: .*/$2: $3/" "$TMP/$1" && rm -f "$TMP/$1.bak"
}

# fakebin 建替身命令（从 stdin 读内容并加可执行位）；用例内以 PATH="$TMP/fakebin:$PATH" 前置
fake_cmd() {
  mkdir -p "$TMP/fakebin"
  cat > "$TMP/fakebin/$1"
  chmod +x "$TMP/fakebin/$1"
}

# oseq 描述 文件 词...：断言各词按给定顺序先后出现（自前一词之后的滑动窗口做字面匹配，
# 不受换行影响）；任一词缺失或乱序即失败。展开一律用 ${var} 形式——bash 3.2 的 $var
# 紧跟多字节字符时会被误切词，报 unbound variable
oseq() {
  local desc="$1" f="$2" kw txt rest head base pos prev
  shift 2
  txt="$(cat "$f"; printf X)"; txt="${txt%X}"
  base=0; prev=0; rest="$txt"
  for kw in "$@"; do
    head="${rest%%"${kw}"*}"
    if [ "${#head}" = "${#rest}" ]; then
      echo "FAIL: ${desc} —— 自偏移 ${base} 起未找到「${kw}」"
      FAIL=$((FAIL+1)); return 1
    fi
    pos=$(( base + ${#head} + 1 ))
    if [ "${pos}" -le "${prev}" ]; then
      echo "FAIL: ${desc} —— 「${kw}」偏移 ${pos} 未严格递增（前词 ${prev}）"
      FAIL=$((FAIL+1)); return 1
    fi
    prev=${pos}
    base=$(( base + ${#head} + ${#kw} ))
    rest="${rest#*"${kw}"}"
  done
  echo "ok: ${desc}"; PASS=$((PASS+1))
}

new_repo() {
  TMP="$(mktemp -d)"
  git -C "$TMP" init -q -b main
  git -C "$TMP" config user.email test@example.com
  git -C "$TMP" config user.name tester
  mkdir -p "$TMP/.sdlc/trackers"
  cp "$CHECK" "$TMP/.sdlc/check.sh"
  cp "$LOCAL" "$TMP/.sdlc/trackers/local.sh"
  chmod +x "$TMP/.sdlc/check.sh" "$TMP/.sdlc/trackers/local.sh"
  cat > "$TMP/.sdlc/config.sh" <<'EOF'
TRACKER=local
TRACKER_REPO=""
BASE_REF=main
RUN_ENV=local
RUN_PREFIX=""
PKG_MGR=""
CODE_DIRS=""
CHECK_LINT=""
CHECK_TYPE=""
CHECK_TEST=""
EOF
  echo fixture > "$TMP/README.md"
  git -C "$TMP" add README.md
  git -C "$TMP" commit -qm "[trivial] init"
}

echo "== 空库 =="
new_repo
t "phase 空库可用" 0 "check.sh phase" "（无）"
t "frontier 空库提示" 0 "check.sh frontier" "（空）"
t "validate 拒绝产物目录外文件" 1 "check.sh validate README.md" "无法识别产物类型"
t "未知子命令报错" 1 "check.sh bogus" "未知子命令"
t "help 可用" 0 "check.sh help" "pre-push"

echo "== 种入合法产物 =="
wfile docs/needs/0001-checkout.md <<'EOF'
---
id: 0001
status: confirmed
created: 2026-10-26
---
# 结账流程

## 背景与业务目标
提高结账转化。

## 干系人与用户
买家；成功标准：下单转化率不降。

## 系统能力需求
- FR-1 支持购物车结算
- FR-2 支持优惠码
- FR-10 支持电子发票

## 场景
- Given 购物车有商品 When 结算 Then 生成订单

## 假设与风险
- 假设：优惠码规则稳定（代价高 × 不确定中）

## 范围与非目标
不含退款。

## 开放问题
无
EOF
wfile docs/specs/0001-checkout.md <<'EOF'
---
id: 0001
status: approved
need: 0001
round: 1
created: 2026-10-26
---
# 结账规格

## 问题陈述
买家结算慢。

## 方案
一键结算 + 优惠码。

## 用户故事
- 作为买家，我想要一键结算，以便更快下单

## 实现决策
新增 checkout 模块；订单接口复用 orders。

## 测试决策
在 checkout 服务 API 边界测。

## 验收场景
- [FR-1 | 工单级] Given 有商品 When 结算 Then 订单生成
- [FR-2 | 工单级] Given 有效优惠码 When 应用 Then 金额减免
- [FR-10 | 集成级] Given 订单完成 When 开票 Then 发票到达邮箱

## 非目标
不退额度。

## 备注
EOF
wfile docs/tickets/0001-cart-checkout.md <<'EOF'
---
id: 0001
type: feature
spec: 0001
status: ready
blocked-by: [0003]
created: 2026-10-26
---
# 0001: 购物车结算

**做什么：** 从购物车一键生成订单

**验收标准：**
- [ ] 有商品时结算生成订单（测试：checkout_test）

**Blocked by：** 0003

## Progress
尚未开工
EOF
wfile docs/tickets/0002-coupon.md <<'EOF'
---
id: 0002
type: feature
spec: 0001
status: implemented
blocked-by: []
created: 2026-10-26
---
# 0002: 优惠码

**做什么：** 优惠码应用与金额减免

**验收标准：**
- [x] 有效优惠码应用后金额正确（测试：coupon_test.go 全绿）

**Blocked by：** 无

## Progress
实现完成，等评审。
EOF
wfile docs/tickets/0003-order-api.md <<'EOF'
---
id: 0003
type: feature
spec: 0001
status: ready
blocked-by: []
created: 2026-10-26
---
# 0003: 订单接口

**做什么：** 提供订单创建 API

**验收标准：**
- [ ] POST /orders 返回 201（测试：order_api_test）

**Blocked by：** 无

## Progress
尚未开工
EOF
wfile docs/reviews/0001-coupon-review.md <<'EOF'
---
id: 0001
status: draft
tickets: [0002]
branch: feat/coupon
created: 2026-10-26
---
# 0001: 优惠码评审

## 标准轴 findings
- 无

## Spec 轴 findings
- 无

## 范围外备注
- 无

## 汇总
标准轴阻断 0 / 建议 0；Spec 轴阻断 0 / 建议 0。结论：待审
EOF
wfile docs/acceptance/0001-checkout-round1.md <<'EOF'
---
id: 0001
status: draft
spec: 0001
round: 1
created: 2026-10-26
---
# 0001: 结账验收（round 1）

## 场景结果
- FR-10 集成级：未运行

## 假设验证
- 未验证

## 残余风险
- 无

## 下一轮建议
- 无
EOF
wfile docs/adr/0001-local-tracker.md <<'EOF'
---
id: 0001
status: accepted
created: 2026-10-26
---
# 0001: 使用本地 tracker

产物留在 docs/，不外发。
EOF
wfile docs/research/0001-gateway.md <<'EOF'
---
id: 0001
created: 2026-10-26
---
# 0001: 支付网关调研
结论：暂不接外部网关。
EOF

echo "== phase / frontier / validate（合法集）=="
t "phase 含 spec 状态与关联" 0 "check.sh phase" "0001-checkout approved need=0001 round=1"
t "frontier 只列阻塞已清者" 0 "check.sh frontier" "0003"
tn "frontier 不列被阻塞工单" 0 "check.sh frontier" "0001-cart"
t "validate need" 0 "check.sh validate docs/needs/0001-checkout.md" "通过"
t "validate spec（FR-1/2/10 追溯）" 0 "check.sh validate docs/specs/0001-checkout.md" "通过"
t "validate ticket" 0 "check.sh validate docs/tickets/0002-coupon.md" "通过"
t "validate review" 0 "check.sh validate docs/reviews/0001-coupon-review.md" "通过"
t "validate acceptance" 0 "check.sh validate docs/acceptance/0001-checkout-round1.md" "通过"
t "validate adr" 0 "check.sh validate docs/adr/0001-local-tracker.md" "通过"
t "validate research" 0 "check.sh validate docs/research/0001-gateway.md" "通过"

echo "== frontier 随状态推进 =="
setfm docs/tickets/0003-order-api.md status implemented
t "阻塞实现后 0001 进入 frontier" 0 "check.sh frontier" "0001"
tn "已实现的 0003 不再出现在 frontier" 0 "check.sh frontier" "0003-order"

echo "== ticket 入口校验 =="
t "ticket 就绪通过" 0 "check.sh ticket 0001" "就绪"
t "ticket 接受 slug 形态" 0 "check.sh ticket 0001-cart-checkout" "就绪"
t "ticket 重入（in-progress）放行" 0 "sed -i.bak 's/^status: ready/status: in-progress/' docs/tickets/0001-cart-checkout.md && rm -f docs/tickets/0001-cart-checkout.md.bak && check.sh ticket 0001" "重入"
setfm docs/tickets/0001-cart-checkout.md status ready
t "ticket implemented 拒绝并指路 review" 1 "check.sh ticket 0002" "dev-review"
t "ticket 不存在拒绝" 1 "check.sh ticket 9999" "不存在"
setfm docs/specs/0001-checkout.md status draft
t "spec 未批准时拒绝并指路 dev-spec" 1 "check.sh ticket 0001" "draft"
setfm docs/specs/0001-checkout.md status approved

echo "== 依赖环检测 =="
wfile docs/tickets/0004-extra.md <<'EOF'
---
id: 0004
type: feature
spec: 0001
status: implemented
blocked-by: [0001]
created: 2026-10-26
---
# 0004: 临时工单

**做什么：** 用于构造依赖环

**验收标准：**
- [ ] 构造出环（证据：本文件）

**Blocked by：** 0001

## Progress
测试夹具
EOF
setfm docs/tickets/0001-cart-checkout.md blocked-by "[0004]"
t "validate 发现依赖环" 1 "check.sh validate docs/tickets/0001-cart-checkout.md" "环"
t "ticket 拒绝环上工单" 1 "check.sh ticket 0001" "环"
setfm docs/tickets/0001-cart-checkout.md blocked-by "[0003]"
t "解环后 validate 恢复" 0 "check.sh validate docs/tickets/0001-cart-checkout.md" "通过"
setfm docs/tickets/0003-order-api.md blocked-by "[0003]"
t "自依赖也是环" 1 "check.sh validate docs/tickets/0003-order-api.md" "环"
setfm docs/tickets/0003-order-api.md blocked-by "[]"

echo "== validate（非法集）=="
wfile docs/needs/0003-incomplete.md <<'EOF'
---
id: 0003
status: draft
created: 2026-10-26
---
# 残缺需求

## 背景与业务目标
x

## 干系人与用户
x

## 系统能力需求
- FR-1 示例

## 场景
x

## 假设与风险
x

## 范围与非目标
x
EOF
t "need 缺必填节" 1 "check.sh validate docs/needs/0003-incomplete.md" "开放问题"
wfile docs/specs/0002-orphan.md <<'EOF'
---
id: 0002
status: draft
need: 0001
round: 1
created: 2026-10-26
---
# 孤儿场景规格

## 问题陈述
x

## 方案
x

## 用户故事
- 作为买家

## 实现决策
x

## 测试决策
x

## 验收场景
- [FR-1 | 工单级] Given x When x Then x

## 非目标
x

## 备注
x
EOF
t "孤儿 FR（FR-2/FR-10 未覆盖）" 1 "check.sh validate docs/specs/0002-orphan.md" "FR-2"
wfile docs/specs/0004-mismatch.md <<'EOF'
---
id: 0005
status: draft
created: 2026-10-26
---
# 编号错位

## 问题陈述
x

## 方案
x

## 用户故事
x

## 实现决策
x

## 测试决策
x

## 验收场景
x

## 非目标
x

## 备注
x
EOF
t "id 与文件名前缀不一致" 1 "check.sh validate docs/specs/0004-mismatch.md" "前缀不一致"
wfile docs/specs/0006-Bad_Slug.md <<'EOF'
---
id: 0006
status: draft
created: 2026-10-26
---
# 坏 slug

## 问题陈述
x

## 方案
x

## 用户故事
x

## 实现决策
x

## 测试决策
x

## 验收场景
x

## 非目标
x

## 备注
x
EOF
t "slug 含大写下划线" 1 "check.sh validate docs/specs/0006-Bad_Slug.md" "slug"
wfile docs/tickets/0005-badstatus.md <<'EOF'
---
id: 0005
type: fix
spec: 0001
status: finished
blocked-by: []
created: 2026-10-26
---
# 0005: 非法状态

**做什么：** x

**验收标准：**
- [ ] x

**Blocked by：** 无

## Progress
x
EOF
t "ticket 状态非法" 1 "check.sh validate docs/tickets/0005-badstatus.md" "status 非法"
wfile docs/reviews/0002-empty-tickets.md <<'EOF'
---
id: 0002
status: draft
tickets: []
branch: feat/x
created: 2026-10-26
---
# 0002: 空覆盖面

## 标准轴 findings
- 无

## Spec 轴 findings
- 无

## 汇总
无
EOF
t "review tickets 为空拒绝" 1 "check.sh validate docs/reviews/0002-empty-tickets.md" "tickets 不能为空"
wfile docs/reviews/0003-ghost.md <<'EOF'
---
id: 0003
status: draft
tickets: [9999]
branch: feat/x
created: 2026-10-26
---
# 0003: 引用不存在工单

## 标准轴 findings
- 无

## Spec 轴 findings
- 无

## 汇总
无
EOF
t "review 引用不存在工单" 1 "check.sh validate docs/reviews/0003-ghost.md" "不存在"
wfile docs/tickets/0007-multiline.md <<'EOF'
---
id: 0007
type: feature
spec: 0001
status: ready
blocked-by:
  - 0002
created: 2026-10-26
---
# 0007: 多行依赖列表

**做什么：** x

**验收标准：**
- [ ] x

**Blocked by：** 0002

## Progress
x
EOF
t "多行 blocked-by 拒绝" 1 "check.sh validate docs/tickets/0007-multiline.md" "单行"
wfile docs/acceptance/0002-missing-sec.md <<'EOF'
---
id: 0002
status: draft
spec: 0001
round: 1
created: 2026-10-26
---
# 0002: 缺节验收

## 场景结果
- x

## 假设验证
- x

## 下一轮建议
- x
EOF
t "acceptance 缺必填节" 1 "check.sh validate docs/acceptance/0002-missing-sec.md" "残余风险"
wfile docs/adr/0002-badstatus.md <<'EOF'
---
id: 0002
status: draft
created: 2026-10-26
---
# 0002: 状态非法的 ADR
正文
EOF
t "adr 状态非法" 1 "check.sh validate docs/adr/0002-badstatus.md" "status 非法"

echo "== commit-msg =="
t "[#0002]（implemented）通过" 0 "printf '[#0002] c\n\nbody\n' > /tmp/msg.txt && check.sh commit-msg /tmp/msg.txt" "门禁通过"
t "[trivial] 豁免通过" 0 "printf '[trivial] typo\n' > /tmp/msg.txt && check.sh commit-msg /tmp/msg.txt" "豁免"
t "无标记拒绝" 1 "printf 'no tag here\n' > /tmp/msg.txt && check.sh commit-msg /tmp/msg.txt" "[#NNNN]"
t "引用不存在的工单拒绝" 1 "printf '[#9999] x\n' > /tmp/msg.txt && check.sh commit-msg /tmp/msg.txt" "不存在"
t "引用 ready 工单拒绝" 1 "printf '[#1] x\n' > /tmp/msg.txt && check.sh commit-msg /tmp/msg.txt" "ready"
t "多位引用混合法" 0 "sed -i.bak 's/^status: ready/status: in-progress/' docs/tickets/0001-cart-checkout.md && rm -f docs/tickets/0001-cart-checkout.md.bak && printf '[#0001][#0002] both\n' > /tmp/msg.txt && check.sh commit-msg /tmp/msg.txt" "门禁通过"
setfm docs/tickets/0001-cart-checkout.md status ready

echo "== pre-push（分支提交评审覆盖）=="
t "主干无领先提交通过" 0 "check.sh pre-push" "无领先提交"
run_in_branch() { git -C "$TMP" checkout -q -b feat/coupon; printf 'x\n' > "$TMP/f.txt"; git -C "$TMP" add f.txt; git -C "$TMP" commit -qm "$1"; }
run_in_branch "[#0002] coupon"
t "implemented 无 approved 评审拒绝" 1 "check.sh pre-push" "评审覆盖"
setfm docs/reviews/0001-coupon-review.md status approved
t "approved 评审覆盖后通过" 0 "check.sh pre-push" "pre-push 门禁通过"
git -C "$TMP" commit -q --amend -m "[#9999] ghost"
t "引用不存在工单拒绝" 1 "check.sh pre-push" "不存在"
git -C "$TMP" commit -q --amend -m "[#0001] wip"
t "引用未完成工单拒绝" 1 "check.sh pre-push" "先完成实现"
git -C "$TMP" commit -q --amend -m "no ref commit"
t "无工单引用给绕过警告但放行" 0 "check.sh pre-push" "未引用任何工单"
git -C "$TMP" commit -q --amend -m "[#0002] coupon"
sed -i.bak 's/^BASE_REF=.*/BASE_REF=nothing/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
t "BASE_REF 缺失明确报错" 1 "check.sh pre-push" "基准分支"
sed -i.bak 's/^BASE_REF=.*/BASE_REF=main/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
git -C "$TMP" checkout -q main

echo "== all（检查命令包装）=="
t "零检查命令是发现不是跳过" 0 "check.sh all" "未定义任何检查命令"
sed -i.bak 's/^CHECK_TEST=.*/CHECK_TEST="true"/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
t "单条通过" 0 "check.sh all" "全量检查通过"
sed -i.bak 's/^CHECK_LINT=.*/CHECK_LINT="false"/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
t "失败命令传播非零" 1 "check.sh all" "CHECK_LINT 失败"
sed -i.bak 's/^CHECK_LINT=.*/CHECK_LINT=""/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
sed -i.bak 's/^RUN_PREFIX=.*/RUN_PREFIX="env"/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
t "RUN_PREFIX 包裹执行" 0 "check.sh all" "全量检查通过"

echo "== publish =="
t "local 适配器确认在盘" 0 "check.sh publish docs/adr/0001-local-tracker.md" "已在盘上"
t "publish 缺文件拒绝" 1 "check.sh publish docs/adr/9999-nope.md" "找不到产物文件"
sed -i.bak 's/^TRACKER=.*/TRACKER=github/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
t "适配器未安装警告并放行" 0 "check.sh publish docs/adr/0001-local-tracker.md" "未安装"
t "未安装警告附重装指引" 0 "check.sh publish docs/adr/0001-local-tracker.md" "setup-workspace"
sed -i.bak 's/^TRACKER=.*/TRACKER=gitlab/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
t "gitlab 适配器未安装同样警告并放行" 0 "check.sh publish docs/adr/0001-local-tracker.md" "未安装"
sed -i.bak 's/^TRACKER=.*/TRACKER=local/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
mv "$TMP/.sdlc/trackers/local.sh" "$TMP/.sdlc/trackers/local.sh.bak"
t "local 适配器缺失报安装损坏" 1 "check.sh publish docs/adr/0001-local-tracker.md" "安装损坏"
mv "$TMP/.sdlc/trackers/local.sh.bak" "$TMP/.sdlc/trackers/local.sh"

echo "== tracker 适配器 github =="
GITHUB_ADAPTER="$HERE/../assets/trackers/github.sh"
cp "$GITHUB_ADAPTER" "$TMP/.sdlc/trackers/github.sh" && chmod +x "$TMP/.sdlc/trackers/github.sh"
sed -i.bak 's/^TRACKER=.*/TRACKER=github/; s/^TRACKER_REPO=.*/TRACKER_REPO="acme\/widget"/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
fake_cmd gh <<'EOF'
#!/bin/sh
[ -n "${FAKE_LOG:-}" ] && printf '%s\n' "$*" >> "$FAKE_LOG"
if [ "$1" = "auth" ]; then exit "${FAKE_AUTH:-0}"; fi
if [ "$1" = "issue" ]; then
  case "$2" in
    create|edit) ;;
    *) exit 0 ;;
  esac
  prev=""
  for a in "$@"; do
    if { [ "$prev" = "-F" ] || [ "$prev" = "--body-file" ]; } && [ -f "$a" ]; then cat "$a" >> "$FAKE_LOG"; fi
    prev="$a"
  done
  if [ "$2" = "create" ]; then printf '%s\n' "${FAKE_URL:-https://github.com/acme/widget/issues/41}"; fi
fi
exit 0
EOF
t "github 投影放行并说明" 0 "PATH=\"$TMP/fakebin:\$PATH\" FAKE_LOG=\"$TMP/gh1.log\" check.sh publish docs/adr/0001-local-tracker.md" "投影"
tn "github 投影消息不含重复 docs/ 前缀" 0 "PATH=\"$TMP/fakebin:\$PATH\" check.sh publish docs/adr/0001-local-tracker.md" "docs/docs/"
t "github 投影收到一次 issue create" 0 "grep -q 'issue create' \"$TMP/gh1.log\"" ""
t "github 投影正文首行带盘上指针" 0 "grep -q '盘上产物：docs/adr/0001-local-tracker.md' \"$TMP/gh1.log\"" ""
t "github 映射落行（路径与编号与URL）" 0 "grep -q 'docs/adr/0001-local-tracker.md' \"$TMP/.sdlc/trackers/github.map\" && grep -q 'issues/41' \"$TMP/.sdlc/trackers/github.map\"" ""
t "github 幂等：二次 publish 走 issue edit" 0 "PATH=\"$TMP/fakebin:\$PATH\" FAKE_LOG=\"$TMP/gh2.log\" check.sh publish docs/adr/0001-local-tracker.md" "投影"
t "github 幂等：edit 存在" 0 "grep -q 'issue edit' \"$TMP/gh2.log\"" ""
t "github 幂等：无第二次 create" 0 "! grep -q 'issue create' \"$TMP/gh2.log\"" ""
t "github 幂等：映射仍一行" 0 "[ \"\$(wc -l < \"$TMP/.sdlc/trackers/github.map\")\" -eq 1 ]" ""
t "github：gh 未认证警告跳过且零创建" 0 "PATH=\"$TMP/fakebin:\$PATH\" FAKE_AUTH=1 FAKE_LOG=\"$TMP/gh3.log\" check.sh publish docs/adr/0001-local-tracker.md" "未认证"
t "github：未认证路径无 create 调用" 0 "! grep -q 'issue create' \"$TMP/gh3.log\"" ""
t "github：gh 缺失警告跳过" 0 "PATH=\"$TMP/.sdlc:/usr/bin:/bin\" check.sh publish docs/adr/0001-local-tracker.md" "gh 未安装"
t "github：TRACKER_REPO 缺失警告跳过" 0 "sed -i.bak 's/^TRACKER_REPO=.*/TRACKER_REPO=\"\"/' \"$TMP/.sdlc/config.sh\" && rm -f \"$TMP/.sdlc/config.sh.bak\" && PATH=\"$TMP/fakebin:\$PATH\" check.sh publish docs/adr/0001-local-tracker.md" "TRACKER_REPO"
sed -i.bak 's/^TRACKER_REPO=.*/TRACKER_REPO="acme\/widget"/; s/^TRACKER=.*/TRACKER=local/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"

echo "== tracker 适配器 gitlab =="
GITLAB_ADAPTER="$HERE/../assets/trackers/gitlab.sh"
cp "$GITLAB_ADAPTER" "$TMP/.sdlc/trackers/gitlab.sh" && chmod +x "$TMP/.sdlc/trackers/gitlab.sh"
sed -i.bak 's/^TRACKER=.*/TRACKER=gitlab/; s/^TRACKER_REPO=.*/TRACKER_REPO="acme\/widget"/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
fake_cmd glab <<'EOF'
#!/bin/sh
[ -n "${FAKE_LOG:-}" ] && printf '%s\n' "$*" >> "$FAKE_LOG"
if [ "$1" = "auth" ]; then exit "${FAKE_AUTH:-0}"; fi
if [ "$1" = "issue" ]; then
  case "$2" in
    create|update) ;;
    *) exit 0 ;;
  esac
  prev=""
  for a in "$@"; do
    if { [ "$prev" = "-d" ] || [ "$prev" = "--description" ]; } && [ -n "$a" ]; then printf '%s\n' "$a" >> "$FAKE_LOG"; fi
    prev="$a"
  done
  if [ "$2" = "create" ]; then printf '%s\n' "${FAKE_OUT:-https://gitlab.com/acme/widget/-/issues/12}"; fi
fi
exit 0
EOF
t "gitlab 投影放行并说明" 0 "PATH=\"$TMP/fakebin:\$PATH\" FAKE_LOG=\"$TMP/gl1.log\" check.sh publish docs/adr/0001-local-tracker.md" "投影"
tn "gitlab 投影消息不含重复 docs/ 前缀" 0 "PATH=\"$TMP/fakebin:\$PATH\" check.sh publish docs/adr/0001-local-tracker.md" "docs/docs/"
t "gitlab 投影收到一次 issue create" 0 "grep -q 'issue create' \"$TMP/gl1.log\"" ""
t "gitlab 投影正文首行带盘上指针" 0 "grep -q '盘上产物：docs/adr/0001-local-tracker.md' \"$TMP/gl1.log\"" ""
t "gitlab 映射落行（路径与编号与URL）" 0 "grep -q 'docs/adr/0001-local-tracker.md' \"$TMP/.sdlc/trackers/gitlab.map\" && grep -q 'issues/12' \"$TMP/.sdlc/trackers/gitlab.map\"" ""
t "gitlab 幂等：二次 publish 走 issue update" 0 "PATH=\"$TMP/fakebin:\$PATH\" FAKE_LOG=\"$TMP/gl2.log\" check.sh publish docs/adr/0001-local-tracker.md" "投影"
t "gitlab 幂等：update 存在" 0 "grep -q 'issue update' \"$TMP/gl2.log\"" ""
t "gitlab 幂等：无第二次 create" 0 "! grep -q 'issue create' \"$TMP/gl2.log\"" ""
t "gitlab 幂等：映射仍一行" 0 "[ \"\$(wc -l < \"$TMP/.sdlc/trackers/gitlab.map\")\" -eq 1 ]" ""
t "gitlab：glab 未认证警告跳过且零创建" 0 "PATH=\"$TMP/fakebin:\$PATH\" FAKE_AUTH=1 FAKE_LOG=\"$TMP/gl3.log\" check.sh publish docs/adr/0001-local-tracker.md" "未认证"
t "gitlab：未认证路径无 create 调用" 0 "! grep -q 'issue create' \"$TMP/gl3.log\"" ""
t "gitlab：glab 缺失警告跳过" 0 "PATH=\"$TMP/.sdlc:/usr/bin:/bin\" check.sh publish docs/adr/0001-local-tracker.md" "glab 未安装"
t "gitlab：TRACKER_REPO 缺失警告跳过" 0 "sed -i.bak 's/^TRACKER_REPO=.*/TRACKER_REPO=\"\"/' \"$TMP/.sdlc/config.sh\" && rm -f \"$TMP/.sdlc/config.sh.bak\" && PATH=\"$TMP/fakebin:\$PATH\" check.sh publish docs/adr/0001-local-tracker.md" "TRACKER_REPO"
sed -i.bak 's/^TRACKER_REPO=.*/TRACKER_REPO="acme\/widget"/; s/^TRACKER=.*/TRACKER=local/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"

echo "== tracker 适配器 codeup =="
CODEUP_ADAPTER="$HERE/../assets/trackers/codeup.sh"
cp "$CODEUP_ADAPTER" "$TMP/.sdlc/trackers/codeup.sh" && chmod +x "$TMP/.sdlc/trackers/codeup.sh"
sed -i.bak 's/^TRACKER=.*/TRACKER=codeup/; s/^TRACKER_REPO=.*/TRACKER_REPO="org123\/space456"/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
fake_cmd curl <<'EOF'
#!/bin/sh
[ -n "${FAKE_LOG:-}" ] && printf '%s\n' "$*" >> "$FAKE_LOG"
for a in "$@"; do
  case "$a" in
    */workitems/comment) printf '%s\n%s\n' '{"success":true,"errorCode":""}' "200" ;;
    */workitem)          printf '%s\n%s\n' '{"workitemIdentifier":"e8b26abc123","success":true}' "200" ;;
  esac
done
exit 0
EOF
CU_ENV="CODEUP_TOKEN=pt-test CODEUP_ASSIGNEE=user123 CODEUP_WORKITEM_TYPE=task-type-1"
t "codeup：缺 CODEUP_TOKEN 警告" 0 "CODEUP_TOKEN= CODEUP_ASSIGNEE=u CODEUP_WORKITEM_TYPE=t PATH=\"$TMP/fakebin:\$PATH\" check.sh publish docs/adr/0001-local-tracker.md" "CODEUP_TOKEN"
t "codeup：缺 CODEUP_ASSIGNEE 警告" 0 "CODEUP_TOKEN=t CODEUP_ASSIGNEE= CODEUP_WORKITEM_TYPE=t PATH=\"$TMP/fakebin:\$PATH\" check.sh publish docs/adr/0001-local-tracker.md" "CODEUP_ASSIGNEE"
t "codeup：缺 CODEUP_WORKITEM_TYPE 警告" 0 "CODEUP_TOKEN=t CODEUP_ASSIGNEE=u CODEUP_WORKITEM_TYPE= PATH=\"$TMP/fakebin:\$PATH\" check.sh publish docs/adr/0001-local-tracker.md" "CODEUP_WORKITEM_TYPE"
t "codeup 投影放行并说明" 0 "$CU_ENV PATH=\"$TMP/fakebin:\$PATH\" FAKE_LOG=\"$TMP/cu1.log\" check.sh publish docs/adr/0001-local-tracker.md" "投影"
t "codeup 依序调用创建与评论两端点" 0 "awk '\$0 ~ /workitems\\/comment/ {c=NR} \$0 ~ /workitem -H/ {w=NR} END { exit (w>0 && c>w) ? 0 : 1 }' \"$TMP/cu1.log\"" ""
t "codeup 投影正文带盘上指针" 0 "grep -q '盘上产物：docs/adr/0001-local-tracker.md' \"$TMP/cu1.log\"" ""
t "codeup 映射落 workitemIdentifier" 0 "grep -q 'docs/adr/0001-local-tracker.md' \"$TMP/.sdlc/trackers/codeup.map\" && grep -q 'e8b26abc123' \"$TMP/.sdlc/trackers/codeup.map\"" ""
t "codeup 幂等：二次 publish 仅追加评论" 0 "$CU_ENV PATH=\"$TMP/fakebin:\$PATH\" FAKE_LOG=\"$TMP/cu2.log\" check.sh publish docs/adr/0001-local-tracker.md" "投影"
t "codeup 幂等：评论端点被调用" 0 "grep -q 'workitems/comment' \"$TMP/cu2.log\"" ""
t "codeup 幂等：无第二次创建调用" 0 "! grep -q 'workitem -H' \"$TMP/cu2.log\"" ""
t "codeup 幂等：映射仍一行" 0 "[ \"\$(wc -l < \"$TMP/.sdlc/trackers/codeup.map\")\" -eq 1 ]" ""
sed -i.bak 's/^TRACKER_REPO=.*/TRACKER_REPO="acme\/widget"/; s/^TRACKER=.*/TRACKER=local/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"

echo "== spec done 残留扫描（清扫门禁）=="
new_repo
wfile docs/needs/0001-checkout.md <<'EOF'
---
id: 0001
status: confirmed
created: 2026-10-29
---
# 结账流程

## 背景与业务目标
提高结账转化。

## 干系人与用户
买家；成功标准：下单转化率不降。

## 系统能力需求
- FR-1 支持购物车结算

## 场景
- Given 购物车有商品 When 结算 Then 生成订单

## 假设与风险
- 假设：优惠码规则稳定

## 范围与非目标
不含退款。

## 开放问题
无
EOF
wfile docs/specs/0001-swept.md <<'EOF'
---
id: 0001
status: done
need: 0001
round: 1
created: 2026-10-29
---
# 已清扫规格

## 问题陈述
买家结算慢。

## 方案
一键结算。

## 用户故事
- 作为买家，我想要一键结算，以便更快下单

## 实现决策
新增 checkout 模块。

## 测试决策
在 checkout 服务 API 边界测。

## 验收场景
- [FR-1 | 工单级] Given 有商品 When 结算 Then 订单生成

## 非目标
不退额度。

## 备注
EOF
wfile docs/specs/0002-fresh.md <<'EOF'
---
id: 0002
status: approved
need: 0001
round: 1
created: 2026-10-29
---
# 进行中规格

## 问题陈述
发票开具慢。

## 方案
接入电子发票。

## 用户故事
- 作为买家，我想要电子发票，以便报销

## 实现决策
新增 invoice 模块。

## 测试决策
在 invoice 服务 API 边界测。

## 验收场景
- [FR-1 | 工单级] Given 订单完成 When 开票 Then 发票生成

## 非目标
不含纸质发票。

## 备注
EOF
wfile docs/tickets/0001-old-cart.md <<'EOF'
---
id: 0001
type: feature
spec: 0001
status: done
blocked-by: []
created: 2026-10-29
---
# 0001: 已收尾工单

**做什么：** spec 0001 名下已完成的工单

**验收标准：**
- [x] 已完成（证据：评审通过）

**Blocked by：** 无

## Progress
已完成
EOF
wfile docs/tickets/0002-new-cart.md <<'EOF'
---
id: 0002
type: feature
spec: 0002
status: ready
blocked-by: []
created: 2026-10-29
---
# 0002: 进行中工单

**做什么：** spec 0002 名下的工单

**验收标准：**
- [ ] x

**Blocked by：** 无

## Progress
尚未开工
EOF
wfile docs/reviews/0001-old-review.md <<'EOF'
---
id: 0001
status: approved
tickets: [0001]
branch: feat/old
created: 2026-10-29
---
# 0001: 已收尾评审

## 标准轴 findings
- 无

## Spec 轴 findings
- 无

## 汇总
无阻断
EOF
wfile docs/reviews/0002-new-review.md <<'EOF'
---
id: 0002
status: draft
tickets: [0002]
branch: feat/new
created: 2026-10-29
---
# 0002: 进行中评审

## 标准轴 findings
- 无

## Spec 轴 findings
- 无

## 汇总
无
EOF
wfile docs/acceptance/0001-old-round1.md <<'EOF'
---
id: 0001
status: passed
spec: 0001
round: 1
created: 2026-10-29
---
# 0001: 已收尾验收（round 1）

## 场景结果
- FR-1：通过

## 假设验证
- 通过

## 残余风险
- 无

## 下一轮建议
- 无
EOF
wfile docs/tickets/0003-slug-ref.md <<'EOF'
---
id: 0003
type: feature
spec: 0001-swept
status: done
blocked-by: []
created: 2026-10-29
---
# 0003: slug 引用工单

**做什么：** 以 slug 形态引用 spec 0001 的工单

**验收标准：**
- [x] 已完成（证据：本文件）

**Blocked by：** 无

## Progress
已完成
EOF
t "done spec 名下工单残留被点名" 1 "check.sh validate docs/specs/0001-swept.md" "docs/tickets/0001-old-cart.md"
t "done spec 名下评审残留被点名" 1 "check.sh validate docs/specs/0001-swept.md" "docs/reviews/0001-old-review.md"
t "done spec 名下验收残留被点名" 1 "check.sh validate docs/specs/0001-swept.md" "docs/acceptance/0001-old-round1.md"
t "slug 形态 spec 引用同样计入残留" 1 "check.sh validate docs/specs/0001-swept.md" "docs/tickets/0003-slug-ref.md"
t "approved spec 不触发残留扫描" 0 "check.sh validate docs/specs/0002-fresh.md" "通过"
rm "$TMP/docs/tickets/0001-old-cart.md" "$TMP/docs/reviews/0001-old-review.md" "$TMP/docs/acceptance/0001-old-round1.md" "$TMP/docs/tickets/0003-slug-ref.md"
t "清扫后 done spec 校验通过" 0 "check.sh validate docs/specs/0001-swept.md" "通过"
tn "其他 spec 名下工单不误报为残留" 0 "check.sh validate docs/specs/0001-swept.md" "0002-new-cart"
tn "仅指向其他 spec 工单的评审不误报" 0 "check.sh validate docs/specs/0001-swept.md" "0002-new-review"

echo "== dev-accept 蒸馏清扫出口（SKILL.md 文本契约）=="
new_repo
SKILL="$HERE/../../dev-accept/SKILL.md"
mkdir -p "$TMP/txt"
awk '/^4\. \*\*passed 出口/{f=1;next} /^5\. \*\*rejected 出口/{f=0} f' "$SKILL" > "$TMP/txt/exit-passed.md"
awk '/^## 禁止事项/{f=1} f' "$SKILL" > "$TMP/txt/forbidden.md"
oseq "passed 出口序列四步按序：蒸馏→清扫→置 done→原子提交" "$TMP/txt/exit-passed.md" "蒸馏四路" "清扫" "置 done" "原子提交"
oseq "E3 前置：残余风险与下一轮建议先折回 need 再清扫" "$TMP/txt/exit-passed.md" "残余风险" "下一轮建议" "清扫"
t "passed 出口原子提交注明恰一个 [trivial] 且不产生中间态" 0 "grep -q '恰一个' $TMP/txt/exit-passed.md && grep -q '\[trivial\]' $TMP/txt/exit-passed.md && grep -q '不产生中间态' $TMP/txt/exit-passed.md" ""
t "蒸馏四路落点齐备（need 假设节 / spec 验收场景 / ADR / standards）" 0 "grep -q '假设与风险' $TMP/txt/exit-passed.md && grep -q '验收场景' $TMP/txt/exit-passed.md && grep -q 'ADR' $TMP/txt/exit-passed.md && grep -q 'standards' $TMP/txt/exit-passed.md" ""
oseq "禁止事项：rejected 禁改 spec 正文在前、蒸馏例外在后" "$TMP/txt/forbidden.md" "rejected" "例外"
t "禁止事项保留禁改 spec 正文且例外限定 passed" 0 "grep -q '改 spec 正文' $TMP/txt/forbidden.md && grep -q 'passed' $TMP/txt/forbidden.md" ""
t "frontmatter description 含蒸馏清扫一句话" 0 "grep -qE '^description:.*蒸馏.*清扫' $SKILL" ""

echo "== L4 guard（PreToolUse 判定脚本）=="
GUARD="$HERE/../assets/hooks/l4-guard.sh"
# gj <json>：把工具调用载荷喂给 L4 guard（guard 以 cwd 定位仓库，t/tn 已 cd 到夹具仓库）
gj() { printf '%s' "$1" | bash "$GUARD"; }

new_repo
mkdir -p "$TMP/lib" "$TMP/app"
echo x > "$TMP/lib/a.py"; echo x > "$TMP/app/main.py"
wfile docs/tickets/0001-ready-ticket.md <<'EOF'
---
id: 0001
type: feature
spec: 0001
status: ready
blocked-by: []
created: 2026-10-28
---
# 0001: ready 工单

## Progress
- （未开工）
EOF
sed -i.bak 's/^CODE_DIRS=.*/CODE_DIRS="lib app"/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"

t "规则A：--no-verify 长形式拦截" 0 "gj '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git commit --no-verify -m x\"}}'" "permissionDecision\":\"deny"
t "规则A：deny 理由说明绕过对象" 0 "gj '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git commit --no-verify -m x\"}}'" "commit-msg"
t "规则A：git commit -n 短形式拦截" 0 "gj '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git commit -n -m x\"}}'" "permissionDecision\":\"deny"
t "规则A：尾部独立 -n 拦截" 0 "gj '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git commit -n\"}}'" "permissionDecision\":\"deny"
t "规则A：多段命令拦截" 0 "gj '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"cd /tmp && git commit --no-verify -m x\"}}'" "permissionDecision\":\"deny"
t "规则A：git push --no-verify 拦截" 0 "gj '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git push --no-verify origin main\"}}'" "permissionDecision\":\"deny"
t "规则A：正常 commit 放行" 0 "gj '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git commit -m \\\"[#0010] ok\\\"\"}}'" ""
tn "规则A：正常 commit 无拦截输出" 0 "gj '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git commit -m ok\"}}'" "permissionDecision"
tn "规则A：-m 非短形式放行" 0 "gj '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git commit -m x\"}}'" "permissionDecision"

t "规则B：CODE_DIRS 命中且仅 ready 票拦截" 0 "gj '{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$TMP/lib/a.py\"}}'" "dev-implement"
t "规则B：Write 同样拦截" 0 "gj '{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$TMP/app/main.py\"}}'" "permissionDecision\":\"deny"
t "规则B：相对路径按仓库根锚定拦截" 0 "gj '{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"lib/a.py\"}}'" "permissionDecision\":\"deny"
setfm docs/tickets/0001-ready-ticket.md status in-progress
tn "规则B：有 in-progress 票放行" 0 "gj '{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$TMP/lib/a.py\"}}'" "permissionDecision"
setfm docs/tickets/0001-ready-ticket.md status ready
tn "规则B：docs/ 编辑不受规则B约束" 0 "gj '{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$TMP/docs/notes.md\"}}'" "permissionDecision"
tn "规则B：仓库外路径放行" 0 "gj '{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"/tmp/elsewhere/x.py\"}}'" "permissionDecision"
tn "规则B：CODE_DIRS 外目录放行" 0 "gj '{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$TMP/other/b.py\"}}'" "permissionDecision"
sed -i.bak 's/^CODE_DIRS=.*/CODE_DIRS=""/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"
tn "规则B：CODE_DIRS 留空整体不生效" 0 "gj '{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$TMP/lib/a.py\"}}'" "permissionDecision"
sed -i.bak 's/^CODE_DIRS=.*/CODE_DIRS="lib app"/' "$TMP/.sdlc/config.sh" && rm -f "$TMP/.sdlc/config.sh.bak"

tn "失效安全：非法 JSON 放行" 0 "gj 'not-json{{{'" "permissionDecision"
tn "失效安全：空 stdin 放行" 0 "printf '' | bash \"$GUARD\"" "permissionDecision"
tn "失效安全：缺 tool_name 字段放行" 0 "gj '{\"foo\":1}'" "permissionDecision"
mv "$TMP/.sdlc/config.sh" "$TMP/.sdlc/config.sh.off"
tn "失效安全：缺 config.sh 放行" 0 "gj '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git commit --no-verify\"}}'" "permissionDecision"
mv "$TMP/.sdlc/config.sh.off" "$TMP/.sdlc/config.sh"
t "失效安全恢复：config.sh 复位后规则A恢复" 0 "gj '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git commit --no-verify\"}}'" "permissionDecision\":\"deny"

echo "== git hook 转发端到端 =="
new_repo
wfile docs/tickets/0002-hook-ticket.md <<'EOF'
---
id: 0002
type: feature
spec: 0001
status: in-progress
blocked-by: []
created: 2026-10-28
---
# 0002: hook 端到端工单

## Progress
- 测试夹具。
EOF
printf '#!/bin/sh\n# sdlc-managed: forward\nexec "$(git rev-parse --show-toplevel)/.sdlc/check.sh" commit-msg "$@"\n' > "$TMP/.git/hooks/commit-msg"
chmod +x "$TMP/.git/hooks/commit-msg"
printf 'y\n' > "$TMP/f.txt"
git -C "$TMP" add f.txt
t "合法 message 经 hook 提交成功" 0 "git -C $TMP commit -qm '[#0002] via hook'" ""
printf 'z\n' > "$TMP/f2.txt"
git -C "$TMP" add f2.txt
t "非法 message 被 hook 拦截" 1 "git -C $TMP commit -qm 'no tag'" "[#NNNN]"
rm -f "$TMP/.git/hooks/commit-msg"

echo
echo "通过 $PASS / 失败 $FAIL"
[ "$FAIL" = 0 ] && echo "ALL PASSED"
exit "$FAIL"
