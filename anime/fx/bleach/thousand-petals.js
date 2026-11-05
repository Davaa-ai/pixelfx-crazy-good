// Inspired by scattering-blade releases in soul-reaper anime. Generic motifs only: no characters, costumes or logos.
import { Particles, Lights, P, Rng, rand, fit, clamp, smooth, ease, lerp, hex, mix, WHITE, READY, TAU } from "../../../src/core/index.js";
import { poseAt } from "../../../src/core/act.js";

export const meta = {
  name: "Thousand petals",
  desc: "The blade comes apart into pink petal-blades that stream at the target, close round it in a whirling sphere, crush and burst, then flow home into steel.",
  tags: ["bleach", "anime", "move", "blade", "petals", "swarm", "pink", "vortex", "sakura", "one-shot"],
  size: [300, 140],
  origin: [50, 116],
  duration: 3.9,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#1a0610", "#4a1030", "#8a2050", "#d0487a", "#f282a8", "#ffbcd2", "#ffe6f0", "#ffffff"],
    sparks: ["#ffffff", "#ffbcd2", "#f282a8", "#8a2050"],
    seed: 21,
  },
};

const TX = 150, TC = [TX, -24];
// the beats: the blade comes apart, the flick, the sphere closes, crush and burst, home, set into steel
const T0 = 0.3, FLICK = 0.85, CRUSH = 2.25, BURST = 2.35, HOME = 2.5, SET = 3.05;
const N = 230, HAND = [9, -25];
const GOLD = hex("#ffd84a"), GOLDD = hex("#b8862a"), GRIP = hex("#7a3a2a"), GRIPD = hex("#4a2018"), STEEL = [hex("#68748f"), hex("#e8edf6"), WHITE];

const HOLD = { ...READY, weapon: "sword", turn: 0.5, crouch: 2, fx: HAND[0], fy: HAND[1], sa: -Math.PI / 2, bx: 4, by: -21, ffx: 7, fbx: -7 };
const OPEN = { ...HOLD, weapon: null };
const POINT = { ...OPEN, turn: 0.2, crouch: 4, lean: 3, x: 2, fx: 16, fy: -28, bx: -5, by: -22, ffx: 10, fbx: -8 };
const CLOSE = { ...POINT, crouch: 5, lean: 4, fx: 14, fy: -26 };
export const act = {
  ghost: "#f282a8",
  target: { x: TX },
  poses: [
    [-0.4, { ...HOLD, turn: 0.2, fx: 12, fy: -21, sa: -0.85 }],
    [-0.05, HOLD],
    [T0, { ...HOLD, crouch: 3 }],
    [T0 + 0.05, OPEN, "snap"],
    [FLICK - 0.15, { ...OPEN, crouch: 3, fx: 6, fy: -30, lean: -2 }],
    [FLICK, POINT, "out"],
    [CRUSH - 0.2, { ...POINT, fx: 17 }],
    [CRUSH, CLOSE, "snap"],
    [HOME + 0.1, { ...CLOSE, crouch: 4 }],
    [SET - 0.1, OPEN],
    [SET, HOLD, "snap"],
    [3.6, { ...HOLD, turn: 0.2, fx: 12, fy: -21, sa: -0.85 }],
  ],
  hits: [
    ...[1.45, 1.62, 1.78, 1.92, 2.04, 2.14].map((t, i) => ({ t, stop: 0.02, push: i % 2 ? -0.6 : 0.7, straw: 4, flash: 0.03, shiver: 0.1 })),
    { t: BURST, stop: 0.12, shake: 0.32, amp: 3, push: 4.2, straw: 30, skin: "red", flash: 0.06 },
    { t: 3.3, push: 0, straw: 0, flash: 0, skin: null },
  ],
};

// each petal: where it sits on the blade, how late it is, its orbit
const PET = [];
for (let i = 0; i < N; i++) {
  const r = (k) => rand(i, k, 913);
  PET.push({
    u: r(1), lag: r(2) * 0.32, a: r(3) * TAU, out: 6 + r(4) * 20, tilt: (r(5) - 0.5) * 2.6, ph: r(6) * TAU, w: 9 + r(7) * 5,
    side: (r(8) - 0.5) * 34, hue: r(9), rad: 0.75 + r(10) * 0.4,
  });
}
const home = (q) => [HAND[0], HAND[1] - 4 - q.u * 23];
const bez = (a, b, c, s) => [lerp(lerp(a[0], b[0], s), lerp(b[0], c[0], s), s), lerp(lerp(a[1], b[1], s), lerp(b[1], c[1], s), s)];

// the sphere's radius over time: closing, crushed tight, thrown out
function radius(t) {
  if (t < BURST) return lerp(26, 13, smooth(1.3, CRUSH - 0.05, t)) - 7 * smooth(CRUSH - 0.1, CRUSH + 0.05, t);
  return 6 + 46 * ease.outCubic(clamp((t - BURST) / 0.25));
}
// on the sphere at t: [x, y, z] (z > 0 towards us)
function orbit(q, t) {
  const th = q.a + t * q.w * (t > BURST ? 0.4 : 1), r = radius(t) * q.rad, ct = Math.cos(q.tilt), st = Math.sin(q.tilt);
  const x = Math.cos(th) * r, y = Math.sin(th) * r;
  return [TC[0] + x, Math.min(-1, TC[1] + y * ct * 0.85), y * st];
}
// the cloud they come apart into
function cloud(q, t) {
  const [hx, hy] = home(q), age = Math.max(0, t - (T0 + (1 - q.u) * 0.22)), k = ease.outCubic(clamp(age / 0.7));
  const a = q.a + age * 2.2;
  return [hx + Math.cos(a) * q.out * k + age * 6, hy + Math.sin(a) * q.out * 0.7 * k - age * 5];
}
/** Where petal q is at t, and its depth (null: still blade or set back into it). */
function where(q, t) {
  if (t < T0 + (1 - q.u) * 0.22) return null;
  const go = FLICK + q.lag, back = HOME + q.lag * 0.8;
  if (t < go) return [...cloud(q, t), 1];
  if (t < back) {
    const s = ease.inOutQuad(clamp((t - go) / 0.5)), o = orbit(q, t);
    if (s >= 1) return o;
    const P0 = cloud(q, go), mid = [lerp(P0[0], TC[0], 0.5) + q.side * 0.3, -70 + q.side * 0.6];
    return [...bez(P0, mid, o, s), 1];
  }
  const s = ease.inOutCubic(clamp((t - back) / 0.55)), P0 = orbit(q, back), h = home(q);
  if (s >= 1) return t < SET ? [...h, 1] : null;
  const mid = [lerp(P0[0], h[0], 0.5) - q.side * 0.3, -66 - q.side * 0.5];
  return [...bez(P0, mid, h, s), 1];
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks }), lights = new Lights();
  const small = act.hits.filter((h) => h.stop === 0.02).map((h) => h.t);
  let t = 0, nSmall = 0, burst = false, set = false, broke = false;

  const petal = (p, q, i, back) => {
    const a = where(q, t);
    if (!a) return;
    const [x, y, z] = a;
    if ((z < 0) !== back) return;
    const b = where(q, t - 1 / 45) ?? a, dx = x - b[0], dy = y - b[1], L = Math.hypot(dx, dy) || 1;
    const glint = rand(i, Math.floor(t * 24), 7) < 0.05, far = z < 0;
    const head = glint ? WHITE : q.hue < 0.4 ? C[6] : q.hue < 0.85 ? C[5] : C[4], tail = far ? C[2] : C[3];
    // a petal is a little blade: a bright head, a darker tail along its flight, longer the faster it goes
    const len = Math.min(4, 0.6 + L * 0.35);
    p.line(x - (dx / L) * len, y - (dy / L) * len, x, y, (u) => (u > 0.6 ? head : tail), far ? 0.75 : 1);
    if (!far && q.hue > 0.5) p.dot(x + dy / L, y - dx / L, C[4], 0.8);
    p.light(x, y, C[5], far ? 0.08 : 0.18);
    if (glint) p.glow(x, y, 4, C[6], 0.5);
  };

  return {
    update(dt) {
      t += dt;
      if (!broke && t >= T0) {
        broke = true;
        lights.add(HAND[0], HAND[1] - 16, 40, C[5], 0.7, 0.5);
      }
      while (nSmall < small.length && t >= small[nSmall]) {
        const a0 = R.range(0, TAU);
        lights.add(TC[0], TC[1], 30, C[5], 0.5, 0.18);
        for (let k = 0; k < 6; k++) {
          const a = a0 + R.range(-0.8, 0.8), sp = R.range(90, 200);
          ps.spawn(P.SPARK, TC[0] + Math.cos(a) * 6, TC[1] + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.35));
        }
        nSmall++;
      }
      if (!burst && t >= BURST) {
        burst = true;
        lights.add(TC[0], TC[1], 90, C[5], 1.1, 0.6);
        lights.add(TC[0], TC[1], 26, WHITE, 1, 0.12);
        for (let k = 0; k < 30; k++) {
          const a = R.range(0, TAU), sp = R.range(120, 320);
          ps.spawn(P.SPARK, TC[0], TC[1], Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 30, R.range(0.25, 0.6));
        }
        for (let k = 0; k < 16; k++) ps.spawn(P.FLAKE, TC[0] + R.range(-10, 10), TC[1] + R.range(-10, 10), R.range(-80, 80), R.range(-90, 10), R.range(0.7, 1.2), R.chance(0.5) ? C[5] : C[6], R.range(1, 2));
        for (let k = 0; k < 5; k++) ps.spawn(P.DUST, TX + R.range(-14, 14), -2, R.range(-50, 50), R.range(-20, -4), R.range(0.6, 1), "#5a4650", R.range(3, 5));
      }
      if (!set && t >= SET) {
        set = true;
        lights.add(HAND[0], HAND[1] - 15, 34, C[6], 0.8, 0.3);
        for (let k = 0; k < 8; k++) ps.spawn(P.STAR, HAND[0] + R.range(-4, 4), HAND[1] - R.range(4, 28), R.range(-20, 20), R.range(-20, 0), R.range(0.3, 0.6), C[6], R.range(0.5, 2));
      }
      // a drift of loose petals that fall away from the swarm all the way through
      if (t > T0 && t < HOME && R.chance(dt * 26)) {
        const q = R.pick(PET), a = where(q, t);
        if (a) ps.spawn(P.FLAKE, a[0], a[1], R.range(-20, 20), R.range(-10, 10), R.range(0.8, 1.5), R.chance(0.5) ? C[4] : C[5], 1);
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the far side of the sphere, behind the target
      for (let i = 0; i < N; i++) petal(p, PET[i], i, true);
      if (t > FLICK && t < HOME + 0.3) {
        const k = smooth(FLICK + 0.2, FLICK + 0.6, t) * (1 - smooth(HOME, HOME + 0.3, t));
        p.glow(TC[0], TC[1], 44, C[3], 0.25 * k);
      }
    },
    draw(p) {
      const q = poseAt(act.poses, t), hx = (q.x ?? 0) + (q.fx ?? HAND[0]), hy = q.fy ?? HAND[1];
      // ---- the hilt, held on while the blade is out in the air
      if (t >= T0 + 0.05 && t < SET) {
        p.line(hx, hy + 2.6, hx, hy - 2, (u) => (u < 0.5 ? GRIPD : GRIP));
        p.line(hx - 3, hy - 2.8, hx + 3, hy - 2.8, (u) => (u < 0.2 || u > 0.8 ? GOLDD : GOLD));
      }
      // ---- the blade: whole, coming apart from the tip, or setting back from the guard up
      const gone = t < T0 ? 0 : clamp((t - T0) / 0.22), back = clamp((t - (SET - 0.3)) / 0.3);
      if (t >= T0 && t < SET && (gone < 1 || back > 0)) {
        const top = t < HOME ? 1 - gone : back;
        for (let d = 3.2; d <= 3.2 + 24.8 * top; d += 0.5) {
          const y = HAND[1] - d, edge = d > 3.2 + 24.8 * top - 2;
          p.px(HAND[0] - 1, y, edge ? WHITE : STEEL[2]);
          p.px(HAND[0], y, edge ? C[6] : STEEL[1]);
          p.px(HAND[0] + 1, y, edge ? C[5] : STEEL[0]);
          if (edge) p.glow(HAND[0], y, 6, C[5], 0.5);
        }
      }
      // ---- a pink haze along the stream while it flows
      for (let i = 0; i < N; i++) petal(p, PET[i], i, false);
      ps.draw(p);
      // the sphere's heart while it closes, white at the crush
      if (t > 1.2 && t < BURST + 0.1) {
        const k = smooth(1.2, 1.6, t), crush = smooth(CRUSH - 0.15, BURST, t);
        p.glow(TC[0], TC[1], 24 - 8 * crush, C[5], 0.25 * k + 0.6 * crush);
        if (crush > 0.6) p.circle(TC[0], TC[1], 2 + 3 * crush, WHITE, crush);
      }
      lights.draw(p);
    },
  };
}
