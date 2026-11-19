# CODING_STANDARDS

编码标准索引。评审标准轴依据：本索引列出的已文档化标准优先于兜底基线；lint / 编译器已强制的事不再人写。

## 索引（docs/standards/）

- [dual-copy-assets.md](docs/standards/dual-copy-assets.md) —— 双份同步资产的一致性保障与成文核对纪律。
- [parse-normalization.md](docs/standards/parse-normalization.md) —— 引用形态判定与键归约单点化：判定单点、键空间同源、失败显式上抛、分支带尾锚。
- [declarative-artifact-strict-parse.md](docs/standards/declarative-artifact-strict-parse.md) —— 声明式工件有效性判断用真解析器：可解析性判据归真解析器全文件解析（同因同位报因），自写解析器只承结构契约，平纯标量禁冒号空格，真跑为最终防线。
- [design-docs.md](docs/standards/design-docs.md) —— 文档与看板呈现的设计语言基线：配色语义板、等宽规则、密度口径、间距与字号阶梯、组件观感与反例；界面设计先读此册，偏离逐条声明理由。
- [design-web.md](docs/standards/design-web.md) —— web 界面设计语言基线（dsh `--dsw-*` token 体系）：配色 alias 面、三路字体、密度口径、圆角/字号阶梯、组件观感与反例；web 界面设计先读此册，偏离逐条声明理由。
- [skill-reference-mounting.md](docs/standards/skill-reference-mounting.md) —— 参考技能挂载双落点纪律：description 发现面 + 正文装载行执行面，蓝图 §7.2 矩阵同批登记。
- [bash-multibyte-bracing.md](docs/standards/bash-multibyte-bracing.md) —— bash 3.2 变量展开紧邻多字节字符必须 `${VAR}` 花括号；日志禁 `head -c` 截 UTF-8。
- [stub-fidelity-integration.md](docs/standards/stub-fidelity-integration.md) —— 替身保真缺口与集成级拦截纪律：被真实协作者校验/解析/发布的交付物不得只靠注入替身测试背书；替身测试钉替身契约、真实链路断言钉工件级语义。
- [node-test-skip-gate.md](docs/standards/node-test-skip-gate.md) —— node:test 前置门跳过纪律：t.skip 只标注不截断，环境门须返回 boolean + 测试体内联 return，禁把 skip 封在不截断的 helper 里。
- [falsified-form-gate.md](docs/standards/falsified-form-gate.md) —— 证伪形态常驻门：被真实协作者证伪的发布形态固化为发布门常驻拒绝 fixture（skip 是本轮不跑、门是永不放行）；双态资产校验判定单点。
- [first-party-api-probing.md](docs/standards/first-party-api-probing.md) —— 外部协作者 API 形态的一手源码探针实证：调研/文档转述只作线索，开工前探针实证、替身契约照真实签名镜像、形态断裂按设计级阻断处置（源自 dsh-mcp 运行 20261117-34d4 实录）。
- [commit-channel-selection.md](docs/standards/commit-channel-selection.md) —— 提交通道判定：[trivial] 限 typo 与纯文档，小但真改代码走快通道（need/spec 三件套），判据 = 动不动 docs 产物之外的文件（源自 20261119-6698 retro 滥用实录）。

## 兜底基线

未文档化的场景按技能基线执行：实现与评审依据 ref-implementation / ref-review；测试依据 ref-testing（场景路由细则按需加载）；提交与合并信息依据 ref-git-commit；文档写法依据 ref-writing。
