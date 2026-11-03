// Grove Warden: the seal is written in green light and the floor comes alive. Vines run out across it and leaf, grass springs
// up, flowers open, then vines spiral up out of the seal and weave a guardian of bark, root and antler from the ground up.
// It wakes in a burst of petals, stands among fireflies, and withers back into the soil.

import { fit, Particles, P, Lights, Rng, rand, sparkle } from "../../../../src/core/index.js";
import { summonMeta, summonAct, summonCamera, sealCircle, runeTrail, clipAbove, clipped, ball, seam, eyes, hex, mix, smooth, seg, clamp, lerp, ease, WHITE, TAU } from "../../lib/summon.js";

/** Grove light, dark to bright. */
const GROVE = ["#06140a", "#0f2e16", "#1c5226", "#2f7d36", "#4fae45", "#8fdc6a", "#d4f7a8", "#fbfff0"];
const BARK = ["#120c0a", "#271b15", "#3f2c1f", "#5a4029", "#785735", "#977347"].map(hex);
const WOOD = ["#1a120c", "#3b2a1c", "#6a5034", "#94744c", "#b89a6a", "#d8c094"].map(hex);
const LEAF = ["#0c1d0f", "#1a3b1b", "#2a5e28", "#3d8833", "#5fb046", "#98d765"].map(hex);
const BLOOM = ["#5a1f3c", "#b04a78", "#f08cb4", "#ffd6e6"].map(hex);
const DRY = ["#2a1c10", "#5a3d1e", "#8a6232", "#b08848"].map(hex);
const SHROOM = ["#3a0f12", "#a8302a", "#e86a4a", "#f6e6d0"].map(hex);

export const meta = summonMeta({
  name: "Grove Warden",
  desc: "Vines run out of a green seal across the floor and leaf, grass springs up, flowers open. Then vines spiral up and weave a guardian of bark, root and antler from the ground up; it wakes in a burst of petals, stands among fireflies, and withers back into the soil.",
  tags: ["nature", "wood", "plant", "growth", "elemental", "large"],
  duration: 7.2,
  options: { palette: GROVE, seed: 21 },
});

const SX = 168, TOPY = -140;
const VINES = 0.5, WEAVE0 = 1.1, WEAVE1 = 2.7, WAKE = 2.85, WITHER0 = 4.9, WITHER1 = 6.1;

export const act = summonAct({ rise: 0.85, hold: 5.6, hits: [{ t: WEAVE1, shake: 0.25, amp: 1 }] });
export const camera = summonCamera({ SX, top: 140, hw: 52, pullAt: WEAVE0, pull: 0.6, backAt: WITHER1 });

// the seal dims once the garden has taken over the floor, and goes as he withers
const sealK = (t) => (1 - 0.72 * smooth(VINES + 0.5, WEAVE0 + 0.5, t)) * (1 - smooth(WITHER1 - 0.4, WITHER1 + 0.2, t));
// how much of him is woven: the build line climbs from the floor to the antler tips, and sinks back as he withers
const built = (t) => (t < WITHER0 ? ease.inOutSine(seg(t, WEAVE0, WEAVE1)) : 1 - ease.inQuad(seg(t, WITHER0, WITHER1)));
const wither = (t) => seg(t, WITHER0 - 0.2, WITHER0 + 0.6);
// green going brown as it withers
const age = (c, w) => (w <= 0 ? c : mix(c, DRY[Math.min(3, Math.floor(clamp(((c & 255) + ((c >>> 8) & 255)) / 200) * 4))], w));

function strand(p, pts, R, w = 2) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    seam(p, x0, y0, x1, y1, R[3]);
    if (w > 1) seam(p, x0 + 1, y0, x1 + 1, y1, R[2]);
    if (w > 2) seam(p, x0 - 1, y0, x1 - 1, y1, R[4]);
    if (w > 1) seam(p, x0 + 2, y0, x1 + 2, y1, R[0]);
  }
}
const curve = (a, b, c, n = 8) => Array.from({ length: n + 1 }, (_, i) => {
  const u = i / n;
  return [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1]];
});

// antlers: a branch that forks twice, leaves and blossom at the tips, swaying a little
function branch(p, x, y, ang, len, depth, t, seed, w) {
  const sway = Math.sin(t * 1.6 + seed) * 0.05 * (3 - depth), a = ang + sway;
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  seam(p, x, y, ex, ey, age(BARK[depth < 1 ? 4 : 3], w));
  if (depth < 2) seam(p, x + 1, y, ex + 1, ey, age(BARK[2], w));
  if (depth >= 2) {
    if (!clipped(ey)) {
      ball(p, ex, ey, 4.6, 3.2, LEAF.map((c) => age(c, w)), { lift: 0.3 });
      if (rand(seed, 3) > 0.45 && w < 0.5) {
        p.px(ex + 1, ey - 1, BLOOM[2]); p.px(ex + 2, ey - 1, BLOOM[3]); p.px(ex + 1, ey - 2, BLOOM[2]);
      }
    }
    return;
  }
  branch(p, ex, ey, a - 0.45 - rand(seed, 1) * 0.2, len * 0.7, depth + 1, t, seed * 3 + 1, w);
  branch(p, ex, ey, a + 0.4 + rand(seed, 2) * 0.2, len * 0.66, depth + 1, t, seed * 3 + 2, w);
}

function warden(p, C, gx, t, wake, w) {
  const br = Math.round(Math.sin(t * 1.8) * 1), sap = hex(C[5]), sapHot = hex(C[6]);
  const B = BARK.map((c) => age(c, w)), L = LEAF.map((c) => age(c, w));
  // root legs: strands from the hips spreading into the floor
  for (const s of [-1, 1])
    for (let j = 0; j < 4; j++) {
      const top = [gx + s * (4 + j * 2.5), -40], foot = [gx + s * (13 + j * 6), 0];
      strand(p, curve(top, [gx + s * (10 + j * 2), -18], foot, 6), B, j % 2 ? 2 : 3);
    }
  // the trunk: bark in long vertical grain, lit from the left, narrow at the waist and broad at the chest
  p.shade(gx - 24, -90 + br, gx + 24, -36, (x, y) => {
    if (clipped(y)) return;
    const v = (-36 - y) / (54 + br), hw = v < 0.35 ? lerp(12, 14, v / 0.35) : lerp(14, 22, (v - 0.35) / 0.65) * (v > 0.9 ? Math.sqrt(Math.max(0, 1 - (v - 0.9) * 8)) : 1);
    const dx = x - gx;
    if (Math.abs(dx) > hw) return;
    const grain = Math.sin(dx * 1.25 + 2.2 * rand(Math.floor(dx), Math.floor(y / 6), 9)), lit = -dx / hw;
    const lv = Math.abs(dx) > hw - 1 ? 0 : 2.2 + 1.3 * lit + 0.75 * grain;
    p.px(x, y, B[clamp(Math.round(lv), 0, 5)]);
  });
  // sap running in the grain, glowing as he wakes
  for (const [x0, y0, x1, y1] of [[-3, -44, -5, -60], [-5, -60, -2, -76], [4, -50, 7, -68], [7, -68, 12, -80], [-5, -60, -11, -70]]) {
    seam(p, gx + x0, y0 + br, gx + x1, y1 + br, wake > 0.5 ? sapHot : sap, (0.4 + 0.6 * wake) * (1 - w));
    if (!clipped(y1)) p.glowLine(gx + x0, y0 + br, gx + x1, y1 + br, 4, sap, 0.25 * wake * (1 - w));
  }
  // arms: twisted roots from the shoulders, hanging, twig fingers
  for (const s of [-1, 1]) {
    const sw = Math.sin(t * 1.4 + s) * 1.5, hand = [gx + s * 33 + sw, -31];
    strand(p, curve([gx + s * 19, -80 + br], [gx + s * 34, -70], hand, 7), B, 3);
    for (let f = -1; f <= 1; f++) seam(p, hand[0], hand[1], hand[0] + s * 2 + f * 3, hand[1] + 7, B[3]);
    ball(p, gx + s * 17, -80 + br, 11, 9, B, { lift: 0.2 });
    // moss on both shoulders, mushrooms on one
    p.shade(gx + s * 17 - 11, -90 + br, gx + s * 17 + 11, -80 + br, (x, y) => {
      if (clipped(y)) return;
      const nx = (x - gx - s * 17) / 11, ny = (y - (-80 + br)) / 9;
      if (nx * nx + ny * ny < 0.95 && ny < -0.35 + rand(Math.floor(x - gx), 3, 1) * 0.4) p.px(x, y, L[Math.floor(2 + rand(Math.floor(x - gx), Math.floor(y), 2) * 3)]);
    });
  }
  if (!clipped(-92) && w < 0.6)
    for (const [mx, h] of [[-22, 4], [-17, 6], [-13, 3]]) {
      const x = gx + mx, y = -87 + br;
      seam(p, x, y, x, y - h, SHROOM[3]);
      p.px(x - 1, y - h, SHROOM[1]); p.px(x, y - h, SHROOM[2]); p.px(x + 1, y - h, SHROOM[1]); p.px(x, y - h - 1, SHROOM[2]);
    }
  // the head: a carved wooden mask, deep eye hollows, a beard of moss hanging off the jaw
  const hy = -97 + br;
  branch(p, gx - 5, hy - 8, -Math.PI / 2 - 0.6, 20, 0, t, 3, w);
  branch(p, gx + 5, hy - 8, -Math.PI / 2 + 0.6, 20, 0, t, 7, w);
  const Wd = WOOD.map((c) => age(c, w));
  ball(p, gx, hy, 9, 11, Wd, { lift: -0.3 });
  if (!clipped(hy - 4)) {
    // brow ridge, hollows, cheek grain, mouth
    seam(p, gx - 8, hy - 4, gx - 1, hy - 3, Wd[4]); seam(p, gx + 1, hy - 3, gx + 8, hy - 4, Wd[4]);
    for (const s of [-1, 1]) { p.px(gx + s * 3, hy - 1, Wd[0]); p.px(gx + s * 4, hy - 1, Wd[0]); p.px(gx + s * 5, hy - 1, Wd[0]); p.px(gx + s * 4, hy, Wd[0]); p.px(gx + s * 4, hy - 2, Wd[1]); }
    seam(p, gx - 6, hy + 2, gx - 5, hy + 7, Wd[1]); seam(p, gx + 6, hy + 2, gx + 5, hy + 7, Wd[1]);
    seam(p, gx - 3, hy + 5, gx + 3, hy + 5, Wd[0]);
    seam(p, gx, hy - 8, gx, hy - 4, Wd[2]);
  }
  p.shade(gx - 9, hy - 12, gx + 9, hy - 6, (x, y) => {
    if (clipped(y)) return;
    const nx = (x - gx) / 9, ny = (y - hy) / 11;
    if (nx * nx + ny * ny < 0.95 && ny < -0.62 + rand(Math.floor(x - gx), 7, 2) * 0.25) p.px(x, y, L[Math.floor(2 + rand(Math.floor(x - gx), Math.floor(y), 4) * 3)]);
  });
  eyes(p, gx, hy - 1, 4, sap, sapHot, wake * (1 - w));
  for (let i = -5; i <= 5; i += 2) {
    const len = 6 + ((i * 7) & 3) + Math.round(Math.sin(t * 2 + i) * 1);
    seam(p, gx + i, hy + 7, gx + i + Math.sin(t * 1.5 + i) * 1.2, hy + 7 + len, L[(i & 1) ? 3 : 2]);
  }
}

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] });
  const lights = new Lights();
  // floor vines: out from the seal in every direction, wavering, leafing as they go, a flower at the end of some
  const vines = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * TAU + R.range(-0.2, 0.2), L: R.range(55, 95), d: R.range(0, 0.35), wob: R.range(0, TAU), flower: R.chance(0.6) }));
  const grass = Array.from({ length: 52 }, () => {
    const a = R.range(0, TAU), r = R.range(30, 104);
    return { x: SX + Math.cos(a) * r, y: Math.sin(a) * r * 0.22, h: R.range(3, 8), lean: R.range(-2, 2), d: R.range(0.75, 1.2), c: R.int(2, 4) };
  });
  let t = 0, woke = false;

  const vinePt = (v, s) => {
    const r = 12 + v.L * s, ang = v.a + 0.22 * Math.sin(s * 7 + v.wob);
    return [SX + Math.cos(ang) * r, Math.sin(ang) * r * 0.22];
  };

  function floorLife(p, far) {
    const w = wither(t), fade = 1 - smooth(WITHER1 - 0.4, WITHER1 + 0.3, t);
    if (fade <= 0) return;
    for (const v of vines) {
      const g = ease.outCubic(seg(t, VINES + v.d, VINES + v.d + 0.7));
      if (g <= 0 || (Math.sin(v.a) < 0) !== far) continue;
      let prev = vinePt(v, 0);
      for (let s = 0.04; s <= g + 1e-4; s += 0.04) {
        const pt = vinePt(v, s);
        p.line(prev[0], prev[1], pt[0], pt[1], age(LEAF[s > g - 0.08 && g < 1 ? 5 : 3], w), fade);
        if (Math.round(s * 25) % 3 === 0 && s < g - 0.06) {
          const side = Math.round(s * 25) % 2 ? -1 : 1;
          p.dot(pt[0], pt[1] - 1, age(LEAF[4], w), fade);
          p.dot(pt[0] + side, pt[1] - 1, age(LEAF[5], w), fade);
        }
        prev = pt;
      }
      // a flower opens at the end once the vine has finished
      const b = ease.outBack(seg(t, VINES + v.d + 0.7, VINES + v.d + 1.0)) * (1 - w);
      if (v.flower && b > 0.1) {
        const [fx, fy] = vinePt(v, 1), r = 1.6 * b;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU + t * 0.3;
          p.dot(fx + Math.cos(a) * r, fy - 1 + Math.sin(a) * r * 0.8, BLOOM[k % 2 ? 2 : 3], fade);
        }
        p.px(fx, fy - 1, hex("#ffd84a"));
        p.glow(fx, fy - 1, 4, BLOOM[2], 0.2 * b);
      }
    }
    for (const gb of grass) {
      if ((gb.y < 0) !== far) continue;
      const k = ease.outBack(seg(t, gb.d, gb.d + 0.3)) * (1 - 0.6 * w);
      if (k <= 0.05) continue;
      const sw = Math.sin(t * 2.2 + gb.x * 0.3) * 0.8;
      p.line(gb.x, gb.y, gb.x + (gb.lean + sw) * k, gb.y - gb.h * k, age(LEAF[gb.c], w), fade);
    }
  }

  // vines spiralling up round him, weaving him out of the ground; the front half after him, the back half before
  function weave(p, front) {
    const b = built(t), k = 1 - smooth(WEAVE1, WEAVE1 + 0.5, t) + (t > WITHER0 ? 1 - smooth(WITHER1 - 0.2, WITHER1, t) : 0);
    if (b <= 0 || k <= 0.02) return;
    const topY = TOPY * b;
    for (let j = 0; j < 3; j++) {
      let prev = null;
      for (let y = 0; y >= topY; y -= 1.5) {
        const ang = -y * 0.11 + (j / 3) * TAU + t * 2.2, r = y > -40 ? 22 : y > -90 ? 26 : 16, z = Math.sin(ang);
        const pt = [SX + Math.cos(ang) * r, y];
        if (prev && (z >= 0) === front) {
          const head = y - topY < 8;
          p.line(prev[0], prev[1], pt[0], pt[1], head ? hex(C[6]) : front ? LEAF[4] : LEAF[2], Math.min(1, k));
          if (Math.round(-y) % 9 === 0) p.px(pt[0] + 1, pt[1], LEAF[5]);
          if (head) p.glow(pt[0], pt[1], 6, hex(C[5]), 0.4 * k);
        }
        prev = pt;
      }
    }
  }

  return {
    update(dt) {
      t += dt;
      const b = built(t);
      // green motes rise along the weaving line
      if (t > WEAVE0 && t < WEAVE1 && R.chance(dt * 40)) ps.spawn(P.STAR, SX + R.range(-24, 24), TOPY * b + R.range(-3, 3), R.range(-6, 6), -R.range(4, 16), R.range(0.4, 0.8), C[5], 0.6);
      if (t >= WAKE && !woke) {
        woke = true;
        lights.add(SX, -100, 70, C[5], 1, 0.5);
        // he wakes: a gust of petals and leaves off the antlers
        for (let i = 0; i < 46; i++) {
          const a = R.range(-Math.PI, 0), sp = R.range(40, 140);
          ps.spawn(P.FLAKE, SX + R.range(-24, 24), -122 + R.range(-10, 10), Math.cos(a) * sp, Math.sin(a) * sp, R.range(1.2, 2.2), R.chance(0.5) ? BLOOM[2] : LEAF[R.int(3, 5)], R.chance(0.5) ? 1.6 : 1);
        }
      }
      // fireflies drifting round him while he stands, petals falling
      if (t > WAKE && t < WITHER0 + 0.4) {
        if (R.chance(dt * 5)) ps.spawn(P.STAR, SX + R.range(-70, 70), -R.range(10, 120), R.range(-8, 8), -R.range(2, 10), R.range(1.2, 2), "#d8f070", 0.6);
        if (R.chance(dt * 4)) ps.spawn(P.FLAKE, SX + R.range(-30, 30), -R.range(100, 130), R.range(-10, 10), R.range(0, 10), 2, BLOOM[R.int(1, 3)], 1);
      }
      // withering: dry leaves let go and fall
      if (t > WITHER0 && t < WITHER1 && R.chance(dt * 30)) ps.spawn(P.FLAKE, SX + R.range(-36, 36), TOPY * built(t) + R.range(0, 30), R.range(-20, 20), R.range(0, 20), R.range(1, 1.8), DRY[R.int(1, 3)], R.chance(0.5) ? 1.6 : 1);
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      runeTrail(p, 16, SX - 104, seg(t, 0.02, 0.4), 1 - smooth(1.2, 1.8, t), C);
      sealCircle(p, SX, 104, ease.outCubic(seg(t, 0.12, 0.62)), sealK(t), C, t, "back");
      floorLife(p, true);
    },
    draw(p) {
      const b = built(t), wake = smooth(WAKE, WAKE + 0.25, t);
      weave(p, false);
      if (b > 0) {
        clipAbove(TOPY * b);
        warden(p, C, SX, t, wake, wither(t));
        clipAbove(-Infinity);
      }
      weave(p, true);
      sealCircle(p, SX, 104, ease.outCubic(seg(t, 0.12, 0.62)), sealK(t), C, t, "front");
      floorLife(p, false);
      if (t > WAKE && t < WAKE + 0.12) sparkle(p, SX, -98, 9, WHITE, hex(C[6]), 0.7);
      ps.draw(p);
      lights.draw(p);
    },
  };
}
