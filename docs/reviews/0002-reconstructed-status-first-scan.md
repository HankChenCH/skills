---
id: 0002
status: approved
tickets: [0001, 0003]
branch: main
created: 2026-10-29
---
# 0002: 票 0001 状态机扩 reconstructed + 票 0003 setup-reconstruct 首扫闭环——双轴评审

评审对象：提交 22fa467（`[#0001] check.sh 状态机表扩 reconstructed + 双份逐字一致断言`）与 a35a15d、dff9407（`[#0003] setup-reconstruct 首扫闭环` + 票据落账），同属 spec 0008（approved）。票 0001 先前仅有报告 0001 对其改动行的旁证核对、未声明覆盖，本次一并纳入（单票模式取分支上全部 implemented 工单）。

## 标准轴 findings

（无阻断，无建议）

- **dual-copy-assets 标准全四条核对**：两份 check.sh 逐字一致断言在套件内常驻且绿（第 1 条）；票 0001 Progress 记录红②（改活本未同步时 diff 断言红）后整文件复制转绿（第 2、4 条）；SKILL.md 声称的机械行为逐字取证——`allowed_list` need/spec 两行各含 reconstructed（.sdlc/check.sh:109-110，与 assets 副本逐字一致）、孤儿 FR 负例由套件「reconstructed spec 覆盖缺报孤儿 FR」活体证明、扫描基线附加节过 validate 由「逆向 need 模板喂 validate」用例证明（第 3 条）。
- **ref-testing 基线**：27 条新断言全部落在预定 seam 3（主文档文本契约 + 模板喂 validate），期望关键词取自 spec 0008 与蓝图 §11.18 措辞（独立来源，非镜像实现）；一测一行为，红先绿后（实现前 25 失败实证行为缺失）。tn 负例「门禁不沿用未接入即拒措辞」在红态对空文件空洞通过，由配对的正例 oseq 承载拦截力，套件既有同型先例（dev-accept 文本契约组），不构成缺陷。
- **ref-git-commit 基线**：三笔提交各做一件事，首行 [#NNNN] 祈使语气带行为摘要，正文写红绿证据与取舍；票据落账独立成笔，与仓库先例同型。
- 其余：无重复代码、无死代码、无投机泛化（模板仅三张、参考仅两份，均为主文档点名加载）；run-tests.sh 新增组沿 t/tn/oseq/new_repo 既有风格，diff 最小化，无顺手改动。

## Spec 轴 findings

（无缺失、无走样、无超范围）

票 0001 逐条核销：

- AC1：run-tests.sh reconstructed 用例组 11 条在套件内常驻全绿（validate 通过×2、孤儿 FR 照报、残留门禁不触发 + done 活体探针、phase 原样显示、frontier 不受影响×2 等）。
- AC2：同上组，活体探针证明门禁本身空转必红。
- AC3：check.sh 活本 vs assets 逐字 diff 断言存在且绿；红②观察记录在票内 Progress（改活本未同步 → 断言红 → 整文件复制转绿）。
- AC4：publish 三适配器组、git hook 端到端组、双份 METHOD/GLOSSARY diff 组全绿；基线 159 → 186 无降。
- 机械扩展边界：22fa467 对 check.sh 的改动恰为 allowed_list 两行（spec 0008 D1 唯一机械扩展处），validate/门禁/frontier/publish 零触及。

票 0003 逐条核销：

- FR-1：SKILL.md §0 门禁只查 git 仓库与技能自身文件完整；「FR-1 入口门禁」oseq + 负例 tn 双绿。
- FR-2 场景 2：「FR-2 落盘两路」oseq 绿；need/spec/ADR 三张模板喂票 0001 后的 check.sh validate 全部「通过」，模板状态即 reconstructed/accepted 形态。
- FR-2 场景 3：「FR-2 同名不覆盖成文」oseq 绿（standards 与 GLOSSARY 同名均指名 + 报告冲突交用户处置）。
- FR-3：「FR-3 证据纪律」oseq 绿——句末 文件:行、三选一（补扫取证 / 低置信 + 理由 + 补证路径 / 开放问题）齐备。
- FR-4：五路落点 oseq 绿；逆向 spec need 字段指向逆向 need、孤儿 FR 覆盖由模板实测兜底。
- FR-5：扫描基线字段 oseq 绿；三张模板均带未覆盖声明。
- FR-6：确认前置（草案先行、不确认不落盘、显式确认、沉默不算确认）+ 全程只读 + 路由表不加行 + 出口报告 + 指路，四组断言绿。
- seam 3 契约：spec 测试决策六关键词（reconstructed、证据格式、确认前置、两路落盘、扫描基线、增量对齐）在主文档全部命中（grep 计数 2/2/2/1/3/2 处）；186/186 ALL PASSED，check.sh all 全量检查通过。

范围判定：票 0003 diff 未触及 README、蓝图、check.sh、METHOD、GLOSSARY（spec 非目标「活本零改动」符合）；§5 增量对齐四行系 spec 测试决策 seam 3 契约的主文档关键词要求，协议细则文件与演练仍归票 0004，不构成超范围。

## 范围外备注

- README:137「第 22 个实现接续中」在 0003 落地后仍准确（增量对齐与补扫协议待票 0004，spec 整体确在接续中）；待 0004 落地或 spec 验收后由面向人文档的维护流程（dev-docs 或后续票）收口，不计 finding。
- 模板以尖括号占位符形态提供（validate 不查占位内容），夹具以 0001 编号落盘实测；生产落盘由 artifact-templates.md 的改编规则约束（编号接最大号 +1）。
- 工作区存在他人未提交改动（.sdlc/trackers/github.map、specs 0010/0011、票 0011–0016），属 spec 0009/0010 在途流程，本次评审未触碰。

## 汇总

标准轴阻断 0 / 建议 0；Spec 轴阻断 0 / 建议 0。结论：approved。
