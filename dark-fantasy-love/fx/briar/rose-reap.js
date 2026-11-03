// Bleeding Rose Slash: a sweeping velvet-crimson and gilded-steel sword arc that sprouts barbed thorns along its
// wake and shatters on contact into a shower of 3D tumbling rose petals and golden blood-sparks.
// Crescent smear geometry adapted from Sprite Fusion's open-source slash (MIT, Copyright (c) 2026 Hugo Duprez).

import { Particles, Lights, P, Rng, fit, sparkle, flare, clamp, smooth, ease, TAU, WHITE, READY } from "../../../src/core/index.js";
import { VELVET, GILDED, drawRose, PetalSim, ringFast } from "../_lib.js";

export const meta = {
  name: "Bleeding rose slash",
  desc: "A velvet-crimson sword crescent whips round with a gilded inner echo, sprouting barbed thorns in its wake and bursting into fluttering rose petals on impact.",
  tags: ["briar", "melee", "slash", "sword", "rose", "crimson", "combat", "directional", "one-shot"],
  size: [192, 116],
  origin: [52, 98],
  duration: 1.8,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: VELVET,
    gold: GILDED,
    radius: 46,
    seed: 6,
  },
};

const GUARD = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 };
const WIND = { ...GUARD, x: -7, crouch: 4, lean: -4, fx: -7, fy: -34, sa: -2.6, bx: 8, by: -24, armsFront: true, ffx: 8, fbx: -8 };
const CUT = { ...GUARD, x: 1, crouch: 2, lean: 3, fx: 16, fy: -36, sa: -1.4, bx: -7, by: -24, ffx: 11, fbx: -10, ghost: 1 };
const FOLLOW = { ...GUARD, x: 4, crouch: 5, lean: 5, fx: 20, fy: -20, sa: 0.65, bx: -9, by: -24, ffx: 13, fbx: -10, toeB: true };

export const act = {
  target: { x: 62 },
  poses: [
    [-0.52, { ...GUARD, x: -7 }],
    [-0.26, WIND],
    [-0.07, { ...WIND, crouch: 5, lean: -5 }],
    [0, CUT, "snap"],
    [0.06, FOLLOW, "snap"],
    [0.34, { ...FOLLOW, x: 5, crouch: 6 }],
    [0.72, { ...GUARD, x: 1, fx: 14, fy: -21, sa: 0.05 }],
    [1.2, { ...GUARD, x: -7 }],
    [1.8, { ...GUARD, x: -7 }],
  ],
  hits: [
    { t: 0.06, stop: 0.15, shake: 0.2, amp: 2, push: 3.0, straw: 18, skin: "red", y: -24 },
    { t: 1.35, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: 0.06, x: 16, n: 7, dir: 1 }, { t: 0.06, x: -9, n: 4, dir: -1 }],
};

function onArc(s, r, a) {
  const lx = Math.cos(a) * r, ly = Math.sin(a) * r * s.sy, c = Math.cos(s.rot), n = Math.sin(s.rot);
  return [s.cx + lx * c - ly * n, s.cy + lx * n + ly * c];
}

function crescent(p, s, ta, L, W, age) {
  if (Math.abs(L) < 0.02 || W < 0.3) return;
  const R = s.ramp, n = R.length, dir = Math.sign(L), span = Math.abs(L), c = Math.cos(s.rot), sn = Math.sin(s.rot), B = s.R + 3;
  p.shade(s.cx - B, s.cy - B, s.cx + B, s.cy + B, (x, y, out) => {
    const dx = x - s.cx, dy = y - s.cy, lx = dx * c + dy * sn, ly = (-dx * sn + dy * c) / s.sy, r = Math.hypot(lx, ly);
    if (r > s.R + 0.5 || r < s.R - W - 1) return;
    let u = (dir * (Math.atan2(ly, lx) - ta)) % TAU;
    if (u < 0) u += TAU;
    if (u > span) return;
    const v = u / span, w = W * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.1)), 0.58);
    if (w < 0.35) return;
    const q = (s.R - r) / w;
    if (q < 0 || q > 1) return;
    const ci = q < 0.2 && age < 0.45 ? 0 : Math.round(q * (n - 1) * 0.78 + age * 2.3 - v * 0.75 + 0.35);
    out.c = R[n - 1 - clamp(ci, 0, n - 1)];
    out.a = Math.min(1, v / 0.36);
  });
  for (let u = 0; u <= span; u += 0.32) {
    const [x, y] = onArc(s, s.R - W * 0.38, ta + dir * u);
    p.glow(x, y, 6 + W, R[n - 3], 0.24 * (1 - age) * (u / span));
  }
}

export function create(o) {
  const C = fit(o.palette, 8), G = fit(o.gold, 8), Rg = new Rng(o.seed);
  const ps = new Particles({ rng: Rg, ground: () => 0, sparks: [WHITE, G[6], C[6], C[4]] });
  const lights = new Lights(), petals = new PetalSim(Rg, 0);
  const R0 = o.radius, a0 = -2.55, a1 = 0.96;
  const MAIN = { cx: 8, cy: -26, R: R0, sy: 0.62, rot: -0.36, a0, a1, W: 14, t0: 0, sweep: 0.06, hold: 0.07, trail: 0.28, ramp: C };
  const ECHO = { ...MAIN, R: R0 * 0.76, W: 5, a0: a0 + 0.3, a1: a1 - 0.14, t0: 0.018, hold: 0.04, trail: 0.22, ramp: G };

  // barbed thorn silhouettes along the slash curve
  const barbs = Array.from({ length: 9 }, (_, i) => {
    const u = 0.12 + (i / 8) * 0.8;
    return { a: a0 + (a1 - a0) * u, dir: i % 2 === 0 ? 1 : -1, len: 4 + (i % 3) * 1.8 };
  });

  const [tipX, tipY] = onArc(MAIN, R0 - 4, a1);
  const hitX = 56, hitY = -24;
  let t = 0, landed = false;

  return {
    update(dt) {
      t += dt;
      if (!landed && t >= MAIN.sweep) {
        landed = true;
        lights.add(hitX, hitY, 54, C[5], 0.9, 0.32);
        lights.add(hitX, hitY, 22, WHITE, 0.95, 0.09);
        // golden sparks off the blade tip & impact point
        for (let i = 0; i < 16; i++) {
          const a = Rg.range(-1.2, 1.4), sp = Rg.range(110, 290);
          ps.spawn(P.SPARK, hitX, hitY, Math.cos(a) * sp, Math.sin(a) * sp - 25, Rg.range(0.16, 0.42));
        }
        // crimson rose petals flung outward along the slash arc and impact
        for (let i = 0; i < 20; i++) {
          const u = Rg.range(0.25, 1.0), [ax, ay] = onArc(MAIN, R0 * Rg.range(0.75, 1.05), a0 + (a1 - a0) * u);
          const ox = ax - MAIN.cx, oy = ay - MAIN.cy, l = Math.hypot(ox, oy) || 1, sp = Rg.range(32, 108);
          petals.spawn(ax, ay, (ox / l) * sp + 18, (oy / l) * sp - 18, Rg.range(0.85, 1.55), Rg.range(2.0, 3.2), Rg.range(0, 0.06));
        }
        // velvet mist motes lingering in the cut
        for (let i = 0; i < 10; i++) {
          const u = Rg.range(0.2, 0.95), [ax, ay] = onArc(MAIN, R0 * 0.9, a0 + (a1 - a0) * u);
          ps.spawn(P.MOTE, ax, ay, Rg.range(15, 65), Rg.range(-30, 20), Rg.range(0.28, 0.58), i % 3 === 0 ? G[6] : C[6], 0.7);
        }
      }
      petals.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      petals.draw(p, C, "back");
      ps.draw(p, "back");
    },

    draw(p) {
      // golden inner filigree echo + main crimson velvet crescent
      for (const s of [ECHO, MAIN]) {
        const u = t - s.t0;
        if (u < 0) continue;
        const span = s.a1 - s.a0, head = ease.outExpo(clamp(u / s.sweep));
        const tail = smooth(s.sweep + s.hold, s.sweep + s.hold + s.trail, u);
        const age = clamp(u / (s.sweep + s.hold + s.trail));
        if (tail < 1) crescent(p, s, s.a0 + span * tail, span * (head - tail), s.W * (1 - tail * 0.55), age);
      }

      // barbed briar trace lingering in the air after the crescent passes
      if (t >= 0.04 && t < 0.62) {
        const fade = 1 - smooth(0.32, 0.62, t);
        const steps = 36;
        for (let i = 1; i <= steps; i++) {
          const u0 = (i - 1) / steps, u1 = i / steps;
          const [x0, y0] = onArc(MAIN, R0 - 3, a0 + (a1 - a0) * u0);
          const [x1, y1] = onArc(MAIN, R0 - 3, a0 + (a1 - a0) * u1);
          p.line(x0, y0, x1, y1, t < 0.14 ? C[6] : C[2], fade * 0.85);
        }
        for (const b of barbs) {
          const [bx, by] = onArc(MAIN, R0 - 3, b.a);
          const [ox, oy] = onArc(MAIN, R0 - 3 + b.dir * b.len, b.a + 0.08);
          p.line(bx, by, ox, oy, C[4], fade);
          p.dot(ox, oy, G[6], fade);
        }
      }

      // ephemeral crimson rose flash blooming and bursting right on the hit point
      if (t >= 0.05 && t < 0.42) {
        const ru = (t - 0.05) / 0.37;
        const bloom = ease.outBack(Math.min(1, ru * 3.2), 1.9);
        drawRose(p, hitX, hitY, 7.5 * (1 + ru * 0.25), bloom, ru * 1.4, C, 1 - smooth(0.45, 1, ru), ru < 0.1);
        if (ru < 0.55) {
          const k = ru / 0.55;
          ringFast(p, hitX, hitY, 5 + 22 * ease.outQuart(k), Math.max(1, 2.2 * (1 - k)), k < 0.3 ? WHITE : G[5], 1 - k);
        }
      }

      if (t > 0.03 && t < 0.25) {
        const g = (t - 0.03) / 0.22;
        flare(p, hitX, hitY, 18 * (1 - g), 1 - g, G);
        sparkle(p, tipX, tipY, 8 * (1 - g), G[7], C[5], 0.65);
      }

      petals.draw(p, C, "front");
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
