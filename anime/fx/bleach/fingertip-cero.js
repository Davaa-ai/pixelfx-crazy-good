// Inspired by fingertip energy blasts fired by masked spirits in soul-reaper anime. Generic motifs only: no characters,
// costumes or logos.
import { Particles, Lights, P, Rng, rng, rand, fit, clamp, smooth, ease, noise, bolt, hex, band, WHITE, READY, TAU } from "../../../src/core/index.js";
import { speedBurst, unlight } from "../_lib.js";

export const meta = {
  name: "Fingertip cero",
  desc: "Crimson motes stream into a black-rimmed sphere at a raised fingertip; it fires a black-edged red beam with a white heart and shock rings, exploding on the target.",
  tags: ["bleach", "anime", "move", "beam", "blast", "charge", "red", "black", "one-shot"],
  size: [300, 136],
  origin: [40, 108],
  duration: 3.0,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#0a0204", "#2e0408", "#66081a", "#a80f22", "#e8202e", "#ff6048", "#ffb8a0", "#ffffff"],
    sparks: ["#ffffff", "#ffb8a0", "#ff6048", "#a80f22"],
    seed: 41,
  },
};

const FIRE = 1.0, RUSH = 1500, END_X = 258, TX = 172, HOLD = FIRE + 0.42, GONE = FIRE + 0.85;
const S = [20, -29], VOID = hex("#0a0204");
const HIT = FIRE + (TX - 8 - S[0]) / RUSH;
const radius = (t) => (t < FIRE ? 1 + 7 * ease.inOutQuad(clamp(t / (FIRE - 0.1))) : 8 * (1 - smooth(FIRE, FIRE + 0.1, t)));
const beamW = (t) => (t < FIRE ? 0 : 20 * ease.outBack(clamp((t - FIRE) / 0.06)) * (1 - ease.inQuad(smooth(HOLD, GONE, t))));
const beamFront = (t) => Math.min(END_X, S[0] + (t - FIRE) * RUSH);

const AIM = { ...READY, turn: 0.15, crouch: 3, lean: 1, fx: S[0] - 4, fy: S[1], bx: -3, by: -20, ffx: 9, fbx: -8 };
export const act = {
  ghost: "#ff6048",
  target: { x: TX },
  poses: [
    [-0.45, { ...READY }],
    [-0.1, { ...AIM, fx: 10, fy: -36, crouch: 2 }, "out"],
    [0.15, AIM],
    [FIRE - 0.05, { ...AIM, crouch: 4, lean: 2 }],
    [FIRE, { ...AIM, x: 1, crouch: 5, lean: -3, fx: S[0] - 6, fy: S[1] - 1, ffx: 10, fbx: -10 }, "snap"],
    [HOLD, { ...AIM, x: 0, crouch: 5, lean: -2, fx: S[0] - 5, fy: S[1], ffx: 10, fbx: -10 }],
    [GONE + 0.3, { ...AIM, x: -2, crouch: 3, fx: 12, fy: -24 }],
    [2.6, { ...READY, x: -2 }],
  ],
  hits: [
    { t: FIRE, shake: 0.3, amp: 2, target: false },
    { t: HIT, stop: 0.1, shake: 0.55, amp: 3, push: 5.4, straw: 34, skin: "char", flash: 0.08, shiver: 0.4 },
    { t: HIT + 1.3, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: FIRE, x: -6, n: 8, dir: -1 }, { t: HIT, x: TX - 6, n: 10, dir: 1 }],
};

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks }), lights = new Lights();
  let t = 0, fired = false, struck = false, cores = [];

  return {
    update(dt) {
      t += dt;
      // ---- motes rushing in to the fingertip
      if (t < FIRE - 0.05 && R.chance(dt * (40 + 90 * (t / FIRE)))) {
        const a = R.range(0, TAU), d = R.range(28, 56), sp = R.range(50, 90);
        ps.spawn(P.STREAK, S[0] + Math.cos(a) * d, S[1] + Math.sin(a) * d * 0.8, -Math.cos(a) * sp, -Math.sin(a) * sp * 0.8, d / (sp * 2.3), R.chance(0.6) ? C[5] : C[6]);
      }
      if (!fired && t >= FIRE) {
        fired = true;
        lights.add(S[0], S[1], 80, C[5], 1.1, 0.4);
        lights.add(S[0], S[1], 26, WHITE, 1, 0.1);
        for (let i = 0; i < 14; i++) ps.spawn(P.SPARK, S[0], S[1], -R.range(30, 110), R.range(-120, 30), R.range(0.15, 0.35));
      }
      // ---- the blast where it lands, fed while the beam holds
      if (!struck && t >= HIT) {
        struck = true;
        lights.add(TX, S[1], 110, C[5], 1.2, 0.9);
        lights.add(TX, S[1], 34, WHITE, 1, 0.16);
      }
      if (struck && t < HOLD + 0.1) {
        const k = R.chance(dt * 120);
        if (k) {
          const a = R.range(-Math.PI, Math.PI), sp = R.range(100, 300);
          ps.spawn(P.SPARK, TX - 4, S[1] + R.range(-6, 6), Math.cos(a) * sp * 0.6 - 40, Math.sin(a) * sp, R.range(0.2, 0.5));
        }
        if (R.chance(dt * 40)) ps.spawn(P.FIRE, TX + R.range(-6, 10), S[1] + R.range(-10, 10), R.range(0, 60), R.range(-60, 0), R.range(0.3, 0.6), 0, R.range(3, 6));
      }
      if (struck && t < HOLD + 0.2 && R.chance(dt * 18)) ps.spawn(P.SMOKE, TX + R.range(-6, 16), S[1] + R.range(-8, 10), R.range(0, 30), -R.range(10, 30), R.range(0.8, 1.2), C[1], R.range(5, 9));
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      ps.draw(p, "back");
    },
    draw(p) {
      cores = [];
      const r = radius(t), tick = Math.floor(t * 24);
      // ---- the sphere: a white heart, a red body, a black rim, rings spun round it and static crackling off it
      if (t < FIRE + 0.1 && r > 0.5) {
        const pulse = 1 + 0.12 * Math.sin(t * 46);
        p.glow(S[0], S[1], 18 + r * 3, C[4], 0.25 + 0.35 * (r / 8));
        p.circle(S[0], S[1], r * pulse + 1.4, VOID);
        p.circle(S[0], S[1], r * pulse, (d) => (d < 0.35 ? WHITE : d < 0.6 ? C[6] : d < 0.85 ? C[5] : C[4]));
        p.glow(S[0], S[1], r * 1.6 + 2, C[6], 0.5);
        for (let k = 0; k < 2; k++) {
          const g = clamp(t / FIRE), rr = r * 1.9 + 3 + k * 2;
          band(p, S[0], S[1], rr, 0.28 + k * 0.2, 1.2, g * 0.9, [C[2], C[4], C[5], C[6]], (a) => Math.sin(a + t * (9 + k * 4)) > -0.2, true);
        }
        const n = 1 + Math.floor(4 * clamp(t / FIRE));
        for (let i = 0; i < n; i++) {
          const q = rng(o.seed, tick, i), a = q.range(0, TAU), L = r + q.range(4, 10), x0 = S[0] + Math.cos(a) * r, y0 = S[1] + Math.sin(a) * r;
          p.polyline(bolt(q, x0, y0, S[0] + Math.cos(a) * L, S[1] + Math.sin(a) * L, { jag: 0.4, depth: 2 }), q.chance(0.4) ? C[6] : C[4]);
        }
        // the floor under it warms
        p.glowLine(S[0] - 20, 0, S[0] + 20, 0, 8, C[4], 0.3 * clamp(t / FIRE));
      }
      // ---- the hero frame: a white disc and black speed lines at the fingertip
      const u = t - FIRE;
      if (u >= 0 && u < 0.07) {
        p.circle(S[0], S[1], 16 * (1 - u / 0.07) + 4, WHITE);
        speedBurst(p, S[0], S[1], 8, 46, 24, o.seed, VOID, C[5], 1, ease.outQuart(clamp(u / 0.04)));
      }
      // ---- the beam: black edge, red body, white heart; wobbling, with shock rings racing down it
      const W = beamW(t);
      if (W > 0.6) {
        const F = beamFront(t), h = W / 2, ft = Math.floor(t * 30);
        p.shade(S[0], S[1] - h - 3, F + h, S[1] + h + 3, (x, y, out) => {
          const wob = noise(x * 0.12 - t * 40, o.seed) * 1.6, half = h * (1 + 0.08 * Math.sin(x * 0.4 - t * 70)) * Math.min(1, (x - S[0] + 2) / 8), d = Math.abs(y - S[1] - wob * 0.4) / (half || 1);
          // a rounded head at the front
          const head = x > F - h ? Math.hypot((x - (F - h)) / h, (y - S[1]) / h) : 0;
          if (d > 1 || head > 1) return;
          const dd = Math.max(d, head);
          if (dd > 0.86) return cores.push([x, y]), VOID;
          if (dd > 0.7) return C[4];
          if (dd > 0.45) return rand(Math.floor(x * 0.5 - t * 90), Math.floor(y), ft) < 0.25 ? C[6] : C[5];
          if (dd > 0.22) return C[6];
          return WHITE;
        });
        p.glowLine(S[0], S[1], F, S[1], W * 1.6, C[4], 0.5);
        p.glowLine(S[0], S[1], F, S[1], W * 0.5, C[6], 0.45);
        // shock rings slipping down the beam, edge on
        for (let i = 0; i < 6; i++) {
          const x = S[0] + 10 + ((t * 420 + i * 40) % (F - S[0] + 1));
          if (x > F - 4) continue;
          p.ellipse(x, S[1], 2, h + 4, (d) => (d > 0.7 ? C[6] : 0), 0.9);
          p.ellipse(x, S[1], 1, h + 4, (d) => (d > 0.7 ? WHITE : 0));
        }
        // the floor lit under it
        p.glowLine(S[0], 0, F, 0, 12, C[4], 0.35 * (W / 20));
      }
      // ---- the blast where it lands
      if (struck) {
        const v = t - HIT, k = 1 - smooth(HOLD - 0.1, GONE, t), big = 14 + 4 * Math.sin(t * 50);
        if (k > 0) {
          p.circle(TX - 4, S[1], big * k + 2, (d) => (d < 0.4 ? WHITE : d < 0.75 ? C[6] : C[5]), Math.min(1, k * 1.5));
          p.ring(TX - 4, S[1], big * k + 4, 1.3, VOID, k);
          p.glow(TX - 4, S[1], 50, C[5], 0.6 * k);
        }
        if (v < 0.5) {
          const w = ease.outCubic(v / 0.5);
          p.ring(TX - 4, S[1], 16 + 30 * w, 1.4, C[6], 1 - w);
          p.ring(TX - 4, S[1], 14 + 27 * w, 1, C[4], 0.8 * (1 - w));
        }
      }
      ps.draw(p, "front");
      lights.draw(p);
      for (const [x, y] of cores) unlight(p, x, y, 0.1);
    },
  };
}

