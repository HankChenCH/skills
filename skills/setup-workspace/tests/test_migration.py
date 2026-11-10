# 批 2 全量迁移 runner（spec 20261110-d145，工票 20261110-897b）。
#
# legacy_stream.STREAM 的 529 条（528 条助手调用 + 1 条内联断言）按旧套件运行序
# parametrize：475 条 t/tn 同构收敛为参数行（batch 1 试点 test_claim.py 的 claim
# 节 25 条一并收敛入流——试点函数由本流取代，见工票 Progress），oseq 53 条逐条
# 携带（文件参数会话内求值 + Python 侧词序断言），内联断言 1 条 exec 逐字执行。
#
# 顺序敏感：用例按 STREAM 顺序在一个持久 bash 会话上回放（夹缝 setup 逐字重放、
# 段内状态累积与旧套件同构）。因此本文件不支持 -k/--lf 等选择性执行——子集运行
# 的状态前置不成立，结果无意义；全量运行才是本套件的语义。
#
# LEGACY_FAULTS 环境变量（路径 → JSON {case_id: {want|substr|absent|words 覆写}}）
# 为注故障钩子，仅 tools/sabotage_check.py 使用；未设置时零影响。

from __future__ import annotations

import json
import os

import pytest

from legacy_harness import LegacySession, apply_fault
from legacy_stream import STREAM


def _load_faults() -> dict:
    path = os.environ.get("LEGACY_FAULTS")
    if not path:
        return {}
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


FAULTS = _load_faults()


@pytest.fixture(scope="session")
def legacy(tmp_path_factory) -> LegacySession:
    session = LegacySession(tmp_path_factory.mktemp("legacy-fixture-repos"))
    try:
        yield session
    finally:
        session.close()


@pytest.mark.parametrize("case", STREAM, ids=[c["id"] for c in STREAM])
def test_legacy_suite_case(case, legacy: LegacySession):
    """旧套件断言逐条等价迁移：夹缝块逐字回放 + 参数字面直译断言。"""
    fault = FAULTS.get(case["id"])
    if fault:
        case = apply_fault(case, fault)
    legacy.execute(case)
