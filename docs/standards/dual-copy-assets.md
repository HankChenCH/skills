# 双份同步资产的一致性保障

本仓库多处存在"活本 + setup-workspace 生成资产"双份文件（`docs/METHOD.md` 与 `skills/setup-workspace/assets/METHOD.md`、两份 `GLOSSARY.md`、`.sdlc/check.sh` 与 assets 副本）。改动规则：

1. **双份文件必须有常驻逐字一致断言**（run-tests.sh `diff` 断言组，spec 0007 先例）。没有断言的双份文件必然漂移——GLOSSARY 曾在 need 阶段单边更新，直到断言落地才暴露九词条缺口。
2. **先观察红，再收口**：新增断言先跑出失败（漂移实证），同步后转绿；未见过红的断言不能证明它拦得住漂移。
3. **成文措辞与机械实现核对**：文档描述门禁行为（如 METHOD §7 validate 行）必须与脚本实际报错逐字核对（如 check.sh "spec 已置 done 但名下过程档未清扫"），不凭记忆转述。
4. **改动落在活本，同步用整文件复制**：`cp` 保持逐字一致，不做两边各改各的"等价修改"。
