// the field's three.js scene.
// kept framework-agnostic: takes a canvas + initial trees + callbacks,
// returns a controller with imperative add/remove/setActive + memo sync
// + dispose. react components mount this; they don't import three directly.

import * as THREE from 'three';
import { createControls, type FieldControls } from './controls';
import {
  disposeNoteGroup,
  disposeSharedNoteMaterials,
  makeNoteMesh,
  updateNoteSway,
  type NoteInput,
  type NoteGroup,
} from './note-mesh';
import { makeGroundTexture, makeVignetteTexture } from './textures';
import { createTreeFactory, type TreeFactory } from './tree-mesh';
import { mulberry32 } from '@/lib/seed';

const PAPER = 0xf4f4f1;

export interface SceneTree {
  id: string;
  x: number;
  z: number;
  seed: number;
}

export interface SceneOptions {
  trees: SceneTree[];
  onTreeClick?: (id: string | null) => void;
}

export interface SceneController {
  addTree: (tree: SceneTree) => void;
  removeTree: (id: string) => void;
  setActive: (id: string | null) => void;
  getTreeIds: () => string[];
  syncMemos: (treeId: string, memos: NoteInput[]) => void;
  dispose: () => void;
}

const CLICK_DRAG_THRESHOLD = 6;

export function createScene(
  canvas: HTMLCanvasElement,
  options: SceneOptions,
): SceneController {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(PAPER, 1);
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAPER);
  scene.fog = new THREE.Fog(PAPER, 18, 70);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 1.8, 12);

  // ground
  const groundTex = makeGroundTexture();
  const groundMat = new THREE.MeshBasicMaterial({ map: groundTex });
  const groundGeo = new THREE.PlaneGeometry(400, 400);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // vignette
  const vignetteTex = makeVignetteTexture();
  const vignetteMat = new THREE.MeshBasicMaterial({
    map: vignetteTex,
    transparent: true,
    depthWrite: false,
  });
  const vignetteGeo = new THREE.PlaneGeometry(220, 220);
  const vignette = new THREE.Mesh(vignetteGeo, vignetteMat);
  vignette.rotation.x = -Math.PI / 2;
  vignette.position.y = 0.002;
  scene.add(vignette);

  // grid
  const grid = new THREE.GridHelper(200, 100, 0xc9c9c5, 0xe0e0dc);
  grid.position.y = 0.001;
  const gridMat = grid.material as THREE.Material | THREE.Material[];
  if (Array.isArray(gridMat)) {
    gridMat.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.1;
    });
  } else {
    gridMat.transparent = true;
    gridMat.opacity = 0.1;
  }
  scene.add(grid);

  // lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0xbab8b2, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(8, 12, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd9d8d2, 0.35);
  fill.position.set(-6, 4, -8);
  scene.add(fill);

  // trees
  const treeFactory: TreeFactory = createTreeFactory();
  const treeGroups = new Map<string, THREE.Group>();
  const treeSeeds = new Map<string, number>();
  // notes are organized as: treeId → memoId → NoteGroup, kept inside a
  // dedicated subgroup of the tree group so wither/remove cleans both.
  const treeNoteGroups = new Map<string, Map<string, NoteGroup>>();
  let hoveredId: string | null = null;
  let activeId: string | null = null;

  function addTree(tree: SceneTree) {
    if (treeGroups.has(tree.id)) return;
    const g = treeFactory.makeTreeMesh(tree.seed, tree.id);
    g.position.set(tree.x, 0, tree.z);
    const notesGrp = new THREE.Group();
    notesGrp.name = 'notes';
    g.add(notesGrp);
    g.userData.notesGrp = notesGrp;
    scene.add(g);
    treeGroups.set(tree.id, g);
    treeSeeds.set(tree.id, tree.seed);
    treeNoteGroups.set(tree.id, new Map());
  }

  function removeTree(id: string) {
    const g = treeGroups.get(id);
    if (!g) return;
    // dispose note groups first
    const noteMap = treeNoteGroups.get(id);
    if (noteMap) {
      for (const ng of noteMap.values()) disposeNoteGroup(ng);
      noteMap.clear();
    }
    scene.remove(g);
    treeFactory.disposeTreeGroup(g);
    treeGroups.delete(id);
    treeSeeds.delete(id);
    treeNoteGroups.delete(id);
    if (hoveredId === id) hoveredId = null;
    if (activeId === id) activeId = null;
  }

  function applyRingState(id: string) {
    const g = treeGroups.get(id);
    if (!g) return;
    if (id === activeId) treeFactory.setRingState(g, 'active');
    else if (id === hoveredId) treeFactory.setRingState(g, 'hover');
    else treeFactory.setRingState(g, 'base');
  }

  function setHovered(id: string | null) {
    if (id === hoveredId) return;
    const prev = hoveredId;
    hoveredId = id;
    if (prev) applyRingState(prev);
    if (id) applyRingState(id);
    canvas.style.cursor = id ? 'pointer' : '';
  }

  function setActive(id: string | null) {
    if (id === activeId) return;
    const prev = activeId;
    activeId = id;
    if (prev) applyRingState(prev);
    if (id) applyRingState(id);
  }

  // ──── memos ────────────────────────────────────────────────────────────────
  // assigns tips deterministically per tree so memo positions stay stable
  // across renders. shuffled order via a seeded rng on the tree's seed.
  function pickTipForMemo(treeId: string, memoIndex: number): THREE.Vector3 | null {
    const g = treeGroups.get(treeId);
    const seed = treeSeeds.get(treeId);
    if (!g || seed == null) return null;
    const tips = g.userData.tips as THREE.Vector3[] | undefined;
    if (!tips || tips.length === 0) return null;
    const rng = mulberry32(seed >>> 0);
    const ordered = tips
      .map((p) => ({ p, k: rng() }))
      .sort((a, b) => a.k - b.k)
      .map((o) => o.p);
    return ordered[memoIndex % ordered.length];
  }

  function syncMemos(treeId: string, memos: NoteInput[]) {
    const g = treeGroups.get(treeId);
    const notesGrp = g?.userData.notesGrp as THREE.Group | undefined;
    const noteMap = treeNoteGroups.get(treeId);
    if (!g || !notesGrp || !noteMap) return;

    const incomingIds = new Set(memos.map((m) => m.id));

    // remove gone
    for (const [id, ng] of noteMap.entries()) {
      if (!incomingIds.has(id)) {
        notesGrp.remove(ng);
        disposeNoteGroup(ng);
        noteMap.delete(id);
      }
    }

    // add new (preserves existing positions/animations)
    memos.forEach((memo, idx) => {
      if (noteMap.has(memo.id)) return;
      const tip = pickTipForMemo(treeId, idx);
      if (!tip) return;
      const ng = makeNoteMesh(memo, tip, treeId);
      noteMap.set(memo.id, ng);
      notesGrp.add(ng);
    });
  }

  // seed initial trees
  for (const t of options.trees) addTree(t);

  // controls
  const controls = createControls(canvas);

  // raycast
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downX = 0;
  let downY = 0;
  let downDist = 0;
  let pressing = false;

  function pickTreeId(clientX: number, clientY: number): string | null {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(ndc, camera);
    const targets: THREE.Object3D[] = [];
    for (const g of treeGroups.values()) targets.push(g);
    if (targets.length === 0) return null;
    const hits = raycaster.intersectObjects(targets, true);
    for (const h of hits) {
      let obj: THREE.Object3D | null = h.object;
      while (obj) {
        const tid = obj.userData?.treeId as string | undefined;
        if (tid) return tid;
        obj = obj.parent;
      }
    }
    return null;
  }

  function onMouseDown(e: MouseEvent) {
    if (e.target !== canvas) return;
    pressing = true;
    downX = e.clientX;
    downY = e.clientY;
    downDist = 0;
  }
  function onMouseMove(e: MouseEvent) {
    if (pressing) {
      downDist += Math.hypot(e.clientX - downX, e.clientY - downY);
      downX = e.clientX;
      downY = e.clientY;
      return;
    }
    if (e.target !== canvas) {
      setHovered(null);
      return;
    }
    setHovered(pickTreeId(e.clientX, e.clientY));
  }
  function onMouseUp(e: MouseEvent) {
    const wasPressing = pressing;
    pressing = false;
    if (!wasPressing) return;
    if (downDist > CLICK_DRAG_THRESHOLD) return;
    if (e.target !== canvas) return;
    options.onTreeClick?.(pickTreeId(e.clientX, e.clientY));
  }

  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  let tDownX = 0;
  let tDownY = 0;
  let tDownDist = 0;
  let tPressing = false;
  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    tPressing = true;
    tDownX = e.touches[0].clientX;
    tDownY = e.touches[0].clientY;
    tDownDist = 0;
  }
  function onTouchMove(e: TouchEvent) {
    if (!tPressing) return;
    const t = e.touches[0];
    tDownDist += Math.hypot(t.clientX - tDownX, t.clientY - tDownY);
    tDownX = t.clientX;
    tDownY = t.clientY;
  }
  function onTouchEnd(e: TouchEvent) {
    const wasPressing = tPressing;
    tPressing = false;
    if (!wasPressing) return;
    if (tDownDist > CLICK_DRAG_THRESHOLD) return;
    const t = e.changedTouches[0];
    if (!t) return;
    options.onTreeClick?.(pickTreeId(t.clientX, t.clientY));
  }
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: true });
  canvas.addEventListener('touchend', onTouchEnd);

  // resize
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // loop
  let animId = 0;
  let last = performance.now();
  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    const tSec = now / 1000;
    last = now;
    controls.update(dt, camera);
    // sway memos
    for (const noteMap of treeNoteGroups.values()) {
      for (const ng of noteMap.values()) updateNoteSway(ng, tSec);
    }
    renderer.render(scene, camera);
    animId = requestAnimationFrame(loop);
  }
  animId = requestAnimationFrame(loop);

  return {
    addTree,
    removeTree,
    setActive,
    getTreeIds: () => Array.from(treeGroups.keys()),
    syncMemos,
    dispose() {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      controls.dispose();
      for (const noteMap of treeNoteGroups.values()) {
        for (const ng of noteMap.values()) disposeNoteGroup(ng);
        noteMap.clear();
      }
      treeNoteGroups.clear();
      for (const g of treeGroups.values()) treeFactory.disposeTreeGroup(g);
      treeGroups.clear();
      treeFactory.dispose();
      disposeSharedNoteMaterials();
      groundGeo.dispose();
      groundMat.dispose();
      groundTex.dispose();
      vignetteGeo.dispose();
      vignetteMat.dispose();
      vignetteTex.dispose();
      grid.geometry.dispose();
      if (Array.isArray(gridMat)) gridMat.forEach((m) => m.dispose());
      else gridMat.dispose();
      renderer.dispose();
    },
  };
}
