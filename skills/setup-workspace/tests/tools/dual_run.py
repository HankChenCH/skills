#!/usr/bin/env python
# 双跑对照管线（spec 20261110-d145 FR-3 批 1 部分，工票 20261110-cf8f）。
#
# 对同一批断言，旧 run-tests.sh 与 pytest 套件各跑一遍，逐用例比对 pass/fail：
#   1. 运行旧套件（cwd=tests），解析 stdout 的 "ok: <desc>" / "FAIL: <desc>" 行
#      与末尾自报「通过 N / 失败 M」；
#   2. 生成等价索引（tools/equivalence_index.py，--self-reported 接自报通过数
#      做条数完整性机械核验）；
#   3. 运行 pytest 试点（-v 解析每条用例 PASSED/FAILED）；
#   4. 对号试用：pytest 用例函数名内嵌源行号（test_<行号>_…），行号集必须全部
#      命中索引条目；旧套件结果行序列与索引条目序列逐位 desc 对齐（描述重复的
#      2 条按运行序对应，天然消歧）；
#   5. 逐用例比 pass/fail：全一致 → exit 0 并打印对照报告；不一致 → exit 1。
#
# 用法：uv run python tools/dual_run.py [--pilot test_claim.py]

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent.parent
TOOLS_DIR = TESTS_DIR / "tools"

OK_RE = re.compile(r"^ok: (.*)$")
FAIL_RE = re.compile(r"^FAIL: (.*?) —— ")
SELF_REPORT_RE = re.compile(r"^通过 (\d+) / 失败 (\d+)$", re.M)
PYTEST_RESULT_RE = re.compile(r"^(test_\w+\.py::test_(\d+)_\S*) (PASSED|FAILED|ERROR|SKIPPED|XFAIL)")


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


def run_pytest(pilot: str) -> dict[int, tuple[str, bool]]:
    """跑 pytest 试点，返回 {源行号: (pytest 用例 id, passed)}。"""
    proc = subprocess.run(
        [sys.executable, "-m", "pytest", pilot, "-v", "--tb=no"],
        cwd=TESTS_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    by_line: dict[int, tuple[str, bool]] = {}
    for line in proc.stdout.splitlines():
        m = PYTEST_RESULT_RE.match(line)
        if not m:
            continue
        test_id, line_no, verdict = m.group(1), int(m.group(2)), m.group(3)
        if line_no in by_line:
            print(f"✗ pytest 用例行号重复：{line_no}", file=sys.stderr)
            raise SystemExit(1)
        by_line[line_no] = (test_id, verdict == "PASSED")
    if not by_line:
        print("✗ pytest 输出未解析到任何用例结果", file=sys.stderr)
        print(proc.stdout[-2000:], file=sys.stderr)
        raise SystemExit(1)
    return by_line


def main() -> int:
    ap = argparse.ArgumentParser(
        description="旧 run-tests.sh 与 pytest 套件对试点断言逐用例 pass/fail 双跑对照"
    )
    ap.add_argument("--pilot", default="test_claim.py", help="pytest 试点文件（默认 test_claim.py）")
    args = ap.parse_args()

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
    import json

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

    print("== 双跑对照：pytest 试点运行 ==", file=sys.stderr)
    pytest_by_line = run_pytest(args.pilot)
    idx_by_line = {e["line"]: e for e in entries if e["kind"] in ("t", "tn")}
    unmatched = sorted(set(pytest_by_line) - set(idx_by_line))
    if unmatched:
        print(f"✗ pytest 用例行号未命中索引条目：{unmatched}", file=sys.stderr)
        return 1
    print(
        f"✓ 试点对号：pytest {len(pytest_by_line)} 条用例行号全部命中索引条目"
        f"（索引 t+tn 共 {len(idx_by_line)} 条；oseq {index['counts']['oseq']} 条"
        "不经双跑对号，由黄金样本回放覆盖）",
        file=sys.stderr,
    )

    mismatched: list[tuple[int, str, bool, bool]] = []
    for line_no in sorted(pytest_by_line):
        entry = idx_by_line[line_no]
        legacy_passed = legacy_results[entries.index(entry)][1]
        test_id, pytest_passed = pytest_by_line[line_no]
        if legacy_passed != pytest_passed:
            mismatched.append((line_no, entry["desc"], legacy_passed, pytest_passed))

    print()
    print("== 双跑对照报告 ==")
    print(f"{'行号':<8}{'旧套件':<8}{'pytest':<8}描述")
    for line_no in sorted(pytest_by_line):
        entry = idx_by_line[line_no]
        legacy_passed = legacy_results[entries.index(entry)][1]
        test_id, pytest_passed = pytest_by_line[line_no]
        mark = "✓" if legacy_passed == pytest_passed else "✗"
        print(
            f"{line_no:<8}{'pass' if legacy_passed else 'FAIL':<8}"
            f"{'pass' if pytest_passed else 'FAIL':<8}{mark} {entry['desc']}"
        )
    if mismatched:
        print(f"✗ 双跑不一致 {len(mismatched)} 条（见上表 ✗ 行）")
        return 1
    print(f"✓ 双跑对照一致：试点 {len(pytest_by_line)} 条逐用例 pass/fail 相同")
    return 0


if __name__ == "__main__":
    sys.exit(main())
