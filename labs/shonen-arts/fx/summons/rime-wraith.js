// Rime Wraith: frost ferns race out of a cold seal, ice spikes erupt round it, and a column of ice grows with something moving
// inside. It cracks and bursts into tumbling shards, and she hangs there: a faceted ice spirit with a cold heart, blade arms and a
// crown of icicles, shards orbiting her, snow falling. She comes apart into snow.

import { fit, Particles, P, Lights, Rng, rand, crystal, sparkle, band } from "../../../../src/core/index.js";
import { summonMeta, summonAct, summonCamera, flat, sealCircle, runeTrail, slab, seam, eyes, hex, mix, smooth, seg, clamp, lerp, ease, WHITE, TAU } from "../../lib/summon.js";

/** Rime, dark to bright: deep sea navy, glacier blue, white. */
const RIME = ["#050b18", "#0b1c3a", "#163a66", "#2a6aa0", "#4fa3d4", "#8fd6f2", "#d6f6ff", "#ffffff"];

export const meta = summonMeta({
  name: "Rime Wraith",
  desc: "Frost ferns race out of a cold seal and ice spikes erupt round it; a column of ice grows with a figure moving inside, cracks, and bursts into tumbling shards. She hangs there, a faceted ice spirit with a cold heart and a crown of icicles, shards orbiting her and snow falling, until she comes apart into snow.",
  tags: ["ice", "frost", "elemental", "spirit", "shatter", "medium"],
  duration: 7.2,
  options: { palette: RIME, seed: 31 },
});

const SX = 150;
const FROST = 0.55, SPIKES = 0.85, PILLAR0 = 1.1, PILLAR1 = 1.75, CRACK = 1.8, BURST = 2.15, MELT0 = 4.9, MELT1 = 5.9;
const PH = 112, PW = 44;

export const act = summonAct({ rise: 0.85, hold: 5.5, hits: [{ t: BURST, stop: 0.08, shake: 0.35, amp: 3 }, { t: SPIKES, shake: 0.2, amp: 1 }] });
export const camera = summonCamera({ SX, top: 118, hw: 44, pullAt: PILLAR0, pull: 0.5, backAt: MELT1 });

const D = (x, y, w, h) => [[x, y - h], [x + w, y], [x, y + h], [x - w, y]];

/** Her, hovering with her hem at hb. a: how solid (she dithers away as she melts). C: the ramp as numbers. */
function wraith(p, C, gx, hb, t, wake, a = 1) {
  // facets lit from the left: brighter left of each ridge, darker right
  const F = (lo, hi) => (x) => (x < gx - 3 ? hi : x < gx + 2 ? (lo + hi) / 2 + 0.6 : lo);
  // veil: frost ribbons trailing from her crown down behind her
  for (let i = 0; i < 6; i++) {
    const x0 = gx - 5 + i * 2, sw = Math.sin(t * 2 + i) * 3;
    p.line(x0, hb - 78, x0 - 10 - i * 2 + sw, hb - 34 + i * 5, C[i % 2 ? 4 : 5], 0.5 * a);
  }
  // the gown: from a narrow waist out to a long jagged hem of icicles, cut into facets
  const hem = [], n = 10;
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = gx + 21 - u * 42, drop = i % 2 ? 4 : -3 - (i % 4 === 0 ? 4 : 0);
    hem.push([x, hb + drop + Math.round(Math.sin(t * 3 + i) * 0.8)]);
  }
  slab(p, [[gx - 6, hb - 42], [gx + 6, hb - 42], [gx + 11, hb - 33], ...hem, [gx - 11, hb - 33]], C, F(3, 5), { a });
  for (let i = 0; i <= n; i += 2) seam(p, gx + (i - n / 2) * 0.9, hb - 40, hem[i][0], hem[i][1] - 1, i < n / 2 ? C[3] : C[6], 0.8 * a);
  for (const [x, y] of hem.filter((_, i) => i % 2 === 0)) p.dot(x, y, WHITE, a);
  // a sash of frost at the waist
  seam(p, gx - 7, hb - 41, gx + 7, hb - 41, C[6], a);
  // the bodice and pointed shoulder shards
  slab(p, [[gx - 11, hb - 62], [gx + 11, hb - 62], [gx + 6, hb - 42], [gx - 6, hb - 42]], C, F(3, 5), { a });
  for (const s of [-1, 1]) slab(p, [[gx + s * 7, hb - 60], [gx + s * 15, hb - 63], [gx + s * 19, hb - 72], [gx + s * 12, hb - 64]], C, s < 0 ? 6 : 4.4, { a });
  const beat = 0.6 + 0.4 * Math.sin(t * 5) * wake;
  slab(p, D(gx, hb - 52, 3, 5), C, 6 + beat, { a });
  if (a > 0.3) p.glow(gx, hb - 52, 18, C[5], (0.3 + 0.4 * beat) * wake * a);
  // arms: slim, bent, ending in long icicle blades; the near one lifts a little as she breathes
  for (const s of [-1, 1]) {
    const lift = s < 0 ? Math.sin(t * 1.5) * 2 : 0, ex = gx + s * 22, ey = hb - 44 + lift;
    slab(p, [[gx + s * 10, hb - 61], [gx + s * 14, hb - 59], [ex + s * 2, ey + 1], [ex - s * 1, ey - 2]], C, s < 0 ? 5 : 3.4, { a });
    slab(p, [[ex - s * 2, ey - 2], [ex + s * 3, ey + 1], [gx + s * 33, hb - 14 + lift]], C, s < 0 ? 5.8 : 4, { a });
    seam(p, ex, ey, gx + s * 32, hb - 16 + lift, s < 0 ? WHITE : C[5], a);
  }
  // the crown: icicles fanned up behind her head, two tall ones, bright cores
  for (let i = 0; i < 9; i++) {
    const ang = -Math.PI / 2 + (i - 4) * 0.28, len = (i === 2 || i === 6 ? 24 : i === 4 ? 18 : 9 + ((i * 5) % 4) * 3) * (0.92 + 0.08 * Math.sin(t * 2 + i));
    const bx = gx + Math.cos(ang) * 4, by = hb - 76 + Math.sin(ang) * 4, nx = -Math.sin(ang), ny = Math.cos(ang), tx = bx + Math.cos(ang) * len, ty = by + Math.sin(ang) * len;
    slab(p, [[bx + nx * 2, by + ny * 2], [bx - nx * 2, by - ny * 2], [tx, ty]], C, i < 4 ? 5.6 : 4.6, { a, rim: false });
    seam(p, bx, by, tx, ty, i < 5 ? WHITE : C[6], a);
  }
  // the face: a long pale mask, slit eyes
  slab(p, [[gx, hb - 84], [gx + 6, hb - 76], [gx + 4, hb - 68], [gx, hb - 64], [gx - 4, hb - 68], [gx - 6, hb - 76]], C, (x) => (x < gx ? 6.4 : 5.4), { a });
  if (a > 0.5) {
    seam(p, gx - 4, hb - 75, gx - 1, hb - 74, C[1]);
    seam(p, gx + 1, hb - 74, gx + 4, hb - 75, C[1]);
    eyes(p, gx, hb - 74, 2.5, C[5], C[7], wake);
  }
}

export function create(o) {
  const C = fit(o.palette, 8).map(hex), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] });
  const soft = new Particles({ rng: R, ground: () => 0, haze: C[4] });
  const lights = new Lights();
  // frost ferns: branching lines out across the floor
  const ferns = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * TAU + R.range(-0.2, 0.2), L = R.range(60, 110), side = [];
    for (let j = 1; j < 7; j++) side.push({ s: j / 7, l: R.range(5, 12) * (1 - j / 9), sgn: j % 2 ? 1 : -1 });
    return { a, L, side, d: R.range(0, 0.2) };
  });
  const spikes = Array.from({ length: 13 }, (_, i) => {
    const a = (i / 13) * TAU + R.range(-0.15, 0.15), r = R.range(56, 74);
    return { x: SX + Math.cos(a) * r, z: Math.sin(a), h: R.range(12, 28), w: R.range(6, 10), lean: Math.cos(a) * R.range(2, 6), d: R.range(0, 0.25) };
  });
  // the column's shards, flying when it bursts; and the ones that orbit her after
  const shards = [];
  const orbit = Array.from({ length: 7 }, (_, i) => ({ ph: (i / 7) * TAU, r: R.range(28, 40), y: R.range(-70, -30), s: R.range(2, 4) }));
  let t = 0, burst = false;

  const hover = (t) => -16 + Math.round(Math.sin(t * 1.7) * 2);

  return {
    update(dt) {
      t += dt;
      if (t > FROST && t < BURST && R.chance(dt * 22)) {
        const a = R.range(0, TAU), r = R.range(20, 80);
        soft.spawn(P.VAPOUR, SX + Math.cos(a) * r, Math.sin(a) * r * 0.22 - 2, R.range(-14, 14), -R.range(2, 10), R.range(0.9, 1.6), C[5], R.range(4, 8));
      }
      if (t >= BURST && !burst) {
        burst = true;
        lights.add(SX, -60, 100, C[5], 1.4, 0.45);
        lights.add(SX, -60, 40, WHITE, 1.2, 0.12);
        for (let i = 0; i < 34; i++) {
          const y = -R.range(4, PH - 6), x = SX + R.range(-PW / 2, PW / 2), dir = Math.sign(x - SX) || R.sign();
          shards.push({ x, y, vx: dir * R.range(60, 200), vy: -R.range(40, 200), a: R.range(0, TAU), va: R.range(-12, 12), s: R.range(2.5, 6), rest: 0, life: R.range(1.6, 2.6) });
        }
        for (let i = 0; i < 60; i++) {
          const a = R.range(0, TAU), sp = R.range(40, 180);
          ps.spawn(P.FLAKE, SX + Math.cos(a) * 10, -60 + Math.sin(a) * 20, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(1, 2.2), R.chance(0.5) ? WHITE : C[6], R.chance(0.4) ? 1.6 : 1);
        }
        for (let i = 0; i < 16; i++) {
          const s = R.sign();
          soft.spawn(P.VAPOUR, SX + s * R.range(0, 20), -R.range(2, 30), s * R.range(40, 120), -R.range(0, 20), R.range(1, 1.6), C[6], R.range(6, 11));
        }
      }
      for (const s of shards) {
        s.life -= dt;
        if (s.rest) continue;
        s.vy += 700 * dt; s.vx -= s.vx * 0.6 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.va * dt;
        if (s.y > -1 && s.vy > 0) {
          s.y = -1;
          if (s.vy > 120) (s.vy *= -0.32), (s.vx *= 0.6), (s.va *= 0.5);
          else (s.rest = 1), (s.vx = s.vy = s.va = 0);
        }
      }
      // she stands in her own weather: snow drifting down, cold mist under her hem
      if (t > BURST && t < MELT1) {
        if (t < MELT0 && R.chance(dt * 12)) ps.spawn(P.FLAKE, SX + R.range(-90, 90), -R.range(110, 150), R.range(-6, 6), R.range(10, 30), R.range(2, 3), R.chance(0.6) ? C[6] : WHITE, R.chance(0.3) ? 1.6 : 1);
        if (R.chance(dt * 6)) soft.spawn(P.VAPOUR, SX + R.range(-16, 16), hover(t) - R.range(0, 4), R.range(-10, 10), R.range(2, 8), R.range(1, 1.6), C[5], R.range(4, 7));
      }
      // melting: she comes apart into snow, from the crown down
      if (t > MELT0 && t < MELT1 && R.chance(dt * 90)) {
        const k = seg(t, MELT0, MELT1), y = hover(t) - 84 + 84 * k + R.range(-10, 10);
        ps.spawn(P.FLAKE, SX + R.range(-26, 26), y, R.range(-30, 30), -R.range(10, 50), R.range(0.7, 1.1), R.chance(0.5) ? WHITE : C[6], R.chance(0.3) ? 1.6 : 1);
      }
      ps.update(dt);
      soft.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const fade = 1 - smooth(MELT1 - 0.3, MELT1 + 0.4, t);
      runeTrail(p, 16, SX - 80, seg(t, 0.02, 0.4), 1 - smooth(1.2, 1.8, t), C);
      sealCircle(p, SX, 80, ease.outCubic(seg(t, 0.12, 0.62)), (1 - 0.6 * smooth(BURST, BURST + 0.6, t)) * fade, C, t, "back");
      // the floor frosts over: a pale sheen and ferns racing outward
      const f = ease.outCubic(seg(t, FROST, FROST + 0.6));
      if (f > 0 && fade > 0) {
        if (t < BURST + 0.5) p.shade(SX - 120 * f, -26 * f, SX + 120 * f, 4, (x, y) => {
          const dx = (x - SX) / (115 * f), dy = y / (24 * f);
          if (dx * dx + dy * dy < 1 && y <= 1) p.blend(x, y, C[5], 0.1 * (1 - seg(t, BURST, BURST + 0.5)));
        });
        for (const fe of ferns) {
          const g = clamp((f - fe.d) / (1 - fe.d)), pt = (s) => [SX + Math.cos(fe.a) * (8 + fe.L * s), Math.sin(fe.a) * (8 + fe.L * s) * 0.22];
          if (g <= 0) continue;
          const [x0, y0] = pt(0), [x1, y1] = pt(g);
          p.line(x0, y0, x1, y1, C[6], fade);
          for (const sd of fe.side) {
            if (sd.s > g) continue;
            const [bx, by] = pt(sd.s), ang = fe.a + sd.sgn * 0.7, l = sd.l * Math.min(1, (g - sd.s) * 4);
            p.line(bx, by, bx + Math.cos(ang) * l, by + Math.sin(ang) * l * 0.22, C[5], fade);
          }
          p.glowLine(x0, y0, x1, y1, 4, C[4], 0.2 * fade);
        }
      }
      soft.draw(p);
    },
    draw(p) {
      const fade = 1 - smooth(MELT1 - 0.3, MELT1 + 0.4, t), hb = hover(t), wake = smooth(BURST, BURST + 0.3, t);
      const spike = (s) => {
        const k = ease.outBack(seg(t, SPIKES + s.d, SPIKES + s.d + 0.16)) * (1 - smooth(MELT0 + s.d, MELT1 + s.d * 0.5, t));
        if (k > 0.03) crystal(p, s.x, Math.round(s.z * 14), s.h * k, s.w, s.lean, C.slice(1), { glint: ((t * 0.5 + s.d) % 1.4) - 0.2 });
      };
      for (const s of spikes) if (s.z < 0) spike(s);
      for (const ob of orbit) {
        const ang = ob.ph + t * 1.6;
        if (Math.sin(ang) < 0 && wake > 0 && fade > 0.5) slab(p, D(SX + Math.cos(ang) * ob.r, hb + ob.y + Math.sin(ang) * 6, ob.s * 0.6, ob.s), C, 3.2, { a: wake });
      }
      // the column: three faces of ice, lit left, growing up from the seal; her shape moving inside; cracks before it bursts
      if (t >= PILLAR0 && t < BURST) {
        const g = ease.outCubic(seg(t, PILLAR0, PILLAR1)), h = PH * g, top = -h, hw = PW / 2;
        wraith(p, C.map((c) => mix(c, C[2], 0.6)), SX, hb, t, 0, 0.5 * g);
        p.shade(SX - hw, top - 10, SX + hw, 0, (x, y) => {
          const u = (x - SX) / hw, tip = top - 10 * (1 - Math.abs(u));
          if (Math.abs(u) > 1 || y < tip) return;
          const edge = Math.abs(u) > 0.93 || y < tip + 1;
          const c = edge ? C[6] : u < -0.4 ? C[5] : u < 0.25 ? C[4] : C[3];
          p.blend(x, y, c, edge ? 0.95 : 0.55);
          if ((Math.floor(x) + Math.floor(y)) % 23 === 0) p.light(x, y, C[5], 0.3);
        });
        p.line(SX - hw * 0.4, top - 6, SX - hw * 0.4, 0, C[6], 0.5);
        p.line(SX + hw * 0.25, top - 8, SX + hw * 0.25, 0, C[5], 0.4);
        p.glow(SX, top / 2, 50, C[4], 0.25 * g);
        const c = seg(t, CRACK, BURST - 0.05);
        if (c > 0) {
          const Rc = new Rng(o.seed + 5);
          for (let i = 0; i < 6; i++) {
            let x = SX + Rc.range(-hw, hw) * 0.6, y = -Rc.range(10, PH - 10);
            const n = Math.ceil(5 * c);
            for (let j = 0; j < n; j++) {
              const nx = x + Rc.range(-7, 7), ny = y + Rc.range(-9, 9);
              p.line(x, y, nx, ny, WHITE);
              p.glowLine(x, y, nx, ny, 4, C[6], 0.4);
              x = nx; y = ny;
            }
          }
        }
      }
      if (t >= BURST - 0.02 && fade > 0) {
        const melt = seg(t, MELT0, MELT1);
        wraith(p, C, SX, hb, t, wake, 1 - melt);
      }
      for (const ob of orbit) {
        const ang = ob.ph + t * 1.6;
        if (Math.sin(ang) >= 0 && wake > 0 && fade > 0.5) {
          const x = SX + Math.cos(ang) * ob.r, y = hb + ob.y + Math.sin(ang) * 6;
          slab(p, D(x, y, ob.s * 0.6, ob.s), C, 5.6, { a: wake });
          p.glow(x, y, 5, C[5], 0.3 * wake);
        }
      }
      for (const s of spikes) if (s.z >= 0) spike(s);
      // shards of the column tumbling, bouncing, melting away
      for (const s of shards) {
        if (s.life <= 0) continue;
        const k = Math.min(1, s.life / 0.6), ca = Math.cos(s.a), sa = Math.sin(s.a);
        slab(p, [[s.x + ca * s.s, s.y + sa * s.s], [s.x - sa * s.s * 0.5, s.y + ca * s.s * 0.5], [s.x - ca * s.s * 0.7, s.y - sa * s.s * 0.7]], C, 4.6 + Math.sin(s.a * 3), { a: k });
      }
      if (t > BURST && t < BURST + 0.06) {
        p.circle(SX, -56, 30, WHITE);
        p.glow(SX, -56, 90, C[6], 1);
      }
      const v = seg(t, BURST, BURST + 0.6);
      if (v > 0 && v < 1) band(p, SX, 0, 20 + 110 * ease.outCubic(v), flat(20 + 110 * ease.outCubic(v)), Math.max(1, 3 * (1 - v)), 1 - v, [C[4], C[5], C[6], WHITE], () => true, v < 0.2);
      if (t > BURST && t < BURST + 0.14) sparkle(p, SX, hb - 50, 12, WHITE, C[6], 0.8);
      sealCircle(p, SX, 80, ease.outCubic(seg(t, 0.12, 0.62)), (1 - 0.6 * smooth(BURST, BURST + 0.6, t)) * fade, C, t, "front");
      ps.draw(p);
      lights.draw(p);
    },
  };
}
