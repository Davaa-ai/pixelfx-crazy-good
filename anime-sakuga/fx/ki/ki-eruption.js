// Rising Ki Eruption: seamless 2.4s pure loop of a classic shonen power-up aura.
// A jagged two-tier flame curtain roars upward around the fighter with a blazing white inner core,
// rhythmic ground shock-rings, electric sparks, and crater stone cubes levitating off the floor.

import { fit, cycle, fract, loopNoise, clamp, smooth, ease, band, TAU, WHITE, READY } from "../../../src/core/index.js";
import { SAKUGA_PAL } from "../categories.js";
import { actorOutline, drawYutaponCube, tone } from "../_lib.js";

const D = 2.4;
const STONE = ["#120e0a", "#292018", "#473829", "#6b543e", "#947658", "#bda07e", "#e0ccb2", "#faf2e6"];

export const meta = {
  name: "Rising ki eruption",
  desc: "A roaring two-tier flame aura surges upward around a charging fighter as shockwaves pulse underfoot and fractured stones levitate into the air.",
  tags: ["ki", "aura", "power-up", "saiyan", "flame", "levitate", "anime", "loop"],
  size: [156, 128],
  origin: [78, 100],
  duration: D,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: SAKUGA_PAL.superKi, seed: 2 },
};

const CHARGE_A = { ...READY, crouch: 5, lean: -2, turn: 0.9, fx: -10, fy: -20, bx: 11, by: -20, ffx: 8, fbx: -8 };
const CHARGE_B = { ...CHARGE_A, crouch: 7, lean: -3, fx: -11, fy: -19, bx: 12, by: -19 };

export const act = {
  onBody: true,
  poses: [
    [-0.45, { ...READY }],
    [-0.15, { ...CHARGE_A, crouch: 8 }],
    [0, CHARGE_A, "snap"],
    [0.6, CHARGE_B],
    [1.2, CHARGE_A],
    [1.8, CHARGE_B],
    [D, CHARGE_A],
  ],
  hits: [
    { t: 0.05, shake: 0.16, amp: 1 },
    { t: 1.25, shake: 0.16, amp: 1 },
  ],
};

/** Evaluate the jagged anime flame-curtain envelope: > 0 means inside the aura, > 0.48 inside the hot inner layer. */
function kiField(x, y, ph, seed) {
  // Base sits on y = 2, crown tapers to a sharp point around y = -66
  const h = 68;
  const u = clamp((2 - y) / h, 0, 1); // 0 at feet, 1 at tip
  if (y > 3 || y < -70) return 0;
  // Width swells around chest height, narrows to jagged spikes at top
  const halfW = (18 * Math.sin(Math.pow(u, 0.55) * Math.PI * 0.92) + 5 * (1 - u)) * (1 + 0.07 * Math.sin(ph * TAU * 4));
  if (Math.abs(x) > halfW + 7) return 0;

  // Fast upward-scrolling seamless harmonic waves creating spiky shonen flame tongues!
  const ang = Math.atan2(y + 18, x);
  const tongue1 = Math.sin(Math.abs(x) * 0.42 + u * 9.5 - ph * TAU * 6);
  const tongue2 = loopNoise(fract(ph * 3 - u * 1.4 + ang * 0.15), 5, seed + 7);
  const jag = (tongue1 * 0.55 + tongue2 * 0.75) * (1.8 + 4.8 * u);
  const effW = Math.max(0.5, halfW + jag);
  return 1 - Math.abs(x) / effW;
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), S = fit(STONE, 8), ph = (t / D) % 1, seed = o.seed;

  // Soft ambient golden pool behind the body and on the stone floor
  p.glow(0, -24, 42, C[4], 0.36 + 0.08 * Math.sin(ph * TAU * 4));
  p.glow(0, 0, 34, C[5], 0.25);

  // Far half of rhythmic ground shock-rings (2 pulses per 2.4s loop)
  for (let k = 0; k < 2; k++) {
    const q = fract(ph * 2 + k * 0.5);
    const r = 10 + 42 * ease.outCubic(q);
    band(p, 0, 0, r, 0.18, 2.2 * (1 - q), (1 - q) * 0.78, C, (g) => Math.sin(g) < 0, q < 0.2);
  }

  // Main jagged flame curtain rendered behind the character!
  p.shade(-28, -70, 28, 3, (x, y, out) => {
    const f = kiField(x, y, ph, seed);
    if (f <= 0) return;
    if (f < 0.13) {
      out.c = C[6]; // Crisp bright anime outer silhouette line!
      out.a = 0.92;
    } else if (f > 0.56) {
      out.c = WHITE;
      out.a = 0.95;
      out.l = C[6];
      out.k = 0.14;
    } else {
      out.c = tone(C, 3.4 + f * 3.6, x, y);
      out.a = 0.84;
    }
  });

  // Back-layer levitating crater pebbles
  cycle(t, D, 14, seed * 5 + 1, 1.15, (age, life, r) => {
    const idx = Math.floor(r.next() * 100);
    const side = r.sign(), rx = side * r.range(16, 46);
    if (idx % 2 === 0) return;
    const q = age / life;
    const ry = -1 - ease.inQuad(q) * r.range(34, 58);
    const fade = q < 0.15 ? q / 0.15 : 1 - smooth(0.72, 1, q);
    drawYutaponCube(p, rx, ry, r.range(1.8, 3.0), q * 5 * side, q * 4, S, fade, C[5]);
  });
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = fit(STONE, 8), ph = (t / D) % 1, seed = o.seed;

  // 1. Crisp flickering Ki rim hugging the character's posed silhouette (onBody maps standing coords!)
  if (o.actor) {
    const { rim } = actorOutline(o.actor);
    const ax = o.actor.x, ay = o.actor.y;
    const pulse = 0.75 + 0.25 * Math.sin(ph * TAU * 8);
    for (let i = 0; i < rim.length; i++) {
      const [rx, ry] = rim[i];
      if (((rx + ry + Math.floor(ph * 24)) & 3) === 0) continue;
      p.dot(ax + rx, ay + ry, ry < 14 ? WHITE : C[6], pulse);
    }
  }

  // 2. Front licking flame tongues rising around the boots and waist
  p.shade(-24, -22, 24, 3, (x, y, out) => {
    const u = (3 - y) / 25;
    const w = 18 * (1 - u * 0.35);
    if (Math.abs(x) > w) return;
    const wave = Math.sin(x * 0.55 - ph * TAU * 6) * 0.5 + 0.5;
    if (u > 0.35 + wave * 0.55) return;
    out.c = u < 0.22 ? WHITE : C[5];
    out.a = (1 - u) * 0.85;
  });

  // 3. Upward streaming Ki sparks & electric bio-sparks
  cycle(t, D, 28, seed * 7 + 3, 0.45, (age, life, r) => {
    const q = age / life;
    const x = r.range(-20, 20) * (1 - q * 0.35);
    const y = -2 - q * r.range(42, 68);
    const len = 3 + 3 * (1 - q);
    p.line(x, y + len, x, y, q < 0.4 ? WHITE : C[6], 1 - q);
    p.light(x, y, C[5], 0.35 * (1 - q));
  });

  // 4. Front-layer levitating crater stones rising slowly in anti-gravity!
  cycle(t, D, 14, seed * 5 + 1, 1.15, (age, life, r) => {
    const idx = Math.floor(r.next() * 100);
    const side = r.sign(), rx = side * r.range(16, 46);
    if (idx % 2 !== 0) return;
    const q = age / life;
    const ry = -1 - ease.inQuad(q) * r.range(34, 58);
    const fade = q < 0.15 ? q / 0.15 : 1 - smooth(0.72, 1, q);
    drawYutaponCube(p, rx, ry, r.range(2.0, 3.4), q * 5 * side, q * 4, S, fade, C[5]);
  });

  // 5. Near half of rhythmic ground shock-rings
  for (let k = 0; k < 2; k++) {
    const q = fract(ph * 2 + k * 0.5);
    const r = 10 + 42 * ease.outCubic(q);
    band(p, 0, 0, r, 0.18, 2.2 * (1 - q), (1 - q) * 0.9, C, (g) => Math.sin(g) >= 0, q < 0.2);
  }
}
