// \u8868\u683c\u5217\u5bbd\u8ba1\u7b97\uff1a\u6309\u8868\u5934\u4e0e\u5185\u5bb9\u4f30\u7b97\u81ea\u9002\u5e94\u5bbd\u5ea6\uff0c\u5e76\u517c\u987e\u5b57\u6bb5\u7684\u56fa\u5b9a\u5bbd\u5ea6\u4e0e\u6700\u5c0f/\u6700\u5927\u5bbd\u7ea6\u675f\u3002
import type { FieldConfig } from './types';

// \u4e2d\u6587\u5b57\u7b26\u6309 2 \u4e2a\u5b57\u5bbd\u8ba1\uff0c\u5176\u4f59\u6309 1 \u4e2a\uff0c\u7528\u4e8e\u7c97\u7565\u4f30\u7b97\u6587\u672c\u5360\u5bbd\u3002
function charWeight(char: string): number {
  return /[\u4e00-\u9fa5]/.test(char) ? 2 : 1;
}

// \u4f30\u7b97\u6587\u672c\u50cf\u7d20\u5bbd\u5ea6\uff1a\u5b57\u5bbd\u5408\u8ba1 \u00d7 8px \u518d\u52a0 24px \u5185\u8fb9\u8ddd\uff0c\u5411\u4e0a\u53d6\u6574\u3002
function estimateTextWidth(text: string): number {
  const width = [...text].reduce((sum, char) => sum + charWeight(char), 0);
  return Math.ceil(width * 8 + 24);
}

// \u5c06\u5bbd\u5ea6\u914d\u7f6e\u89e3\u6790\u4e3a\u6570\u5b57\uff1a\u6570\u5b57\u76f4\u63a5\u7528\uff0c\u5b57\u7b26\u4e32\u4e2d\u63d0\u53d6\u9996\u4e2a\u6570\u503c\uff0c\u65e0\u6cd5\u89e3\u6790\u8fd4\u56de null\u3002
function parseWidth(value: number | string | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

/** 计算字段列宽：配置了有效固定宽度则直接采用，否则取表头/内容估算宽与 minWidth、96 的较大值，并受 maxWidth 限制。 */
export function computeColumnWidth(field: FieldConfig, contents: string[]): number {
  const fixed = parseWidth(field.width);
  if (fixed !== null && fixed > 0) return fixed;

  const headerWidth = estimateTextWidth(field.label);
  const contentWidth = contents.length
    ? Math.max(...contents.map((value) => estimateTextWidth(value || '')))
    : 0;
  const base = Math.max(headerWidth, contentWidth, field.minWidth ?? 0, 96);
  const maxWidth = field.maxWidth ?? Number.POSITIVE_INFINITY;
  return Math.min(base, maxWidth);
}
