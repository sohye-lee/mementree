'use client';

import { copy } from '@/lib/copy';
import type { TreeAccess } from '@/types/domain';
import styles from './access-toggle.module.css';

const c = copy.treeAccess;
const OPTIONS: readonly TreeAccess[] = ['public', 'shared'];

// reusable two-option control for a tree's visibility.
// purely controlled — the parent decides what `onChange` does (form state in
// the plant modal, an immediate server action in the detail panel).

export function AccessToggle({
  value,
  onChange,
  disabled,
}: {
  value: TreeAccess;
  onChange: (v: TreeAccess) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.wrap} role="group" aria-label={c.label}>
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`${styles.opt} ${value === opt ? styles.active : ''}`}
          onClick={() => onChange(opt)}
          disabled={disabled}
          aria-pressed={value === opt}
        >
          <span className={styles.optName}>{c[opt]}</span>
          <span className={styles.optHint}>
            {opt === 'public' ? c.publicHint : c.sharedHint}
          </span>
        </button>
      ))}
    </div>
  );
}
