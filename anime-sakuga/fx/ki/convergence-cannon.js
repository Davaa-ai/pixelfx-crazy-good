// Convergence Cannon: cupped hands drawn to the hip pull long converging rays into a blazing star,
// then thrust forward to unleash a screen-spanning helical plasma wave that engulfs the target and
// carves the stone floor into tumbling 3D isometric "Yutapon" rock cubes.

import { Particles, Lights, P, Rng, rng, fit, clamp, smooth, seg, ease, fract, sparkle, flare, TAU, WHITE, READY } from "../../../src/core/index.js";
import { SAKUGA_PAL } from "../categories.js";
import { machRing, YutaponSim, ringFast, bayer, handAt } from "../_lib.js";

const BEAM_PAL = ["#040b1c", "#0a1e47", "#123e8a", "#1d6fd6", "#42a8ff", "#8ee0ff", "#dff8ff", "#ffffff"];
const STONE = ["#0b0d12", "#1a1f29", "#2e3645", "#485469", "#6b7b96", "#97a8c4", "#cad6eb", "#f2f6fc"];

export const meta = {
  name: "Convergence cannon",
  desc: "Cupped hands at the hip gather long light rays into a star, then fire a helical plasma wave that tears the floor into tumbling Yutapon stone cubes.",
  tags: ["ki", "beam", "cannon", "kamehameha", "yutapon", "plasma", "anime", "one-shot"],
  size: [336, 164],
  origin: [62, 128],
  duration: 3.2,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: BEAM_PAL, seed: 5 },
};

const FIRE = 0.86, HIT = 0.94, PINCH = 1.96;
const TX = 142, MAX_X = 242, BY = -23;

const CUP_HIP = { ...READY, crouch: 6, lean: -3, fx: -8, fy: -19, bx: -5, by: -21, armsFront: true, ffx: 9, fbx: -9, turn: -0.35 };
const THRUST = { ...READY, x: 4, crouch: 6, lean: 7, fx: 15, fy: -23, bx: 14, by: -21, armsFront: true, ffx: 12, fbx: -11, toeB: true };

export const act = {
  target: { x: TX },
  poses: [
    [-0.45, { ...READY }],
    [-0.16, CUP_HIP],
    [0, { ...CUP_HIP, crouch: 7 }, "snap"],
    [0.45, { ...CUP_HIP, crouch: 8, lean: -4, fx: -9 }],
    [FIRE - 0.04, { ...CUP_HIP, crouch: 9, lean: -5, fx: -10 }],
    [FIRE, THRUST, "snap"],
    [PINCH, { ...THRUST, x: 2, crouch: 7 }],
    [PINCH + 0.25, { ...READY, x: 0, crouch: 4 }, "out"],
    [2.5, { ...READY, x: 0 }],
    [3.2, { ...READY, x: 0 }],
  ],
  hits: [
    { t: HIT, stop: 0.16, shake: 0.34, amp: 3, push: 3.5, straw: 20, flash: 0.08 },
    { t: HIT + 0.28, shake: 0.24, amp: 2, push: 1.6, straw: 10 },
    { t: HIT + 0.56, shake: 0.24, amp: 2, push: 1.8, straw: 12 },
    { t: HIT + 0.84, stop: 0.08, shake: 0.32, amp: 3, push: 4.2, straw: 24, flash: 0.06, skin: "char" },
    { t: 2.55, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [
    { t: 0.15, x: -6, n: 5, dir: -1 },
    { t: FIRE, x: -4, n: 12, dir: -1 },
  ],
};

export function create(o) {
  const C = fit(o.palette, 8), S = fit(STONE, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]], haze: C[4] });
  const lights = new Lights(), cubes = new YutaponSim(R, 0);

  // 10 long converging light rays drawn from around the hip star during charge
  const rays = Array.from({ length: 10 }, (_, i) => ({
    a: (i / 10) * TAU + R.range(-0.15, 0.15),
    len: R.range(28, 48),
    ph: R.range(0, 1),
  }));

  let t = 0, fired = false, pinched = false, nextCube = FIRE + 0.04, nextSpark = FIRE + 0.03;

  return {
    update(dt) {
      t += dt;
      if (!fired && t >= FIRE) {
        fired = true;
        lights.add(22, BY, 64, C[5], 0.95, 0.35);
        lights.add(TX, BY, 76, C[5], 0.9, 0.55);
      }

      // Continuous fountain of tumbling isometric Yutapon rock cubes & sparks torn up by the beam!
      if (t >= FIRE && t < PINCH - 0.15 && t >= nextCube) {
        nextCube += 0.085;
        const rx = R.range(36, MAX_X - 30);
        cubes.spawn(rx, -2, R.range(25, 95), R.range(-165, -68), R.range(0.65, 1.05), R.range(2.6, 4.4), 0);
        ps.spawn(P.DUST, rx, -2, R.range(20, 75), R.range(-30, -8), R.range(0.35, 0.65), S[4], R.range(4, 6.5));
      }

      if (t >= HIT && t < PINCH && t >= nextSpark) {
        nextSpark += 0.04;
        const a = R.range(-1.3, 1.3), sp = R.range(95, 230);
        ps.spawn(P.SPARK, TX + R.range(-6, 12), BY + R.range(-8, 8), Math.cos(a) * sp, Math.sin(a) * sp - 18, R.range(0.18, 0.42));
      }

      // Final pinch-off: scattered twinkling motes & organic rising vapour wisps
      if (!pinched && t >= PINCH) {
        pinched = true;
        for (let i = 0; i < 16; i++) {
          const rx = R.range(28, MAX_X - 12);
          ps.spawn(P.MOTE, rx, BY + R.range(-3, 3), R.range(-25, 45), R.range(-48, 22), R.range(0.22, 0.48), i % 2 ? WHITE : C[6], 0.85);
        }
        for (let i = 0; i < 8; i++) {
          ps.spawn(P.VAPOUR, R.range(32, MAX_X - 24), BY + R.range(-5, 5), R.range(6, 26), R.range(-36, -12), R.range(0.35, 0.68), C[4], R.range(3.5, 6.5));
        }
      }

      cubes.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration - 0.04) return;
      // Glowing vaporized trench along the stone floor beneath the beam!
      if (t >= FIRE && t < 2.75) {
        const reach = ease.outExpo(clamp((t - FIRE) / 0.1));
        const fade = 1 - smooth(2.05, 2.75, t);
        const ex = 24 + (MAX_X - 24) * reach;
        p.line(24, 1, ex, 1, S[0], fade);
        p.line(26, 0, ex - 4, 0, t < PINCH ? WHITE : C[5], fade * 0.9);
        p.glowLine(28, 0, ex - 8, 0, 6, C[4], 0.32 * fade);
      }
      if (t >= FIRE && t < PINCH + 0.1) {
        const fade = t < PINCH ? 1 : 1 - (t - PINCH) / 0.1;
        machRing(p, 26, BY, 5, 18, 2.2, C, fade, "back", true);
      }
      cubes.draw(p, S, "back", C[5]);
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration - 0.04) return;
      const [hx, hy] = handAt(act.poses, t);

      // 1. Cupped-Hip Convergence Charge (0..FIRE): 10 long light-rays & beads collapsing into a pulsing star!
      if (t < FIRE) {
        const u = clamp(t / FIRE);
        const cx = hx - 1, cy = hy - 1;
        const coreR = (2.5 + 4.2 * u) * (1 + 0.15 * Math.sin(t * 42));
        p.glow(cx, cy, 34 * u + 8, C[4], 0.65 * u);

        for (let i = 0; i < rays.length; i++) {
          const ry = rays[i];
          const pull = fract(ry.ph - t * (1.8 + u * 1.6));
          const rOut = ry.len * (0.35 + 0.65 * pull) * (1 - 0.25 * smooth(0.75, 1, u));
          const rIn = coreR + 2;
          if (rOut > rIn + 2) {
            const x0 = cx + Math.cos(ry.a) * rOut, y0 = cy + Math.sin(ry.a) * rOut * 0.82;
            const x1 = cx + Math.cos(ry.a) * rIn, y1 = cy + Math.sin(ry.a) * rIn * 0.82;
            p.line(x0, y0, x1, y1, (lu) => (lu > 0.6 ? WHITE : C[5]), (1 - pull * 0.5) * u);
            // Travelling energy bead sliding inward along the ray!
            p.dot(x0, y0, WHITE, u);
          }
        }
        // Spinning 4-point star flare at the cupped palms
        for (let i = 0; i < 4; i++) {
          const a = t * 5 + (i * TAU) / 4, l = (8 + 9 * u) * (i % 2 ? 0.7 : 1);
          p.line(cx - Math.cos(a) * l, cy - Math.sin(a) * l, cx + Math.cos(a) * l, cy + Math.sin(a) * l, WHITE, u);
        }
        p.circle(cx, cy, coreR + 1.5, C[5]);
        p.circle(cx, cy, coreR, WHITE);
      }

      // 2. Screen-Spanning Helical Plasma Wave (FIRE..PINCH+0.14)!
      if (t >= FIRE && t < PINCH + 0.14) {
        const frontU = ease.outExpo(clamp((t - FIRE) / 0.08));
        const pinchU = seg(t, PINCH - 0.06, PINCH + 0.14);
        const sx = 22, ex = sx + (MAX_X - sx) * frontU;
        const halfW = 8.5 * (1 - pinchU * 0.92) * (1 + 0.09 * Math.sin(t * 52));
        const LV = [WHITE, C[6], C[5], C[4], C[2]];

        if (halfW > 0.4) {
          for (let x = sx; x <= ex; x += 1) {
            const w = halfW * (1 + 0.1 * Math.sin(x * 0.18 - t * 44)) * Math.min(1, (x - sx + 4) / 10);
            for (let dy = -w * 1.25; dy <= w * 1.25; dy += 1) {
              const q = Math.abs(dy) / Math.max(0.5, w);
              const lv = q < 0.34 ? 0 : q < 0.56 ? 1 : q < 0.78 ? 2 : q < 1.0 ? 3 : 4;
              if (lv === 4 && bayer(x, BY + dy) > (1.25 - q) / 0.25) continue;
              p.px(x, BY + dy, LV[lv]);
            }
            if ((x & 11) === 0) p.glow(x, BY, w * 2.4 + 6, C[4], 0.28 * (1 - pinchU));

            // Twin bright helical shock-strands wrapping round the plasma column!
            for (let h = 0; h < 2; h++) {
              const a = x * 0.13 - t * 34 + h * Math.PI;
              if (Math.cos(a) > -0.15) {
                const ry = BY + Math.sin(a) * (w + 2.4);
                p.dot(x, ry, Math.cos(a) > 0.5 ? WHITE : C[6], 1 - pinchU);
              }
            }
          }

          // Blazing spherical muzzle head at the thrusting palms + front Mach collar!
          const mr = halfW * 1.32;
          p.circle(sx + 2, BY, mr + 2, C[5]);
          p.circle(sx + 2, BY, mr, C[6]);
          p.circle(sx + 2, BY, mr * 0.65, WHITE);
          machRing(p, 26, BY, 5, 18 * (1 - pinchU), 2.2, C, 1 - pinchU, "front", true);

          // Engulfing impact dome around the target TX + shock rings!
          if (ex >= TX) {
            const ir = halfW * 1.45 + 1.5 * Math.sin(t * 60);
            p.glow(TX + 4, BY, 44, C[5], 0.55 * (1 - pinchU));
            p.circle(TX + 2, BY, ir + 2, C[5], 0.9);
            p.circle(TX + 2, BY, ir * 0.72, WHITE, 0.95);
            const ringQ = fract((t - HIT) * 5);
            ringFast(p, TX + 2, BY, 8 + 26 * ease.outCubic(ringQ), 1.8 * (1 - ringQ), WHITE, (1 - ringQ) * (1 - pinchU));
          }

          // Leading rounded plasma nosecone!
          p.circle(ex, BY, halfW * 1.15, C[5]);
          p.circle(ex, BY, halfW * 0.75, WHITE);
        } else {
          // Final 2-frame thin white snap-line when pinching shut!
          p.line(sx, BY, ex, BY, WHITE, 1 - pinchU);
        }
      }

      cubes.draw(p, S, "front", C[5]);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
