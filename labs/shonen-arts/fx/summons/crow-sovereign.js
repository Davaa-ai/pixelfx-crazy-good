// Crow Sovereign: black feathers fountain out of a crimson seal, a murder of crows sweeps in from off-screen and wheels into a
// tightening vortex, and it collapses into a tall figure in a feathered coat and a bird-skull mask, wings half spread, staff in
// hand. A dozen crows keep revolving round him, near ones in front and far ones behind, until he bursts back into the flock.

import { fit, Particles, Lights, Rng, sparkle } from "../../../../src/core/index.js";
import { summonMeta, summonAct, summonCamera, sealCircle, runeTrail, ball, slab, seam, hex, mix, smooth, seg, lerp, ease, WHITE, TAU } from "../../lib/summon.js";

/** Crimson, dark to bright: the seal and his one eye. */
const CRIMSON = ["#070407", "#160a10", "#2e0f1a", "#561424", "#8c1c2c", "#c8323a", "#f07a6a", "#ffe0d0"];
/** Crow-black with a blue sheen, dark to bright. */
const FEATHER = ["#030305", "#0a0a11", "#141623", "#212739", "#323d57", "#4c5d80"].map(hex);
const BONE = ["#1c1814", "#4a4238", "#8a7f6e", "#c4b9a2", "#ece4d0"].map(hex);

export const meta = summonMeta({
  name: "Crow Sovereign",
  desc: "Black feathers fountain out of a crimson seal; a murder of crows sweeps in from off-screen and wheels into a tightening vortex that collapses into a tall figure in a feathered coat and bird-skull mask, wings half spread. A dozen crows keep revolving round him, until he bursts back into the flock and it scatters.",
  tags: ["crow", "raven", "flock", "dark", "master", "small"],
  duration: 7.0,
  options: { palette: CRIMSON, seed: 51 },
});

const SX = 118;
const FOUNT = 0.5, FLOCK0 = 0.75, VORTEX = 1.9, CONDENSE = 2.2, FORM = 2.42, SCATTER = 5.0;
const N = 44, ORBIT = 12;

export const act = summonAct({ rise: 0.85, hold: 5.6, hits: [{ t: FORM, stop: 0.06, shake: 0.25, amp: 2 }, { t: SCATTER, shake: 0.2, amp: 1 }] });
export const camera = summonCamera({ SX, top: 92, hw: 56, pullAt: FLOCK0 + 0.2, pull: 0.6, backAt: SCATTER + 0.6 });

// the seal quiets once he has formed, and goes when he does
const sealK = (t) => (1 - 0.55 * smooth(FORM, FORM + 0.6, t)) * (1 - smooth(SCATTER + 0.2, SCATTER + 0.8, t));

/** A crow: body, head and beak, tail, wings at one of three beats (0 up, 1 level, 2 down), facing dir. dim darkens far ones. */
function crow(p, x, y, dir, beat, s = 1.25, dim = 0, eye = 0) {
  const F = dim ? FEATHER.map((c) => mix(c, FEATHER[1], dim)) : FEATHER, X = (v) => x + dir * v * s, Y = (v) => y + v * s;
  const wy = beat === 0 ? -4 : beat === 1 ? -1 : 2.5;
  // far wing, body, tail, near wing: black, the sheen only on edges so they read against the night
  slab(p, [[X(-1), Y(-1)], [X(2), Y(-1)], [X(-3), Y(wy - 1)]], F, 0.6, { rim: false });
  slab(p, [[X(-4), Y(0)], [X(-1), Y(-2)], [X(3), Y(-2)], [X(4), Y(0)], [X(1), Y(1.5)], [X(-3), Y(1)]], F, 0.4, { rim: false });
  slab(p, [[X(-6), Y(1)], [X(-3), Y(-0.5)], [X(-3), Y(1.5)]], F, 0.4, { rim: false });
  slab(p, [[X(-2), Y(-1)], [X(2), Y(-1)], [X(-1), Y(wy)], [X(-5), Y(wy + 0.5)]], F, 1, { rim: false });
  p.line(X(2), Y(-1), X(-5), Y(wy + 0.5), F[dim ? 3 : 5]);
  p.line(X(-1), Y(-2), X(3), Y(-2), F[dim ? 2 : 4]);
  p.px(X(4), Y(-1.5), F[1]);
  p.px(X(5), Y(-1), BONE[dim ? 1 : 2]);
  if (eye > 0.3) p.px(X(4), Y(-2), hex(CRIMSON[5]));
}

/** Him: a feathered coat, a mantle of layered feathers, a bird-skull mask with one red eye, a crooked staff, wings. */
function sovereign(p, C, gx, t, wing, eyeK, a = 1) {
  const sway = (i) => Math.sin(t * 2 + i) * 1.2;
  // wings behind him, from half-spread to folded
  for (const s of [-1, 1]) {
    const sp = wing, root = [gx + s * 6, -44];
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI / 2 + s * (0.5 + i * 0.22 * (0.4 + 0.6 * sp)), L = (16 + i * 3) * (0.55 + 0.45 * sp);
      const tip = [root[0] + Math.cos(ang) * L, root[1] + Math.sin(ang) * L * 0.9 + i * 2];
      slab(p, [[root[0], root[1]], [root[0] + s * 3, root[1] + 3], tip], FEATHER, s < 0 ? 1.4 : 0.8, { a });
      seam(p, root[0], root[1], tip[0], tip[1], FEATHER[s < 0 ? 5 : 3], a);
    }
  }
  // the coat, split at the back into feathered tails
  const hem = [];
  for (let i = 0; i <= 8; i++) hem.push([gx + 15 - i * 3.75, (i % 2 ? -4 : 0) + sway(i) * (i % 2)]);
  slab(p, [[gx - 9, -44], [gx + 9, -44], ...hem], FEATHER, (x) => (x < gx - 4 ? 2.2 : x < gx + 3 ? 1.3 : 0.6), { a });
  slab(p, [[gx + 1, -34], [gx + 3, -34], [gx + 7, 0], [gx - 1, 0]], CRIMSON.map(hex), (x) => (x < gx + 2 ? 4 : 3), { a, rim: false });
  seam(p, gx - 9, -44, hem[hem.length - 1][0], hem[hem.length - 1][1], FEATHER[5], a);
  for (let i = 0; i < 4; i++) seam(p, gx - 7 + i * 2, -30 + i * 3, gx - 9 + i * 2, -6 + i, FEATHER[4], 0.6 * a);
  // the staff in the near hand: gnarled, crooked at the top, a crow perched on the hook
  const sx = gx - 13;
  seam(p, sx + 1, 0, sx, -40, BONE[1], a); seam(p, sx, -40, sx - 2, -58, BONE[1], a); seam(p, sx - 2, -58, sx + 3, -64, BONE[1], a); seam(p, sx + 3, -64, sx + 6, -61, BONE[1], a);
  seam(p, sx + 2, 0, sx + 1, -40, BONE[0], a);
  ball(p, sx, -34, 2.5, 3, FEATHER, { a, lift: 1 });
  crow(p, sx + 3, -66, 1, Math.floor(t * 2) % 7 === 0 ? 1 : 2, 0.8, 0, eyeK);
  // the far hand, long clawed fingers
  for (let f = -1; f <= 1; f++) seam(p, gx + 12, -30, gx + 15 + f, -24 + Math.abs(f), BONE[2], a);
  slab(p, [[gx + 8, -42], [gx + 11, -42], [gx + 13, -30], [gx + 10, -30]], FEATHER, 2, { a });
  // the mantle: two rows of feathers round the shoulders, pointing down, a blue sheen on the lit side
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 8; i++) {
      const fx = gx - 14 + i * 4 + row * 2, fy = -46 + row * 5, l = 7 - row * 2 + ((i * 3) % 3);
      const tipx = fx + 0.5 + Math.sin(t * 2 + i) * 0.5;
      slab(p, [[fx - 2, fy], [fx + 2, fy], [tipx, fy + l]], FEATHER, fx < gx ? 2.2 : 1.2, { a });
      seam(p, fx - 2, fy, tipx, fy + l, FEATHER[fx < gx ? 5 : 3], a);
    }
  // hood and mask: a long bone beak, one socket lit red
  ball(p, gx, -53, 6, 7, FEATHER, { a, lift: 0.2 });
  slab(p, [[gx - 2, -56], [gx + 3, -57], [gx + 15, -52], [gx + 3, -49], [gx - 1, -50]], BONE, (x) => (x < gx + 4 ? 3.6 : 2.6), { a });
  seam(p, gx + 4, -52, gx + 13, -52, BONE[1], a);
  p.px(gx + 2, -54, FEATHER[0]);
  if (eyeK > 0.05) {
    p.px(gx + 2, -54, eyeK > 0.6 ? hex(C[7]) : hex(C[5]));
    p.glow(gx + 2, -54, 7, hex(C[5]), 0.7 * eyeK);
  }
}

export function create(o) {
  const C = fit(o.palette, 8).map(hex), R = new Rng(o.seed);
  const lights = new Lights();
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] });
  // the murder: each crow starts off-screen and spirals in to a slot in the vortex
  const flock = Array.from({ length: N }, (_, i) => ({
    a0: R.range(0, TAU), R0: R.range(170, 240), y0: R.range(-150, 20), t0: FLOCK0 + R.range(0, 0.5),
    rv: R.range(14, 46), yv: R.range(-82, -12), w: R.range(3.2, 4.6), ph: R.int(0, 2),
  }));
  const orbit = Array.from({ length: ORBIT }, (_, i) => ({ ph: (i / ORBIT) * TAU + R.range(-0.2, 0.2), r: R.range(26, 48), y: R.range(-70, -22), w: R.range(1.1, 1.6) * (i % 4 === 0 ? -1 : 1), tilt: R.range(0.2, 0.35) }));
  const scatter = Array.from({ length: 30 }, () => ({ a: R.range(-Math.PI, 0.3), sp: R.range(80, 170), y: R.range(-56, -10) }));
  // feathers: drifting, turning slowly as they fall
  const feathers = [];
  let t = 0, formed = false, burst = false;
  const addFeather = (x, y, vx, vy) => feathers.push({ x, y, vx, vy, a: R.range(0, TAU), va: R.range(-4, 4), life: R.range(1.2, 2.2), ph: R.range(0, TAU) });

  return {
    update(dt) {
      t += dt;
      if (t > FOUNT && t < FOUNT + 0.5 && R.chance(dt * 70)) addFeather(SX + R.range(-8, 8), -2, R.range(-50, 50), -R.range(90, 190));
      if (t >= FORM && !formed) {
        formed = true;
        lights.add(SX, -40, 70, C[5], 1.3, 0.4);
        for (let i = 0; i < 30; i++) {
          const a = R.range(0, TAU), sp = R.range(40, 140);
          addFeather(SX + Math.cos(a) * 6, -36 + Math.sin(a) * 10, Math.cos(a) * sp, Math.sin(a) * sp - 30);
        }
      }
      if (t >= SCATTER && !burst) {
        burst = true;
        lights.add(SX, -36, 50, C[5], 1, 0.3);
        for (let i = 0; i < 24; i++) addFeather(SX + R.range(-10, 10), -R.range(10, 56), R.range(-80, 80), -R.range(20, 100));
      }
      if (t > FORM && t < SCATTER && R.chance(dt * 2.5)) addFeather(SX + R.range(-50, 50), -R.range(60, 90), R.range(-6, 6), R.range(0, 8));
      for (const f of feathers) {
        f.life -= dt;
        f.vx -= f.vx * 2.5 * dt; f.vy += (40 - f.vy * 2.5) * dt;
        f.x += (f.vx + Math.sin(t * 3 + f.ph) * 10) * dt; f.y = Math.min(-1, f.y + f.vy * dt); f.a += f.va * dt;
      }
      for (let i = feathers.length - 1; i >= 0; i--) if (feathers[i].life <= 0) feathers.splice(i, 1);
      lights.update(dt);
      ps.update(dt);
    },
    drawBack(p) {
      runeTrail(p, 16, SX - 62, seg(t, 0.02, 0.4), 1 - smooth(1.2, 1.8, t), C);
      sealCircle(p, SX, 62, ease.outCubic(seg(t, 0.12, 0.55)), sealK(t), C, t, "back");
      const back = smooth(FORM - 0.1, FORM + 0.3, t) * (1 - smooth(SCATTER, SCATTER + 0.4, t));
      if (back > 0) p.glow(SX, -40, 46, C[3], 0.35 * back);
    },
    draw(p) {
      const beat = (i) => (Math.floor(t * 14) + i) % 3;
      const crows = [];
      // the flock arriving, wheeling, condensing
      if (t > FLOCK0 && t < FORM) {
        for (let i = 0; i < N; i++) {
          const c = flock[i], u = ease.outCubic(seg(t, c.t0, VORTEX)), cu = ease.inCubic(seg(t, CONDENSE, FORM));
          if (t < c.t0) continue;
          const ang = c.a0 + c.w * (t - c.t0) + 6 * Math.max(0, t - VORTEX) ** 2;
          const r = lerp(lerp(c.R0, c.rv, u), 0, cu), y = lerp(lerp(c.y0, c.yv, u), -34, cu);
          crows.push({ x: SX + Math.cos(ang) * r, y: y + Math.sin(ang) * r * 0.2, z: Math.sin(ang), dir: Math.cos(ang + Math.PI / 2) >= 0 ? 1 : -1, b: beat(c.ph + i), s: 1 - cu * 0.7 });
        }
      }
      // the dozen that revolve round him
      if (t >= FORM - 0.05 && t < SCATTER + 1.4) {
        const out = ease.outCubic(seg(t, FORM - 0.05, FORM + 0.5)), gone = seg(t, SCATTER, SCATTER + 1.3);
        orbit.forEach((ob, i) => {
          const ang = ob.ph + ob.w * t, r = ob.r * out * (1 + gone * 5), y = ob.y - gone * 120 * (0.5 + 0.5 * Math.abs(Math.cos(ob.ph)));
          crows.push({ x: SX + Math.cos(ang) * r, y: y + Math.sin(ang) * r * ob.tilt, z: Math.sin(ang), dir: Math.sign(ob.w) * (Math.cos(ang + Math.PI / 2) >= 0 ? 1 : -1), b: beat(i), s: 1 });
        });
      }
      // and the burst he becomes when he goes
      if (t >= SCATTER && t < SCATTER + 1.5) {
        const v = t - SCATTER;
        scatter.forEach((c, i) => crows.push({ x: SX + Math.cos(c.a) * c.sp * v, y: c.y + Math.sin(c.a) * c.sp * v * 0.8 - 30 * v * v, z: i % 2 ? 1 : -1, dir: Math.cos(c.a) >= 0 ? 1 : -1, b: beat(i), s: 1 }));
      }
      for (const c of crows) if (c.z < 0) crow(p, c.x, c.y, c.dir, c.b, c.s * 1.05, 0.5);
      // he stands where the vortex collapsed
      if (t >= FORM - 0.04 && t < SCATTER + 0.05) {
        const wing = 1 - 0.7 * ease.inOutSine(seg(t, FORM + 0.5, FORM + 1.1)) + 0.7 * ease.outCubic(seg(t, SCATTER - 0.25, SCATTER));
        sovereign(p, C, SX, t, wing, smooth(FORM + 0.2, FORM + 0.4, t), 1);
      }
      for (const c of crows) if (c.z >= 0) crow(p, c.x, c.y, c.dir, c.b, c.s * 1.25, 0, 1);
      // the vortex wind and the flash as it collapses
      if (t > VORTEX - 0.3 && t < FORM) {
        const k = smooth(VORTEX - 0.3, VORTEX, t);
        for (let j = 0; j < 3; j++) {
          let prev = null;
          for (let y = -6; y >= -86; y -= 3) {
            const ang = -y * 0.08 + j * 2.1 - t * 8, r = 10 + (-y) * 0.35 * (1 - ease.inCubic(seg(t, CONDENSE, FORM))), pt = [SX + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.2];
            if (prev && Math.sin(ang) > -0.3) p.line(prev[0], prev[1], pt[0], pt[1], C[3], k * 0.8);
            prev = pt;
          }
        }
      }
      if (t > FORM - 0.04 && t < FORM + 0.06) {
        p.circle(SX, -34, 16, C[7]);
        p.glow(SX, -34, 60, C[5], 1);
      }
      if (t > FORM && t < FORM + 0.14) sparkle(p, SX + 2, -54, 8, WHITE, C[6], 0.7);
      // feathers
      for (const f of feathers) {
        const k = Math.min(1, f.life / 0.5), ca = Math.cos(f.a) * 2, sa = Math.sin(f.a) * 2;
        p.line(f.x - ca, f.y - sa, f.x + ca, f.y + sa, FEATHER[3], k);
        p.dot(f.x + ca, f.y + sa, FEATHER[5], k);
      }
      sealCircle(p, SX, 62, ease.outCubic(seg(t, 0.12, 0.55)), sealK(t), C, t, "front");
      ps.draw(p);
      lights.draw(p);
    },
  };
}
