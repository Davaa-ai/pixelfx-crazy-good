// Magnetic Surge (One-Shot): scattered magnetite ore chunks are wrenched skyward along whipping dipole
// flux lines to lock onto a blazing rose-quartz heart core in an electric rose-gold shockwave.

import { Particles, Bits, Lights, P, B, Rng, rand, fit, sparkle, flare, band, clamp, smooth, lerp, ease, TAU, WHITE } from "../../../src/core/index.js";
import { ROSE, CRAG, getHeartMesh, shadeCrustPx, shadeCrystalPx, drawOreChunk, dipolePoint } from "../_lib.js";

export const meta = {
  name: "Magnetic surge",
  desc: "Dipole flux lines whip wide from an awakening rose-quartz heart, wrenching scattered magnetite boulders inward to lock onto its flanks in an electric burst.",
  tags: ["magnetic", "heart", "attachment", "pull", "surge", "crystal", "dipole", "one-shot"],
  size: [180, 160],
  origin: [90, 144],
  duration: 2.8,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ROSE,
    stone: CRAG,
    seed: 17,
  },
};

const CY = -58, SNAP_T = 0.95;

export function create(o) {
  const C = fit(o.palette, 8), S = fit(o.stone, 8), R = new Rng(o.seed);
  const mesh = getHeartMesh(o.seed);
  const floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[6], C[5], C[3]] });
  const bits = new Bits({ ground: floor }), lights = new Lights();
  let t = 0, snapped = false;

  const incoming = Array.from({ length: 10 }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    return {
      sx: side * R.range(34, 68),
      sy: R.range(-8, -2),
      tx: side * R.range(8, 17),
      ty: CY + R.range(-14, 12),
      arcR: R.range(38, 62),
      side,
      r: R.range(2.4, 4.0),
      rot: R.range(0, TAU),
    };
  });

  return {
    update(dt) {
      t += dt;
      if (t < SNAP_T && R.chance(0.65)) {
        const a = R.range(0, TAU), rad = R.range(28, 56);
        ps.spawn(P.MOTE, Math.cos(a) * rad, CY + Math.sin(a) * rad * 0.8, -Math.cos(a) * 55, -Math.sin(a) * 55, R.range(0.25, 0.45), C[6], 0.85);
      }

      if (!snapped && t >= SNAP_T) {
        snapped = true;
        lights.add(0, CY, 74, C[5], 1.0, 0.48);
        lights.add(0, CY, 34, WHITE, 1.0, 0.14);
        const stoneRamp = [S[0], S[1], S[3], C[5], C[7]];
        for (let i = 0; i < 12; i++) {
          const a = R.range(0, TAU), sp = R.range(50, 130);
          bits.add({
            kind: B.CHUNK,
            x: Math.cos(a) * 14, y: CY + Math.sin(a) * 14,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 24,
            a: R.range(0, TAU), va: R.range(-10, 10),
            s: R.range(1.5, 2.4), ramp: stoneRamp,
            g: 0.9, drag: 0.6, bounce: 0.32, life: R.range(0.9, 1.55),
          });
        }
        for (let i = 0; i < 26; i++) {
          const a = R.range(0, TAU), sp = R.range(65, 175);
          ps.spawn(P.SPARK, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp - 15, R.range(0.22, 0.5));
        }
      }

      bits.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration) return;
      const alive = ease.outCubic(clamp(t / 0.35)) * (1 - smooth(2.15, 2.75, t));
      if (alive <= 0.01) return;

      p.glow(0, CY, 44 * alive, C[4], 0.3 * alive);
      p.glow(0, -3, 34 * alive, C[4], 0.22 * alive);

      // Whipping dipole field arcs
      if (t > 0.15 && t < 2.45) {
        const fa = smooth(0.15, 0.45, t) * (1 - smooth(1.95, 2.45, t));
        for (const side of [-1, 1]) {
          for (const R0 of [34, 48, 60]) {
            for (let i = 0; i < 36; i++) {
              const u = (i / 36 + t * 0.7) % 1;
              const [fx, fy] = dipolePoint(0, CY, side, R0 * (0.7 + 0.3 * fa), u);
              p.dot(fx, fy, i % 5 === 0 ? C[6] : C[4], Math.sin(u * Math.PI) * fa * 0.75);
            }
          }
        }
      }

      if (t >= SNAP_T && t < SNAP_T + 0.48) {
        const u = (t - SNAP_T) / 0.48;
        band(p, 0, 0, 10 + 44 * ease.outQuart(u), 0.19, 2.0 * (1 - u), 1 - u, [C[2], C[4], C[6], WHITE], (g) => Math.sin(g) < 0, u < 0.2);
      }
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration) return;
      const grow = ease.outBack(clamp(t / 0.38), 1.4);
      const fade = 1 - smooth(2.15, 2.74, t);
      const scale = grow * (0.65 + 0.35 * fade);

      // Draw the rose-quartz core + locking magnetite crust (crust appears at SNAP_T!)
      if (fade > 0.02) {
        const flash = t >= SNAP_T && t < SNAP_T + 0.06;
        const hasArmor = t >= SNAP_T;
        const { MW, MH, OX, OY } = mesh;
        const Lx = -0.42, Ly = -0.52, Lz = 0.74;

        for (let j = 0; j < MH; j++) {
          const dy = j - OY;
          for (let i = 0; i < MW; i++) {
            const dx = i - OX, k = j * MW + i;
            const d = mesh.sd[k] - (1 - scale) * 18;
            if (d < 0) continue;
            if (fade < 0.99 && rand(i, j, 3) > fade) continue;

            if (flash) { p.px(dx, CY + dy, WHITE); continue; }

            const pid = mesh.plateId[k], pl = mesh.plates[pid], pe = mesh.plateEdge[k];
            const diagA = dx * 0.82 + dy * 0.58 + pl.tone * 4.2;
            const diagB = -dx * 0.7 + dy * 0.72 + pl.tone * 3.8;
            const onCrust = hasArmor && ((dx < -1 && dy < 13 && diagA < -1) || (dx > 3 && dy > -2 && diagB > 2.4));

            if (onCrust) {
              p.px(dx, CY + dy, pe < 0.65 ? C[6] : shadeCrustPx(mesh, k, Lx, Ly, Lz, S, 3));
            } else {
              const cg = clamp(1 - Math.hypot(dx - 2, dy + 1) / 18, 0, 1);
              p.px(dx, CY + dy, shadeCrystalPx(mesh, k, Lx, Ly, Lz, C, cg * 0.45));
            }
          }
        }
      }

      // Incoming magnetite boulders flying from the ground along dipole arcs to slam into the heart!
      if (t > 0.12 && t < SNAP_T) {
        const u = ease.inCubic(clamp((t - 0.12) / (SNAP_T - 0.12)));
        for (const m of incoming) {
          const [arcX, arcY] = dipolePoint(0, CY, m.side, m.arcR, lerp(0.85, 0.35, u));
          const x = lerp(lerp(m.sx, arcX, Math.sin(u * Math.PI)), m.tx, u * u);
          const y = lerp(lerp(m.sy, arcY, Math.sin(u * Math.PI)), m.ty, u * u);
          drawOreChunk(p, x, y, m.r, m.rot + t * 5, S, C[6], -m.side, 0);
          if (u > 0.45) p.line(x, y, m.tx * 0.6, CY, C[5], (u - 0.45) * 1.4);
        }
      }

      if (t >= SNAP_T && t < SNAP_T + 0.2) {
        const fk = 1 - (t - SNAP_T) / 0.2;
        flare(p, 0, CY, 26 * fk, fk, C);
      }
      if (t >= SNAP_T && t < SNAP_T + 0.48) {
        const u = (t - SNAP_T) / 0.48;
        band(p, 0, 0, 10 + 44 * ease.outQuart(u), 0.19, 2.0 * (1 - u), 1 - u, [C[2], C[4], C[6], WHITE], (g) => Math.sin(g) >= 0, u < 0.2);
      }

      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
