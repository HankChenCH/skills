# Java 编码标准（兜底基线）

> 本文件是评审"标准轴"的兜底基线：repo 已文档化的标准优先于本文，编译器/Checkstyle 已强制的跳过。

## 命名

- 布尔量与 `isXxx()`/`hasXxx()` 读作判断句；禁 `flag`、`data2`。
- 类名是名词短语且不加冗余后缀：`Invoice` 而非 `InvoiceData`、`AbstractManager`。
- 方法名动词开头说清副作用：`parseXxx` 纯计算，`saveXxx` 有副作用。

## 错误处理

- 只捕获能处理的异常类型，禁止 `catch (Exception e) {}` 吞错。
  反例：空 catch 后继续执行 → 记录上下文并转译为领域异常（带 cause）。
- 受检异常表达"调用方必须面对的可能"，运行时异常表达编程错误；不混用。
- 资源一律 try-with-resources；禁 finalize 做清理。

## 模块边界

- 模块深、接口窄：包按职责聚类，禁 `util`、`helper` 大杂烩包。
- 依赖方向单向：api → 领域 → 基础设施；领域层禁止 import 框架注解与 JDBC 类型。
- 可变性最小化：优先 record / 不可变集合；可变共享状态必须有明确的所有者。
- 循环依赖是阻断项：发现即抽接口或下沉共享类型。

## 测试期望

- 只断言外部行为，不 mock 值对象与被测类内部；mock 只留给真正的外部边界。
  反例：`verify(repo).save(any())` 作为唯一断言 → 断言返回值与查询结果。
- 期望值来自独立来源（已知字面量、算例、spec），禁止用实现同款逻辑算期望。
- 一个测试一个行为，测试名即规格：`rejects_expiredInvoice_with_E410`。
- 断言消息含 got/want；参数化表达等价类，不为边界复制用例。
