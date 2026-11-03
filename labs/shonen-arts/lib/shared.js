// Shared bits for the Shonen Arts lab: the energy palettes and a few drawing helpers every technique leans on.
// Only imports from src/core, so the whole lab folder can be deleted without touching the library.

import { clamp, TAU, poseAt, bolt, forks } from "../../../src/core/index.js";

/** Spiral chakra, dark to bright: night navy, deep azure, sky, a white-cyan core. */
export const AZURE = ["#040817", "#0a1a44", "#11307c", "#1858c2", "#2a94ef", "#78cdff", "#d0f1ff", "#ffffff"];
/** Lightning chakra, dark to bright: ink violet, electric blue, icy white. Reads cold and loud. */
export const VOLT = ["#08061c", "#1a1556", "#2d36a8", "#3f6ae8", "#62a8ff", "#a8dcff", "#e8f8ff", "#ffffff"];
/** Summoning smoke, dark to bright: soot, ash, bone. */
export const ASH = ["#0d0b10", "#211d26", "#3a3440", "#5b5462", "#837b8a", "#aea6b2", "#dcd6dc", "#fbf8f6"];
/** Ki flame, dark to bright: ember red to gold to white. */
export const KI = ["#160806", "#3d1208", "#7a220c", "#c2410f", "#f07a1a", "#ffb93a", "#ffe89a", "#fffdf0"];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/** Ordered-dither threshold 0..1 for the pixel cell holding (x, y). */
export const bayer = (x, y) => BAYER[((Math.floor(y) & 3) << 2) | (Math.floor(x) & 3)];
/** The colour of a fractional ramp level, dithered between steps so gradients band like pixel art. */
export const tone = (R, level, x, y) => R[clamp(Math.floor(level + bayer(x, y)), 0, R.length - 1)];

/**
 * A point on a great circle of a sphere at (cx, cy) of radius r, tilted by (ax, az): the orbit's plane is turned
 * ax about the screen x axis, then az about the view axis. Returns [x, y, z] with z > 0 towards us.
 */
export function orbit(cx, cy, r, ax, az, th) {
  const x = Math.cos(th) * r, y0 = Math.sin(th) * r, y = y0 * Math.cos(ax), z = y0 * Math.sin(ax);
  const ca = Math.cos(az), sa = Math.sin(az);
  return [cx + x * ca - y * sa, cy + x * sa + y * ca, z];
}

/** An angle wrapped into [0, TAU). */
export const wrapA = (a) => ((a % TAU) + TAU) % TAU;

/** Where the near hand is at t on an act's pose track, in px from the effect's origin: [x, y]. Effects that ride a hand use it. */
export function handAt(poses, t) {
  const q = poseAt(poses, Math.max(t, poses[0][0]));
  return [(q.x ?? 0) + q.fx, (q.y ?? 0) + q.fy];
}

/**
 * A jagged lightning stroke from (x0, y0) to (x1, y1) with forks, as paths [{ pts, w }] (trunk first, w 1; forks thinner).
 * jag: how far the first midpoint may swing, as a share of the length. Straight spears want little jag, wild arcs a lot.
 */
export function zap(R, x0, y0, x1, y1, { jag = 0.25, depth = 4, forks: nf = 2, flen = 0.4 } = {}) {
  const trunk = bolt(R, x0, y0, x1, y1, { jag, depth }), L = Math.hypot(x1 - x0, y1 - y0), out = [{ pts: trunk, w: 1 }];
  for (const f of forks(R, trunk, { count: nf, len: L * flen, jag: jag * 1.3, spread: 0.8 })) out.push({ pts: f, w: 0.5 });
  return out;
}

// inking: pixels are gathered at a level (higher wins), then each is drawn once, so a fork's halo never covers a trunk's core
const INK = new Map();
const mark = (x, y, lvl) => {
  const key = (Math.floor(y) + 4096) * 8192 + Math.floor(x) + 4096, v = INK.get(key);
  if (!v || lvl > v) INK.set(key, lvl);
};
/**
 * Ink lightning paths: a deep halo, a pale body, a white core on the trunk, light along it. k 0..1 is its power: forks drop out
 * below 0.45, the halo below 0.35. C is an 8-step ramp. s scales the halo; glow scales the light.
 */
export function ink(p, paths, C, k = 1, { s = 1, glow = 0.5 } = {}) {
  if (k <= 0.03) return;
  for (const q of paths) {
    const trunk = q.w >= 1;
    if (!trunk && k < 0.45) continue;
    const pts = q.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.max(1, Math.hypot(bx - ax, by - ay));
      for (let d = 0; d <= l; d += 0.5) {
        const x = ax + ((bx - ax) * d) / l, y = ay + ((by - ay) * d) / l;
        if (k > 0.35) for (const [dx, dy] of HALO) mark(x + dx * s * (trunk ? 1.4 : 1), y + dy * s * (trunk ? 1.4 : 1), 1);
        if (trunk && k > 0.55) (mark(x + 0.6, y, 2), mark(x, y + 0.6, 2));
        mark(x, y, trunk ? (k > 0.25 ? 4 : 3) : 3);
      }
      if (i % 2 === 0) p.glow(ax, ay, (trunk ? 10 : 6) * (0.6 + 0.4 * k), C[4], glow * k * (trunk ? 1 : 0.6));
    }
  }
  const cols = [C[2], C[4], C[5], C[7]];
  for (const [key, v] of INK) {
    const x = (key % 8192) - 4096, y = Math.floor(key / 8192) - 4096;
    if (v === 1) p.dot(x, y, cols[0], Math.min(1, (k - 0.35) * 2.5));
    else p.px(x, y, cols[v - 1]);
  }
  INK.clear();
}
const HALO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
