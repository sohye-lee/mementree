// per-frame camera readout, written by the three.js scene loop and read by
// lightweight hud components (compass) that run their own rAF — so the hud
// updates without triggering react re-renders every frame.

let yaw = 0;
let x = 0;
let z = 0;

export function reportCamera(y: number, cx: number, cz: number): void {
  yaw = y;
  x = cx;
  z = cz;
}

export function readCamera(): { yaw: number; x: number; z: number } {
  return { yaw, x, z };
}
