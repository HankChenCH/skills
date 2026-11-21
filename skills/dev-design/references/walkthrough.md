# walkthrough.md：GWT × 三视图走查规程

分析形态三视图起草完成后、请用户批准（第一道门）之前读本册。

## 组合性质声明

本规程是**组合方法，不是任何单一文献的既有规程**。骨架三源有一手出处：

- **CRC 卡**（OOPSLA'89，c2.com 作者官网全文）：走查暴露未覆盖职责 →
  "either add the responsibility to one of the objects, or create a new
  object"；定向场景探测薄弱点（"suggesting scenarios aimed specifically at
  suspected weaknesses or omissions"）。
- **RUP**（IBM Rational 官方过程文档）："Identify the analysis classes
  responsible for the required behavior by stepping through the flow of
  events of the scenario"——沿场景事件流逐步走查。
- **Use Case 2.0**（Ivar Jacobson 官方白皮书）："As the team walks-through
  the design they picture it on a white board"；use-case realization 的
  认可表达形式明确包含 data-flow diagrams。

「GWT 场景绑定三视图」「图上走通 = 完备」的二元验收判据是**工程化推断**，
不在上述任何一手文献中（CRC 原文是"按需补卡"而非失败判据）；数据模型的
走查仅有弱支撑（UC2.0 把数据库表纳入 realization 范围、RUP 有 persistence
行为步骤）。本册措辞按组合方法如实声明，不冒充既有规程。

## 操作规程

**输入**：design 三视图 draft + need 的 `## 场景` 节（逐条 Given/When/Then，
GWT 格式出处 Dan North "What's in a story?"）。

1. **逐场景遍历**：按 need 场景节顺序，每条场景在三视图上各走一遍：
   - 流程模型：沿数据流走——场景的触发数据从哪个外部实体进来、流经哪些
     过程、落到哪个存储、输出从哪出去。有一步找不到过程或流 → 走不通。
   - 对象模型：沿关联走——场景动作落到哪个概念类、要牵动哪些关联的
     多重性。有一步没有概念类承载 → 走不通。
   - 数据模型：沿实体落点走——场景要留下或读出的数据在哪个实体、
     哪些属性。持久化数据找不到归属实体 → 走不通。
2. **逐条留走查记录**：场景号 + 三视图各自结论 + 走通 / 走不通。记录写在
   design 的「缺口与矛盾」节前半（SKILL.md 模板约定），一行一条。
3. **走不通 → 判卡点**：卡在哪张图、缺什么元素（过程 / 数据流 / 概念类 /
   关联 / 实体 / 属性），逐条进「缺口与矛盾」节：缺口描述 + 卡在哪张图 +
   处置去向（dev-spec 归置）。
4. **补图循环（CRC 原型）**：图上能当场补的元素（补一条数据流、补一个
   属性）补完**重走该场景**——这是"走查 → 补 → 重走"循环；补不了的
   （需求本身没定、要用户拍板）就是真缺口，留痕不硬补。need 本体不回改。
5. **出口判据（二元，工程化推断）**：走查完成 = 全部场景各有记录 + 走不通
   路径全部进「缺口与矛盾」节 + 每条缺口有去向。走查通过**不是完备性
   证明**——它只表达"现有场景没有未处置的走不通路径，已知缺口逐条留痕"；
   完备性判断由用户批准这道门承载。走查完成且缺口逐条留痕后，按 SKILL.md
   §5.1 抛决策问题请用户批准置 analyzed。

## 走查记录格式例

```
- 场景 1：流程模型 1.0 → D2/D1 两存储均有流，对象模型「物品-库存流水」关联承载，
  数据模型 STOCK_LEDGER 落点齐——走通。
- 场景 2：D1 → 3.0 → purchaser 可走至通知产生，但通知送达无过程/无实体承载
  ——走不通，缺口 1 入「缺口与矛盾」。
```

缺口行格式：

```
- 缺口 1（场景 2 走查走不通）：缺口描述 + 卡在哪张图。处置：留缺口节，dev-spec 归置。
```

## 与两道门的关系

走查记录是第一道门（analyzed 批准）的**证据输入**：批准前用户看到的
不只是图，还有"哪条场景怎么走的、哪些走不通、缺口去哪了"的逐条留痕。
方案段批准（第二道门）不重跑本规程——分析段批准后是快照，方案段与
分析段冲突走偏离记录制（SKILL.md §4）。
