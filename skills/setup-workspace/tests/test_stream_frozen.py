# 数据面常驻冻结断言（spec 20261110-d145 批 2，工票 20261110-897b；评审轮 1 阻断修复）。
#
# 「活本 + 生成资产」常驻逐字一致断言（dual-copy-assets.md 规则 1）：legacy_stream.py
# 是 run-tests.sh 的生成资产，在盘内容必须与生成器 walk()+render() 的现场渲染逐字
# 零 diff——漂移即红并直指首个分歧行。tools/verify_equivalence.py 只比对六参数
# （want/cmd/substr/absent/file/words），拦不住 cmd_raw/prelude/注释横幅漂移；
# 本断言覆盖整个渲染面，且常驻 pytest 路径（非手动命令）。

from __future__ import annotations

import importlib.util

from conftest import TESTS_DIR

GENERATOR = TESTS_DIR / "tools" / "generate_legacy_stream.py"
FROZEN = TESTS_DIR / "legacy_stream.py"
SUITE = TESTS_DIR / "run-tests.sh"


def _load_generator():
    """进程内加载生成器模块（不落 sys.path 包名，main() 有 __main__ 守卫）。"""
    spec = importlib.util.spec_from_file_location("generate_legacy_stream", GENERATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _drift_report(rendered: str, frozen: str) -> str:
    """首个分歧行定位：哪个行为漂了（在盘文件 vs 现场渲染）一眼可辨。"""
    r_lines = rendered.splitlines()
    f_lines = frozen.splitlines()
    for i, (on_disk, fresh) in enumerate(zip(f_lines, r_lines)):
        if on_disk != fresh:
            return (
                f"生成资产漂移：legacy_stream.py 第 {i + 1} 行与现场渲染不一致\n"
                f"  在盘文件：{on_disk!r}\n  现场渲染：{fresh!r}\n"
                "修复：uv run python tools/generate_legacy_stream.py 再生成；"
                "若渲染本身变了，核对 run-tests.sh 是否位移"
            )
    longer = "在盘文件" if len(f_lines) > len(r_lines) else "现场渲染"
    shorter = "现场渲染" if longer == "在盘文件" else "在盘文件"
    return (
        f"生成资产漂移：{longer}比{shorter}多 "
        f"{abs(len(f_lines) - len(r_lines))} 行（前 {min(len(f_lines), len(r_lines))} 行一致）"
    )


def test_rendered_stream_matches_frozen_file_byte_for_byte():
    """生成器现场渲染与在盘 legacy_stream.py 逐字零 diff（生成资产漂移即红）。"""
    gen = _load_generator()
    lines = SUITE.read_text(encoding="utf-8").splitlines()
    stream, banners_list, tail = gen.walk(lines)
    rendered = gen.render(stream, dict(banners_list), gen.build_preamble(lines), tail)
    frozen = FROZEN.read_text(encoding="utf-8")
    assert rendered == frozen, _drift_report(rendered, frozen)
