'use client';

import { useEffect, useRef } from 'react';
import { copy } from '@/lib/copy';
import { relativeTime } from '@/lib/time';
import type { DetailMemo } from './detail-panel';
import styles from './memo-view.module.css';

// a single memo, read closely. a small offset-shadow card anchored
// bottom-left, with prev/next stepping through the tree's memos.

interface Props {
  // null → closed
  memo: DetailMemo | null;
  index: number;
  total: number;
  treeName: string;
  // keeper-only: the "let fall" control
  canManage: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLetFall: (memoId: string) => void;
}

export function MemoView({
  memo,
  index,
  total,
  treeName,
  canManage,
  onClose,
  onPrev,
  onNext,
  onLetFall,
}: Props) {
  const isOpen = memo !== null;

  // keep last memo rendered through the close animation
  const lastRef = useRef<DetailMemo | null>(memo);
  useEffect(() => {
    if (memo) lastRef.current = memo;
  }, [memo]);
  const shown = memo ?? lastRef.current;

  // close on esc
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <aside
      className={`${styles.card} ${isOpen ? styles.open : ''}`}
      aria-hidden={!isOpen}
    >
      {shown && (
        <>
          <div className={styles.head}>
            <div className={styles.eyebrow}>
              <span>
                {String(index + 1).padStart(2, '0')} · memo
              </span>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label={copy.detail.closeLabel}
              >
                [×]
              </button>
            </div>
            <div className={styles.project}>
              <span className={styles.projectArrow}>↳ </span>
              {treeName}
            </div>
          </div>

          <div className={styles.paper}>
            <div className={styles.hole} />
            <div className={styles.text}>{shown.text}</div>
            <div className={styles.rule} />
            <div className={styles.foot}>
              <span>— {shown.author || copy.detail.anon}</span>
              <span>{relativeTime(shown.createdAt)}</span>
            </div>
          </div>

          <div className={styles.nav}>
            <button
              type="button"
              className={styles.step}
              onClick={onPrev}
              disabled={index <= 0}
            >
              ← prev
            </button>
            <span className={styles.counter}>
              {String(index + 1).padStart(2, '0')} /{' '}
              {String(total).padStart(2, '0')}
            </span>
            <button
              type="button"
              className={styles.step}
              onClick={onNext}
              disabled={index >= total - 1}
            >
              next →
            </button>
          </div>

          {canManage && (
            <div className={styles.fallRow}>
              <button
                type="button"
                className={styles.fallBtn}
                onClick={() => onLetFall(shown.id)}
              >
                {copy.detail.letMemoFall}
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
