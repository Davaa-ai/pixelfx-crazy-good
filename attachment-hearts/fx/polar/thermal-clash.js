// Thermal Clash (One-Shot): a freezing glacier-ice half-heart and a burning volcanic-magma half-heart
// rush together and collide — erupting a violent Leidenfrost steam column, shattered ice shards & lava chunks!

import { Particles, Bits, Lights, P, B, Rng, rand, fit, flare, band, clamp, smooth, lerp, ease, TAU, WHITE } from "../../../src/core/index.js";
import { ICE, MAGMA, CRAG, getHeartMesh, shadeCrustPx, shadeCrystalPx, drawSoftPuff } from "../_lib.js";

export const meta = {
  name: "Thermal clash",
  desc: "A freezing glacier half-heart and a burning magma half-heart slam together, erupting a violent flash-boiled steam plume, shattering ice shards, and lava rocks.",
  tags: ["polar", "heart", "attachment", "clash", "ice", "fire", "steam", "one-shot"],
  size: [188, 160],
  origin: [94, 144],
  duration: 2.9,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: MAGMA,
    ice: ICE,
    stone: CRAG,
    seed: 41,
  },
};

const CY = -56, HIT_T = 0.68;

export function create(o) {
  const F = fit(o.palette, 8), I = fit(o.ice, 8), S = fit(o.stone, 8), R = new Rng(o.seed);
  const mesh = getHeartMesh(o.seed);
  const floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, I[6], F[6], F[4]] });
  const bits = new Bits({ ground: floor }), lights = new Lights();
  let t = 0, hit = false;

  return {
    update(dt) {
      t += dt;
      if (!hit && t >= HIT_T) {
        hit = true;
        lights.add(-12, CY, 54, I[5], 0.9, 0.45);
        lights.add(12, CY, 58, F[5], 0.95, 0.45);
        lights.add(0, CY, 38, WHITE, 1.0, 0.16);

        const iceRamp = [I[1], I[3], I[5], I[7], WHITE];
        const lavaRamp = [S[0], F[2], F[4], F[6], WHITE];

        // Shattered glacier ice shards flying left & bouncing on ground
        for (let i = 0; i < 11; i++) {
          const a = Math.PI + R.range(-1.1, 1.1), sp = R.range(55, 145);
          bits.add({
            kind: B.SHARD,
            x: -6 + R.range(-5, 2), y: CY + R.range(-12, 12),
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 28,
            a: R.range(0, TAU), va: R.range(-14, 14),
            s: R.range(1.7, 2.7), ramp: iceRamp,
            g: 0.9, drag: 0.5, bounce: 0.38, life: R.range(1.0, 1.65),
          });
        }
        // Molten volcanic chunks flying right & bouncing on ground
        for (let i = 0; i < 11; i++) {
          const a = R.range(-1.1, 1.1), sp = R.range(55, 145);
          bits.add({
            kind: B.CHUNK,
            x: 6 + R.range(-2, 5), y: CY + R.range(-12, 12),
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 28,
            a: R.range(0, TAU), va: R.range(-11, 11),
            s: R.range(1.6, 2.6), ramp: lavaRamp,
            g: 0.92, drag: 0.55, bounce: 0.3, life: R.range(1.0, 1.65),
          });
        }
        // Violent flash-boiled white steam column shooting skyward!
        for (let i = 0; i < 16; i++) {
          ps.spawn(P.SMOKE, R.range(-5, 5), CY + R.range(-14, 14), R.range(-22, 22), -R.range(32, 78), R.range(0.9, 1.55), i % 2 ? I[6] : F[7], R.range(3.5, 6.2));
        }
        for (let i = 0; i < 26; i++) {
          const a = R.range(0, TAU), sp = R.range(70, 185);
          ps.spawn(P.SPARK, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp - 20, R.range(0.22, 0.5));
        }
      }

      // Continuous steam hissing along the grinding seam while locked together
      if (t >= HIT_T && t < 1.95 && R.chance(0.55)) {
        ps.spawn(P.SMOKE, R.range(-3, 3), CY - 12, R.range(-12, 12), -R.range(24, 48), R.range(0.5, 0.85), WHITE, R.range(2.6, 4.4));
      }

      bits.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration) return;
      if (t >= HIT_T && t < HIT_T + 0.48) {
        const u = (t - HIT_T) / 0.48;
        band(p, 0, 0, 10 + 48 * ease.outQuart(u), 0.19, 2.2 * (1 - u), 1 - u, [I[4], I[6], F[5], WHITE], (g) => Math.sin(g) < 0, u < 0.22);
      }
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration) return;
      const fade = 1 - smooth(2.15, 2.82, t);
      if (fade > 0.02) {
        // Approach from opposite sides -> slam at HIT_T -> push-pull recoil vibration!
        let sep = 0;
        if (t < HIT_T) {
          sep = lerp(42, 0, ease.inCubic(t / HIT_T));
        } else {
          const age = t - HIT_T;
          sep = Math.exp(-age * 5) * Math.abs(Math.sin(age * 26)) * 4.5 + smooth(1.9, 2.75, t) * 12;
        }
        const flash = t >= HIT_T && t < HIT_T + 0.06;
        const { MW, MH, OX, OY } = mesh;
        const Lx = -0.42, Ly = -0.54, Lz = 0.72;

        for (let j = 0; j < MH; j++) {
          const dy = j - OY, fx = mesh.fault[j];
          for (let i = 0; i < MW; i++) {
            const dx = i - OX, k = j * MW + i;
            if (mesh.sd[k] < 0) continue;
            if (fade < 0.99 && rand(i, j, 9) > fade) continue;

            const isIce = dx < fx;
            const wx = dx + (isIce ? -sep : sep);
            if (flash) { p.px(wx, CY + dy, WHITE); continue; }

            if (sep < 2 && Math.abs(dx - fx) < 1.4) {
              p.px(wx, CY + dy, WHITE);
              continue;
            }
            if (isIce) {
              p.px(wx, CY + dy, shadeCrystalPx(mesh, k, Lx, Ly, Lz, I, -0.1));
            } else {
              const pe = mesh.plateEdge[k];
              p.px(wx, CY + dy, pe < 0.95 ? F[6] : shadeCrustPx(mesh, k, Lx, Ly, Lz, S, 3));
            }
          }
        }

        // Dense boiling white steam puffs at the seam right after impact
        if (t >= HIT_T && t < 1.85) {
          const stA = (1 - smooth(1.2, 1.85, t)) * 0.7;
          drawSoftPuff(p, 0, CY - 18 - ((t - HIT_T) * 18) % 16, 5.5, WHITE, I[6], S[4], stA);
        }
      }

      if (t >= HIT_T && t < HIT_T + 0.2) {
        const fk = 1 - (t - HIT_T) / 0.2;
        flare(p, 0, CY, 28 * fk, fk, F);
      }
      if (t >= HIT_T && t < HIT_T + 0.48) {
        const u = (t - HIT_T) / 0.48;
        band(p, 0, 0, 10 + 48 * ease.outQuart(u), 0.19, 2.2 * (1 - u), 1 - u, [I[4], I[6], F[5], WHITE], (g) => Math.sin(g) >= 0, u < 0.22);
      }

      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
