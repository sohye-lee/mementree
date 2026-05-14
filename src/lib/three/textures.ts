// procedural ground & vignette textures.
// ported verbatim from design/memoir-field.js — these values produce the
// "paper from above" reading that the rest of the design depends on.

import * as THREE from 'three';

export function makeGroundTexture(): THREE.CanvasTexture {
  const W = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = W;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#F2F1ED';
  ctx.fillRect(0, 0, W, W);

  // pronounced darkening toward edges — reads like ambient occlusion
  const g = ctx.createRadialGradient(W / 2, W / 2, W * 0.08, W / 2, W / 2, W * 0.7);
  g.addColorStop(0, 'rgba(248,247,243,1.0)');
  g.addColorStop(0.35, 'rgba(220,219,213,0.9)');
  g.addColorStop(0.7, 'rgba(168,166,160,0.85)');
  g.addColorStop(1, 'rgba(110,108,103,0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, W);

  // large soft blobs — organic ground variation
  for (let i = 0; i < 24; i++) {
    const x = Math.random() * W;
    const y = Math.random() * W;
    const r = 60 + Math.random() * 180;
    const v = 130 + Math.floor(Math.random() * 90);
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(${v},${v},${v - 6},${0.06 + Math.random() * 0.08})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // grain dots
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * W;
    const y = Math.random() * W;
    const r = 0.5 + Math.random() * 1.6;
    const v = 200 + Math.floor(Math.random() * 40);
    ctx.fillStyle = `rgba(${v},${v},${v - 4},${0.05 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // hairline strokes
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(160,160,156,${0.03 + Math.random() * 0.05})`;
    ctx.lineWidth = 0.8 + Math.random() * 1.2;
    const x = Math.random() * W;
    const y = Math.random() * W;
    const len = 30 + Math.random() * 80;
    const a = Math.random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = 8;
  return tex;
}

export function makeBarkTexture(): THREE.CanvasTexture {
  const W = 256;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#2a2826';
  ctx.fillRect(0, 0, W, H);

  // vertical streaks
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * W;
    const w = 0.6 + Math.random() * 2.4;
    const v = 20 + Math.floor(Math.random() * 80);
    ctx.fillStyle = `rgba(${v},${v - 3},${v - 6},${0.25 + Math.random() * 0.5})`;
    ctx.fillRect(x, 0, w, H);
  }

  // horizontal short cracks
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const len = 4 + Math.random() * 18;
    const v = Math.floor(Math.random() * 40);
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.15 + Math.random() * 0.35})`;
    ctx.lineWidth = 0.5 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }

  // soft mottled patches
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = 8 + Math.random() * 30;
    const v = 30 + Math.floor(Math.random() * 60);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${v},${v},${v - 4},${0.18 + Math.random() * 0.18})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function makeVignetteTexture(): THREE.CanvasTexture {
  const W = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = W;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, W, W);
  const g = ctx.createRadialGradient(W / 2, W / 2, W * 0.05, W / 2, W / 2, W * 0.55);
  g.addColorStop(0, 'rgba(255,254,250,0.45)');
  g.addColorStop(0.4, 'rgba(244,244,241,0.0)');
  g.addColorStop(0.75, 'rgba(120,118,112,0.18)');
  g.addColorStop(1, 'rgba(60,58,54,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, W);
  return new THREE.CanvasTexture(c);
}
