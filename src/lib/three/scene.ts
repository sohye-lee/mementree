// the field's three.js scene.
// kept framework-agnostic: takes a canvas + initial trees + callbacks,
// returns a controller with imperative add/remove/setActive + memo sync
// + dispose. react components mount this; they don't import three directly.

import * as THREE from 'three';
import { createControls } from './controls';
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
import { hashStr, mulberry32 } from '@/lib/seed';

const PAPER = 0xf4f4f1;
const WITHER_DURATION = 1700;

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

// a withered tree, sampled into a drifting point cloud.
interface WitherCloud {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  velocities: Float32Array;
  count: number;
  start: number;
}

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
  const treeNoteGroups = new Map<string, Map<string, NoteGroup>>();
  // trees mid-wither: dissolved into point clouds, disposed when the anim ends.
  const witherClouds: WitherCloud[] = [];
  // live falling-paper dom overlays — cleaned up on dispose if still animating.
  const fallingPapers = new Set<HTMLElement>();
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

  // sample a mesh tree (+ its notes) into a point cloud. each strided vertex
  // becomes a dot with an outward+upward velocity, so the tree dissolves into
  // drifting motes instead of fading in place.
  function buildWitherCloud(group: THREE.Group): WitherCloud {
    group.updateWorldMatrix(true, true);
    const base = new THREE.Vector3();
    group.getWorldPosition(base);

    const coords: number[] = [];
    const tmp = new THREE.Vector3();
    group.traverse((c) => {
      if (!(c instanceof THREE.Mesh)) return;
      const posAttr = c.geometry?.getAttribute('position') as
        | THREE.BufferAttribute
        | undefined;
      if (!posAttr) return;
      // strided sample — ~24 points per mesh keeps the cloud legible
      const stride = Math.max(1, Math.floor(posAttr.count / 24));
      for (let i = 0; i < posAttr.count; i += stride) {
        tmp.fromBufferAttribute(posAttr, i);
        c.localToWorld(tmp);
        coords.push(tmp.x, tmp.y, tmp.z);
      }
    });

    const count = coords.length / 3;
    const positions = new Float32Array(coords);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let ox = positions[i * 3] - base.x;
      let oz = positions[i * 3 + 2] - base.z;
      const olen = Math.hypot(ox, oz) || 0.001;
      ox /= olen;
      oz /= olen;
      const out = 0.25 + Math.random() * 0.5;
      velocities[i * 3] = ox * out + (Math.random() - 0.5) * 0.4;
      velocities[i * 3 + 1] = 0.5 + Math.random() * 1.2; // gentle rise
      velocities[i * 3 + 2] = oz * out + (Math.random() - 0.5) * 0.4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x3d3d3d,
      size: 0.07,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    return {
      points,
      geometry,
      material,
      velocities,
      count,
      start: performance.now(),
    };
  }

  // wither = dissolve into a drifting point cloud. the mesh tree is sampled,
  // then removed + disposed immediately; the cloud animates on its own.
  function removeTree(id: string) {
    const g = treeGroups.get(id);
    if (!g) return;
    const noteMap = treeNoteGroups.get(id);

    const cloud = buildWitherCloud(g);
    scene.add(cloud.points);
    witherClouds.push(cloud);

    scene.remove(g);
    treeFactory.disposeTreeGroup(g);
    if (noteMap) {
      for (const ng of noteMap.values()) disposeNoteGroup(ng);
    }
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

  // ──── falling paper (2d dom overlay) ────────────────────────────────────────
  // ported from design/memoir-field.js `spawnFallingPaper`: project the note's
  // world position to screen coords, drop a small paper div, let css flutter it
  // down and fade. decoupled from the 3d scene by design.
  function spawnFallingPaper(worldPos: THREE.Vector3) {
    const v = worldPos.clone().project(camera);
    if (v.z > 1) return; // behind camera
    const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;

    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '35',
      width: '36px',
      height: '44px',
      background: 'linear-gradient(180deg, #FFFDF6 0%, #F2EFE4 100%)',
      border: '1px solid rgba(60,40,20,0.18)',
      boxShadow: '0 4px 10px -4px rgba(40,30,15,0.25)',
      transformOrigin: '50% 0%',
      willChange: 'transform, opacity',
      transition:
        'transform 1100ms cubic-bezier(.4,.2,.2,1), opacity 1100ms ease-out',
      left: `${sx - 18}px`,
      top: `${sy}px`,
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(el);
    fallingPapers.add(el);

    const drift = (Math.random() - 0.5) * 60;
    const fallY = window.innerHeight - sy - 40;
    const spin = (Math.random() - 0.5) * 180;
    requestAnimationFrame(() => {
      el.style.transform = `translate(${drift}px, ${fallY}px) rotate(${spin}deg)`;
      el.style.opacity = '0';
    });
    window.setTimeout(() => {
      el.remove();
      fallingPapers.delete(el);
    }, 1200);
  }

  // ──── memos ────────────────────────────────────────────────────────────────
  // tip for a memo is stable per memo id: pick from a per-tree shuffled tip
  // list, indexed by hash(memoId). removing one memo never moves the others.
  function pickTipForMemo(treeId: string, memoId: string): THREE.Vector3 | null {
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
    return ordered[hashStr(memoId) % ordered.length];
  }

  function syncMemos(treeId: string, memos: NoteInput[]) {
    const g = treeGroups.get(treeId);
    const notesGrp = g?.userData.notesGrp as THREE.Group | undefined;
    const noteMap = treeNoteGroups.get(treeId);
    if (!g || !notesGrp || !noteMap) return;

    const incomingIds = new Set(memos.map((m) => m.id));

    // remove gone — each gets a falling-paper send-off
    for (const [id, ng] of noteMap.entries()) {
      if (!incomingIds.has(id)) {
        const wp = new THREE.Vector3();
        ng.userData.plane.getWorldPosition(wp);
        spawnFallingPaper(wp);
        notesGrp.remove(ng);
        disposeNoteGroup(ng);
        noteMap.delete(id);
      }
    }

    // add new
    for (const memo of memos) {
      if (noteMap.has(memo.id)) continue;
      const tip = pickTipForMemo(treeId, memo.id);
      if (!tip) continue;
      const ng = makeNoteMesh(memo, tip, treeId);
      noteMap.set(memo.id, ng);
      notesGrp.add(ng);
    }
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

  // wither animation step — drift each cloud's points along their velocities,
  // ease the rise off, and fade only once the dots are diffuse (k² curve, so
  // they stay visible while spreading and vanish at the end).
  function stepWither(now: number, dt: number) {
    for (let i = witherClouds.length - 1; i >= 0; i--) {
      const w = witherClouds[i];
      const k = Math.min(1, (now - w.start) / WITHER_DURATION);
      const posAttr = w.geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let p = 0; p < w.count; p++) {
        arr[p * 3] += w.velocities[p * 3] * dt;
        arr[p * 3 + 1] += w.velocities[p * 3 + 1] * dt;
        arr[p * 3 + 2] += w.velocities[p * 3 + 2] * dt;
        w.velocities[p * 3 + 1] *= 0.985; // rise eases off
      }
      posAttr.needsUpdate = true;
      w.material.opacity = 0.9 * (1 - k * k);
      w.material.size = 0.07 * (1 - k * 0.45);

      if (k >= 1) {
        scene.remove(w.points);
        w.geometry.dispose();
        w.material.dispose();
        witherClouds.splice(i, 1);
      }
    }
  }

  // loop
  let animId = 0;
  let last = performance.now();
  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    const tSec = now / 1000;
    last = now;
    controls.update(dt, camera);
    stepWither(now, dt);
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
      for (const el of fallingPapers) el.remove();
      fallingPapers.clear();
      for (const w of witherClouds) {
        scene.remove(w.points);
        w.geometry.dispose();
        w.material.dispose();
      }
      witherClouds.length = 0;
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
