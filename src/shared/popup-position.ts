import type { PopupPosition } from './types';

export const DEFAULT_POPUP_POSITION: PopupPosition = 'top-right';

export const POPUP_POSITION_OPTIONS: Array<{ value: PopupPosition; label: string }> = [
  { value: 'top-left', label: '左上方' },
  { value: 'left', label: '左侧' },
  { value: 'bottom-left', label: '左下方' },
  { value: 'top', label: '正上方' },
  { value: 'center', label: '居中' },
  { value: 'bottom', label: '正下方' },
  { value: 'top-right', label: '右上方' },
  { value: 'right', label: '右侧' },
  { value: 'bottom-right', label: '右下方' },
];

export function isPopupPosition(value: unknown): value is PopupPosition {
  return POPUP_POSITION_OPTIONS.some((item) => item.value === value);
}
