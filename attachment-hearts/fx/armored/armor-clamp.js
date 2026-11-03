// Armor Clamp (One-Shot): an exposed, vulnerably glowing crimson heart feels threatened — heavy dark
// forged-iron plates fly inward from all sides and slam shut around it, cinching tight with bronze wire.

import { Particles, Bits, Lights, P, B, Rng, rand, fit, sparkle, flare, band, clamp, smooth, lerp, ease, TAU, WHITE } from "../../../src/core/index.js";
import { EMBER, CRAG, BRONZE, getHeartMesh, shadeCrustPx, shadeCrystalPx, drawWireStitches, drawOreChunk } from "../_lib.js";

export const meta = {
  name: "Armor clamp",
  desc: "A vulnerably open crimson ember heart suddenly armors itself — heavy forged-iron plates slam shut from all sides and cinch tight with bronze wire stitches.",
  tags: ["armored", "heart", "attachment", "avoidant", "clamp", "shield", "iron", "one-shot"],
  size: [176, 156],
  origin: [88, 140],
  duration: 2.8,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: EMBER,
    armor: CRAG,
    wire: BRONZE,
    seed: 29,
  },
};

const CY = -58, SLAM_T = 0.88;

export function create(o) {
  const E = fit(o.palette, 8), S = fit(o.armor, 8), W = fit(o.wire, 8), R = new Rng(o.seed);
  const mesh = getHeartMesh(o.seed);
  const floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, W[6], E[6], E[4]] });
  const bits = new Bits({ ground: floor }), lights = new Lights();
  let t = 0, slammed = false;

  const platesIn = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * TAU;
    return { a, dist: R.range(42, 62), r: R.range(3.5, 5.2), rot: R.range(0, TAU) };
  });

  return {
    update(dt) {
      t += dt;
      // Warm embers rising while heart is still vulnerably open
      if (t > 0.1 && t < SLAM_T && R.chance(0.5)) {
        ps.spawn(P.EMBER, R.range(-14, 14), CY + R.range(-12, 12), R.range(-12, 12), -R.range(18, 38), R.range(0.4, 0.7), E[6]);
      }

      if (!slammed && t >= SLAM_T) {
        slammed = true;
        lights.add(0, CY, 68, E[5], 0.95, 0.36);
        lights.add(0, CY, 32, WHITE, 1.0, 0.12);
        const ironRamp = [S[0], S[1], S[3], W[5], WHITE];
        for (let i = 0; i < 10; i++) {
          const a = R.range(0, TAU), sp = R.range(45, 120);
          bits.add({
            kind: B.CHUNK,
            x: Math.cos(a) * 16, y: CY + Math.sin(a) * 16,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 18,
            a: R.range(0, TAU), va: R.range(-11, 11),
            s: R.range(1.4, 2.3), ramp: ironRamp,
            g: 0.95, drag: 0.55, bounce: 0.3, life: R.range(0.85, 1.45),
          });
        }
        for (let i = 0; i < 24; i++) {
          const a = R.range(0, TAU), sp = R.range(70, 180);
          ps.spawn(P.SPARK, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp - 10, R.range(0.2, 0.45));
        }
        for (let i = 0; i < 8; i++) {
          ps.spawn(P.SMOKE, R.range(-14, 14), CY + R.range(-10, 10), R.range(-25, 25), -R.range(12, 28), R.range(0.8, 1.3), S[2], R.range(3.2, 5.2));
        }
      }

      bits.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration) return;
      const fade = 1 - smooth(2.15, 2.74, t);
      const openGlow = t < SLAM_T ? ease.outCubic(clamp(t / 0.35)) : 0.25 * fade;
      p.glow(0, CY, 44, E[4], 0.38 * openGlow);
      p.glow(0, -3, 30, E[3], 0.22 * openGlow);

      if (t >= SLAM_T && t < SLAM_T + 0.42) {
        const u = (t - SLAM_T) / 0.42;
        band(p, 0, 0, 8 + 40 * ease.outQuart(u), 0.19, 2.0 * (1 - u), 1 - u, [S[2], W[4], E[5], WHITE], (g) => Math.sin(g) < 0, u < 0.2);
      }
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration) return;
      const grow = ease.outBack(clamp(t / 0.34), 1.5);
      const fade = 1 - smooth(2.15, 2.74, t);
      const slamDrop = t >= SLAM_T && t < SLAM_T + 0.22 ? Math.sin(((t - SLAM_T) / 0.22) * Math.PI) * 3.0 : 0;
      const cy = CY + slamDrop;

      if (fade > 0.02) {
        const flash = t >= SLAM_T && t < SLAM_T + 0.05;
        const armored = t >= SLAM_T;
        const { MW, MH, OX, OY } = mesh;
        const Lx = -0.5, Ly = -0.56, Lz = 0.66;

        for (let j = 0; j < MH; j++) {
          const dy = j - OY;
          for (let i = 0; i < MW; i++) {
            const dx = i - OX, k = j * MW + i;
            const d = mesh.sd[k] - (1 - grow) * 18;
            if (d < 0) continue;
            if (fade < 0.99 && rand(i, j, 5) > fade) continue;
            if (flash) { p.px(dx, cy + dy, WHITE); continue; }

            if (!armored) {
              // Phase 1: Vulnerably open, radiant crimson-ember crystal heart!
              const pulse = 0.5 + 0.5 * Math.sin(t * 16);
              const cg = clamp(1 - Math.hypot(dx, dy) / 19, 0, 1);
              p.px(dx, cy + dy, shadeCrystalPx(mesh, k, Lx, Ly, Lz, E, cg * (0.35 + 0.3 * pulse)));
            } else {
              // Phase 2: Locked tight in forged-iron tectonic armor with guarded Y-fissure!
              const pe = mesh.plateEdge[k];
              const fz = clamp(1 - Math.hypot((dx - 4.5) * 0.9, (dy + 1) * 0.78) / 10.5, 0, 1);
              if (fz > 0.15 && pe < 0.6 + fz * 0.9) {
                p.px(dx, cy + dy, E[5]);
              } else if (pe < 0.5) {
                p.px(dx, cy + dy, S[0]);
              } else {
                p.px(dx, cy + dy, shadeCrustPx(mesh, k, Lx, Ly, Lz, S, 4));
              }
            }
          }
        }

        if (armored && fade > 0.35) {
          drawWireStitches(p, 0, cy, mesh, W, t * 0.5, 0);
          if (t < SLAM_T + 0.35) {
            const sk = 1 - (t - SLAM_T) / 0.35;
            for (const st of mesh.stitches) sparkle(p, st.x, cy + st.y, Math.round(5 * sk), WHITE, W[6], 0.55 * sk);
          }
        }
      }

      // Incoming dark iron plates rushing in to clamp around the vulnerable heart!
      if (t >= 0.50 && t < SLAM_T) {
        const u = ease.inQuart((t - 0.50) / (SLAM_T - 0.50));
        for (const pl of platesIn) {
          const rad = lerp(pl.dist, 12, u);
          const x = Math.cos(pl.a) * rad, y = cy + Math.sin(pl.a) * rad * 0.9;
          drawOreChunk(p, x, y, pl.r, pl.rot + u * 2, S, E[5], -Math.cos(pl.a), -Math.sin(pl.a));
        }
      }

      if (t >= SLAM_T && t < SLAM_T + 0.16) {
        const fk = 1 - (t - SLAM_T) / 0.16;
        flare(p, 4, cy, 22 * fk, fk, W);
      }
      if (t >= SLAM_T && t < SLAM_T + 0.42) {
        const u = (t - SLAM_T) / 0.42;
        band(p, 0, 0, 8 + 40 * ease.outQuart(u), 0.19, 2.0 * (1 - u), 1 - u, [S[2], W[4], E[5], WHITE], (g) => Math.sin(g) >= 0, u < 0.2);
      }

      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
