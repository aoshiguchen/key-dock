// 百度统计上报模块。
//
// 为什么不用官方代码片段：官方片段通过远程 <script src="https://hm.baidu.com/hm.js?..."> 加载。
// Chrome MV3 下扩展页默认 CSP 为 `script-src 'self'`，禁止远程脚本且不可放宽；在内容脚本里
// 向宿主页注入该脚本既受宿主页 CSP 限制，又会把真实第三方登录 URL 上报给百度（违反安全红线）。
// 因此这里改为手动构造百度统计的 hm.gif 像素请求，把 PV 上报到我们可控的虚拟路径
// （APP_INFO.analyticsDomain 域名下的固定路径），全程不加载任何远程脚本、不泄露宿主页真实地址。
import { APP_INFO } from './app-info';

/** 单个虚拟页面的上报标识：path 为上报到百度的虚拟路径，title 为页面标题。 */
export type AnalyticsPage = {
  path: string;
  title: string;
};

/**
 * 插件各入口对应的虚拟页面。
 * 统一上报到 analyticsDomain 域名下的固定路径，便于在百度统计后台按页面区分流量，
 * 同时避免暴露宿主页真实 URL。
 */
export const ANALYTICS_PAGES = {
  /** 配置管理页（extension.html）。 */
  options: { path: '/options', title: '配置管理' },
  /** 登录页注入的悬浮面板/账号填充 UI（内容脚本）。 */
  loginFill: { path: '/login-fill', title: '登录页填充' },
  /** 工具栏弹窗（popup.html）。 */
  popup: { path: '/popup', title: '工具栏弹窗' },
} as const satisfies Record<string, AnalyticsPage>;

/** 后台中转上报消息：内容脚本无法可靠直连 hm.gif（受宿主页 CSP 影响），改由后台代发。 */
export type TrackPvMessage = {
  type: 'TRACK_PV';
  page: keyof typeof ANALYTICS_PAGES;
};

/**
 * 构造一次百度统计 PV 的 hm.gif 请求 URL（纯函数，无副作用）。
 * 仅填入百度计入 PV 所需的核心参数；u 使用我们可控的虚拟 URL，su（来源）留空避免泄露来源页。
 */
export function buildBaiduPvUrl(page: AnalyticsPage): string {
  const virtualUrl = `https://${APP_INFO.analyticsDomain}${page.path}`;
  const params = new URLSearchParams({
    si: APP_INFO.baiduTongjiId, // 站点 key
    u: virtualUrl, // 当前（虚拟）页面地址
    tt: page.title, // 页面标题
    et: '0', // 0 = 页面浏览（PV）
    v: '1.2.99', // hm.js 版本标识（占位）
    cc: '1', // cookie 可用标记
    su: '', // 来源页：留空，避免泄露宿主页地址
    rnd: String(Math.floor(Math.random() * 2147483647)), // 防缓存随机数
    lt: String(Date.now()), // 客户端时间戳（毫秒）
  });
  return `https://hm.baidu.com/hm.gif?${params.toString()}`;
}

/**
 * 上报一次 PV。
 * 有 DOM 的上下文（扩展页、popup、内容脚本）用 new Image() 触发 GET；
 * 无 DOM 的 Service Worker 降级用 fetch（no-cors，忽略响应）。两者均不受扩展页脚本 CSP 限制。
 */
export function reportPageView(page: AnalyticsPage): void {
  const url = buildBaiduPvUrl(page);
  try {
    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.src = url;
      return;
    }
    void fetch(url, { mode: 'no-cors', cache: 'no-store' });
  } catch {
    // 统计上报为尽力而为，任何失败都不应影响插件主流程。
  }
}
