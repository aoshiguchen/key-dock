// 本地↔云端配置合并：按稳定标识（id/key/code）逐层合并，保留本地独有数据，同标识项以传入方为准。
import { cloneConfig } from './storage';
import type { AccountRecord, AppConfig, EnvConfig, FieldConfig, FieldTemplate, ProjectConfig, ProjectGroup, SyncMode, SyncResult } from './types';

// 按 id 合并：先放 base，再用 incoming 覆盖同 id 项；保留双方独有项。
function mergeById<T extends { id: string }>(base: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of base) map.set(item.id, clone(item));
  for (const item of incoming) map.set(item.id, clone(item));
  return [...map.values()];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// 字段按 key 合并（key 为字段稳定标识）。
function mergeFields(base: FieldConfig[], incoming: FieldConfig[]): FieldConfig[] {
  const map = new Map<string, FieldConfig>();
  for (const field of base) map.set(field.key, clone(field));
  for (const field of incoming) map.set(field.key, clone(field));
  return [...map.values()];
}

function mergeAccounts(base: AccountRecord[], incoming: AccountRecord[]): AccountRecord[] {
  // 同步时以稳定 id 作为账号身份标识，冲突时以传入方为准。
  return mergeById(base, incoming);
}

// 环境合并：同 id 环境做字段级合并——hosts/pathKeywords 取并集去重，
// retryDelays 优先用传入方的（非空时整体替换，否则沿用原值），accounts 按 id 合并。
function mergeEnvs(base: EnvConfig[], incoming: EnvConfig[]): EnvConfig[] {
  const map = new Map<string, EnvConfig>();
  for (const env of base) map.set(env.id, clone(env));
  for (const env of incoming) {
    const prev = map.get(env.id);
    if (!prev) {
      map.set(env.id, clone(env));
      continue;
    }
    map.set(env.id, {
      ...clone(prev),
      ...clone(env),
      hosts: [...new Set([...(prev.hosts ?? []), ...(env.hosts ?? [])])],
      pathKeywords: [...new Set([...(prev.pathKeywords ?? []), ...(env.pathKeywords ?? [])])],
      retryDelays: env.retryDelays?.length ? [...env.retryDelays] : [...prev.retryDelays],
      accounts: mergeAccounts(prev.accounts ?? [], env.accounts ?? []),
    });
  }
  return [...map.values()];
}

function mergeProjects(base: ProjectConfig[], incoming: ProjectConfig[]): ProjectConfig[] {
  const map = new Map<string, ProjectConfig>();
  for (const project of base) map.set(project.id, clone(project));
  for (const project of incoming) {
    const prev = map.get(project.id);
    if (!prev) {
      map.set(project.id, clone(project));
      continue;
    }
    map.set(project.id, {
      ...clone(prev),
      ...clone(project),
      // 字段与环境各按自身稳定 key 合并，避免远端更新丢弃本地独有结构。
      fields: mergeFields(prev.fields ?? [], project.fields ?? []),
      envs: mergeEnvs(prev.envs ?? [], project.envs ?? []),
    });
  }
  return [...map.values()];
}

function mergeProjectGroups(base: ProjectGroup[], incoming: ProjectGroup[]): ProjectGroup[] {
  const map = new Map<string, ProjectGroup>();
  for (const group of base) map.set(group.code, clone(group));
  for (const group of incoming) map.set(group.code, clone(group));
  return [...map.values()];
}

function mergeFieldTemplates(base: FieldTemplate[], incoming: FieldTemplate[]): FieldTemplate[] {
  return mergeById(base, incoming);
}

/**
 * 合并本地配置 base 与传入配置 incoming。
 * localOverwrite 直接以 incoming 整体覆盖；其余模式逐层按稳定标识合并，
 * 并将 localRevision 取双方最大值再加 1，返回结果与面向用户的提示文案。
 */
export function mergeAppConfigs(base: AppConfig, incoming: AppConfig, mode: SyncMode): SyncResult {
  if (mode === 'localOverwrite') {
    // 覆盖模式有意为破坏性操作，跳过字段级合并直接整体替换。
    return { config: cloneConfig(incoming), warnings: [] };
  }

  // 合并模式保留本地独有数据，同时允许具有相同稳定标识的传入对象替换本地陈旧值。
  const merged: AppConfig = cloneConfig(base);
  merged.projectGroups = mergeProjectGroups(base.projectGroups ?? [], incoming.projectGroups ?? []);
  merged.fieldTemplates = mergeFieldTemplates(base.fieldTemplates ?? [], incoming.fieldTemplates ?? []);
  merged.projects = mergeProjects(base.projects ?? [], incoming.projects ?? []);
  merged.sync = { ...base.sync, ...incoming.sync };
  merged.meta = {
    ...(base.meta ?? {}),
    ...(incoming.meta ?? {}),
    localRevision: Math.max(base.meta?.localRevision ?? 0, incoming.meta?.localRevision ?? 0) + 1,
  };

  const warnings: string[] = [];
  if (mode === 'cloudToLocal') {
    warnings.push('云端同步已覆盖本地同 id 配置项，本地未删除数据已保留。');
  }
  if (mode === 'localMerge') {
    warnings.push('增量同步不会删除云端额外数据。');
  }

  return { config: merged, warnings };
}
