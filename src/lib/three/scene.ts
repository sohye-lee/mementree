// the field's three.js scene.
// kept framework-agnostic: takes a canvas + initial trees + callbacks,
// returns a controller with imperative add/remove/setActive + dispose.
// react components mount this; they don't import three directly.
//
// phase D additions over phase B:
//   - incremental tree updates: scene preserves camera + selection state
//     across plants/removals instead of being torn down and rebuilt
//   - raycast for hover + click. hover/active ring colors via the tree
//     factory's setRingState. click fires `onTreeClick(id | null)` —
//     `null` is emitted when an empty area is clicked (deselect).

import * as THREE from 'three';
import { createControls, type FieldControls } from './controls';
import { makeGroundTexture, makeVignetteTexture } from './textures';
import { createTreeFactory, type TreeFactory } from './tree-mesh';

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
  dispose: () => void;
}

// max pointer travel between mousedown and mouseup that still counts as a
// click rather than a drag. units: css pixels of total path length.
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
  camera.position.set(0, 1.7, 8);

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

  // hairline grid
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
  let hoveredId: string | null = null;
  let activeId: string | null = null;

  function addTree(tree: SceneTree) {
    if (treeGroups.has(tree.id)) return;
    const g = treeFactory.makeTreeMesh(tree.seed, tree.id);
    g.position.set(tree.x, 0, tree.z);
    scene.add(g);
    treeGroups.set(tree.id, g);
  }

  function removeTree(id: string) {
    const g = treeGroups.get(id);
    if (!g) return;
    scene.remove(g);
    treeFactory.disposeTreeGroup(g);
    treeGroups.delete(id);
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

  // seed initial trees
  for (const t of options.trees) addTree(t);

  // controls (walk + look)
  const controls = createControls(canvas);

  // raycast — runs alongside controls. controls owns camera transform;
  // we just read camera + tree positions to figure out what's under the
  // cursor on hover and what's been clicked on mouseup-without-drag.
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
      // walk up to find a treeId tag
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
    const id = pickTreeId(e.clientX, e.clientY);
    options.onTreeClick?.(id);
  }

  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  // touch — single tap (no drag) counts as a click on a tree
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
    const id = pickTreeId(t.clientX, t.clientY);
    options.onTreeClick?.(id);
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
    last = now;
    controls.update(dt, camera);
    renderer.render(scene, camera);
    animId = requestAnimationFrame(loop);
  }
  animId = requestAnimationFrame(loop);

  return {
    addTree,
    removeTree,
    setActive,
    getTreeIds: () => Array.from(treeGroups.keys()),
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
      for (const g of treeGroups.values()) treeFactory.disposeTreeGroup(g);
      treeGroups.clear();
      treeFactory.dispose();
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
