# ai-infra

**门禁式 SDLC 技能套件 + 其 npm 安装器 `@hankchen/infra`。**

把「团队 + AI 协作开发」的流程规矩变成机器门禁：31 个技能（均已实现）驱动一条脊柱流水线，九类落盘产物承载全部流程状态，`.sdlc/check.sh` 把规矩变成机器判断。一次软件变更从想法送到验收，全程可中断、可审计、可续接：

```
need（澄清）→ spec（规格）→ plan（拆票）→ implement（实现）→ review（评审）→ ship（交付）→ accept（验收）
```

设计动机与特色设计见[设计动机与特色](./docs/design-rationale.md)；全部技能的分组职责表见[技能清单](./docs/skills.md)。

## 快速上手

依赖 git 与 bash；安装资产另需 Node.js ≥ 24.9.0。在目标 git 项目根目录装技能：

```bash
npx @hankchen/infra skill add    # 交互勾选要安装的技能（skill add <名...>、--all 免交互）
```

然后在目标仓库的会话里运行 `/setup-workspace` 接门禁。顺序固定：先装技能、后接门禁；只装技能不接门禁，流程技能会在入口校验时拒绝并提示先运行 /setup-workspace。安装命令形态、插件安装、npm 镜像代理与 tracker 配置见[安装与接入](./docs/getting-started.md)。

一轮最小闭环：

```
/dev-clarify → /dev-spec → /dev-plan → /dev-implement → /dev-review → /dev-ship → /dev-accept
```

## 文档

| 文档 | 说明 |
|---|---|
| [docs/getting-started.md](./docs/getting-started.md) | **安装与接入**：技能/插件安装命令、npm 镜像代理、接入后的工作区、check.sh 子命令 |
| [docs/design-rationale.md](./docs/design-rationale.md) | **设计动机与特色**：要解决的三种失控、四层防线、七个特色设计、致谢 |
| [docs/skills.md](./docs/skills.md) | **技能清单**：31 个技能的分组职责表 |
| [docs/maintainer-guide.md](./docs/maintainer-guide.md) | **维护者指南**：仓库结构、src 模块、开发命令与类型硬约束、已知坑、发布流程 |
| [docs/METHOD.md](./docs/METHOD.md) | 流程规范（唯一来源） |
| [docs/sdlc-skills-blueprint.md](./docs/sdlc-skills-blueprint.md) | 设计蓝图（唯一设计真相源；治理规则：先改文档再改技能） |
| [docs/concepts.md](./docs/concepts.md) | 概念定位档案 |
| [docs/plugin-assets.md](./docs/plugin-assets.md) | 插件资产规范 |
| [docs/standards/](./docs/standards/) | 编码标准分册 |
| [docs/sessions/](./docs/sessions/) | 设计会话纪要 |
| [GLOSSARY.md](./GLOSSARY.md) | 术语表 |

## 项目状态

31 个技能均已实现（含 design-\* 界面设计套件 4 个，spec 0015 交付；dev-quick-implement 快通道随 spec 20261111-1dcd 交付）。
