import { signOut } from '@/app/actions';
import { copy } from '@/lib/copy';
import styles from './field-nav.module.css';

// top nav for the field view.
// phase A: brand + handle + sign out.
// later phases will add: index (tree count / mode badge), search affordance,
// settings/share menu, ambient sound toggle. structure leaves room.

export function FieldNav({ handle }: { handle: string }) {
  return (
    <header className={styles.top}>
      <div className={styles.left}>
        <span className={styles.mark} aria-hidden="true" />
        <span className={styles.brand}>{copy.brand}</span>
        <span className={styles.sep}>/</span>
        <span className={styles.field}>{handle}</span>
      </div>
      <div className={styles.right}>
        <form action={signOut}>
          <button type="submit" className={styles.signOut}>
            {copy.home.signOut}
          </button>
        </form>
      </div>
    </header>
  );
}
