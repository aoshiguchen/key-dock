// 配置的不可变写操作：对项目/字段/环境/账号做增删改，每次返回新配置并递增本地版本号。
import { cloneConfig } from './storage';
import type { AccountRecord, AppConfig, EnvConfig, FieldConfig, ProjectConfig } from './types';

// 按 id 插入或更新（命中则替换，否则追加），全程深拷贝避免改动入参。
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

// 按 key 插入或更新（用于字段列表）。
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

/** 新增或更新项目。 */
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

/** 按 id 删除项目。 */
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

/** 在指定项目下新增或更新字段。 */
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

/** 按 key 删除指定项目下的字段。 */
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

/** 在指定项目下新增或更新环境。 */
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

/** 按 id 删除指定项目下的环境。 */
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

/** 新增或更新账号；若该账号被设为默认，则把同环境其他账号的 isDefault 清掉以保持唯一。 */
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

/** 按 id 删除指定环境下的账号。 */
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

/** 将指定账号设为环境默认账号，其余账号自动取消默认。 */
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
