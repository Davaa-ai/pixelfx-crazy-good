// Stone Colossus: the seal cracks the floor open with amber light, spikes of rock burst up round it, and a mossy boulder giant
// heaves itself out of the ground while the camera pulls all the way out to fit it. It wakes, roars dust, and sinks back.

import { fit, Particles, P, Lights, Rng, rand, crystal, sparkle } from "../../../../src/core/index.js";
import { summonMeta, summonAct, summonCamera, flat, sealCircle, runeTrail, clipBelow, ball, slab, seam, eyes, hex, mix, smooth, seg, clamp, lerp, ease, WHITE, TAU } from "../../lib/summon.js";

/** Amber earth-magic, dark to bright. */
const AMBER = ["#1a0a04", "#4a1f08", "#8a3a0c", "#c9600f", "#f0921e", "#ffc04a", "#ffe9a8", "#fffbe8"];
const ROCK = ["#110f13", "#221e23", "#383236", "#524a4a", "#6f655f", "#91857a", "#b8ab98"].map(hex);
const MOSS = ["#0e180b", "#21361a", "#385724", "#567d33", "#7fa646"].map(hex);

export const meta = summonMeta({
  name: "Stone Colossus",
  desc: "The seal cracks the floor open with amber light and spikes of rock burst up round it. A mossy boulder giant heaves itself out of the ground, the camera pulling all the way out to fit it; its furnace eyes light, it roars a ring of dust, and later sinks back into the earth.",
  tags: ["earth", "rock", "golem", "giant", "huge"],
  duration: 7.2,
  options: { palette: AMBER, seed: 11 },
});

const SX = 200, H = 168;
const QUAKE = 0.72, RISE0 = 1.0, RISE1 = 2.7, WAKE = 2.85, SINK0 = 4.9, SINK1 = 6.0;

export const act = summonAct({
  rise: 0.85, hold: 5.6, recoil: RISE1,
  hits: [
    { t: QUAKE, shake: 0.35, amp: 1 },
    { t: RISE0 + 0.1, shake: 0.5, amp: 2 },
    { t: RISE0 + 0.7, shake: 0.5, amp: 2 },
    { t: RISE1, stop: 0.08, shake: 0.4, amp: 4 },
    { t: WAKE + 0.15, shake: 0.5, amp: 2 },
    { t: SINK0 + 0.2, shake: 0.9, amp: 2 },
  ],
});
export const camera = summonCamera({ SX, top: 134, hw: 78, pullAt: RISE0, pull: 0.6, backAt: SINK1 - 0.1 });

// how far out of the ground he is: 0 buried, 1 standing
const risen = (t) => (t < RISE0 ? 0 : t < RISE1 ? ease.inOutSine(seg(t, RISE0, RISE1)) : t < SINK0 ? 1 : 1 - ease.inQuad(seg(t, SINK0, SINK1)));

// cracks in the rock, fixed to each boulder, so they rise with him
function chips(p, cx, cy, rx, ry, seed) {
  for (let i = 0; i < 3; i++) {
    const a = rand(seed, i) * TAU, r0 = rand(seed, i, 1) * 0.5, l = 0.3 + rand(seed, i, 2) * 0.4;
    const x0 = cx + Math.cos(a) * rx * r0, y0 = cy + Math.sin(a) * ry * r0, b = a + (rand(seed, i, 3) - 0.5) * 1.6;
    const x1 = x0 + Math.cos(b) * rx * l, y1 = y0 + Math.sin(b) * ry * l;
    seam(p, x0, y0, x1, y1, ROCK[1]);
    seam(p, x0 - 1, y0 - 1, x1 - 1, y1 - 1, ROCK[5], 0.6);
  }
}
// moss on the tops of things
function moss(p, cx, cy, rx, ry, k = 0.45) {
  p.shade(cx - rx, cy - ry, cx + rx, cy, (x, y) => {
    const nx = (x - cx) / rx, ny = (y - cy) / ry;
    if (nx * nx + ny * ny > 0.92 || y >= 1) return;
    const n = rand(Math.floor(x - cx), Math.floor(y - cy), 5);
    if (ny < -k + n * 0.35 && ny < -0.15) p.px(x, y, MOSS[Math.min(4, Math.floor(1 + (-ny) * 3 + n))]);
  });
}

function colossus(p, C, gx, gy, t, wake) {
  const br = Math.round(Math.sin(t * 2.2) * 1.2 * smooth(RISE1, RISE1 + 0.4, t)), y = (v) => gy + v - (v < -36 ? br : 0);
  const runeK = 0.55 + 0.45 * Math.sin(t * 3) * wake + 0.4 * wake;
  // legs and feet
  for (const s of [-1, 1]) {
    ball(p, gx + s * 19, y(-20), 13, 20, ROCK, { lift: -0.4 });
    ball(p, gx + s * 22, y(-5), 17, 6, ROCK, { lift: -0.2 });
  }
  ball(p, gx, y(-42), 27, 13, ROCK, { lift: -0.3 });
  // the arms hang to the floor: upper arm, forearm, a fist like a boulder resting on its knuckles
  for (const s of [-1, 1]) {
    ball(p, gx + s * 53, y(-80), 14, 21, ROCK, { lift: -0.2 });
    ball(p, gx + s * 58, y(-48), 15, 18, ROCK);
    chips(p, gx + s * 58, y(-48), 15, 18, 30 + s);
    ball(p, gx + s * 60, y(-16), 19, 16, ROCK, { lift: 0.2 });
    chips(p, gx + s * 60, y(-16), 19, 16, 40 + s);
    for (let k = -1; k <= 1; k++) seam(p, gx + s * 60 + k * 6, y(-6), gx + s * 60 + k * 6 + s, y(-1), ROCK[1]);
  }
  // the torso: one great boulder, cracked through with amber runes round a core
  ball(p, gx, y(-80), 41, 35, ROCK, { lift: 0.1 });
  chips(p, gx, y(-80), 41, 35, 7);
  const cy = y(-82), rune = AMBER.map(hex);
  const cracks = [[0, -14, 0, -6], [0, 6, -3, 14], [-3, 14, 2, 24], [-6, 0, -18, -6], [-18, -6, -26, 2], [6, 0, 17, 5], [17, 5, 24, -3], [17, 5, 20, 15]];
  for (const [x0, y0, x1, y1] of cracks) {
    seam(p, gx + x0, cy + y0, gx + x1, cy + y1, runeK > 0.8 ? rune[6] : rune[5]);
    seam(p, gx + x0 + 1, cy + y0, gx + x1 + 1, cy + y1, rune[3]);
    if (cy < 1) p.glowLine(gx + x0, cy + y0, gx + x1, cy + y1, 6, rune[4], 0.35 * runeK);
  }
  p.ring(gx, cy, 6, 2, (v) => (v > 0.5 ? rune[6] : rune[4]));
  p.circle(gx, cy, 2.5, runeK > 0.9 ? WHITE : rune[6]);
  if (cy < 1) p.glow(gx, cy, 20, rune[4], 0.4 * runeK);
  // shoulders, mossed, with amber crystal growing out of them
  for (const s of [-1, 1]) {
    ball(p, gx + s * 41, y(-104), 21, 17, ROCK, { lift: 0.3 });
    chips(p, gx + s * 41, y(-104), 21, 17, 50 + s);
    moss(p, gx + s * 41, y(-104), 21, 17);
  }
  if (y(-112) < 1) {
    crystal(p, gx - 48, y(-114), 16, 6, -4, AMBER.slice(1), { glint: (t * 0.4) % 1 });
    crystal(p, gx - 40, y(-116), 10, 5, -1, AMBER.slice(1));
    crystal(p, gx + 47, y(-113), 13, 5, 3, AMBER.slice(1));
  }
  // the head, sunk between the shoulders, a heavy brow over furnace eyes
  ball(p, gx, y(-122), 15, 12, ROCK, { lift: 0.2 });
  moss(p, gx, y(-122), 15, 12, 0.55);
  slab(p, [[gx - 13, y(-125)], [gx + 13, y(-125)], [gx + 10, y(-120)], [gx - 10, y(-120)]], ROCK, 1.2);
  eyes(p, gx, y(-118), 5, rune[5], rune[7], wake);
  if (wake > 0.5) seam(p, gx - 3, y(-112), gx + 3, y(-112), rune[4], wake);
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] });
  const soft = new Particles({ rng: R, ground: () => 0 });
  const lights = new Lights();
  const DUST = mix(ROCK[4], C[5], 0.15);
  // cracks: jagged lines out across the floor from the seal, in perspective
  const cracks = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * TAU + R.range(-0.2, 0.2), pts = [[SX, 0]];
    let x = SX, y = 0;
    for (let j = 0; j < 7; j++) {
      const L = R.range(6, 13), b = a + R.range(-0.5, 0.5);
      x += Math.cos(b) * L; y += Math.sin(b) * L * 0.22;
      pts.push([x, y]);
    }
    return { pts, d: R.range(0, 0.15) };
  });
  // spikes of rock that burst up round the seal and crumble
  const spikes = Array.from({ length: 11 }, (_, i) => ({ x: SX + Math.cos((i / 11) * TAU + 0.3) * R.range(70, 92), z: Math.sin((i / 11) * TAU + 0.3), h: R.range(16, 34), w: R.range(8, 13), lean: R.range(-5, 5), d: R.range(0, 0.25) }));
  let t = 0, woke = false, landed = false, quaked = false;

  return {
    update(dt) {
      t += dt;
      const u = risen(t);
      if (t >= QUAKE && !quaked) {
        quaked = true;
        lights.add(SX, -4, 90, C[4], 1, 0.4);
        for (const s of spikes) for (let i = 0; i < 3; i++) ps.spawn(P.GRIT, s.x, -2, R.range(-50, 50), -R.range(90, 220), R.range(0.6, 1.1), ROCK[R.int(2, 5)], R.chance(0.4) ? 2 : 1, s.d);
      }
      // while he heaves out of the ground: rubble thrown off his edges, dust rolling out
      const moving = (t > RISE0 && t < RISE1) || (t > SINK0 && t < SINK1 - 0.5);
      if (moving) {
        if (R.chance(dt * 40)) ps.spawn(P.GRIT, SX + R.range(-70, 70), -2, R.range(-60, 60), -R.range(80, 240), R.range(0.6, 1.2), ROCK[R.int(1, 6)], R.chance(0.5) ? 2 : 1);
        if (R.chance(dt * 26)) {
          const s = R.sign();
          soft.spawn(P.DUST, SX + s * R.range(30, 80), -R.range(2, 8), s * R.range(30, 90), -R.range(6, 26), R.range(0.9, 1.6), DUST, R.range(6, 12));
        }
        // and stones falling off him as he comes up
        if (u > 0.2 && R.chance(dt * 6)) ps.spawn(P.GRIT, SX + R.range(-50, 50), -170 * u + R.range(20, 90), R.range(-20, 20), 0, 1.2, ROCK[R.int(2, 5)], 2);
      }
      if (t >= RISE1 && !landed) {
        landed = true;
        for (let i = 0; i < 36; i++) {
          const s = R.sign();
          soft.spawn(P.DUST, SX + s * R.range(20, 70), -R.range(1, 6), s * R.range(60, 200), -R.range(4, 30), R.range(1, 1.8), DUST, R.range(6, 13));
        }
      }
      // the wake: eyes ignite, and the roar blows a ring of dust and pebbles off the floor
      if (t >= WAKE && !woke) {
        woke = true;
        lights.add(SX, -118, 60, C[5], 1.4, 0.5);
        for (let i = 0; i < 28; i++) {
          const s = R.sign();
          ps.spawn(P.GRIT, SX + s * R.range(70, 110), -1, s * R.range(30, 120), -R.range(60, 160), R.range(0.6, 1.1), ROCK[R.int(2, 6)], 1);
        }
        for (let i = 0; i < 20; i++) ps.spawn(P.EMBER, SX + R.range(-30, 30), -80 + R.range(-30, 20), R.range(-30, 30), -R.range(10, 40), R.range(0.8, 1.6), C[5], 1);
      }
      if (t > WAKE && t < SINK0 && R.chance(dt * 3)) ps.spawn(P.GRIT, SX + R.range(-45, 45), -R.range(80, 130), R.range(-8, 8), 0, 1.2, ROCK[R.int(2, 5)], 1);
      ps.update(dt);
      soft.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const sealK = 1 - smooth(SINK1 - 0.4, SINK1 + 0.3, t);
      runeTrail(p, 16, SX - 92, seg(t, 0.02, 0.4), 1 - smooth(1.2, 1.8, t), C);
      sealCircle(p, SX, 92, ease.outCubic(seg(t, 0.12, 0.72)), sealK, C, t, "back");
      // the cracks: amber light pouring out of the floor, cooling to dark seams, gone at the end
      const crK = seg(t, QUAKE, QUAKE + 0.45), crFade = 1 - smooth(SINK1 - 0.3, SINK1 + 0.5, t);
      if (crK > 0 && crFade > 0)
        for (const c of cracks) {
          const n = (c.pts.length - 1) * clamp((crK - c.d) / (1 - c.d));
          for (let i = 0; i < Math.floor(n); i++) {
            const [x0, y0] = c.pts[i], [x1, y1] = c.pts[i + 1], hot = 1 - 0.7 * smooth(QUAKE + 0.5, RISE1 + 0.5, t);
            p.line(x0, y0 + 1, x1, y1 + 1, hot > 0.6 ? C[6] : C[4], crFade);
            p.line(x0, y0 + 2, x1, y1 + 2, C[2], crFade);
            p.glowLine(x0, y0, x1, y1, 6, C[4], 0.4 * hot * crFade);
          }
        }
    },
    draw(p) {
      const u = risen(t), wake = smooth(WAKE, WAKE + 0.2, t) * (1 - smooth(SINK0, SINK0 + 0.4, t));
      // the far spikes, then him, then the near spikes
      const spike = (s) => {
        const k = seg(t, QUAKE + s.d, QUAKE + s.d + 0.12) * (1 - smooth(RISE1 + 0.3 + s.d, RISE1 + 0.9 + s.d, t));
        if (k > 0.02) crystal(p, s.x, Math.round(s.z * 6) + 1, s.h * k, s.w, s.lean, ROCK);
      };
      for (const s of spikes) if (s.z < 0) spike(s);
      if (u > 0) {
        clipBelow(1);
        colossus(p, C, SX, Math.round((1 - u) * H), t, wake);
        clipBelow(Infinity);
      }
      for (const s of spikes) if (s.z >= 0) spike(s);
      soft.draw(p);
      sealCircle(p, SX, 92, ease.outCubic(seg(t, 0.12, 0.72)), 1 - smooth(SINK1 - 0.4, SINK1 + 0.3, t), C, t, "front");
      // the roar: a dust ring blown out along the floor
      const v = seg(t, WAKE + 0.1, WAKE + 0.8);
      if (v > 0 && v < 1) {
        const rr = 30 + 140 * ease.outCubic(v);
        for (let a = 0; a < 140; a++) {
          const ang = (a / 140) * TAU, x = SX + Math.cos(ang) * rr, y = Math.sin(ang) * rr * flat(rr);
          p.dot(x, y, a % 2 ? ROCK[5] : ROCK[4], (1 - v) * 0.9);
        }
      }
      if (t > WAKE && t < WAKE + 0.12) sparkle(p, SX, -118, 10, WHITE, C[6], 0.8);
      ps.draw(p);
      lights.draw(p);
    },
  };
}
