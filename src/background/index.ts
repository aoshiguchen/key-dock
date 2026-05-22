import { DEFAULT_CONFIG } from '../shared/defaults';
import { ensureInitialConfig, readAppConfig, writeAppConfig } from '../shared/storage';
import type { AppConfig } from '../shared/types';

chrome.runtime.onInstalled.addListener(async () => {
  const config = await ensureInitialConfig();
  if (!config.projects?.length) {
    await writeAppConfig(DEFAULT_CONFIG);
  }
});

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
