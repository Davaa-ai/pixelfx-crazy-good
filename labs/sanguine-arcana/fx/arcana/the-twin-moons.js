import { fit, cycle, noise2, ease, seg, smooth, lerp, clamp, sparkle, rand, TAU, WHITE } from "../../../../src/core/index.js";
import { cardMeta, windowBack, cardFront, foilSheen, clipCard, tone, bayer } from "../../lib/shared.js";

export const meta = cardMeta({
  name: "III · The Twin Moons",
  desc: "A pale moon and a blood moon circle each other and trade places in an eclipse that never quite becomes a kiss, while two lantern-bearers watch from sundered cliffs. Motion rule: near-miss.",
  tags: ["star-crossed", "moon", "eclipse", "longing", "love", "loop"],
  duration: 6,
});

const D = 6, BX = 0, BY = -19, A = 18, TILT = 0.3;

// where the two moons are: they orbit one another in a tilted plane; z is depth (nearer = bigger, brighter)
function moons(t) {
  const th = TAU * (t / D), x = A * Math.cos(th), z = A * Math.sin(th);
  return [
    { id: "pale", x: BX + x, y: BY + z * TILT, z, r: 9.4 + 1.9 * (z / A) },
    { id: "blood", x: BX - x, y: BY - z * TILT, z: -z, r: 9.4 - 1.9 * (z / A) },
  ];
}

// a lit sphere: marbled, turning once a loop; light from upper left plus a rim of the other moon's colour
function moon(p, m, other, R, kind, t, o) {
  const rot = TAU * (t / D) * (kind === "pale" ? 1 : -1), far = clamp(-m.z / A), dx = other.x - m.x, dy = other.y - m.y, dl = Math.hypot(dx, dy) || 1;
  const lx = -0.5, ly = -0.55, lz = 0.67, ox = dx / dl, oy = dy / dl, close = smooth(26, 4, dl);
  p.shade(m.x - m.r - 1, m.y - m.r - 1, m.x + m.r + 1, m.y + m.r + 1, (x, y, out) => {
    const nx = (x - m.x) / m.r, ny = (y - m.y) / m.r, d2 = nx * nx + ny * ny;
    if (d2 > 1) return;
    const nz = Math.sqrt(1 - d2), lam = Math.max(0, nx * lx + ny * ly + nz * lz);
    const lon = Math.atan2(nx, nz) + rot, c = Math.cos(lon), s = Math.sin(lon);
    const tex = noise2(c * 2.3 + ny * 1.9 + 11, s * 2.3 + ny * 1.7 + 5, kind === "pale" ? 3 : 8), vein = Math.abs(tex) < 0.07;
    const rim = Math.max(0, nx * ox + ny * oy) * (1 - nz) * close;
    let level;
    if (kind === "pale") level = 1.2 + 4.3 * lam + 0.9 * tex - 0.9 * far;
    else level = 1.0 + 3.2 * lam + 0.6 * tex + (vein ? 1.8 : 0) - 0.8 * far;
    const R2 = kind === "pale" ? R.moon : R.blood;
    let col = tone(R2, level, x, y);
    // a one-pixel dark limb, then the other moon's light on the side that faces it
    if (d2 > 0.8) col = tone(R2, level - 1.2, x, y);
    if (rim > 0.12) col = tone(kind === "pale" ? R.blood : R.moon, 4.6 + 3 * rim, x, y);
    out.c = col;
  });
  p.glow(m.x, m.y, m.r * 2.6, kind === "pale" ? R.moon[4] : R.blood[4], (kind === "pale" ? 0.26 : 0.3) * (1 - 0.4 * far));
}

// a cliff top on one side of the chasm: a ragged edge lit by that side's moon
function cliff(p, s, C, rimC) {
  const pts = [[s * 34, 39], [s * 34, 17], [s * 29, 15.5], [s * 25, 17], [s * 21.5, 16], [s * 18, 17], [s * 16, 20.5], [s * 16.8, 26], [s * 15.4, 31], [s * 17.5, 39]];
  p.poly(pts, C[0]);
  for (let i = 1; i < 9; i++) p.line(pts[i - 1][0], pts[i - 1][1] - 0.5, pts[i][0], pts[i][1] - 0.5, i < 6 ? rimC : C[2]);
  for (let i = 0; i < 7; i++) p.px(s * (32 - i * 2.4), 22 + ((i * 7) % 13), C[1]);
}

// a small cloaked watcher at the cliff's edge, a lantern held up to the sky; lit on the side facing the chasm
function watcher(p, x, y, face, C, lampC, k) {
  const body = (c, dx) => {
    p.poly([[x - 3 + dx, y], [x + 3 + dx, y], [x + 1.8 + dx, y - 5], [x - 1.8 + dx, y - 5]], c);
    p.rect(x - 1.8 + dx, y - 9, 3.6, 5, c);
    p.circle(x + dx, y - 10.6, 1.7, c);
    p.line(x + face * 1.6 + dx, y - 7.6, x + face * 4.2 + dx, y - 11.5, c);
  };
  body(lampC[4], face);
  body(C[2], 0);
  p.px(x + face * 4.2, y - 11.5, lampC[6]);
  // the lantern: a little cage of light that answers the moons
  p.px(x + face * 4.2, y - 12.5, lampC[7]); p.px(x + face * 4.2, y - 13.5, lampC[6]);
  p.px(x + face * 3.2, y - 12.5, lampC[5]); p.px(x + face * 5.2, y - 12.5, lampC[5]);
  p.glow(x + face * 4.2, y - 12.5, 10 + 6 * k, lampC[5], 0.4 + 0.5 * k);
  p.px(x + face * 1.8, y - 11, lampC[6]);
}

export function drawBack(p, t, o) {
  const B = fit(o.palette, 8), G = fit(o.gilt, 8), M = fit(o.moon, 8), ph = TAU * (t / D);
  windowBack(p, M, 0.2, 1.95, 1.3);
  // a warm bruise low in the sky, where the blood moon's light pools
  p.glow(0, 20, 38, B[3], 0.18);
  p.glow(0, -24, 40, M[3], 0.14);
  // stars: a steady scatter that twinkles, a few bright ones
  for (let i = 0; i < 46; i++) {
    const x = -32 + rand(o.seed, i, 1) * 64, y = -49 + rand(o.seed, i, 2) * 52, tw = 0.5 + 0.5 * Math.sin(ph * (1 + (i % 3)) + rand(o.seed, i, 3) * TAU);
    if (Math.hypot(x - BX, y - BY) < 20 && rand(o.seed, i, 4) > 0.4) continue;
    p.dot(x, y, tw > 0.82 ? M[7] : tw > 0.45 ? M[5] : M[3], 0.35 + 0.65 * tw);
  }
  for (const [x, y, k] of [[-24, -40, 0], [26, -33, 1], [-27, -9, 2], [20, -45, 3]]) {
    const tw = 0.5 + 0.5 * Math.sin(ph * 2 + k * 1.9);
    sparkle(p, x, y, 1 + Math.round(tw * 2), M[6], M[5], 0.35 * tw);
  }
  // the moons' path, dotted: two ellipses seen nearly edge-on, one over the other
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * TAU, x = BX + Math.cos(a) * A, y = BY + Math.sin(a) * A * TILT;
    p.dot(x, y, G[4], i % 2 ? 0.45 : 0.15);
  }
  // chasm mist, drifting
  for (let i = 0; i < 9; i++) p.disc(-26 + i * 6.5 + 4 * Math.sin(ph + i * 1.3), 30 + (i % 3) * 2, 8 + (i % 2) * 2, i % 2 ? M[3] : B[2], 0.22);
}

export function draw(p, t, o) {
  const B = fit(o.palette, 8), G = fit(o.gilt, 8), M = fit(o.moon, 8), ph = TAU * (t / D);
  const [P, Bm] = moons(t), sep = Math.hypot(P.x - Bm.x, P.y - Bm.y), near = smooth(30, 4, sep), R = { moon: M, blood: B };

  // far moon first, near moon over it
  const order = P.z < Bm.z ? [[P, Bm, "pale"], [Bm, P, "blood"]] : [[Bm, P, "blood"], [P, Bm, "pale"]];
  for (const [m, other, kind] of order) moon(p, m, other, R, kind, t, o);

  // eclipse: the near moon wears a corona of the far one's light, and at the crossing it flares
  const front = P.z > Bm.z ? P : Bm, back = front === P ? Bm : P, cc = front === P ? B : M;
  if (sep < 21) {
    const k = smooth(21, 2, sep);
    p.glowRing(front.x, front.y, front.r, 6, cc[5], 0.7 * k);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU, x = front.x + Math.cos(a) * (front.r + 0.5), y = front.y + Math.sin(a) * (front.r + 0.5);
      if (rand(o.seed, i, 9) < k) p.px(x, y, cc[i % 3 ? 6 : 7]);
    }
  }
  const cross = Math.max(Math.exp(-(((t - D / 4) / 0.2) ** 2)), Math.exp(-(((t - (3 * D) / 4) / 0.2) ** 2)));
  if (cross > 0.05) {
    const a = -Math.PI / 4, x = front.x + Math.cos(a) * (front.r + 1), y = front.y + Math.sin(a) * (front.r + 1);
    sparkle(p, x, y, Math.round(2 + 5 * cross), WHITE, G[6], 0.45 * cross);
    p.glow(front.x, front.y, front.r * 2.8, G[5], 0.16 * cross);
  }

  // the reach: stardust streams between them as they near, each moon's own colour flowing to the other
  if (near > 0.05) {
    cycle(t, 1.4, Math.round(5 + 14 * near), o.seed + 3, 0.9, (age, life, r, i) => {
      const u = age / life, from = i % 2 ? P : Bm, to = i % 2 ? Bm : P, e = ease.inOutSine(u);
      const x = lerp(from.x, to.x, e) + Math.sin(u * 9 + i) * 2.2 * (1 - near * 0.5), y = lerp(from.y, to.y, e) + Math.cos(u * 7 + i * 2) * 1.8 - 8 * Math.sin(u * Math.PI) * (1 - near);
      const cc2 = i % 2 ? M : B;
      p.dot(x, y, u < 0.8 ? cc2[6] : cc2[5], near * Math.min(1, u * 5) * Math.min(1, (1 - u) * 4));
      if (i % 3 === 0) p.glow(x, y, 3, cc2[5], 0.25 * near);
    });
  }

  // the two watchers, a world apart, their lanterns answering the moons
  cliff(p, -1, M, M[3]);
  cliff(p, 1, B, B[3]);
  const lk = 0.25 + 0.75 * near;
  watcher(p, -22, 16, 1, M, M, lk);
  watcher(p, 22, 16, -1, B, B, lk);
  // a long cool line of light along the chasm floor
  p.glowLine(-8, 33, 8, 33, 7, near > 0.2 ? G[5] : M[4], 0.1 + 0.2 * near);

  cardFront(p, o, { title: "THE TWIN MOONS", sub: "STAR-CROSSED", numeral: "III" });
  foilSheen(p, o, t, D);
  clipCard(p);
}
