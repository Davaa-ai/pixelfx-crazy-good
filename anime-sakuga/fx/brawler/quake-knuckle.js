// Tremor Air-Shatter (Gura Gura): a shimmering sea-quake sphere compresses onto a cocked fist, then
// slams into empty air — fracturing space itself into glowing plate-glass facets during hit-stop
// before detonating a concussive hemisphere that heaves the stone floor into tumbling blocks.

import { Particles, Lights, P, Rng, fit, clamp, smooth, seg, ease, band, flare, TAU, WHITE, BLACK, READY } from "../../../src/core/index.js";
import { SAKUGA_PAL } from "../categories.js";
import { handAt, YutaponSim, ringFast } from "../_lib.js";

const QUAKE_PAL = ["#06111c", "#0f2740", "#1b4b75", "#2d7bb3", "#5cb6eb", "#a8e2ff", "#e3f7ff", "#ffffff"];
const STONE = ["#0c0b0f", "#1d1a24", "#332e3d", "#4f475e", "#736885", "#9d91b0", "#cbc2db", "#f2edf7"];

export const meta = {
  name: "Tremor air-shatter",
  desc: "A compressed quake bubble slams into empty air, spiderwebbing mid-air like cracked plate glass before blasting a shockwave dome across heaving stone.",
  tags: ["brawler", "quake", "shatter", "shockwave", "glass", "one-piece", "one-shot"],
  size: [324, 180],
  origin: [60, 138],
  duration: 3.0,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: QUAKE_PAL, seed: 8 },
};

const CRACK = 0.56, BLAST = 0.82;
const TX = 128;
// He punches empty air right at (22, -25)!
const AX = 22, AY = -25;

const COIL = { ...READY, crouch: 6, lean: -4, fx: -10, fy: -25, bx: 11, by: -22, ffx: 9, fbx: -10, turn: -0.4 };
const SMASH = { ...READY, x: 6, crouch: 6, lean: 6, fx: 16, fy: -25, bx: -8, by: -23, ffx: 13, fbx: -11, toeB: true };

export const act = {
  target: { x: TX },
  poses: [
    [-0.45, { ...READY }],
    [-0.18, { ...COIL, crouch: 4, fx: -6 }],
    [0, COIL, "snap"],
    [0.42, { ...COIL, crouch: 8, lean: -5, fx: -11, fy: -26 }],
    [CRACK, SMASH, "snap"],
    [BLAST, { ...SMASH, x: 7, crouch: 7, lean: 7 }],
    [BLAST + 0.42, { ...SMASH, x: 5, crouch: 5, lean: 3 }, "out"],
    [1.8, { ...READY, x: 2 }],
    [3.0, { ...READY, x: 2 }],
  ],
  hits: [
    { t: CRACK, stop: 0.14, shake: 0.22, amp: 2, push: 0.4, straw: 4 },
    { t: BLAST + 0.05, stop: 0.17, shake: 0.42, amp: 3, push: 6.2, straw: 38, flash: 0.08 },
  ],
  dust: [
    { t: CRACK, x: 8, n: 7, dir: 1 },
    { t: BLAST + 0.04, x: TX - 12, n: 12, dir: 1 },
  ],
};

export function create(o) {
  const C = fit(o.palette, 8), S = fit(STONE, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]], haze: C[4] });
  const lights = new Lights(), cubes = new YutaponSim(R, 0);

  // Build deterministic angular Voronoi/spiderweb air-fracture tree from (AX, AY)
  const seams = [];
  const shards = [];
  const mainAngles = [-1.25, -0.68, -0.18, 0.28, 0.76, 1.32, 2.35, -2.45];
  const tips = [];
  for (let i = 0; i < mainAngles.length; i++) {
    const a = mainAngles[i] + R.range(-0.08, 0.08);
    const r1 = R.range(20, 30), r2 = R.range(42, 62);
    const mx = AX + Math.cos(a) * r1, my = AY + Math.sin(a) * r1 * 0.85;
    const a2 = a + R.range(-0.26, 0.26);
    const ex = AX + Math.cos(a2) * r2, ey = clamp(AY + Math.sin(a2) * r2 * 0.85, -112, -2);
    seams.push({ x0: AX, y0: AY, x1: mx, y1: my, w: 2 });
    seams.push({ x0: mx, y0: my, x1: ex, y1: ey, w: 1 });
    // Side fork off the knee
    const fa = a + (i % 2 ? 0.52 : -0.52), fr = R.range(14, 26);
    const fx = mx + Math.cos(fa) * fr, fy = clamp(my + Math.sin(fa) * fr * 0.85, -112, -2);
    seams.push({ x0: mx, y0: my, x1: fx, y1: fy, w: 1 });
    tips.push([mx, my], [ex, ey]);
  }
  // Cross-chord glass facets between adjacent crack knees
  for (let i = 0; i < mainAngles.length; i++) {
    const p1 = tips[i * 2], p2 = tips[((i + 1) % mainAngles.length) * 2];
    seams.push({ x0: p1[0], y0: p1[1], x1: p2[0], y1: p2[1], w: 1 });
    shards.push({
      cx: (AX + p1[0] + p2[0]) / 3,
      cy: (AY + p1[1] + p2[1]) / 3,
      pts: [[AX, AY], p1, p2],
      vx: R.range(45, 165),
      vy: R.range(-75, 45),
    });
  }

  let t = 0, cracked = false, blasted = false;

  return {
    update(dt) {
      t += dt;
      if (!cracked && t >= CRACK) {
        cracked = true;
        lights.add(AX, AY, 52, WHITE, 0.9, 0.25);
        for (let i = 0; i < 14; i++) {
          const a = R.range(0, TAU), sp = R.range(45, 130);
          ps.spawn(P.MOTE, AX, AY, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.18, 0.35), WHITE, 0.8);
        }
      }

      if (!blasted && t >= BLAST) {
        blasted = true;
        lights.add(AX + 40, AY, 88, C[5], 0.95, 0.45);
        lights.add(TX, -24, 68, WHITE, 0.85, 0.26);
        // Glassy spatial sparks & concussive wind streaks blasting rightward across the stage
        for (let i = 0; i < 36; i++) {
          const a = R.range(-0.58, 0.52), sp = R.range(120, 290);
          ps.spawn(P.SPARK, AX + R.range(0, 24), AY + R.range(-18, 18), Math.cos(a) * sp, Math.sin(a) * sp - 12, R.range(0.24, 0.56));
        }
        // Stone floor ripped into tumbling Yutapon boulders along the quake path!
        for (let i = 0; i < 18; i++) {
          const rx = 36 + (i / 18) * 146 + R.range(-6, 6);
          cubes.spawn(
            rx, -2,
            R.range(25, 110), R.range(-195, -75),
            R.range(0.8, 1.45), R.range(2.8, 4.8), (i / 18) * 0.12
          );
        }
        for (let i = 0; i < 12; i++) {
          ps.spawn(P.DUST, 44 + i * 12, -2, R.range(35, 95), R.range(-36, -10), R.range(0.5, 0.95), S[4], R.range(4.5, 7.5), i * 0.01);
        }
      }

      cubes.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration - 0.04) return;
      // Floor fissure racing from below the fist past the target
      if (t >= BLAST && t < 2.45) {
        const reach = ease.outQuart(clamp((t - BLAST) / 0.18));
        const fade = 1 - smooth(1.65, 2.45, t);
        const ex = 26 + 162 * reach;
        p.line(24, 1, ex, 1, S[0], fade);
        p.line(26, 0, ex - 4, 0, t < BLAST + 0.35 ? WHITE : C[5], fade * 0.9);
        p.glowLine(28, 0, ex - 6, 0, 5, C[4], 0.3 * fade);
      }
      if (t >= BLAST && t < BLAST + 0.75) {
        const u = (t - BLAST) / 0.75;
        band(p, TX, 0, 14 + 68 * ease.outQuart(u), 0.17, 2.8 * (1 - u), (1 - u) * 0.85, C, (g) => Math.sin(g) < 0, u < 0.25);
      }
      cubes.draw(p, S, "back", C[5]);
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration - 0.04) return;
      const [hx, hy] = handAt(act.poses, t);

      // 1. Compressed Sea-Quake Bubble humming round the cocked fist (t = 0..CRACK)
      if (t < CRACK) {
        const u = clamp(t / 0.35);
        const r = (7.5 + 1.4 * Math.sin(t * 36)) * ease.outBack(u);
        p.glow(hx, hy, r * 2.4 + 6, C[5], 0.48 * u);
        p.disc(hx, hy, r, C[5], (d) => (d > 0.76 ? 0.72 : 0.18 + 0.16 * d));
        ringFast(p, hx, hy, r, 1.4, WHITE, 0.9);
        // Vibrating double tremor ring outside the bubble
        const vib = (t * 7) % 1;
        ringFast(p, hx, hy, r + 2 + 5 * vib, 1, C[6], (1 - vib) * 0.7);
      }

      // 2. Mid-Air Plate-Glass Spatial Fracture (holds taut during CRACK..BLAST, then shatters outward!)
      if (t >= CRACK && t < BLAST + 0.32) {
        const shattering = t >= BLAST;
        const su = shattering ? (t - BLAST) / 0.32 : 0;
        const grow = ease.outExpo(clamp((t - CRACK) / 0.06));
        const fade = 1 - smooth(0.25, 1, su);

        // Translucent glinting air-facets between cracks
        for (let i = 0; i < shards.length; i++) {
          const sh = shards[i];
          if (i % 2 === 0) {
            const ox = shattering ? sh.vx * su * 0.35 : 0;
            const oy = shattering ? sh.vy * su * 0.35 : 0;
            const pts = sh.pts.map(([px, py]) => [AX + (px - AX) * grow + ox, AY + (py - AY) * grow + oy]);
            p.poly(pts, i % 4 === 0 ? WHITE : C[5], (shattering ? 0.38 : 0.22) * fade);
          }
        }

        // Crisp dark-edged white fracture seams spiderwebbing through mid-air
        if (!shattering) {
          for (const s of seams) {
            const x1 = AX + (s.x1 - AX) * grow, y1 = AY + (s.y1 - AY) * grow;
            p.line(s.x0, s.y0 + 1, x1, y1 + 1, C[1], 0.85);
            p.line(s.x0, s.y0, x1, y1, s.w > 1 ? WHITE : C[6], 1);
            if (s.w > 1) p.glowLine(s.x0, s.y0, x1, y1, 4, C[5], 0.35);
          }
          p.circle(AX, AY, 4.5, WHITE);
          p.circle(AX, AY, 2.2, BLACK);
        }
      }

      // 3. Concussive Quake Hemisphere sweeping rightward across the stage!
      if (t >= BLAST && t < BLAST + 0.62) {
        const u = (t - BLAST) / 0.62;
        const frontX = AX + 178 * ease.outQuart(u);
        const domeH = 26 + 52 * ease.outCubic(u);
        const fade = 1 - smooth(0.45, 1, u);

        // Sweeping shockwave bow-arc
        p.arc(frontX - 24, AY + 4, domeH, 4.2 * fade, -0.92, 0.86, u < 0.22 ? WHITE : C[6], fade);
        p.arc(frontX - 30, AY + 4, domeH * 0.86, 2.0 * fade, -0.82, 0.78, C[4], fade * 0.75);
        p.glow(frontX - 6, AY, domeH * 0.9, C[5], 0.38 * fade);

        if (u < 0.28) {
          flare(p, AX, AY, 26 * (1 - u / 0.28), 1 - u / 0.28, C);
        }
      }

      if (t >= BLAST && t < BLAST + 0.75) {
        const u = (t - BLAST) / 0.75;
        band(p, TX, 0, 14 + 68 * ease.outQuart(u), 0.17, 2.8 * (1 - u), (1 - u) * 0.9, C, (g) => Math.sin(g) >= 0, u < 0.25);
      }

      cubes.draw(p, S, "front", C[5]);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
