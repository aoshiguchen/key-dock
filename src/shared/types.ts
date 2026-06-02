// 全局共享的核心数据类型定义：配置树（项目/环境/账号/字段）、外观、同步与匹配结果等。

/** 字段类型：input 可被填充并写入页面表单；display 仅用于展示/复制。 */
export type FieldType = 'input' | 'display';

/** 登录辅助弹窗相对于触发位置的九宫格摆放方位。 */
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

/** 单个字段的配置。 */
export type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  /** input 字段填充时定位目标元素的 CSS 选择器。 */
  selector?: string;
  /** 是否为敏感字段（如密码），用于展示时打码、切换明文。 */
  sensitive: boolean;
  required?: boolean;
  /** 是否允许复制，未显式设为 false 时默认可复制。 */
  copyable?: boolean;
  /** 列宽：固定值或带单位字符串；缺省时按内容自适应估算。 */
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  /** 字段在列表中的展示顺序，越小越靠前。 */
  order?: number;
};

/** 一条账号记录，values 以字段 key 为键存储各字段取值。 */
export type AccountRecord = {
  id: string;
  values: Record<string, string>;
  /** 是否为所属环境的默认账号；同一环境至多一个。 */
  isDefault: boolean;
  updatedAt: string;
};

/** 环境配置：通过 host + 路径关键字匹配页面，并挂载该环境下的账号。 */
export type EnvConfig = {
  id: string;
  name: string;
  /** 匹配该环境的主机名列表（支持子域名后缀匹配）。 */
  hosts: string[];
  /** 页面路径需包含的关键字之一才算命中该环境。 */
  pathKeywords: string[];
  /** 填充时按序重试的等待毫秒数，用于等待异步渲染的表单元素出现。 */
  retryDelays: number[];
  accounts: AccountRecord[];
};

/** 项目配置：归属某个分组，包含一套字段定义与多个环境。 */
export type ProjectConfig = {
  id: string;
  name: string;
  /** 所属项目分组的 code，缺省时归入默认分组。 */
  groupCode?: string;
  popupPosition?: PopupPosition;
  fields: FieldConfig[];
  envs: EnvConfig[];
};

/** 项目分组，code 为唯一标识。 */
export type ProjectGroup = {
  code: string;
  name: string;
  description?: string;
};

/** 字段模板：一组可复用的字段定义，便于新建项目时套用。 */
export type FieldTemplate = {
  id: string;
  name: string;
  fields: FieldConfig[];
};

/** 全局开关与外观配置。 */
export type GlobalConfig = {
  showLoginAccountPanel: boolean;
  showAccountPickerOnInputClick: boolean;
  appearance: AppearanceConfig;
};

/** 主题模式。 */
export type ThemeMode = 'tech-dark' | 'minimal-light' | 'vivid-color';

/** 字号档位。 */
export type FontScale = 'small' | 'medium' | 'large';

/** 外观配置：主题、字号与是否启用动效。 */
export type AppearanceConfig = {
  theme: ThemeMode;
  fontScale: FontScale;
  enableMotion: boolean;
};

/** MinIO 云端同步配置；凭据仅存于本地配置中，不外传。 */
export type SyncConfig = {
  minioEnabled: boolean;
  endpoint?: string;
  bucket?: string;
  accessKey?: string;
  secretKey?: string;
  /** 对象 key 前的路径前缀。 */
  pathPrefix?: string;
  /** 远端配置对象的 key，缺省为 app-config.json。 */
  objectKey?: string;
};

/** 配置元信息，用于本地↔云端的版本与同步时间追踪。 */
export type ConfigMeta = {
  lastUpdatedAt?: string;
  lastSyncedAt?: string;
  /** 本地版本号，每次本地写操作递增。 */
  localRevision?: number;
  /** 已知的远端版本号，用于合并时比较取较大值。 */
  remoteRevision?: number;
};

/** 应用完整配置树，持久化与导入/导出的根对象。 */
export type AppConfig = {
  /** 配置结构版本，校验时仅接受当前支持的版本。 */
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

/** 页面匹配结果：命中的项目、环境及按 order 排序后的字段。 */
export type MatchedEnvironment = {
  project: ProjectConfig;
  env: EnvConfig;
  fields: FieldConfig[];
};

/**
 * 同步模式：
 * - cloudToLocal 云端按 id 覆盖本地（保留本地新增项）；
 * - localOverwrite 以本地完整覆盖云端；
 * - localMerge 本地增量合并到云端。
 */
export type SyncMode = 'cloudToLocal' | 'localOverwrite' | 'localMerge';

/** 同步/合并结果，warnings 用于向用户提示合并行为。 */
export type SyncResult = {
  config: AppConfig;
  warnings: string[];
};
