'use client';

import { useEffect, useRef } from 'react';
import { createScene, type SceneTree } from '@/lib/three/scene';
import styles from './field-canvas.module.css';

// thin react wrapper that mounts the framework-agnostic three.js scene.
// keep this component dumb — all visual logic lives in src/lib/three/.

export function FieldCanvas({ trees }: { trees: SceneTree[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = createScene(canvas, { trees });
    return () => scene.dispose();
    // intentionally re-mounting the scene if `trees` changes — for phase B
    // trees are server-loaded once. phase C/D will swap to incremental updates.
  }, [trees]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
