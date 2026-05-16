'use client';

import { useEffect, useRef } from 'react';
import { copy } from '@/lib/copy';
import type { FieldMode } from '@/types/domain';
import styles from './detail-panel.module.css';

const c = copy.detail;

export interface DetailTree {
  id: string;
  ord: number;
  name: string;
  year: string | null;
  lead: string | null;
  description: string | null;
}

interface Props {
  // when null, the panel is closed (translated off-screen)
  tree: DetailTree | null;
  fieldMode: FieldMode | null;
  onClose: () => void;
}

export function DetailPanel({ tree, fieldMode, onClose }: Props) {
  const isOpen = tree !== null;

  // close on esc
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // keep the last tree rendered while the panel slides out, so the content
  // doesn't flash empty during the 320ms close animation.
  const lastTreeRef = useRef<DetailTree | null>(tree);
  useEffect(() => {
    if (tree) lastTreeRef.current = tree;
  }, [tree]);
  const shown = tree ?? lastTreeRef.current;

  const modeWord = fieldMode ? c.modeWord[fieldMode] : '—';
  const ordStr = shown ? String(shown.ord).padStart(2, '0') : '—';

  return (
    <aside
      className={`${styles.panel} ${isOpen ? styles.open : ''}`}
      aria-hidden={!isOpen}
      aria-label={shown ? `${shown.name} — ${modeWord}` : undefined}
    >
      {shown && (
        <>
          <div className={styles.head}>
            <div className={styles.eyebrow}>
              <span>
                {ordStr} · {modeWord}
              </span>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label={c.closeLabel}
                title={c.closeLabel}
              >
                [×]
              </button>
            </div>
            <h2 className={styles.title}>{shown.name}</h2>
            <div className={styles.meta}>
              <span>
                <span className={styles.metaValue}>{shown.year ?? '—'}</span>{' '}
                · {c.metaYear}
              </span>
              <span>
                <span className={styles.metaValue}>{shown.lead ?? '—'}</span>{' '}
                · {c.metaLead}
              </span>
              <span>
                <span className={styles.metaValue}>00</span> · {c.metaMemos}
              </span>
            </div>
            <p
              className={`${styles.desc} ${
                !shown.description ? styles.descEmpty : ''
              }`}
            >
              {shown.description || c.descPlaceholder}
            </p>
          </div>

          <div className={styles.body}>
            <div className={styles.sectionLabel}>
              <span>{c.memosLabel}</span>
              <span>00</span>
            </div>
            <div className={styles.memosEmpty}>{c.memosEmpty}</div>
          </div>
        </>
      )}
    </aside>
  );
}
