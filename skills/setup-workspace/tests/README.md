# setup-workspace pytest 套件（迁移批 1 基建 + 批 2 全量迁移 + 批 3 收口）

旧套件 `run-tests.sh`（bash，529 条断言）向 pytest + uv 迁移的落地。spec：
`docs/specs/need20261110-a98b-20261110-d145-pytest-test-suite-migration.md`。
迁移全程旧套件保持 canonical；批 1 交付工具链、骨架、等价索引、oseq 黄金样本
与双跑对照管线（claim 试点已由批 2 数据面取代）；批 2 交付全量迁移、逐参数
等价对号签收、注故障检测与集成测试；批 3 收口：门禁 `CHECK_TEST` 切
pytest+uv（`--project` 锁定 tests/ 环境），等价签收后旧 `run-tests.sh` 删除。

## 工具链清单

- **uv 0.13.5**（单点工具链，机器无关入口 `uv`；Python 由 uv 自管 cpython-3.12.15）
- **Python 3.12 为下限且钉在 3.12**：requires-python `>=3.12,<3.13`（批 2 收紧，
  cf8f 评审移交项）——套件语义按 3.12 实测口径背书，3.13+ 被上界挡住；钉点=
  uv 自管 3.12.15
- **锁文件 `uv.lock`**：钉 pytest 9.x（当前 9.2.0）；运行时依赖**只有 pytest**——
  等价索引、流数据面生成、对号签收、双跑对照、注故障检测、黄金回放全部标准库
- **本地产物不入库**：`.venv/`、`.pytest_cache/`、`__pycache__/`、`*.pyc` 已在仓库
  根 `.gitignore` 忽略；运行测试后 `git status` 保持干净
- **首次需联网一次**：`uv sync`（拉 wheel 进本地缓存）；此后 `uv sync --offline`
  可重复（冷机离线首跑 offline 会因缓存为空报错，属预期）

## 两级入口

```bash
# tests/ 目录内：
uv run pytest

# 仓库根（check.sh 门禁所在工作目录；uv 只从当前目录向上发现 pyproject，
# 必须显式 --project 指向 tests/）：
uv run --project skills/setup-workspace/tests pytest skills/setup-workspace/tests
```

## 目录

| 文件 | 作用 |
|---|---|
| `conftest.py` | 夹具（new_repo 直译 `build_fixture_repo`）与 t/tn/oseq 断言语义（`assert_*`，同 seam：退出码/合并输出/文件副作用；显式 utf-8 surrogateescape） |
| `legacy_stream.py` | **生成文件（勿手编）**：529 条断言流数据面（参数字面 + 夹缝 setup 块逐字），由 `tools/generate_legacy_stream.py` 从 run-tests.sh 生成，再生成幂等 |
| `legacy_harness.py` | 持久 bash 会话：按旧套件运行序回放夹缝块（段内状态累积与旧套件同构），cmd 以源码原始词文本按调用点语义展开后 eval 二次展开（与旧 t 逐字同构） |
| `test_migration.py` | 全量迁移 runner：STREAM 顺序 parametrize（**不支持 -k/--lf 子集运行**——持久会话的状态前置不成立） |
| `test_oseq_golden.py` | oseq 黄金样本回放：Python 直译 vs 旧 bash 助手真实输出逐组比对（FR-7） |
| `test_integration_gate.py` | 集成测试：check.sh all 门禁接线（真实协作者 + CHECK_TEST 夹具替身）（FR-9） |
| `oseq_golden/cases.json` `expected.json` | 黄金样本输入（27 组文本 + 词序列）与旧助手真实输出（生成器产出勿手编） |
| `tools/equivalence_index.py` | 等价索引：解析旧 run-tests.sh → 529 条参数级 JSON 清单（528 助手调用 + 1 内联断言），条目 id = `run-tests.sh:<行号>`（2 条用例描述相同，描述不作键） |
| `tools/generate_legacy_stream.py` | 流数据面生成器：行走 + 行覆盖核算 + 解析器交叉校验 + 幂等再生 |
| `tools/generate_oseq_golden.py` | 从旧套件 awk 提取 oseq 函数，对 cases.json 逐组运行旧助手产出 expected.json |
| `tools/verify_equivalence.py` | 等价对号签收：索引（现场解析）↔ 数据面（冻结）逐参数比对（want/cmd/substr/absent/file/words），529/529 + id 唯一 + 自报数核验（FR-2） |
| `tools/dual_run.py` | 双跑对照：旧套件与 pytest 全量各跑一遍，529 条逐用例 pass/fail 比对（FR-3） |
| `tools/sabotage_check.py` | 注故障检测：分层抽样 53 条旧绿用例注故障，验证全数真红且无级联扰动（FR-3 削弱检测） |

## 常用命令

```bash
# 等价对号签收（AC：529/529 逐参数一致 + 条数与自报通过数核验）
uv run python tools/verify_equivalence.py --self-reported 529

# 双跑对照（跑一遍旧套件 + 一遍 pytest 全量，逐用例比对）
uv run python tools/dual_run.py

# 注故障检测（53 条抽样全真红 + 其余保持绿）
uv run python tools/sabotage_check.py

# 流数据面再生成（审计：应零 diff；源码位移时响亮报错）
uv run python tools/generate_legacy_stream.py

# oseq 黄金样本（期望输出变化时重新生成；期望只来自旧助手真实运行）
uv run python tools/generate_oseq_golden.py
```

**批 3 收口后的历史审计工具**：上列五条命令与 `test_stream_frozen.py` 的输入源
run-tests.sh 已删，保留作迁移期审计记录，日常不跑；如需重跑须回迁移基点
（74aae44）前的提交取源。套件常驻路径（`test_migration.py`/`test_oseq_golden.py`/
`test_integration_gate.py`）不依赖 run-tests.sh，期望值全部来自冻结数据面与
黄金样本。

## 迁移架构要点（为何是持久会话 + 数据面）

- 旧套件 529 条断言中有 115 条的 cmd 引用前序 setup 行定义的 shell 变量
  （`$SCRATCH`/`$SKILL`/`$GUARD`/`$RESTORE`…），oseq 的文件参数同样在套件 shell
  求值——「每条命令独立 bash」无法等价，故用**一个持久 bash 会话**按旧套件
  运行序回放夹缝 setup 块（逐字），用例 cmd 以**源码原始词文本**交回会话按
  调用点语义展开（`$CU_ENV` 类前缀赋值在传参时展开，实证 run-tests.sh:883/888），
  再 eval 二次展开——与旧套件的展开链逐字同构。
- 断言本体（退出码/子串/不含/词序）全部在 pytest 侧，期望值一律来自冻结数据面
  （旧套件字面，独立来源，零重算）；中文输出/多字节文件名按字节敏感往返。
- `assets/` 分发物逐字节不变（FR-6 门禁终验在案）；旧 `run-tests.sh` 已于批 3
  删除（等价签收 529/529 后收口）。
- 数据面冻结断言 `test_stream_frozen.py`（活本↔生成资产双拷贝守卫）随活本退役：
  双拷贝对不存在即无守卫对象；`legacy_stream.py` 冻结面仍由 `test_migration.py`
  全量承载，期望值独立性不受影响。
- 用例子壳 stdin 显式接 /dev/null：对齐管线运行语境（旧套件由 CI/双跑运行时
  用例 stdin 即 EOF 型；pre-push 的 `cat >/dev/null` 消费 git 传入行）。
