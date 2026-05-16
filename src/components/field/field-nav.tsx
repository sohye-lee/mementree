'use client';

import { signOut } from '@/app/actions';
import { copy } from '@/lib/copy';
import styles from './field-nav.module.css';

// top nav for the field view.
// phase A: brand + handle + sign out.
// phase F: + "↓ fallen" link (opens the recently-fallen tray).

interface Props {
  handle: string;
  fallenCount: number;
  onFallenClick: () => void;
}

export function FieldNav({ handle, fallenCount, onFallenClick }: Props) {
  return (
    <header className={styles.top}>
      <div className={styles.left}>
        <span className={styles.mark} aria-hidden="true" />
        <span className={styles.brand}>{copy.brand}</span>
        <span className={styles.sep}>/</span>
        <span className={styles.field}>{handle}</span>
      </div>
      <div className={styles.right}>
        <button
          type="button"
          className={styles.fallenLink}
          onClick={onFallenClick}
          aria-label={copy.fallen.eyebrow}
        >
          {copy.fallen.navLabel}
          {fallenCount > 0 && (
            <span className={styles.fallenCount}>{fallenCount}</span>
          )}
        </button>
        <form action={signOut}>
          <button type="submit" className={styles.signOut}>
            {copy.home.signOut}
          </button>
        </form>
      </div>
    </header>
  );
}
