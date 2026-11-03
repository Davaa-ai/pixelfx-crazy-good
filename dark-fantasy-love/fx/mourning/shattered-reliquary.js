// Heartbreak Shatter: a gilded stained-glass gothic heart beats faster and faster in anguish as white-hot cracks
// spiderweb across its ruby facets, pauses in breathless implosion, then explodes into bouncing ruby shards and smoke.

import { Particles, Bits, Lights, P, B, Rng, fit, sparkle, flare, band, clamp, smooth, ease, TAU, WHITE } from "../../../src/core/index.js";
import { VELVET, GILDED, VEIL, drawGothicHeart, PetalSim, ringFast } from "../_lib.js";

export const meta = {
  name: "Heartbreak shatter",
  desc: "A gilded ruby-glass heart beats frantically as white-hot cracks split its facets, implodes to a point, and shatters into bouncing stained-glass shards and mourning smoke.",
  tags: ["mourning", "heartbreak", "shatter", "glass", "explosion", "heart", "gothic", "one-shot"],
  size: [204, 136],
  origin: [106, 114],
  duration: 3.4,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: VELVET,
    gold: GILDED,
    veil: VEIL,
    seed: 27,
  },
};

const CY = -48, IMPLODE_T = 0.96, BREAK_T = 1.08;

export function create(o) {
  const C = fit(o.palette, 8), G = fit(o.gold, 8), V = fit(o.veil, 8), R = new Rng(o.seed);
  const floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, G[6], C[6], C[4]], haze: C[3] });
  const bits = new Bits({ ground: floor }), lights = new Lights(), petals = new PetalSim(R, 0);
  let t = 0, imploded = false, shattered = false, nextCrackSpark = 0.28;

  // accelerating anguished heartbeat before rupture
  const pulse = () => {
    if (t >= IMPLODE_T) return 0;
    const u = t / IMPLODE_T;
    return Math.pow(Math.max(0, Math.sin(TAU * (1.8 * t + 4.5 * u * u))), 6);
  };

  return {
    update(dt) {
      t += dt;
      // frantic sparks spitting from widening fault lines
      if (t > 0.25 && t < IMPLODE_T && t >= nextCrackSpark) {
        const u = (t - 0.25) / (IMPLODE_T - 0.25);
        nextCrackSpark = t + R.range(0.04, 0.14) * (1 - u * 0.65);
        const a = R.range(0, TAU), sp = R.range(35, 95);
        ps.spawn(P.SPARK, Math.cos(a) * 5, CY + Math.sin(a) * 5, Math.cos(a) * sp, Math.sin(a) * sp - 15, R.range(0.14, 0.28));
        lights.add(0, CY, 24 + 18 * u, C[5], 0.45 + 0.35 * u, 0.12);
      }

      // inward streaks as the reliquary collapses on itself
      if (t >= 0.72 && t < IMPLODE_T && R.chance(dt * 55)) {
        const a = R.range(0, TAU), D0 = R.range(24, 46), T = R.range(0.12, 0.2), v = (D0 * 3) / (Math.exp(3 * T) - 1);
        ps.spawn(P.STREAK, Math.cos(a) * D0, CY + Math.sin(a) * D0, -Math.cos(a) * v, -Math.sin(a) * v, T, R.chance(0.4) ? G[6] : C[6]);
      }

      if (!imploded && t >= IMPLODE_T) {
        imploded = true;
        lights.add(0, CY, 36, WHITE, 0.9, 0.14);
      }

      if (!shattered && t >= BREAK_T) {
        shattered = true;
        lights.add(0, CY, 82, C[5], 1.0, 0.45);
        lights.add(0, CY, 38, WHITE, 1.0, 0.12);

        // ruby stained-glass chunks that tumble, bounce off the stone floor, and glitter before fading
        const rubyRamp = [C[0], C[2], C[4], C[6], WHITE];
        const goldRamp = [G[0], G[2], G[4], G[6], WHITE];
        for (let i = 0; i < 18; i++) {
          const a = R.range(0, TAU), sp = R.range(55, 165);
          bits.add({
            kind: B.CHUNK,
            x: Math.cos(a) * 4, y: CY + Math.sin(a) * 4,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 45,
            a: R.range(0, TAU), va: R.range(-12, 12),
            s: R.range(1.6, 2.9),
            ramp: i % 4 === 0 ? goldRamp : rubyRamp,
            g: 0.85, drag: 0.5, bounce: 0.36,
            life: R.range(1.35, 2.05),
          });
        }
        // razor-thin gold filigree splinters
        for (let i = 0; i < 14; i++) {
          const a = R.range(0, TAU), sp = R.range(70, 195);
          bits.add({
            kind: B.SHARD,
            x: 0, y: CY,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 35,
            a: R.range(0, TAU), va: R.range(-14, 14),
            s: R.range(2.4, 4.2), c: R.chance(0.5) ? G[6] : C[6],
            g: 0.78, drag: 0.6, bounce: 0.3,
            life: R.range(1.0, 1.75),
          });
        }
        // sparks + mourning-veil smoke + fluttering crimson petals
        for (let i = 0; i < 28; i++) {
          const a = R.range(0, TAU), sp = R.range(75, 210);
          ps.spawn(P.SPARK, 0, CY, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.2, 0.55));
        }
        for (let i = 0; i < 11; i++) {
          ps.spawn(P.SMOKE, R.range(-8, 8), CY + R.range(-8, 8), R.range(-26, 26), R.range(-28, 8), R.range(0.95, 1.55), V[2], R.range(3.0, 5.2), R.range(0, 0.12));
        }
        for (let i = 0; i < 16; i++) {
          const a = R.range(0, TAU), sp = R.range(24, 85);
          petals.spawn(R.range(-5, 5), CY + R.range(-5, 5), Math.cos(a) * sp, Math.sin(a) * sp - 22, R.range(1.15, 1.95), R.range(2.0, 3.1));
        }
        for (let i = 0; i < 8; i++) {
          ps.spawn(P.STAR, R.range(-24, 24), CY + R.range(-20, 14), R.range(-15, 15), -R.range(6, 22), R.range(0.4, 0.8), i % 2 ? G[6] : C[6], R.range(1.0, 2.2), R.range(0.05, 0.25));
        }
      }

      bits.update(dt);
      petals.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      // ominous mourning glow behind the reliquary before rupture, then warm floor pool where shards settle
      if (t < BREAK_T) {
        const u = clamp(t / IMPLODE_T);
        p.glow(0, CY, 34 + 14 * u, C[4], 0.25 + 0.3 * u);
      } else {
        const fk = 1 - smooth(2.1, 3.25, t);
        if (fk > 0) p.glow(0, -4, 42, C[3], 0.24 * fk);
      }
      const su = (t - BREAK_T) / 0.48;
      if (su > 0 && su < 1) {
        band(p, 0, CY, 8 + 52 * ease.outQuart(su), 0.28, Math.max(1, 2.8 * (1 - su)), 1 - su, [V[2], C[4], G[6], WHITE], (g) => Math.sin(g) < 0, su < 0.25);
      }
      petals.draw(p, C, "back");
      ps.draw(p, "back");
    },

    draw(p) {
      if (t < IMPLODE_T) {
        const hb = pulse();
        const crack = smooth(0.22, IMPLODE_T - 0.04, t);
        const jitterX = crack > 0.45 ? Math.sin(t * 95) * crack * 1.4 : 0;
        const s = 9.4 * (1 + 0.16 * hb);
        // frantic warning shock rings on strong beats
        if (hb > 0.55) {
          ringFast(p, jitterX, CY, s * 1.35 + (1 - hb) * 8, 1.2, C[6], hb * 0.75);
        }
        // ornate golden suspension chain above & teardrop pendant below
        for (let y = CY - Math.round(s) - 1; y >= CY - Math.round(s) - 12; y -= 2) {
          p.dot(jitterX, y, G[5], 1 - crack * 0.5);
        }
        drawGothicHeart(p, jitterX, CY, s, C, { gold: G, crack });
      } else if (t < BREAK_T) {
        // breathless implosion: crushed into a searing white diamond star
        const u = (t - IMPLODE_T) / (BREAK_T - IMPLODE_T);
        const r = Math.max(1.5, 9 * (1 - ease.outCubic(u)));
        p.circle(0, CY, r, WHITE);
        sparkle(p, 0, CY, 4 + 8 * u, WHITE, G[6], 0.85);
      } else {
        // explosion flash, shockwaves, tumbling ruby glass & dying floor ember
        const age = t - BREAK_T;
        if (age < 0.14) flare(p, 0, CY, 28 * (1 - age / 0.14), 1 - age / 0.14, G);
        if (age < 0.36) {
          const ru = age / 0.36;
          ringFast(p, 0, CY, 6 + 44 * ease.outExpo(ru), Math.max(1, 3 * (1 - ru)), ru < 0.3 ? WHITE : C[6], 1 - ru);
        }
        const su = age / 0.48;
        if (su > 0 && su < 1) {
          band(p, 0, CY, 8 + 52 * ease.outQuart(su), 0.28, Math.max(1, 2.8 * (1 - su)), 1 - su, [V[2], C[4], G[6], WHITE], (g) => Math.sin(g) >= 0, su < 0.25);
        }
        // tiny dying heart-ember pulsing weakly on the floor before going dark
        if (t > 1.55 && t < 3.05) {
          const ek = Math.sin(clamp((t - 1.55) / 1.5) * Math.PI);
          const beat = 0.5 + 0.5 * Math.sin(t * 10);
          p.dot(0, -1, beat > 0.6 ? C[6] : C[4], ek);
          p.dot(-1, -1, C[3], ek * 0.8);
          p.glow(0, -2, 8, C[4], 0.3 * ek * beat);
        }
      }

      bits.draw(p);
      petals.draw(p, C, "front");
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
