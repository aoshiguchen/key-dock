import type { FieldConfig } from './types';

function charWeight(char: string): number {
  return /[\u4e00-\u9fa5]/.test(char) ? 2 : 1;
}

function estimateTextWidth(text: string): number {
  const width = [...text].reduce((sum, char) => sum + charWeight(char), 0);
  return Math.ceil(width * 8 + 24);
}

function parseWidth(value: number | string | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

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
