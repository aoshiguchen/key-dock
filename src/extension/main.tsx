// 配置管理页（options 页）入口：装载根组件、加载/持久化全局配置，并按侧边栏选中项渲染各功能分区。
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { APP_INFO } from '../shared/app-info';
import { readAppConfig, writeAppConfig } from '../shared/storage';
import { getAppearanceClassName } from '../shared/theme';
import type { AppConfig } from '../shared/types';
import { getSectionLabel, type SectionKey } from './helpers';
import { useToast } from './hooks/useToast';
import { Sidebar } from './components/Sidebar';
import { GlobalSection } from './components/GlobalSection';
import { GroupsSection } from './components/GroupsSection';
import { ProjectsSection } from './components/ProjectsSection';
import { FieldTemplatesSection } from './components/FieldTemplatesSection';
import { AccountsSection } from './components/AccountsSection';
import { ConfigSection } from './components/ConfigSection';
import { SyncSection } from './components/SyncSection';
import './styles.css';

function App() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState('正在加载配置');
  const [section, setSection] = useState<SectionKey>('projects');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toast, showToast } = useToast();

  // 统一的配置写入入口：先更新内存状态与状态栏文案，再异步落盘到本地存储。
  async function persist(next: AppConfig, nextStatus = '已保存到本地') {
    setAppConfig(next);
    setStatus(nextStatus);
    await writeAppConfig(next);
  }

  // 首次挂载时从本地存储读取配置；失败则把错误信息显示到状态栏。
  useEffect(() => {
    readAppConfig()
      .then((loaded) => {
        setAppConfig(loaded);
        setStatus('配置已加载');
      })
      .catch((error: Error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root || !appConfig) return;
    // 把外观主题应用到根节点 className，使配置页跟随用户选择的主题/字号。
    root.className = getAppearanceClassName(appConfig.global.appearance);
  }, [appConfig]);

  // 配置尚未加载完成时只渲染加载占位卡片。
  if (!appConfig) {
    return (
      <div style={{ padding: 24 }}>
        <div className="wm-card">
          <div className="wm-card__hd">
            <strong>{APP_INFO.displayName}</strong>
            <span className="wm-status">{status}</span>
          </div>
          <div className="wm-card__bd">正在加载配置</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`wm-shell ${sidebarCollapsed ? 'wm-shell--collapsed' : ''} ${getAppearanceClassName(appConfig.global.appearance)}`}>
        <Sidebar
          section={section}
          collapsed={sidebarCollapsed}
          onSectionChange={setSection}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
        <main className="wm-panel">
          <div className="wm-panel__hd">
            <strong>{getSectionLabel(section)}</strong>
            <span className="wm-status">{status}</span>
          </div>
          <div className="wm-panel__bd">
            {/* 根据侧边栏选中的分区渲染对应面板；各分区共享同一 persist 写入入口与 toast 提示。 */}
            {section === 'global' && <GlobalSection config={appConfig} persist={persist} />}
            {section === 'groups' && <GroupsSection config={appConfig} persist={persist} showToast={showToast} />}
            {section === 'projects' && <ProjectsSection config={appConfig} persist={persist} showToast={showToast} />}
            {section === 'fieldTemplates' && <FieldTemplatesSection config={appConfig} persist={persist} showToast={showToast} />}
            {section === 'accounts' && <AccountsSection config={appConfig} persist={persist} showToast={showToast} />}
            {section === 'config' && <ConfigSection config={appConfig} persist={persist} setStatus={setStatus} />}
            {section === 'sync' && <SyncSection config={appConfig} persist={persist} setStatus={setStatus} showToast={showToast} />}
          </div>
        </main>
      </div>
      {toast ? (
        <div className={`wm-toast wm-toast--${toast.variant}`} style={{ left: toast.x, top: toast.y }}>
          {toast.text}
        </div>
      ) : null}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
