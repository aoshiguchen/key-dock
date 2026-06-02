// 应用元信息常量与展示标题工具。
/** 产品名称、版本、官网与仓库等静态信息（全局只读）。 */
export const APP_INFO = {
  productName: '钥栈',
  englishName: 'KeyDock',
  displayName: '钥栈 KeyDock',
  version: '1.0.0',
  description: '多环境 Web 账号管理与登录填充 Chrome 插件。',
  homepageUrl: 'https://keydock.asgc.fun',
  githubUrl: 'https://github.com/aoshiguchen/key-dock',
  giteeUrl: 'https://gitee.com/asgc/key-dock',
} as const;

/** 取「名称-版本」展示标题：优先读 manifest，缺失时回退到 APP_INFO。 */
export function getAppDisplayTitle(): string {
  const manifest = typeof chrome !== 'undefined' ? chrome.runtime?.getManifest?.() : null;
  const name = manifest?.name ?? APP_INFO.displayName;
  const version = manifest?.version ?? APP_INFO.version;
  return `${name}-${version}`;
}
