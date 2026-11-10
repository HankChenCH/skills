#!/usr/bin/env python
# 双跑对照管线（spec 20261110-d145 FR-3；批 1 试点、批 2 全量，工票 20261110-897b）。
#
# 对同一批断言，旧 run-tests.sh 与 pytest 套件各跑一遍，逐用例比对 pass/fail：
#   1. 运行旧套件（cwd=tests），解析 stdout 的 "ok: <desc>" / "FAIL: <desc>" 行
#      与末尾自报「通过 N / 失败 M」；
#   2. 生成等价索引（tools/equivalence_index.py，--self-reported 接自报通过数
#      做条数完整性机械核验），与旧套件结果行逐位 desc 对齐（描述重复的 2 条按
#      运行序对应，天然消歧）；
#   3. 运行 pytest 全量套件（-v 解析每条用例 PASSED/FAILED），用例 id 内嵌索引条目
#      id（[run-tests.sh:<行号>]），529 条必须一一对号、无缺无重；
#   4. 逐用例比 pass/fail：全一致 → exit 0 并打印对照报告；不一致 → exit 1。
#
# 前提：pytest 套件须全量运行（持久会话按旧套件运行序回放，子集运行状态前置
# 不成立）。
#
# 用法：uv run python tools/dual_run.py

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent.parent
TOOLS_DIR = TESTS_DIR / "tools"

OK_RE = re.compile(r"^ok: (.*)$")
FAIL_RE = re.compile(r"^FAIL: (.*?) —— ")
SELF_REPORT_RE = re.compile(r"^通过 (\d+) / 失败 (\d+)$", re.M)
# pytest -v 结果行：用例 id 内嵌索引条目 id（run-tests.sh:<行号>）
PYTEST_RESULT_RE = re.compile(r"\[(run-tests\.sh:\d+(?:-inline)?)\] (PASSED|FAILED|ERROR|XFAIL|SKIPPED)")


def run_legacy_suite() -> tuple[list[tuple[str, bool]], int]:
    """跑旧套件，返回（运行序结果行 [(desc, passed)]，自报通过数）。"""
    proc = subprocess.run(
        ["bash", "run-tests.sh"],
        cwd=TESTS_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="surrogateescape",
    )
    results: list[tuple[str, bool]] = []
    for line in proc.stdout.splitlines():
        if m := OK_RE.match(line):
            results.append((m.group(1), True))
        elif m := FAIL_RE.match(line):
            results.append((m.group(1), False))
    m = SELF_REPORT_RE.search(proc.stdout)
    if not m:
        print("✗ 旧套件输出未找到「通过 N / 失败 M」自报行", file=sys.stderr)
        print(proc.stdout[-2000:], file=sys.stderr)
        raise SystemExit(1)
    self_reported = int(m.group(1))
    if self_reported != len(results):
        print(
            f"✗ 旧套件自报通过 {self_reported}，但解析到 {len(results)} 条结果行"
            "——自报与输出不一致，双跑无从谈起",
            file=sys.stderr,
        )
        raise SystemExit(1)
    return results, self_reported


def run_pytest_suite() -> dict[str, tuple[str, bool]]:
    """跑 pytest 全量套件，返回 {索引条目 id: (pytest 用例 id, passed)}。"""
    proc = subprocess.run(
        [sys.executable, "-m", "pytest", TESTS_DIR, "-v", "--tb=no"],
        cwd=TESTS_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    by_id: dict[str, tuple[str, bool]] = {}
    for line in proc.stdout.splitlines():
        m = PYTEST_RESULT_RE.search(line)
        if not m:
            continue
        entry_id, verdict = m.group(1), m.group(2)
        if entry_id in by_id:
            print(f"✗ pytest 用例 id 重复：{entry_id}", file=sys.stderr)
            raise SystemExit(1)
        by_id[entry_id] = (line.split()[0], verdict == "PASSED")
    if not by_id:
        print("✗ pytest 输出未解析到任何用例结果", file=sys.stderr)
        print(proc.stdout[-2000:], file=sys.stderr)
        raise SystemExit(1)
    return by_id


def main() -> int:
    print("== 双跑对照：旧套件运行 ==", file=sys.stderr)
    legacy_results, self_reported = run_legacy_suite()
    print(f"旧套件：{len(legacy_results)} 条结果行，自报通过 {self_reported}", file=sys.stderr)

    print("== 双跑对照：等价索引生成 ==", file=sys.stderr)
    proc = subprocess.run(
        [sys.executable, str(TOOLS_DIR / "equivalence_index.py"), "--self-reported", str(self_reported)],
        capture_output=True, text=True, encoding="utf-8",
    )
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        return 1
    sys.stderr.write(proc.stderr)
    index = json.loads(proc.stdout)
    entries = index["entries"]
    if len(entries) != len(legacy_results):
        print(
            f"✗ 索引 {len(entries)} 条 != 旧套件结果行 {len(legacy_results)} 条",
            file=sys.stderr,
        )
        return 1
    for entry, (desc, _) in zip(entries, legacy_results):
        if entry["desc"] != desc:
            print(
                f"✗ 全局对号失配：索引 {entry['id']}「{entry['desc'][:30]}」"
                f" != 旧输出「{desc[:30]}」",
                file=sys.stderr,
            )
            return 1
    print(f"✓ 全局对号：{len(entries)} 条索引条目与旧套件结果行逐位 desc 一致", file=sys.stderr)

    print("== 双跑对照：pytest 全量套件运行 ==", file=sys.stderr)
    pytest_by_id = run_pytest_suite()
    idx_by_id = {e["id"]: e for e in entries}
    unmatched = sorted(set(pytest_by_id) - set(idx_by_id))
    missing = sorted(set(idx_by_id) - set(pytest_by_id))
    if unmatched or missing:
        print(
            f"✗ pytest/索引对号失配：pytest 多出 {unmatched[:5]}，"
            f"索引缺 pytest 结果 {missing[:5]}",
            file=sys.stderr,
        )
        return 1
    print(
        f"✓ 全量对号：pytest {len(pytest_by_id)} 条用例与索引 {len(idx_by_id)} 条"
        "条目 id 一一对号（无缺无重）",
        file=sys.stderr,
    )

    # 旧套件结果行与索引条目同序（运行序），一次建 pos_by_line 反查表
    pos_by_line = {e["line"]: i for i, e in enumerate(entries)}

    mismatched: list[tuple[str, str, bool, bool]] = []
    for entry_id in sorted(idx_by_id, key=lambda k: idx_by_id[k]["line"]):
        entry = idx_by_id[entry_id]
        legacy_passed = legacy_results[pos_by_line[entry["line"]]][1]
        test_id, pytest_passed = pytest_by_id[entry_id]
        if legacy_passed != pytest_passed:
            mismatched.append((entry_id, entry["desc"], legacy_passed, pytest_passed))

    kinds = {"t": 0, "tn": 0, "oseq": 0, "inline": 0}
    for entry_id, (_, pytest_passed) in pytest_by_id.items():
        kinds[idx_by_id[entry_id]["kind"]] += 1 if pytest_passed else 0
    print()
    print("== 双跑对照报告 ==")
    print(
        f"逐用例一致（旧套件 pass / pytest pass）：t {kinds['t']} + tn {kinds['tn']}"
        f" + oseq {kinds['oseq']} + 内联 {kinds['inline']} = {sum(kinds.values())}"
    )
    if mismatched:
        print(f"{'条目':<26}{'旧套件':<8}{'pytest':<8}描述（仅失配行）")
        for entry_id, desc, legacy_passed, pytest_passed in mismatched:
            print(
                f"{entry_id:<26}{'pass' if legacy_passed else 'FAIL':<8}"
                f"{'pass' if pytest_passed else 'FAIL':<8}✗ {desc}"
            )
        print(f"✗ 双跑不一致 {len(mismatched)} 条（见上）")
        return 1
    print("（无失配行）")
    print(f"✓ 双跑对照一致：全量 {len(pytest_by_id)} 条逐用例 pass/fail 相同")
    return 0


if __name__ == "__main__":
    sys.exit(main())
