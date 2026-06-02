// 轻量 Toast Hook：在目标元素上方弹出短暂提示，并自动定时清除。
import { useEffect, useRef, useState } from 'react';
import type { ToastState, ToastVariant } from '../helpers';
import { TOAST_DURATION_MS } from '../helpers';

/**
 * 提供 toast 状态与 showToast 触发函数。
 * showToast(target, message, variant)：以 target 元素的几何位置定位提示气泡。
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  function showToast(target: HTMLElement, message: string, variant: ToastVariant = 'success') {
    const rect = target.getBoundingClientRect();
    // 定位到目标元素的水平中点、上方 8px 处。
    setToast({ text: message, variant, x: rect.left + rect.width / 2, y: rect.top - 8 });
    // 连续触发时清除上一个计时器，避免旧定时回调提前隐藏新提示。
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }

  // 卸载时清理未触发的计时器，防止在已卸载组件上调用 setToast。
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { toast, showToast };
}
