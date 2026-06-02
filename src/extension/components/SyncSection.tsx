// 数据同步分区：配置 MinIO 连接参数，并提供测试连接、远程<->本地双向同步。
import { useState } from 'react';
import { CloudDownload, CloudUpload, Plug } from 'lucide-react';
import { fetchRemoteConfig, pushRemoteConfig, testMinioConnection } from '../../shared/minio';
import { mergeAppConfigs } from '../../shared/merge';
import type { ToastVariant } from '../helpers';
import type { AppConfig } from '../../shared/types';

type SyncSectionProps = {
  config: AppConfig;
  persist: (next: AppConfig, status?: string) => Promise<void>;
  setStatus: (status: string) => void;
  showToast: (target: HTMLElement, message: string, variant?: ToastVariant) => void;
};

type SyncTabKey = 'minio';

/** 数据同步分区组件。同步操作均以「是否启用 MinIO」为前置判断，未启用直接给出警告提示。 */
export function SyncSection({ config, persist, setStatus, showToast }: SyncSectionProps) {
  const [syncTab, setSyncTab] = useState<SyncTabKey>('minio');
  const [testing, setTesting] = useState(false);

  // 合并式更新 sync 配置（含 endpoint/凭据/启用开关等），写回本地。
  function updateSyncField(patch: Partial<AppConfig['sync']>) {
    void persist({ ...config, sync: { ...config.sync, ...patch } }, 'MinIO 配置已保存');
  }

  // 测试连接：未启用 MinIO 直接拦截；testing 用于禁用按钮防止重复点击。
  async function handleTestConnection(target: HTMLElement) {
    if (!config.sync.minioEnabled) {
      showToast(target, '未启用 MinIO', 'warning');
      return;
    }
    setTesting(true);
    try {
      await testMinioConnection(config.sync);
      showToast(target, '连接成功', 'success');
    } catch (error) {
      showToast(target, (error as Error).message, 'error');
    } finally {
      setTesting(false);
    }
  }

  // 远程 -> 本地：拉取远程配置后与本地按 cloudToLocal 策略合并；有冲突/告警则以 warning 形式提示并保留警告文案。
  async function syncFromCloud(target: HTMLElement) {
    if (!config.sync.minioEnabled) {
      setStatus('未启用 MinIO');
      showToast(target, '未启用 MinIO', 'warning');
      return;
    }
    try {
      const remote = await fetchRemoteConfig(config.sync);
      const merged = mergeAppConfigs(config, remote, 'cloudToLocal');
      const message = merged.warnings.join(' ') || '远程配置已同步到本地';
      await persist(merged.config, message);
      showToast(target, message, merged.warnings.length > 0 ? 'warning' : 'success');
    } catch (error) {
      const message = (error as Error).message;
      setStatus(message);
      showToast(target, message, 'error');
    }
  }

  // 本地 -> 远程：把完整配置上传到 MinIO；成功后更新 meta 的同步时间并递增远程版本号，用于后续冲突判断。
  async function syncToCloud(target: HTMLElement) {
    if (!config.sync.minioEnabled) {
      setStatus('未启用 MinIO');
      showToast(target, '未启用 MinIO', 'warning');
      return;
    }
    try {
      await pushRemoteConfig(config.sync, config);
      const message = '已同步到 MinIO';
      await persist(
        {
          ...config,
          meta: {
            ...(config.meta ?? {}),
            lastSyncedAt: new Date().toISOString(),
            remoteRevision: (config.meta?.remoteRevision ?? 0) + 1,
          },
        },
        message,
      );
      showToast(target, message, 'success');
    } catch (error) {
      const message = (error as Error).message;
      setStatus(message);
      showToast(target, message, 'error');
    }
  }

  return (
    <div className="wm-sections">
      <div className="wm-card">
        <div className="wm-card__hd">
          <strong>同步通道</strong>
        </div>
        <div className="wm-card__bd">
          <div className="wm-inline" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={`wm-btn ${syncTab === 'minio' ? 'wm-btn--primary' : ''}`}
              onClick={() => setSyncTab('minio')}
            >
              MinIO 同步
            </button>
          </div>
          {syncTab === 'minio' ? (
            <>
              <div className="wm-grid wm-grid--2">
                <label className="wm-field">
                  <span>Endpoint</span>
                  <input value={config.sync.endpoint ?? ''} onChange={(event) => updateSyncField({ endpoint: event.target.value })} />
                </label>
                <label className="wm-field">
                  <span>Bucket</span>
                  <input value={config.sync.bucket ?? ''} onChange={(event) => updateSyncField({ bucket: event.target.value })} />
                </label>
                <label className="wm-field">
                  <span>Access Key</span>
                  <input value={config.sync.accessKey ?? ''} onChange={(event) => updateSyncField({ accessKey: event.target.value })} />
                </label>
                <label className="wm-field">
                  <span>Secret Key</span>
                  <input value={config.sync.secretKey ?? ''} onChange={(event) => updateSyncField({ secretKey: event.target.value })} />
                </label>
                <label className="wm-field">
                  <span>Path Prefix</span>
                  <input value={config.sync.pathPrefix ?? ''} onChange={(event) => updateSyncField({ pathPrefix: event.target.value })} />
                </label>
                <label className="wm-field">
                  <span>Object Key</span>
                  <input value={config.sync.objectKey ?? ''} onChange={(event) => updateSyncField({ objectKey: event.target.value })} />
                </label>
              </div>
              <div className="wm-inline" style={{ marginTop: 12 }}>
                <label className="wm-inline">
                  <input
                    type="checkbox"
                    checked={config.sync.minioEnabled}
                    onChange={(event) => updateSyncField({ minioEnabled: event.target.checked })}
                  />
                  启用 MinIO
                </label>
                <button
                  className="wm-btn"
                  type="button"
                  disabled={testing}
                  onClick={(event) => void handleTestConnection(event.currentTarget)}
                >
                  <Plug size={13} /> {testing ? '测试中…' : '测试连接'}
                </button>
                <button className="wm-btn" type="button" onClick={(event) => void syncFromCloud(event.currentTarget)}>
                  <CloudDownload size={13} /> 远程 -&gt; 本地
                </button>
                <button className="wm-btn wm-btn--success" type="button" onClick={(event) => void syncToCloud(event.currentTarget)}>
                  <CloudUpload size={13} /> 本地 -&gt; 远程
                </button>
              </div>
              <div className="wm-tiny" style={{ marginTop: 8 }}>
                保存按钮会把同步配置写回本地 JSON；同步按钮直接读写 MinIO 中的完整 JSON 配置。
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
