// dsh MCP 对话内管理插件（need 20261117-ea73，spec 20261117-34d4）：本票（20261117-0ea9）
// 只交付最小可加载模块——导出 name + apply(ctx) 打一条加载日志，验证包骨架可被宿主加载。
// 管理服务、人类命令与模型工具注册等真实功能归票 20261117-dd1f（spec 双入口契约）。
// .ts 形态零构建直发（仓库常态），发布面由包内 prepack 预编译为 .js（照抄 dsh-demo 先例）。
export const name: string = '@hankchen/dsh-mcp';

export function apply(ctx: { logger: { info(message: string): void } }): void {
  ctx.logger.info(`插件已加载：${name}`);
}
