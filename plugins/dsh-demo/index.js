// dsh 官方「Your first plugin」最小形态（need 20261115-339e F1）：导出 name + apply(ctx)，
// apply 打一条含插件名的加载日志。真实功能设计是后续轮的事（need 非目标 1）。
export const name = '@hankchen/dsh-demo';

export function apply(ctx) {
  ctx.logger.info(`插件已加载：${name}`);
}
