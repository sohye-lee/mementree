'use client';

import { copy } from '@/lib/copy';
import styles from './field-footer.module.css';

const c = copy.footer;
const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  treeCount: number;
  memoCount: number;
  // null until the environment system resolves them
  season: string | null;
  phase: string | null;
  locating: boolean;
  onLocate: () => void;
  onRecenter: () => void;
}

export function FieldFooter({
  treeCount,
  memoCount,
  season,
  phase,
  locating,
  onLocate,
  onRecenter,
}: Props) {
  return (
    <footer className={styles.bar}>
      <button
        type="button"
        className={styles.env}
        onClick={onLocate}
        title={c.locateTitle}
      >
        {locating ? (
          <span className={styles.locating}>finding the sky…</span>
        ) : (
          <>
            <span className={styles.cell}>
              <span className={styles.glyph}>●</span>
              <span className={styles.label}>
                {season ?? c.seasonPlaceholder}
              </span>
            </span>
            <span className={styles.sep}>/</span>
            <span className={styles.cell}>
              <span className={styles.glyph}>○</span>
              <span className={styles.label}>
                {phase ?? c.phasePlaceholder}
              </span>
            </span>
            <span className={styles.sep}>/</span>
            <span className={styles.cell}>
              <span className={styles.label}>
                {pad(treeCount)} {c.trees}
              </span>
              <span className={styles.dot}>·</span>
              <span className={styles.label}>
                {pad(memoCount)} {c.memos}
              </span>
            </span>
          </>
        )}
      </button>

      <div className={styles.hint}>
        <span>
          <kbd className={styles.k}>w</kbd>
          <kbd className={styles.k}>a</kbd>
          <kbd className={styles.k}>s</kbd>
          <kbd className={styles.k}>d</kbd> {c.hint.walk}
        </span>
        <span>
          <kbd className={styles.k}>drag</kbd> {c.hint.look}
        </span>
        <span>
          <kbd className={styles.k}>click</kbd> {c.hint.tree}
        </span>
      </div>

      <button type="button" className={styles.recenter} onClick={onRecenter}>
        {c.recenter}
      </button>
    </footer>
  );
}
