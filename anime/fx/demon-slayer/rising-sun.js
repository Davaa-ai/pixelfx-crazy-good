// Inspired by flame sword styles in shonen anime. Generic motifs only: no characters, costumes or logos.
import { Particles, Lights, P, PF, Rng, rng, noise2, fit, sparkle, clamp, smooth, ease, lerp, WHITE, READY, TAU } from "../../../src/core/index.js";

export const meta = {
  name: "Rising sun",
  desc: "A low blade swings up in one huge crescent of flame, tongues streaming off its inner edge. At the top a sun rises behind the target, ringed in flame, and sheds embers as it sets.",
  tags: ["demon slayer", "anime", "move", "fire", "slash", "upward", "sun", "sword", "one-shot"],
  size: [232, 176],
  origin: [60, 152],
  duration: 2.4,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"],
    sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
    seed: 5,
  },
};

const TX = 62, CX = 10, CY = -38, RAD = 48, SY = 0.8, A0 = 2.1, A1 = -1.95, WID = 17, SWEEP = 0.11, HIT = 0.03, SUN = [58, -66], SUN_T = 0.2, SUN_END = 1.2;
const GUARD = { ...READY, weapon: "sword", crouch: 5, lean: 3, fx: 7, fy: -12, sa: 2.7, bx: 9, by: -19, ffx: 10, fbx: -8 };
const DEEP = { ...GUARD, crouch: 7, lean: 5, fx: 3, fy: -9, sa: 2.9 };
const UP = { ...GUARD, x: 2, crouch: 2, lean: 3, fx: 17, fy: -37, sa: -1.1, bx: -5, by: -26, ffx: 13, fbx: -10, ghost: 1 };
const TOP = { ...UP, x: 5, crouch: 1, lean: 0, fx: 9, fy: -42, sa: -2.1, bx: -7, by: -33, ffx: 11, fbx: -9, toeB: true };
export const act = {
  ghost: "#ffc46a",
  target: { x: TX },
  poses: [
    [-0.5, GUARD],
    [-0.15, DEEP],
    [0, UP, "snap"],
    [0.06, TOP, "snap"],
    [0.42, { ...TOP, x: 4, crouch: 2 }],
    [1.1, { ...GUARD, x: 0, fx: 12, fy: -22, sa: -0.5 }],
    [2.2, GUARD],
  ],
  hits: [
    { t: HIT, stop: 0.12, shake: 0.2, amp: 2, push: 3.2, straw: 20, skin: "char", flash: 0.05 },
    { t: 0.42, stop: 0.07, shake: 0.18, amp: 2, push: -1.8, straw: 10 },
  ],
  dust: [{ t: 0, x: 4, n: 7, dir: -1, c: "#6a4a3a" }, { t: HIT, x: TX - 10, n: 5, dir: 1, c: "#6a4a3a" }],
};

// a flame-lit point on the crescent's ellipse
const onArc = (r, a) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r * SY];

export function create(o) {
  const C = fit(o.palette, 8), F = [...C].reverse(), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks }), lights = new Lights();
  let t = 0, burst = false, burst2 = false, lastAng = A0;

  // progress of the head and the tail along the sweep, 0..1
  const head = (tt) => ease.outExpo(clamp(tt / SWEEP)), tail = (tt) => smooth(0.1, 0.5, tt);

  // the crescent: white-hot on the outer rim, cooling to deep red inward, with ragged tongues on the inner edge
  function crescent(p, tt) {
    const uh = head(tt), ut = tail(tt);
    if (uh - ut < 0.01) return;
    const B = RAD + 4, age = clamp(tt / 0.5);
    p.shade(CX - B, CY - B * SY - 2, CX + B, CY + B * SY + 2, (x, y, out) => {
      const dx = x - CX, dy = (y - CY) / SY, r = Math.hypot(dx, dy);
      if (r > RAD + 0.5 || r < RAD - WID - 2) return;
      const ang = Math.atan2(dy, dx);
      if (ang > A0 || ang < A1) return;
      const u = (A0 - ang) / (A0 - A1), v = (u - ut) / (uh - ut);
      if (v < 0 || v > 1) return;
      const w = WID * Math.pow(Math.sin(Math.PI * Math.min(1, Math.pow(v, 0.8) * 0.5 + (v > 0.85 ? 0.5 * ((v - 0.85) / 0.15) : 0) + 0.02)), 0.8) * (1 - 0.35 * age);
      const q = (RAD - r) / w;
      // tongues: the inner edge is eaten by noise that streams backwards along the sweep
      const rag = (noise2(u * 22 + 3, tt * 11, 5) * 0.5 + 0.5) * 0.55 + (noise2(u * 60, r * 0.3 - tt * 18, 9) * 0.5 + 0.5) * 0.15;
      if (q < 0 || q > 1 - rag * (0.3 + 0.7 * q)) return;
      const heat = clamp(q * 0.85 + (1 - v) * 0.45 + age * 0.35);
      out.c = F[Math.min(F.length - 2, Math.floor(heat * (F.length - 1)))];
      out.a = clamp(v * 5);
      if (q < 0.12 && v > 0.1) out.c = F[0];
    });
    // light riding the head of the swing
    const [hx, hy] = onArc(RAD - 6, A0 + (A1 - A0) * uh);
    p.glow(hx, hy, 34, C[5], 0.55 * (1 - clamp(tt / 0.4)));
    for (let k = 0; k <= 1; k += 0.1) {
      const [x, y] = onArc(RAD - 8, A0 + (A1 - A0) * lerp(ut, uh, k));
      p.glow(x, y, 15, C[4], 0.2 * (1 - age) * k);
    }
  }

  // the sun: a disc ringed in flame tongues that turn and breathe, rising behind the target
  function sun(p, tt) {
    const u = tt - SUN_T;
    if (u < 0 || tt > SUN_END + 0.35) return;
    const grow = ease.outBack(clamp(u / 0.26)), fade = 1 - clamp((tt - SUN_END) / 0.35), rise = ease.outQuad(clamp(u / 0.9)) * 7;
    const [sx, sy0] = SUN, sy = sy0 - rise, r = 19 * grow * (0.97 + 0.03 * Math.sin(tt * 18)) * (0.55 + 0.45 * fade);
    if (r < 1) return;
    const spin = tt * 1.1;
    // corona of tongues
    for (let i = 0; i < 16; i++) {
      const a = spin + (i / 16) * TAU, len = r * (0.5 + 0.28 * Math.sin(tt * 9 + i * 1.9) + (i % 2) * 0.22), w = 0.2;
      const pts = [[sx + Math.cos(a - w) * r * 0.9, sy + Math.sin(a - w) * r * 0.9], [sx + Math.cos(a) * (r + len), sy + Math.sin(a) * (r + len)], [sx + Math.cos(a + w) * r * 0.9, sy + Math.sin(a + w) * r * 0.9]];
      p.poly(pts, (x, y) => (Math.hypot(x - sx, y - sy) > r + len * 0.55 ? F[3] : F[2]), fade);
      p.poly(pts.map(([x, y], j) => (j === 1 ? [sx + (x - sx) * 0.8, sy + (y - sy) * 0.8] : [x, y])), (x, y) => (Math.hypot(x - sx, y - sy) > r + len * 0.35 ? F[4] : F[5]), fade);
    }
    // the disc, hot in the middle, a darker rim
    p.circle(sx, sy, r + 1, F[2], fade);
    p.circle(sx, sy, r, (d) => (d > 0.88 ? F[3] : d > 0.7 ? F[4] : d > 0.46 ? F[5] : d > 0.22 ? F[6] : F[7]), fade);
    p.ring(sx, sy, r * 1.55, 1, F[4], 0.55 * fade * (0.5 + 0.5 * Math.sin(tt * 12)));
    p.glow(sx, sy, r * 3.6, C[4], 0.5 * fade);
    p.glow(sx, sy, r * 1.8, C[6], 0.45 * fade);
  }

  return {
    update(dt) {
      t += dt;
      const uh = head(t);
      // flame streams off the crescent's inner edge behind its head, and thinly all along its tail
      if (t < 0.5) {
        const ut = tail(t), steps = t < 0.14 ? 9 : 3;
        for (let k = 0; k < steps; k++) {
          const u = lerp(ut, uh, R.range(0.05, 0.95)), [x, y] = onArc(RAD - R.range(3, 12), A0 + (A1 - A0) * u);
          if (R.chance(0.7)) ps.spawn(P.FIRE, x, y, R.range(-12, 12), R.range(-22, -4), R.range(0.22, 0.5), 0, R.range(2, 4.4) * (1 - ut * 0.5), 0, R.chance(0.4) ? PF.SMOKES : 0);
          if (R.chance(0.12)) ps.spawn(P.EMBER, x, y, R.range(-20, 30), R.range(-40, -10), R.range(0.6, 1.3), C[5], 1);
        }
      }
      if (!burst && t >= HIT) {
        burst = true;
        lights.add(TX - 6, -22, 64, C[5], 0.95, 0.4);
        for (let i = 0; i < 18; i++) {
          const a = -0.9 + R.range(-1.2, 1.4), s = R.range(110, 330);
          ps.spawn(P.SPARK, TX - 14, -R.range(10, 36), Math.cos(a) * s, Math.sin(a) * s, R.range(0.18, 0.5));
        }
        for (let i = 0; i < 12; i++) ps.spawn(P.FIRE, TX + R.range(-18, 14), -R.range(2, 30), R.range(-20, 40), R.range(-70, -20), R.range(0.3, 0.6), 0, R.range(3, 6), 0, PF.SMOKES);
      }
      if (!burst2 && t >= SUN_T + 0.3) {
        burst2 = true;
        lights.add(SUN[0], SUN[1], 90, C[5], 0.8, 0.5);
        for (let i = 0; i < 30; i++) {
          const a = R.range(0, TAU), s = R.range(20, 90);
          ps.spawn(P.EMBER, SUN[0] + Math.cos(a) * 22, SUN[1] + Math.sin(a) * 22, Math.cos(a) * s, Math.sin(a) * s - 20, R.range(0.9, 1.4), C[6], 1.4);
        }
        for (let i = 0; i < 14; i++) ps.spawn(P.SPARK, SUN[0] + R.range(-20, 20), SUN[1] + R.range(-20, 20), R.range(-60, 60), R.range(-120, -20), R.range(0.4, 0.9));
      }
      // as it sets, a slow fall of embers
      if (t > 0.6 && t < 0.95 && R.chance(dt * 40)) ps.spawn(P.EMBER, SUN[0] + R.range(-26, 26), SUN[1] + R.range(-8, 20), R.range(-14, 14), R.range(5, 30), R.range(0.8, 1.2), C[5], 1);
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      sun(p, t);
      if (t < 0.9) p.glow(TX - 2, -4, 40, C[3], 0.2 * (1 - t / 0.9));
      ps.draw(p, "back");
    },
    draw(p) {
      crescent(p, t);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
