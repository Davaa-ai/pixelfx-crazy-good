// Three-Fold Dragon Iai: dual-blade emerald Haki crouch, a 2-frame blinding vanish-dash straight through
// the target to a poised stance on the far side, a tense beat of silence while three glowing cut-seams hum,
// then a delayed cross-slash and coiling emerald wind-dragon eruption.

import { Particles, Lights, P, Rng, rng, fit, clamp, smooth, seg, ease, sparkle, flare, TAU, WHITE, READY } from "../../../src/core/index.js";
import { SAKUGA_PAL } from "../categories.js";
import { blackBolt, speedStreaks, ringFast, tone } from "../_lib.js";

export const meta = {
  name: "Three-fold dragon iai",
  desc: "Emerald Haki licks off twin blades before a blinding vanish-dash past the foe; after a silent poised beat, a coiling wind-dragon slash erupts behind him.",
  tags: ["sword", "iai", "dash", "dragon", "slash", "haki", "one-piece", "one-shot"],
  size: [276, 180],
  origin: [54, 136],
  duration: 2.9,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: SAKUGA_PAL.enmaJade, seed: 3 },
};

const DASH = 0.48, ARRIVE = 0.56, ERUPT = 0.88;
const TX = 92, AT = 148;

const SHEATH = {
  ...READY, crouch: 7, lean: 5,
  weapon: "sword", fx: -6, fy: -19, sa: 2.85,
  offWeapon: "sword", bx: 8, by: -21, sb: -2.55,
  ffx: 10, fbx: -10,
};
const BLUR = {
  ...SHEATH, crouch: 6, lean: 9,
  fx: 14, fy: -22, sa: 0.25,
  bx: -9, by: -20, sb: 2.9,
  ghost: 1,
};
const POISE = {
  ...READY, x: AT, crouch: 5, lean: 3,
  weapon: "sword", fx: 14, fy: -19, sa: 0.52,
  offWeapon: "sword", bx: -10, by: -22, sb: 2.65,
  ffx: 11, fbx: -10,
};

export const act = {
  target: { x: TX },
  ghost: "#188f5e",
  poses: [
    [-0.45, { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.75, offWeapon: "sword", bx: 8, by: -21, sb: -0.9 }],
    [-0.18, SHEATH],
    [0, { ...SHEATH, crouch: 8, lean: 6 }, "snap"],
    [0.42, { ...SHEATH, crouch: 9, lean: 6 }],
    [DASH, { ...BLUR, x: 24 }, "snap"],
    [ARRIVE - 0.02, { ...BLUR, x: AT - 16 }, "line"],
    [ARRIVE, POISE, "snap"],
    [ERUPT + 0.45, { ...POISE, crouch: 4 }],
    [1.68, { ...READY, x: AT, weapon: "sword", fx: 12, fy: -21, sa: -0.75, offWeapon: "sword", bx: 8, by: -21, sb: -0.9 }, "out"],
    [2.9, { ...READY, x: AT, weapon: "sword", fx: 12, fy: -21, sa: -0.75, offWeapon: "sword", bx: 8, by: -21, sb: -0.9 }],
  ],
  hits: [
    { t: ARRIVE - 0.02, stop: 0.04, shake: 0.08, amp: 1, push: 0.2, straw: 3 },
    { t: ERUPT, stop: 0.17, shake: 0.36, amp: 3, push: -4.2, straw: 34, flash: 0.08, skin: "poison" },
    { t: 2.1, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [
    { t: DASH, x: 0, n: 10, dir: -1 },
    { t: ARRIVE, x: AT - 4, n: 7, dir: 1 },
    { t: ERUPT, x: TX, n: 10, dir: -1 },
  ],
};

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]], haze: C[4] });
  const lights = new Lights();

  let t = 0, dashed = false, erupted = false, nextWisp = 0.03;

  return {
    update(dt) {
      t += dt;
      // Emerald Enma-style blade flame wisps rising during the iai crouch
      if (t < DASH && t >= nextWisp) {
        nextWisp += 0.05;
        ps.spawn(P.MOTE, R.range(-12, 10), R.range(-24, -14), R.range(-22, 14), R.range(-48, -18), R.range(0.2, 0.38), C[5], 0.85);
        ps.spawn(P.VAPOUR, R.range(-10, 8), -18, R.range(-16, 8), R.range(-32, -12), R.range(0.28, 0.48), C[3], R.range(2.8, 4.5));
      }

      if (!dashed && t >= DASH) {
        dashed = true;
        lights.add(TX, -24, 52, C[5], 0.75, 0.18);
        for (let i = 0; i < 16; i++) {
          ps.spawn(P.MOTE, R.range(10, AT - 10), R.range(-32, -10), R.range(40, 120), R.range(-18, 18), R.range(0.22, 0.42), C[6], 0.8);
        }
      }

      if (!erupted && t >= ERUPT) {
        erupted = true;
        lights.add(TX, -34, 84, C[5], 0.95, 0.48);
        lights.add(TX, -26, 36, WHITE, 0.9, 0.15);
        for (let i = 0; i < 36; i++) {
          const a = R.range(-2.4, 0.4), sp = R.range(85, 245);
          ps.spawn(P.SPARK, TX + R.range(-8, 8), -26 + R.range(-10, 8), Math.cos(a) * sp, Math.sin(a) * sp - 25, R.range(0.24, 0.58));
        }
        for (let i = 0; i < 14; i++) {
          ps.spawn(P.VAPOUR, TX + R.range(-14, 14), -6, R.range(-55, 55), R.range(-65, -20), R.range(0.42, 0.85), C[4], R.range(4, 7));
        }
      }

      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration - 0.04) return;
      if (t < DASH) {
        p.glow(0, -18, 26, C[4], 0.35 * clamp(t / 0.25));
      }
      // Sliced floor scar through the target
      if (t >= ARRIVE && t < 2.2) {
        const fade = 1 - smooth(1.45, 2.2, t);
        p.line(18, 0, AT - 12, 0, t >= ERUPT && t < ERUPT + 0.2 ? WHITE : C[4], fade * 0.8);
        p.glowLine(36, 0, AT - 24, 0, 4, C[4], 0.24 * fade);
      }
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration - 0.04) return;
      const f = Math.floor(t * 30);

      // 1. Emerald Haki blade flames + temple glint right before vanish!
      if (t < DASH) {
        const u = clamp(t / DASH);
        const Rf = rng(o.seed + 13, Math.floor(f / 2));
        // Twin blade Haki arcs
        blackBolt(p, Rf, -6, -19, -22, -15 + Rf.range(-4, 4), C, { jag: 0.22, depth: 3, nForks: 1, k: u, glow: 0.35 });
        blackBolt(p, Rf, 8, -21, -8, -28 + Rf.range(-4, 4), C, { jag: 0.22, depth: 3, nForks: 1, k: u, glow: 0.35 });
        if (t > 0.34) {
          const g = Math.sin(seg(t, 0.34, DASH) * Math.PI);
          sparkle(p, 5, -31, 8 * g, WHITE, C[5], 0.8 * g);
        }
      }

      // 2. Blinding Horizontal Iai Speed-Lines & Twin Slash Ribbons (DASH..ARRIVE+0.12)
      if (t >= DASH && t < ARRIVE + 0.14) {
        const u = seg(t, DASH, ARRIVE + 0.14);
        const fade = 1 - smooth(0.35, 1, u);
        const Rs = rng(o.seed + 29, f);
        speedStreaks(p, Rs, -8, AT + 8, -22, 14, 16, C, fade);
        p.beam(-4, -20, AT + 4, -25, 4.5 * fade, (bu, bv) => (bv < 0.4 ? WHITE : C[5]), fade);
        p.beam(2, -26, AT, -18, 3.0 * fade, (bu, bv) => (bv < 0.4 ? WHITE : C[6]), fade * 0.85);
      }

      // 3. Three Taut Glowing Cut-Lines humming across the target during the silent hold (ARRIVE..ERUPT)
      if (t >= ARRIVE && t < ERUPT + 0.25) {
        const pre = t < ERUPT;
        const fade = pre ? 0.85 + 0.15 * Math.sin(t * 55) : 1 - seg(t, ERUPT, ERUPT + 0.25);
        const cuts = [
          [TX - 22, -42, TX + 24, -10],
          [TX - 24, -12, TX + 22, -40],
          [TX - 28, -25, TX + 28, -25],
        ];
        for (const [x0, y0, x1, y1] of cuts) {
          const w = pre ? 1.2 : 3.8 * fade;
          if (w > 1.5) p.beam(x0, y0, x1, y1, w, (bu, bv) => (bv < 0.45 ? WHITE : C[5]), fade);
          else p.line(x0, y0, x1, y1, pre ? C[6] : WHITE, fade);
          p.glowLine(x0, y0, x1, y1, pre ? 3 : 7, C[5], 0.35 * fade);
        }
      }

      // 4. Delayed Coiling Emerald Wind-Dragon Eruption (ERUPT..ERUPT+0.88)!
      if (t >= ERUPT && t < ERUPT + 0.88) {
        const u = (t - ERUPT) / 0.88;
        const climb = ease.outQuart(Math.min(1, u * 2.2));
        const fade = 1 - smooth(0.45, 1, u);

        // Coiling helical jade dragon body rising diagonally up through TX!
        const steps = 28;
        let prevA = null, prevB = null;
        let headX = TX, headY = -26;
        for (let i = 0; i <= steps; i++) {
          const s = (i / steps) * climb;
          const cx = TX - 10 + s * 26 + Math.sin(s * 10 - u * 16) * 14 * (1 - s * 0.3);
          const cy = -4 - s * 92;
          const rad = (5.2 * (1 - s * 0.45) + 1.2) * fade;
          p.circle(cx, cy, rad, (d) => (d < 0.38 ? WHITE : tone(C, 6 - d * 3.5, cx, cy)), fade * 0.92);
          if ((i & 3) === 0) p.glow(cx, cy, rad * 2.6 + 4, C[5], 0.28 * fade);

          // Twin counter-spiraling wind ribbons
          const rx = cx + Math.cos(s * 12 - u * 18) * (rad + 4);
          const ry = cy + Math.sin(s * 12 - u * 18) * 3;
          if (prevA) p.line(prevA[0], prevA[1], rx, ry, C[6], fade * 0.85);
          prevA = [rx, ry];

          const rx2 = cx - Math.cos(s * 12 - u * 18) * (rad + 3);
          if (prevB) p.line(prevB[0], prevB[1], rx2, cy, C[4], fade * 0.7);
          prevB = [rx2, cy];

          if (i === steps) { headX = cx; headY = cy; }
        }

        // Stylized horned emerald dragon-crest & blazing eye at the apex of the vortex!
        if (fade > 0.2 && climb > 0.3) {
          // Upper & lower sweeping dragon jaws + swept horns facing upper-right
          p.tri(headX - 3, headY + 2, headX + 11, headY - 6, headX + 2, headY - 7, C[6], fade);
          p.tri(headX - 2, headY + 3, headX + 9, headY + 2, headX + 2, headY + 6, C[5], fade);
          p.line(headX - 1, headY - 5, headX - 9, headY - 13, WHITE, fade);
          p.line(headX + 1, headY - 4, headX - 6, headY - 10, C[6], fade);
          p.px(headX + 3, headY - 3, WHITE);
          p.glow(headX + 2, headY - 2, 16, WHITE, 0.45 * fade);
        }

        // Expanding emerald shock ring + Conqueror-tinted jade lightning forks
        const rr = 10 + 54 * ease.outQuart(u);
        ringFast(p, TX, -26, rr, Math.max(1, 2.5 * fade), u < 0.2 ? WHITE : C[5], fade);
        if (u < 0.32) flare(p, TX, -26, 24 * (1 - u / 0.32), 1 - u / 0.32, C);
      }

      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
