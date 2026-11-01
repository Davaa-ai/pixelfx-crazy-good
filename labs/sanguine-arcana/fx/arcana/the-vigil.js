import { fit, burst, fly, loopNoise, ease, seg, smooth, lerp, clamp, sparkle, rand, TAU, WHITE } from "../../../../src/core/index.js";
import { cardMeta, windowBack, cardFront, foilSheen, clipCard, tone, bayer, VIOLET } from "../../lib/shared.js";

export const meta = cardMeta({
  name: "IV · The Vigil",
  desc: "A violet candle burns for the dead beside two interlocked rings; a wind nearly kills it, and a pale spirit-flame leans in and lights it again. Motion rule: persistence.",
  tags: ["love after death", "candle", "mourning", "rings", "moth", "loop"],
  duration: 4,
  options: { violet: VIOLET },
});

const D = 4, FX = 0, WICK = -1, ALTAR = 26;       // flame x, the wick's y, the altar's top
const GX = 17, GY = -9;                            // the spirit-flame's foot

// the wind and the candle's answer to it: how hard it blows, how alive the flame is, how it leans
const gust = (t) => smooth(1.1, 1.4, t) * (1 - smooth(1.75, 2.15, t));
const life = (t) => 1 - 0.88 * smooth(1.2, 1.65, t) * (1 - smooth(1.92, 2.0, t)) + 0.55 * Math.exp(-(((t - 2.08) / 0.16) ** 2));

// a flame as a pixel shader: width swells above the wick and narrows to a tongue; heat falls off to the rim
function flame(p, x, y, H, W, lean, wob, ramp, a, soft = false) {
  const n = ramp.length - 1;
  p.shade(x - W - Math.abs(lean) - 3, y - H - 2, x + W + Math.abs(lean) + 3, y + 3, (px, py, out) => {
    const h = (y - py) / H;
    if (h < -0.1 || h > 1) return;
    const cx = x + lean * h * h + wob * Math.sin(h * 5 + 1) * h, hw = W * (h < 0 ? 0.8 + h * 3 : Math.pow(Math.sin(Math.PI * Math.pow(h, 0.62)), 0.85)) + 0.2;
    const d = Math.abs(px - cx) / hw;
    if (d > 1) return;
    const heat = 1 - d * 0.95 - h * 0.45, lv = 1.6 + heat * (n - 1.6);
    const c = heat > 0.82 ? ramp[n] : ramp[clamp(Math.floor(lv + bayer(px, py) * 0.9), 1, n)];
    // soft flames are truly translucent (a spirit), the rest are solid colour
    if (soft) p.blend(px, py, c, a * Math.min(1, (1 - d) * 2.2));
    else out.c = c;
  });
}

// a pale moth: a body, two wings that beat (flap -1..1 swings the tips from up to down)
function moth(p, x, y, flap, C) {
  const tipY = y - 3.2 * flap;
  p.px(x, y, C[7]); p.px(x, y + 1, C[5]);
  for (const s of [-1, 1]) {
    p.line(x + s, y, x + s * 4, tipY, C[6]);
    p.line(x + s, y + 1, x + s * 3, tipY + 1.5, C[4]);
    p.px(x + s * 2, (y + tipY) / 2 + 0.5, C[5]);
    p.px(x + s * 4, tipY, C[7]);
  }
  p.glow(x, y, 5, C[5], 0.3);
}

export function drawBack(p, t, o) {
  const B = fit(o.palette, 8), G = fit(o.gilt, 8), M = fit(o.moon, 8), V = fit(o.violet, 8), ph = TAU * (t / D);
  const L = life(t), glowK = 0.25 + 0.6 * clamp(L);
  windowBack(p, V, 0.5, 1.9, 1.25);
  // a pointed window behind, its mullions barely there, a cold wash through it
  const arch = (dy, c) => {
    for (let y = -46 + dy; y < 18; y++) {
      const top = y < -30 + dy, hw = top ? 19 * Math.sin(Math.acos(clamp(1 - (y - (-46 + dy)) / 14)) ) * 0.0 + (14 + 5 * Math.sqrt(clamp((y - (-46 + dy)) / 16))) : 19;
      p.px(-hw, y, c); p.px(hw - 1, y, c);
    }
  };
  arch(0, V[2]);
  p.line(0, -42, 0, 18, V[2]);
  for (const x of [-9, 9]) p.line(x, -36, x, 18, V[1]);
  p.ring(0, -30, 8, 1, V[2]);
  p.glow(0, -20, 32, M[3], 0.1);
  // the flame's light on the room
  p.glow(FX, -6, 44, V[4], 0.22 * glowK * 2);
  // the altar: a slab with a lit edge and a row of carved diamonds
  p.rect(-33, ALTAR, 66, 12, V[0]);
  p.line(-33, ALTAR, 32, ALTAR, V[3]);
  p.line(-33, ALTAR + 1, 32, ALTAR + 1, V[2]);
  for (let i = 0; i < 9; i++) { const x = -28 + i * 7; p.px(x, ALTAR + 6, V[2]); p.px(x - 1, ALTAR + 7, V[2]); p.px(x + 1, ALTAR + 7, V[2]); p.px(x, ALTAR + 8, V[2]); }
  p.glow(FX, ALTAR + 1, 28, V[5], 0.2 * glowK * 2);
}

export function draw(p, t, o) {
  const B = fit(o.palette, 8), G = fit(o.gilt, 8), M = fit(o.moon, 8), V = fit(o.violet, 8), ph = TAU * (t / D);
  const g = gust(t), L = life(t), seed = o.seed;
  const wob = 1.4 * loopNoise(t / D, 1.1, seed), wob2 = 1.1 * loopNoise(t / D, 0.9, seed + 4);

  // wax tears: heads slide down the candle, and a little heart of wax has pooled at its foot
  const CT = 0, CB = ALTAR;
  p.rect(-3, CT, 6, CB - CT, M[4]);
  p.rect(-3, CT, 1, CB - CT, V[6]);
  p.rect(-2, CT, 1, CB - CT, M[6]);
  p.rect(2, CT, 1, CB - CT, M[3]);
  p.rect(-3, CT, 6, 1, M[7]);
  p.ellipse(0, CT + 0.8, 3, 0.9, V[6]);
  for (let k = 0; k < 3; k++) {
    const u = ((t / D) * 1 + k / 3) % 1, x = -2 + k * 2, y = lerp(CT + 3, CB - 3, ease.inOutSine(u)), len = 3 + 3 * Math.sin(Math.PI * u);
    for (let d = 0; d < len; d++) p.px(x, y - d, d === 0 ? M[7] : M[6]);
    p.px(x, y + 1, M[7]);
  }
  p.ellipse(0, CB - 0.4, 6.2, 1.5, M[5]);
  p.ellipse(0, CB - 0.8, 4.5, 0.9, M[6]);

  // two rings, interlocked, with a rose stone that holds the light
  for (const [x, c0, c1] of [[-15.5, G[4], G[6]], [-10.5, G[5], G[7]]]) {
    p.ring(x, ALTAR - 4.8, 4.6, 1.6, (v, a) => (a < -0.6 && a > -2.4 ? c1 : v > 0.5 ? c0 : G[3]));
    p.glow(x, ALTAR - 5, 8, G[5], 0.14 + 0.16 * clamp(L));
  }
  p.ring(-15.5, ALTAR - 4.8, 4.6, 1.6, (v, a) => (a > 0.1 && a < 1.3 ? G[3] : 0));
  p.px(-13, ALTAR - 10.4, B[6]); p.px(-13, ALTAR - 9.6, B[4]);
  p.glow(-13, ALTAR - 10, 4, B[5], 0.3 + 0.3 * smooth(1.9, 2.3, t) * (1 - smooth(2.8, 3.4, t)));

  // the spirit-flame: a cold, half-seen flame that leans towards the candle, harder as the wind rises
  const reach = smooth(1.5, 1.95, t) * (1 - smooth(2.15, 2.7, t)), gl = -2 - 6 * reach, GH = 18 + 3 * reach;
  p.glow(GX, GY - 8, 26, M[4], 0.26 + 0.14 * reach);
  // she trails below like a veil: soft puffs sliding down and away
  for (let i = 0; i < 5; i++) p.disc(GX + 2 + i * 1.8 + Math.sin(ph + i * 1.1) * 1.5, GY + 2 + i * 4.4, 4.2 - i * 0.4, M[3], 0.28 - i * 0.04);
  flame(p, GX, GY, GH, 5.2, gl + wob2, wob2, M, 0.7, true);
  flame(p, GX, GY, GH * 0.6, 2.4, gl * 0.5 + wob2 * 0.5, wob2, M, 0.9, true);
  p.glow(GX - 1, GY - GH * 0.5, 7, M[7], 0.3);

  // the candle's flame: it leans to her, is pushed from her by the wind, shrinks to a bead, and returns
  const lean = 2.4 - 7.5 * g + 1.5 * reach, H = 13.5 * (0.2 + 0.8 * clamp(L)) * (L > 1 ? 1 + (L - 1) * 0.7 : 1), W = 4.2 * (0.55 + 0.45 * clamp(L));
  p.glow(FX, WICK - H * 0.45, 26 + 10 * clamp(L), V[5], 0.5 * clamp(L, 0.15, 1.4));
  p.glow(FX, WICK - H * 0.4, 12, V[6], 0.55 * clamp(L, 0.1, 1.5));
  flame(p, FX, WICK, H, W, lean, wob, V, 1);
  p.px(FX, WICK, V[7]); p.px(FX, WICK + 1, V[3]);

  // the wind: pale streaks racing across from the right
  if (g > 0.05) {
    for (let i = 0; i < 6; i++) {
      const r = rand(seed, i, 12), u = (((t - 1.1) / 0.9 + r) % 1 + 1) % 1, x = 33 - u * 70, y = -22 + i * 5.5 + r * 6, len = Math.min(6 + 8 * r, 32 - x);
      if (len <= 0) continue;
      p.line(x, y, x + len, y + 0.6 * Math.sin(u * 9 + i), M[5], g * Math.min(1, u * 6) * Math.min(1, (1 - u) * 4) * 0.8);
    }
  }
  // the spirit sends sparks of herself across, and the wick catches
  for (let i = 0; i < 9; i++) {
    const t0 = 1.78 + i * 0.045, u = (t - t0) / 0.32;
    if (u < 0 || u > 1) continue;
    const e = ease.inOutSine(u), x = lerp(GX - 4, FX + 1, e), y = lerp(GY - GH * 0.5, WICK - 2, e) - Math.sin(u * Math.PI) * (6 + (i % 3) * 2);
    p.dot(x, y, u < 0.8 ? M[7] : V[7], 1);
    p.glow(x, y, 4, V[6], 0.35);
  }
  const pop = Math.exp(-(((t - 2.08) / 0.1) ** 2));
  if (pop > 0.1) {
    sparkle(p, FX, WICK - 3, Math.round(2 + 5 * pop), WHITE, V[6], 0.45 * pop);
    p.glow(FX, WICK - 4, 26, V[6], 0.3 * pop);
  }
  burst(10, seed + 9, (r) => {
    const tau = t - 2.08;
    if (tau < 0 || tau > 0.7) return;
    const a = -Math.PI / 2 + r.range(-1.2, 1.2), sp = r.range(30, 90), [x, y] = fly(FX, WICK - 3, Math.cos(a) * sp, Math.sin(a) * sp, tau, 90, 2.2), k = 1 - tau / 0.7;
    p.line(x - Math.cos(a), y - Math.sin(a), x, y, k > 0.5 ? V[7] : V[5]);
    p.glow(x, y, 3, V[5], 0.3 * k);
  });

  // moths that circle the light: one close and quick, one wide and slow
  for (const [m, rx, ry, a0, cy2, face] of [[1, 9, 6, 0.3, -12, 1], [2, 14, 8, 2.6, -18, -1], [1, 12, 5, 4.5, -4, 1]]) {
    const a = ph * m + a0, flap = Math.sin(TAU * 32 * (t / D) + a0 * 7), x = FX + 1 + Math.cos(a) * rx, y = cy2 + Math.sin(a * 2) * ry * 0.7;
    moth(p, x, y, flap, M);
  }

  // drifting ash and cold motes
  for (let i = 0; i < 14; i++) {
    const r = rand(seed, i, 3), u = ((t / D) * (1 + (i % 2)) + r) % 1, x = -30 + rand(seed, i, 4) * 60 + Math.sin(u * TAU + i) * 3, y = 24 - u * 70;
    p.dot(x, y, i % 3 ? V[5] : M[5], Math.sin(u * Math.PI) * 0.8);
  }

  cardFront(p, o, { title: "THE VIGIL", sub: "AFTER DEATH", numeral: "IV" });
  foilSheen(p, o, t, D);
  clipCard(p);
}
