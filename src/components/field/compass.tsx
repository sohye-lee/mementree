'use client';

import { useEffect, useRef } from 'react';
import { readCamera } from '@/lib/field-frame';
import styles from './compass.module.css';

// compass + coordinate readout. runs its own rAF and writes the needle
// rotation / coord text directly to the dom — no react state per frame.

export function Compass() {
  const needleRef = useRef<HTMLDivElement>(null);
  const xRef = useRef<HTMLSpanElement>(null);
  const zRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const { yaw, x, z } = readCamera();
      if (needleRef.current) {
        needleRef.current.style.transform = `translate(-50%, 0) rotate(${
          (-yaw * 180) / Math.PI
        }deg)`;
      }
      if (xRef.current) xRef.current.textContent = x.toFixed(1);
      if (zRef.current) zRef.current.textContent = z.toFixed(1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <aside className={styles.compass} aria-hidden="true">
      <div className={styles.ring}>
        <div ref={needleRef} className={styles.needle} />
      </div>
      <div className={styles.coords}>
        <span className={styles.lbl}>x</span>
        <span ref={xRef}>0.0</span>
      </div>
      <div className={styles.coords}>
        <span className={styles.lbl}>z</span>
        <span ref={zRef}>0.0</span>
      </div>
    </aside>
  );
}
