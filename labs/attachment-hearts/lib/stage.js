// The stage every heart hovers over: a basalt crag lit from above by the heart's own light, ground mist rolling
// past, and a crimson silk drape snaking through the rocks (the poster's red cloth). All seamless in a loop of D.

import { clamp, fit, noise, noise2, TAU, rand } from "../../../src/core/index.js";
import { shapeGeom, tone, bayer, facetRand } from "./heart.js";

// the crag: a few overlapping boulders with a broken, noisy outline, standing on the floor (y = 0)
const BLOBS = [[0, -2, 31, 12], [-17, 1, 17, 8], [18, 1, 18, 9], [-6, -7, 15, 8], [9, -6, 13, 8], [-33, 3, 8, 4], [34, 3, 9, 4.5]];
function cragSd(x, y) {
  let f = 1e9;
  for (const [bx, by, rx, ry] of BLOBS) f = Math.min(f, Math.hypot((x - bx) / rx, (y - by) / ry));
  // crags are jagged: knock chunks off the outline, sharper towards the top
  const jag = 0.16 * noise2(x * 0.16, y * 0.22, 7) + 0.08 * noise(x * 0.55, 3);
  return (f - 1 + jag) * 11 + (y > 3 ? 99 : 0);
}
const crag = (seed) => shapeGeom(`crag|${seed}`, cragSd, { X0: -46, Y0: -22, W: 92, H: 27, cell: 5.5, seed: seed + 3, jit: 0.9, R: 7, bulge: 60 });

/**
 * The crag, drawn in drawBack. light: [color, k] of the heart's glow falling on its top. R is the rock ramp
 * (8 steps). The heart's glow sits glowX, glowY above.
 */
export function pedestal(p, o, R, glow, k = 1) {
  const g = crag(o.seed ?? 1);
  // up and a little towards us: the heart above is the key light here
  const Lx = 0, Ly = -0.86, Lz = 0.5;
  p.shade(g.X0, g.Y0, g.X0 + g.W, g.Y0 + g.H, (x, y, out) => {
    const i = g.i(Math.floor(x), Math.floor(y));
    if (i < 0 || g.sd[i] > 0) return;
    const up = g.i(Math.floor(x), Math.floor(y) - 1), top = up < 0 || g.sd[up] > 0;
    const left = g.i(Math.floor(x) - 1, Math.floor(y)), right = g.i(Math.floor(x) + 1, Math.floor(y));
    const edgeL = left < 0 || g.sd[left] > 0, edgeR = right < 0 || g.sd[right] > 0;
    // flat facets like split basalt, a little random tilt each
    const id = g.cid[i], tx = (facetRand(id, 1) - 0.5) * 0.5, ty = (facetRand(id, 2) - 0.5) * 0.4;
    const nx = g.fnx[i] + tx, ny = g.fny[i] + ty, nz = g.fnz[i], L = Math.hypot(nx, ny, nz);
    const lit = Math.max(0, (nx * Lx + ny * Ly + nz * Lz) / L), dark = clamp((y + 4) / 9);
    let lv = 0.9 + 3.6 * lit * lit - 1.2 * dark + 0.5 * (facetRand(id, 3) - 0.5);
    if (g.edge[i] < 0.7 && facetRand(id, 4) < 0.7) lv -= 1.2;          // cracks between the plates
    if (top) lv += 1.6;                                                  // the lip catches the light
    if (edgeL || edgeR) lv -= 0.6;
    out.c = tone(R, clamp(lv, 0, 7), x, y);
    if (top || g.sd[i] > -1.2) out.c = top ? tone(R, clamp(lv, 2, 7), x, y) : R[0];
    // the heart's light pooled on the upturned faces
    const pool = Math.max(0, 1 - Math.hypot(x / 34, (y + 10) / 14));
    if (glow && lit > 0.3) { out.l = glow; out.k = k * (0.07 + 0.3 * pool * pool) * (lit - 0.3) * (top ? 1.8 : 1); }
  });
}

/**
 * Ground mist: soft puffs drifting sideways across the floor, wrapping round so the loop has no seam. layer
 * "back" draws the far puffs (behind the crag), "front" the near ones. c is a colour number, a its strength.
 */
export function mist(p, t, D, M, { layer = "back", seed = 1, n = 14, a = 0.22, w = 176, y = 0, tint } = {}) {
  for (let i = 0; i < n; i++) {
    const front = rand(i, seed, 5) < 0.45;
    if ((layer === "front") !== front) continue;
    const dir = rand(i, seed, 1) < 0.5 ? 1 : -1, laps = 1 + (i % 2);
    const x = ((rand(i, seed, 2) * w + (dir * laps * w * t) / D) % w + w) % w - w / 2;
    const yy = y - 2 + rand(i, seed, 3) * (front ? 7 : -9) + Math.sin(TAU * (t / D) + i) * 0.8;
    const r = 6 + rand(i, seed, 4) * 9, k = a * (front ? 0.85 : 1);
    p.disc(x, yy, r, (d) => (d < 0.55 ? M[3] : M[2]), (d) => k * (1 - d * d));
    if (tint) p.glow(x, yy - 1, r, tint, 0.03);
  }
}

/**
 * A crimson silk drape crossing the floor behind the crag: a ribbon that ripples and twists, its two faces
 * shaded differently. C is the crimson ramp (9 steps). Ripples travel `waves` whole cycles a loop.
 */
export function silk(p, t, D, C, { y = -3, x0 = -82, x1 = 82, amp = 3.5, width = 4.2, waves = 1, seed = 1 } = {}) {
  const ph = (TAU * waves * t) / D;
  for (let x = Math.floor(x0); x <= x1; x++) {
    const u = (x - x0) / (x1 - x0), sag = Math.sin(u * Math.PI) * 3;
    const cy = y + sag + amp * Math.sin(x * 0.075 - ph + seed) + 1.6 * Math.sin(x * 0.19 + ph * 2 + seed * 2);
    const tw = Math.cos(x * 0.05 + ph + seed * 3), hw = width * (0.35 + 0.65 * Math.abs(tw));
    const face = tw > 0, fold = 0.5 + 0.5 * Math.sin(x * 0.31 - ph * 2);
    // fade the ends into the dark
    const fade = Math.min(1, (x - x0) / 14, (x1 - x) / 14);
    for (let yy = Math.floor(cy - hw); yy <= Math.ceil(cy + hw); yy++) {
      const v = (yy + 0.5 - (cy - hw)) / (2 * hw);
      if (v < 0 || v > 1) continue;
      let lv = face ? 3.4 + 2.2 * fold : 2.2 + 1.2 * fold;
      if (v < 0.22) lv += 1.2;
      else if (v > 0.8) lv -= 1.4;
      p.dot(x, yy, tone(C, clamp(lv, 1, 7), x, yy), fade);
    }
    if (face && fold > 0.85) p.light(x, Math.round(cy - hw + 1), C[6], 0.12 * fade);
  }
}

/** A light pool on the floor and crag top under the heart. */
export function floorLight(p, c, k, y = -8, rx = 40) {
  p.glow(0, y, rx, c, k);
}
