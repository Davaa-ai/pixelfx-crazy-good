// Mach Gatling (Jet Gatling): wide overdrive stance venting pink steam, followed by a roaring
// supersonic storm of 52 blurred obsidian-coated punches across a wide cone, peppering the target
// with Mach shock-rings and rapid micro-hit-stops before a twin-fist finisher blowback.

import { Particles, Lights, P, Rng, fit, clamp, smooth, seg, ease, sparkle, flare, TAU, WHITE, BLACK, hex, READY } from "../../../src/core/index.js";
import { SAKUGA_PAL } from "../categories.js";
import { machRing, unlight, ringFast } from "../_lib.js";

const JET_PAL = ["#10040a", "#2e0818", "#661230", "#ad1f4b", "#eb4270", "#ff82a4", "#ffc7d8", "#fff5f8"];

export const meta = {
  name: "Mach gatling",
  desc: "Pink overdrive steam vents from a wide stance before unleashing a supersonic cone of blurred obsidian fists, Mach rings, and rapid impact stars.",
  tags: ["brawler", "barrage", "gatling", "punch", "mach", "steam", "one-piece", "one-shot"],
  size: [276, 160],
  origin: [58, 120],
  duration: 2.6,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: JET_PAL, seed: 7 },
};

const START = 0.36, FINISHER = 1.44;
const TX = 104;

const COIL = { ...READY, crouch: 8, lean: 5, fx: -5, fy: -19, bx: -4, by: -23, ffx: 10, fbx: -10 };
const JAB_A = { ...COIL, x: 4, lean: 7, fx: 15, fy: -25, bx: -7, by: -21, ghost: 1 };
const JAB_B = { ...COIL, x: 4, lean: 7, fx: -7, fy: -20, bx: 15, by: -26, armsFront: true, ghost: 1 };
const TWIN = { ...COIL, x: 10, crouch: 6, lean: 9, fx: 16, fy: -24, bx: 15, by: -22, armsFront: true, toeB: true };

// Build rapid alternating snap punch keys across the barrage window
const barragePoses = [
  [-0.42, { ...READY }],
  [-0.14, COIL],
  [0, { ...COIL, crouch: 9 }, "snap"],
];
for (let i = 0; i < 12; i++) {
  barragePoses.push([+(START + i * 0.085).toFixed(3), i % 2 === 0 ? JAB_A : JAB_B, "snap"]);
}
barragePoses.push(
  [FINISHER, TWIN, "snap"],
  [FINISHER + 0.32, { ...TWIN, x: 11, crouch: 7 }],
  [FINISHER + 0.54, { ...READY, x: 4, crouch: 4 }, "out"],
  [2.1, { ...READY, x: 2 }],
  [2.6, { ...READY, x: 2 }],
);

export const act = {
  target: { x: TX },
  ghost: "#ad1f4b",
  poses: barragePoses,
  hits: [
    { t: START + 0.06, stop: 0.03, shake: 0.1, amp: 1, push: 0.7, straw: 6 },
    { t: START + 0.28, stop: 0.03, shake: 0.1, amp: 1, push: 0.8, straw: 6 },
    { t: START + 0.52, stop: 0.03, shake: 0.12, amp: 1, push: 0.9, straw: 7 },
    { t: START + 0.76, stop: 0.03, shake: 0.12, amp: 2, push: 1.0, straw: 8 },
    { t: START + 0.96, stop: 0.03, shake: 0.12, amp: 2, push: 1.1, straw: 8 },
    { t: FINISHER + 0.02, stop: 0.16, shake: 0.34, amp: 3, push: 5.5, straw: 34, flash: 0.08, skin: "red" },
    { t: 2.05, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [
    { t: START, x: 0, n: 8, dir: -1 },
    { t: FINISHER, x: 8, n: 10, dir: -1 },
  ],
};

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]], haze: C[5] });
  const lights = new Lights();

  // Pre-bake 52 deterministic supersonic fist trajectories fanning into the target!
  const punches = Array.from({ length: 52 }, (_, i) => {
    const t0 = START + (i / 52) * (FINISHER - START - 0.12) + R.range(-0.008, 0.008);
    const sy = -23 + R.range(-10, 8);
    const ey = -24 + R.range(-20, 16);
    const ex = TX + R.range(-12, 14);
    return { t0, sx: 14, sy, ex, ey, life: 0.145, coneX: 36 + R.range(0, 38) };
  });

  let t = 0, nextSteam = 0.02, finished = false, hitIdx = 0;

  return {
    update(dt) {
      t += dt;
      // Overdrive pink steam rising off shoulders & calves
      if (t < FINISHER + 0.45 && t >= nextSteam) {
        nextSteam += 0.07;
        const bx = t >= START ? 4 : 0;
        ps.spawn(P.VAPOUR, bx + R.range(-10, 8), R.range(-35, -6), R.range(-16, 8), R.range(-38, -16), R.range(0.28, 0.52), C[5], R.range(3, 5));
      }

      // Micro-sparks on each punch arrival
      while (hitIdx < punches.length && t >= punches[hitIdx].t0 + 0.04) {
        const q = punches[hitIdx++];
        if (hitIdx % 2 === 0) {
          lights.add(q.ex, q.ey, 24, C[5], 0.55, 0.09);
          for (let k = 0; k < 3; k++) {
            const a = R.range(-1.3, 1.3), sp = R.range(70, 180);
            ps.spawn(P.SPARK, q.ex, q.ey, Math.cos(a) * sp, Math.sin(a) * sp - 15, R.range(0.14, 0.28));
          }
        }
      }

      // Final twin-fist blowback burst
      if (!finished && t >= FINISHER + 0.02) {
        finished = true;
        lights.add(TX + 4, -24, 72, C[5], 0.95, 0.38);
        lights.add(TX + 4, -24, 28, WHITE, 0.9, 0.12);
        for (let i = 0; i < 30; i++) {
          const a = R.range(-1.1, 1.1), sp = R.range(95, 250);
          ps.spawn(P.SPARK, TX + 2, -24, Math.cos(a) * sp, Math.sin(a) * sp - 22, R.range(0.22, 0.52));
        }
        for (let i = 0; i < 8; i++) {
          ps.spawn(P.DUST, TX + R.range(0, 22), -2, R.range(35, 110), R.range(-30, -8), R.range(0.4, 0.78), C[3], R.range(4, 6.5));
        }
      }

      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration - 0.04) return;
      if (t < FINISHER + 0.25) {
        p.glow(4, -20, 26, C[4], 0.24 * (1 - smooth(FINISHER, FINISHER + 0.25, t)));
      }
      // Subtle supersonic air-tunnel haze behind the fist cone
      if (t >= START && t < FINISHER) {
        p.glow(58, -24, 42, C[4], 0.2);
      }
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration - 0.04) return;

      // 1. Active storm of 28 overlapping blurred punches + mini Mach rings + obsidian Haki fists
      for (let i = 0; i < punches.length; i++) {
        const q = punches[i];
        const age = t - q.t0;
        if (age < 0 || age >= q.life) continue;
        const u = age / q.life;
        const reach = ease.outExpo(Math.min(1, u * 3.2));
        const tail = smooth(0.35, 1, u);
        const x0 = q.sx + (q.ex - q.sx) * tail * 0.65;
        const y0 = q.sy + (q.ey - q.sy) * tail * 0.65;
        const x1 = q.sx + (q.ex - q.sx) * reach;
        const y1 = q.sy + (q.ey - q.sy) * reach;
        const fade = 1 - smooth(0.55, 1, u);

        // Tapered anime smear arm streak
        p.beam(x0, y0, x1, y1, 3.6 * fade + 1, (bu, bv) => (bv < 0.35 ? WHITE : bu > 0.6 ? C[6] : C[4]), fade * 0.9);

        // Glossy obsidian Haki fist at the leading tip!
        if (u < 0.72) {
          p.circle(x1, y1, 3.4, C[6], fade);
          p.circle(x1, y1, 2.3, BLACK, fade);
          unlight(p, x1 - 2.5, y1 - 2.5, x1 + 2.5, y1 + 2.5, (x, y) => Math.hypot(x - x1, y - y1) < 2.0, 0);
          p.px(x1 - 1, y1 - 1, WHITE);
        }

        // Every 3rd punch pops a crisp white Mach shock-ring mid-flight + star glint on target
        if (i % 3 === 0 && u > 0.15 && u < 0.85) {
          const mu = (u - 0.15) / 0.7;
          machRing(p, q.coneX, (q.sy + q.ey) * 0.5, 3, 6 + 6 * mu, 1.2, C, (1 - mu) * 0.85, "all", mu < 0.4);
        }
        if (u > 0.28 && u < 0.78) {
          sparkle(p, q.ex, q.ey, 5.5 * (1 - u), WHITE, C[5], 0.5);
        }
      }

      // 2. Final Twin-Fist Finisher Impact & Double Shockwave!
      if (t >= FINISHER && t < FINISHER + 0.52) {
        const u = (t - FINISHER) / 0.52;
        if (u < 0.42) {
          const su = 1 - u / 0.42;
          p.beam(22, -25, TX + 8, -25, 7 * su, (bu, bv) => (bv < 0.32 ? BLACK : bv < 0.58 ? WHITE : C[5]), su);
          machRing(p, 58, -24, 6, 16 + 14 * u, 2.4 * su, C, su, "front", u < 0.2);
          flare(p, TX + 4, -24, 24 * su, su, C);
        }
        const rr = 10 + 42 * ease.outQuart(u);
        ringFast(p, TX + 4, -24, rr, Math.max(1, 2.6 * (1 - u)), u < 0.22 ? WHITE : C[5], 1 - u);
      }

      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
