import type { AppearanceConfig, AppConfig } from './types';

export const STORAGE_KEY = 'appConfig';
export const SCHEMA_VERSION = '1.0';
export const DEFAULT_PROJECT_GROUP_CODE = 'default';

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  theme: 'minimal-light',
  fontScale: 'medium',
  enableMotion: true,
};

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
