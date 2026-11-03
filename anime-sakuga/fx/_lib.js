// Shared procedural sakuga helpers for the Anime Sakuga pack (files starting with _ are helpers, not effects):
// inverted obsidian-core Haki/Black-Flash lightning, additive light-carving (unlight), tilted Mach vapor cones,
// 3D tumbling isometric "Yutapon" rock cubes, anime speed streaks, crescent slashes, and actor silhouette cache.

import { clamp, TAU, WHITE, BLACK, INK, bolt, forks, poseAt } from "../../src/core/index.js";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** 4x4 ordered Bayer threshold 0..1 for pixel (x, y). */
export const bayer = (x, y) => BAYER[((Math.floor(y) & 3) << 2) | (Math.floor(x) & 3)];

/** Pick a crisp pixel-art step along ramp C for fractional level (0..C.length-1) using Bayer dithering. */
export const tone = (C, level, x, y) => C[clamp(Math.floor(level + bayer(x, y)), 0, C.length - 1)];

/** Near-hand position [x, y] in local effect coordinates at time t along act.poses. */
export function handAt(poses, t) {
  const q = poseAt(poses, Math.max(t, poses[0][0]));
  return [(q.x ?? 0) + (q.fx ?? 11), (q.y ?? 0) + (q.fy ?? -21)];
}

/** Far-hand position [x, y] in local effect coordinates at time t along act.poses. */
export function offHandAt(poses, t) {
  const q = poseAt(poses, Math.max(t, poses[0][0]));
  return [(q.x ?? 0) + (q.bx ?? 9), (q.y ?? 0) + (q.by ?? -21)];
}

/** Carve additive glow out of a dark core/silhouette so obsidian bolts and eclipse shapes stay stark pitch-black. */
export function unlight(p, x0, y0, x1, y1, darkFn, keep = 0) {
  const L = p.L, w = p.w, ox = p.ox, oy = p.oy;
  p.each(x0, y0, x1, y1, (x, y, sx, sy) => {
    if (!darkFn(x, y)) return;
    const i = (sy - oy) * w + (sx - ox), d = L[i];
    if (!d) return;
    if (keep <= 0) L[i] = 0;
    else L[i] = (255 << 24) | ((((d >>> 16) & 255) * keep) << 16) | ((((d >>> 8) & 255) * keep) << 8) | ((d & 255) * keep);
  });
}

/** Zero additive light at one exact local pixel cell (and optionally dim its 4 neighbors). */
export function unlightPx(p, x, y, keep = 0) {
  const sx = p.cellX(x, y) - p.ox, sy = p.cellY(x, y) - p.oy;
  if (sx < 0 || sy < 0 || sx >= p.w || sy >= p.h) return;
  const i = sy * p.w + sx, d = p.L[i];
  if (!d) return;
  p.L[i] = keep <= 0 ? 0 : (255 << 24) | ((((d >>> 16) & 255) * keep) << 16) | ((((d >>> 8) & 255) * keep) << 8) | ((d & 255) * keep);
}

// Reusable scratch map so inverted lightning never allocates per-pixel objects
const BOLT_MAP = new Map();
const HALO4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const RING8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]];

function markBolt(x, y, lvl) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const key = (iy + 2048) * 4096 + (ix + 2048);
  const prev = BOLT_MAP.get(key) || 0;
  if (lvl > prev) BOLT_MAP.set(key, lvl);
}

/**
 * Draw Conqueror's Haki / Black Flash inverted lightning:
 * A blazing crimson/colored outer sheath + additive glow wrapping a stark, pitch-black obsidian core
 * that carves through additive light so the black core never washes out.
 * C is an 8-step ramp (C[0] obsidian dark .. C[7] hot highlight).
 */
export function blackBolt(p, R, x0, y0, x1, y1, C, opts = {}) {
  const { jag = 0.24, depth = 4, nForks = 2, forkLen = 0.42, k = 1, thick = 1, glow = 0.42 } = opts;
  if (k <= 0.03) return;
  const trunk = bolt(R, x0, y0, x1, y1, { jag, depth });
  const L = Math.hypot(x1 - x0, y1 - y0);
  const paths = [{ pts: trunk, trunk: true }];
  if (nForks > 0 && k > 0.3) {
    for (const f of forks(R, trunk, { count: nForks, len: Math.max(8, L * forkLen), jag: jag * 1.25, spread: 0.85 })) {
      paths.push({ pts: f, trunk: false });
    }
  }

  // First pass: lay down outer crimson/aura additive glow along segments
  for (const q of paths) {
    const pts = q.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const segL = Math.max(1, Math.hypot(bx - ax, by - ay));
      if (i % 2 === 0 && glow > 0) {
        p.glow((ax + bx) * 0.5, (ay + by) * 0.5, (q.trunk ? 10 : 6) * (0.65 + 0.35 * k), C[5], glow * k * (q.trunk ? 1 : 0.55));
      }
      for (let d = 0; d <= segL; d += 0.5) {
        const x = ax + ((bx - ax) * d) / segL, y = ay + ((by - ay) * d) / segL;
        if (q.trunk) {
          if (k > 0.35) {
            for (const [dx, dy] of RING8) markBolt(x + dx, y + dy, 1);
          }
          for (const [dx, dy] of HALO4) markBolt(x + dx, y + dy, 2);
          if (thick > 1.2 && k > 0.55) {
            markBolt(x + 0.7, y, 4);
            markBolt(x, y + 0.7, 4);
            for (const [dx, dy] of HALO4) {
              markBolt(x + 0.7 + dx, y + dy, 2);
              markBolt(x + dx, y + 0.7 + dy, 2);
            }
          }
          markBolt(x, y, 4);
        } else {
          for (const [dx, dy] of HALO4) markBolt(x + dx, y + dy, 1);
          markBolt(x, y, k > 0.55 ? 3 : 2);
        }
      }
    }
  }

  // Second pass: paint crisp sheath pixels, then carve & paint pitch-black core on top
  const coreCol = INK;
  for (const [key, v] of BOLT_MAP) {
    const x = (key % 4096) - 2048, y = Math.floor(key / 4096) - 2048;
    if (v === 1) {
      p.dot(x, y, C[4], Math.min(1, k * 0.85));
    } else if (v === 2) {
      p.px(x, y, k > 0.65 ? C[6] : C[5]);
    } else if (v === 3) {
      // Fork core: thin dark inner vein tipped in hot crimson
      p.px(x, y, C[0]);
      unlightPx(p, x, y, 0.12);
    } else {
      // Trunk core: stark obsidian black, zeroing additive glow right on the bolt spine
      p.px(x, y, coreCol);
      unlightPx(p, x, y, 0);
    }
  }
  BOLT_MAP.clear();
}

/**
 * Draw standard bright anime electricity (white core, C[6]/C[4] sheath, additive glow).
 */
export function brightBolt(p, R, x0, y0, x1, y1, C, opts = {}) {
  const { jag = 0.24, depth = 4, nForks = 2, forkLen = 0.4, k = 1, glow = 0.4 } = opts;
  if (k <= 0.03) return;
  const trunk = bolt(R, x0, y0, x1, y1, { jag, depth });
  const L = Math.hypot(x1 - x0, y1 - y0);
  const paths = [{ pts: trunk, trunk: true }];
  if (nForks > 0 && k > 0.35) {
    for (const f of forks(R, trunk, { count: nForks, len: Math.max(7, L * forkLen), jag: jag * 1.25, spread: 0.85 })) {
      paths.push({ pts: f, trunk: false });
    }
  }
  for (const q of paths) {
    const pts = q.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const segL = Math.max(1, Math.hypot(bx - ax, by - ay));
      if (i % 2 === 0 && glow > 0) p.glow((ax + bx) * 0.5, (ay + by) * 0.5, q.trunk ? 9 : 5, C[5], glow * k * (q.trunk ? 1 : 0.5));
      for (let d = 0; d <= segL; d += 0.5) {
        const x = ax + ((bx - ax) * d) / segL, y = ay + ((by - ay) * d) / segL;
        if (k > 0.35) for (const [dx, dy] of HALO4) markBolt(x + dx, y + dy, 1);
        markBolt(x, y, q.trunk && k > 0.25 ? 3 : 2);
      }
    }
  }
  for (const [key, v] of BOLT_MAP) {
    const x = (key % 4096) - 2048, y = Math.floor(key / 4096) - 2048;
    if (v === 1) p.dot(x, y, C[3], Math.min(1, k * 0.8));
    else if (v === 2) p.px(x, y, C[6]);
    else p.px(x, y, WHITE);
  }
  BOLT_MAP.clear();
}

/**
 * Draw a tilted supersonic Mach shock-ring perpendicular to a horizontal strike at (cx, cy).
 * rx is the narrow horizontal tilt thickness (e.g. 4..8 px), ry is the vertical ring height (e.g. 14..32 px).
 * half: "back" (far side behind punch), "front" (near side in front), or "all".
 */
export function machRing(p, cx, cy, rx, ry, thick, C, a = 1, half = "all", hot = true) {
  if (ry < 1 || a <= 0.02) return;
  const steps = Math.max(24, Math.ceil(ry * 2.6));
  for (let i = 0; i < steps; i++) {
    const th0 = (i / steps) * TAU, th1 = ((i + 1) / steps) * TAU;
    const z = Math.cos((th0 + th1) * 0.5); // z < 0 back, z >= 0 front
    if (half === "back" && z >= 0) continue;
    if (half === "front" && z < 0) continue;
    const x0 = cx + Math.cos(th0) * rx, y0 = cy + Math.sin(th0) * ry;
    const x1 = cx + Math.cos(th1) * rx, y1 = cy + Math.sin(th1) * ry;
    const col = z >= 0 ? (hot ? WHITE : C[6]) : C[4];
    p.line(x0, y0, x1, y1, col, a * (z >= 0 ? 1 : 0.72));
    if (thick > 1.3 && z >= 0) {
      p.line(x0 - 1, y0, x1 - 1, y1, C[5], a * 0.8);
    }
  }
  if (half !== "back" && hot) {
    p.glow(cx + rx * 0.5, cy, ry * 0.85 + 4, C[5], 0.22 * a);
  }
}

/**
 * Draw a 3D shaded isometric "Yutapon Cube" (Yutaka Nakamura's signature orthogonal anime block debris).
 * C is an 8-step stone/energy ramp; seamCol optional hot rim/underlight color.
 */
export function drawYutaponCube(p, cx, cy, s, rot, tilt, C, a = 1, seamCol = 0) {
  if (s < 1 || a <= 0.02) return;
  if (s < 2.0) {
    p.dot(cx, cy, C[4], a);
    p.dot(cx + 1, cy + 1, C[1], a);
    return;
  }
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const R = Math.ceil(s * 1.45) + 1;
  const skew = 0.45 * Math.sin(tilt);
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      // Rotate into cube local screen coords
      const ux = (dx * ca + dy * sa) / s;
      const uy = (-dx * sa + dy * ca) / s;
      // Hexagonal isometric cube projection: |ux| <= 0.88, |uy +- 0.5*ux| <= 0.92
      const a1 = ux, a2 = uy + ux * (0.48 + skew * 0.2), a3 = uy - ux * (0.48 - skew * 0.2);
      if (Math.abs(a1) > 0.88 || Math.abs(a2) > 0.88 || Math.abs(a3) > 0.88) continue;
      const edge = Math.abs(a1) > 0.72 || Math.abs(a2) > 0.72 || Math.abs(a3) > 0.72;
      if (edge) {
        p.dot(cx + dx, cy + dy, seamCol && uy > 0.35 ? seamCol : C[0], a);
        continue;
      }
      // Three distinct orthographic faces meeting at (0, -0.08): top, left, right
      let col;
      if (uy < -0.08 - Math.abs(ux) * 0.42) {
        col = C[6]; // Top lit face
      } else if (ux < 0) {
        col = Math.abs(ux) < 0.14 ? C[5] : C[4]; // Near-left mid-lit face + crisp internal ridge highlight
      } else {
        col = C[2]; // Right shadow face
      }
      p.dot(cx + dx, cy + dy, col, a);
    }
  }
}

/** Deterministic simulator for tumbling isometric Yutapon debris cubes that bounce and settle on y = 0. */
export class YutaponSim {
  constructor(rng, groundY = 0) {
    this.R = rng;
    this.groundY = groundY;
    this.list = [];
  }
  spawn(x, y, vx, vy, life, size = 3.6, delay = 0, grav = 580) {
    const R = this.R;
    this.list.push({
      x, y, vx, vy, life, max: life, size, delay, grav,
      rot: R.range(0, TAU), vrot: R.sign() * R.range(4, 13),
      tilt: R.range(0, TAU), vtilt: R.range(3, 9),
      bounces: 0, rest: false,
    });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const q = this.list[i];
      if (q.delay > 0) { q.delay -= dt; continue; }
      if ((q.life -= dt) <= 0) { this.list.splice(i, 1); continue; }
      if (q.rest) continue;
      q.vy += q.grav * dt;
      q.vx -= q.vx * 1.1 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.vrot * dt;
      q.tilt += q.vtilt * dt;
      const floor = this.groundY - q.size * 0.45;
      if (q.grav > 0 && q.y >= floor && q.vy > 0) {
        q.y = floor;
        if (q.bounces < 2 && Math.abs(q.vy) > 42) {
          q.vy = -q.vy * 0.42;
          q.vx *= 0.68;
          q.vrot *= 0.6;
          q.bounces++;
        } else {
          q.vy = 0;
          q.vx = 0;
          q.rest = true;
        }
      }
    }
  }
  draw(p, C, layer = "front", seamCol = 0) {
    for (let i = 0; i < this.list.length; i++) {
      const q = this.list[i];
      if (q.delay > 0) continue;
      if (((i % 3 === 0) ? "back" : "front") !== layer) continue;
      const a = Math.min(1, (q.life / q.max) * 3.8);
      const s = q.size * Math.min(1, (q.life / q.max) * 2.6 + 0.35);
      drawYutaponCube(p, q.x, q.y, s, q.rot, q.tilt, C, a, seamCol);
    }
  }
}

/** Fast annulus ring visiting only ring pixels. */
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

/**
 * Radial anime impact burst lines centered at (cx, cy), strictly bounded inside maxR so they never spill canvas.
 * mode: "white" (white star + dark wedges) or "invert" (black core + white hot spikes).
 */
export function impactBurst(p, R, cx, cy, maxR, C, mode = "white", k = 1) {
  if (k <= 0.02) return;
  const n = 22;
  const coreCol = mode === "invert" ? BLACK : WHITE;
  const spikeCol = mode === "invert" ? WHITE : C[0];
  const accentCol = C[6];
  p.circle(cx, cy, maxR * 0.24 * k, coreCol);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + R.range(-0.07, 0.07);
    const rIn = maxR * R.range(0.14, 0.34);
    const rOut = maxR * R.range(0.58, 0.98) * k;
    if (rOut <= rIn + 2) continue;
    const hw = R.chance(0.3) ? 2.1 : 1.0;
    const ca = Math.cos(a), sa = Math.sin(a), nx = -sa * hw, ny = ca * hw;
    p.tri(
      cx + ca * rIn + nx, cy + sa * rIn * 0.78 + ny,
      cx + ca * rIn - nx, cy + sa * rIn * 0.78 - ny,
      cx + ca * rOut, cy + sa * rOut * 0.78,
      i % 3 === 0 ? accentCol : spikeCol,
      Math.min(1, k * 1.1)
    );
  }
}

/** Horizontal anime dash / iai speed streaks between x0 and x1 around yMid. */
export function speedStreaks(p, R, x0, x1, yMid, spreadY, n, C, a = 1) {
  if (a <= 0.02) return;
  for (let i = 0; i < n; i++) {
    const y = yMid + R.range(-spreadY, spreadY);
    const u0 = R.range(0, 0.45), u1 = Math.min(1, u0 + R.range(0.28, 0.72));
    const ax = x0 + (x1 - x0) * u0, bx = x0 + (x1 - x0) * u1;
    const hot = i % 3 === 0;
    p.line(ax, y, bx, y, (u) => (u > 0.65 ? (hot ? WHITE : C[6]) : u > 0.3 ? C[5] : C[3]), (u) => a * Math.sin(u * Math.PI));
    if (hot) p.glowLine(ax + (bx - ax) * 0.5, y, bx, y, 3, C[5], 0.2 * a);
  }
}

const ACTOR_CACHE = new WeakMap();
/** Cached silhouette & 1px outline cells of stockActor mask. */
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
