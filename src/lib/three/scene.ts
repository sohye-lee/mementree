// the field's three.js scene.
// kept framework-agnostic: takes a canvas + tree data, returns a controller.
// react components mount this; they don't import three directly.
//
// phase B: renders trees passed in via options. trees are positioned at (x, z)
// and shaped from `seed`. memos, hover/click, and edits arrive in phase C.

import * as THREE from 'three';
import { createControls, type FieldControls } from './controls';
import { makeGroundTexture, makeVignetteTexture } from './textures';
import { createTreeFactory } from './tree-mesh';

const PAPER = 0xf4f4f1;

export interface SceneTree {
  id: string;
  x: number;
  z: number;
  seed: number;
}

export interface SceneOptions {
  trees: SceneTree[];
}

export interface SceneController {
  dispose: () => void;
}

export function createScene(
  canvas: HTMLCanvasElement,
  options: SceneOptions,
): SceneController {
  // renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(PAPER, 1);
  renderer.shadowMap.enabled = false;

  // scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAPER);
  scene.fog = new THREE.Fog(PAPER, 18, 70);

  // camera (aspect set in resize)
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 1.7, 8);

  // ground
  const groundTex = makeGroundTexture();
  const groundMat = new THREE.MeshBasicMaterial({ map: groundTex });
  const groundGeo = new THREE.PlaneGeometry(400, 400);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // big radial vignette overlay so the field reads volumetric, not flat
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

  // hairline architectural grid
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

  // lighting — lit materials so trunks have form
  const hemi = new THREE.HemisphereLight(0xffffff, 0xbab8b2, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(8, 12, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd9d8d2, 0.35);
  fill.position.set(-6, 4, -8);
  scene.add(fill);

  // trees
  const treeFactory = createTreeFactory();
  const treeGroups = new Map<string, THREE.Group>();
  for (const t of options.trees) {
    const g = treeFactory.makeTreeMesh(t.seed);
    g.position.set(t.x, 0, t.z);
    scene.add(g);
    treeGroups.set(t.id, g);
  }

  // controls
  const controls = createControls(canvas);

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
    dispose() {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      controls.dispose();

      // tree resources
      for (const g of treeGroups.values()) {
        treeFactory.disposeTreeGroup(g);
      }
      treeFactory.dispose();
      treeGroups.clear();

      // ground / vignette / grid
      groundGeo.dispose();
      groundMat.dispose();
      groundTex.dispose();
      vignetteGeo.dispose();
      vignetteMat.dispose();
      vignetteTex.dispose();
      grid.geometry.dispose();
      if (Array.isArray(gridMat)) {
        gridMat.forEach((m) => m.dispose());
      } else {
        gridMat.dispose();
      }

      renderer.dispose();
    },
  };
}
