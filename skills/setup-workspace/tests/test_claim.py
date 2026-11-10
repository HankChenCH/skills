# 试点迁移：claim 子命令族（spec 20261110-d145 批 1，工票 20261110-cf8f）。
#
# 源节：run-tests.sh:2934-3073「取号入口 claim（原子占号，spec 0017，票 0038）」
# 与「claim 支持 retro 类型（轻产物纳入取号机制，spec 0017，票 0041）」，共 25 条
# 助手调用（t 24 + tn 1）。每条旧用例直译为一个测试函数，函数名内嵌源行号
# （test_<行号>_<行为描述>）供等价索引与双跑对照逐条对号；断言期望值一律取
# 旧套件字面量（退出码、子串、正则、od 序列），不做重算。
#
# 旧套件 claim 节共享一个 new_repo 夹具、状态跨用例累积；此处每条用例在
# function 级全新夹具上重放「节 setup（claim_env）+ 本用例私有 setup」，
# 逐条核验过不依赖前序用例副作用。

from __future__ import annotations

import subprocess
from datetime import date

import pytest

from conftest import CheckRepo

TODAY = date.today().strftime("%Y%m%d")

# 节 setup 直译（run-tests.sh:2936-2991 字面）：锚点 spec、锚点工票、tracker map。
ANCHOR_SPEC = """---
id: 0001
status: approved
need: 0001
round: 1
created: 2026-11-04
---
# 锚点规格

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
"""

ANCHOR_TICKET = """---
id: 0009
type: feature
spec: 0001
status: in-progress
blocked-by: []
created: 2026-11-04
---
# 0009: 锚点工单

**做什么：** 过程档父产物夹具

**验收标准：**
- [ ] x

**Blocked by：** 无

## Progress
实现中
"""

NO_ID_SPEC = """---
status: approved
need: 0001
round: 1
created: 2026-11-04
---
# 无 id 夹具规格

frontmatter 缺 id 字段
"""

BAD_ID_SPEC = """---
id: 0013-swept
status: approved
need: 0001
round: 1
created: 2026-11-04
---
# 坏 id 夹具规格

frontmatter id 带尾段（非规整键不动点）
"""

NAKED_RETRO = """# 复盘草稿

没有 frontmatter，也没有任何门禁模板节。
"""


@pytest.fixture()
def claim_env(repo: CheckRepo) -> CheckRepo:
    """claim 节共享 setup（run-tests.sh:2936-2991）：锚点产物 + github.map。"""
    repo.wfile("docs/specs/0001-anchor.md", ANCHOR_SPEC)
    repo.wfile("docs/tickets/0009-anchor-ticket.md", ANCHOR_TICKET)
    repo.wfile(
        ".sdlc/trackers/github.map",
        "docs/specs/0001-anchor.md\t41\thttps://github.com/acme/widget/issues/41\n"
        "docs/tickets/0009-anchor-ticket.md\t87\thttps://github.com/acme/widget/issues/87\n",
    )
    return repo


# 旧 fake_cmd od（run-tests.sh:3000-3013）：从 CLAIM_OD_SEQ 逐行弹出随机段，
# 耗尽后恒输出 dead。需要重掷语义的用例各自装配。
FAKE_OD = """#!/bin/sh
# 测试替身 od：从 CLAIM_OD_SEQ 逐行弹出随机段；耗尽后恒输出 dead
seqfile="${CLAIM_OD_SEQ:-}"
if [ -n "$seqfile" ] && [ -f "$seqfile" ]; then
  n="$(sed -n '1p' "$seqfile")"
  if [ -n "$n" ]; then
    sed -i.bak 1d "$seqfile" && rm -f "$seqfile.bak"
    printf '%s\\n' "$n"
    exit 0
  fi
fi
printf 'dead\\n'
"""


def _plant_parked(repo: CheckRepo, slug: str, odseq: str, retro: bool = False) -> None:
    """用例私有 setup（run-tests.sh:3014-3016 字面）：撞号占位 + od 序列。"""
    d = "docs/retros" if retro else "docs/tickets"
    repo.wfile(f"{d}/{TODAY}-b7c1-{slug}.md", "")
    repo.wfile(odseq, "b7c1\na1f2\n")


def test_2992_父为_spec_的取号返回带谱系前缀文件名且占位落盘(claim_env: CheckRepo):
    claim_env.t(
        "父为 spec 的取号返回带谱系前缀文件名且占位落盘", 0,
        "out=$(check.sh claim ticket dark-mode spec 0001); "
        "echo \"$out\" | grep -qE '^docs/tickets/spec0001-[0-9]{8}-[0-9a-f]{4}-dark-mode\\.md$' "
        "&& [ -f \"$out\" ]",
    )


def test_2993_父为工票的取号返回不带前缀文件名(claim_env: CheckRepo):
    claim_env.t(
        "父为工票的取号返回不带前缀文件名", 0,
        "out=$(check.sh claim review notes ticket 0009); "
        "echo \"$out\" | grep -qE '^docs/reviews/[0-9]{8}-[0-9a-f]{4}-notes\\.md$'",
    )


def test_2994_无父参数取号返回无前缀文件名(claim_env: CheckRepo):
    claim_env.t(
        "无父参数取号返回无前缀文件名", 0,
        "out=$(check.sh claim adr cache-note); "
        "echo \"$out\" | grep -qE '^docs/adr/[0-9]{8}-[0-9a-f]{4}-cache-note\\.md$'",
    )


def test_2995_号形如_YYYYMMDD_4hex_FR_1_格式契约(claim_env: CheckRepo):
    claim_env.t(
        "号形如 YYYYMMDD-4hex（FR-1 格式契约）", 0,
        "out=$(check.sh claim research gateway-probe); "
        "basename \"$out\" .md | grep -qE '^[0-9]{8}-[0-9a-f]{4}-gateway-probe$'",
    )


def test_2996_父产物不存在时取号报错(claim_env: CheckRepo):
    claim_env.t("父产物不存在时取号报错", 1, "check.sh claim ticket dark-mode spec 9999", "不存在")


def test_2997_父类型未知时取号报错(claim_env: CheckRepo):
    claim_env.t("父类型未知时取号报错", 1, "check.sh claim ticket dark-mode bogus 0001", "未知")


def test_2998_slug_非法时取号报错(claim_env: CheckRepo):
    claim_env.t("slug 非法时取号报错", 1, "check.sh claim ticket Bad_Slug", "slug")


def test_2999_产物类型未知时取号报错(claim_env: CheckRepo):
    claim_env.t("产物类型未知时取号报错", 1, "check.sh claim bogus x", "未知")


def test_3017_候选号占位已存在时重掷随机段返回新号_FR_2_撞号重试(claim_env: CheckRepo):
    env = claim_env
    env.fake_cmd("od", FAKE_OD)
    _plant_parked(env, "parked-slug", "odseq")
    env.t(
        "候选号占位已存在时重掷随机段返回新号（FR-2 撞号重试）", 0,
        "CLAIM_OD_SEQ=\"$TMP/odseq\" PATH=\"$TMP/fakebin:$PATH\" "
        "check.sh claim ticket parked-slug | "
        "grep -qE '^docs/tickets/[0-9]{8}-a1f2-parked-slug\\.md$'",
    )


def test_3018_并发六路取号各得两两互异的号_FR_2_零协调(claim_env: CheckRepo):
    claim_env.t(
        "并发六路取号各得两两互异的号（FR-2 零协调）", 0,
        "for i in 1 2 3 4 5 6; do check.sh claim ticket fan-out >\"fan$i.out\" & done; wait; "
        "[ \"$(cat fan1.out fan2.out fan3.out fan4.out fan5.out fan6.out | sort -u | wc -l | tr -d ' ')\" = 6 ] "
        "&& [ \"$(cat fan1.out fan2.out fan3.out fan4.out fan5.out fan6.out | wc -l | tr -d ' ')\" = 6 ]",
    )


def test_3019_目录与_map_不变时两次取号互异且不入历史号_FR_1_非推导(claim_env: CheckRepo):
    env = claim_env
    env.fake_cmd("od", FAKE_OD)
    env.wfile("odseq2", "b7c1\na1f2\nc9d8\ne7f6\n")
    env.t(
        "目录与 map 不变时两次取号互异且不入历史号（FR-1 非推导）", 0,
        "pre=$(cksum docs/specs/0001-anchor.md docs/tickets/0009-anchor-ticket.md .sdlc/trackers/github.map | cksum); "
        "c1=$(CLAIM_OD_SEQ=\"$TMP/odseq2\" PATH=\"$TMP/fakebin:$PATH\" check.sh claim ticket probe-a); "
        "c2=$(CLAIM_OD_SEQ=\"$TMP/odseq2\" PATH=\"$TMP/fakebin:$PATH\" check.sh claim ticket probe-b); "
        "post=$(cksum docs/specs/0001-anchor.md docs/tickets/0009-anchor-ticket.md .sdlc/trackers/github.map | cksum); "
        "[ \"$pre\" = \"$post\" ] && [ \"$c1\" != \"$c2\" ] "
        "&& ! grep -qF \"$(basename \"$c1\" .md | grep -oE '[0-9]{8}-[0-9a-f]{4}')\" .sdlc/trackers/github.map "
        "&& ! grep -qF \"$(basename \"$c2\" .md | grep -oE '[0-9]{8}-[0-9a-f]{4}')\" .sdlc/trackers/github.map",
    )


def test_3021_同_ID_异_slug_取号重掷两票_ID_段互异_FR_2_不限定同_slug(claim_env: CheckRepo):
    env = claim_env
    env.fake_cmd("od", FAKE_OD)
    env.wfile("odseq3", "a1b2\na1b2\nc3d4\n")
    env.t(
        "同 ID 异 slug 取号重掷，两票 ID 段互异（FR-2 不限定同 slug）", 0,
        "a=$(CLAIM_OD_SEQ=\"$TMP/odseq3\" PATH=\"$TMP/fakebin:$PATH\" check.sh claim ticket alpha); "
        "case \"$a\" in *a1b2-alpha.md) ;; *) exit 9 ;; esac; "
        "b=$(CLAIM_OD_SEQ=\"$TMP/odseq3\" PATH=\"$TMP/fakebin:$PATH\" check.sh claim ticket beta); "
        "case \"$b\" in *c3d4-beta.md) ;; *) exit 8 ;; esac",
    )


def test_3023_带前缀取号先占后无前缀同掷重掷_ID_键跨前缀唯一(claim_env: CheckRepo):
    env = claim_env
    env.fake_cmd("od", FAKE_OD)
    env.wfile("odseq4", "d5e6\nd5e6\nf7a8\n")
    env.t(
        "带前缀取号先占后，无前缀同掷重掷（ID 键跨前缀唯一）", 0,
        "p=$(CLAIM_OD_SEQ=\"$TMP/odseq4\" PATH=\"$TMP/fakebin:$PATH\" check.sh claim ticket pre-anchored spec 0001); "
        "case \"$p\" in docs/tickets/spec0001-*d5e6-pre-anchored.md) ;; *) exit 9 ;; esac; "
        "q=$(CLAIM_OD_SEQ=\"$TMP/odseq4\" PATH=\"$TMP/fakebin:$PATH\" check.sh claim ticket solo-slug); "
        "case \"$q\" in *f7a8-solo-slug.md) ;; *) exit 8 ;; esac",
    )


def test_3025_无前缀取号先占后带前缀同掷重掷_ID_键跨前缀唯一反向(claim_env: CheckRepo):
    env = claim_env
    env.fake_cmd("od", FAKE_OD)
    env.wfile("odseq5", "b9c8\nb9c8\nd7e6\n")
    env.t(
        "无前缀取号先占后，带前缀同掷重掷（ID 键跨前缀唯一反向）", 0,
        "u=$(CLAIM_OD_SEQ=\"$TMP/odseq5\" PATH=\"$TMP/fakebin:$PATH\" check.sh claim ticket solo-two); "
        "case \"$u\" in docs/tickets/*b9c8-solo-two.md) ;; *) exit 9 ;; esac; "
        "v=$(CLAIM_OD_SEQ=\"$TMP/odseq5\" PATH=\"$TMP/fakebin:$PATH\" check.sh claim ticket pre-two spec 0001); "
        "case \"$v\" in docs/tickets/spec0001-*d7e6-pre-two.md) ;; *) exit 8 ;; esac",
    )


def test_3026_claim_三参数_漏父_ID_拒绝_不静默丢参按无父取号(claim_env: CheckRepo):
    claim_env.t("claim 三参数（漏父 ID）拒绝，不静默丢参按无父取号", 1, "check.sh claim ticket dark-mode spec", "用法")


def test_3027_claim_五参数拒绝_不静默忽略多余参数(claim_env: CheckRepo):
    claim_env.t("claim 五参数拒绝，不静默忽略多余参数", 1, "check.sh claim ticket dark-mode spec 0001 extra", "用法")


def test_3030_同日被清扫产物的历史_ID_不复用_map_持久行_FR_1_场景_1(claim_env: CheckRepo):
    env = claim_env
    env.fake_cmd("od", FAKE_OD)
    with (env.root / ".sdlc/trackers/github.map").open("a", encoding="utf-8") as fh:
        fh.write(f"docs/tickets/{TODAY}-9a8b-swept-old.md\t141\thttps://github.com/acme/widget/issues/141\n")
    env.wfile("odseq6", "9a8b\nc5d6\n")
    env.t(
        "同日被清扫产物的历史 ID 不复用（map 持久行，FR-1 场景 1）", 0,
        "s=$(CLAIM_OD_SEQ=\"$TMP/odseq6\" PATH=\"$TMP/fakebin:$PATH\" check.sh claim ticket swept-slug); "
        "case \"$s\" in *c5d6-swept-slug.md) ;; *) exit 8 ;; esac",
    )


def test_3033_仅存于_git_历史引用的_ID_不复用_FR_1_git_历史来源(claim_env: CheckRepo):
    env = claim_env
    env.fake_cmd("od", FAKE_OD)
    # run-tests.sh:3031：历史引用夹具提交（ID 7e2f 仅存在于 commit message）
    subprocess.run(["git", "add", "-A"], cwd=env.root, check=True)
    subprocess.run(
        ["git", "commit", "-qm", f"[#{TODAY}-7e2f] 历史引用夹具（产物已清扫，仅存于 git 历史）"],
        cwd=env.root, check=True,
    )
    env.wfile("odseq7", "7e2f\na3c5\n")
    env.t(
        "仅存于 git 历史引用的 ID 不复用（FR-1 git 历史来源）", 0,
        "w=$(CLAIM_OD_SEQ=\"$TMP/odseq7\" PATH=\"$TMP/fakebin:$PATH\" check.sh claim ticket git-hist); "
        "case \"$w\" in *a3c5-git-hist.md) ;; *) exit 8 ;; esac",
    )


def test_3057_父产物_frontmatter_id_缺失时取号报错(claim_env: CheckRepo):
    env = claim_env
    env.wfile("docs/specs/0012-noid.md", NO_ID_SPEC)
    env.t("父产物 frontmatter id 缺失时取号报错", 1, "check.sh claim ticket no-parent-probe spec 0012", "缺失或非法")


def test_3058_父产物_frontmatter_id_非法时取号报错(claim_env: CheckRepo):
    env = claim_env
    env.wfile("docs/specs/0013-badid.md", BAD_ID_SPEC)
    env.t("父产物 frontmatter id 非法时取号报错", 1, "check.sh claim ticket bad-parent-probe spec 0013", "缺失或非法")


def test_3061_claim_retro_返回_docs_retros_新格式文件名且占位落盘(claim_env: CheckRepo):
    claim_env.t(
        "claim retro 返回 docs/retros/ 新格式文件名且占位落盘", 0,
        "out=$(check.sh claim retro session-42); "
        "echo \"$out\" | grep -qE '^docs/retros/[0-9]{8}-[0-9a-f]{4}-session-42\\.md$' && [ -f \"$out\" ]",
    )


def test_3065_retro_候选号占位已存在时重掷随机段返回新号_FR_2_撞号重掷与既有_claim_一致(claim_env: CheckRepo):
    env = claim_env
    env.fake_cmd("od", FAKE_OD)
    _plant_parked(env, "retro-collide", "odseq-r1", retro=True)
    env.t(
        "retro 候选号占位已存在时重掷随机段返回新号（FR-2 撞号重掷与既有 claim 一致）", 0,
        "CLAIM_OD_SEQ=\"$TMP/odseq-r1\" PATH=\"$TMP/fakebin:$PATH\" "
        "check.sh claim retro retro-collide | "
        "grep -qE '^docs/retros/[0-9]{8}-a1f2-retro-collide\\.md$'",
    )


def test_3066_retro_并发六路取号各得两两互异的号_FR_2_零协调与既有_claim_一致(claim_env: CheckRepo):
    claim_env.t(
        "retro 并发六路取号各得两两互异的号（FR-2 零协调与既有 claim 一致）", 0,
        "for i in 1 2 3 4 5 6; do check.sh claim retro retro-fan >\"rfan$i.out\" & done; wait; "
        "[ \"$(cat rfan1.out rfan2.out rfan3.out rfan4.out rfan5.out rfan6.out | sort -u | wc -l | tr -d ' ')\" = 6 ] "
        "&& [ \"$(cat rfan1.out rfan2.out rfan3.out rfan4.out rfan5.out rfan6.out | wc -l | tr -d ' ')\" = 6 ]",
    )


def test_3072_validate_对_docs_retros_报无法识别产物类型_不受理即不进状态机(claim_env: CheckRepo):
    env = claim_env
    env.wfile("docs/retros/0001-naked-retro.md", NAKED_RETRO)
    env.t(
        "validate 对 docs/retros/ 报无法识别产物类型（不受理即不进状态机）", 1,
        "check.sh validate docs/retros/0001-naked-retro.md", "无法识别产物类型",
    )


def test_3073_retros_文件不触发产物模板校验_无_frontmatter_与必填节报错(claim_env: CheckRepo):
    env = claim_env
    env.wfile("docs/retros/0001-naked-retro.md", NAKED_RETRO)
    env.tn(
        "retros 文件不触发产物模板校验（无 frontmatter 与必填节报错）", 1,
        "check.sh validate docs/retros/0001-naked-retro.md", "缺 frontmatter",
    )
