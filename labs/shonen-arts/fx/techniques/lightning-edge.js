// Lightning Edge: lightning gathered into one low-held hand until it shrieks, dragged through the floor in a sprint, and driven
// through the target as a straight spear. Original pixel-art take on the shonen "lightning in the hand" archetype.

import { fit, Particles, P, Lights, Rng, rng, ease, seg, smooth, sparkle, READY, TAU, WHITE, hex, mix } from "../../../../src/core/index.js";
import { VOLT, handAt, zap, ink } from "../../lib/shared.js";

export const meta = {
  name: "Lightning Edge",
  desc: "Lightning bursts out of one low-held hand and crackles there, louder and wilder, grounding into the floor. Then a sprint with the hand dragged behind, cutting a white-hot furrow, and a thrust that drives a spear of lightning straight through the target.",
  tags: ["shonen arts", "technique", "lightning", "electric", "thrust", "pierce", "melee", "one-shot"],
  size: [214, 120],
  origin: [40, 98],
  duration: 3.4,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: VOLT, seed: 7 },
};

// the beats, in seconds
const IGNITE = 0.06, GO = 1.18, HIT = 1.46;
// where he plants his feet to thrust, and where the target stands
const AT = 64, TX = 100, SPEAR = 72;
const OX = 40, W = 214;
const SOOT = hex("#14111c");

const LOW = { crouch: 7, lean: 4, fx: 9, fy: -9, bx: 6, by: -13, ffx: 11, fbx: -10, turn: 0.4 };
const RUN = { crouch: 5, lean: 9, fx: -11, fy: -8, bx: 10, by: -25, ffx: 12, fbx: -12 };
const THRUST = { crouch: 5, lean: 8, fx: 17, fy: -25, bx: -9, by: -21, ffx: 14, fbx: -12, toeB: true };

export const act = {
  target: { x: TX },
  ghost: "#3f6ae8",
  poses: [
    [-0.55, { ...READY }],
    [-0.22, { ...LOW, crouch: 5, fy: -11 }],
    [0.0, { ...LOW, crouch: 8, lean: 2, fx: 7, fy: -8 }, "snap"],
    [0.45, { ...LOW }],
    [0.9, { ...LOW, crouch: 9, lean: 5, fy: -7 }],
    [GO - 0.06, { ...LOW, crouch: 10, lean: 6, x: -2 }],
    [GO, { ...RUN, x: 6, ghost: 1 }, "snap"],
    [HIT - 0.04, { ...RUN, x: AT - 8, ghost: 1 }, "line"],
    [HIT, { ...THRUST, x: AT }, "snap"],
    [HIT + 0.48, { ...THRUST, x: AT + 1, crouch: 6 }],
    [HIT + 0.6, { ...THRUST, x: AT - 3, crouch: 3, lean: 0, fx: 9, fy: -22, bx: -6, by: -24, toeB: false }, "out"],
    [HIT + 1.35, { ...READY, x: AT - 4 }],
  ],
  hits: [
    { t: HIT, stop: 0.15, shake: 0.32, amp: 3, push: 2.8, straw: 28, skin: "shock", shiver: 0.9 },
    { t: HIT + 1.1, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: GO, x: 4, n: 9, dir: -1 }, { t: HIT - 0.03, x: AT - 2, n: 7, dir: 1 }],
};

// how loud the hand is: a burst on ignition, building through the charge, flat out in the run
const power = (t) => (t < IGNITE ? 0 : Math.min(1, 0.45 + 0.55 * smooth(IGNITE, GO, t) + 0.5 * Math.max(0, 1 - (t - IGNITE) / 0.12)));
// the lightning sits a pixel ahead of the palm
const coreAt = (t) => {
  const [x, y] = handAt(act.poses, t);
  return [x + 1, y - 1];
};

/** The hand: a white core spitting arcs in every direction, re-struck every other frame. During the run they stream back. */
function core(p, C, x, y, k, t, seed, run) {
  const s = Math.floor(t * 15 + 1e-6), R = rng(seed, 7, s), flick = 0.8 + 0.2 * R.next();
  p.glow(x, y, 28 + 10 * k, C[3], 0.18 * k * flick);
  p.glow(x, y, 9, C[5], 0.22 * k * flick);
  // few, long, separate arcs read as lightning; many short ones melt into a blob
  const paths = [], n = 4 + Math.round(4 * k), a0 = R.range(0, TAU);
  for (let i = 0; i < n; i++) {
    const a = run ? Math.PI + R.range(-0.6, 0.6) : a0 + (i / n) * TAU + R.range(-0.3, 0.3), L = run ? R.range(12, 28) : R.range(8, 11 + 13 * k);
    const sx = x + Math.cos(a) * 2.5, sy = y + Math.sin(a) * 2.5, ex = x + Math.cos(a) * L, ey = Math.min(0, y + Math.sin(a) * L);
    paths.push(...zap(R, sx, sy, ex, ey, { jag: 0.34, depth: 3, forks: R.chance(0.6) ? 1 : 0, flen: 0.45 }));
  }
  ink(p, paths, C, k * flick, { glow: 0.1 });
  p.circle(x, y, 2 + k, C[5]);
  p.circle(x, y, 1 + k, WHITE);
  // the chatter: bright specks snapping in and out round the hand
  for (let i = 0; i < 6; i++) {
    const a = R.range(0, TAU), r = R.range(4, 15), sx = x + Math.cos(a) * r, sy = Math.min(-1, y + Math.sin(a) * r);
    if (R.chance(0.35)) sparkle(p, sx, sy, R.range(1, 2), WHITE, C[5], 0.5);
    else p.px(sx, sy, R.chance(0.5) ? WHITE : C[6]);
  }
}

export function create(o) {
  const C = fit(o.palette, 8), Rg = new Rng(o.seed);
  const ps = new Particles({ rng: Rg, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] });
  const soft = new Particles({ rng: Rg, ground: () => 0 });
  const lights = new Lights();
  // the floor: when each column was last cut by lightning (-1: never), and where the arcs grounded
  const cut = new Float32Array(W).fill(-1), grounds = [];
  const SMOKEC = mix(C[1], hex("#6a6478"), 0.6);
  let t = 0, hit = false, ignited = false, prevX = null;

  const burn = (x, when) => {
    const i = Math.round(x) + OX;
    if (i >= 0 && i < W) cut[i] = when;
  };

  return {
    update(dt) {
      t += dt;
      const [hx, hy] = coreAt(t), k = power(t);
      if (t >= IGNITE && !ignited) {
        ignited = true;
        lights.add(hx, hy, 50, C[6], 1.3, 0.2);
        for (let i = 0; i < 26; i++) {
          const a = Rg.range(0, TAU), sp = Rg.range(80, 220);
          ps.spawn(P.SPARK, hx, hy, Math.cos(a) * sp, Math.sin(a) * sp - 40, Rg.range(0.2, 0.5));
        }
      }
      // the charge: sparks spat off the hand, arcs grounding into the floor and scorching it
      if (t > IGNITE && t < HIT) {
        if (Rg.chance(dt * 50 * k)) {
          const a = Rg.range(0, TAU), sp = Rg.range(60, 170);
          ps.spawn(P.SPARK, hx, hy, Math.cos(a) * sp, Math.sin(a) * sp - 30, Rg.range(0.12, 0.35));
        }
        if (t < GO && Rg.chance(dt * 9)) {
          const gx = hx + Rg.range(-13, 13);
          grounds.push({ x: gx, t, seed: Rg.int(0, 1e6) });
          for (let d = -1; d <= 1; d++) burn(gx + d, t);
          for (let i = 0; i < 4; i++) ps.spawn(P.SPARK, gx, -1, Rg.range(-60, 60), -Rg.range(40, 120), Rg.range(0.15, 0.35));
          lights.add(gx, -2, 20, C[5], 0.6, 0.1);
        }
        if (t < GO && Rg.chance(dt * 6)) ps.spawn(P.GRIT, hx + Rg.range(-8, 8), -1, Rg.range(-20, 20), -Rg.range(60, 140), Rg.range(0.6, 1), mix(C[1], C[3], Rg.next()), 1);
      }
      // the run: the dragged hand cuts a furrow, throwing grit and sparks back and up
      if (t >= GO && t < HIT) {
        const fx = hx + 4;
        if (prevX !== null) for (let x = Math.floor(Math.min(prevX, fx)); x <= Math.ceil(Math.max(prevX, fx)); x++) burn(x, t);
        prevX = fx;
        for (let i = 0; i < 3; i++) ps.spawn(P.SPARK, fx, -1, -Rg.range(60, 200), -Rg.range(30, 150), Rg.range(0.15, 0.4));
        if (Rg.chance(dt * 40)) ps.spawn(P.GRIT, fx, -1, -Rg.range(30, 120), -Rg.range(80, 200), Rg.range(0.5, 0.9), mix(C[1], C[3], Rg.next()), Rg.chance(0.3) ? 2 : 1);
        if (Rg.chance(dt * 30)) soft.spawn(P.SMOKE, fx - Rg.range(2, 10), -2, -Rg.range(5, 20), -Rg.range(6, 16), Rg.range(0.8, 1.3), SMOKEC, Rg.range(2.5, 4));
      }
      // the thrust: the spear goes through, the burst comes out of the far side
      if (t >= HIT && !hit) {
        hit = true;
        const ex = TX + 10;
        lights.add(hx + 6, hy, 60, C[5], 0.9, 0.3);
        lights.add(ex, hy, 30, C[6], 0.6, 0.12);
        for (let i = 0; i < 46; i++) {
          const a = Rg.range(-0.7, 0.7), sp = Rg.range(140, 360);
          ps.spawn(P.SPARK, ex, hy + Rg.range(-4, 4), Math.cos(a) * sp, Math.sin(a) * sp - 40, Rg.range(0.25, 0.7));
        }
        for (let i = 0; i < 16; i++) {
          const a = Math.PI + Rg.range(-0.9, 0.9), sp = Rg.range(80, 200);
          ps.spawn(P.SPARK, hx + 4, hy, Math.cos(a) * sp, Math.sin(a) * sp - 50, Rg.range(0.2, 0.45));
        }
        for (let i = 0; i < 10; i++) soft.spawn(P.SMOKE, TX + Rg.range(-6, 14), hy + Rg.range(-8, 8), Rg.range(10, 40), -Rg.range(5, 20), Rg.range(0.9, 1.5), SMOKEC, Rg.range(3, 5.5));
      }
      // the furrow smokes while it cools
      if (t > GO && t < HIT + 1.0 && Rg.chance(dt * 14)) {
        const i = Math.floor(Rg.range(0, W));
        if (cut[i] >= 0 && t - cut[i] < 1.2) soft.spawn(P.SMOKE, i - OX, -1, Rg.range(-4, 4), -Rg.range(8, 18), Rg.range(0.8, 1.3), SMOKEC, Rg.range(2, 3.5));
      }
      ps.update(dt);
      soft.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the furrow: white-hot where it was just cut, cooling blue, then soot that clears before the end
      const soot = 1 - smooth(2.5, 3.2, t);
      for (let i = 0; i < W; i++) {
        if (cut[i] < 0 || cut[i] > t) continue;
        const x = i - OX, heat = 1 - (t - cut[i]) / 0.9;
        if (heat > 0) {
          const c = heat > 0.8 ? WHITE : heat > 0.55 ? C[6] : heat > 0.3 ? C[5] : C[3];
          p.px(x, 0, c);
          if (heat > 0.3) p.px(x, 1, heat > 0.6 ? C[5] : C[3]);
          if ((i & 1) === 0) p.glow(x, -1, 5 + 4 * heat, C[4], 0.3 * heat);
        } else if (soot > 0) {
          p.dot(x, 0, SOOT, soot);
          p.dot(x, 1, SOOT, soot * 0.6);
        }
      }
      soft.draw(p);
      // in the run the hand is behind him, so its lightning is too
      if (t >= GO && t < HIT) {
        const [hx, hy] = coreAt(t);
        core(p, C, hx, hy, power(t), t, o.seed, true);
      }
    },
    draw(p) {
      const k = power(t), [hx, hy] = coreAt(t);
      if (k > 0 && t < GO) {
        // arcs that grounded in the last few frames
        for (const g of grounds) {
          const age = t - g.t;
          if (age < 0 || age > 0.1) continue;
          const R = new Rng(g.seed);
          ink(p, zap(R, hx, hy, g.x, 0, { jag: 0.3, depth: 4, forks: 1, flen: 0.4 }), C, 1 - age * 5, { glow: 0.15 });
        }
        core(p, C, hx, hy, k, t, o.seed, false);
      }

      // the spear: straight, almost no jag, re-struck every other frame; a white hero frame first
      const u = t - HIT;
      if (u >= 0 && u < 0.62) {
        const s = Math.floor(t * 15 + 1e-6), R = rng(o.seed, 11, s), reach = SPEAR * ease.outExpo(seg(u, 0, 0.05));
        const kk = (u < 0.12 ? 1 : 1 - seg(u, 0.12, 0.62)) * (0.8 + 0.2 * R.next());
        const x0 = hx + 2, x1 = x0 + reach;
        if (u < 0.04) {
          p.beam(x0, hy, x1, hy, 1.6, WHITE);
          p.glowLine(x0, hy, x1, hy, 12, C[5], 0.4);
        }
        ink(p, zap(R, x0, hy, x1, hy + R.range(-2, 2), { jag: 0.07, depth: 5, forks: 3, flen: 0.22 }), C, kk, { s: 1.2, glow: 0.2 });
        // it comes out of the far side of the target in a fan
        if (reach > TX - x0 + 8) {
          const fan = [];
          for (let i = 0; i < 4; i++) {
            const a = R.range(-0.8, 0.8), L = R.range(12, 30) * (0.5 + 0.5 * kk);
            fan.push(...zap(R, TX + 10, hy, TX + 10 + Math.cos(a) * L, Math.min(0, hy + Math.sin(a) * L), { jag: 0.32, depth: 3, forks: 1 }));
          }
          ink(p, fan, C, kk * 0.9, { glow: 0.12 });
        }
        if (u < 0.1) sparkle(p, x0, hy, 9 * (1 - u / 0.1), WHITE, C[6], 0.5);
        // a little lightning is left crawling up his arm
        core(p, C, hx, hy, 0.5 * kk, t, o.seed + 3, false);
      }

      // what's left in the target: short arcs crawling over it while it shivers
      const v = t - HIT - 0.05;
      if (v > 0 && v < 1.05) {
        const s = Math.floor(t * 15 + 1e-6), R = rng(o.seed, 13, s), kk = 1 - v / 1.05, arcs = [];
        for (let i = 0; i < 3; i++) {
          if (!R.chance(0.4 + 0.5 * kk)) continue;
          const x0 = TX + R.range(-9, 9), y0 = R.range(-44, -8), a = R.range(0, TAU), L = R.range(5, 14);
          arcs.push(...zap(R, x0, y0, x0 + Math.cos(a) * L, y0 + Math.sin(a) * L, { jag: 0.4, depth: 3, forks: 0 }));
        }
        ink(p, arcs, C, 0.4 + 0.6 * kk, { glow: 0.12 });
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
