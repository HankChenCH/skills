#!/usr/bin/env bash
# setup-workspace 门禁脚本测试套件：在临时仓库断言 assets/check.sh 各子命令行为，
# 以临时多仓夹具（工作区仓库根 + 成员）实测成员门禁转发与成员哨兵块三态，对 dev-accept
# 蒸馏清扫出口做 SKILL.md 文本契约与 git 端到端断言，并断言 METHOD/GLOSSARY/check.sh
# 活本与生成资产逐字一致。
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
printf '[#0004] x\n' > /tmp/msg.txt
setfm docs/tickets/0004-extra.md status done
t "引用 done 工单拒绝并指路 fix" 1 "check.sh commit-msg /tmp/msg.txt" "开新 fix 工单"
setfm docs/tickets/0004-extra.md status implemented
printf "Merge branch 'feat/x'\n\ndummy body\n" > /tmp/msg.txt
t "Merge 信息头机械放行（无需工单引用）" 0 "check.sh commit-msg /tmp/msg.txt" "机械放行"
printf 'Revert "old subject"\n\nThis reverts commit abc1234.\n' > /tmp/msg.txt
t "Revert 信息头机械放行（无需工单引用）" 0 "check.sh commit-msg /tmp/msg.txt" "机械放行"
printf 'Merged changes\n' > /tmp/msg.txt
t "Merge 需带空格的头形态（Merged 打头不放行）" 1 "check.sh commit-msg /tmp/msg.txt" "[#NNNN]"

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

echo "== reconstructed 状态（逆向产物零改动兼容）=="
new_repo
wfile docs/needs/0001-legacy-rules.md <<'EOF'
---
id: 0001
status: reconstructed
created: 2026-10-29
---
# 逆向：结账业务规则

## 背景与业务目标
存量结账模块的业务规则沉淀（证据：src/checkout/order.py:12）。

## 干系人与用户
买家与客服。

## 系统能力需求
- FR-1 结账须校验库存（证据：src/checkout/order.py:31）
- FR-2 优惠码叠加上限为一层（证据：src/checkout/coupon.py:8，低置信：仅单处证据）

## 场景
- Given 库存不足 When 结算 Then 拒绝订单

## 假设与风险
- 规则自代码逆向，未经产品确认

## 范围与非目标
不含模块内部实现细节。

## 开放问题
- 叠加上限是否为产品意图

## 扫描基线
commit：abc1234def；日期：2026-10-29；已覆盖：src/checkout/；未覆盖：src/billing/（未覆盖区不得读成不存在）。
EOF
t "reconstructed need 过 validate（含扫描基线附加节）" 0 "check.sh validate docs/needs/0001-legacy-rules.md" "通过"
wfile docs/specs/0001-legacy-behavior.md <<'EOF'
---
id: 0001
status: reconstructed
need: 0001
round: 1
created: 2026-10-29
---
# 逆向：结账系统行为

## 问题陈述
结账模块行为无文档沉淀。

## 方案
以逆向 spec 沉淀系统行为与模块职责，断言带证据。

## 用户故事
- 作为新会话 agent，我想读沉淀物即可了解结账行为，以便不重复全量扫描

## 实现决策
行为断言句末带 文件:行 证据引用。

## 测试决策
证据可回溯抽查，不做机械校验。

## 验收场景
- [FR-1 | 工单级] Given 库存不足 When 结算 Then 拒绝订单（证据：src/checkout/order.py:31）
- [FR-2 | 集成级] Given 第二张优惠码 When 叠加 Then 拒绝（证据：src/checkout/coupon.py:8）

## 非目标
不重构结账模块。

## 备注

## 扫描基线
commit：abc1234def；日期：2026-10-29；已覆盖：src/checkout/；未覆盖：src/billing/（未覆盖区不得读成不存在）。
EOF
t "reconstructed spec 覆盖齐过 validate" 0 "check.sh validate docs/specs/0001-legacy-behavior.md" "通过"
wfile docs/specs/0002-legacy-partial.md <<'EOF'
---
id: 0002
status: reconstructed
need: 0001
round: 1
created: 2026-10-29
---
# 逆向：结账行为残卷

## 问题陈述
仅部分行为已取证。

## 方案
沉淀已取证部分。

## 用户故事
- 作为新会话 agent，我想读已取证行为

## 实现决策
同逆向 spec 惯例。

## 测试决策
证据可回溯抽查。

## 验收场景
- [FR-1 | 工单级] Given 库存不足 When 结算 Then 拒绝订单（证据：src/checkout/order.py:31）

## 非目标
未取证行为不入本卷。

## 备注
EOF
t "reconstructed spec 覆盖缺报孤儿 FR" 1 "check.sh validate docs/specs/0002-legacy-partial.md" "孤儿 FR"
wfile docs/tickets/0001-legacy-probe.md <<'EOF'
---
id: 0001
type: feature
spec: 0001
status: done
blocked-by: []
created: 2026-10-29
---
# 0001: 残留探针工单

**做什么：** 挂在逆向 spec 名下验证 reconstructed 不触发清扫门禁

**验收标准：**
- [x] 构造残留（证据：本文件）

**Blocked by：** 无

## Progress
测试夹具
EOF
t "reconstructed spec 名下有过程档不触发残留门禁" 0 "check.sh validate docs/specs/0001-legacy-behavior.md" "通过"
setfm docs/specs/0001-legacy-behavior.md status done
t "残留校验活体探针：同一名下过程档在 done 下必红" 1 "check.sh validate docs/specs/0001-legacy-behavior.md" "docs/tickets/0001"
setfm docs/specs/0001-legacy-behavior.md status reconstructed
t "phase 原样显示 reconstructed 状态" 0 "check.sh phase" "0001-legacy-behavior reconstructed"
t "frontier 输出不受逆向产物影响" 0 "check.sh frontier" "（空）"
tn "frontier 不列逆向产物" 0 "check.sh frontier" "reconstructed"

echo "== setup-reconstruct 主文档文本契约（seam 3）=="
new_repo
SKILL="$HERE/../../setup-reconstruct/SKILL.md"
TPLDIR="$HERE/../../setup-reconstruct/references/templates"
mkdir -p "$TMP/txt"
t "技能自身文件齐备（主文档 + 三个参考 + 三张模板）" 0 "test -f \"$SKILL\" && test -f \"$HERE/../../setup-reconstruct/references/scan-protocol.md\" && test -f \"$HERE/../../setup-reconstruct/references/artifact-templates.md\" && test -f \"$HERE/../../setup-reconstruct/references/incremental-alignment.md\" && test -f \"$TPLDIR/need.md\" && test -f \"$TPLDIR/spec.md\" && test -f \"$TPLDIR/adr.md\"" ""
t "frontmatter description 含存量扫描与确认一句话" 0 "grep -qE '^description:.*存量.*扫描' \"$SKILL\" && grep -qE '^description:.*确认' \"$SKILL\"" ""
t "两级结构成文：主文档按需指向三个参考文档" 0 "grep -q 'references/scan-protocol.md' \"$SKILL\" && grep -q 'references/artifact-templates.md' \"$SKILL\" && grep -q 'references/incremental-alignment.md' \"$SKILL\""

awk '/^## 0\. /{f=1;next} /^## 1\. /{f=0} f' "$SKILL" > "$TMP/txt/gate.md"
oseq "FR-1 入口门禁：git 仓库在前、技能自身文件完整在后、不要求 check.sh 收尾" "$TMP/txt/gate.md" "git 仓库" "技能自身文件" "不要求" "check.sh"
tn "FR-1 门禁不沿用未接入即拒的措辞（不要求 check.sh 存在）" 0 "cat \"$TMP/txt/gate.md\"" "未接入开发流程"

awk '/^## 2\. /{f=1;next} /^## 3\. /{f=0} f' "$SKILL" > "$TMP/txt/scan.md"
oseq "FR-6 扫描纪律：全程只读在前、轮末覆盖与未覆盖清单在后" "$TMP/txt/scan.md" "只读" "未覆盖"

awk '/^## 3\. /{f=1;next} /^## 4\. /{f=0} f' "$SKILL" > "$TMP/txt/draft.md"
oseq "FR-3 证据纪律：文件:行 证据格式在前、查无证据三选一在后" "$TMP/txt/draft.md" "文件:行" "补扫取证" "低置信" "开放问题"
t "FR-3 断言与推断边界成文（查无证据不得写成断言）" 0 "grep -q '不得写成断言' \"$TMP/txt/draft.md\"" ""
oseq "FR-4 五路落点齐备：逆向 need、逆向 spec、ADR、折叠三载体、扫描基线" "$TMP/txt/draft.md" "逆向 need" "逆向 spec" "ADR" "AGENTS.md" "GLOSSARY" "standards" "扫描基线"
t "FR-4 逆向 spec 的 need 字段指向逆向 need" 0 "grep -q 'need 字段指向' \"$TMP/txt/draft.md\"" ""
t "落盘状态关键词 reconstructed 成文（need 与 spec）" 0 "grep -q 'status: reconstructed' \"$SKILL\"" ""
oseq "FR-5 扫描基线字段成文：commit、日期、已覆盖、未覆盖、不得读成不存在" "$TMP/txt/draft.md" "扫描基线" "commit" "已覆盖" "未覆盖" "不得读成不存在"

awk '/^## 4\. /{f=1;next} /^## 5\. /{f=0} f' "$SKILL" > "$TMP/txt/lane.md"
oseq "FR-6 确认前置：草案先行、不确认不落盘、显式确认、沉默不算确认" "$TMP/txt/lane.md" "草案" "不落盘" "显式确认" "沉默不算确认"
oseq "FR-2 落盘两路：未接入先 setup-workspace 全流程一次完成、已接入仅写逆向产物" "$TMP/txt/lane.md" "setup-workspace 全流程" "一次" "已接入" "仅写逆向产物"
oseq "FR-2 同名不覆盖成文：standards 与 GLOSSARY 同名均指名" "$TMP/txt/lane.md" "同名" "standards" "GLOSSARY"

awk '/^## 5\. /{f=1;next} /^## 6\. /{f=0} f' "$SKILL" > "$TMP/txt/exit.md"
t "FR-6 按需服务定位：路由表不加行" 0 "grep -q '路由表不加行' \"$TMP/txt/exit.md\"" ""
t "FR-6 出口 = 报告 + 指路" 0 "grep -q '报告' \"$TMP/txt/exit.md\" && grep -q '指路' \"$TMP/txt/exit.md\"" ""
t "重跑 = 增量对齐关键词在主文档（seam 3 契约）" 0 "grep -q '增量对齐' \"$SKILL\"" ""

awk '/^## 禁止事项/{f=1} f' "$SKILL" > "$TMP/txt/forbidden.md"
oseq "禁止事项：未确认不落盘、推断不成断言、扫描期零改动、同名不覆盖" "$TMP/txt/forbidden.md" "确认" "断言" "任何文件" "同名"
t "禁止事项声明不做 git 提交、不自动重扫" 0 "grep -q 'git 提交' \"$TMP/txt/forbidden.md\" && grep -q '重扫' \"$TMP/txt/forbidden.md\"" ""

RA="$HERE/../../setup-reconstruct/references/incremental-alignment.md"
awk '/^## 增量对齐/{f=1;next} /^## /{f=0} f' "$RA" > "$TMP/txt/incr.md"
oseq "FR-7 增量对齐协议：diff 取变更文件集、按证据引用分组涉漂移与未涉漂移、只重验涉漂移" "$TMP/txt/incr.md" "diff" "证据引用" "涉漂移" "未涉漂移" "只重验"
oseq "FR-7 涉漂移重验三选一与增量草案：重取证、标过时、新增文件产出增量断言草案" "$TMP/txt/incr.md" "只重验" "重取证" "标过时" "增量断言草案"
oseq "FR-7 确认门合并与收口：同一确认门合并写入、未漂移逐字不变、基线更新为新 commit" "$TMP/txt/incr.md" "确认门" "合并写入" "逐字不变" "扫描基线" "新 commit"
t "FR-7 基线缺失回落全量扫描成文" 0 "grep -q '回落全量扫描' \"$RA\"" ""
awk '/^## 补扫/{f=1;next} /^## /{f=0} f' "$RA" > "$TMP/txt/rescan.md"
oseq "FR-5 补扫协议：范围参数、只产出该范围增量产物、更新基线覆盖清单、已确认存量产物不被重写" "$TMP/txt/rescan.md" "范围参数" "增量产物" "覆盖清单" "不被重写"

echo "== setup-migrate 主文档文本契约（seam 1）=="
new_repo
SKILL="$HERE/../../setup-migrate/SKILL.md"
IDENT="$HERE/../../setup-migrate/references/identify-protocol.md"
LEDGER="$HERE/../../setup-migrate/references/ledger-template.md"
mkdir -p "$TMP/txt"
t "技能自身文件齐备（主文档 + 识别协议 + 对账清单模板）" 0 "test -f \"$SKILL\" && test -f \"$IDENT\" && test -f \"$LEDGER\"" ""
t "frontmatter description 含迁移与识别一句话" 0 "grep -qE '^description:.*迁移' \"$SKILL\" && grep -qE '^description:.*识别' \"$SKILL\"" ""
t "两级结构成文：主文档按需指向识别协议与清单模板" 0 "grep -q 'references/identify-protocol.md' \"$SKILL\" && grep -q 'references/ledger-template.md' \"$SKILL\"" ""

awk '/^## 0\. /{f=1;next} /^## 1\. /{f=0} f' "$SKILL" > "$TMP/txt/gate.md"
oseq "FR-1 入口门禁：git 仓库在前、技能自身文件完整在后、不要求已接入收尾" "$TMP/txt/gate.md" "git 仓库" "技能自身文件" "不要求" "接入"
tn "FR-1 门禁不沿用未接入即拒的措辞（不要求 check.sh 存在）" 0 "cat \"$TMP/txt/gate.md\"" "先运行 /setup-workspace"

awk '/^## 2\. /{f=1;next} /^## 3\. /{f=0} f' "$SKILL" > "$TMP/txt/identify.md"
oseq "FR-1 识别节按序：点名 matt 与 superpower、全程只读、非点名痕迹标未处理" "$TMP/txt/identify.md" "matt" "superpower" "只读" "未处理"
t "FR-1 识别只认点名清单不做通用识别器" 0 "grep -q '不做通用识别器' \"$TMP/txt/identify.md\"" ""

awk '/^## 3\. /{f=1;next} /^## 4\. /{f=0} f' "$SKILL" > "$TMP/txt/skeleton.md"
oseq "FR-1 流程骨架四步按序：翻译、处置、接入、清单收口" "$TMP/txt/skeleton.md" "翻译" "处置" "接入" "清单收口"
t "FR-1 骨架占位：后四步注明后续工票落地不超前实现" 0 "grep -q '后续工票落地' \"$TMP/txt/skeleton.md\"" ""
oseq "FR-6 对账清单落点与行结构按序：docs/migrations/、来源、归宿、处置结果" "$TMP/txt/skeleton.md" "docs/migrations/" "来源" "归宿" "处置结果"
t "FR-6 处置结果四值成文：已翻译、已关闭、失败待补、未处理" 0 "grep -q '已翻译' \"$TMP/txt/skeleton.md\" && grep -q '已关闭' \"$TMP/txt/skeleton.md\" && grep -q '失败待补' \"$TMP/txt/skeleton.md\" && grep -q '未处理' \"$TMP/txt/skeleton.md\"" ""
t "FR-6 清单 frontmatter 仅 id / created 成文" 0 "grep -q 'frontmatter 仅' \"$TMP/txt/skeleton.md\" && grep -q 'id' \"$TMP/txt/skeleton.md\" && grep -q 'created' \"$TMP/txt/skeleton.md\"" ""

awk '/^## 4\. /{f=1;next} /^## 5\. /{f=0} f' "$SKILL" > "$TMP/txt/exit.md"
oseq "FR-7 出口三件按序：报告、对账清单、指路 setup-reconstruct" "$TMP/txt/exit.md" "报告" "对账清单" "setup-reconstruct"
t "FR-1 按需服务定位：路由表不加行" 0 "grep -q '路由表不加行' \"$TMP/txt/exit.md\"" ""
t "FR-1 sdlc next-mode 路由表零 setup 行（技能不进自动串联链）" 0 "! grep -q 'setup-' \"$HERE/../../sdlc/references/next-mode.md\"" ""

awk '/^## 禁止事项/{f=1} f' "$SKILL" > "$TMP/txt/forbidden.md"
oseq "禁止事项：识别期零改动、非点名不擅自处置、不进路由表" "$TMP/txt/forbidden.md" "任何文件" "未处理" "路由表"

oseq "FR-1 matt 特征按序：十四项生命周期技能、五枚 triage 标签、本地三痕迹" "$IDENT" "十四项" "needs-triage" "ready-for-human" "wontfix" ".scratch/" "GLOSSARY-MAP.md" "docs/agents/"
oseq "FR-1 superpower 特征按层：配置键、installed_plugins、仓库内 docs/superpowers 与 .superpowers" "$IDENT" "enabledPlugins" "installed_plugins.json" "docs/superpowers/" ".superpowers/"
t "FR-8 superpower 特征以调研报告为源并带检索日期" 0 "grep -q '0002-superpower-skills-suite' \"$IDENT\" && grep -q '2026-10-29' \"$IDENT\"" ""
t "FR-1 防误伤：superpowers 插件名精确匹配，兄弟插件按未处理" 0 "grep -q '精确匹配' \"$IDENT\" && grep -q '未处理' \"$IDENT\"" ""
t "FR-1 识别全程只读与 E1 不擅自处置成文" 0 "grep -q '只读' \"$IDENT\" && grep -q '不擅自处置' \"$IDENT\"" ""
t "FR-1 识别报告覆盖三类痕迹" 0 "grep -q '生命周期技能清单' \"$IDENT\" && grep -q 'issue 清单' \"$IDENT\" && grep -q '本地痕迹' \"$IDENT\"" ""

t "FR-6 模板 frontmatter 仅 id 与 created（机械断言键集合）" 0 "awk '/^---\$/{c++;next} c==1 && /^[a-zA-Z_-]+:/{print \$1}' \"$LEDGER\" | tr -d ':' | paste -sd, - | grep -qx 'id,created'" ""
oseq "FR-6 模板行结构按序：来源、归宿、处置结果" "$LEDGER" "来源" "归宿" "处置结果"
t "FR-6 模板落点 docs/migrations/ 成文" 0 "grep -q 'docs/migrations/' \"$LEDGER\"" ""
t "FR-6 快照语义：一次迁移一张落盘即终态" 0 "grep -q '落盘即终态' \"$LEDGER\"" ""

echo "== setup-migrate 翻译映射协议（seam 1）=="
TRANS="$HERE/../../setup-migrate/references/translation-mapping.md"
t "翻译映射参考文档存在（两级结构第三件）" 0 "test -f \"$TRANS\"" ""
t "主文档按需加载指向翻译协议（翻译步入口）" 0 "grep -q 'references/translation-mapping.md' \"$SKILL\"" ""

awk '/^## 产物对产物/{f=1;next} /^## 状态对状态/{f=0} f' "$TRANS" > "$TMP/txt/trans-prod.md"
oseq "FR-2 产物映射按序：spec issue、ticket issue、questionnaire、ADR、GLOSSARY 术语、GLOSSARY-MAP.md、docs/agents/" "$TMP/txt/trans-prod.md" "spec issue" "ticket issue" "questionnaire" "ADR 文件" "GLOSSARY 术语" "GLOSSARY-MAP.md" "docs/agents/"
t "FR-2 spec issue → 本套件 spec 八节齐备" 0 "grep -q '八节齐备' \"$TMP/txt/trans-prod.md\"" ""
t "FR-2 ticket issue 未闭环落正向 ready、已闭环不产 ticket 产物（过程档不留僵尸）" 0 "grep -q '不产 ticket 产物' \"$TMP/txt/trans-prod.md\"" ""
t "FR-2 耐久内容折进沉淀 spec / ADR（已闭环 ticket 的归宿）" 0 "grep -q '折进' \"$TMP/txt/trans-prod.md\"" ""
t "FR-2 ADR 以 accepted 落本套件（判据：当前生效的决策）" 0 "grep -q 'accepted' \"$TMP/txt/trans-prod.md\"" ""
t "FR-2 GLOSSARY 术语并入项目术语章、同名不覆盖冲突报告交用户" 0 "grep -q '项目术语章' \"$TMP/txt/trans-prod.md\" && grep -q '不覆盖' \"$TMP/txt/trans-prod.md\"" ""
t "FR-2 GLOSSARY-MAP.md 显式弃置、docs/agents/ 随生命周期技能处置" 0 "grep -q '显式弃置' \"$TMP/txt/trans-prod.md\" && grep -q '随生命周期技能处置' \"$TMP/txt/trans-prod.md\"" ""

awk '/^## 状态对状态/{f=1;next} /^## E2/{f=0} f' "$TRANS" > "$TMP/txt/trans-state.md"
oseq "FR-2 分态规则按序：未完成进正向现态、已完成落 reconstructed、wontfix 显式弃置" "$TMP/txt/trans-state.md" "未完成" "reconstructed" "wontfix"
t "FR-2 未完成 ticket 落 ready 且 spec 字段指向翻译 spec；未完成 spec 落 draft 交 dev-spec 审定" 0 "grep -q '指向' \"$TMP/txt/trans-state.md\" && grep -q 'draft' \"$TMP/txt/trans-state.md\"" ""
t "FR-2 来源行承载迁移区分：外来位置 + 迁移日期、正文首部（总则，适用全部翻译产物）" 0 "grep -q '迁移日期' \"$TRANS\" && grep -q '正文首部' \"$TRANS\"" ""
t "FR-2 翻译产物不带扫描基线节（非扫描所得；总则显式排除）" 0 "grep -q '不带扫描基线节' \"$TRANS\"" ""
t "FR-2 沉淀 spec 的 need 字段可空（不为凑字段伪造 need）" 0 "grep -q 'need 字段可空' \"$TMP/txt/trans-state.md\"" ""
t "FR-2 外来特有语义正文显式记录不新增状态（ready-for-human）" 0 "grep -q 'ready-for-human' \"$TMP/txt/trans-state.md\"" ""
t "FR-2 wontfix 显式弃置理由：外来套件已拒" 0 "grep -q '外来套件已拒' \"$TMP/txt/trans-state.md\"" ""

awk '/^## E2/{f=1} f' "$TRANS" > "$TMP/txt/trans-e2.md"
t "E2 语义无法对应：显式弃置与理由、不硬造产物" 0 "grep -q '显式弃置' \"$TMP/txt/trans-e2.md\" && grep -q '不硬造' \"$TMP/txt/trans-e2.md\"" ""

echo "== setup-migrate 处置协议（seam 1）=="
DISPOSE="$HERE/../../setup-migrate/references/disposal-protocol.md"
t "处置协议参考文档存在（两级结构第四件）" 0 "test -f \"$DISPOSE\"" ""
t "主文档按需加载与处置步指向处置协议" 0 "grep -q 'references/disposal-protocol.md' \"$SKILL\"" ""

awk '/^## tracker issue 处置/{f=1;next} /^## 生命周期技能处置/{f=0} f' "$DISPOSE" > "$TMP/txt/disp-issue.md"
oseq "FR-3 issue 处置按序：全部翻译后关闭、评论注明已迁移、指向对账清单" "$TMP/txt/disp-issue.md" "全部翻译" "已迁移" "对账清单"
t "FR-3 平台 CLI 与 publish 同款调用面，不扩 trackers 适配器" 0 "grep -q '平台 CLI' \"$TMP/txt/disp-issue.md\" && grep -q '不扩' \"$TMP/txt/disp-issue.md\"" ""
t "FR-3 本地 tracker 文件标记关闭并归位（无外部副作用）" 0 "grep -q '标记关闭并归位' \"$TMP/txt/disp-issue.md\"" ""
t "FR-3 E3 关闭失败留痕不阻断：清单记失败明细，翻译与接入继续" 0 "grep -q '失败待补' \"$TMP/txt/disp-issue.md\" && grep -q '不阻断' \"$TMP/txt/disp-issue.md\"" ""
t "FR-3 已闭环 issue 无 tracker 操作（非目标）" 0 "grep -q '无 tracker 操作' \"$TMP/txt/disp-issue.md\"" ""

awk '/^## 生命周期技能处置/{f=1;next} f' "$DISPOSE" > "$TMP/txt/disp-skill.md"
t "FR-4 判据沿 §10.3：生命周期类处置、写作类保留" 0 "grep -q '§10.3' \"$TMP/txt/disp-skill.md\" && grep -q '写作类保留' \"$TMP/txt/disp-skill.md\"" ""
t "FR-4 处置 = 移出技能发现路径，软禁用不采用" 0 "grep -q '移出技能发现路径' \"$TMP/txt/disp-skill.md\" && grep -q '软禁用' \"$TMP/txt/disp-skill.md\"" ""
t "FR-4 全局安装默认归档且处置前必须经用户确认作用域，不擅动全局" 0 "grep -q '确认作用域' \"$TMP/txt/disp-skill.md\" && grep -q '不擅动' \"$TMP/txt/disp-skill.md\"" ""
t "FR-4 superpower 生命周期清单按调研报告，writing- 前缀不作写作类判据" 0 "grep -q '0002-superpower-skills-suite' \"$TMP/txt/disp-skill.md\" && grep -q 'writing- 前缀' \"$TMP/txt/disp-skill.md\"" ""

echo "== setup-migrate 两态接入与出口（seam 1）=="
ONBOARD="$HERE/../../setup-migrate/references/onboarding-exit.md"
t "两态接入与出口参考文档存在（两级结构第五件）" 0 "test -f \"$ONBOARD\"" ""
t "主文档按需加载与接入步指向两态协议" 0 "grep -q 'references/onboarding-exit.md' \"$SKILL\"" ""

awk '/^## 两态接入/{f=1;next} /^## 对账清单收口/{f=0} f' "$ONBOARD" > "$TMP/txt/onboard.md"
oseq "FR-5 两态接入按序：未接入先 setup-workspace 全流程、接入完成才落迁移产物、已接入资产逐字不变" "$TMP/txt/onboard.md" "setup-workspace 全流程" "接入完成" "逐字不变"
t "FR-5 接入含其决策点不跳过，一次会话完成接入与迁移" 0 "grep -q '决策点' \"$TMP/txt/onboard.md\" && grep -q '一次会话' \"$TMP/txt/onboard.md\"" ""

awk '/^## 对账清单收口/{f=1;next} /^## 出口/{f=0} f' "$ONBOARD" > "$TMP/txt/ledger-final.md"
t "FR-6 收口核验：每行 来源→归宿→处置结果 齐备，缺行不收口" 0 "grep -q '齐备' \"$TMP/txt/ledger-final.md\" && grep -q '缺行' \"$TMP/txt/ledger-final.md\"" ""

awk '/^## 出口/{f=1} f' "$ONBOARD" > "$TMP/txt/exit2.md"
oseq "FR-7 出口按序：迁移报告、对账清单、指路 setup-reconstruct" "$TMP/txt/exit2.md" "迁移报告" "对账清单" "setup-reconstruct"
t "FR-7 可选串联用户自选触发、不自动运行、不选不产逆向产物" 0 "grep -q '不自动' \"$TMP/txt/exit2.md\" && grep -q '自选' \"$TMP/txt/exit2.md\" && grep -q '不产生逆向产物' \"$TMP/txt/exit2.md\"" ""

echo "== setup-migrate 对账清单不进门禁（seam 3）=="
new_repo
wfile docs/migrations/0001-matt-checkout.md <<'EOF'
---
id: 0001
created: 2026-10-29
---
# 0001-matt-checkout：迁移对账清单

| 来源 | 归宿 | 处置结果 |
|---|---|---|
| .scratch/0001-checkout.md | docs/specs/0001-checkout.md | 已翻译 |
EOF
t "validate 对 docs/migrations/ 文件报无法识别产物类型（不受理即不进状态机）" 1 "check.sh validate docs/migrations/0001-matt-checkout.md" "无法识别产物类型"
tn "phase 输出不受 docs/migrations/ 存在影响" 0 "check.sh phase" "matt-checkout"
tn "frontier 输出不受 docs/migrations/ 存在影响" 0 "check.sh frontier" "matt-checkout"

echo "== setup-reconstruct 模板喂 validate（FR-2 实测）=="
new_repo
t "模板即 reconstructed / accepted 落盘形态" 0 "grep -q '^status: reconstructed' \"$TPLDIR/need.md\" && grep -q '^status: reconstructed' \"$TPLDIR/spec.md\" && grep -q '^status: accepted' \"$TPLDIR/adr.md\"" ""
t "need 模板七节齐备" 0 "for s in 背景与业务目标 干系人与用户 系统能力需求 场景 假设与风险 范围与非目标 开放问题; do grep -q \"^## \$s\" \"$TPLDIR/need.md\" || exit 9; done" ""
t "spec 模板八节齐备" 0 "for s in 问题陈述 方案 用户故事 实现决策 测试决策 验收场景 非目标 备注; do grep -q \"^## \$s\" \"$TPLDIR/spec.md\" || exit 9; done" ""
t "模板扫描基线带未覆盖声明" 0 "grep -q '未覆盖区不得读成不存在' \"$TPLDIR/need.md\" && grep -q '未覆盖区不得读成不存在' \"$TPLDIR/spec.md\" && grep -q '未覆盖区不得读成不存在' \"$TPLDIR/adr.md\"" ""
mkdir -p "$TMP/docs/needs" "$TMP/docs/specs" "$TMP/docs/adr"
cp "$TPLDIR/need.md" "$TMP/docs/needs/0001-legacy-rules.md"
cp "$TPLDIR/spec.md" "$TMP/docs/specs/0001-legacy-behavior.md"
cp "$TPLDIR/adr.md" "$TMP/docs/adr/0001-legacy-decision.md"
t "逆向 need 模板喂 validate 通过（扫描基线为附加节零改动兼容）" 0 "check.sh validate docs/needs/0001-legacy-rules.md" "通过"
t "逆向 spec 模板喂 validate 通过（need 指向逆向 need 且孤儿 FR 覆盖齐）" 0 "check.sh validate docs/specs/0001-legacy-behavior.md" "通过"
t "逆向 ADR 模板喂 validate 通过" 0 "check.sh validate docs/adr/0001-legacy-decision.md" "通过"

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

echo "== dev-accept 蒸馏清扫出口端到端（夹具模拟序列）=="
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
created: 2026-10-29
---
# 结账规格

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
- [FR-1 | 集成级] Given 订单完成 When 开票 Then 发票到达邮箱

## 非目标
不退额度。

## 备注
EOF
wfile docs/tickets/0001-cart.md <<'EOF'
---
id: 0001
type: feature
spec: 0001
status: done
blocked-by: []
created: 2026-10-29
---
# 0001: 购物车结算

**做什么：** 从购物车一键生成订单

**验收标准：**
- [x] 有商品时结算生成订单（测试：checkout_test）

**Blocked by：** 无

## Progress
已完成
EOF
wfile docs/tickets/0002-coupon.md <<'EOF'
---
id: 0002
type: feature
spec: 0001
status: done
blocked-by: []
created: 2026-10-29
---
# 0002: 优惠码

**做什么：** 优惠码应用与金额减免

**验收标准：**
- [x] 有效优惠码应用后金额正确（测试：coupon_test）

**Blocked by：** 无

## Progress
已完成
EOF
wfile docs/reviews/0001-checkout-review.md <<'EOF'
---
id: 0001
status: approved
tickets: [0001, 0002]
branch: feat/checkout
created: 2026-10-29
---
# 0001: 结账评审

## 标准轴 findings
- 无

## Spec 轴 findings
- 无

## 汇总
无阻断
EOF
wfile docs/acceptance/0001-checkout-round1.md <<'EOF'
---
id: 0001
status: passed
spec: 0001
round: 1
created: 2026-10-29
---
# 0001: 结账验收（round 1）

## 场景结果
- FR-1 集成级：通过

## 假设验证
- 假设：优惠码规则稳定——证伪（实际按单计价）

## 残余风险
- 优惠码叠加上限未定义（影响：对账口径；不阻塞）

## 下一轮建议
- 定义叠加上限并补对账测试
EOF
printf '# CODING_STANDARDS\n\n（索引：docs/standards/）\n' > "$TMP/CODING_STANDARDS.md"
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
t "验收报告发布并落映射（issues/41）" 0 "PATH=\"$TMP/fakebin:\$PATH\" check.sh publish docs/acceptance/0001-checkout-round1.md" "投影"
t "映射记录已发布对象编号" 0 "grep -q 'docs/acceptance/0001-checkout-round1.md' \"$TMP/.sdlc/trackers/github.map\" && grep -q 'issues/41' \"$TMP/.sdlc/trackers/github.map\"" ""
git -C "$TMP" add docs CODING_STANDARDS.md
git -C "$TMP" commit -qm "[trivial] 端到端夹具基线"
BASE="$(git -C "$TMP" rev-parse HEAD)"

# 蒸馏①：need「假设与风险」逐条标注验证结果 + 残余风险与下一轮建议折回
awk '
  /^- 假设：优惠码规则稳定/ {
    print $0 "（验证：证伪——实际按单计价）"
    print "- 残余风险：优惠码叠加上限未定义（影响：对账口径；不阻塞）"
    print "- 下一轮建议：定义叠加上限并补对账测试（折回自验收报告 0001）"
    next
  }
  { print }
' "$TMP/docs/needs/0001-checkout.md" > "$TMP/need.new" && mv "$TMP/need.new" "$TMP/docs/needs/0001-checkout.md"
# 蒸馏②：spec 验收场景按实现中发现的实际边界行为修订
sed -i.bak 's/Then 发票到达邮箱/\&（边界修订：附件超限转失败可见）/' "$TMP/docs/specs/0001-checkout.md" && rm -f "$TMP/docs/specs/0001-checkout.md.bak"
# 蒸馏③：有架构分量的决策新立 ADR
wfile docs/adr/0001-atomic-closeout.md <<'EOF'
---
id: 0001
status: accepted
created: 2026-10-29
---
# 0001: 验收收口为单个原子提交
蒸馏、清扫、置 done 合并为恰一个 [trivial] 提交，避免门禁中间态。
EOF
# 蒸馏④：模式学习追加进 standards
printf '%s\n' "- 蒸馏清扫出口：先折回再删除（来源：验收 0001）" >> "$TMP/CODING_STANDARDS.md"
t "蒸馏落点各自 validate 通过（need / spec / ADR）" 0 "check.sh validate docs/needs/0001-checkout.md && check.sh validate docs/specs/0001-checkout.md && check.sh validate docs/adr/0001-atomic-closeout.md" "通过"
# 残留校验活体探针：spec 先置 done 而未清扫，validate 必须红（校验空转即本用例失败）
setfm docs/specs/0001-checkout.md status done
t "残留校验活体探针：done 未清扫 validate 必须红" 1 "check.sh validate docs/specs/0001-checkout.md" "docs/tickets/0001"
setfm docs/specs/0001-checkout.md status approved
# 清扫：删除该 spec 名下全部过程档（含本次验收报告；tracker 投影不回删）
rm "$TMP/docs/tickets/0001-cart.md" "$TMP/docs/tickets/0002-coupon.md" "$TMP/docs/reviews/0001-checkout-review.md" "$TMP/docs/acceptance/0001-checkout-round1.md"
# 置 done：spec frontmatter 置 done 并追加 done 日期
setfm docs/specs/0001-checkout.md status done
awk '{print} /^round:/{print "done: 2026-10-29"}' "$TMP/docs/specs/0001-checkout.md" > "$TMP/spec.new" && mv "$TMP/spec.new" "$TMP/docs/specs/0001-checkout.md"
t "置 done 且清扫后全库 validate 通过" 0 "for f in docs/needs/*.md docs/specs/*.md docs/adr/*.md; do check.sh validate \"\$f\" || exit 9; done" ""
# 原子提交：蒸馏编辑 + 清扫删除 + 置 done 合为恰一个 [trivial] 提交
git -C "$TMP" add docs CODING_STANDARDS.md
git -C "$TMP" commit -qm "[trivial] 验收收口 spec 0001：蒸馏折回、清扫过程档、置 done"
t "序列恰产生一个新提交" 0 "[ \"\$(git -C \"$TMP\" rev-list --count $BASE..HEAD)\" = 1 ]" ""
t "新提交为 [trivial] 提交" 0 "git -C \"$TMP\" log --format=%s -1 | grep -q '\[trivial\]'" ""
t "commit-msg 门禁放行原子提交信息" 0 "git -C \"$TMP\" log --format=%s -1 > \"$TMP/msg.txt\" && check.sh commit-msg \"$TMP/msg.txt\"" "豁免"
t "原子提交承载全部蒸馏编辑与清扫删除" 0 "git -C \"$TMP\" show --name-status --format= HEAD > \"$TMP/stat.txt\" && grep -q '^M.*needs' \"$TMP/stat.txt\" && grep -q '^M.*specs' \"$TMP/stat.txt\" && grep -q '^M.*CODING_STANDARDS' \"$TMP/stat.txt\" && grep -q '^A.*adr' \"$TMP/stat.txt\" && grep -q '^D.*tickets' \"$TMP/stat.txt\" && grep -q '^D.*reviews' \"$TMP/stat.txt\" && grep -q '^D.*acceptance' \"$TMP/stat.txt\"" ""
t "恰删除四个过程档" 0 "[ \"\$(grep -c '^D' \"$TMP/stat.txt\")\" = 4 ]" ""
t "盘面该 spec 名下过程档为零" 0 "[ -z \"\$(find \"$TMP\"/docs/tickets \"$TMP\"/docs/reviews \"$TMP\"/docs/acceptance -name '*.md')\" ]" ""
t "清扫后映射文件仍记录已发布对象编号" 0 "grep -q 'docs/acceptance/0001-checkout-round1.md' \"$TMP/.sdlc/trackers/github.map\" && grep -q 'issues/41' \"$TMP/.sdlc/trackers/github.map\"" ""

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

echo "== 多仓工作区成员门禁转发（seam 二）=="
new_repo                        # $TMP = 工作区仓库根；成员提交的校验对象全在根 docs/tickets/
mkdir -p "$TMP/frontend"
git -C "$TMP/frontend" init -q -b main
git -C "$TMP/frontend" config user.email test@example.com
git -C "$TMP/frontend" config user.name tester
# 成员转发 hook：照 generation.md「多仓工作区模式」模板逐字落装（复现 setup 的落装行为）；
# 消息文件须先取绝对路径——git 传给 hook 的是相对成员仓库的路径，锚定到根后原路径失效。
# $1 成员仓库根，缺省 $TMP/frontend
install_member_hook() {
  local m="${1:-$TMP/frontend}"
  printf '#!/bin/sh\n# sdlc-managed: forward to workspace root .sdlc/check.sh（由 setup-workspace 安装，重装会覆盖本文件）\nmsg="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"\ncd "$(dirname "$(git rev-parse --show-toplevel)")" && exec ./.sdlc/check.sh commit-msg "$msg"\n' > "$m/.git/hooks/commit-msg"
  chmod +x "$m/.git/hooks/commit-msg"
}
install_member_hook
echo one > "$TMP/frontend/a.txt"; git -C "$TMP/frontend" add a.txt
t "成员提交引用根库尚无的工单被拒：转发已生效且校验报不存在" 1 "git -C $TMP/frontend commit -qm '[#0002] x'" "不存在"
wfile docs/tickets/0002-member-gate.md <<'EOF'
---
id: 0002
type: feature
spec: 0001
status: in-progress
blocked-by: []
created: 2026-10-29
---
# 0002: 成员门禁夹具工单

**做什么：** 只落工作区仓库根 docs/tickets/，供成员转发校验

**验收标准：**
- [ ] 夹具（证据：本文件）

**Blocked by：** 无

## Progress
夹具
EOF
echo two > "$TMP/frontend/b.txt"; git -C "$TMP/frontend" add b.txt
t "成员提交 [#0002] 放行——工单仅在根 docs/tickets/，即 ROOT 锚定工作区根的证据" 0 "git -C $TMP/frontend commit -qm '[#0002] y'" "门禁通过"
wfile docs/tickets/0004-ready-gate.md <<'EOF'
---
id: 0004
type: feature
spec: 0001
status: ready
blocked-by: []
created: 2026-10-29
---
# 0004: ready 状态夹具工单

**做什么：** 夹具

**验收标准：**
- [ ] 夹具（证据：本文件）

**Blocked by：** 无

## Progress
夹具
EOF
wfile docs/tickets/0003-done-gate.md <<'EOF'
---
id: 0003
type: feature
spec: 0001
status: done
blocked-by: []
created: 2026-10-29
---
# 0003: done 状态夹具工单

**做什么：** 夹具

**验收标准：**
- [x] 夹具（证据：本文件）

**Blocked by：** 无

## Progress
夹具
EOF
echo three > "$TMP/frontend/c.txt"; git -C "$TMP/frontend" add c.txt
t "成员提交引用 ready 工单拒绝并报原因" 1 "git -C $TMP/frontend commit -qm '[#0004] x'" "先 /dev-implement 开工再提交"
echo four > "$TMP/frontend/d.txt"; git -C "$TMP/frontend" add d.txt
t "成员提交引用 done 工单拒绝并指路 fix" 1 "git -C $TMP/frontend commit -qm '[#0003] x'" "开新 fix 工单"
echo five > "$TMP/frontend/e.txt"; git -C "$TMP/frontend" add e.txt
t "成员提交引用不存在工单拒绝" 1 "git -C $TMP/frontend commit -qm '[#9999] x'" "不存在"
echo six > "$TMP/frontend/f.txt"; git -C "$TMP/frontend" add f.txt
t "成员无引用非豁免提交拒绝并提示规则" 1 "git -C $TMP/frontend commit -qm 'no tag'" "[#NNNN]"
echo seven > "$TMP/frontend/g.txt"; git -C "$TMP/frontend" add g.txt
t "成员 Merge 信息头提交机械放行" 0 "git -C $TMP/frontend commit -qm \"Merge branch 'feat/x'\"" "机械放行"
echo eight > "$TMP/frontend/h.txt"; git -C "$TMP/frontend" add h.txt
t "成员 Revert 信息头提交机械放行" 0 "git -C $TMP/frontend commit -qm 'Revert \"old change\"'" "机械放行"
install_member_hook             # 幂等重装：同模板整体覆盖
echo nine > "$TMP/frontend/i.txt"; git -C "$TMP/frontend" add i.txt
t "sdlc-managed 重装后转发仍生效" 0 "git -C $TMP/frontend commit -qm '[#0002] z'" "门禁通过"
t "成员 hook 带 sdlc-managed 标记（幂等判定依据）" 0 "grep -q sdlc-managed $TMP/frontend/.git/hooks/commit-msg" ""
t "成员未装 pre-push（need C3）" 0 "test ! -f $TMP/frontend/.git/hooks/pre-push" ""

echo "== 成员门禁转发成文契约（generation.md 多仓节 / SKILL §3 行）=="
GEN="$HERE/../references/generation.md"
SKILL="$HERE/../../setup-workspace/SKILL.md"
mkdir -p "$TMP/txt"
awk '/^### 多仓工作区模式/{f=1;next} /^## 2\. /{f=0} f' "$GEN" > "$TMP/txt/multi.md"
oseq "成员 hook 细则按序成文：一行转发、不装 pre-push、消息文件绝对路径、锚定工作区仓库根、自定位错位理由、外来 hook 沿用不覆盖" "$TMP/txt/multi.md" "commit-msg" "不装 pre-push" "成员仓库" "自定位" "锚定" "外来 hook" "不覆盖"
t "成员转发模板落文（sdlc-managed 标记 + dirname 锚定 + exec check.sh commit-msg）" 0 "grep -q 'sdlc-managed: forward to workspace root' \"$TMP/txt/multi.md\" && grep -q 'dirname' \"$TMP/txt/multi.md\" && grep -q 'exec ./.sdlc/check.sh commit-msg' \"$TMP/txt/multi.md\"" ""
t "SKILL §3 增成员 hook 行（仅多仓工作区模式、不装 pre-push、外来 hook 处置同根）" 0 "grep -q '成员 \`.git/hooks/commit-msg\`（仅多仓' \"$SKILL\" && grep -q '不装 pre-push' \"$SKILL\" && grep -q '外来 hook 处置同根' \"$SKILL\"" ""

echo "== 多仓工作区成员哨兵块（FR-6 三态）=="
# 成员哨兵固定文本直接从 generation.md「成员 AGENTS.md 哨兵块」小节提取并替换
# <成员目录名> 占位——夹具落装的就是文档原文，固定文本与文档不可能漂移；
# 三态规则（不存在→创建 / 无标记→文末追加 / 有标记→块内替换）照细则机械复现
member_sentinel_text() {
  awk '/^### 成员 AGENTS.md 哨兵块/{f=1;next} /^## [0-9]|^### /{f=0} f' "$GEN" \
    | awk '/^```/{f=!f;next} f' | sed "s/<成员目录名>/$1/g"
}
apply_member_sentinel() { # $1 成员目录名 [$2 工作区根，缺省 $TMP]：三态落成员版哨兵块
  local body f root
  root="${2:-$TMP}"
  body="$(member_sentinel_text "$1")"
  f="$root/$1/AGENTS.md"
  if [ ! -f "$f" ]; then
    printf '# AGENTS.md\n\n%s\n' "$body" > "$f"
  elif ! grep -q '<!-- sdlc:begin' "$f"; then
    printf '\n%s\n' "$body" >> "$f"
  else
    # awk -v 会把值里的换行当转义错处理，多行文本经 ENVIRON 原样传入
    MEMBER_SENTINEL_REPL="$body" awk '
      /<!-- sdlc:begin/ { print ENVIRON["MEMBER_SENTINEL_REPL"]; inblk=1; next }
      inblk { if (/<!-- sdlc:end -->/) inblk=0; next }
      { print }
    ' "$f" > "$f.new" && mv "$f.new" "$f"
  fi
}
rm -f "$TMP/frontend/AGENTS.md"
apply_member_sentinel frontend
t "成员无 AGENTS.md：创建并落成员版哨兵块标记" 0 "grep -q '<!-- sdlc:begin' \"$TMP/frontend/AGENTS.md\" && grep -q '<!-- sdlc:end -->' \"$TMP/frontend/AGENTS.md\"" ""
t "成员创建态带一级标题" 0 "head -n 1 \"$TMP/frontend/AGENTS.md\" | grep -qx '# AGENTS.md'" ""
oseq "成员哨兵三要素按序成文：成员身份、工作区根指引、流程回根、代码照常" "$TMP/frontend/AGENTS.md" "成员子仓库" "工作区仓库在上级目录" "回工作区根进行" "照常进行"
mkdir -p "$TMP/backend"
printf '# 后端仓库说明\n\n包管理器用 pnpm。\n' > "$TMP/backend/AGENTS.md"
cp "$TMP/backend/AGENTS.md" "$TMP/backend-agents.before"
apply_member_sentinel backend
t "成员 AGENTS.md 无标记：文末追加哨兵块" 0 "grep -q '<!-- sdlc:begin' \"$TMP/backend/AGENTS.md\" && tail -n 1 \"$TMP/backend/AGENTS.md\" | grep -q '<!-- sdlc:end -->'" ""
head -n 3 "$TMP/backend/AGENTS.md" > "$TMP/backend-head.out"
t "成员无标记追加：原有内容逐字保留在前" 0 "diff \"$TMP/backend-agents.before\" \"$TMP/backend-head.out\"" ""
t "成员无标记追加：追加前空一行分隔" 0 "test -z \"\$(sed -n '4p' \"$TMP/backend/AGENTS.md\")\"" ""
mkdir -p "$TMP/legacy"
cat > "$TMP/legacy/AGENTS.md" <<'EOF'
# legacy 仓库说明

自有开头说明。
<!-- sdlc:begin 由 setup-workspace 管理，勿在此块内手改 -->
## 开发流程（本仓库是 SDLC 多仓工作区的成员子仓库）
上一轮 setup 留下的旧版正文，重装应被整体替换。
<!-- sdlc:end -->
自有结尾说明。
EOF
sed '/<!-- sdlc:begin/,/<!-- sdlc:end -->/d' "$TMP/legacy/AGENTS.md" > "$TMP/legacy-outside.before"
apply_member_sentinel legacy
sed '/<!-- sdlc:begin/,/<!-- sdlc:end -->/d' "$TMP/legacy/AGENTS.md" > "$TMP/legacy-outside.after"
t "成员已有标记：块内替换后块外 diff 为空" 0 "diff \"$TMP/legacy-outside.before\" \"$TMP/legacy-outside.after\"" ""
t "成员已有标记：块内换为新版固定文本" 0 "grep -q '一律回工作区根进行' \"$TMP/legacy/AGENTS.md\"" ""
t "成员已有标记：旧版正文不再残留" 1 "grep -q '旧版正文' \"$TMP/legacy/AGENTS.md\"" ""
cp "$TMP/frontend/AGENTS.md" "$TMP/frontend-agents.once"
apply_member_sentinel frontend
t "成员哨兵幂等重装：同文本重跑文件零变化" 0 "diff \"$TMP/frontend-agents.once\" \"$TMP/frontend/AGENTS.md\"" ""

echo "== 成员哨兵块成文契约（generation.md 成员小节 / SKILL §3 行与 §4 行）=="
awk '/^### 成员 AGENTS.md 哨兵块/{f=1} /^## [0-9]/{f=0} f' "$GEN" > "$TMP/txt/member-sentinel.md"
oseq "成员哨兵细则按序成文：标题点名成员与仅多仓模式、固定文本、占位目录名、三态复述、块外一字不动" "$TMP/txt/member-sentinel.md" "成员 AGENTS.md 哨兵块" "仅多仓工作区模式" "固定文本" "<成员目录名>" "文件不存在" "无 \`<!-- sdlc:begin\`" "块外" "一字不动"
t "成员哨兵固定文本落文（begin/end 标记与三要素特征行）" 0 "grep -q '<!-- sdlc:begin' \"$TMP/txt/member-sentinel.md\" && grep -q '成员子仓库' \"$TMP/txt/member-sentinel.md\" && grep -q '回工作区根进行' \"$TMP/txt/member-sentinel.md\" && grep -q '照常进行' \"$TMP/txt/member-sentinel.md\"" ""
t "SKILL §3 增成员哨兵行（仅多仓工作区模式、随 §4 三态收口）" 0 "grep -q '成员 AGENTS.md 哨兵块（仅多仓' \"$SKILL\" && grep -q '随 §4 三态收口' \"$SKILL\"" ""
t "SKILL §4 增成员行（同三态、成员内不落根版流程块）" 0 "grep -q '成员版哨兵块' \"$SKILL\" && grep -q '不落根版流程块' \"$SKILL\"" ""

echo "== SKILL §1 多仓重跑 diff 与决策 4 消失成员话术（成文契约，FR-7/FR-8）=="
new_repo
DEC="$HERE/../references/decisions.md"
mkdir -p "$TMP/txt"
awk '/^## 1\. /{f=1;next} /^## 2\. /{f=0} f' "$SKILL" > "$TMP/txt/s1.md"
oseq "SKILL §1 升级模式增多仓 diff 规则按序成文：求差、新增确认入册补装且与初始成员完全一致、消失报告、经确认才移出、未确认前清单一字不动、幂等重装、复原清单命中视为已确认零重复询问" "$TMP/txt/s1.md" "升级模式" "求差" "新增" "确认入册" "补装" "完全一致" "消失" "报告" "经确认才移出" "未确认前清单" "一字不动" "幂等重装" "视为已确认" "零重复询问"
t "SKILL §0 模式差异点名 §1 增重跑 diff（交叉引用一致）" 0 "grep -q '§1 增重跑 diff' \"$SKILL\"" ""
awk '/^## 决策 4/{f=1} f' "$DEC" > "$TMP/txt/dec4.md"
oseq "决策 4 重跑分支按序成文：求差只问新增、既有成员不重复询问幂等重装" "$TMP/txt/dec4.md" "求差" "新增" "不重复询问" "幂等重装"
oseq "决策 4 消失成员话术按序成文：不再是 git 仓库即报告、确认才移出、同步 .gitignore 标记段、确认前清单与接入物一字不动、沉默与拒绝不动清单" "$TMP/txt/dec4.md" "不再是 git 仓库" "报告" "确认" "移出" ".gitignore 标记段" "一字不动" "沉默"
t "决策 4 复原零询问成文：清单命中的成员视为已确认、零重复询问" 0 "grep -q '清单命中的成员视为已确认' \"$TMP/txt/dec4.md\" && grep -q '零重复询问' \"$TMP/txt/dec4.md\"" ""

echo "== 多仓重跑 diff 三幕：新增入册 / 消失移出 / 幂等重装（FR-7/FR-10）=="
# 独立多仓夹具：工作区仓库根 + frontend/backend 两入册成员（hook+哨兵+清单+.gitignore
# 标记段齐备）。重跑按 SKILL §1 diff 规则与决策 4 机械复现：mscan 扫第一层（跳点目录、
# rev-parse 解析回目录自身）→ 与清单求差 → 新增经确认补装（模板逐字取自 generation.md）
# → 清单与 .gitignore 标记段按扫描顺序整体重写；消失成员未确认前清单与标记段一字不动。
new_repo
# mscan <根>：多仓第一层扫描（glob 不含点目录即跳过；rev-parse 成功且解析回目录自身
# 才算候选），按字典序输出候选目录名——机械复现 scan-signals §1 第三形态
mscan() {
  local d top
  for d in "$1"/*/; do
    d="${d%/}"
    [ -d "$d" ] || continue
    top="$(git -C "$d" rev-parse --show-toplevel 2>/dev/null)" || continue
    [ "$top" = "$(cd "$d" && pwd -P)" ] && printf '%s\n' "$(basename "$d")"
  done
}
# 重跑求差的两个方向：新增 = 扫描命中不在清单；缺失 = 清单内扫描未命中
mdiff_new() { comm -13 <(sort "$1/.sdlc/members.list") <(mscan "$1" | sort); }
mdiff_missing() { comm -23 <(sort "$1/.sdlc/members.list") <(mscan "$1" | sort); }
# 标记段模板行从 generation.md 逐字提取（幂等判定与措辞以文档为准）；围栏在列表项内
# 带 2 空格缩进，须 sub 去缩进——锚定 ^# 会落空（红阶段钉死）
ms_begin="$(awk '/sdlc:members begin/{sub(/^ */, ""); print; exit}' "$GEN")"
ms_end="$(awk '/sdlc:members end/{sub(/^ */, ""); print; exit}' "$GEN")"
# ms_rewrite_members_gitignore <根>：.gitignore 成员标记段按成员清单整体重写
# （段内逐行 <目录名>/），标记行与块外内容一字不动——机械复现 generation.md
# 「根 .gitignore 成员标记段」细则
ms_rewrite_members_gitignore() {
  awk -v begin="$ms_begin" -v end="$ms_end" -v list="$1/.sdlc/members.list" '
    !inblk && $0 == begin {
      print
      while ((getline line < list) > 0) print line "/"
      inblk = 1; next
    }
    inblk { if ($0 == end) { print; inblk = 0 } next }
    { print }
  ' "$1/.gitignore" > "$1/.gitignore.new" && mv "$1/.gitignore.new" "$1/.gitignore"
}
mkdir -p "$TMP/frontend" "$TMP/backend"
for m in frontend backend; do
  git -C "$TMP/$m" init -q -b main
  git -C "$TMP/$m" config user.email test@example.com
  git -C "$TMP/$m" config user.name tester
done
wfile docs/tickets/0002-act-gate.md <<'EOF'
---
id: 0002
type: feature
spec: 0001
status: in-progress
blocked-by: []
created: 2026-10-29
---
# 0002: 重跑三幕夹具工单

## Progress
- 夹具
EOF
mscan "$TMP" > "$TMP/.sdlc/members.list"     # 初装清单：按扫描顺序
{
  printf '*.log\n\n'
  printf '%s\n' "$ms_begin"
  sed 's#$#/#' "$TMP/.sdlc/members.list"
  printf '%s\n' "$ms_end"
} > "$TMP/.gitignore"
install_member_hook "$TMP/frontend"
install_member_hook "$TMP/backend"
apply_member_sentinel frontend
apply_member_sentinel backend

echo "-- 幕一：新增 clone 重跑 → 列候选、确认后入册、清单更新，门禁与哨兵和初始成员完全一致 --"
git init -q -b main "$TMP/.gateway-origin"  # 上游放点目录：扫描必须跳过
git -C "$TMP/.gateway-origin" config user.email test@example.com
git -C "$TMP/.gateway-origin" config user.name tester
echo gw > "$TMP/.gateway-origin/gw.txt"
git -C "$TMP/.gateway-origin" add gw.txt
git -C "$TMP/.gateway-origin" commit -qm init
git clone -q "$TMP/.gateway-origin" "$TMP/gateway"
t "重跑求差：gateway 列为新增候选、点目录上游不入候选" 0 "[ \"\$(mdiff_new \"$TMP\")\" = gateway ]" ""
t "重跑求差：此刻无缺失成员" 0 "[ -z \"\$(mdiff_missing \"$TMP\")\" ]" ""
# 用户确认入册（决策 4 默认全入册）→ 补装门禁与哨兵 + 清单与标记段整体重写
install_member_hook "$TMP/gateway"
apply_member_sentinel gateway
mscan "$TMP" > "$TMP/.sdlc/members.list"
ms_rewrite_members_gitignore "$TMP"
t "确认后清单按扫描顺序整体重写：backend/frontend/gateway 各一行" 0 "printf 'backend\nfrontend\ngateway\n' | diff - .sdlc/members.list" ""
t "gateway 门禁与初始成员逐字节一致（同一转发模板）" 0 "cmp \"$TMP/frontend/.git/hooks/commit-msg\" \"$TMP/gateway/.git/hooks/commit-msg\"" ""
sed 's/frontend/M/g' "$TMP/frontend/AGENTS.md" > "$TMP/fe.norm"
sed 's/gateway/M/g' "$TMP/gateway/AGENTS.md" > "$TMP/gw.norm"
t "gateway 哨兵与初始成员仅差目录名" 0 "diff \"$TMP/fe.norm\" \"$TMP/gw.norm\"" ""
echo gw2 > "$TMP/gateway/gw2.txt"; git -C "$TMP/gateway" add gw2.txt
t "gateway 提交引用 in-progress 工单放行（补装门禁即刻生效）" 0 "git -C $TMP/gateway commit -qm '[#0002] gateway in'" "门禁通过"
echo gw3 > "$TMP/gateway/gw3.txt"; git -C "$TMP/gateway" add gw3.txt
t "gateway 无引用非豁免提交同样被拦（与初始成员同规）" 1 "git -C $TMP/gateway commit -qm 'no tag'" "[#NNNN]"
t "标记段同步 gateway/ 且 begin/end 恰一对" 0 "[ \"\$(grep -c '^# sdlc:members' \"$TMP/.gitignore\")\" = 2 ] && grep -qx 'gateway/' \"$TMP/.gitignore\"" ""
t "用户自有行跨重写保留（*.log 仍在段外首行）" 0 "head -n 1 \"$TMP/.gitignore\" | grep -qx '*.log'" ""

echo "-- 幕二：成员目录消失 → 报告缺失、未确认前清单不动、确认后才移出 --"
rm -rf "$TMP/backend"
cp "$TMP/.sdlc/members.list" "$TMP/manifest.before"
cp "$TMP/.gitignore" "$TMP/gitignore.before"
t "重跑求差：消失成员 backend 被点名报缺失" 0 "[ \"\$(mdiff_missing \"$TMP\")\" = backend ]" ""
# 用户拒绝确认（沉默/拒绝）→ 重跑流程在此停住，不做任何写入
t "未确认前清单一字不动" 0 "diff \"$TMP/manifest.before\" \"$TMP/.sdlc/members.list\"" ""
t "未确认前 .gitignore 一字不动（backend/ 仍在段内）" 0 "diff \"$TMP/gitignore.before\" \"$TMP/.gitignore\" && grep -qx 'backend/' \"$TMP/.gitignore\"" ""
# 用户显式确认移出 → 清单与标记段整体重写
mscan "$TMP" > "$TMP/.sdlc/members.list"
ms_rewrite_members_gitignore "$TMP"
t "确认后清单移出 backend（frontend/gateway 各一行）" 0 "printf 'frontend\ngateway\n' | diff - .sdlc/members.list" ""
t "确认后标记段同步移出 backend/" 1 "grep -qx 'backend/' \"$TMP/.gitignore\"" ""

echo "-- 幕三：既有成员重跑 → 幂等重装无重复追加 --"
for m in frontend gateway; do
  cp "$TMP/$m/.git/hooks/commit-msg" "$TMP/$m.hook.before"
  cp "$TMP/$m/AGENTS.md" "$TMP/$m.agents.before"
done
cp "$TMP/.sdlc/members.list" "$TMP/manifest.before"
cp "$TMP/.gitignore" "$TMP/gitignore.before"
t "重跑求差：零新增零缺失（纯幂等重装前提）" 0 "[ -z \"\$(mdiff_new \"$TMP\")\" ] && [ -z \"\$(mdiff_missing \"$TMP\")\" ]" ""
install_member_hook "$TMP/frontend"
install_member_hook "$TMP/gateway"
apply_member_sentinel frontend
apply_member_sentinel gateway
mscan "$TMP" > "$TMP/.sdlc/members.list"
ms_rewrite_members_gitignore "$TMP"
t "幂等重装：frontend hook 零变化" 0 "cmp \"$TMP/frontend.hook.before\" \"$TMP/frontend/.git/hooks/commit-msg\"" ""
t "幂等重装：gateway hook 零变化" 0 "cmp \"$TMP/gateway.hook.before\" \"$TMP/gateway/.git/hooks/commit-msg\"" ""
t "幂等重装：frontend 哨兵零变化" 0 "cmp \"$TMP/frontend.agents.before\" \"$TMP/frontend/AGENTS.md\"" ""
t "幂等重装：gateway 哨兵零变化" 0 "cmp \"$TMP/gateway.agents.before\" \"$TMP/gateway/AGENTS.md\"" ""
t "幂等重装：清单零变化" 0 "diff \"$TMP/manifest.before\" \"$TMP/.sdlc/members.list\"" ""
t "幂等重装：.gitignore 零变化无重复追加" 0 "diff \"$TMP/gitignore.before\" \"$TMP/.gitignore\"" ""
t "标记段内成员行各恰一次" 0 "[ \"\$(grep -cx 'frontend/' \"$TMP/.gitignore\")\" = 1 ] && [ \"\$(grep -cx 'gateway/' \"$TMP/.gitignore\")\" = 1 ]" ""

echo "== 复原幕：新环境 clone 根仓与成员后重跑零询问（FR-8）=="
# 原型工作区装满后整体提交，clone 出"新环境"：根仓自带 .sdlc/docs/成员清单，成员哨兵
# 随提交走，hooks 不随 clone 传递——重跑的幂等重装是刚需而非摆设。清单命中成员视为
# 已确认（决策 4 复原零询问），求差零新增零缺失即零询问的机械前提。
new_repo
mkdir -p "$TMP/frontend" "$TMP/backend"
for m in frontend backend; do
  git -C "$TMP/$m" init -q -b main
  git -C "$TMP/$m" config user.email test@example.com
  git -C "$TMP/$m" config user.name tester
  echo base > "$TMP/$m/base.txt"
  git -C "$TMP/$m" add base.txt
  git -C "$TMP/$m" commit -qm init
done
wfile docs/tickets/0002-restore-gate.md <<'EOF'
---
id: 0002
type: feature
spec: 0001
status: in-progress
blocked-by: []
created: 2026-10-29
---
# 0002: 复原幕夹具工单

## Progress
- 夹具
EOF
mscan "$TMP" > "$TMP/.sdlc/members.list"
{
  printf '*.log\n\n'
  printf '%s\n' "$ms_begin"
  sed 's#$#/#' "$TMP/.sdlc/members.list"
  printf '%s\n' "$ms_end"
} > "$TMP/.gitignore"
install_member_hook "$TMP/frontend"
install_member_hook "$TMP/backend"
apply_member_sentinel frontend
apply_member_sentinel backend
git -C "$TMP" add .sdlc docs .gitignore
git -C "$TMP" commit -qm "[trivial] 工作区原型"
git -C "$TMP/frontend" add AGENTS.md && git -C "$TMP/frontend" commit -qm "[trivial] sentinel"
git -C "$TMP/backend" add AGENTS.md && git -C "$TMP/backend" commit -qm "[trivial] sentinel"
RESTORE="$TMP/restore"
git clone -q "$TMP" "$RESTORE"
git clone -q "$TMP/frontend" "$RESTORE/frontend"
git clone -q "$TMP/backend" "$RESTORE/backend"
t "克隆根自带 check.sh 与成员清单（清单命中即复原前提）" 0 "test -x \"$RESTORE/.sdlc/check.sh\" && grep -q frontend \"$RESTORE/.sdlc/members.list\"" ""
t "克隆起点：根与成员均无 sdlc hook（hooks 不随 clone 传递，重装是刚需）" 0 "test ! -f \"$RESTORE/.git/hooks/commit-msg\" && test ! -f \"$RESTORE/frontend/.git/hooks/commit-msg\" && test ! -f \"$RESTORE/backend/.git/hooks/commit-msg\"" ""
t "复原求差：零新增零缺失——全程零重复询问的机械前提" 0 "[ -z \"\$(mdiff_new \"$RESTORE\")\" ] && [ -z \"\$(mdiff_missing \"$RESTORE\")\" ]" ""
# 清单命中成员视为已确认（决策 4 复原零询问）：直接幂等重装，无任何确认交互
install_member_hook "$RESTORE/frontend"
install_member_hook "$RESTORE/backend"
apply_member_sentinel frontend "$RESTORE"
apply_member_sentinel backend "$RESTORE"
printf '#!/bin/sh\n# sdlc-managed: forward\nexec "$(git rev-parse --show-toplevel)/.sdlc/check.sh" commit-msg "$@"\n' > "$RESTORE/.git/hooks/commit-msg"
chmod +x "$RESTORE/.git/hooks/commit-msg"
echo r > "$RESTORE/frontend/restored.txt"; git -C "$RESTORE/frontend" add restored.txt
t "重装后成员提交过门禁：工单随根 clone 而来，ROOT 锚定复原根" 0 "git -C $RESTORE/frontend commit -qm '[#0002] restored'" "门禁通过"
t "复原哨兵幂等：克隆携带的 AGENTS.md 重装零变化" 0 "cmp \"$TMP/frontend/AGENTS.md\" \"$RESTORE/frontend/AGENTS.md\"" ""
t "复原根自身提交过自身转发 hook" 0 "git -C $RESTORE commit -q --allow-empty -m '[trivial] restore probe'" "豁免"
t "check.sh phase 正常输出（FR-8 自检：clone 来的工单可见）" 0 "cd \"$RESTORE\" && ./.sdlc/check.sh phase" "0002-restore-gate"

echo "== 过程档 gitignore 行为（seam 1）=="
new_repo
printf 'docs/tickets/\ndocs/reviews/\ndocs/acceptance/\n' >> "$TMP/.gitignore"
# check-ignore 的目录级模式（尾斜杠）只命中磁盘上真实存在的目录，空目录也要先建出来
mkdir -p "$TMP/docs/reviews" "$TMP/docs/acceptance"
# 真实仓库中 docs/ 知识档是被跟踪的：先入库一张知识档做基线，
# 否则整个 docs/ 未跟踪会被 status 折叠为 `?? docs/`，两层行为都观测不到
wfile docs/needs/0001-tier-contrast.md <<'EOF'
---
id: 0001
status: confirmed
created: 2026-10-29
---
# 忽略行为对照 need

## 背景与业务目标
测试夹具。
EOF
git -C "$TMP" add docs/needs/0001-tier-contrast.md
git -C "$TMP" commit -qm "[trivial] fixture 知识档进库基线"
wfile docs/needs/0002-tier-contrast-new.md <<'EOF'
---
id: 0002
status: draft
created: 2026-10-29
---
# 忽略行为对照 need（新建）

## 背景与业务目标
测试夹具。
EOF
wfile docs/tickets/0001-swept-ticket.md <<'EOF'
---
id: 0001
type: feature
spec: 0001
status: in-progress
blocked-by: []
created: 2026-10-29
---
# 0001: 过程档忽略行为夹具工单

## Progress
- 测试夹具。
EOF
tn "过程档新建票不进 git status" 0 "git status --porcelain" "docs/tickets"
t "check-ignore 命中 docs/tickets" 0 "git check-ignore -q docs/tickets" ""
t "check-ignore 命中 docs/reviews" 0 "git check-ignore -q docs/reviews" ""
t "check-ignore 命中 docs/acceptance" 0 "git check-ignore -q docs/acceptance" ""
t "知识档新建文件照常入 git status" 0 "git status --porcelain" "docs/needs"

echo "== repos 字段校验（FR-9，seam 三）=="
new_repo
printf 'frontend\nbackend\n' > "$TMP/.sdlc/members.list"
wfile docs/specs/0001-checkout.md <<'EOF'
---
id: 0001
status: approved
created: 2026-10-29
---
# 结账规格

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
wfile docs/tickets/0001-cross-repo.md <<'EOF'
---
id: 0001
type: feature
spec: 0001
status: ready
blocked-by: []
repos: [frontend, backend]
created: 2026-10-29
---
# 0001: 跨仓库工单

**做什么：** x

**验收标准：**
- [ ] x

**Blocked by：** 无

## Progress
尚未开工
EOF
t "repos 两值均在清单通过" 0 "check.sh validate docs/tickets/0001-cross-repo.md" "通过"
setfm docs/tickets/0001-cross-repo.md repos "[frontend, ios]"
t "repos 含清单外值报错点名" 1 "check.sh validate docs/tickets/0001-cross-repo.md" "ios"
setfm docs/tickets/0001-cross-repo.md repos "[]"
t "repos 空列表不触发校验" 0 "check.sh validate docs/tickets/0001-cross-repo.md" "通过"
setfm docs/tickets/0001-cross-repo.md repos "[frontend]"
mv "$TMP/.sdlc/members.list" "$TMP/.sdlc/members.list.bak"
t "成员清单缺失时 repos 非空报错不静默" 1 "check.sh validate docs/tickets/0001-cross-repo.md" "成员清单"
mv "$TMP/.sdlc/members.list.bak" "$TMP/.sdlc/members.list"
wfile docs/tickets/0002-multiline-repos.md <<'EOF'
---
id: 0002
type: feature
spec: 0001
status: ready
blocked-by: []
repos:
  - frontend
created: 2026-10-29
---
# 0002: 多行 repos

**做什么：** x

**验收标准：**
- [ ] x

**Blocked by：** 无

## Progress
尚未开工
EOF
t "多行 repos 拒绝（单行字段形态，先例 blocked-by）" 1 "check.sh validate docs/tickets/0002-multiline-repos.md" "repos 须单行"

echo "== 双份文档资产逐字一致（活本 vs 生成资产）=="
ROOT="$HERE/../../.."
t "两份 METHOD.md 逐字一致" 0 "diff \"$ROOT/docs/METHOD.md\" \"$HERE/../assets/METHOD.md\""
t "两份 GLOSSARY.md 逐字一致" 0 "diff \"$ROOT/GLOSSARY.md\" \"$HERE/../assets/GLOSSARY.md\""
t "两份 check.sh 逐字一致" 0 "diff \"$ROOT/.sdlc/check.sh\" \"$CHECK\""

echo "== 过程档 gitignore 生成面文本契约（seam 2）=="
new_repo
GEN="$HERE/../references/generation.md"
SKILL="$HERE/../../setup-workspace/SKILL.md"
mkdir -p "$TMP/txt"
awk '/^### \.gitignore/{f=1;next} /^### |^## /{f=0} f' "$GEN" > "$TMP/txt/gen-gitignore.md"
t "generation.md 含 .gitignore 节" 0 "test -s \"$TMP/txt/gen-gitignore.md\"" ""
t "忽略行 docs/tickets/ 确切写法成文" 0 "grep -qx 'docs/tickets/' \"$TMP/txt/gen-gitignore.md\"" ""
t "忽略行 docs/reviews/ 确切写法成文" 0 "grep -qx 'docs/reviews/' \"$TMP/txt/gen-gitignore.md\"" ""
t "忽略行 docs/acceptance/ 确切写法成文" 0 "grep -qx 'docs/acceptance/' \"$TMP/txt/gen-gitignore.md\"" ""
oseq ".gitignore 节按序成文：确切写法在前、每行先 grep 后追加、已有内容一行不动、不设标记块在后" "$TMP/txt/gen-gitignore.md" "docs/tickets/" "grep" "一行不动" "标记块"
t "幂等语义锚定 spec 措辞：每行先 grep 后追加" 0 "grep -q '先 grep 后追加' \"$TMP/txt/gen-gitignore.md\"" ""
awk '/^## 4\. /{f=1} f' "$GEN" > "$TMP/txt/report.md"
t "收尾报告模板含 .gitignore 行（三条落点齐备）" 0 "grep -q '\.gitignore' \"$TMP/txt/report.md\" && grep -q 'docs/tickets/' \"$TMP/txt/report.md\" && grep -q 'docs/acceptance/' \"$TMP/txt/report.md\"" ""
awk '/^\| `\.gitignore\`/{f=1} f' "$SKILL" > "$TMP/txt/skill-gitignore-row.md"
t "SKILL §3 生成表含 .gitignore 行（幂等追加、已有内容不动、指向 generation.md）" 0 "grep -q '幂等追加' \"$TMP/txt/skill-gitignore-row.md\" && grep -q '一行不动' \"$TMP/txt/skill-gitignore-row.md\" && grep -q 'generation.md' \"$TMP/txt/skill-gitignore-row.md\"" ""
awk '/^## 禁止事项/{f=1} f' "$SKILL" > "$TMP/txt/skill-forbidden.md"
t "禁止事项改为只禁三行以外内容（新表述成文，成员标记段例外保留）" 0 "grep -q '过程档忽略三行以外的任何内容' \"$TMP/txt/skill-forbidden.md\" && grep -q '唯一例外' \"$TMP/txt/skill-forbidden.md\"" ""
tn "SKILL.md 全文不再含旧句「往 .gitignore 加任何流程产物」" 0 "cat \"$SKILL\"" "往 .gitignore 加任何流程产物"

echo
echo "通过 $PASS / 失败 $FAIL"
[ "$FAIL" = 0 ] && echo "ALL PASSED"
exit "$FAIL"
