// 外观主题：主题/字号选项、类型守卫、外观规范化以及生成根元素 class 名。
import { DEFAULT_APPEARANCE } from './defaults';
import type { AppearanceConfig, ThemeMode, FontScale } from './types';

/** 主题选项及中文说明，供外观设置 UI 使用。 */
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

/** 将任意值规范化为完整外观配置，非法/缺失项回落到默认外观。 */
export function normalizeAppearance(value: unknown): AppearanceConfig {
  const input = value && typeof value === 'object' ? (value as Partial<AppearanceConfig>) : {};
  return {
    theme: isThemeMode(input.theme) ? input.theme : DEFAULT_APPEARANCE.theme,
    fontScale: isFontScale(input.fontScale) ? input.fontScale : DEFAULT_APPEARANCE.fontScale,
    enableMotion: typeof input.enableMotion === 'boolean' ? input.enableMotion : DEFAULT_APPEARANCE.enableMotion,
  };
}

/** 由外观配置拼出应挂到根元素的 class 名（主题 + 字号 + 动效开关）。 */
export function getAppearanceClassName(appearance: AppearanceConfig): string {
  const normalized = normalizeAppearance(appearance);
  return [
    `wm-theme-${normalized.theme}`,
    `wm-font-${normalized.fontScale}`,
    normalized.enableMotion ? 'wm-motion-on' : 'wm-motion-off',
  ].join(' ');
}

/** 是否使用抽屉式项目布局：非「简约白」主题下启用。 */
export function shouldUseProjectDrawer(appearance: AppearanceConfig): boolean {
  return normalizeAppearance(appearance).theme !== 'minimal-light';
}
