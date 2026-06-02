// 弹窗摆放位置：默认方位、可选项（含中文标签）与类型守卫。
import type { PopupPosition } from './types';

export const DEFAULT_POPUP_POSITION: PopupPosition = 'top-right';

/** 九宫格方位选项及其中文标签，供配置 UI 下拉使用。 */
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

/** 判断任意值是否为合法的弹窗位置。 */
export function isPopupPosition(value: unknown): value is PopupPosition {
  return POPUP_POSITION_OPTIONS.some((item) => item.value === value);
}
