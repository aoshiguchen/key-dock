// 配置管理页公共工具：侧边栏菜单定义、空白配置工厂、深拷贝/排序及配置导出等纯函数集合。
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

// 侧边栏菜单项：key 决定渲染哪个分区，顺序即菜单展示顺序。
export const MENU_ITEMS: Array<{ key: SectionKey; label: string; icon: ReactNode }> = [
  { key: 'global', label: '全局配置', icon: createElement(Settings, { size: 16 }) },
  { key: 'groups', label: '项目分组', icon: createElement(FolderKanban, { size: 16 }) },
  { key: 'projects', label: '项目管理', icon: createElement(LayoutGrid, { size: 16 }) },
  { key: 'fieldTemplates', label: '字段配置模板', icon: createElement(BookTemplate, { size: 16 }) },
  { key: 'accounts', label: '账号管理', icon: createElement(KeyRound, { size: 16 }) },
  { key: 'config', label: '配置导入导出', icon: createElement(FileJson2, { size: 16 }) },
  { key: 'sync', label: '数据同步', icon: createElement(RefreshCw, { size: 16 }) },
];

/** 根据分区 key 取菜单显示名称，未匹配时返回空串。 */
export function getSectionLabel(section: SectionKey): string {
  return MENU_ITEMS.find((item) => item.key === section)?.label ?? '';
}

/**
 * 生成一个空白项目，用于「新增项目」的初始数据。
 * 约定：默认归入默认分组、默认弹窗位置，并预置「登录名」(可编辑输入) 与「备注」(只读展示) 两个字段，
 * 以及一个示例环境，避免新建项目时字段/环境为空导致表单无从下手。
 */
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

/** 生成空白分组；code 用时间戳保证本地唯一，name 给默认占位名。 */
export function createBlankGroup(): ProjectGroup {
  return {
    code: `group_${Date.now()}`,
    name: '新分组',
    description: '',
  };
}

/** 生成默认字段集合（登录名 + 备注），供新建项目与新建字段模板复用，保证两处默认值一致。 */
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

/** 生成空白字段模板，字段沿用 createBlankFields 的默认集合。 */
export function createBlankFieldTemplate(): FieldTemplate {
  return {
    id: createId('template'),
    name: '新模板',
    fields: createBlankFields(),
  };
}

/** 通过 JSON 序列化做深拷贝，避免编辑表单时直接改动原配置对象。 */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** 拖拽排序：把 draggedId 对应项移动到 targetId 的位置。id 相同或任一未找到时原样返回。 */
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

/**
 * 按当前字段定义重建账号 values：只保留字段集合里的 key，缺失的补空串。
 * 用于字段增删改后，剔除账号中已废弃字段、补齐新增字段，保持账号与字段结构一致。
 */
export function normalizeAccountValues(fields: FieldConfig[], values: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const field of fields) {
    next[field.key] = values[field.key] ?? '';
  }
  return next;
}

/** 对项目下所有环境的所有账号执行 normalizeAccountValues，使账号字段随项目字段联动更新。 */
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

/** 用 nextProject 替换配置中 id 为 oldProjectId 的项目（id 可能在编辑时变更，故单独传旧 id）。 */
export function replaceProject(config: AppConfig, oldProjectId: string, nextProject: ProjectConfig): AppConfig {
  return {
    ...config,
    projects: config.projects.map((item) => (item.id === oldProjectId ? nextProject : item)),
  };
}

// 导出时若不包含 MinIO 配置，则用此「禁用且不含任何凭据」的同步配置占位，避免泄露密钥。
export function stripMinio(sync: AppConfig['sync']): AppConfig['sync'] {
  return {
    minioEnabled: false,
  };
}

/**
 * 构造用于导出的配置子集。
 * - projectIds 为空时导出全部项目，否则只保留选中项目；
 * - includeMinio 为 false 时用 stripMinio 抹掉同步凭据；
 * - includeAppearance 为 false 时删除 global.appearance，便于在不同环境间共享配置而不带个人外观偏好。
 * 通过 JSON 序列化做深拷贝，确保导出对象与当前内存配置完全隔离。
 */
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

/** 拼接账号的可搜索文本：仅包含非敏感字段，格式为「标签: 值」，用于账号列表关键字过滤。 */
export function accountSearchText(project: ProjectConfig, account: AccountRecord): string {
  return project.fields
    .filter((field) => !field.sensitive)
    .map((field) => `${field.label}: ${account.values[field.key] ?? ''}`)
    .join(' | ');
}

/** 生成账号的简要展示文本：仅取非敏感且有值的字段拼接；全部为空时回退到占位提示。 */
export function accountInfoText(project: ProjectConfig, account: AccountRecord): string {
  const text = project.fields
    .filter((field) => !field.sensitive)
    .map((field) => account.values[field.key] ?? '')
    .filter(Boolean)
    .join('|');
  return text || '未填写非敏感字段';
}
