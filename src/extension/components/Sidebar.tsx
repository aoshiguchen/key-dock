import { ChevronLeft, ChevronRight } from 'lucide-react';
import { APP_INFO } from '../../shared/app-info';
import { MENU_ITEMS, type SectionKey } from '../helpers';

type SidebarProps = {
  section: SectionKey;
  collapsed: boolean;
  onSectionChange: (section: SectionKey) => void;
  onToggleCollapse: () => void;
};

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
