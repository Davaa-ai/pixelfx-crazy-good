// Inspired by cursed-energy auras in dark fantasy anime. Generic motifs only: no characters, symbols or logos.
import { fit, rand, rng, clamp, smooth, WHITE } from "../../../src/core/index.js";
import { shape, tnoise } from "../../../src/fx/status/_lib.js";

export const meta = {
  name: "Cursed aura",
  desc: "Cursed energy poured out: dark violet flame lifting off the whole body with a bright rim, a wave of light climbing him every beat, black sparks rising, the eyes burning.",
  tags: ["jujutsu kaisen", "anime", "status", "buff", "aura", "dark", "cursed energy", "loop"],
  size: [80, 112],
  origin: [40, 98],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#06030c", "#140a26", "#2a1250", "#4a2290", "#7a44d8", "#b088ff", "#e0d0ff", "#ffffff"], seed: 10 },
};

// planted, hands open at his sides, drawing breath once a beat
const SET = { turn: 0.7, crouch: 3, lean: 0, fx: 9, fy: -15, bx: 3, by: -15, ffx: 10, fbx: -10 };
const BREATHE = { ...SET, crouch: 4, fy: -14, by: -14 };
export const act = {
  onBody: true,
  poses: [[0, SET], [0.4, BREATHE], [0.8, SET], [1.2, BREATHE], [1.6, SET]],
};

const D = meta.duration, BEAT = 0.8;
const sway = (t, seed) => tnoise(t, D, 3, seed);

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), a = o.actor, S = shape(a), ph = (t % BEAT) / BEAT;
  // a dark pool and a violet glow round the feet, swelling on the beat
  p.shade(-28, -3, 28, 7, (x, y, out) => {
    const d = Math.hypot(x / 26, (y - 0.5) / 4.4);
    if (d < 1) (out.c = C[0]), (out.a = 0.55 * (1 - d)), (out.l = C[4]), (out.k = (0.12 + 0.22 * Math.exp(-ph * 4)) * (1 - d) * (1 - d));
  });
  p.glow(0, -24, 46, C[3], 0.24 + 0.28 * Math.exp(-ph * 4));
  // the wide, dark body of the flame behind him: tall soft tongues, lit only at the tips
  for (let i = 0; i < S.up.length; i += 2) {
    const [x, y] = S.up[i], g = rng(o.seed, i, 2), h = 14 + 18 * g.next() + 6 * Math.sin((t / D) * 6.283 * 2 + i), lean = sway(t, i) * 3.4;
    for (let s = 1; s <= h; s++) {
      const k = s / h, px = a.x + x + lean * k * k + Math.sin(k * 5 + i) * 0.8, py = a.y + y - s;
      p.dot(px, py, k > 0.8 ? C[3] : k > 0.4 ? C[2] : C[1], (1 - k * 0.6) * (k > 0.7 ? 0.7 : 1));
      if (k < 0.65) p.dot(px + 1, py, C[1], 0.8 * (1 - k));
      if (k < 0.4) p.dot(px - 1, py, C[1], 0.7 * (1 - k));
    }
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), a = o.actor, S = shape(a), ph = (t % BEAT) / BEAT, beat = Math.exp(-ph * 4);
  // the front wave: every beat a band of light climbs the body's edge from the feet to the crown
  const wy = a.y + S.h * (1 - smooth(0, 0.7, ph)), width = 4 + 2 * (1 - ph);
  for (const [x, y, nx, ny] of S.outline) {
    const py = a.y + y, d = Math.abs(py - wy), n = rand(x, y, Math.floor(t * 20) + 1);
    const wave = d < width ? 1 - d / width : 0, lvl = 0.3 + 0.5 * beat + 0.9 * wave * (ph < 0.75 ? 1 : 0);
    if (n < 0.5 + 0.45 * lvl) p.dot(a.x + x, py, lvl > 1.1 ? WHITE : lvl > 0.8 ? C[6] : lvl > 0.5 ? C[5] : C[4], clamp(0.5 + lvl * 0.6));
    if (wave > 0.4) p.light(a.x + x, py, C[5], 0.4 * wave);
  }
  // flame in front too: the nearer tongues, thinner and brighter, rim-lit on the side the wave is on
  for (let i = 1; i < S.up.length; i += 2) {
    const [x, y] = S.up[i], g = rng(o.seed, i, 7), h = 8 + 12 * g.next() + 4 * Math.sin((t / D) * 6.283 * 3 + i * 1.3), lean = sway(t, i + 40) * 2.6;
    for (let s = 1; s <= h; s++) {
      const k = s / h, px = a.x + x + lean * k * k, py = a.y + y - s;
      p.dot(px, py, k > 0.85 ? C[6] : k > 0.55 ? C[5] : k > 0.25 ? C[4] : C[3], (1 - k * 0.7));
    }
    p.light(a.x + x + lean, a.y + y - h, C[4], 0.14);
  }
  // wisps lifting off the sides: dark cores, bright edges
  for (let i = 0; i < S.side.length; i += 4) {
    const [x, y, dir] = S.side[i], g = rng(o.seed, i, 9), len = 4 + 6 * g.next(), up = 1 + Math.sin((t / D) * 6.283 * 2 + i) * 0.4;
    for (let s = 1; s <= len; s++) {
      const k = s / len, px = a.x + x + dir * (s * 0.7 + sway(t, i + 70) * k * 1.5), py = a.y + y - s * up * 0.9;
      p.dot(px, py, k > 0.6 ? C[5] : C[3], 1 - k * 0.8);
    }
  }
  // black sparks rising, each with a bright pixel beside it
  for (let i = 0; i < 20; i++) {
    const g = rng(o.seed, i, 4), age = (((t / D) * 1 + g.next()) % 1), life = g.range(0.7, 1) , k = age / life;
    if (k > 1) continue;
    const x = a.x + S.w * g.range(0.1, 0.9) + Math.sin(age * 9 + i) * 2 * k, y = a.y + S.h * g.range(0.15, 0.85) - k * g.range(14, 36);
    p.dot(x, y, k < 0.5 ? C[0] : C[1], 1 - k * 0.6);
    p.dot(x + 1, y - 1, k < 0.6 ? C[6] : C[5], 1 - k);
    p.light(x, y, C[4], 0.25 * (1 - k));
  }
  // the eyes
  for (const [ex, ey] of a.eyes ?? [[13, 3], [15, 3]]) {
    p.px(a.x + ex, a.y + ey, WHITE);
    p.glow(a.x + ex + 0.5, a.y + ey + 0.5, 6, C[6], 0.5 + 0.4 * beat);
  }
}
