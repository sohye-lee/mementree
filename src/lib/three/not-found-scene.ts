// the 404 scene — a small field of five trees with a wooden picket sign
// in the middle bearing the not-found copy. self-contained: no controls,
// just a gently swaying camera. mounted by src/app/not-found.tsx.

import * as THREE from 'three';
import { copy } from '@/lib/copy';
import { hashStr } from '@/lib/seed';
import { makeGroundTexture, makeVignetteTexture } from './textures';
import { createTreeFactory } from './tree-mesh';

const PAPER = 0xf4f4f1;
const WOOD_DARK = 0x4a3a2a;

// five trees — [x, z, scale]. all placed behind / beside the sign so the
// picket reads clean from the camera (which sits at +z).
const TREES: ReadonlyArray<readonly [number, number, number]> = [
  [-6, -7, 1.22],
  [7, -9, 1.12],
  [-8.5, -3, 0.58],
  [8.2, -3.6, 0.66],
  [2, -11.5, 0.92],
];

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function makeSignTexture(): THREE.CanvasTexture {
  const W = 760;
  const H = 460;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // pale aged wood plank
  ctx.fillStyle = '#d6c9af';
  ctx.fillRect(0, 0, W, H);

  // grain streaks
  for (let i = 0; i < 44; i++) {
    ctx.strokeStyle = `rgba(120,100,70,${0.04 + Math.random() * 0.07})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    const y = Math.random() * H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      W * 0.33,
      y + (Math.random() - 0.5) * 9,
      W * 0.66,
      y + (Math.random() - 0.5) * 9,
      W,
      y + (Math.random() - 0.5) * 6,
    );
    ctx.stroke();
  }

  // inset border, burned into the plank
  ctx.strokeStyle = 'rgba(70,55,35,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 22, W - 44, H - 44);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 404
  ctx.fillStyle = '#3a3026';
  ctx.font = '700 92px "Source Code Pro", ui-monospace, monospace';
  ctx.fillText(copy.notFound.code, W / 2, 132);

  // title — wraps to the plank width
  ctx.font = '500 30px "Source Code Pro", ui-monospace, monospace';
  const lines = wrap(ctx, copy.notFound.title, W - 140);
  let y = 252;
  for (const line of lines) {
    ctx.fillText(line, W / 2, y);
    y += 42;
  }

  // sub
  ctx.font = '400 24px "Source Code Pro", ui-monospace, monospace';
  ctx.fillStyle = 'rgba(58,48,38,0.68)';
  ctx.fillText(copy.notFound.sub, W / 2, y + 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

export interface NotFoundScene {
  dispose: () => void;
}

export function createNotFoundScene(
  canvas: HTMLCanvasElement,
): NotFoundScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(PAPER, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAPER);
  scene.fog = new THREE.Fog(PAPER, 16, 58);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 2.3, 7.6);

  // ground
  const groundTex = makeGroundTexture();
  const groundMat = new THREE.MeshBasicMaterial({ map: groundTex });
  const groundGeo = new THREE.PlaneGeometry(400, 400);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

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
  const treeFactory = createTreeFactory();
  const treeGroups: THREE.Group[] = [];
  TREES.forEach(([x, z, s], i) => {
    const g = treeFactory.makeTreeMesh(hashStr(`404-${i}`), `404-${i}`);
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    scene.add(g);
    treeGroups.push(g);
  });

  // wooden picket sign
  const postGeo = new THREE.BoxGeometry(0.17, 2.5, 0.17);
  const postMat = new THREE.MeshStandardMaterial({
    color: WOOD_DARK,
    roughness: 0.92,
  });
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.set(0, 1.25, 0);
  scene.add(post);

  const signTex = makeSignTexture();
  const boardGeo = new THREE.BoxGeometry(3.0, 1.82, 0.1);
  const faceMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.85,
  });
  const edgeMat = new THREE.MeshStandardMaterial({
    color: WOOD_DARK,
    roughness: 0.92,
  });
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z — texture the z faces
  const board = new THREE.Mesh(boardGeo, [
    edgeMat,
    edgeMat,
    edgeMat,
    edgeMat,
    faceMat,
    faceMat,
  ]);
  board.position.set(0, 2.2, 0);
  scene.add(board);

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

  // loop — gentle camera sway + faint tree sway, no controls
  let animId = 0;
  function loop(now: number) {
    const t = now / 1000;
    treeGroups.forEach((g, i) => {
      g.rotation.z = Math.sin(t * 0.4 + i) * 0.02;
    });
    camera.position.x = Math.sin(t * 0.16) * 0.7;
    camera.position.y = 2.3 + Math.sin(t * 0.21) * 0.12;
    camera.lookAt(0, 2.2, 0);
    renderer.render(scene, camera);
    animId = requestAnimationFrame(loop);
  }
  animId = requestAnimationFrame(loop);

  return {
    dispose() {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      for (const g of treeGroups) treeFactory.disposeTreeGroup(g);
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
      postGeo.dispose();
      postMat.dispose();
      boardGeo.dispose();
      faceMat.dispose();
      edgeMat.dispose();
      signTex.dispose();
      renderer.dispose();
    },
  };
}
