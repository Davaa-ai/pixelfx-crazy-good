// Inspired by final-release transformations in soul-reaper anime. Generic motifs only: no characters, costumes or logos.
import { Particles, Bits, Lights, P, B, Rng, rand, fit, clamp, smooth, ease, noise, hex, mix, band, WHITE, READY, TAU } from "../../../src/core/index.js";
import { unlight } from "../_lib.js";

export const meta = {
  name: "Release pillar",
  desc: "Blade held out, pebbles trembling, then a pillar of pale pressure erupts to the sky, wound with spiralling light, and collapses into a black, crimson-edged aura.",
  tags: ["bleach", "anime", "buff", "power-up", "transformation", "pillar", "aura", "pressure", "one-shot"],
  size: [264, 232],
  origin: [132, 214],
  duration: 4.0,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#040a1a", "#0a1a3a", "#14306a", "#2458a8", "#4a8ee0", "#8cc4ff", "#d4ecff", "#ffffff"],
    aura: ["#05030a", "#2a0610", "#7a0e22", "#d8283a"],
    seed: 31,
  },
};

const BLAST = 0.7, FALL = 2.05, DARK = 2.35, END = 3.6, TOP = -204;
const STONE = ["#141016", "#2a2228", "#463a3e", "#6a5a58", "#8e7c74"];
const VOID = hex("#05030a");

const STANCE = { ...READY, weapon: "sword", turn: 0.35, crouch: 4, fx: 15, fy: -27, sa: 0.02, bx: 9, by: -26, armsFront: true, ffx: 9, fbx: -9 };
const BRACE = { ...STANCE, crouch: 6, lean: -2 };
const LOW = { ...STANCE, crouch: 3, lean: 1, fx: 13, fy: -18, sa: 0.42, bx: -4, by: -21, armsFront: false };
export const act = {
  poses: [
    [-0.5, { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 }],
    [-0.15, STANCE, "out"],
    [BLAST - 0.05, { ...STANCE, crouch: 5 }],
    [BLAST, BRACE, "snap"],
    [FALL, { ...BRACE, crouch: 7 }],
    [DARK, LOW, "snap"],
    [END, { ...LOW, crouch: 2 }],
  ],
  hits: [
    { t: BLAST, stop: 0.08, shake: 0.9, amp: 3 },
    { t: DARK, stop: 0.1, shake: 0.35, amp: 2 },
  ],
  dust: [{ t: BLAST, x: -12, n: 10, dir: -1 }, { t: BLAST, x: 12, n: 10, dir: 1 }, { t: DARK, x: 0, n: 8 }],
};

// how wide the pillar is: bursting open, breathing, then sucked back in from the sky down
const width = (t) => (t < BLAST ? 0 : 30 * ease.outBack(clamp((t - BLAST) / 0.16)) * (1 + 0.06 * Math.sin(t * 31)) * (1 - smooth(FALL, DARK, t)));
const ceiling = (t) => TOP + (TOP * -1 - 30) * ease.inCubic(clamp((t - FALL) / (DARK - FALL)));

export function create(o) {
  const C = fit(o.palette, 8), A = o.aura.map(hex), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[6], C[5], C[3]] }), bits = new Bits({ ground: floor }), lights = new Lights();
  const pebbles = Array.from({ length: 14 }, (_, i) => ({ x: (rand(i, 1, o.seed) - 0.5) * 90, s: rand(i, 2, o.seed) < 0.4 ? 2 : 1, ph: rand(i, 3, o.seed) * TAU }));
  let t = 0, blasted = false, darkened = false, cores = [];

  return {
    update(dt) {
      t += dt;
      // ---- stillness: a few motes lifting off him
      if (t < BLAST && R.chance(dt * 18 * (t / BLAST))) ps.spawn(P.STREAK, R.range(-14, 14), R.range(-4, -30), 0, -R.range(10, 30), R.range(0.3, 0.6), C[5]);
      // ---- the eruption
      if (!blasted && t >= BLAST) {
        blasted = true;
        lights.add(0, -60, 110, C[5], 1.1, 0.9);
        lights.add(0, -20, 40, WHITE, 1, 0.16);
        for (let i = 0; i < 26; i++) {
          const s = R.sign(), sp = R.range(80, 260);
          ps.spawn(P.DUST, s * R.range(6, 20), -R.range(1, 6), s * sp * 0.55, -R.range(5, 40), R.range(0.6, 1.0), "#5a5466", R.range(4, 7));
        }
        for (let i = 0; i < 18; i++) {
          const s = R.sign();
          bits.add({ kind: B.CHUNK, x: s * R.range(4, 30), y: -1, vx: s * R.range(30, 120), vy: -R.range(120, 300), a: R.range(0, TAU), va: R.range(-14, 14), s: R.range(1.5, 4), ramp: STONE, g: 1, bounce: 0.3, life: R.range(1, 1.8) });
        }
      }
      if (t > BLAST && t < FALL) {
        // rubble sucked up the column, streams of light running up it
        if (R.chance(dt * 16)) bits.add({ kind: B.CHUNK, x: R.range(-40, 40), y: -1, vx: 0, vy: -R.range(60, 120), a: R.range(0, TAU), va: R.range(-6, 6), s: R.range(1, 2.5), ramp: STONE, g: -0.05, life: R.range(0.6, 1.0) });
        if (R.chance(dt * 60)) ps.spawn(P.STREAK, R.range(-12, 12), R.range(-10, -60), 0, -R.range(60, 120), R.range(0.2, 0.4), R.chance(0.5) ? C[6] : C[5]);
        if (R.chance(dt * 14)) {
          const s = R.sign();
          ps.spawn(P.DUST, s * R.range(10, 24), -2, s * R.range(50, 110), -R.range(2, 10), R.range(0.5, 0.8), "#4a4658", R.range(3, 5));
        }
      }
      // ---- it falls into him and he comes out black
      if (!darkened && t >= DARK) {
        darkened = true;
        lights.add(0, -20, 70, A[3], 1, 0.5);
        for (let i = 0; i < 20; i++) {
          const a = R.range(0, TAU), sp = R.range(60, 160);
          ps.spawn(P.VAPOUR, Math.cos(a) * 6, -18 + Math.sin(a) * 10, Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 20, R.range(0.5, 0.9), A[0], R.range(4, 7));
        }
        for (let i = 0; i < 14; i++) ps.spawn(P.EMBER, R.range(-10, 10), R.range(-36, -4), R.range(-40, 40), R.range(-60, -10), R.range(0.6, 1.2), A[3], 1);
      }
      if (t > DARK && t < END - 0.9 && R.chance(dt * 24)) ps.spawn(P.VAPOUR, R.range(-10, 10), R.range(-38, -8), R.range(-6, 6), -R.range(16, 34), R.range(0.5, 0.9), A[0], R.range(2.5, 4));
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      ps.draw(p, "back");
      const W = width(t), top = ceiling(t), ft = Math.floor(t * 30);
      // ---- the pillar: a white core, pale blue body, its edges torn into rising streams
      if (W > 0.5) {
        p.shade(-W - 6, top, W + 6, 1, (x, y, out) => {
          const n = noise(y * 0.08 - t * 9, o.seed + Math.round(x * 0.4)) * 0.5 + 0.5, edge = W * (0.8 + 0.3 * n), d = Math.abs(x) / edge;
          if (d > 1) return;
          const fadeTop = clamp((y - top) / 24);
          out.a = fadeTop;
          const st = noise(x * 0.55 + 40, o.seed + Math.floor(y * 0.06 - t * 7)) * 0.5 + 0.5;
          if (d < 0.16) return (out.l = C[6]), (out.k = 0.3), WHITE;
          if (d < 0.5) return st > 0.62 ? C[5] : st > 0.3 ? C[6] : WHITE;
          if (d < 0.68) return st > 0.5 ? C[4] : C[6];
          if (rand(Math.floor(x), Math.floor(y * 0.3 - t * 40), ft) < 0.2) return C[7];
          return d < 0.85 ? C[5] : C[4];
        });
        p.glowLine(0, top + 90, 0, 0, W * 2, C[4], 0.4);
        p.glowLine(0, top + 20, 0, 0, W * 1.1, C[6], 0.2);
        // the floor flooded with light, and a shock ring running out across it
        p.shade(-110, -4, 110, 8, (x, y, out) => {
          const d = Math.hypot(x / 100, (y - 1) / 5);
          if (d < 1) (out.l = C[5]), (out.k = 0.45 * (1 - d) * (1 - d) * (W / 30));
        });
      }
      // the shockwave on the floor (far half behind him)
      const sw = t - BLAST;
      if (sw > 0 && sw < 0.7) {
        const k = 1 - sw / 0.7, r = 10 + 110 * ease.outCubic(sw / 0.7);
        band(p, 0, -1, r, 0.14, 2.4, k, [C[3], C[5], C[6], WHITE], (g) => Math.sin(g) < 0, true);
      }
      // ---- the spiral streams wound round it: the far halves
      if (W > 4) for (let s = 0; s < 3; s++) spiral(p, s, false);
      // ---- after: black flame standing round him, crimson rimmed, behind the body
      const dk = smooth(DARK - 0.05, DARK + 0.1, t) * (1 - smooth(END - 0.7, END - 0.05, t));
      cores = [];
      if (dk > 0) {
        for (let i = 0; i < 64; i++) {
          const row = i >> 5, u = (i & 31) / 31, x = (-17 + 34 * u) * (1 - row * 0.3), base = -2 - (36 - row * 14) * Math.sin(Math.PI * u) ** 0.6, r = rand(i, Math.floor(t * 15), o.seed + 5), h = (10 + 16 * r) * dk * (0.6 + 0.4 * Math.sin(Math.PI * u)) * (1 - row * 0.3);
          for (let k = 0; k < h; k++) {
            const sway = Math.sin(t * 15 + i + k * 0.4) * k * 0.15, c = k < h * 0.25 ? A[3] : k < h * 0.75 ? VOID : A[1];
            p.dot(x + sway, base - k, c, (1 - k / (h + 2)) * dk);
            if (c === VOID) cores.push([x + sway, base - k]);
            if (k < h * 0.25) p.light(x + sway, base - k, A[3], 0.25 * dk);
          }
        }
        p.glow(0, -20, 34, A[2], 0.35 * dk);
      }
    },
    draw(p) {
      const W = width(t);
      // ---- the hush before: pebbles trembling, then lifting
      if (t < BLAST + 0.05) {
        const g = clamp(t / BLAST);
        for (const q of pebbles) {
          const jit = Math.sin(t * 60 + q.ph) > 0.3 * (1 - g) ? 1 : 0, lift = Math.max(0, g - 0.6) * 10 * (1 + Math.sin(q.ph));
          p.rect(q.x, -q.s - jit - lift, q.s, q.s, hex(STONE[3]));
          if (q.s > 1) p.px(q.x, -q.s - jit - lift, hex(STONE[4]));
        }
        p.glow(0, -20, 20 + 10 * g, C[4], 0.15 + 0.3 * g * (0.6 + 0.4 * Math.sin(t * 40)));
      }
      // ---- wind: speed lines tearing outward from the column at every height
      if (W > 4) {
        for (let i = 0; i < 16; i++) {
          const r = rand(i, Math.floor(t * 12), o.seed + 9), s = i % 2 ? 1 : -1, y = -4 - r * 150, x0 = s * (W + 4 + ((t * 300 + r * 200) % 70)), L = 8 + 18 * r;
          p.line(x0, y, x0 + s * L, y, (u) => (u < 0.3 ? C[6] : C[4]), 0.7);
        }
        for (let s = 0; s < 3; s++) spiral(p, s, true);
      }
      // the white-out at the burst
      const sw = t - BLAST;
      if (sw >= 0 && sw < 0.07) p.circle(0, -30, 40 * (1 - sw / 0.07) + 8, WHITE);
      bits.draw(p);
      ps.draw(p, "front");
      // the shockwave's near half, in front of him
      if (sw > 0 && sw < 0.7) band(p, 0, -1, 10 + 110 * ease.outCubic(sw / 0.7), 0.14, 2.4, 1 - sw / 0.7, [C[3], C[5], C[6], WHITE], (g) => Math.sin(g) >= 0, true);
      // the collapse: a bright ring pulled down the column into him
      if (t > FALL && t < DARK) {
        const u = (t - FALL) / (DARK - FALL), y = ceiling(t) + 10;
        band(p, 0, y, 26 * (1 - u) + 6, 0.3, 2, 1, [C[4], C[6], WHITE, WHITE], () => true, true);
      }
      lights.draw(p);
      // he burns black: keep the light out of the flame's dark heart
      for (const [x, y] of cores) unlight(p, x, y, 0.15);
      // and he stays a figure in the light: take most of the glow back off his body
      if (W > 1) for (let y = -40; y < 0; y++) for (let x = -12; x <= 18; x++) unlight(p, x, y, 0.3);
    },
  };

  // a helix of light round the column: s which of three, front draws the near half
  function spiral(p, s, front) {
    const W = width(t), top = ceiling(t), k = clamp(W / 30);
    for (let y = -2; y > top + 10; y -= 1) {
      const ph = y * 0.07 + t * 9 + (s * TAU) / 3, z = Math.cos(ph);
      if ((z > 0) !== front) continue;
      const x = Math.sin(ph) * (W + 7 + 3 * Math.sin(y * 0.05 + s)), lit = z > 0;
      p.dot(x, y, lit ? (z > 0.7 ? WHITE : C[6]) : C[3], k * (lit ? 1 : 0.7));
      if (lit && (y & 3) === 0) p.light(x, y, C[5], 0.3 * k);
    }
  }
}
