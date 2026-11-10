---
id: 20261110-36c4
created: 2026-11-10
---
# 测试套件框架迁移调研：bash 测试套件迁与不迁的四路线对比（spec 20261110-091d）

## 1. 执行摘要（结论速览）

**推荐：bats-core 原地升级路线**（git submodule 钉 v1.13.x 起步）。一句否决理由：
它是四条路线中唯一「运行时不变、夹具不变、测试体仍是 bash」的框架化升级——528 条
用例中 83.9%（t 443 + tn 32，均为「退出码+子串」同构断言）可脚本化批量改写，53 条
oseq 词序断言原样保留零语义漂移，而诊断质量获得框架级提升（失败自带行号+失败命令
原文+expected/actual）。

各候选一句话结论（对应调研问题）：

- **pytest**：能力舒适区（子进程断言+诊断最强），但对 bash 中心仓库引入第二运行时；
  且本仓系统 Python 3.9.6 只能用 pytest 8.4.2（9.x 需 ≥3.10，3.9 已 EOL），锁死在
  无新功能维护线。（来源 P1–P7，实测）
- **vitest**：断言表达力够、诊断好（toContain 失败自动展示实际全文 diff），代价
  37MB 依赖树 + lockfile + 约一年一次大版本（5.0 已把 node 下限抬到 22.12）；
  其核心卖点（vite transform、组件测试）对纯进程型 bash 用例全部闲置。（来源 N1–N6，实测）
- **node:test（node 路线内的零依赖变体）**：零安装零依赖最干净，但子串断言失败不
  显示实际输出（须纪律性手写 message 补偿），诊断短板正中本套件「断言输出子串」
  的主要用例形态。（来源 N3/N4，实测）
- **bash 现状基线**：能用（24.4s 全绿），但痛点是慢性的——每条新用例继承
  eval/引号坑（`run-tests.sh:82-83`、`:3694` 两处已留下 bash 3.2 规避注释），失败
  诊断停留在 print 式子串比对。收益/成本对照见 §3.5。

「迁/不迁、迁到哪」的拍板权在用户；本报告只给事实、量化与推荐。

## 2. 对比矩阵（4 路线 × 5 维度）

来源代号见 §6 来源清单；「实测」= 本次本机（darwin arm64 / bash 3.2 /
python3 3.9.6 / node v22.23.4）实跑验证；「判断」= 依据一手来源的推断。

| 维度 | pytest | node 系（vitest / node:test） | bats-core | bash 现状基线 |
|---|---|---|---|---|
| **①安装形态与离线性** | pip + venv（官方推荐）；离线可行已实测：`pip download` 8 个纯 Python wheel 进 wheelhouse，`--no-index --find-links` 装成功（P2，实测）。日常运行零网络（实测）。**约束：系统 Python 3.9.6 锁死 pytest 8.4.2**（P5/P6/P7） | vitest：npm ci --offline 可离线（缓存预热后 0.27s，37MB node_modules，实测 N1）；首次必须联网一次。node:test：node 自带零安装，离线性完美（N3） | git submodule 钉 commit，官方教程标准用法，一次性联网后完全离线；本体零构建纯脚本（B1/B2） | 零依赖零安装（现状，check.sh:3 依赖预算 bash/awk/grep/sed/git） |
| **②子进程驱动断言能力** | subprocess.run 捕获退出码/stdout/stderr（P3，实测）；`in` 子串、5 行 helper 词序、tmp_path 替代 mktemp；parametrize 同构用例收敛（1 函数 10 元组实测收敛） | spawnSync 捕获 status/stdout（N2）；toContain 子串、toMatch 正则词序、fs 断言——两框架表达力等价（实测） | @test + run 原生覆盖（$status/$output/$lines）（B3）；子串靠 bats-assert --partial；**oseq 可原样保留经 load 引入，零语义漂移**（判断，B3 依据：测试体就是普通 bash） | 自研 t/tn/oseq 已实现同等能力（现状）；528 条中 475 条为同构「退出码+子串」模式（本仓统计） |
| **③失败诊断质量** | 最强：assert 重写 + where 链回显实际命令与 stdout；子串失败完整显示期望/实际（长文 -vv 展开）（P4，实测） | vitest：toContain 失败自动 -Expected/+Received diff + 实际全文（实测 N4）；node:test：**不显示实际字符串**，须手写 message 补偿（实测 N4） | 默认输出含用例名+文件+行号+失败命令原文；bats-assert 打 expected/actual（B3/B4）；显著优于现状的 print 式比对（判断） | print 式：仅报「输出不含子串」+ 输出回显，需人工比对（现状） |
| **④macOS/bash 3.2 宿主兼容** | python3.9.6 + arm64 实测跑通（P5）；但框架线被 Python 版本锁死（见①）。bash 脚本仅作为被测子进程，无兼容问题 | node v22.23.4 + arm64 双框架实测跑通（N5）；vitest engines ^22.12.0——node 小版本下限随大版本抬升（N5） | **官方明确支持 bash 3.2**：README v1.14.0 "for Bash 3.2 or above" + support matrix 列 3.2.57 + CI 矩阵含 bash 3.2 与 macOS runner（B5，三重一手原文）；已知坑：3.2 下 `[[ ]]` 失败不中止用例，须用 `[ ]`（B6） | 宿主即 bash 3.2 本身（现状，坑已实测存在并已注释规避） |
| **⑤维护成本** | 配置近零、概念 4 个（test_/assert/parametrize/fixture）（P1）；但依赖第二运行时且版本线冻结在 8.4.2（Python 3.9 EOL） | vitest：约一年一次大版本 + 依赖树跟进（N6）；node:test：零依赖零配置，词汇量最小（N3），但缺诊断（见③） | v1.8.2(2022-10)→v1.14.0(2026-07) 活跃发版约年 2–4 minor；零配置文件，CLI flag + 环境变量即全部配置面（B7）；会 bash 的人学习面最小（约 8 个概念，全是 bash 语法本身）（判断） | 零外部维护，但自研助手（4415 行）由本仓自己养——坑即债（现状） |

**矩阵格来源标注**：每格结论的完整来源 URL 见 §6；格内「实测」为本机实跑，
「判断」为基于所引一手来源的推断。无「来源不足」格——五维度 20 格全部有一手来源
或本机实测支撑。

## 3. 迁移成本估算（四分组）

统计口径：`grep -cE '^[[:space:]]*(t|tn|oseq) "'`（2026-11-10 实测 run-tests.sh，
与套件自报 529 相差 1 为套件内部计数器口径，不影响结论）。

| 分组 | 数量 | 断言形态 | 单用例迁移成本量级 | 小计 |
|---|---|---|---|---|
| `t` | 443（442 带子串参） | 退出码+正向子串 | codemod 批量改写 + 10% 抽样人工核，约 1–2 分钟/条 | 8–12 h |
| `tn` | 32 | 退出码+负向子串 | 同上，refute/assert_failure 直译 | ~1 h |
| `oseq` | 53 | 多词滑动窗口词序 | **函数原样保留**（load 引入），仅调用处适配，~1 分钟/条 | 1–2 h |
| 夹具助手 | new_repo×25 / wfile×126 / setfm×32 / fake_cmd×6（调用点）；助手本体一次性重建 | mktemp+git init 夹具、写文件、改 frontmatter、PATH 替身 | 助手重建为 bats load 文件：一次性 4–6 h；调用点多数原样（测试体仍是 bash） | 4–6 h |

基础设施附加项（不在上表）：bats/bats-assert/bats-support 三 submodule + runner
封装 + setup/teardown（`$BATS_TEST_TMPDIR` 替代 mktemp）2–3 h；双跑对照与等价
索引 3–4 h；收尾清扫与文档 2–3 h。

**总量级：3–5 人日**（单人口径，含缓冲）。

分批策略概要（≥2 批的切分依据）：**批 1** = 三 submodule + 助手重建 + 取一个
子命令族（约 60 条 t/tn）端到端迁移 + 双跑对照跑通——先用小子集证明「codemod +
双跑」管线，避免 475 条批量改写后才发现断言语义漂移；**批 2** = 其余 t/tn + oseq
全量迁移 + 等价签收；**批 3** = 清扫旧套件。pytest 路线的同口径估算上浮约 50%
（测试体 bash→Python 翻译，非机械改名）；vitest 路线另有 lockfile/缓存预热基建。

### 3.5 现状基线 vs 迁移的收益/成本对照（「不迁」的量化依据）

| 迁移收益（bats 相对现状） | 迁移成本 |
|---|---|
| 失败诊断升级：行号+失败命令原文+expected/actual，替代 print 式人工比对（B3/B4） | 3–5 人日一次性迁移（本节估算） |
| 新用例不再继承 bash 3.2 eval/引号坑（`run-tests.sh:82-83`、`:3694` 两处已留实证注释） | 双跑过渡期的维护双份（批 1–批 2 期间，估 1–2 人日内含在上项） |
| 框架能力白得：单测过滤 `-f`、计时 `-T`、并行 `-j`、`--abort`、失败输出收集、TAP/JUnit 报告（B8） | bats v1.14.0 的 `run`+errexit 默认行为变化——钉 v1.13.x 规避（B7） |
| 528 用例获得映射索引与等价红线，后续 check.sh 改动回归有据 | bash 3.2 gotcha 纪律须固化（`[[ ]]`→`[ ]` 等，B6） |

若判「不迁」：现状 24.4s 全绿可用，不迁的代价是上表左列四项收益全部放弃，
慢性成本（引号坑、人工比对）随用例数线性增长。

## 4. 风险清单（三类）

1. **门禁行为回归**（迁移期间测试不再测同样的东西）：防护 = 等价红线（§5）——
   断言面索引逐条对号 + 双跑对照不一致即阻塞；codemod diff 抽样 10% 人工核。
2. **新旧套件并行/切换/回退**：迁移期旧套件保持 canonical（门禁默认仍跑旧套件），
   bats 套件并行产出对照结果；等价签收后批 3 切换；**回退 = 删 .bats 文件与
   submodule 即可**——纯测试侧改动，零触碰 check.sh，回退成本接近零。
3. **选错框架的退出成本**：bats 最低——测试体与助手全是 bash，oseq 等自研函数
   反向搬回旧套件零成本；pytest/vitest 最高——528 条测试体已翻译成第二语言，
   退出即重写（判断，依据 §2 维度②各路线测试体语言）。

## 5. 等价红线验证策略（FR-4）

- **断言面覆盖索引**：迁移前以脚本枚举 528 条助手调用（t 443 / tn 32 / oseq 53，
  含行号与断言参数）生成索引清单；每条旧用例在 bats 侧必须有对号条目（映射表
  旧用例名 ↔ 新 @test 名），索引清零 = 迁移完整。
- **双跑对照**：迁移期同一 commit 上旧套件与 bats 套件都要跑，逐用例比对
  pass/fail 判定；任何不一致 = 阻塞迁移，查明原因（断言语义漂移 or 暴露了旧套件
  的假绿）后才能继续。
- **旧套件保留**：等价索引清零且双跑连续一致（建议 ≥2 个完整回归周期）并经
  dev-accept 验收前，旧套件不删。

## 6. 来源清单（检索日期 2026-11-10）

**bats-core（一手，B 系列）**
- B1: https://bats-core.readthedocs.io/en/stable/installation.html
- B2: https://github.com/bats-core/bats-core/blob/master/docs/source/tutorial.rst
- B3: https://bats-core.readthedocs.io/en/stable/writing-tests.html ；https://github.com/bats-core/bats-assert/blob/main/README.md
- B4: https://bats-core.readthedocs.io/en/stable/faq.html ；usage.html
- B5: https://github.com/bats-core/bats-core/blob/v1.14.0/README.md ；https://bats-core.readthedocs.io/en/stable/support-matrix.html ；https://github.com/bats-core/bats-core/blob/v1.14.0/.github/workflows/tests.yml
- B6: https://bats-core.readthedocs.io/en/stable/gotchas.html
- B7: https://github.com/bats-core/bats-core/releases ；releases.atom ；releases/tag/v1.14.0
- B8: https://bats-core.readthedocs.io/en/stable/usage.html

**pytest（一手 + 本机实测，P 系列）**
- P1: https://docs.pytest.org/en/stable/getting-started.html ；https://docs.pytest.org/en/stable/how-to/parametrize.html ；https://docs.pytest.org/en/stable/how-to/fixtures.html
- P2: https://pip.pypa.io/en/stable/cli/pip_download/ （wheelhouse 离线安装本机实测成功）
- P3: https://docs.python.org/3.9/library/subprocess.html
- P4: https://docs.pytest.org/en/stable/how-to/assert.html ；https://docs.pytest.org/en/stable/how-to/output.html （诊断输出形态本机实测）
- P5: 本机实测：python3.9.6 arm64 + venv + pytest 8.4.2 跑通
- P6: https://docs.pytest.org/en/stable/changelog.html （9.0.0 弃 3.9 原文）
- P7: https://pypi.org/project/pytest/8.4.2/ ；https://pypi.org/project/pytest/ （requires-python 元数据）

**node 系（一手 + 本机实测，N 系列）**
- N1: https://docs.npmjs.com/cli/v11/commands/npm-ci ；https://docs.npmjs.com/cli/v11/using-npm-config （npm ci --offline 本机实测成功，37MB）
- N2: https://nodejs.org/docs/latest/api/child_process.html
- N3: https://nodejs.org/docs/latest/api/test.html ；https://nodejs.org/docs/latest/api/assert.html
- N4: https://vitest.dev/api/expect.html （vitest 与 node:test 诊断输出形态本机实测对照）
- N5: https://vitest.dev/guide/ ；npm registry vitest engines 元数据（本机 node v22.23.4 实测跑通双框架）
- N6: https://github.com/vitest-dev/vitest/releases ；npm registry time 字段（版本节奏）

**本仓实证（非检索）**
- run-tests.sh 24.4s 全绿实测（2026-11-10）；bash 3.2 规避注释 run-tests.sh:82-83、:3694；
  用例分组统计 t443/tn32/oseq53、夹具调用点统计（§3 口径）。

**二手线索**：无（全部结论均有一手来源或本机实测支撑）。

## 备注

- 候选集扩充：未发生——node:test 属 D5 既定「vitest 等价 node 方案」的路线内变体，
  非扩充；未发现候选集外需要纳入的路线。
- 异常流处置：①「bash 基线胜出」未触发（推荐 bats-core），但 §3.5 的收益/成本
  对照已按量化口径给出，「不迁」仍是有据可拍的合法选项；②扩充未发生（见上）；
  ③「来源不足」格为零，无降级假设。
- 快照意识：版本号与发布节奏只对检索当日（2026-11-10）负责，迁移实施时请复核
  （特别是 bats v1.14.x 的 run+errexit 行为与 pytest 8.x 补丁线）。
- 三份子调研原始材料由三个并行调研代理产出（pytest / node 系 / bats-core 各一），
  关键结论已按 dev-research 纪律回原文核验；pytest/node 系含本机实测复现。
