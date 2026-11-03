// Inspired by wire-launched explosive lances in dark fantasy anime. Generic motifs only: no characters or gear designs.
import { Particles, Bits, Lights, P, PF, B, Rng, rng, rand, fit, bolt, band, sparkle, star, clamp, smooth, ease, lerp, hex, WHITE, READY, TAU } from "../../../src/core/index.js";
import { ribbon, strokeLevel } from "../_lib.js";

export const meta = {
  name: "Thunder spear",
  desc: "A cabled lance lodges in the target and sits blinking, faster and faster. Then white flash, blue thunder arcs, a ring along the floor and a rolling smoke column.",
  tags: ["attack on titan", "anime", "move", "projectile", "explosion", "fuse", "cable", "smoke", "one-shot"],
  size: [304, 156],
  origin: [44, 126],
  duration: 4.1,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"],
    arc: ["#0a0f2e", "#172a78", "#2550d0", "#3f8cff", "#7cc8ff", "#c8f0ff", "#ffffff"],
    steel: ["#1c2230", "#4a5468", "#9aa6ba", "#d0d8e6", "#ffffff"],
    seed: 12,
  },
};

const FIRE = 0.0, FLY = 0.2, DET = 0.98, TX = 136, MUZ = [34, -21], STUCK = [TX - 17, -31], CEN = [TX - 6, -30];
const BLINK = [0.3, 0.46, 0.58, 0.67, 0.74, 0.8, 0.85, 0.89, 0.92, 0.95];
const BLACK = hex("#0a0608");
const REST_ = { ...READY, weapon: "launcher", two: true, sa: -1, fx: 9, fy: -19 };
const KNEEL = { ...READY, weapon: "launcher", two: true, sa: 0, fx: 9, fy: -17, crouch: 6, lean: 2, ffx: 12, fbx: -9 };
const KICK = { ...KNEEL, x: -6, sa: -0.12, fx: 4, fy: -19, lean: -4, crouch: 5 };
export const act = {
  ghost: "#d0d8e6",
  target: { x: TX },
  poses: [
    [-0.5, REST_],
    [-0.16, KNEEL],
    [FIRE - 0.001, { ...KNEEL, crouch: 7 }],
    [FIRE, KICK, "snap"],
    [FIRE + 0.4, { ...KNEEL, x: -6 }],
    [DET - 0.4, { ...KNEEL, x: -9, crouch: 8, lean: -5, sa: 0.2 }],
    [DET - 0.02, { ...KNEEL, x: -14, crouch: 8, lean: -7, sa: 0.3, yaw: 0.5 }],
    [DET + 0.15, { ...KNEEL, x: -22, crouch: 9, lean: -9, sa: 0.3, yaw: 0.6 }, "snap"],
    [DET + 1.2, { ...KNEEL, x: -22, crouch: 7, lean: -2, yaw: 0.3 }],
    [DET + 2.2, { ...REST_, x: -12 }],
    [3.9, { ...REST_, x: -6 }],
  ],
  hits: [
    { t: FIRE, stop: 0.05, shake: 0.2, amp: 2, target: false },
    { t: FIRE + FLY, stop: 0.04, shake: 0.12, amp: 1, push: 0.8, straw: 3 },
    { t: DET, stop: 0.2, shake: 0.55, amp: 4, push: 6.5, straw: 54, skin: "char", flash: 0.08 },
    { t: DET + 2.4, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: FIRE, x: -14, n: 8, dir: -1 }, { t: DET, x: -10, n: 8, dir: -1 }],
};

// a ring that stops at the floor instead of going through it
function clipRing(p, x, y, r, w, c, a) {
  const lim = (2 - y) / r;
  if (lim >= 1) return p.ring(x, y, r, w, c, a);
  p.arc(x, y, r, w, Math.PI - Math.asin(Math.max(-1, lim)), TAU + Math.asin(Math.max(-1, lim)), c, a);
}
// the lance: a cone head, a shaft, fins at the tail; pointing along ang with its tip at (x, y)
function lance(p, x, y, ang, S, k = 1) {
  const c = Math.cos(ang), s = Math.sin(ang), n = [-s, c], bx = x - c * 6, by = y - s * 6, tx = x - c * 15, ty = y - s * 15;
  p.poly([[x, y], [bx + n[0] * 2.6, by + n[1] * 2.6], [bx - n[0] * 2.6, by - n[1] * 2.6]], (px, py) => ((px - x) * n[0] + (py - y) * n[1] < 0 ? S[2] : S[3]), k);
  p.px(x, y, S[4]);
  p.line(bx, by, tx, ty, S[1], k);
  p.line(bx + n[0], by + n[1], tx + n[0], ty + n[1], S[2], k * 0.8);
  p.line(tx, ty, tx - c * 2 + n[0] * 3, ty - s * 2 + n[1] * 3, S[2], k);
  p.line(tx, ty, tx - c * 2 - n[0] * 3, ty - s * 2 - n[1] * 3, S[2], k);
}

export function create(o) {
  const C = fit(o.palette, 8), A = fit(o.arc, 7), S = fit(o.steel, 5), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, haze: "#ff8a50" }), bits = new Bits({ ground: floor }), lights = new Lights();
  const strokes = [0, 0.05, 0.1].map((d, i) => ({ t: DET + d, k: 1 - i * 0.25 }));
  const sets = strokes.map(() => Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * TAU + R.range(-0.3, 0.3), L = R.range(30, 66);
    return bolt(R, CEN[0], CEN[1], CEN[0] + Math.cos(a) * L, CEN[1] + Math.sin(a) * L * 0.85, { jag: 0.26, depth: 3 });
  }));
  let t = 0, fired = false, stuck = false, boom = false, acc = 0, col = 0;
  const dirAt = (u) => Math.atan2(STUCK[1] - MUZ[1] - 8 * Math.PI * Math.cos(Math.PI * u) * 0.12, STUCK[0] - MUZ[0]);
  const spearAt = (u) => [lerp(MUZ[0] + 6, STUCK[0], u), lerp(MUZ[1], STUCK[1], u) - 7 * Math.sin(Math.PI * u)];

  return {
    update(dt) {
      t += dt;
      if (!fired && t >= FIRE) {
        fired = true;
        lights.add(MUZ[0] + 4, MUZ[1], 34, C[6], 0.9, 0.18);
        for (let i = 0; i < 10; i++) ps.spawn(P.SPARK, MUZ[0] + 4, MUZ[1], R.range(60, 260), R.range(-90, 50), R.range(0.1, 0.3));
        for (let i = 0; i < 8; i++) ps.spawn(P.SMOKE, MUZ[0] + R.range(0, 12), MUZ[1] + R.range(-3, 3), R.range(20, 90), R.range(-18, 4), R.range(0.5, 1), "#c8c0c8", R.range(2, 3.4));
      }
      if (!stuck && t >= FIRE + FLY) {
        stuck = true;
        lights.add(STUCK[0], STUCK[1], 28, C[6], 0.7, 0.2);
        for (let i = 0; i < 12; i++) ps.spawn(P.SPARK, STUCK[0], STUCK[1], R.range(-200, 40), R.range(-160, 40), R.range(0.12, 0.35));
      }
      // blinks: the lamp on the tail lights, the light pulses along the cable
      for (const b of BLINK) if (t >= b && t - dt < b) lights.add(STUCK[0] - 12, STUCK[1] - 2, 14, "#ff3030", 0.8, 0.1);
      if (!boom && t >= DET) {
        boom = true;
        const [x, y] = CEN;
        lights.add(x, y, 60, WHITE, 1.1, 0.14);
        lights.add(x, y, 66, C[5], 1, 0.9);
        lights.add(x, y, 52, A[4], 0.6, 0.3);
        // the fireball
        for (let i = 0; i < 46; i++) {
          const a = R.range(0, TAU), sp = R.range(20, 150), up = R.chance(0.6);
          ps.spawn(P.FIRE, x + Math.cos(a) * 6, y + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - (up ? 40 : 0), R.range(0.3, 0.7), 0, R.range(4, 9), 0, PF.SMOKES);
        }
        for (let i = 0; i < 36; i++) {
          const a = R.range(0, TAU), sp = R.range(100, 300);
          ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 60, R.range(0.2, 0.5));
        }
        // the ring of dust along the floor, both ways
        for (let i = 0; i < 20; i++) ps.spawn(P.DUST, x + R.range(-8, 8), -2 - R.range(0, 3), (i % 2 ? 1 : -1) * R.range(60, 170), R.range(-16, -2), R.range(0.5, 0.9), "#8a7a70", R.range(3.5, 6));
        for (let i = 0; i < 16; i++) {
          const a = R.range(-2.8, -0.3), sp = R.range(120, 300);
          bits.add({ kind: B.CHUNK, drag: 1.2, x: x + R.range(-6, 6), y: y + R.range(-8, 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: R.range(0, TAU), va: R.range(-14, 14), s: R.range(2, 4), ramp: ["#4e331f", "#86643a", "#b38b57", "#c9a26c", "#f0d98a"], bounce: 0.4, life: R.range(1.2, 2.2) });
        }
      }
      // the smoke column rolls up out of the blast, and spreads at the top
      if (t > DET && t < DET + 0.7) {
        for (acc += dt * 60; acc >= 1; acc--) {
          const u = (t - DET) / 0.7;
          ps.spawn(P.SMOKE, CEN[0] + R.range(-9, 9), -R.range(4, 26), R.range(-14, 14), -R.range(30, 78) * (1.1 - u * 0.4), R.range(1.3, 2.0), 0, R.range(7, 12), 0, PF.BIG);
        }
      }
      if (t > DET + 0.55 && t < DET + 0.8 && R.chance(dt * 70)) ps.spawn(P.SMOKE, CEN[0] + R.range(-10, 10), -66, R.range(-60, 60), R.range(-6, 4), R.range(1.2, 1.9), "#d8d0d4", R.range(8, 13), 0, PF.BIG);
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the scorch the blast leaves, slowly going
      if (t >= DET) {
        const u = t - DET, k = ease.outCubic(clamp(u / 0.2)) * (1 - smooth(1.5, 2.9, u));
        p.ellipse(CEN[0], 1, 34 * k, 4.2 * k, BLACK, 0.8);
        p.ellipse(CEN[0], 1, 22 * k, 2.6 * k, hex("#1a0f10"), 0.8);
        const rr = 6 + 88 * ease.outCubic(clamp(u / 0.5));
        if (u < 0.5) band(p, CEN[0], 1, rr, 0.17, 2.4, (1 - u / 0.5) * 0.9, C.slice(2, 8));
      }
      ps.draw(p, "back");
    },
    draw(p) {
      // ---- the lance in the air, its cable paying out behind it; once lodged, a lamp blinking on the tail
      if (t >= FIRE && t < DET + 0.04) {
        const u = clamp((t - FIRE) / FLY), [x, y] = spearAt(u), a = u < 1 ? dirAt(u) : Math.atan2(STUCK[1] - MUZ[1], STUCK[0] - MUZ[0]);
        const tail = [x - Math.cos(a) * 15, y - Math.sin(a) * 15], sag = (u < 1 ? 6 * (1 - u) : 4) + (t > DET ? 14 * ease.inQuad((t - DET) / 0.04) : 0);
        const pts = [];
        for (let i = 0; i <= 26; i++) {
          const q = i / 26;
          pts.push([lerp(MUZ[0] + 2, tail[0], q), lerp(MUZ[1], tail[1], q) + sag * 4 * q * (1 - q)]);
        }
        p.polyline(pts, S[2]);
        // the blink races along the cable
        for (const b of BLINK) if (t >= b && t < b + 0.12) {
          const f = (t - b) / 0.12, j = Math.floor(f * 26);
          p.dot(pts[j][0], pts[j][1], WHITE);
          p.glow(pts[j][0], pts[j][1], 6, "#ff6040", 0.5 * (1 - f));
        }
        lance(p, x, y, a, S);
        if (u < 1) p.glowLine(x - Math.cos(a) * 15, y - Math.sin(a) * 15, x, y, 4, C[6], 0.3);
        if (u >= 1) {
          const lit = BLINK.some((b) => t >= b && t < b + 0.07) || t > DET - 0.1;
          p.px(tail[0] - Math.cos(a) * 1, tail[1] - Math.sin(a) * 1, lit ? hex("#ff5040") : hex("#5a1418"));
          if (lit) p.glow(tail[0], tail[1], 9, "#ff3a30", 0.6);
        }
      }
      // ---- the blast: a white flash and a star, thunder arcs, a ring through the air
      if (t >= DET) {
        const u = t - DET, [x, y] = CEN;
        if (u < 0.035) p.circle(x, y, 27, WHITE);
        else if (u < 0.1) p.poly(star(x, y, 20 - u * 60, 44 - u * 100, 10, u * 3), (d) => (u < 0.06 ? WHITE : C[6]));
        const lvl = Math.max(0, ...strokes.map((s) => strokeLevel(t, s.t, 30) * s.k)), idx = strokes.reduce((m, s, i) => (t >= s.t ? i : m), 0);
        if (lvl > 0)
          for (const b of sets[idx]) {
            ribbon(p, b, { w: (v) => (1 + 2.6 * lvl) * Math.pow(1 - v, 0.5) + 0.5, c: (v, w) => (Math.abs(w) < 0.4 ? WHITE : Math.abs(w) < 0.8 ? A[5] : A[3]), a: clamp(lvl * 1.4) });
            p.glowLine(b[0][0], b[0][1], b[b.length - 1][0], b[b.length - 1][1], 8, A[4], 0.25 * lvl);
          }
        const rr = 6 + 70 * ease.outCubic(clamp(u / 0.4));
        if (u < 0.4) {
          clipRing(p, x, y, rr, 2, C[6], (1 - u / 0.4) * 0.9);
          clipRing(p, x, y, rr - 3, 1, WHITE, (1 - u / 0.4) * 0.6);
          p.glowRing(x, y, Math.min(rr, 60), 8, C[5], 0.35 * (1 - u / 0.4));
        }
        if (u < 0.15) sparkle(p, x, y, 18 * (1 - u / 0.15), WHITE, C[6], 0.8);
      }
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
