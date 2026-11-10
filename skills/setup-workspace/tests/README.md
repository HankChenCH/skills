# setup-workspace pytest 套件（迁移批 1）

旧套件 `run-tests.sh`（bash，529 条断言）向 pytest + uv 迁移的落地。spec：
`docs/specs/need20261110-a98b-20261110-d145-pytest-test-suite-migration.md`。
迁移全程旧套件保持 canonical；批 1 交付工具链、骨架、等价索引、oseq 黄金样本、
claim 子命令族试点与双跑对照管线。

## 工具链清单

- **uv 0.13.5**（单点工具链，`/Users/chenguoheng/.local/bin/uv`；Python 由 uv 自管
  cpython-3.12.15）
- **锁文件 `uv.lock`**：钉 pytest 9.x（当前 9.2.0）与 Python 3.12（requires-python
  `>=3.12`）；运行时依赖**只有 pytest**——等价索引、双跑对照、黄金样本生成与回放
  全部标准库
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
| `conftest.py` | 夹具与 t/tn/oseq 助手直译（同 seam：退出码/合并输出/文件副作用；显式 utf-8） |
| `test_claim.py` | 试点迁移：claim 子命令族 25 条（函数名内嵌源行号 `test_<行号>_…` 供对号） |
| `test_oseq_golden.py` | oseq 黄金样本回放：Python 直译 vs 旧 bash 助手真实输出逐组比对 |
| `oseq_golden/cases.json` | 黄金样本输入（26 组文本 + 词序列） |
| `oseq_golden/expected.json` | 黄金样本期望（旧助手真实输出，生成器产出勿手编） |
| `tools/equivalence_index.py` | 等价索引：解析旧 run-tests.sh → 529 条参数级 JSON 清单（528 助手调用 + 1 内联断言），条数与旧套件自报通过数核验，条目 id = `run-tests.sh:<行号>`（2 条用例描述相同，描述不作键） |
| `tools/generate_oseq_golden.py` | 从旧套件 awk 提取 oseq 函数，对 cases.json 逐组运行旧助手产出 expected.json |
| `tools/dual_run.py` | 双跑对照：旧套件与 pytest 对试点逐用例 pass/fail 比对（全局 529 条 desc 逐位对号 + 试点行号命中核验） |

## 常用命令

```bash
# oseq 黄金样本（期望输出变化时重新生成；期望只来自旧助手真实运行）
uv run python tools/generate_oseq_golden.py

# 等价索引（条数核验：529 = 528 助手调用 + 1 内联）
uv run python tools/equivalence_index.py --self-reported 529

# 双跑对照（跑一遍旧套件 + 一遍 pytest 试点，逐用例比对）
uv run python tools/dual_run.py
```

## 纪律

- 断言期望值一律取旧套件字面量（独立来源），禁止用 Python 逻辑重算期望；
- 中文输出/多字节文件名按字节敏感比对（`errors="surrogateescape"` 往返无损）；
- `assets/` 分发物逐字节不变；旧 `run-tests.sh` 不删改（等价签收前不删）。
