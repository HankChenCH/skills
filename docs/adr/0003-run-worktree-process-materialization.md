---
id: 0003
status: accepted
created: 2026-10-30
---
# 0003: 过程档 gitignore 化后的运行 worktree 物化机制

ADR 0002 裁决落地后，过程档（docs/tickets|reviews|acceptance〔+docs/overviews，2026-11-07 扩项〕）不再进 git：`git worktree add` 的新建 worktree 不携带任何过程档文件，而 `.sdlc/check.sh` 的门禁（validate、commit-msg、pre-push）全部读**当前工作目录**的盘上过程档——实测 commit-msg hook 在未物化的 worktree 内拦截一切 `[#NNNN]` 提交（报"提交引用的工单不存在"）。本 ADR 记录 dev-execute 编排运行在 gitignore 时代的机械适配（run/0011 运行全程实证，spec 0011 验收报告 0001 折回）。

## 裁决

1. **物化**：编排者建立任何运行/票 worktree 后，立即把主工作区当前过程档目录（docs/tickets、docs/reviews、docs/acceptance、docs/overviews〔2026-11-07 票 20261107-2a2b 扩项〕）以盘上文件复制进该 worktree——untracked、照旧不进任何提交，与 ADR 0002 的"盘上存在、不进提交"语义一致。目录不存在则跳过（如单票 spec 无 docs/overviews）；**物化清单 = 门禁输入目录全集**——新增门禁输入目录（如 FR-7 之于总览）时与清单同批成文，漏枚举的失败模式是门禁在 worktree 内 fail-loud 误拦（FR-7 总览前置实证）。
2. **状态翻转盘上语义**：工单 status 翻转（in-progress/implemented/done）是纯盘上操作；票 worktree 内的翻转副本在**合回前由编排者同步到运行 worktree**，commit-msg hook 据此放行 `[#NNNN]` 合回。run-mechanics §7 "翻转随票分支提交"条文在 gitignore 时代以此替代。
3. **done 翻转不提交**：收口后的票 → done 变更只落盘（validate 通过），不产生 `[trivial]` 提交——过程档无可提交内容，空提交徒增噪音。审计链承载 = tracker 投影（单向不回删）+ 源码 `[#NNNN]` 引用 + 盘上状态。
4. **评审报告随物化走**：dev-review 报告落在票 worktree 的 docs/reviews/，编排者同步到运行 worktree 供 pre-push 覆盖面校验读取。

## 后果

- 正面：门禁语义完全不变（check.sh 零改动），worktree 间的盘上状态由编排者单点维护，物化副本与主工作区状态一致性在每次同步点机械可查。
- 代价：物化是编排者的人工纪律，check.sh 不校验"worktree 是否已物化"——漏物化的失败模式是 hook 拦截（fail-loud，非静默）；多 worktree 副本在同步点之间短暂分叉，以"合回前同步"为唯一一致性要求。
- 修订面：dev-execute run-mechanics §4（建 worktree 后物化）、§7（合回前同步翻转）、§8.4（done 落盘不提交）已随 spec 0012 并发修订成文（票 0022，2026-10-31），本修订面核销（need 0009 验收折回记录）。
- 修订记录（2026-11-07，票 20261107-2a2b）：物化清单补 docs/overviews/（spec 20261107-5cb8 验收期缺陷①——FR-7 总览前置纳入门禁输入时物化清单未随批扩项，≥2 票 spec 票门禁在 worktree 内 fail-loud 误拦，验收报告 20261107-23b0 实证）；随之成文"清单 = 门禁输入目录全集"同步纪律。
- 修订记录（2026-11-09，票 20261108-6057）：裁决 1 物化源修订为「后建票 worktree 以运行 worktree 现状物化（前置票状态取运行 worktree 已同步副本）」——原条文只规定物化动作未定物化源，编排者取主工作区时前置票合回翻转的 implemented 未同步回主工作区，后建票开工入口按陈旧 ready 副本误拦（round 3 运行 d240/7edc 实录，验收报告 20261108-eb9e 下一轮建议 1）；run-mechanics §4 物化条同批修订。
