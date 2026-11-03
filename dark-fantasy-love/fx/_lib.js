// Shared helpers for the Dark Fantasy Love pack (files starting with _ are helpers, not effects):
// gothic hearts with optional gold filigree, 3D tumbling rose petals, blooming pixel roses,
// void light-cutout (unlight), fast shock rings, and cached actor silhouette inspection.

import { clamp, TAU, WHITE, Rng, hex } from "../../src/core/index.js";

export const VELVET = ["#12040a", "#2b0714", "#540d24", "#8a1638", "#c4264e", "#f25576", "#ffa8ba", "#fff0f4"];
export const GILDED = ["#160d05", "#36200b", "#683e14", "#a46620", "#dc9834", "#ffd06b", "#fff2ba", "#ffffff"];
export const BRIAR = ["#0e0609", "#210e14", "#3d1a22", "#5e2b32", "#874448", "#b56a68"];
export const VEIL = ["#06040b", "#130c21", "#25173d", "#3d2660", "#5e3d8c", "#8c69bc", "#c4a8eb", "#f2e8ff"];
export const TEAR = ["#0a101d", "#16243d", "#28456e", "#4673a8", "#74aae0", "#b2dcff", "#e6f5ff", "#ffffff"];

/** Signed-ish gothic heart field: <= 0 is inside a pointed gothic heart of half-size s at (0, 0). */
export function inGothicHeart(dx, dy, s) {
  if (s <= 0.4) return false;
  const x = dx / s, y = -dy / s + 0.18;
  if (Math.abs(x) > 1.18 || y < -1.15 || y > 1.05) return false;
  // sharper gothic point at the bottom than a round cartoon heart
  const xx = Math.abs(x), yy = y < 0 ? y * 0.92 : y * 1.04;
  const a = xx * xx + yy * yy - 0.82 * Math.pow(xx, 0.78) * (y > -0.2 ? 1 : 0.72);
  if (y < -0.15) return xx <= (1.12 + y) * 0.96;
  return a <= 0.42 && !(xx < 0.16 && y > 0.52 + xx * 1.6);
}

/**
 * Draw a crisp pixel-art gothic heart centered at (cx, cy) with scale s, shaded top-left to bottom-right
 * in ramp (8 steps dark->bright), 1px dark rim, specular catchlight, and optional gold filigree cage.
 */
export function drawGothicHeart(p, cx, cy, s, C, opts = {}) {
  if (s < 1) return;
  const a = opts.a ?? 1, white = opts.white, G = opts.gold ?? null, crack = opts.crack ?? 0;
  const E = Math.ceil(s * 1.3) + 2, X0 = Math.round(cx), Y0 = Math.round(cy);
  const inside = (ix, iy) => inGothicHeart(ix, iy, s);
  for (let iy = -E; iy <= E; iy++) {
    for (let ix = -E; ix <= E; ix++) {
      if (!inside(ix, iy)) {
        if (inside(ix - 1, iy) || inside(ix + 1, iy) || inside(ix, iy - 1) || inside(ix, iy + 1)) {
          p.dot(X0 + ix, Y0 + iy, G && (ix + iy) % 3 === 0 ? G[1] : C[0], a);
        }
        continue;
      }
      if (white) {
        p.dot(X0 + ix, Y0 + iy, WHITE, a);
        continue;
      }
      const nx = ix / s, ny = iy / s;
      // crack lines spiderwebbing from center
      if (crack > 0) {
        const c1 = Math.abs(nx * 0.85 + ny * 0.52 - 0.05), c2 = Math.abs(nx * -0.6 + ny * 0.8 + 0.08), c3 = Math.abs(nx * 0.25 - ny * 0.92);
        const r = Math.hypot(nx, ny);
        if (r < crack * 1.25 && (c1 < 0.09 || (crack > 0.35 && c2 < 0.08) || (crack > 0.65 && c3 < 0.08))) {
          p.dot(X0 + ix, Y0 + iy, r < crack * 0.7 ? WHITE : C[7], a);
          p.light(X0 + ix, Y0 + iy, C[6], 0.45 * a);
          continue;
        }
      }
      // optional tarnished gold reliquary bands crossing the heart
      if (G && (Math.abs(ny + 0.05) < 0.11 || (Math.abs(nx) < 0.11 && ny > -0.45))) {
        const glit = nx + ny < -0.25 ? G[6] : nx + ny < 0.2 ? G[4] : G[2];
        p.dot(X0 + ix, Y0 + iy, glit, a);
        continue;
      }
      // directional pixel-art shading from top-left (-0.6, -0.75)
      const light = (-nx * 0.62 - ny * 0.78 + 0.25);
      let col = light > 0.68 ? C[6] : light > 0.32 ? C[5] : light > -0.08 ? C[4] : light > -0.45 ? C[3] : C[2];
      // specular glint on left lobe
      if (nx > -0.68 && nx < -0.28 && ny > -0.68 && ny < -0.28) col = nx < -0.42 && ny < -0.42 ? WHITE : C[7];
      p.dot(X0 + ix, Y0 + iy, col, a);
    }
  }
}

/**
 * Draw a single 3D-oriented rose petal at (cx, cy): length s, screen angle rot, 3D tumble tilt (-1..1).
 * C is an 8-step dark->bright ramp.
 */
export function drawPetal(p, cx, cy, s, rot, tilt, C, a = 1) {
  if (s < 0.8 || a <= 0.02) return;
  if (s < 1.8) {
    p.dot(cx, cy, tilt > 0 ? C[5] : C[3], a);
    if (s > 1.2) p.dot(cx + Math.cos(rot), cy + Math.sin(rot), C[4], a);
    return;
  }
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const wScale = Math.max(0.22, Math.abs(tilt)) * 0.68;
  const R = Math.ceil(s) + 1;
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const u = (dx * ca + dy * sa) / s; // -1 base .. +1 lip
      const v = (-dx * sa + dy * ca) / (s * wScale);
      if (u < -0.85 || u > 1.0) continue;
      // cupped petal silhouette: wider near the upper lip, pinched toward the stem base
      const widthAtU = Math.sin(clamp((u + 0.85) / 1.85) * Math.PI) * (0.72 + 0.28 * clamp(u + 0.5));
      if (Math.abs(v) > widthAtU) continue;
      const edge = Math.abs(v) > widthAtU - 0.28 || u > 0.76;
      const col = edge
        ? (u > 0.2 && tilt > -0.2 ? C[6] : C[1])
        : (tilt > 0.15 ? (u > 0.1 ? C[5] : C[4]) : (u > 0.2 ? C[4] : C[2]));
      p.dot(cx + dx, cy + dy, col, a);
    }
  }
}

/** Simulated fluttering 3D rose petals that drift, spin, catch air resistance, and settle on y = 0. */
export class PetalSim {
  constructor(rng, groundY = 0) {
    this.R = rng;
    this.groundY = groundY;
    this.list = [];
  }
  spawn(x, y, vx, vy, life, size = 2.6, delay = 0) {
    const R = this.R;
    this.list.push({
      x, y, vx, vy, life, max: life, size, delay,
      rot: R.range(0, TAU), vrot: R.sign() * R.range(3, 9),
      phase: R.range(0, TAU), vphase: R.range(5, 11),
      sway: R.range(0, TAU), rest: false,
    });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const q = this.list[i];
      if (q.delay > 0) { q.delay -= dt; continue; }
      if ((q.life -= dt) <= 0) { this.list.splice(i, 1); continue; }
      if (q.rest) continue;
      q.phase += q.vphase * dt;
      const flat = Math.abs(Math.cos(q.phase));
      // aerodynamic flutter: flat face catches air and drifts sideways
      q.vy += (115 + (1 - flat) * 95) * dt;
      q.vx += Math.sin(q.phase * 0.7 + q.sway) * 55 * dt;
      q.vx -= q.vx * (2.2 + flat * 1.8) * dt;
      q.vy -= q.vy * (1.4 + flat * 1.9) * dt;
      q.rot += q.vrot * dt * 0.45;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.y >= this.groundY - 0.5 && q.vy > 0) {
        q.y = this.groundY - 0.5;
        q.rest = true;
      }
    }
  }
  draw(p, C, layer = "front") {
    for (let i = 0; i < this.list.length; i++) {
      const q = this.list[i];
      if (q.delay > 0) continue;
      if (((i % 4 === 0) ? "back" : "front") !== layer) continue;
      const k = q.life / q.max;
      const a = Math.min(1, k * 3.5);
      if (q.rest) {
        p.dot(q.x - 1, q.y, C[2], a);
        p.dot(q.x, q.y, C[4], a);
        p.dot(q.x + 1, q.y, C[5], a);
        continue;
      }
      drawPetal(p, q.x, q.y, q.size, q.rot, Math.cos(q.phase), C, a);
    }
  }
}

/**
 * Draw a blooming pixel-art gothic rose at (cx, cy) with outer radius r and bloom 0..1.
 * C is an 8-step dark->bright crimson ramp. Crisp dark spiral folds + pointed dark sepals at 1x scale.
 */
export function drawRose(p, cx, cy, r, bloom, rot, C, a = 1, white = false) {
  if (r < 1 || bloom <= 0.02 || a <= 0.02) return;
  const R = r * (0.38 + 0.62 * bloom);
  if (white) {
    p.circle(cx, cy, R, WHITE, a);
    return;
  }
  // 3 pointed dark briar sepals peeking out from behind the petals
  if (R >= 3.2) {
    for (let i = 0; i < 3; i++) {
      const sa = rot + 0.4 + (i * TAU) / 3, tipR = R + 2.1 * bloom;
      const tx = cx + Math.cos(sa) * tipR, ty = cy + Math.sin(sa) * tipR * 0.9;
      p.line(cx, cy, tx, ty, C[0], a);
      p.dot(cx + Math.cos(sa) * (R + 0.8), cy + Math.sin(sa) * (R + 0.8) * 0.9, C[1], a);
    }
  }
  // dark shadow base
  p.circle(cx, cy, R + 0.7, C[0], a);
  p.circle(cx, cy, R, C[2], a);
  // 5 outer cupped petals with dark spiral fold between each
  for (let i = 0; i < 5; i++) {
    const ang = rot + (i * TAU) / 5;
    const d = R * 0.48 * bloom;
    const px = cx + Math.cos(ang) * d, py = cy + Math.sin(ang) * d * 0.88;
    const pr = R * 0.52;
    p.circle(px, py, pr, py < cy ? C[4] : C[3], a);
    // dark crease separating overlapping petals so it reads as a rose, not a ball
    const ca = ang + 0.58;
    p.line(cx + Math.cos(ca) * R * 0.2, cy + Math.sin(ca) * R * 0.2, cx + Math.cos(ca) * R * 0.88, cy + Math.sin(ca) * R * 0.82, C[1], a);
    // bright velvet lip on top-left facing edge
    const lx = px + Math.cos(ang - 0.35) * pr * 0.72, ly = py + Math.sin(ang - 0.35) * pr * 0.72;
    p.dot(lx, ly, py < cy ? C[6] : C[5], a);
  }
  // inner spiral whorl
  for (let i = 0; i < 3; i++) {
    const ang = -rot * 1.3 + (i * TAU) / 3 + 0.5;
    const px = cx + Math.cos(ang) * R * 0.25, py = cy + Math.sin(ang) * R * 0.22;
    p.dot(px, py, C[5], a);
    p.dot(px - 0.7, py - 0.7, C[6], a);
  }
  // deep velvet throat + dew catchlight
  p.dot(cx, cy, C[0], a);
  p.dot(cx + 1, cy, C[2], a);
  p.dot(cx - 1, cy - 1, C[7], a);
  p.glow(cx, cy, R * 2.1 + 3, C[4], 0.3 * bloom * a);
}

/** Remove additive light inside a dark silhouette so obsidian/eclipse shapes stay stark black. */
export function unlight(p, x0, y0, x1, y1, dark, keep = 0) {
  const L = p.L, w = p.w, ox = p.ox, oy = p.oy;
  p.each(x0, y0, x1, y1, (x, y, sx, sy) => {
    if (!dark(x, y)) return;
    const i = (sy - oy) * w + (sx - ox), d = L[i];
    if (!d) return;
    if (keep <= 0) L[i] = 0;
    else L[i] = (255 << 24) | ((((d >>> 16) & 255) * keep) << 16) | ((((d >>> 8) & 255) * keep) << 8) | ((d & 255) * keep);
  });
}

/** Fast thin annulus ring visiting only ring pixels. */
export function ringFast(p, x, y, r, w, c, a = 1) {
  if (r <= 0 || a <= 0.01) return;
  const r0 = Math.max(0, r - w), r02 = r0 * r0, r12 = r * r;
  const fc = typeof c === "function", fa = typeof a === "function";
  for (let py = Math.floor(y - r); py <= Math.ceil(y + r); py++) {
    const cy = py + 0.5, dy = cy - y, dy2 = dy * dy;
    if (dy2 >= r12) continue;
    const xo = Math.sqrt(r12 - dy2), xi = dy2 < r02 ? Math.sqrt(r02 - dy2) : 0;
    for (let px = Math.floor(x - xo), x1 = Math.ceil(x + xo); px <= x1; px++) {
      const cx = px + 0.5, dx = cx - x;
      if (xi > 0 && dx > -xi && dx < xi) {
        px = Math.max(px, Math.floor(x + xi) - 1);
        continue;
      }
      const d2 = dx * dx + dy2;
      if (d2 < r12 && d2 >= r02) {
        const v = (Math.sqrt(d2) - r0) / (r - r0 || 1), ang = fc || fa ? Math.atan2(dy, dx) : 0;
        p.dot(cx, cy, fc ? c(v, ang) : c, fa ? a(v, ang) : a);
      }
    }
  }
}

const ACTOR_CACHE = new WeakMap();
/** Cached silhouette & outline cells of stockActor mask. */
export function actorOutline(a) {
  const m = a.mask;
  let s = ACTOR_CACHE.get(m);
  if (s) return s;
  const { w, h, data } = m, on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[y * w + x] > 0;
  const body = [], rim = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (on(x, y)) body.push([x, y]);
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++)
      if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) rim.push([x, y]);
  s = { w, h, on, body, rim };
  ACTOR_CACHE.set(m, s);
  return s;
}
