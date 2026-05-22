import { useEffect, useRef, useState } from 'react';
import type { ToastState, ToastVariant } from '../helpers';
import { TOAST_DURATION_MS } from '../helpers';

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  function showToast(target: HTMLElement, message: string, variant: ToastVariant = 'success') {
    const rect = target.getBoundingClientRect();
    setToast({ text: message, variant, x: rect.left + rect.width / 2, y: rect.top - 8 });
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { toast, showToast };
}
