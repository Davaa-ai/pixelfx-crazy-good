// Armored Heart (ХУЯГТ ЗҮРХ — Avoidant / Dismissive Attachment):
// Heavy interlocking forged-basalt & dark iron plates stitched shut with bronze wire bindings;
// a narrow Y-fissure smolders crimson at rest, surging outward before the heavy plates slam back shut.

import { cycle, fit, sparkle, band, rand, clamp, lerp, TAU, WHITE } from "../../../src/core/index.js";
import { EMBER, CRAG, BRONZE, getHeartMesh, shadeCrustPx, drawWireStitches, drawCragPedestal, drawSoftPuff } from "../_lib.js";

export const meta = {
  name: "Armored heart",
  desc: "Interlocking dark iron and basalt plates lashed with bronze wire stitches; molten crimson heat pushes the shell apart before the armor slams shut.",
  tags: ["armored", "heart", "attachment", "avoidant", "iron", "ember", "hover", "loop"],
  size: [152, 152],
  origin: [76, 138],
  duration: 3.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: EMBER,
    armor: CRAG,
    wire: BRONZE,
    seed: 23,
  },
};

const D = meta.duration, BASE_CY = -56.5;

function armorState(ph) {
  const local = (ph * 2) % 1;
  let open = 0, slam = 0;
  if (local > 0.14 && local < 0.58) {
    if (local < 0.44) {
      const u = (local - 0.14) / 0.30;
      open = u * u * (3 - 2 * u);
    } else {
      const u = (local - 0.44) / 0.14;
      open = Math.max(0, 1 - u * u * 1.4);
      slam = Math.sin(clamp(u, 0, 1) * Math.PI);
    }
  }
  return { open, slam };
}

export function drawBack(p, t, o) {
  const E = fit(o.palette, 8), S = fit(o.armor, 8);
  const ph = (t % D) / D, { open, slam } = armorState(ph);
  const cy = BASE_CY + Math.cos(ph * TAU) * 1.3 + slam * 1.1;

  // Guarded crimson-scarlet furnace glow + forge pedestal bounce
  p.glow(4, cy - 1, 24 + 20 * open, E[4], 0.14 + 0.36 * open);
  p.glow(0, -7, 32, E[3], 0.16 + 0.2 * open);

  // Soft forge soot & ash wisps rising behind the armor
  cycle(t, D, 10, o.seed + 19, 1.35, (age, life, r) => {
    const u = age / life;
    const x = r.range(-16, 18) + Math.sin(u * 5 + r.next() * 6) * 3;
    const y = cy + r.range(-16, 6) - u * 24;
    if (u < 0.85) drawSoftPuff(p, x, y, lerp(2.2, 4.4, u), S[2], S[1], S[0], (1 - u) * 0.5);
  });

  // Clamp shockwave ring on pedestal (far half)
  for (const off of [0, 0.5]) {
    const lp = ((ph + off) * 2) % 1;
    if (lp > 0.45 && lp < 0.88) {
      const ru = (lp - 0.45) / 0.43;
      band(p, 0, -1, 10 + 25 * ru, 0.18, 1.2, (1 - ru) * 0.65, [S[2], E[3], E[5], WHITE], (g) => Math.sin(g) < 0);
    }
  }
}

export function draw(p, t, o) {
  const E = fit(o.palette, 8), S = fit(o.armor, 8), W = fit(o.wire, 8);
  const mesh = getHeartMesh(o.seed);
  const ph = (t % D) / D, { open, slam } = armorState(ph);
  const cy = BASE_CY + Math.cos(ph * TAU) * 1.3 + slam * 1.1;

  drawCragPedestal(p, o.seed, S, S[4], E[4], 0.35 + 0.48 * open);

  const yaw = Math.cos(ph * TAU) * 0.14;
  const lx = -0.52 + yaw, ly = -0.58, lz = 0.63;
  const linv = 1 / Math.hypot(lx, ly, lz);
  const Lx = lx * linv, Ly = ly * linv, Lz = lz * linv;

  const { MW, MH, OX, OY } = mesh;
  const crackThreshold = 0.48 + open * 0.68;

  for (let j = 0; j < MH; j++) {
    const dy = j - OY;
    for (let i = 0; i < MW; i++) {
      const dx = i - OX, k = j * MW + i;
      const d = mesh.sd[k];
      if (d < -1.6) continue;

      const pid = mesh.plateId[k], pl = mesh.plates[pid], pe = mesh.plateEdge[k];
      const rimD = d + pl.rim * 1.1 + open * 0.55 - (pe < 0.95 ? 1.0 : 0);
      if (rimD < 0) continue;

      // Narrow, deep Y-shaped central-right fissure between heavy iron blocks (matches Heart 2 in photo!)
      const fissureZone = clamp(1 - Math.hypot((dx - 4.5) * 0.9, (dy + 1) * 0.78) / 10.5, 0, 1);
      const mainCrackW = fissureZone > 0 ? 0.55 + fissureZone * 0.95 + open * 1.05 : 0;

      if (fissureZone > 0.15 && pe < mainCrackW) {
        const depth = 1 - pe / mainCrackW;
        const ci = clamp(Math.round((depth * (0.65 + 0.45 * open)) * 7), 2, 7);
        const col = depth > 0.76 && open > 0.55 ? WHITE : E[ci];
        p.px(dx, cy + dy, col);
        if ((i + j) % 2 === 0) p.light(dx, cy + dy, E[4], 0.32 + 0.42 * open);
      } else if (pe < crackThreshold) {
        // Other interlocking armor seams: dark iron chasms at rest, blazing red-gold when pushed apart!
        if (open > 0.24) {
          const hot = clamp((1 - pe / crackThreshold) * open * 1.35, 0, 1);
          p.px(dx, cy + dy, E[clamp(Math.round(hot * 6), 1, 6)]);
          if (hot > 0.55 && (i + j) % 3 === 0) p.light(dx, cy + dy, E[4], 0.24 * open);
        } else {
          p.px(dx, cy + dy, slam > 0.55 && rand(i, j) > 0.72 ? W[5] : S[0]);
        }
      } else {
        // Dark forged iron-basalt plate face (maxStep=4 -> brooding metallic dark iron)
        let col = shadeCrustPx(mesh, k, Lx, Ly, Lz, S, 4);
        // Warm crimson rim bounce on the beveled cliff walls right next to the Y-fissure!
        if (fissureZone > 0.2 && pe < mainCrackW + 1.15) {
          col = open > 0.35 ? E[4] : E[2];
        }
        p.px(dx, cy + dy, col);
      }
    }
  }

  // 3D Bronze wire bindings stitched across the left & lower-right plate seams!
  drawWireStitches(p, 0, cy, mesh, W, ph, open * 1.2);

  // Deep crimson furnace glow concentrated inside the Y-fissure
  p.glow(5, cy - 1, 11 + 10 * open, E[4], 0.38 + 0.38 * open);

  // Metallic clamp-lock glints & sparks when the heavy plates slam shut!
  if (slam > 0.25) {
    const sk = (slam - 0.25) / 0.75;
    for (let s = 0; s < mesh.stitches.length; s += 2) {
      const st = mesh.stitches[s];
      sparkle(p, st.x, cy + st.y, Math.round(4 * sk), WHITE, W[6], 0.55 * sk);
    }
    for (let i = 0; i < 6; i++) {
      const a = -0.6 + i * 0.45, dist = 4 + (1 - sk) * 15;
      p.dot(5 + Math.cos(a) * dist, cy - 1 + Math.sin(a) * dist, sk > 0.5 ? WHITE : E[6], sk);
    }
  }

  // Escaping embers from the fissure sinking as ash toward the forge rocks
  cycle(t, D, 10, o.seed + 53, 1.2, (age, life, r) => {
    const u = age / life;
    const sx = 5 + r.range(-4, 5), sy = cy + r.range(-6, 4);
    const x = sx + r.range(-11, 15) * u;
    const y = sy - 9 * u + 22 * u * u;
    if (y < -4) p.dot(x, y, u < 0.35 ? E[6] : u < 0.7 ? E[4] : S[3], 1 - u * 0.75);
  });

  // Near half of clamp shockwave ring
  for (const off of [0, 0.5]) {
    const lp = ((ph + off) * 2) % 1;
    if (lp > 0.45 && lp < 0.88) {
      const ru = (lp - 0.45) / 0.43;
      band(p, 0, -1, 10 + 25 * ru, 0.18, 1.2, (1 - ru) * 0.75, [S[2], E[3], E[5], WHITE], (g) => Math.sin(g) >= 0);
    }
  }
}
