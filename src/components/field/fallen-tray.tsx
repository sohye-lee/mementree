'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { liftMemoBack, liftTreeBack } from '@/app/actions';
import { copy } from '@/lib/copy';
import { emitToast } from '@/lib/toast-bus';
import { relativeTime } from '@/lib/time';
import styles from './fallen-tray.module.css';

const c = copy.fallen;

export interface FallenTreeItem {
  kind: 'tree';
  id: string;
  name: string;
  witheredAt: string;
}

export interface FallenMemoItem {
  kind: 'memo';
  id: string;
  text: string;
  author: string | null;
  parentTreeName: string | null;
  fallenAt: string;
}

export type FallenItem = FallenTreeItem | FallenMemoItem;

interface Props {
  open: boolean;
  items: FallenItem[];
  onClose: () => void;
}

export function FallenTray({ open, items, onClose }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleRestore(item: FallenItem) {
    if (item.kind === 'tree') {
      await liftTreeBack(item.id);
      emitToast(copy.toast.treeLifted);
    } else {
      await liftMemoBack(item.id);
      emitToast(copy.toast.memoLifted);
    }
    router.refresh();
  }

  return (
    <aside
      className={`${styles.tray} ${open ? styles.open : ''}`}
      aria-hidden={!open}
      aria-label={c.title}
    >
      <div className={styles.head}>
        <div>
          <div className={styles.eyebrow}>{c.eyebrow}</div>
          <h3 className={styles.title}>{c.title}</h3>
          <p className={styles.sub}>{c.sub}</p>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={c.closeLabel}
        >
          [×]
        </button>
      </div>

      <div className={styles.body}>
        {items.length === 0 ? (
          <div className={styles.empty}>{c.empty}</div>
        ) : (
          items.map((item) => (
            <div key={`${item.kind}-${item.id}`} className={styles.item}>
              <div className={styles.kind}>
                <span>{item.kind === 'tree' ? c.kindTree : c.kindMemo}</span>
                <span className={styles.ago}>
                  {relativeTime(
                    item.kind === 'tree' ? item.witheredAt : item.fallenAt,
                  )}
                </span>
              </div>
              <div className={styles.body2}>
                {item.kind === 'tree' ? item.name : item.text}
              </div>
              {item.kind === 'memo' && (
                <div className={styles.metaLine}>
                  — {item.author || copy.detail.anon}
                  {item.parentTreeName && (
                    <>
                      {'  ·  '}
                      <span style={{ color: 'var(--ink-30)' }}>
                        on {item.parentTreeName}
                      </span>
                    </>
                  )}
                </div>
              )}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.mini}
                  onClick={() => handleRestore(item)}
                >
                  {c.actionRestore}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
