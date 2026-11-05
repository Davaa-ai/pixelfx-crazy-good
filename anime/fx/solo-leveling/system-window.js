// Inspired by the floating status windows of hunter anime. Generic motifs only: no characters, costumes or logos.
import { cycle, rng, rand, fit, clamp, ease, sparkle, WHITE, READY } from "../../../src/core/index.js";

export const meta = {
  name: "System window",
  desc: "A blue point opens into a holographic panel: corner brackets glint, a notice types in, LEVEL UP flares white, a scan line sweeps it, then it glitches and folds away.",
  tags: ["solo leveling", "anime", "ui", "hologram", "panel", "level up", "notice", "glitch", "one-shot"],
  size: [200, 132],
  origin: [44, 120],
  duration: 2.7,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: {
    palette: ["#020814", "#06183a", "#0c2e66", "#1650a0", "#2a84d8", "#5cc0ff", "#b4e8ff", "#ffffff"],
    title: "NOTICE",
    head: "LEVEL UP!",
    line: "ALL STATS +1",
    seed: 61,
  },
};

const CX = 80, CY = -68, PW = 104, PH = 46;
const OPEN = 0.12, UNFOLD = 0.32, TYPE = 0.36, FLARE = 0.95, GLITCH = 2.05, FOLD = 2.3, SHUT = 2.45, GONE = 2.55;

export const act = {
  poses: [
    [0, { ...READY }],
    [0.1, { ...READY, crouch: 4, lean: -2, hy: -1, fx: 8, fy: -24, bx: 6, by: -24 }, "snap"],
    [0.4, { ...READY, crouch: 2, turn: 0.4, hy: -2, fx: 13, fy: -27, bx: 5, by: -20 }],
    [FLARE, { ...READY, crouch: 3, turn: 0.4, hy: -2, fx: 14, fy: -30, bx: 5, by: -20 }],
    [2.2, { ...READY, crouch: 2, turn: 0.3, hy: -1, fx: 13, fy: -26, bx: 6, by: -21 }],
    [2.7, { ...READY }],
  ],
};

// the panel's size now: [w, h]
function size(t) {
  if (t < OPEN) return [PW * ease.outCubic(t / OPEN), 1];
  if (t < FOLD) return [PW, 1 + (PH - 1) * ease.outBack(clamp((t - OPEN) / (UNFOLD - OPEN)))];
  if (t < SHUT) return [PW, 1 + (PH - 1) * (1 - ease.inCubic((t - FOLD) / (SHUT - FOLD)))];
  return [PW * (1 - ease.inCubic(clamp((t - SHUT) / (GONE - SHUT)))), 1];
}
// how far a row is torn sideways while it glitches (and for a frame as it opens)
function tear(t, y, seed) {
  const g = (t > GLITCH && t < FOLD) || (t > UNFOLD - 0.06 && t < UNFOLD);
  if (!g) return 0;
  const r = rng(seed, Math.floor(t * 30), Math.floor((y - CY) / 4));
  return r.chance(0.35) ? Math.round(r.range(-7, 7)) : 0;
}

export function draw(p, t, o) {
  if (t >= GONE) return;
  const C = fit(o.palette, 8), [w, h] = size(t), x0 = CX - w / 2, y0 = CY - h / 2, ft = Math.floor(t * 30);
  // ---- the spark it starts from
  if (t < OPEN + 0.05) {
    sparkle(p, CX, CY, 6 * (1 - t / (OPEN + 0.05)) + 2, WHITE, C[6], 0.8);
    p.glow(CX, CY, 20, C[5], 0.6);
  }
  // ---- the body of the panel: dark glass, scanlines, a soft glow behind
  p.glow(CX, CY, Math.max(w, h) * 0.75, C[4], 0.22);
  for (let y = Math.floor(y0); y <= y0 + h; y++) {
    const dx = tear(t, y, o.seed), scan = (y & 1) === 0;
    for (let x = Math.floor(x0); x <= x0 + w; x++) {
      const edge = x <= x0 + 0.5 || x >= x0 + w - 0.5 || y <= y0 + 0.5 || y >= y0 + h - 0.5;
      if (edge) p.px(x + dx, y, h < 2 ? WHITE : C[5]);
      else p.blend(x + dx, y, scan ? C[2] : C[1], 0.78);
    }
    if (dx) {
      // the torn row splits its color: a cyan ghost one way, a violet one the other
      p.dot(x0 + dx - 2, y, C[6], 0.8);
      p.dot(x0 + w + dx + 2, y, 0xffff60c0, 0.8);
    }
  }
  if (h < 3) p.glowLine(x0, CY, x0 + w, CY, 8, C[5], 0.6);
  if (h < 8) return;
  // the frame's light, the inner line, the corner brackets
  p.glowLine(x0, y0, x0 + w, y0, 5, C[5], 0.3);
  p.glowLine(x0, y0 + h, x0 + w, y0 + h, 5, C[5], 0.3);
  p.rect(x0 + 2, y0 + 2, w - 4, 1, C[3]);
  p.rect(x0 + 2, y0 + h - 2, w - 4, 1, C[3]);
  const glint = (t * 1.4) % 1;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cx = sx < 0 ? x0 - 3 : x0 + w + 3, cy = sy < 0 ? y0 - 3 : y0 + h + 3, hot = (sx + sy + 2) / 4 === Math.floor(glint * 4) / 3;
    const c = hot ? WHITE : C[6];
    p.line(cx, cy, cx - sx * 6, cy, c);
    p.line(cx, cy, cx, cy - sy * 6, c);
    p.light(cx, cy, C[5], hot ? 0.8 : 0.35);
  }
  if (t < TYPE || h < PH * 0.85) return;
  // ---- the words, typed in a letter at a time
  const typed = (s, t0, cps = 26) => s.slice(0, Math.max(0, Math.floor((t - t0) * cps)));
  const tt = typed(o.title, TYPE, 30);
  const tdx = tear(t, y0 + 5, o.seed);
  p.text(tt, CX + tdx, y0 + 5, C[6], { align: "center" });
  p.rect(CX - 34 + tdx, y0 + 12, 68 * clamp((t - TYPE) / 0.2), 1, C[4]);
  const head = typed(o.head, TYPE + 0.2), flare = t > FLARE ? Math.exp(-(t - FLARE) / 0.25) : 0, hy = y0 + 17, hdx = tear(t, hy + 3, o.seed);
  p.text(head, CX + hdx, hy, (gx) => (flare > 0.5 ? WHITE : rand(gx, ft, 3) < 0.04 ? WHITE : C[6]), { font: "big", align: "center", shadow: C[3] });
  if (head.length) p.glowLine(CX - 24, hy + 3, CX + 24, hy + 3, 9 + 10 * flare, C[5], 0.3 + 0.6 * flare);
  const sub = typed(o.line, TYPE + 0.55), sdx = tear(t, y0 + 32, o.seed);
  p.text(sub, CX + sdx, y0 + 33, C[5], { align: "center" });
  // a blinking cursor at the end of whatever is still typing
  const typing = sub.length < o.line.length;
  if (typing && Math.floor(t * 8) & 1) p.rect(CX + p.measure(sub)[0] / 2 + 2, y0 + 33, 2, 5, C[6]);
  // ---- the flare: a white flash on the panel and sparks flying off its corners
  if (flare > 0.05) {
    p.glow(CX, hy + 3, 50, C[5], 0.5 * flare);
    for (let i = 0; i < 10; i++) {
      const r = rng(o.seed, 8, i), a = r.range(0, Math.PI * 2), d = 20 + (1 - flare) * r.range(14, 34);
      p.dot(CX + Math.cos(a) * d * 1.6, hy + Math.sin(a) * d * 0.7, r.chance(0.5) ? WHITE : C[6], flare);
    }
  }
  // a scan line sweeping down the glass
  const sc = ((t - TYPE) * 0.9) % 1;
  if (t < GLITCH) {
    const y = y0 + 3 + sc * (h - 6);
    p.line(x0 + 2, y, x0 + w - 2, y, (u) => (u < 0.1 || u > 0.9 ? C[4] : C[5]), 0.7);
    p.glowLine(x0, y, x0 + w, y, 4, C[5], 0.25);
  }
  // motes of light drifting up off it
  cycle(t, 2.7, 14, o.seed + 4, (r) => r.range(0.8, 1.4), (age, life, r) => {
    if (t < UNFOLD || t > GLITCH) return;
    const k = age / life, x = x0 + r.range(4, w - 4) + Math.sin(age * 5 + r.next() * 6) * 2, y = y0 - age * r.range(10, 24);
    p.dot(x, y, k < 0.5 ? C[6] : C[5], 1 - k);
    p.light(x, y, C[5], 0.3 * (1 - k));
  });
}
