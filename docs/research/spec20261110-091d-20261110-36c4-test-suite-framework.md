---
id: 20261110-36c4
created: 2026-11-10
---
# 测试套件框架迁移调研：bash 测试套件迁与不迁的四路线对比（spec 20261110-091d）

## 1. 执行摘要（结论速览）

**原推荐：bats-core 原地升级路线**（git submodule 钉 v1.13.x 起步）。推荐依据：它是
四条路线中唯一「运行时不变、夹具不变、测试体仍是 bash」的框架化升级——528 条用例中
475 条（t 443 + tn 32，占 90.0%）为可 codemod 直译的 t/tn 同构形态（其中 238 条带
非空子串断言、237 条纯退出码断言，分布见 §3），53 条 oseq 词序断言原样保留零语义
漂移，其余三条路线的共性否决点见下方各候选结论。

**更正（2026-11-10，uv 盲区）**：pytest 分析原按系统 Python 3.9.6 口径，未评估 uv
（可托管独立 Python 3.12）——「锁死 8.4.2」论据在 uv 工具链下溶解，本推荐降级为
两可（bats-core 与 pytest+uv 均可行）；最终路线经用户拍板：pytest+uv（2026-11-10，
spec 20261110-d145 备注在案）。

各候选一句话结论（对应调研问题）：

- **pytest**：能力舒适区（子进程断言+诊断最强），但对 bash 中心仓库引入第二运行时；
  系统口径下 Python 3.9.6 只能用 pytest 8.4.2（9.x 需 ≥3.10，3.9 已 EOL）——**更正
  （2026-11-10，uv 盲区）**：该论断仅按系统 Python 口径成立，uv 托管 Python 3.12
  后 9.x 可用，「锁死 8.4.2」论据溶解；「引入第二运行时」的代价点不变。（来源
  P1–P7，实测）
- **vitest**：断言表达力够、诊断好（toContain 失败自动展示实际全文 diff），代价
  37MB 依赖树 + lockfile + 约一年一次大版本（5.0 已把 node 下限抬到 22.12）；
  其核心卖点（vite transform、组件测试）对纯进程型 bash 用例全部闲置。（来源 N1–N6，实测）
- **node:test（node 路线内的零依赖变体）**：node 自带零安装、运行期零网络调用。
  **更正（2026-11-10）**：原称「子串断言失败不显示实际输出」失实——`assert.match`
  失败实测会显示实际输出，诊断否决理由撤销；零依赖优势不变，路线取舍经用户拍板
  pytest+uv。（来源 N3/N4，实测）
- **bash 现状基线**：能用（24.4s 全绿），但痛点是慢性的——每条新用例继承
  eval/引号坑（`run-tests.sh:82-83`、`:3694` 两处已留下 bash 3.2 规避注释），失败
  诊断停留在 print 式子串比对。收益/成本对照见 §3.5。

「迁/不迁、迁到哪」的拍板权在用户；本报告只给事实、量化与推荐。

## 2. 对比矩阵（4 路线 × 5 维度）

来源代号见 §6 来源清单；「实测」= 本次本机（darwin arm64 / bash 3.2 /
python3 3.9.6 / node v22.23.4）实跑验证；「判断」= 依据一手来源的推断。

| 维度 | pytest | node 系（vitest / node:test） | bats-core | bash 现状基线 |
|---|---|---|---|---|
| ①安装/离线 | pip+venv；wheelhouse 离线实测通过；锁 8.4.2（P2/P5–P7） | vitest：`npm ci --offline` 可离线，37MB（N1）；node:test：node 自带零安装（N3） | submodule 钉 commit 完全离线；纯脚本零构建（B1/B2） | 零依赖零安装（现状） |
| ②子进程断言 | subprocess.run + parametrize 收敛（P3） | spawnSync + toContain/match，两框架等价（N2/N4） | `@test`+`run` 原生；oseq 可原样保留（B3） | 自研 t/tn/oseq 等效；475 条 t/tn 同构（本仓统计） |
| ③失败诊断 | assert 重写+where 链（P4，实测） | vitest：diff+实际全文（N4）；node:test：显示实际输出（2026-11-10 更正，原判「不显示」失实，N4） | 行号+失败命令+expected/actual（B3/B4） | print 式人工比对（现状） |
| ④宿主兼容 | 3.9.6+arm64 实测跑通；框架线被 Python 版本锁死（P5–P7） | node22 双框架实测；vitest engines 抬 node 下限（N5） | bash 3.2 官方支持三重一手（B5）；3.2 下 `[[ ]]` 坑（B6） | 宿主本身（现状） |
| ⑤维护 | 概念 4 个（P1）；版本线冻结 8.4.2（P6/P7） | vitest：约年一次大版本（N6）；node:test：零配置（N3） | 年 1–2 minor（2026-11-10 更正为实测口径，原记年 2–4）；零配置；学习面最小（B7） | 自研自养，坑即债（现状） |

**矩阵格支撑细节**（长句支撑不进格，按 design-docs 密度口径移此处）：

- ① pytest：`pip download` 8 个纯 Python wheel、`--no-index` 装成功、运行零网络
  （实测）；系统 Python 3.9.6 锁 8.4.2（9.x 需 ≥3.10，3.9 已 EOL）。
- ① node 系：vitest 缓存预热后 0.27s 装完，首次须联网；node:test 运行期零网络调用。
- ① bats：submodule 为官方教程标准用法；纯脚本零构建（brew bottle 单 `all` 佐证）。
- ② pytest：`in` 子串、5 行 helper 词序、tmp_path 替 mktemp；1 函数 10 元组收敛 10 用例。
- ② node 系：toContain/match/fs 断言两框架表达力实测等价。
- ② bats：`run` 捕获 `$status/$output/$lines`；oseq 经 `load` 引入零语义漂移
  （判断，测试体即普通 bash）。
- ② 现状：475 条 t/tn 同构中 238 条带非空子串断言、237 条纯退出码（§3 口径）。
- ③ pytest：子串失败显示期望/实际，`-vv` 展开，穿透 helper 报中间变量（实测）。
- ③ node 系：vitest toContain 失败自动 diff + 实际全文；node:test——**更正
  （2026-11-10）**：`assert.match` 失败消息实测含实际字符串（原记「不含实际
  字符串、须手写 message」失实）。
- ③ bats：默认输出含用例名+文件+行号+失败命令原文；bats-assert 打 expected/actual，
  优于现状 print 式（判断）。
- ④ bats：三重一手——README "for Bash 3.2 or above"、support matrix 列 3.2.57、
  CI 含 bash 3.2+macOS；已知坑：3.2 下 `[[ ]]` 失败不中止用例，须 `[ ]`。
- ④ pytest/vitest：bash 脚本仅作被测子进程，无宿主兼容问题；vitest engines
  `^22.12.0` 随大版本抬 node 下限。
- ⑤ pytest：近 17 个月 10 个版本，活跃；8.4.2 属无新功能维护线。
- ⑤ vitest：约 8–11 个月一个大版本（5.0 抬 node 下限至 22.12）。
- ⑤ bats：年 1–2 minor（2026-11-10 更正为实测口径；原按 v1.8.2→v1.14.0 区间折算
  记年 2–4，偏高频）；零配置；学习面约 8 个概念全为 bash
  语法（判断）；v1.14.0 `run`+errexit 默认变化须钉 v1.13.x 规避（B7）。

- **pytest 列 uv 盲区更正（2026-11-10）**：①「锁 8.4.2」、④「框架线被 Python
  版本锁死」、⑤「版本线冻结 8.4.2」各格均按系统 Python 3.9.6 口径实测成立；uv
  托管 Python 3.12 后三格不成立（8.4.2 论据溶解，pytest 9.x 可用）。

**矩阵格来源标注**：每格结论的完整来源 URL 见 §6。无「来源不足」格——五维度
20 格全部有一手来源或本机实测支撑。

## 3. 迁移成本估算（四分组）

统计口径：`grep -cE '^[[:space:]]*(t|tn|oseq) "'`（2026-11-10 实测 run-tests.sh，
与套件自报 529 相差 1 为套件内部计数器口径，不影响结论）。子串参分布按 t 助手
positional 语义（$4=substr）标准 shell 词法解析（双引号内 `\"` 转义、`$()`/反引号
嵌套引号独立配对；21 条含嵌套的 t 行是朴素正则解析的分词失真源）：t 443 = 206
非空子串 + 220 空串子串 + 17 未传子串参（纯退出码）；tn 32 全带非空子串（负向
断言须有内容）。空串子串与未传参在助手 `if [ -n "$substr" ]` 分支下同效——均为
纯退出码断言。

「21 条含嵌套」数法定义（嵌套引号配对计数，2026-11-10 补）：对 t 行 cmd 参数
（第 3 引号参数，保留源转义）单遍扫描，状态 = 双引号开关 d 与命令替换栈 S——
①替换体外、d=1 时 `\"` 为转义对（跳 2 字符，d 不变；转义规则仅限 `\"`，`\$` 不
消解后随 `$(`）；②`"` 翻转 d，d 由 1 翻 0 且 S 非空时记 1 个嵌套引号对；③遇
`$(`（含 `\$(` 形态）或反引号：S 压栈且 d 置 0——替换体内引号上下文独立重置、
独立配对（反引号不识别单引号抑制）；④遇 `)`（S 非空）弹栈还原 d。行内嵌套引号
对数 P≥1 记「含嵌套」；443 条 t 行按此复算 P≥1 共 21 条（嵌套对合计 44），与
原口径一致。

| 分组 | 数量 | 断言形态 | 单用例迁移成本量级 | 小计 |
|---|---|---|---|---|
| `t` | 443（206 非空子串 + 220 空串子串 + 17 纯退出码） | 退出码[+正向子串] | codemod 批量改写 + 10% 抽样人工核，约 1–2 分钟/条 | 8–12 h |
| `tn` | 32（全部带非空子串） | 退出码+负向子串 | 同上，refute/assert_failure 直译 | ~1 h |
| `oseq` | 53 | 多词滑动窗口词序 | **函数原样保留**（load 引入），仅调用处适配，~1 分钟/条 | 1–2 h |
| 夹具助手 | new_repo×25 / wfile×126 / setfm×32 / fake_cmd×6（调用点）；助手本体一次性重建 | mktemp+git init 夹具、写文件、改 frontmatter、PATH 替身 | 助手重建为 bats load 文件：一次性 4–6 h；调用点多数原样（测试体仍是 bash） | 4–6 h |
| **合计** | 529 断言 + 4 助手 + 基建附加项 | — | 表内小计 14–21 h + 基建附加项 7–10 h（2–3 + 3–4 + 2–3）= **21–31 h ≈ 2.6–3.9 人日** | **加缓冲即总量级 3–5 人日（单人口径）** |

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
   bats 套件并行产出对照结果；等价签收后批 3 切换；**回退 = 删 `.bats` 文件与
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

**落地形态声明（对 spec 实现决策括注的偏离说明）**：spec 括注「旧套件 528 条的
断言面在报告中建索引」——本报告落盘的是索引的生成方法与统计口径（§3），逐条索引
清单不在本报告内展开（528 条逐条枚举会使报告膨胀近千行、稀释拍板可读性）；索引
清单由迁移 spec 的工单按 §3 口径脚本生成，随迁移批 1 一并交付并纳入等价签收。

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
- N1: https://docs.npmjs.com/cli/v11/commands/npm-ci ；https://docs.npmjs.com/cli/v11/using-npm/config （2026-11-10 更正：原址 using-npm-config 已 404；npm ci --offline 本机实测成功，37MB）
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

**修订记录（2026-11-10，迁移 spec 20261110-d145 批 3 工票 20261110-2c82 落盘，
FR-8 六处更正，正文只改相关表述）**：
① uv 盲区更正——§1 推荐段与 pytest 候选结论、§2 支撑细节注：pytest 分析原按系统
python3.9.6 口径，「锁死 8.4.2」论据被 uv（托管 Python 3.12）溶解，bats 推荐降级
为两可，路线经用户拍板 pytest+uv；
② node:test 否决理由更正——§1 候选结论、§2 ③ 格与支撑细节：`assert.match` 失败
实测会显示实际输出，原「不显示实际输出」失实，诊断否决理由撤销；
③ 成本算式补汇总行——§3 表增合计行（表内小计 14–21 h + 基建 7–10 h = 21–31 h，
加缓冲即 3–5 人日）；
④ 死链更正——§6 N1：using-npm-config（404）改 using-npm/config；
⑤ 发版节奏改实测口径——§2 ⑤ 格与支撑细节：bats 年 2–4 minor 改年 1–2 minor
（验收报告 20261110-9631 残余风险⑥）；
⑥ 「21 条」口径注补数法定义——§3：嵌套引号配对计数定义落盘，443 条 t 行复算
P≥1 共 21 条（嵌套对合计 44），与原口径一致。
