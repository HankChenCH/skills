// react 运行时的类型镜像（@types/react 的本插件客户端面消费子集，签名逐条标注官方来源）。
// react 不入仓库依赖：运行时经 dsh 客户端模块表的 require 解析（官方 bundle 一手先例
// dsh-client-ui-sidebar-files@0.2.2-rc.4 lib/client.js 逐字含 require("react") 与
// require("react/jsx-runtime")；dsh-client-modules README 解析顺序 = platform seed table
// 优先），类型侧由本环境声明满足仓库 tsc --noEmit 与 prepack 客户端面编译的解析。
// 仅声明本插件消费的成员——不试图复刻 @types/react 全量。
declare module 'react' {
  /** React 元素树的节点（@types/react ReactNode 的宽化镜像：本面板只透传给宿主渲染，不内省）。 */
  export type ReactNode = unknown;
  /**
   * 创建 React 元素（@types/react createElement 基础重载的插件消费子集：本面板的 type 只用
   * 字符串宿主元素名与本文件内的函数组件——official JSX 编译产物即对它的调用）。
   */
  export function createElement(
    type: string | ((props: never) => unknown),
    props?: Record<string, unknown> | null,
    ...children: ReactNode[]
  ): ReactNode;
  /**
   * 缓存函数引用（@types/react useCallback<T>(callback: T, deps: DependencyList): T）；
   * 本面板固定依赖数组语义由替身契约注释钉住（测试替身不镜像依赖比较——替身简化点）。
   */
  export function useCallback<T>(callback: T, deps: readonly unknown[]): T;
  /**
   * 副作用挂载（@types/react useEffect(effect: () => void | Destructor, deps?: DependencyList)）；
   * effect 返回的函数即清理函数，组件卸载时调用（官方 Destructor 语义）。
   */
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  /**
   * 组件状态槽（@types/react useState<S>(initialState: S | (() => S))：惰性初始化与
   * 函数式更新两形态都镜像；setter 触发重渲）。
   */
  export function useState<S>(
    initialState: S | (() => S),
  ): [S, (value: S | ((previous: S) => S)) => void];
}
