'use client';

import Link from 'next/link';
import { signOut } from '@/app/actions';
import { copy } from '@/lib/copy';
import { Logo } from '@/components/brand/logo';
import { Clock } from './clock';
import styles from './field-nav.module.css';

// top nav for the field view.
//   keeper  — brand · counter · clock · share · fallen · sign out
//   visitor — brand / {handle} · counter · clock · (sign in, if anonymous)

interface Props {
  isKeeper: boolean;
  viewerSignedIn: boolean;
  handle: string;
  treeCount: number;
  selectedOrd: number | null;
  fallenCount: number;
  onFallenClick: () => void;
  onShareClick: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function FieldNav({
  isKeeper,
  viewerSignedIn,
  handle,
  treeCount,
  selectedOrd,
  fallenCount,
  onFallenClick,
  onShareClick,
}: Props) {
  return (
    <header className={styles.top}>
      <div className={styles.left}>
        <Link href="/" className={styles.brandLink} aria-label="mementree">
          <Logo size={18} />
          <span className={styles.brand}>{copy.brand}</span>
        </Link>
        {!isKeeper && (
          <>
            <span className={styles.sep}>/</span>
            <span className={styles.field}>{handle}</span>
          </>
        )}
      </div>

      <div className={styles.center}>
        <span className={styles.counter}>
          {selectedOrd != null ? pad(selectedOrd) : '—'} / {pad(treeCount)}
        </span>
      </div>

      <div className={styles.right}>
        <Clock />
        {isKeeper ? (
          <>
            <button
              type="button"
              className={styles.navBtn}
              onClick={onShareClick}
            >
              {copy.share.navLabel}
            </button>
            <button
              type="button"
              className={styles.navBtn}
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
          </>
        ) : (
          !viewerSignedIn && (
            <Link href="/sign-in" className={styles.navBtn}>
              {copy.signIn.topbarState}
            </Link>
          )
        )}
      </div>
    </header>
  );
}
