// Polar Heart (ЭСРЭГ ТЭСРЭГ ЗҮРХ — Disorganized / Fearful-Avoidant Attachment):
// Deep faceted glacier-ice left lobe and scorched volcanic-magma right lobe grind in push-pull shear,
// generating real-world Leidenfrost flash-boiled vapor plumes, licking fire tongues, sizzling meltwater & frost shards.

import { cycle, fit, sparkle, band, loopNoise, rand, clamp, lerp, TAU, WHITE } from "../../../src/core/index.js";
import { ICE, MAGMA, CRAG, getHeartMesh, shadeCrustPx, shadeCrystalPx, drawCragPedestal, drawOreChunk, drawSoftPuff } from "../_lib.js";

export const meta = {
  name: "Polar heart",
  desc: "A jagged glacier-ice half and a burning volcanic-magma half grind together in push-pull friction — erupting flash-boiled steam, sizzling meltwater, frost shards, and licking fire.",
  tags: ["polar", "heart", "attachment", "ice", "fire", "steam", "friction", "hover", "loop"],
  size: [168, 156],
  origin: [84, 142],
  duration: 3.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: MAGMA,
    ice: ICE,
    stone: CRAG,
    seed: 37,
  },
};

const D = meta.duration, BASE_CY = -57.5;

export function drawBack(p, t, o) {
  const F = fit(o.palette, 8), I = fit(o.ice, 8), S = fit(o.stone, 8);
  const ph = (t % D) / D;
  const cy = BASE_CY + Math.cos(ph * TAU) * 1.6;
  const clash = 0.5 + 0.5 * Math.cos(ph * TAU * 2);

  // Split elemental aura: freezing cyan-blue on the left, searing volcanic orange on the right
  p.glow(-15, cy, 36, I[4], 0.28);
  p.glow(16, cy, 40, F[4], 0.34);
  p.glow(-14, -7, 28, I[4], 0.24);
  p.glow(14, -7, 28, F[4], 0.26);
  p.glow(0, cy - 18, 28, WHITE, 0.14 + 0.1 * clash);

  // Soft billowing Leidenfrost steam plume rising out of the central collision cleft!
  cycle(t, D, 18, o.seed + 11, 1.45, (age, life, r) => {
    const u = age / life;
    const x = r.range(-4, 4) + Math.sin(u * 6 + r.next() * 5) * (2.5 + u * 7);
    const y = cy - 13 - u * 44;
    const rad = lerp(3.0, 8.2, Math.pow(u, 0.72));
    const density = Math.sin(u * Math.PI) * 0.62;
    if (x < 0) drawSoftPuff(p, x, y, rad, WHITE, I[6], I[3], density);
    else drawSoftPuff(p, x, y, rad, WHITE, F[7], S[4], density);
  });

  // Wispy sinking glacier frost mist off the left lobe
  cycle(t, D, 12, o.seed + 29, 1.35, (age, life, r) => {
    const u = age / life;
    const x = r.range(-26, -8) - u * 7;
    const y = cy + r.range(-12, 12) + u * 24;
    if (y < -6) drawSoftPuff(p, x, y, lerp(2.4, 5.2, u), I[6], I[4], I[2], Math.sin(u * Math.PI) * 0.45);
  });

  // Roaring tapered volcanic flames curling up the entire outer right rim of the magma half!
  cycle(t, D, 26, o.seed + 43, 0.72, (age, life, r) => {
    const u = age / life;
    const rimT = r.next(); // 0 = lower-right cheek, 1 = upper-right crown
    const sx = lerp(6, 21, Math.sin(rimT * Math.PI * 0.85));
    const sy = cy + lerp(16, -16, rimT);
    const x = sx + Math.sin(u * 10 + r.next() * 6) * 2.2 + u * 3.5;
    const y = sy - u * 20;
    const rad = (1 - u * 0.85) * r.range(2.2, 4.2);
    if (u < 0.35) drawSoftPuff(p, x, y, rad, WHITE, F[6], F[4], 0.9);
    else drawSoftPuff(p, x, y, rad, F[5], F[4], F[2], (1 - u) * 0.85);
    if (u < 0.4) p.glow(x, y, 7, F[5], 0.18 * (1 - u));
  });
}

export function draw(p, t, o) {
  const F = fit(o.palette, 8), I = fit(o.ice, 8), S = fit(o.stone, 8);
  const mesh = getHeartMesh(o.seed);
  const ph = (t % D) / D;
  const cy = BASE_CY + Math.cos(ph * TAU) * 1.6;
  const shear = Math.cos(ph * TAU * 2) * 1.15;

  drawCragPedestal(p, o.seed, S, I[6], F[5], 0.88);

  const yaw = Math.cos(ph * TAU) * 0.18;
  const lx = -0.42 + yaw, ly = -0.54, lz = 0.72;
  const linv = 1 / Math.hypot(lx, ly, lz);
  const Lx = lx * linv, Ly = ly * linv, Lz = lz * linv;

  const { MW, MH, OX, OY } = mesh;
  const firePulse = 0.5 + 0.5 * Math.cos(ph * TAU * 2 + 0.9);

  for (let j = 0; j < MH; j++) {
    const dy = j - OY;
    const fx = mesh.fault[j];
    for (let i = 0; i < MW; i++) {
      const dx = i - OX;
      const isIce = dx < fx;
      const sy = clamp(Math.round(j + (isIce ? shear : -shear)), 0, MH - 1);
      const k = sy * MW + i;
      const d = mesh.sd[k];
      if (d < -2.6) continue;

      const pid = mesh.plateId[k], pl = mesh.plates[pid], pe = mesh.plateEdge[k];
      const faultDist = Math.abs(dx - fx);

      if (faultDist < 1.35 && d > 0.2) {
        // Sizzling Leidenfrost contact seam where glacier ice flash-boils against molten magma!
        const sizzle = loopNoise((ph * 3 + dy * 0.04 + 10) % 1, 2.2, o.seed + j);
        const col = sizzle > 0.1 ? WHITE : dx < fx ? I[6] : F[6];
        p.px(dx, cy + dy, col);
        if (j % 2 === 0) p.light(dx, cy + dy, sizzle > 0 ? I[5] : F[5], 0.48);
        continue;
      }

      if (isIce) {
        // Sculpted deep sapphire-to-cyan glacier facets (rich blue midtones + crisp white frost ridges!)
        const spire = dx < -10 ? Math.max(0, (rand(pid, j >> 1) - 0.45) * 3.4) : 0.4;
        if (d + spire < 0) continue;
        const seamHeat = clamp(1 - faultDist / 5.5, 0, 1) * 0.28;
        let col = shadeCrystalPx(mesh, k, Lx, Ly, Lz, I, -0.14 + seamHeat);
        if (pe < 0.52 && d > 1.5) col = I[6];
        p.px(dx, cy + dy, col);
      } else {
        // Dark scorched volcanic basalt crust split by blazing lava fissures!
        const rimD = d + pl.rim - (pe < 0.9 ? 0.8 : 0);
        if (rimD < 0) continue;
        const crackW = 0.78 + firePulse * 0.38 + clamp(1 - faultDist / 8, 0, 1) * 0.38;
        if (pe < crackW) {
          const hot = clamp((1 - pe / crackW) * (0.85 + 0.35 * firePulse), 0, 1);
          const ci = clamp(Math.round(hot * 7), 3, 7);
          p.px(dx, cy + dy, hot > 0.84 ? WHITE : F[ci]);
          if ((i + j) % 2 === 0) p.light(dx, cy + dy, F[5], 0.32);
        } else {
          let col = shadeCrustPx(mesh, k, Lx, Ly, Lz, S, 3);
          if (pe < crackW + 0.85) col = F[3];
          p.px(dx, cy + dy, col);
        }
      }
    }
  }

  // Angular floating ice crystals / diamond frost fragments popping off the left glacier lobe!
  for (let c = 0; c < 6; c++) {
    const ang = ph * TAU + c * 1.1;
    const ox = -26 - (c % 3) * 5.5 + Math.cos(ang) * 2.2;
    const oy = cy - 15 + c * 6.4 + Math.sin(ang) * 2.0;
    drawOreChunk(p, ox, oy, 1.7 + (c % 2) * 0.85, ang, I, WHITE, 1, 0);
  }

  // Foreground licking fire tongues & embers rising off the right magma lobe
  cycle(t, D, 20, o.seed + 61, 0.72, (age, life, r, idx) => {
    const u = age / life;
    const rimT = r.next();
    const sx = lerp(6, 22, Math.sin(rimT * Math.PI * 0.85));
    const sy = cy + lerp(16, -15, rimT);
    const x = sx + Math.sin(u * 9 + r.next() * 6) * 2.2 + u * 3;
    const y = sy - u * 22;
    if (idx % 2 === 0 && u < 0.65) {
      drawSoftPuff(p, x, y, (1 - u * 0.8) * 3.0, u < 0.25 ? WHITE : F[6], F[5], F[3], (1 - u) * 0.85);
    } else {
      p.dot(x, y, u < 0.28 ? WHITE : u < 0.65 ? F[6] : F[4], 1 - u * 0.55);
    }
  });

  // Foreground Leidenfrost steam wisps & sideways thermal-shock sparks along the central fault!
  cycle(t, D, 14, o.seed + 79, 0.95, (age, life, r, idx) => {
    const u = age / life;
    const sy = cy + r.range(-15, 16);
    if (idx % 3 === 0) {
      const dir = idx % 2 === 0 ? -1 : 1;
      const x = dir * (2 + u * r.range(10, 22));
      const y = sy - u * 8 + u * u * 10;
      p.dot(x, y, u < 0.35 ? WHITE : dir < 0 ? I[6] : F[6], 1 - u);
    } else {
      const x = r.range(-2.5, 2.5) + Math.sin(u * 7 + idx) * (2 + u * 4.5);
      const y = sy - u * 25;
      drawSoftPuff(p, x, y, lerp(1.8, 4.4, u), WHITE, x < 0 ? I[6] : F[7], S[4], Math.sin(u * Math.PI) * 0.55);
    }
  });

  // Sizzling meltwater droplets dripping onto the crag altar -> instant flash-boiled steam ring!
  cycle(t, D, 5, o.seed + 97, 1.2, (age, life, r) => {
    const u = age / life, tx = r.range(-3, 3);
    if (u < 0.52) {
      const fu = u / 0.52;
      const y = lerp(cy + 20, -9, fu * fu);
      p.px(tx, y, WHITE);
      p.px(tx, y - 1, I[5]);
    } else {
      const su = (u - 0.52) / 0.48;
      band(p, tx, -8, 2 + 12 * su, 0.25, 1.1, (1 - su) * 0.85, [I[4], I[6], F[6], WHITE]);
      if (su < 0.3) sparkle(p, tx, -9, 3, WHITE, F[6], (1 - su / 0.3) * 0.45);
    }
  });
}
