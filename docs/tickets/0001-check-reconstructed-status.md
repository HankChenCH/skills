---
id: 0001
type: feature
spec: 0008
status: implemented
blocked-by: []
created: 2026-10-29
---
# 0001: check.sh 状态机表扩 reconstructed + 双份同步断言

**做什么：** check.sh 的产物状态机表接受 need / spec 的新状态 `reconstructed`——逆向产物落盘后过 validate 不被状态校验误拒（FR-2 的机械使能）；同时补上 check.sh 活本与 setup-workspace 生成资产之间缺失的逐字一致 diff 断言，双份文件从此漂移必被测试拦截（docs/standards/dual-copy-assets.md 第 1 条的存量缺口收口）。其余既有校验、门禁、frontier 行为零改动。

**验收标准：**
- [x] run-tests.sh 新增用例：status: reconstructed 的 need 与 spec 文件过 validate（逆向 spec 带 need 字段且孤儿 FR 覆盖齐 → 通过；覆盖缺 → 报孤儿 FR），`tests/run-tests.sh` 输出 ALL PASSED
- [x] run-tests.sh 新增用例：reconstructed 状态不触发 done 残留门禁（名下有过程档也不报）、frontier 输出不受逆向产物影响
- [x] check.sh 活本 vs assets 副本的逐字一致 diff 断言存在且绿；实施顺序按标准第 2 条先观察红（改活本未同步时断言失败），整文件复制同步后转绿，红绿观察记录写进 Progress
- [x] 既有用例基线不降：publish 组、git hook 端到端组、双份 METHOD/GLOSSARY diff 组全部保持通过

**Blocked by：** 无

## Progress
- 入口修正：spec 0008 frontmatter `status: draft` 与已记 `approved: 2026-10-29` 矛盾（批准日期已落、工单已 ready），按盘上事实修正为 `approved`，入口校验通过后开工。
- 测试先行（seam 1 + seam 2）：run-tests.sh 新增「reconstructed 状态（逆向产物零改动兼容）」用例组 11 条（validate 通过×2、孤儿 FR 照报、done 残留门禁不触发 + done 活体探针、phase 原样显示、frontier 不受影响×2 等）与「两份 check.sh 逐字一致」断言。
- **红①（seam 1，改码前）**：assets/check.sh 未接受新状态，3 用例红——`status 非法（need 允许：draft confirmed fulfilled）：reconstructed`、同型 spec 两处；孤儿 FR 用例与活体探针在红态即通过（规则既有，属钉死行为）。
- **红②（seam 2，改活本未同步）**：活本 `allowed_list` need/spec 两行追加 `reconstructed` 后，「两份 check.sh 逐字一致」红（diff 退出码 1）——标准第 2 条要求的首红实证，断言拦得住漂移。
- **绿**：`cp` 活本 → assets 整文件复制（标准第 4 条），全量 `tests/run-tests.sh` 159 通过 / 0 失败，输出 ALL PASSED。
- 基线核对：publish 三适配器组、git hook 端到端组、双份 METHOD/GLOSSARY diff 组全部通过。
- 计划外发现与处置：main 上两份 GLOSSARY 已漂移 6 词条（逆向产物/扫描基线/对账清单/工作区仓库/成员子仓库/成员清单，活本 72c5fc8 单边更新所致），存量断言开箱即红；按标准第 4 条整文件复制收口，独立 `[trivial]` 提交 9c8d269，不含在本票改动内。
- check.sh 实际改动仅 `allowed_list` 两行（spec 0008 实现决策 D1 唯一机械扩展处），其余 validate/门禁/frontier/publish 零改动。
