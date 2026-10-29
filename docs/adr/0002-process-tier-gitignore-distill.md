---
id: 0002
status: accepted
created: 2026-10-29
---
# 0002: 过程档 gitignore 化叠加蒸馏清扫，替代 ADR 0001

流程产物分两档归置：知识档（need、spec、design、adr、research、standards）进库永久留存；过程档（ticket、review、acceptance）自创建起被 `.gitignore` 排除、不进任何提交，过程中盘上存在、门禁照常（状态在盘上不在 git 里），验收通过后随蒸馏清扫从盘上删除。审计链主承载为 tracker 投影与源码提交 `[#NNNN]` 引用。本 ADR 替代 [ADR 0001](0001-artifact-tiering-atomic-closeout.md) 的归置裁决；其"蒸馏折回 + 清扫删除 + spec 置 done 合为恰一个 `[trivial]` 原子提交"的收口机制照旧沿用。

## 背景

ADR 0001 采"过程档照常进库、验收后原子收口"，并把 gitignore 过程档列为被否备选，理由是"审计链离开版本库，门禁失据"。need 0009 确认用户本意是方案 C 与蒸馏清扫叠加：过程档提交持续稀释 git 历史（自举期 8 张工单已被跟踪，在飞票还将继续进库），提交流不再只剩知识档变更与源码提交。被否理由现已不成立，前提变化有二：tracker 投影已实装并经四轮收口实跑，审计链有版本库外承载（tracker 投影单向发布不回删，源码提交 `[#NNNN]` 引用把代码变更追溯回工单）；工单门禁只依赖盘上文件（commit-msg 从盘上读工单状态），归置策略变更不触碰机械层。

## 后果

- git status 与新增提交只剩知识档变更与带 `[#NNNN]` 的源码提交，过程档不再稀释历史；存量过程档提交不回改，永久留存于既有历史。
- 显式代价一：TRACKER=local 仓库工单文件史无痕——过程档从未进过 git，清扫后 `git log` 查不到任何工单文件历史，考古只能靠 tracker 投影。
- 显式代价二：协作场景进行中票不随 clone——协作者克隆仓库拿不到未验收工单的盘上文件，需经 tracker 或另行同步；单人仓库代价为零。
- 新接入仓库由 setup-workspace 生成 .gitignore 三条过程档忽略行（generation 面），存量已跟踪工单经一次性 `git rm --cached` 收口（spec 0011 FR-2）。
