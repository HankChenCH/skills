#!/usr/bin/env python
# 等价索引脚本（spec 20261110-d145 FR-2，工票 20261110-cf8f 批 1 交付）。
#
# 输入旧套件 run-tests.sh，输出全部断言的参数级 JSON 清单：
#   - 助手调用（t / tn / oseq）静态提取，参数是 bash 双引号解码后的字面——
#     期望值来源即旧套件源码，不经任何逻辑重算（ref-testing 同义反复禁令）；
#   - 不经助手的内联断言（run-tests.sh:3398-3406 物化演练）按内容锚机械识别，
#     desc / 期望退出码 / 子串同样从源码字面提取；
#   - 完整性核验：条数 = 528 助手调用（t 443 + tn 32 + oseq 53）+ 1 内联 = 529，
#     与旧套件自报通过数一致（--self-reported 传入自报数时做机械比对）；
#   - 条目逐条唯一标识：id = "run-tests.sh:<源行号>"（源码冻结后行号稳定）。
#     旧套件有 2 条用例描述完全相同，描述不作唯一键（脚本会把重复描述作为
#     解析正确性的旁证打印出来）。
#
# 用法：
#   uv run python tools/equivalence_index.py            # 对 ../run-tests.sh 输出到 stdout
#   uv run python tools/equivalence_index.py <suite> --out <file>
#   uv run python tools/equivalence_index.py --self-reported 529
#
# 退出码：核验全过 0；条数不符 / 解析失败 / id 重复 → 非 0 并打印原因。

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SUITE = TESTS_DIR / "run-tests.sh"

# spec 20261110-d145 修订记录裁定的全集口径
EXPECTED = {"t": 443, "tn": 32, "oseq": 53, "inline": 1}

# 行首助手调用（旧套件约定：调用一律顶格，实测 528 行全部如此）
CALL_RE = re.compile(r"^(t|tn|oseq) ")

# 内联断言内容锚（run-tests.sh:3398-3406）：物化演练 worktree 内票门禁放行
INLINE_OUT_RE = re.compile(
    r'^out="\$\(cd "\$DRILL/wt" && "\$CHECK" ticket (\S+) 2>&1\)"$'
)
INLINE_GUARD_RE = re.compile(
    r'^if \[ "\$rc" -eq (\d+) \] && case "\$out" in \*"([^"]+)"\*', re.M
)
INLINE_OK_RE = re.compile(r'^ {2}echo "ok: ([^"]+)"; PASS', re.M)


def decode_double_quoted_seg(raw: str) -> str:
    """bash 双引号段解码：\\\" \\\\ \\$ \\` 与反斜杠续行按 bash 语义，
    其余 \\x 保留两字符原样（双引号内未定义转义 bash 不吞反斜杠）。"""
    out: list[str] = []
    i = 0
    n = len(raw)
    while i < n:
        c = raw[i]
        if c == "\\" and i + 1 < n:
            nxt = raw[i + 1]
            if nxt in '"\\$`':
                out.append(nxt)
                i += 2
                continue
            if nxt == "\n":
                i += 2
                continue
        out.append(c)
        i += 1
    return "".join(out)


class UnclosedQuote(Exception):
    """引号未在行内闭合（多行调用）——当前套件不允许，出现即报错。"""


def parse_words(line: str) -> list[str]:
    """按 bash 词法把一行拆成 word 列表，返回每个 word 的参数字面。

    与 bash 一致：一个 word 可由引号段、单引号段与裸段**拼接**而成
    （旧套件存在 "grep -q 'x' "$PROTO/f"" 这类相邻引号段拼一个参数的写法）。
    变量与命令替换不展开——保留 bash 源字面（$VAR、$(...)、`...` 原样），
    展开发生在旧套件运行时，索引只取助手收到的参数文本的静态形态。
    """
    words: list[str] = []
    i = 0
    n = len(line)

    def read_word(start: int) -> tuple[str, int]:
        parts: list[str] = []
        i = start
        while i < n:
            c = line[i]
            if c in " \t":
                break
            if c == '"':
                j = i + 1
                buf: list[str] = []
                closed = False
                while j < n:
                    ch = line[j]
                    if ch == "\\":
                        if j + 1 >= n:
                            raise UnclosedQuote("行尾孤立反斜杠")
                        nxt = line[j + 1]
                        if nxt in '"\\$`':
                            buf.append(nxt)
                        elif nxt == "\n":
                            raise UnclosedQuote("行内反斜杠续行")
                        else:
                            buf.append("\\")
                            buf.append(nxt)
                        j += 2
                        continue
                    if ch == '"':
                        closed = True
                        j += 1
                        break
                    buf.append(ch)
                    j += 1
                if not closed:
                    raise UnclosedQuote("双引号未闭合")
                parts.append(decode_double_quoted_seg("".join(buf)))
                i = j
                continue
            if c == "'":
                j = line.find("'", i + 1)
                if j < 0:
                    raise UnclosedQuote("单引号未闭合")
                parts.append(line[i + 1 : j])  # 单引号段内一切字面
                i = j + 1
                continue
            if c == "\\":
                if i + 1 >= n:
                    raise UnclosedQuote("行尾孤立反斜杠")
                # 非引号上下文：反斜杠把任意字符字面化（\<newline> 为续行）
                if line[i + 1] == "\n":
                    raise UnclosedQuote("行内反斜杠续行")
                parts.append(line[i + 1])
                i += 2
                continue
            parts.append(c)
            i += 1
        return "".join(parts), i

    while i < n:
        while i < n and line[i] in " \t":
            i += 1
        if i >= n:
            break
        word, i = read_word(i)
        words.append(word)
    return words


def want_int(text: str, line_no: int) -> int:
    if not re.fullmatch(r"\d+", text):
        raise ValueError(f"run-tests.sh:{line_no}: 期望退出码不是裸数字：{text!r}")
    return int(text)


def parse_calls(text: str) -> list[dict]:
    entries: list[dict] = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        m = CALL_RE.match(line)
        if not m:
            continue
        kind = m.group(1)
        try:
            words = parse_words(line)
        except UnclosedQuote as exc:
            raise ValueError(f"run-tests.sh:{line_no}: {kind} 调用跨行/引号未闭合：{exc}") from exc
        args = words[1:]  # 首个 word 是助手名
        try:
            if kind == "t":
                desc, want, cmd = args[0], want_int(args[1], line_no), args[2]
                substr = args[3] if len(args) >= 4 else ""
                entry = {"kind": "t", "desc": desc, "want": want, "cmd": cmd, "substr": substr}
            elif kind == "tn":
                desc, want, cmd, absent = args[0], want_int(args[1], line_no), args[2], args[3]
                entry = {"kind": "tn", "desc": desc, "want": want, "cmd": cmd, "absent": absent}
            else:  # oseq：文件参数 + 任意个词
                desc, f = args[0], args[1]
                words_rest = args[2:]
                entry = {"kind": "oseq", "desc": desc, "file": f, "words": words_rest}
        except IndexError as exc:
            raise ValueError(f"run-tests.sh:{line_no}: {kind} 参数不足") from exc
        entry["line"] = line_no
        entries.append(entry)
    return entries


def parse_inline(text: str) -> list[dict]:
    """内容锚识别内联断言：out= 行起，向后取 8 行窗口提 guard/ok 参数。"""
    lines = text.splitlines()
    entries: list[dict] = []
    for line_no, line in enumerate(lines, start=1):
        m = INLINE_OUT_RE.match(line)
        if not m:
            continue
        window = "\n".join(lines[line_no - 1 : line_no + 7])
        guard = INLINE_GUARD_RE.search(window)
        ok = INLINE_OK_RE.search(window)
        if not (guard and ok):
            raise ValueError(
                f"run-tests.sh:{line_no}: 内联断言锚命中但 guard/ok 行提取失败"
            )
        entries.append(
            {
                "kind": "inline",
                "desc": ok.group(1),
                "want": int(guard.group(1)),
                "substr": guard.group(2),
                "line": line_no,
            }
        )
    return entries


def main() -> int:
    ap = argparse.ArgumentParser(
        description="对旧套件 run-tests.sh 输出 529 条断言参数级 JSON 清单（等价索引）"
    )
    ap.add_argument("suite", nargs="?", default=str(DEFAULT_SUITE))
    ap.add_argument("--out", default="-", help="JSON 输出路径，缺省 stdout")
    ap.add_argument(
        "--self-reported",
        type=int,
        default=None,
        help="旧套件自报通过数（如由双跑对照管线传入），与索引条数做机械比对",
    )
    args = ap.parse_args()

    suite = Path(args.suite)
    text = suite.read_text(encoding="utf-8")

    helpers = parse_calls(text)
    inline = parse_inline(text)

    counts = {
        "t": sum(1 for e in helpers if e["kind"] == "t"),
        "tn": sum(1 for e in helpers if e["kind"] == "tn"),
        "oseq": sum(1 for e in helpers if e["kind"] == "oseq"),
        "inline": len(inline),
    }
    counts["total"] = counts["t"] + counts["tn"] + counts["oseq"] + counts["inline"]

    problems: list[str] = []
    for key, expect in EXPECTED.items():
        if counts[key] != expect:
            problems.append(f"{key} 计数 {counts[key]} != 期望 {expect}")
    if counts["total"] != sum(EXPECTED.values()):
        problems.append(f"总数 {counts['total']} != 期望 {sum(EXPECTED.values())}")
    if args.self_reported is not None and args.self_reported != counts["total"]:
        problems.append(
            f"索引条数 {counts['total']} != 旧套件自报通过数 {args.self_reported}"
        )

    # 条目唯一标识：id = run-tests.sh:<行号>（内联条目加 -inline 后缀）
    entries = []
    for e in helpers + inline:
        entry = {"id": f"run-tests.sh:{e['line']}" + ("-inline" if e["kind"] == "inline" else "")}
        entry.update(e)
        entries.append(entry)
    entries.sort(key=lambda e: e["line"])

    ids = [e["id"] for e in entries]
    if len(set(ids)) != len(ids):
        problems.append("id 存在重复——唯一标识被破坏")

    # 描述不可作唯一键的旁证：旧套件 2 条用例描述完全相同
    seen: dict[str, int] = {}
    for e in entries:
        seen[e["desc"]] = seen.get(e["desc"], 0) + 1
    duplicated = {d: c for d, c in seen.items() if c > 1}

    payload = {
        "suite": suite.name,
        "counts": counts,
        "duplicated_descs": duplicated,
        "entries": entries,
    }
    rendered = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if args.out == "-":
        sys.stdout.write(rendered)
    else:
        Path(args.out).write_text(rendered, encoding="utf-8")

    if duplicated:
        print(f"备注：重复描述 {len(duplicated)} 组（描述不作唯一键）：", file=sys.stderr)
        for d, c in duplicated.items():
            print(f"  x{c}  {d}", file=sys.stderr)
    if problems:
        for p in problems:
            print(f"✗ {p}", file=sys.stderr)
        return 1
    print(
        f"✓ 等价索引：{counts['total']} 条"
        f"（t {counts['t']} + tn {counts['tn']} + oseq {counts['oseq']} + 内联 {counts['inline']}）"
        + (f"，与自报通过数 {args.self_reported} 一致" if args.self_reported is not None else ""),
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
