// Spiral Sphere: wind and energy wound into a ball in one palm, carried in a sprint and drilled into the target until it
// bursts. Original pixel-art take on the shonen "spinning sphere in the hand" archetype: no character, just the technique.

import { fit, Particles, P, Lights, Rng, rng, ease, seg, smooth, lerp, clamp, sparkle, band, poseAt, READY, TAU, WHITE, mix } from "../../../../src/core/index.js";
import { AZURE, tone, orbit } from "../../lib/shared.js";

export const meta = {
  name: "Spiral Sphere",
  desc: "Wind spirals into the palm and winds itself into a howling ball of light, orbits whipping round it in every direction. A crouch, a sprint, and it's driven into the target: it grinds, sprays sparks and wind, then bursts in a spiral shockwave.",
  tags: ["shonen arts", "technique", "wind", "chakra", "sphere", "spiral", "melee", "one-shot"],
  size: [248, 124],
  origin: [40, 100],
  duration: 3.7,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: AZURE, seed: 3 },
};

// the beats, in seconds
const SEED = 0.32, FULL = 1.08, DRAW = 1.24, GO = 1.4, HIT = 1.58, BLAST = 2.0;
// where he plants his feet to strike, and where the target stands
const AT = 72, TX = 108;
const R0 = 9, RG = 11.5;

const FORM = { crouch: 4, lean: 2, fx: 10, fy: -21, bx: 14, by: -30, ffx: 9, fbx: -8 };
const PULL = { crouch: 7, lean: -2, fx: 2, fy: -19, bx: 14, by: -25, ffx: 11, fbx: -9 };
const LUNGE = { crouch: 6, lean: 7, fx: 9, fy: -22, bx: -6, by: -25, ffx: 12, fbx: -11 };
const STRIKE = { crouch: 5, lean: 8, fx: 16, fy: -24, bx: -8, by: -24, ffx: 13, fbx: -12, toeB: true };

export const act = {
  target: { x: TX },
  ghost: "#11307c",
  poses: [
    [-0.5, { ...READY }],
    [-0.18, { ...FORM, crouch: 3, fy: -22, by: -28 }],
    [0.5, { ...FORM, crouch: 5 }],
    [1.0, { ...FORM, crouch: 7, lean: 3, fx: 11, by: -32 }],
    [DRAW, PULL, "out"],
    [GO, { ...LUNGE, x: 8, ghost: 1 }, "snap"],
    [HIT - 0.02, { ...LUNGE, x: AT - 3, ghost: 1 }, "line"],
    [HIT, { ...STRIKE, x: AT }, "snap"],
    [BLAST - 0.02, { ...STRIKE, x: AT + 3, crouch: 6, lean: 9, fx: 17 }],
    [BLAST + 0.06, { ...STRIKE, x: AT - 4, crouch: 3, lean: -3, fx: 13, fy: -27, bx: -6, by: -28, toeB: false }, "snap"],
    [BLAST + 0.8, { ...READY, x: AT - 7 }],
    [BLAST + 1.3, { ...READY, x: AT - 7, crouch: 1 }],
  ],
  hits: [
    { t: HIT, stop: 0.08, shake: 0.22, amp: 2, push: 0.5 },
    { t: HIT + 0.14, stop: 0.03, shake: 0.12, amp: 1, push: 0.3 },
    { t: HIT + 0.28, stop: 0.03, shake: 0.12, amp: 1, push: 0.3 },
    { t: BLAST, stop: 0.16, shake: 0.42, amp: 3, push: 5.5, straw: 36, flash: 0.07 },
  ],
  dust: [{ t: GO, x: 6, n: 9, dir: -1 }, { t: HIT - 0.02, x: AT - 2, n: 7, dir: 1 }, { t: BLAST + 0.06, x: AT - 4, n: 6, dir: -1 }],
};

// how big the sphere is, and how fast it turns (an angle, so it can be read at any t)
const radius = (t) => {
  if (t < SEED || t >= BLAST) return 0;
  if (t < FULL) return R0 * ease.outBack(seg(t, SEED, FULL)) + 0.6 * Math.sin(t * 37) * (1 - seg(t, SEED, FULL));
  if (t < HIT) return R0;
  return lerp(R0, RG, ease.outCubic(seg(t, HIT, HIT + 0.2))) + 0.5 * Math.sin(t * 61);
};
const spin = (t) => 15 * t + 12 * Math.max(0, t - FULL) ** 2 + 30 * Math.max(0, t - HIT);

// the sphere sits just in front of the palm the pose puts there
function anchor(t, r) {
  const q = poseAt(act.poses, Math.max(t, act.poses[0][0]));
  return [(q.x ?? 0) + q.fx + r * 0.78 + 1, (q.y ?? 0) + q.fy - 1];
}

/** The sphere: a translucent, striated shell, a white core, comets on great circles whipping round it, wind spiralling off it. */
function sphere(p, C, cx, cy, r, ph, orbits, power, f) {
  if (r < 0.6) return;
  const R = rng(17, f);
  p.glow(cx, cy, r * 3.2 + 8, C[3], 0.16 * power);
  p.glow(cx, cy, r * 1.6 + 3, C[4], 0.2 * power);

  // the far halves of the orbits first, so the shell glazes over them
  const comets = (front) => {
    for (const ob of orbits) {
      const ax = ob.ax + Math.sin(ph * 0.11 + ob.k) * 0.25, az = ob.az + ph * 0.07 * ob.dir;
      for (let c = 0; c < 2; c++) {
        const head = ph * ob.v * ob.dir + c * Math.PI + ob.k, len = 2.1, m = Math.max(6, Math.round(r * 1.4));
        let prev = null;
        for (let j = 0; j <= m; j++) {
          const u = j / m, pt = orbit(cx, cy, r * ob.rr, ax, az, head - u * len * ob.dir);
          if (prev && (pt[2] >= 0) === front && (prev[2] >= 0) === front) {
            const col = !front ? (u < 0.4 ? C[4] : C[3]) : u < 0.14 ? WHITE : u < 0.42 ? C[6] : u < 0.75 ? C[5] : C[4];
            p.line(prev[0], prev[1], pt[0], pt[1], col);
            if (front && j % 2 === 0) p.light(pt[0], pt[1], C[5], 0.16 * (1 - u));
          }
          prev = pt;
        }
      }
    }
  };
  comets(false);

  // the shell: a deep translucent body with crisp spiral striations wound into it, a hot core, a lit rim upper-left
  p.shade(cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, (x, y) => {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) / r;
    if (d > 1) return;
    const a = Math.atan2(dy, dx), sw = Math.sin(a * 3 + d * 7.5 - ph * 1.6);
    if (d > 0.87) p.dot(x, y, dx + dy < -r * 0.25 ? C[6] : dx + dy > r * 0.5 ? C[3] : C[5]);
    else if (d < 0.2) p.dot(x, y, WHITE);
    else if (d < 0.36) p.dot(x, y, sw > 0.3 ? WHITE : C[6]);
    else if (sw > 0.8) p.dot(x, y, d < 0.6 ? C[6] : C[5]);
    else p.blend(x, y, tone(C, 1.7 + 2.6 * (1 - d) ** 1.3 + 0.6 * sw, x, y), 0.82);
    p.light(x, y, C[4], 0.06 * (1 - d) * power);
  });
  p.glow(cx, cy, r * 0.55 + 2, C[6], 0.32 * power);
  comets(true);

  // wind: arms spiralling off the shell, turning with it, solid and shortening rather than speckled
  const arms = 3 + (power > 1.2 ? 1 : 0), reach = 0.7 + 0.6 * clamp(power - 0.6);
  for (let j = 0; j < arms; j++) {
    let prev = null;
    for (let s = 0; s <= 0.78; s += 0.06) {
      const rr = r * (1.1 + reach * s), ang = ph * 0.8 + (j / arms) * TAU + s * 2.6;
      const pt = [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.92];
      if (prev && s > 0.05) p.line(prev[0], prev[1], pt[0], pt[1], s < 0.3 ? C[6] : s < 0.55 ? C[5] : C[4]);
      prev = pt;
    }
  }
  // sparks crawling on the surface
  for (let i = 0; i < 3; i++) {
    const a = R.range(0, TAU), rr = r * R.range(0.55, 1.05);
    if (R.chance(0.6)) sparkle(p, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, R.range(1, 2.2), WHITE, C[6], 0.5);
  }
}

export function create(o) {
  const C = fit(o.palette, 8), Rg = new Rng(o.seed);
  const ps = new Particles({ rng: Rg, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] });
  const soft = new Particles({ rng: Rg, ground: () => 0 });
  const lights = new Lights();
  const DUSTC = mix(C[3], 0xffb8b0a8, 0.6);

  // great circles the comets ride: tilted every way, mostly turning the same way so it reads as one spin
  const orbits = Array.from({ length: 7 }, (_, i) => ({
    ax: Rg.range(0.7, 1.45) * (i % 2 ? 1 : -1), az: (i / 7) * Math.PI + Rg.range(-0.2, 0.2),
    v: Rg.range(0.85, 1.25), dir: i === 5 ? -1 : 1, k: Rg.range(0, TAU), rr: Rg.range(0.98, 1.12),
  }));
  // the gathering: streaks of wind that spiral in to the palm
  const gather = Array.from({ length: 54 }, () => ({ t0: Rg.range(-0.05, 0.95), life: Rg.range(0.28, 0.5), r0: Rg.range(16, 40), a0: Rg.range(0, TAU), turn: Rg.range(1.6, 2.8), c: Rg.chance(0.3) ? 6 : 5 }));

  let t = 0, burst = false, hit = false, puff = 0;
  let bx = 0, by = 0;

  function blast(cx, cy) {
    burst = true;
    lights.add(cx, cy, 80, C[5], 1.5, 0.55);
    lights.add(cx, cy, 34, WHITE, 1.2, 0.14);
    for (let i = 0; i < 56; i++) {
      const a = Rg.range(0, TAU), sp = Rg.range(90, 300);
      ps.spawn(P.SPARK, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 40, Rg.range(0.3, 0.8));
    }
    // wind thrown off on the spiral: outward and turning
    for (let i = 0; i < 34; i++) {
      const a = Rg.range(0, TAU), sp = Rg.range(120, 260), tx = -Math.sin(a), ty = Math.cos(a);
      ps.spawn(P.MOTE, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, (Math.cos(a) * 0.55 + tx * 0.8) * sp, (Math.sin(a) * 0.55 + ty * 0.8) * sp, Rg.range(0.25, 0.6), Rg.chance(0.4) ? C[6] : C[5], Rg.range(0.8, 1.3));
    }
    for (let i = 0; i < 26; i++) {
      const dir = i % 2 ? 1 : -1, sp = Rg.range(40, 150);
      soft.spawn(P.DUST, cx + dir * Rg.range(0, 14), -Rg.range(1, 4), dir * sp, -Rg.range(5, 30), Rg.range(0.7, 1.4), DUSTC, Rg.range(3, 6.5));
    }
    for (let i = 0; i < 12; i++) {
      const a = Rg.range(0, TAU);
      soft.spawn(P.VAPOUR, cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, Math.cos(a) * Rg.range(30, 80), Math.sin(a) * Rg.range(30, 80), Rg.range(0.6, 1.1), C[5], Rg.range(4, 8));
    }
    for (let i = 0; i < 16; i++) ps.spawn(P.GRIT, cx + Rg.range(-12, 12), -1, Rg.range(-110, 110), -Rg.range(120, 260), Rg.range(0.8, 1.3), mix(C[1], C[3], Rg.next()), Rg.chance(0.4) ? 2 : 1);
    for (let i = 0; i < 14; i++) ps.spawn(P.STAR, cx + Rg.range(-40, 40), cy + Rg.range(-30, 18), Rg.range(-12, 12), -Rg.range(4, 16), Rg.range(0.6, 1.5), C[6], Rg.chance(0.4) ? 1.6 : 0.6, Rg.range(0.1, 0.5));
  }

  return {
    update(dt) {
      t += dt;
      const r = radius(t), [cx, cy] = anchor(t, r);
      // power rising: the floor under him stirs, dust turning round his feet
      if (t > 0.5 && t < DRAW && Rg.chance(dt * 26 * smooth(0.5, FULL, t))) {
        const s = Rg.sign();
        soft.spawn(P.DUST, s * Rg.range(6, 16), -Rg.range(0, 2), s * Rg.range(10, 34), -Rg.range(6, 20), Rg.range(0.5, 0.9), DUSTC, Rg.range(2, 3.5));
      }
      if (t > 0.6 && t < GO && Rg.chance(dt * 30)) {
        const a = Rg.range(0, TAU), rr = r * 1.4;
        ps.spawn(P.MOTE, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, -Math.sin(a) * 90, Math.cos(a) * 90, Rg.range(0.12, 0.22), C[5], 0.7);
      }
      if (t >= HIT && !hit) {
        hit = true;
        lights.add(cx + r, cy, 40, C[6], 0.8, 0.16);
        for (let i = 0; i < 20; i++) ps.spawn(P.SPARK, cx + r * 0.8, cy, Rg.range(-40, 220), Rg.range(-220, 120), Rg.range(0.2, 0.5));
      }
      // grinding: sparks and wind sprayed off the turning edge, dust ploughed up off the floor
      if (hit && !burst) {
        bx = cx; by = cy;
        const n = Math.floor((puff += dt * 340));
        puff -= n;
        for (let i = 0; i < n; i++) {
          const a = Rg.range(-1.4, 1.4) + (Rg.chance(0.5) ? 0 : Math.PI), sp = Rg.range(110, 260), ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r;
          // the tangent of a clockwise spin, thrown back towards him off the top and down off the front
          const tx = -Math.sin(a), ty = Math.cos(a);
          if (Rg.chance(0.6)) ps.spawn(P.SPARK, ex, ey, tx * sp + Rg.range(-30, 30), ty * sp - 30, Rg.range(0.12, 0.35));
          else ps.spawn(P.MOTE, ex, ey, tx * sp * 0.9, ty * sp * 0.9, Rg.range(0.1, 0.22), C[6], 0.8);
        }
        if (Rg.chance(dt * 40)) soft.spawn(P.DUST, cx + Rg.range(-4, 10), -Rg.range(0, 2), Rg.range(20, 90), -Rg.range(10, 40), Rg.range(0.5, 0.9), DUSTC, Rg.range(2.5, 4.5));
        if (Rg.chance(dt * 16)) lights.add(cx, cy, 30, C[5], 0.7, 0.08);
      }
      if (t >= BLAST && !burst) blast(bx || cx, by || cy);
      ps.update(dt);
      soft.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const r = radius(t), [cx] = anchor(t, r), power = smooth(SEED, FULL, t);
      // a pool of light on the floor under the sphere while it lives
      if (r > 0.5) {
        p.glow(cx, 0, 30 + r * 2, C[3], 0.2 * power);
        band(p, cx, 0, 9 + r * 0.9, 0.16, 1, 0.5 * power, [C[2], C[3], C[4], C[5]], (g) => Math.sin(g) < 0);
      }
      soft.draw(p);
    },
    draw(p) {
      const f = Math.floor(t * 30 + 1e-6), r = radius(t), [cx, cy] = anchor(t, r);
      const ph = spin(t), power = 0.55 + 0.45 * smooth(SEED, FULL, t) + 0.5 * smooth(HIT, HIT + 0.15, t) + 0.12 * Math.sin(t * 43);

      // the gathering: streaks spiralling in to the palm, whiter as they arrive
      for (const g of gather) {
        const u = (t - g.t0) / g.life;
        if (u <= 0 || u >= 1) continue;
        const [hx, hy] = anchor(g.t0 + g.life, R0);
        const at = (v) => {
          const rr = g.r0 * (1 - v) ** 1.5 + 2, a = g.a0 + g.turn * v ** 0.8;
          return [hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.85];
        };
        const [x1, y1] = at(u), [x0, y0] = at(Math.max(0, u - 0.16)), k = Math.min(1, u * 4);
        p.line(x0, y0, x1, y1, (v) => (v > 0.7 ? C[g.c + 1] ?? WHITE : C[g.c - 1]), k);
        p.light(x1, y1, C[5], 0.3 * k);
      }

      // the sprint: the sphere drags light and speed lines behind it
      if (t > GO - 0.02 && t < HIT + 0.05) {
        const k = 1 - seg(t, HIT, HIT + 0.05);
        for (let i = 1; i <= 5; i++) {
          const [gx, gy] = anchor(t - i * 0.025, r);
          p.glow(gx, gy, r * 1.4, C[4], 0.22 * k * (1 - i / 6));
        }
        const R = rng(o.seed, 5, f);
        for (let i = 0; i < 6; i++) {
          const ly = cy + R.range(-r * 1.6, r * 1.6), L = R.range(16, 40), x1 = cx - r * 0.6 - R.range(0, 8);
          if (k > 0.5) p.line(x1 - L, ly, x1, ly, (v) => (v > 0.8 ? C[6] : v > 0.45 ? C[4] : C[3]));
        }
      }

      if (r > 0) sphere(p, C, cx, cy, r, ph, orbits, power, f);

      // grinding: the target face lit, small shock rings pulsing off the contact
      if (hit && !burst) {
        const tt = t - HIT;
        for (let i = 0; i < 3; i++) {
          const u = ((tt * 6 + i / 3) % 1), rr = r + 2 + u * 12;
          p.arc(cx, cy, rr, 1, -1.1, 1.1, u < 0.3 ? C[6] : C[5], 1 - u);
        }
        p.glow(cx + r, cy, 16, C[6], 0.22);
      }

      // the burst
      if (burst) {
        const tt = t - BLAST;
        if (tt < 0.07) {
          p.circle(bx, by, 15 + tt * 120, tt < 0.035 ? WHITE : C[7]);
          p.glow(bx, by, 64, C[6], 1.1 * (1 - tt / 0.07));
        }
        // the spiral shockwave: five arms unwinding outward, hot at the root, never below the floor. They fade by
        // shortening and cooling, not by dithering, so they stay lines
        const u = seg(tt, 0.02, 0.95);
        if (u > 0 && u < 1) {
          const S = 10 + 56 * ease.outCubic(u), rot = -ease.outCubic(u) * 2.6, s0 = 0.15 + 0.6 * u ** 1.4, s1 = 1 - 0.35 * u;
          const heat = u < 0.25 ? 0 : u < 0.55 ? 1 : 2;
          for (let j = 0; j < 5; j++) {
            let prev = null;
            for (let s = s0; s <= s1 + 1e-4; s += 0.025) {
              const rr = S * (0.2 + 0.8 * s), ang = rot + (j / 5) * TAU + s * 3.1;
              const pt = [bx + Math.cos(ang) * rr, by + Math.sin(ang) * rr * 0.9];
              if (prev && pt[1] < 1 && prev[1] < 1) {
                const v = (s - s0) / (s1 - s0), col = C[Math.max(3, 7 - heat - Math.floor(v * 3))];
                if (u < 0.6) p.line(prev[0] + 1, prev[1] + 1, pt[0] + 1, pt[1] + 1, C[Math.max(2, 4 - heat)]);
                p.line(prev[0], prev[1], pt[0], pt[1], v < 0.2 && heat === 0 ? WHITE : col);
                p.light(pt[0], pt[1], C[5], 0.3 * (1 - u));
              }
              prev = pt;
            }
          }
        }
        // the shock ring in the air and its echo on the floor
        const v = seg(tt, 0, 0.3);
        if (v > 0 && v < 1) {
          const rr = 10 + 54 * ease.outQuart(v), w = Math.max(0.5, 2.4 * (1 - v));
          p.shade(bx - rr - 3, by - rr - 3, bx + rr + 3, Math.min(by + rr + 3, 0), (x, y) => {
            const d = Math.abs(Math.hypot(x - bx, y - by) - rr);
            if (d < w) p.dot(x, y, d < 0.6 && v < 0.5 ? WHITE : v < 0.7 ? C[6] : C[5]);
          });
          p.glowRing(bx, by, rr, 7, C[5], 0.45 * (1 - v));
        }
        const w = seg(tt, 0.02, 0.7);
        if (w > 0 && w < 1) band(p, bx, 0, 8 + 74 * ease.outCubic(w), 0.16, Math.max(1, 3 * (1 - w)), 1 - w, [C[4], C[5], C[6], WHITE], () => true, w < 0.2);
        // the wind it leaves: a faint spiral that keeps turning while it fades
        const z = seg(tt, 0.3, 1.5);
        if (z > 0 && z < 1) {
          for (let j = 0; j < 3; j++) {
            let prev = null;
            for (let s = 0.15; s <= 1.0001; s += 0.05) {
              const rr = (20 + 24 * z) * s, ang = -tt * 3 + (j / 3) * TAU + s * 2.8, pt = [bx + Math.cos(ang) * rr, by + Math.sin(ang) * rr * 0.7];
              if (prev && pt[1] < 0) p.line(prev[0], prev[1], pt[0], pt[1], C[4], (1 - z) * 0.6 * (1 - s * 0.6));
              prev = pt;
            }
          }
        }
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
