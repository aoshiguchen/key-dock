import { cloneConfig } from './storage';
import type { AccountRecord, AppConfig, EnvConfig, FieldConfig, FieldTemplate, ProjectConfig, ProjectGroup, SyncMode, SyncResult } from './types';

function mergeById<T extends { id: string }>(base: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of base) map.set(item.id, clone(item));
  for (const item of incoming) map.set(item.id, clone(item));
  return [...map.values()];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function mergeFields(base: FieldConfig[], incoming: FieldConfig[]): FieldConfig[] {
  const map = new Map<string, FieldConfig>();
  for (const field of base) map.set(field.key, clone(field));
  for (const field of incoming) map.set(field.key, clone(field));
  return [...map.values()];
}

function mergeAccounts(base: AccountRecord[], incoming: AccountRecord[]): AccountRecord[] {
  // Stable ids define identity during sync; incoming records win on collision.
  return mergeById(base, incoming);
}

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
      // Fields and environments merge by their own stable keys so remote updates
      // do not discard local-only structure.
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

export function mergeAppConfigs(base: AppConfig, incoming: AppConfig, mode: SyncMode): SyncResult {
  if (mode === 'localOverwrite') {
    // Overwrite mode is intentionally destructive and bypasses field-level merge.
    return { config: cloneConfig(incoming), warnings: [] };
  }

  // Merge mode keeps local-only data while allowing incoming objects with the
  // same stable identifiers to replace stale local values.
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
