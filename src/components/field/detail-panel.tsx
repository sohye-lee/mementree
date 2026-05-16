'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { tieMemo } from '@/app/actions';
import { initialTieMemoState } from '@/app/action-state';
import { copy } from '@/lib/copy';
import { relativeTime } from '@/lib/time';
import type { FieldMode } from '@/types/domain';
import styles from './detail-panel.module.css';

const c = copy.detail;

export interface DetailMemo {
  id: string;
  author: string | null;
  text: string;
  createdAt: string; // iso
}

export interface DetailTree {
  id: string;
  ord: number;
  name: string;
  year: string | null;
  lead: string | null;
  description: string | null;
}

interface Props {
  tree: DetailTree | null;
  memos: DetailMemo[];
  fieldMode: FieldMode | null;
  defaultAuthor: string;
  onClose: () => void;
  onRequestWither: (treeId: string) => void;
  onRequestMemoFall: (memoId: string) => void;
}

export function DetailPanel({
  tree,
  memos,
  fieldMode,
  defaultAuthor,
  onClose,
  onRequestWither,
  onRequestMemoFall,
}: Props) {
  const isOpen = tree !== null;
  const lastTreeRef = useRef<DetailTree | null>(tree);
  useEffect(() => {
    if (tree) lastTreeRef.current = tree;
  }, [tree]);
  const shown = tree ?? lastTreeRef.current;

  // close on esc
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // memo composer state
  const [text, setText] = useState('');
  const [state, formAction, pending] = useActionState(
    tieMemo,
    initialTieMemoState,
  );
  useEffect(() => {
    if (state.ok) setText('');
  }, [state.ok]);
  // clear composer when switching trees
  useEffect(() => {
    setText('');
  }, [tree?.id]);

  const modeWord = fieldMode ? c.modeWord[fieldMode] : '—';
  const ordStr = shown ? String(shown.ord).padStart(2, '0') : '—';
  const memoCount = String(memos.length).padStart(2, '0');
  const composerErr =
    state.error === 'textRequired'
      ? c.composer.errors.textRequired
      : state.error === 'serverError'
        ? c.composer.errors.serverError
        : null;

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
              <div className={styles.eyebrowActions}>
                <button
                  type="button"
                  className={styles.witherBtn}
                  onClick={() => onRequestWither(shown.id)}
                >
                  {c.witherButton}
                </button>
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
                <span className={styles.metaValue}>{memoCount}</span>{' '}
                · {c.metaMemos}
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
              <span>{memoCount}</span>
            </div>
            {memos.length === 0 ? (
              <div className={styles.memosEmpty}>{c.memosEmpty}</div>
            ) : (
              <ul className={styles.memoList}>
                {memos.map((m) => (
                  <li key={m.id} className={styles.memo}>
                    <div className={styles.memoHead}>
                      <span>{relativeTime(m.createdAt)}</span>
                    </div>
                    <div className={styles.memoBody}>{m.text}</div>
                    <div className={styles.memoFoot}>
                      <span className={styles.memoAuthor}>
                        — {m.author || c.anon}
                      </span>
                      <button
                        type="button"
                        className={styles.memoFallBtn}
                        onClick={() => onRequestMemoFall(m.id)}
                        title={c.letMemoFall}
                      >
                        {c.letMemoFall}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className={styles.foot} action={formAction} noValidate>
            <input type="hidden" name="treeId" value={shown.id} />
            <div className={styles.composerLabel}>{c.composer.title}</div>
            <input
              className={styles.composerInput}
              type="text"
              name="author"
              maxLength={32}
              placeholder={c.composer.authorPlaceholder}
              defaultValue={defaultAuthor}
              disabled={pending}
            />
            <textarea
              className={styles.composerTextarea}
              name="text"
              maxLength={180}
              rows={3}
              placeholder={c.composer.textPlaceholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={pending}
              required
            />
            <div className={styles.composerFoot}>
              <span className={styles.composerCount}>
                {180 - text.length} {c.composer.charsRemaining}
              </span>
              <button
                type="submit"
                className={styles.composerSubmit}
                disabled={pending || text.trim().length === 0}
              >
                {pending ? c.composer.submitting : `${c.composer.submit} →`}
              </button>
            </div>
            {composerErr && (
              <p className={styles.composerError}>{composerErr}</p>
            )}
          </form>
        </>
      )}
    </aside>
  );
}
