// Inspired by lightning-speed sword draws in shonen anime. Generic motifs only: no characters, costumes or logos.
import { Particles, Lights, P, Rng, rng, rand, fit, bolt, forks, sparkle, clamp, smooth, ease, WHITE, READY } from "../../../src/core/index.js";
import { ribbon, glowPath, speedBurst, strokesAt } from "../_lib.js";

export const meta = {
  name: "Thunder flash",
  desc: "Static crawls over a crouch on the hilt, then a zig-zag of lightning and he is already behind the target. The cut only shows half a second later, with the click of the sheath.",
  tags: ["demon slayer", "anime", "move", "lightning", "dash", "sword", "delayed hit", "one-shot"],
  size: [310, 112],
  origin: [86, 92],
  duration: 2.3,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#24160a", "#5e3a0c", "#a8680f", "#e8a218", "#ffd23c", "#fff08a", "#ffffff"],
    sparks: ["#ffffff", "#fff08a", "#ffd23c", "#e8a218"],
    dust: "#8d8499",
    seed: 3,
  },
};

const DASH = 0.55, STEP = 0.035, LAND = DASH + STEP * 5, HIT = 1.18, TX = 124, LX = 190;
// where the body's centre goes: a zig-zag that passes through the target's chest, then lands beyond it
const PATH = [[0, -19], [40, -46], [62, -26], [96, -52], [TX, -30], [152, -44], [LX, -19]];
const CUT_A = [TX - 20, -47], CUT_B = [TX + 20, -13];
const STROKES = [{ t: DASH, k: 1 }, { t: DASH + 0.05, k: 0.8 }, { t: DASH + 0.1, k: 0.5 }];

// iaido: a low crouch with the blade still in the scabbard at the hip, the other hand on it
const SHEATH = { ...READY, weapon: "sword", crouch: 6, lean: 6, fx: 3, fy: -16, sa: 3, bx: 10, by: -19, ffx: 9, fbx: -8 };
const COIL = { ...SHEATH, crouch: 8, lean: 9, fx: 2, bx: 11 };
// in the air: a body stretched along the line, the blade out in front
const flight = (i) => ({ ...READY, weapon: "sword", x: PATH[i][0], y: PATH[i][1] + 19, crouch: 0, lean: 11, fx: 15, fy: -25, sa: -0.05, bx: -5, by: -22, ffx: -6, ffy: -6, fbx: -12, fby: -3, ghost: 1 });
const SKID = { ...SHEATH, x: LX, crouch: 8, lean: 6, fx: 15, fy: -17, sa: 0.5, bx: -4, by: -18, ffx: 11, fbx: -9, ghost: 1 };
const AFTER = { ...SHEATH, x: LX + 6, crouch: 3, lean: 1 };
export const act = {
  ghost: "#fff3a0",
  target: { x: TX },
  poses: [
    [-0.3, SHEATH],
    [DASH - 0.06, COIL],
    [DASH - 0.005, { ...COIL, crouch: 9 }],
    ...PATH.slice(1, 6).map((_, i) => [DASH + STEP * i, flight(i + 1), "snap"]),
    [LAND, SKID, "snap"],
    [LAND + 0.12, { ...SKID, x: LX + 6, ghost: 0 }, "out"],
    [HIT - 0.3, { ...SKID, x: LX + 6, crouch: 6, lean: 3, fx: 12, sa: 1.2, ghost: 0 }],
    [HIT - 0.02, AFTER],
    [HIT, { ...AFTER, crouch: 2 }, "snap"],
    [HIT + 0.9, { ...AFTER, crouch: 2, lean: 0 }],
    [2.15, { ...AFTER, crouch: 2, lean: 0 }],
  ],
  hits: [{ t: HIT, stop: 0.12, shake: 0.24, amp: 2, push: 3.6, straw: 24, skin: "holy", flash: 0.04 }],
  dust: [{ t: DASH, x: 0, n: 8, dir: -1 }, { t: LAND, x: LX, n: 10, dir: -1 }],
};

// the bolt: each leg of the path jagged a little, joined
function zig(R, jag, depth) {
  const out = [];
  for (let i = 1; i < PATH.length; i++) {
    const seg = bolt(R, PATH[i - 1][0], PATH[i - 1][1], PATH[i][0], PATH[i][1], { jag, depth });
    out.push(...(i > 1 ? seg.slice(1) : seg));
  }
  return out;
}
// a small arc of static, drawn from a point
function arc(p, r, x, y, len, c0, c1) {
  const a = r.range(0, 6.283), pts = bolt(r, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, { jag: 0.4, depth: 2 });
  p.polyline(pts, c0);
  for (let i = 0; i < pts.length; i += 2) p.dot(pts[i][0], pts[i][1], c1);
}

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks }), lights = new Lights();
  const main = zig(R, 0.1, 3), echoA = zig(R, 0.16, 3), echoB = zig(R, 0.2, 3), branch = [];
  for (const q of [main]) branch.push(...forks(R, q, { count: 9, len: 26, jag: 0.35, spread: 1.1 }));
  const dustC = o.dust;
  let t = 0, dashed = false, landed = false, hit = false, vert = 0;

  const spark = (x, y, n, a0, spread, v0, v1, life = [0.15, 0.45]) => {
    for (let i = 0; i < n; i++) {
      const a = a0 + R.range(-spread, spread), sp = R.range(v0, v1);
      ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(...life));
    }
  };
  return {
    update(dt) {
      t += dt;
      if (!dashed && t >= DASH) {
        dashed = true;
        lights.add(0, -19, 46, C[5], 1, 0.3);
        spark(0, -19, 16, Math.PI * 1.1, 0.9, 120, 320);
        for (let i = 0; i < 7; i++) ps.spawn(P.DUST, R.range(-4, 4), -2, R.range(-95, -20), R.range(-26, -6), R.range(0.35, 0.7), dustC, R.range(3, 6));
      }
      // light and sparks at each turn of the path, as he passes it
      while (vert < 5 && t >= DASH + STEP * vert + 0.012) {
        const [x, y] = PATH[vert + 1];
        lights.add(x, y, 34, C[5], 0.7, 0.25);
        spark(x, y, 6, vert % 2 ? 0.7 : -0.7, 1.4, 80, 240, [0.12, 0.4]);
        vert++;
      }
      if (!landed && t >= LAND) {
        landed = true;
        lights.add(LX, -14, 36, C[5], 0.8, 0.28);
        spark(LX, -3, 10, Math.PI * 1.15, 0.7, 90, 260);
        for (let i = 0; i < 8; i++) ps.spawn(P.DUST, LX + R.range(-4, 4), -2, R.range(-110, -25), R.range(-24, -6), R.range(0.35, 0.8), dustC, R.range(3, 6));
        // a few motes of charge left hanging along the line
        for (let i = 0; i < 14; i++) {
          const k = R.range(0.05, 1), j = Math.min(main.length - 2, Math.floor(k * (main.length - 1))), [x, y] = main[j];
          ps.spawn(P.MOTE, x, y, R.range(-12, 12), R.range(-26, -4), R.range(0.5, 1.1), C[5], 0.7);
        }
      }
      if (!hit && t >= HIT) {
        hit = true;
        const mx = (CUT_A[0] + CUT_B[0]) / 2, my = (CUT_A[1] + CUT_B[1]) / 2, along = Math.atan2(CUT_B[1] - CUT_A[1], CUT_B[0] - CUT_A[0]);
        lights.add(mx, my, 58, C[5], 1.1, 0.4);
        lights.add(LX + 9, -16, 18, WHITE, 0.8, 0.18);
        for (let i = 0; i < 22; i++) {
          const f = R.range(0, 1), x = CUT_A[0] + (CUT_B[0] - CUT_A[0]) * f, y = CUT_A[1] + (CUT_B[1] - CUT_A[1]) * f, a = along + (R.chance(0.5) ? 1.57 : -1.57) + R.range(-0.7, 0.7);
          const sp = R.range(90, 300);
          ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.18, 0.5));
        }
        for (let i = 0; i < 4; i++) ps.spawn(P.STAR, mx + R.range(-14, 14), my + R.range(-14, 10), R.range(-14, 14), R.range(-40, -8), R.range(0.5, 0.9), C[5], R.range(1, 3));
        for (let i = 0; i < 8; i++) ps.spawn(P.MOTE, mx + R.range(-14, 14), my + R.range(-12, 12), R.range(-40, 80), R.range(-60, 10), R.range(0.4, 0.9), C[4], 0.8);
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      ps.draw(p, "back");
      // the floor lights up under the line while the current runs
      const lvl = strokesAt(t, STROKES), cool = clamp(1 - (t - DASH) / 1.2);
      if (t >= DASH && cool > 0) p.glowLine(0, -2, LX, -2, 12, C[3], 0.22 * cool + 0.35 * lvl);
    },
    draw(p) {
      const lvl = strokesAt(t, STROKES);
      // ---- the charge: static crawling over his legs, back and hilt, quicker and brighter as it builds
      if (t < DASH) {
        const ch = Math.pow(t / DASH, 1.4), tick = Math.floor(t * 16), n = 2 + Math.floor(6 * ch);
        for (let i = 0; i < n; i++) {
          const r = rng(o.seed, tick, i), hot = r.chance(0.3 + 0.4 * ch);
          if (r.chance(0.35 - 0.2 * ch)) continue;
          const x = r.range(-9, 13), y = r.range(-38, -3);
          arc(p, r, x, y, r.range(5, 10 + 6 * ch), hot ? C[6] : C[5], C[4]);
        }
        // along the floor, small currents
        for (let i = 0; i < 1 + Math.floor(3 * ch); i++) {
          const r = rng(o.seed, tick, 40 + i), x = r.range(-14, 16), len = r.range(6, 14);
          p.polyline(bolt(r, x, -1, x + (r.chance(0.5) ? 1 : -1) * len, -1 - r.range(0, 3), { jag: 0.3, depth: 2 }), C[5]);
        }
        const pulse = 0.5 + 0.5 * Math.sin(t * (14 + 40 * ch));
        p.glow(3, -17, 26, C[4], 0.08 + 0.34 * ch * pulse);
        p.glow(0, -2, 22, C[3], 0.1 + 0.2 * ch);
      }
      // ---- the line itself: three strokes that stutter down, then a cooling dotted trace
      if (lvl > 0) {
        const W = 2.2 + 2.4 * lvl, a = clamp(lvl * 1.5);
        for (const [pts, off] of [[echoA, -3], [echoB, 3]]) p.polyline(pts.map(([x, y]) => [x, y + off * lvl]), C[4], 0.5 * a);
        ribbon(p, main, { w: (u) => W * (0.5 + 0.5 * Math.pow(Math.sin(Math.PI * clamp(u * 0.96 + 0.02)), 0.35)), c: (u, v) => (Math.abs(v) < 0.34 ? WHITE : Math.abs(v) < 0.7 ? C[5] : C[4]), a });
        for (const f of branch) p.polyline(f, lvl > 0.5 ? C[5] : C[4], a);
        glowPath(p, main, 15, C[4], 0.55 * lvl, 7);
        glowPath(p, main, 30, C[3], 0.2 * lvl, 14);
      }
      if (t >= DASH + 0.15 && t < DASH + 1.4) {
        const k = 1 - (t - DASH - 0.15) / 1.25;
        for (let i = 0; i < main.length; i += 3) p.dot(main[i][0], main[i][1], C[3], k * 0.7 * rand(o.seed, i, Math.floor(t * 12)));
        glowPath(p, main, 10, C[3], 0.14 * k, 12);
        // the odd static spark still hopping off the line
        for (let i = 0; i < 12; i++) {
          const on = DASH + 0.2 + rand(o.seed, i, 4) * 1.0, u = t - on;
          if (u < 0 || u > 0.1) continue;
          const j = Math.floor(rand(o.seed, i, 5) * (main.length - 1)), [x, y] = main[j];
          sparkle(p, x, y, 3 * (1 - u / 0.1) + 1, C[5], C[4], 0.4);
        }
      }
      // the ground current: a jittering white line along the floor from where he left to where he landed
      if (t >= DASH && t < DASH + 0.55) {
        const k = 1 - (t - DASH) / 0.55, tick = Math.floor(t * 24), r = rng(o.seed, tick, 5);
        const pts = [];
        for (let x = 0; x <= LX; x += 4) pts.push([x, -1 - Math.round(r.range(0, 2.4))]);
        p.polyline(pts, k > 0.5 ? C[6] : C[5], clamp(k * 1.6));
      }
      // ---- the break: a manga burst where the dash starts
      if (t >= DASH && t < DASH + 0.1) speedBurst(p, 0, -19, 8, 40, 16, o.seed, WHITE, C[5], 1 - (t - DASH) / 0.1, ease.outQuart(clamp((t - DASH) / 0.04)));
      // ---- the cut, half a second late, and the sheath clicking shut
      if (t >= HIT) {
        const u = t - HIT, grow = ease.outExpo(clamp(u / 0.045)), mx = (CUT_A[0] + CUT_B[0]) / 2, my = (CUT_A[1] + CUT_B[1]) / 2;
        const ex = CUT_A[0] + (CUT_B[0] - CUT_A[0]) * grow, ey = CUT_A[1] + (CUT_B[1] - CUT_A[1]) * grow;
        if (u < 0.1) speedBurst(p, mx, my, 5, 36, 20, o.seed + 9, WHITE, C[5], 1 - u / 0.1, ease.outQuart(clamp(u / 0.04)));
        const fade = clamp(1 - Math.max(0, u - 0.08) / 0.7);
        if (fade > 0) {
          const thick = u < 0.09 ? 3.4 : 1.8;
          ribbon(p, [CUT_A, [ex, ey]], { w: (v) => thick * (0.3 + 0.7 * Math.sin(Math.PI * clamp(v))) , c: (v, w) => (u < 0.09 && Math.abs(w) < 0.5 ? WHITE : Math.abs(w) < 0.4 ? C[6] : C[4]), a: clamp(fade * 1.4) });
          if (u > 0.09) p.line(CUT_A[0] + 1, CUT_A[1] + 1, ex + 1, ey + 1, C[1], fade * 0.8);
          p.glowLine(CUT_A[0], CUT_A[1], ex, ey, 14, C[4], 0.55 * fade);
        }
        if (u < 0.14) sparkle(p, mx, my, 12 * ease.outBack(clamp(u / 0.04)) * (1 - u / 0.14), WHITE, C[5], 0.7);
        if (u < 0.16) sparkle(p, LX + 9, -16, 6 * (1 - u / 0.16), WHITE, C[5], 0.6);
        // current crawling over the struck target
        if (u < 0.55) {
          const k = 1 - u / 0.55, tick = Math.floor(u * 22);
          for (let i = 0; i < 4; i++) {
            const r = rng(o.seed, tick, 70 + i);
            if (r.chance(0.3)) continue;
            arc(p, r, TX + r.range(-15, 15), r.range(-48, -4), r.range(5, 11), k > 0.4 ? C[6] : C[5], C[4]);
          }
          p.glow(TX, -28, 34, C[4], 0.3 * k);
        }
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
