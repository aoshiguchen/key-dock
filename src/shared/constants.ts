import { APP_INFO } from './app-info';

export const PRODUCT_LINK = {
  label: '官网|帮助|关于',
  url: APP_INFO.homepageUrl,
} as const;

// 代码仓库跳转链接（popup 与全局配置「关于」区共用，统一在此维护）。
export const REPO_LINKS = [
  { label: 'GitHub', url: APP_INFO.githubUrl },
  { label: 'Gitee', url: APP_INFO.giteeUrl },
] as const;
