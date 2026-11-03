// Shared bits for the Attachment Hearts lab: the palettes, the heart's geometry (a signed-distance outline, a
// domed surface and Voronoi facets, built once and cached as a per-pixel G-buffer), lighting and dither helpers.
// Only imports from src/core, so the whole lab folder can be deleted without touching the library.

import { clamp, smooth, rand, hex, TAU } from "../../../src/core/index.js";

// ---- palettes, dark to bright
/** Heart's blood: ink, wine, crimson, scarlet, coral, a bone-white core. The main ramp of every heart. */
export const CRIMSON = ["#0a0408", "#1e0610", "#3f0a1a", "#6e1024", "#a8182e", "#e0303c", "#ff6f66", "#ffc4b4", "#fff4ec"];
/** Volcanic basalt with a warm cast: rock shells, debris, the pedestal. */
export const BASALT = ["#050407", "#0c0a0f", "#151217", "#201b22", "#2e272e", "#41373d", "#5a4c50", "#7c6a69"];
/** Blackened iron, cold blue in the highlights: armour plates. */
export const IRON = ["#060709", "#0e1116", "#181d25", "#252c37", "#36404e", "#4f5b6d", "#74829a", "#a9b6cb", "#eef3fb"];
/** Oxblood leather and lacing. */
export const LEATHER = ["#0b0505", "#1d0c0a", "#341512", "#4f2119", "#6e3322", "#94502f", "#bd7a4a"];
/** Glacier ice: deep crevasse blue to snow white. */
export const FROST = ["#060c1f", "#0d1d40", "#17366c", "#24599c", "#3b86c6", "#6fb5e4", "#acdcf6", "#e2f6ff", "#ffffff"];
/** Magma: cooled crust to white-hot. */
export const MAGMA = ["#120404", "#2e0905", "#5c1407", "#982709", "#d24a0c", "#f7801a", "#ffbb3c", "#ffe68a", "#fffbe2"];
/** Dawn gold: amber shadow to white light. */
export const AURUM = ["#160d06", "#36210c", "#6b4416", "#a7701f", "#dca33a", "#f5cd67", "#ffe8a3", "#fff7dc", "#ffffff"];
/** Ground mist, cool violet grey. */
export const MIST = ["#121018", "#231f2c", "#3a3445", "#575063", "#7d7589", "#a59db0"];

// ---- dither
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/** Ordered-dither threshold 0..1 for the pixel cell holding (x, y). */
export const bayer = (x, y) => BAYER[((Math.floor(y) & 3) << 2) | (Math.floor(x) & 3)];
/** The ramp colour for a fractional level: solid bands with a narrow dithered seam between them, like pixel art. */
export function tone(R, level, x, y, seam = 0.32) {
  const f = level - Math.floor(level);
  return R[clamp(Math.floor(level) + (smooth(seam, 1 - seam, f) > bayer(x, y) ? 1 : 0), 0, R.length - 1)];
}

// ---- light: one key light from the upper left, towards us. Screen space: x right, y down, z out of the screen.
const LN = Math.hypot(-0.5, -0.62, 0.6);
export const LIGHT = [-0.5 / LN, -0.62 / LN, 0.6 / LN];
const HN = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2] + 1);
const HALF = [LIGHT[0] / HN, LIGHT[1] / HN, (LIGHT[2] + 1) / HN];
/** Lambert term of a unit normal against the key light. */
export const lambert = (nx, ny, nz) => Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
/** Blinn specular term of a unit normal, sharpened by power. */
export const specular = (nx, ny, nz, power = 24) => Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]) ** power;

// ---- the heart: Inigo Quilez's exact heart distance, tip at (0, 0), lobes up to y = 1.104, y up.
export function sdHeartUnit(x, y) {
  x = Math.abs(x);
  if (y + x > 1) return Math.hypot(x - 0.25, y - 0.75) - Math.SQRT2 / 4;
  const m = 0.5 * Math.max(x + y, 0);
  return Math.sqrt(Math.min(x * x + (y - 1) * (y - 1), (x - m) * (x - m) + (y - m) * (y - m))) * Math.sign(x - y);
}
/** Signed distance in px from the outline of a heart of size S centred on (0, 0), screen y down (inside < 0). */
export const sdHeart = (x, y, S, wide = 1.06) => sdHeartUnit(x / (S * wide), 0.552 - y / S) * S;

const GEOMS = new Map();
const cellId = (i, j) => (i + 512) * 1024 + (j + 512);

/**
 * The heart's G-buffer for size S, built once and cached: for every pixel of a box round it (offsets from its
 * centre, screen y down) the signed distance to the outline (px), a domed normal, and a Voronoi facet: its id,
 * its neighbour across the nearest edge, the distance to that edge (px), the facet's centre and the dome's normal
 * at that centre (so a facet shades flat, like a cut stone). `cell` is the facet size in px.
 *
 * Read it with g.i(x, y) (integer offsets; -1 outside the box) and the typed arrays, or g.rim for outline points.
 */
export function heartGeom(S, { cell = 9, seed = 1, jit = 0.85, dome = 0.36, wide = 1.06 } = {}) {
  const key = ["heart", S, cell, seed, jit, dome, wide].join("|");
  const X0 = -Math.ceil(0.66 * S * wide) - 6, Y0 = -Math.ceil(0.6 * S) - 6;
  return shapeGeom(key, (x, y) => sdHeart(x, y, S, wide), { X0, Y0, W: -X0 * 2, H: -Y0 * 2, cell, seed, jit, R: dome * S, bulge: S * 1.6 });
}

/**
 * The same G-buffer for any shape given by a signed distance sd(x, y) in px (inside < 0) over the box
 * [X0, X0 + W) x [Y0, Y0 + H). R is how far in the dome rises; bulge (px) adds an overall roundness. Cached by key.
 */
export function shapeGeom(key, sd, { X0, Y0, W, H, cell = 9, seed = 1, jit = 0.85, R = 16, bulge = 80 }) {
  let g = GEOMS.get(key);
  if (g) return g;
  const N = W * H;
  // the dome: height rises over R px in from the outline, a rounded pillow; normal from its gradient
  const domeN = (x, y, out) => {
    const d = Math.max(0, -sd(x, y)), e = 0.6;
    const gx = (sd(x + e, y) - sd(x - e, y)) / (2 * e), gy = (sd(x, y + e) - sd(x, y - e)) / (2 * e);
    const u = Math.min(d, R) / R, dh = u < 1 ? (1 - u) / Math.sqrt(Math.max(0.02, 1 - (1 - u) * (1 - u))) : 0;
    // a gentle overall bulge too, so the middle isn't a flat plateau
    const bx = x / bulge, by = y / bulge;
    let nx = dh * gx + bx, ny = dh * gy + by, nz = 1;
    const L = Math.hypot(nx, ny, nz);
    out[0] = nx / L; out[1] = ny / L; out[2] = nz / L;
    return out;
  };
  const g0 = {
    cell, seed, W, H, X0, Y0, sdf: sd,
    sd: new Float32Array(N), nx: new Float32Array(N), ny: new Float32Array(N), nz: new Float32Array(N),
    cid: new Int32Array(N), nid: new Int32Array(N), edge: new Float32Array(N),
    ccx: new Float32Array(N), ccy: new Float32Array(N), fnx: new Float32Array(N), fny: new Float32Array(N), fnz: new Float32Array(N),
    rim: [],
    i(x, y) {
      const ix = x - X0, iy = y - Y0;
      return ix < 0 || iy < 0 || ix >= W || iy >= H ? -1 : iy * W + ix;
    },
  };
  const n = [0, 0, 0], fnCache = new Map(), feat = (i, j) => [i + 0.5 + (rand(i, j, seed) - 0.5) * jit, j + 0.5 + (rand(i, j, seed + 31) - 0.5) * jit];
  for (let iy = 0; iy < H; iy++)
    for (let ix = 0; ix < W; ix++) {
      const k = iy * W + ix, x = X0 + ix + 0.5, y = Y0 + iy + 0.5, d = sd(x, y);
      g0.sd[k] = d;
      domeN(x, y, n);
      g0.nx[k] = n[0]; g0.ny[k] = n[1]; g0.nz[k] = n[2];
      // Voronoi, two passes (nearest point, then the exact distance to the nearest bisector)
      const qx = x / cell, qy = y / cell, ci = Math.floor(qx), cj = Math.floor(qy);
      let best = 1e9, mi = 0, mj = 0, mx = 0, my = 0;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const [fx, fy] = feat(ci + di, cj + dj), dd = (fx - qx) ** 2 + (fy - qy) ** 2;
          if (dd < best) { best = dd; mi = ci + di; mj = cj + dj; mx = fx - qx; my = fy - qy; }
        }
      let edge = 1e9, ni = mi, nj = mj;
      for (let dj = -2; dj <= 2; dj++)
        for (let di = -2; di <= 2; di++) {
          if (!di && !dj) continue;
          const [fx, fy] = feat(mi + di, mj + dj), ox = fx - qx, oy = fy - qy, ex = ox - mx, ey = oy - my, el = Math.hypot(ex, ey);
          if (el < 1e-6) continue;
          const e = ((mx + ox) * 0.5 * ex + (my + oy) * 0.5 * ey) / el;
          if (e < edge) { edge = e; ni = mi + di; nj = mj + dj; }
        }
      const id = cellId(mi, mj);
      g0.cid[k] = id;
      g0.nid[k] = cellId(ni, nj);
      g0.edge[k] = edge * cell;
      const cx = (qx + mx) * cell, cy = (qy + my) * cell;
      g0.ccx[k] = cx; g0.ccy[k] = cy;
      let fn = fnCache.get(id);
      if (!fn) fnCache.set(id, (fn = domeN(cx, cy, [0, 0, 0]).slice()));
      g0.fnx[k] = fn[0]; g0.fny[k] = fn[1]; g0.fnz[k] = fn[2];
    }
  // outline points, with the outward normal, sorted round the heart from the top going clockwise
  for (let iy = 1; iy < H - 1; iy++)
    for (let ix = 1; ix < W - 1; ix++) {
      const k = iy * W + ix, d = g0.sd[k];
      if (d > 0 || d <= -1) continue;
      const gx = g0.sd[k + 1] - g0.sd[k - 1], gy = g0.sd[k + W] - g0.sd[k - W], L = Math.hypot(gx, gy) || 1;
      const x = X0 + ix, y = Y0 + iy;
      g0.rim.push({ x, y, nx: gx / L, ny: gy / L, a: Math.atan2(x, -y) });
    }
  g0.rim.sort((a, b) => a.a - b.a);
  GEOMS.set(key, (g = g0));
  return g;
}

/** A per-facet random number 0..1 (stable across frames): k picks which one. */
export const facetRand = (id, k, seed = 0) => rand(id, k, seed + 977);
/** A per-edge random number 0..1, the same from both sides of the edge. */
export const edgeRand = (a, b, k = 0) => rand(Math.min(a, b), Math.max(a, b), k + 409);

/** Normalise a 3-vector in place-ish: returns [x, y, z] unit. */
export function unit(x, y, z) {
  const L = Math.hypot(x, y, z) || 1;
  return [x / L, y / L, z / L];
}

// ---- loop timing
/** Gaussian pulse round time b, wrapping in a loop of length D: 1 at b, falling over w seconds. */
export function pulse(t, b, w, D) {
  let d = Math.abs(t - b) % D;
  d = Math.min(d, D - d);
  return Math.exp(-((d / w) ** 2));
}
/** The strongest of several beats (a list of times) at t. */
export const beats = (t, list, w, D) => list.reduce((m, b) => Math.max(m, pulse(t, b, w, D)), 0);
/** Time since an event at b in a loop of length D (0..D), for one-shot things that should wrap seamlessly. */
export const since = (t, b, D) => (((t - b) % D) + D) % D;

/** A tiny pixel heart (5 x 4), the gesture of affection: drawn centred on (x, y). */
export function tinyHeart(p, x, y, c, hi, a = 1) {
  const X = Math.round(x) - 2, Y = Math.round(y) - 2;
  const rows = ["##.##", "#####", ".###.", "..#.."];
  for (let r = 0; r < 4; r++) for (let q = 0; q < 5; q++) if (rows[r][q] === "#") p.dot(X + q, Y + r, c, a);
  if (hi) p.dot(X + 1, Y + 1, hi, a);
}

export { TAU, hex };
