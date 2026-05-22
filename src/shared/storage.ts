import { DEFAULT_CONFIG, STORAGE_KEY } from './defaults';
import { normalizeAppConfigForRuntime } from './config-normalize';
import type { AppConfig, ConfigState } from './types';

const storageApi = typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : undefined;

export function cloneConfig(config: AppConfig): AppConfig {
  return JSON.parse(JSON.stringify(config));
}

export async function readAppConfig(): Promise<AppConfig> {
  if (!storageApi) return cloneConfig(DEFAULT_CONFIG);
  const result = await storageApi.get(STORAGE_KEY);
  if (!result || !result[STORAGE_KEY]) return cloneConfig(DEFAULT_CONFIG);
  return normalizeAppConfigForRuntime(result[STORAGE_KEY] as AppConfig);
}

export async function writeAppConfig(appConfig: AppConfig): Promise<void> {
  if (!storageApi) return;
  const state: ConfigState = { appConfig: normalizeAppConfigForRuntime(appConfig) };
  await storageApi.set({ [STORAGE_KEY]: state.appConfig });
}

export async function ensureInitialConfig(): Promise<AppConfig> {
  const current = await readAppConfig();
  if (!current.projects) {
    await writeAppConfig(DEFAULT_CONFIG);
    return cloneConfig(DEFAULT_CONFIG);
  }
  return current;
}
