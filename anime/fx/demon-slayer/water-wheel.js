// Inspired by flowing water sword styles in shonen anime. Generic motifs only: no characters, costumes or logos.
import { Particles, Lights, P, PF, Rng, rng, rand, fit, band, clamp, smooth, ease, lerp, poseAt, WHITE, READY, TAU } from "../../../src/core/index.js";
import { ribbon, pathSamples } from "../_lib.js";

export const meta = {
  name: "Water wheel",
  desc: "A spinning leap trails a wheel of water with curling foam crests; it rolls off him along the floor, rears up into a breaking wave and crashes over the target.",
  tags: ["demon slayer", "anime", "move", "water", "wheel", "wave", "sword", "one-shot"],
  size: [268, 132],
  origin: [48, 112],
  duration: 2.4,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#081830", "#0e2e5a", "#14508c", "#1c76bc", "#36a2e0", "#78ccf4", "#c4ecff", "#ffffff"],
    sparks: ["#ffffff", "#c4ecff", "#78ccf4", "#36a2e0"],
    seed: 4,
  },
};

const JUMP = 0.36, REL = 0.8, HIT = REL + 0.12, TX = 126, LAND = 66, R0 = 22, PHI = 0.9, OMEGA = 16, TRAIL = 0.46, ROLL = 300;
const STANCE = { ...READY, weapon: "sword", fx: 10, fy: -15, sa: 0.75, bx: 7, by: -18, ffx: 8, fbx: -8 };
const UP = { fx: -7, fy: -38, sa: -2.2, bx: 10, by: -30, armsFront: true };
const air = (x, y, yaw, over = {}) => ({ ...STANCE, x, y, yaw, crouch: 4, lean: 2, fx: 13, fy: -23, sa: -0.25, bx: -6, by: -25, ffx: 6, ffy: -9, fbx: -3, fby: -8, ...over });
export const act = {
  ghost: "#bfeaff",
  target: { x: TX },
  poses: [
    [-0.35, STANCE],
    [JUMP - 0.14, { ...STANCE, crouch: 6, lean: 4, ...UP, ffx: 9, fbx: -8 }],
    [JUMP, { ...STANCE, x: 6, y: -3, crouch: 1, lean: -2, ...UP, ffx: 5, ffy: -3, fbx: -6, fby: -2 }, "out"],
    [JUMP + 0.17, air(30, -26, Math.PI * 0.8)],
    [JUMP + 0.3, air(50, -22, Math.PI * 1.45, { ghost: 1 })],
    [REL - 0.04, air(LAND - 2, -5, Math.PI * 1.95, { ffy: -3, fby: -2 })],
    [REL, { ...STANCE, x: LAND, y: 0, yaw: TAU, crouch: 8, lean: 7, fx: 19, fy: -22, sa: 0.25, bx: -5, by: -21, ffx: 12, fbx: -11, toeB: true }, "snap"],
    [REL + 0.5, { ...STANCE, x: LAND + 3, yaw: TAU, crouch: 7, lean: 6, fx: 18, fy: -22, sa: 0.3, bx: -6, by: -22, ffx: 12, fbx: -10 }],
    [REL + 1.2, { ...STANCE, x: LAND + 3, yaw: TAU, crouch: 3, fx: 12, fy: -17, sa: 0.7, ffx: 8, fbx: -8 }],
    [2.2, { ...STANCE, x: LAND + 3, yaw: TAU }],
  ],
  hits: [
    { t: HIT, stop: 0.12, shake: 0.2, amp: 2, push: 3.4, straw: 12, skin: "ice", flash: 0.04 },
    { t: HIT + 0.9, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: JUMP, x: 2, n: 5, dir: -1 }, { t: REL, x: LAND, n: 8, dir: -1, c: "#a8c8dc" }],
};

// where the wheel's centre is: with him while he's in the air, then rolling along the floor on its own
const bodyAt = (t) => {
  const q = poseAt(act.poses, t);
  return [q.x ?? 0, (q.y ?? 0) - 19];
};
function centre(t, R) {
  if (t <= REL) {
    const [x, y] = bodyAt(Math.max(JUMP, t));
    return [x, Math.min(y, -R * 0.94)];
  }
  const [x0] = bodyAt(REL), u = t - REL;
  return [x0 + ROLL * u * (1 - 0.35 * u), -R * 0.94];
}
const radius = (t) => R0 * (0.45 + 0.55 * ease.outCubic(clamp((t - JUMP) / 0.16)));

// a point on the wheel: its plane is turned PHI towards us, so it reads as a tall ellipse with a near and a far side
function onWheel(t) {
  const R = radius(t), [cx, cy] = centre(t, R), th = -1.2 + OMEGA * (t - JUMP);
  return [cx + R * Math.cos(th) * Math.cos(PHI), cy + R * Math.sin(th), R * Math.cos(th) * Math.sin(PHI), th];
}
const chaikin = (pts, n) => {
  for (let k = 0; k < n; k++) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
};
// the crest that rears up at the target, base on the floor, curling over towards him
const CREST = chaikin([[0, 1], [-2, -12], [-1, -28], [7, -42], [22, -49], [36, -43], [41, -31], [35, -24]], 3);

// the foam claw: a hooked tongue off the outer edge of the water, white with a pale underside
function claw(p, x, y, ox, oy, tx, ty, s, C) {
  for (let i = 0; i <= 6; i++) {
    const u = i / 6, a = u * s, o = Math.sin(u * 2.7) * s * 0.55 - Math.pow(u, 2.2) * s * 0.5, f = u * u * s * 0.5;
    const px = x + ox * (1 + o) + tx * (a * 0.9 + f), py = y + oy * (1 + o) + ty * (a * 0.9 + f);
    p.dot(px, py, u < 0.75 ? WHITE : C[6]);
    if (u > 0.15 && u < 0.7) p.dot(px - ox * 0.8, py - oy * 0.8, C[5]);
  }
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: o.sparks, haze: C[4] }), lights = new Lights();
  let t = 0, released = false, crashed = false, acc = 0;

  // the ribbon the blade tip has drawn: runs of points on the near side (front) and the far side (back)
  function runs(now) {
    const head = Math.min(now, HIT + 0.1), from = Math.max(JUMP, now - TRAIL), n = 96, front = [], back = [];
    let cur = null, side = 0;
    for (let i = 0; i <= n; i++) {
      const tau = from + ((head - from) * i) / n;
      if (head <= from) break;
      const [x, y, z, th] = onWheel(tau), s = z >= 0 ? 1 : -1, pt = { x, y, age: now - tau, th };
      if (s !== side) {
        const keep = cur && cur.pts[cur.pts.length - 1];
        cur = { s, pts: keep ? [keep, pt] : [pt] };
        (s > 0 ? front : back).push(cur);
        side = s;
      } else cur.pts.push(pt);
    }
    return { front, back };
  }
  const drawRibbon = (p, run) => {
    const pts = run.pts;
    if (pts.length < 2) return;
    const dying = 1 - clamp((t - HIT) / 0.2);
    ribbon(p, pts.map((q) => [q.x, q.y]), {
      w: (u) => {
        const q = pts[Math.min(pts.length - 1, Math.round(u * (pts.length - 1)))], k = clamp(1 - q.age / TRAIL), r = radius(t);
        return 12 * Math.pow(k, 0.62) * dying * (0.4 + 0.6 * clamp((q.age + 0.02) / 0.05) ** 0) * Math.min(1, r / 14);
      },
      c: (u, v, i) => {
        const q = pts[Math.min(pts.length - 1, Math.round(u * (pts.length - 1)))], e = -v, age = q.age / TRAIL, flow = Math.sin(i * 0.55 - t * 38 + v * 3) > 0.35;
        if (e > 0.78) return rand(i, Math.round(v * 4), 11) < 0.5 + 0.5 * (1 - age) ? WHITE : C[6];
        if (e > 0.42) return C[6 - (age > 0.6 ? 1 : 0)];
        if (e > -0.15) return flow ? C[5] : C[4];
        return age > 0.5 ? C[2] : flow ? C[3] : C[2];
      },
      a: (u) => clamp(u * 3.2 + 0.1),
    });
    // curling crests along the outer edge
    for (let i = 4; i < pts.length - 2; i += 6) {
      const q = pts[i], a = pts[i - 1], b = pts[i + 1], k = 1 - q.age / TRAIL;
      if (k < 0.3 || k > 0.95) continue;
      let dx = b.x - a.x, dy = b.y - a.y;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      const w = 12 * Math.pow(k, 0.62) * dying;
      claw(p, q.x + dy * (w / 2), q.y - dx * (w / 2), dy, -dx, dx, dy, 2.2 + 3.2 * k * dying, C);
    }
    const hd = pts[pts.length - 1];
    if (t < HIT + 0.1) p.glow(hd.x, hd.y, 16, C[5], 0.35 * dying);
  };

  return {
    update(dt) {
      t += dt;
      // spray thrown off the head of the ribbon while it spins
      if (t >= JUMP && t < HIT) {
        const [x, y0, , th] = onWheel(t), y = Math.min(y0, -1), sp = radius(t) * OMEGA;
        for (acc += dt * 150; acc >= 1; acc--) {
          const out = th + R.range(-0.4, 0.4), vx = -Math.sin(th) * Math.cos(PHI) * sp * 0.7 + Math.cos(out) * 30, vy = Math.cos(th) * sp * 0.7 + Math.sin(out) * 30 - 30;
          ps.spawn(P.SPARK, x, y, vx * R.range(0.4, 1), vy * R.range(0.4, 1), R.range(0.18, 0.45));
          if (R.chance(0.25)) ps.spawn(P.VAPOUR, x, y, vx * 0.1, vy * 0.1 - 6, R.range(0.3, 0.6), C[6], R.range(2, 3.5));
        }
      }
      if (!released && t >= REL) {
        released = true;
        const [x] = centre(REL, R0);
        lights.add(x, -16, 40, C[5], 0.6, 0.3);
        for (let i = 0; i < 12; i++) ps.spawn(P.VAPOUR, x + R.range(-10, 10), -3, R.range(-60, 40), R.range(-30, -8), R.range(0.35, 0.7), C[6], R.range(3, 5));
      }
      if (released && t < HIT) {
        // the wheel rolling: a spray off the floor behind it
        const [x] = centre(t, R0);
        for (let i = 0; i < 2; i++) ps.spawn(P.SPARK, x + R.range(-4, 4), -2, R.range(-130, -30), R.range(-110, -40), R.range(0.18, 0.4));
      }
      if (!crashed && t >= HIT) {
        crashed = true;
        const bx = TX - 22;
        lights.add(TX, -22, 70, C[5], 0.95, 0.5);
        for (let i = 0; i < 40; i++) {
          const a = -Math.PI / 2 + R.range(-0.9, 1.1), s = R.range(120, 330);
          ps.spawn(P.SPARK, bx + R.range(-6, 20), -4 - R.range(0, 30), Math.cos(a) * s, Math.sin(a) * s, R.range(0.25, 0.7));
        }
        for (let i = 0; i < 16; i++) ps.spawn(P.VAPOUR, TX + R.range(-24, 24), -R.range(2, 30), R.range(-20, 70), R.range(-60, -10), R.range(0.5, 1.1), C[6], R.range(3, 6));
        for (let i = 0; i < 8; i++) ps.spawn(P.DUST, TX + R.range(-20, 30), -2, R.range(-30, 80), R.range(-20, -4), R.range(0.5, 1), C[5], R.range(3, 5));
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      // ripples under him as he gathers, and a pool where the wave breaks
      if (t < JUMP + 0.1) {
        const g = clamp(t / JUMP);
        for (const [r0, k] of [[0, 1], [0.5, 0.7]]) {
          const ph = (g * 1.6 + r0) % 1;
          band(p, 4, 1, 6 + ph * 22, 0.2, 1.5, (1 - ph) * 0.8 * (t < JUMP ? 1 : 0.5), C.slice(3, 8));
        }
        p.glow(4, -2, 22, C[4], 0.18 * g);
      }
      if (t >= HIT) {
        const u = t - HIT;
        for (const [d, w] of [[0, 1], [0.16, 0.7]]) if (u > d) band(p, TX - 4, 2, 6 + 52 * ease.outCubic(clamp((u - d) / 0.7)), 0.2, 2, (1 - clamp((u - d) / 0.8)) * w, C.slice(3, 8));
      }
      for (const run of runs(t).back) drawRibbon(p, run);
      ps.draw(p, "back");
    },
    draw(p) {
      for (const run of runs(t).front) drawRibbon(p, run);
      // the wave: it rears up out of the floor, curls over the target, and falls apart
      if (t >= HIT) {
        const u = t - HIT, grow = ease.outQuart(clamp(u / 0.24)), fall = clamp((u - 0.28) / 0.45), base = TX - 26;
        if (fall < 1) {
          const S = pathSamples(CREST, 0.7).pts, n = S.length, upto = Math.floor(n * grow), drop = 1 - ease.inQuad(fall);
          const pts = S.slice(0, upto).map(([x, y]) => [base + x * (0.8 + 0.2 * drop), y * drop * (0.55 + 0.45 * grow)]);
          if (pts.length > 2)
            ribbon(p, pts, {
              w: (v) => (11 - 8 * v) * (0.5 + 0.5 * drop),
              c: (v, w, i) => {
                const e = -w;
                if (e > 0.7) return rand(i, Math.round(w * 5), 3) < 0.65 ? WHITE : C[6];
                if (e > 0.25) return C[6];
                if (e > -0.3) return Math.sin(i * 0.6 - u * 30) > 0.3 ? C[5] : C[4];
                return Math.sin(i * 0.5 + u * 20) > 0.5 ? C[3] : C[2];
              },
              a: clamp(drop * 1.6),
            });
          for (let i = 8; i < pts.length - 3; i += 7) {
            const a = pts[i - 1], b = pts[i + 1];
            let dx = b[0] - a[0], dy = b[1] - a[1];
            const l = Math.hypot(dx, dy) || 1;
            dx /= l;
            dy /= l;
            if (i / pts.length > 0.5 || i < 16) claw(p, pts[i][0] + dy * 5, pts[i][1] - dx * 5, dy, -dx, dx, dy, 3.5 * drop, C);
          }
          if (pts.length) p.glow(pts[pts.length - 1][0], pts[pts.length - 1][1], 22, C[5], 0.3 * drop);
        }
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
