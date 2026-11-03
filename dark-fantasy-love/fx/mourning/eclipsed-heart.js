// Eclipsed Lovers: a burning crimson sun and a weeping silver moon orbit in longing, fusing twice each cycle
// into an abyssal black gothic heart rimmed in diamond-ring fire and shedding luminous tears onto the stone floor.

import { cycle, fit, sparkle, band, loopNoise, clamp, lerp, TAU, WHITE } from "../../../src/core/index.js";
import { VELVET, TEAR, GILDED, inGothicHeart, unlight } from "../_lib.js";

export const meta = {
  name: "Eclipsed lovers",
  desc: "A crimson sun and weeping silver moon orbit into eclipse, fusing into a pitch-black gothic heart rimmed in diamond fire while silver-blood tears splash below.",
  tags: ["mourning", "eclipse", "moon", "sun", "heart", "tears", "gothic", "loop"],
  size: [144, 136],
  origin: [72, 118],
  duration: 3.6,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: VELVET,
    moon: TEAR,
    gold: GILDED,
    seed: 21,
  },
};

const D = meta.duration, CY = -68, TILT = 0.28;

function drawArmillary(p, cols, alpha, front) {
  const ct = Math.cos(TILT), st = Math.sin(TILT), rx = 29, ry = 9.5, N = 84;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    if ((Math.sin(a) >= 0) !== front) continue;
    const lx = Math.cos(a) * rx, ly = Math.sin(a) * ry;
    const x = lx * ct - ly * st, y = CY + lx * st + ly * ct;
    const c = cols[i % 8 === 0 ? 3 : Math.sin(a) > 0 ? 2 : 1];
    p.dot(x, y, c, alpha * (i % 8 === 0 ? 1 : 0.72));
    if (i % 14 === 0) {
      const tx = Math.cos(a) * (rx + 2.2), ty = Math.sin(a) * (ry + 1.2);
      p.dot(tx * ct - ty * st, CY + tx * st + ty * ct, cols[3], alpha * 0.85);
    }
  }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), M = fit(o.moon, 8), G = fit(o.gold, 8), ph = (t % D) / D;
  const sep = Math.sin(ph * TAU) * 19;
  const conj = Math.pow(clamp(1 - Math.abs(sep) / 11), 1.6);

  // dual atmospheric pools on sky and stone floor
  p.glow(-sep * 0.8, CY - sep * 0.25, 34 + 12 * conj, C[4], 0.24 + 0.22 * conj);
  p.glow(sep * 0.8, CY + sep * 0.25, 32 + 10 * conj, M[4], 0.2 + 0.18 * conj);
  p.glow(0, -3, 36, conj > 0.4 ? C[4] : M[3], 0.18 + 0.14 * conj);

  // tilted gothic armillary ring encircling the pair (far half)
  drawArmillary(p, [G[1], M[3], C[4], G[6]], 0.65, false);

  // tear splash ripples on the stone floor (far half)
  cycle(t, D, 5, o.seed + 13, 1.45, (age, life, r, i) => {
    const u = age / life;
    if (u < 0.48) return;
    const tx = (i % 2 === 0 ? -1 : 1) * r.range(0, 9);
    const ru = (u - 0.48) / 0.52;
    const R = i % 2 === 0 ? M : C;
    band(p, tx, 0, 2 + 15 * ru, 0.2, 1.2, (1 - ru) * 0.85, [R[1], R[3], R[5], R[7]], (g) => Math.sin(g) < 0);
  });
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), M = fit(o.moon, 8), G = fit(o.gold, 8);
  const ph = (t % D) / D, ang = ph * TAU;
  const sx = -Math.sin(ang) * 19, sy = CY - Math.cos(ang) * 2.5 - Math.sin(ang) * 5.5;
  const mx = Math.sin(ang) * 19, my = CY + Math.cos(ang) * 2.5 + Math.sin(ang) * 5.5;
  const sep = Math.hypot(mx - sx, my - sy);
  const conj = Math.pow(clamp(1 - sep / 18), 1.5);

  // near half of floor tear ripples + falling silver & ruby tears
  cycle(t, D, 5, o.seed + 13, 1.45, (age, life, r, i) => {
    const u = age / life, tx = (i % 2 === 0 ? -1 : 1) * r.range(0, 9);
    const R = i % 2 === 0 ? M : C;
    if (u < 0.48) {
      const fu = u / 0.48;
      const y = lerp(CY + 11, -1, fu * fu);
      p.px(tx, y, WHITE);
      p.px(tx, y - 1, R[6]);
      p.dot(tx, y - 2, R[4], 0.8);
      p.glow(tx, y, 5, R[5], 0.32);
    } else {
      const ru = (u - 0.48) / 0.52;
      band(p, tx, 0, 2 + 15 * ru, 0.2, 1.2, (1 - ru) * 0.85, [R[1], R[3], R[5], R[7]], (g) => Math.sin(g) >= 0);
      if (ru < 0.2) {
        p.dot(tx - 2, -2, R[6], 1 - ru * 5);
        p.dot(tx + 2, -2, R[6], 1 - ru * 5);
      }
    }
  });

  // draw whichever body is further back first (cos(ang) decides depth!)
  const sunInFront = Math.cos(ang) < 0;
  const drawSun = () => {
    // flickering crimson prominences around the sun's rim
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + ph * TAU;
      const wig = 8.8 + (loopNoise((ph + i * 0.07) % 1, 1.1, o.seed + i) + 1) * 2.2;
      p.line(sx + Math.cos(a) * 7.5, sy + Math.sin(a) * 7.5, sx + Math.cos(a) * wig, sy + Math.sin(a) * wig, i % 2 === 0 ? C[5] : C[4]);
    }
    p.circle(sx, sy, 8.6, C[2]);
    p.circle(sx, sy, 7.6, (d, a) => (d > 0.78 ? C[6] : Math.cos(a + 0.7) > 0.2 ? C[5] : C[3]));
  };
  const drawMoon = () => {
    p.circle(mx, my, 8.2, M[1]);
    p.circle(mx, my, 7.2, (d, a) => (d > 0.8 ? M[6] : Math.cos(a + 2.3) > 0.15 ? M[5] : M[2]));
    // subtle lunar craters
    p.dot(mx - 2, my - 1, M[3]);
    p.dot(mx + 2, my + 2, M[1]);
  };

  if (sunInFront) { drawMoon(); drawSun(); }
  else { drawSun(); drawMoon(); }

  // tilted gothic armillary ring near half
  drawArmillary(p, [G[1], M[3], C[4], G[6]], 0.8, true);

  // drifting starlight motes around the pair
  cycle(t, D, 10, o.seed + 41, 1.2, (age, life, r, i) => {
    const u = age / life, a = r.range(0, TAU), rad = r.range(14, 30);
    const x = Math.cos(a + ph * TAU * 0.5) * rad, y = CY + Math.sin(a + ph * TAU * 0.5) * rad * 0.7;
    const s = Math.sin(u * Math.PI);
    if (s > 0.4) p.dot(x, y, i % 2 === 0 ? C[6] : M[6], s);
  });

  // THE ECLIPSE HEART: when sun & moon overlap, their union forms an abyssal velvet-black gothic heart
  // rimmed with blazing crimson/silver corona & a diamond-ring glint!
  if (conj > 0.08) {
    const hs = 9.2 * (0.55 + 0.55 * conj);
    const E = Math.ceil(hs * 1.35) + 3;
    // blazing corona flares shooting off the heart silhouette
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU - ph * TAU * 2;
      const len = (10 + 9 * conj) * (i % 3 === 0 ? 1.25 : 0.75);
      p.line(Math.cos(a) * (hs * 0.7), CY + Math.sin(a) * (hs * 0.7), Math.cos(a) * len, CY + Math.sin(a) * len, i % 2 === 0 ? C[6] : M[6], conj * 0.9);
    }
    // crisp corona rim + abyssal black interior
    for (let iy = -E; iy <= E; iy++) {
      for (let ix = -E; ix <= E; ix++) {
        const inside = inGothicHeart(ix, iy, hs);
        if (inside) {
          p.px(ix, CY + iy, C[0]);
        } else if (inGothicHeart(ix - 1, iy, hs) || inGothicHeart(ix + 1, iy, hs) || inGothicHeart(ix, iy - 1, hs) || inGothicHeart(ix, iy + 1, hs)) {
          p.px(ix, CY + iy, conj > 0.65 ? WHITE : ix < 0 ? C[6] : M[6]);
          p.light(ix, CY + iy, ix < 0 ? C[5] : M[5], 0.55 * conj);
        } else if (inGothicHeart(ix - 2, iy, hs) || inGothicHeart(ix + 2, iy, hs) || inGothicHeart(ix, iy - 2, hs) || inGothicHeart(ix, iy + 2, hs)) {
          p.dot(ix, CY + iy, ix < 0 ? C[5] : M[5], conj * 0.85);
        }
      }
    }
    // carve additive light out of the black gothic heart so it stays stark, true eclipse black!
    unlight(p, -E, CY - E, E, CY + E, (x, y) => inGothicHeart(x, y - CY, hs - 0.9), 0.04);

    // diamond-ring star glint on the upper-left lobe at peak eclipse
    if (conj > 0.45) {
      const dk = (conj - 0.45) / 0.55;
      sparkle(p, -hs * 0.68, CY - hs * 0.52, Math.round(7 * dk), G[7], G[5], 0.75 * dk);
    }
  }
}
