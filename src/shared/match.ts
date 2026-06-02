// 页面匹配：根据当前 URL 的 host 与路径关键字，从配置中定位命中的项目与环境。
import type { FieldConfig, MatchedEnvironment, AppConfig } from './types';

// 归一化主机名：去掉 www. 前缀并转小写，便于比较。
function normalizeHost(host: string): string {
  return host.replace(/^www\./, '').toLowerCase();
}

/** 在配置中查找与当前页面（host + 路径）匹配的环境；命中返回项目/环境及按 order 排序的字段，否则返回 null。 */
export function matchCurrentPage(
  config: AppConfig,
  urlLike: Pick<Location, 'host' | 'hostname' | 'pathname'> & Partial<Pick<Location, 'hash' | 'search'>>,
): MatchedEnvironment | null {
  const host = normalizeHost(urlLike.host || urlLike.hostname);
  // 路径用于关键字匹配，含 query 与 hash，以覆盖前端路由场景。
  const pagePath = `${urlLike.pathname}${urlLike.search ?? ''}${urlLike.hash ?? ''}`;

  for (const project of config.projects) {
    for (const env of project.envs) {
      // host 完全相等或为配置 host 的子域名即视为命中。
      const hostMatched = env.hosts.some((item) => {
        const normalized = normalizeHost(item);
        return normalized === host || host.endsWith(`.${normalized}`) || host === normalized;
      });
      const pathMatched = env.pathKeywords.some((keyword) => pagePath.includes(keyword));
      if (hostMatched && pathMatched) {
        return {
          project,
          env,
          fields: project.fields.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        };
      }
    }
  }

  return null;
}

/** 返回环境内默认账号的 id，没有则返回 null。 */
export function getDefaultAccountId(envAccounts: Array<{ id: string; isDefault: boolean }>): string | null {
  const found = envAccounts.find((item) => item.isDefault);
  return found?.id ?? null;
}

/** 字段是否为可填充的 input 类型。 */
export function isInputField(field: FieldConfig): boolean {
  return field.type === 'input';
}
