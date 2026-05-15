// walk + look controls for the field scene.
// ported from design/memoir-field.js, kept framework-agnostic.
//
// inputs:
//   - mouse drag (anywhere): yaw + pitch
//   - WASD or arrow keys: walk along ground plane
//   - shift: run (2x speed)
//   - wheel/trackpad: smoothed forward/back along view direction
//   - touch: drag = look (single finger)

import * as THREE from 'three';

export interface FieldControls {
  update: (dt: number, camera: THREE.PerspectiveCamera) => void;
  dispose: () => void;
}

interface State {
  yaw: number;
  pitch: number;
  pos: THREE.Vector3;
  keys: { w: boolean; a: boolean; s: boolean; d: boolean; shift: boolean };
  dragging: boolean;
  lastX: number;
  lastY: number;
  zoomVel: number;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

export function createControls(canvas: HTMLCanvasElement): FieldControls {
  // initial camera framing.
  //   pos.z = 12: far enough back that the first tree (planted at (0, -2))
  //     sits at distance ~14 with comfortable margin around it, instead of
  //     filling the screen.
  //   pitch = 0.05: ~3° upward tilt so the tree's vertical midpoint lands
  //     at screen center rather than the trunk base. with pos.y = 1.8 and
  //     a typical tree height of ~5m, this puts top and base symmetrically
  //     above/below screen center.
  const state: State = {
    yaw: 0,
    pitch: 0.05,
    pos: new THREE.Vector3(0, 1.8, 12),
    keys: { w: false, a: false, s: false, d: false, shift: false },
    dragging: false,
    lastX: 0,
    lastY: 0,
    zoomVel: 0,
  };

  function onMouseDown(e: MouseEvent) {
    if (e.target !== canvas) return;
    state.dragging = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
  }

  function onMouseUp() {
    state.dragging = false;
  }

  function onMouseMove(e: MouseEvent) {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    state.yaw -= dx * 0.0035;
    state.pitch -= dy * 0.0025;
    state.pitch = Math.max(-0.6, Math.min(0.4, state.pitch));
  }

  function onWheel(e: WheelEvent) {
    if (e.target !== canvas) return;
    e.preventDefault();
    // normalize: pixel mode (trackpad) ~10px, line mode (mouse wheel) ~100px
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    const dy = e.deltaY * unit;
    state.zoomVel += -dy * 0.012;
    state.zoomVel = Math.max(-12, Math.min(12, state.zoomVel));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isInputFocused()) return;
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') state.keys.w = true;
    if (k === 'a' || k === 'arrowleft') state.keys.a = true;
    if (k === 's' || k === 'arrowdown') state.keys.s = true;
    if (k === 'd' || k === 'arrowright') state.keys.d = true;
    if (k === 'shift') state.keys.shift = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') state.keys.w = false;
    if (k === 'a' || k === 'arrowleft') state.keys.a = false;
    if (k === 's' || k === 'arrowdown') state.keys.s = false;
    if (k === 'd' || k === 'arrowright') state.keys.d = false;
    if (k === 'shift') state.keys.shift = false;
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      state.dragging = true;
      state.lastX = e.touches[0].clientX;
      state.lastY = e.touches[0].clientY;
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (!state.dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - state.lastX;
    const dy = t.clientY - state.lastY;
    state.lastX = t.clientX;
    state.lastY = t.clientY;
    state.yaw -= dx * 0.0035;
    state.pitch -= dy * 0.0025;
    state.pitch = Math.max(-0.6, Math.min(0.4, state.pitch));
  }

  function onTouchEnd() {
    state.dragging = false;
  }

  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: true });
  canvas.addEventListener('touchend', onTouchEnd);

  // reused vectors to avoid allocations in the hot path
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const mv = new THREE.Vector3();
  const fwd2 = new THREE.Vector3();
  const lookDir = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

  return {
    update(dt, camera) {
      // walk
      const speed = state.keys.shift ? 8 : 4;
      fwd.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
      right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
      mv.set(0, 0, 0);
      if (state.keys.w) mv.add(fwd);
      if (state.keys.s) mv.sub(fwd);
      if (state.keys.d) mv.add(right);
      if (state.keys.a) mv.sub(right);
      if (mv.lengthSq() > 0) {
        mv.normalize().multiplyScalar(speed * dt);
        state.pos.add(mv);
      }

      // wheel zoom (smoothed forward/back along horizontal view direction)
      if (Math.abs(state.zoomVel) > 0.001) {
        const step = state.zoomVel * dt * 4;
        fwd2
          .set(
            -Math.sin(state.yaw) * Math.cos(state.pitch),
            0,
            -Math.cos(state.yaw) * Math.cos(state.pitch),
          )
          .normalize();
        state.pos.addScaledVector(fwd2, step);
        state.zoomVel *= Math.pow(0.001, dt); // ~99% lost per second
      }

      // camera transform
      camera.position.copy(state.pos);
      lookDir.set(
        -Math.sin(state.yaw) * Math.cos(state.pitch),
        Math.sin(state.pitch),
        -Math.cos(state.yaw) * Math.cos(state.pitch),
      );
      lookAt.copy(state.pos).add(lookDir);
      camera.lookAt(lookAt);
    },
    dispose() {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    },
  };
}
