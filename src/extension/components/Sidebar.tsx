// 配置管理页侧边栏：展示品牌信息与分区菜单，支持折叠/展开。
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { APP_INFO } from '../../shared/app-info';
import { MENU_ITEMS, type SectionKey } from '../helpers';

type SidebarProps = {
  section: SectionKey;
  collapsed: boolean;
  onSectionChange: (section: SectionKey) => void;
  onToggleCollapse: () => void;
};

/** 侧边栏组件。section 为当前选中分区；collapsed 控制折叠态；回调用于切换分区与折叠状态。 */
export function Sidebar({ section, collapsed, onSectionChange, onToggleCollapse }: SidebarProps) {
  return (
    <aside className="wm-panel wm-sidebar">
      <div className="wm-panel__hd">
        <span className="wm-sidebar__brand">
          <img className="wm-sidebar__logo" src={chrome.runtime.getURL('icons/logo.svg')} alt="" />
          <strong className="wm-sidebar__title">{APP_INFO.productName}</strong>
        </span>
        <button
          className="wm-icon-btn"
          type="button"
          title={collapsed ? '展开菜单' : '折叠菜单'}
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <div className="wm-panel__bd">
        <div className="wm-list">
          {MENU_ITEMS.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              aria-label={label}
              className={`wm-item ${section === key ? 'wm-item--active' : ''}`}
              onClick={() => onSectionChange(key)}
            >
              <span className="wm-menu-icon" aria-hidden="true">
                {icon}
              </span>
              <span className="wm-menu-label">{label}</span>
              <span className="wm-menu-tooltip" role="tooltip">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
