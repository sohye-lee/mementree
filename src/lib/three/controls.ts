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
  // smoothly fly the camera to `toPos`, ending aimed at `lookAt`.
  // cancelled the instant the keeper takes manual control.
  flyTo: (toPos: THREE.Vector3, lookAt: THREE.Vector3) => void;
  dispose: () => void;
}

// camera fly-to tween, used to frame a freshly planted tree.
interface FlyState {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromYaw: number;
  toYaw: number;
  fromPitch: number;
  toPitch: number;
  t: number;
}

const FLY_DURATION = 1.1; // seconds

interface State {
  yaw: number;
  pitch: number;
  pos: THREE.Vector3;
  keys: { w: boolean; a: boolean; s: boolean; d: boolean; shift: boolean };
  dragging: boolean;
  lastX: number;
  lastY: number;
  zoomVel: number;
  fly: FlyState | null;
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
  //   pitch = 0.14: ~8° upward tilt. lifts the framing past the trunk-
  //     midpoint, biasing toward the canopy where the interesting silhouette
  //     lives. tree base sits low in frame, branches reach toward the top.
  const state: State = {
    yaw: 0,
    pitch: 0.14,
    pos: new THREE.Vector3(0, 1.8, 12),
    keys: { w: false, a: false, s: false, d: false, shift: false },
    dragging: false,
    lastX: 0,
    lastY: 0,
    zoomVel: 0,
    fly: null,
  };

  // clicking into the scene means "interact with the field" — drop focus
  // from any text input so wasd walking isn't swallowed by isInputFocused()
  // (the canvas itself isn't focusable, so focus would otherwise linger on
  // the search box / memo composer).
  function blurActiveInput() {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.blur();
    }
  }

  function onMouseDown(e: MouseEvent) {
    if (e.target !== canvas) return;
    blurActiveInput();
    state.dragging = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
  }

  function onMouseUp() {
    state.dragging = false;
  }

  function onMouseMove(e: MouseEvent) {
    if (!state.dragging) return;
    state.fly = null; // manual look cancels any fly-to
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
    state.fly = null; // manual zoom cancels any fly-to
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
      blurActiveInput();
      state.dragging = true;
      state.lastX = e.touches[0].clientX;
      state.lastY = e.touches[0].clientY;
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (!state.dragging) return;
    state.fly = null; // manual look cancels any fly-to
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

  function flyTo(toPos: THREE.Vector3, look: THREE.Vector3) {
    const dx = look.x - toPos.x;
    const dy = look.y - toPos.y;
    const dz = look.z - toPos.z;
    const horiz = Math.hypot(dx, dz) || 0.001;
    const targetYaw = Math.atan2(-dx, -dz);
    const targetPitch = Math.max(-0.6, Math.min(0.4, Math.atan2(dy, horiz)));
    // unwrap yaw to the shortest rotation direction
    let d = targetYaw - state.yaw;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    state.fly = {
      fromPos: state.pos.clone(),
      toPos: toPos.clone(),
      fromYaw: state.yaw,
      toYaw: state.yaw + d,
      fromPitch: state.pitch,
      toPitch: targetPitch,
      t: 0,
    };
  }

  return {
    flyTo,
    update(dt, camera) {
      // fly-to tween — runs until complete or cleared by manual input below
      if (state.fly) {
        state.fly.t += dt / FLY_DURATION;
        const k = Math.min(1, state.fly.t);
        const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
        state.pos.lerpVectors(state.fly.fromPos, state.fly.toPos, e);
        state.yaw =
          state.fly.fromYaw + (state.fly.toYaw - state.fly.fromYaw) * e;
        state.pitch =
          state.fly.fromPitch + (state.fly.toPitch - state.fly.fromPitch) * e;
        if (k >= 1) state.fly = null;
      }

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
        state.fly = null; // walking cancels any fly-to
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
