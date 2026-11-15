# CODING_STANDARDS

编码标准索引。评审标准轴依据：本索引列出的已文档化标准优先于兜底基线；lint / 编译器已强制的事不再人写。

## 索引（docs/standards/）

- [dual-copy-assets.md](docs/standards/dual-copy-assets.md) —— 双份同步资产的一致性保障与成文核对纪律。
- [parse-normalization.md](docs/standards/parse-normalization.md) —— 引用形态判定与键归约单点化：判定单点、键空间同源、失败显式上抛、分支带尾锚。
- [design-docs.md](docs/standards/design-docs.md) —— 文档与看板呈现的设计语言基线：配色语义板、等宽规则、密度口径、间距与字号阶梯、组件观感与反例；界面设计先读此册，偏离逐条声明理由。
- [skill-reference-mounting.md](docs/standards/skill-reference-mounting.md) —— 参考技能挂载双落点纪律：description 发现面 + 正文装载行执行面，蓝图 §7.2 矩阵同批登记。
- [bash-multibyte-bracing.md](docs/standards/bash-multibyte-bracing.md) —— bash 3.2 变量展开紧邻多字节字符必须 `${VAR}` 花括号；日志禁 `head -c` 截 UTF-8。
- [stub-fidelity-integration.md](docs/standards/stub-fidelity-integration.md) —— 替身保真缺口与集成级拦截纪律：被真实协作者校验/解析/发布的交付物不得只靠注入替身测试背书；替身测试钉替身契约、真实链路断言钉工件级语义。
- [node-test-skip-gate.md](docs/standards/node-test-skip-gate.md) —— node:test 前置门跳过纪律：t.skip 只标注不截断，环境门须返回 boolean + 测试体内联 return，禁把 skip 封在不截断的 helper 里。
- [falsified-form-gate.md](docs/standards/falsified-form-gate.md) —— 证伪形态常驻门：被真实协作者证伪的发布形态固化为发布门常驻拒绝 fixture（skip 是本轮不跑、门是永不放行）；双态资产校验判定单点。

## 兜底基线

未文档化的场景按技能基线执行：实现与评审依据 ref-implementation / ref-review；测试依据 ref-testing（场景路由细则按需加载）；提交与合并信息依据 ref-git-commit；文档写法依据 ref-writing。
