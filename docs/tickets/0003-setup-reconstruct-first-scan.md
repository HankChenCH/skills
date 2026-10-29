---
id: 0003
type: feature
spec: 0008
status: done
blocked-by: [0001, 0002]
created: 2026-10-29
done: 2026-10-29
---
# 0003: setup-reconstruct 技能首扫闭环（主文档 + 扫描协议 + 产物模板）

**做什么：** 新技能 setup-reconstruct 可在一个存量 git 仓库独立运行首扫闭环：分轮只读读码 → 逆向产出五路沉淀物草案（逆向 need/spec/ADR + AGENTS.md/GLOSSARY/standards 折叠，每条行为断言带 文件:行 证据与置信标注，每张产物带扫描基线节）→ 用户显式确认 → 两路落盘（未接入仓库先按 setup-workspace 全流程接入再写入；已接入仅写产物）。含主文档文本契约测试（seam 3，dev-accept 先例）。真实仓库端到端（集成级场景）不在本票。

**验收标准：**
- [x] FR-1（spec 场景 1）：主文档入口门禁成文——只查 git 仓库与技能自身文件完整，不要求 check.sh 存在；文本契约断言覆盖该门禁措辞（证据：run-tests.sh「FR-1 入口门禁」oseq +「门禁不沿用未接入即拒的措辞」tn 双绿）
- [x] FR-2（spec 场景 2）：两路落盘判定成文（无 check.sh → 先 setup-workspace 全流程再写产物，一次完成；已接入 → 仅写逆向产物），产物模板七节/八节齐备且逆向 need/spec 落盘即 status: reconstructed，模板喂 validate 可过（用 0001 后的 check.sh 实测）（证据：「FR-2 落盘两路」oseq 绿；need/spec/ADR 三张模板喂 validate「通过」三条绿）
- [x] FR-2（spec 场景 3）：已接入路径同名不覆盖规则成文（docs/standards/ 同名标准文件、GLOSSARY 同名术语报告冲突不覆盖）（证据：「FR-2 同名不覆盖成文」oseq 绿）
- [x] FR-3（spec 场景 4）：证据与置信纪律成文——断言句末统一格式的 文件:行 引用；查无证据的推断三选一（补扫取证 / 显式低置信 + 理由 + 补证路径 / 移入「开放问题」）（证据：「FR-3 证据纪律」oseq +「断言与推断边界成文」双绿）
- [x] FR-4（spec 场景 5）：五路落点模板齐备——逆向 need（业务规则 FR-N + 开放问题收推断不了的问题）、逆向 spec（need 字段指向逆向 need）、逆向 ADR（status: accepted）、三载体折叠（AGENTS.md 哨兵块外速览、GLOSSARY 项目术语章、standards + CODING_STANDARDS.md 索引）、扫描基线节（证据：「FR-4 五路落点齐备」oseq +「need 字段指向」+「reconstructed 关键词」三条绿）
- [x] FR-5（spec 场景 6）：扫描基线节字段成文（commit SHA、日期、已覆盖范围、未覆盖范围、"未覆盖区不得读成不存在"声明）（证据：「FR-5 扫描基线字段成文」oseq +「模板扫描基线带未覆盖声明」双绿）
- [x] FR-6（spec 场景 8）：确认前置成文——扫描全程只读、草案呈报逐张列要点、不确认不落盘；定位按需服务（路由表不加行、出口报告 + 指路）（证据：「FR-6 确认前置」「FR-6 扫描纪律」「路由表不加行」「出口 = 报告 + 指路」四条绿）
- [x] run-tests.sh seam 3 文本契约断言绿（reconstructed 状态、证据格式、确认前置、两路落盘、扫描基线关键词）（证据：run-tests.sh 186 通过 / 0 失败 ALL PASSED，check.sh all 全量检查通过）

**Blocked by：** 0001（逆向产物过 validate 依赖状态表扩展）、0002（治理规则：先改蓝图再改技能）

## Progress
- 首扫闭环成文：SKILL.md（§0 门禁不要求 check.sh → §6 中断交接 + 禁止事项七条）+ references/scan-protocol.md、artifact-templates.md + templates/need|spec|adr 三张实体模板（reconstructed/accepted 形态、带扫描基线节）；run-tests.sh 新增「主文档文本契约（seam 3）」20 断言 + 「模板喂 validate」7 断言，先红（25 失败，行为缺失实证）后绿 186/186 ALL PASSED。
- 尾巴：增量对齐与补扫细则归票 0004（主文档 §5 只留重跑语义关键词，未建 incremental-alignment.md）；README §68 指向的 skills/setup-reconstruct/SKILL.md 断链随本票闭合。
- 评审注意：模板以尖括号占位符形态提供（validate 不查占位内容），夹具中以 0001 编号落盘实测；SKILL.md 章节号被 seam 3 的 awk 锚定，后续改章节结构须同步 run-tests.sh。
