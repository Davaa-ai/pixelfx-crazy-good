// Sun-Drum Awakening (Gear 5): buoyant cartoon-physics bounce wrapped in a pearl-white hagoromo
// cloud-ribbon scarf; landing bends the stone floor into a rubbery sine wave before he springs
// skyward, snatches a jagged bolt of lightning in one bare hand, and hurls it into a star-pop blast.

import { Particles, Lights, P, Rng, rng, fit, clamp, smooth, seg, ease, poseAt, star, sparkle, TAU, WHITE, READY } from "../../../src/core/index.js";
import { SAKUGA_PAL } from "../categories.js";
import { brightBolt, handAt, ringFast } from "../_lib.js";

export const meta = {
  name: "Sun-drum awakening",
  desc: "Wrapped in a billowing pearl cloud-scarf, he bounces on a rubber-rippling floor, snatches a sky bolt out of mid-air, and hurls it in a star-pop blast.",
  tags: ["brawler", "awakening", "cloud", "lightning", "toon", "one-piece", "one-shot"],
  size: [284, 188],
  origin: [60, 146],
  duration: 3.1,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: SAKUGA_PAL.sunGod, seed: 11 },
};

const BOUNCE = 0.34, GRAB = 0.68, THROW = 0.94, HIT = 1.08;
const TX = 122, HY = -24;

const HOP1 = { ...READY, y: -16, crouch: 1, lean: -3, fx: -8, fy: -34, bx: 10, by: -32, ffx: 5, ffy: -6, fbx: -5, fby: -4, turn: 0.7 };
const SQUASH = { ...READY, x: 4, y: 0, crouch: 9, lean: 2, fx: -9, fy: -18, bx: 10, by: -19, ffx: 9, fbx: -9, turn: 0.5 };
const CATCH = { ...READY, x: 10, y: -26, crouch: 0, lean: -4, fx: 3, fy: -40, bx: -8, by: -26, ffx: 6, ffy: -7, fbx: -6, fby: -5 };
const HURL = { ...READY, x: 14, y: -20, crouch: 2, lean: 7, fx: 16, fy: -26, bx: -9, by: -24, ffx: 10, ffy: -5, fbx: -8, fby: -7 };

export const act = {
  target: { x: TX },
  ghost: "#aa8cff",
  poses: [
    [-0.4, { ...READY }],
    [-0.12, { ...READY, crouch: 6 }],
    [0, { ...READY, crouch: 5 }, "snap"],
    [0.18, HOP1, "out"],
    [BOUNCE, SQUASH, "in"],
    [GRAB, CATCH, "out"],
    [THROW - 0.05, { ...CATCH, x: 11, y: -25, fx: -5, fy: -39, lean: -6 }],
    [THROW, HURL, "snap"],
    [1.36, { ...READY, x: 12, y: 0, crouch: 6 }, "in"],
    [1.62, { ...READY, x: 10, crouch: 2 }, "out"],
    [3.1, { ...READY, x: 10 }],
  ],
  hits: [
    { t: HIT, stop: 0.16, shake: 0.34, amp: 3, push: 5.0, straw: 32, flash: 0.08, skin: "shock", shiver: 0.75 },
    { t: 2.25, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [
    { t: BOUNCE, x: 4, n: 6, dir: 1 },
    { t: 1.36, x: 12, n: 6, dir: 1 },
  ],
};

/** Draw a soft pearl cloud puff with crisp white lit crown and lavender shadow base. */
function cloudPuff(p, x, y, r, C, a = 1) {
  if (r < 0.8 || a <= 0.03) return;
  p.circle(x, y + 0.8, r, C[4], a * 0.85);
  p.circle(x, y - 0.4, r * 0.92, C[6], a);
  p.circle(x - r * 0.2, y - r * 0.25, r * 0.72, WHITE, a);
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[4], C[3]], haze: C[5] });
  const lights = new Lights();

  let t = 0, grabbed = false, hit = false, nextPuff = 0.05;

  return {
    update(dt) {
      t += dt;
      // Floating pearl cloud wisps & joyful star motes trailing the awakened body
      if (t < 2.1 && t >= nextPuff) {
        nextPuff += 0.09;
        const q = poseAt(act.poses, Math.max(t, 0));
        const bx = q.x ?? 0, by = (q.y ?? 0) - 24;
        ps.spawn(P.STAR, bx + R.range(-12, 12), by + R.range(-14, 10), R.range(-18, 18), R.range(-28, -6), R.range(0.35, 0.65), WHITE, 1.1);
      }

      if (!grabbed && t >= GRAB) {
        grabbed = true;
        const [hx, hy] = handAt(act.poses, GRAB);
        lights.add(hx, hy, 56, WHITE, 0.9, 0.22);
        for (let i = 0; i < 14; i++) {
          const a = R.range(0, TAU), sp = R.range(50, 145);
          ps.spawn(P.SPARK, hx, hy, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.16, 0.34));
        }
      }

      if (!hit && t >= HIT) {
        hit = true;
        lights.add(TX, HY, 80, C[5], 0.95, 0.44);
        lights.add(TX, HY, 34, WHITE, 0.9, 0.15);
        for (let i = 0; i < 32; i++) {
          const a = R.range(0, TAU), sp = R.range(85, 240);
          ps.spawn(P.SPARK, TX, HY, Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 22, R.range(0.24, 0.58));
        }
        // Bouncing cartoon white cloud puffs around the struck target
        for (let i = 0; i < 10; i++) {
          const a = R.range(0, TAU), sp = R.range(35, 95);
          ps.spawn(P.VAPOUR, TX, HY, Math.cos(a) * sp, Math.sin(a) * sp - 12, R.range(0.42, 0.82), WHITE, R.range(4, 7));
        }
      }

      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration - 0.04) return;
      const q = poseAt(act.poses, Math.max(t, 0));
      const bx = q.x ?? 0, by = (q.y ?? 0) - 24 + (q.crouch ?? 0) * 0.5;
      const scarfFade = 1 - smooth(2.25, 2.95, t);

      // 1. Billowing pearl Hagoromo cloud-ribbon arch looping behind the shoulders!
      if (scarfFade > 0.02) {
        p.glow(bx, by - 4, 28, C[5], 0.32 * scarfFade);
        for (let i = 0; i <= 12; i++) {
          const u = i / 12, a = Math.PI + u * Math.PI; // Arch over the top from left (-13) to right (+13)
          const rx = bx + Math.cos(a) * 13.5, ry = by - 5 + Math.sin(a) * 12 + Math.sin(t * 9 + i * 0.7) * 1.4;
          const rad = (2.4 + 1.4 * Math.sin(u * Math.PI)) * scarfFade;
          cloudPuff(p, rx, ry, rad, C, scarfFade);
        }
      }

      // 2. Rubbery Toon Sine-Wave Floor Ripple when he bounces at t = BOUNCE!
      if (t >= BOUNCE - 0.03 && t < BOUNCE + 0.56) {
        const u = seg(t, BOUNCE - 0.03, BOUNCE + 0.56);
        const fade = 1 - smooth(0.45, 1, u);
        const span = 44 * ease.outCubic(u) + 8;
        let prev = null;
        for (let dx = -span; dx <= span; dx += 2) {
          const env = Math.cos((dx / span) * (Math.PI / 2));
          const wy = -Math.abs(Math.sin(dx * 0.26 - u * 16)) * 7.5 * env * (1 - u * 0.7);
          const px = 4 + dx, py = wy;
          if (prev) {
            p.line(prev[0], prev[1] + 1, px, py + 1, C[3], fade);
            p.line(prev[0], prev[1], px, py, WHITE, fade);
          }
          prev = [px, py];
        }
      }

      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration - 0.04) return;
      const f = Math.floor(t * 30);
      const q = poseAt(act.poses, Math.max(t, 0));
      const bx = q.x ?? 0, by = (q.y ?? 0) - 24 + (q.crouch ?? 0) * 0.5;
      const [hx, hy] = handAt(act.poses, t);
      const scarfFade = 1 - smooth(2.25, 2.95, t);

      // Front curling tails of the pearl Hagoromo cloud-scarf floating past either hip
      if (scarfFade > 0.02) {
        for (let side of [-1, 1]) {
          for (let j = 0; j < 4; j++) {
            const sx = bx + side * (11 + j * 2.2) + Math.sin(t * 10 + j + side) * 1.5;
            const sy = by + 2 - j * 2.2 + Math.cos(t * 8 + j) * 1.2;
            cloudPuff(p, sx, sy, (2.5 - j * 0.35) * scarfFade, C, scarfFade);
          }
        }
      }

      // 3. Sky-Lightning Strike & Solidified Rubber-Bending Javelin in Hand (GRAB..HIT)
      if (t >= GRAB - 0.05 && t < THROW) {
        const Rb = rng(o.seed + 41, Math.floor(f / 2));
        if (t < GRAB + 0.08) {
          // Vertical bolt slamming from top of canvas into his raised fist!
          brightBolt(p, Rb, hx + 6, -128, hx, hy, C, { jag: 0.2, depth: 4, nForks: 2, k: 1, glow: 0.5 });
        }
        // Held lightning javelin bending playfully like rubber in his grip!
        const bend = Math.sin((t - GRAB) * 26) * 5;
        const j0 = [hx - 24, hy + 10 + bend], j1 = [hx, hy], j2 = [hx + 28, hy + 8 - bend];
        brightBolt(p, Rb, j0[0], j0[1], j1[0], j1[1], C, { jag: 0.14, depth: 3, nForks: 1, k: 1, glow: 0.45 });
        brightBolt(p, Rb, j1[0], j1[1], j2[0], j2[1], C, { jag: 0.14, depth: 3, nForks: 1, k: 1, glow: 0.45 });
        p.circle(hx, hy, 3.2, WHITE);
      }

      // 4. Hurl Flight (THROW..HIT): lightning spear streaking diagonally into the target!
      if (t >= THROW && t < HIT + 0.08) {
        const u = clamp((t - THROW) / (HIT - THROW));
        const Rb = rng(o.seed + 61, f);
        const sx = hx + (TX - hx) * Math.max(0, u - 0.45), sy = hy + (HY - hy) * Math.max(0, u - 0.45);
        const ex = hx + (TX - hx) * u, ey = hy + (HY - hy) * u;
        brightBolt(p, Rb, sx, sy, ex, ey, C, { jag: 0.16, depth: 4, nForks: 2, k: 1, glow: 0.55 });
      }

      // 5. Toon Star-Pop & Bouncing Rings on Impact (HIT..HIT+0.78)
      if (t >= HIT && t < HIT + 0.78) {
        const u = (t - HIT) / 0.78;
        const fade = 1 - smooth(0.45, 1, u);

        // Crisp 5-point comic impact star popping with outBack overshoot!
        if (u < 0.45) {
          const su = u / 0.45;
          const sr = 24 * ease.outBack(Math.min(1, su * 2.8), 2.2) * (1 - smooth(0.5, 1, su));
          if (sr > 2) {
            p.poly(star(TX, HY, sr * 0.44, sr + 2, 6, u * 2.4), C[3], 1);
            p.poly(star(TX, HY, sr * 0.42, sr, 6, u * 2.4), su < 0.25 ? WHITE : C[6], 1);
          }
        }

        // Bouncing rubbery concentric rings + radial lightning arcs
        const rr = 8 + 38 * ease.outElastic(Math.min(1, u * 1.15));
        ringFast(p, TX, HY, rr, Math.max(1, 2.4 * fade), u < 0.25 ? WHITE : C[5], fade);

        if (u < 0.55) {
          const Rb = rng(o.seed + 83, Math.floor(f / 2));
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * TAU + 0.5 + u * 1.2, l = (24 + 28 * u) * fade;
            brightBolt(p, Rb, TX, HY, TX + Math.cos(a) * l, HY + Math.sin(a) * l * 0.8, C, {
              jag: 0.26, depth: 3, nForks: 1, k: fade, glow: 0.35,
            });
          }
        }
        // Little orbiting toon stars popping around the target's head
        for (let i = 0; i < 3; i++) {
          const a = u * 8 + (i * TAU) / 3;
          const sx = TX + Math.cos(a) * 16, sy = HY - 14 + Math.sin(a) * 5;
          sparkle(p, sx, sy, 4 * fade, WHITE, C[5], 0.5 * fade);
        }
      }

      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
