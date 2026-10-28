---
id: 0009
type: feature
spec: 0004
status: done
blocked-by: [0006, 0007, 0008]
created: 2026-10-27
done: 2026-10-28
---
# 0009: setup 接线与批 3 话术清理

**做什么：** setup-workspace 按决策 1 安装所选适配器（generation 细则扩展），decisions.md 决策 1 通用说明现状化（投影语义、codeup 配置清单、MCP"直连优先、可选增强"指引），SKILL.md 决策 1 过时话术同步；check.sh（assets 与本仓实例同步）缺失适配器警告文案由"尚未实现（计划批 3）"改为"未安装"并给重跑 setup 指引，run-tests.sh 既有两条"尚未实现"用例同步改版。

**验收标准：**
- [x] generation.md：决策 1 非 local 时在 local.sh 之后追加安装所选适配器（可整体覆盖；用户自定义适配器照旧不动），文案可执行（FR-4｜证据：generation.md「.sdlc/trackers/{local,github,gitlab,codeup}.sh」节 + SKILL.md §3 表行同步）
- [x] decisions.md：通用说明不再出现"适配器属批 3 未实现"；给出 codeup 四个配置项含义与获取途径；MCP 指引按蓝图 v1.12 形态落（FR-4｜证据：decisions.md 决策 1 Codeup 节改写为"适配器直连优先、MCP 可选增强"，四项配置各带获取途径）
- [x] SKILL.md 决策 1 行同步现状（FR-4｜证据：SKILL.md §3 生成表 trackers 行含"决策 1 非 local 时加装所选适配器"）
- [x] check.sh 缺失适配器（夹具无 github.sh）：exit 0，输出含"未安装"与重跑指引；原有"local 缺失=安装损坏 exit 1"行为不变（FR-4｜证据：run-tests.sh「适配器未安装警告并放行」「未安装警告附重装指引」「gitlab 适配器未安装同样警告并放行」「local 适配器缺失报安装损坏」全绿，99/99）
- [x] 全仓 grep"批 3"适配器话术仅存于蓝图历史修订记录、批次清单等正当出现处（FR-4｜证据：grep 余.agent-adapters 两文件 L4 hooks 引用（真属批 3）与 dev-clarify"每批 3–5 问"（无关），无"尚未实现/适配器属批 3/待批 3"残留）

**Blocked by：** 0006, 0007, 0008

## Progress
- check.sh 警告文案红绿改版（3 用例红 → 文案更新 → 99/99 绿），assets 与本仓实例同步。
- 文档同步五处：generation.md（安装所选适配器 + codeup 待补项）、decisions.md（Codeup 双路径指引 + 通用说明现状化 + GitLab 参考行）、SKILL.md（§3 生成表行）、dev-ship SKILL.md（codeup 括注改为"适配器不承载 PR 创建"——仅措辞，行为不变，超出 spec 非目标禁区的部分未动）、tracker-platforms.md（两处"批 3 实现前"措辞改为维护参考）。
- 无尾巴；评审注意点：dev-ship 一行属顺手消歧（见 Progress 第三行），评审时请核对其超出范围的程度是否可接受。
