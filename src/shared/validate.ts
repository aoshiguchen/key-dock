import { DEFAULT_PROJECT_GROUP_CODE, SCHEMA_VERSION } from './defaults';
import { isPopupPosition } from './popup-position';
import { isFontScale, isThemeMode } from './theme';
import type { AppConfig, FieldConfig, ProjectConfig, EnvConfig, AccountRecord, ProjectGroup, FieldTemplate } from './types';

export type ValidationError = {
  path: string;
  message: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function unique<T>(values: T[]): boolean {
  return new Set(values).size === values.length;
}

function validateField(field: FieldConfig, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!field.key.trim()) errors.push({ path, message: '字段 key 不能为空' });
  if (!field.label.trim()) errors.push({ path, message: '字段名称不能为空' });
  if (!['input', 'display'].includes(field.type)) errors.push({ path, message: '字段类型非法' });
  if (field.type === 'input' && !field.selector?.trim()) errors.push({ path, message: 'input 字段必须配置 selector' });
  if (field.minWidth !== undefined && field.minWidth <= 0) errors.push({ path, message: 'minWidth 必须大于 0' });
  if (field.maxWidth !== undefined && field.maxWidth <= 0) errors.push({ path, message: 'maxWidth 必须大于 0' });
  if (field.minWidth !== undefined && field.maxWidth !== undefined && field.minWidth > field.maxWidth) {
    errors.push({ path, message: 'minWidth 不能大于 maxWidth' });
  }
  return errors;
}

function validateProjectGroup(group: ProjectGroup, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!group.code.trim()) errors.push({ path, message: '分组 code 不能为空' });
  if (!group.name.trim()) errors.push({ path, message: '分组名称不能为空' });
  return errors;
}

function validateFieldTemplate(template: FieldTemplate, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!template.id.trim()) errors.push({ path, message: '模板 id 不能为空' });
  if (!template.name.trim()) errors.push({ path, message: '模板名称不能为空' });
  if (!Array.isArray(template.fields) || template.fields.length === 0) {
    errors.push({ path, message: '模板至少需要 1 个字段' });
  } else {
    const keys = template.fields.map((item) => item.key);
    if (!unique(keys)) errors.push({ path, message: '模板字段 key 不能重复' });
    template.fields.forEach((field, index) => {
      errors.push(...validateField(field, `${path}.fields[${index}]`));
    });
  }
  return errors;
}

function validateAccount(account: AccountRecord, fields: FieldConfig[], path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!account.id.trim()) errors.push({ path, message: '账号 id 不能为空' });
  for (const field of fields) {
    if (!(field.key in account.values)) {
      errors.push({ path, message: `账号缺少字段值: ${field.key}` });
    }
    if (field.required && !String(account.values[field.key] ?? '').trim()) {
      errors.push({ path, message: `必填字段不能为空: ${field.label || field.key}` });
    }
  }
  return errors;
}

function validateEnv(env: EnvConfig, fields: FieldConfig[], path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!env.id.trim()) errors.push({ path, message: '环境 id 不能为空' });
  if (!env.name.trim()) errors.push({ path, message: '环境名称不能为空' });
  if (!Array.isArray(env.hosts) || env.hosts.length === 0) errors.push({ path, message: '环境 hosts 不能为空' });
  if (!Array.isArray(env.pathKeywords) || env.pathKeywords.length === 0) errors.push({ path, message: '环境 pathKeywords 不能为空' });
  const defaultAccounts = env.accounts.filter((item) => item.isDefault);
  if (defaultAccounts.length > 1) errors.push({ path, message: '同一环境最多允许一个默认账号' });
  if (!Array.isArray(env.accounts) || env.accounts.length === 0) {
    errors.push({ path, message: '环境账号不能为空' });
  } else {
    const ids = env.accounts.map((item) => item.id);
    if (!unique(ids)) errors.push({ path, message: '账号 id 不能重复' });
    env.accounts.forEach((account, index) => {
      errors.push(...validateAccount(account, fields, `${path}.accounts[${index}]`));
    });
  }
  return errors;
}

function validateProject(project: ProjectConfig, groupCodes: Set<string>, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!project.id.trim()) errors.push({ path, message: '项目 id 不能为空' });
  if (!project.name.trim()) errors.push({ path, message: '项目名称不能为空' });
  if (!project.groupCode?.trim()) {
    errors.push({ path, message: '项目分组不能为空' });
  } else if (!groupCodes.has(project.groupCode)) {
    errors.push({ path, message: `项目分组不存在: ${project.groupCode}` });
  }
  if (project.popupPosition !== undefined && !isPopupPosition(project.popupPosition)) {
    errors.push({ path, message: '弹窗位置非法' });
  }
  if (!Array.isArray(project.fields) || project.fields.length === 0) {
    errors.push({ path, message: '项目至少需要 1 个字段' });
  } else {
    const keys = project.fields.map((item) => item.key);
    if (!unique(keys)) errors.push({ path, message: '字段 key 不能重复' });
    project.fields.forEach((field, index) => {
      errors.push(...validateField(field, `${path}.fields[${index}]`));
    });
  }
  if (!Array.isArray(project.envs) || project.envs.length === 0) {
    errors.push({ path, message: '项目至少需要 1 个环境' });
  } else {
    const envIds = project.envs.map((item) => item.id);
    if (!unique(envIds)) errors.push({ path, message: '环境 id 不能重复' });
    project.envs.forEach((env, index) => {
      errors.push(...validateEnv(env, project.fields, `${path}.envs[${index}]`));
    });
  }
  return errors;
}

function validateGlobalConfig(global: AppConfig['global']): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isPlainObject(global.appearance)) {
    errors.push({ path: 'global.appearance', message: 'appearance 必须是对象' });
    return errors;
  }
  if (!isThemeMode(global.appearance.theme)) {
    errors.push({ path: 'global.appearance.theme', message: '主题非法' });
  }
  if (!isFontScale(global.appearance.fontScale)) {
    errors.push({ path: 'global.appearance.fontScale', message: '字号非法' });
  }
  if (typeof global.appearance.enableMotion !== 'boolean') {
    errors.push({ path: 'global.appearance.enableMotion', message: '动效开关必须是布尔值' });
  }
  return errors;
}

export function validateAppConfig(input: unknown): { ok: boolean; errors: ValidationError[]; value?: AppConfig } {
  if (!isPlainObject(input)) {
    return { ok: false, errors: [{ path: '', message: '配置必须是对象' }] };
  }
  const value = input as AppConfig;
  const errors: ValidationError[] = [];
  // Validation stays strict at import/save boundaries so malformed JSON cannot
  // overwrite the last known-good local configuration.
  if (value.schemaVersion !== SCHEMA_VERSION) {
    errors.push({ path: 'schemaVersion', message: `仅支持 schemaVersion=${SCHEMA_VERSION}` });
  }
  if (!Array.isArray(value.projects)) errors.push({ path: 'projects', message: 'projects 必须是数组' });
  if (!isPlainObject(value.global)) errors.push({ path: 'global', message: 'global 必须是对象' });
  if (!Array.isArray(value.projectGroups)) errors.push({ path: 'projectGroups', message: 'projectGroups 必须是数组' });
  if (!Array.isArray(value.fieldTemplates)) errors.push({ path: 'fieldTemplates', message: 'fieldTemplates 必须是数组' });
  if (!isPlainObject(value.sync)) errors.push({ path: 'sync', message: 'sync 必须是对象' });
  if (errors.length === 0 && Array.isArray(value.projects) && Array.isArray(value.projectGroups) && Array.isArray(value.fieldTemplates)) {
    errors.push(...validateGlobalConfig(value.global));

    const groupCodes = value.projectGroups.map((item) => item.code);
    if (!unique(groupCodes)) errors.push({ path: 'projectGroups', message: '分组 code 不能重复' });
    if (!groupCodes.includes(DEFAULT_PROJECT_GROUP_CODE)) errors.push({ path: 'projectGroups', message: '必须包含 default 默认分组' });
    value.projectGroups.forEach((group, index) => {
      errors.push(...validateProjectGroup(group, `projectGroups[${index}]`));
    });

    const templateIds = value.fieldTemplates.map((item) => item.id);
    if (!unique(templateIds)) errors.push({ path: 'fieldTemplates', message: '模板 id 不能重复' });
    value.fieldTemplates.forEach((template, index) => {
      errors.push(...validateFieldTemplate(template, `fieldTemplates[${index}]`));
    });

    const projectIds = value.projects.map((item) => item.id);
    if (!unique(projectIds)) errors.push({ path: 'projects', message: '项目 id 不能重复' });
    const validGroupCodes = new Set(groupCodes);
    value.projects.forEach((project, index) => {
      errors.push(...validateProject(project, validGroupCodes, `projects[${index}]`));
    });
  }
  return { ok: errors.length === 0, errors, value };
}

export function normalizeAppConfig(input: unknown): AppConfig {
  const result = validateAppConfig(input);
  if (result.ok && result.value) return result.value;
  throw new Error(result.errors.map((item) => `${item.path}: ${item.message}`).join('\n'));
}
