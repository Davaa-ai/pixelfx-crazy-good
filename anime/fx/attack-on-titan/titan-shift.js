// Inspired by lightning transformations in dark fantasy anime. Generic motifs only: no characters or silhouettes.
import { Particles, Bits, Lights, P, PF, B, Rng, rng, rand, fit, bolt, forks, band, sparkle, clamp, smooth, ease, lerp, hex, WHITE, TAU } from "../../../src/core/index.js";
import { ribbon, glowPath, strokesAt } from "../_lib.js";

export const meta = {
  name: "Titan shift",
  desc: "One bright pinprick, the ground shuddering, then a corkscrew of twisting lightning slams down: a white pillar, a dome of light, glowing cracks, and a wall of boiling steam.",
  tags: ["attack on titan", "anime", "one-shot", "lightning", "steam", "transformation", "shockwave", "debris"],
  size: [312, 296],
  origin: [156, 232],
  duration: 4.2,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#24160a", "#5e3a0c", "#a8680f", "#e8a218", "#ffd23c", "#fff08a", "#ffffff"],
    heat: ["#2a0e0a", "#8a1f17", "#e8501a", "#ffae35", "#fff3a6"],
    steam: "#f6f0ec",
    seed: 13,
  },
};

const TOP = -168, BASE = -6, STRIKE = 0.5, STROKES = [0, 0.09, 0.17, 0.27].map((d, i) => ({ t: STRIKE + d, k: [1, 0.85, 0.6, 0.4][i] }));
const STONE = ["#1c1c24", "#2c2c38", "#42424f", "#5c5c6b", "#7d7d8c"];
// a clipped ring that stops at the floor
function clipRing(p, x, y, r, w, c, a) {
  const lim = (2 - y) / r, e = Math.asin(Math.max(-1, Math.min(1, lim)));
  if (lim >= 1) return p.ring(x, y, r, w, c, a);
  p.arc(x, y, r, w, Math.PI - e, TAU + e, c, a);
}

export function create(o) {
  const C = fit(o.palette, 7), H = fit(o.heat, 5), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[5], C[4], C[3]], haze: "#ffc060" }), bits = new Bits({ ground: floor }), lights = new Lights();
  // the bolt's path: a few kinks, and the forks it throws; every stroke follows the same path a little differently
  const mkPath = (jag) => {
    const pts = [];
    let x = 0;
    for (let y = TOP; y <= BASE; y += 4) {
      x += R.range(-jag, jag);
      x *= 0.93;
      pts.push([x * (1 - (y - TOP) / (BASE - TOP) * 0.7), y]);
    }
    pts[pts.length - 1][0] = 0;
    return pts;
  };
  const paths = STROKES.map((_, i) => mkPath(2.4 + i * 0.4)), branch = paths.map((p) => forks(R, p, { count: 7, len: 34, jag: 0.35, spread: 1.2 }));
  const cracks = Array.from({ length: 9 }, (_, i) => {
    const s = i % 2 ? 1 : -1, pts = bolt(R, 0, 0, s * R.range(40, 108), 0, { jag: 0.18, depth: 4 });
    return pts.map(([x, y], j) => [x, Math.min(5, Math.max(-1, (y + R.range(0, 0)) * 0.4 + Math.sin(j) * 0.8 + (i % 3) * 1.2 - 1))]);
  });
  let t = 0, struck = false, acc = 0, shaking = 0;

  const helix = (p, path, lvl, ph, back) => {
    const strands = [0, Math.PI];
    for (const off of strands) {
      const pts = path.map(([x, y]) => [x + 6 * Math.sin(y * 0.15 + ph + off) * (0.4 + 0.6 * clamp((y - TOP) / 40)), y]);
      const depth = (j) => Math.cos(path[j][1] * 0.15 + ph + off);
      // split into the near stretches and the far ones, so the strands pass in front of and behind each other
      let run = [];
      const flush = (near) => {
        if (run.length > 1 && near === !back) ribbon(p, run, { w: () => 1.6 + 2.4 * lvl * (near ? 1 : 0.7), c: (u, v) => (Math.abs(v) < 0.4 ? (near ? WHITE : C[6]) : near ? C[5] : C[4]), a: (u) => clamp(u * 7) * clamp(lvl * 1.5) });
        run = [];
      };
      let cur = depth(0) > 0;
      for (let j = 0; j < pts.length; j++) {
        const near = depth(j) > 0;
        if (near !== cur) {
          run.push(pts[j]);
          flush(cur);
          cur = near;
        }
        run.push(pts[j]);
      }
      flush(cur);
    }
  };

  return {
    update(dt) {
      t += dt;
      // before: a few stray motes and a tremor of dust shaken up from the ground
      if (t < STRIKE && R.chance(dt * (10 + 60 * (t / STRIKE)))) ps.spawn(P.DUST, R.range(-40, 40), -2, R.range(-12, 12), R.range(-26, -8), R.range(0.3, 0.7), "#8a7f78", R.range(2, 3.6));
      if (!struck && t >= STRIKE) {
        struck = true;
        lights.add(0, -40, 90, WHITE, 1.2, 0.18);
        lights.add(0, -30, 96, C[5], 1, 1.1);
        for (let i = 0; i < 40; i++) {
          const a = R.range(-Math.PI, 0), sp = R.range(120, 360);
          ps.spawn(P.SPARK, R.range(-6, 6), -6, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.25, 0.8));
        }
        for (let i = 0; i < 18; i++) {
          const a = R.range(-2.8, -0.35), sp = R.range(130, 340);
          bits.add({ kind: B.CHUNK, drag: 1.1, x: R.range(-8, 8), y: -4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: R.range(0, TAU), va: R.range(-14, 14), s: R.range(2, 4.5), ramp: STONE, bounce: 0.38, life: R.range(1.4, 2.6) });
        }
        for (let i = 0; i < 26; i++) ps.spawn(P.DUST, R.range(-6, 6), -2 - R.range(0, 4), (i % 2 ? 1 : -1) * R.range(70, 190), R.range(-22, -2), R.range(0.6, 1.1), "#8a7f78", R.range(4, 7));
      }
      // the steam boils out of the point of the strike: a wall rolling outwards, a column going up, hot-lit at the root
      if (t > STRIKE && t < STRIKE + 1.0) {
        const u = (t - STRIKE) / 1.0;
        for (acc += dt * (74 * (1 - u * 0.6)); acc >= 1; acc--) {
          const side = R.chance(0.55), a = side ? (R.chance(0.5) ? -0.2 : -Math.PI + 0.2) + R.range(-0.25, 0.25) : R.range(-Math.PI * 0.8, -Math.PI * 0.2), sp = side ? R.range(70, 210) : R.range(30, 120);
          ps.spawn(P.SMOKE, R.range(-12, 12), -R.range(2, 14), Math.cos(a) * sp, Math.sin(a) * sp - (side ? R.range(6, 22) : R.range(50, 120)), R.range(1.5, 2.4), o.steam, R.range(10, 18), 0, PF.BIG);
          if (R.chance(0.5)) ps.spawn(P.VAPOUR, R.range(-10, 10), -R.range(2, 20), Math.cos(a) * sp * 1.2, Math.sin(a) * sp - R.range(20, 70), R.range(0.6, 1.2), "#fff4e8", R.range(5, 9));
        }
      }
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const u = t - STRIKE;
      // the floor: a glowing crack network that cools, and the crater's scorch
      if (u > 0) {
        const heat = 1 - smooth(0.3, 2.6, u), k = ease.outCubic(clamp(u / 0.18));
        p.ellipse(0, 1, 52 * k, 5.5 * k, hex("#120a0a"), 0.75 * (1 - smooth(2, 3.6, u)));
        for (const c of cracks) {
          const n = Math.floor(c.length * k), pts = c.slice(0, n + 1);
          p.polyline(pts, heat > 0.6 ? H[4] : heat > 0.3 ? H[3] : H[2], (0.4 + 0.6 * heat) * (1 - smooth(2.4, 3.6, u)));
          if (heat > 0.1) glowPathLine(p, pts, H[3], 0.3 * heat);
        }
        const wave = ease.outCubic(clamp(u / 0.55));
        if (u < 0.55) band(p, 0, 1, 6 + 120 * wave, 0.16, 2.4, (1 - u / 0.55), C.slice(2, 7));
      }
      ps.draw(p, "back");
    },
    draw(p) {
      const lvl = strokesAt(t, STROKES), idx = STROKES.reduce((m, s, i) => (t >= s.t ? i : m), 0), u = t - STRIKE;
      // ---- before: the pinprick, and the air trembling round it
      if (t < STRIKE) {
        const g = t / STRIKE, tw = 0.5 + 0.5 * Math.sin(t * 40);
        if (t > 0.06) sparkle(p, 0, -30, 2 + 3 * g * tw, WHITE, C[5], 0.5);
        p.glow(0, -30, 12 + 20 * g, C[4], 0.2 + 0.5 * g * tw);
        for (let i = 0; i < 2 + Math.floor(5 * g); i++) {
          const r = rng(o.seed, Math.floor(t * 18), i), a = r.range(0, TAU), L = r.range(6, 14 + 8 * g);
          p.polyline(bolt(r, 0, -30, Math.cos(a) * L, -30 + Math.sin(a) * L, { jag: 0.4, depth: 2 }), r.chance(0.4) ? WHITE : C[5]);
        }
        for (let k = 0; k < 2; k++) {
          const ph = (g * 2.2 + k / 2) % 1;
          p.ring(0, -30, 4 + 18 * (1 - ph), 1, C[4], 0.5 * ph * g);
        }
      }
      // ---- the corkscrew: two strands twisting down one path, passing in front of each other
      if (lvl > 0) {
        const ph = -t * 38 + idx;
        helix(p, paths[idx], lvl, ph, true);
        for (const f of branch[idx]) p.polyline(f, lvl > 0.5 ? C[5] : C[4], lvl);
        p.polyline(paths[idx], C[3], 0.5 * lvl);
        helix(p, paths[idx], lvl, ph, false);
        glowPath(p, paths[idx], 20, C[4], 0.45 * lvl, 12);
        glowPath(p, paths[idx], 34, C[3], 0.16 * lvl, 20);
      }
      if (u >= 0) {
        // the pillar the bolt leaves: white, then thinning to nothing
        const pw = 15 * (1 - smooth(0.05, 0.45, u)) * (u < 0.03 ? 1.3 : 1);
        if (pw > 0.6) {
          p.shade(-pw, TOP, pw, BASE, (x, y, out) => {
            const v = Math.abs(x) / pw, edge = (rand(Math.floor(y * 0.5), Math.floor(x), Math.floor(t * 30)) - 0.5) * 0.2;
            if (v + edge > 1) return;
            out.c = v < 0.5 ? WHITE : v < 0.8 ? C[6] : C[5];
            out.a = clamp((y - TOP) / 40) * (v < 0.8 ? 1 : 0.7);
            out.l = C[4];
            out.k = 0.3 * (1 - v);
          });
        }
        // the dome of light and the rings that run out of it
        const dome = ease.outCubic(clamp(u / 0.3));
        if (u < 0.45) {
          for (const [r, c, k] of [[8 + 62 * dome, C[6], 0.55], [6 + 42 * dome, WHITE, 0.55]])
            p.each(-r, -26 - r, r, 2, (x, y, sx, sy) => {
              const d = Math.hypot(x, y + 26) / r;
              if (d < 1) p.blendPx(sx, sy, c, k * (1 - u / 0.45) * (1 - d * d * 0.35));
            });
        }
        const ring = ease.outCubic(clamp(u / 0.6));
        if (u < 0.6) {
          clipRing(p, 0, -26, 10 + 100 * ring, 2.2, C[6], 0.9 * (1 - u / 0.6));
          clipRing(p, 0, -26, 6 + 100 * ring, 1, WHITE, 0.6 * (1 - u / 0.6));
          p.glowRing(0, -26, Math.min(10 + 100 * ring, 100), 8, C[4], 0.35 * (1 - u / 0.6));
        }
        if (u < 0.2) sparkle(p, 0, -26, 26 * (1 - u / 0.2), WHITE, C[5], 0.9);
        // heat glow in the steam's root, and a few arcs still running through it
        if (u < 1.4) {
          p.glow(0, -20, 70, "#ffb060", 0.3 * (1 - u / 1.4));
          if (u > 0.2) {
            const tick = Math.floor(u * 16);
            for (let i = 0; i < 3; i++) {
              const r = rng(o.seed, tick, 5 + i);
              if (r.chance(0.35)) continue;
              const x = r.range(-34, 34), y = -r.range(6, 60), a = r.range(0, TAU), L = r.range(8, 20);
              p.polyline(bolt(r, x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, { jag: 0.4, depth: 2 }), C[6], 1 - u / 1.4);
            }
          }
        }
      }
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}

// a soft light along a crack
function glowPathLine(p, pts, c, k) {
  for (let i = 0; i < pts.length; i += 3) p.glow(pts[i][0], pts[i][1], 6, c, k);
}
