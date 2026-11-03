// Thread of Fate: a red filament of longing whips from the caster's heart to the beloved's chest, plucks taut
// in standing waves, draws twin ruby droplets together, and seals a gilded gothic heart knot at the midpoint.

import { Particles, Lights, P, Rng, fit, sparkle, band, clamp, smooth, lerp, ease, TAU, WHITE, READY } from "../../../src/core/index.js";
import { VELVET, GILDED, drawGothicHeart, PetalSim, ringFast } from "../_lib.js";

export const meta = {
  name: "Thread of fate",
  desc: "A crimson thread whips between two hearts, plucks taut in standing waves, and fuses two ruby droplets into a gilded vow-knot in a shower of rose petals.",
  tags: ["vows", "romance", "dark-fantasy", "thread", "tether", "heart", "rose", "one-shot"],
  size: [192, 108],
  origin: [40, 92],
  duration: 2.6,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: VELVET,
    gold: GILDED,
    seed: 14,
  },
};

const TX = 104, HY = -23, KNOT_T = 0.82, SNAP_T = 1.68;
const HOLD = { ...READY, crouch: 2, lean: -2, fx: 2, fy: -24, bx: -4, by: -22, armsFront: true };
const REACH = { ...READY, x: 3, crouch: 3, lean: 4, fx: 16, fy: -24, bx: -7, by: -21, ffx: 10, fbx: -8 };
const CLASP = { turn: 1.05, x: 1, crouch: 1, lean: -2, hy: -1, fx: -3, fy: -25, bx: 4, by: -25, armsFront: true, ffx: 4, fbx: -5 };

export const act = {
  target: { x: TX },
  poses: [
    [-0.45, READY],
    [-0.18, HOLD],
    [0, REACH, "snap"],
    [0.26, { ...REACH, fx: 14, fy: -23 }],
    [0.55, { ...REACH, x: 2, fx: 6, fy: -24, lean: 1 }],
    [KNOT_T, CLASP, "snap"],
    [1.45, CLASP],
    [2.05, { ...READY, x: 0 }],
    [2.6, READY],
  ],
  hits: [
    { t: 0.22, stop: 0.08, shake: 0.12, amp: 1, push: -1.4, straw: 6, skin: "red", y: HY },
    { t: KNOT_T, stop: 0.12, shake: 0.18, amp: 2, push: -2.2, straw: 10, skin: "red", y: HY },
    { t: 1.95, push: 0, straw: 0, flash: 0, skin: null },
  ],
};

export function create(o) {
  const C = fit(o.palette, 8), G = fit(o.gold, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, G[6], C[6], C[4]] });
  const lights = new Lights(), petals = new PetalSim(R, 0);
  const MX = TX * 0.52, MY = HY - 4;
  let t = 0, tethered = false, knotted = false, parted = false;

  // y of the red thread at u (0 = caster heart, 1 = target heart)
  const threadY = (u) => {
    const base = lerp(HY, HY, u);
    if (t < 0.22) {
      // whip wave travelling right
      const head = clamp(t / 0.22);
      return base + Math.sin(u * Math.PI * 3 - t * 34) * 7 * (1 - head * 0.5) * Math.sin(u * Math.PI);
    }
    // plucked harp harmonics + gentle catenary pull toward midpoint knot
    const pluck = Math.exp(-(t - 0.22) * 3.8) * Math.sin((t - 0.22) * 46) * 5.5 * Math.sin(u * Math.PI);
    const pluck2 = t > KNOT_T ? Math.exp(-(t - KNOT_T) * 4.5) * Math.sin((t - KNOT_T) * 52) * 4 * Math.sin(u * Math.PI * 2) : 0;
    const dip = smooth(0.35, KNOT_T, t) * -4 * Math.sin(u * Math.PI);
    return base + pluck + pluck2 + dip;
  };

  return {
    update(dt) {
      t += dt;
      if (!tethered && t >= 0.22) {
        tethered = true;
        lights.add(TX, HY, 34, C[5], 0.85, 0.3);
        lights.add(2, HY, 26, C[5], 0.7, 0.28);
        for (let i = 0; i < 12; i++) {
          const a = R.range(0, TAU), sp = R.range(45, 125);
          ps.spawn(P.SPARK, TX, HY, Math.cos(a) * sp, Math.sin(a) * sp - 15, R.range(0.16, 0.36));
        }
      }
      // mist motes rising off the taut string
      if (t > 0.22 && t < SNAP_T && R.chance(dt * 24)) {
        const u = R.range(0.08, 0.92), x = lerp(2, TX, u), y = threadY(u);
        ps.spawn(P.EMBER, x, y, R.range(-8, 8), -R.range(12, 28), R.range(0.4, 0.75), R.chance(0.35) ? G[5] : C[5]);
      }
      if (!knotted && t >= KNOT_T) {
        knotted = true;
        lights.add(MX, MY, 62, C[5], 1.0, 0.45);
        lights.add(MX, MY, 26, WHITE, 0.95, 0.12);
        for (let i = 0; i < 22; i++) {
          const a = R.range(0, TAU), sp = R.range(55, 165);
          ps.spawn(P.SPARK, MX, MY, Math.cos(a) * sp, Math.sin(a) * sp - 20, R.range(0.2, 0.5));
        }
        for (let i = 0; i < 16; i++) {
          const a = R.range(0, TAU), sp = R.range(18, 72);
          petals.spawn(MX + R.range(-4, 4), MY + R.range(-4, 4), Math.cos(a) * sp, Math.sin(a) * sp - 28, R.range(0.9, 1.45), R.range(2.0, 3.1));
        }
        for (let i = 0; i < 6; i++) {
          ps.spawn(P.STAR, MX + R.range(-16, 16), MY + R.range(-14, 10), R.range(-12, 12), -R.range(8, 22), R.range(0.35, 0.65), G[6], R.range(1.1, 2.2), R.range(0, 0.15));
        }
      }
      if (!parted && t >= SNAP_T) {
        parted = true;
        // thread dissolves along its span into rising ruby embers and trailing petals
        for (let i = 0; i <= 18; i++) {
          const u = i / 18, x = lerp(2, TX, u), y = threadY(u);
          ps.spawn(P.EMBER, x, y, R.range(-10, 10), -R.range(14, 34), R.range(0.4, 0.72), i % 3 === 0 ? G[5] : C[5]);
        }
        for (let i = 0; i < 6; i++) {
          petals.spawn(MX + R.range(-18, 18), MY + R.range(-6, 6), R.range(-22, 22), R.range(-18, 8), R.range(0.55, 0.78), R.range(1.8, 2.5));
        }
      }
      petals.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      // crimson floor rings binding caster and beloved
      for (const [cx, t0] of [[2, 0.02], [TX, 0.22]]) {
        const u = (t - t0) / 1.5;
        if (u > 0 && u < 1) {
          const r = 8 + 14 * ease.outCubic(Math.min(1, u * 2.5)), fade = 1 - smooth(0.55, 1, u);
          band(p, cx, 0, r, 0.18, 1.5, 0.85 * fade, [C[1], C[3], C[5], G[5]], (g) => Math.sin(g) < 0);
          p.glow(cx, -2, 18, C[4], 0.25 * fade);
        }
      }
      petals.draw(p, C, "back");
      ps.draw(p, "back");
    },

    draw(p) {
      for (const [cx, t0] of [[2, 0.02], [TX, 0.22]]) {
        const u = (t - t0) / 1.5;
        if (u > 0 && u < 1) {
          const r = 8 + 14 * ease.outCubic(Math.min(1, u * 2.5)), fade = 1 - smooth(0.55, 1, u);
          band(p, cx, 0, r, 0.18, 1.5, 0.85 * fade, [C[1], C[3], C[5], G[5]], (g) => Math.sin(g) >= 0);
        }
      }

      // the crimson filament itself
      if (t < SNAP_T) {
        const reach = ease.outCubic(clamp(t / 0.22));
        const fade = 1 - smooth(SNAP_T - 0.22, SNAP_T, t);
        const hot = t >= KNOT_T && t < KNOT_T + 0.08;
        const steps = 64, maxI = Math.floor(steps * reach);
        let px0 = 2, py0 = threadY(0);
        for (let i = 1; i <= maxI; i++) {
          const u = i / steps, x = lerp(2, TX, u), y = threadY(u);
          const midGlow = 1 - Math.abs(u - 0.52) * 1.4;
          const col = hot ? WHITE : midGlow > 0.65 && t > 0.5 ? C[7] : C[5];
          p.line(px0, py0, x, y, col, fade);
          // dark velvet shadow pixel just beneath to give the cord crisp body
          if (!hot && i % 2 === 0) p.dot(x, y + 1, C[2], fade * 0.75);
          if (i % 5 === 0) p.glow(x, y, 6, C[4], 0.22 * fade);
          px0 = x; py0 = y;
        }
        // leading spark head while shooting across
        if (t < 0.22) {
          sparkle(p, px0, py0, 5, C[7], C[5], 0.65);
        }
      }

      // twin soul-beads racing inward from both hearts to meet at KNOT_T
      if (t >= 0.24 && t < KNOT_T) {
        const k = ease.inOutQuad(seg(t, 0.24, KNOT_T));
        for (const u of [lerp(0.02, 0.52, k), lerp(0.98, 0.52, k)]) {
          const x = lerp(2, TX, u), y = threadY(u);
          p.circle(x, y, 2.3, C[5]);
          p.circle(x, y, 1.3, WHITE);
          p.glow(x, y, 11, C[5], 0.55);
        }
      }

      // small glowing heart seals on both chests
      for (const [hx, t0] of [[2, 0.04], [TX, 0.22]]) {
        if (t >= t0 && t < SNAP_T + 0.15) {
          const a = Math.min(1, (t - t0) / 0.12) * (1 - smooth(SNAP_T - 0.15, SNAP_T + 0.15, t));
          const beat = 1 + 0.18 * Math.sin((t - t0) * 14);
          drawGothicHeart(p, hx, HY, 2.8 * beat, C, { a });
          p.glow(hx, HY, 12, C[5], 0.35 * a);
        }
      }

      // the midpoint gilded vow-knot & gothic heart
      if (t >= KNOT_T && t < SNAP_T + 0.35) {
        const age = t - KNOT_T;
        const fade = 1 - smooth(SNAP_T - 0.05, SNAP_T + 0.35, t);
        const pop = age < 0.12 ? ease.outBack(age / 0.12, 2.2) : 1 + 0.1 * Math.sin(age * 12);
        // expanding golden vow ring
        if (age < 0.38) {
          const ru = age / 0.38;
          ringFast(p, MX, MY, 4 + 22 * ease.outQuart(ru), Math.max(1, 2.4 * (1 - ru)), ru < 0.3 ? WHITE : G[5], 1 - ru);
        }
        if (age < 0.14) flare(p, MX, MY, 16 * (1 - age / 0.14), 1 - age / 0.14, G);
        // infinity-loop filigree wings flanking the heart + delicate draped golden vow-chains
        for (const side of [-1, 1]) {
          for (let a = 0; a < TAU; a += 0.32) {
            const lx = MX + side * (5.5 + Math.cos(a) * 4.2) * pop;
            const ly = MY + Math.sin(a) * 2.6 * pop;
            p.dot(lx, ly, Math.sin(a) < 0 ? G[6] : G[3], fade);
          }
          const endX = side < 0 ? 2 : TX;
          for (let i = 1; i < 18; i++) {
            const u = i / 18, cx = lerp(MX, endX, u);
            const sag = Math.sin(u * Math.PI) * 6.5 * pop;
            p.dot(cx, lerp(MY, HY, u) + sag, i % 2 === 0 ? G[5] : G[3], fade * 0.85);
          }
        }
        drawGothicHeart(p, MX, MY, 5.2 * pop, C, { a: fade, white: age < 0.045, gold: G });
        p.glow(MX, MY, 24, C[5], 0.48 * fade);
      }

      petals.draw(p, C, "front");
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}

function seg(t, t0, t1) {
  return clamp((t - t0) / (t1 - t0));
}
function flare(p, x, y, L, k, R) {
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a);
    for (let d = 0; d <= L; d += 1) {
      const u = d / Math.max(1, L);
      p.dot(x + ca * d, y + sa * d, u < 0.35 ? WHITE : R[6], (1 - u) * k);
    }
  }
}
