// Magnetic Heart (СОРОНЗОН ЗҮРХ — Anxious / Preoccupied Attachment):
// Broken dark magnetite armor exposes a faceted rose-quartz crystal core; soaring dipole flux arcs
// emerge from the top cleft, carry iron-filing motes, and tug orbiting ore chunks inward with electric snaps.

import { cycle, fit, sparkle, band, rand, clamp, lerp, TAU, WHITE } from "../../../src/core/index.js";
import { ROSE, CRAG, getHeartMesh, shadeCrustPx, shadeCrystalPx, drawCragPedestal, drawOreChunk, dipolePoint } from "../_lib.js";

export const meta = {
  name: "Magnetic heart",
  desc: "Craggy magnetite stone split open across a faceted rose-crimson crystal core, whipping soaring dipole field arcs that tug orbiting ore chunks inward.",
  tags: ["magnetic", "heart", "attachment", "anxious", "crystal", "dipole", "hover", "loop"],
  size: [172, 160],
  origin: [92, 146],
  duration: 3.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ROSE,
    stone: CRAG,
    seed: 11,
  },
};

const D = meta.duration, BASE_CY = -57.5;

function magPulse(ph) {
  const s = Math.sin(ph * TAU);
  return Math.pow(Math.abs(s), 3.2);
}

// 9 suspended angular magnetite ore chunks along the soaring left & right dipole field lines
const ORES = [
  { side: -1, R0: 54, u: 0.22, r: 3.8, phase: 0.2 },
  { side: -1, R0: 64, u: 0.38, r: 4.5, phase: 1.5 },
  { side: -1, R0: 56, u: 0.58, r: 3.4, phase: 2.8 },
  { side: -1, R0: 42, u: 0.75, r: 2.6, phase: 4.0 },
  { side: -1, R0: 36, u: 0.30, r: 2.3, phase: 5.1 },
  { side:  1, R0: 44, u: 0.28, r: 3.4, phase: 0.9 },
  { side:  1, R0: 50, u: 0.48, r: 3.8, phase: 2.2 },
  { side:  1, R0: 40, u: 0.68, r: 2.7, phase: 3.6 },
  { side:  1, R0: 30, u: 0.18, r: 2.0, phase: 4.7 },
];

function fieldPt(cx, cy, side, R0, u) {
  let [x, y] = dipolePoint(cx, cy, side, R0, u);
  // Grand high upper-left sweep matching the banner's asymmetric magnetic plume!
  if (side < 0) {
    y -= (1 - u) * (R0 * 0.16);
  }
  return [x, y];
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), S = fit(o.stone, 8);
  const ph = (t % D) / D, pulse = magPulse(ph);
  const cy = BASE_CY + Math.cos(ph * TAU) * 1.8;

  // Deep crimson-rose magnetic aura + pedestal under-glow
  p.glow(0, cy - 2, 46 + 8 * pulse, C[4], 0.28 + 0.18 * pulse);
  p.glow(-18, cy - 18, 36, C[3], 0.18);
  p.glow(0, -7, 36, C[4], 0.26 + 0.14 * pulse);

  // Magnetic ground ripple (far half)
  for (const off of [0, 0.5]) {
    const bp = (ph + off) % 1;
    if (bp > 0.24 && bp < 0.72) {
      const ru = (bp - 0.24) / 0.48;
      band(p, 0, -1, 12 + 30 * ru, 0.18, 1.2, (1 - ru) * 0.7, [C[1], C[3], C[5], C[7]], (g) => Math.sin(g) < 0);
    }
  }

  // Soaring dipole magnetic flux arcs emerging out of the top cleft and looping into the bottom tip!
  const leftArcs = [32, 43, 54, 65];
  const rightArcs = [30, 40, 50];
  for (let a = 0; a < leftArcs.length; a++) {
    const R0 = leftArcs[a] - pulse * 3.2;
    const steps = 54;
    for (let i = 0; i < steps; i++) {
      const u = (i / steps + ph * (a % 2 === 0 ? 1 : 2)) % 1;
      const [fx, fy] = fieldPt(0, cy, -1, R0, u);
      const fade = Math.pow(Math.sin(u * Math.PI), 0.65);
      const col = (i + a) % 6 === 0 ? C[6] : C[4 + (a % 2)];
      p.dot(fx, fy, col, fade * (0.48 + 0.36 * pulse));
    }
  }
  for (let a = 0; a < rightArcs.length; a++) {
    const R0 = rightArcs[a] - pulse * 2.6;
    const steps = 44;
    for (let i = 0; i < steps; i++) {
      const u = (i / steps + ph * (a % 2 === 0 ? 1 : 2)) % 1;
      const [fx, fy] = fieldPt(0, cy, 1, R0, u);
      const fade = Math.pow(Math.sin(u * Math.PI), 0.65);
      p.dot(fx, fy, (i + a) % 6 === 0 ? C[6] : C[4], fade * (0.42 + 0.34 * pulse));
    }
  }

  // Far-layer orbiting magnetite ore chunks
  for (let i = 0; i < ORES.length; i++) {
    if (i % 2 === 0) continue;
    const ore = ORES[i];
    const R0 = ore.R0 - pulse * 4.8 + Math.cos(ph * TAU + ore.phase) * 1.4;
    const u = clamp(ore.u + Math.sin(ph * TAU + ore.phase) * 0.03, 0.08, 0.92);
    const [ox, oy] = fieldPt(0, cy, ore.side, R0, u);
    drawOreChunk(p, ox, oy, ore.r * 0.88, ph * TAU + ore.phase, S, C[5], -ore.side, (cy - oy) * 0.04);
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = fit(o.stone, 8);
  const mesh = getHeartMesh(o.seed);
  const ph = (t % D) / D, pulse = magPulse(ph);
  const cy = BASE_CY + Math.cos(ph * TAU) * 1.8;

  // Sculpted dark obsidian crag pedestal + rising iron-filing motes pulled up into South pole
  drawCragPedestal(p, o.seed, S, C[5], C[4], 0.6 + 0.3 * pulse);
  cycle(t, D, 12, o.seed + 31, 1.1, (age, life, r) => {
    const u = age / life;
    const sx = r.range(-24, 24);
    const x = lerp(sx, 0, u * u);
    const y = lerp(-10, cy + 20, u * u);
    p.dot(x, y, u > 0.65 ? C[6] : C[4], Math.sin(u * Math.PI) * 0.9);
  });

  const yaw = Math.cos(ph * TAU) * 0.22;
  const lx = -0.45 + yaw, ly = -0.52, lz = 0.72;
  const linv = 1 / Math.hypot(lx, ly, lz);
  const Lx = lx * linv, Ly = ly * linv, Lz = lz * linv;

  const { MW, MH, OX, OY } = mesh;
  for (let j = 0; j < MH; j++) {
    const dy = j - OY;
    for (let i = 0; i < MW; i++) {
      const dx = i - OX, k = j * MW + i;
      const d = mesh.sd[k];
      if (d < -1.4) continue;

      const pid = mesh.plateId[k], pl = mesh.plates[pid], pe = mesh.plateEdge[k];
      const diagA = dx * 0.82 + dy * 0.58 + (pl.tone * 4.2);
      const diagB = -dx * 0.7 + dy * 0.72 + (pl.tone * 3.8);
      const isLeftCrust = dx < -1.0 && dy < 13 && diagA < -1.0;
      const isRightCrust = dx > 3.0 && dy > -2 && diagB > 2.4;
      const hasCrust = isLeftCrust || isRightCrust;

      if (hasCrust) {
        const rimD = d + pl.rim - (pe < 0.9 ? 0.9 : 0);
        if (rimD < 0) continue;
        // Glowing neon-rose energy veins through heavy dark magnetite rock!
        if (pe < 0.55 + 0.24 * pulse) {
          p.px(dx, cy + dy, pulse > 0.55 ? WHITE : C[6]);
          if ((i + j) % 3 === 0) p.light(dx, cy + dy, C[5], 0.35 + 0.3 * pulse);
        } else {
          const nearCliff = (isLeftCrust && diagA > -3.4) || (isRightCrust && diagB < 4.8);
          const col = nearCliff && pe > 1.0 && rand(i, j) > 0.4
            ? C[4]
            : shadeCrustPx(mesh, k, Lx, Ly, Lz, S, 3); // maxStep=3 -> deep black-obsidian rock!
          p.px(dx, cy + dy, col);
        }
      } else {
        if (d < 0) continue;
        const centerGlow = clamp(1 - Math.hypot(dx - 2, dy + 1) / 18, 0, 1);
        const col = shadeCrystalPx(mesh, k, Lx, Ly, Lz, C, centerGlow * (0.28 + 0.38 * pulse));
        p.px(dx, cy + dy, col);
      }
    }
  }

  // Hot North cleft & South pole magnetic focal glow
  p.glow(2, cy - 2, 16 + 6 * pulse, C[5], 0.32 + 0.24 * pulse);
  p.glow(0, cy - 15, 10, C[6], 0.28 + 0.22 * pulse);
  if (pulse > 0.45) {
    const pk = (pulse - 0.45) / 0.55;
    sparkle(p, 0, cy - 14, Math.round(5 * pk), WHITE, C[6], 0.6 * pk);
    sparkle(p, 0, cy + 20, Math.round(5 * pk), WHITE, C[5], 0.5 * pk);
  }

  // Foreground orbiting magnetite ore chunks + snapping magnetic micro-arcs!
  for (let i = 0; i < ORES.length; i++) {
    if (i % 2 !== 0) continue;
    const ore = ORES[i];
    const R0 = ore.R0 - pulse * 5.2 + Math.cos(ph * TAU + ore.phase) * 1.5;
    const u = clamp(ore.u + Math.sin(ph * TAU + ore.phase) * 0.03, 0.08, 0.92);
    const [ox, oy] = fieldPt(0, cy, ore.side, R0, u);
    drawOreChunk(p, ox, oy, ore.r, ph * TAU + ore.phase, S, C[6], -ore.side, (cy - oy) * 0.04);
    p.glow(ox, oy, 7, C[4], 0.2 + 0.2 * pulse);

    if (pulse > 0.58 && (i === 0 || i === 6)) {
      const tx = ore.side * 12, ty = cy + (i === 0 ? -8 : 2);
      const mx = (ox + tx) * 0.5 + (rand(i, Math.floor(ph * 24)) - 0.5) * 6;
      const my = (oy + ty) * 0.5 - 3;
      p.line(ox, oy, mx, my, C[6], 0.85);
      p.line(mx, my, tx, ty, WHITE, 0.9);
    }
  }

  // Fast iron-filing sparkles streaming from North cleft over the arcs into South tip
  cycle(t, D, 20, o.seed + 73, 0.95, (age, life, r, idx) => {
    const u = age / life;
    const side = idx % 3 === 0 ? 1 : -1;
    const R0 = r.range(28, side < 0 ? 66 : 50) - pulse * 3;
    const [fx, fy] = fieldPt(0, cy, side, R0, u);
    p.dot(fx, fy, u > 0.78 || u < 0.15 ? WHITE : C[6], Math.sin(u * Math.PI));
  });

  // Near half of magnetic ground ripple
  for (const off of [0, 0.5]) {
    const bp = (ph + off) % 1;
    if (bp > 0.24 && bp < 0.72) {
      const ru = (bp - 0.24) / 0.48;
      band(p, 0, -1, 12 + 30 * ru, 0.18, 1.2, (1 - ru) * 0.8, [C[1], C[3], C[5], C[7]], (g) => Math.sin(g) >= 0);
    }
  }
}
