// Inspired by the telekinetic "unseen hand" of hunter anime. Generic motifs only: no characters, costumes or logos.
import { Particles, Bits, Lights, P, B, Rng, rng, rand, fit, clamp, smooth, ease, lerp, bolt, hex, WHITE, READY, TAU } from "../../../src/core/index.js";

export const meta = {
  name: "Ruler's grip",
  desc: "An open palm pushes ripples through the air; a giant hand of violet light closes round the target, lifting stones, then a clench crushes it and a sweep flings it.",
  tags: ["solo leveling", "anime", "move", "telekinesis", "hand", "grab", "crush", "violet", "one-shot"],
  size: [270, 152],
  origin: [44, 114],
  duration: 2.8,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#05040e", "#120e2a", "#221c52", "#3a3288", "#5a52c0", "#8c86f0", "#c8c4ff", "#ffffff"],
    sparks: ["#ffffff", "#c8c4ff", "#8c86f0", "#3a3288"],
    seed: 71,
  },
};

const TX = 132, TC = [TX, -24], PALM = [17, -28];
const PUSH = 0.05, FORM = 0.32, CLOSE = 1.15, CLENCH = 1.25, FLING = 1.75, END = 2.8;
const STONE = ["#141016", "#2a2228", "#463a3e", "#6a5a58", "#8e7c74"];

const REACH = { ...READY, turn: 0.1, crouch: 3, lean: 2, fx: PALM[0] - 2, fy: PALM[1], bx: -4, by: -21, ffx: 10, fbx: -9 };
const STRAIN = { ...REACH, crouch: 5, lean: 1, fx: PALM[0] - 3, fy: PALM[1] + 1 };
const FIST = { ...REACH, crouch: 6, lean: -2, fx: 10, fy: -27, bx: -5, by: -22 };
const SWEEP = { ...REACH, x: 3, crouch: 4, lean: 5, fx: 12, fy: -42, bx: -7, by: -19, ffx: 12, fbx: -9, ghost: 1 };
export const act = {
  ghost: "#8c86f0",
  target: { x: TX },
  poses: [
    [-0.35, { ...READY }],
    [-0.05, { ...REACH, fx: 6, fy: -26, crouch: 2 }],
    [PUSH + 0.05, REACH, "out"],
    [0.6, STRAIN],
    [0.75, { ...STRAIN, fy: PALM[1] }],
    [0.9, STRAIN],
    [CLOSE, { ...STRAIN, crouch: 6 }],
    [CLENCH, FIST, "snap"],
    [FLING - 0.12, { ...FIST, fx: 6, fy: -22, crouch: 7, lean: -3 }],
    [FLING, SWEEP, "snap"],
    [FLING + 0.4, { ...SWEEP, ghost: 0, crouch: 3 }],
    [END, { ...READY, x: 2 }],
  ],
  hits: [
    { t: FORM + 0.1, push: 0, straw: 0, shiver: 0.85, skin: "shadow" },
    { t: CLENCH, stop: 0.14, shake: 0.35, amp: 3, push: -1.6, straw: 22, flash: 0.06 },
    { t: FLING + 0.04, stop: 0.06, shake: 0.3, amp: 2, push: 6.5, straw: 30, flash: 0.04 },
    { t: END - 0.2, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: CLENCH, x: TX - 6, n: 10 }, { t: FLING + 0.04, x: TX + 6, n: 10, dir: 1 }],
};

// how closed the hand is (0 open .. 1 shut), and how big
const shut = (t) => ease.inOutQuad(clamp((t - FORM) / (CLOSE - FORM))) * 0.8 + 0.2 * ease.outBack(clamp((t - CLENCH + 0.03) / 0.08));
const handK = (t) => smooth(FORM - 0.05, FORM + 0.2, t) * (1 - smooth(FLING + 0.05, FLING + 0.4, t));
const scaleAt = (t) => lerp(1.25, 1, ease.outCubic(clamp((t - FORM) / 0.4))) - 0.22 * smooth(CLENCH - 0.04, CLENCH + 0.02, t);
// after the fling the hand is thrown with the target, up and away
const handShift = (t) => {
  const u = clamp((t - FLING) / 0.4);
  return [36 * ease.outCubic(u), -14 * ease.outCubic(u)];
};

// four fingers over the top and a thumb under, each [height offset, radius, how far it wraps when shut]
const FINGERS = [[-9, 25, 2.3], [-3, 27, 2.55], [3, 26, 2.45], [9, 23, 2.1]];

// the stones that lift while it squeezes
const STONES = Array.from({ length: 12 }, (_, i) => {
  const r = rng(71, i, 5);
  return { x: TX + r.range(-34, 34), top: r.range(8, 34), s: r.range(1.2, 2.6), t0: FORM + r.range(0.05, 0.5), ph: r.range(0, TAU), a: r.range(0, TAU) };
});

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks }), bits = new Bits({ ground: floor }), lights = new Lights();
  let t = 0, formed = false, crushed = false, flung = false;

  const stoneAt = (s) => {
    const u = ease.outCubic(clamp((t - s.t0) / 0.6)), shake = t > s.t0 ? Math.sin(t * 50 + s.ph) * 0.6 : 0;
    return [s.x + shake, -1 - s.top * u + Math.sin(t * 3 + s.ph) * 1.5 * u];
  };

  return {
    update(dt) {
      t += dt;
      if (!formed && t >= FORM) {
        formed = true;
        lights.add(TC[0], TC[1], 60, C[5], 0.7, 0.4);
      }
      // the squeeze grinds: violet sparks spit from the fingers
      if (t > FORM + 0.2 && t < CLENCH && R.chance(dt * 30)) {
        const a = R.range(-Math.PI, Math.PI), r = 22 * scaleAt(t);
        ps.spawn(P.SPARK, TC[0] + Math.cos(a) * r, TC[1] + Math.sin(a) * r * 0.9, Math.cos(a) * R.range(30, 90), Math.sin(a) * R.range(30, 90), R.range(0.15, 0.3));
      }
      if (!crushed && t >= CLENCH) {
        crushed = true;
        lights.add(TC[0], TC[1], 90, C[5], 1.1, 0.6);
        lights.add(TC[0], TC[1], 26, WHITE, 1, 0.12);
        for (const s of STONES) {
          const [x, y] = stoneAt(s), a = Math.atan2(y - TC[1], x - TC[0]), sp = R.range(50, 130);
          for (let k = 0; k < 2; k++) bits.add({ kind: B.CHUNK, x, y, vx: Math.cos(a) * sp + R.range(-30, 30), vy: Math.sin(a) * sp - 60, a: R.range(0, TAU), va: R.range(-16, 16), s: s.s * 0.7, ramp: STONE, g: 1, bounce: 0.3, life: R.range(0.8, 1.4) });
        }
        for (let i = 0; i < 26; i++) {
          const a = R.range(0, TAU), sp = R.range(110, 300);
          ps.spawn(P.SPARK, TC[0], TC[1], Math.cos(a) * sp, Math.sin(a) * sp * 0.8, R.range(0.2, 0.5));
        }
        for (let i = 0; i < 8; i++) ps.spawn(P.DUST, TX + R.range(-16, 16), -2, R.range(-60, 60), R.range(-30, -6), R.range(0.6, 1.1), "#4a4458", R.range(3, 6));
      }
      if (!flung && t >= FLING + 0.04) {
        flung = true;
        lights.add(TX + 10, TC[1], 70, C[5], 0.9, 0.4);
        for (let i = 0; i < 18; i++) ps.spawn(P.MOTE, TC[0] + R.range(-20, 20), TC[1] + R.range(-20, 20), R.range(60, 150), R.range(-110, -10), R.range(0.3, 0.55), R.chance(0.5) ? C[6] : C[5], R.range(0.6, 1.2));
        for (let i = 0; i < 8; i++) ps.spawn(P.DUST, TX + R.range(-4, 24), -2, R.range(40, 140), R.range(-30, -4), R.range(0.6, 1), "#4a4458", R.range(3, 6));
      }
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      ps.draw(p, "back");
      const k = handK(t), s = scaleAt(t), [sx, sy] = handShift(t);
      if (k <= 0) return;
      // the palm, behind the target: a broad faint shape on the caster's side
      p.glow(TC[0] - 16 * s + sx, TC[1] + sy, 26, C[4], 0.3 * k);
      // the far halves of the fingers' tips, round behind the target
      fingers(p, C, k, s, sx, sy, true);
      p.glow(TC[0] + sx, TC[1] + sy, 40, C[3], 0.25 * k);
    },
    draw(p) {
      // ---- ripples pushed through the air from the palm
      for (let i = 0; i < 3; i++) {
        const u = (t - PUSH - i * 0.09) / 0.38;
        if (u < 0 || u > 1) continue;
        const x = lerp(PALM[0] + 3, TC[0] - 18, ease.outQuad(u)), h = 6 + 18 * u, w = 2 + 4 * u;
        p.arc(x - w * 2, PALM[1] + (TC[1] - PALM[1]) * u, h, 1.2, -0.9, 0.9, (uu, v) => (v > 0.5 ? C[6] : C[4]), (1 - u) * 0.9);
        p.glow(x, PALM[1], h, C[4], 0.2 * (1 - u));
      }
      // the palm itself lit while it holds on
      const hold = smooth(PUSH, PUSH + 0.1, t) * (1 - smooth(CLENCH, CLENCH + 0.2, t));
      if (hold > 0) p.glow(PALM[0] + 1, PALM[1], 9, C[5], 0.5 * hold * (0.7 + 0.3 * Math.sin(t * 40)));
      // ---- the stones lifting off the floor round it
      if (t < CLENCH)
        for (const s of STONES) {
          if (t < s.t0) continue;
          const [x, y] = stoneAt(s), c = (i) => hex(STONE[i]), r = Math.round(s.s);
          p.rect(x - r / 2, y - r / 2, r, r, c(2));
          p.px(x - r / 2, y - r / 2, c(4));
          if (r > 1) p.px(x + r / 2 - 1, y + r / 2 - 1, c(1));
          p.light(x, y + 1, C[4], 0.25);
        }
      // ---- the floor cracks under the squeeze
      if (t > CLENCH && t < END - 0.4) {
        const k = 1 - smooth(CLENCH + 0.3, END - 0.4, t);
        for (let i = 0; i < 5; i++) {
          const r = rng(o.seed, 40, i), s = i % 2 ? 1 : -1, x0 = TX + r.range(-6, 6);
          p.polyline(bolt(r, x0, 0, x0 + s * r.range(16, 40), r.range(0, 2), { jag: 0.4, depth: 3 }), (u) => (u < 0.4 ? C[6] : C[4]), k);
        }
        p.glowLine(TX - 30, 0, TX + 30, 0, 8, C[4], 0.35 * k);
      }
      // ---- the near fingers and the thumb, over the target
      const k = handK(t), s = scaleAt(t), [sx, sy] = handShift(t);
      if (k > 0) fingers(p, C, k, s, sx, sy, false);
      // the clench: a white flash squeezed out between the fingers
      const c = t - CLENCH;
      if (c >= 0 && c < 0.12) {
        p.circle(TC[0], TC[1], 12 * (1 - c / 0.12) + 3, WHITE);
        p.ring(TC[0], TC[1], 14 + 60 * (c / 0.12), 1.4, C[6], 1 - c / 0.12);
      }
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };

  // the fingers: bands wrapped round the target like a fist round a post, from the palm on the caster's side across the
  // front (back = false) and round behind it (back = true), each lit along its top edge, knuckle creases across it
  function fingers(p, C, k, s, sx, sy, back) {
    const close = shut(t), ft = Math.floor(t * 20);
    for (let i = 0; i < FINGERS.length; i++) {
      const [dy, , wrap] = FINGERS[i], cy = TC[1] + dy * 1.75 * s + sy, rx = (15 + (i === 1 || i === 2 ? 1.5 : 0)) * s, ry = 3.2 * s;
      const reach = 0.5 + (wrap + 0.5) * close, W = (4.6 - (i === 3 ? 0.8 : 0)) * s;
      for (let a = Math.PI; a >= Math.PI - reach; a -= 0.04) {
        const front = Math.sin(a) >= -0.05;
        if (front === back) continue;
        const u = (Math.PI - a) / reach, x = TC[0] + sx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry, w = W * (1 - 0.35 * u * u), tip = u > 0.93;
        const crease = Math.abs(((Math.PI - a) % 1.05) - 0.62) < 0.04;
        for (let v = -w / 2; v <= w / 2; v += 0.5) {
          const e = v < -w / 2 + 0.9 ? 2 : v > w / 2 - 0.9 ? 1 : 0;
          const c = e === 2 ? (rand(Math.floor(a * 30), ft, i) < 0.07 ? WHITE : C[6]) : e === 1 ? C[4] : crease ? C[4] : C[2];
          p.dot(x, y + v, back ? (e ? C[4] : C[1]) : tip && e ? C[6] : c, (e || tip ? 1 : 0.5) * k * (back ? 0.7 : 1));
        }
        if (!back && (Math.round(a * 25) % 6 === 0)) p.light(x, y - w / 2, C[5], 0.3 * k);
      }
    }
    // the palm and the root of the thumb, on the caster's side, rising over the top
    if (!back) {
      const px = TC[0] - 16 * s + sx, py = TC[1] + sy;
      p.ellipse(px, py, 5 * s, 16 * s, (d) => (d > 0.8 ? C[5] : C[2]), (d) => (d > 0.8 ? 1 : 0.45) * k);
      const th = 0.6 + 0.9 * close;
      for (let a = 0; a < th; a += 0.05) {
        const x = px + Math.sin(a) * 12 * s, y = py - 14 * s - Math.sin(a * 1.4) * 4 * s + (1 - Math.cos(a)) * 10 * s;
        p.dot(x, y, C[6], k);
        p.dot(x, y + 1, C[3], 0.6 * k);
        p.dot(x, y + 2, C[4], k);
      }
    }
  }
}
