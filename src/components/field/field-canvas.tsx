'use client';

import { useEffect, useRef } from 'react';
import {
  createScene,
  type SceneController,
  type SceneTree,
} from '@/lib/three/scene';
import type { NoteInput } from '@/lib/three/note-mesh';
import styles from './field-canvas.module.css';

interface Props {
  trees: SceneTree[];
  memosByTreeId: Record<string, NoteInput[]>;
  selectedTreeId: string | null;
  // when set, the camera flies to frame this tree once it exists in the scene
  focusTreeId: string | null;
  onTreeClick: (id: string | null) => void;
}

export function FieldCanvas({
  trees,
  memosByTreeId,
  selectedTreeId,
  focusTreeId,
  onTreeClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneController | null>(null);
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

  // diff trees → scene
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

  // sync memos per tree
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (const t of trees) {
      const memos = memosByTreeId[t.id] ?? [];
      scene.syncMemos(t.id, memos);
    }
  }, [trees, memosByTreeId]);

  // push selection
  useEffect(() => {
    sceneRef.current?.setActive(selectedTreeId);
  }, [selectedTreeId]);

  // fly the camera to a freshly planted tree — but only once it has actually
  // been added to the scene (the trees-diff effect above runs first). each
  // focusTreeId is acted on a single time.
  const focusedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusTreeId || focusedRef.current === focusTreeId) return;
    const exists = trees.some((t) => t.id === focusTreeId);
    if (exists) {
      sceneRef.current?.focusTree(focusTreeId);
      focusedRef.current = focusTreeId;
    }
  }, [focusTreeId, trees]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
