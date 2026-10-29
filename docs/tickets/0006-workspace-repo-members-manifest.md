---
id: 0006
type: feature
spec: 0009
status: ready
blocked-by: [0005]
created: 2026-10-29
---
# 0006: 工作区仓库落装与成员清单入册

**做什么：** 多仓模式初始化把根目录 git init 成工作区仓库并落全套现行资产；扫描
第一层生成候选清单（逐个标注单仓 / monorepo），一轮交互默认全入册、用户只点名排除；
成员清单落 `.sdlc/`（setup 所有权、重跑整体重写）；根 .gitignore 以带标记段登记成员
目录；非成员目录零接触。

**验收标准：**
- [ ] 临时多仓夹具（3 个 git 仓库 + 1 个普通目录）走完整初始化：根为 git 仓库且
  check.sh、config.sh、trackers、METHOD.md、GLOSSARY、AGENTS.md 哨兵、根 hooks 全部
  就位，`check.sh phase` 与 `frontier` 正常输出（空库提示不报错）
- [ ] 清单文件逐行只含被确认的 3 个仓库目录名；普通目录经 `find` 证明无任何写入
- [ ] decisions.md 增决策 4（入册确认：一次列全、默认全入册、点名排除）；
  generation.md 增工作区仓库、成员清单文件、.gitignore 标记段细则；收尾报告模板增
  多仓行
- [ ] .gitignore 标记段幂等：模拟重跑不重复追加，用户自有行一字不动

**Blocked by：** 0005

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
