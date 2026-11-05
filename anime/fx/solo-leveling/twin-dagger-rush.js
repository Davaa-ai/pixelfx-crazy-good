// Inspired by shadow-stepping dagger fighters in hunter anime. Generic motifs only: no characters, costumes or logos.
import { Particles, Lights, P, Rng, fit, clamp, smooth, ease, hex, WHITE, READY, TAU } from "../../../src/core/index.js";
import { speedBurst } from "../_lib.js";

export const meta = {
  name: "Twin dagger rush",
  desc: "Shadow pools at his feet, then he steps through it round the target four times, slashing at each arrival, and lands past it as a great X tears open across it.",
  tags: ["solo leveling", "anime", "move", "dagger", "dash", "teleport", "slash", "shadow", "violet", "one-shot"],
  size: [256, 142],
  origin: [44, 108],
  duration: 2.3,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#06030c", "#1a0c30", "#33185a", "#552a90", "#8040d0", "#b07cff", "#e0c8ff", "#ffffff"],
    sparks: ["#ffffff", "#e0c8ff", "#b07cff", "#552a90"],
    seed: 81,
  },
};

const TX = 104, TC = [TX, -23], GO = 0.24, LAND = 0.78, X = 1.0;
// every arrival: when, where the feet land, which way he faces, the angle of the cut it makes across the target
const STEPS = [
  { t: 0.3, x: TX - 17, yaw: 0, cut: -0.75 },
  { t: 0.41, x: TX + 17, yaw: Math.PI, cut: 0.55 },
  { t: 0.52, x: TX - 15, yaw: 0, cut: 1.35 },
  { t: 0.63, x: TX + 16, yaw: Math.PI, cut: -0.15 },
];
const END_X = TX + 40;

const D2 = { weapon: "dagger", offWeapon: "dagger" };
const LOW = { ...READY, ...D2, crouch: 6, lean: 4, fx: 12, fy: -16, sa: 0.4, bx: 2, by: -20, sb: 2.6, ffx: 10, fbx: -10 };
const CUT_A = { ...LOW, crouch: 4, lean: 6, fx: 16, fy: -30, sa: -1.1, bx: 4, by: -16, sb: 0.9, ghost: 1 };
const CUT_B = { ...LOW, crouch: 5, lean: 6, fx: 17, fy: -14, sa: 0.9, bx: 8, by: -30, sb: -1.4, ghost: 1 };
const FINISH = { ...LOW, crouch: 8, lean: 7, fx: 18, fy: -12, sa: 0.1, bx: -10, by: -20, sb: 3.0, ffx: 12, fbx: -12 };
export const act = {
  ghost: "#8040d0",
  target: { x: TX },
  poses: [
    [-0.4, { ...READY, ...D2, fx: 11, fy: -20, sa: 0.6, bx: 7, by: -20, sb: 2.4 }],
    [0.05, LOW, "out"],
    [GO - 0.02, { ...LOW, crouch: 7, lean: 5, x: -2 }],
    ...STEPS.flatMap((s, i) => [
      [s.t - 0.03, { ...(i % 2 ? CUT_B : CUT_A), x: s.x, yaw: s.yaw, crouch: 7 }, "snap"],
      [s.t + 0.02, { ...(i % 2 ? CUT_A : CUT_B), x: s.x + (s.yaw ? -2 : 2), yaw: s.yaw }, "snap"],
    ]),
    [LAND - 0.03, { ...FINISH, x: END_X - 8, ghost: 1 }, "snap"],
    [LAND, { ...FINISH, x: END_X }, "snap"],
    [X + 0.5, { ...FINISH, x: END_X, crouch: 6 }],
    [2.3, { ...READY, ...D2, x: END_X, fx: 11, fy: -20, sa: 0.6, bx: 7, by: -20, sb: 2.4 }],
  ],
  hits: [
    ...STEPS.map((s, i) => ({ t: s.t + 0.02, stop: 0.035, push: i % 2 ? -1.6 : 1.6, straw: 6, flash: 0.03, shiver: 0.08 })),
    { t: X, stop: 0.17, shake: 0.38, amp: 3, push: -4.2, straw: 34, skin: "shadow", flash: 0.08 },
    { t: 1.9, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: GO, x: 0, n: 8, dir: -1 }, { t: LAND, x: END_X, n: 8, dir: 1 }],
};

// a slash: a long thin blade of light through (cx, cy) at angle a, white down its middle, fattest in the middle
function slash(p, C, cx, cy, a, L, W, k) {
  if (k <= 0) return;
  const ca = Math.cos(a), sa = Math.sin(a);
  for (let d = -L / 2; d <= L / 2; d += 0.5) {
    const u = (d + L / 2) / L, w = W * Math.pow(Math.sin(Math.PI * u), 0.7) * k;
    for (let v = -w; v <= w; v += 0.5) {
      const e = Math.abs(v) / (w || 1);
      p.dot(cx + ca * d - sa * v, cy + sa * d + ca * v, e < 0.35 ? WHITE : e < 0.7 ? C[6] : C[5], k > 0.4 ? 1 : k * 2.5);
    }
  }
  p.glowLine(cx - ca * L * 0.4, cy - sa * L * 0.4, cx + ca * L * 0.4, cy + sa * L * 0.4, 8, C[5], 0.5 * k);
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0, VOID = hex(o.palette[0]);
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks }), lights = new Lights();
  const marks = [{ t: GO, x: 0 }, ...STEPS.map((s) => ({ t: s.t - 0.03, x: s.x })), { t: LAND - 0.03, x: END_X }];
  let t = 0, n = 0, xd = false;

  const puff = (x, big) => {
    for (let i = 0; i < (big ? 14 : 8); i++) ps.spawn(P.VAPOUR, x + R.range(-6, 6), -R.range(2, 30), R.range(-30, 30), R.range(-30, -4), R.range(0.35, 0.7), R.chance(0.7) ? VOID : C[2], R.range(3, big ? 7 : 5));
    for (let i = 0; i < 5; i++) ps.spawn(P.MOTE, x + R.range(-6, 6), -R.range(4, 30), R.range(-60, 60), R.range(-60, -10), R.range(0.2, 0.4), C[5], 0.7);
  };

  return {
    update(dt) {
      t += dt;
      // shadow seeping up at his feet before he goes
      if (t < GO && R.chance(dt * 40)) ps.spawn(P.VAPOUR, R.range(-10, 10), -1, R.range(-8, 8), -R.range(6, 20), R.range(0.3, 0.6), VOID, R.range(2, 4));
      // every step out of shadow and into it: a puff where he left and where he lands
      while (n < marks.length && t >= marks[n].t) {
        puff(marks[n].x, n === 0 || n === marks.length - 1);
        if (n > 0 && n < marks.length - 1) {
          const s = STEPS[n - 1];
          lights.add(TC[0], TC[1], 40, C[5], 0.7, 0.2);
          for (let i = 0; i < 9; i++) {
            const a = s.cut + (R.chance(0.5) ? 0 : Math.PI) + R.range(-0.4, 0.4), sp = R.range(90, 220);
            ps.spawn(P.SPARK, TC[0], TC[1], Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.35));
          }
        }
        n++;
      }
      if (!xd && t >= X) {
        xd = true;
        lights.add(TC[0], TC[1], 100, C[5], 1.2, 0.7);
        lights.add(TC[0], TC[1], 30, WHITE, 1, 0.14);
        for (let i = 0; i < 34; i++) {
          const a = R.range(0, TAU), sp = R.range(120, 340);
          ps.spawn(P.SPARK, TC[0], TC[1], Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 30, R.range(0.25, 0.6));
        }
        for (let i = 0; i < 12; i++) ps.spawn(P.VAPOUR, TC[0] + R.range(-10, 10), TC[1] + R.range(-12, 12), R.range(-60, 60), R.range(-60, 10), R.range(0.6, 1.1), R.chance(0.6) ? VOID : C[2], R.range(4, 8));
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      ps.draw(p, "back");
      // a pool of shadow under him while he gathers it
      const k = smooth(0, 0.15, t) * (1 - smooth(GO, GO + 0.15, t));
      if (k > 0) p.ellipse(0, 0, 16 * k + 4, 2.5, (d) => (d > 0.8 ? C[3] : VOID), k);
    },
    draw(p) {
      // ---- the paths he cut through the air between steps: violet streaks that fade
      for (let i = 1; i < marks.length; i++) {
        const a = marks[i - 1], b = marks[i], age = t - b.t;
        if (age < -0.001 || age > 0.25) continue;
        const k = 1 - age / 0.25, y = -18 - (i % 2) * 6;
        p.line(a.x, y, b.x, y + 2, (u) => (u > 0.75 ? WHITE : u > 0.4 ? C[5] : C[3]), k);
        p.line(a.x, y + 3, b.x, y + 5, C[3], k * 0.7);
        p.glowLine(a.x, y, b.x, y, 6, C[4], 0.3 * k);
      }
      // ---- a cut at every arrival, flashing and gone
      for (const s of STEPS) {
        const age = t - s.t;
        if (age < 0 || age > 0.16) continue;
        slash(p, C, TC[0], TC[1], s.cut, 50, 2.6, 1 - age / 0.16);
      }
      // ---- the X: two seams appear at landing, hang silent, then tear open
      if (t > LAND && t < X + 0.6) {
        if (t < X) {
          const hum = 0.5 + 0.5 * Math.sin(t * 60);
          for (const a of [-0.8, 0.8]) {
            const ca = Math.cos(a), sa = Math.sin(a), L = 30 * ease.outCubic(clamp((t - LAND) / 0.1));
            p.line(TC[0] - ca * L, TC[1] - sa * L, TC[0] + ca * L, TC[1] + sa * L, hum > 0.5 ? C[6] : C[5]);
          }
        } else {
          const u = t - X, k = 1 - smooth(0.1, 0.6, u), grow = ease.outCubic(clamp(u / 0.06));
          slash(p, C, TC[0], TC[1], -0.8, 70 * grow, 5, k);
          slash(p, C, TC[0], TC[1], 0.8, 70 * grow, 5, k);
          if (u < 0.08) {
            p.circle(TC[0], TC[1], 14 * (1 - u / 0.08) + 3, WHITE);
            speedBurst(p, TC[0], TC[1], 10, 56, 26, o.seed, VOID, C[5], 1, ease.outQuart(clamp(u / 0.05)));
          }
        }
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
