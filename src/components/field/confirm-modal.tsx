'use client';

import { useEffect } from 'react';
import { copy } from '@/lib/copy';
import styles from './confirm-modal.module.css';

type Variant = 'witherTree' | 'letMemoFall';

interface Props {
  open: boolean;
  variant: Variant;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({ open, variant, onCancel, onConfirm }: Props) {
  // close on esc
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  const c = copy.confirm[variant];

  return (
    <div
      className={styles.veil}
      role="dialog"
      aria-modal="true"
      aria-label={c.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className={styles.panel}>
        <h3 className={styles.title}>{c.title}</h3>
        <p className={styles.body}>{c.body}</p>
        <div className={styles.foot}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={onCancel}
          >
            {c.cancel}
          </button>
          <button
            type="button"
            className={styles.btnDanger}
            onClick={onConfirm}
          >
            {c.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
