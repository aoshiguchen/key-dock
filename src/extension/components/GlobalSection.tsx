import { APP_INFO } from '../../shared/app-info';
import { PRODUCT_LINK } from '../../shared/constants';
import { THEME_OPTIONS, FONT_SCALE_OPTIONS } from '../../shared/theme';
import type { AppConfig } from '../../shared/types';

type GlobalSectionProps = {
  config: AppConfig;
  persist: (next: AppConfig, status?: string) => Promise<void>;
};

export function GlobalSection({ config, persist }: GlobalSectionProps) {
  function updateGlobalConfig(patch: Partial<AppConfig['global']>) {
    void persist({ ...config, global: { ...config.global, ...patch } }, '全局配置已保存');
  }

  function updateAppearance(patch: Partial<AppConfig['global']['appearance']>) {
    void persist(
      {
        ...config,
        global: {
          ...config.global,
          appearance: {
            ...config.global.appearance,
            ...patch,
          },
        },
      },
      '外观配置已保存',
    );
  }

  return (
    <div className="wm-sections">
      <div className="wm-card">
        <div className="wm-card__hd">
          <strong>关于 {APP_INFO.displayName}</strong>
          <span className="wm-status">v{APP_INFO.version}</span>
        </div>
        <div className="wm-card__bd">
          <div className="wm-about">
            <img className="wm-about__logo" src={chrome.runtime.getURL('icons/logo.svg')} alt="" />
            <div className="wm-about__content">
              <strong>{APP_INFO.displayName}</strong>
              <p>{APP_INFO.description}</p>
              <p>钥栈 KeyDock 是一个 Web 账号管理助手，适合需要频繁切换多个系统、环境和测试账号的开发、测试与运维场景。</p>
              <div className="wm-about__links" aria-label="产品链接">
                <a href={PRODUCT_LINK.url} target="_blank" rel="noopener noreferrer">
                  {PRODUCT_LINK.label}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="wm-card">
        <div className="wm-card__hd">
          <strong>全局配置</strong>
        </div>
        <div className="wm-card__bd">
          <div className="wm-grid wm-grid--2">
            <label className="wm-inline wm-switch">
              <input
                type="checkbox"
                checked={config.global.showLoginAccountPanel}
                onChange={(event) => updateGlobalConfig({ showLoginAccountPanel: event.target.checked })}
              />
              登陆页显示账号列表弹窗
            </label>
            <label className="wm-inline wm-switch">
              <input
                type="checkbox"
                checked={config.global.showAccountPickerOnInputClick}
                onChange={(event) => updateGlobalConfig({ showAccountPickerOnInputClick: event.target.checked })}
              />
              点击输入框自动弹出账号列表选择框
            </label>
          </div>
        </div>
      </div>
      <div className="wm-card">
        <div className="wm-card__hd">
          <strong>外观设置</strong>
          <span className="wm-tiny">主题会同步到配置页、popup 和登录页浮窗</span>
        </div>
        <div className="wm-card__bd">
          <div className="wm-theme-grid">
            {THEME_OPTIONS.map((theme) => (
              <button
                key={theme.value}
                type="button"
                className={`wm-theme-card wm-theme-card--${theme.value} ${
                  config.global.appearance.theme === theme.value ? 'wm-theme-card--active' : ''
                }`}
                onClick={() => updateAppearance({ theme: theme.value })}
              >
                <span className="wm-theme-card__preview">
                  <i />
                  <b />
                  <em />
                </span>
                <strong>{theme.label}</strong>
                <small>{theme.description}</small>
              </button>
            ))}
          </div>
          <div className="wm-pref-row">
            <span className="wm-pref-row__label">字号</span>
            <div className="wm-segmented">
              {FONT_SCALE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={config.global.appearance.fontScale === option.value ? 'wm-segmented__item wm-segmented__item--active' : 'wm-segmented__item'}
                  onClick={() => updateAppearance({ fontScale: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <label className="wm-inline wm-switch">
            <input
              type="checkbox"
              checked={config.global.appearance.enableMotion}
              onChange={(event) => updateAppearance({ enableMotion: event.target.checked })}
            />
            启用轻量动效
          </label>
        </div>
      </div>
    </div>
  );
}
