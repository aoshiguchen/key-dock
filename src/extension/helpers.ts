import type { ReactNode } from 'react';
import {
  BookTemplate,
  FileJson2,
  FolderKanban,
  KeyRound,
  LayoutGrid,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { createElement } from 'react';
import { DEFAULT_PROJECT_GROUP_CODE } from '../shared/defaults';
import { DEFAULT_POPUP_POSITION } from '../shared/popup-position';
import { createId } from '../shared/id';
import type { AccountRecord, AppConfig, FieldConfig, FieldTemplate, ProjectConfig, ProjectGroup } from '../shared/types';

export type SectionKey = 'global' | 'groups' | 'projects' | 'fieldTemplates' | 'accounts' | 'config' | 'sync';
export type SyncTabKey = 'minio';
export type ToastVariant = 'success' | 'error' | 'warning';
export type ToastState = {
  text: string;
  variant: ToastVariant;
  x: number;
  y: number;
};

export const TOAST_DURATION_MS = 1600;

export const MENU_ITEMS: Array<{ key: SectionKey; label: string; icon: ReactNode }> = [
  { key: 'global', label: '全局配置', icon: createElement(Settings, { size: 16 }) },
  { key: 'groups', label: '项目分组', icon: createElement(FolderKanban, { size: 16 }) },
  { key: 'projects', label: '项目管理', icon: createElement(LayoutGrid, { size: 16 }) },
  { key: 'fieldTemplates', label: '字段配置模板', icon: createElement(BookTemplate, { size: 16 }) },
  { key: 'accounts', label: '账号管理', icon: createElement(KeyRound, { size: 16 }) },
  { key: 'config', label: '配置导入导出', icon: createElement(FileJson2, { size: 16 }) },
  { key: 'sync', label: '数据同步', icon: createElement(RefreshCw, { size: 16 }) },
];

export function getSectionLabel(section: SectionKey): string {
  return MENU_ITEMS.find((item) => item.key === section)?.label ?? '';
}

export function createBlankProject(): ProjectConfig {
  return {
    id: createId('project'),
    name: '新项目',
    groupCode: DEFAULT_PROJECT_GROUP_CODE,
    popupPosition: DEFAULT_POPUP_POSITION,
    fields: [
      {
        key: 'login',
        label: '登录名',
        type: 'input',
        selector: '#login',
        sensitive: false,
        required: false,
        copyable: true,
        minWidth: 120,
        maxWidth: 220,
      },
      {
        key: 'note',
        label: '备注',
        type: 'display',
        sensitive: false,
        required: false,
        copyable: true,
        minWidth: 120,
        maxWidth: 280,
      },
    ],
    envs: [
      {
        id: 'main',
        name: '官网',
        hosts: ['example.com'],
        pathKeywords: ['/login'],
        retryDelays: [0, 500],
        accounts: [],
      },
    ],
  };
}

export function createBlankGroup(): ProjectGroup {
  return {
    code: `group_${Date.now()}`,
    name: '新分组',
    description: '',
  };
}

export function createBlankFields(): FieldConfig[] {
  return [
    {
      key: 'login',
      label: '登录名',
      type: 'input',
      selector: '#login',
      sensitive: false,
      required: false,
      copyable: true,
      minWidth: 120,
      maxWidth: 220,
    },
    {
      key: 'note',
      label: '备注',
      type: 'display',
      sensitive: false,
      required: false,
      copyable: true,
      minWidth: 120,
      maxWidth: 280,
    },
  ];
}

export function createBlankFieldTemplate(): FieldTemplate {
  return {
    id: createId('template'),
    name: '新模板',
    fields: createBlankFields(),
  };
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function reorderById<T>(items: T[], draggedId: string, targetId: string, getId: (item: T) => string): T[] {
  if (draggedId === targetId) return items;
  const next = [...items];
  const fromIndex = next.findIndex((item) => getId(item) === draggedId);
  const toIndex = next.findIndex((item) => getId(item) === targetId);
  if (fromIndex < 0 || toIndex < 0) return items;
  const [dragged] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, dragged);
  return next;
}

export function normalizeAccountValues(fields: FieldConfig[], values: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const field of fields) {
    next[field.key] = values[field.key] ?? '';
  }
  return next;
}

export function syncAccountsWithFields(project: ProjectConfig): ProjectConfig {
  return {
    ...project,
    envs: project.envs.map((env) => ({
      ...env,
      accounts: env.accounts.map((account) => ({
        ...account,
        values: normalizeAccountValues(project.fields, account.values),
      })),
    })),
  };
}

export function replaceProject(config: AppConfig, oldProjectId: string, nextProject: ProjectConfig): AppConfig {
  return {
    ...config,
    projects: config.projects.map((item) => (item.id === oldProjectId ? nextProject : item)),
  };
}

export function stripMinio(sync: AppConfig['sync']): AppConfig['sync'] {
  return {
    minioEnabled: false,
  };
}

export function exportConfigSubset(config: AppConfig, projectIds: string[], includeMinio: boolean, includeAppearance: boolean): AppConfig {
  const projects = projectIds.length > 0 ? config.projects.filter((item) => projectIds.includes(item.id)) : config.projects;
  const next: AppConfig = {
    ...JSON.parse(JSON.stringify(config)),
    projects,
    sync: includeMinio ? JSON.parse(JSON.stringify(config.sync)) : stripMinio(config.sync),
  };
  if (!includeAppearance) {
    delete (next.global as unknown as Record<string, unknown>).appearance;
  }
  return next;
}

export function accountSearchText(project: ProjectConfig, account: AccountRecord): string {
  return project.fields
    .filter((field) => !field.sensitive)
    .map((field) => `${field.label}: ${account.values[field.key] ?? ''}`)
    .join(' | ');
}

export function accountInfoText(project: ProjectConfig, account: AccountRecord): string {
  const text = project.fields
    .filter((field) => !field.sensitive)
    .map((field) => account.values[field.key] ?? '')
    .filter(Boolean)
    .join('|');
  return text || '未填写非敏感字段';
}
