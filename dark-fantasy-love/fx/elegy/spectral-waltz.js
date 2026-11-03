// Ghostly Embrace: a translucent moonlight-silver apparition materializes behind the character, draping spectral
// arms round their shoulders while a shared crimson-gold heart glows warmly where their chests meet.

import { cycle, fit, sparkle, band, loopNoise, clamp, lerp, TAU, WHITE } from "../../../src/core/index.js";
import { TEAR, VELVET, GILDED, drawGothicHeart, drawPetal } from "../_lib.js";

export const meta = {
  name: "Ghostly embrace",
  desc: "A pale moonlight apparition stands behind the hero and drapes spectral arms over their shoulders, kindling a warm crimson heart where cold spirit meets living flesh.",
  tags: ["elegy", "ghost", "spirit", "embrace", "romance", "aura", "gothic", "loop"],
  size: [124, 112],
  origin: [62, 96],
  duration: 3.2,
  loop: true,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: TEAR,
    rose: VELVET,
    gold: GILDED,
    seed: 31,
  },
};

const D = meta.duration;
const EMBRACE_A = { turn: 1.05, crouch: 1, lean: -1, hy: 1, fx: -2, fy: -24, bx: 4, by: -24, armsFront: true, ffx: -3, fbx: 4 };
const EMBRACE_B = { turn: 1.15, crouch: 2, lean: 1, hy: 2, fx: -3, fy: -25, bx: 3, by: -25, armsFront: true, ffx: -3, fbx: 4 };

export const act = {
  onBody: true,
  poses: [
    [0, EMBRACE_A],
    [0.8, EMBRACE_B],
    [1.6, { ...EMBRACE_A, lean: 0 }],
    [2.4, EMBRACE_B],
    [3.2, EMBRACE_A],
  ],
};

function beatAt(t) {
  const half = D / 2, ph = ((t % half) + half) % half;
  return Math.exp(-(((ph - 0.48) / 0.08) ** 2)) + 0.55 * Math.exp(-(((ph - 0.74) / 0.09) ** 2));
}

export function drawBack(p, t, o) {
  const S = fit(o.palette, 8), C = fit(o.rose, 8), ph = (t % D) / D, hb = beatAt(t);
  const bob = Math.cos(ph * TAU) * 1.4;
  const gx = -5, gy = -41.5 + bob;

  // cold spectral moonlight behind, warm crimson glow at chest
  p.glow(gx, -26 + bob, 32, S[4], 0.28);
  p.glow(1, -23, 22 + 6 * hb, C[4], 0.2 + 0.16 * hb);

  // spectral lace waltz ring on the stone floor (far half)
  band(p, -1, 0, 21 + Math.sin(ph * TAU * 2) * 1.5, 0.2, 1.5, 0.65, [S[1], S[3], S[5], C[5]], (g) => Math.sin(g) < 0);

  // THE APPARITION (standing behind & slightly left/taller, head bowed tenderly toward the hero's head)
  // flowing mourning veil & spectral gown trailing to mist at the hem
  for (let dy = 0; dy <= 34; dy++) {
    const u = dy / 34; // 0 crown .. 1 hem
    const sway = loopNoise((ph + u * 0.45) % 1, 0.9, o.seed + 7) * (1.2 + u * 3.8);
    const hw = dy < 7 ? Math.sqrt(Math.max(0, 1 - ((dy - 4) / 4.2) ** 2)) * 4.2 : 3.2 + u * 6.8;
    const cx = gx + (dy < 8 ? 1.2 : -u * 2.5) + sway * 0.6;
    const alpha = (1 - u * u * 0.82) * 0.72;
    for (let dx = -Math.ceil(hw); dx <= Math.ceil(hw); dx++) {
      if (Math.abs(dx) > hw) continue;
      const edge = Math.abs(dx) > hw - 1.1 || dy <= 1;
      p.blend(cx + dx, gy + dy, edge ? S[6] : dx < 0 ? S[5] : S[3], edge ? alpha * 0.95 : alpha * 0.52);
    }
  }
  // tender closed-eye feature & bright moonlit crown rim on the ghost's bowed head
  p.blend(gx + 3, gy + 5, S[1], 0.7);
  p.blend(gx + 4, gy + 5, S[1], 0.7);
  p.dot(gx, gy, S[7], 0.85);

  // back pass of spiraling spectral wisps & crimson petals
  cycle(t, D, 12, o.seed + 19, 1.6, (age, life, r, i) => {
    const u = age / life, ang = u * TAU * 1.2 + (i * TAU) / 12 + ph * TAU;
    if (Math.sin(ang) >= 0) return;
    const rad = 16 + Math.sin(u * Math.PI) * 5;
    const x = Math.cos(ang) * rad, y = -6 - u * 36;
    const a = Math.sin(u * Math.PI);
    if (i % 3 === 0) drawPetal(p, x, y, 2.1, age * 4, Math.cos(age * 6), C, a * 0.85);
    else p.disc(x, y, 1.6, S[5], a * 0.45);
  });
}

export function draw(p, t, o) {
  const S = fit(o.palette, 8), C = fit(o.rose, 8), G = fit(o.gold, 8);
  const ph = (t % D) / D, hb = beatAt(t), bob = Math.cos(ph * TAU) * 1.4;

  // floor waltz ring (near half)
  band(p, -1, 0, 21 + Math.sin(ph * TAU * 2) * 1.5, 0.2, 1.5, 0.75, [S[1], S[3], S[5], C[5]], (g) => Math.sin(g) >= 0);

  // translucent spectral arms draping forward around BOTH of the hero's shoulders to clasp over their heart (1, -24)
  const arms = [
    [[-8, -32 + bob], [-9, -27 + bob * 0.7], [-3, -24 + bob * 0.3], [1, -24]], // left near arm
    [[4, -32 + bob], [9, -27 + bob * 0.7], [6, -24 + bob * 0.3], [2, -24]],    // right far arm
  ];
  for (const pts of arms) {
    for (let s = 0; s < pts.length - 1; s++) {
      const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8, x = lerp(x0, x1, u), y = lerp(y0, y1, u);
        // transitions from pale moonlight at the shoulder to warm rose-gold at the clasped hands!
        const warm = s === 2 ? u : 0;
        const col = warm > 0.5 ? C[6] : S[6];
        p.blend(x, y, col, 0.62);
        p.blend(x, y + 1, warm > 0.5 ? C[4] : S[4], 0.42);
      }
    }
  }

  // the shared beating crimson-gold heart kindled where ghost and living touch
  const hx = 1, hy = -24, hs = 3.6 * (1 + 0.2 * hb);
  drawGothicHeart(p, hx, hy, hs, C, { a: 0.95, gold: G });
  p.glow(hx, hy, 12 + 6 * hb, C[5], 0.35 + 0.3 * hb);
  if (hb > 0.5) sparkle(p, hx - 1, hy - 1, Math.round(3 * hb), G[7], C[5], 0.45 * hb);

  // front pass of spiraling spectral wisps, rose petals & twinkles
  cycle(t, D, 12, o.seed + 19, 1.6, (age, life, r, i) => {
    const u = age / life, ang = u * TAU * 1.2 + (i * TAU) / 12 + ph * TAU;
    if (Math.sin(ang) < 0) return;
    const rad = 16 + Math.sin(u * Math.PI) * 5;
    const x = Math.cos(ang) * rad, y = -6 - u * 36;
    const a = Math.sin(u * Math.PI);
    if (i % 3 === 0) {
      drawPetal(p, x, y, 2.2, age * 4, Math.cos(age * 6), C, a);
    } else {
      p.disc(x, y, 1.5, S[6], a * 0.52);
      p.dot(x, y, WHITE, a * 0.7);
      p.glow(x, y, 5, S[5], 0.22 * a);
    }
  });
}
