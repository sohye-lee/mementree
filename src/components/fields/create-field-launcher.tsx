'use client';

import { useState } from 'react';
import { copy } from '@/lib/copy';
import { CreateFieldModal } from './create-field-modal';
import styles from './fields-home.module.css';

// the only client island on the fields home: a button that opens the
// new-field modal. `card` is the dashed tile in the grid; `cta` is the
// primary button shown on the empty-state screen.
export function CreateFieldLauncher({ variant }: { variant: 'card' | 'cta' }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === 'card' ? (
        <button
          type="button"
          className={styles.newCard}
          onClick={() => setOpen(true)}
        >
          <span className={styles.newGlyph} aria-hidden="true">
            +
          </span>
          <span className={styles.newLabel}>{copy.fieldsHome.newField}</span>
        </button>
      ) : (
        <button
          type="button"
          className={styles.ctaBtn}
          onClick={() => setOpen(true)}
        >
          {copy.fieldsHome.empty.cta} →
        </button>
      )}
      <CreateFieldModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
