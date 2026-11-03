// Briar Embrace: three dark briar vines spiral up round the character in 3D depth, sprouting hooked thorns and
// unfurling crimson velvet roses that flare together in a protective gilded heart-ward before turning to ash.

import { Particles, Lights, P, Rng, fit, sparkle, band, clamp, smooth, ease, luma, TAU, WHITE, READY } from "../../../src/core/index.js";
import { VELVET, GILDED, BRIAR, drawRose, drawGothicHeart, PetalSim, actorOutline } from "../_lib.js";

export const meta = {
  name: "Briar embrace",
  desc: "Dark thorny vines coil round the body in depth and burst into crimson roses and a gilded heart-ward, shedding fluttering petals before turning to ash.",
  tags: ["briar", "thorns", "roses", "shield", "buff", "romance", "dark-fantasy", "one-shot"],
  size: [148, 124],
  origin: [74, 104],
  duration: 3.4,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: VELVET,
    gold: GILDED,
    briar: BRIAR,
    seed: 19,
  },
};

const CLIMB = 0.72, BLOOM_T = 0.96, WITHER_T = 2.25;
const PRAYER = { turn: 1.12, crouch: 2, lean: 1, hy: 1, fx: -3, fy: -26, bx: 4, by: -26, armsFront: true, ffx: -3, fbx: 4 };
const RAPTURE = { turn: 1.15, crouch: 0, lean: -3, hy: -2, fx: -13, fy: -33, bx: 14, by: -33, ffx: -3, fbx: 4 };

export const act = {
  onBody: true,
  poses: [
    [-0.4, READY],
    [-0.1, PRAYER],
    [0.5, PRAYER],
    [BLOOM_T - 0.04, { ...PRAYER, crouch: 3 }],
    [BLOOM_T, RAPTURE, "snap"],
    [1.85, RAPTURE],
    [2.55, PRAYER],
    [3.4, READY],
  ],
};

// 5 roses perched at distinct heights and angles along the front/side coils
const ROSES = [
  { u: 0.22, vine: 0, r: 4.4, t0: 0.36 },
  { u: 0.42, vine: 1, r: 4.8, t0: 0.52 },
  { u: 0.58, vine: 2, r: 5.2, t0: 0.66 },
  { u: 0.74, vine: 0, r: 4.6, t0: 0.78 },
  { u: 0.88, vine: 1, r: 5.0, t0: 0.88 },
];

function vinePoint(vineIdx, u) {
  const ang = vineIdx * (TAU / 3) + u * TAU * 1.45 - 0.4;
  const rx = 14 + Math.sin(u * Math.PI) * 4 - u * 2;
  return {
    x: Math.cos(ang) * rx,
    y: -2 - u * 42,
    z: Math.sin(ang),
    ang,
  };
}

export function create(o) {
  const C = fit(o.palette, 8), G = fit(o.gold, 8), B = fit(o.briar, 6), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, G[6], C[6], C[4]] });
  const lights = new Lights(), petals = new PetalSim(R, 0);
  const bloomed = ROSES.map(() => false);
  let t = 0, climaxed = false, withered = false;

  const drawCoils = (p, front) => {
    const grow = ease.outCubic(clamp(t / CLIMB));
    const die = smooth(WITHER_T, WITHER_T + 0.65, t);
    if (grow <= 0.01 || die >= 1) return;
    const flash = t >= BLOOM_T && t < BLOOM_T + 0.06;

    for (let v = 0; v < 3; v++) {
      const steps = 46;
      for (let i = 0; i < steps; i++) {
        const u = i / steps;
        if (u > grow || u < die) continue;
        const q = vinePoint(v, u), q2 = vinePoint(v, Math.min(1, u + 1 / steps));
        if ((q.z >= 0) !== front) continue;
        const taper = (1 - u * 0.45) * (1 - smooth(WITHER_T - 0.1, WITHER_T + 0.55, t) * 0.35);
        const col = flash ? WHITE : q.z > 0.4 ? B[4] : q.z > -0.2 ? B[3] : B[2];
        p.line(q.x, q.y, q2.x, q2.y, col);
        if (taper > 0.55) p.dot(q.x, q.y + 1, flash ? C[6] : B[1]);
        // hooked thorns every 6 steps
        if (i > 3 && i % 6 === 0 && u < grow - 0.04) {
          const outDir = Math.cos(q.ang) >= 0 ? 1 : -1;
          const tx = q.x + outDir * 3.2, ty = q.y - 2.2;
          p.line(q.x, q.y, tx, ty, flash ? WHITE : B[5]);
          p.px(tx, ty, flash ? WHITE : C[6]);
        }
      }
    }

    // roses along the coils
    ROSES.forEach((rs, idx) => {
      if (t < rs.t0 || rs.u < die) return;
      const q = vinePoint(rs.vine, rs.u);
      // force front on the hero roses if near side, else respect z
      const isFront = q.z >= -0.15;
      if (isFront !== front) return;
      const b = ease.outBack(clamp((t - rs.t0) / 0.24), 1.8);
      const fade = 1 - smooth(WITHER_T + rs.u * 0.2, WITHER_T + 0.62, t);
      drawRose(p, q.x, q.y, rs.r, b, t * 0.4 + idx, C, fade, flash || (t - rs.t0 < 0.04));
    });
  };

  return {
    update(dt) {
      t += dt;
      // dirt grit and dark vapour as roots break the floor
      if (t < 0.35 && R.chance(dt * 35)) {
        const x = R.range(-15, 15);
        ps.spawn(P.GRIT, x, -1, R.range(-35, 35), -R.range(45, 110), R.range(0.35, 0.65), B[3], 1);
      }
      ROSES.forEach((rs, i) => {
        if (!bloomed[i] && t >= rs.t0) {
          bloomed[i] = true;
          const q = vinePoint(rs.vine, rs.u);
          lights.add(q.x, q.y, 18, C[5], 0.65, 0.24);
          for (let k = 0; k < 4; k++) {
            const a = R.range(0, TAU), sp = R.range(25, 65);
            ps.spawn(P.SPARK, q.x, q.y, Math.cos(a) * sp, Math.sin(a) * sp - 12, R.range(0.15, 0.3));
          }
        }
      });

      if (!climaxed && t >= BLOOM_T) {
        climaxed = true;
        lights.add(0, -24, 68, C[5], 0.95, 0.45);
        lights.add(0, -24, 28, WHITE, 0.9, 0.12);
        for (let i = 0; i < 20; i++) {
          const a = R.range(0, TAU), sp = R.range(30, 95);
          petals.spawn(Math.cos(a) * 10, -22 + Math.sin(a) * 12, Math.cos(a) * sp, Math.sin(a) * sp - 24, R.range(1.1, 1.95), R.range(2.1, 3.2));
        }
        for (let i = 0; i < 18; i++) {
          const a = R.range(0, TAU), sp = R.range(60, 160);
          ps.spawn(P.SPARK, 0, -24, Math.cos(a) * sp, Math.sin(a) * sp - 15, R.range(0.2, 0.48));
        }
      }

      if (!withered && t >= WITHER_T) {
        withered = true;
        // vines crumble into soft dark soot smoke, embers, and last drifting petals
        for (let i = 0; i < 12; i++) {
          const u = i / 12, q = vinePoint(i % 3, u);
          ps.spawn(P.SMOKE, q.x, q.y, R.range(-10, 10), -R.range(8, 20), R.range(0.55, 0.95), B[2], R.range(2.2, 3.8));
          ps.spawn(P.EMBER, q.x, q.y, R.range(-14, 14), -R.range(14, 34), R.range(0.45, 0.85), i % 2 ? C[5] : G[5]);
        }
        for (let i = 0; i < 8; i++) {
          petals.spawn(R.range(-14, 14), R.range(-38, -10), R.range(-24, 24), R.range(-10, 15), R.range(0.6, 0.95), R.range(1.9, 2.7));
        }
      }

      petals.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      // floor briar wreath (far half)
      const rk = clamp(t / 0.35) * (1 - smooth(WITHER_T + 0.1, WITHER_T + 0.75, t));
      if (rk > 0.02) {
        band(p, 0, 0, 20 * ease.outBack(Math.min(1, t / 0.35), 1.4), 0.2, 2.2, rk * 0.9, [B[0], B[2], C[3], C[5]], (g) => Math.sin(g) < 0);
        p.glow(0, -18, 36, C[3], 0.26 * rk);
      }
      if (t >= BLOOM_T && t < BLOOM_T + 0.42) {
        const u = (t - BLOOM_T) / 0.42;
        band(p, 0, 0, 14 + 34 * ease.outQuart(u), 0.18, Math.max(1, 2.6 * (1 - u)), 1 - u, [C[2], C[5], G[6], WHITE], (g) => Math.sin(g) < 0, u < 0.25);
      }
      drawCoils(p, false);
      petals.draw(p, C, "back");
      ps.draw(p, "back");
    },

    draw(p) {
      const A = o.actor;
      // crimson-gold aura flush on the body during peak bloom
      if (A && t >= BLOOM_T && t < WITHER_T + 0.3) {
        const fk = (1 - smooth(BLOOM_T, BLOOM_T + 0.45, t) * 0.45) * (1 - smooth(WITHER_T - 0.1, WITHER_T + 0.3, t));
        const sh = actorOutline(A);
        for (const [mx, my] of sh.body) {
          const c0 = A.pixels[my * A.w + mx];
          if (c0) p.blend(A.x + mx, A.y + my, luma(c0) > 0.45 ? G[5] : C[4], 0.28 * fk);
        }
        p.outline(A.mask, A.x, A.y, t - BLOOM_T < 0.08 ? WHITE : fk > 0.5 ? G[5] : C[4], fk * 0.85);
      }

      const rk = clamp(t / 0.35) * (1 - smooth(WITHER_T + 0.1, WITHER_T + 0.75, t));
      if (rk > 0.02) {
        band(p, 0, 0, 20 * ease.outBack(Math.min(1, t / 0.35), 1.4), 0.2, 2.2, rk * 0.9, [B[0], B[2], C[3], C[5]], (g) => Math.sin(g) >= 0);
      }
      if (t >= BLOOM_T && t < BLOOM_T + 0.42) {
        const u = (t - BLOOM_T) / 0.42;
        band(p, 0, 0, 14 + 34 * ease.outQuart(u), 0.18, Math.max(1, 2.6 * (1 - u)), 1 - u, [C[2], C[5], G[6], WHITE], (g) => Math.sin(g) >= 0, u < 0.25);
      }

      drawCoils(p, true);

      // gilded heart-cage ward floating over the chest from BLOOM_T to WITHER_T
      if (t >= BLOOM_T && t < WITHER_T + 0.25) {
        const age = t - BLOOM_T;
        const fade = 1 - smooth(WITHER_T - 0.1, WITHER_T + 0.25, t);
        const beat = 1 + 0.14 * Math.sin(age * 11);
        drawGothicHeart(p, 0, -24, 4.6 * beat, C, { a: fade * 0.92, white: age < 0.05, gold: G });
        if (age < 0.18) sparkle(p, 0, -24, 11 * (1 - age / 0.18), G[7], C[5], 0.7);
      }

      petals.draw(p, C, "front");
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
