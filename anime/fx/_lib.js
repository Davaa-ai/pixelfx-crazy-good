// Shared by the anime effects (the leading _ keeps the tools from listing it as an effect).
// Ribbons that follow a path and taper, glow along a path, manga speed-line bursts, stepped stroke flicker.

import { clamp, rng, TAU, WHITE } from "../../src/core/index.js";

/** Points evenly spaced along a polyline: { pts, L } with L its length. */
export function pathSamples(pts, step = 0.8) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1], n = Math.max(1, Math.ceil(L / step)), out = [];
  let j = 1;
  for (let k = 0; k <= n; k++) {
    const s = (k / n) * L;
    while (j < pts.length - 1 && cum[j] < s) j++;
    const seg = cum[j] - cum[j - 1] || 1, u = clamp((s - cum[j - 1]) / seg);
    out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u]);
  }
  return { pts: out, L };
}

/**
 * A ribbon along a polyline, tail first and head last, tapering as you like: w(u) is its full width at u (0 tail .. 1 head),
 * c(u, v, i) the color across it (v from -1 to 1; 0 skips the pixel), a the alpha (a number, or fn(u, v)).
 */
export function ribbon(p, pts, { w, c, a = 1, step = 0.7 }) {
  const S = pathSamples(pts, step).pts, n = S.length, fa = typeof a === "function";
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1 || 1), [x, y] = S[i], [x0, y0] = S[Math.max(0, i - 1)], [x1, y1] = S[Math.min(n - 1, i + 1)];
    let dx = x1 - x0, dy = y1 - y0;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const W = w(u);
    if (W < 0.45) continue;
    const h = W / 2;
    for (let v = -h; v <= h + 1e-6; v += 0.5) {
      const vv = h ? v / h : 0, col = c(u, vv, i);
      if (col) p.dot(x - dy * v, y + dx * v, col, fa ? a(u, vv) : a);
    }
  }
}

/** Soft light along a polyline: a glow every `every` px. */
export function glowPath(p, pts, r, c, k, every = 7) {
  const S = pathSamples(pts, every).pts;
  for (let i = 1; i < S.length; i++) p.glowLine(S[i - 1][0], S[i - 1][1], S[i][0], S[i][1], r, c, k);
}

/**
 * A manga speed-line burst round (x, y): rays from radius r0 out to about r1, each its own length and thickness,
 * alternating colors a and b. grow 0..1 pushes them outward; k fades them out through the dither.
 */
export function speedBurst(p, x, y, r0, r1, n, seed, a, b, k = 1, grow = 1) {
  for (let i = 0; i < n; i++) {
    const g = rng(seed, i, 77), an = (i / n) * TAU + g.range(-0.12, 0.12), L = r0 + (r1 - r0) * g.range(0.45, 1), s0 = r0 + (L - r0) * (1 - grow) * 0.6, s1 = s0 + (L - s0) * grow;
    const ca = Math.cos(an), sa = Math.sin(an), thick = g.chance(0.4) ? 1 : 0;
    for (let d = s0; d <= s1; d += 0.6) {
      const u = (d - s0) / (s1 - s0 || 1), col = g.chance(0.5) ? a : b;
      p.dot(x + ca * d, y + sa * d, col, k * (1 - u * 0.6));
      if (thick && u < 0.7) p.dot(x + ca * d - sa, y + sa * d + ca, col, k * 0.8 * (1 - u));
    }
  }
}

/** A stepped flicker for a lightning-like stroke that starts at ts: 1 on its first frame, then stuttering down to 0. */
const FLICK = [1, 0.72, 0.3, 0.95, 0.5, 0.8, 0.22, 0.4, 0.12];
export const strokeLevel = (t, ts, fps = 30) => (t < ts ? 0 : FLICK[Math.floor((t - ts) * fps + 1e-4)] ?? 0);
/** The brightest of several strokes [{ t, k }] at time t. */
export const strokesAt = (t, strokes) => Math.max(0, ...strokes.map((s) => strokeLevel(t, s.t) * s.k));
