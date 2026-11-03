// Shadow Legion: a violet seal opens into a pool of black that spreads across the floor, shadow writhes up out of it, and the
// dead rise from it one after another: soldiers first, then a horned knight with his greatsword planted before him. Their eyes
// light in turn, dark flame licks off their armour, and in the end they sink back into the pool. Inspired by "arise" summoning
// in dark-fantasy manhwa; the figures are original.

import { fit, Particles, P, Lights, Rng, rand, sparkle, band } from "../../../../src/core/index.js";
import { summonMeta, summonAct, summonCamera, flat, sealCircle, runeTrail, clipBelow, clipped, ball, slab, seam, eyes, hex, mix, smooth, seg, clamp, lerp, ease, WHITE, TAU } from "../../lib/summon.js";

/** Shadow, dark to bright: void, bruise violet, a cold lilac light. */
const SHADE = ["#05030a", "#120a24", "#24104a", "#3d1a7a", "#5f2fb8", "#8a5cf0", "#c4a8ff", "#f4eeff"];
const ARMOR = ["#040308", "#0b0914", "#151226", "#221e3a", "#332d54", "#4a4276"].map(hex);
const CLOTH = ["#030206", "#0a0712", "#140d22", "#211536"].map(hex);

export const meta = summonMeta({
  name: "Shadow Legion",
  desc: "A violet seal opens into a pool of black that spreads across the floor; shadow writhes up out of it, and the dead rise one after another, soldiers first, then a horned knight with his greatsword planted before him. Their eyes light in turn, dark flame licks off their armour, and they sink back into the pool.",
  tags: ["shadow", "dark", "undead", "army", "knight", "arise", "large"],
  duration: 7.4,
  options: { palette: SHADE, seed: 41 },
});

const SX = 172;
const POOL = 0.55, KNIGHT0 = 1.55, KNIGHT1 = 2.75, EYES = 2.95, SINK0 = 5.0, SINK1 = 6.1;
// the soldiers: where they stand, when they rise, how big they are, what they carry
const SOLDIERS = [
  { x: -54, t0: 1.15, s: 0.5, kind: "spear" }, { x: 52, t0: 1.3, s: 0.52, kind: "axe" },
  { x: -92, t0: 1.45, s: 0.44, kind: "sword" }, { x: 90, t0: 1.6, s: 0.46, kind: "spear" },
];

export const act = summonAct({ rise: 0.85, hold: 5.7, hits: [{ t: KNIGHT1, shake: 0.3, amp: 2 }, { t: EYES + 0.2, stop: 0.1, shake: 0.4, amp: 2 }] });
export const camera = summonCamera({ SX, top: 112, hw: 104, pullAt: 1.1, pull: 0.6, backAt: SINK1 });

const out = (t, t0, d) => (t < SINK0 ? ease.outCubic(seg(t, t0, t0 + d)) : 1 - ease.inCubic(seg(t, SINK0 + (t0 - 1.1) * 0.3, SINK1 - 0.2)));

// dark flame licking up off a point: a few wavering tongues, lilac at the root
function flame(p, C, x, y, t, k, seed, h = 7) {
  if (k <= 0.05 || clipped(y)) return;
  for (let i = 0; i < 3; i++) {
    const ph = t * 6 + seed * 1.7 + i * 2.1, len = h * (0.5 + 0.5 * Math.abs(Math.sin(ph * 0.7))) * k, sx = x + (i - 1) * 2;
    let px0 = sx, py0 = y;
    for (let j = 1; j <= 4; j++) {
      const u = j / 4, nx = sx + Math.sin(ph + u * 4) * 1.6 * u, ny = y - len * u;
      p.line(px0, py0, nx, ny, u < 0.3 ? C[5] : u < 0.7 ? C[3] : C[2]);
      px0 = nx; py0 = ny;
    }
  }
  p.glow(x, y - 2, 6, C[4], 0.25 * k);
}

function soldier(p, C, x, gy, sc, kind, t, eyeK, aura, seed) {
  const S = (v) => v * sc, y = (v) => gy + S(v);
  // legs apart, a torso tapering to the waist, a narrow crested helm
  for (const s of [-1, 1]) slab(p, [[x + s * S(2), y(-42)], [x + s * S(10), y(-42)], [x + s * S(12), y(0)], [x + s * S(5), y(0)]], ARMOR, s < 0 ? 3 : 1.6);
  slab(p, [[x - S(17), y(-80)], [x + S(17), y(-80)], [x + S(9), y(-42)], [x - S(9), y(-42)]], ARMOR, (px) => (px < x - S(3) ? 3.6 : px < x + S(3) ? 2.8 : 2));
  slab(p, [[x - S(10), y(-46)], [x + S(10), y(-46)], [x + S(13), y(-30)], [x - S(13), y(-30)]], CLOTH, 2.4);
  ball(p, x - S(16), y(-78), S(8), S(5), ARMOR, { lift: 0.4 });
  ball(p, x + S(16), y(-78), S(8), S(5), ARMOR);
  ball(p, x, y(-90), S(7), S(9), ARMOR, { lift: 0.3 });
  slab(p, [[x - S(2), y(-98)], [x + S(2), y(-98)], [x + S(5), y(-108)], [x - S(1), y(-104)]], ARMOR, 4);
  seam(p, x - S(6), y(-90), x + S(6), y(-90), ARMOR[0]);
  eyes(p, x, y(-90), Math.max(1.5, S(3.4)), hex(C[5]), hex(C[7]), eyeK);
  // the weapon in the near hand
  const hx = x - S(18), hy = y(-50);
  if (kind === "spear") {
    seam(p, hx, y(-128), hx, y(0), ARMOR[4]);
    slab(p, [[hx - S(3), y(-124)], [hx + S(3), y(-124)], [hx, y(-140)]], ARMOR, 4.5);
  } else if (kind === "axe") {
    seam(p, hx, y(-92), hx, y(-20), ARMOR[4]);
    slab(p, [[hx, y(-90)], [hx - S(12), y(-96)], [hx - S(14), y(-78)], [hx, y(-80)]], ARMOR, 4);
  } else {
    slab(p, [[hx - S(2), y(-46)], [hx + S(2), y(-46)], [hx + S(1), y(-6)], [hx - S(1), y(-6)]], ARMOR, 4.5);
    seam(p, hx - S(6), y(-46), hx + S(6), y(-46), ARMOR[5]);
  }
  ball(p, hx, hy, S(4), S(4), ARMOR, { lift: 0.5 });
  flame(p, hex2(C), x - S(16), y(-82), t, aura, seed, 5);
  flame(p, hex2(C), x + S(4), y(-100), t, aura, seed + 1, 5);
}
const hex2 = (C) => C;

function knight(p, C, gx, gy, t, eyeK, aura) {
  const y = (v) => gy + v + (v < -40 ? Math.round(Math.sin(t * 1.6) * 1) : 0);
  // the cape behind him, tattered, stirring
  const capeL = [], capeN = 9;
  for (let i = 0; i <= capeN; i++) {
    const u = i / capeN, x = gx - 26 + u * 52, hem = -12 + (i % 2 ? -7 : 0) + Math.sin(t * 2.2 + i * 0.9) * 2.5;
    capeL.push([x + Math.sin(t * 1.7 + i) * 1.5, y(hem)]);
  }
  slab(p, [[gx - 17, y(-80)], [gx + 17, y(-80)], ...capeL.reverse()], CLOTH, (px) => (px < gx ? 2.2 : 1.2));
  // legs: greaves and knee cops, armoured feet
  for (const s of [-1, 1]) {
    slab(p, [[gx + s * 3, y(-44)], [gx + s * 13, y(-44)], [gx + s * 12, y(-22)], [gx + s * 4, y(-22)]], ARMOR, s < 0 ? 3.5 : 2);
    slab(p, [[gx + s * 4, y(-22)], [gx + s * 12, y(-22)], [gx + s * 13, y(-3)], [gx + s * 3, y(-3)]], ARMOR, s < 0 ? 3.8 : 2.2);
    ball(p, gx + s * 8, y(-23), 5, 4, ARMOR, { lift: 0.6 });
    slab(p, [[gx + s * 2, y(-4)], [gx + s * 15, y(-4)], [gx + s * 17, y(0)], [gx + s * 2, y(0)]], ARMOR, 3);
  }
  // armoured skirt
  slab(p, [[gx - 13, y(-52)], [gx + 13, y(-52)], [gx + 17, y(-34)], [gx - 17, y(-34)]], ARMOR, (px) => (px < gx - 4 ? 3.4 : px < gx + 4 ? 2.6 : 1.8));
  for (let k = -12; k <= 12; k += 6) seam(p, gx + k, y(-50), gx + k * 1.3, y(-35), ARMOR[0]);
  // the breastplate, a ridge down the middle and a violet seam glowing in it
  slab(p, [[gx - 16, y(-82)], [gx + 16, y(-82)], [gx + 12, y(-52)], [gx - 12, y(-52)]], ARMOR, (px) => (px < gx ? 3.8 : 2.2));
  seam(p, gx, y(-80), gx, y(-54), ARMOR[5]);
  const glowC = hex(C[5]);
  seam(p, gx - 9, y(-66), gx - 2, y(-60), glowC, eyeK);
  seam(p, gx + 9, y(-66), gx + 2, y(-60), glowC, eyeK);
  if (!clipped(y(-62))) p.glow(gx, y(-62), 12, glowC, 0.3 * eyeK);
  // arms down to both hands resting on the pommel of the sword planted in front of him
  for (const s of [-1, 1]) slab(p, [[gx + s * 18, y(-78)], [gx + s * 22, y(-72)], [gx + s * 6, y(-52)], [gx + s * 2, y(-56)]], ARMOR, s < 0 ? 4 : 2.4);
  // the greatsword: point in the floor, a long dark blade with a lilac edge
  slab(p, [[gx - 3, y(-46)], [gx + 3, y(-46)], [gx + 2, y(-4)], [gx, y(2)], [gx - 2, y(-4)]], ARMOR, (px) => (px < gx ? 4.6 : 2.6));
  seam(p, gx - 3, y(-44), gx - 1, y(-2), hex(C[4]), 0.5 + 0.5 * eyeK);
  slab(p, [[gx - 10, y(-49)], [gx + 10, y(-49)], [gx + 8, y(-46)], [gx - 8, y(-46)]], ARMOR, 4);
  slab(p, [[gx - 2, y(-49)], [gx + 2, y(-49)], [gx + 2, y(-56)], [gx - 2, y(-56)]], CLOTH, 2);
  ball(p, gx, y(-55), 6, 3.5, ARMOR, { lift: 0.6 });
  ball(p, gx, y(-59), 2.5, 2.5, ARMOR, { lift: 1 });
  // pauldrons, layered, spiked
  for (const s of [-1, 1]) {
    ball(p, gx + s * 18, y(-80), 8, 5, ARMOR, { lift: s < 0 ? 0.6 : 0 });
    ball(p, gx + s * 20, y(-76), 7, 3, ARMOR, { lift: s < 0 ? 0.3 : -0.2 });
    slab(p, [[gx + s * 14, y(-84)], [gx + s * 19, y(-84)], [gx + s * 23, y(-94)]], ARMOR, s < 0 ? 4.5 : 3);
  }
  // the great helm: tall and narrow, a visor slit, a crest, thick horns sweeping out and up
  for (const sd of [-1, 1]) {
    const hb = [[gx + sd * 6, y(-96)], [gx + sd * 14, y(-99)], [gx + sd * 19, y(-106)], [gx + sd * 18, y(-116)]];
    slab(p, [hb[0], hb[1], hb[2], hb[3], [gx + sd * 16, y(-107)], [gx + sd * 12, y(-102)], [gx + sd * 6, y(-100)]], ARMOR, sd < 0 ? 4.6 : 3);
  }
  slab(p, [[gx - 8, y(-100)], [gx + 8, y(-100)], [gx + 9, y(-86)], [gx + 6, y(-81)], [gx - 6, y(-81)], [gx - 9, y(-86)]], ARMOR, (px) => (px < gx - 2 ? 4.2 : px < gx + 2 ? 3.4 : 2.4));
  slab(p, [[gx - 1, y(-100)], [gx + 1, y(-100)], [gx + 1, y(-106)], [gx - 1, y(-104)]], ARMOR, 4.6);
  slab(p, [[gx - 8, y(-93)], [gx + 8, y(-93)], [gx + 7, y(-90)], [gx - 7, y(-90)]], ARMOR, 0.2);
  seam(p, gx, y(-89), gx, y(-82), ARMOR[0]);
  eyes(p, gx, y(-92), 3, hex(C[5]), hex(C[7]), eyeK);
  // dark flame off the pauldrons, the horns, the helm
  for (const [fx, fy, s] of [[-20, -86, 1], [20, -86, 2], [-18, -116, 3], [18, -116, 4], [0, -106, 5], [-24, -40, 6]]) flame(p, C.map(hex), gx + fx, y(fy), t, aura, s, 8);
}

export function create(o) {
  const C = fit(o.palette, 8).map(hex), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] });
  const soft = new Particles({ rng: R, ground: () => 0 });
  const lights = new Lights();
  const tendrils = Array.from({ length: 9 }, (_, i) => ({ x: SX + R.range(-90, 90), h: R.range(20, 46), ph: R.range(0, TAU), d: R.range(0, 0.4) }));
  let t = 0, lit = 0;

  const poolR = (t) => 120 * ease.outCubic(seg(t, POOL, POOL + 0.6)) * (1 - ease.inQuad(seg(t, SINK1 - 0.3, SINK1 + 0.5)));

  return {
    update(dt) {
      t += dt;
      // black smoke shed by everything rising out of the pool, and off them while they stand
      const rising = (t > 1.1 && t < KNIGHT1) || (t > SINK0 && t < SINK1);
      if (rising && t < SINK1 - 0.3 && R.chance(dt * 16)) soft.spawn(P.SMOKE, SX + R.range(-100, 100), -R.range(0, 10), R.range(-6, 6), -R.range(10, 26), t > SINK0 ? R.range(0.6, 0.9) : R.range(0.9, 1.6), C[1], R.range(5, 9));
      if (t > KNIGHT1 && t < SINK0 && R.chance(dt * 6)) soft.spawn(P.SMOKE, SX + R.range(-24, 24), -R.range(60, 100), R.range(-4, 4), -R.range(8, 18), R.range(0.8, 1.4), C[2], R.range(3, 6));
      if (t > POOL && t < SINK1 - 0.8 && R.chance(dt * 8)) ps.spawn(P.EMBER, SX + R.range(-100, 100), -R.range(0, 6), R.range(-6, 6), -R.range(10, 30), R.range(0.8, 1.5), C[5], 1);
      // eyes light one by one, the knight's last, with a pulse
      const n = SOLDIERS.filter((s, i) => t >= EYES - 0.5 + i * 0.1).length + (t >= EYES ? 1 : 0);
      for (; lit < n; lit++) {
        const knight = lit === SOLDIERS.length, sd = SOLDIERS[lit];
        lights.add(knight ? SX : SX + sd.x, knight ? -92 : -90 * sd.s, knight ? 60 : 24, C[5], knight ? 1.4 : 0.8, knight ? 0.5 : 0.25);
        if (knight) for (let i = 0; i < 30; i++) {
          const a = R.range(0, TAU), sp = R.range(40, 140);
          ps.spawn(P.EMBER, SX + Math.cos(a) * 10, -80 + Math.sin(a) * 10, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.6, 1.2), C[6], 1);
        }
      }
      ps.update(dt);
      soft.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      runeTrail(p, 16, SX - 96, seg(t, 0.02, 0.4), 1 - smooth(1.2, 1.8, t), C);
      sealCircle(p, SX, 96, ease.outCubic(seg(t, 0.12, 0.55)), 1 - smooth(POOL, POOL + 0.5, t), C, t, "back");
      // the pool: black, flat on the floor, a violet rim that ripples, slow rings crossing it
      const r = poolR(t);
      if (r > 1) {
        const ry = r * 0.22;
        for (let y = Math.ceil(-ry); y <= Math.floor(ry); y++) {
          const half = r * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)) * 0.95;
          for (let x = Math.ceil(SX - half); x <= SX + half; x++) {
            const d = Math.hypot(x - SX, y / 0.22) / r, ring = Math.abs((((d * 4 - t * 0.8) % 1) + 1) % 1 - 0.5) < 0.05;
            p.px(x, y, d > 0.89 ? C[2] : ring && d > 0.25 ? C[1] : C[0]);
          }
        }
        // the rim: violet, rippling
        for (let i = 0, n = Math.ceil(r * TAU * 1.2); i < n; i++) {
          const ang = (i / n) * TAU, rr = r * (1 + 0.035 * Math.sin(ang * 7 + t * 3));
          p.px(SX + Math.cos(ang) * rr, Math.sin(ang) * rr * 0.22, C[4]);
          p.px(SX + Math.cos(ang) * rr * 0.97, Math.sin(ang) * rr * 0.97 * 0.22, C[2]);
        }
        p.glow(SX, 0, r * 0.9, C[3], 0.25);
      }
      soft.draw(p);
    },
    draw(p) {
      const aura = smooth(KNIGHT1 - 0.2, EYES, t) * (1 - smooth(SINK0, SINK0 + 0.4, t));
      // tendrils writhing up out of the pool before anything rises
      for (const td of tendrils) {
        const k = bumpK(t, POOL + 0.3 + td.d, 1.9 + td.d);
        if (k <= 0) continue;
        let px0 = td.x, py0 = 0;
        for (let j = 1; j <= 8; j++) {
          const u = j / 8, nx = td.x + Math.sin(t * 4 + td.ph + u * 5) * 6 * u, ny = -td.h * k * u;
          p.line(px0, py0, nx, ny, u < 0.5 ? C[1] : C[2]);
          p.line(px0 + 1, py0, nx + 1, ny, u > 0.8 ? C[4] : C[0]);
          px0 = nx; py0 = ny;
        }
      }
      clipBelow(1);
      // the back rank, the knight, the front rank (the further out a soldier stands, the further back)
      const order = [2, 3, 0, 1];
      const drawSoldier = (i) => {
        const s = SOLDIERS[i], u = out(t, s.t0, 0.9);
        if (u <= 0) return;
        const eyeK = smooth(EYES - 0.5 + i * 0.1, EYES - 0.35 + i * 0.1, t) * (1 - smooth(SINK0, SINK0 + 0.3, t));
        soldier(p, C, SX + s.x, Math.round((1 - u) * 72 * s.s * 2), s.s, s.kind, t, eyeK, aura, i * 7);
      };
      drawSoldier(order[0]); drawSoldier(order[1]);
      const ku = out(t, KNIGHT0, KNIGHT1 - KNIGHT0);
      if (ku > 0) knight(p, C, SX, Math.round((1 - ku) * 118), t, smooth(EYES, EYES + 0.15, t) * (1 - smooth(SINK0, SINK0 + 0.3, t)), aura);
      drawSoldier(order[2]); drawSoldier(order[3]);
      clipBelow(Infinity);
      // arise: a violet pulse along the floor and a flash on the knight's eyes
      const v = seg(t, EYES, EYES + 0.7);
      if (v > 0 && v < 1) band(p, SX, 0, 30 + 150 * ease.outCubic(v), flat(30 + 150 * ease.outCubic(v)), Math.max(1, 3 * (1 - v)), 1 - v, [C[3], C[4], C[5], C[6]], () => true, v < 0.15);
      if (t > EYES && t < EYES + 0.14) sparkle(p, SX, -92, 12, WHITE, C[6], 0.8);
      ps.draw(p);
      lights.draw(p);
    },
  };
}
// up quickly, hold, fade
const bumpK = (t, t0, t1) => (t < t0 || t > t1 ? 0 : Math.min(1, (t - t0) / 0.3, (t1 - t) / 0.4));
