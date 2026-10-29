---
id: 0001
status: superseded
created: 2026-10-29
---
# 0001: 流程产物按知识档/过程档分档，验收后原子收口

> 本 ADR 已被 [ADR 0002](0002-process-tier-gitignore-distill.md)（过程档 gitignore 化叠加蒸馏清扫）取代（status: superseded）；收口机制（蒸馏 + 清扫 + 置 done 原子提交）由 ADR 0002 沿用。

流程产物分两档归置：知识档（need、spec、design、adr、research、standards）进库永久留存；过程档（ticket、review、acceptance）过程中照常进库，验收通过后从工作区删除，git 历史即其归档。收口是单个 `[trivial]` 原子提交：蒸馏折回（need / spec / ADR / standards）+ 清扫删除 + spec 置 done 一次完成，`check.sh validate` 机械拦截"done spec 名下过程档残留"。

## 背景

全部产物同权永久进库使 docs/ 被已完成工单稀释（启用两天 106 个跟踪文件中 docs/ 占 40），静止态仓库不反映"系统现在是什么"。备选方案：归档目录（树重新膨胀，违背"修订历史是 git 的事"）与 gitignore 过程档（审计链离开版本库，门禁失据）均被否。

## 后果

- 工作区闭单后收敛为知识库；审计链在 git 历史与 tracker 投影（单向发布不回删）。
- 协作者查已闭工单必须考古（`git log -- docs/tickets/`）或查 tracker——发现成本上升，为拍板接受的代价。
- 团队受保护分支场景需把收口提交改走 PR，蒸馏/清扫步骤本身不变（need 0005 A1）。
