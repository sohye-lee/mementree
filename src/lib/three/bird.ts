// an ambient bird — flies in from off-field, perches on a branch tip for a
// while, then leaves. one bird, occasional visits. a small ink silhouette
// to match the paper/ink palette.
//
// usage:
//   const bird = createBird();
//   scene.add(bird.object);
//   // each frame:
//   bird.update(dt, pickPerch); // pickPerch returns a world-space branch tip
//   // or null when there are no trees to land on

import * as THREE from 'three';

const INK = 0x1a1a1a;

type BirdState = 'away' | 'incoming' | 'perched' | 'leaving';

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export interface BirdSystem {
  object: THREE.Object3D;
  update: (dt: number, getPerch: () => THREE.Vector3 | null) => void;
  dispose: () => void;
}

export function createBird(): BirdSystem {
  const group = new THREE.Group();
  group.scale.setScalar(1.2);
  group.visible = false;

  const bodyMat = new THREE.MeshBasicMaterial({ color: INK });
  const wingMat = new THREE.MeshBasicMaterial({
    color: INK,
    side: THREE.DoubleSide,
  });

  // body — a small dark lozenge stretched along +z (forward)
  const bodyGeo = new THREE.SphereGeometry(0.06, 7, 5);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(1, 0.85, 2.4);
  group.add(body);

  // head + beak
  const headGeo = new THREE.SphereGeometry(0.045, 7, 5);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 0.035, 0.15);
  group.add(head);

  const beakGeo = new THREE.ConeGeometry(0.018, 0.07, 5);
  const beak = new THREE.Mesh(beakGeo, bodyMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.035, 0.22);
  group.add(beak);

  // tail — flat triangle pointing back
  const tailGeo = new THREE.BufferGeometry();
  tailGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        -0.05, 0, -0.16, 0.05, 0, -0.16, 0, 0, -0.32,
      ]),
      3,
    ),
  );
  tailGeo.computeVertexNormals();
  const tail = new THREE.Mesh(tailGeo, wingMat);
  group.add(tail);

  // wings — each a pivot group at the body; rotation.z flaps it
  function makeWing(side: 1 | -1): { pivot: THREE.Group; geo: THREE.BufferGeometry } {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([
          0, 0, 0.07,
          0, 0, -0.11,
          side * 0.27, 0, -0.02,
        ]),
        3,
      ),
    );
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, wingMat);
    const pivot = new THREE.Group();
    pivot.add(mesh);
    group.add(pivot);
    return { pivot, geo };
  }
  const right = makeWing(1);
  const left = makeWing(-1);

  // ── state ─────────────────────────────────────────────────────────────────
  let state: BirdState = 'away';
  let timer = 4 + Math.random() * 6; // first visit delay
  let t = 0; // flight progress 0..1
  let flapPhase = 0;
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();

  function pickFar(around: THREE.Vector3): THREE.Vector3 {
    const ang = Math.random() * Math.PI * 2;
    const dist = 28 + Math.random() * 14;
    return new THREE.Vector3(
      around.x + Math.cos(ang) * dist,
      9 + Math.random() * 6,
      around.z + Math.sin(ang) * dist,
    );
  }

  function setFlap(amount: number) {
    right.pivot.rotation.z = amount;
    left.pivot.rotation.z = -amount;
  }
  function setFolded() {
    right.pivot.rotation.z = -0.16;
    left.pivot.rotation.z = 0.16;
  }

  function update(dt: number, getPerch: () => THREE.Vector3 | null) {
    if (state === 'away') {
      timer -= dt;
      if (timer <= 0) {
        const perch = getPerch();
        if (perch) {
          to.copy(perch);
          from.copy(pickFar(perch));
          t = 0;
          group.position.copy(from);
          group.visible = true;
          state = 'incoming';
        } else {
          timer = 6 + Math.random() * 6; // no trees — try again later
        }
      }
      return;
    }

    if (state === 'incoming' || state === 'leaving') {
      const dur = state === 'incoming' ? 4.6 : 3.9;
      t += dt / dur;
      const tc = Math.min(1, t);

      const px = group.position.x;
      const pz = group.position.z;
      group.position.lerpVectors(from, to, easeInOut(tc));
      group.position.y += Math.sin(Math.PI * tc) * 1.6;

      // heading from horizontal velocity
      const vx = group.position.x - px;
      const vz = group.position.z - pz;
      if (vx * vx + vz * vz > 1e-7) {
        group.rotation.y = Math.atan2(vx, vz);
      }

      flapPhase += dt * 17;
      setFlap(Math.sin(flapPhase) * 0.95);

      if (tc >= 1) {
        if (state === 'incoming') {
          state = 'perched';
          timer = 7 + Math.random() * 8;
          setFolded();
        } else {
          state = 'away';
          timer = 11 + Math.random() * 14;
          group.visible = false;
        }
      }
      return;
    }

    // perched — sit still with a faint bob; then leave
    timer -= dt;
    group.position.y = to.y + Math.sin(performance.now() / 600) * 0.012;
    if (timer <= 0) {
      from.copy(group.position);
      to.copy(pickFar(group.position));
      t = 0;
      state = 'leaving';
    }
  }

  function dispose() {
    bodyGeo.dispose();
    headGeo.dispose();
    beakGeo.dispose();
    tailGeo.dispose();
    right.geo.dispose();
    left.geo.dispose();
    bodyMat.dispose();
    wingMat.dispose();
  }

  return { object: group, update, dispose };
}
