// dsh-mcp 客户端面最小入口（spec 20261118-0de6 FR-7 客户端载体，票 20261118-7504）：
// 本票只立载体——package.json 客户端声明（dsh.client / exports["./client"]）、prepack 客户端面
// 编译与发布面五查。面板功能（右栏 Dock 页只读面/写操作）归后续票 1812/322a/6df0。
//
// 契约形态（官方一手来源，探针留痕见工票 Progress）：
// - 客户端模块 = cordis 插件模块面：loader 物化 bundle 时取 factory(require) 返回的
//   module.exports 挂 entry——导出 apply(ctx) 即插件激活体（官方 client-ui-* 全部此形态，
//   可选 export const inject 声明 cordis 服务注入，本最小入口暂不需要）。
// - 本文件经 scripts/prepack.ts 客户端面编译为包根 client.js：lazy-CJS factory 形态
//   （window.__ModuleLoader__.load({id, factory})），脚本执行只注册、物化在首次 import。
// - 单文件纪律（index.ts 头注同法）：客户端面拆多文件须先扩发布面为 bundling。
export function apply(_ctx: unknown): void {
  // 客户端面载体激活体：本票无面板可注册（后续票 1812 起接入 keyed slot 注册与 Remote 读通道）。
}
