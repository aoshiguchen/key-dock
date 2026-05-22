import type { AppConfig, FieldConfig } from './types';
import { DEFAULT_PROJECT_GROUP_CODE } from './defaults';
import { DEFAULT_POPUP_POSITION, isPopupPosition } from './popup-position';
import { normalizeAppearance } from './theme';

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

function looksLikePasswordSelector(selector: string | undefined): boolean {
  const normalized = (selector ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes('type="password"') || normalized.includes("type='password'") || includesPasswordHint(normalized);
}

function normalizeFields(fields: FieldConfig[]): FieldConfig[] {
  const displayFields = fields.filter((field) => field.type === 'display');

  for (const field of fields) {
    field.copyable = field.copyable !== false;
    if (field.type !== 'input' || field.selector?.trim() || !isPasswordLikeField(field)) continue;

    // Older hand-written configs sometimes placed password selectors on display
    // fields. Keep those configs usable without changing the persisted schema.
    const misplacedSelector = displayFields.find((item) => looksLikePasswordSelector(item.selector))?.selector?.trim();
    if (misplacedSelector) {
      field.selector = misplacedSelector;
    }
  }

  for (const field of displayFields) {
    delete field.selector;
  }

  return fields;
}

export function normalizeAppConfigForRuntime<T>(config: T): T {
  const next = clone(config);
  if (!isObject(next) || !Array.isArray(next.projects)) return next;

  // Runtime normalization is deliberately tolerant: imported or older configs are
  // completed with safe defaults before UI code reads nested appearance/group data.
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

export function resolveFillSelector(field: FieldConfig, fields: FieldConfig[]): string {
  const selector = field.selector?.trim();
  if (selector) return selector;
  if (field.type !== 'input' || !isPasswordLikeField(field)) return '';

  // This mirrors normalizeFields for callers that need a selector immediately
  // without mutating the field list they received.
  return fields.find((item) => item.type === 'display' && looksLikePasswordSelector(item.selector))?.selector?.trim() ?? '';
}
