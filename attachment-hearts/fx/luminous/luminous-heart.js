// Luminous Heart (ГЭРЭЛТ ЗҮРХ — Secure Attachment):
// A parted dark obsidian-earth cradle lined with vivid crimson-garnet crystals frames a wide-open,
// cut sunstone-diamond faceted heart radiating warm cathedral god-rays and calm levitating pebbles.

import { cycle, fit, sparkle, band, rand, clamp, lerp, TAU, WHITE } from "../../../src/core/index.js";
import { SUN, CRAG, GARNET, getHeartMesh, shadeCrustPx, shadeCrystalPx, drawCragPedestal, drawOreChunk } from "../_lib.js";

export const meta = {
  name: "Luminous heart",
  desc: "Parted dark stone lined in crimson garnet cradles an open sunstone-diamond faceted heart — radiating warm cathedral god-rays, gemstone caustics, and serene floating dust.",
  tags: ["luminous", "heart", "attachment", "secure", "radiant", "crystal", "gold", "hover", "loop"],
  size: [168, 156],
  origin: [84, 142],
  duration: 3.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: SUN,
    garnet: GARNET,
    stone: CRAG,
    seed: 53,
  },
};

const D = meta.duration, BASE_CY = -57.5;

const PEBBLES = [
  { x: -30, y: -6, r: 2.3, ph: 0.4 },
  { x: -26, y: 11, r: 1.8, ph: 2.1 },
  { x:  30, y: -4, r: 2.4, ph: 1.2 },
  { x:  26, y: 12, r: 1.9, ph: 3.5 },
];

export function drawBack(p, t, o) {
  const G = fit(o.palette, 8), R = fit(o.garnet, 8);
  const ph = (t % D) / D;
  const breath = 0.5 + 0.5 * Math.cos(ph * TAU * 2);
  const cy = BASE_CY + Math.cos(ph * TAU) * 1.6;

  // Warm sanctuary glow bathing sky & crag pedestal
  p.glow(0, cy - 2, 52 + 6 * breath, G[5], 0.34 + 0.12 * breath);
  p.glow(0, cy + 2, 24, WHITE, 0.22 + 0.08 * breath);
  p.glow(0, -7, 38, G[5], 0.28 + 0.08 * breath);

  // Volumetric Cathedral God-Rays (tapered dithered light wedges fanning out of the open crystal crown!)
  const RAY_N = 16;
  for (let i = 0; i < RAY_N; i++) {
    const baseA = (i / RAY_N) * TAU - Math.PI / 2;
    const a = baseA + Math.cos(ph * TAU + i * 0.9) * 0.035;
    const upBias = 0.65 + 0.35 * Math.max(0, -Math.sin(a));
    const len = (36 + (i % 3) * 10 + breath * 6) * upBias;
    for (let s = 14; s < len; s += 1.4) {
      const u = (s - 14) / (len - 14);
      const nx = -Math.sin(a), ny = Math.cos(a);
      const rx = Math.cos(a) * s, ry = cy + Math.sin(a) * s;
      const alpha = (1 - u) * (1 - u) * (0.58 + 0.22 * breath) * upBias;
      p.dot(rx, ry, u < 0.35 ? G[7] : G[5], alpha);
      if (u < 0.55) {
        p.dot(rx + nx, ry + ny, G[5], alpha * 0.55);
        p.dot(rx - nx, ry - ny, G[5], alpha * 0.55);
      }
      if (s < 28 && i % 2 === 0) p.light(rx, ry, G[5], alpha * 0.24);
    }
  }

  // Calm golden sanctuary ground ring (far half)
  for (const off of [0, 0.5]) {
    const bp = (ph + off) % 1;
    band(p, 0, -1, 14 + 24 * bp, 0.18, 1.1, Math.sin(bp * Math.PI) * 0.55, [R[3], G[4], G[6], WHITE], (g) => Math.sin(g) < 0);
  }
}

export function draw(p, t, o) {
  const G = fit(o.palette, 8), R = fit(o.garnet, 8), S = fit(o.stone, 8);
  const mesh = getHeartMesh(o.seed);
  const ph = (t % D) / D;
  const breath = 0.5 + 0.5 * Math.cos(ph * TAU * 2);
  const cy = BASE_CY + Math.cos(ph * TAU) * 1.6;

  drawCragPedestal(p, o.seed, S, G[6], R[5], 0.82);

  // Orbiting light vector makes cut honey-amber-ivory sunstone facets shimmer distinctly!
  const yaw = Math.cos(ph * TAU) * 0.32;
  const pitch = Math.sin(ph * TAU) * 0.16;
  const lx = -0.28 + yaw, ly = -0.46 + pitch, lz = 0.84;
  const linv = 1 / Math.hypot(lx, ly, lz);
  const Lx = lx * linv, Ly = ly * linv, Lz = lz * linv;

  const { MW, MH, OX, OY } = mesh;

  for (let j = 0; j < MH; j++) {
    const dy = j - OY;
    for (let i = 0; i < MW; i++) {
      const dx = i - OX, k = j * MW + i;
      const d = mesh.sd[k];
      if (d < -1.5) continue;

      const pid = mesh.plateId[k], pl = mesh.plates[pid], pe = mesh.plateEdge[k];
      // Curved heart-contour cradle matching Heart 4 in the reference banner:
      // Follows the outer curved rim (sd < shellW) on both lobes & cheeks while leaving the top cleft wide open!
      const inOpenCrown = dy < -7 && Math.abs(dx) < 12.5 - (dy + 7) * 0.4;
      const shellW = inOpenCrown ? -2 : (4.6 + pl.tone * 1.5) * clamp((Math.abs(dx) - 2.5) / 8, 0, 1);
      const garnetW = inOpenCrown ? -2 : shellW + 2.5 * clamp((Math.abs(dx) - 2.0) / 7, 0, 1);

      if (d < shellW) {
        const rimD = d + pl.rim - (pe < 0.9 ? 0.8 : 0);
        if (rimD < 0) continue;
        if (pe < 0.62) {
          p.px(dx, cy + dy, G[5]);
        } else {
          p.px(dx, cy + dy, shadeCrustPx(mesh, k, Lx, Ly, Lz, S, 3));
        }
      } else if (d < garnetW) {
        if (d < 0) continue;
        const gu = (d - shellW) / Math.max(0.5, garnetW - shellW);
        const gi = clamp(Math.round(gu * 3.5 + 2), 2, 5);
        p.px(dx, cy + dy, rand(i, j) > 0.78 ? G[6] : R[gi]);
      } else {
        if (d < 0) continue;
        // Preserve facet contrast! Only the innermost focal point hits pure WHITE!
        const focal = clamp(1 - Math.hypot(dx * 0.95, dy - 2) / 13.5, 0, 1);
        let col = shadeCrystalPx(mesh, k, Lx, Ly, Lz, G, -0.08 + focal * (0.42 + 0.22 * breath));
        if (focal > 0.78) col = WHITE;
        p.px(dx, cy + dy, col);
        if (focal > 0.35 && (i + j) % 3 === 0) {
          p.light(dx, cy + dy, G[5], 0.2 + 0.14 * breath);
        }
      }
    }
  }

  // Focal sunstone heart starlight + individual facet twinkles
  p.glow(0, cy + 2, 16 + 4 * breath, G[5], 0.38 + 0.18 * breath);
  sparkle(p, -3, cy - 6, 4 + Math.round(2 * breath), WHITE, G[6], 0.45);
  sparkle(p, 2, cy + 3, 5 + Math.round(2 * breath), WHITE, G[6], 0.55);

  // Peacefully levitating crust pebbles in warm golden equilibrium
  for (let i = 0; i < PEBBLES.length; i++) {
    const pb = PEBBLES[i];
    const py = cy + pb.y + Math.cos(ph * TAU + pb.ph) * 2.2;
    drawOreChunk(p, pb.x, py, pb.r, ph * TAU * 0.5 + pb.ph, S, G[6], -Math.sign(pb.x), 0);
  }

  // Serene warm golden dust motes rising gently from the sunlit pedestal
  cycle(t, D, 18, o.seed + 67, 1.5, (age, life, r, idx) => {
    const u = age / life;
    const x = r.range(-28, 28) + Math.sin(u * 4 + idx) * 2.5;
    const y = lerp(-8, cy - 34, u);
    const a = Math.sin(u * Math.PI);
    p.dot(x, y, u > 0.4 && u < 0.7 ? WHITE : idx % 5 === 0 ? R[5] : G[6], a * 0.92);
    if (idx % 3 === 0 && a > 0.5) p.glow(x, y, 5, G[5], 0.2 * a);
  });

  // Near half of calm golden sanctuary ground ring
  for (const off of [0, 0.5]) {
    const bp = (ph + off) % 1;
    band(p, 0, -1, 14 + 24 * bp, 0.18, 1.1, Math.sin(bp * Math.PI) * 0.65, [R[3], G[4], G[6], WHITE], (g) => Math.sin(g) >= 0);
  }
}
