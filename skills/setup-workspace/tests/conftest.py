# setup-workspace pytest 骨架（spec 20261110-d145 批 1，工票 20261110-cf8f）。
#
# t/tn/oseq 助手与 new_repo/wfile/setfm/fake_cmd 夹具逐条直译旧套件
# run-tests.sh:21-131 的语义：同一 seam（assets/check.sh 子命令的外部行为——
# 退出码、stdout/stderr 合并输出、文件副作用），期望值一律取旧套件字面量，
# 由调用方（迁移后的测试函数）传入，本模块不做任何重算。
#
# 子进程显式 encoding="utf-8" 且 errors="surrogateescape"：中文输出与多字节
# 文件名按字节敏感往返，解码不吞错。

from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest

TESTS_DIR = Path(__file__).resolve().parent
ASSETS_DIR = TESTS_DIR.parent / "assets"
CHECK = ASSETS_DIR / "check.sh"
LOCAL = ASSETS_DIR / "trackers" / "local.sh"

# 旧套件 new_repo 写入的 config.sh 字面（run-tests.sh:116-127）
FIXTURE_CONFIG_SH = """TRACKER=local
TRACKER_REPO=""
BASE_REF=main
RUN_ENV=local
RUN_PREFIX=""
PKG_MGR=""
CODE_DIRS=""
CHECK_LINT=""
CHECK_TYPE=""
CHECK_TEST=""
"""


def oseq_text(txt: str, words: list[str]) -> tuple[bool, str]:
    """旧 oseq 助手（run-tests.sh:84-105）的 Python 直译。

    语义：各词按给定顺序先后出现，滑动窗口做字面匹配，不受换行影响。
    与 bash 源逐 token 对齐（锚定语义经旧助手真机实测校准）：

    - txt 先剥全部尾随换行（旧套件 $(cat file) 会剥掉文件尾的全部换行）；
    - bash ${rest%%"${kw}"*} 删**最长**后缀：凡匹配 "${kw}*" 的后缀中以
      kw **首次**出现为起点的那段最长（从首次出现删到串尾），故 head 是
      rest 中 kw **首次**出现之前的前缀（实测 "loop one loop two loop X"
      的 head 为空串——从首现整段删除）；未出现即失败「自偏移 N 起未找到」；
    - pos = base + len(head) + 1，pos 不严格大于前词位置即失败「未严格递增」；
    - bash ${rest#*"${kw}"} 删最短前缀：rest 从该词**首次**出现之后滑动，
      base 记账按 len(head) + len(kw)——head、pos、base、rest 四者同锚
      **首次出现**。

    空 word 是 bash 模式退化为 "*" 的边角：head 长度按 0 记、rest 不前进。
    返回 (ok, 失败消息)；消息文案与旧助手 echo 的 FAIL 行逐字一致。
    """
    txt = txt.rstrip("\n")
    base = 0
    prev = 0
    rest = txt
    for kw in words:
        if kw == "":
            head_len = 0 if rest else -1
        else:
            head_len = rest.find(kw)
        if head_len < 0:
            return False, f"自偏移 {base} 起未找到「{kw}」"
        pos = base + head_len + 1
        if pos <= prev:
            return False, f"「{kw}」偏移 {pos} 未严格递增（前词 {prev}）"
        prev = pos
        base = base + head_len + len(kw)
        if kw != "":
            rest = rest[head_len + len(kw):]
    return True, ""


class CheckRepo:
    """夹具仓库：等价旧套件 new_repo 建出的临时 git 库 + .sdlc 门禁装配。"""

    def __init__(self, root: Path):
        self.root = root

    # -- 夹具动作（直译 run-tests.sh wfile/setfm/fake_cmd）--

    def wfile(self, name: str, content: str) -> None:
        """向夹具仓库写文件（旧 wfile：mkdir -p 后写内容）。"""
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def setfm(self, name: str, key: str, value: str) -> None:
        """改 frontmatter 标量字段（旧 setfm 的 sed s/^key: .*/key: value/）。"""
        path = self.root / name
        text = path.read_text(encoding="utf-8")
        text, replaced = re.subn(
            rf"^{re.escape(key)}: .*$", f"{key}: {value}", text, flags=re.M
        )
        if replaced == 0:
            raise AssertionError(f"setfm：{name} 中未找到行首「{key}:」行")
        path.write_text(text, encoding="utf-8")

    def fake_cmd(self, name: str, content: str) -> None:
        """建替身命令（旧 fake_cmd：写入 fakebin 并加可执行位，用例内以 PATH 前置）。"""
        fakebin = self.root / "fakebin"
        fakebin.mkdir(exist_ok=True)
        path = fakebin / name
        path.write_text(content, encoding="utf-8")
        path.chmod(0o755)

    # -- 执行与断言（直译 run-tests.sh t/tn/oseq，同一 seam 同一参数面）--

    def run(self, cmd: str) -> tuple[int, str]:
        """旧 t/tn 的执行口径：仓库内执行，PATH 前置 .sdlc，stdout+stderr 合并。

        $TMP 注入为夹具仓库根：旧套件命令字面里的 "$TMP/..."（撞号 odseq、
        fakebin 前置等）原样执行，断言参数保持旧套件字面量零改写。
        """
        env = dict(os.environ)
        env["PATH"] = f"{self.root / '.sdlc'}:{env['PATH']}"
        env["TMP"] = str(self.root)
        proc = subprocess.run(
            ["bash", "-c", cmd],
            cwd=self.root,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            encoding="utf-8",
            errors="surrogateescape",
        )
        return proc.returncode, proc.stdout

    def t(self, desc: str, want: int, cmd: str, substr: str = "") -> None:
        """旧 t：期望退出码 +（可选）输出包含子串。失败呈现期望/实际全文。"""
        got, out = self.run(cmd)
        assert_t(desc, want, cmd, got, out, substr=substr)

    def tn(self, desc: str, want: int, cmd: str, absent: str) -> None:
        """旧 tn：期望退出码 + 输出不包含子串。失败呈现期望/实际全文。"""
        got, out = self.run(cmd)
        assert_tn(desc, want, cmd, got, out, absent)

    def oseq(self, desc: str, f: str, *words: str) -> None:
        """旧 oseq：断言文件内容中各词按给定顺序先后出现。

        文件参数是 Python 侧相对 self.root 的路径。注意与旧套件字面的差异：
        旧 oseq 的文件参数是套件 shell 里的路径字面（"$TMP/…" 等变量在套件
        shell 求值）；若把旧套件字面直搬到这里会按字面找不到文件——批 2 全量
        迁移不走本方法（legacy_harness 在会话 shell 内求值文件参数，保持字面
        零改写），本方法保留给直接以 Python 侧路径调用 oseq 断言的场景。
        """
        txt = (self.root / f).read_text(
            encoding="utf-8", errors="surrogateescape"
        )
        assert_oseq(desc, txt, list(words))


def assert_t(
    desc: str, want: int, cmd: str, got: int, out: str, substr: str = "", prefix: str = ""
) -> None:
    """旧 t 的断言语义（退出码 + 可选输出子串），消息格式批 1 定版。"""
    head = f"{prefix} " if prefix else ""
    if got != want:
        raise AssertionError(
            f"{head}{desc} —— 退出码 {got}，期望 {want}\n"
            f"命令：{cmd}\n输出全文：\n{out}"
        )
    if substr and substr not in out:
        raise AssertionError(
            f"{head}{desc} —— 输出不含「{substr}」\n命令：{cmd}\n输出全文：\n{out}"
        )


def assert_tn(
    desc: str, want: int, cmd: str, got: int, out: str, absent: str, prefix: str = ""
) -> None:
    """旧 tn 的断言语义（退出码 + 输出不含子串），消息格式批 1 定版。"""
    head = f"{prefix} " if prefix else ""
    if got != want:
        raise AssertionError(
            f"{head}{desc} —— 退出码 {got}，期望 {want}\n"
            f"命令：{cmd}\n输出全文：\n{out}"
        )
    if absent in out:
        raise AssertionError(
            f"{head}{desc} —— 输出不应包含「{absent}」\n命令：{cmd}\n输出全文：\n{out}"
        )


def assert_oseq(desc: str, txt: str, words: list[str], prefix: str = "") -> None:
    """旧 oseq 的断言语义（词序滑动窗口，oseq_text 直译）。"""
    ok, message = oseq_text(txt, words)
    if not ok:
        head = f"{prefix} " if prefix else ""
        raise AssertionError(f"{head}{desc} —— {message}")


def build_fixture_repo(root: Path) -> None:
    """旧 new_repo（run-tests.sh:107-131）的逐行直译（批 1 评审定版，批 2 复用）。"""
    root.mkdir(parents=True, exist_ok=True)
    for args in (
        ["git", "init", "-q", "-b", "main"],
        ["git", "config", "user.email", "test@example.com"],
        ["git", "config", "user.name", "tester"],
    ):
        subprocess.run(args, cwd=root, check=True)
    sdlc = root / ".sdlc"
    (sdlc / "trackers").mkdir(parents=True)
    shutil.copy(CHECK, sdlc / "check.sh")
    shutil.copy(LOCAL, sdlc / "trackers" / "local.sh")
    (sdlc / "check.sh").chmod(0o755)
    (sdlc / "trackers" / "local.sh").chmod(0o755)
    (sdlc / "config.sh").write_text(FIXTURE_CONFIG_SH, encoding="utf-8")
    (root / "README.md").write_text("fixture\n", encoding="utf-8")
    subprocess.run(["git", "add", "README.md"], cwd=root, check=True)
    subprocess.run(["git", "commit", "-qm", "[trivial] init"], cwd=root, check=True)


@pytest.fixture()
def repo(tmp_path: Path) -> CheckRepo:
    """旧 new_repo 直译：临时 git 库 + check.sh/local.sh 装配 + 哑 config.sh。"""
    root = tmp_path / "fixture"
    build_fixture_repo(root)
    return CheckRepo(root)
