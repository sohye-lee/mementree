'use client';

import { useEffect, useRef } from 'react';
import { createScene } from '@/lib/three/scene';
import styles from './field-canvas.module.css';

// thin react wrapper that mounts the framework-agnostic three.js scene.
// keep this component dumb — all visual logic lives in src/lib/three/.

export function FieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = createScene(canvas);
    return () => scene.dispose();
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
