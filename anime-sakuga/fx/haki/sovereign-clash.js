// Sovereign's Clash: Conqueror's Haki infusion & non-contact pressure clash.
// Fist coils in dripping obsidian-crimson lightning, lunges in, and halts 20px short of the target:
// two hemispheres of sheer willpower collide across empty air with a 2-frame sakuga flash, towering
// black-core lightning trunks, and shattered stone cubes.

import { Particles, Lights, P, Rng, rng, fit, clamp, smooth, seg, ease, band, flare, TAU, WHITE, BLACK, READY } from "../../../src/core/index.js";
import { SAKUGA_PAL } from "../categories.js";
import { blackBolt, handAt, unlight, YutaponSim, impactBurst, ringFast } from "../_lib.js";

export const meta = {
  name: "Sovereign's clash",
  desc: "Obsidian-cored crimson lightning coils round a cocked fist and detonates across an untouched air gap, splitting the sky with black bolts and heaving stone.",
  tags: ["haki", "conqueror", "lightning", "black-lightning", "clash", "anime", "melee", "one-shot"],
  size: [284, 212],
  origin: [66, 158],
  duration: 2.8,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: SAKUGA_PAL.conqueror, seed: 5 },
};

const DASH = 0.52, HIT = 0.68;
const AT = 46, TX = 110;
// Untouched clash midpoint between the halted fist (62, -24) and the target (110, -24)
const CX = 85, CY = -24;

const COIL = { ...READY, crouch: 6, lean: -3, fx: -8, fy: -21, bx: 11, by: -23, ffx: 9, fbx: -9, turn: -0.35 };
const RUN = { ...READY, crouch: 5, lean: 8, fx: -7, fy: -20, bx: 11, by: -25, ffx: 12, fbx: -11, ghost: 1 };
const PUNCH = { ...READY, crouch: 5, lean: 7, fx: 16, fy: -24, bx: -8, by: -23, ffx: 13, fbx: -11, toeB: true };

export const act = {
  target: { x: TX },
  ghost: "#4d081d",
  poses: [
    [-0.45, { ...READY }],
    [-0.16, { ...COIL, crouch: 4, fx: -5 }],
    [0, COIL, "snap"],
    [0.36, { ...COIL, crouch: 8, lean: -4, fx: -9, fy: -20 }],
    [DASH, { ...RUN, x: 8 }, "snap"],
    [HIT - 0.03, { ...RUN, x: AT - 6 }, "line"],
    [HIT, { ...PUNCH, x: AT }, "snap"],
    [HIT + 0.52, { ...PUNCH, x: AT + 1, crouch: 6 }],
    [HIT + 0.72, { ...READY, x: AT - 5, crouch: 4, fx: 12, fy: -22 }, "out"],
    [1.9, { ...READY, x: AT - 6 }],
    [2.8, { ...READY, x: AT - 6 }],
  ],
  hits: [
    { t: HIT, stop: 0.18, shake: 0.38, amp: 3, push: 4.8, straw: 32, flash: 0.08, skin: "red" },
    { t: HIT + 0.22, stop: 0.04, shake: 0.18, amp: 2, push: 1.4, straw: 10 },
    { t: 2.0, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [
    { t: 0.1, x: -4, n: 5, dir: -1 },
    { t: DASH, x: 4, n: 9, dir: -1 },
    { t: HIT, x: CX, n: 10, dir: 1 },
  ],
};

const STONE = ["#0b090d", "#1b1720", "#302938", "#4a4054", "#6b5d78", "#9484a3", "#c2b4cf", "#ece4f2"];

export function create(o) {
  const C = fit(o.palette, 8), S = fit(STONE, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]], haze: C[4] });
  const lights = new Lights(), cubes = new YutaponSim(R, 0);

  // Pre-roll towering sky/diagonal Conqueror bolt anchors for deterministic silhouette
  const pillars = [
    { dx: -38, dy: -92, t0: 0, dur: 0.52 },
    { dx: 42, dy: -94, t0: 0.02, dur: 0.56 },
    { dx: -86, dy: -56, t0: 0.04, dur: 0.44 },
    { dx: 88, dy: -58, t0: 0.05, dur: 0.46 },
    { dx: -14, dy: -102, t0: 0.09, dur: 0.58 },
    { dx: 18, dy: 16, t0: 0.03, dur: 0.40 },
  ];

  let t = 0, clashed = false, nextDrip = 0.05;

  return {
    update(dt) {
      t += dt;
      // Charge phase: Haki sparks & rising dark vapour off the cocked fist
      if (t < HIT && t >= nextDrip) {
        nextDrip += 0.06;
        const [hx, hy] = handAt(act.poses, t);
        ps.spawn(P.MOTE, hx + R.range(-4, 4), hy + R.range(-4, 4), R.range(-36, 20), R.range(-48, 12), R.range(0.18, 0.36), C[5], 0.8);
        ps.spawn(P.VAPOUR, hx, hy + 2, R.range(-18, 12), R.range(-28, -8), R.range(0.28, 0.48), C[2], R.range(3, 5));
      }

      if (!clashed && t >= HIT) {
        clashed = true;
        lights.add(CX, CY, 82, C[5], 0.95, 0.45);
        lights.add(CX, CY, 34, WHITE, 0.9, 0.14);
        // Crimson & white sparks exploding radially from the untouched gap
        for (let i = 0; i < 34; i++) {
          const a = R.range(0, TAU), sp = R.range(90, 260);
          ps.spawn(P.SPARK, CX, CY, Math.cos(a) * sp, Math.sin(a) * sp * 0.72 - 30, R.range(0.22, 0.58));
        }
        // Dust & smoke rolling outward from beneath the clash
        for (let dir of [-1, 1]) {
          for (let i = 0; i < 6; i++) {
            ps.spawn(P.DUST, CX + dir * R.range(4, 18), -2, dir * R.range(35, 105), R.range(-32, -8), R.range(0.45, 0.85), C[2], R.range(4, 7));
          }
        }
        // Yutapon isometric rock cubes torn out of the floor beneath the gap
        for (let i = 0; i < 14; i++) {
          const dir = i % 2 === 0 ? -1 : 1;
          cubes.spawn(
            CX + R.range(-18, 18), -2,
            dir * R.range(28, 115), R.range(-185, -75),
            R.range(0.75, 1.35), R.range(2.6, 4.4), R.range(0, 0.06)
          );
        }
      }

      cubes.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration - 0.04) return;
      // Expanding sovereign pressure rings on the floor (far half)
      if (t >= HIT && t < HIT + 0.95) {
        for (let k = 0; k < 2; k++) {
          const u = seg(t, HIT + k * 0.1, HIT + 0.72 + k * 0.14);
          if (u <= 0 || u >= 1) continue;
          const r = 12 + 78 * ease.outQuart(u);
          band(p, CX, 0, r, 0.17, 3.2 * (1 - u), (1 - u) * 0.9, C, (g) => Math.sin(g) < 0, u < 0.25);
        }
      }
      // Glowing crimson floor rift beneath the clash point
      if (t >= HIT && t < 2.45) {
        const fade = 1 - smooth(1.6, 2.45, t);
        p.line(CX - 34, 1, CX + 36, 1, C[0], fade);
        p.line(CX - 26, 0, CX + 28, 0, t < HIT + 0.35 ? WHITE : C[5], fade);
        p.glowLine(CX - 24, 0, CX + 24, 0, 5, C[4], 0.32 * fade);
      }
      cubes.draw(p, S, "back", C[5]);
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration - 0.04) return;
      const f = Math.floor(t * 30);
      const [hx, hy] = handAt(act.poses, t);

      // 1. Charge & Dash: oozing obsidian-crimson Haki aura + trailing black lightning off the fist
      if (t < HIT) {
        const pwr = clamp(t / DASH) * 0.85 + 0.15;
        p.glow(hx, hy, 22 * pwr, C[4], 0.48 * pwr);
        // Pitch-black Haki fist coating with crimson rim
        p.circle(hx, hy, 4.2, C[5]);
        p.circle(hx, hy, 2.8, BLACK);
        unlight(p, hx - 3, hy - 3, hx + 3, hy + 3, (x, y) => Math.hypot(x - hx, y - hy) < 2.4, 0);
        p.px(hx - 1, hy - 1, C[7]);

        const Rf = rng(o.seed + 11, Math.floor(f / 2));
        const nArcs = t < DASH ? 3 : 4;
        for (let i = 0; i < nArcs; i++) {
          const a = t < DASH ? Rf.range(0, TAU) : Math.PI + Rf.range(-0.45, 0.45);
          const len = t < DASH ? Rf.range(14, 28) * pwr : Rf.range(28, 48);
          blackBolt(p, Rf, hx, hy, hx + Math.cos(a) * len, hy + Math.sin(a) * len * 0.75, C, {
            jag: 0.28, depth: 3, nForks: 1, k: pwr, glow: 0.36,
          });
        }
        // Subtle crimson aura ring under caster's stance during charge
        if (t < DASH) {
          const pulse = (t * 3.5) % 1;
          band(p, 0, 0, 8 + 20 * pulse, 0.18, 1.8 * (1 - pulse), (1 - pulse) * 0.7, C, (g) => Math.sin(g) >= 0, false);
        }
      }

      // 2. Non-contact Sakuga Impact Frames (2 frames: white burst -> inverted obsidian burst)
      if (t >= HIT && t < HIT + 0.08) {
        const inv = t >= HIT + 0.038;
        const Ri = rng(o.seed + 31, inv ? 2 : 1);
        impactBurst(p, Ri, CX, CY, 62, C, inv ? "invert" : "white", 1);
      }

      // 3. Untouched Willpower Barrier: twin opposing hemispheres separated by a razor black void gap!
      if (t >= HIT && t < HIT + 0.46) {
        const u = (t - HIT) / 0.46;
        const fade = 1 - smooth(0.45, 1, u);
        // Left hemisphere (from fighter's fist) & Right hemisphere (target resistance)
        const rad = 14 + 6 * ease.outCubic(u);
        p.arc(CX - 3, CY, rad, 2.6 * fade, -1.15, 1.15, u < 0.2 ? WHITE : C[6], fade);
        p.arc(CX + 3, CY, rad, 2.2 * fade, Math.PI - 1.05, Math.PI + 1.05, u < 0.2 ? WHITE : C[5], fade);
        // Stark black slit between the two non-touching arcs
        p.line(CX, CY - rad * 0.95, CX, CY + rad * 0.95, BLACK, fade);
        unlight(p, CX - 1, CY - rad, CX + 1, CY + rad, (x) => Math.abs(x - CX) < 0.9, 0);

        // Spherical sovereign dome expanding and thinning
        const domeR = 12 + 56 * ease.outQuart(u);
        ringFast(p, CX, CY, domeR, Math.max(1, 2.8 * (1 - u)), u < 0.22 ? WHITE : C[5], (1 - u) * 0.85);
      }

      // 4. Towering Conqueror's Black-Red Lightning Pillars roaring out of the clash
      if (t >= HIT && t < HIT + 0.78) {
        const Rb = rng(o.seed + 73, Math.floor((t - HIT) * 18));
        for (const pl of pillars) {
          const u = seg(t, HIT + pl.t0, HIT + pl.t0 + pl.dur);
          if (u <= 0 || u >= 1) continue;
          const reach = ease.outExpo(Math.min(1, u * 3.2));
          const k = 1 - smooth(0.42, 1, u);
          blackBolt(p, Rb, CX, CY, CX + pl.dx * reach, CY + pl.dy * reach, C, {
            jag: 0.24, depth: 4, nForks: 2, forkLen: 0.38, k, thick: 1.45, glow: 0.46,
          });
        }
        if (t < HIT + 0.22) {
          const g = (t - HIT) / 0.22;
          flare(p, CX, CY, 24 * (1 - g), (1 - g) * 0.85, C);
        }
      }

      // Residual black-crimson sparks snapping around the clash scar
      if (t >= HIT + 0.5 && t < 1.85) {
        const fade = 1 - smooth(1.15, 1.85, t);
        if (f % 3 === 0) {
          const Rs = rng(o.seed + 99, f);
          const ax = CX + Rs.range(-28, 28), ay = CY + Rs.range(-22, 18);
          blackBolt(p, Rs, ax, ay, ax + Rs.range(-18, 18), ay + Rs.range(-16, 14), C, {
            jag: 0.3, depth: 3, nForks: 0, k: fade * 0.8, glow: 0.25,
          });
        }
      }

      // Near half of floor pressure rings
      if (t >= HIT && t < HIT + 0.95) {
        for (let k = 0; k < 2; k++) {
          const u = seg(t, HIT + k * 0.1, HIT + 0.72 + k * 0.14);
          if (u <= 0 || u >= 1) continue;
          const r = 12 + 78 * ease.outQuart(u);
          band(p, CX, 0, r, 0.17, 3.2 * (1 - u), (1 - u) * 0.95, C, (g) => Math.sin(g) >= 0, u < 0.25);
        }
      }

      cubes.draw(p, S, "front", C[5]);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
