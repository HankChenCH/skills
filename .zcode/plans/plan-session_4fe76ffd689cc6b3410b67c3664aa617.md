## 实现计划：dev-implement 技能（蓝图 §12 范文逐字落地）

规格依据：`docs/sdlc-skills-blueprint.md` §11.6「规格即 §12 范文全文，按它实现，不再另写」。提交通道：`[trivial]` 豁免（已确认）。

### 1. 蓝图升 v1.5（先改文档，§13.3 治理规则）
- 版本行改为 `版本 1.5 · 2026-10-27`，在 v1.4 修订记录后新增 v1.5 记录：§12 范文同步 §7.2 引用矩阵（v1.2 增补「dev-implement 开工装载 ref-*」时范文漏同步，按治理规则先改文档再改技能）。
- §12 范文「## 2. 装载上下文」补两句：用 Skill 工具装载 ref-implementation、ref-testing、ref-git-commit；写测试前重读 ref-testing，写哪类测试再按其场景路由表读取对应细则，一次只载一个。
- 同时在 §10.2 第 7 项标 `✅ 2026-10-27` + 自测范围注记（仿 sdlc 条目格式）。

### 2. 创建 `skills/dev-implement/SKILL.md`
照 §12 范文全文逐字落盘（含上述新增装载条款），frontmatter 仅 `name` + `description`，约 82 行。

### 3. 安装
`ln -s` 建立符号链接 `~/.zcode/skills/dev-implement -> 仓库 skills/dev-implement`（与 sdlc / dev-review / ref-* 同法）。

### 4. §13.2 自测五项（结果记录进蓝图 §10.2 条目）
- **触发**：静态核验 description 宽承接直连请求 + 拒绝声明；行为验证留待新会话技能列表刷新（sdlc/ref-testing 同款留待项）。
- **拒绝路径**：实测门禁——`.sdlc/check.sh ticket 0005`（implemented → 拒绝并指路 dev-review）、`ticket 9999`（不存在）、`frontier`；核对技能文本拒绝话术与门禁输出一致。
- **重入**：核验 `check.sh ticket` 对 in-progress 的重入支持（静态，不改动真实产物）。
- **产物校验**：技能文件非八类产物，validate 不适用（ref-testing 先例）。
- **衔接**：出口第 5 条「立即用 Skill 工具调用 dev-review」符合 §8 自动调用契约；dev-review 已安装。

### 5. README 台账更新
「下一步」节：dev-implement 完成（2026-10-27），批 1 余项 dev-spec、dev-plan、dev-ship、dev-accept，下一个 dev-spec；开工话术模板同步改为指向 dev-spec。

### 6. 提交
单提交到 main（既有模式）：`[trivial] 入库 dev-implement 流程技能（蓝图同步 v1.5）`，含蓝图、SKILL.md、README 三个文件；commit-msg 门禁走 `[trivial]` 豁免，不用 --no-verify。符号链接在仓库外，不入提交。