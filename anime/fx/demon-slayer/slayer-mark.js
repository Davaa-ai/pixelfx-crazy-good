// Inspired by power-up marks in shonen anime. Generic motifs only: no characters, costumes or logos.
import { cycle, fit, rand, rng, clamp, smooth, mix, WHITE } from "../../../src/core/index.js";
import { shape } from "../../../src/fx/status/_lib.js";

export const meta = {
  name: "Slayer mark",
  desc: "A heartbeat pulse: crimson veins race over the body and a mark flares on the brow, red light breathes round him and pink-white steam pours off, rising.",
  tags: ["demon slayer", "anime", "status", "buff", "power-up", "mark", "steam", "heartbeat", "loop"],
  size: [72, 116],
  origin: [36, 102],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#14040a", "#3a0a14", "#6a101c", "#a01824", "#d42a30", "#ff5a50", "#ff9a8a", "#ffe0d8"], seed: 6 },
};

// tense: the fists clenched, a little lower, a small flinch on each beat
const TENSE = { turn: 0.5, crouch: 3, lean: 1, fx: 9, fy: -19, bx: 8, by: -20, ffx: 8, fbx: -8 };
const FLINCH = { ...TENSE, crouch: 4, lean: 2, fy: -18, by: -19 };
export const act = {
  onBody: true,
  poses: [[0, TENSE], [0.06, FLINCH, "snap"], [0.2, TENSE, "snap"], [0.8, TENSE], [0.86, FLINCH, "snap"], [1.0, TENSE, "snap"], [1.6, TENSE]],
};

const D = meta.duration, BEAT = 0.8;
const since = (t) => ((t % BEAT) + BEAT) % BEAT;
// lub-dub: a strong pulse, a weaker one just behind it
const pulse = (t) => {
  const s = since(t);
  return Math.max(Math.exp(-s / 0.1), s > 0.17 ? 0.55 * Math.exp(-(s - 0.17) / 0.1) : 0);
};

// the veins: wandering lines over the body's own pixels, climbing from the legs and the hands, a few forking
const VEINS = new WeakMap();
function veins(a, seed, tick) {
  let per = VEINS.get(a.mask);
  if (!per) VEINS.set(a.mask, (per = new Map()));
  const key = seed * 2 + tick;
  if (per.has(key)) return per.get(key);
  const S = shape(a), R = rng(seed, tick, 31), out = [];
  const roots = S.body.filter(([, y]) => y > S.h * 0.42 && y < S.h * 0.95);
  const walk = (x, y, dirx, len, depth) => {
    const pts = [[x, y]];
    let dx = dirx, dy = -1;
    for (let i = 0; i < len; i++) {
      dx = Math.max(-1, Math.min(1, dx + (R.next() < 0.3 ? (R.next() < 0.5 ? -1 : 1) : 0)));
      let nx = x + dx, ny = y + (R.next() < 0.8 ? dy : 0);
      if (!S.on(nx, ny)) nx = x, (ny = y + dy);
      if (!S.on(nx, ny)) {
        nx = x + (dx || (R.next() < 0.5 ? 1 : -1));
        ny = y;
        if (!S.on(nx, ny)) break;
      }
      (x = nx), (y = ny);
      pts.push([x, y]);
      if (depth < 1 && i > 3 && R.next() < 0.08) out.push({ pts: walk(x, y, -dx || 1, len - i - 2, depth + 1), delay: pts.length / 60 });
    }
    return pts;
  };
  for (let k = 0; k < 4; k++) {
    const [x, y] = roots[Math.floor(R.next() * roots.length)];
    out.push({ pts: walk(x, y, R.next() < 0.5 ? -1 : 1, 12 + Math.floor(R.next() * 12), 0), delay: R.next() * 0.1 });
  }
  per.set(key, out);
  return out;
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), pl = pulse(t), a = o.actor;
  // the floor takes a red wash that swells on the beat
  p.shade(-26, -3, 26, 7, (x, y, out) => {
    const d = Math.hypot(x / 24, (y - 0.5) / 4.2);
    if (d < 1) (out.l = C[4]), (out.k = (0.1 + 0.3 * pl) * (1 - d) * (1 - d));
  });
  p.glow(0, -20, 34, C[3], 0.1 + 0.3 * pl);
  // steam, pouring off the shoulders and the head, soft and rising, pink-white
  const S = shape(a), sx = [a.x + S.w * 0.28, a.x + S.w * 0.5, a.x + S.w * 0.72];
  cycle(t, D, 14, o.seed + 2, (r) => r.range(1.0, 1.5), (age, life, r, i) => {
    const k = age / life, x = sx[i % 3] + r.range(-3, 3) + Math.sin(age * 4 + i * 2) * (1 + 3 * k), y = a.y + S.h * (i % 3 === 1 ? 0.05 : 0.3) - age * r.range(14, 24);
    p.disc(x, y, 2.4 + 5 * k, mix(C[6], C[7], 0.6), 0.5 * Math.min(1, age * 6) * (1 - k) * (0.6 + 0.4 * pl));
  });
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), a = o.actor, S = shape(a), pl = pulse(t), s = since(t), tick = Math.floor(t / BEAT) % 2;
  // ---- the veins race over the body from the beat, then cool and fade before the next
  const grow = smooth(0, 0.28, s), fade = 1 - smooth(0.42, 0.78, s);
  if (fade > 0)
    for (const v of veins(a, o.seed, tick)) {
      const g = clamp((grow - v.delay) / (1 - v.delay)), n = Math.floor(v.pts.length * g);
      for (let i = 0; i < n; i++) {
        const [x, y] = v.pts[i], head = n - i < 3 && g < 1, cool = i / v.pts.length;
        p.dot(a.x + x, a.y + y, head ? WHITE : cool > 0.7 ? C[5] : C[6], fade);
        // a second pixel beside it, so it reads as a swollen line and not a scratch
        if (i % 2 === 0 && S.on(x + 1, y)) p.dot(a.x + x + 1, a.y + y, head ? C[6] : C[3], fade);
        if (i % 2 === 0) p.light(a.x + x, a.y + y, C[4], 0.35 * fade);
      }
    }
  // ---- the red edge round him, flaring on the beat
  for (const [x, y, nx, ny] of S.outline) {
    const n = rand(x, y, Math.floor(t * 18) + 3), lvl = 0.3 + 0.7 * pl + (n - 0.5) * 0.35, c = lvl > 0.85 ? C[6] : lvl > 0.55 ? C[5] : C[4];
    if (ny <= 0.2 || n < 0.55 + 0.4 * pl) p.dot(a.x + x, a.y + y, c, clamp(lvl));
  }
  // little tongues standing up off the head, shoulders and hands, taller on the beat
  for (let i = 0; i < S.up.length; i += 2) {
    const [x, y] = S.up[i], h = 1 + Math.floor((1.5 + 3.5 * rand(x, y, 5)) * (0.5 + pl) * (0.7 + 0.3 * Math.sin(t * 20 + i)));
    for (let k = 1; k <= h; k++) p.dot(a.x + x, a.y + y - k, k > h * 0.7 ? C[4] : k > h * 0.35 ? C[5] : C[6], 1 - k / (h + 1));
  }
  // ---- the mark on the brow
  const mx = a.x + 11, my = a.y + 2;
  for (const [dx, dy, c] of [[1, 0, 5], [0, 1, 5], [1, 1, pl > 0.5 ? 7 : 6], [2, 1, 5], [1, 2, 4]]) p.px(mx + dx, my + dy, C[c]);
  p.glow(mx + 1.5, my + 1.5, 9 + 6 * pl, C[5], 0.3 + 0.5 * pl);
  // ---- embers rising off the veins' heat
  cycle(t, D, 16, o.seed + 6, (r) => r.range(0.7, 1.2), (age, life, r, i) => {
    const k = age / life, x = a.x + S.w * r.range(0.2, 0.8) + Math.sin(age * 7 + i) * 1.5 * k, y = a.y + S.h * r.range(0.25, 0.9) - age * r.range(18, 44);
    p.dot(x, y, k < 0.4 ? C[6] : k < 0.75 ? C[5] : C[4], 1 - k * 0.8);
    p.light(x, y, C[4], 0.3 * (1 - k));
  });
}
