// Blazing Piston (Red Hawk): pink overdrive steam rises off a coiled fighter while his rear-cocked
// obsidian-armored fist ignites in a swirling fire vortex, then snaps into a hyper-extended flame tunnel
// ringed by three white Mach vapor cones that punches straight through the target.

import { Particles, Lights, P, PF, Rng, rng, fit, clamp, smooth, seg, ease, flare, TAU, WHITE, BLACK, hex, READY } from "../../../src/core/index.js";
import { SAKUGA_PAL } from "../categories.js";
import { machRing, handAt, tone, unlight } from "../_lib.js";

export const meta = {
  name: "Blazing piston",
  desc: "Overdrive steam rises as a rear-cocked obsidian fist ignites in a fire vortex, then snaps through the target on three Mach cones in a roaring flame tunnel.",
  tags: ["brawler", "fire", "punch", "elastic", "steam", "mach", "one-piece", "one-shot"],
  size: [292, 160],
  origin: [64, 128],
  duration: 3.0,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: SAKUGA_PAL.redHawk, seed: 4 },
};

const IGNITE = 0.14, HIT = 0.72, RETRACT = 1.04;
const TX = 108, END_X = 148, PY = -24;
const STEAM_PINK = hex("#ff9eb5");

const STEAM_POSE = { ...READY, crouch: 6, lean: 2, fx: 9, fy: -20, bx: 8, by: -22, ffx: 9, fbx: -9 };
const COCK = { ...READY, crouch: 7, lean: -4, fx: -11, fy: -23, bx: 13, by: -24, ffx: 10, fbx: -10, turn: -0.45 };
const SNAP = { ...READY, x: 10, crouch: 5, lean: 8, fx: 16, fy: -24, bx: -8, by: -23, ffx: 13, fbx: -11, toeB: true };

export const act = {
  target: { x: TX },
  ghost: "#ba3912",
  poses: [
    [-0.45, { ...READY }],
    [-0.15, STEAM_POSE],
    [0, STEAM_POSE, "snap"],
    [IGNITE + 0.08, COCK, "out"],
    [HIT - 0.04, { ...COCK, crouch: 8, lean: -5, fx: -12 }],
    [HIT, SNAP, "snap"],
    [RETRACT, { ...SNAP, x: 11, crouch: 6 }],
    [RETRACT + 0.14, { ...READY, x: 6, crouch: 4, fx: 11, fy: -21 }, "snap"],
    [1.9, { ...READY, x: 4 }],
    [3.0, { ...READY, x: 4 }],
  ],
  hits: [
    { t: HIT, stop: 0.16, shake: 0.36, amp: 3, push: 5.4, straw: 34, flash: 0.08, skin: "char" },
    { t: 2.2, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [
    { t: 0.05, x: -4, n: 5, dir: -1 },
    { t: HIT, x: 6, n: 10, dir: -1 },
  ],
};

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]], haze: C[4] });
  const lights = new Lights();

  const cones = [36, 70, 104];
  let t = 0, fired = false, nextSteam = 0.02, nextSwirl = IGNITE;

  return {
    update(dt) {
      t += dt;
      // Gear-2 pink-tinted steam puffs rising off the body during charge & early strike
      if (t < 1.2 && t >= nextSteam) {
        nextSteam += 0.075;
        const sx = (t >= HIT ? 8 : 0) + R.range(-9, 9), sy = R.range(-34, -6);
        ps.spawn(P.VAPOUR, sx, sy, R.range(-12, 10), R.range(-36, -16), R.range(0.32, 0.58), STEAM_PINK, R.range(3.2, 5.2));
      }

      // Rear-cocked arm fire vortex gathering embers & flame puffs behind the shoulder
      if (t >= IGNITE && t < HIT && t >= nextSwirl) {
        nextSwirl += 0.035;
        const [hx, hy] = handAt(act.poses, t);
        ps.spawn(P.FIRE, hx - R.range(2, 16), hy + R.range(-7, 7), R.range(-35, 10), R.range(-48, -12), R.range(0.22, 0.42), 0, R.range(2.5, 4.5));
        ps.spawn(P.SPARK, hx - R.range(0, 14), hy + R.range(-5, 5), R.range(-65, 25), R.range(-60, 20), R.range(0.16, 0.34));
      }

      // Supersonic Piston Release: tunnel of fire + explosive rear blowout behind the target!
      if (!fired && t >= HIT) {
        fired = true;
        lights.add(TX + 12, PY, 86, C[5], 0.95, 0.48);
        lights.add(42, PY, 48, C[6], 0.75, 0.22);
        // Massive blow-through cone of fire & smoke erupting out the target's back!
        for (let i = 0; i < 28; i++) {
          const a = R.range(-0.42, 0.42), sp = R.range(75, 210);
          ps.spawn(
            P.FIRE, TX + R.range(0, 18), PY + R.range(-7, 7),
            Math.cos(a) * sp, Math.sin(a) * sp - 14,
            R.range(0.32, 0.72), 0, R.range(4, 7.5), R.range(0, 0.08), PF.SMOKES
          );
        }
        for (let i = 0; i < 32; i++) {
          const a = R.range(-0.65, 0.65), sp = R.range(90, 240);
          ps.spawn(P.SPARK, TX + 4, PY, Math.cos(a) * sp, Math.sin(a) * sp - 20, R.range(0.22, 0.6));
        }
        // Scorching embers shed along the entire piston shaft
        for (let i = 0; i < 16; i++) {
          ps.spawn(P.EMBER, R.range(28, END_X), PY + R.range(-6, 6), R.range(15, 65), R.range(-35, -8), R.range(0.5, 1.1));
        }
      }

      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration - 0.04) return;
      // Soft crimson overdrive glow on the body & floor
      if (t < RETRACT + 0.2) {
        const gx = t >= HIT ? 8 : 0;
        p.glow(gx, -20, 26, STEAM_PINK, 0.22 * (1 - smooth(HIT, RETRACT + 0.2, t)));
      }
      // Far halves of the three tilted Mach vapor shock-rings
      if (t >= HIT && t < HIT + 0.36) {
        cones.forEach((cx, idx) => {
          const u = seg(t, HIT + idx * 0.02, HIT + 0.28 + idx * 0.03);
          if (u <= 0 || u >= 1) return;
          const ry = (14 + idx * 4.2) * (0.58 + 0.62 * ease.outQuart(u));
          machRing(p, cx, PY, 5 + idx, ry, 2.5 * (1 - u), C, 1 - u, "back", true);
        });
      }
      // Scorched floor streak beneath the flame piston
      if (t >= HIT && t < 2.3) {
        const fade = 1 - smooth(1.4, 2.3, t);
        p.glowLine(24, 0, TX + 44, 0, 6, C[4], 0.28 * fade);
        p.line(30, 0, TX + 38, 0, t < HIT + 0.3 ? C[6] : C[2], fade * 0.85);
      }
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration - 0.04) return;
      const [hx, hy] = handAt(act.poses, t);

      // 1. Rear Cock Vortex (t = IGNITE..HIT): spiraling flame ribbons wrapping an obsidian Haki fist behind him
      if (t >= IGNITE && t < HIT) {
        const u = seg(t, IGNITE, HIT);
        const cx = hx - 8, cy = hy;
        p.glow(cx, cy, 28 * u + 8, C[5], 0.55 * u);
        for (let s = 0; s < 3; s++) {
          let prev = null;
          for (let j = 0; j <= 10; j++) {
            const q = j / 10, a = q * 4.2 - t * 22 + (s * TAU) / 3;
            const r = (3 + 13 * (1 - q)) * Math.min(1, u * 1.8);
            const px = cx - (1 - q) * 12 + Math.cos(a) * r * 0.55, py = cy + Math.sin(a) * r;
            if (prev) p.line(prev[0], prev[1], px, py, q > 0.65 ? WHITE : q > 0.35 ? C[6] : C[4]);
            prev = [px, py];
          }
        }
        // Glossy obsidian Haki fist core
        p.circle(hx - 2, hy, 4.2, C[5]);
        p.circle(hx - 2, hy, 3.0, BLACK);
        unlight(p, hx - 5, hy - 3, hx + 1, hy + 3, (x, y) => Math.hypot(x - (hx - 2), y - hy) < 2.6, 0);
        p.px(hx - 3, hy - 1, WHITE);
      }

      // 2. Hyper-Extended Flame Piston & Obsidian Arm Smear (t = HIT..RETRACT+0.12)
      if (t >= HIT && t < RETRACT + 0.12) {
        const retractU = seg(t, RETRACT, RETRACT + 0.12);
        const startX = 24;
        const tipX = retractU > 0 ? END_X - (END_X - 28) * ease.inBack(retractU) : startX + (END_X - startX) * ease.outExpo(clamp((t - HIT) / 0.05));
        const holdFade = 1 - retractU;

        // Outer helical flame tunnel around the stretched arm
        const w0 = 7.5 * (1 - 0.35 * smooth(HIT + 0.08, RETRACT, t));
        for (let x = startX; x <= tipX - 4; x += 1) {
          const u = (x - startX) / Math.max(1, tipX - startX);
          const w = w0 * (0.65 + 0.55 * u) * (1 + 0.14 * Math.sin(x * 0.25 - t * 48));
          for (let dy = -w; dy <= w; dy += 1) {
            const q = Math.abs(dy) / Math.max(0.5, w);
            // Dark obsidian arm-shaft running right down the center (q < 0.24) wrapped in white-gold fire!
            let col;
            if (q < 0.22 && u < 0.92) col = BLACK;
            else if (q < 0.42) col = WHITE;
            else col = tone(C, 6.6 - q * 3.8, x, PY + dy);
            p.dot(x, PY + dy, col, holdFade * (q > 0.82 ? 0.75 : 1));
          }
          if ((x & 7) === 0) p.glow(x, PY, w * 2.2 + 5, C[5], 0.28 * holdFade);
          // Bright double-helix fire ribbons whipping round the front of the shaft
          for (let h = 0; h < 2; h++) {
            const a = x * 0.16 - t * 38 + h * Math.PI;
            if (Math.cos(a) > -0.1) {
              const ry = PY + Math.sin(a) * (w + 2.2);
              p.dot(x, ry, Math.cos(a) > 0.55 ? WHITE : C[6], holdFade);
              p.dot(x, ry + 1, C[4], holdFade * 0.8);
            }
          }
        }

        // Oversized obsidian Haki fist slamming out the far side of the target!
        if (retractU < 0.7) {
          p.glow(tipX, PY, 22, C[6], 0.55 * holdFade);
          p.circle(tipX, PY, 6.2, C[6], holdFade);
          p.circle(tipX, PY, 4.6, BLACK, holdFade);
          unlight(p, tipX - 5, PY - 5, tipX + 5, PY + 5, (x, y) => Math.hypot(x - tipX, y - PY) < 4.1, 0);
          p.line(tipX - 2, PY - 2, tipX + 1, PY - 2, WHITE, holdFade);
        }
      }

      // 3. Near halves of the three tilted Mach vapor shock-rings + target pierce flare
      if (t >= HIT && t < HIT + 0.36) {
        cones.forEach((cx, idx) => {
          const u = seg(t, HIT + idx * 0.02, HIT + 0.28 + idx * 0.03);
          if (u <= 0 || u >= 1) return;
          const ry = (14 + idx * 4.2) * (0.58 + 0.62 * ease.outQuart(u));
          machRing(p, cx, PY, 5 + idx, ry, 2.5 * (1 - u), C, 1 - u, "front", true);
        });
        if (t < HIT + 0.2) {
          const g = (t - HIT) / 0.2;
          flare(p, TX, PY, 24 * (1 - g), 1 - g, C);
        }
      }

      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
