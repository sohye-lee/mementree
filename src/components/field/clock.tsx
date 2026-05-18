'use client';

import { useEffect, useState } from 'react';
import styles from './field-nav.module.css';

// local wall-clock, ticking each second. starts as a placeholder so server
// and client render the same first paint (no hydration mismatch).

function format(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const abbr =
    new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(d)
      .find((p) => p.type === 'timeZoneName')?.value ?? '';
  return `${hh}:${mm}:${ss} ${abbr}`.trim();
}

export function Clock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(format(new Date()));
    const id = window.setInterval(() => setTime(format(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={styles.clock} suppressHydrationWarning>
      {time || '--:--:--'}
    </span>
  );
}
