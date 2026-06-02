// 运行时配置规范化：为导入或旧版本配置补齐安全默认值，并兼容历史的密码字段选择器写法。
import type { AppConfig, FieldConfig } from './types';
import { DEFAULT_PROJECT_GROUP_CODE } from './defaults';
import { DEFAULT_POPUP_POSITION, isPopupPosition } from './popup-position';
import { normalizeAppearance } from './theme';

// 用于从字段 key/label/selector 中识别“密码类”字段的关键字（大小写不敏感）。
const PASSWORD_HINTS = ['password', 'passwd', 'pass', 'pwd', '密码', '口令'];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function includesPasswordHint(value: string | undefined): boolean {
  const normalized = (value ?? '').toLowerCase();
  return PASSWORD_HINTS.some((hint) => normalized.includes(hint));
}

function isPasswordLikeField(field: FieldConfig): boolean {
  return includesPasswordHint(field.key) || includesPasswordHint(field.label);
}

// 选择器看起来是否指向密码输入框：显式带 type="password"，或含密码关键字。
function looksLikePasswordSelector(selector: string | undefined): boolean {
  const normalized = (selector ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes('type="password"') || normalized.includes("type='password'") || includesPasswordHint(normalized);
}

function normalizeFields(fields: FieldConfig[]): FieldConfig[] {
  const displayFields = fields.filter((field) => field.type === 'display');

  for (const field of fields) {
    // copyable 未显式置为 false 时一律视为可复制。
    field.copyable = field.copyable !== false;
    // 仅处理“缺少 selector 的密码型 input”，其余字段保持不变。
    if (field.type !== 'input' || field.selector?.trim() || !isPasswordLikeField(field)) continue;

    // 历史手写配置有时把密码选择器错放在 display 字段上。这里把它回填到对应的
    // 密码 input 字段，使旧配置仍可正常填充，且不改动已持久化的结构。
    const misplacedSelector = displayFields.find((item) => looksLikePasswordSelector(item.selector))?.selector?.trim();
    if (misplacedSelector) {
      field.selector = misplacedSelector;
    }
  }

  // display 字段不应携带选择器，统一清除（其作用仅是上面的兼容回填来源）。
  for (const field of displayFields) {
    delete field.selector;
  }

  return fields;
}

/** 将任意来源的配置补齐为可供运行时安全读取的结构（容错，不抛错）。 */
export function normalizeAppConfigForRuntime<T>(config: T): T {
  const next = clone(config);
  if (!isObject(next) || !Array.isArray(next.projects)) return next;

  // 运行时规范化刻意保持宽容：在 UI 读取 appearance/分组等嵌套数据前，
  // 用安全默认值补全导入或旧版本配置中缺失的部分。
  const appConfig = next as unknown as AppConfig;
  if (!isObject(appConfig.global)) {
    appConfig.global = {
      showLoginAccountPanel: true,
      showAccountPickerOnInputClick: true,
      appearance: normalizeAppearance(undefined),
    };
  } else {
    appConfig.global.showLoginAccountPanel = appConfig.global.showLoginAccountPanel !== false;
    appConfig.global.showAccountPickerOnInputClick = appConfig.global.showAccountPickerOnInputClick !== false;
    appConfig.global.appearance = normalizeAppearance(appConfig.global.appearance);
  }
  if (!Array.isArray(appConfig.projectGroups)) {
    appConfig.projectGroups = [];
  }
  // 始终保证默认分组存在，避免无分组可归属的项目。
  if (!appConfig.projectGroups.some((group) => group.code === DEFAULT_PROJECT_GROUP_CODE)) {
    appConfig.projectGroups.unshift({
      code: DEFAULT_PROJECT_GROUP_CODE,
      name: '默认分组',
      description: '',
    });
  }
  if (!Array.isArray(appConfig.fieldTemplates)) {
    appConfig.fieldTemplates = [];
  }
  const groupCodes = new Set(appConfig.projectGroups.map((group) => group.code));

  for (const project of next.projects as AppConfig['projects']) {
    if (!isObject(project) || !Array.isArray(project.fields)) continue;
    if (!isPopupPosition(project.popupPosition)) {
      project.popupPosition = DEFAULT_POPUP_POSITION;
    }
    // 分组缺失或指向不存在的分组时，回落到默认分组。
    if (!project.groupCode || !groupCodes.has(project.groupCode)) {
      project.groupCode = DEFAULT_PROJECT_GROUP_CODE;
    }
    project.fields = normalizeFields(project.fields);
  }

  for (const template of appConfig.fieldTemplates) {
    if (Array.isArray(template.fields)) {
      template.fields = normalizeFields(template.fields);
    }
  }

  return next;
}

/** 为单个字段就地解析填充用选择器：优先用字段自身的 selector，否则按密码兼容规则回退。 */
export function resolveFillSelector(field: FieldConfig, fields: FieldConfig[]): string {
  const selector = field.selector?.trim();
  if (selector) return selector;
  if (field.type !== 'input' || !isPasswordLikeField(field)) return '';

  // 与 normalizeFields 中的兼容逻辑一致，但不修改传入的字段列表，供需即时取值的调用方使用。
  return fields.find((item) => item.type === 'display' && looksLikePasswordSelector(item.selector))?.selector?.trim() ?? '';
}
