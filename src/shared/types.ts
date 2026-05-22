export type FieldType = 'input' | 'display';

export type PopupPosition =
  | 'top-left'
  | 'left'
  | 'bottom-left'
  | 'top'
  | 'center'
  | 'bottom'
  | 'top-right'
  | 'right'
  | 'bottom-right';

export type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  selector?: string;
  sensitive: boolean;
  required?: boolean;
  copyable?: boolean;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  order?: number;
};

export type AccountRecord = {
  id: string;
  values: Record<string, string>;
  isDefault: boolean;
  updatedAt: string;
};

export type EnvConfig = {
  id: string;
  name: string;
  hosts: string[];
  pathKeywords: string[];
  retryDelays: number[];
  accounts: AccountRecord[];
};

export type ProjectConfig = {
  id: string;
  name: string;
  groupCode?: string;
  popupPosition?: PopupPosition;
  fields: FieldConfig[];
  envs: EnvConfig[];
};

export type ProjectGroup = {
  code: string;
  name: string;
  description?: string;
};

export type FieldTemplate = {
  id: string;
  name: string;
  fields: FieldConfig[];
};

export type GlobalConfig = {
  showLoginAccountPanel: boolean;
  showAccountPickerOnInputClick: boolean;
  appearance: AppearanceConfig;
};

export type ThemeMode = 'tech-dark' | 'minimal-light' | 'vivid-color';

export type FontScale = 'small' | 'medium' | 'large';

export type AppearanceConfig = {
  theme: ThemeMode;
  fontScale: FontScale;
  enableMotion: boolean;
};

export type SyncConfig = {
  minioEnabled: boolean;
  endpoint?: string;
  bucket?: string;
  accessKey?: string;
  secretKey?: string;
  pathPrefix?: string;
  objectKey?: string;
};

export type ConfigMeta = {
  lastUpdatedAt?: string;
  lastSyncedAt?: string;
  localRevision?: number;
  remoteRevision?: number;
};

export type AppConfig = {
  schemaVersion: string;
  global: GlobalConfig;
  projectGroups: ProjectGroup[];
  fieldTemplates: FieldTemplate[];
  projects: ProjectConfig[];
  sync: SyncConfig;
  meta?: ConfigMeta;
};

export type ConfigState = {
  appConfig: AppConfig;
};

export type MatchedEnvironment = {
  project: ProjectConfig;
  env: EnvConfig;
  fields: FieldConfig[];
};

export type SyncMode = 'cloudToLocal' | 'localOverwrite' | 'localMerge';

export type SyncResult = {
  config: AppConfig;
  warnings: string[];
};
