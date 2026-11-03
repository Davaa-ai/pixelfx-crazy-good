// Ukiyo-e Breathing Wheel (Water Breathing 2nd Form): a sharp mist breath and sprint launch into a
// full 360-degree mid-air somersault cut, painting a stylized Hokusai woodblock indigo ocean wheel
// crowned with hooked white seafoam claws and round ink-rimmed droplets.

import { Particles, Lights, P, Rng, fit, clamp, smooth, seg, ease, poseAt, sparkle, TAU, WHITE, READY } from "../../../src/core/index.js";
import { SAKUGA_PAL } from "../categories.js";
import { tone } from "../_lib.js";

export const meta = {
  name: "Ukiyo-e breathing wheel",
  desc: "A mist breath and sprint launch into a 360-degree mid-air sword spin, painting a woodblock-indigo ocean wheel crowned with hooked white seafoam claws.",
  tags: ["sword", "water", "ukiyo-e", "wheel", "slash", "breathing", "anime", "one-shot"],
  size: [272, 156],
  origin: [54, 122],
  duration: 2.3,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: SAKUGA_PAL.ukiyoWave, seed: 4 },
};

const DASH = 0.22, SPIN0 = 0.36, HIT = 0.54, LAND = 0.88;
const WX = 78, WY = -30, WR = 34, TX = 104;

const BREATHE = { ...READY, crouch: 4, lean: 1, weapon: "sword", fx: 9, fy: -23, sa: -1.1, bx: 5, by: -25, armsFront: true };
const SPRINT = { ...READY, crouch: 6, lean: 8, weapon: "sword", fx: -6, fy: -19, sa: 2.8, bx: 10, by: -24, ffx: 12, fbx: -11, ghost: 1 };
const AIR = { ...READY, y: -18, crouch: 2, lean: 2, weapon: "sword", fx: 14, fy: -24, sa: 0.15, bx: -7, by: -25, ffx: 6, ffy: -6, fbx: -6, fby: -5 };

export const act = {
  target: { x: TX },
  ghost: "#246ec2",
  poses: [
    [-0.42, { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.8 }],
    [-0.14, BREATHE],
    [0, BREATHE, "snap"],
    [DASH, { ...SPRINT, x: 10 }, "snap"],
    [SPIN0, { ...AIR, x: WX - 8, yaw: 0 }, "snap"],
    [HIT, { ...AIR, x: WX, y: -22, yaw: Math.PI }, "line"],
    [LAND - 0.08, { ...AIR, x: WX + 4, y: -12, yaw: TAU }, "line"],
    [LAND, { ...READY, x: WX + 6, y: 0, crouch: 7, weapon: "sword", fx: 15, fy: -19, sa: 0.55 }, "in"],
    [1.35, { ...READY, x: WX + 4, weapon: "sword", fx: 12, fy: -21, sa: -0.8 }, "out"],
    [2.3, { ...READY, x: WX + 4, weapon: "sword", fx: 12, fy: -21, sa: -0.8 }],
  ],
  hits: [
    { t: HIT, stop: 0.15, shake: 0.28, amp: 2, push: 3.8, straw: 28, flash: 0.07, skin: "ice" },
    { t: 1.7, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [
    { t: DASH, x: 2, n: 7, dir: -1 },
    { t: LAND, x: WX + 6, n: 6, dir: 1 },
  ],
};

/** Draw a stylized woodblock foam droplet (dark Prussian rim + crisp white pearl center). */
function woodblockDrop(p, x, y, r, C, a = 1) {
  if (r < 0.7 || a <= 0.03) return;
  if (r < 1.5) {
    p.dot(x, y, WHITE, a);
    return;
  }
  p.circle(x, y, r + 0.7, C[0], a);
  p.circle(x, y, r, WHITE, a);
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]], haze: C[4] });
  const lights = new Lights();

  // Simulated woodblock water droplets flung tangentially off the wheel that splash onto y = 0!
  const drops = [];
  let t = 0, splashed = false, breathDone = false;

  return {
    update(dt) {
      t += dt;
      if (!breathDone && t >= 0.04) {
        breathDone = true;
        for (let i = 0; i < 6; i++) {
          ps.spawn(P.VAPOUR, 6 + R.range(0, 8), -30 + R.range(-2, 2), R.range(18, 46), R.range(-12, 8), R.range(0.24, 0.42), WHITE, R.range(2.2, 3.6));
        }
      }

      if (!splashed && t >= HIT) {
        splashed = true;
        lights.add(TX - 6, WY, 64, C[5], 0.85, 0.36);
        for (let i = 0; i < 22; i++) {
          const a = R.range(0, TAU), sp = R.range(55, 165);
          drops.push({
            x: WX + Math.cos(a) * (WR * 0.85),
            y: WY + Math.sin(a) * (WR * 0.85),
            vx: Math.cos(a) * sp + 28,
            vy: Math.sin(a) * sp - 35,
            r: R.range(1.2, 2.4),
            life: R.range(0.45, 0.95),
            max: 0.95,
            ringT: -1,
          });
        }
        for (let i = 0; i < 18; i++) {
          const a = R.range(-1.2, 1.2), sp = R.range(75, 195);
          ps.spawn(P.SPARK, TX - 4, WY + 4, Math.cos(a) * sp, Math.sin(a) * sp - 15, R.range(0.18, 0.4));
        }
      }

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.life -= dt;
        if (d.life <= 0) { drops.splice(i, 1); continue; }
        if (d.ringT >= 0) { d.ringT += dt; continue; }
        d.vy += 460 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.y >= -1 && d.vy > 0) {
          d.y = 0;
          d.ringT = 0;
        }
      }

      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration - 0.04) return;
      // Rippling puddle rings where woodblock droplets plink onto the stone floor
      for (const d of drops) {
        if (d.ringT >= 0 && d.ringT < 0.35) {
          const u = d.ringT / 0.35;
          p.ellipse(d.x, 0, 2 + 10 * u, 0.8 + 2 * u, C[6], (1 - u) * 0.7);
        }
      }
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration - 0.04) return;

      // 1. Total Concentration Mist Curl at mouth (0..DASH)
      if (t < DASH + 0.06) {
        const u = clamp(t / DASH);
        p.line(5, -31, 14 + 6 * u, -32 - 3 * Math.sin(u * 6), WHITE, 1 - u * 0.5);
        sparkle(p, 9, -23, 5 * Math.sin(u * Math.PI), WHITE, C[5], 0.5);
      }

      // 2. Flowing Water Trail Ribbon during the dash (DASH..SPIN0+0.12)
      if (t >= DASH && t < SPIN0 + 0.16) {
        const u = seg(t, DASH, SPIN0 + 0.16);
        const fade = 1 - smooth(0.45, 1, u);
        let prev = null;
        for (let i = 0; i <= 16; i++) {
          const s = i / 16, px = 6 + s * (WX - 10), py = -22 + Math.sin(s * 9 - t * 28) * 5;
          if (prev) {
            p.beam(prev[0], prev[1], px, py, 5 * fade, (bu, bv) => (bv > 0.72 ? C[0] : bv < 0.28 ? WHITE : C[4]), fade);
          }
          prev = [px, py];
        }
      }

      // 3. The Ukiyo-e Woodblock Ocean Wheel (SPIN0..LAND+0.28)!
      if (t >= SPIN0 && t < LAND + 0.28) {
        const u = seg(t, SPIN0, LAND + 0.28);
        const headA = -Math.PI * 0.75 + TAU * 1.25 * ease.outCubic(Math.min(1, u * 1.45));
        const tailA = -Math.PI * 0.75 + TAU * 1.25 * smooth(0.28, 1, u);
        const span = Math.max(0, headA - tailA);
        const fade = 1 - smooth(0.65, 1, u);

        if (span > 0.05) {
          const B = WR + 9;
          p.shade(WX - B, WY - B, WX + B, WY + B, (x, y, out) => {
            const dx = x - WX, dy = y - WY, r = Math.hypot(dx, dy);
            if (r > WR + 5 || r < WR - 13) return;
            let a = (Math.atan2(dy, dx) - tailA) % TAU;
            if (a < 0) a += TAU;
            if (a > span) return;
            const v = a / span; // 0 tail .. 1 leading blade crest
            const bandW = 12 * Math.sin(Math.PI * Math.pow(v, 0.65));
            if (bandW < 1) return;

            // Sawtooth Hokusai wave crests along the outer rim!
            const crest = Math.sin(a * 7 - u * 10) * 2.4;
            const outerR = WR + crest;
            const innerR = outerR - bandW;
            if (r > outerR || r < innerR) return;

            const q = (r - innerR) / Math.max(1, bandW); // 0 inner .. 1 outer foam lip
            // Crisp woodblock outlines & striped Prussian/indigo currents + white foam rim!
            if (q > 0.91 || q < 0.09) {
              out.c = C[0];
            } else if (q > 0.74) {
              out.c = WHITE;
            } else if (Math.abs(q - 0.48 + 0.08 * Math.sin(a * 11)) < 0.07) {
              out.c = C[1]; // Dark woodblock current line inside the wave!
            } else {
              out.c = tone(C, 2.2 + q * 3.4 + (v > 0.8 ? 1.2 : 0), x, y);
            }
            out.a = fade;
            if (q > 0.7) { out.l = C[5]; out.k = 0.16 * fade; }
          });

          // Hooked white seafoam claws curling off the outer wheel!
          const nClaws = 7;
          for (let k = 0; k < nClaws; k++) {
            const ca = tailA + span * ((k + 0.5) / nClaws);
            const cr = WR + 2.5;
            const x0 = WX + Math.cos(ca) * cr, y0 = WY + Math.sin(ca) * cr;
            const x1 = WX + Math.cos(ca + 0.22) * (cr + 5.5), y1 = WY + Math.sin(ca + 0.22) * (cr + 5.5);
            p.line(x0, y0 + 1, x1, y1 + 1, C[0], fade);
            p.line(x0, y0, x1, y1, WHITE, fade);
            woodblockDrop(p, x1 + Math.cos(ca) * 2, y1 + Math.sin(ca) * 2, 1.4, C, fade);
          }
        }
      }

      // 4. Flying Woodblock Foam Beads
      for (const d of drops) {
        if (d.ringT >= 0) continue;
        const a = Math.min(1, (d.life / d.max) * 3);
        woodblockDrop(p, d.x, d.y, d.r, C, a);
      }

      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
