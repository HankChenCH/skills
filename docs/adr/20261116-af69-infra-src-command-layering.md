---
id: 20261116-af69
status: accepted
created: 2026-11-16
---
# 20261116-af69: @hankchen/infra src 三层分层与子命令扩展口径

## 背景

need 20261116-cc67 交付前，`bin/infra.ts` 299 行集旗标分发、两层交互菜单、插件安装编排、完成摘要、错误出口五件事于一身，src/ 11 模块平铺无层次；维护者原话「命令会越来越多……避免腐化」（need 20261115-fc48 拍板 D9 预留）。spec 20261116-2c58 round 1（运行 20261116-2c58，验收 20261116-dd67 passed）落地命令面子命令化时同步完成结构分层。

## 决策

src 分三层，扩展口径机械化为「**新增子命令 = 加命令目录 + 装配层注册一处**」：

1. **程序装配层** `src/program.ts`——commander 程序组装、子命令注册（每命令恰一处）、顶层/逐命令帮助、前置分发（裸跑与 `-h`/`--help` 打印帮助退出 0，其余 token 进 commander 路由）、未知命令/未知旗标契约文案（`unknownCommandMessage`/`unknownFlagMessage`，spec 原文锚定）。
2. **命令定义层** `src/commands/<命令>/`——每子命令一目录（index 注册工厂 / add 动词 / names 校验纯函数 / run 共享运行时）；命令间互不依赖，上下文一律经叶模块 `src/context.ts` 取（包根/版本单点），**禁止反向 import 装配层**；跨命令共享语义（名归一化、非 TTY 守卫文案）收敛到共享叶 `src/commands/names.ts` 单源（`normalizeNames` 唯一实现），命令目录经重导出消费。
3. **安装内核层** `src/kernel/`——十模块（asset-map、installer、plugin-install、catalog、lockfile、reconcile、agent-dirs、dsh-command、dsh-profiles、menu）行为等价归位，导出签名与行为零变化，仅被命令定义层调用，零上行依赖。

分层契约由 `test/unit/command-layers.test.ts` 静态守护（目录驱动断言：内核零上行导入、`commands/*/index.ts` 仅被 program.ts 引用、每目录恰引用一次 + addCommand 数 = 目录数），「加目录 + 注册一处」口径不靠约定靠测试。`bin/infra.ts` 为装配壳（读版本、装配、派发、✗ 未预期出口）；raw 模式唯一装载点 = bin 入口。旧旗标顺序状态机（原 src/cli.ts）与两层菜单类型单选构造随本决策退役删除，不留兼容层（need D3 硬切拍板）。

## 后果

- 命令增多时只加 `src/commands/<命令>/` 目录 + `src/program.ts` 注册一处，内核与既有命令零触碰（round 1 内 plugin 命令目录按此口径并入，契约测试零改写即纳管，已实证）。
- 过渡策略为「先并存后硬切」两票完成（f761 并存过渡 → bfcf 硬切收口），过渡窗口内的单源声明与哨兵随内容迁移见对应评审报告（20261116-06b0 / 20261116-9e44）。
- 已知留痕：分层契约「命令侧禁 import program.ts」断言未落（仅注释声明），见 need 下一轮建议；`docs/maintainer-guide.md` src 模块表待文档巡检票同步。
