// tree mesh generator. ported from design/memoir-field.js (`makeTreeMesh`).
// the shape is fully determined by `seed` — same seed always produces the
// same tree, so renaming a tree (which may change its hash) is what we
// guard against by freezing seed at creation time.
//
// usage:
//   const factory = createTreeFactory();
//   const group = factory.makeTreeMesh(seed);
//   scene.add(group);
//   // later:
//   factory.dispose(); // releases shared bark texture + ring materials

import * as THREE from 'three';
import { mulberry32 } from '@/lib/seed';
import { makeBarkTexture } from './textures';

const INK20 = 0xc9c9c5;
const INK70 = 0x3d3d3d;

export interface TreeFactory {
  makeTreeMesh: (seed: number) => THREE.Group;
  disposeTreeGroup: (group: THREE.Group) => void;
  dispose: () => void;
}

export function createTreeFactory(): TreeFactory {
  // shared assets — created once per scene, used by all trees.
  const barkTex = makeBarkTexture();
  const ringMatBase = new THREE.LineBasicMaterial({
    color: INK20,
    transparent: true,
    opacity: 0.7,
  });
  // referenced for type but unused in phase B (hover/active arrive in phase C):
  void INK70;

  // per-tree trunk material — color jittered from the seed.
  function trunkMaterialFor(seed: number): THREE.MeshStandardMaterial {
    const r = mulberry32(seed >>> 0)();
    // gray range from #0F0E0D to ~#48433d (warmer, like bark)
    const v = Math.floor(15 + r * 55);
    const warm = Math.floor(v * 0.88);
    const hex = (v << 16) | (v << 8) | warm;
    return new THREE.MeshStandardMaterial({
      color: hex,
      map: barkTex,
      roughness: 0.95,
      metalness: 0.0,
    });
  }

  function makeTreeMesh(seed: number): THREE.Group {
    const rng = mulberry32(seed >>> 0);
    const group = new THREE.Group();
    const tips: THREE.Vector3[] = [];
    // distinct material per tree so color jitters — seed is xor'd so
    // the trunk material rng is independent of the branch rng above.
    const myTrunkMat = trunkMaterialFor(seed ^ 0x9e3779b1);
    const branchGeometries: THREE.BufferGeometry[] = [];

    function branch(
      start: THREE.Vector3,
      dir: THREE.Vector3,
      length: number,
      thickness: number,
      depth: number,
    ) {
      const end = start.clone().add(dir.clone().multiplyScalar(length));

      const r1 = Math.max(0.012, thickness * 0.7);
      const r2 = Math.max(0.014, thickness);
      // 12 radial segs + 3 height segs to give enough geometry for a soft bend
      const geo = new THREE.CylinderGeometry(r1, r2, length, 12, 3, false);

      // bend the geometry to remove the perfect-cylinder feel
      {
        const pos = geo.attributes.position;
        const bendAmt = (rng() - 0.5) * 0.06 * length;
        const bendDir = rng() * Math.PI * 2;
        const bx = Math.cos(bendDir) * bendAmt;
        const bz = Math.sin(bendDir) * bendAmt;
        for (let pi = 0; pi < pos.count; pi++) {
          const py = pos.getY(pi);
          const t = py / length + 0.5;
          const k = Math.sin(t * Math.PI);
          pos.setX(pi, pos.getX(pi) + bx * k);
          pos.setZ(pi, pos.getZ(pi) + bz * k);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
      }

      const mesh = new THREE.Mesh(geo, myTrunkMat);
      branchGeometries.push(geo);

      // position at midpoint between start and end
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mesh.position.copy(mid);

      // orient: cylinder default axis is +Y. rotate to dir.
      const up = new THREE.Vector3(0, 1, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(
        up,
        dir.clone().normalize(),
      );
      mesh.quaternion.copy(q);
      group.add(mesh);

      if (depth <= 0) {
        // tip — record a point a touch beyond the end for hanging notes (phase C)
        tips.push(end.clone());
        return;
      }

      // 2-3 child branches — leader continues mostly straight, others diverge.
      const n = 2 + (rng() < 0.45 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const isLeader = i === 0;
        const angleSpread = isLeader ? 0.18 : 0.55 + rng() * 0.5;
        const newDir = dir.clone();
        const perp1 = new THREE.Vector3();
        if (Math.abs(newDir.y) < 0.99) {
          perp1.crossVectors(newDir, up).normalize();
        } else {
          perp1.set(1, 0, 0);
        }
        const perp2 = new THREE.Vector3()
          .crossVectors(newDir, perp1)
          .normalize();
        const a = rng() * Math.PI * 2;
        const tilt = isLeader ? rng() * 0.18 : 0.45 + rng() * angleSpread;
        const offset = perp1
          .clone()
          .multiplyScalar(Math.cos(a) * tilt)
          .add(perp2.clone().multiplyScalar(Math.sin(a) * tilt));
        newDir.add(offset);
        newDir.y += isLeader ? 0.05 : 0.1;
        newDir.normalize();
        const lenScale = isLeader ? 0.78 + rng() * 0.12 : 0.55 + rng() * 0.22;
        const thickScale = isLeader ? 0.82 + rng() * 0.08 : 0.55 + rng() * 0.12;
        branch(end, newDir, length * lenScale, thickness * thickScale, depth - 1);
      }
      // sometimes a tip directly off this junction
      if (rng() < 0.35) tips.push(end.clone());
    }

    // trunk: slight lean
    const leanX = (rng() - 0.5) * 0.18;
    const leanZ = (rng() - 0.5) * 0.18;
    const trunkDir = new THREE.Vector3(leanX, 1, leanZ).normalize();
    const trunkLen = 1.8 + rng() * 0.8;
    const trunkThick = 0.14 + rng() * 0.06;
    const depth = 6;
    branch(new THREE.Vector3(0, 0, 0), trunkDir, trunkLen, trunkThick, depth);

    // base ring (status indicator on the ground — base/hover/active in phase C)
    const ringPts: THREE.Vector3[] = [];
    const R = 0.85;
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * R, 0.005, Math.sin(a) * R));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    const ring = new THREE.LineLoop(ringGeo, ringMatBase);
    group.add(ring);

    group.userData.ring = ring;
    group.userData.tips = tips;
    group.userData.trunkMat = myTrunkMat;
    group.userData.branchGeos = branchGeometries;
    group.userData.ringGeo = ringGeo;

    return group;
  }

  function disposeTreeGroup(group: THREE.Group) {
    const branchGeos = group.userData.branchGeos as THREE.BufferGeometry[];
    branchGeos?.forEach((g) => g.dispose());
    (group.userData.ringGeo as THREE.BufferGeometry | undefined)?.dispose();
    (group.userData.trunkMat as THREE.Material | undefined)?.dispose();
  }

  function dispose() {
    barkTex.dispose();
    ringMatBase.dispose();
  }

  return { makeTreeMesh, disposeTreeGroup, dispose };
}
