import { validateAppConfig } from './validate';
import { normalizeAppConfigForRuntime } from './config-normalize';
import type { AppConfig } from './types';

export function formatAppConfig(config: AppConfig): string {
  return JSON.stringify(config, null, 2);
}

export function parseAppConfigText(text: string) {
  const parsed = JSON.parse(text);
  return validateAppConfig(normalizeAppConfigForRuntime(parsed));
}
