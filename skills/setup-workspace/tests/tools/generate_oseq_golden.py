#!/usr/bin/env python
# oseq 黄金样本生成器（spec 20261110-d145 FR-7，工票 20261110-cf8f）。
#
# 从旧套件 run-tests.sh 用 awk 静态提取 oseq 函数定义（原样字节，不做任何改写），
# 对 oseq_golden/cases.json 每组输入（文本 + 词序列）在 bash 子进程里真实运行旧助手，
# 捕获其输出与退出码写 oseq_golden/expected.json——期望值来源是旧助手本身，
# 不是任何 Python 重算。conftest.oseq_text（Python 直译）由
# test_oseq_golden.py 对 expected.json 逐组回放比对，不一致即语义漂移。
#
# 用法：uv run python tools/generate_oseq_golden.py
# （仅需联网无、依赖无；bash 取 PATH 上的 bash，与旧套件 shebang env bash 同源。）

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent.parent
SUITE = TESTS_DIR / "run-tests.sh"
CASES_PATH = TESTS_DIR / "oseq_golden" / "cases.json"
EXPECTED_PATH = TESTS_DIR / "oseq_golden" / "expected.json"

HARNESS = """\
eval "$OSEQ_FN"
PASS=0; FAIL=0
f="$1"; shift
oseq "golden" "$f" "$@"
"""


def main() -> int:
    extracted = subprocess.run(
        ["awk", r"/^oseq\(\) \{/,/^\}/", str(SUITE)],
        capture_output=True, text=True, encoding="utf-8", check=True,
    ).stdout
    if not extracted.startswith("oseq() {"):
        print("✗ awk 未能从旧套件提取 oseq 函数定义", file=sys.stderr)
        return 1

    cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))["cases"]
    if len(cases) < 20:
        print(f"✗ 黄金样本仅 {len(cases)} 组，少于 20 组下限", file=sys.stderr)
        return 1

    harness_path = Path(tempfile.mkdtemp()) / "oseq_harness.sh"
    harness_path.write_text(HARNESS, encoding="utf-8")

    results = []
    with tempfile.TemporaryDirectory() as td:
        for case in cases:
            txt_file = Path(td) / f"{case['id']}.txt"
            txt_file.write_text(case["txt"], encoding="utf-8")
            proc = subprocess.run(
                ["bash", str(harness_path), str(txt_file), *case["words"]],
                env={**os.environ, "OSEQ_FN": extracted},
                capture_output=True, text=True, encoding="utf-8",
                errors="surrogateescape",
            )
            results.append(
                {
                    "id": case["id"],
                    # 旧助手对这组输入的真实输出（"ok: golden" / "FAIL: golden —— ..."）
                    "stdout": proc.stdout,
                    # bash 脚本退出码 = 旧助手 return 值（0 ok / 1 fail）
                    "rc": proc.returncode,
                }
            )

    payload = {
        "_comment": "oseq 黄金样本期望：由 tools/generate_oseq_golden.py 从旧套件 "
                    "run-tests.sh 提取的 oseq 助手真实运行产生，勿手工编辑。",
        "suite": SUITE.name,
        "results": results,
    }
    EXPECTED_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    ok = sum(1 for r in results if r["rc"] == 0)
    print(
        f"✓ 黄金样本 {len(results)} 组已生成（旧助手真实输出；ok {ok} / fail {len(results) - ok}）"
        f" → {EXPECTED_PATH.relative_to(TESTS_DIR)}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
