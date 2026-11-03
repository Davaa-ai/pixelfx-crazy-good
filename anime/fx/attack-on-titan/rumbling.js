// Inspired by colossal footfalls in dark fantasy anime. Generic motifs only: no characters or silhouettes.
import { band, fit, rng, rand, fly, clamp, smooth, ease, wrap, WHITE, TAU } from "../../../src/core/index.js";
import { ribbon } from "../_lib.js";

export const meta = {
  name: "Rumbling",
  desc: "Something enormous is walking: each far-off step throws a ring along the floor and a burst of dust, cracks race out, pebbles hop, grit sifts down. It shakes the whole picture.",
  tags: ["attack on titan", "anime", "loop", "quake", "footsteps", "dust", "shake", "ambient"],
  size: [300, 112],
  origin: [56, 92],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#1c1610", "#33281c", "#4f3f2c", "#6e5a40", "#927a58", "#b89f78", "#dcc8a2"], seed: 14 },
};

const D = 2.4, STEPS = [{ t: 0, x: 92 }, { t: 0.6, x: 126 }, { t: 1.2, x: 86 }, { t: 1.8, x: 120 }];
const BRACE = { turn: 0.4, crouch: 2, lean: 1, fx: 8, fy: -19, bx: 6, by: -21, ffx: 9, fbx: -9 };
const JOLT = { ...BRACE, crouch: 4, lean: 3, fy: -17, by: -19 };
export const act = {
  poses: [[0, BRACE], ...STEPS.flatMap((s, i) => [[s.t + 0.06, JOLT, "snap"], [s.t + 0.3, BRACE, "snap"]]).filter(([t]) => t < D), [D, BRACE]].sort((a, b) => a[0] - b[0]),
  // the whole picture is thrown with every step, harder when the step is nearer
  hits: STEPS.map((s, i) => ({ t: s.t + 0.04, shake: 0.32, amp: 1.5 + (s.x < 100 ? 1.5 : 0.5), target: false })),
};

export function drawBack(p, t, o) {
  const C = fit(o.palette, 7);
  for (const [k, s] of STEPS.entries()) {
    const a = wrap(t - s.t, D);
    // the shadow of the foot coming down, then a thump of warm light where it lands
    if (a > D - 0.22) p.ellipse(s.x, 1, 22 * (1 - (D - a) / 0.4), 3, C[0], 0.5 * (1 - (D - a) / 0.22));
    if (a < 0.9) p.ellipse(s.x, 1, 18 + 6 * ease.outCubic(a / 0.3), 3.2, C[0], 0.7 * (1 - a / 0.9));
    if (a < 0.4) p.glow(s.x, -3, 30, C[5], 0.25 * Math.exp(-a / 0.1));
    // the ring that runs along the floor
    const ring = ease.outCubic(clamp(a / 0.6));
    if (a < 0.6) band(p, s.x, 1, 6 + 96 * ring, 0.17, 2.4, 1 - a / 0.6, C.slice(2, 7));
    // cracks racing out towards him
    for (let i = 0; i < 4; i++) {
      const r = rng(o.seed, k, i, 3), len = r.range(40, 86), g = ease.outExpo(clamp(a / 0.22)), fade = 1 - smooth(0.9, 1.9, a);
      if (fade <= 0) continue;
      const pts = [];
      for (let x = 0; x <= len * g; x += 3) pts.push([s.x - x, -0.5 + Math.round(r.range(0, 1.4) * 2) / 2 + (i % 2) * 1.5 + Math.sin(x * 0.2 + i) * 0.6]);
      if (pts.length > 1) {
        p.polyline(pts, C[0], fade);
        p.polyline(pts.map(([x, y]) => [x, y - 1]), C[4], 0.55 * fade);
      }
    }
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 7);
  // grit sifting down out of the dark overhead, brighter right after a step
  const hot = Math.max(...STEPS.map((s) => Math.exp(-wrap(t - s.t, D) / 0.25)));
  for (let i = 0; i < 46; i++) {
    const g = rng(o.seed, i, 8), life = g.range(0.8, 1.3) * 1.2, age = wrap(t * 0.9 - g.range(0, 1) * D * 0.9, D * 0.9) * 1.0;
    if (age > life) continue;
    const k = age / life, x = g.range(-20, 190) + Math.sin(age * 5 + i) * 1.5, y = -88 + k * 88;
    if (y < -2) p.dot(x, y, k < 0.5 ? C[5] : C[4], (0.4 + 0.6 * hot) * Math.min(1, k * 5));
  }
  for (const [k, s] of STEPS.entries()) {
    const a = wrap(t - s.t, D);
    // the burst of dust: pale and thick at first, spreading and thinning, the near side drifting towards him
    if (a < 1.5) {
      for (let i = 0; i < 12; i++) {
        const r = rng(o.seed, k, i, 11), vx = r.range(-150, 90), vy = -r.range(20, 72), [x, y] = fly(s.x + r.range(-6, 6), -2, vx, vy, a, 60, 2.2);
        const rad = 3 + a * 9 * r.range(0.8, 1.4), al = 0.42 * Math.pow(1 - a / 1.5, 1.3);
        p.disc(x, Math.min(y, -rad * 0.6), rad, a < 0.25 ? C[6] : C[5], al);
      }
    }
    // pebbles flung up that hop and settle
    if (a < 1.8) {
      for (let i = 0; i < 9; i++) {
        const r = rng(o.seed, k, i, 5), vx = r.range(-90, 70), vy = -r.range(110, 250), g = 1100, tl = (2 * -vy) / g, aa = Math.min(a, tl + 0.02);
        const [x, y] = fly(s.x + r.range(-8, 8), -1, vx, vy, aa, g, 0.4), hop = a > tl ? Math.max(0, 1 - (a - tl) * 6) * 4 * Math.abs(Math.sin((a - tl) * 14)) : 0;
        const c = r.chance(0.5) ? C[3] : C[4];
        p.dot(x, Math.min(-0.5, y - hop), c, 1 - smooth(1.1, 1.8, a));
        if (a < tl) p.dot(x + 1, Math.min(-0.5, y), C[2], 1);
      }
    }
    // the thump itself, one frame of white
    if (a < 0.06) {
      p.ellipse(s.x, -1, 12, 3, WHITE, 0.9);
      p.ellipse(s.x, -1, 20, 4.5, C[6], 0.5);
    }
  }
  // a veil of dust hanging over the whole floor, pumped up by each step
  for (let i = 0; i < 7; i++) p.disc(40 + i * 24, -9 - (i % 3) * 4, 20, C[3], 0.025 + 0.06 * hot);
}
