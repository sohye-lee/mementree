'use client';

import { useEffect, useState } from 'react';
import styles from './hint-bar.module.css';

// keyboard hint bar at the bottom of the field.
// auto-hides after the keeper has demonstrably used the controls
// (first movement or first tree click), so it doesn't linger forever.

const STORAGE_KEY = 'mementree:hints-dismissed';

export function HintBar() {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  // auto-dismiss once a movement key is pressed
  useEffect(() => {
    if (dismissed) return;
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (
        k === 'w' ||
        k === 'a' ||
        k === 's' ||
        k === 'd' ||
        k === 'arrowup' ||
        k === 'arrowleft' ||
        k === 'arrowdown' ||
        k === 'arrowright'
      ) {
        setDismissed(true);
        try {
          localStorage.setItem(STORAGE_KEY, '1');
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <footer className={styles.bar} aria-label="controls">
      <span>
        <kbd className={styles.k}>w</kbd>
        <kbd className={styles.k}>a</kbd>
        <kbd className={styles.k}>s</kbd>
        <kbd className={styles.k}>d</kbd> walk
      </span>
      <span>
        <kbd className={styles.k}>drag</kbd> look
      </span>
      <span>
        <kbd className={styles.k}>click</kbd> tree
      </span>
      <span>
        <kbd className={styles.k}>shift</kbd> run
      </span>
    </footer>
  );
}
