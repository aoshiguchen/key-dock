// 环境类型声明：声明全局 chrome 对象与 CSS 模块的导入类型。
declare const chrome: any;

// 允许以默认导入方式引入 .css 文件内容（构建工具会处理为字符串）。
declare module '*.css' {
  const content: string;
  export default content;
}
