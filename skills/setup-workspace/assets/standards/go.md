# Go 编码标准（兜底基线）

> 本文件是评审"标准轴"的兜底基线：repo 已文档化的标准优先于本文，gofmt/vet 已强制的跳过。

## 命名

- 短名优先但表意：循环内 `i`、字段 `r` 可以；跨函数传递的用 `reader`。
  反例：`mySliceWithUsersNormalized` → `users`。
- 接口名是行为：`Reader`、`Counter`；`-er` 后缀；小接口在使用方定义。
- 返回 bool 的函数用 `Is/Has` 前缀：`IsEmpty()` 而非 `Empty()`。

## 错误处理

- 每个错误都处理或包裹上抛，禁止 `_ = err`。
  反例：`data, _ := load()` → `data, err := load(); if err != nil { return fmt.Errorf("load config: %w", err) }`。
- 包裹错误带上下文前缀（`%w`），错误消息小写、不带标点、不暴露内部细节。
- 哨兵错误用 `errors.Is/As` 判定；禁止字符串比对错误消息。

## 模块边界

- 包深、接口窄：包名即职责（`auth`、`storage`），禁 `util`、`common`、`misc`。
- 依赖方向单向：cmd → 领域 → 基础设施；领域包禁止 import 数据库/HTTP 框架。
- 导出面最小：不导出的符号不加注释噪音；导出符号必须有 doc comment。

## 测试期望

- 表驱动测试为主，一个子测试一个行为，名字即规格：`t.Run("expired token", ...)`。
- 只断言外部行为，不 mock 被测函数内部；依赖用小接口注入而非全局变量。
  反例：断言 mock 被调三次 → 断言输出与错误类型。
- 期望值来自独立来源（已知字面量、算例、spec），禁止用实现同款逻辑算期望。
- 用 `errors.Is` 断言错误，失败信息包含 got/want。
