// Inspired by wire-and-gas grapple gear in dark fantasy anime. Generic motifs only: no characters, gear designs or logos.
import { Particles, Lights, P, PF, Rng, rng, fit, sparkle, trail, clamp, smooth, ease, lerp, poseAt, WHITE, READY, TAU } from "../../../src/core/index.js";
import { ribbon } from "../_lib.js";

export const meta = {
  name: "ODM swing",
  desc: "Two grapple hooks fire and bite, the wires snap taut and gas jets haul him up in an arc. A spinning double cut through the nape, then a rush of white steam pours off the wound.",
  tags: ["attack on titan", "anime", "move", "wire", "grapple", "gas", "spin", "slash", "steam", "one-shot"],
  size: [236, 140],
  origin: [48, 118],
  duration: 3.0,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#0c0e14", "#1c2230", "#2e3648", "#4a5468", "#6e7a90", "#9aa6ba", "#d0d8e6", "#ffffff"],
    steam: "#f4e8e4",
    blood: ["#ffd0d0", "#ff5a50", "#d42a30", "#6a101c"],
    seed: 11,
  },
};

const TX = 104, HOOKS = [[TX - 14, -40], [TX - 6, -48]], NAPE = [TX, -44], HIP = [2, -17];
const FIRE = 0.04, BITE = FIRE + 0.15, HAUL = 0.24, CUT = 0.62, LAND_T = 0.92, LANDX = TX + 50;
// the body's centre swings out and up in one arc, passes the nape, comes down behind the target
const P0 = [0, -19], P1 = [TX * 0.26, -98], P2 = [NAPE[0] - 2, -49], P3 = [TX + 40, -86], P4 = [LANDX, -19];
const bez = (a, b, c, u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1]];
function centre(t) {
  if (t <= HAUL) return P0;
  if (t < CUT) return bez(P0, P1, P2, ease.inQuad(clamp((t - HAUL) / (CUT - HAUL))) * 0.7 + 0.3 * clamp((t - HAUL) / (CUT - HAUL)));
  if (t < LAND_T) return bez(P2, P3, P4, ease.outQuad(clamp((t - CUT) / (LAND_T - CUT))));
  return P4;
}

const GUARD = { ...READY, weapon: "sword", offWeapon: "sword", fx: 10, fy: -17, sa: 0.5, bx: 4, by: -17, sb: 0.9, ffx: 8, fbx: -8 };
const swing = (t, over = {}) => {
  const [x, y] = centre(t);
  return { ...GUARD, x, y: y + 19, crouch: 4, lean: 8, fx: 14, fy: -26, sa: -0.45, bx: -2, by: -27, sb: 0.35, ffx: 6, ffy: -8, fbx: -5, fby: -6, ghost: 1, ...over };
};
const keys = [];
for (let t = HAUL; t < LAND_T - 0.01; t += 0.07) keys.push([+t.toFixed(3), swing(t, t > CUT - 0.2 && t < CUT + 0.2 ? { yaw: ((t - (CUT - 0.2)) / 0.4) * TAU * 1.15, lean: 5 } : {}), "out"]);
export const act = {
  ghost: "#d0d8e6",
  target: { x: TX },
  poses: [
    [-0.4, { ...GUARD, x: -2 }],
    [-0.08, { ...GUARD, x: -2, crouch: 5, lean: 3, fx: 8, fy: -15, bx: 3, by: -15 }],
    [FIRE, { ...GUARD, x: 0, crouch: 4, lean: -2, fx: 12, fy: -19, bx: 9, by: -19, sa: 0.3, sb: 0.3 }, "snap"],
    [HAUL - 0.02, { ...GUARD, x: 0, crouch: 5, lean: 2 }],
    ...keys,
    [CUT, swing(CUT, { yaw: TAU * 0.6, lean: 4 }), "snap"],
    [LAND_T, { ...GUARD, x: LANDX, y: 0, crouch: 7, lean: 4, fx: 14, fy: -17, sa: 0.5, bx: 0, by: -17, sb: 1.2, ffx: 11, fbx: -10, yaw: TAU * 1.15 }, "snap"],
    [LAND_T + 0.6, { ...GUARD, x: LANDX, crouch: 5, fx: 12, fy: -18, sa: 0.5, yaw: TAU * 1.15 }],
    [2.8, { ...GUARD, x: LANDX, yaw: TAU * 1.15 }],
  ].sort((a, b) => a[0] - b[0]),
  hits: [
    { t: CUT, stop: 0.16, shake: 0.28, amp: 2, push: 3.4, straw: 24, skin: "red", flash: 0.06 },
    { t: CUT + 0.6, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: LAND_T, x: LANDX, n: 8, dir: -1 }],
};

// the wire from the hip to a hook, a little slack that goes as it pulls tight
function wire(p, a, b, slack, C, k = 1) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), pts = [];
  for (let i = 0; i <= 28; i++) {
    const u = i / 28;
    pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + slack * 4 * u * (1 - u)]);
  }
  p.polyline(pts, C[5], k);
  p.polyline(pts.slice(0, -1).map(([x, y]) => [x, y + 1]), C[3], k * 0.5);
  return L;
}
// the hook: three prongs round a bright head, trailing a glint
function hook(p, x, y, ang, C, k = 1) {
  const c = Math.cos(ang), s = Math.sin(ang);
  p.line(x, y, x - c * 4 + s * 3, y - s * 4 - c * 3, C[5], k);
  p.line(x, y, x - c * 4 - s * 3, y - s * 4 + c * 3, C[5], k);
  p.line(x, y, x + c * 3, y + s * 3, C[6], k);
  p.px(x, y, WHITE);
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, C[6], C[5], C[3]], haze: "#ff9a70" }), blood = new Particles({ rng: R, ground: floor, sparks: o.blood }), lights = new Lights();
  const steam = o.steam, gas = [{ t: FIRE, n: 5 }, { t: HAUL, n: 11 }, { t: 0.4, n: 8 }, { t: 0.55, n: 8 }, { t: CUT + 0.12, n: 6 }, { t: LAND_T, n: 8 }];
  let t = 0, bit = 0, cut = false, gi = 0, acc = 0;
  const hip = (tt) => {
    const [x, y] = centre(tt);
    return [x + 2, y + 2];
  };
  return {
    update(dt) {
      t += dt;
      while (gi < gas.length && t >= gas[gi].t) {
        const g = gas[gi++], [x, y] = hip(t), [x2, y2] = hip(t + 0.03), dx = x2 - x, dy = y2 - y, L = Math.hypot(dx, dy) || 1, bx = -dx / L, by = -dy / L;
        for (let i = 0; i < g.n; i++) {
          const sp = R.range(40, 130), a = Math.atan2(by, bx) + R.range(-0.45, 0.45);
          ps.spawn(P.VAPOUR, x, y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.35, 0.85), steam, R.range(2.4, 4.6));
          if (i % 2 === 0) ps.spawn(P.SPARK, x, y, Math.cos(a) * sp * 2.4, Math.sin(a) * sp * 2.4, R.range(0.08, 0.2));
        }
      }
      if (!bit && t >= BITE) {
        bit = 1;
        for (const [hx, hy] of HOOKS) {
          lights.add(hx, hy, 22, C[6], 0.7, 0.2);
          for (let i = 0; i < 8; i++) {
            const a = R.range(-3.3, 0.2), s = R.range(60, 200);
            ps.spawn(P.SPARK, hx, hy, Math.cos(a) * s, Math.sin(a) * s, R.range(0.12, 0.35));
          }
        }
      }
      if (!cut && t >= CUT) {
        cut = true;
        lights.add(NAPE[0], NAPE[1], 46, C[7], 1, 0.3);
        lights.add(NAPE[0], NAPE[1], 34, "#ff8a60", 0.7, 0.8);
        for (let i = 0; i < 26; i++) {
          const a = R.range(-3.6, 0.5), s = R.range(120, 340);
          ps.spawn(P.SPARK, NAPE[0] + R.range(-18, 18), NAPE[1] + R.range(-3, 3), Math.cos(a) * s, Math.sin(a) * s, R.range(0.12, 0.4));
        }
        for (let i = 0; i < 16; i++) {
          const a = R.range(-2.6, -0.5), s = R.range(80, 240);
          blood.spawn(P.SPARK, NAPE[0] + R.range(-6, 6), NAPE[1], Math.cos(a) * s, Math.sin(a) * s, R.range(0.3, 0.7));
        }
      }
      // after the cut the wound pours steam, and the whole body hisses with it
      if (t > CUT && t < CUT + 1.0) {
        const k = 1 - (t - CUT) / 1.0;
        for (acc += dt * (130 * k + 20); acc >= 1; acc--) {
          const wound = R.chance(0.55), x = wound ? NAPE[0] + R.range(-9, 9) : TX + R.range(-15, 15), y = wound ? NAPE[1] + R.range(-4, 3) : -R.range(6, 46);
          ps.spawn(P.VAPOUR, x, y, R.range(-14, 22), -R.range(24, 70), R.range(0.8, 1.35), steam, wound ? R.range(5, 10) : R.range(3.5, 6.5));
        }
      }
      ps.update(dt);
      blood.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      ps.draw(p, "back");
    },
    draw(p) {
      // ---- the hooks fly, bite, and the wires go taut; after the cut they let go and fall
      const [hx, hy] = hip(t);
      HOOKS.forEach(([gx, gy], i) => {
        const fly = clamp((t - FIRE - i * 0.02) / 0.13);
        if (t < FIRE) return;
        const bitten = t >= BITE + i * 0.02, let_go = clamp((t - CUT - 0.08) / 0.5);
        const x = bitten ? gx : lerp(HIP[0], gx, ease.outQuad(fly)), y = bitten ? gy : lerp(HIP[1], gy, ease.outQuad(fly)) - 6 * Math.sin(Math.PI * fly);
        const pull = bitten ? smooth(BITE, HAUL, t) : 0, shake = bitten && t < BITE + 0.14 ? Math.sin((t - BITE) * 90) * 3 * (1 - (t - BITE) / 0.14) : 0;
        const slack = (bitten ? 9 * (1 - pull) + shake : 6 * Math.sin(Math.PI * fly)) + 30 * ease.inQuad(let_go);
        if (let_go < 1) wire(p, [hx + i, hy - i], [x, y], slack, C, 1 - let_go);
        if (!bitten) hook(p, x, y, Math.atan2(gy - HIP[1], gx - HIP[0]), C);
        else if (let_go < 0.4) hook(p, gx, gy, Math.atan2(gy - hy, gx - hx) + 3.14, C, 1 - let_go * 2.5);
        if (!bitten && fly > 0.1) p.glowLine(HIP[0], HIP[1], x, y, 5, C[6], 0.25);
      });
      // ---- speed lines behind him as he swings
      if (t > HAUL && t < LAND_T + 0.05) {
        const tr = trail(centre, t, 9, 0.016);
        for (const off of [-4, 0, 4]) {
          const pts = tr.map(([x, y], i) => [x - 0 + (off ? 0 : 0), y + off * 0.9 + 1]);
          p.polyline(pts, C[6], off === 0 ? 0.8 : 0.45);
        }
      }
      // ---- the double cut: a flat ring of steel round the nape, whipped through in an instant
      if (t >= CUT - 0.02) {
        const u = t - CUT, head = ease.outExpo(clamp((u + 0.02) / 0.07)), tail = smooth(0.06, 0.22, u), pts = [];
        for (let a = -2.7 + tail * 5.6; a <= -2.7 + head * 5.6; a += 0.12) pts.push([NAPE[0] + Math.cos(a) * 26, NAPE[1] + Math.sin(a) * 6.5]);
        if (pts.length > 2 && tail < 1) ribbon(p, pts, { w: (v) => 1.5 + 4 * v * (1 - tail), c: (v, w) => (Math.abs(w) < 0.45 ? WHITE : C[6]), a: clamp(1.2 - tail) });
        if (u < 0.12) p.line(NAPE[0] - 22, NAPE[1] + 1, NAPE[0] + 22, NAPE[1] - 1, WHITE);
        if (u < 0.2) sparkle(p, NAPE[0], NAPE[1], 12 * (1 - u / 0.2), WHITE, C[6], 0.7);
        // the slit glows hot where the flesh was opened
        if (u < 1.1) p.glow(NAPE[0], NAPE[1], 20, "#ff7a50", 0.35 * (1 - u / 1.1));
      }
      blood.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
