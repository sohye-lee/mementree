'use client';

import { useEffect, useRef } from 'react';
import {
  createScene,
  type SceneController,
  type SceneTree,
} from '@/lib/three/scene';
import type { NoteInput } from '@/lib/three/note-mesh';
import type { Phase, Weather } from '@/lib/environment';
import styles from './field-canvas.module.css';

interface Props {
  trees: SceneTree[];
  memosByTreeId: Record<string, NoteInput[]>;
  selectedTreeId: string | null;
  // the camera flies to frame this tree; focusNonce bumps on every request
  // so re-selecting the same tree re-centers it
  focusTreeId: string | null;
  focusNonce: number;
  // bump this number to fly the camera back to its default framing
  recenterNonce: number;
  // environment — sun phase + weather, applied to the scene
  phase: Phase | null;
  weather: Weather;
  onTreeClick: (id: string | null) => void;
}

export function FieldCanvas({
  trees,
  memosByTreeId,
  selectedTreeId,
  focusTreeId,
  focusNonce,
  recenterNonce,
  phase,
  weather,
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

  // fly the camera to focusTreeId — once per focusNonce, and only after the
  // tree exists in the scene (for a fresh plant the trees-diff effect lands
  // it first; this effect then re-runs on the `trees` change).
  const focusedNonceRef = useRef(0);
  useEffect(() => {
    if (focusNonce === focusedNonceRef.current) return;
    if (!focusTreeId) return;
    const exists = trees.some((t) => t.id === focusTreeId);
    if (exists) {
      sceneRef.current?.focusTree(focusTreeId);
      focusedNonceRef.current = focusNonce;
    }
  }, [focusNonce, focusTreeId, trees]);

  // recenter on nonce change (skip the initial 0)
  const recenterRef = useRef(recenterNonce);
  useEffect(() => {
    if (recenterNonce !== recenterRef.current) {
      recenterRef.current = recenterNonce;
      sceneRef.current?.recenter();
    }
  }, [recenterNonce]);

  // apply environment (sky phase + weather)
  useEffect(() => {
    sceneRef.current?.setEnvironment(phase, weather);
  }, [phase, weather]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
