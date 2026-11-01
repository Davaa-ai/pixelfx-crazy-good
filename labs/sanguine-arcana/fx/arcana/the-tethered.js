import { fit, cycle, burst, fly, lerp, seg, smooth, ease, clamp, sparkle, TAU, WHITE } from "../../../../src/core/index.js";
import { cardMeta, windowBack, cardFront, foilSheen, clipCard, heart, inWin } from "../../lib/shared.js";

export const meta = cardMeta({
  name: "I · The Tethered",
  desc: "Two figures bound by a red thread that fate's shears try to cut: the thread pulls taut, the blades bite, and it only glows brighter. Motion rule: tension.",
  tags: ["fated bond", "thread", "shears", "love", "loop"],
  duration: 4,
});

const D = 4, SNIP = 1.75, BEATS = [0.2, 1.0, 2.5, 3.3];
const WX = 0, WY = -22, WR = 23;            // the wheel of fate behind everything
const HL = [-14, 17], HR = [14, 17];         // the two hands the thread ties
const SPAN = HR[0] - HL[0];

// how far apart in time (wrapping the loop) t is from a beat at b
const near = (t, b) => Math.min(Math.abs(t - b), D - Math.abs(t - b));
const beat = (t) => Math.max(...BEATS.map((b) => Math.exp(-((near(t, b) / 0.11) ** 2))));
const flash = (t) => {
  // the pulse the cut sends along the thread reaches the hearts about a quarter second later
  const tau = t - SNIP;
  return tau > 0 ? Math.exp(-(((tau - 0.27) / 0.09) ** 2)) : 0;
};

// the thread: sag in px at u (0..1 hand to hand), slack at rest, taut as the shears bite, ringing after the cut
function sagAmp(t) {
  if (t < 1.2) return 5.5;
  if (t < SNIP) return lerp(5.5, 1.6, ease.inOutQuad(seg(t, 1.2, 1.7)));
  const tau = t - SNIP;
  return 5.5 - 3.9 * Math.exp(-3.4 * tau) * Math.cos(tau * 13);
}
function threadY(u, t) {
  const tau = t - SNIP, hum = t < SNIP ? 0.9 * smooth(1.3, 1.7, t) * Math.sin(t * 52) : 2.4 * Math.exp(-7 * Math.max(0, tau)) * Math.sin(tau * 38);
  return HL[1] + sagAmp(t) * 4 * u * (1 - u) + 0.8 * Math.sin(TAU * (t / D)) * Math.sin(Math.PI * u) + hum * Math.sin(Math.PI * 3 * u);
}

// the shears: where the pivot is, how open the blades are, how visible
const shearsY = (t) => (t < 0.05 ? -40 : t < 1.4 ? lerp(-40, 13, ease.inOutCubic(seg(t, 0.05, 1.4))) : t < SNIP + 0.04 ? 13 : lerp(13, -40, ease.inCubic(seg(t, SNIP + 0.04, 2.9))));
const shearsOpen = (t) => (t < 1.3 ? 0.4 + 0.05 * Math.sin(t * 6) : t < SNIP ? lerp(0.4, 0.62, ease.outQuad(seg(t, 1.3, 1.68))) : lerp(0.62, 0.05, seg(t, SNIP, SNIP + 0.06)));
const shearsAlpha = (t) => smooth(0.05, 0.4, t) * (1 - smooth(1.95, 2.7, t));

// ---- the two who are tied. Each is drawn three times (rim light, top light, body) from one outline.
function lady(p, bx, by, c, dx, dy, t) {
  const X = bx + dx, Y = by + dy, ph = TAU * (t / D), s = Math.sin(ph);
  p.poly([[X - 5.4 - s * 0.7, Y], [X + 5.4 + s * 0.7, Y], [X + 3.4, Y - 8], [X + 2.2, Y - 15], [X - 2.2, Y - 15], [X - 3.4, Y - 8]], c);
  p.poly([[X - 2.4, Y - 15], [X + 2.4, Y - 15], [X + 2.1, Y - 22], [X - 2.1, Y - 22]], c);
  p.circle(X + 0.5, Y - 25.4, 2.7, c);
  p.beam(X + 1.5, Y - 21, X + 5.5, Y - 17, 1.7, c);
  p.beam(X + 5.5, Y - 17, X + 10, Y - 13, 1.5, c);
  // long hair, drifting
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push([X - 0.8 - i * 2.1, Y - 27.5 + k * 1.6 + i * 1.5 + Math.sin(ph + i * 0.8 + k) * (0.35 * i)]);
    p.polyline(pts, c);
  }
}
function stag(p, bx, by, c, dx, dy, t) {
  const X = bx + dx, Y = by + dy, ph = TAU * (t / D), s = Math.sin(ph + 1);
  // the cloak trails behind him
  p.poly([[X + 2, Y - 24], [X + 5.5, Y - 22], [X + 10 + s * 1.2, Y - 9], [X + 10.6 + s * 1.6, Y], [X + 3, Y]], c);
  p.poly([[X - 6.2, Y], [X + 6.2, Y], [X + 4.2, Y - 9], [X + 3.4, Y - 17], [X - 3.4, Y - 17], [X - 4.2, Y - 9]], c);
  p.poly([[X - 3.7, Y - 17], [X + 3.7, Y - 17], [X + 3.1, Y - 25], [X - 3.1, Y - 25]], c);
  p.circle(X - 0.6, Y - 28.6, 2.8, c);
  p.poly([[X - 2.6, Y - 29.4], [X - 6, Y - 27.4], [X - 2.6, Y - 26.2]], c);
  p.poly([[X - 0.4, Y - 30.5], [X + 2.2, Y - 33], [X + 2.2, Y - 29.6]], c);
  p.beam(X - 2.8, Y - 24, X - 6.2, Y - 18, 1.8, c);
  p.beam(X - 6.2, Y - 18, X - 10, Y - 13, 1.5, c);
  // antlers
  const H = [X - 0.6, Y - 31];
  const A = [[[-1, 0], [-3, -4], [-4.4, -7.6], [-3.6, -11.6]], [[-3, -4], [-7, -5.4]], [[-4.4, -7.6], [-7.8, -10]], [[-3.6, -11.6], [-5.2, -14.2]],
    [[1, 0], [3.2, -4], [4.8, -7.2], [5, -11]], [[3.2, -4], [7, -4.8]], [[4.8, -7.2], [8, -9]], [[5, -11], [6.6, -13.6]]];
  for (const line of A) p.polyline(line.map(([x, y]) => [H[0] + x, H[1] + y]), c);
}
const TIPS = [[-3.6, -11.6], [-5.2, -14.2], [-7.8, -10], [-7, -5.4], [5, -11], [6.6, -13.6], [8, -9], [7, -4.8]];

export function drawBack(p, t, o) {
  const B = fit(o.palette, 8), G = fit(o.gilt, 8), ph = TAU * (t / D);
  windowBack(p, B, 0.6, 2.1, 1.2);
  // the wheel of fate: a halo, two rings, ticks that creep round by two places a loop
  p.glow(WX, WY, 36, B[4], 0.3 + 0.04 * Math.sin(ph));
  p.ring(WX, WY, WR, 1, G[2]);
  p.ring(WX, WY, WR - 7, 1, B[3]);
  const rot = (t / D) * (TAU / 12);
  for (let i = 0; i < 24; i++) {
    const a = rot + (i * TAU) / 24, c = Math.cos(a), s = Math.sin(a), long = i % 2 === 0, r0 = long ? 17.5 : 19.5;
    p.line(WX + c * r0, WY + s * r0, WX + c * 21.5, WY + s * 21.5, long ? G[4] : G[3]);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 - Math.PI / 2, x = WX + Math.cos(a) * WR, y = WY + Math.sin(a) * WR;
    p.px(x, y, G[6]); p.px(x - 1, y, G[4]); p.px(x + 1, y, G[4]); p.px(x, y - 1, G[4]); p.px(x, y + 1, G[4]);
    p.glow(x, y, 6, G[5], 0.25);
  }
  // cold light on the ground, and a bank of low fog
  p.ellipse(0, 33, 34, 5, B[1], 0.45);
  for (let i = 0; i < 7; i++) p.disc(-27 + i * 9 + 3 * Math.sin(ph + i * 1.7), 32 + (i % 2) * 2, 9, B[3], 0.18);
}

export function draw(p, t, o) {
  const B = fit(o.palette, 8), G = fit(o.gilt, 8), M = fit(o.moon, 8), ph = TAU * (t / D), tau = t - SNIP;

  // embers rising through the window
  cycle(t, D, 16, o.seed, D * 0.86, (age, life, r) => {
    const x = r.range(-29, 29) + Math.sin(age * 1.6 + r.range(0, 6)) * 3, y = 35 - age * r.range(7, 15);
    const a = Math.min(1, age / 0.5) * Math.min(1, (life - age) / 0.9);
    p.dot(x, y, r.chance(0.3) ? B[6] : B[5], a);
    p.glow(x, y, 3, B[4], 0.3 * a);
  });

  // the two figures: rim from the thread's side, a hint from the wheel above, then the body
  const body = B[0], rim = B[4];
  lady(p, -24, 30, rim, 1, -1, t); lady(p, -24, 30, body, 0, 0, t);
  stag(p, 24, 30, rim, -1, -1, t); stag(p, 24, 30, body, 0, 0, t);
  const H = [24 - 0.6, 30 - 31];
  for (const [x, y] of TIPS) { p.px(H[0] + x, H[1] + y, B[6]); p.light(H[0] + x, H[1] + y, B[5], 0.5); }
  p.px(-24 + 2.9, 30 - 25.6, B[6]);                      // her profile catches the light
  p.px(24 - 5.4, 30 - 27.6, B[6]);                      // his muzzle too

  // their hearts, lit from within: they beat together, and flare when the cut's pulse arrives
  const pulse = Math.min(1, Math.max(beat(t), flash(t) * 1.4));
  for (const [cx, cy, f] of [[-24 + 0.4, 30 - 18.6, 1], [24 - 0.2, 30 - 20.4, 1]]) {
    heart(p, cx, cy, 2.1, B, { lift: pulse, base: 4.3 });
    p.glow(cx, cy, 10 + 8 * pulse, B[5], 0.3 + 0.55 * pulse);
    if (pulse > 0.8) sparkle(p, cx, cy, 3, B[7], B[6], 0.5);
  }

  // the thread
  const N = SPAN, pts = [];
  for (let i = 0; i <= N; i++) { const u = i / N; pts.push([HL[0] + u * SPAN, threadY(u, t)]); }
  const hot = tau > 0 && tau < 0.55 ? 1 - tau / 0.55 : 0;
  for (let i = 1; i < pts.length; i++) {
    const u = i / N, c = hot > 0.3 && Math.abs(u - 0.5) < tau * 2.2 ? B[7] : B[5];
    p.line(pts[i - 1][0], pts[i - 1][1] + 1, pts[i][0], pts[i][1] + 1, B[3]);
    p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c);
    if (i % 3 === 0) p.light(pts[i][0], pts[i][1], B[5], 0.34 + 0.4 * hot);
  }
  p.px(HL[0], HL[1], B[7]); p.px(HR[0], HR[1], B[7]);
  p.glow(HL[0], HL[1], 6, B[6], 0.4); p.glow(HR[0], HR[1], 6, B[6], 0.4);
  // the pulse the cut sends out, racing both ways
  if (tau > 0 && tau < 0.3) {
    for (const s of [-1, 1]) {
      const u = 0.5 + s * (tau / 0.27) * 0.5, y = threadY(u, t);
      sparkle(p, HL[0] + u * SPAN, y, 2, B[7], B[6], 0.8);
    }
  }
  // beads: each beat sends one from either hand to meet in the middle
  for (const b of BEATS) {
    const age = (((t - b) % D) + D) % D;
    if (age > 0.52) continue;
    const k = ease.inOutSine(age / 0.52) * 0.5;
    for (const s of [-1, 1]) {
      const u = s < 0 ? k : 1 - k;
      for (let d = 0; d < 4; d++) {
        const uu = clamp(u - s * d * 0.018, 0, 1);
        p.dot(HL[0] + uu * SPAN, threadY(uu, t), d === 0 ? B[7] : d < 2 ? B[6] : B[5], 1 - d * 0.22);
      }
      p.glow(HL[0] + u * SPAN, threadY(u, t), 5, B[6], 0.5);
    }
    if (age > 0.46) sparkle(p, 0, threadY(0.5, t), 2, B[7], B[6], 0.5);
  }

  // fraying: strands lift where the blades bit
  if (tau > 0 && tau < 0.5) {
    const cy = threadY(0.5, t);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.55, L = (2 + (i % 2) * 2) * Math.min(1, tau * 14), k = 1 - tau / 0.5;
      p.line(0, cy, Math.cos(a) * L, cy + Math.sin(a) * L, B[7], k);
    }
  }

  // the shears
  const sa = shearsAlpha(t);
  if (sa > 0.02) {
    const sy = shearsY(t), th = shearsOpen(t), L = 11, sn = Math.sin(th), cs = Math.cos(th);
    // handles first (behind the blades), gilt rings on short shanks
    for (const s of [-1, 1]) {
      const hx = s * sn * 8.5, hy = sy - cs * 8.5;
      p.line(0, sy, hx, hy, G[4], sa);
      p.ring(hx + s * 0.8, hy - 1.6, 3.1, 1.3, (v) => (v > 0.5 ? G[6] : G[4]), sa);
    }
    // blades: a bright edge, a steel body, a glint at the tip
    for (const s of [-1, 1]) {
      const tx = -s * sn * L, ty = sy + cs * L;
      p.beam(0, sy, tx, ty, 2.2, (u, v) => (v > 0.6 ? M[3] : M[5]), sa);
      p.line(s * 0.9, sy, tx + s * 0.9, ty, M[7], sa);       // the cutting edge faces the other blade
      p.px(tx, ty, WHITE);
    }
    p.px(0, sy, G[6]);
    p.glowLine(-sn * L, sy + cs * L, sn * L, sy + cs * L, 9, M[5], 0.1 * sa);
    p.glow(0, sy + 3, 14, M[4], 0.16 * sa);
  }
  // the bite: a hard flash where the blades met the thread, sparks scattering
  if (tau > -0.02 && tau < 0.18) {
    const k = 1 - Math.max(0, tau) / 0.18, cy = threadY(0.5, t);
    sparkle(p, 0, cy, Math.round(5 * k) + 1, B[7], M[6], 0.45 * k);
    p.glow(0, cy, 15, B[6], 0.4 * k * k);
  }
  burst(16, o.seed + 31, (r, i) => {
    if (tau < 0) return;
    const a = -Math.PI / 2 + r.range(-1.3, 1.3), sp = r.range(50, 130), [x, y] = fly(0, threadY(0.5, SNIP), Math.cos(a) * sp, Math.sin(a) * sp, tau, 260, 2.4), life = r.range(0.35, 0.8);
    if (tau > life) return;
    const k = 1 - tau / life, [vx, vy] = [Math.cos(a), Math.sin(a)];
    if (!inWin(x, y)) return;
    p.line(x - vx * 2, y - vy * 2, x, y, k > 0.5 ? B[7] : G[5]);
    p.glow(x, y, 3, G[5], 0.3 * k);
  });
  // the shears give way to gilt dust
  burst(22, o.seed + 77, (r) => {
    const born = SNIP + 0.12 + r.next() * 0.85, age = t - born;
    if (age < 0 || age > 1.0) return;
    const x = r.range(-7, 7) + Math.sin(age * 4 + r.range(0, 6)) * 1.5, y = shearsY(born) + r.range(-4, 9) - age * 12, k = 1 - age / 1.0;
    p.dot(x, y, r.chance(0.4) ? G[6] : G[5], k);
    p.glow(x, y, 3, G[4], 0.25 * k);
  });

  // glints on the tied hands, and the frame over it all
  cardFront(p, o, { title: "THE TETHERED", sub: "FATED BOND", numeral: "I" });
  foilSheen(p, o, t, D);
  clipCard(p);
}
