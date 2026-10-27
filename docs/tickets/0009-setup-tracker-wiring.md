---
id: 0009
type: feature
spec: 0004
status: ready
blocked-by: [0006, 0007, 0008]
created: 2026-10-27
---
# 0009: setup 接线与批 3 话术清理

**做什么：** setup-workspace 按决策 1 安装所选适配器（generation 细则扩展），decisions.md 决策 1 通用说明现状化（投影语义、codeup 配置清单、MCP"直连优先、可选增强"指引），SKILL.md 决策 1 过时话术同步；check.sh（assets 与本仓实例同步）缺失适配器警告文案由"尚未实现（计划批 3）"改为"未安装"并给重跑 setup 指引，run-tests.sh 既有两条"尚未实现"用例同步改版。

**验收标准：**
- [ ] generation.md：决策 1 非 local 时在 local.sh 之后追加安装所选适配器（可整体覆盖；用户自定义适配器照旧不动），文案可执行（FR-4｜证据：文本评审 + 蓝图 §11.1 v1.12 措辞一致）
- [ ] decisions.md：通用说明不再出现"适配器属批 3 未实现"；给出 codeup 四个配置项含义与获取途径；MCP 指引按蓝图 v1.12 形态落（FR-4｜证据：grep 无过时话术）
- [ ] SKILL.md 决策 1 行同步现状（FR-4｜证据：grep）
- [ ] check.sh 缺失适配器（夹具无 github.sh）：exit 0，输出含"未安装"与重跑指引；原有"local 缺失=安装损坏 exit 1"行为不变（FR-4｜证据：run-tests.sh 用例绿）
- [ ] 全仓 grep"批 3"适配器话术仅存于蓝图历史修订记录、批次清单等正当出现处（FR-4｜证据：grep 输出清单）

**Blocked by：** 0006, 0007, 0008

## Progress
（实现过程中追加：做到哪步 / 下一个动作 / 卡在哪，三行以内）
