'use client';

import { useEffect, useRef } from 'react';
import {
  createScene,
  type SceneController,
  type SceneTree,
} from '@/lib/three/scene';
import styles from './field-canvas.module.css';

// react wrapper that mounts the framework-agnostic three.js scene.
// the scene itself is created once on mount; we feed it updates via
// imperative methods so camera + selection state survive across plants.

interface Props {
  trees: SceneTree[];
  selectedTreeId: string | null;
  onTreeClick: (id: string | null) => void;
}

export function FieldCanvas({ trees, selectedTreeId, onTreeClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneController | null>(null);
  // hold the latest click handler in a ref so the scene can call the freshest
  // callback without us needing to recreate it.
  const clickRef = useRef(onTreeClick);
  useEffect(() => {
    clickRef.current = onTreeClick;
  }, [onTreeClick]);

  // mount once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = createScene(canvas, {
      trees: [],
      onTreeClick: (id) => clickRef.current(id),
    });
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // diff trees → scene. add new, remove gone.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const incoming = new Set(trees.map((t) => t.id));
    const existing = new Set(scene.getTreeIds());
    for (const id of existing) {
      if (!incoming.has(id)) scene.removeTree(id);
    }
    for (const t of trees) {
      if (!existing.has(t.id)) scene.addTree(t);
    }
  }, [trees]);

  // push selection into scene
  useEffect(() => {
    sceneRef.current?.setActive(selectedTreeId);
  }, [selectedTreeId]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
