'use client';

import { copy } from '@/lib/copy';
import styles from './fab.module.css';

// floating action button — opens the plant modal.
// hidden during the first-tree onboarding (modal is already forced open).

export function PlantFab({
  onClick,
  hidden,
}: {
  onClick: () => void;
  hidden?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.fab}
      onClick={onClick}
      disabled={hidden}
      aria-label={copy.plant.fab}
      title={copy.plant.fab}
    >
      +
    </button>
  );
}
