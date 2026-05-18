'use client';

import { signOut } from '@/app/actions';
import { copy } from '@/lib/copy';
import { Logo } from '@/components/brand/logo';
import { Clock } from './clock';
import styles from './field-nav.module.css';

// top nav for the field view.
//   left   — brand + handle
//   center — tree counter ({selected ord} / {total})
//   right  — clock, "↓ fallen", sign out

interface Props {
  treeCount: number;
  selectedOrd: number | null;
  fallenCount: number;
  onFallenClick: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function FieldNav({
  treeCount,
  selectedOrd,
  fallenCount,
  onFallenClick,
}: Props) {
  return (
    <header className={styles.top}>
      <div className={styles.left}>
        <Logo size={18} />
        <span className={styles.brand}>{copy.brand}</span>
      </div>

      <div className={styles.center}>
        <span className={styles.counter}>
          {selectedOrd != null ? pad(selectedOrd) : '—'} / {pad(treeCount)}
        </span>
      </div>

      <div className={styles.right}>
        <Clock />
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
