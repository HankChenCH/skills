# 证伪形态常驻门（falsified-form gate）

被真实协作者证伪的发布形态，其证伪结论必须固化为发布门的**常驻拒绝校验**（fixture 钉住、缺陷信息引用证伪报告），不得只留测试 skip 立档——skip 是「本轮不跑」，门是「永不放行」；环境放开（协作者升级支持该形态）时才由人显式移除门并开轮重验。判定依据：skip 留档的证伪知识随过程档清扫丢失，而发布门 fixture 每次发布都重放证伪结论，防止同一形态被再次发出。

配套纪律：**双态资产校验判定单点**——源码态与发布态清单不一致的资产（如源码 .ts / 发布 .js 的包），其校验器两态差异（main 形态、files 构成、残留扫描）必须在恰一个判定函数内显式枚举，禁平行两套判定逻辑漂移；两态 fixture 各一套（真实组包、不 mock FS，替身保真纪律同源）。

反例（本标准的由来）：round 1 FR-7 证伪（dsh 宿主拒载 node_modules 下 .ts，ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING）最初以集成测试 skip 报因留档——形态 itself 仍可被 pack 发出；round 2 落地回退时将该证伪升级为 verify-bundle 发布态常驻拒绝（main 指 .ts 即拒、tarball 含 .ts 即拒），首现：spec 20261115-ed9f。
