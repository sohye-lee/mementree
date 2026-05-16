// memo "note" — paper tag hung by a string from a branch tip.
// ported from design/memoir-field.js (`makeNoteTexture` + `makeNoteMesh`).
//
// the texture is generated per-note (so age/text/author show up). the string
// is a separate THREE.Line, the paper is a textured plane with a thin dark
// backing for perceived thickness. all materials are owned by the returned
// Group and disposed via disposeNoteGroup.

import * as THREE from 'three';
import { mulberry32 } from '@/lib/seed';

const INK70 = 0x3d3d3d;
const EDGE_COLOR = 0xc9c9c5;

export interface NoteInput {
  id: string;
  text: string;
  author: string | null;
  /** unix ms — drives the aging look (paper yellows over 180 days) */
  createdAt: number;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string[] {
  const words = (text || '').split(/(\s+)/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line + w;
    if (ctx.measureText(test).width > maxW && line.trim().length > 0) {
      lines.push(line.trimEnd());
      line = w.trimStart();
    } else {
      line = test;
    }
  }
  if (line.trim().length) lines.push(line);
  return lines;
}

function makeNoteTexture(memo: NoteInput): THREE.CanvasTexture {
  const W = 256;
  const H = 360;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // age 0..1 (saturates at 180 days)
  const ageDays = Math.max(0, (Date.now() - memo.createdAt) / 86400000);
  const a = Math.min(1, ageDays / 180);

  const lerp = (x: number, y: number, k: number) => Math.round(x + (y - x) * k);
  const pr = lerp(244, 224, a);
  const pg = lerp(244, 210, a);
  const pb = lerp(241, 184, a);
  const paperBg = `rgb(${pr},${pg},${pb})`;

  const br = lerp(201, 178, a);
  const bg = lerp(201, 158, a);
  const bb = lerp(197, 124, a);
  const borderColor = `rgb(${br},${bg},${bb})`;

  const inkAlpha = 1 - a * 0.25;
  const inkColor = `rgba(10,10,10,${inkAlpha.toFixed(3)})`;
  const stainAlpha = a * 0.18;

  ctx.fillStyle = paperBg;
  ctx.fillRect(0, 0, W, H);

  if (a > 0.15) {
    for (let i = 0; i < 6 + Math.floor(a * 10); i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      const sr = 20 + Math.random() * 60;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      sg.addColorStop(0, `rgba(150,110,60,${stainAlpha.toFixed(3)})`);
      sg.addColorStop(1, 'rgba(150,110,60,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    }
  }

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // hole punch at top
  ctx.fillStyle = `rgb(${lerp(236, 210, a)},${lerp(236, 196, a)},${lerp(232, 172, a)})`;
  ctx.beginPath();
  ctx.arc(W / 2, 18, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgb(${lerp(168, 138, a)},${lerp(168, 124, a)},${lerp(166, 98, a)})`;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // body
  ctx.fillStyle = inkColor;
  ctx.font = '500 17px "Source Code Pro", monospace';
  ctx.textBaseline = 'top';
  const lines = wrapText(ctx, memo.text || '', W - 36);
  let y = 46;
  const maxLines = 9;
  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    let line = lines[i];
    if (i === maxLines - 1 && lines.length > maxLines) {
      line = line.slice(0, -1) + '…';
    }
    ctx.fillText(line, 18, y);
    y += 22;
  }

  // signature rule + author
  ctx.strokeStyle = `rgba(180,170,140,${0.55 + a * 0.2})`;
  ctx.beginPath();
  ctx.moveTo(18, H - 36);
  ctx.lineTo(W - 18, H - 36);
  ctx.stroke();
  ctx.font = '400 13px "Source Code Pro", monospace';
  ctx.fillStyle = `rgba(107,107,107,${(0.85 - a * 0.15).toFixed(3)})`;
  ctx.fillText(`— ${memo.author || 'anon'}`, 18, H - 28);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export interface NoteGroup extends THREE.Group {
  userData: {
    memoId: string;
    treeId: string;
    plane: THREE.Mesh;
    edge: THREE.Mesh;
    swayPhase: number;
    baseRotY: number;
    tex: THREE.CanvasTexture;
    planeMat: THREE.MeshBasicMaterial;
    edgeMat: THREE.MeshBasicMaterial;
    planeGeo: THREE.PlaneGeometry;
    edgeGeo: THREE.PlaneGeometry;
    stringGeo: THREE.BufferGeometry;
  };
}

const stringMatShared = new THREE.LineBasicMaterial({
  color: INK70,
  transparent: true,
  opacity: 0.6,
});

export function makeNoteMesh(
  memo: NoteInput,
  anchor: THREE.Vector3,
  treeId: string,
): NoteGroup {
  const grp = new THREE.Group() as NoteGroup;

  // deterministic per-memo randomness (so notes don't jitter across reloads)
  const rng = mulberry32(
    (Array.from(memo.id).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0) ||
      1) >>> 0,
  );

  const stringLen = 0.22 + rng() * 0.14;
  const noteW = 0.52;
  const noteH = 0.74;

  const stringTop = anchor.clone();
  const noteCenter = anchor.clone();
  noteCenter.y -= stringLen + noteH / 2;
  noteCenter.x += (rng() - 0.5) * 0.05;
  noteCenter.z += (rng() - 0.5) * 0.05;

  const stringGeo = new THREE.BufferGeometry().setFromPoints([
    stringTop,
    new THREE.Vector3(noteCenter.x, anchor.y - stringLen, noteCenter.z),
  ]);
  const str = new THREE.Line(stringGeo, stringMatShared);
  grp.add(str);

  const ageDays = Math.max(0, (Date.now() - memo.createdAt) / 86400000);
  const a = Math.min(1, ageDays / 180);
  const tex = makeNoteTexture(memo);

  const planeGeo = new THREE.PlaneGeometry(noteW, noteH);
  const planeMat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.DoubleSide,
    transparent: a > 0.5,
    opacity: 1 - a * 0.18,
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.position.copy(noteCenter);
  plane.userData.isMemo = true;
  plane.userData.treeId = treeId;
  plane.userData.memoId = memo.id;

  // thin dark backing for perceived thickness
  const edgeGeo = new THREE.PlaneGeometry(noteW + 0.01, noteH + 0.01);
  const edgeMat = new THREE.MeshBasicMaterial({
    color: EDGE_COLOR,
    side: THREE.DoubleSide,
  });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.copy(noteCenter);
  edge.position.y -= 0.005;
  edge.position.x -= 0.005;
  edge.position.z -= 0.003;
  edge.userData.isMemoEdge = true;
  edge.userData.treeId = treeId;
  edge.userData.memoId = memo.id;

  grp.userData = {
    memoId: memo.id,
    treeId,
    plane,
    edge,
    swayPhase: rng() * Math.PI * 2,
    baseRotY: rng() * Math.PI * 2,
    tex,
    planeMat,
    edgeMat,
    planeGeo,
    edgeGeo,
    stringGeo,
  };

  plane.rotation.y = grp.userData.baseRotY;
  plane.rotation.x = (rng() - 0.5) * 0.08;
  edge.rotation.copy(plane.rotation);
  grp.add(edge);
  grp.add(plane);

  return grp;
}

export function updateNoteSway(grp: NoteGroup, tSeconds: number) {
  const phase = grp.userData.swayPhase;
  const baseRot = grp.userData.baseRotY;
  grp.userData.plane.rotation.y = baseRot + Math.sin(tSeconds * 0.7 + phase) * 0.12;
  grp.userData.plane.rotation.z = Math.sin(tSeconds * 0.9 + phase * 1.3) * 0.05;
  grp.userData.edge.rotation.copy(grp.userData.plane.rotation);
}

export function disposeNoteGroup(grp: NoteGroup) {
  grp.userData.planeGeo.dispose();
  grp.userData.edgeGeo.dispose();
  grp.userData.stringGeo.dispose();
  grp.userData.planeMat.dispose();
  grp.userData.edgeMat.dispose();
  grp.userData.tex.dispose();
}

export function disposeSharedNoteMaterials() {
  stringMatShared.dispose();
}
