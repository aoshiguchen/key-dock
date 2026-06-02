// Service Worker 后台脚本：标记本地开发版角标、首次安装初始化默认配置，
// 并响应来自其它页面的配置读写消息（GET/SAVE_APP_CONFIG）。
import { DEFAULT_CONFIG } from '../shared/defaults';
import { ensureInitialConfig, readAppConfig, writeAppConfig } from '../shared/storage';
import type { AppConfig } from '../shared/types';

// 本地开发版标记（方案1）：通过 management.getSelf 判断安装来源。
// 「加载已解压」的本地调试插件 installType 为 'development'，给工具栏图标打红色 DEV 角标
// 并改写 tooltip，与 Chrome 商店正式版（installType 'normal'，不触发）区分。
// 不需要声明 management 权限，对上架产物零影响。
function markDevBuild(): void {
  chrome.management?.getSelf?.((self: { installType?: string }) => {
    if (self?.installType !== 'development') return;
    chrome.action?.setBadgeText?.({ text: 'DEV' });
    chrome.action?.setBadgeBackgroundColor?.({ color: '#E11D48' });
    chrome.action?.setTitle?.({ title: '钥栈 KeyDock [本地开发版]' });
  });
}

markDevBuild();

// 首次安装/更新时确保存在初始配置；若无任何项目则写入默认配置兜底。
chrome.runtime.onInstalled.addListener(async () => {
  const config = await ensureInitialConfig();
  if (!config.projects?.length) {
    await writeAppConfig(DEFAULT_CONFIG);
  }
});

// 后台消息路由：处理配置的读取与保存。返回 true 表示将异步调用 sendResponse（保持消息通道开启）。
chrome.runtime.onMessage.addListener((message: { type?: string; appConfig?: AppConfig }, _sender: unknown, sendResponse: (response: unknown) => void) => {
  if (message?.type === 'GET_APP_CONFIG') {
    readAppConfig()
      .then((appConfig) => sendResponse({ ok: true, appConfig }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'SAVE_APP_CONFIG') {
    if (!message.appConfig) {
      sendResponse({ ok: false, error: '缺少 appConfig' });
      return false;
    }
    writeAppConfig(message.appConfig)
      .then(() => sendResponse({ ok: true }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
