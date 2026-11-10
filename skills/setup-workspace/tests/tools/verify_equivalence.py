#!/usr/bin/env python
# 等价对号签收（spec 20261110-d145 FR-2，工票 20261110-897b）。
#
# 两个独立面逐参数对号：
#   A. 等价索引——对旧套件 run-tests.sh 现场解析（tools/equivalence_index.py），
#      参数 = 旧套件源码字面（独立来源）；
#   B. 新套件数据面——tests/legacy_stream.py（冻结文件，test_migration.py 实际
#      执行所用，import 而非重读源码，杜绝"另一份真相"）。
# 逐条比对参数：t（want/cmd/substr）、tn（want/cmd/absent）、oseq（file/words）、
# 内联（want/substr）；id = "run-tests.sh:<行号>"（2 条用例描述相同，描述不作键，
# 仅作旁证输出）。cmd 的运行时展开链（调用点展开 + eval 二次展开）由数据面
# cmd_raw 携带、会话按 bash 语义重放，静态字面对号之外另有 golden 回放与双跑
# 对照背书（FR-3/FR-7）。
#
# 完整性核验：索引条数 = 528 助手调用（443+32+53）+ 1 内联 = 529，与
# --self-reported 传入的旧套件自报通过数机械比对。
#
# 用法：uv run python tools/verify_equivalence.py [--self-reported 529]
# 退出码：529/529 全对号且核验全过 → 0；任何失配 → 1 并逐条打印。

from __future__ import annotations

import argparse
import sys
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent.parent
TOOLS_DIR = TESTS_DIR / "tools"
sys.path.insert(0, str(TOOLS_DIR))

from equivalence_index import EXPECTED, parse_calls, parse_inline  # noqa: E402

PARAM_KEYS = {
    "t": ("want", "cmd", "substr"),
    "tn": ("want", "cmd", "absent"),
    "oseq": ("file", "words"),
    "inline": ("want", "substr"),
}


def build_index() -> list[dict]:
    text = (TESTS_DIR / "run-tests.sh").read_text(encoding="utf-8")
    helpers = parse_calls(text)
    inline = parse_inline(text)
    entries = []
    for e in helpers + inline:
        entry = {"id": f"run-tests.sh:{e['line']}" + ("-inline" if e["kind"] == "inline" else "")}
        entry.update(e)
        entries.append(entry)
    entries.sort(key=lambda e: e["line"])
    return entries


def build_suite() -> list[dict]:
    sys.path.insert(0, str(TESTS_DIR))
    from legacy_stream import STREAM

    return list(STREAM)


def main() -> int:
    ap = argparse.ArgumentParser(description="等价索引与新套件数据面逐参数对号（529/529）")
    ap.add_argument(
        "--self-reported",
        type=int,
        default=None,
        help="旧套件自报通过数，与索引条数做机械比对",
    )
    args = ap.parse_args()

    index = build_index()
    suite = build_suite()

    counts = {k: sum(1 for e in index if e["kind"] == k) for k in ("t", "tn", "oseq", "inline")}
    problems: list[str] = []

    for key, expect in EXPECTED.items():
        if counts[key] != expect:
            problems.append(f"索引 {key} 计数 {counts[key]} != 期望 {expect}")
    if len(index) != 529:
        problems.append(f"索引总数 {len(index)} != 529")
    if args.self_reported is not None and args.self_reported != len(index):
        problems.append(f"索引条数 {len(index)} != 旧套件自报通过数 {args.self_reported}")

    idx_ids = [e["id"] for e in index]
    suite_ids = [c["id"] for c in suite]
    if len(set(idx_ids)) != len(idx_ids):
        problems.append("索引 id 存在重复——唯一标识被破坏")
    if len(set(suite_ids)) != len(suite_ids):
        problems.append("新套件 id 存在重复——唯一标识被破坏")

    if sorted(idx_ids) != sorted(suite_ids):
        only_idx = sorted(set(idx_ids) - set(suite_ids))
        only_suite = sorted(set(suite_ids) - set(idx_ids))
        problems.append(f"id 集合不一致：仅索引有 {only_idx[:5]}，仅新套件有 {only_suite[:5]}")
    else:
        suite_by_id = {c["id"]: c for c in suite}
        mismatches = []
        for e in index:
            c = suite_by_id[e["id"]]
            if c["kind"] != e["kind"]:
                mismatches.append(f"{e['id']}: kind {e['kind']} != {c['kind']}")
                continue
            for key in PARAM_KEYS[e["kind"]]:
                if c.get(key) != e[key]:
                    mismatches.append(
                        f"{e['id']}: {key} 新套件 {c.get(key)!r} != 索引 {e[key]!r}"
                    )
            if c["desc"] != e["desc"]:
                mismatches.append(f"{e['id']}: desc 不一致（描述不作键，仅旁证）")
        if mismatches:
            problems.append(f"逐参数对号失配 {len(mismatches)} 处：\n  " + "\n  ".join(mismatches[:20]))

    if problems:
        for p in problems:
            print(f"✗ {p}", file=sys.stderr)
        print(f"✗ 对号未通过（索引 {len(index)} 条 / 新套件 {len(suite)} 条）", file=sys.stderr)
        return 1

    print(
        f"✓ 等价对号 529/529：t {counts['t']} + tn {counts['tn']} + oseq {counts['oseq']}"
        f" + 内联 {counts['inline']}，参数逐条一致（want/cmd/substr/absent/file/words），"
        f"id 唯一（run-tests.sh:<行号>）"
        + (f"，与自报通过数 {args.self_reported} 一致" if args.self_reported is not None else ""),
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
