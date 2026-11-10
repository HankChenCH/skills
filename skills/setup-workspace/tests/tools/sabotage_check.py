#!/usr/bin/env python
# 注故障检测（spec 20261110-d145 FR-3「抽 10% 旧绿用例注故障，新断言真红」，
# 工票 20261110-897b AC-4）。
#
# 目的：证明迁移后的断言不是空洞绿——对抽样用例的**期望参数**注入故障（改写成
# 与真实行为相悖的值），全量重跑后这些用例必须真红；同时其余用例必须全部保持
# 绿（故障只改期望、不改执行体，不允许级联扰动）。
#
# 抽样：按等价索引条目分层抽样（t 45 / tn 3 / oseq 4 / 内联 1 = 53 ≥ 52 = ⌈10%⌉），
# 固定种子 20261110 可复现。
#
# 故障形态（每用例一种，均只经 LEGACY_FAULTS 钩子改写期望参数）：
#   - t 有 substr：substr 追加「【注故障】」→ 输出必不含 → 红（子串检查活着）；
#   - t 无 substr：want 取反（0↔1）→ 退出码必不等 → 红（退出码检查活着）；
#   - tn：absent 改为空串（空串在一切输出中）→ 红（不含检查活着）；
#   - oseq：对调前两词（词数最小 2，实词互异）→ 词序必违 → 红（词序检查活着）；
#   - 内联：substr 追加「【注故障】」→ 红。
#
# 用法：uv run python tools/sabotage_check.py
# 退出码：53 条全部真红且其余 476 条保持绿 → 0；任何抽样用例仍绿（削弱检测失败）
# 或非抽样用例被扰动 → 1。

from __future__ import annotations

import json
import os
import random
import re
import subprocess
import sys
import tempfile
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent.parent
TOOLS_DIR = TESTS_DIR / "tools"
sys.path.insert(0, str(TOOLS_DIR))

from equivalence_index import parse_calls, parse_inline  # noqa: E402

SEED = 20261110
SAMPLE_PER_KIND = {"t": 45, "tn": 3, "oseq": 4, "inline": 1}
FAULT_MARK = "【注故障】"
RESULT_RE = re.compile(r"\[(run-tests\.sh:\d+(?:-inline)?)\] (PASSED|FAILED|ERROR|XFAIL|SKIPPED)")


def build_index() -> list[dict]:
    text = (TESTS_DIR / "run-tests.sh").read_text(encoding="utf-8")
    entries = []
    for e in parse_calls(text) + parse_inline(text):
        entries.append(
            {
                "id": f"run-tests.sh:{e['line']}" + ("-inline" if e["kind"] == "inline" else ""),
                "kind": e["kind"],
                "want": e.get("want"),
                "substr": e.get("substr", ""),
                "absent": e.get("absent"),
                "words": e.get("words"),
            }
        )
    entries.sort(key=lambda e: e["id"])
    return entries


def sample(entries: list[dict]) -> list[dict]:
    rng = random.Random(SEED)
    picked: list[dict] = []
    for kind, n in SAMPLE_PER_KIND.items():
        pool = [e for e in entries if e["kind"] == kind]
        if len(pool) < n:
            raise SystemExit(f"✗ {kind} 池 {len(pool)} 不足抽样 {n}")
        picked += rng.sample(pool, n)
    return picked


def fault_of(e: dict) -> dict:
    kind = e["kind"]
    if kind == "t":
        if e["substr"]:
            return {"substr": e["substr"] + FAULT_MARK}
        return {"want": e["want"] ^ 1}
    if kind == "tn":
        return {"absent": ""}
    if kind == "oseq":
        words = e["words"]
        if words[0] != words[1]:
            return {"words": [words[1], words[0], *words[2:]]}
        return {"words": [words[0] + FAULT_MARK, *words[1:]]}
    return {"substr": e["substr"] + FAULT_MARK}  # inline


def main() -> int:
    entries = build_index()
    sampled = sample(entries)
    faults = {e["id"]: fault_of(e) for e in sampled}
    sampled_ids = set(faults)

    with tempfile.NamedTemporaryFile(
        "w", suffix=".json", prefix="legacy-faults-", delete=False, encoding="utf-8"
    ) as fh:
        json.dump(faults, fh, ensure_ascii=False)
        faults_path = fh.name

    env = {**os.environ, "LEGACY_FAULTS": faults_path}
    print(f"== 注故障：{len(sampled)} 条（t 45 / tn 3 / oseq 4 / 内联 1，seed {SEED}）==", file=sys.stderr)
    proc = subprocess.run(
        [sys.executable, "-m", "pytest", str(TESTS_DIR), "-v", "--tb=no"],
        cwd=TESTS_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
        env=env,
    )

    results: dict[str, bool] = {}
    for line in proc.stdout.splitlines():
        m = RESULT_RE.search(line)
        if m:
            results[m.group(1)] = m.group(2) == "PASSED"
    if len(results) != len(entries):
        print(
            f"✗ 注故障运行解析到 {len(results)} 条结果，索引 {len(entries)} 条——对号不全",
            file=sys.stderr,
        )
        return 1

    still_green = sorted(eid for eid in sampled_ids if results.get(eid))
    disturbed = sorted(eid for eid in results if eid not in sampled_ids and not results[eid])

    print()
    print("== 注故障报告 ==")
    for e in sampled:
        verdict = "真红" if not results[e["id"]] else "仍绿 ✗"
        fault = faults[e["id"]]
        shown = {k: (v if not isinstance(v, list) else f"[{len(v)} 词]") for k, v in fault.items()}
        print(f"  {e['id']:<28}{verdict}  故障={shown}")
    if still_green:
        print(f"✗ 削弱检测失败：{len(still_green)} 条抽样用例注故障后仍绿：{still_green[:5]}")
        return 1
    if disturbed:
        print(f"✗ 级联扰动：{len(disturbed)} 条非抽样用例转红：{disturbed[:5]}")
        return 1
    print(
        f"✓ 注故障 {len(sampled)}/{len(sampled)} 全部真红；其余 {len(results) - len(sampled)}"
        " 条保持绿（无级联扰动）——新断言非空洞绿"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
