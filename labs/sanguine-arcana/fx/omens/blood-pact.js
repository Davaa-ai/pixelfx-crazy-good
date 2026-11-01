import { fit, Particles, P, Lights, Rng, ease, seg, smooth, lerp, clamp, sparkle, rand, TAU, WHITE, mix } from "../../../../src/core/index.js";
import { BLOOD, GILT, MOON, heartF, tone, bayer } from "../../lib/shared.js";

export const meta = {
  name: "Blood Pact",
  desc: "A rose spark and a moon spark race together and meet in a bead of blood that falls into a rune seal; a wax seal with a heart rises on two crossed ribbons, holds, then bursts into embers.",
  tags: ["sanguine arcana", "omen", "devotion", "pact", "seal", "rune", "wax", "one-shot"],
  size: [112, 116],
  origin: [56, 92],
  duration: 4.8,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: BLOOD, gilt: GILT, moon: MOON, seed: 6 },
};

const MEET = 0.75, DROP = 1.0, SPLASH = 1.25, SEAL = 1.35, HOLD_END = 3.35, BURST = 3.55, PY = -38;
const SY = 0.3;                                   // the floor's tilt: rings are this much as tall as they are wide

// each spark rides a quadratic curve from the floor's far corner up and in to the meeting point
const sparkAt = (s, t) => {
  const u = ease.inOutQuad(seg(t, 0, MEET)), a = 1 - u;
  return [a * a * s * 49 + 2 * a * u * s * 52, a * a * -4 + 2 * a * u * -78 + u * u * PY];
};

const flatRing = (p, cx, cy, r, c, a = 1, keep = () => true) => {
  for (let i = 0, n = Math.ceil(r * TAU * 1.3); i < n; i++) {
    const g = (i / n) * TAU;
    if (keep(g)) p.dot(cx + Math.cos(g) * r, cy + Math.sin(g) * r * SY, typeof c === "function" ? c(g) : c, a);
  }
};

// a domed disc of wax with a ragged edge and a raised heart in it
function wax(p, cx, cy, r, C, lit) {
  const hs = r * 0.42, inHeart = (x, y) => heartF((x - cx) / hs, -(y - cy - 0.4) / hs + 0.12) <= 0;
  p.shade(cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2, (x, y, out) => {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), er = r * (1 + 0.07 * Math.sin(a * 5 + 1.3) + 0.05 * Math.sin(a * 8 + 0.4));
    if (d > er) return;
    const u = d / er, nz = Math.sqrt(Math.max(0, 1 - u * u)), lam = Math.max(0, (dx / er) * -0.5 + (dy / er) * -0.55 + nz * 0.67);
    let level = 1.4 + 3.6 * lam + 0.7 * lit;
    if (u > 0.9) level -= 1.4;
    else if (u > 0.66 && u < 0.74) level -= 1.1;           // the groove round the stamp
    if (u < 0.72) {
      if (inHeart(x, y)) {
        level += 1.2;
        if (!inHeart(x - 1, y) || !inHeart(x, y - 1)) level += 1.8;
        else if (!inHeart(x + 1, y) || !inHeart(x, y + 1)) level -= 1.6;
      } else if (inHeart(x - 1, y - 1)) level -= 1.5;
    }
    out.c = C[clamp(Math.floor(level + bayer(x, y) * 0.8), 0, 7)];
  });
}

export function create(o) {
  const C = fit(o.palette, 8), G = fit(o.gilt, 8), M = fit(o.moon, 8), R = new Rng(o.seed);
  const floor = () => 0, ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[7], C[6], C[5]] }), mps = new Particles({ rng: R, ground: floor, sparks: [WHITE, M[7], M[6], M[5]] });
  const gps = new Particles({ rng: R, ground: floor, sparks: [WHITE, G[7], G[6], G[5]] }), lights = new Lights();
  let t = 0, met = false, splashed = false, burst = false;

  return {
    update(dt) {
      t += dt;
      if (t < MEET) for (const [s, sys] of [[-1, ps], [1, mps]]) if (R.chance(dt * 90)) { const [x, y] = sparkAt(s, t); sys.spawn(P.SPARK, x, y, R.range(-18, 18), R.range(-18, 18), R.range(0.18, 0.4)); }
      if (!met && t >= MEET) {
        met = true;
        lights.add(0, PY, 56, WHITE, 1.2, 0.4); lights.add(0, PY, 26, C[6], 1, 0.18);
        for (let i = 0; i < 28; i++) { const a = R.range(0, TAU), sp = R.range(50, 150); (i % 2 ? ps : mps).spawn(P.SPARK, 0, PY, Math.cos(a) * sp, Math.sin(a) * sp - 20, R.range(0.25, 0.6)); }
      }
      if (!splashed && t >= SPLASH) {
        splashed = true;
        lights.add(0, 0, 48, C[5], 1, 0.4);
        for (let i = 0; i < 14; i++) ps.spawn(P.SPARK, R.range(-3, 3), -1, R.range(-70, 70), -R.range(40, 130), R.range(0.2, 0.5));
      }
      // while the seal holds, embers climb the column of light and gilt dust drifts off the ring
      if (t > SEAL + 0.3 && t < HOLD_END) {
        if (R.chance(dt * 22)) { const a = R.range(0, TAU), r = R.range(14, 36); gps.spawn(P.EMBER, Math.cos(a) * r, Math.sin(a) * r * SY, R.range(-4, 4), -R.range(14, 34), R.range(0.8, 1.2), G[6], 1); }
        if (R.chance(dt * 16)) ps.spawn(P.EMBER, R.range(-3, 3), -2, R.range(-6, 6), -R.range(20, 40), R.range(0.7, 1.1), C[6], 1);
      }
      if (!burst && t >= BURST) {
        burst = true;
        lights.add(0, PY, 78, WHITE, 1.4, 0.55); lights.add(0, PY, 34, G[6], 1, 0.2);
        for (let i = 0; i < 40; i++) { const a = R.range(0, TAU), sp = R.range(40, 150); (i % 3 ? ps : gps).spawn(P.SPARK, Math.cos(a) * 7, PY + Math.sin(a) * 7, Math.cos(a) * sp, Math.sin(a) * sp - 50, R.range(0.3, 0.8)); }
        for (let i = 0; i < 26; i++) gps.spawn(P.EMBER, R.range(-8, 8), PY + R.range(-8, 8), R.range(-26, 26), -R.range(10, 50), R.range(0.7, 1.05), G[6], 1);
      }
      lights.update(dt); ps.update(dt); mps.update(dt); gps.update(dt);
    },
    drawBack(p) {
      const k = smooth(SEAL - 0.1, SEAL + 0.3, t) * (1 - smooth(BURST, BURST + 0.7, t));
      if (k > 0) p.glow(0, 0, 50, C[4], 0.2 * k);
    },
    draw(p) {
      const gone = smooth(BURST - 0.05, BURST + 0.03, t);
      // the two sparks and their comet tails
      if (t < MEET) {
        for (const [s, ramp] of [[-1, C], [1, M]]) {
          for (let i = 16; i >= 0; i--) {
            const [x, y] = sparkAt(s, Math.max(0, t - i * 0.018)), k = 1 - i / 17;
            p.dot(x, y, i === 0 ? WHITE : i < 3 ? ramp[7] : i < 7 ? ramp[6] : ramp[5], k * 1.1);
            if (i % 3 === 0) p.glow(x, y, 4 + (i === 0 ? 3 : 0), ramp[5], 0.4 * k);
          }
          const [hx, hy] = sparkAt(s, t);
          sparkle(p, hx, hy, 3, ramp[7], ramp[6], 0.6);
        }
      }
      // where they meet: one bead of blood that hangs, then falls
      if (t >= MEET && t < SPLASH) {
        const fall = t < DROP ? 0 : 0.5 * 1216 * (t - DROP) ** 2, y = PY + fall, sz = 1.5 + 1.4 * smooth(MEET, DROP, t);
        if (t < MEET + 0.14) sparkle(p, 0, PY, Math.round(7 * (1 - (t - MEET) / 0.14)) + 1, WHITE, C[6], 0.8);
        p.circle(0, y, sz, (d) => (d > 0.6 ? C[3] : C[4]));
        p.px(-0.6, y - sz * 0.45, C[7]);
        if (fall > 0) for (let i = 1; i < 6; i++) p.dot(0, y - sz - i * 1.6, C[4], 1 - i / 6);
        p.glow(0, y, 12, C[5], 0.5);
      }

      // the seal on the floor: two flat rings, ticks that turn, a crown of runes
      const su = smooth(SPLASH, SEAL + 0.55, t), fadeSeal = 1 - smooth(BURST, BURST + 0.9, t);
      if (su > 0.01 && fadeSeal > 0.01) {
        const spin = (t - SPLASH) * 0.55, pulse = 0.5 + 0.5 * Math.sin((t - SPLASH) * 6), A = fadeSeal;
        const r1 = 38 * ease.outCubic(su), r2 = 28 * ease.outCubic(su), r3 = 14 * ease.outCubic(su);
        p.glowRing(0, 0, 0.1, 1, C[4], 0);
        flatRing(p, 0, 0, r1, (g) => (Math.sin(g) < 0 ? C[4] : C[6]), A);
        flatRing(p, 0, 0, r1 - 1, (g) => (Math.sin(g) < 0 ? C[3] : C[5]), A);
        flatRing(p, 0, 0, r2, C[5], A * 0.9);
        flatRing(p, 0, 0, r3, C[4], A * 0.8);
        for (let i = 0; i < 36; i++) {
          const g = spin + (i * TAU) / 36, c = Math.cos(g), s = Math.sin(g), long = i % 3 === 0;
          p.line(c * (r2 + 2), s * (r2 + 2) * SY, c * (r1 - 3 - (long ? 0 : 1.5)), s * (r1 - 3 - (long ? 0 : 1.5)) * SY, long ? G[5] : C[3], A);
        }
        for (let i = 0; i < 8; i++) {
          if (t < SPLASH + 0.25 + i * 0.07) continue;
          const g = -spin * 0.6 + (i * TAU) / 8, x = Math.cos(g) * (r2 - 6), y = Math.sin(g) * (r2 - 6) * SY, pop = Math.max(0, 1 - (t - SPLASH - 0.25 - i * 0.07) / 0.2);
          p.px(x, y, pop > 0 ? WHITE : G[6]); p.px(x - 1, y, G[4]); p.px(x + 1, y, G[4]); p.px(x, y - 1, G[5]); p.px(x, y + 1, G[3]);
          p.glow(x, y, 5, G[5], 0.3 * A);
        }
        p.glow(0, 0, r1 + 6, C[4], 0.22 * A * (0.8 + 0.4 * pulse));
        // the splash: rings that run out across the floor
        const ru = (t - SPLASH) / 0.5;
        if (ru > 0 && ru < 1) flatRing(p, 0, 0, 3 + 30 * ease.outCubic(ru), C[7], 1 - ru);
        // a column of light between the seal and what floats above it
        const col = smooth(SEAL, SEAL + 0.6, t) * fadeSeal;
        p.glowLine(0, -2, 0, PY + 6, 9, C[4], 0.22 * col);
        p.glowLine(0, -2, 0, PY + 6, 3, C[6], 0.25 * col);
      }

      // two ribbons and the wax seal, lifted out of the blood
      const wk = smooth(SEAL, SEAL + 0.45, t), R0 = 9.5 * ease.outBack(seg(t, SEAL, SEAL + 0.5)), wa = 1 - gone;
      if (wk > 0.02 && wa > 0.01) {
        const sway = Math.sin(t * 2.6) * 0.6, cy = PY + Math.sin(t * 3.1) * 0.9;
        for (const [s, c0, c1] of [[-1, C[4], C[6]], [1, M[4], M[6]]]) {
          for (let i = 0; i < 21; i++) {
            const k = i / 20, x = s * (1.4 + 3.4 * Math.sin(k * 5.5 + t * 2.4) * k) + sway * k, y = cy + R0 * 0.7 + i * 1.15 * wk * (1 + 0.15 * k);
            const tail = i > 16 ? (i - 16) * s * 0.6 : 0;
            p.px(x + tail, y, i % 5 === 0 ? c1 : c0); p.px(x + tail + 1, y, c0); if (i > 3) p.px(x + tail + 2, y, c0 === C[4] ? C[3] : M[3]);
          }
        }
        wax(p, 0, cy, R0, C, 0.5 + 0.5 * Math.sin(t * 5));
        p.glow(0, cy, 24, C[5], (0.3 + 0.12 * Math.sin(t * 5)) * wk * wa);
        if (t > BURST - 0.25) { const k = smooth(BURST - 0.25, BURST, t); p.glow(0, cy, 22, WHITE, 0.9 * k); p.circle(0, cy, R0 * k, WHITE, k * 0.9); }
      }

      ps.draw(p); mps.draw(p); gps.draw(p);
      lights.draw(p);
      // the shock ring as it bursts
      const bu = (t - BURST) / 0.45;
      if (bu > 0 && bu < 1) {
        p.ring(0, PY, 8 + 32 * ease.outCubic(bu), Math.max(1, 3 * (1 - bu)), (v) => (v > 0.5 ? WHITE : G[6]), 1 - bu);
        p.glowRing(0, PY, 8 + 32 * ease.outCubic(bu), 8, G[5], 0.5 * (1 - bu));
      }
    },
  };
}
