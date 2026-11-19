---
id: 20261119-ad86
status: done
created: 2026-11-19
---
# 2026-11-19 事故处置与 v0.2.4 发布周期：trivial 滥用审计与通道口径消歧

## 复盘范围

用户点名范围：2026-11-19 全周期（dsh-mcp 插件事故处置 + v0.2.4 双包发布）。相邻 2026-11-18 的 5 笔 docs-only [trivial]（f5e5bec / 1329aa6 / 9a507a1 / c6e63f4 / b83d3ba）一并陈述（合规，无风险信号）。上一份 done 报告 = 20261117-1dd5。关联产物：spec 20261119-7a9a（manager 运行时解耦 round 2，approved，4 票 ready）、追认登记 20261119-5625 / 20261119-16d3（+ spec 4917 / 9b9d）、v0.2.4 发布（tag 已推，插件 0.3.2 + 初始化器 0.2.4）。

## 豁免审计

| commit | diff 证据（文件/规模） | 判定 | 依据 |
|---|---|---|---|
| c6a4a83 | README.md + docs/plugin-assets.md，纯文档 | 合规 | [trivial] 定义：纯文档改动 ✓ |
| d835ff5 | spec 落盘（docs/specs/）+ .sdlc/trackers/github.map，流程产物 | 合规 | 纯文档/记账 ✓ |
| ca0b9de | CHANGELOG.md + 两包 package.json version bump，无逻辑变更 | 合规 | dev-release §4.3 明文许可发布记账走 [trivial]（豁免理由已留 message） |
| 7a25c54 | agents/dsh/plugins/dsh-mcp/index.ts（源码 +20/-1）+ test/unit/dsh-mcp-plugin.test.ts（+13）+ README（+2） | **滥用** | GLOSSARY「[trivial]」限 typo 与纯文档；真改代码应走快通道（dev-quick-implement）。缓释事实：用户显式要求、red-green 单测先行（28/28 绿）、全量门禁绿、规模小、message 记因果。补救 = 采纳 A（追认登记 20261119-5625 / 4917） |
| 53c113c | agents/dsh/plugins/dsh-mcp/client/index.ts（源码 +1/-1）+ 契约测试（+8）+ design 0004 注记 | **滥用** | 同上。缓释同左（red-green 契约断言 7/7 绿）。补救 = 采纳 A（追认登记 20261119-16d3 / 9b9d） |
| 13432ed | docs/needs/20261119-8458 need 落盘，纯文档 | 合规 | 纯文档 ✓（另一会话的 codeup 投影 need） |

**--no-verify 嫌疑**：当日 7 笔提交全部带 `[trivial]` 标记，无裸提交，无嫌疑。

**滥用根因**（流程口径差，非个例风险）：AGENTS.md 哨兵块「小修走 [trivial] 豁免」的「小修」措辞，与 GLOSSARY「[trivial] 限 typo 与纯文档；小但真改代码走快通道」存在口径差——源码小改动因此被误导进 trivial 通道。消解 = 采纳 B（CODING_STANDARDS 增通道判定分册 docs/standards/commit-channel-selection.md）；哨兵块措辞修订为蓝图 + setup-workspace 技能下轮待办（哨兵块勿手改）。

## 其他发现

1. **事故根因已立项承接**：desktop profile 事故（插件依赖 `^rc.2` 被 minimumReleaseAge 门解析到最老满足版 rc.2，宿主运行时 rc.5 兼容门静默禁用 manager 行且连带官方预挂行）根因 = 发布期静态版本范围无法保证 manager ≡ 运行时同 rc——ADR 20261118-ad91 决策 1 证伪，spec 20261119-7a9a（方向 a+c）承接，非新增项。
2. **发布欠账（历史，不可回填）**：v0.2.2 / v0.2.3 已发布但无 CHANGELOG 节，v0.2.3 从未打 tag——已发布条目不可变（dev-release 禁令），欠账如实记录于本节；dev-release 纪律本次周期已按检查单执行（CHANGELOG 新节 + tag + 双包 tarball 三步）。
3. **诊断方法论留痕**：三层状态模型（`--dump-config` 合成树 ≠ 运行时行状态 ≠ 插件管理器开关）、症状三联征（/mcp 不识别 + 面板 no active Remote + 本体行 pending）、金标准证据只在 boot 日志（`dsh: disabling profile plugin row`；devtools console 无错）——已写入插件 README「已知边界」（c6a4a83），排障者下次按图索骥。
4. **引号感知解析**（斜杠命令直接支持带空格/引号值）= 插件 round-3 候选，未立项（指路 /dev-clarify）。
5. **相邻残留**：11-18 五笔 [trivial]（投影/tracker 记账/基线注记）全为 docs-only，合规。
6. **环境遗留（用户未采纳 C 项，未执行）**：/tmp/dsh-mcp-walk-78310 走查残留未清理；desktop profile node_modules 的 manager overrides（rc.5）收敛待 spec 7a9a 票 f3e4（剥依赖）落地后处理——两处留此提醒。

## 改动清单

| # | 类型 | 目标文件 | 建议改动 | 采纳 |
|---|---|---|---|---|
| A | 流程产物（追认登记） | docs/needs/20261119-5625、20261119-16d3；docs/specs/…4917、…9b9d | 为两笔滥用豁免补立快通道形态 need+spec 追认登记 | **采纳**（已落实，[trivial] 提交） |
| B | 标准（标准修订） | docs/standards/commit-channel-selection.md（新建）+ CODING_STANDARDS.md（索引行） | 通道判定分册：[trivial] 限 typo/纯文档，小但真改代码走快通道，判据 = 动不动 docs 产物之外的文件；哨兵块措辞修订登记蓝图待办 | **采纳**（已落实，[trivial] 提交） |
| C | 环境遗留 | 会话外（/tmp、desktop profile） | /tmp 残留清理 + overrides 收敛提醒 | 不采纳（用户未采纳；两处已在本节留提醒） |
| D | 不采纳 | CHANGELOG.md | 回填 v0.2.2/v0.2.3 节 | 不采纳（违反「已发布条目不可变」禁令；理由记录） |
