// 配置管理页「项目分组」子模块：项目分组的列表、新增/编辑/删除以及拖拽排序。
// 分组用于对项目进行归类，默认分组（DEFAULT_PROJECT_GROUP_CODE）不可删除/改 code。
import { useState } from 'react';
import { GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { DEFAULT_PROJECT_GROUP_CODE } from '../../shared/defaults';
import { clone, createBlankGroup, reorderById, type ToastVariant } from '../helpers';
import type { AppConfig, ProjectGroup } from '../../shared/types';

type GroupsSectionProps = {
  config: AppConfig;
  persist: (next: AppConfig, status?: string) => Promise<void>;
  showToast: (target: HTMLElement, message: string, variant?: ToastVariant) => void;
};

/**
 * 项目分组管理区。
 * @param config 当前完整配置。
 * @param persist 持久化整份配置并提示状态。
 * @param showToast 在指定元素附近弹出轻提示。
 */
export function GroupsSection({ config, persist, showToast }: GroupsSectionProps) {
  // groupForm 同时承载新增与编辑：originalCode 为 null 表示新增，非 null 表示在编辑该 code 的分组。
  const [groupForm, setGroupForm] = useState<{ originalCode: string | null; draft: ProjectGroup } | null>(null);
  const [draggedGroupCode, setDraggedGroupCode] = useState<string | null>(null);

  const projectGroups = config.projectGroups ?? [];

  function startAddProjectGroup() {
    setGroupForm({ originalCode: null, draft: createBlankGroup() });
  }

  function startEditProjectGroup(group: ProjectGroup) {
    setGroupForm({ originalCode: group.code, draft: clone(group) });
  }

  async function saveProjectGroupForm(target: HTMLElement) {
    if (!groupForm) return;
    const draft = {
      ...groupForm.draft,
      code: groupForm.draft.code.trim(),
      name: groupForm.draft.name.trim(),
    };
    if (!draft.code || !draft.name) {
      showToast(target, '分组 code 和名称不能为空', 'warning');
      return;
    }
    // code 在所有分组内须唯一（编辑时排除自身原 code）。
    const duplicate = projectGroups.some((group) => group.code === draft.code && group.code !== groupForm.originalCode);
    if (duplicate) {
      showToast(target, '分组 code 已存在', 'warning');
      return;
    }
    const nextGroups = groupForm.originalCode
      ? projectGroups.map((group) => (group.code === groupForm.originalCode ? draft : group))
      : [...projectGroups, draft];
    // 编辑时若 code 发生变更，需同步把原本归属该 code 的项目迁移到新 code，避免项目变成「孤儿分组」。
    const nextProjects =
      groupForm.originalCode && groupForm.originalCode !== draft.code
        ? config.projects.map((project) =>
            (project.groupCode ?? DEFAULT_PROJECT_GROUP_CODE) === groupForm.originalCode ? { ...project, groupCode: draft.code } : project,
          )
        : config.projects;
    await persist({ ...config, projectGroups: nextGroups, projects: nextProjects }, groupForm.originalCode ? '分组已保存' : '分组已新增');
    showToast(target, groupForm.originalCode ? '分组已保存' : '分组已新增', 'success');
    setGroupForm(null);
  }

  async function reorderProjectGroups(draggedCode: string | null, targetCode: string, target: HTMLElement) {
    if (!draggedCode || draggedCode === targetCode) return;
    const nextGroups = reorderById(projectGroups, draggedCode, targetCode, (group) => group.code);
    await persist({ ...config, projectGroups: nextGroups }, '分组顺序已保存');
    setDraggedGroupCode(null);
    showToast(target, '分组顺序已保存', 'success');
  }

  async function deleteProjectGroup(code: string) {
    // 默认分组不可删除，作为项目归属的兜底。
    if (code === DEFAULT_PROJECT_GROUP_CODE) return;
    const group = projectGroups.find((item) => item.code === code);
    if (!group) return;
    if (!confirm(`确认删除分组 ${group.name} ? 分组下项目会归入默认分组。`)) return;
    // 删除分组的同时，把其下项目回收到默认分组，保证项目始终有合法归属。
    await persist(
      {
        ...config,
        projectGroups: projectGroups.filter((item) => item.code !== code),
        projects: config.projects.map((project) =>
          (project.groupCode ?? DEFAULT_PROJECT_GROUP_CODE) === code ? { ...project, groupCode: DEFAULT_PROJECT_GROUP_CODE } : project,
        ),
      },
      '分组已删除',
    );
    setGroupForm((prev) => (prev?.originalCode === code ? null : prev));
  }

  return (
    <div className="wm-sections">
      <div className="wm-card">
        <div className="wm-card__hd">
          <strong>项目分组列表</strong>
          <button className="wm-btn wm-btn--primary" type="button" onClick={startAddProjectGroup}>
            <Plus size={14} /> 新增分组
          </button>
        </div>
        <div className="wm-card__bd">
          <table className="wm-table">
            <thead>
              <tr>
                <th>顺序</th>
                <th>分组 code</th>
                <th>分组名称</th>
                <th>描述</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {projectGroups.map((group) => (
                <tr
                  key={group.code}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => void reorderProjectGroups(draggedGroupCode, group.code, event.currentTarget)}
                >
                  <td>
                    {/* 拖拽手柄：仅手柄可拖动，行内的 onDrop 接收并完成排序。 */}
                    <button
                      type="button"
                      className="wm-icon-btn"
                      title="拖动排序"
                      draggable
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={() => setDraggedGroupCode(group.code)}
                      onDragEnd={() => setDraggedGroupCode(null)}
                    >
                      <GripVertical size={14} />
                    </button>
                  </td>
                  <td className="wm-code">{group.code}</td>
                  <td>{group.name}</td>
                  <td>{group.description ?? ''}</td>
                  <td>
                    <div className="wm-table__actions">
                      <button className="wm-btn" type="button" onClick={() => startEditProjectGroup(group)}>
                        <Pencil size={13} /> 编辑
                      </button>
                      <button
                        className="wm-btn wm-btn--danger"
                        type="button"
                        disabled={group.code === DEFAULT_PROJECT_GROUP_CODE}
                        onClick={() => void deleteProjectGroup(group.code)}
                      >
                        <Trash2 size={13} /> 删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {groupForm ? (
        <div className="wm-overlay" role="presentation">
          <div className="wm-modal" style={{ width: 'min(520px, calc(100vw - 32px))' }}>
            <div className="wm-modal__header">
              <strong>{groupForm.originalCode ? '编辑分组' : '新增分组'}</strong>
              <button className="wm-icon-btn" type="button" onClick={() => setGroupForm(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="wm-modal__body">
              <label className="wm-field">
                <span>分组 code *</span>
                <input
                  value={groupForm.draft.code}
                  disabled={groupForm.originalCode === DEFAULT_PROJECT_GROUP_CODE}
                  onChange={(event) =>
                    setGroupForm({
                      ...groupForm,
                      draft: { ...groupForm.draft, code: event.target.value },
                    })
                  }
                />
              </label>
              <label className="wm-field">
                <span>分组名称 *</span>
                <input
                  value={groupForm.draft.name}
                  onChange={(event) =>
                    setGroupForm({
                      ...groupForm,
                      draft: { ...groupForm.draft, name: event.target.value },
                    })
                  }
                />
              </label>
              <label className="wm-field">
                <span>描述</span>
                <textarea
                  rows={4}
                  value={groupForm.draft.description ?? ''}
                  onChange={(event) =>
                    setGroupForm({
                      ...groupForm,
                      draft: { ...groupForm.draft, description: event.target.value },
                    })
                  }
                />
              </label>
            </div>
            <div className="wm-modal__footer">
              <div>
                {groupForm.originalCode && groupForm.originalCode !== DEFAULT_PROJECT_GROUP_CODE ? (
                  <button className="wm-btn wm-btn--danger" type="button" onClick={() => void deleteProjectGroup(groupForm.originalCode!)}>
                    <Trash2 size={13} /> 删除
                  </button>
                ) : null}
              </div>
              <div className="wm-inline">
                <button className="wm-btn" type="button" onClick={() => setGroupForm(null)}>
                  取消
                </button>
                <button className="wm-btn wm-btn--primary" type="button" onClick={(event) => void saveProjectGroupForm(event.currentTarget)}>
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
