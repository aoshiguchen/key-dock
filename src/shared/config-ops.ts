import { cloneConfig } from './storage';
import type { AccountRecord, AppConfig, EnvConfig, FieldConfig, ProjectConfig } from './types';

function upsertById<T extends { id: string }>(items: T[], next: T): T[] {
  const cloned = items.map((item) => JSON.parse(JSON.stringify(item)));
  const index = cloned.findIndex((item) => item.id === next.id);
  if (index >= 0) {
    cloned[index] = JSON.parse(JSON.stringify(next));
    return cloned;
  }
  cloned.push(JSON.parse(JSON.stringify(next)));
  return cloned;
}

function upsertByKey<T extends { key: string }>(items: T[], next: T): T[] {
  const cloned = items.map((item) => JSON.parse(JSON.stringify(item)));
  const index = cloned.findIndex((item) => item.key === next.key);
  if (index >= 0) {
    cloned[index] = JSON.parse(JSON.stringify(next));
    return cloned;
  }
  cloned.push(JSON.parse(JSON.stringify(next)));
  return cloned;
}

export function saveProject(config: AppConfig, project: ProjectConfig): AppConfig {
  const next = cloneConfig(config);
  next.projects = upsertById(next.projects, project);
  next.meta = {
    ...(next.meta ?? {}),
    lastUpdatedAt: new Date().toISOString(),
    localRevision: (next.meta?.localRevision ?? 0) + 1,
  };
  return next;
}

export function removeProject(config: AppConfig, projectId: string): AppConfig {
  const next = cloneConfig(config);
  next.projects = next.projects.filter((item) => item.id !== projectId);
  next.meta = {
    ...(next.meta ?? {}),
    lastUpdatedAt: new Date().toISOString(),
    localRevision: (next.meta?.localRevision ?? 0) + 1,
  };
  return next;
}

export function saveField(config: AppConfig, projectId: string, field: FieldConfig): AppConfig {
  const next = cloneConfig(config);
  next.projects = next.projects.map((project) => {
    if (project.id !== projectId) return project;
    return {
      ...project,
      fields: upsertByKey(project.fields, field),
    };
  });
  next.meta = {
    ...(next.meta ?? {}),
    lastUpdatedAt: new Date().toISOString(),
    localRevision: (next.meta?.localRevision ?? 0) + 1,
  };
  return next;
}

export function removeField(config: AppConfig, projectId: string, fieldKey: string): AppConfig {
  const next = cloneConfig(config);
  next.projects = next.projects.map((project) => {
    if (project.id !== projectId) return project;
    return {
      ...project,
      fields: project.fields.filter((item) => item.key !== fieldKey),
    };
  });
  next.meta = {
    ...(next.meta ?? {}),
    lastUpdatedAt: new Date().toISOString(),
    localRevision: (next.meta?.localRevision ?? 0) + 1,
  };
  return next;
}

export function saveEnv(config: AppConfig, projectId: string, env: EnvConfig): AppConfig {
  const next = cloneConfig(config);
  next.projects = next.projects.map((project) => {
    if (project.id !== projectId) return project;
    return {
      ...project,
      envs: upsertById(project.envs, env),
    };
  });
  next.meta = {
    ...(next.meta ?? {}),
    lastUpdatedAt: new Date().toISOString(),
    localRevision: (next.meta?.localRevision ?? 0) + 1,
  };
  return next;
}

export function removeEnv(config: AppConfig, projectId: string, envId: string): AppConfig {
  const next = cloneConfig(config);
  next.projects = next.projects.map((project) => {
    if (project.id !== projectId) return project;
    return {
      ...project,
      envs: project.envs.filter((item) => item.id !== envId),
    };
  });
  next.meta = {
    ...(next.meta ?? {}),
    lastUpdatedAt: new Date().toISOString(),
    localRevision: (next.meta?.localRevision ?? 0) + 1,
  };
  return next;
}

export function saveAccount(config: AppConfig, projectId: string, envId: string, account: AccountRecord): AppConfig {
  const next = cloneConfig(config);
  next.projects = next.projects.map((project) => {
    if (project.id !== projectId) return project;
    return {
      ...project,
      envs: project.envs.map((env) => {
        if (env.id !== envId) return env;
        const accounts = upsertById(env.accounts, account);
        if (account.isDefault) {
          return {
            ...env,
            accounts: accounts.map((item) => ({ ...item, isDefault: item.id === account.id })),
          };
        }
        return { ...env, accounts };
      }),
    };
  });
  next.meta = {
    ...(next.meta ?? {}),
    lastUpdatedAt: new Date().toISOString(),
    localRevision: (next.meta?.localRevision ?? 0) + 1,
  };
  return next;
}

export function removeAccount(config: AppConfig, projectId: string, envId: string, accountId: string): AppConfig {
  const next = cloneConfig(config);
  next.projects = next.projects.map((project) => {
    if (project.id !== projectId) return project;
    return {
      ...project,
      envs: project.envs.map((env) => {
        if (env.id !== envId) return env;
        return {
          ...env,
          accounts: env.accounts.filter((item) => item.id !== accountId),
        };
      }),
    };
  });
  next.meta = {
    ...(next.meta ?? {}),
    lastUpdatedAt: new Date().toISOString(),
    localRevision: (next.meta?.localRevision ?? 0) + 1,
  };
  return next;
}

export function setDefaultAccount(config: AppConfig, projectId: string, envId: string, accountId: string): AppConfig {
  const next = cloneConfig(config);
  next.projects = next.projects.map((project) => {
    if (project.id !== projectId) return project;
    return {
      ...project,
      envs: project.envs.map((env) => {
        if (env.id !== envId) return env;
        return {
          ...env,
          accounts: env.accounts.map((item) => ({
            ...item,
            isDefault: item.id === accountId,
          })),
        };
      }),
    };
  });
  next.meta = {
    ...(next.meta ?? {}),
    lastUpdatedAt: new Date().toISOString(),
    localRevision: (next.meta?.localRevision ?? 0) + 1,
  };
  return next;
}
