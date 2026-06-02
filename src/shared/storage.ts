// Chrome storage 读写封装：读出/写入应用配置，并在非扩展环境（无 chrome.storage）下回退到默认配置。
import { DEFAULT_CONFIG, STORAGE_KEY } from './defaults';
import { normalizeAppConfigForRuntime } from './config-normalize';
import type { AppConfig, ConfigState } from './types';

// 仅在扩展运行环境中存在 chrome.storage.local；否则为 undefined（如单元测试/普通页面）。
const storageApi = typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : undefined;

/** 深拷贝配置，切断与原对象的引用，避免后续就地修改污染来源。 */
export function cloneConfig(config: AppConfig): AppConfig {
  return JSON.parse(JSON.stringify(config));
}

/** 读取应用配置；无存储或无数据时返回默认配置，读出的数据会先做运行时规范化。 */
export async function readAppConfig(): Promise<AppConfig> {
  if (!storageApi) return cloneConfig(DEFAULT_CONFIG);
  const result = await storageApi.get(STORAGE_KEY);
  if (!result || !result[STORAGE_KEY]) return cloneConfig(DEFAULT_CONFIG);
  return normalizeAppConfigForRuntime(result[STORAGE_KEY] as AppConfig);
}

/** 写入应用配置；写前同样做运行时规范化，保证持久化数据结构完整。 */
export async function writeAppConfig(appConfig: AppConfig): Promise<void> {
  if (!storageApi) return;
  const state: ConfigState = { appConfig: normalizeAppConfigForRuntime(appConfig) };
  await storageApi.set({ [STORAGE_KEY]: state.appConfig });
}

/** 确保存在初始配置：缺少 projects 字段时写入默认配置并返回，否则返回现有配置。 */
export async function ensureInitialConfig(): Promise<AppConfig> {
  const current = await readAppConfig();
  if (!current.projects) {
    await writeAppConfig(DEFAULT_CONFIG);
    return cloneConfig(DEFAULT_CONFIG);
  }
  return current;
}
