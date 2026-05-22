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

  async function persist(next: AppConfig, nextStatus = '已保存到本地') {
    setAppConfig(next);
    setStatus(nextStatus);
    await writeAppConfig(next);
  }

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
    root.className = getAppearanceClassName(appConfig.global.appearance);
  }, [appConfig]);

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
