# node-test-skip-gate.md —— node:test 前置门跳过纪律：t.skip 只标注不截断，门必须内联 return

适用：仓内全部 node:test 测试（node ≥24 直跑 .ts 形态）。

## 事实

node:test 的 `t.skip()`（实测 node v24.22.1）**只把该测试标记为 skipped，不停止测试体执行**——在 helper/门函数内部调用 skip 后，控制流回到调用方，后续代码照跑。后果信号（识别特征）：skipped 计数与 failing tests 同时出现、退出码 0 却有失败栈、离线环境白跑网络流程（安装/探测最长可达分钟级）后才失败。

## 纪律

环境前置门（node 版本 / registry / 外部工具存在性）必须写成**返回 boolean 的门函数 + 测试体内联截断**：

```ts
function assertGate(t: TestContext, profile: string): boolean {
  if (!满足前置) { t.skip("报因：……"); return false; }  // skip 只做标注
  // …硬断言照常抛错（门内失败 = fail，不是 skip）
  return true;
}

test("场景名", async (t) => {
  if (!assertGate(t, PROFILE)) return;                    // 截断在这里发生
  // …真跑段
});
```

禁止：把 skip 藏在无返回值的 helper 里且调用方无 `return`（skip 被架空）；用 try/catch 吞门失败。

## 先例与反例

- 正例：`test/e2e/dsh-plugin-integration.test.ts`（门内联 return 先例）；`test/e2e/dsh-ts-loading.test.ts`（修复后形态，共享 boolean 门 helper + 双测试体内联截断）。
- 反例（已修）：`dsh-ts-loading.test.ts` 初版把 skip 封在 helper 内、调用方不截断——评审 20261115-67e2 阻断项，/tmp 新旧语义对照实证（旧形态 skip 后硬断言照跑把测试打成 fail，产出「skipped + exit 0 + 失败栈」矛盾报告）。
