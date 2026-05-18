'use client';

import { useMemo, useState } from 'react';
import { copy } from '@/lib/copy';
import styles from './index-panel.module.css';

const c = copy.index;

export interface IndexTree {
  id: string;
  ord: number;
  name: string;
  lead: string | null;
  year: string | null;
  memoCount: number;
  // concatenated memo text, lowercased — used only for search matching
  memoHaystack: string;
}

interface Props {
  trees: IndexTree[];
  selectedTreeId: string | null;
  // visitors can browse the list but not plant
  canPlant: boolean;
  onSelectTree: (id: string) => void;
  onPlant: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function IndexPanel({
  trees,
  selectedTreeId,
  canPlant,
  onSelectTree,
  onPlant,
}: Props) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return trees;
    return trees.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.lead?.toLowerCase().includes(q) ?? false) ||
        (t.year?.includes(q) ?? false) ||
        t.memoHaystack.includes(q),
    );
  }, [trees, q]);

  return (
    <aside className={styles.panel} aria-label="tree index">
      <h4 className={styles.head}>
        <span>{c.title}</span>
        <span className={styles.count}>{pad(trees.length)}</span>
      </h4>

      <div className={styles.searchWrap}>
        <span className={styles.searchGlyph}>⌕</span>
        <input
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={c.searchPlaceholder}
          autoComplete="off"
          aria-label={c.searchPlaceholder}
        />
        {query && (
          <button
            type="button"
            className={styles.searchClear}
            onClick={() => setQuery('')}
            aria-label="clear search"
          >
            ×
          </button>
        )}
      </div>

      <ul className={styles.list}>
        {filtered.length === 0 ? (
          <li className={styles.empty}>
            {trees.length === 0 ? c.empty : c.noMatch}
          </li>
        ) : (
          filtered.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={`${styles.row} ${
                  t.id === selectedTreeId ? styles.active : ''
                }`}
                onClick={() => onSelectTree(t.id)}
              >
                <span className={styles.rowOrd}>{pad(t.ord)}</span>
                <span className={styles.rowBody}>
                  <span className={styles.rowName}>{t.name}</span>
                  <span className={styles.rowMeta}>
                    {[t.year, t.lead].filter(Boolean).join(' · ') || '—'}
                    {'  ·  '}
                    {pad(t.memoCount)} {c.memoCountSuffix}
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>

      {canPlant && (
        <button type="button" className={styles.plant} onClick={onPlant}>
          {c.plant}
        </button>
      )}
    </aside>
  );
}
