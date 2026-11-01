// Inspired by gravity-bending cursed techniques in dark fantasy anime. Generic motifs only: no characters or logos.
import { Particles, Bits, Lights, P, B, Rng, rng, rand, fit, bolt, flare, sparkle, clamp, smooth, ease, lerp, poseAt, hex, WHITE, READY, TAU } from "../../../src/core/index.js";
import { glowPath } from "../_lib.js";

export const meta = {
  name: "Orb convergence",
  desc: "One hand pulls (a blue orb, debris falling in), the other pushes (a red orb, rings thrown out). They merge into a violet sphere whose beam erases a hole through the target.",
  tags: ["jujutsu kaisen", "anime", "move", "orb", "gravity", "beam", "attract", "repel", "one-shot"],
  size: [392, 112],
  origin: [68, 90],
  duration: 4.0,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#0e0620", "#2a0e5a", "#5a1ca8", "#8a3cf0", "#b878ff", "#e2c0ff", "#ffffff"],
    blue: ["#06143a", "#0f2f8a", "#1f56e0", "#4a8cff", "#8cc0ff", "#cfe4ff", "#ffffff"],
    red: ["#2a0510", "#6a0c1c", "#b01428", "#ee2a3a", "#ff6a70", "#ffc0c0", "#ffffff"],
    seed: 8,
  },
};

const MERGE = 1.5, FIRE = 2.1, TX = 196, HITT = FIRE + 0.2, M = [22, -30], BEAM_SPEED = 900, BEAM_ON = 0.7;
const BLACK = hex("#05030a");
const OPEN = { ...READY, turn: 1, crouch: 2, lean: 0, fx: -12, fy: -30, bx: 14, by: -31, ffx: 8, fbx: -8 };
const TOGETHER = { ...OPEN, x: 4, crouch: 3, lean: 2, fx: 15, fy: -30, bx: 17, by: -30 };
const FIRED = { ...TOGETHER, x: 1, crouch: 4, lean: 4, fx: 15, fy: -31, bx: 17, by: -31, ffx: 11, fbx: -10 };
export const act = {
  target: { x: TX },
  poses: [
    [-0.3, { ...READY }],
    [0.1, OPEN, "out"],
    [0.9, { ...OPEN, lean: -1 }],
    [MERGE, TOGETHER],
    [FIRE - 0.04, { ...TOGETHER, crouch: 4 }],
    [FIRE, FIRED, "snap"],
    [FIRE + 1.0, FIRED],
    [FIRE + 1.7, { ...READY, x: 0 }],
    [3.9, { ...READY, x: 0 }],
  ],
  hits: [
    { t: HITT, stop: 0.2, shake: 0.5, amp: 3, push: 2.4, straw: 56, skin: "shadow", flash: 0.06 },
    { t: HITT + 1.6, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: FIRE, x: 2, n: 10, dir: -1, c: "#6a5a8a" }],
};

// where each hand is: the orbs follow them, so the body and the effect always agree
const hands = (t) => {
  const q = poseAt(act.poses, Math.max(0, t));
  return { blue: [(q.x ?? 0) + (q.fx ?? 0), (q.y ?? 0) + (q.fy ?? 0)], red: [(q.x ?? 0) + (q.bx ?? 0), (q.y ?? 0) + (q.by ?? 0)] };
};

export function create(o) {
  const C = fit(o.palette, 7), Bl = fit(o.blue, 7), Rd = fit(o.red, 7), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [o.red[6], o.red[5], o.red[4], o.red[2]] }), bits = new Bits({ ground: floor }), lights = new Lights();
  let t = 0, merged = false, fired = false, hit = false, acc = 0;
  const sparkOut = (x, y, n, v0, v1, life = [0.15, 0.4], a0 = 0, spread = TAU / 2) => {
    for (let i = 0; i < n; i++) {
      const a = a0 + R.range(-spread, spread), s = R.range(v0, v1);
      ps.spawn(P.SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s, R.range(...life));
    }
  };
  const beamHead = () => M[0] + BEAM_SPEED * (t - FIRE);
  const beamEnv = (u) => (u < 0 ? 0 : ease.outCubic(clamp(u / 0.06)) * (1 - smooth(BEAM_ON, BEAM_ON + 0.35, u)));

  // an orb: dark outline, shaded body, white heart, and a ring of motes turning round it
  function orb(p, x, y, r, ramp, spin, k = 1) {
    p.circle(x, y, r + 1, ramp[0], k);
    p.circle(x, y, r, (d) => (d > 0.78 ? ramp[2] : d > 0.55 ? ramp[3] : d > 0.3 ? ramp[4] : d > 0.12 ? ramp[5] : WHITE), k);
    p.px(x - r * 0.4, y - r * 0.45, WHITE);
    for (let j = 0; j < 7; j++) {
      const a = spin + (j * TAU) / 7;
      p.dot(x + Math.cos(a) * (r + 3.5), y + Math.sin(a) * (r + 3.5) * 0.9, ramp[5], k * 0.9);
    }
    p.glow(x, y, r * 4.6, ramp[4], 0.55 * k);
    p.glow(x, y, r * 2, ramp[6], 0.5 * k);
  }

  return {
    update(dt) {
      t += dt;
      const h = hands(t);
      // the pushing hand throws sparks out of its orb; the pulling hand's light is drawn from time alone
      if (t > 0.35 && t < MERGE) {
        for (acc += dt * 38; acc >= 1; acc--) sparkOut(h.red[0], h.red[1], 1, 90, 200, [0.18, 0.4]);
      }
      if (!merged && t >= MERGE) {
        merged = true;
        lights.add(M[0], M[1], 58, WHITE, 1, 0.3);
        lights.add(M[0], M[1], 56, C[4], 0.9, 0.6);
        sparkOut(M[0], M[1], 26, 80, 260, [0.2, 0.6]);
      }
      // while the violet sphere charges, light and sparks fall into it
      if (merged && t < FIRE) {
        for (let i = 0; i < 2; i++) {
          const a = R.range(0, TAU), d = R.range(30, 46);
          ps.spawn(P.STREAK, M[0] + Math.cos(a) * d, M[1] + Math.sin(a) * d, -Math.cos(a) * 60, -Math.sin(a) * 60, 0.34, C[5], 1);
        }
      }
      if (!fired && t >= FIRE) {
        fired = true;
        lights.add(M[0] + 20, M[1], 58, C[5], 1.1, 0.8);
        sparkOut(M[0], M[1], 24, 100, 300, [0.2, 0.6], Math.PI, 0.9);
        for (let i = 0; i < 10; i++) ps.spawn(P.DUST, R.range(-8, 14), -2, R.range(-120, -20), R.range(-30, -6), R.range(0.4, 0.9), "#7a6a96", R.range(3, 6));
      }
      if (!hit && t >= HITT) {
        hit = true;
        lights.add(TX, M[1], 58, C[5], 1, 0.6);
        for (let i = 0; i < 14; i++) {
          const a = R.range(-1.4, 0.4), sp = R.range(90, 200);
          bits.add({ kind: B.CHUNK, drag: 1.4, x: TX + R.range(-8, 8), y: M[1] + R.range(-8, 8), vx: Math.cos(a) * sp + 30, vy: Math.sin(a) * sp, a: R.range(0, TAU), va: R.range(-12, 12), s: R.range(2, 4), ramp: ["#4e331f", "#86643a", "#b38b57", "#c9a26c", "#f0d98a"], bounce: 0.35, life: R.range(1.0, 1.5) });
        }
        sparkOut(TX, M[1], 20, 80, 200, [0.2, 0.5], 0, 1.4);
      }
      // the beam's ground light kicks dust where it passes the target
      if (t > FIRE + 0.1 && t < FIRE + BEAM_ON && R.chance(dt * 50)) ps.spawn(P.DUST, R.range(40, 230), -2, R.range(-20, 60), R.range(-30, -8), R.range(0.3, 0.6), "#7a6a96", R.range(2, 4));
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // the far half of the ring round the violet sphere
      if (t >= MERGE && t < FIRE + 0.3) {
        const r = 6 + 4 * smooth(MERGE, FIRE, t), fade = 1 - smooth(FIRE, FIRE + 0.3, t);
        for (let a = 0; a < TAU; a += 0.09) {
          const th = a + t * 5, y = Math.sin(th);
          if (y < 0) p.dot(M[0] + Math.cos(th) * (r + 11), M[1] + y * 4.4 - 1, C[3], 0.8 * fade);
        }
      }
      ps.draw(p, "back");
    },
    draw(p) {
      const h = hands(t), spin = t * 6;
      // ---- the pulling orb: blue, with motes and debris falling into it
      if (t < MERGE + 0.02) {
        const [bx, by] = h.blue, g = ease.outCubic(clamp(t / 0.3)), r = 4.8 * g;
        const wob = (1 - smooth(MERGE - 0.4, MERGE, t));
        if (r > 0.5) {
          // light and motes spiralling in, faster as they near
          const T = 0.55;
          for (let i = 0; i < 24; i++) {
            const g2 = rng(o.seed, i, 3), born = g2.next() * T, age = (((t - born) % T) + T) % T, k = age / T, rad = (34 + g2.range(0, 14)) * (1 - ease.inQuad(k)) + 3, an = g2.range(0, TAU) + k * 3.4;
            const x = bx + Math.cos(an) * rad, y = by + Math.sin(an) * rad * 0.9;
            for (let s = 0; s < 3; s++) {
              const k2 = Math.max(0, k - s * 0.025), r2 = (34 + g2.range(0, 14)) * (1 - ease.inQuad(k2)) + 3, a2 = an - (k - k2) * 3.4;
              p.dot(bx + Math.cos(a2) * r2, by + Math.sin(a2) * r2 * 0.9, s === 0 ? Bl[6] : s === 1 ? Bl[4] : Bl[3], (1 - k * 0.2) * (0.9 - s * 0.25) * g * wob);
            }
            if (k > 0.8) p.dot(x, y, Bl[6], 0.9 * wob);
          }
          // pebbles torn off the floor, pulled up and in
          for (let i = 0; i < 9; i++) {
            const g2 = rng(o.seed, i, 4), T2 = 0.9, born = g2.next() * T2, age = (((t - born) % T2) + T2) % T2, k = age / T2, sx = bx + g2.range(-34, 34), e = ease.inCubic(k);
            if (t < 0.25) continue;
            p.px(lerp(sx, bx, e) + Math.sin(k * 9 + i) * 2 * (1 - e), lerp(-1.5, by, e), k < 0.2 ? Bl[1] : Bl[2 + (i % 3)]);
          }
          orb(p, bx, by, r, Bl, spin, wob);
        }
      }
      // ---- the pushing orb: red, with rings and sparks going out
      if (t > 0.35 && t < MERGE + 0.02) {
        const [rx, ry] = h.red, g = ease.outCubic(clamp((t - 0.35) / 0.3)), r = 4.8 * g, wob = 1 - smooth(MERGE - 0.4, MERGE, t);
        for (let k = 0; k < 3; k++) {
          const ph = (t * 3.2 + k / 3) % 1, rad = 5 + 24 * ph;
          p.ring(rx, ry, rad, 1, Rd[4], 0.8 * (1 - ph) * g * wob);
          if (k === 1) p.ring(rx, ry, rad - 1, 1, Rd[6], 0.4 * (1 - ph) * g * wob);
        }
        for (let j = 0; j < 8; j++) {
          const a = spin * 0.5 + (j * TAU) / 8, ph = (t * 5 + j * 0.37) % 1;
          p.line(rx + Math.cos(a) * (r + 3 + ph * 9), ry + Math.sin(a) * (r + 3 + ph * 9), rx + Math.cos(a) * (r + 5 + ph * 13), ry + Math.sin(a) * (r + 5 + ph * 13), Rd[5], (1 - ph) * g * wob);
        }
        orb(p, rx, ry, r, Rd, -spin, wob);
      }
      // ---- the violet sphere: they have met
      if (t >= MERGE && t < FIRE + 0.3) {
        const u = t - MERGE, r0 = 3 + 6.5 * ease.outCubic(smooth(0, FIRE - MERGE, t)), fade = 1 - smooth(FIRE, FIRE + 0.3, t), shake = t < FIRE ? Math.sin(t * 90) * 0.7 * smooth(MERGE + 0.2, FIRE, t) : 0;
        const x = M[0] + shake, y = M[1], flash = t < MERGE + 0.08;
        if (flash) p.circle(x, y, 14, WHITE);
        else {
          p.circle(x, y, r0 + 1, C[0], fade);
          p.circle(x, y, r0, (d) => (d > 0.8 ? C[2] : d > 0.55 ? C[3] : d > 0.3 ? C[5] : d > 0.12 ? C[6] : WHITE), fade);
        }
        for (let i = 0; i < 5; i++) {
          const q = rng(o.seed, Math.floor(t * 20), i), a = q.range(0, TAU), L = q.range(7, 14 + 6 * smooth(0, 0.6, u));
          const pts = bolt(q, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r0 + L), y + Math.sin(a) * (r0 + L), { jag: 0.4, depth: 2 });
          p.polyline(pts, q.chance(0.4) ? C[6] : C[4], fade);
        }
        // the ring round it, near half in front
        for (let a = 0; a < TAU; a += 0.09) {
          const th = a + t * 5, sy = Math.sin(th);
          if (sy >= 0) p.dot(x + Math.cos(th) * (6 + 4 * smooth(MERGE, FIRE, t) + 11), y + sy * 4.4 - 1, C[5], 0.9 * fade);
        }
        p.glow(x, y, 36 + 20 * smooth(MERGE, FIRE, t), C[3], 0.7 * fade);
        p.glow(x, y, 14, C[6], 0.7 * fade);
      }
      // ---- the beam, and the tunnel it leaves
      if (t >= FIRE) {
        const u = t - FIRE, env = beamEnv(u), head = Math.min(beamHead(), 284), W = 19 * env, axis = M[1];
        if (env > 0.02) {
          p.shade(M[0], axis - W / 2 - 3, head, axis + W / 2 + 3, (x, y, out) => {
            const v = Math.abs(y - axis) / (W / 2 + 0.01), edge = (rand(Math.floor(x * 0.5), Math.floor(y), Math.floor(t * 30)) - 0.5) * 0.18;
            if (v + edge > 1) return;
            const ring = Math.sin(x * 0.45 - t * 60) > 0.55;
            out.c = v < 0.16 ? WHITE : v < 0.36 ? (ring ? WHITE : C[6]) : v < 0.62 ? (ring ? C[6] : C[5]) : v < 0.86 ? (ring ? C[5] : C[4]) : C[3];
            out.l = C[3];
            out.k = 0.3 * (1 - v);
            out.a = x > head - 4 ? 0.7 : 1;
          });
          p.glowLine(M[0], axis, head, axis, 30, C[3], 0.42 * env);
          p.glowLine(M[0], axis, head, axis, 12, C[4], 0.3 * env);
          p.glowLine(0, -2, head, -2, 8, C[4], 0.3 * env);
          flare(p, M[0] + 4, axis, 22 * env, 0.8, C.slice(1));
        }
        // the target: a tunnel of nothing where the beam went through, ragged-edged, closing last
        const tu = t - HITT, close = smooth(FIRE + 1.3, FIRE + 1.8, t);
        if (tu > 0 && close < 1) {
          const H = (10 + 1.5) * (1 - close) * ease.outCubic(clamp(tu / 0.06));
          p.shade(TX - 24, axis - 14, TX + 24, axis + 14, (x, y, out) => {
            const n = rand(Math.floor(x * 0.6), Math.floor(y * 0.6), Math.floor(t * 12)), hh = H - 0.3 + (n - 0.5) * 2.2, dy = Math.abs(y - axis);
            if (dy > hh) return;
            out.c = dy > hh - 1.3 ? C[3] : dy > hh - 2.2 ? C[1] : BLACK;
            if (dy > hh - 1.3) (out.l = C[4]), (out.k = 0.35 * (1 - close));
          });
        }
      }
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
