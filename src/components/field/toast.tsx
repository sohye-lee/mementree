'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeToast } from '@/lib/toast-bus';
import styles from './toast.module.css';

// single toast surface. shows the latest message for ~3s, then fades.
// voice.md: lowercase, ≤6 words, one per flow.

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const clearTimer = useRef<number | null>(null);

  useEffect(() => {
    return subscribeToast((m) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (clearTimer.current) clearTimeout(clearTimer.current);
      setMsg(m);
      setVisible(true);
      hideTimer.current = window.setTimeout(() => setVisible(false), 3000);
      clearTimer.current = window.setTimeout(() => setMsg(null), 3300);
    });
  }, []);

  if (!msg) return null;
  return (
    <div
      className={`${styles.toast} ${visible ? styles.show : ''}`}
      role="status"
      aria-live="polite"
    >
      {msg}
    </div>
  );
}
