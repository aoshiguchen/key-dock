// 账号与表单填充辅助：构造账号草稿、对齐字段值、复制文本、派发输入事件、轮询等待选择器。
import { createId } from './id';
import type { AccountRecord, FieldConfig, ProjectConfig } from './types';

/** 基于项目字段定义生成账号草稿，按字段 key 补齐 values 占位，缺省 id/时间自动生成。 */
export function createAccountDraft(project: ProjectConfig, account?: Partial<AccountRecord>): AccountRecord {
  const values: Record<string, string> = {};
  for (const field of project.fields) {
    values[field.key] = account?.values?.[field.key] ?? '';
  }
  return {
    id: account?.id ?? createId('account'),
    values,
    isDefault: account?.isDefault ?? false,
    updatedAt: account?.updatedAt ?? new Date().toISOString(),
  };
}

/** 按字段定义重建 values，丢弃多余键、补齐缺失键，确保与当前字段集合对齐。 */
export function ensureAccountValues(fieldDefs: FieldConfig[], values: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const field of fieldDefs) {
    next[field.key] = values[field.key] ?? '';
  }
  return next;
}

/** 复制文本到剪贴板；不支持 Clipboard API 时回退到隐藏 textarea + execCommand。 */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

/** 填充后派发 input/change/blur 事件，触发目标页面框架（如 Vue/React）感知到值变化。 */
export function createInputEvents(target: HTMLInputElement | HTMLTextAreaElement): void {
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
  target.dispatchEvent(new Event('blur', { bubbles: true }));
}

/** 按 delays 给出的毫秒间隔依次重试查询选择器，等待异步渲染的元素出现；超时返回 null。 */
export async function waitForSelector(selector: string, delays: number[]): Promise<HTMLElement | null> {
  // delays 为空时至少尝试一次（延迟 0）。
  for (const delay of delays.length ? delays : [0]) {
    if (delay > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }
    const found = document.querySelector(selector);
    if (found instanceof HTMLElement) return found;
  }
  return null;
}
