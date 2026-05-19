// the 404 scene — always night. a wooden picket sign holds the not-found
// copy; pale-grey trees scatter in a full ring around it, fading into the
// dark fog so the field reads as endless. the camera drifts one direction
// so slowly it's almost still. mounted by src/app/not-found.tsx.

import * as THREE from 'three';
import { copy } from '@/lib/copy';
import { hashStr, mulberry32 } from '@/lib/seed';
import { makeGroundTexture } from './textures';
import { createTreeFactory } from './tree-mesh';

const NIGHT_BG = 0x1a1c24;
// near-still: ~0.004 rad/s ≈ 26 min per turn
const ORBIT_SPEED = 0.004;
const ORBIT_RADIUS = 7.5;
const TREE_COUNT = 40;

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
  // supersample (S×) so the carved copy stays crisp, not blurry
  const S = 2;
  const W = 760 * S;
  const H = 460 * S;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const serif = "Georgia, 'Times New Roman', serif";

  // soft neutral plank — bright, so it glows against the night
  ctx.fillStyle = '#eae8e2';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 44; i++) {
    ctx.strokeStyle = `rgba(120,120,116,${0.04 + Math.random() * 0.06})`;
    ctx.lineWidth = (1 + Math.random() * 2) * S;
    const y = Math.random() * H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      W * 0.33,
      y + (Math.random() - 0.5) * 9 * S,
      W * 0.66,
      y + (Math.random() - 0.5) * 9 * S,
      W,
      y + (Math.random() - 0.5) * 6 * S,
    );
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(60,60,58,0.4)';
  ctx.lineWidth = 3 * S;
  ctx.strokeRect(22 * S, 22 * S, W - 44 * S, H - 44 * S);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#0a0a0a';
  ctx.font = `700 ${100 * S}px ${serif}`;
  ctx.fillText(copy.notFound.code, W / 2, 138 * S);

  ctx.font = `500 ${33 * S}px ${serif}`;
  const lines = wrap(ctx, copy.notFound.title, W - 150 * S);
  let y = 258 * S;
  for (const line of lines) {
    ctx.fillText(line, W / 2, y);
    y += 46 * S;
  }

  ctx.font = `italic 400 ${25 * S}px ${serif}`;
  ctx.fillStyle = 'rgba(28,28,28,0.78)';
  ctx.fillText(copy.notFound.sub, W / 2, y + 18 * S);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
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
  renderer.setClearColor(NIGHT_BG, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NIGHT_BG);
  // fog far enough that the ring of trees fades gradually into the dark
  scene.fog = new THREE.Fog(NIGHT_BG, 30, 100);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 240);
  camera.position.set(0, 2.4, ORBIT_RADIUS);

  // ground — the paper texture multiplied down to a dark night floor
  const groundTex = makeGroundTexture();
  const groundMat = new THREE.MeshBasicMaterial({
    map: groundTex,
    color: 0x2a2c36,
  });
  const groundGeo = new THREE.PlaneGeometry(600, 600);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // stars — fog-immune points scattered on an upper dome
  const starRng = mulberry32(0x57a21);
  const STAR_COUNT = 150;
  const starPos = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const dir = new THREE.Vector3(
      starRng() * 2 - 1,
      starRng() * 0.9 + 0.14,
      starRng() * 2 - 1,
    ).normalize();
    starPos[i * 3] = dir.x * 90;
    starPos[i * 3 + 1] = dir.y * 90;
    starPos[i * 3 + 2] = dir.z * 90;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xd8d8e2,
    size: 2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.85,
    fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // pale-grey, unlit materials — at night the wood reads as light silhouette
  const treeMat = new THREE.MeshBasicMaterial({ color: 0xcdcbc4 });
  const postMat = new THREE.MeshBasicMaterial({ color: 0x9c9a94 });

  // a full ring of trees — endless-looking, fog-faded
  const treeFactory = createTreeFactory();
  const treeGroups: THREE.Group[] = [];
  const placeRng = mulberry32(0x404f1e1d);
  for (let i = 0; i < TREE_COUNT; i++) {
    const ang = placeRng() * Math.PI * 2;
    const rad = 32 + placeRng() * 68; // 32..100 from the sign
    const g = treeFactory.makeTreeMesh(hashStr(`404-${i}`), `404-${i}`);
    g.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
    g.scale.setScalar(0.6 + placeRng() * 0.8);
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) o.material = treeMat;
    });
    scene.add(g);
    treeGroups.push(g);
  }

  // ── wooden picket sign ──────────────────────────────────────────────────
  // sign (outer) yaws to face the camera; signLean (inner) holds the lean.
  const sign = new THREE.Group();
  const signLean = new THREE.Group();
  signLean.rotation.z = 0.022;
  signLean.rotation.x = 0.014;
  sign.add(signLean);
  scene.add(sign);

  // post — a tapered trunk (wider at the base), pale grey for the night
  const postGeo = new THREE.CylinderGeometry(0.085, 0.16, 2.5, 9, 1);
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.y = 1.25;
  signLean.add(post);

  // board — unlit; bright plank that glows against the dark
  const signTex = makeSignTexture();
  const boardGeo = new THREE.BoxGeometry(3.0, 1.82, 0.1);
  const faceMat = new THREE.MeshBasicMaterial({ map: signTex });
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x9a958b });
  const board = new THREE.Mesh(boardGeo, [
    edgeMat,
    edgeMat,
    edgeMat,
    edgeMat,
    faceMat,
    faceMat,
  ]);
  board.position.set(0, 2.0, 0.18);
  signLean.add(board);

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

  // loop — one near-still orbit; the sign billboards to keep facing us
  let animId = 0;
  function loop(now: number) {
    const a = (now / 1000) * ORBIT_SPEED;
    camera.position.set(
      Math.sin(a) * ORBIT_RADIUS,
      2.4,
      Math.cos(a) * ORBIT_RADIUS,
    );
    camera.lookAt(0, 2.05, 0);
    sign.rotation.y = a;
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
      treeMat.dispose();
      postMat.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      groundTex.dispose();
      starGeo.dispose();
      starMat.dispose();
      postGeo.dispose();
      boardGeo.dispose();
      faceMat.dispose();
      edgeMat.dispose();
      signTex.dispose();
      renderer.dispose();
    },
  };
}
