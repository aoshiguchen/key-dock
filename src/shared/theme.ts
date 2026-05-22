import { DEFAULT_APPEARANCE } from './defaults';
import type { AppearanceConfig, ThemeMode, FontScale } from './types';

export const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; description: string }> = [
  { value: 'tech-dark', label: '科技黑', description: '暗色、棱角、紧凑' },
  { value: 'minimal-light', label: '简约白', description: '明亮、清晰、宽松' },
  { value: 'vivid-color', label: '灵动炫彩', description: '丰富、活跃、适中' },
];

export const FONT_SCALE_OPTIONS: Array<{ value: FontScale; label: string }> = [
  { value: 'small', label: '较小' },
  { value: 'medium', label: '适中' },
  { value: 'large', label: '偏大' },
];

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'tech-dark' || value === 'minimal-light' || value === 'vivid-color';
}

export function isFontScale(value: unknown): value is FontScale {
  return value === 'small' || value === 'medium' || value === 'large';
}

export function normalizeAppearance(value: unknown): AppearanceConfig {
  const input = value && typeof value === 'object' ? (value as Partial<AppearanceConfig>) : {};
  return {
    theme: isThemeMode(input.theme) ? input.theme : DEFAULT_APPEARANCE.theme,
    fontScale: isFontScale(input.fontScale) ? input.fontScale : DEFAULT_APPEARANCE.fontScale,
    enableMotion: typeof input.enableMotion === 'boolean' ? input.enableMotion : DEFAULT_APPEARANCE.enableMotion,
  };
}

export function getAppearanceClassName(appearance: AppearanceConfig): string {
  const normalized = normalizeAppearance(appearance);
  return [
    `wm-theme-${normalized.theme}`,
    `wm-font-${normalized.fontScale}`,
    normalized.enableMotion ? 'wm-motion-on' : 'wm-motion-off',
  ].join(' ');
}

export function shouldUseProjectDrawer(appearance: AppearanceConfig): boolean {
  return normalizeAppearance(appearance).theme !== 'minimal-light';
}
