import type { FieldConfig, MatchedEnvironment, AppConfig } from './types';

function normalizeHost(host: string): string {
  return host.replace(/^www\./, '').toLowerCase();
}

export function matchCurrentPage(
  config: AppConfig,
  urlLike: Pick<Location, 'host' | 'hostname' | 'pathname'> & Partial<Pick<Location, 'hash' | 'search'>>,
): MatchedEnvironment | null {
  const host = normalizeHost(urlLike.host || urlLike.hostname);
  const pagePath = `${urlLike.pathname}${urlLike.search ?? ''}${urlLike.hash ?? ''}`;

  for (const project of config.projects) {
    for (const env of project.envs) {
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

export function getDefaultAccountId(envAccounts: Array<{ id: string; isDefault: boolean }>): string | null {
  const found = envAccounts.find((item) => item.isDefault);
  return found?.id ?? null;
}

export function isInputField(field: FieldConfig): boolean {
  return field.type === 'input';
}
