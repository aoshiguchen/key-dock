// 配置导入导出分区：以完整 JSON 形式查看/编辑配置，并支持文件导入与子集导出。
import { useEffect, useState } from 'react';
import { CloudDownload, Pencil, RefreshCw, Save, Upload, X } from 'lucide-react';
import { formatAppConfig, parseAppConfigText } from '../../shared/json';
import { validateAppConfig, type ValidationError } from '../../shared/validate';
import { exportConfigSubset } from '../helpers';
import { ExportConfigModal } from '../modals';
import type { AppConfig } from '../../shared/types';

type ConfigSectionProps = {
  config: AppConfig;
  persist: (next: AppConfig, status?: string) => Promise<void>;
  setStatus: (status: string) => void;
};

/** 配置导入导出分区组件。setStatus 用于在校验/导入导出过程中反馈状态文案。 */
export function ConfigSection({ config, persist, setStatus }: ConfigSectionProps) {
  const [jsonText, setJsonText] = useState('');
  const [jsonEditMode, setJsonEditMode] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // 非编辑态时，让文本框与校验结果跟随外部配置刷新；编辑态则保留用户正在输入的草稿不被覆盖。
  useEffect(() => {
    if (!jsonEditMode) {
      setJsonText(formatAppConfig(config));
      setErrors(validateAppConfig(config).errors);
    }
  }, [config, jsonEditMode]);

  // 保存编辑框中的 JSON：先解析校验，失败则展示错误，成功才落盘并退出编辑态。
  async function saveJsonConfig() {
    try {
      const result = parseAppConfigText(jsonText);
      if (!result.ok || !result.value) {
        setErrors(result.errors);
        setStatus('JSON 校验失败');
        return;
      }
      await persist(result.value, 'JSON 已保存');
      setJsonEditMode(false);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  // 从文件导入：读取文本并解析校验，合法则整体替换当前配置。
  async function importJson(file: File) {
    const text = await file.text();
    const result = parseAppConfigText(text);
    if (!result.ok || !result.value) {
      setErrors(result.errors);
      setStatus('导入失败：JSON 不合法');
      return;
    }
    await persist(result.value, '已导入配置');
  }

  // 导出：按弹窗选项裁剪出配置子集，生成 Blob 并触发浏览器下载，最后释放临时对象 URL。
  async function exportJson(projectIds: string[], includeMinio: boolean, includeAppearance: boolean) {
    const next = exportConfigSubset(config, projectIds, includeMinio, includeAppearance);
    const blob = new Blob([JSON.stringify(next, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'web-account-config.json';
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus('已导出 JSON');
    setExportModalOpen(false);
  }

  return (
    <>
      <div className="wm-sections">
        <div className="wm-card">
          <div className="wm-card__hd">
            <strong>完整 JSON</strong>
            <div className="wm-inline">
              <button className="wm-btn" type="button" onClick={() => setJsonEditMode((prev) => !prev)}>
                {jsonEditMode ? <><X size={13} /> 取消编辑</> : <><Pencil size={13} /> 编辑</>}
              </button>
              <button className="wm-btn wm-btn--success" type="button" onClick={() => void saveJsonConfig()}>
                <Save size={13} /> 保存配置
              </button>
              <button className="wm-btn" type="button" onClick={() => void persist(config, '已刷新 JSON')}>
                <RefreshCw size={13} /> 刷新
              </button>
            </div>
          </div>
          <div className="wm-card__bd">
            <textarea
              className={`wm-json ${jsonEditMode ? 'wm-json--editable' : 'wm-json--readonly'}`}
              value={jsonText}
              readOnly={!jsonEditMode}
              onChange={(event) => setJsonText(event.target.value)}
            />
            <div className="wm-inline" style={{ marginTop: 8 }}>
              <button className="wm-btn" type="button" onClick={() => document.getElementById('import-json-input')?.click()}>
                <Upload size={13} /> 导入 JSON
              </button>
              <button className="wm-btn" type="button" onClick={() => setExportModalOpen(true)}>
                <CloudDownload size={13} /> 导出 JSON
              </button>
              <input
                id="import-json-input"
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void importJson(file);
                  }
                }}
              />
            </div>
            {errors.length > 0 ? (
              <div className="wm-tiny" style={{ marginTop: 8 }}>
                {errors.map((item, index) => (
                  <div key={`${item.path}-${index}`}>{`${item.path || 'root'}: ${item.message}`}</div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ExportConfigModal
        open={exportModalOpen}
        config={config}
        onClose={() => setExportModalOpen(false)}
        onExport={({ projectIds, includeMinio, includeAppearance }) => void exportJson(projectIds, includeMinio, includeAppearance)}
      />
    </>
  );
}
