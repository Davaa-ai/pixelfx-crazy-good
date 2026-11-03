// Radiant Bloom (One-Shot): a closed dark obsidian-and-garnet stone heart warms from within, gently
// parting open into a sunlit cradle around a faceted golden sunstone core in cathedral god-rays.

import { Particles, Lights, P, Rng, rand, fit, sparkle, flare, band, clamp, smooth, lerp, ease, TAU, WHITE } from "../../../src/core/index.js";
import { SUN, CRAG, GARNET, getHeartMesh, shadeCrustPx, shadeCrystalPx, drawOreChunk } from "../_lib.js";

export const meta = {
  name: "Radiant bloom",
  desc: "Warm sunstone light swells inside a dark stone heart, gently parting its garnet-lined shell into an open cradle bathed in golden cathedral god-rays.",
  tags: ["luminous", "heart", "attachment", "secure", "bloom", "radiant", "gold", "one-shot"],
  size: [184, 184],
  origin: [92, 166],
  duration: 2.9,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: SUN,
    garnet: GARNET,
    stone: CRAG,
    seed: 59,
  },
};

const CY = -58, BLOOM_T = 0.78;

export function create(o) {
  const G = fit(o.palette, 8), Rm = fit(o.garnet, 8), S = fit(o.stone, 8), R = new Rng(o.seed);
  const mesh = getHeartMesh(o.seed);
  const floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, G[6], G[5], Rm[5]] });
  const lights = new Lights();
  let t = 0, bloomed = false;

  const pebbles = [
    { x: -16, tx: -32, y: -6, r: 2.3 },
    { x: -14, tx: -28, y: 10, r: 1.8 },
    { x:  16, tx:  32, y: -5, r: 2.4 },
    { x:  14, tx:  28, y: 11, r: 1.9 },
  ];

  return {
    update(dt) {
      t += dt;
      if (!bloomed && t >= BLOOM_T) {
        bloomed = true;
        lights.add(0, CY, 82, G[5], 1.0, 0.65);
        lights.add(0, CY, 38, WHITE, 1.0, 0.22);
        for (let i = 0; i < 24; i++) {
          const a = R.range(0, TAU), sp = R.range(35, 110);
          ps.spawn(P.MOTE, Math.cos(a) * 8, CY + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp - 22, R.range(0.55, 1.15), i % 4 === 0 ? Rm[5] : G[6], 1.0);
        }
      }
      if (t >= BLOOM_T && t < 1.78 && R.chance(0.55)) {
        ps.spawn(P.EMBER, R.range(-24, 24), R.range(-10, -3), R.range(-8, 8), -R.range(20, 42), R.range(0.5, 0.92), G[6]);
      }

      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration) return;
      const rayAmt = smooth(BLOOM_T - 0.1, BLOOM_T + 0.25, t) * (1 - smooth(2.15, 2.82, t));
      if (rayAmt > 0.02) {
        p.glow(0, CY, 52 * rayAmt, G[5], 0.36 * rayAmt);
        p.glow(0, -4, 38 * rayAmt, G[5], 0.26 * rayAmt);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU - Math.PI / 2 + t * 0.12;
          const upBias = 0.65 + 0.35 * Math.max(0, -Math.sin(a));
          const len = (36 + (i % 3) * 11) * upBias * rayAmt;
          for (let s = 14; s < len; s += 1.6) {
            const u = (s - 14) / Math.max(1, len - 14);
            p.dot(Math.cos(a) * s, CY + Math.sin(a) * s, u < 0.35 ? G[7] : G[5], (1 - u) * (1 - u) * rayAmt * 0.72);
          }
        }
      }

      if (t >= BLOOM_T && t < BLOOM_T + 0.65) {
        const u = (t - BLOOM_T) / 0.65;
        band(p, 0, 0, 10 + 44 * ease.outCubic(u), 0.19, 1.8 * (1 - u), 1 - u, [Rm[4], G[4], G[6], WHITE], (g) => Math.sin(g) < 0, u < 0.2);
      }
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration) return;
      const grow = ease.outBack(clamp(t / 0.35), 1.4);
      const fade = 1 - smooth(2.2, 2.84, t);
      // Shell parts smoothly from closed (openW = 0) to wide open cradle (openW = 12.2)!
      const part = ease.outCubic(clamp((t - (BLOOM_T - 0.18)) / 0.42));

      if (fade > 0.02) {
        const flash = t >= BLOOM_T && t < BLOOM_T + 0.05;
        const { MW, MH, OX, OY } = mesh;
        const yaw = Math.sin(t * 2.2) * 0.25;
        const lx = -0.25 + yaw, ly = -0.46, lz = 0.85;
        const inv = 1 / Math.hypot(lx, ly, lz);
        const Lx = lx * inv, Ly = ly * inv, Lz = lz * inv;

        for (let j = 0; j < MH; j++) {
          const dy = j - OY;
          for (let i = 0; i < MW; i++) {
            const dx = i - OX, k = j * MW + i;
            const d = mesh.sd[k] - (1 - grow) * 18;
            if (d < 0) continue;
            if (fade < 0.99 && rand(i, j, 7) > fade) continue;
            if (flash) { p.px(dx, CY + dy, WHITE); continue; }

            const pid = mesh.plateId[k], pl = mesh.plates[pid], pe = mesh.plateEdge[k];
            const inOpenCrown = dy < -7 && Math.abs(dx) < 12.5 - (dy + 7) * 0.4;
            const closedFill = (1 - part) * 24;
            const shellW = (inOpenCrown ? closedFill : (4.6 + pl.tone * 1.5) * clamp((Math.abs(dx) - 2.5) / 8, 0, 1) + closedFill);
            const garnetW = shellW + 2.4 * part;

            if (d < shellW) {
              const preGlow = smooth(0.32, BLOOM_T, t);
              p.px(dx, CY + dy, pe < 0.55 + preGlow * 0.45 ? G[5] : shadeCrustPx(mesh, k, Lx, Ly, Lz, S, 3));
            } else if (d < garnetW && part > 0.15) {
              p.px(dx, CY + dy, Rm[4]);
            } else {
              const focal = clamp(1 - Math.hypot(dx * 0.95, dy - 2) / 13.5, 0, 1);
              let col = shadeCrystalPx(mesh, k, Lx, Ly, Lz, G, -0.05 + focal * 0.52);
              if (focal > 0.78) col = WHITE;
              p.px(dx, CY + dy, col);
            }
          }
        }

        if (part > 0.5) {
          sparkle(p, 2, CY + 2, Math.round(6 * fade), WHITE, G[6], 0.5 * fade);
        }
      }

      // Peacefully drifting pebbles parting outward with the opening cradle
      if (t >= BLOOM_T && fade > 0.15) {
        const pu = ease.outCubic(clamp((t - BLOOM_T) / 0.7));
        for (const pb of pebbles) {
          const px = lerp(pb.x, pb.tx, pu);
          const py = CY + pb.y + Math.sin(t * 3 + pb.tx) * 2;
          drawOreChunk(p, px, py, pb.r * fade, t, S, G[6], -Math.sign(px), 0);
        }
      }

      if (t >= BLOOM_T && t < BLOOM_T + 0.22) {
        const fk = 1 - (t - BLOOM_T) / 0.22;
        flare(p, 0, CY, 28 * fk, fk, G);
      }
      if (t >= BLOOM_T && t < BLOOM_T + 0.65) {
        const u = (t - BLOOM_T) / 0.65;
        band(p, 0, 0, 10 + 44 * ease.outCubic(u), 0.19, 1.8 * (1 - u), 1 - u, [Rm[4], G[4], G[6], WHITE], (g) => Math.sin(g) >= 0, u < 0.2);
      }

      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
