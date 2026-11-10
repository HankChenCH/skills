#!/usr/bin/env python
# 旧套件断言流数据面生成器（spec 20261110-d145 批 2，工票 20261110-897b）。
#
# 从旧套件 run-tests.sh 机械生成 tests/legacy_stream.py（冻结数据，勿手编）：
#   - STREAM：全部 529 条断言（t 443 + tn 32 + oseq 53 + 内联 1）按旧套件运行序排布。
#     每条 case 的参数字面（desc / want / cmd / substr / absent / file / words /
#     exec_lines）由批 1 已评审的等价索引解析器（equivalence_index.py）解码，逐字
#     取自旧套件源码，不经任何逻辑重算（ref-testing 同义反复禁令）。
#   - case.prelude：该断言之前、自上一条断言以来的旧套件源码行（逐字），含 new_repo
#     换夹具步骤。新套件执行时按原顺序回放，段内状态累积与旧套件逐行同构——
#     这是 115 条依赖前序 setup shell 变量的用例（如 $SCRATCH/$SKILL/$GUARD）在
#     「每命令独立 bash」口径下无法等价迁移的解法：持久 bash 会话（legacy_harness）。
#   - PREAMBLE：会话级 preamble 源行（set -u、HERE/CHECK/LOCAL、wfile/setfm/
#     fake_cmd 定义）。第 9 行 HERE 依赖 $0，在会话中由 harness 注入等值（tests 目录）。
#   - TAIL_DROPPED：套件尾部自报行（通过 N / ALL PASSED / exit），非断言面，不入流。
#
# 正确性核算（任一不满足即拒绝写盘）：
#   1. 解析计数 = spec 全集口径（443/32/53/1，总 529）；
#   2. 全文件行覆盖核算：每行恰被归类一次（头区 / preamble / new_repo / 断言行 /
#      内联断言块 / 夹缝块 / 尾部自报行），无遗漏无重复；
#   3. 行级助手识别（本生成器，heredoc 感知）与批 1 解析器（equivalence_index.py，
#      无 heredoc 逻辑）识别出的断言行集合完全一致——交叉校验互相兜底；
#   4. 内联断言块形态核验：out=/rc= 两行执行体 + if…fi 守卫壳，参数取自 parse_inline；
#   5. 再生成幂等：对已生成文件零 diff 即审计通过。
#
# 用法：uv run python tools/generate_legacy_stream.py

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent.parent
TOOLS_DIR = TESTS_DIR / "tools"
SUITE = TESTS_DIR / "run-tests.sh"
OUT_PATH = TESTS_DIR / "legacy_stream.py"

sys.path.insert(0, str(TOOLS_DIR))
from equivalence_index import (  # noqa: E402
    EXPECTED,
    INLINE_OUT_RE,
    parse_calls,
    parse_inline,
    parse_word_spans,
    parse_words,
)

# 头区边界：1-132 行为 shebang/助手定义/new_repo 定义（harness 以等价 Python 实装，
# 见 conftest.build_fixture_repo——批 1 已评审的逐行直译）；断言流自 133 行起。
STREAM_START = 133

NEW_REPO_RE = re.compile(r"^new_repo\s*(?:#.*)?$")
HEADER_RE = re.compile(r'^echo "== (.*)=="\s*$')
HEREDOC_OPEN_RE = re.compile(r"<<-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\1")

# Preamble 取行（1 基）：set -u；HERE（harness 注入）；CHECK；LOCAL；PASS/FAIL/TMP；
# wfile/setfm/fake_cmd 定义区。内容断言——套件源码位移即响亮报错。
PREAMBLE_LINES = [7, 9, 10, 11, 13, 14, 15] + list(range(63, 80))
PREAMBLE_EXACT = {
    7: "set -u",
    10: 'CHECK="$HERE/../assets/check.sh"',
    11: 'LOCAL="$HERE/../assets/trackers/local.sh"',
    13: "PASS=0",
    14: "FAIL=0",
    15: 'TMP=""',
}
PREAMBLE_PREFIX = {64: "wfile() {", 70: "setfm() {", 75: "fake_cmd() {"}

# 尾部自报行形态（非断言面；出现在末条断言之后即落入此处；空行一并放行）
TAIL_RE = re.compile(
    r'^(echo|echo "通过 \$PASS / 失败 \$FAIL"|\[ "\$FAIL" = 0 \] && echo "ALL PASSED"|exit "\$FAIL")?\s*$'
)


def walk(lines: list[str]) -> tuple[list[dict], list[tuple[int, str]], list[tuple[int, str]]]:
    """单遍行走：产出（断言流, 节标题横幅[(断言行, 标题)], 尾部自报行）。"""
    entries = {e["line"]: e for e in parse_calls("\n".join(lines))}
    inline = {e["line"]: e for e in parse_inline("\n".join(lines))}

    stream: list[dict] = []
    banners: list[tuple[int, str]] = []
    ledger: dict[int, str] = {}

    for n in range(1, STREAM_START):
        ledger[n] = "head"
    for n in PREAMBLE_LINES:
        assert ledger.get(n) == "head", f"preamble 行 {n} 与头区归类冲突"
        ledger[n] = "preamble"

    pending: list[tuple[int, str]] = []  # 自上一条断言以来的夹缝行 (line, text)
    pending_banner: str | None = None
    heredoc: str | None = None
    n = STREAM_START
    total = len(lines)
    while n <= total:
        line = lines[n - 1]
        if heredoc is not None:
            pending.append((n, line))
            ledger[n] = "chunk"
            if line.strip() == heredoc:
                heredoc = None
            n += 1
            continue
        if n in entries:
            entry = entries[n]
            case = {
                "id": f"run-tests.sh:{n}",
                "line": n,
                "kind": entry["kind"],
                "desc": entry["desc"],
                "prelude": _chunk_steps(pending),
            }
            if entry["kind"] == "t":
                case.update(
                    want=entry["want"],
                    cmd=entry["cmd"],
                    cmd_raw=_cmd_raw_span(lines[n - 1], entry),
                    substr=entry["substr"],
                )
            elif entry["kind"] == "tn":
                case.update(
                    want=entry["want"],
                    cmd=entry["cmd"],
                    cmd_raw=_cmd_raw_span(lines[n - 1], entry),
                    absent=entry["absent"],
                )
            else:  # oseq
                case.update(file=entry["file"], words=entry["words"])
            if pending_banner is not None:
                banners.append((n, pending_banner))
                pending_banner = None
            stream.append(case)
            ledger[n] = "call"
            pending = []
            n += 1
            continue
        if n in inline:
            # 内联断言块：out=/rc= 两行执行体逐字取走；if…fi 守卫壳由 pytest 断言替代。
            assert lines[n] == "rc=$?", f"run-tests.sh:{n}: 内联块第二行不是 rc=$?：{lines[n]!r}"
            guard_at = next(
                (m for m in range(n + 1, min(n + 6, total + 1)) if lines[m - 1].startswith("if [")),
                None,
            )
            fi_at = next(
                (m for m in range(guard_at, min(guard_at + 8, total + 1)) if lines[m - 1].strip() == "fi"),
                None,
            )
            assert guard_at and fi_at, f"run-tests.sh:{n}: 内联块守卫壳形态不符"
            entry = inline[n]
            case = {
                "id": f"run-tests.sh:{n}-inline",
                "line": n,
                "kind": "inline",
                "desc": entry["desc"],
                "want": entry["want"],
                "substr": entry["substr"],
                "exec_lines": [lines[n - 1], lines[n]],
                "prelude": _chunk_steps(pending),
            }
            if pending_banner is not None:
                banners.append((n, pending_banner))
                pending_banner = None
            stream.append(case)
            ledger[n] = "inline"
            ledger[n + 1] = "inline"
            for m in range(guard_at, fi_at + 1):
                ledger[m] = "inline"
            pending = []
            n = fi_at + 1
            continue
        if NEW_REPO_RE.match(line):
            pending.append((n, line))
            ledger[n] = "new_repo"
            n += 1
            continue
        m = HEADER_RE.match(line)
        if m:
            pending_banner = m.group(1).strip()
        pending.append((n, line))
        ledger[n] = "chunk"
        hm = HEREDOC_OPEN_RE.search(line)
        if hm:
            heredoc = hm.group(2)
        n += 1

    # 全文件覆盖核算：每行恰归类一次
    assert len(ledger) == total, f"行覆盖核算失败：归类 {len(ledger)} 行，源文件 {total} 行"
    # 交叉校验：heredoc 感知行走 与 批 1 解析器 对断言行的识别完全一致
    assert {c["line"] for c in stream} == set(entries) | set(inline), "行走与解析器断言行集合不一致"
    assert len(stream) == 529, f"断言流 {len(stream)} 条 != 529"

    # 尾部：末条断言之后的夹缝行只允许是自报行（非断言面，显式丢弃并记录）
    tail = list(pending)
    for pn, t in tail:
        assert TAIL_RE.match(t.strip()), f"run-tests.sh:{pn}: 末条断言后出现非自报行：{t!r}"
    return stream, banners, tail


def _cmd_raw_span(line: str, entry: dict) -> str:
    """t/tn 的 cmd 源码原始词文本（引号与转义保留）。

    旧套件调用点对双引号参数做一次展开（未转义 $VAR 传参时求值），解码静态字面
    无法区分「调用点已展开」与「留给 eval 展开」；重放须以原文交回 bash 按调用点
    语义展开，才能与旧套件的展开链逐字同构（工票 20261110-897b，883/888 实证）。
    """
    spans = parse_word_spans(line)
    words = parse_words(line)
    assert len(spans) == len(words), f"run-tests.sh:{entry['line']}: span/word 数不一致"
    # 交叉核验：span 重新解码 == parse_words 解码（两套分词器互证）
    for span, word in zip(spans, words):
        decoded = parse_words(span)
        assert decoded == [word], f"run-tests.sh:{entry['line']}: span 解码不一致：{span!r}"
    # words[0] 是助手名；cmd 是第 3 个参数（desc want cmd …）。
    # span 必须整体带引号（双/单）：赋值 RHS 无分词/glob 语义，带引号才能与调用点
    # 词法逐字一致（实测全集仅此两种形态）。
    assert spans[0] in ("t", "tn"), f"run-tests.sh:{entry['line']}: 首词不是助手名：{spans[0]!r}"
    assert spans[3][:1] in ('"', "'"), f"run-tests.sh:{entry['line']}: cmd span 未整体带引号：{spans[3]!r}"
    return spans[3]


def _chunk_steps(pending: list[tuple[int, str]]) -> list[dict]:
    """连续夹缝行 → 有序步骤列：纯块合并为单块；new_repo 行独立成步。"""
    steps: list[dict] = []
    cur_lines: list[str] = []
    start = pending[0][0] if pending else 0
    for ln, text in pending:
        if NEW_REPO_RE.match(text):
            if cur_lines:
                steps.append({"kind": "chunk", "line": start, "text": "\n".join(cur_lines)})
                cur_lines = []
            steps.append({"kind": "new_repo", "line": ln})
            start = ln + 1
        else:
            cur_lines.append(text)
    if cur_lines:
        steps.append({"kind": "chunk", "line": start, "text": "\n".join(cur_lines)})
    return steps


def build_preamble(lines: list[str]) -> list[dict]:
    preamble = []
    for n in PREAMBLE_LINES:
        text = lines[n - 1]
        if n in PREAMBLE_EXACT:
            assert text.rstrip() == PREAMBLE_EXACT[n], f"run-tests.sh:{n} 内容位移：{text!r}"
        if n in PREAMBLE_PREFIX:
            assert text.startswith(PREAMBLE_PREFIX[n]), f"run-tests.sh:{n} 内容位移：{text!r}"
        if n == 9:
            # HERE 依赖 $0（会话中 $0 不是套件路径），harness 注入等值
            preamble.append({"line": n, "kind": "here"})
            continue
        preamble.append({"line": n, "text": text})
    return preamble


def py_literal(value) -> str:
    """JSON 兼容子集（str/int/list/dict）→ Python 字面量（UTF-8 原样，可读）。"""
    return json.dumps(value, ensure_ascii=False)


def render(stream: list[dict], banners: dict[int, str], preamble: list[dict], tail: list[tuple[int, str]]) -> str:
    out: list[str] = []
    out.append("# 旧套件断言流数据面（生成文件——勿手编）。")
    out.append("# 由 tools/generate_legacy_stream.py 从 run-tests.sh 生成；再生成幂等（零 diff 即审计通过）。")
    out.append("#")
    out.append("# 参数字面逐字取自旧套件源码（等价索引解析器解码，零重算）；prelude 为断言前")
    out.append("# 夹缝中的旧套件源码行（逐字，含 new_repo 换夹具步骤），执行时按原序回放——段内")
    out.append("# 状态累积与旧套件同构（115 条用例依赖前序 setup 的 shell 变量，独立 bash 无法等价）。")
    out.append("# 执行体见 legacy_harness.py / test_migration.py；签名核验见 tools/verify_equivalence.py。")
    out.append("")
    out.append("# ── 会话 preamble（run-tests.sh 源行逐字；line 9 HERE 依赖 $0，由 harness 注入等值）──")
    out.append("PREAMBLE = [")
    for p in preamble:
        out.append(f"    {py_literal(p)},  # run-tests.sh:{p['line']}")
    out.append("]")
    out.append("")
    out.append("# ── 断言流：529 条（t 443 + tn 32 + oseq 53 + 内联 1），按旧套件运行序 ──")
    out.append("STREAM = [")
    for case in stream:
        banner = banners.get(case["line"])
        if banner is not None:
            out.append(f"    # ── {banner} ──")
        out.append(f"    {py_literal(case)},")
    out.append("]")
    out.append("")
    out.append("# ── 末条断言之后的自报行（非断言面，由双跑管线另行解析，不入流）──")
    out.append("TAIL_DROPPED = [")
    for ln, text in tail:
        out.append(f"    ({ln}, {py_literal(text)}),")
    out.append("]")
    out.append("")
    return "\n".join(out)


def main() -> int:
    text = SUITE.read_text(encoding="utf-8")
    lines = text.splitlines()

    helpers = parse_calls(text)
    inline = parse_inline(text)
    counts = {
        "t": sum(1 for e in helpers if e["kind"] == "t"),
        "tn": sum(1 for e in helpers if e["kind"] == "tn"),
        "oseq": sum(1 for e in helpers if e["kind"] == "oseq"),
        "inline": len(inline),
    }
    for key, expect in EXPECTED.items():
        assert counts[key] == expect, f"{key} 计数 {counts[key]} != 期望 {expect}"

    stream, banners_list, tail = walk(lines)
    banners = dict(banners_list)  # 节标题挂在节内首条断言行上作横幅
    assert len(stream) == 529

    preamble = build_preamble(lines)
    rendered = render(stream, banners, preamble, tail)

    if OUT_PATH.exists() and OUT_PATH.read_text(encoding="utf-8") == rendered:
        print(f"✓ 再生成幂等：{OUT_PATH.relative_to(TESTS_DIR)} 零 diff（529 条流数据在案）", file=sys.stderr)
        return 0
    OUT_PATH.write_text(rendered, encoding="utf-8")
    chunk_steps = sum(1 for c in stream for s in c["prelude"] if s["kind"] == "chunk")
    new_repo_steps = sum(1 for c in stream for s in c["prelude"] if s["kind"] == "new_repo")
    print(
        f"✓ 断言流已生成：529 条（t {counts['t']} + tn {counts['tn']} + oseq {counts['oseq']}"
        f" + 内联 {counts['inline']}），prelude 夹缝块 {chunk_steps} 个 / new_repo {new_repo_steps} 步"
        f" → {OUT_PATH.relative_to(TESTS_DIR)}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
