// Inspired by released-blade slashes in soul-reaper anime. Generic motifs only: no characters, costumes or logos.
import { Particles, Bits, Lights, P, B, Rng, rng, rand, fit, clamp, smooth, ease, noise, hex, mix, WHITE, READY, TAU } from "../../../src/core/index.js";
import { unlight, floorScar } from "../_lib.js";

export const meta = {
  name: "Moon-fang wave",
  desc: "Black fire licks off the raised blade; one cut down sends a towering black crescent, crimson-rimmed and white-edged, tearing along the floor through the target.",
  tags: ["bleach", "anime", "move", "slash", "sword", "wave", "crescent", "black", "crimson", "one-shot"],
  size: [320, 136],
  origin: [50, 118],
  duration: 2.9,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#05030a", "#1c0612", "#3e0a1c", "#76102a", "#b8182e", "#ec3a3e", "#ff9c88", "#ffffff"],
    sparks: ["#ffffff", "#ff9c88", "#ec3a3e", "#76102a"],
    seed: 11,
  },
};

const REL = 0.5, SPEED = 440, X0 = 26, TX = 150, HIT = REL + (TX - 12 - X0) / SPEED, R0 = 54, SPAN = 1.05;
const STONE = ["#141016", "#2a2228", "#463a3e", "#6a5a58", "#8e7c74"];
const VOID = hex("#06030a");
const front = (t) => X0 + (t - REL) * SPEED;
// the crescent grows into its full height over its first few frames and thins out at the far side
const grow = (t) => 0.55 + 0.45 * ease.outCubic(clamp((t - REL) / 0.1));
const fadeOut = (t) => 1 - smooth(176, 232, front(t));

// the raised blade, from the hand to the tip (the overhead pose below)
const HAND = [1, -42], SA = -2.45, TIP = [HAND[0] + Math.cos(SA) * 28, HAND[1] + Math.sin(SA) * 28];
const onBlade = (u) => [HAND[0] + (TIP[0] - HAND[0]) * u, HAND[1] + (TIP[1] - HAND[1]) * u];

const GUARD = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 };
const OVER = { ...GUARD, x: -4, crouch: 3, lean: -3, fx: HAND[0], fy: HAND[1], sa: SA, two: true, ffx: 8, fbx: -8 };
const CUT = { ...GUARD, x: -1, crouch: 2, lean: 3, fx: 16, fy: -37, sa: -1.45, two: true, ffx: 11, fbx: -10, ghost: 1 };
const DOWN = { ...GUARD, x: 4, crouch: 7, lean: 7, fx: 22, fy: -13, sa: 0.78, two: true, ffx: 14, fbx: -11, toeB: true };
export const act = {
  ghost: "#ec3a3e",
  target: { x: TX },
  poses: [
    [-0.35, { ...GUARD, x: -2 }],
    [-0.05, { ...OVER, crouch: 1, lean: -1 }, "out"],
    [REL - 0.12, { ...OVER, crouch: 4, lean: -5, x: -6 }],
    [REL - 0.02, CUT, "snap"],
    [REL + 0.03, DOWN, "snap"],
    [REL + 0.5, { ...DOWN, x: 5, crouch: 8 }],
    [REL + 1.2, { ...GUARD, x: 3, crouch: 3, fx: 16, fy: -18, sa: 0.3 }],
    [2.3, { ...GUARD, x: 0 }],
  ],
  hits: [
    { t: REL + 0.03, shake: 0.18, amp: 2, target: false },
    { t: HIT, stop: 0.13, shake: 0.34, amp: 3, push: 4.8, straw: 36, skin: "char", flash: 0.06 },
    { t: HIT + 1.1, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: REL + 0.03, x: 16, n: 9, dir: 1 }, { t: REL + 0.03, x: -10, n: 5, dir: -1 }],
};

// the crescent: (cx, cy) the circle it is cut from, s its scale. calls fn(x, y, u along, v across 0 inner..1 outer)
function crescent(p, t, s, fn) {
  const F = front(t), R = R0 * s, cx = F - R, cy = -R * Math.sin(SPAN);
  const W = (u) => (6 + 22 * s) * Math.pow(Math.sin(Math.PI * u), 0.8);
  p.shade(cx, cy - R, F + 1, 1, (x, y, o) => {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d > R) return;
    const a = Math.atan2(dy, dx);
    if (a < -SPAN || a > SPAN) return;
    const u = (a + SPAN) / (2 * SPAN), w = W(u);
    if (w <= 0.5 || d < R - w) return;
    return fn(o, x, y, u, (d - (R - w)) / w);
  });
  return { F, R, cx, cy, W };
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks }), bits = new Bits({ ground: floor }), lights = new Lights();
  let t = 0, released = false, struck = false, lastF = X0;

  return {
    update(dt) {
      t += dt;
      // ---- the charge: motes of dark pulled into the blade, black-red licks peeling off it
      if (t < REL) {
        const g = t / REL;
        if (R.chance(dt * (30 + 60 * g))) {
          const [bx, by] = onBlade(R.range(0.25, 1)), a = R.range(0, TAU), d = R.range(20, 34), sp = R.range(35, 60);
          ps.spawn(P.STREAK, bx + Math.cos(a) * d, by + Math.sin(a) * d, -Math.cos(a) * sp, -Math.sin(a) * sp, d / (sp * 2.2), R.chance(0.5) ? C[5] : C[3]);
        }
        if (R.chance(dt * 40 * g)) {
          const [bx, by] = onBlade(R.range(0.2, 1));
          ps.spawn(P.VAPOUR, bx + R.range(-2, 2), by, R.range(-8, 8), R.range(-30, -14), R.range(0.3, 0.6), C[1], R.range(2, 3.5));
        }
      }
      // ---- the release: the swing's flash, a hard light
      if (!released && t >= REL) {
        released = true;
        lights.add(18, -24, 70, C[5], 0.9, 0.5);
        lights.add(24, -14, 26, WHITE, 0.9, 0.12);
        for (let i = 0; i < 12; i++) ps.spawn(P.SPARK, 24 + R.range(-4, 4), -6, R.range(40, 220), R.range(-160, -30), R.range(0.2, 0.5));
      }
      // ---- the wave tearing along: chunks thrown up off its foot, dust, black wisps peeling off the back
      if (released) {
        const F = Math.min(front(t), 226), s = grow(t), k = fadeOut(t);
        for (let x = lastF; x < F; x += 3) {
          if (R.chance(0.3)) bits.add({ kind: B.CHUNK, x: x - 4, y: -1, vx: R.range(-20, 90), vy: R.range(-230, -90), a: R.range(0, TAU), va: R.range(-14, 14), s: R.range(1.5, 3.5), ramp: STONE, g: 1, bounce: 0.3, life: R.range(0.7, 1.3) });
          if (R.chance(0.6)) ps.spawn(P.DUST, x - 6, -2, R.range(-40, 30), R.range(-40, -10), R.range(0.6, 1.1), "#5a4650", R.range(3, 5.5));
          if (R.chance(0.35)) ps.spawn(P.SPARK, x, -2, R.range(-60, 90), R.range(-200, -60), R.range(0.2, 0.45));
        }
        lastF = Math.max(lastF, F);
        if (k > 0.05 && R.chance(dt * 70 * k)) {
          const u = R.range(0.1, 0.9), a = -SPAN + u * 2 * SPAN, r = R0 * s * 0.75, cx = front(t) - R0 * s, cy = -R0 * s * Math.sin(SPAN);
          ps.spawn(P.VAPOUR, cx + Math.cos(a) * r, cy + Math.sin(a) * r, R.range(-60, -20), R.range(-30, 4), R.range(0.4, 0.8), R.chance(0.7) ? C[1] : C[2], R.range(3, 6));
        }
        if (k > 0.05 && R.chance(dt * 30 * k)) ps.spawn(P.EMBER, front(t) - R.range(10, 30), R.range(-60, -10), R.range(-50, -10), R.range(-40, 0), R.range(0.6, 1.2), C[5], R.range(1, 2));
      }
      // ---- the target cut through
      if (!struck && t >= HIT) {
        struck = true;
        lights.add(TX, -26, 90, C[5], 1.1, 0.7);
        lights.add(TX, -26, 30, WHITE, 1, 0.14);
        for (let i = 0; i < 26; i++) {
          const a = R.range(-Math.PI * 0.9, 0.3), sp = R.range(110, 240);
          ps.spawn(P.SPARK, TX, -26 + R.range(-14, 14), Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.25, 0.6));
        }
        for (let i = 0; i < 10; i++) bits.add({ kind: B.SHARD, x: TX, y: -26 + R.range(-12, 12), vx: R.range(20, 120), vy: R.range(-220, -40), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(3, 6), c: R.chance(0.5) ? C[3] : C[2], g: 0.8, bounce: 0.3, life: R.range(0.9, 1.5) });
        for (let i = 0; i < 6; i++) ps.spawn(P.SMOKE, TX + R.range(-8, 14), -R.range(4, 30), R.range(10, 50), R.range(-20, -4), R.range(1.2, 1.9), C[1], R.range(5, 8));
      }
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      ps.draw(p, "back");
      // a dark pressure round him while he gathers it
      if (t < REL + 0.1) {
        const g = clamp(t / REL), k = t < REL ? g : 1 - (t - REL) / 0.1;
        p.disc(-2, -30, 22 + 6 * g, C[1], 0.18 * k);
      }
    },
    draw(p) {
      // ---- charge: black flame licking up off the raised blade, crimson at the edges, a white glint running up it
      if (t < REL) {
        const g = clamp(t / REL), tick = Math.floor(t * 24);
        for (let i = 0; i <= 14; i++) {
          const u = 0.15 + (i / 14) * 0.85, [bx, by] = onBlade(u), r = rand(i, tick, o.seed), h = (3 + 7 * g) * (0.5 + r) * (0.6 + 0.4 * u);
          for (let k = 0; k < h; k++) {
            const sway = Math.sin(t * 22 + i * 1.7 + k * 0.5) * k * 0.18, c = k < 1 ? C[5] : k < h * 0.45 ? VOID : k < h * 0.8 ? C[2] : C[3];
            p.dot(bx + sway, by - 1 - k, c, (1 - k / (h + 1)) * (0.4 + 0.6 * g));
          }
          p.dot(bx, by + 1, C[4], g);
        }
        const run = (t * 2.6) % 1;
        p.px(...onBlade(run), WHITE);
        p.glow(...onBlade(run), 6, C[6], 0.5 * g);
        p.glowLine(HAND[0], HAND[1], TIP[0], TIP[1], 12 + 6 * g, C[4], 0.15 + 0.3 * g * (0.7 + 0.3 * Math.sin(t * 50)));
      }
      // ---- the swing's smear: two frames of white arc, then crimson, gone
      const sw = t - REL;
      if (sw >= 0 && sw < 0.12) {
        const k = 1 - sw / 0.12, hot = sw < 0.04;
        p.arc(2, -29, 31, (u) => 7 * Math.sin(Math.PI * u) * k + 1, -2.4, 0.75, (u, v) => (hot && v > 0.5 ? WHITE : v > 0.7 ? C[6] : v > 0.35 ? C[4] : VOID), k > 0.6 ? 1 : k * 1.4);
        p.glow(16, -30, 30, C[5], 0.5 * k);
      }

      // ---- the trench it gouges: white-hot behind the wave, cooling to a dull red scar
      if (t >= REL) {
        const F = Math.min(front(t), 226);
        for (let x = X0; x < F; x += 8) {
          const age = t - (REL + (x - X0) / SPEED), k = 1 - clamp(age / 1.5);
          floorScar(p, x, Math.min(F, x + 8), o.seed, k * k, C);
        }
      }

      bits.draw(p);
      ps.draw(p, "front");

      // ---- the crescent itself: a white leading edge, crimson rim, a black body that frays into flame at the back
      const cores = [];
      if (t >= REL && fadeOut(t) > 0) {
        const s = grow(t), k = fadeOut(t), ft = Math.floor(t * 30);
        const { F, R: Rr, cx, cy } = crescent(p, t, s, (out, x, y, u, v) => {
          const n = noise(u * 14 + ft * 0.9, o.seed) * 0.5 + 0.5, tip = Math.min(u, 1 - u);
          if (v < 0.26 * n) return; // the frayed back edge
          let c;
          if (v > 0.93) c = sw < 0.08 ? WHITE : C[7];
          else if (v > 0.87) c = C[6];
          else if (v > 0.8) c = C[5];
          else if (v > 0.75) c = C[4];
          else if (v < 0.26 * n + 0.07) c = C[4];
          else if (v < 0.26 * n + 0.13) c = C[2];
          else if (v > 0.68 && rand(Math.floor(x), Math.floor(y), ft) < 0.3) c = C[2];
          else (c = VOID), cores.push([x, y]);
          out.a = k * clamp(tip * 9);
          return c;
        });
        // light along the edge, and a red haze trailing it
        for (let i = 1; i < 10; i++) {
          const a = -SPAN + (i / 10) * 2 * SPAN, x = cx + Math.cos(a) * Rr, y = cy + Math.sin(a) * Rr;
          p.glow(x - 2, y, 12, C[5], 0.32 * k);
          p.glow(x - 1, y, 4, C[6], 0.4 * k);
        }
        p.glow(F - 10, -36 * s, 60, C[4], 0.22 * k);
        // the floor lit red ahead of it
        p.glowLine(F - 30, 0, F + 20, 0, 10, C[5], 0.35 * k);
      }

      lights.draw(p);
      // the core stays black: light out of it, after every glow
      for (const [x, y] of cores) unlight(p, x, y, 0.08);
    },
  };
}
