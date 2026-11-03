// The summoning core every summon shares: the caster's hand seals and palm slam, the seal written onto the floor, a camera
// that starts close on the caster and pulls out fast to fit whatever arrives, and the shading helpers creatures are built from.
// Only imports from src/core and the lab's own shared.js.

import { READY, TAU, WHITE, clamp, lerp, seg, smooth, ease, hex, mix } from "../../../src/core/index.js";
import { tone, bayer } from "./shared.js";

/** Every summon plays on one 16:9 world stage, the floor at the origin: the camera decides how much of it you see. */
export const STAGE = { w: 384, h: 216, ox: 64, oy: 188 };

/** The meta every summon shares; pass what's yours (name, desc, tags, duration, options). */
export function summonMeta(m) {
  return {
    size: [STAGE.w, STAGE.h], origin: [STAGE.ox, STAGE.oy], fps: 30, bg: "ground", loop: false, actor: 2, ...m,
    tags: ["shonen arts", "summon", "seal", "creature", "camera", "one-shot", ...(m.tags ?? [])],
  };
}

// ---- the caster. Hand seals before the effect starts (t < 0), the palm slammed to the floor at t = 0, then he gets up and watches.
const SEAL = { turn: 1, crouch: 2, armsFront: true, ffx: 6, fbx: -6 };
const RAISE = { crouch: 1, lean: -2, fx: 4, fy: -40, bx: 10, by: -27, ffx: 7, fbx: -7 };
const SLAM = { crouch: 11, lean: 7, fx: 15, fy: -1, bx: -4, by: -18, ffx: 10, fbx: -11 };
const WATCH = { x: -4, crouch: 3, lean: -2, fx: 9, fy: -22, bx: 11, by: -25, ffx: 8, fbx: -9 };

/**
 * The caster's act. rise: when he gets up off the floor; hold: how long he watches; hits: the summon's own (quakes, roars), added
 * to the slam's. Nobody is hit: there's no target.
 */
export function summonAct({ rise = 0.9, hold = 4.6, hits = [], recoil = null } = {}) {
  const poses = [
    [-1.3, { ...READY }],
    [-1.06, { ...SEAL, fx: 4, fy: -27, bx: 7, by: -27 }, "snap"],
    [-0.88, { ...SEAL, fx: 5, fy: -31, bx: 6, by: -25 }, "snap"],
    [-0.7, { ...SEAL, fx: 3, fy: -25, bx: 8, by: -30 }, "snap"],
    [-0.52, { ...SEAL, fx: 6, fy: -29, bx: 6, by: -29, crouch: 4 }, "snap"],
    [-0.22, RAISE, "out"],
    [0, SLAM, "snap"],
    [0.45, { ...SLAM, crouch: 10, lean: 6 }],
    [rise, WATCH, "out"],
  ];
  // a summon that lands hard throws him back a step and he braces
  if (recoil !== null) poses.push([recoil, { ...WATCH, x: -9, crouch: 6, lean: -4, fx: 4, fy: -27, bx: 8, by: -29 }, "out"], [recoil + 0.6, { ...WATCH, x: -9 }]);
  poses.push([hold, { ...WATCH, x: recoil !== null ? -9 : -4, crouch: 2 }], [hold + 0.7, { ...READY, x: recoil !== null ? -9 : -4 }]);
  return {
    poses,
    hits: [{ t: 0, stop: 0.06, shake: 0.22, amp: 2, target: false }, ...hits.map((h) => ({ target: false, ...h }))],
    dust: [{ t: 0, x: 14, n: 9 }],
  };
}

// ---- the camera: { x, y, z } in local px (the centre of the view) and zoom (2 shows half the stage across)
const lerpZ = (a, b, u) => Math.exp(lerp(Math.log(a), Math.log(b), u));
/**
 * A camera for a summon at SX whose tallest point is `top` px above the floor and half-width `hw`. It frames the caster tight through
 * the seals, punches in on the slam, pans to the seal, pulls out fast (pullAt, over `pull` s) until the creature fits, and drifts back
 * in on the caster after it has gone (backAt).
 */
export function summonCamera({ SX, top, hw, pullAt, pull = 0.55, backAt }) {
  const W = STAGE.w, H = STAGE.h;
  // fit the caster (from x = -26) and the creature (to SX + hw + 12) across, its top under the frame
  const x0 = -26, x1 = SX + hw + 12, fitZ = Math.min(2, H / (top + 46), W / (x1 - x0));
  const near = { x: 4, y: -30, z: 2.6 };
  const mid = { x: SX * 0.5, y: -44, z: 2.1 };
  const far = { x: (x0 + x1) / 2, y: 26 - H / fitZ / 2, z: fitZ };
  const mixCam = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerpZ(a.z, b.z, u) });
  return (t) => {
    if (t < 0) return near;
    if (t < pullAt) {
      // the slam punches in for a few frames, then the camera follows the line of runes to the seal
      const punch = Math.max(0, 1 - t / 0.12) * 0.25;
      const c = mixCam(near, mid, ease.inOutCubic(seg(t, 0.12, Math.min(pullAt, 0.75))));
      return { ...c, z: c.z * (1 + punch) };
    }
    if (t < backAt) return mixCam(mid, far, ease.outCubic(seg(t, pullAt, pullAt + pull)));
    return mixCam(far, near, ease.inOutCubic(seg(t, backAt, backAt + 0.9)));
  };
}

/** The view a camera sees on a stage w x h whose origin is at (X, Y): a source rect { sx, sy, sw, sh } kept inside the stage. */
export function viewRect(cam, w, h, X, Y) {
  const z = Math.max(1, cam.z), sw = w / z, sh = h / z;
  return { sx: clamp(X + cam.x - sw / 2, 0, w - sw), sy: clamp(Y + cam.y - sh / 2, 0, h - sh), sw, sh };
}

/** How flat a ring of radius r lies on the floor: perspective, but its far edge never more than 14 px up, where it would float. */
export const flat = (r) => Math.min(0.2, 14 / Math.max(1, r));

// ---- the seal written on the floor
/**
 * A summoning seal at (cx, 0) on the floor, radius r, flattened into perspective. write 0..1 draws it round from the near side;
 * k is its brightness (fades it out). half: "back" for the far half (draw before the creature), "front" for the near half.
 * C is an 8-step ramp in the summon's element.
 */
export function sealCircle(p, cx, r, write, k, C, t, half) {
  if (k <= 0.02 || write <= 0) return;
  const sy = 0.22, keep = (ang) => (half === "back" ? Math.sin(ang) < 0 : Math.sin(ang) >= 0);
  // it dims by stepping down the ramp, solid; only the last of the fade is dithered, so it never turns to speckle
  const dim = Math.round((1 - clamp(k / 0.85)) * 4), col = (i) => C[Math.max(1, i - dim)], a = clamp(k / 0.3);
  const head = write * TAU, start = Math.PI / 2;
  const arcDots = (rr, c, thick) => {
    for (let a = 0, n = Math.ceil(rr * TAU * 1.3); a < n; a++) {
      const ang = start + (a / n) * TAU;
      if (!keep(ang) || (a / n) * TAU > head) continue;
      const near = head - (a / n) * TAU < 0.5 && write < 1;
      p.dot(cx + Math.cos(ang) * rr, Math.sin(ang) * rr * sy, near ? WHITE : col(c), a);
      if (thick) p.dot(cx + Math.cos(ang) * rr, Math.sin(ang) * rr * sy + 1, col(3), a);
    }
  };
  arcDots(r, 6, true);
  arcDots(r * 0.8, 5, false);
  arcDots(r * 0.36, 5, false);
  // glyph ticks between the rings, and a six-point star inside, turning slowly
  const nG = Math.round(r / 3.2);
  for (let i = 0; i < nG; i++) {
    const ang = start + (i / nG) * TAU + t * 0.25;
    if (!keep(ang) || ((i / nG) * TAU) > head) continue;
    const r0 = r * 0.84, r1 = r * (i % 3 ? 0.94 : 0.97), x0 = cx + Math.cos(ang) * r0, x1 = cx + Math.cos(ang) * r1;
    p.line(x0, Math.sin(ang) * r0 * sy, x1, Math.sin(ang) * r1 * sy, col(i % 3 ? 5 : 7), a);
  }
  if (write > 0.55) {
    const u = seg(write, 0.55, 1), pts = [];
    for (let i = 0; i < 6; i++) {
      const ang = -t * 0.35 + (i / 6) * TAU;
      pts.push([cx + Math.cos(ang) * r * 0.78, Math.sin(ang) * r * 0.78 * sy, Math.sin(ang)]);
    }
    for (let i = 0; i < 6; i++) {
      const pa = pts[i], pb = pts[(i + 2) % 6], mz = (pa[2] + pb[2]) / 2;
      if (half === "back" ? mz >= 0 : mz < 0) continue;
      p.line(pa[0], pa[1], lerp(pa[0], pb[0], u), lerp(pa[1], pb[1], u), col(5), a);
    }
  }
  // the seal lights the floor
  if (half === "front") p.glow(cx, 0, r * 1.1, C[4], 0.32 * k * Math.min(1, write * 2));
}

/** A line of runes written along the floor from the caster's palm (x0) to the seal (x1); u 0..1 how far it has run. */
export function runeTrail(p, x0, x1, u, k, C) {
  if (u <= 0 || k <= 0.02) return;
  const xe = lerp(x0, x1, u);
  for (let x = x0; x <= xe; x += 1) {
    const i = Math.round(x - x0), head = xe - x < 3;
    if (i % 6 === 0 || i % 6 === 2) p.dot(x, 1, head ? WHITE : C[5], k);
    if (i % 6 === 1) (p.dot(x, 0, C[6], k), p.dot(x, 2, C[4], k));
    if (i % 2 === 0) p.light(x, 0, C[4], 0.35 * k);
  }
}

// ---- shading. Creatures are built from shaded pieces, all clipped at a line (the floor, while they rise out of it).
let CLIP = Infinity, TOP = -Infinity;
/** Hide everything at or below y (the floor while a creature rises out of it); Infinity turns it off. */
export const clipBelow = (y) => (CLIP = y);
/** Hide everything above y (a creature being built from the ground up); -Infinity turns it off. */
export const clipAbove = (y) => (TOP = y);
/** Is (local) y hidden by the clips? */
export const clipped = (y) => y >= CLIP || y < TOP;

/**
 * A shaded ellipsoid (rock, bark, armour, a head): lit from the upper left, a 1 px dark rim, levels dithered through ramp R
 * (dark to bright, 5+ steps). o: { a, rim (false: no outline), lift (raise every level), lx, ly (the light) }.
 */
export function ball(p, cx, cy, rx, ry, R, o = {}) {
  const a = o.a ?? 1, lift = o.lift ?? 0, lx = o.lx ?? -0.55, ly = o.ly ?? -0.75, m = 1.15 / Math.max(1, Math.min(rx, ry));
  p.shade(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y) => {
    if (y >= CLIP || y < TOP) return;
    const nx = (x - cx) / rx, ny = (y - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1) return;
    if (o.rim !== false && 1 - Math.sqrt(d) < m) return p.dot(x, y, R[0], a);
    // cel bands with only a narrow dither where they meet, so big forms stay clean at 1x
    const z = Math.sqrt(1 - d), l = clamp(nx * lx + ny * ly + z * 0.6), lv = 0.7 + lift + l * (R.length - 1.8);
    p.dot(x, y, R[clamp(Math.floor(lv + (bayer(x, y) - 0.5) * 0.45 + 0.5), 0, R.length - 1)], a);
  });
}

/** A flat-shaded polygon (a plate, a facet, a blade) at ramp level lvl, outlined in R[0]. lvl may be a function (x, y). */
export function slab(p, pts, R, lvl, o = {}) {
  const a = o.a ?? 1;
  const n = R.length - 1, fl = typeof lvl === "function";
  // scanline fill: where each row crosses the edges, then the spans between, pixel centres in
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of pts) (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
  const xs = [];
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const cy = y + 0.5;
    if (cy >= CLIP || cy < TOP) continue;
    xs.length = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > cy !== yj > cy) xs.push(xi + ((cy - yi) * (xj - xi)) / (yj - yi));
    }
    xs.sort((u, v) => u - v);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.ceil(xs[k] - 0.5); x + 0.5 <= xs[k + 1]; x++) {
        const v = fl ? lvl(x + 0.5, cy) : lvl;
        p.dot(x, y, R[clamp(Math.floor(v + (bayer(x, y) - 0.5) * 0.45 + 0.5), 0, n)], a);
      }
  }
  if (o.rim === false) return;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    p.line(x0, y0, x1, y1, R[0], (u) => (clipped(lerp(y0, y1, u)) ? 0 : a));
  }
}

/** A line that respects the clip. */
export function seam(p, x0, y0, x1, y1, c, a = 1) {
  p.line(x0, y0, x1, y1, c, (u) => (clipped(lerp(y0, y1, u)) ? 0 : a));
}

/** Glowing eyes: a hot pixel pair with a soft light, k 0..1 how lit they are. */
export function eyes(p, x, y, gap, c, hot, k = 1) {
  if (k <= 0.05 || clipped(y)) return;
  for (const s of [-1, 1]) {
    p.px(x + s * gap, y, k > 0.6 ? hot : c);
    if (k > 0.5) p.px(x + s * gap + s, y, c);
    p.glow(x + s * gap, y, 7, c, 0.6 * k);
  }
}

export { tone, hex, mix, smooth, seg, clamp, lerp, ease, WHITE, TAU };
