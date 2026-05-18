import styles from './logo.module.css';

// mementree mark — eccentric tree growth rings.
// the rings self-draw on a slow loop (see logo.module.css). framework-free,
// pure svg + css, so it works in server and client components alike.
//
// `pathLength={100}` normalizes each circle's length so one keyframe set
// drives every ring regardless of radius.

export function Logo({ size = 18 }: { size?: number }) {
  return (
    <svg
      className={styles.logo}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="mementree"
    >
      <circle
        className={`${styles.ring} ${styles.ring1}`}
        cx="16"
        cy="16"
        r="13"
        pathLength={100}
      />
      <circle
        className={`${styles.ring} ${styles.ring2}`}
        cx="15.2"
        cy="15.2"
        r="8.4"
        pathLength={100}
      />
      <circle
        className={`${styles.ring} ${styles.ring3}`}
        cx="14.4"
        cy="14.3"
        r="4.2"
        pathLength={100}
      />
      <circle className={styles.pith} cx="13.9" cy="13.7" r="1.7" />
    </svg>
  );
}
