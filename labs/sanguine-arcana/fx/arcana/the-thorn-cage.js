import { fit, burst, ease, seg, smooth, lerp, clamp, sparkle, TAU, WHITE } from "../../../../src/core/index.js";
import { cardMeta, windowBack, cardFront, foilSheen, clipCard, heart } from "../../lib/shared.js";

export const meta = cardMeta({
  name: "II · The Thorn Cage",
  desc: "A heart hangs locked in a briar cage that slowly tightens: thorns close in, it beats faster, bleeds, then lets go and breathes. Motion rule: constriction.",
  tags: ["possession", "thorns", "heart", "cage", "blood", "love", "loop"],
  duration: 4,
});

const D = 4, CY = -4, NS = 34, SIX = 6;
const BEATS = [0.3, 0.95, 1.4, 1.72, 1.95, 2.5, 3.45];
const near = (t, b) => Math.min(Math.abs(t - b), D - Math.abs(t - b));
const beat = (t) => Math.max(...BEATS.map((b) => Math.exp(-((near(t, b) / 0.1) ** 2))));
// the grip: slack, then it tightens, shudders at the limit, and lets go
const squeeze = (t) => (t < 0.2 ? 0 : t < 1.7 ? ease.inCubic(seg(t, 0.2, 1.7)) : t < 2.15 ? 1 : 1 - ease.outQuad(seg(t, 2.15, 3.2)));

// one briar bar of the cage, pole to pole, turned by angle a: points with a depth (z > 0 faces us)
function bar(a, cx, rx, ry) {
  const pts = [];
  for (let j = 0; j <= NS; j++) {
    const th = (j / NS) * Math.PI, s = Math.sin(th);
    pts.push({ x: cx + rx * s * Math.sin(a), y: CY - ry * Math.cos(th), z: s * Math.cos(a), nx: Math.sin(th) * Math.sin(a) * 0.9 + 0.1 * Math.sin(a), ny: -Math.cos(th) });
  }
  return pts;
}
function cage(t) {
  const sq = squeeze(t), shake = t > 1.7 && t < 2.15 ? Math.sin(t * 75) * 0.45 : 0;
  return { sq, rx: 21 - 5.9 * sq + shake, ry: 26 - 2.4 * sq, cx: 1.1 * Math.sin(TAU * (t / D)), rot: (t / D) * (TAU / SIX) };
}

function thorns(p, pts, g, C, sq, front) {
  for (let j = 2; j < NS - 1; j += 3) {
    const q = pts[j], L = Math.hypot(q.nx, q.ny) || 1, ux = q.nx / L, uy = q.ny / L, out = 1.6 + 2.4 * sq, inn = 0.4 + 3.4 * sq;
    const side = j % 6 === 2 ? 1 : -1, tx = -uy * side * 0.5, ty = ux * side * 0.5;
    const ex = q.x + ux * out + tx * out, ey = q.y + uy * out + ty * out;
    p.line(q.x, q.y, ex, ey, front ? C[3] : C[2]);
    if (front) p.px(ex, ey, C[5]);
    if (front && q.z > 0.25 && (ux * ux + uy * uy) > 0.1) {
      const ix = q.x - ux * inn - tx * 0.6, iy = q.y - uy * inn - ty * 0.6;
      p.line(q.x, q.y, ix, iy, C[3]);
      p.px(ix, iy, C[5]);
    }
  }
}
function drawBar(p, pts, C, front, sq) {
  for (let j = 1; j < pts.length; j++) {
    const a = pts[j - 1], b = pts[j];
    if (front) {
      p.line(a.x, a.y, b.x, b.y, C[2]);
      p.line(a.x - 1, a.y, b.x - 1, b.y, C[3]);
      p.line(a.x + 1, a.y, b.x + 1, b.y, C[1]);
    } else p.line(a.x, a.y, b.x, b.y, C[1]);
  }
  thorns(p, pts, 0, C, sq, front);
}
// a latitude hoop: the far half behind the heart, the near half in front
function hoop(p, cx, v, rx, ry, C, front) {
  const th = v * Math.PI, y0 = CY - ry * Math.cos(th), r = rx * Math.sin(th);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * TAU, s = Math.sin(a);
    if ((s > 0) !== front) continue;
    const x = cx + Math.cos(a) * r, y = y0 + s * 3.2;
    p.px(x, y, front ? C[3] : C[1]);
    if (front) p.px(x, y + 1, C[1]);
  }
}

function vine(p, side, t, sq, C, G, B) {
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const y = 36 - i * 3.1;
    pts.push([side * (29.5 - 2 * Math.sin(i * 0.38 + 1) - (i > 22 ? (i - 22) * 0.4 : 0)), y]);
  }
  for (let i = 1; i < pts.length; i++) {
    p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], C[2]);
    p.line(pts[i - 1][0] - side, pts[i - 1][1], pts[i][0] - side, pts[i][1], C[1]);
  }
  for (let i = 2; i < pts.length; i += 3) {
    const [x, y] = pts[i], dir = i % 2 ? 1 : -1, L = 2 + 2.2 * sq;
    p.line(x, y, x - side * L, y + dir * L * 0.8, C[4]);
  }
  // rose buds that stay in the light
  for (const i of [6, 14, 21]) {
    const [x, y] = pts[i];
    p.px(x - side * 2, y, B[3]); p.px(x - side * 3, y, B[4]); p.px(x - side * 2, y - 1, B[4]); p.px(x - side * 3, y - 1, B[5]); p.px(x - side * 2, y + 1, B[2]);
    p.glow(x - side * 2.5, y, 5, B[4], 0.2 + 0.1 * Math.sin(t * TAU / D + i));
  }
}

function chain(p, x0, x1, yTop, yBot, G, B) {
  const n = Math.floor((yBot - yTop) / 3.4);
  for (let i = 0; i < n; i++) {
    const u = i / n, y = yTop + 1.7 + i * 3.4, x = x0 + (x1 - x0) * u * u;
    if (i % 2) p.rect(x - 0.5, y - 2, 1, 4, G[4]);
    else { p.rect(x - 1.5, y - 2, 3, 4, G[3]); p.rect(x - 0.5, y - 1, 1, 2, B[0]); p.px(x - 1.5, y - 2, G[6]); }
  }
}

function padlock(p, x, y, G, B, beatK) {
  p.arc(x, y, 3.6, 1.2, Math.PI, TAU, G[5]);
  p.rect(x - 3.5, y, 7, 6, G[4]);
  p.rect(x - 3.5, y, 7, 1, G[6]);
  p.rect(x + 2.5, y + 1, 1, 5, G[3]);
  p.rect(x - 3.5, y + 5, 7, 1, G[3]);
  p.px(x - 0.5, y + 2, B[0]); p.px(x + 0.5, y + 2, B[0]); p.px(x, y + 3, B[0]); p.px(x, y + 4, B[0]);
  p.glow(x, y + 3, 8, G[4], 0.18 + 0.2 * beatK);
}

export function drawBack(p, t, o) {
  const B = fit(o.palette, 8), G = fit(o.gilt, 8), M = fit(o.moon, 8), ph = TAU * (t / D), g = cage(t);
  windowBack(p, B, 0.5, 2.0, 1.3);
  p.ellipse(0, 34, 34, 4.5, B[0], 0.6);
  vine(p, -1, t, g.sq, M, G, B);
  vine(p, 1, t, g.sq, M, G, B);
  chain(p, 0, g.cx, -50, CY - g.ry - 1, G, B);
  for (let i = 0; i < SIX; i++) {
    const pts = bar(g.rot + (i * TAU) / SIX, g.cx, g.rx, g.ry);
    if (pts[NS >> 1].z < 0) drawBar(p, pts, M, false, g.sq);
  }
  hoop(p, g.cx, 0.3, g.rx, g.ry, M, false);
  hoop(p, g.cx, 0.72, g.rx, g.ry, M, false);
  // blood that has reached the ground
  const pool = smooth(1.95, 2.9, t) * (1 - smooth(3.05, 3.95, t));
  if (pool > 0.02) {
    p.ellipse(0, 33.5, 3 + 11 * pool, 1.2 + 1.2 * pool, B[3], 0.9);
    p.ellipse(-1, 33, 2 + 8 * pool, 0.8 + 0.8 * pool, B[4], 0.9);
    p.glow(0, 33, 14, B[4], 0.2 * pool);
  }
}

export function draw(p, t, o) {
  const B = fit(o.palette, 8), G = fit(o.gilt, 8), M = fit(o.moon, 8), g = cage(t), bt = beat(t), tau = TAU * (t / D);

  // the heart, squeezed, and lit from inside
  const s = 12.8 - 1.5 * g.sq + 0.55 * bt;
  p.glow(g.cx, CY, 34, B[4], 0.34 + 0.4 * bt + 0.12 * g.sq);
  p.glow(g.cx, CY, 18, B[5], 0.25 + 0.3 * bt);
  heart(p, g.cx, CY, s, B, { lift: 0.85 * bt + 0.25 * g.sq, base: 4.2 });
  // two vessels out of the top, and a crease down the middle where it's being pinched
  p.line(g.cx - 3, CY - s * 0.82, g.cx - 4.5, CY - s * 1.25, B[3]);
  p.line(g.cx + 3, CY - s * 0.82, g.cx + 5, CY - s * 1.2, B[3]);
  if (g.sq > 0.2) for (let i = 0; i < 9; i++) p.dot(g.cx + (i % 2 ? 0.4 : -0.3), CY - s * 0.55 + i * 2.2, B[2], 0.75 * g.sq);

  // the near bars, hoops and thorns over it
  for (let i = 0; i < SIX; i++) {
    const pts = bar(g.rot + (i * TAU) / SIX, g.cx, g.rx, g.ry);
    if (pts[NS >> 1].z >= 0) drawBar(p, pts, M, true, g.sq);
  }
  hoop(p, g.cx, 0.3, g.rx, g.ry, M, true);
  hoop(p, g.cx, 0.72, g.rx, g.ry, M, true);
  // thorn tips catching the heart's light, and the points that pierce when it's tightest
  if (g.sq > 0.55) {
    const k = smooth(0.55, 1, g.sq);
    for (let i = 0; i < 4; i++) {
      const a = 2.5 + i * 0.95, x = g.cx + Math.cos(a) * s * 0.95 * (i % 2 ? 1 : 0.8), y = CY + Math.sin(a) * s * 0.85;
      p.px(x, y, B[7]);
      p.glow(x, y, 4, B[6], 0.5 * k);
    }
  }

  // the lock hangs from the foot of the cage, swaying
  const lx = g.cx + 0.9 * Math.sin(tau - 0.7), ly = CY + g.ry + 2;
  p.rect(lx - 0.5, ly - 2, 1, 3, G[4]);
  padlock(p, lx, ly + 2, G, B, bt);

  // blood: beads swell where thorns bite, then fall to the floor
  burst(11, o.seed + 5, (r, i) => {
    const born = 1.55 + r.next() * 0.85, x0 = g.cx + r.range(-8.5, 8.5), y0 = CY + 13.6 - Math.abs(x0 - g.cx) * 0.95 - r.range(0, 3), age = t - born;
    if (age < 0 || age > 1.15) return;
    const hang = 0.32 + r.range(0, 0.15);
    if (age < hang) {
      const sz = age / hang;
      p.px(x0, y0, B[4]);
      if (sz > 0.45) p.px(x0, y0 + 1, B[5]);
      if (sz > 0.8) p.px(x0, y0 + 2, B[4]);
      p.glow(x0, y0, 3, B[5], 0.3);
      return;
    }
    const fa = age - hang, y = y0 + 2 + 380 * fa * fa * 0.5, floor = 33;
    if (y < floor) {
      p.px(x0, y, B[6]); p.px(x0, y - 1, B[4]); p.px(x0, y - 2, B[3], );
      p.glow(x0, y, 3, B[5], 0.3);
    } else if (fa < Math.sqrt((floor - y0 - 2) * 2 / 380) + 0.14) {
      const k = (fa - Math.sqrt((floor - y0 - 2) * 2 / 380)) / 0.14;
      p.px(x0 - 1 - k * 2, floor, B[4]); p.px(x0 + 1 + k * 2, floor, B[4]); p.px(x0, floor - 1, B[5]);
    }
  });

  cardFront(p, o, { title: "THE THORN CAGE", sub: "POSSESSION", numeral: "II" });
  foilSheen(p, o, t, D);
  clipCard(p);
}
