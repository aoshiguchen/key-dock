// MinIO 云端同步：直连用户自管的 JSON 对象进行拉取/上传/连通性检测，凭据以自定义 HTTP 头携带。
import type { AppConfig, SyncConfig } from './types';

// 去除末尾斜杠，避免拼接出多余的 //。
function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function joinPath(...parts: Array<string | undefined>): string {
  // 拼接对象 URL 前先去掉各片段首尾斜杠：部分网关会把双斜杠当作不同的对象路径。
  return parts
    .filter(Boolean)
    .map((part) => String(part).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

/** 由同步配置拼出远端配置对象的完整 URL；未配置 endpoint 时抛错。 */
export function buildObjectUrl(sync: SyncConfig): string {
  if (!sync.endpoint) throw new Error('MinIO endpoint 未配置');
  const base = trimSlash(sync.endpoint);
  // objectKey 缺省时使用约定的默认配置文件名。
  const path = joinPath(sync.bucket, sync.pathPrefix, sync.objectKey ?? 'app-config.json');
  return `${base}/${path}`;
}

/** 拉取远端配置 JSON。 */
export async function fetchRemoteConfig(sync: SyncConfig): Promise<AppConfig> {
  // 当前 MinIO 集成直接读取用户自管的 JSON 对象；凭据仅作为用户提供的请求头使用，绝不落地到 AppConfig 之外。
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

/** 仅做连通性检测：用 HEAD 请求验证可达性，不下载或修改远端配置。 */
export async function testMinioConnection(sync: SyncConfig): Promise<void> {
  // 用 HEAD 验证可达性，不下载也不改动远端配置。
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

/** 用 PUT 将完整配置对象上传到远端。 */
export async function pushRemoteConfig(sync: SyncConfig, config: AppConfig): Promise<void> {
  // 上传始终写入完整配置对象；合并行为由调用方在此边界之前决定。
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
