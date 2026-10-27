# Python 编码标准（兜底基线）

> 本文件是评审"标准轴"的兜底基线：repo 已文档化的标准优先于本文，lint/格式化已强制的跳过。

## 命名

- 布尔量/谓词带判断意味：`is_valid`、`has_cache`；函数返回 bool 时名字读作问句。
  反例：`def check(user):` → `def is_eligible(user) -> bool:`。
- 模块名短小全小写；类名 PascalCase；常量 UPPER_SNAKE。禁单字母名（循环索引 `i` 除外）。

## 错误处理

- 只捕获具体异常类型，禁止裸 `except:` 与 `except Exception: pass`。
  反例：`try: load() except: return None` → `except FileNotFoundError as e: logger.warning(...); return None`。
- 自定义异常继承语义清晰的基类并带上下文：`raise ConfigError(f"missing key: {key}")`。
- 资源用 `with` 管理；跨函数传递资源时明确所有权，避免"谁知道谁关闭"。

## 模块边界

- 模块深、接口窄：`__all__` 显式声明公开面；下划线前缀表达内部。
- 依赖方向单向：入口 → 领域 → 基础设施；领域层禁止 import 框架与 I/O 库。
- 禁止循环 import：出现即拆共享类型或延迟导入，并说明原因。

## 测试期望

- 只测外部行为，不测实现：断言返回值/状态/副作用边界，不 mock 被测对象内部。
  反例：`mock.assert_called_once_with(...)` 作为主要断言 → 断言函数输出与落库结果。
- 期望值来自独立来源（已知字面量、算例、spec），禁止用实现同款逻辑重算期望。
- 一个测试一个行为，测试名即规格：`test_expired_token_returns_401`。
- 用 pytest 参数化表达等价类，不为边界写十个复制粘贴用例。
