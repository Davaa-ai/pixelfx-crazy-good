// Black Flash Crit (Kokusen): martial cursed-energy strike where azure flame condenses onto the knuckles,
// space pinches inward for two frames with an RGB chromatic split, and impact detonates an 8-point
// obsidian-and-crimson lightning star around a pitch-black spatial tear.

import { Particles, Lights, P, Rng, rng, fit, clamp, smooth, seg, ease, TAU, WHITE, BLACK, READY } from "../../../src/core/index.js";
import { SAKUGA_PAL } from "../categories.js";
import { blackBolt, handAt, unlight, ringFast, tone } from "../_lib.js";

export const meta = {
  name: "Black flash crit",
  desc: "Cursed azure flame condenses on the fist; space pinches inward with a chromatic tear before detonating into radial obsidian-and-crimson lightning.",
  tags: ["haki", "black-flash", "crit", "cursed", "lightning", "distortion", "anime", "one-shot"],
  size: [268, 184],
  origin: [64, 136],
  duration: 2.4,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: SAKUGA_PAL.cursedFlash, seed: 9 },
};

const STEP = 0.42, PINCH = 0.49, HIT = 0.56;
const AT = 68, TX = 96;
const HX = 86, HY = -24;

// Secondary azure cursed-energy ramp for the pre-hit fist charge & chromatic split
const CURSED_BLUE = ["#040c1f", "#0a224d", "#124996", "#1f7ae0", "#4db2ff", "#9ce0ff", "#e0f7ff", "#ffffff"];

const STANCE = { ...READY, crouch: 5, lean: 1, fx: -6, fy: -19, bx: 12, by: -25, ffx: 8, fbx: -8, turn: -0.25 };
const LUNGE = { ...READY, crouch: 6, lean: 7, fx: -4, fy: -20, bx: 10, by: -23, ffx: 12, fbx: -11, ghost: 1 };
const STRIKE = { ...READY, crouch: 5, lean: 8, fx: 16, fy: -24, bx: -8, by: -22, ffx: 13, fbx: -11, toeB: true };

export const act = {
  target: { x: TX },
  ghost: "#1f7ae0",
  poses: [
    [-0.42, { ...READY }],
    [-0.14, STANCE],
    [0, { ...STANCE, crouch: 6, fx: -8, fy: -18 }, "snap"],
    [0.34, { ...STANCE, crouch: 7, fx: -9, bx: 13, by: -26 }],
    [STEP, { ...LUNGE, x: 24 }, "snap"],
    [PINCH, { ...LUNGE, x: AT - 6 }, "line"],
    [HIT, { ...STRIKE, x: AT }, "snap"],
    [HIT + 0.48, { ...STRIKE, x: AT + 1, crouch: 6 }],
    [HIT + 0.68, { ...READY, x: AT - 6, crouch: 3 }, "out"],
    [1.7, { ...READY, x: AT - 6 }],
    [2.4, { ...READY, x: AT - 6 }],
  ],
  hits: [
    { t: HIT, stop: 0.19, shake: 0.36, amp: 3, push: 5.2, straw: 34, flash: 0.09, skin: "shadow", shiver: 0.7 },
    { t: 1.75, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [
    { t: STEP, x: 4, n: 8, dir: -1 },
    { t: HIT, x: AT + 6, n: 8, dir: 1 },
  ],
};

export function create(o) {
  const C = fit(o.palette, 8), B = fit(CURSED_BLUE, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]], haze: C[4] });
  const lights = new Lights();

  // 8 radial Black Flash lightning rays at asymmetric anime angles
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * TAU + R.range(-0.18, 0.18);
    const len = R.range(56, 86) * (Math.abs(Math.sin(a)) > 0.7 ? 0.82 : 1.05);
    return { a, len, delay: (i % 3) * 0.018 };
  });

  let t = 0, struck = false, nextFlame = 0.03;

  return {
    update(dt) {
      t += dt;
      // Swirling azure cursed-energy wisps off the cocked fist before contact
      if (t < HIT && t >= nextFlame) {
        nextFlame += 0.045;
        const [hx, hy] = handAt(act.poses, t);
        ps.spawn(P.MOTE, hx + R.range(-3, 3), hy + R.range(-3, 3), R.range(-25, 18), R.range(-56, -16), R.range(0.16, 0.32), B[5], 0.85);
      }

      if (!struck && t >= HIT) {
        struck = true;
        lights.add(HX, HY, 78, C[5], 0.95, 0.42);
        lights.add(HX - 5, HY, 42, B[5], 0.65, 0.16);
        for (let i = 0; i < 36; i++) {
          const a = R.range(0, TAU), sp = R.range(95, 275);
          ps.spawn(P.SPARK, HX, HY, Math.cos(a) * sp, Math.sin(a) * sp * 0.78 - 22, R.range(0.2, 0.54));
        }
        for (let i = 0; i < 12; i++) {
          ps.spawn(P.MOTE, HX + R.range(-8, 8), HY + R.range(-8, 8), R.range(-80, 95), R.range(-85, 35), R.range(0.28, 0.55), i % 3 === 0 ? B[6] : C[6], 0.9);
        }
      }

      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration - 0.04) return;
      if (t >= HIT && t < 1.8) {
        const fade = 1 - smooth(1.1, 1.8, t);
        p.glowLine(HX - 28, 0, HX + 32, 0, 5, C[4], 0.28 * fade);
        p.line(HX - 24, 0, HX + 28, 0, C[5], fade * 0.8);
      }
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration - 0.04) return;
      const f = Math.floor(t * 30);
      const [hx, hy] = handAt(act.poses, t);

      // 1. Pre-hit: flickering azure cursed flame wrapping the fist (and guiding palm glint)
      if (t < HIT) {
        const q = clamp(t / PINCH);
        const r = 3.5 + 2.2 * q + 0.7 * Math.sin(t * 48);
        p.glow(hx, hy, 20 * (0.4 + 0.6 * q), B[4], 0.55);
        // Jagged flame tongues licking upward off the fist
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.38 + 0.2 * Math.sin(t * 35 + i * 1.7);
          const l = (6 + 6 * q) * (0.7 + 0.3 * Math.sin(t * 29 + i));
          p.line(hx, hy, hx + Math.cos(a) * l, hy + Math.sin(a) * l, (u) => (u < 0.45 ? WHITE : u < 0.78 ? B[5] : B[3]));
        }
        p.circle(hx, hy, r, (d) => tone(B, 3 + (1 - d) * 4, hx, hy));
        p.circle(hx, hy, r * 0.45, WHITE);
      }

      // 2. Spatial Pinch (t = PINCH..HIT): space implodes inward with RGB chromatic rings!
      if (t >= PINCH && t < HIT) {
        const u = seg(t, PINCH, HIT);
        const r = 46 * (1 - ease.inCubic(u)) + 4;
        ringFast(p, HX - 2, HY, r, 1.6, B[5], 0.85);
        ringFast(p, HX + 2, HY, r * 0.94, 1.6, C[5], 0.85);
        const Rp = rng(o.seed + 19, f);
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * TAU + Rp.range(-0.1, 0.1);
          const r0 = r * 1.25, r1 = r * 0.35;
          p.line(HX + Math.cos(a) * r0, HY + Math.sin(a) * r0 * 0.8, HX + Math.cos(a) * r1, HY + Math.sin(a) * r1 * 0.8, i % 2 ? B[6] : WHITE);
        }
      }

      // 3. KOKUSEN Detonation: Chromatic twin shockwaves + pitch-black spatial tear + 8 radial Black Flash bolts!
      if (t >= HIT && t < HIT + 0.72) {
        const u = (t - HIT) / 0.72;
        // Twin offset RGB chromatic aberration shockwaves (azure left, crimson right)
        if (u < 0.52) {
          const ru = u / 0.52, rr = 8 + 46 * ease.outQuart(ru), w = Math.max(1, 2.6 * (1 - ru));
          ringFast(p, HX - 3 * (1 - ru), HY - 1, rr, w, B[5], (1 - ru) * 0.9);
          ringFast(p, HX + 3 * (1 - ru), HY + 1, rr, w, C[5], (1 - ru) * 0.95);
          if (ru < 0.25) ringFast(p, HX, HY, rr * 0.85, 2, WHITE, 1 - ru * 4);
        }

        // Radial Black Flash lightning web
        const Rb = rng(o.seed + 53, Math.floor((t - HIT) * 20));
        for (const ry of rays) {
          const bu = seg(t, HIT + ry.delay, HIT + ry.delay + 0.52);
          if (bu <= 0 || bu >= 1) continue;
          const reach = ease.outExpo(Math.min(1, bu * 3.6));
          const k = 1 - smooth(0.38, 1, bu);
          const ex = clamp(HX + Math.cos(ry.a) * ry.len * reach, -46, 186);
          const ey = clamp(HY + Math.sin(ry.a) * ry.len * 0.82 * reach, -118, 14);
          blackBolt(p, Rb, HX, HY, ex, ey, C, {
            jag: 0.22, depth: 4, nForks: 2, forkLen: 0.36, k, thick: 1.5, glow: 0.45,
          });
        }

        // Stark obsidian spatial-tear star right at the impact center (carved free of additive light!)
        if (u < 0.36) {
          const su = 1 - u / 0.36;
          const coreR = 9.5 * su;
          // Crimson outer blaze rim
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU + 0.2;
            const l = (18 + (i % 2) * 10) * su;
            p.line(HX, HY, HX + Math.cos(a) * l, HY + Math.sin(a) * l, C[6]);
          }
          p.circle(HX, HY, coreR + 2, u < 0.09 ? WHITE : C[6]);
          p.circle(HX, HY, coreR, BLACK);
          unlight(p, HX - coreR - 1, HY - coreR - 1, HX + coreR + 1, HY + coreR + 1, (x, y) => Math.hypot(x - HX, y - HY) < coreR * 0.92, 0);
        }
      }

      // 4. Residual black-crimson static crackling over the struck target
      if (t >= HIT + 0.45 && t < 1.65) {
        const fade = 1 - smooth(1.05, 1.65, t);
        if (f % 2 === 0) {
          const Rs = rng(o.seed + 88, f);
          const sx = TX + Rs.range(-10, 12), sy = Rs.range(-36, -6);
          blackBolt(p, Rs, sx, sy, sx + Rs.range(-14, 14), sy + Rs.range(-14, 14), C, {
            jag: 0.32, depth: 3, nForks: 0, k: fade * 0.85, glow: 0.25,
          });
        }
      }

      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
