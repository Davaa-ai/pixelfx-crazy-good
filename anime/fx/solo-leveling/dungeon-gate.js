// Inspired by the dimensional gates of hunter anime. Generic motifs only: no characters, costumes or logos.
import { cycle, rng, rand, fit, clamp, bolt, mix, loopNoise, WHITE, TAU } from "../../../src/core/index.js";

export const meta = {
  name: "Dungeon gate",
  desc: "An oval rift of crackling light over a whirlpool falling away into the dark, motes and mist spiralling in, the floor washed in its glow. Recolor it red for the bad ones.",
  tags: ["solo leveling", "anime", "portal", "gate", "rift", "vortex", "blue", "dungeon", "loop"],
  size: [150, 160],
  origin: [75, 150],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#020610", "#061634", "#0a2a62", "#13489c", "#2478d8", "#58b0ff", "#b4e2ff", "#ffffff"], seed: 51 },
};

const D = meta.duration, CX = 0, CY = -64, RX = 34, RY = 54;
const PH = (t) => (t / D) * TAU;
// the rim's wobble, the same at t = 0 and t = D
// (worked out once a frame for its 13 segments)
let wobKey = NaN;
const WOB = new Float64Array(13);
const wob = (ang, t, s) => {
  if (wobKey !== t * 1e4 + s) {
    wobKey = t * 1e4 + s;
    for (let i = 0; i < 13; i++) WOB[i] = loopNoise(t / D, 0.8, s + i) * 0.5;
  }
  return WOB[Math.round(((ang + Math.PI) / TAU) * 12)];
};
// a point on the rim at angle ang, r a multiple of the radius
const rimAt = (ang, r = 1) => [CX + Math.cos(ang) * RX * r, CY + Math.sin(ang) * RY * r];

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), ph = PH(t);
  // a cold pool of light on the floor and a halo round the rift
  p.shade(-70, -4, 70, 5, (x, y, out) => {
    const d = Math.hypot(x / 64, (y - 1) / 5);
    if (d < 1) (out.l = C[4]), (out.k = 0.35 * (1 - d) * (1 - d) * (0.85 + 0.15 * Math.sin(ph * 2)));
  });
  p.glow(CX, CY, 50, C[3], 0.34);
  // mist rolling along the floor towards it
  cycle(t, D, 12, o.seed + 3, (r) => r.range(1.4, 2.2), (age, life, r, i) => {
    const k = age / life, s = i % 2 ? 1 : -1, x = s * (66 - age * r.range(18, 30)), y = -2 - r.range(0, 5) - k * 4;
    p.disc(x, y, 5 + 4 * Math.sin(Math.PI * k), mix(C[2], C[4], 0.4), 0.16 * Math.sin(Math.PI * k));
    p.disc(x + s * 4, y + 1, 4, mix(C[2], C[4], 0.3), 0.12 * Math.sin(Math.PI * k));
  });
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = PH(t);
  // ---- the whirlpool: arms of light winding inward, falling away to black at the heart
  p.shade(CX - RX - 2, CY - RY - 2, CX + RX + 2, CY + RY + 2, (x, y, out) => {
    const dx = (x - CX) / RX, dy = (y - CY) / RY, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    if (d > 1.1 || (d > 0.9 && d > 1 + wob(ang, t, o.seed) * 0.08)) return;
    const arm = Math.sin(ang * 3 + Math.log(d + 0.05) * 5.5 + ph * 2), fine = Math.sin(ang * 7 - d * 18 + ph * 3);
    const l0 = clamp(d * 0.95 + arm * 0.2 + fine * 0.05 - 0.12), lvl = l0 * Math.sqrt(l0);
    let c;
    if (lvl < 0.12) c = C[0];
    else if (lvl < 0.3) c = C[1];
    else if (lvl < 0.5) c = C[2];
    else if (lvl < 0.68) c = C[3];
    else if (lvl < 0.82) c = C[4];
    else if (lvl < 0.92) c = C[5];
    else c = C[6];
    if (d > 0.25 && arm > 0.96) c = d > 0.7 ? C[6] : C[5];
    else if (d > 0.2 && Math.abs(arm - 0.6) < 0.05) c = C[4];
    out.l = C[4];
    out.k = lvl > 0.6 ? 0.15 * lvl : 0;
    return c;
  });
  // ---- the rim: a bright ragged band, white where it's hottest
  for (let i = 0; i < 240; i++) {
    const ang = (i / 240) * TAU - Math.PI, w = wob(ang, t, o.seed), [x, y] = rimAt(ang, 1 + w * 0.08);
    const hot = 0.5 + 0.5 * Math.sin(ang * 5 - ph * 3);
    p.px(x, y, hot > 0.8 ? WHITE : C[6]);
    const [x2, y2] = rimAt(ang, 1.03 + w * 0.1);
    p.dot(x2, y2, C[5], 0.7);
    const [x3, y3] = rimAt(ang, 0.96 + w * 0.06);
    p.dot(x3, y3, C[5], 0.8);
    if (i % 12 === 0) p.glow(x, y, 8, C[5], 0.3 + 0.25 * hot);
  }
  // ---- static crawling off the rim, fresh twelve times a second
  const tick = Math.floor((t / D) * 12 * D) % Math.round(12 * D);
  for (let i = 0; i < 5; i++) {
    const r = rng(o.seed, tick, i), ang = r.range(-Math.PI, Math.PI), [x0, y0] = rimAt(ang, 1.02), [x1, y1] = rimAt(ang + r.range(-0.3, 0.3), 1.12 + r.range(0, 0.18));
    if (y1 > -14) continue;
    const pts = bolt(r, x0, y0, x1, y1, { jag: 0.45, depth: 3 });
    p.polyline(pts, r.chance(0.5) ? WHITE : C[6]);
    p.light(x1, y1, C[5], 0.5);
  }
  // ---- motes drawn in, spiralling as they fall towards the heart
  cycle(t, D, 34, o.seed + 7, (r) => r.range(0.9, 1.6), (age, life, r, i) => {
    const k = age / life, a0 = r.range(0, TAU), d = 1.5 - 1.3 * k * k, ang = a0 + k * 3.2, [x, y] = rimAt(ang, d);
    if (y > -3) return;
    const c = k < 0.5 ? C[6] : k < 0.85 ? C[5] : C[4];
    p.dot(x, y, k > 0.9 ? C[3] : c, Math.min(1, (1 - k) * 4));
    if (d > 0.4) {
      const [bx, by] = rimAt(ang - 0.08, d + 0.03);
      p.dot(bx, by, C[3], 0.7 * (1 - k));
    }
    p.light(x, y, C[5], 0.3 * (1 - k));
  });
  // ---- dust lifted off the floor below and sucked up
  cycle(t, D, 10, o.seed + 9, (r) => r.range(1, 1.6), (age, life, r) => {
    const k = age / life, x0 = r.range(-30, 30), x = x0 * (1 - k * 0.8), y = -1 - k * k * (CY * -1 - RY + 20);
    p.dot(x, y, rand(Math.floor(x0), 1, o.seed) < 0.5 ? C[4] : C[5], Math.sin(Math.PI * k));
  });
}
