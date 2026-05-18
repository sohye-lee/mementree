'use client';

import { useEffect, useState } from 'react';
import { copy } from '@/lib/copy';
import { emitToast } from '@/lib/toast-bus';
import styles from './share-modal.module.css';

const c = copy.share;

interface Props {
  open: boolean;
  handle: string;
  slug: string;
  onClose: () => void;
}

export function ShareModal({ open, handle, slug, onClose }: Props) {
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  // build the link from the live origin once open (window is client-only)
  useEffect(() => {
    if (!open) return;
    setLink(`${window.location.origin}/${handle}/${slug}`);
    setCopied(false);
  }, [open, handle, slug]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      emitToast(c.copied);
    } catch {
      /* clipboard blocked — the keeper can still select the field manually */
    }
  }

  return (
    <div
      className={styles.veil}
      role="dialog"
      aria-modal="true"
      aria-label={c.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.panel}>
        <h3 className={styles.title}>{c.title}</h3>
        <p className={styles.lede}>{c.lede}</p>

        <label className={styles.linkLabel} htmlFor="share-link">
          {c.linkLabel}
        </label>
        <div className={styles.linkRow}>
          <input
            id="share-link"
            className={styles.linkInput}
            value={link}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            className={styles.copyBtn}
            onClick={handleCopy}
          >
            {copied ? c.copied : c.copy}
          </button>
        </div>

        <div className={styles.noteTitle}>{c.noteTitle}</div>
        <ul className={styles.notes}>
          {c.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>

        <div className={styles.foot}>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
          >
            {c.close}
          </button>
        </div>
      </div>
    </div>
  );
}
