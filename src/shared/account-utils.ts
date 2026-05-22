import { createId } from './id';
import type { AccountRecord, FieldConfig, ProjectConfig } from './types';

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

export function ensureAccountValues(fieldDefs: FieldConfig[], values: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const field of fieldDefs) {
    next[field.key] = values[field.key] ?? '';
  }
  return next;
}

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

export function createInputEvents(target: HTMLInputElement | HTMLTextAreaElement): void {
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
  target.dispatchEvent(new Event('blur', { bubbles: true }));
}

export async function waitForSelector(selector: string, delays: number[]): Promise<HTMLElement | null> {
  for (const delay of delays.length ? delays : [0]) {
    if (delay > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }
    const found = document.querySelector(selector);
    if (found instanceof HTMLElement) return found;
  }
  return null;
}
