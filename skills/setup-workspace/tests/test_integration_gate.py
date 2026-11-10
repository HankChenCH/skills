# 集成测试：check.sh 门禁接线（spec 20261110-d145 FR-9 集成级承载，工票
# 20261110-897b AC-6）。
#
# 真实协作者 = 分发物本体 assets/check.sh（夹具库装配的 .sdlc/check.sh，非替身）；
# 夹具替身 = CHECK_TEST 指向一个触点脚本——断言的是「门禁会执行所接的检查命令并
# 据其退出码放行/拦截」这一接线行为，而非替身本身的质量。CHECK_TEST 换成真实
# pytest 套件属批 3 的 config.sh 切换（切换前提=等价签收，本票交付签收件）。
#
# 72s 上限的口径：FR-9 场景是「迁移后全套件 check.sh all 总时长 ≤ 旧套件基线
# 24.4s 的 3 倍」。本集成测试在夹具库上实测接线与时长（替身秒级通过，远低于
# 上限）；全仓真实 check.sh all（旧套件仍为 CHECK_TEST）的输出与时长在本票
# 出口留档（工票 Progress 引用）。

from __future__ import annotations

import time

from conftest import FIXTURE_CONFIG_SH, CheckRepo

STANDIN_TEST = "touch \"$TMP/.check-test-ran\" && test -f \"$TMP/.check-test-ran\""


def test_check_sh_all_executes_wired_test_command_and_passes(repo: CheckRepo):
    """check.sh all 执行 config.sh 接线的 CHECK_TEST 并按其结果放行。"""
    config = FIXTURE_CONFIG_SH.replace('CHECK_TEST=""', f'CHECK_TEST="{STANDIN_TEST}"')
    repo.wfile(".sdlc/config.sh", config)

    started = time.monotonic()
    rc, out = repo.run("check.sh all")
    elapsed = time.monotonic() - started

    assert rc == 0, f"check.sh all 退出码 {rc}\n输出全文：\n{out}"
    assert "== CHECK_TEST:" in out, f"门禁未呈现 CHECK_TEST 接线\n输出全文：\n{out}"
    assert "✓ 全量检查通过" in out, f"门禁未放行\n输出全文：\n{out}"
    assert (repo.root / ".check-test-ran").exists(), (
        f"CHECK_TEST 替身未被执行——接线断\n输出全文：\n{out}"
    )
    assert elapsed < 72, f"check.sh all 耗时 {elapsed:.1f}s，超 FR-9 上限 72s"


def test_check_sh_all_fails_when_wired_test_command_fails(repo: CheckRepo):
    """CHECK_TEST 非零退出时门禁拦截——放行不是无条件签字。"""
    config = FIXTURE_CONFIG_SH.replace('CHECK_TEST=""', 'CHECK_TEST="false"')
    repo.wfile(".sdlc/config.sh", config)

    rc, out = repo.run("check.sh all")

    assert rc != 0, f"CHECK_TEST 失败但门禁放行\n输出全文：\n{out}"
    assert "CHECK_TEST 失败" in out, f"未呈现失败归因\n输出全文：\n{out}"
