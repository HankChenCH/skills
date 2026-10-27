# TypeScript 编码标准（兜底基线）

> 本文件是评审"标准轴"的兜底基线：repo 已文档化的标准优先于本文，lint/编译已强制的跳过。

## 命名

- 布尔量读作判断句：`isActive`、`hasAccess`；禁 `flag`、`check`。
  反例：`const flag = user.age > 18` → `const isAdult = user.age >= 18`。
- 函数名以动词开头且说清副作用：`parseXxx` 无副作用，`saveXxx` 有副作用。
- 类型名是名词短语，不加冗余后缀：`Invoice` 而非 `InvoiceData`、`InvoiceInfo`。

## 错误处理

- 边界处显式捕获并补充上下文，禁止空 catch 与吞错。
  反例：`try { load() } catch {}` → `catch (e) { throw new LoadError(file, { cause: e }) }`。
- 可预期的失败用返回值表达（`Result` / 判别联合），不可预期的才抛异常；不混用。
- 禁止 `as any` 或非空断言 `!` 来"消除"错误分支——那是把错误藏进运行时。

## 模块边界

- 模块深、接口窄：一个模块解决一类问题，导出面最小化；禁止为图方便 re-export 全部内部符号。
- 依赖方向单向：UI → 领域 → 基础设施；领域层禁止 import 框架类型。
- 循环依赖是阻断项：发现即拆出共享类型模块或引入接口。

## 测试期望

- 只断言外部可观察行为，禁止断言内部调用次数、私有方法。
  反例：`expect(spy.on('validate')).toHaveBeenCalledTimes(1)` → 断言 `result` 或状态变化。
- 期望值来自独立来源（已知字面量、算例、spec），禁止用与实现相同的逻辑算出期望。
- 一个测试一个行为，测试名即规格：` rejects expired invoice with E410 `。
- 失败信息能直接定位：断言消息包含实际值与期望值。
