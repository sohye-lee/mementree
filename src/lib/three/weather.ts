// weather particle systems — rain (line streaks) and snow (drifting points).
// each covers a large box around the field origin; the keeper walks within
// it. ink-toned so they read against the paper background.

import * as THREE from 'three';

export interface WeatherSystem {
  object: THREE.Object3D;
  update: (dt: number) => void;
  dispose: () => void;
}

const AREA = 36; // half-extent in x/z
const TOP = 22; // spawn / wrap height

export function createRain(): WeatherSystem {
  const COUNT = 360;
  const STREAK = 0.55;
  // two verts per drop (top + bottom of the streak)
  const positions = new Float32Array(COUNT * 2 * 3);
  const speeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * AREA * 2;
    const z = (Math.random() - 0.5) * AREA * 2;
    const y = Math.random() * TOP;
    positions[i * 6 + 0] = x;
    positions[i * 6 + 1] = y + STREAK;
    positions[i * 6 + 2] = z;
    positions[i * 6 + 3] = x;
    positions[i * 6 + 4] = y;
    positions[i * 6 + 5] = z;
    speeds[i] = 16 + Math.random() * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0x6b6b6b,
    transparent: true,
    opacity: 0.32,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;

  function update(dt: number) {
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const d = speeds[i] * dt;
      arr[i * 6 + 1] -= d;
      arr[i * 6 + 4] -= d;
      if (arr[i * 6 + 4] < 0) {
        arr[i * 6 + 1] = TOP + STREAK;
        arr[i * 6 + 4] = TOP;
      }
    }
    attr.needsUpdate = true;
  }

  return {
    object: lines,
    update,
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

export function createSnow(): WeatherSystem {
  const COUNT = 280;
  const positions = new Float32Array(COUNT * 3);
  const speeds = new Float32Array(COUNT);
  const phase = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * AREA * 2;
    positions[i * 3 + 1] = Math.random() * TOP;
    positions[i * 3 + 2] = (Math.random() - 0.5) * AREA * 2;
    speeds[i] = 1.0 + Math.random() * 1.8;
    phase[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xc9c9c5,
    size: 0.13,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  let t = 0;
  function update(dt: number) {
    t += dt;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] -= speeds[i] * dt;
      arr[i * 3 + 0] += Math.sin(t * 0.6 + phase[i]) * 0.25 * dt;
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = TOP;
    }
    attr.needsUpdate = true;
  }

  return {
    object: points,
    update,
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
