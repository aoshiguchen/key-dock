import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Trash2, X } from 'lucide-react';
import { createAccountDraft } from './account-utils';
import { createId } from './id';
import type { AccountRecord, ProjectConfig } from './types';

let accountModalIdCounter = 0;

type Props = {
  open: boolean;
  project: ProjectConfig | null;
  projects?: ProjectConfig[];
  projectId?: string;
  envId?: string;
  account?: AccountRecord | null;
  title: string;
  lockContext?: boolean;
  onClose: () => void;
  onSave: (record: AccountRecord) => void;
  onDelete?: (account: AccountRecord) => void;
  onProjectChange?: (projectId: string) => void;
  onEnvChange?: (envId: string) => void;
};

export function AccountEditorModal({
  open,
  project,
  projects,
  projectId,
  envId,
  account,
  title,
  lockContext,
  onClose,
  onSave,
  onDelete,
  onProjectChange,
  onEnvChange,
}: Props) {
  const initialDraft = useMemo(() => {
    if (!project) return null;
    return createAccountDraft(project, account ?? undefined);
  }, [account, project]);

  const [draft, setDraft] = useState<AccountRecord | null>(initialDraft);
  const [requiredErrors, setRequiredErrors] = useState<Record<string, boolean>>({});
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [titleId] = useState(() => `wm-account-modal-title-${++accountModalIdCounter}`);

  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (!open || !project) return;
    setDraft(createAccountDraft(project, account ?? undefined));
    setRequiredErrors({});
    setRevealedFields({});
  }, [account, open, project]);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement;
    const timer = setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }, 0);
    document.addEventListener('keydown', trapFocus);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', trapFocus);
      triggerRef.current?.focus();
    };
  }, [open, trapFocus]);

  if (!open || !project || !draft) return null;
  const projectOptions = projects && projects.length > 0 ? projects : [project];
  const selectedProjectId = projectId ?? project.id;
  const selectedProject = projectOptions.find((item) => item.id === selectedProjectId) ?? project;
  const selectedEnvId = envId ?? selectedProject.envs[0]?.id ?? '';
  const editableContext = !account && !lockContext && projectOptions.length > 0;

  function handleSave() {
    if (!project || !draft) return;
    const nextErrors = Object.fromEntries(
      project.fields
        .filter((field) => field.required && !String(draft.values[field.key] ?? '').trim())
        .map((field) => [field.key, true]),
    );
    setRequiredErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSave({ ...draft, updatedAt: new Date().toISOString() });
  }

  return (
    <div className="wm-overlay" role="presentation">
      <div ref={dialogRef} className="wm-modal wm-account-editor-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="wm-modal__header">
          <strong id={titleId}>{title}</strong>
          <button className="wm-icon-btn" type="button" aria-label="关闭" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="wm-modal__body">
          {projects ? (
            <>
              <label className="wm-field wm-field--aligned">
                <span>项目</span>
                <div className="wm-field__control">
                  <select
                    value={selectedProjectId}
                    disabled={!editableContext}
                    onChange={(event) => {
                      const nextProjectId = event.target.value;
                      onProjectChange?.(nextProjectId);
                      const nextProject = projectOptions.find((item) => item.id === nextProjectId);
                      onEnvChange?.(nextProject?.envs[0]?.id ?? '');
                    }}
                  >
                    {projectOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="wm-field wm-field--aligned">
                <span>环境</span>
                <div className="wm-field__control">
                  <select
                    value={selectedEnvId}
                    disabled={!editableContext}
                    onChange={(event) => onEnvChange?.(event.target.value)}
                  >
                    {selectedProject.envs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </>
          ) : null}

          <label className="wm-field wm-field--aligned">
            <span>
              账号 ID <b className="wm-required">*</b>
            </span>
            <div className="wm-field__control">
              <input
                value={draft.id}
                onChange={(event) => setDraft({ ...draft, id: event.target.value || createId('account') })}
              />
            </div>
          </label>

          {project.fields.map((field) => (
            <label className="wm-field wm-field--aligned" key={field.key}>
              <span>
                {field.label}
                {field.required ? <b className="wm-required">*</b> : null}
              </span>
              <div className="wm-field__control">
                <div className={field.sensitive ? 'wm-input-affix' : undefined}>
                  <input
                    type={field.sensitive && !revealedFields[field.key] ? 'password' : 'text'}
                    className={requiredErrors[field.key] ? 'wm-input--error' : undefined}
                    value={draft.values[field.key] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDraft({
                        ...draft,
                        values: {
                          ...draft.values,
                          [field.key]: value,
                        },
                      });
                      if (value.trim()) {
                        setRequiredErrors((prev) => {
                          const next = { ...prev };
                          delete next[field.key];
                          return next;
                        });
                      }
                    }}
                  />
                  {field.sensitive ? (
                    <button
                      className="wm-icon-btn"
                      type="button"
                      aria-label={revealedFields[field.key] ? '隐藏' : '显示'}
                      onClick={() =>
                        setRevealedFields((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
                      }
                    >
                      {revealedFields[field.key] ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  ) : null}
                </div>
                {requiredErrors[field.key] ? <small className="wm-field__error">必填</small> : null}
              </div>
            </label>
          ))}

          <label className="wm-field wm-field--aligned wm-field--check">
            <span>默认账号</span>
            <div className="wm-field__control">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(event) => setDraft({ ...draft, isDefault: event.target.checked })}
              />
            </div>
          </label>
        </div>

        <div className="wm-modal__footer">
          <div>
            {account && onDelete ? (
              <button type="button" className="wm-btn wm-btn--danger" onClick={() => onDelete(account)}>
                <Trash2 size={13} /> 删除
              </button>
            ) : null}
          </div>
          <div className="wm-inline">
            <button type="button" className="wm-btn" onClick={onClose}>
              取消
            </button>
            <button type="button" className="wm-btn wm-btn--primary" onClick={handleSave}>
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
