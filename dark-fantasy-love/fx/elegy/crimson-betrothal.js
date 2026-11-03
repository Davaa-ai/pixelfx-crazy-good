// Crimson Betrothal: a full chained signature move (wind-up vow -> red thread -> petal-blur dash -> bleeding rose
// cleave -> stained-glass reliquary burst -> solemn bow recovery).

import { Particles, Bits, Lights, P, B, Rng, fit, sparkle, flare, band, clamp, smooth, lerp, ease, TAU, WHITE, READY } from "../../../src/core/index.js";
import { VELVET, GILDED, BRIAR, drawGothicHeart, drawRose, PetalSim, ringFast } from "../_lib.js";

export const meta = {
  name: "Crimson betrothal",
  desc: "A solemn blade salute binds the target with a red thread and rose sigil; the knight dashes in a blur of petals to cleave through in a cathedral burst of ruby glass and briars.",
  tags: ["elegy", "move", "combo", "dash", "slash", "rose", "heart", "dark-fantasy", "one-shot"],
  size: [264, 144],
  origin: [50, 122],
  duration: 2.9,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: VELVET,
    gold: GILDED,
    briar: BRIAR,
    seed: 77,
  },
};

const TX = 114, DASH_T = 0.56, HIT_T = 0.80, RECOVER_T = 2.05;

const GUARD = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 };
const SALUTE = { ...GUARD, turn: 0.9, crouch: 1, lean: -2, fx: 5, fy: -28, sa: -1.55, bx: -2, by: -24, armsFront: true };
const COIL = { ...GUARD, x: -4, crouch: 6, lean: 5, fx: -8, fy: -26, sa: -2.75, bx: 10, by: -22, armsFront: true, ffx: 10, fbx: -9 };
const DASH_MID = { ...GUARD, x: 28, crouch: 5, lean: 6, fx: -6, fy: -31, sa: -2.5, bx: -9, by: -22, ffx: 12, fbx: -11, ghost: 1 };
const CUT_IN = { ...GUARD, x: 56, crouch: 2, lean: 4, fx: 16, fy: -36, sa: -1.35, bx: -7, by: -24, ffx: 11, fbx: -10, ghost: 1 };
const CLEAVE = { ...GUARD, x: 60, crouch: 5, lean: 5, fx: 20, fy: -19, sa: 0.65, bx: -9, by: -24, ffx: 13, fbx: -10, toeB: true, ghost: 1 };
const BOW = { ...GUARD, x: 58, crouch: 2, lean: 3, hy: 2, fx: 8, fy: -24, sa: 0.95, bx: -3, by: -23, armsFront: true };

export const act = {
  follow: 0,
  target: { x: TX },
  poses: [
    [-0.42, GUARD],
    [-0.12, SALUTE],
    [0.34, SALUTE],
    [DASH_T - 0.04, COIL],
    [DASH_T + 0.11, DASH_MID, "line"],
    [HIT_T - 0.04, CUT_IN, "snap"],
    [HIT_T, CLEAVE, "snap"],
    [1.28, { ...CLEAVE, crouch: 6 }],
    [1.62, BOW],
    [RECOVER_T, BOW],
    [2.45, { ...GUARD, x: 24, crouch: 4, ghost: 1 }],
    [2.85, GUARD],
    [3.35, GUARD],
  ],
  hits: [
    { t: 0.20, stop: 0.05, shake: 0.08, amp: 1, push: -1.0, straw: 4, skin: "red", y: -23 },
    { t: HIT_T, stop: 0.16, shake: 0.28, amp: 3, push: 3.4, straw: 22, skin: "red", y: -24 },
    { t: 2.75, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [
    { t: DASH_T, x: -4, n: 8, dir: -1 },
    { t: HIT_T, x: 70, n: 9, dir: 1 },
  ],
};

function onArc(cx, cy, R, sy, rot, a) {
  const lx = Math.cos(a) * R, ly = Math.sin(a) * R * sy, c = Math.cos(rot), n = Math.sin(rot);
  return [cx + lx * c - ly * n, cy + lx * n + ly * c];
}

export function create(o) {
  const C = fit(o.palette, 8), G = fit(o.gold, 8), Br = fit(o.briar, 6), R = new Rng(o.seed);
  const floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, G[6], C[6], C[4]] });
  const bits = new Bits({ ground: floor }), lights = new Lights(), petals = new PetalSim(R, 0);
  let t = 0, vowed = false, hit = false, lastDashX = -4;

  // 4 hooked briar spikes that erupt around TX on HIT_T
  const spikes = [
    { dx: -16, h: 24, lean: -5 },
    { dx: -6, h: 36, lean: -2 },
    { dx: 7, h: 38, lean: 3 },
    { dx: 17, h: 26, lean: 6 },
  ];

  return {
    update(dt) {
      t += dt;
      if (!vowed && t >= 0.02) {
        vowed = true;
        lights.add(5, -28, 28, G[5], 0.75, 0.35);
      }

      // petal & gold mote wake streaming off the dashing knight between DASH_T and HIT_T
      if (t >= DASH_T && t <= HIT_T) {
        const u = (t - DASH_T) / (HIT_T - DASH_T), kx = lerp(-4, 60, u);
        if (kx - lastDashX > 5) {
          lastDashX = kx;
          petals.spawn(kx + R.range(-4, 4), R.range(-30, -10), -R.range(25, 65), R.range(-25, 10), R.range(0.8, 1.4), R.range(2.0, 3.0));
          ps.spawn(P.MOTE, kx, R.range(-28, -12), -R.range(40, 90), R.range(-12, 12), R.range(0.25, 0.45), R.chance(0.4) ? G[6] : C[6], 0.8);
        }
      }

      // THE CLIMAX CLEAVE AT HIT_T
      if (!hit && t >= HIT_T) {
        hit = true;
        lights.add(TX, -28, 92, C[5], 1.0, 0.5);
        lights.add(TX, -26, 40, WHITE, 1.0, 0.14);
        const rubyRamp = [C[0], C[2], C[4], C[6], WHITE];
        const goldRamp = [G[0], G[2], G[4], G[6], WHITE];
        // stained-glass ruby & gold chunks
        for (let i = 0; i < 16; i++) {
          const a = -Math.PI / 2 + R.range(-1.25, 1.25), sp = R.range(65, 185);
          bits.add({
            kind: B.CHUNK,
            x: TX + R.range(-6, 6), y: -24 + R.range(-8, 8),
            vx: Math.cos(a) * sp + 15, vy: Math.sin(a) * sp - 20,
            a: R.range(0, TAU), va: R.range(-12, 12),
            s: R.range(1.6, 2.7), ramp: i % 3 === 0 ? goldRamp : rubyRamp,
            g: 0.88, drag: 0.55, bounce: 0.34, life: R.range(1.2, 1.95),
          });
        }
        // storm of 26 crimson rose petals
        for (let i = 0; i < 26; i++) {
          const a = R.range(0, TAU), sp = R.range(28, 115);
          petals.spawn(TX + R.range(-10, 10), -26 + R.range(-12, 10), Math.cos(a) * sp, Math.sin(a) * sp - 34, R.range(1.1, 1.9), R.range(2.1, 3.3), R.range(0, 0.08));
        }
        // golden sparks & rising embers
        for (let i = 0; i < 28; i++) {
          const a = R.range(0, TAU), sp = R.range(80, 220);
          ps.spawn(P.SPARK, TX, -24, Math.cos(a) * sp, Math.sin(a) * sp - 25, R.range(0.22, 0.55));
        }
        for (let i = 0; i < 10; i++) {
          ps.spawn(P.EMBER, TX + R.range(-18, 18), R.range(-36, -8), R.range(-16, 16), -R.range(18, 42), R.range(0.8, 1.5), i % 2 ? G[5] : C[5]);
        }
        for (let i = 0; i < 6; i++) {
          ps.spawn(P.SMOKE, TX + R.range(-10, 10), -8, R.range(-24, 24), -R.range(10, 24), R.range(0.9, 1.4), Br[2], R.range(3.2, 5.0));
        }
      }

      bits.update(dt);
      petals.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      // Phase 1..3: thorny crimson betrothal rose-sigil under the target at TX
      if (t >= 0.08 && t < 2.35) {
        const grow = ease.outBack(clamp((t - 0.08) / 0.32), 1.4);
        const fade = 1 - smooth(1.85, 2.35, t);
        const hot = t >= HIT_T && t < HIT_T + 0.15;
        const r = 24 * grow;
        band(p, TX, 0, r, 0.2, 2.0, fade * 0.9, [C[1], C[3], C[5], G[6]], (g) => Math.sin(g) < 0, hot);
        p.glow(TX, -4, 32, C[4], (0.25 + (hot ? 0.35 : 0)) * fade);
      }
      // shockwave ring on hit (far half)
      if (t >= HIT_T && t < HIT_T + 0.45) {
        const u = (t - HIT_T) / 0.45;
        band(p, TX, 0, 10 + 46 * ease.outQuart(u), 0.18, Math.max(1, 2.8 * (1 - u)), 1 - u, [C[2], C[5], G[6], WHITE], (g) => Math.sin(g) < 0, u < 0.25);
      }
      petals.draw(p, C, "back");
      ps.draw(p, "back");
    },

    draw(p) {
      // blade salute glint on the knight's sword tip before the dash
      if (t >= 0.02 && t < 0.42) {
        const k = Math.sin(clamp((t - 0.02) / 0.4) * Math.PI);
        sparkle(p, 5, -40, Math.round(6 * k), G[7], C[5], 0.55 * k);
      }

      // red thread of fate snapping taut from knight's salute (5, -26) to target's chest (TX, -23)
      if (t >= 0.06 && t < HIT_T) {
        const reach = ease.outCubic(clamp((t - 0.06) / 0.16));
        const kx = t < DASH_T ? 5 : lerp(5, 64, (t - DASH_T) / (HIT_T - DASH_T));
        const steps = 44, maxI = Math.floor(steps * reach);
        let x0 = kx, y0 = -24;
        for (let i = 1; i <= maxI; i++) {
          const u = i / steps, x = lerp(kx, TX, u);
          const vib = t > 0.22 ? Math.exp(-(t - 0.22) * 4) * Math.sin((t - 0.22) * 48) * 4 * Math.sin(u * Math.PI) : 0;
          const y = -24 + vib;
          p.line(x0, y0, x, y, t > DASH_T ? WHITE : C[5]);
          if (i % 6 === 0) p.glow(x, y, 5, C[4], 0.22);
          x0 = x; y0 = y;
        }
      }

      // horizontal crimson speed-streaks during the petal dash
      if (t >= DASH_T && t <= HIT_T + 0.06) {
        const u = clamp((t - DASH_T) / (HIT_T - DASH_T));
        const fade = 1 - clamp((t - HIT_T) / 0.06);
        for (const [yo, len, col] of [[-28, 38, G[6]], [-21, 48, C[6]], [-14, 34, C[4]]]) {
          const hx = lerp(4, 72, u);
          p.line(hx - len * u, yo, hx, yo, col, fade * 0.9);
        }
      }

      // target floor rose-sigil (near half)
      if (t >= 0.08 && t < 2.35) {
        const grow = ease.outBack(clamp((t - 0.08) / 0.32), 1.4);
        const fade = 1 - smooth(1.85, 2.35, t);
        const hot = t >= HIT_T && t < HIT_T + 0.15;
        band(p, TX, 0, 24 * grow, 0.2, 2.0, fade * 0.9, [C[1], C[3], C[5], G[6]], (g) => Math.sin(g) >= 0, hot);
      }

      // THE MASSIVE BLEEDING ROSE CLEAVE ARC AT HIT_T (centered round x = 66, reaching through TX = 114)
      if (t >= HIT_T - 0.02 && t < HIT_T + 0.36) {
        const u = t - (HIT_T - 0.02);
        const a0 = -2.5, a1 = 1.02, span = a1 - a0, R0 = 52;
        const head = ease.outExpo(clamp(u / 0.06)), tail = smooth(0.12, 0.36, u), age = clamp(u / 0.36);
        if (tail < 1) {
          const ta = a0 + span * tail, L = span * (head - tail), W = 15 * (1 - tail * 0.55);
          const c = Math.cos(-0.34), sn = Math.sin(-0.34), cx = 66, cy = -26, B = R0 + 3;
          p.shade(cx - B, cy - B, cx + B, cy + B, (x, y, out) => {
            const dx = x - cx, dy = y - cy, lx = dx * c + dy * sn, ly = (-dx * sn + dy * c) / 0.64, r = Math.hypot(lx, ly);
            if (r > R0 + 0.5 || r < R0 - W - 1) return;
            let ang = (Math.atan2(ly, lx) - ta) % TAU;
            if (ang < 0) ang += TAU;
            if (ang > L) return;
            const v = ang / L, w = W * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.1)), 0.58);
            if (w < 0.35) return;
            const q = (R0 - r) / w;
            if (q < 0 || q > 1) return;
            const ci = q < 0.22 && age < 0.45 ? 0 : Math.round(q * 7 * 0.78 + age * 2.2 - v * 0.7 + 0.35);
            out.c = q > 0.72 && age < 0.5 ? G[5] : C[7 - clamp(ci, 0, 7)];
            out.a = Math.min(1, v / 0.35);
          });
          for (let k = 0; k <= L; k += 0.35) {
            const [gx, gy] = onArc(cx, cy, R0 - 5, 0.64, -0.34, ta + k);
            p.glow(gx, gy, 14, C[5], 0.25 * (1 - age));
          }
        }
      }

      // erupting briar thorns + blooming crimson roses + cathedral heart crest above TX after HIT_T
      if (t >= HIT_T && t < 2.25) {
        const age = t - HIT_T;
        const grow = ease.outBack(clamp(age / 0.14), 2.0);
        const sink = smooth(1.05, 1.45, age);
        const flash = age < 0.05;
        if (sink < 1) {
          for (const sp of spikes) {
            const h = sp.h * grow * (1 - sink), bx = TX + sp.dx;
            for (let y = 0; y < h; y++) {
              const u = y / Math.max(1, h), hw = (1 - u) * 2.8;
              const cx = bx + sp.lean * u * u;
              for (let dx = -Math.ceil(hw); dx <= Math.ceil(hw); dx++) {
                p.px(cx + dx, -y, flash ? WHITE : Math.abs(dx) > hw - 0.8 ? Br[0] : dx < 0 ? C[4] : Br[3]);
              }
            }
          }
          drawRose(p, TX - 9, -12 * (1 - sink), 5.2, clamp(age / 0.2), age, C, 1 - sink, flash);
          drawRose(p, TX + 10, -14 * (1 - sink), 5.5, clamp((age - 0.04) / 0.2), -age, C, 1 - sink, flash);
        }
        // cathedral gilded gothic heart crest rising & fading above the struck target
        if (age < 1.15) {
          const hu = age / 1.15, hy = -54 - ease.outCubic(hu) * 12;
          const ha = 1 - smooth(0.55, 1.0, hu);
          drawGothicHeart(p, TX, hy, 6.2 * ease.outBack(Math.min(1, age / 0.16), 1.8), C, { a: ha, white: flash, gold: G });
          p.glow(TX, hy, 24, C[5], 0.45 * ha);
        }
        if (age < 0.18) flare(p, TX, -26, 26 * (1 - age / 0.18), 1 - age / 0.18, G);
        if (age < 0.45) {
          const u = age / 0.45;
          band(p, TX, 0, 10 + 46 * ease.outQuart(u), 0.18, Math.max(1, 2.8 * (1 - u)), 1 - u, [C[2], C[5], G[6], WHITE], (g) => Math.sin(g) >= 0, u < 0.25);
        }
      }

      bits.draw(p);
      petals.draw(p, C, "front");
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
