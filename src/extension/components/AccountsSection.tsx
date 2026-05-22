import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { AccountEditorModal } from '../../shared/AccountEditorModal';
import { saveAccount, removeAccount } from '../../shared/config-ops';
import { accountInfoText, accountSearchText, type ToastVariant } from '../helpers';
import type { AccountRecord, AppConfig, EnvConfig, ProjectConfig } from '../../shared/types';

type AccountsSectionProps = {
  config: AppConfig;
  persist: (next: AppConfig, status?: string) => Promise<void>;
  showToast: (target: HTMLElement, message: string, variant?: ToastVariant) => void;
};

export function AccountsSection({ config, persist }: AccountsSectionProps) {
  const [selectedAccountProjectId, setSelectedAccountProjectId] = useState('');
  const [selectedAccountEnvId, setSelectedAccountEnvId] = useState('');
  const [accountKeyword, setAccountKeyword] = useState('');
  const [accountModal, setAccountModal] = useState<{
    open: boolean;
    projectId: string;
    envId: string;
    account?: AccountRecord | null;
  }>({ open: false, projectId: '', envId: '', account: null });

  const selectedAccountProject = useMemo(
    () => config.projects.find((item) => item.id === selectedAccountProjectId) ?? null,
    [config, selectedAccountProjectId],
  );

  useEffect(() => {
    if (selectedAccountProjectId && !config.projects.some((p) => p.id === selectedAccountProjectId)) {
      setSelectedAccountProjectId('');
      setSelectedAccountEnvId('');
    }
  }, [config, selectedAccountProjectId]);

  useEffect(() => {
    if (!selectedAccountProjectId || !selectedAccountProject || !selectedAccountEnvId) return;
    if (!selectedAccountProject.envs.some((item) => item.id === selectedAccountEnvId)) {
      setSelectedAccountEnvId('');
    }
  }, [selectedAccountEnvId, selectedAccountProject, selectedAccountProjectId]);

  const accountRows = useMemo(() => {
    const rows: Array<{ project: ProjectConfig; env: EnvConfig; account: AccountRecord }> = [];
    for (const project of config.projects) {
      if (selectedAccountProjectId && project.id !== selectedAccountProjectId) continue;
      for (const env of project.envs) {
        if (selectedAccountEnvId && env.id !== selectedAccountEnvId) continue;
        for (const account of env.accounts) {
          const keyword = accountKeyword.trim().toLowerCase();
          if (keyword) {
            const preview = accountSearchText(project, account).toLowerCase();
            if (!preview.includes(keyword)) continue;
          }
          rows.push({ project, env, account });
        }
      }
    }
    return rows;
  }, [accountKeyword, config, selectedAccountEnvId, selectedAccountProjectId]);

  async function saveAccountDraft(record: AccountRecord) {
    if (!accountModal.projectId || !accountModal.envId) return;
    const next = saveAccount(config, accountModal.projectId, accountModal.envId, record);
    await persist(next, '账号已保存');
    setAccountModal({ open: false, projectId: '', envId: '', account: null });
  }

  async function deleteAccountItem(projectId: string, envId: string, accountId: string) {
    if (!confirm(`确认删除账号 ${accountId} ?`)) return;
    await persist(removeAccount(config, projectId, envId, accountId), '账号已删除');
  }

  async function setDefaultAccountItem(projectId: string, envId: string, accountId: string) {
    const project = config.projects.find((item) => item.id === projectId);
    const env = project?.envs.find((item) => item.id === envId);
    const account = env?.accounts.find((item) => item.id === accountId);
    if (!project || !env || !account) return;
    await persist(
      saveAccount(config, projectId, envId, {
        ...account,
        isDefault: true,
        updatedAt: new Date().toISOString(),
      }),
      '默认账号已更新',
    );
  }

  return (
    <>
      <div className="wm-sections">
        <div className="wm-card">
          <div className="wm-card__hd">
            <strong>筛选</strong>
            <div className="wm-inline">
              <button
                className="wm-btn"
                type="button"
                onClick={() => {
                  setSelectedAccountProjectId('');
                  setSelectedAccountEnvId('');
                  setAccountKeyword('');
                }}
              >
                重置
              </button>
              <button
                className="wm-btn wm-btn--primary"
                type="button"
                onClick={() => {
                  const projectId = selectedAccountProjectId || config.projects[0]?.id || '';
                  const project = config.projects.find((item) => item.id === projectId);
                  const envId = selectedAccountEnvId || project?.envs[0]?.id || '';
                  setAccountModal({ open: true, projectId, envId, account: null });
                }}
              >
                <Plus size={14} /> 新增账号
              </button>
            </div>
          </div>
          <div className="wm-card__bd">
            <div className="wm-grid wm-grid--3">
              <label className="wm-field">
                <span>项目</span>
                <select
                  value={selectedAccountProjectId}
                  onChange={(event) => {
                    setSelectedAccountProjectId(event.target.value);
                    setSelectedAccountEnvId('');
                  }}
                >
                  <option value="">全部</option>
                  {config.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wm-field">
                <span>环境</span>
                <select
                  value={selectedAccountProjectId ? selectedAccountEnvId : ''}
                  disabled={!selectedAccountProjectId}
                  onChange={(event) => setSelectedAccountEnvId(event.target.value)}
                >
                  <option value="">全部</option>
                  {(selectedAccountProject?.envs ?? []).map((env) => (
                    <option key={`${selectedAccountProjectId}-${env.id}-${env.name}`} value={env.id}>
                      {env.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wm-field">
                <span>关键字</span>
                <input value={accountKeyword} onChange={(event) => setAccountKeyword(event.target.value)} />
              </label>
            </div>
          </div>
        </div>

        <div className="wm-card">
          <div className="wm-card__hd">
            <strong>账号列表</strong>
            <span className="wm-tiny">查询非敏感字段值</span>
          </div>
          <div className="wm-card__bd">
            {accountRows.length > 0 ? (
              <table className="wm-table">
                <thead>
                  <tr>
                    <th>项目</th>
                    <th>环境</th>
                    <th>账号信息</th>
                    <th>默认</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {accountRows.map(({ project, env, account }) => (
                    <tr key={`${project.id}-${env.id}-${account.id}`}>
                      <td>{project.name}</td>
                      <td>{env.name}</td>
                      <td>
                        <span className="wm-code wm-cell__text">{accountInfoText(project, account)}</span>
                      </td>
                      <td>{account.isDefault ? '是' : ''}</td>
                      <td>
                        <div className="wm-table__actions">
                          <button
                            className="wm-btn"
                            type="button"
                            onClick={() => setAccountModal({ open: true, projectId: project.id, envId: env.id, account })}
                          >
                            <Pencil size={13} /> 编辑
                          </button>
                          <button className="wm-btn" type="button" onClick={() => void setDefaultAccountItem(project.id, env.id, account.id)}>
                            <Star size={13} /> 默认
                          </button>
                          <button className="wm-btn wm-btn--danger" type="button" onClick={() => void deleteAccountItem(project.id, env.id, account.id)}>
                            <Trash2 size={13} /> 删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="wm-tiny">没有匹配账号。</div>
            )}
          </div>
        </div>
      </div>

      <AccountEditorModal
        open={accountModal.open}
        project={accountModal.projectId ? config.projects.find((item) => item.id === accountModal.projectId) ?? null : null}
        projects={config.projects}
        projectId={accountModal.projectId}
        envId={accountModal.envId}
        account={accountModal.account}
        title={accountModal.account ? '编辑账号' : '新增账号'}
        onClose={() => setAccountModal({ open: false, projectId: '', envId: '', account: null })}
        onProjectChange={(nextProjectId) => {
          const nextProject = config.projects.find((item) => item.id === nextProjectId);
          setAccountModal((prev) => ({
            ...prev,
            projectId: nextProjectId,
            envId: nextProject?.envs[0]?.id ?? '',
          }));
        }}
        onEnvChange={(nextEnvId) => {
          setAccountModal((prev) => ({
            ...prev,
            envId: nextEnvId,
          }));
        }}
        onSave={(record) => void saveAccountDraft(record)}
      />
    </>
  );
}
