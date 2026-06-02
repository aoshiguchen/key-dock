// 插件启用状态的读写：以 chrome.storage.local 持久化总开关，非扩展环境默认视为启用。
export const EXTENSION_ENABLED_KEY = 'extensionEnabled';

const storageApi = typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : undefined;

/** 读取插件是否启用；无存储或未显式关闭时默认启用（仅当存储值显式为 false 才视为关闭）。 */
export async function readExtensionEnabled(): Promise<boolean> {
  if (!storageApi) return true;
  const result = await storageApi.get(EXTENSION_ENABLED_KEY);
  return result[EXTENSION_ENABLED_KEY] !== false;
}

/** 写入插件启用状态。 */
export async function writeExtensionEnabled(enabled: boolean): Promise<void> {
  if (!storageApi) return;
  await storageApi.set({ [EXTENSION_ENABLED_KEY]: enabled });
}
