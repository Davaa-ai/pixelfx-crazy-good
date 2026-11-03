// Wedding Chalice: an ornate tarnished-gold gothic goblet overflowing with crimson wine; twin ribbons of blood
// and gold spiral upward in a seamless double-helix to feed a hovering, beating sacred heart haloed in thorns.

import { cycle, fit, sparkle, band, loopNoise, clamp, lerp, TAU, WHITE } from "../../../src/core/index.js";
import { VELVET, GILDED, drawGothicHeart, drawPetal } from "../_lib.js";

export const meta = {
  name: "Wedding chalice",
  desc: "An ornate golden chalice overflows with crimson wine; twin ribbons spiral up into a beating gothic heart crowned with orbiting golden thorns.",
  tags: ["vows", "chalice", "grail", "heart", "blood", "gold", "shrine", "loop"],
  size: [108, 124],
  origin: [54, 108],
  duration: 3.0,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: VELVET,
    gold: GILDED,
    seed: 9,
  },
};

const D = meta.duration, HY = -74;

// double-beat lub-dub twice per 3.0s loop (period = 1.5s)
function heartbeat(t) {
  const ph = ((t % 1.5) + 1.5) % 1.5;
  return Math.exp(-(((ph - 0.08) / 0.08) ** 2)) + 0.62 * Math.exp(-(((ph - 0.32) / 0.09) ** 2));
}

// sculpted pixel-art gothic goblet standing on (0, 0), height 34 px
function drawGoblet(p, G, C, ph) {
  // chalice profile: [y, halfWidth]
  for (let y = 0; y >= -34; y--) {
    let hw;
    if (y >= -2) hw = 10 - (-y) * 1.2;            // wide stepped foot
    else if (y >= -5) hw = 6.5 - (-y - 2) * 1.1;  // tapered base
    else if (y >= -11) hw = 2.0;                  // lower stem
    else if (y >= -15) hw = 3.6 - Math.abs(y + 13) * 0.6; // jeweled knop
    else if (y >= -20) hw = 2.0;                  // upper stem
    else {
      // fluted gothic bowl widening to the lip
      const u = (-y - 20) / 14;
      hw = 2.4 + Math.pow(u, 0.72) * 9.6 + (y === -34 ? 0.8 : 0);
    }
    const X = Math.round(hw);
    for (let x = -X - 1; x <= X + 1; x++) {
      if (Math.abs(x) > X) {
        p.px(x, y, G[0]);
        continue;
      }
      // ruby gem set in the center of the knop
      if (y >= -14 && y <= -12 && Math.abs(x) <= 1) {
        p.px(x, y, x < 0 && y === -14 ? WHITE : C[5]);
        continue;
      }
      const q = (x + X) / Math.max(1, 2 * X); // 0 left .. 1 right
      let gi = q < 0.16 ? 5 : q < 0.34 ? 6 : q < 0.5 ? 4 : q < 0.75 ? 3 : 2;
      if (y === -34 || y === -1) gi = Math.min(7, gi + 1);
      // vertical fluting ribs on the bowl
      if (y <= -23 && y >= -32 && Math.abs(x) % 3 === 1 && gi > 2) gi -= 1;
      p.px(x, y, G[gi]);
    }
  }
  // gothic prongs rising at the rim corners
  for (const sx of [-11, -5, 0, 5, 11]) {
    p.px(sx, -35, sx <= 0 ? G[6] : G[4]);
    if (Math.abs(sx) === 11) p.px(sx, -36, G[5]);
  }
  // brimming dark-crimson wine meniscus with gently shifting highlight + velvet wine cascade on left lip
  const slosh = Math.sin(ph * TAU) * 1.5;
  for (let x = -10; x <= 10; x++) {
    const c = Math.abs(x - slosh - 3) < 2.2 ? C[7] : x < 0 ? C[5] : C[4];
    p.px(x, -34, c);
    if (Math.abs(x) < 9) p.px(x, -35, Math.abs(x - slosh + 4) < 2 ? C[6] : C[3]);
  }
  // slow crimson wine rivulet clinging to left side of goblet bowl
  for (let dy = 0; dy < 7; dy++) {
    p.px(-10 + Math.floor(dy * 0.35), -33 + dy, dy < 2 ? C[6] : C[4]);
  }
  // two tiny votive altar candles flanking the chalice base
  for (const cx of [-19, 19]) {
    const h = cx < 0 ? 5 : 4;
    for (let y = 0; y > -h; y--) {
      p.px(cx - 1, y, G[5]);
      p.px(cx, y, G[3]);
      p.px(cx + 1, y, G[1]);
    }
    const sway = Math.round(Math.sin(ph * TAU * 2 + cx) * 0.7);
    p.px(cx + sway, -h - 1, C[5]);
    p.px(cx + sway, -h - 2, G[6]);
    p.px(cx, -h, WHITE);
    p.glow(cx, -h - 1, 9, G[5], 0.32 + 0.08 * Math.sin(ph * TAU * 3 + cx));
  }
}

function helixPass(p, t, C, G, front) {
  const ph = (t / D) * TAU;
  for (let strand = 0; strand < 2; strand++) {
    const R = strand === 0 ? C : G;
    for (let y = -36; y >= HY + 6; y--) {
      const u = (-y - 36) / (-HY - 42); // 0 at rim .. 1 under heart
      const env = Math.sin(clamp(u) * Math.PI) * 11 + 1.8 * (1 - u);
      const ang = u * TAU * 1.65 - ph * 2 + strand * Math.PI;
      const z = Math.sin(ang);
      if ((z >= 0) !== front) continue;
      const x = Math.cos(ang) * env + loopNoise((t / D + u * 0.5) % 1, 0.8, 17 + strand) * 1.4;
      const w = z > 0.5 ? 1.5 : 1;
      const col = z > 0.6 ? R[6] : z > 0 ? R[5] : R[3];
      p.dot(x, y, col, 0.92);
      if (w > 1) p.dot(x + 1, y, R[4], 0.75);
      if ((-y) % 6 === 0 && front) p.glow(x, y, 6, R[4], 0.18);
    }
  }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), G = fit(o.gold, 8), ph = (t % D) / D, hb = heartbeat(t);
  // warm pool of crimson-gold light on the altar stone
  p.glow(0, -4, 32, C[3], 0.24 + 0.08 * hb);
  p.glow(0, HY, 34 + 8 * hb, C[4], 0.22 + 0.22 * hb);

  // wine stain & concentric ripples on the floor where chalice drips land
  cycle(t, D, 3, o.seed + 31, 1.4, (age, life) => {
    const u = age / life;
    if (u < 0.42) return; // still falling
    const ru = (u - 0.42) / 0.58;
    band(p, -8, 0, 2 + 14 * ru, 0.2, 1.2, (1 - ru) * 0.9, [C[1], C[3], C[5], C[6]], (g) => Math.sin(g) < 0);
  });

  helixPass(p, t, C, G, false);

  // far half of the thorny golden crown orbiting the heart
  const crownY = HY - 2;
  band(p, 0, crownY, 15, 0.26, 1.5, 0.85, [G[1], G[3], G[5], G[6]], (g) => Math.sin(g) < 0);
  for (let i = 0; i < 6; i++) {
    const a = ph * TAU + (i * TAU) / 6;
    if (Math.sin(a) >= 0) continue;
    const x = Math.cos(a) * 15.5, y = crownY + Math.sin(a) * 15.5 * 0.26;
    p.px(x, y - 1, G[4]);
    p.px(x, y, G[2]);
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), G = fit(o.gold, 8), ph = (t % D) / D, hb = heartbeat(t);

  // floor ripple front halves
  cycle(t, D, 3, o.seed + 31, 1.4, (age, life) => {
    const u = age / life;
    if (u < 0.42) return;
    const ru = (u - 0.42) / 0.58;
    band(p, -8, 0, 2 + 14 * ru, 0.2, 1.2, (1 - ru) * 0.9, [C[1], C[3], C[5], C[6]], (g) => Math.sin(g) >= 0);
  });

  drawGoblet(p, G, C, ph);

  // crimson wine drops swelling at the left rim, pinching off, and plinking onto the floor
  cycle(t, D, 3, o.seed + 31, 1.4, (age, life) => {
    const u = age / life;
    if (u < 0.16) {
      // bead swelling on rim
      const s = u / 0.16;
      p.dot(-8, -33 + s, C[6], 1);
      if (s > 0.5) p.px(-8, -32, WHITE);
    } else if (u < 0.42) {
      const fu = (u - 0.16) / 0.26;
      const y = lerp(-32, -1, fu * fu);
      p.px(-8, y, C[6]);
      p.px(-8, y - 1, C[4]);
      p.glow(-8, y, 4, C[4], 0.28);
    } else if (u < 0.5) {
      // tiny splash crown
      const su = (u - 0.42) / 0.08;
      p.dot(-10 - su * 2, -1 - (1 - su) * 2, C[6], 1 - su);
      p.dot(-6 + su * 2, -1 - (1 - su) * 2, C[6], 1 - su);
    }
  });

  helixPass(p, t, C, G, true);

  // drifting petals & embers rising in a seamless cycle around the goblet and heart
  cycle(t, D, 10, o.seed + 5, (r) => r.range(1.4, 2.2), (age, life, r) => {
    const u = age / life, side = r.sign();
    const x = side * r.range(5, 22) + Math.sin(age * 4 + r.range(0, TAU)) * 3;
    const y = r.range(-18, -52) - age * r.range(14, 24);
    const a = Math.sin(u * Math.PI);
    if (r.chance(0.45)) {
      drawPetal(p, x, y, 2.1, age * 3 * side, Math.cos(age * 6), C, a);
    } else {
      p.dot(x, y, u < 0.4 ? G[6] : C[5], a);
      p.glow(x, y, 4, C[4], 0.24 * a);
    }
  });

  // the hovering sacred gothic heart at the apex, pulsing with each lub-dub
  const bob = Math.sin(ph * TAU) * 1.6;
  const s = 6.4 * (1 + 0.16 * hb);
  // shock-halo thrown off on the main lub beat
  for (const off of [0, 1.5]) {
    const bph = (((t - off) % 1.5) + 1.5) % 1.5;
    if (bph > 0.05 && bph < 0.55) {
      const ru = (bph - 0.05) / 0.5;
      const rr = 8 + 14 * ru;
      p.ring(0, HY + bob, rr, 1.1, C[5], (1 - ru) * 0.75);
    }
  }
  drawGothicHeart(p, 0, HY + bob, s, C, { gold: G });
  p.glow(0, HY + bob, 16 + 8 * hb, C[5], 0.35 + 0.3 * hb);

  // near half of the orbiting thorny golden crown
  const crownY = HY - 2 + bob * 0.5;
  band(p, 0, crownY, 15, 0.26, 1.5, 0.9, [G[1], G[3], G[5], G[6]], (g) => Math.sin(g) >= 0);
  for (let i = 0; i < 6; i++) {
    const a = ph * TAU + (i * TAU) / 6;
    if (Math.sin(a) < 0) continue;
    const x = Math.cos(a) * 15.5, y = crownY + Math.sin(a) * 15.5 * 0.26;
    p.px(x, y - 2, WHITE);
    p.px(x, y - 1, G[6]);
    p.px(x, y, G[4]);
  }
  if (hb > 0.55) sparkle(p, -3, HY + bob - 3, Math.round(4 * hb), G[7], C[6], 0.45 * hb);
}
