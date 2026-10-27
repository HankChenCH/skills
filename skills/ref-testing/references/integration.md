# 集成测试（跨模块/跨工单协作路径、集成级验收场景前加载）

集成测试测"模块接起来之后"的行为：数据流经 seam 后是否还正确。
spec 验收场景标 `[FR-N | 集成级]` 的每一条，都要能落成这样的测试或进 dev-accept 运行清单。

## 好用例的标准

1. **真实协作者，替身只给外部依赖**：模块之间用真实现连接；DB、队列、第三方服务这类
   出不了测试边界的外部依赖用可控替身（内存实现、容器、契约桩）。
2. **断言流过边界后的结果**：写入方调完，从另一方读回验证（写队列后消费、写库后查询），
   不是断言"调用发生过"。
3. **失败定位到 seam**：红了要能回答"哪条边断了"；做不到时，补两边各自的单元测试来定位。
4. **环境可重建**：替身与容器的起停、种子数据全部脚本化，任何人一条命令得到同一环境，
   用例与执行顺序无关。
5. **替身保真**：替身实现契约的真实行为（错误码、超时、约束），不是永远成功的 happy 路径。

## 范例（好 / 差对照）

差（全 mock，只测到接线图）：

```ts
test("下单流程", async () => {
  repo.save.mockResolvedValue({ id: "o1" });
  mailer.send.mockResolvedValue(true);
  await placeOrder(cart);
  expect(repo.save).toHaveBeenCalled();
  expect(mailer.send).toHaveBeenCalled();
});
```

repo 和 mailer 是内部协作者，被 mock 光了；断言的是"调用过"，订单状态、邮件内容、
重复下单的幂等——模块接错了它照样绿。

好（真模块 + 受控外部替身，断言流过边界的结果）：

```ts
test("下单后订单可查且确认消息入队", async () => {
  const outbox = new InMemoryOutbox();              // 外部依赖的可控替身
  const app = await startApp({ db: memoryDb, outbox });

  await app.placeOrder({ sku: "SKU-1", qty: 2 });

  expect(await db.orders.getBySku("SKU-1")).toMatchObject({ status: "open", qty: 2 });
  expect(outbox.messages).toEqual([
    expect.objectContaining({ type: "OrderConfirmed", sku: "SKU-1" }),
  ]);
});
```

订单与消息都是从另一端读回的事实；替身可重建，之后还能向它注入故障（chaos.md 的入口）。

## 反模式

- **mock 一切**：全绿，集成面第一次真跑就崩——绿是接线图的绿，不是系统的绿。
- **依赖真实第三方或共享环境**：红灯取决于网络与别人的数据，这层测试学会飘。

## 自查口令（写集成测试前过一遍）

内部协作者有没有被 mock？断言读的是"流过去之后"的结果吗？环境一条命令能重建吗？
替身在坏情况下（超时、拒绝）的行为和真的一样吗？
