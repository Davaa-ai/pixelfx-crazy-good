// Inspired by barrier techniques in dark fantasy anime. Generic motifs only: no characters, symbols or logos.
import { Rng, rng, rand, fit, bolt, ngon, clamp, smooth, ease, hex, WHITE, TAU } from "../../../src/core/index.js";
import { clipTo, rect, fillConvex, W, H } from "../../../src/fx/transitions/_lib.js";
import { ribbon, glowPath, strokeLevel } from "../_lib.js";

export const meta = {
  name: "Domain expansion",
  desc: "A seal, then a void unfolds across the screen: sigils turning in its sky, a grid rushing over its floor. Slashes rain through it faster and faster, until it cracks into shards.",
  tags: ["jujutsu kaisen", "anime", "screen", "domain", "barrier", "slash", "shatter", "transition", "one-shot"],
  size: [W, H],
  origin: [0, 0],
  duration: 4.0,
  loop: false,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#05030c", "#120826", "#2a1050", "#4c1c8c", "#7a30c8", "#a860f0", "#e0b8ff", "#ffffff"],
    red: ["#2a0510", "#6a0c1c", "#b01428", "#ee2a3a", "#ff6a70", "#ffc0c0", "#ffffff"],
    seed: 9,
  },
};

const CX = W / 2, CY = 92, OPEN0 = 0.4, OPEN1 = 1.25, BARRAGE0 = 1.3, BARRAGE1 = 2.95, CRACK = 2.95, BREAK = 3.28, REACH = 215, HORIZON = 120;
const BLACK = hex("#05030a"), DARK = hex("#0a0518");
const DIRS = [-0.52, 0.36, 1.12, -1.22];

export function create(o) {
  const C = fit(o.palette, 8), Rd = fit(o.red, 7), R = new Rng(o.seed);
  // the slashes: each its own moment, spot and length, clustering round a few directions and coming faster
  const N = 44, cuts = Array.from({ length: N }, (_, i) => {
    const a = DIRS[i % DIRS.length] + R.range(-0.14, 0.14), L = R.range(110, 270), x = CX + R.range(-80, 80), y = CY + R.range(-46, 46);
    return { t: BARRAGE0 + (BARRAGE1 - BARRAGE0) * Math.pow(i / N, 1.5), a, L, x, y, w: R.range(2.2, 4) };
  });
  // the cracks that run out from the middle when it fails
  const cracks = Array.from({ length: 11 }, (_, i) => bolt(R, CX, CY, CX + Math.cos((i / 11) * TAU + R.range(-0.2, 0.2)) * 260, CY + Math.sin((i / 11) * TAU + R.range(-0.2, 0.2)) * 260, { jag: 0.14, depth: 4 }));
  // the shards: rings of sectors, every corner jittered once and shared, so they tile like cracked glass
  const RAD = [0, 30, 66, 108, 152, 200, 270], NS = 14, a0 = R.range(0, TAU);
  const V = RAD.map((r, i) => Array.from({ length: i ? NS : 1 }, (_, k) => {
    const a = a0 + (k / NS) * TAU + (i ? R.range(-0.09, 0.09) : 0), rr = r + (i && i < RAD.length - 1 ? R.range(-7, 7) : 0);
    return [CX + Math.cos(a) * rr, CY + Math.sin(a) * rr];
  }));
  const SH = [];
  for (let i = 0; i < RAD.length - 1; i++)
    for (let k = 0; k < NS; k++) {
      const k2 = (k + 1) % NS, pts = i === 0 ? [[CX, CY], V[1][k], V[1][k2]] : [V[i][k], V[i][k2], V[i + 1][k2], V[i + 1][k]];
      const mx = pts.reduce((m, q) => m + q[0], 0) / pts.length, my = pts.reduce((m, q) => m + q[1], 0) / pts.length, g = rng(o.seed, i, k);
      SH.push({ pts, mx, my, v: g.range(0.5, 1.4), spin: g.range(-2.6, 2.6), fall: g.range(0.7, 1.4), dx: (mx - CX) / 160, dy: (my - CY) / 100 });
    }
  const radius = (t) => (t < OPEN0 ? 0 : REACH * ease.outQuart(clamp((t - OPEN0) / (OPEN1 - OPEN0))));

  return {
    update() {},
    draw(p, t) {
      const q = clipTo(p), r = radius(t);
      const light = (x, y, c, k) => q.light(x, y, c, k);
      // ---- the seal: a black point with a white rim, crossed fingers of light, rings out
      if (t < OPEN0 + 0.25) {
        const g = clamp(t / OPEN0), rr = 2 + 5 * ease.outCubic(g);
        if (t > 0.08) {
          q.circle(CX, CY, rr + 1, WHITE);
          q.circle(CX, CY, rr, BLACK);
        }
        for (const s of [-1, 1]) {
          const L = 22 * ease.outBack(clamp(t / 0.22)) * (1 - smooth(OPEN0 - 0.05, OPEN0 + 0.2, t));
          q.line(CX - L, CY - s * L * 0.55, CX + L, CY + s * L * 0.55, C[6], 0.9);
          q.line(CX - L, CY - s * L * 0.55 + 1, CX + L, CY + s * L * 0.55 + 1, C[4], 0.8);
        }
        for (let k = 0; k < 2; k++) {
          const ph = (t * 2.4 + k / 2) % 1;
          q.ring(CX, CY, 6 + 40 * ph, 1, C[5], (1 - ph) * 0.8 * g);
        }
        q.glow(CX, CY, 28, C[4], 0.55 * g);
      }
      // ---- the void: a circle of dark that opens from the seal, until the cracks take it
      const alive = t < BREAK;
      if (r > 1 && alive) {
        const dim = 1 - smooth(CRACK - 0.05, BREAK, t), dark = DARK;
        // the cover, row by row
        for (let y = Math.max(0, Math.floor(CY - r)); y <= Math.min(H - 1, Math.ceil(CY + r)); y++) {
          const dy = y + 0.5 - CY, dx = Math.sqrt(Math.max(0, r * r - dy * dy));
          const x0 = Math.max(0, Math.round(CX - dx)), x1 = Math.min(W, Math.round(CX + dx));
          if (x1 > x0) rect(q, x0, y, x1 - x0, 1, y > HORIZON ? C[1] : y > HORIZON - 22 ? C[1] : dark);
        }
        const inside = (x, y, m = 1) => (x - CX) * (x - CX) + (y - CY) * (y - CY) < (r - m) * (r - m);
        // its sky: a great circle of sigils turning, a hexagram in it, a slow ash
        const spin = t * 0.5, SKY = [CX, 58];
        for (const [rad, c, dash] of [[58, C[3], 6], [44, C[4], 4]]) {
          for (let a = 0; a < TAU; a += 1 / rad) {
            const on = Math.floor(((a + spin * (rad > 50 ? 1 : -1.4)) / TAU) * (rad > 50 ? 36 : 24)) % 2 === 0, x = SKY[0] + Math.cos(a) * rad, y = SKY[1] + Math.sin(a) * rad * 0.9;
            if (on && inside(x, y)) q.dot(x, y, c, dim);
          }
        }
        for (let k = 0; k < 24; k++) {
          const a = spin + (k / 24) * TAU, x0 = SKY[0] + Math.cos(a) * 46, y0 = SKY[1] + Math.sin(a) * 46 * 0.9, x1 = SKY[0] + Math.cos(a) * 56, y1 = SKY[1] + Math.sin(a) * 56 * 0.9;
          if (inside(x1, y1)) q.line(x0, y0, x1, y1, C[5], 0.8 * dim);
        }
        for (const off of [0, Math.PI / 3]) {
          const pts = ngon(SKY[0], SKY[1], 38, 3, -spin * 0.7 + off - Math.PI / 2).map(([x, y]) => [x, SKY[1] + (y - SKY[1]) * 0.9]);
          if (pts.every(([x, y]) => inside(x, y))) q.polyline([...pts, pts[0]], C[4], dim);
        }
        q.glow(SKY[0], SKY[1], 62, C[3], 0.18 * dim);
        // its floor: a grid running at him, lines through the vanishing point, bars rushing nearer
        for (let k = -9; k <= 9; k++) {
          const xb = CX + k * 46;
          for (let u = 0.02; u <= 1; u += 0.012) {
            const x = CX + (xb - CX) * u * 1.0, y = HORIZON + (H - HORIZON) * u;
            if (inside(x, y)) q.dot(x, y, u > 0.6 ? C[4] : C[3], dim * (0.3 + 0.7 * u));
          }
        }
        for (let k = 0; k < 7; k++) {
          const u = ((k + t * 1.4) % 7) / 7, y = HORIZON + (H - HORIZON) * u * u;
          for (let x = 0; x < W; x += 2) if (inside(x, y)) q.dot(x, y, u > 0.5 ? C[5] : C[3], dim * (0.25 + 0.75 * u));
        }
        q.glow(CX, HORIZON, 110, C[3], 0.08 * dim);
        // ash
        for (let i = 0; i < 46; i++) {
          const g = rng(o.seed, i, 5), x = (g.range(0, W) + t * g.range(-6, 6) + W) % W, y = (g.range(0, H) - t * g.range(8, 22) + 4 * H) % H;
          if (inside(x, y)) q.dot(x, y, g.chance(0.3) ? C[6] : C[4], dim * 0.8);
        }
        // the front of it, bright while it is still opening
        const front = 1 - smooth(OPEN1 - 0.1, OPEN1 + 0.35, t);
        for (let a = 0; a < TAU; a += 0.7 / r) {
          const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r;
          if (x < 0 || x >= W || y < 0 || y >= H) continue;
          const n = rand(Math.floor(a * r * 0.3), Math.floor(t * 24));
          q.dot(x, y, n < 0.5 ? WHITE : Rd[5], 1);
          q.dot(CX + Math.cos(a) * (r - 1.2), CY + Math.sin(a) * (r - 1.2), C[5], 1);
          q.dot(CX + Math.cos(a) * (r - 2.4), CY + Math.sin(a) * (r - 2.4), C[3], 0.8);
          if (front > 0 && n > 0.7) light(x, y, Rd[4], 0.55 * front);
        }
        // ---- the slashes: sure hits, a white frame to start, then thin, bright and endless
        if (t >= BARRAGE0 && t < BREAK) {
          if (t < BARRAGE0 + 1 / 30) {
            rect(q, 0, 0, W, H, WHITE);
            for (let k = 0; k < 4; k++) {
              const a = DIRS[k], x = CX + Math.cos(a + 1.57) * (k - 1.5) * 26, y = CY + Math.sin(a + 1.57) * (k - 1.5) * 26;
              ribbon(q, [[x - Math.cos(a) * 240, y - Math.sin(a) * 240], [x + Math.cos(a) * 240, y + Math.sin(a) * 240]], { w: (u) => 5 * Math.sin(Math.PI * u) + 0.8, c: () => BLACK });
            }
          } else
            for (const s of cuts) {
              const u = t - s.t;
              if (u < 0 || u > 0.9) continue;
              const lvl = strokeLevel(t, s.t), grow = ease.outExpo(clamp(u / 0.05)), ca = Math.cos(s.a), sa = Math.sin(s.a), h = s.L / 2;
              const A = [s.x - ca * h, s.y - sa * h], Bp = [s.x - ca * h + ca * s.L * grow, s.y - sa * h + sa * s.L * grow];
              if (lvl > 0)
                ribbon(q, [A, Bp], { w: (v) => s.w * lvl * Math.pow(Math.sin(Math.PI * clamp(v * 0.9 + 0.05)), 0.5) + 0.6, c: (v, w) => (Math.abs(w) < 0.4 ? WHITE : Math.abs(w) < 0.75 ? Rd[5] : Rd[3]), a: clamp(lvl * 1.6) });
              else if (u < 0.9) q.line(A[0], A[1], Bp[0], Bp[1], Rd[2], 0.5 * (1 - u / 0.9));
              if (lvl > 0.5) glowPath(q, [A, Bp], 9, Rd[4], 0.35 * lvl, 16);
            }
        }
        // ---- the cracks, running from the middle, white-hot, as it fails
        if (t >= CRACK) {
          const g = ease.outCubic(clamp((t - CRACK) / 0.3));
          for (const c of cracks) {
            const n = Math.floor(c.length * g), pts = c.slice(0, n + 1);
            q.polyline(pts, WHITE);
            q.polyline(pts.map(([x, y]) => [x + 1, y]), Rd[4], 0.8);
            glowPath(q, pts, 8, C[5], 0.3, 18);
          }
          q.glow(CX, CY, 90, C[6], 0.4 * g);
        }
      }
      // ---- the shards: the void falls apart and is gone
      if (t >= BREAK) {
        const u = t - BREAK, fade = 1 - clamp(u / 0.6);
        if (fade > 0) {
          for (const s of SH) {
            const e = u * (40 + 110 * s.v), spin = s.spin * u, c = Math.cos(spin), sn = Math.sin(spin), dx = s.dx * e, dy = s.dy * e + 760 * s.fall * u * u;
            const pts = s.pts.map(([x, y]) => [s.mx + (x - s.mx) * c - (y - s.my) * sn + dx, s.my + (x - s.mx) * sn + (y - s.my) * c + dy]);
            fillConvex(q, pts, (x, y) => (y > HORIZON ? C[1] : DARK), fade);
            q.polyline([...pts, pts[0]], Rd[4], fade * 0.9);
          }
          if (u < 0.3) {
            q.ring(CX, CY, 8 + 200 * ease.outCubic(u / 0.3), 2, WHITE, 1 - u / 0.3);
            q.glow(CX, CY, 110, C[6], 0.6 * (1 - u / 0.3));
          }
        }
      }
    },
  };
}
