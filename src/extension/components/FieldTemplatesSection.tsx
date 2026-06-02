// 配置管理页「字段配置模板」子模块：维护可复用的字段集合模板（列表、增删改、排序、字段编辑）。
// 模板用于在新建项目时快速套用一套字段定义，避免逐个手填。
import { useMemo, useState } from 'react';
import { GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { DEFAULT_PROJECT_GROUP_CODE } from '../../shared/defaults';
import { clone, createBlankFieldTemplate, reorderById, type ToastVariant } from '../helpers';
import { ProjectFieldsModal } from '../modals';
import type { AppConfig, FieldTemplate, ProjectConfig } from '../../shared/types';

type FieldTemplatesSectionProps = {
  config: AppConfig;
  persist: (next: AppConfig, status?: string) => Promise<void>;
  showToast: (target: HTMLElement, message: string, variant?: ToastVariant) => void;
};

/**
 * 字段配置模板管理区。
 * @param config 当前完整配置。
 * @param persist 持久化整份配置并提示状态。
 * @param showToast 在指定元素附近弹出轻提示。
 */
export function FieldTemplatesSection({ config, persist, showToast }: FieldTemplatesSectionProps) {
  const [templateKeyword, setTemplateKeyword] = useState('');
  // templateForm 兼作新增/编辑：originalId 为 null 表示新增。
  const [templateForm, setTemplateForm] = useState<{ originalId: string | null; draft: FieldTemplate } | null>(null);
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(null);
  // 当前打开「字段配置」弹窗的模板 id，null 表示未打开。
  const [fieldTemplateModalId, setFieldTemplateModalId] = useState<string | null>(null);

  const fieldTemplates = config.fieldTemplates ?? [];

  const filteredFieldTemplates = useMemo(() => {
    const keyword = templateKeyword.trim().toLowerCase();
    return keyword ? fieldTemplates.filter((template) => template.name.toLowerCase().includes(keyword)) : fieldTemplates;
  }, [fieldTemplates, templateKeyword]);

  const selectedFieldTemplate = useMemo(
    () => fieldTemplates.find((template) => template.id === fieldTemplateModalId) ?? null,
    [fieldTemplateModalId, fieldTemplates],
  );

  // 复用 ProjectFieldsModal 编辑模板字段：把选中模板「伪装」成一个临时 ProjectConfig
  // （借用其 fields 字段编辑能力），envs 置空、归入默认分组，仅用于驱动该弹窗。
  const fieldTemplateProject = useMemo<ProjectConfig | null>(() => {
    if (!selectedFieldTemplate) return null;
    return {
      id: selectedFieldTemplate.id,
      name: selectedFieldTemplate.name,
      groupCode: DEFAULT_PROJECT_GROUP_CODE,
      fields: selectedFieldTemplate.fields,
      envs: [],
    };
  }, [selectedFieldTemplate]);

  function startAddFieldTemplate() {
    setTemplateForm({ originalId: null, draft: createBlankFieldTemplate() });
  }

  function startEditFieldTemplate(template: FieldTemplate) {
    setTemplateForm({ originalId: template.id, draft: clone(template) });
  }

  async function saveFieldTemplateForm(target: HTMLElement) {
    if (!templateForm) return;
    const draft = {
      ...templateForm.draft,
      name: templateForm.draft.name.trim(),
    };
    if (!draft.name) {
      showToast(target, '模板名称不能为空', 'warning');
      return;
    }
    const nextTemplates = templateForm.originalId
      ? fieldTemplates.map((template) => (template.id === templateForm.originalId ? draft : template))
      : [...fieldTemplates, draft];
    await persist({ ...config, fieldTemplates: nextTemplates }, templateForm.originalId ? '模板已保存' : '模板已新增');
    showToast(target, templateForm.originalId ? '模板已保存' : '模板已新增', 'success');
    setTemplateForm(null);
  }

  // 局部更新某模板字段并落盘；若该模板正在表单中编辑，同步刷新草稿避免回显过期数据。
  async function updateFieldTemplate(templateId: string, patch: Partial<FieldTemplate>) {
    await persist(
      {
        ...config,
        fieldTemplates: fieldTemplates.map((template) => (template.id === templateId ? { ...template, ...patch } : template)),
      },
      '模板已保存',
    );
    setTemplateForm((prev) => (prev?.originalId === templateId ? { ...prev, draft: { ...prev.draft, ...patch } } : prev));
  }

  async function reorderFieldTemplates(draggedId: string | null, targetId: string, target: HTMLElement) {
    if (!draggedId || draggedId === targetId) return;
    const nextTemplates = reorderById(fieldTemplates, draggedId, targetId, (template) => template.id);
    await persist({ ...config, fieldTemplates: nextTemplates }, '模板顺序已保存');
    setDraggedTemplateId(null);
    showToast(target, '模板顺序已保存', 'success');
  }

  async function deleteFieldTemplate(templateId: string) {
    const template = fieldTemplates.find((item) => item.id === templateId);
    if (!template) return;
    if (!confirm(`确认删除模板 ${template.name} ?`)) return;
    await persist({ ...config, fieldTemplates: fieldTemplates.filter((item) => item.id !== templateId) }, '模板已删除');
    setTemplateForm((prev) => (prev?.originalId === templateId ? null : prev));
  }

  return (
    <>
      <div className="wm-sections">
        <div className="wm-card">
          <div className="wm-card__hd">
            <strong>字段配置模板列表</strong>
            <button className="wm-btn wm-btn--primary" type="button" onClick={startAddFieldTemplate}>
              <Plus size={14} /> 新增模板
            </button>
          </div>
          <div className="wm-card__bd">
            <label className="wm-field" style={{ marginBottom: 10, maxWidth: 320 }}>
              <span>模板名称</span>
              <input value={templateKeyword} onChange={(event) => setTemplateKeyword(event.target.value)} />
            </label>
            {filteredFieldTemplates.length > 0 ? (
              <table className="wm-table">
                <thead>
                  <tr>
                    <th>顺序</th>
                    <th>模板名称</th>
                    <th>字段数</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFieldTemplates.map((template) => (
                    <tr
                      key={template.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => void reorderFieldTemplates(draggedTemplateId, template.id, event.currentTarget)}
                    >
                      <td>
                        <button
                          type="button"
                          className="wm-icon-btn"
                          title="拖动排序"
                          draggable
                          onClick={(event) => event.stopPropagation()}
                          onDragStart={() => setDraggedTemplateId(template.id)}
                          onDragEnd={() => setDraggedTemplateId(null)}
                        >
                          <GripVertical size={14} />
                        </button>
                      </td>
                      <td>{template.name}</td>
                      <td>{template.fields.length}</td>
                      <td>
                        <div className="wm-table__actions">
                          <button className="wm-btn" type="button" onClick={() => startEditFieldTemplate(template)}>
                            <Pencil size={13} /> 编辑
                          </button>
                          <button className="wm-btn" type="button" onClick={() => setFieldTemplateModalId(template.id)}>
                            字段配置
                          </button>
                          <button className="wm-btn wm-btn--danger" type="button" onClick={() => void deleteFieldTemplate(template.id)}>
                            <Trash2 size={13} /> 删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="wm-tiny">当前没有字段配置模板。</div>
            )}
          </div>
        </div>
        {templateForm ? (
          <div className="wm-overlay" role="presentation">
            <div className="wm-modal" style={{ width: 'min(460px, calc(100vw - 32px))' }}>
              <div className="wm-modal__header">
                <strong>{templateForm.originalId ? '编辑模板' : '新增模板'}</strong>
                <button className="wm-icon-btn" type="button" onClick={() => setTemplateForm(null)}>
                  <X size={14} />
                </button>
              </div>
              <div className="wm-modal__body">
                <label className="wm-field">
                  <span>模板名称 *</span>
                  <input
                    value={templateForm.draft.name}
                    onChange={(event) =>
                      setTemplateForm({
                        ...templateForm,
                        draft: { ...templateForm.draft, name: event.target.value },
                      })
                    }
                  />
                </label>
                <span className="wm-tiny">字段数：{templateForm.draft.fields.length}</span>
              </div>
              <div className="wm-modal__footer">
                <div>
                  {templateForm.originalId ? (
                    <button className="wm-btn wm-btn--danger" type="button" onClick={() => void deleteFieldTemplate(templateForm.originalId!)}>
                      <Trash2 size={13} /> 删除
                    </button>
                  ) : null}
                </div>
                <div className="wm-inline">
                  <button className="wm-btn" type="button" onClick={() => setTemplateForm(null)}>
                    取消
                  </button>
                  <button className="wm-btn wm-btn--primary" type="button" onClick={(event) => void saveFieldTemplateForm(event.currentTarget)}>
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 模板字段编辑弹窗：保存后写回模板的 fields 并关闭。 */}
      <ProjectFieldsModal
        open={Boolean(fieldTemplateModalId)}
        project={fieldTemplateProject}
        title="模板字段配置"
        onClose={() => setFieldTemplateModalId(null)}
        onSave={(nextFields) => {
          if (fieldTemplateModalId) {
            void updateFieldTemplate(fieldTemplateModalId, { fields: nextFields }).then(() => setFieldTemplateModalId(null));
          }
        }}
      />
    </>
  );
}
