# 产物模板与证据格式

五路落点的写法细则。模板实体在 templates/（need.md / spec.md / adr.md），
落盘以模板为底改编，不得凭记忆手写替代；改编只动三类占位：
编号与日期、尖括号内容、证据引用。

## 证据格式（全文统一，可 grep）

- 单处：句末 `（证据：相对路径:行号）`，如 `（证据：src/checkout/order.py:31）`。
- 多处并列：`（证据：src/a.py:12，src/b.py:7）`。
- 低置信：`（证据：src/coupon.py:8，低置信：一句理由；补证路径：怎么查实）`。
- 相对路径相对目标仓库根；行号对应扫描时点的 HEAD。格式唯一——增量对齐靠
  grep 证据引用定位漂移，写成散文式引用会让重跑失去机械抓手。

## 五路落点

1. **逆向 need** → docs/needs/。编号接目录内最大号 +1（空目录从 0001 起）；
   need 模板七节齐备；「系统能力需求」列逆向业务规则，每条 FR-N 句末带证据；
   「开放问题」收扫描推断不了、须仓库主人补答的问题；
   落盘即 status: reconstructed。
2. **逆向 spec** → docs/specs/。编号同理；spec 模板八节齐备；frontmatter
   `need:` 指向对应逆向 need——孤儿 FR 校验照常生效，验收场景必须覆盖
   need 全部 FR-N；`[FR-N | 工单级]` 语义 = 单模块内可对照证据核验，
   `[FR-N | 集成级]` 语义 = 跨模块协作行为；落盘即 status: reconstructed。
3. **逆向 ADR** → docs/adr/。status: accepted——描述的是当前在生效的决策；
   adr 状态机零扩展（accepted / superseded）。
4. **折叠内容三载体**（不是独立产物，落进既有文件）：
   - AGENTS.md：哨兵块**外**追加项目速览段（架构一句话、入口位置、各沉淀物索引），
     不动哨兵块与既有内容；
   - GLOSSARY.md：项目术语章按既有格式追加领域术语
     （`术语 —— 定义（首次出现的产物）`）；
   - docs/standards/ 落逆向编码标准文件，并在 CODING_STANDARDS.md 索引登记一行。
5. **扫描基线节**：need / spec / ADR 每张都带，字段照模板——commit（SHA）、
   扫描日期、已覆盖范围、未覆盖范围，附声明"未覆盖区不得读成不存在"。

## 同名不覆盖（已接入仓库）

- docs/standards/ 已有同名标准文件、GLOSSARY 项目术语章已有同名术语 → **不覆盖**，
  报告冲突（己方草案要点 vs 既有内容）交用户处置；处置前该件不落盘。
- AGENTS.md 与 GLOSSARY 的其余既有内容逐字不动，只做追加。

## 落盘状态与提交

- need / spec 落盘即 status: reconstructed——不进 frontier 与待办语义，
  正向流程（蒸馏、清扫）永不触碰。
- 落盘后提示仓库主人自行提交（纯文档改动适用 [trivial] 豁免）；本技能不做 git 提交。
