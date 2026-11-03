// Inspired by cursed-energy fighting in dark fantasy anime. Generic motifs only: no characters, costumes or logos.
import { Particles, Bits, Lights, P, B, Rng, rng, rand, fit, bolt, forks, clamp, smooth, ease, hex, WHITE, READY, TAU } from "../../../src/core/index.js";
import { ribbon, glowPath, speedBurst, strokesAt } from "../_lib.js";

export const meta = {
  name: "Black flash",
  desc: "Time stretches: rings pull into the fist, then at contact the world goes black, split by crimson-edged black lightning, with a held freeze and a shower of dark shards.",
  tags: ["jujutsu kaisen", "anime", "move", "impact", "punch", "black", "lightning", "freeze", "one-shot"],
  size: [248, 128],
  origin: [78, 104],
  duration: 2.0,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#06040a", "#2a0610", "#5a0a1c", "#a01028", "#e0203a", "#ff5068", "#ffb0b8", "#ffffff"],
    sparks: ["#ffffff", "#ffb0b8", "#e0203a", "#5a0a1c"],
    seed: 7,
  },
};

const HIT = 0.34, TX = 74, CP = [57, -29], FIST0 = [-12, -28];
const STROKES = [{ t: HIT, k: 1 }, { t: HIT + 0.07, k: 0.85 }, { t: HIT + 0.15, k: 0.6 }];
const BLACK = hex("#05030a");

const GUARD = { ...READY, fx: 10, fy: -23, bx: 7, by: -23, ffx: 8, fbx: -8 };
const WIND = { ...GUARD, x: -8, crouch: 5, lean: -5, fx: -4, fy: -28, bx: 11, by: -28, armsFront: true, ffx: 9, fbx: -9 };
const PUNCH = { ...GUARD, x: 27, crouch: 3, lean: 7, fx: 22, fy: -29, bx: -7, by: -26, ffx: 15, fbx: -10, ghost: 1 };
export const act = {
  ghost: "#ff5068",
  target: { x: TX },
  poses: [
    [-0.4, { ...GUARD, x: -6 }],
    [-0.1, WIND],
    [HIT - 0.12, { ...WIND, crouch: 6, lean: -6, x: -9 }],
    [HIT - 0.05, { ...PUNCH, x: 14, ghost: 1 }, "snap"],
    [HIT - 0.02, PUNCH, "snap"],
    [HIT + 0.9, { ...PUNCH, ghost: 0, crouch: 4 }],
    [HIT + 1.5, { ...GUARD, x: 20 }],
    [1.95, { ...GUARD, x: 10 }],
  ],
  hits: [
    { t: HIT, stop: 0.28, shake: 0.4, amp: 3, push: 5.8, straw: 46, skin: "red", flash: 0.1 },
    { t: HIT + 1.1, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: HIT - 0.05, x: 18, n: 8, dir: -1 }, { t: HIT, x: TX - 8, n: 9, dir: 1 }],
};

// a ring that stops at the floor instead of going through it
function clipRing(p, x, y, r, w, c, a) {
  const lim = (2 - y) / r;
  if (lim >= 1) return p.ring(x, y, r, w, c, a);
  const e = Math.asin(Math.max(-1, lim));
  p.arc(x, y, r, w, Math.PI - e, TAU + e, c, a);
}

// black lightning from the point of contact: each stroke its own tangle
function tangle(R, n, lenA, lenB) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + R.range(-0.25, 0.25), L = R.range(lenA, lenB), pts = bolt(R, 0, 0, Math.cos(a) * L, Math.sin(a) * L * 0.85, { jag: 0.28, depth: 4 });
    out.push({ pts, side: forks(R, pts, { count: 2, len: L * 0.4, jag: 0.3, spread: 0.9 }) });
  }
  return out;
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks }), bits = new Bits({ ground: floor }), lights = new Lights();
  const sets = STROKES.map((_, i) => tangle(R, i === 0 ? 9 : 7, 26 + i * 4, 62 - i * 8));
  let t = 0, struck = false;

  return {
    update(dt) {
      t += dt;
      if (!struck && t >= HIT) {
        struck = true;
        const [x, y] = CP;
        lights.add(x, y, 80, C[5], 1.1, 0.7);
        lights.add(x, y, 30, WHITE, 1, 0.14);
        for (let i = 0; i < 30; i++) {
          const a = R.range(0, TAU), sp = R.range(120, 330);
          ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 40, R.range(0.2, 0.55));
        }
        for (let i = 0; i < 14; i++) {
          const a = R.range(-Math.PI * 1.05, 0.2), sp = R.range(90, 240);
          bits.add({ kind: B.SHARD, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(3, 7), c: R.chance(0.5) ? C[3] : C[2], g: 0.7, bounce: 0.3, life: R.range(0.9, 1.6) });
        }
        for (let i = 0; i < 10; i++) ps.spawn(P.DUST, TX + R.range(-14, 20), -2, R.range(-30, 90), R.range(-30, -6), R.range(0.5, 0.9), "#5a4650", R.range(3, 5));
        for (let i = 0; i < 8; i++) ps.spawn(P.EMBER, x + R.range(-10, 10), y + R.range(-12, 12), R.range(-30, 50), R.range(-60, -10), R.range(0.8, 1.5), C[4], 1);
      }
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      ps.draw(p, "back");
    },
    draw(p) {
      // ---- before: the distortion rings pull into the fist, black-red static crackles over the arm and the fist
      if (t < HIT) {
        const g = clamp(t / HIT), tick = Math.floor(t * 14), n = 1 + Math.floor(5 * g);
        const fx = FIST0[0] + ease.inOutQuad(clamp((t - (HIT - 0.16)) / 0.14)) * (CP[0] - 6 - FIST0[0]) * 0.0, fy = FIST0[1];
        for (let k = 0; k < 3; k++) {
          const ph = (g * 1.3 + k / 3) % 1, r = 36 * (1 - ph) + 3;
          p.ring(fx, fy, r, 1, C[3], 0.55 * ph * g);
          if (k === 0) p.ring(fx + 1, fy, r - 1, 1, C[5], 0.3 * ph * g);
        }
        for (let i = 0; i < n; i++) {
          const r = rng(o.seed, tick, i), a = r.range(0, TAU), len = r.range(5, 11 + 8 * g), x0 = fx + r.range(-5, 5), y0 = fy + r.range(-7, 7);
          const pts = bolt(r, x0, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len, { jag: 0.4, depth: 2 });
          p.polyline(pts.map(([x, y]) => [x, y + 1]), C[3]);
          p.polyline(pts, r.chance(0.3 + 0.4 * g) ? C[6] : C[4]);
        }
        p.glow(fx, fy, 18 + 14 * g, C[3], 0.1 + 0.4 * g * (0.6 + 0.4 * Math.sin(t * 40)));
      }
      // ---- the flash: a white disc with black speed lines for an instant, then the dark takes over
      if (t >= HIT) {
        const u = t - HIT, [x, y] = CP, lvl = strokesAt(t, STROKES);
        const dark = u < 0.05 ? 0 : 0.88 * (1 - smooth(0.32, 0.8, u)), r = 12 + 13 * ease.outCubic(clamp(u / 0.18)) * (1 - 0.25 * smooth(0.4, 0.8, u));
        if (u < 0.06) {
          p.circle(x, y, 17 - u * 60, WHITE);
          speedBurst(p, x, y, 6, 48, 26, o.seed, BLACK, C[4], 1, ease.outQuart(clamp(u / 0.03)));
        }
        if (dark > 0) {
          p.disc(x, y, r * 1.05, BLACK, dark);
          p.disc(x - 3, y + 2, r * 1.3, BLACK, dark * 0.45);
          // a crimson rim to the void, and a ring of distortion running out of it
          p.ring(x, y, r + 1, 1.2, C[4], dark);
          p.glowRing(x, y, r, 6, C[4], 0.5 * dark);
          const wave = ease.outCubic(clamp((u - 0.04) / 0.5));
          if (wave < 1) {
            clipRing(p, x, y, 20 + 40 * wave, 1.4, C[5], 0.8 * (1 - wave));
            clipRing(p, x + 2, y, 18 + 40 * wave, 1, WHITE, 0.5 * (1 - wave));
            clipRing(p, x - 2, y, 21 + 40 * wave, 1, C[2], 0.7 * (1 - wave));
          }
        }
        // the black lightning: crimson edged, re-struck three times, a new tangle each time
        if (lvl > 0) {
          const idx = STROKES.reduce((m, s, i) => (t >= s.t ? i : m), 0), W = 2 + 2.8 * lvl;
          for (const b of sets[idx]) {
            const pts = b.pts.map(([px, py]) => [px + x, py + y]);
            ribbon(p, pts, { w: (v) => W * Math.pow(1 - v, 0.6) + 0.8, c: (v, q) => (Math.abs(q) < 0.45 ? BLACK : Math.abs(q) < 0.8 ? C[4] : C[3]), a: clamp(lvl * 1.4) });
            for (const f of b.side) p.polyline(f.map(([px, py]) => [px + x, py + y]), C[4], lvl);
            glowPath(p, pts, 9, C[4], 0.4 * lvl, 9);
            // a white-hot pixel at the root of each
            p.dot(x + b.pts[2][0], y + b.pts[2][1], lvl > 0.8 ? WHITE : C[6], lvl);
          }
        }
        // a floor crack and red embers drifting out of the dark
        if (u < 0.5) {
          const k = 1 - u / 0.5, tick = Math.floor(u * 20);
          for (let i = 0; i < 3; i++) {
            const r = rng(o.seed, tick, 90 + i), s = i % 2 ? 1 : -1, x0 = TX - 8;
            p.polyline(bolt(r, x0, -1, x0 + s * r.range(18, 44), -1, { jag: 0.4, depth: 3 }).map(([bx, by]) => [bx, by - r.range(0, 1.5)]), C[5], k);
          }
        }
      }
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
