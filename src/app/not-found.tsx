'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { copy } from '@/lib/copy';
import { createNotFoundScene } from '@/lib/three/not-found-scene';
import styles from './not-found.module.css';

// 404 — a small field of five trees with a wooden picket sign in the
// middle carrying the not-found copy. the 3d scene lives in
// src/lib/three/not-found-scene.ts.

export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = createNotFoundScene(canvas);
    return () => scene.dispose();
  }, []);

  return (
    <main className={styles.main}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <Link href="/" className={styles.back}>
        {copy.notFound.back}
      </Link>
    </main>
  );
}
