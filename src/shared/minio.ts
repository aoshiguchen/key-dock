import type { AppConfig, SyncConfig } from './types';

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function joinPath(...parts: Array<string | undefined>): string {
  // Normalize object key fragments before composing the public MinIO object URL;
  // double slashes here would produce a different object path on some gateways.
  return parts
    .filter(Boolean)
    .map((part) => String(part).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

export function buildObjectUrl(sync: SyncConfig): string {
  if (!sync.endpoint) throw new Error('MinIO endpoint 未配置');
  const base = trimSlash(sync.endpoint);
  const path = joinPath(sync.bucket, sync.pathPrefix, sync.objectKey ?? 'app-config.json');
  return `${base}/${path}`;
}

export async function fetchRemoteConfig(sync: SyncConfig): Promise<AppConfig> {
  // The current MinIO integration talks to a user-managed JSON object directly.
  // Credentials remain user-provided headers and are never written outside AppConfig.
  const response = await fetch(buildObjectUrl(sync), {
    method: 'GET',
    headers: sync.accessKey && sync.secretKey ? {
      'X-MinIO-Access-Key': sync.accessKey,
      'X-MinIO-Secret-Key': sync.secretKey,
    } : undefined,
  });
  if (!response.ok) {
    throw new Error(`拉取远端配置失败: ${response.status}`);
  }
  return (await response.json()) as AppConfig;
}

export async function testMinioConnection(sync: SyncConfig): Promise<void> {
  // HEAD verifies reachability without downloading or mutating the remote config.
  const response = await fetch(buildObjectUrl(sync), {
    method: 'HEAD',
    headers: sync.accessKey && sync.secretKey ? {
      'X-MinIO-Access-Key': sync.accessKey,
      'X-MinIO-Secret-Key': sync.secretKey,
    } : undefined,
  });
  if (!response.ok) {
    throw new Error(`连接失败: ${response.status}`);
  }
}

export async function pushRemoteConfig(sync: SyncConfig, config: AppConfig): Promise<void> {
  // Upload always writes the complete config object; merge behavior is decided
  // before this boundary by the caller.
  const response = await fetch(buildObjectUrl(sync), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(sync.accessKey && sync.secretKey
        ? {
            'X-MinIO-Access-Key': sync.accessKey,
            'X-MinIO-Secret-Key': sync.secretKey,
          }
        : {}),
    },
    body: JSON.stringify(config, null, 2),
  });
  if (!response.ok) {
    throw new Error(`推送远端配置失败: ${response.status}`);
  }
}
