# oseq 黄金样本回放（spec 20261110-d145 FR-7，工票 20261110-cf8f）。
#
# 期望值来自 oseq_golden/expected.json——旧套件 run-tests.sh 的 oseq 助手
# 对 cases.json 每组输入的真实运行输出（由 tools/generate_oseq_golden.py 生成，
# 生成过程不经任何 Python 重算）；本文件只做回放比对，逐组输出一致即
# Python 重写零语义漂移，不一致即红并呈现期望/实际全文。

from __future__ import annotations

import json
from pathlib import Path

import pytest

from conftest import oseq_text

GOLDEN_DIR = Path(__file__).resolve().parent / "oseq_golden"
CASES = json.loads((GOLDEN_DIR / "cases.json").read_text(encoding="utf-8"))["cases"]
EXPECTED = {
    r["id"]: r
    for r in json.loads((GOLDEN_DIR / "expected.json").read_text(encoding="utf-8"))["results"]
}


def test_golden_sample_count_at_least_20():
    assert len(CASES) >= 20
    assert set(EXPECTED) == {c["id"] for c in CASES}


@pytest.mark.parametrize("case", CASES, ids=[c["id"] for c in CASES])
def test_oseq_replay_matches_legacy_helper(case):
    """Python oseq_text 回放与旧 bash 助手对同一输入逐组输出一致。"""
    ok, message = oseq_text(case["txt"], case["words"])
    replayed = (
        f"ok: golden\n" if ok else f"FAIL: golden —— {message}\n"
    )
    golden = EXPECTED[case["id"]]
    assert replayed == golden["stdout"], (
        f"oseq 语义漂移（case {case['id']}）：\n"
        f"期望（旧助手）：{golden['stdout']!r}\n实际（Python）：{replayed!r}"
    )
    assert (0 if ok else 1) == golden["rc"], (
        f"oseq 退出码漂移（case {case['id']}）：期望 rc={golden['rc']}，实际 rc={0 if ok else 1}"
    )
