// Magnetic Heart (Соронзон зүрх), the anxious heart: it pulls. A faceted basalt heart veined with magnetised
// crimson crystal hangs inside its own dipole field. Field lines turn round it and stream crimson filings from pole to
// pole, rock debris orbits and is dragged in tighter and faster while the heartbeat races and the heart trembles, until
// the field overloads: a pulse throws the facets apart, flings the debris out with a shock ring and sparks, and the
// heart pulls itself back together to start reaching again.

import { fit, clamp, lerp, smooth, seg, ease, rng, cycle, fly, flyV, bolt, TAU, WHITE } from "../../../../src/core/index.js";
import { CRIMSON, BASALT, MIST, heartGeom, sdHeart, tone, lambert, specular, facetRand, edgeRand, unit, beats, pulse, since } from "../../lib/heart.js";
import { pedestal, mist, silk } from "../../lib/stage.js";

export const meta = {
  name: "Magnetic Heart",
  desc: "Anxious attachment. A basalt heart veined with crimson crystal pulls everything in: field lines stream filings pole to pole, debris spirals tighter as the beat races, then the field overloads, the facets burst apart and it pulls itself back together.",
  tags: ["attachment", "anxious", "magnetic", "heart", "dipole", "debris", "crystal", "love", "loop"],
  size: [160, 160], origin: [80, 150], duration: 4, loop: true, fps: 30, bg: "dark",
  options: { palette: CRIMSON, rock: BASALT, mist: MIST, seed: 1, pedestal: true },
};

const D = 4, S = 46, HY = -76, TP = 2.5;
// the heartbeat speeds up as the pull builds, the overload at TP, then two calm beats while it recovers
const BEATS = [0.12, 0.34, 0.92, 1.1, 1.55, 1.69, 1.98, 2.1, 2.3, 2.41, 3.35, 3.55];

// how hard the field pulls (0..1), the debris orbit's radius factor, and how far the facets are thrown apart (px)
const pull = (t) => (t < TP ? ease.inQuad(t / TP) : 1 - ease.outCubic(seg(t, TP, TP + 0.5)));
function radiusK(t) {
  if (t < TP) return 1 - 0.44 * ease.inQuad(t / TP);
  if (t < TP + 0.32) return lerp(0.56, 1.38, ease.outExpo(seg(t, TP, TP + 0.32)));
  return lerp(1.38, 1, ease.inOutSine(seg(t, TP + 0.32, D)));
}
const gap = (t) => (t < TP ? 0 : 3.4 * ease.outCubic(seg(t, TP, TP + 0.1)) * (1 - ease.inOutSine(seg(t, TP + 0.25, 3.75))));
// the field lines' reach: drawn in tight while it pulls, blown wide by the overload
const fieldK = (t) => (t < TP ? 1 - 0.12 * ease.inQuad(t / TP) : lerp(0.88, 1, ease.outBack(seg(t, TP, TP + 0.9))) + 0.18 * Math.exp(-((t - TP - 0.08) / 0.12) ** 2));

function centre(t) {
  // anxious hover: quick bob, and a tremble that grows with the pull
  const tr = t < TP ? smooth(1.1, TP, t) : 0, f = Math.floor(t * 24);
  const jx = tr > 0.05 ? Math.round(((((f * 2654435761) >>> 0) % 1000) / 1000 - 0.5) * 2.4 * tr) : 0;
  return [jx, HY + Math.round(2 * Math.sin((TAU * 2 * t) / D))];
}

// ---- debris: chunks of rock on tilted orbits
const CHUNKS = 11;
function chunk(seed, j, t) {
  const r = rng(seed, j, 77), r0 = r.range(38, 62), beta = r.range(-0.5, 0.5), yo = r.range(-16, 14), k = r.pick([1, 1, 2]), dir = r.sign();
  const a0 = r.range(0, TAU), s = r.range(1.6, 3.8), spin = r.pick([-3, -2, -1, 1, 2, 3]), nv = r.int(5, 6), radii = Array.from({ length: nv }, () => r.range(0.65, 1.15));
  const rad = Math.max(r0 * radiusK(t), 31 + s), al = a0 + dir * ((TAU * k * t) / D + 2.4 * (1 - radiusK(t)));
  const X = rad * Math.cos(al), sa = rad * Math.sin(al), Y = sa * Math.sin(beta), Z = sa * Math.cos(beta);
  return { x: X, y: yo * (rad / r0) + Y + Z * 0.12, z: Z, s: s * (1 + Z / 260), rot: (TAU * spin * t) / D + a0, radii };
}
function drawChunk(p, c, cx, cy, R, C, pk) {
  const x = cx + c.x, y = cy + c.y, n = c.radii.length, back = c.z < 0;
  const pts = c.radii.map((rr, i) => [x + Math.cos(c.rot + (i * TAU) / n) * rr * c.s, y + Math.sin(c.rot + (i * TAU) / n) * rr * c.s]);
  // the face towards the light is lit, the face towards the heart glows crimson with the field
  const hx = cx - x, hy = cy - y, hl = Math.hypot(hx, hy) || 1;
  p.poly(pts, (px, py) => {
    const dx = px - x, dy = py - y, lit = -(dx * 0.6 + dy * 0.8), toward = (dx * hx + dy * hy) / hl;
    if (toward > c.s * 0.35) return C[back ? 4 : 5 + (pk > 0.3 ? 1 : 0)];
    return R[clamp(Math.round(3 + lit * 0.9) - (back ? 1 : 0), 1, 7)];
  });
  p.px(pts[0][0], pts[0][1], back ? R[4] : R[6]);
  p.glow(x, y, 5 + c.s * 2, C[4], back ? 0.08 : 0.16);
}

// ---- the dipole field: lines r = L sin²θ round the vertical axis, in planes that turn one spacing per loop
const LINES = 6;
function fieldPoint(L, phi, th, cx, cy) {
  const r = L * Math.sin(th) ** 2, X = r * Math.sin(th) * Math.cos(phi), Z = r * Math.sin(th) * Math.sin(phi), Y = -r * Math.cos(th) * 1.55;
  return [cx + X, cy + Y + Z * 0.14, Z];
}
function drawField(p, t, cx, cy, C, front) {
  const I = 0.55 + 0.45 * pull(t) + 0.8 * pulse(t, TP + 0.04, 0.1, D), fk = fieldK(t), rot = (TAU / LINES) * (t / D);
  const inHeart = (x, y) => sdHeart(x - cx, y - cy, S) < 1.5;
  for (const [L, off, w] of [[58, 0, 1], [80, 0.5, 0.75]])
    for (let j = 0; j < LINES; j++) {
      const phi = rot + ((j + off) * TAU) / LINES, LL = L * fk;
      // the faint line itself
      for (let q = 0; q <= 90; q++) {
        const th = 0.16 + ((Math.PI - 0.32) * q) / 90, [x, y, z] = fieldPoint(LL, phi, th, cx, cy);
        if (z >= 0 !== front || inHeart(x, y)) continue;
        p.dot(x, y, front ? C[3] : C[2], w * I * (front ? 0.5 : 0.3));
      }
      // filings streaming from the north pole (top) round to the south, two laps a loop
      for (let q = 0; q < 8; q++) {
        const u = (q / 8 + (2 * t) / D + j * 0.137 + off * 0.31) % 1;
        for (let k = 2; k >= 0; k--) {
          const th = 0.16 + (Math.PI - 0.32) * clamp(u - k * 0.011), [x, y, z] = fieldPoint(LL, phi, th, cx, cy);
          if (z >= 0 !== front || inHeart(x, y)) continue;
          const hot = I > 1.1 && k === 0;
          p.px(x, y, k === 0 ? (hot ? C[8] : C[front ? 7 : 5]) : k === 1 ? C[front ? 5 : 4] : C[3]);
          if (k === 0) p.light(x, y, C[6], (front ? 0.45 : 0.22) * w * Math.min(1.4, I));
        }
      }
    }
}

// ---- the heart itself
function drawHeart(p, t, o, cx, cy, C, R) {
  const g = heartGeom(S, { cell: 7.5, seed: o.seed, dome: 0.42 });
  const gp = gap(t), bt = beats(t, BEATS, 0.06, D), pl = pull(t), pk = pulse(t, TP + 0.03, 0.08, D);
  const crackK = 0.35 + 0.65 * bt + 0.4 * pl + pk;
  const shift = (i) => [Math.round((g.ccx[i] / S) * gp * 2.3), Math.round((g.ccy[i] / S) * gp * 2.3)];
  p.shade(cx + g.X0, cy + g.Y0, cx + g.X0 + g.W, cy + g.Y0 + g.H, (x, y, out) => {
    const lx = Math.floor(x) - cx, ly = Math.floor(y) - cy;
    let i = g.i(lx, ly);
    if (i < 0) return;
    if (gp > 0.05) {
      // the facets fly out from the centre: find whose shifted facet lands on this pixel (two tries)
      let [ox, oy] = shift(i), j = g.i(lx - ox, ly - oy);
      if (j >= 0 && g.cid[j] !== g.cid[i]) {
        const [ox2, oy2] = shift(j), j2 = g.i(lx - ox2, ly - oy2);
        j = j2 >= 0 && g.cid[j2] === g.cid[j] ? j2 : -1;
      } else if (j >= 0 && g.cid[j] !== g.cid[i]) j = -1;
      if (j < 0 || g.sd[j] > 0) {
        // a gap: the molten crimson core shows through, white at the middle
        if (g.sd[i] < gp * 1.2) {
          const dc = Math.hypot(lx, ly) / (S * 0.55);
          out.c = tone(C, 8.4 - 4 * dc - 0.6 * (1 - gp / 3.4), x, y);
          out.l = C[6]; out.k = 0.5 * (1 - dc * 0.6) * (gp / 3.4);
        }
        return;
      }
      i = j;
    } else if (g.sd[i] > 0) return;

    const id = g.cid[i], sd = g.sd[i], e = g.edge[i];
    const [nx, ny, nz] = unit(g.fnx[i] + (facetRand(id, 2, o.seed) - 0.5) * 0.8, g.fny[i] + (facetRand(id, 3, o.seed) - 0.5) * 0.8, g.fnz[i]);
    const lam = lambert(nx, ny, nz), sp = specular(nx, ny, nz, 26), crystal = facetRand(id, 1, o.seed) < 0.27;
    // outline: ink, but where the field lights it from behind it glows crimson
    if (sd > -1) {
      out.c = g.nx[i] > 0.25 || g.ny[i] > 0.55 ? C[4 + (crackK > 1 ? 1 : 0)] : R[0];
      return;
    }
    // cracks between facets: some glow with the field's crimson, the rest are just dark
    if (e < 0.85) {
      if (edgeRand(id, g.nid[i]) < 0.62) {
        out.c = tone(C, 4 + 2.6 * Math.min(1.3, crackK), x, y);
        out.l = C[5]; out.k = 0.18 * crackK;
      } else out.c = R[0];
      return;
    }
    if (crystal) {
      // a facet of magnetised crimson crystal: lit from inside, a hard white glint
      const lv = 2.6 + 3.2 * lam + 3 * sp + 1.1 * bt + 0.7 * pl + (e < 1.8 ? 1 : 0);
      out.c = sp > 0.7 ? WHITE : tone(C, clamp(lv, 2, 8), x, y);
      out.l = C[5]; out.k = 0.08 + 0.2 * bt + 0.12 * pl + 0.3 * pk;
      return;
    }
    // basalt: flat cut faces, a lit bevel along the edges facing the light, crimson where cracks glow nearby
    let lv = 0.7 + 4.6 * lam + 0.7 * (facetRand(id, 4, o.seed) - 0.5) + 2.2 * sp;
    if (e < 1.9) lv += lam > 0.55 ? 1 : -0.6;
    if (sd > -2.5 && g.nx[i] > 0.2) { out.c = tone(C, 2.5 + 1.5 * crackK, x, y); return; }
    out.c = tone(R, clamp(lv, 0.5, 7), x, y);
  });
  // the core's light, swelling on every beat and flaring on the overload
  p.glow(cx, cy, 44, C[4], 0.14 + 0.22 * bt + 0.22 * pl + 0.7 * pk);
  p.glow(cx, cy, 20, C[6], 0.08 + 0.18 * bt + 0.5 * pk);
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 9), R = fit(o.rock, 8), M = fit(o.mist, 6), [hx, hy] = centre(t);
  const pl = pull(t), pk = pulse(t, TP + 0.03, 0.1, D);
  if (o.pedestal !== false) {
    silk(p, t, D, C, { y: -4, seed: o.seed });
    mist(p, t, D, M, { layer: "back", seed: o.seed });
    pedestal(p, o, R, C[5], 0.7 + 0.6 * pl + 1.4 * pk);
    p.glow(0, -12, 46, C[3], 0.1 + 0.12 * pl + 0.4 * pk);
  }
  p.glow(hx, hy, 70, C[3], 0.08 + 0.1 * pl);
  drawField(p, t, hx, hy, C, false);
  for (let j = 0; j < CHUNKS; j++) {
    const c = chunk(o.seed, j, t);
    if (c.z < 0) drawChunk(p, c, hx, hy, R, C, pk);
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 9), R = fit(o.rock, 8), M = fit(o.mist, 6), [hx, hy] = centre(t);
  const pl = pull(t), tp = since(t, TP, D);
  drawHeart(p, t, o, hx, hy, C, R);
  drawField(p, t, hx, hy, C, true);

  // iron filings spiralling in on the pull (scattered by the overload)
  const quiet = tp < 0.7 ? smooth(0.35, 0.7, tp) : 1;
  cycle(t, D, 34, o.seed + 9, (g) => g.range(0.9, 1.6), (age, life, r) => {
    const u = age / life, a = r.range(0, TAU) + 2.6 * u * r.sign(), rr = lerp(r.range(56, 74), 27, ease.inQuad(u));
    const x = hx + Math.cos(a) * rr, y = hy + Math.sin(a) * rr * 0.85;
    const k = quiet * (0.4 + 0.6 * pl) * Math.sin(Math.PI * u);
    if (k < 0.08) return;
    p.dot(x, y, u > 0.7 ? C[7] : C[5], Math.min(1, k * 1.6));
    p.light(x, y, C[5], 0.25 * k);
  });

  // debris in front, with speed streaks as it's flung out
  for (let j = 0; j < CHUNKS; j++) {
    const c = chunk(o.seed, j, t);
    if (c.z < 0) continue;
    if (tp < 0.4) {
      const c0 = chunk(o.seed, j, t - 0.035);
      p.line(hx + c0.x, hy + c0.y, hx + c.x, hy + c.y, C[4], 0.7 * (1 - tp / 0.4));
    }
    drawChunk(p, c, hx, hy, R, C, pulse(t, TP + 0.03, 0.1, D));
  }

  // late in the pull, arcs crackle from the heart to the nearest debris
  if (t > 1.6 && t < TP + 0.05) {
    const f = Math.floor(t * 15);
    for (let j = 0; j < CHUNKS; j++) {
      const c = chunk(o.seed, j, t);
      if (c.z < 0 || Math.hypot(c.x, c.y) > 40 || (f + j) % 3) continue;
      const a = Math.atan2(c.y, c.x), sx = hx + Math.cos(a) * 24, sy = hy + Math.sin(a) * 22;
      const path = bolt(rng(o.seed, f, j), sx, sy, hx + c.x, hy + c.y, { jag: 0.3, depth: 3 });
      p.polyline(path, C[7]);
      for (const [x, y] of path) p.light(x, y, C[6], 0.3);
    }
  }

  // the overload: a white flash, a shock ring and a spray of sparks
  if (tp < 0.55) {
    const u = tp / 0.55, R0 = 26 + 46 * ease.outCubic(u);
    p.ring(hx, hy, R0, 1.6 * (1 - u) + 0.6, (v) => (v > 0.5 ? C[8] : C[6]), 1 - u);
    p.glowRing(hx, hy, R0, 7, C[5], 0.5 * (1 - u));
    if (tp < 0.07) p.glow(hx, hy, 60, WHITE, 0.5 * (1 - tp / 0.07));
    const rr = rng(o.seed, 404);
    for (let i = 0; i < 26; i++) {
      const a = rr.range(0, TAU), sp = rr.range(90, 210), life = rr.range(0.25, 0.55);
      if (tp > life) { rr.next(); continue; }
      const [x, y] = fly(hx + Math.cos(a) * 22, hy + Math.sin(a) * 20, Math.cos(a) * sp, Math.sin(a) * sp, tp, 160, 3.2);
      const [vx, vy] = flyV(Math.cos(a) * sp, Math.sin(a) * sp, tp, 160, 3.2), k = 1 - tp / life;
      p.line(x - vx * 0.018, y - vy * 0.018, x, y, (s) => (s > 0.6 ? C[8] : C[6]), k);
      p.light(x, y, C[6], 0.4 * k);
    }
  }

  if (o.pedestal !== false) mist(p, t, D, M, { layer: "front", seed: o.seed });
}
