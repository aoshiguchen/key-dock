// 配置的 JSON 序列化与解析：导出格式化、导入时先规范化再校验。
import { validateAppConfig } from './validate';
import { normalizeAppConfigForRuntime } from './config-normalize';
import type { AppConfig } from './types';

/** 将配置序列化为带 2 空格缩进的 JSON 字符串（用于导出/展示）。 */
export function formatAppConfig(config: AppConfig): string {
  return JSON.stringify(config, null, 2);
}

/** 解析配置文本：JSON 解析后先做运行时规范化，再进行严格校验并返回校验结果。 */
export function parseAppConfigText(text: string) {
  const parsed = JSON.parse(text);
  return validateAppConfig(normalizeAppConfigForRuntime(parsed));
}
