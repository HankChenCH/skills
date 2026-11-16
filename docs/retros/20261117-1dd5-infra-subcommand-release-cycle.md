---
id: 20261117-1dd5
status: done
created: 2026-11-17
---
# 子命令化周期全程复盘：一次运行零停机全绿、发布被真实 registry 证伪、证伪形态固化为常驻门

## 复盘范围

git 区间 `c79e10e..HEAD`（spec 20261116-2c58 approved → need 20261116-cc67 fulfilled，33 提交）：运行 20261116-2c58 全链（4 票串行链 + 运行内 fix 票 ae48，纯串行零并行）→ v0.2.0 发布（部署验证证伪）→ fix 票 20261116-c1d6 → v0.2.1 发布（新 tarball 通道首跑）→ need fulfilled。未核销遗留素材：评审 20261116-9ea4（现存 docs/reviews/）建议 5+3 条、need 折回节下一轮建议 7 项、验收测试 profile 清理。用户口述主题：无（周期内两阶段会话连续执行）。

## 豁免审计

区间 trivial 提交 5 笔，逐条 diff 证据（`git show --stat`）：

| commit | diff 证据 | 判定 | 依据 |
|---|---|---|---|
| c79e10e | map +6 / spec 知识档 +104（0 删），纯流程产物与 spec 状态落盘 | 合规 | 提交正文写明豁免理由；流程状态转换语义由流程技能条文授权（dev-fix §4.1 同款） |
| f17c80e | need +24-4 / spec +9-1 / ADR 新立 +26 / map +2——蒸馏四路 + spec 置 done 原子收口 | 合规 | dev-accept §4.4 明文授权「恰一个 [trivial] 原子提交」（蒸馏+清扫+置 done）；改动全为知识档与流程状态，零源码 |
| 7b4f32a | CHANGELOG +19 单文件，纯文档 | 合规 | dev-release §4.3 明文授权（版本记账，无逻辑变更）；字面即纯文档 |
| b5f5886 | CHANGELOG +6 / **package.json 版本行 1 行** | 合规（条文授权语义） | dev-release §4.3 明文授权 + §4.2 明文要求版本字段一并同步；package.json 非文档文件超出 GLOSSARY [trivial] 字面（限 typo 与纯文档），判定依据落技能条文——定义缺口已登记（见其他发现），不构成滥用：1 行版本记账、无逻辑变更、豁免理由在正文 |
| 1765caa | need +4-3 单文件（fulfilled 置位 + 补核注记） | 合规 | 流程状态转换（confirmed → fulfilled），dev-accept fulfilled 门机制承载；同 c79e10e 判据 |

**--no-verify 嫌疑提交清单：无**（区间 33 提交全部带 `[#20261116-*]` 或 `[trivial]`，含 PR 合并提交 ce1f876）。

## 其他发现

1. **发布元数据与 tarball 脱钩的证伪链**（本周期最重发现）：v0.1.1 registry tarball 的 bin=`infra.js` 系发布时手工修补、未回写仓库正源——registry 与仓库漂移在正源里无痕；v0.2.0 按正源发布即回归（npm publish 目录直发在打包后重读磁盘清单作上传元数据，元数据 bin=.ts 而包内 .js）。修复（票 20261116-c1d6）把证伪形态固化为常驻门+查（verify-pack bin 查 + prepublishOnly 门封死目录直发，npm/pnpm 双通道实证），符合 docs/standards/falsified-form-gate.md 精神——经验已固化，无新增标准。
2. **GLOSSARY [trivial] 定义缺口**：字面「限 typo 与纯文档改动」不覆盖流程状态转换（spec approved/done、need fulfilled）与版本记账两类本周期实际用法——两类均由 dev-accept §4.4 / dev-release §4.3 条文明文授权，审计据此判合规。词条属 setup 管理章、修订须连带 assets/GLOSSARY.md 双份同步，采纳时面大于收益（见改动清单②裁定）。
3. **流程观察**：ccfb/bfcf/ae48 三票实现完成但票面验收标准 checkbox 未勾，验收轮以场景证据全量核销——属执行疏漏非规则缺失（dev-implement 纪律含勾选要求），留痕供纪律审计，不改规则。
4. **门注释宣称的兜底不存在**：publish-gate.ts 注释称「检查单纪律兜底」而 dev-release 检查单无通道条目——评审 20261116-9ea4 标准轴 #1 指出，本轮采纳①落实（blueprint v1.39 + SKILL §4.5）。
5. **遗留登记**（来源注明，走下一轮票不在复盘落实）：① 9ea4 标准轴代码建议 4 条（verify-pack exitNote 缺态 / bin 原值展示 / listLines 四处收敛 / 门注释补 pnpm 实证）+ 技能待办 1 条已由采纳①消化；② need 20261116-cc67 折回下一轮建议 7 项（文档巡检 [trivial]、勾选纪律审计、contractMessageFor err.code 分发、顶层帮助断言单点、dsh 观测仪器抽取、command-layers 反向依赖断言、prepack 幂等门错误码区分）；③ 验收测试 profile `accept-2c58-f` 清理（无影响）。

## 改动清单

| # | 类型 | 目标文件 | 建议改动 | 默认建议 | 采纳与否 |
|---|---|---|---|---|---|
| ① | 技能 | docs/sdlc-skills-blueprint.md §11.15 + skills/dev-release/SKILL.md §4.5（先 blueprint 后技能） | 发布检查单第 5 步补「发布通道纪律」：设 prepublishOnly 门的包唯一放行通道 = tarball 三步，目录直发与 --ignore-scripts 禁用（pnpm 双通道实证注） | 采纳 | **已采纳落实**（blueprint v1.39 + SKILL §4.5 同批） |
| ② | 标准 | GLOSSARY.md [trivial] 词条 + assets 双份 | 补「流程状态转换/版本记账按条文走 trivial」语义 | 不采纳（面大于收益：setup 管理章 + 双份模板同步；判定依据留档本报告） | 不采纳，理由如左 |
| ③ | 检查 | —— | 无（bin 查+发布门已随票 c1d6 落地，falsified-form-gate 闭环） | 无 | 不适用 |
