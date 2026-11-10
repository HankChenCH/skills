# 旧套件持久 bash 会话（spec 20261110-d145 批 2，工票 20261110-897b）。
#
# 逐条用例独立 bash 无法等价迁移旧套件：115 条用例的 cmd 引用前序 setup 行定义的
# shell 变量（$SCRATCH/$SKILL/$GUARD/$RESTORE…），oseq 的文件参数同样在套件 shell
# 求值。本会话以一个常驻 bash 进程按旧套件运行序回放：
#   - preamble：legacy_stream.PREAMBLE 源行逐字（set -u、wfile/setfm/fake_cmd 定义、
#     CHECK/LOCAL）；第 9 行 HERE 依赖 $0，由本模块注入等值（tests 目录）；
#   - 夹缝块：case.prelude 的旧套件源码行逐字（含 new_repo 步骤——new_repo 由
#     conftest.build_fixture_repo 以 Python 等价实装后把 $TMP 指向该仓库根）；
#   - 断言：t/tn 的 cmd 在 (cd "$TMP" && export PATH="$TMP/.sdlc:$PATH" && eval …)
#     子壳中执行（与旧 t 的 $() 口径逐字同构）；oseq 文件参数在会话 shell 内求值
#     后 cat 回传，词序断言由 conftest.oseq_text（批 1 黄金样本 26 组回放背书）执行；
#     内联断言的 exec 行逐字执行后回传 $rc/$out。
# 断言本体（退出码/子串/词序）全部在 pytest 侧，期望值来自冻结数据面（旧套件字面）。
#
# 标记协议：每步之后回读 __LGM__<nonce>__<rc> 行界定输出与退出码；nonce 每步随机，
# 用例输出不可能预测碰撞。会话 stderr 合并进输出（与旧 t 的 2>&1 口径一致）。

from __future__ import annotations

import re
import shutil
import subprocess
import uuid
from pathlib import Path

from conftest import TESTS_DIR, assert_oseq, assert_t, assert_tn, build_fixture_repo, oseq_text

MARKER_RE = re.compile(r"^__LGM__([0-9a-f]{12})__(\d+)$")
STEP_DELIM = "__LGM_STEP__"


def _shquote(path: Path | str) -> str:
    """POSIX 单引号安全封装（路径注入 bash 源行）。"""
    return "'" + str(path).replace("'", "'\\''") + "'"


def apply_fault(case: dict, fault: dict) -> dict:
    """注故障钩子（仅 tools/sabotage_check.py 使用，见该工具 docstring）。

    只改写断言期望参数（want/substr/absent/words），从不改写执行体——
    对真实绿色套件而言任何组合只会由绿转红，不存在削弱绿色路径的形态。
    """
    faulted = dict(case)
    for key in ("want", "substr", "absent", "words"):
        if key in fault:
            faulted[key] = fault[key]
    return faulted


class LegacySession:
    """常驻 bash 会话：按旧套件运行序回放夹缝块并执行断言取数。"""

    def __init__(self, base: Path):
        self.base = base
        self.base.mkdir(parents=True, exist_ok=True)
        self.stepfile = base / "step.sh"
        self.root: Path | None = None  # 当前夹具仓库根（= 会话中的 $TMP）
        self._fixture_no = 0
        self._proc = subprocess.Popen(
            ["bash"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=str(TESTS_DIR),  # 会话 cwd = 套件目录（旧套件 $HERE，setup 行相对路径口径）
            encoding="utf-8",
            errors="surrogateescape",
        )
        self._bootstrap()

    # -- 底层：投喂与标记回读 --

    def _feed(self, code: str, rc_expr: str = '"$?"') -> tuple[int, str]:
        """投喂一段 bash 源码，回读（输出, 退出码）。code 不含尾换行则补齐。"""
        if self._proc.poll() is not None:
            raise RuntimeError("legacy 会话 bash 已退出，无法继续投喂")
        nonce = uuid.uuid4().hex[:12]
        marker_cmd = f"printf '\\n__LGM__{nonce}__%s\\n' {rc_expr}\n"
        try:
            self._proc.stdin.write(code + ("\n" if not code.endswith("\n") else "") + marker_cmd)
            self._proc.stdin.flush()
        except BrokenPipeError as exc:
            raise RuntimeError("legacy 会话 stdin 已断（bash 提前退出）") from exc
        out_lines: list[str] = []
        for line in self._proc.stdout:
            m = MARKER_RE.match(line.rstrip("\n"))
            if m and m.group(1) == nonce:
                # printf 的前导 \n 恰好补齐输出末行；与旧套件 $() 剥尾换行口径一致
                return int(m.group(2)), "".join(out_lines).rstrip("\n")
            out_lines.append(line)
        raise RuntimeError(
            "legacy 会话输出耗尽（bash 死亡）——最后输出：\n" + "".join(out_lines)[-2000:]
        )

    def _bootstrap(self) -> None:
        from legacy_stream import PREAMBLE

        # 一次性整体投喂：函数定义跨行（wfile/setfm/fake_cmd），逐行投喂会让 bash
        # 把后续 marker 行吞进函数体、协议失步
        lines: list[str] = []
        for entry in PREAMBLE:
            if entry.get("kind") == "here":
                # run-tests.sh:9 `HERE="$(cd "$(dirname "$0")" && pwd)"` 依赖 $0；
                # 会话中 $0 非套件路径，注入等值（= 旧套件 HERE 的实值）
                lines.append(f"HERE={_shquote(TESTS_DIR)}")
            else:
                lines.append(entry["text"])
        self._feed("\n".join(lines))
        # 步文件路径（t/tn 的 cmd 与 oseq 文件参数经此以 heredoc 字面写入，规避引号再解析）
        self._feed(f"__STEP_FILE={_shquote(self.stepfile)}")

    # -- 回放步骤 --

    def chunk(self, text: str) -> None:
        """夹缝 setup 块逐字执行（套件 shell 层，输出与退出码按旧套件口径不采集）。"""
        self._feed(text)

    def new_repo(self) -> None:
        """旧 new_repo 步骤：Python 侧建等价夹具库（conftest.build_fixture_repo），
        会话 $TMP 指向该根——后续 "$TMP/..." 字面全部原样解析。"""
        self._fixture_no += 1
        root = self.base / f"fixture-{self._fixture_no:02d}"
        build_fixture_repo(root)
        self.root = root
        self._feed(f"TMP={_shquote(root)}")

    def run_case_cmd(self, cmd_raw: str) -> tuple[int, str]:
        """旧 t/tn 执行口径，展开链与旧套件逐字同构：

        1. `__CMD_ARG=<cmd 源码原始词文本>`——旧套件调用点对双引号参数展开一次
          （未转义 $VAR 传参时求值，如 883 行 `$CU_ENV …`；转义 \\$TMP 留给下一步）；
        2. `(cd "$TMP" && export PATH="$TMP/.sdlc:$PATH" && eval "$__CMD_ARG")`——
           cd/PATH 前置后 eval 二次展开（与 run-tests.sh:23 的 eval "$cmd" 同构）。

        子壳 stdin 显式接 /dev/null：旧套件由管线（双跑/CI）运行时用例 stdin 即
        EOF 型（check.sh pre-push 的 `cat >/dev/null` 消费 git 传入行，立即读到
        EOF）；会话 stdin 是命令管道，不重定向会把后续命令流当用例输入吞掉。
        """
        code = (
            f"__CMD_ARG={cmd_raw}\n"
            '(cd "$TMP" && export PATH="$TMP/.sdlc:$PATH" && eval "$__CMD_ARG") 2>&1 </dev/null'
        )
        return self._feed(code)

    def read_file_literal(self, file_param: str) -> str:
        """oseq 文件参数在会话 shell 内求值后 cat（套件层 cwd，stderr 丢弃——
        与旧 oseq `cat "$f"` 的 $() 采集口径一致：只进 stdout）。"""
        code = (
            f"cat > {_shquote(self.stepfile)} <<'{STEP_DELIM}'\n"
            f"{file_param}\n"
            f"{STEP_DELIM}\n"
            'eval "$(sed \'s/^/cat /\' "$__STEP_FILE")" 2>/dev/null'
        )
        _, out = self._feed(code)
        return out

    def run_inline(self, exec_lines: list[str]) -> tuple[int, str]:
        """内联断言执行体（out=/rc= 两行）逐字执行后回传 $out 与 $rc。"""
        code = "\n".join(exec_lines) + '\nprintf \'%s\' "$out"'
        return self._feed(code, rc_expr='"$rc"')

    # -- 断言用例执行（期望值来自冻结数据面） --

    def execute(self, case: dict) -> None:
        for step in case["prelude"]:
            if step["kind"] == "new_repo":
                self.new_repo()
            else:
                self.chunk(step["text"])
        prefix = case["id"]
        kind = case["kind"]
        if kind == "t":
            rc, out = self.run_case_cmd(case["cmd_raw"])
            assert_t(case["desc"], case["want"], case["cmd"], rc, out, substr=case["substr"], prefix=prefix)
        elif kind == "tn":
            rc, out = self.run_case_cmd(case["cmd_raw"])
            assert_tn(case["desc"], case["want"], case["cmd"], rc, out, case["absent"], prefix=prefix)
        elif kind == "oseq":
            txt = self.read_file_literal(case["file"])
            assert_oseq(case["desc"], txt, case["words"], prefix=prefix)
        elif kind == "inline":
            rc, out = self.run_inline(case["exec_lines"])
            if rc != case["want"]:
                raise AssertionError(
                    f"{prefix} {case['desc']} —— 退出码 {rc}，期望 {case['want']}\n"
                    f"执行体：{'; '.join(case['exec_lines'])}\n输出全文：\n{out}"
                )
            if case["substr"] not in out:
                raise AssertionError(
                    f"{prefix} {case['desc']} —— 输出不含「{case['substr']}」\n"
                    f"执行体：{'; '.join(case['exec_lines'])}\n输出全文：\n{out}"
                )
        else:  # pragma: no cover - 数据面由生成器保证 kind 合法
            raise ValueError(f"未知断言类别：{kind}")

    # -- 收尾 --

    def close(self) -> None:
        try:
            if self._proc.poll() is None:
                self._proc.stdin.close()
                try:
                    self._proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    self._proc.kill()
                    self._proc.wait(timeout=10)
        finally:
            shutil.rmtree(self.base, ignore_errors=True)
