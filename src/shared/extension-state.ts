export const EXTENSION_ENABLED_KEY = 'extensionEnabled';

const storageApi = typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : undefined;

export async function readExtensionEnabled(): Promise<boolean> {
  if (!storageApi) return true;
  const result = await storageApi.get(EXTENSION_ENABLED_KEY);
  return result[EXTENSION_ENABLED_KEY] !== false;
}

export async function writeExtensionEnabled(enabled: boolean): Promise<void> {
  if (!storageApi) return;
  await storageApi.set({ [EXTENSION_ENABLED_KEY]: enabled });
}
