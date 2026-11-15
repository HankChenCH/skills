// dsh 官方「Your first plugin」最小形态（need 20261115-339e F1）：导出 name + apply(ctx)，
// apply 打一条含插件名的加载日志。真实功能设计是后续轮的事（need 非目标 1）。
// .ts 形态零构建直发（spec 20261115-f650 demo 插件 .ts 化契约，票 20261115-e692）：
// 宿主加载链的 .ts 支持由 spec FR-7 端到端实测裁决（票 20261115-13c4，回退预案 = 插件包预编译）。
export const name: string = '@hankchen/dsh-demo';

export function apply(ctx: { logger: { info(message: string): void } }): void {
  ctx.logger.info(`插件已加载：${name}`);
}
