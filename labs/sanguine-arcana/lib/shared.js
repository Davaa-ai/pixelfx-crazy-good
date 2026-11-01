// Shared bits for the Sanguine Arcana lab: the palettes, the tarot card (gilt frame, title plate, foil sheen),
// and the heart. Only imports from src/core, so the whole lab folder can be deleted without touching the library.

import { clamp, smooth, seg, fit, TAU } from "../../../src/core/index.js";

/** Oxblood magic, dark to bright: ink plum, wine, crimson, rose, a bone-white heart. */
export const BLOOD = ["#0b0610", "#220b1c", "#471026", "#781631", "#b3233f", "#e24c5c", "#ff9a98", "#fff1e8"];
/** Candle gilt, dark to bright: the card frame and anything holy-ish. */
export const GILT = ["#120b0d", "#2d1b16", "#5a3a1d", "#8f5f27", "#c8933b", "#efc65e", "#ffe8a0", "#fffbe8"];
/** Cold moon silver, dark to bright: the second voice. */
export const MOON = ["#070a18", "#111a36", "#243460", "#41598f", "#6f93bf", "#a8c7e4", "#dcefff", "#ffffff"];
/** Grave violet, dark to bright: flames that burn for the dead. */
export const VIOLET = ["#0a0414", "#1b0b36", "#35146a", "#5a22a6", "#8a3fe0", "#b980ff", "#e2c4ff", "#faf2ff"];

// ---- the card: 80 x 128, origin at its centre. The scene lives in the window; the frame is drawn over the rest.
export const CARD = { w: 80, h: 128, ox: 40, oy: 64 };
/** The scene window in local px (x1, y1 exclusive): 66 x 88. */
export const WIN = { x0: -33, y0: -50, x1: 33, y1: 38 };
export const inWin = (x, y) => x >= WIN.x0 && x < WIN.x1 && y >= WIN.y0 && y < WIN.y1;

/** The meta every card shares; pass what's yours (name, desc, tags, duration, loop, options). */
export function cardMeta(m) {
  return {
    size: [CARD.w, CARD.h], origin: [CARD.ox, CARD.oy], fps: 30, bg: "dark", loop: true, ...m,
    tags: ["sanguine arcana", "tarot", "card", ...(m.tags ?? [])],
    options: { palette: BLOOD, gilt: GILT, moon: MOON, seed: 1, ...(m.options ?? {}) },
  };
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/** Ordered-dither threshold 0..1 for the pixel cell holding (x, y). */
export const bayer = (x, y) => BAYER[((Math.floor(y) & 3) << 2) | (Math.floor(x) & 3)];
/** The colour of a fractional ramp level, dithered between steps so gradients band like pixel art. */
export const tone = (R, level, x, y) => R[clamp(Math.floor(level + bayer(x, y)), 0, R.length - 1)];

/**
 * The window's backdrop: a vertical gradient through the ramp R from level `from` (top) to `to` (bottom),
 * dithered, darkened towards the edges by `vig`. Call it in drawBack.
 */
export function windowBack(p, R, from, to, vig = 1.4) {
  const cy = (WIN.y0 + WIN.y1) / 2;
  p.shade(WIN.x0, WIN.y0, WIN.x1, WIN.y1, (x, y) => {
    const v = (y - WIN.y0) / (WIN.y1 - WIN.y0), dx = x / 38, dy = (y - cy) / 50, r = Math.sqrt(dx * dx + dy * dy);
    // solid bands with a narrow dithered seam between them, not a wash of checkerboard
    const level = from + (to - from) * v - vig * smooth(0.5, 1.15, r), f = level - Math.floor(level);
    return R[clamp(Math.floor(level) + (smooth(0.34, 0.66, f) > bayer(x, y) ? 1 : 0), 0, R.length - 1)];
  });
}

// the three pixels cut off each corner of the card
const corner = (L, R, T, B) => L + T < 2 || R + T < 2 || L + B < 2 || R + B < 2;

/**
 * The card's frame, drawn over the scene: ink edge, bevelled gilt band, a mat with corner gems, the window's
 * border, a numeral up top and a title plate below. { title, sub, numeral } are short strings (mini font).
 */
// the four strips of the card outside the window: top, bottom, left, right (frame work happens only here)
const STRIPS = [[-40, -64, 40, WIN.y0], [-40, WIN.y1, 40, 64], [-40, WIN.y0, WIN.x0, WIN.y1], [WIN.x1, WIN.y0, 40, WIN.y1]];

export function cardFront(p, o, { title, sub, numeral }) {
  const G = fit(o.gilt, 8), B = fit(o.palette, 8);
  const face = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), L = ix + 40, R = 39 - ix, T = iy + 64, Bm = 63 - iy;
    if (L < 0 || R < 0 || T < 0 || Bm < 0 || inWin(x, y) || corner(L, R, T, Bm)) return;
    const e = Math.min(L, R, T, Bm), lit = L === e || T === e;
    if (e === 0) return B[0];
    if (e === 1) return lit ? G[6] : G[3];
    if (e === 2) return lit ? G[5] : G[4];
    if (e === 3) return B[0];
    const dw = Math.max(WIN.x0 - ix, 0, ix - (WIN.x1 - 1), WIN.y0 - iy, 0, iy - (WIN.y1 - 1));
    return dw === 1 ? B[0] : dw === 2 ? G[3] : B[1];
  };
  for (const [x0, y0, x1, y1] of STRIPS) p.shade(x0, y0, x1, y1, face);
  // corner gems: a rose heart in a gilt cross
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const gx = sx * 36 - (sx > 0 ? 0 : 0), gy = sy * 60 - (sy > 0 ? 0 : 0);
      p.px(gx - 1, gy, G[5]); p.px(gx + 1, gy, G[4]); p.px(gx, gy - 1, G[6]); p.px(gx, gy + 1, G[4]);
      p.px(gx, gy, B[6]);
      p.glow(gx + 0.5, gy + 0.5, 5, B[5], 0.18);
    }
  // numeral, flanked by little rules
  if (numeral) {
    p.text(numeral, 0, -57, G[6], { align: "center" });
    const w = p.measure(numeral)[0] / 2 + 3;
    for (const s of [-1, 1]) {
      p.line(s * w, -55, s * (w + 9), -55, G[3]);
      p.px(s * (w + 10), -55, G[5]);
      p.px(s * (w + 12), -55, G[3]);
    }
  }
  // the plate
  p.rect(-31, 41, 62, 16, G[3]);
  p.rect(-30, 42, 60, 14, B[0]);
  for (const [x, y] of [[-31, 41], [30, 41], [-31, 56], [30, 56]]) p.px(x, y, B[1]);
  for (const x of [-32, 31]) { p.px(x, 48, G[5]); p.px(x, 49, G[4]); }
  p.text(title, 0, 43, G[6], { align: "center" });
  if (sub) p.text(sub, 0, 50, B[5], { align: "center" });
}

/** A slow diagonal glint across the whole card, once a loop: light only. t in 0..D. */
export function foilSheen(p, o, t, D, k = 0.2) {
  const u = seg(t / D, 0.12, 0.5), pos = -62 + 124 * u, G = fit(o.gilt, 8);
  if (u <= 0 || u >= 1) return;
  p.shade(-40, -64, 40, 64, (x, y, out) => {
    if (x > 40 || y > 64) return;
    const d = Math.abs(x * 0.74 + y * 0.52 - pos), h = 1 - d / 7;
    if (h > 0) { out.l = G[6]; out.k = h * h * k; }
  });
}

/** Cut the card's corners out of both buffers, and any light that wandered outside. Call it last. */
export function clipCard(p) {
  for (const [x0, y0] of [[-40, -64], [37, -64], [-40, 61], [37, 61]])
    p.each(x0, y0, x0 + 3, y0 + 3, (x, y, sx, sy) => {
      const ix = Math.floor(x), iy = Math.floor(y);
      if (ix < -40 || ix > 39 || iy < -64 || iy > 63 || !corner(ix + 40, 39 - ix, iy + 64, 63 - iy)) return;
      const i = (sy - p.oy) * p.w + (sx - p.ox);
      p.C[i] = 0;
      p.L[i] = 0;
    });
}

// ---- the heart: (x² + y² − 1)³ − x²y³ ≤ 0, y up. A unit heart spans x ±1.14, y −1 … 1.25.
export const heartF = (nx, ny) => {
  const a = nx * nx + ny * ny - 1;
  return a * a * a - nx * nx * ny * ny * ny;
};

/**
 * A lit heart of "radius" s at (cx, cy), shaded through the ramp R: a dark rim, a body, a glossy highlight upper
 * left. `lift` (0..1) pushes it brighter, for a beat. Returns nothing; a is alpha.
 */
export function heart(p, cx, cy, s, R, { lift = 0, a = 1, rim = 2, base = 4 } = {}) {
  const n = R.length - 1, inside = (x, y) => heartF((x - cx) / s, -(y - cy) / s + 0.12) <= 0;
  p.shade(cx - 1.3 * s, cy - 1.4 * s, cx + 1.3 * s, cy + 1.15 * s, (x, y, out) => {
    if (!inside(x, y)) return;
    const nx = (x - cx) / s, ny = -(y - cy) / s + 0.12, hl = Math.exp(-((nx + 0.45) ** 2 + (ny - 0.5) ** 2) / 0.07);
    out.a = a;
    // a one-pixel rim: glossy where the light falls (upper left), wine-dark where it doesn't
    if (!inside(x - 1, y) || !inside(x, y - 1)) return void (out.c = R[Math.min(n, Math.floor(base) + 2 + (lift > 0.5 ? 1 : 0))]);
    if (!inside(x + 1, y) || !inside(x, y + 1)) return void (out.c = R[rim]);
    // cel-shaded: solid bands, dithered only in a narrow seam between them
    const level = base - 0.4 + 0.9 * (-nx * 0.5 + ny * 0.7) + 2.2 * hl + 1.2 * lift, f = level - Math.floor(level);
    out.c = R[clamp(Math.floor(level) + (smooth(0.3, 0.7, f) > bayer(x, y) ? 1 : 0), 0, n)];
  });
}

/** The pixels of a heart's outline as [x, y] points, for light or sparks to follow: n points round it. */
export function heartRim(cx, cy, s, n = 32) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, tx = 16 * Math.sin(a) ** 3, ty = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
    pts.push([cx + (tx / 16) * 1.14 * s, cy - (ty / 13) * 1.12 * s + 0.12 * s * 0]);
  }
  return pts;
}
