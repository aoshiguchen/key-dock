// 全局默认常量与初始空配置：storage 键名、schema 版本、默认分组及默认外观。
import type { AppearanceConfig, AppConfig } from './types';

export const STORAGE_KEY = 'appConfig';
export const SCHEMA_VERSION = '1.0';
export const DEFAULT_PROJECT_GROUP_CODE = 'default';

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  theme: 'minimal-light',
  fontScale: 'medium',
  enableMotion: true,
};

/** 首次安装/空数据时使用的初始配置：仅含默认分组，localRevision 从 1 起算。 */
export const DEFAULT_CONFIG: AppConfig = {
  schemaVersion: SCHEMA_VERSION,
  global: {
    showLoginAccountPanel: true,
    showAccountPickerOnInputClick: true,
    appearance: DEFAULT_APPEARANCE,
  },
  projectGroups: [
    {
      code: DEFAULT_PROJECT_GROUP_CODE,
      name: '默认分组',
      description: '',
    },
  ],
  fieldTemplates: [],
  projects: [],
  sync: {
    minioEnabled: false,
  },
  meta: {
    localRevision: 1,
  },
};
