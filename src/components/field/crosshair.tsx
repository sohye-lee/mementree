import styles from './crosshair.module.css';

// a hairline center mark — a quiet aiming reference while walking.

export function Crosshair() {
  return <div className={styles.crosshair} aria-hidden="true" />;
}
