---
id: 20261110-d145
status: approved
need: 20261110-a98b
round: 2
created: 2026-11-10
approved: 2026-11-10
---
# 测试套件迁移 pytest + uv（round 2 实施迁移）

## 问题陈述

4415 行 bash 测试套件（529 条断言：528 条助手用例 + 1 条内联断言）以自研 t/tn/oseq
助手守护门禁引擎，失败诊断
停留在 print 式子串比对，且每条新用例持续继承 bash 3.2 的 eval/引号坑（实证注释
run-tests.sh:82-83、:3694）。调研报告 20261110-36c4 推荐 bats-core，但用户复核
指出报告的 pytest 分析未评估 uv（只按系统 python3.9.6 口径），该口径被 uv 自管
Python 溶解（本机 uv 0.13.5 + cpython-3.12.15 已验证）；经用户拍板（2026-11-10），
路线定为 **uv + pytest**。不迁移的代价：诊断短板与引号坑随用例数线性增长。

## 方案

按报告三批策略把全套件迁到 pytest（uv 工具链、钉 Python 3.12）：批 1 = 基建
（uv.lock + pytest 骨架 + conftest 夹具 + t/tn/oseq Python 助手）+ 一个子命令族
试点迁移 + 双跑对照跑通，兼作宿主实测；批 2 = 全量迁移 + 断言参数级等价对号
签收；批 3 = 清扫旧套件、`CHECK_TEST` 切 `uv run pytest`、调研报告修订（含
uv 盲区更正）。迁移全程旧套件保持 canonical、等价签收前不删；分发物 assets/
全程逐字节不变（使用方零影响门禁）。

## 用户故事

- 作为仓库维护者，我想让测试失败时直接看到重写的断言表达式、期望/实际全文与
  差异（pytest assert 重写 + `-vv`），以便不再靠人工重跑比对定位问题。
- 作为仓库维护者，我想用 parametrize 收敛 475 条同构用例，以便套件体积大幅缩小、
  新用例只写参数行。
- 作为仓库维护者，我想在迁移全程保持门禁全绿可回退，以便任何时点中断迁移都不
  损害现有质量防线。
- 作为技能安装使用方，我想让迁移完全不触碰我工作区里的 `.sdlc/`，以便安装产物
  与依赖预算（bash/awk/sed/git）一如既往。

## 实现决策

- **工具链（uv 单点）**：tests/ 落 `pyproject.toml` + `uv.lock`（钉 pytest 9.x
  与 Python 3.12）；首次 `uv sync` 联网一次，此后 `uv sync --offline` 可重复
  （满足 need A2 双约束）；tests/ 内 `uv run pytest` 为唯一入口；从仓库根（check.sh
  门禁执行命令所在的工作目录）进入同一锁定环境须显式指项目：`uv run --project
  skills/setup-workspace/tests pytest …`——uv 只从当前目录向上发现 pyproject
  （实测 uv 0.13.5：父目录运行报 `No project found`，加 `--project` 报
  `Found project root`）；工具链本地产物（虚拟环境、pytest 缓存、`__pycache__`）
  不入库、不得污染工作树状态——迁移全程各工作树 `git status` 须保持干净（编排
  门禁以干净工作树判收口起点）；tests/README 记工具链（uv、锁文件、无其他运行时
  依赖、两级入口命令）。
- **结构映射**：每条 bash 用例 → pytest 测试函数或 parametrize 参数行；夹具
  （new_repo 的 mktemp+git init）→ conftest.py 的 function 级 fixture（tmp_path
  为基）；子进程断言 → `subprocess.run(capture_output=True, text=True)`，显式
  `encoding="utf-8"`，退出码/stdout/文件副作用三类断言直译；oseq 词序语义用
  Python 重写，以旧 oseq 助手对同一输入的输出做黄金样本对照验证零漂移。
- **等价红线（不变，承接残余风险⑧）**：等价索引脚本枚举旧套件全部 529 条断言的
  参数级清单（退出码期望、子串参数、词序序列）——全集口径 = 通过计数点：助手调用
  528 条（t 443 + tn 32 + oseq 53）+ 不经助手的内联断言 1 条（物化演练：`check.sh
  ticket` 退出码 0 且输出含「已 reviewed」）；索引条数与旧套件自报通过数（529）
  一致是索引完整性的机械核验。索引条目逐条唯一标识：旧套件有 2 条用例描述完全相同
  （「FR-1 门禁不沿用未接入即拒的措辞（不要求 check.sh 存在）」出现 2 次），描述
  不可作唯一键。新套件逐参数对号 529/529；双跑对照逐用例比 pass/fail，抽 10% 旧绿
  用例注故障验证新断言真红。
- **批 1 兼宿主实测（承接残余风险⑦）**：批 1 验收含全流程实操记录（uv sync →
  offline 重跑 → pytest 运行 → 人为造败看诊断呈现），实测不过即停批 2/3。
- **分发物保护（使用方零影响门禁）**：迁移任何提交不得触碰
  `skills/setup-workspace/assets/`；批 3 验收含 `git diff <迁移基点>..HEAD --
  skills/setup-workspace/assets/` 为空的机械核验。
- **门禁切换**：批 3 把本仓 `.sdlc/config.sh` 的 `CHECK_TEST` 切为
  `uv run --project skills/setup-workspace/tests pytest skills/setup-workspace/tests`
  （config.sh 用户所有，setup 重跑不覆盖）；切换前提 = 等价签收完成。
- **报告修订（批 3 顺带，含盲区更正）**：① uv 盲区更正——pytest 分析原按系统
  python3.9.6 口径，「锁死 8.4.2」论据被 uv 溶解， bats 推荐降级为两可、路线
  由用户拍板 pytest+uv；② node:test 否决理由更正（`assert.match` 实测显示实际
  输出）；③ 成本算式补汇总行；④ 死链改正确地址；⑤ 发版节奏改实测口径；
  ⑥「21 条」口径注补数法定义。
- **翻译纪律**：断言期望值一律来自旧套件字面量（独立来源），禁止用 Python 逻辑
  重算期望（ref-testing 同义反复禁令）；中文输出/多字节文件名按字节敏感比对。

## 测试决策

- seam：pytest 套件对 `assets/check.sh` 各子命令的外部行为断言（退出码/输出/
  文件系统副作用），与旧套件同 seam（旧套件测的就是分发物本体，见 run-tests.sh:10）。
- 双跑对照 = 旧 run-tests.sh 与 pytest runner 对同一夹具工作树各跑一遍逐用例比对；
  等价索引脚本落盘 tests/（输入旧 run-tests.sh，输出 JSON 清单），批 1 交付。
- 迁移本身不新增对 pytest 的元测试（框架行为由上游保证）；批 1 宿主实测以实操
  记录取证。

## 验收场景

- [FR-1 | 工单级] Given 批 1 完成，When 实操记录核验，Then uv sync 联网一次 +
  `uv sync --offline` 重跑成功 + pytest 试点子集全绿 + 人为造败呈现重写断言
  表达式与期望/实际全文，pyproject/uv.lock 钉 pytest 9.x 与 Python 3.12 在案。
- [FR-2 | 工单级] Given 等价索引脚本，When 对旧套件运行，Then 输出 529 条清单
  （528 条助手调用 + 1 条内联断言；每条含退出码期望、子串参数、词序序列，条目
  唯一标识），清单条数与旧套件自报通过数一致，新套件逐参数对号一致；不一致即阻塞。
- [FR-3 | 工单级] Given 双跑对照，When 同一夹具跑旧套件与 pytest 套件，Then
  逐用例 pass/fail 一致；抽 10% 旧绿用例注故障，新断言真红。
- [FR-4 | 工单级] Given 批 2 完成，When 全量运行 pytest 套件，Then 529 条全数
  对号在案且全绿，旧 run-tests.sh 仍在盘未被删改。
- [FR-5 | 工单级] Given 批 3 完成，When 检查门禁接线，Then `.sdlc/config.sh` 的
  `CHECK_TEST` 为 `uv run --project skills/setup-workspace/tests pytest ...` 且
  `check.sh all` 全绿；旧 run-tests.sh 已删；tests/README 工具链清单在案。
- [FR-6 | 工单级] Given 迁移全程提交，When `git diff <迁移基点>..HEAD --
  skills/setup-workspace/assets/`，Then 输出为空（使用方零影响门禁）。
- [FR-7 | 工单级] Given oseq Python 重写，When 对黄金样本（旧 oseq 助手真实
  输出 ≥20 组输入）回放，Then 逐组输出一致（零语义漂移）。
- [FR-8 | 工单级] Given 批 3 文档收尾，When 核对报告修订，Then 六处更正落盘
  （uv 盲区、node:test 否决理由、成本算式、死链、发版节奏、「21 条」口径注）。
- [FR-9 | 集成级 | 承载票 批2票] Given 迁移后全套件，When 运行 `check.sh all`，
  Then 全绿且总时长 ≤ 旧套件基线（24.4s）的 3 倍。
- [FR-9 | 集成级 | 人工：迁移质量须维护者使用方视角确认] Given pytest 套件
  日常使用，When 维护者实际写一条新用例并跑失败诊断，Then 体验确认「诊断质量
  优于旧套件、写新用例无解释器规避心智」——dev-accept 人工段清单。

## 非目标

- 改动被测运行时（check.sh、trackers、l4-guard）——分发物逐字节不变（FR-6 门禁）。
- setup-workspace 资产分发 tests（测试仍只活在创作仓库）。
- CI 平台接入与并行调优（pytest 默认单进程语义对齐 CHECK_TEST；xdist 留待需要
  时另立）。
- uv 之外的 Python 包管理器兼容（poetry/pip-tools 不适配）。
- tests 的跨机可移植性验收（宿主=本仓创作环境，need A1）。

## 备注

来源：round 1 调研报告 20261110-36c4（passed）+ 用户对路线的显式拍板（2026-11-10：
迁；uv + pytest）与报告盲区指正（pytest 分析未评估 uv）。原 bats 路线 draft
（20261110-e109）经用户否决「不要替我做决定」后删除——本 spec 的路线决策出处
为用户拍板，报告推荐仅作依据陈述。使用方影响评估（2026-11-10）：tests/ 不分发、
assets/ 逐字节不变（FR-6 门禁）、依赖预算不变——直接影响为零；间接渠道（断言
削弱、dual-copy 守卫弱化）由等价红线覆盖。翻译纪律与等价红线承接残余风险⑧；
批 1 兼宿主实测承接⑦；报告修订含残余风险①④⑤⑥与 uv 盲区新更正。

**修订记录（2026-11-10，原 approved 版经 dev-execute 开工预检退回后修订，未开工、
无 worktree）**：两处口径修订，路线、三批划分与 FR 框架不变——
① 门禁入口命令：原 `CHECK_TEST` 字面量与 tests/ 落点 pyproject 不相容（check.sh
在仓库根直接 eval，uv 只从当前目录向上发现 pyproject；实测 uv 0.13.5 父目录
`No project found`、`--project` 下 `Found project root`）——裁定为命令加
`--project`，pyproject 与 uv.lock 留在 tests/（改动面不变）；同批补工具链本地
产物（.venv/缓存/__pycache__）不入库、不污染工作树状态的要求（编排门禁以干净
工作树判收口起点）。② 断言全集：528 为助手调用点数（t 443 + tn 32 + oseq 53），
套件自报通过 529——多出的 1 条是 run-tests.sh:3398-3406 不经助手的内联断言
（物化演练：`check.sh ticket` 退出码 0 且输出含「已 reviewed」）——裁定为迁入
并按 529 计数，索引条数与自报通过数一致作完整性核验；另实测发现 2 条用例描述
完全相同，补「索引条目逐条唯一标识、描述不可作唯一键」要求。
