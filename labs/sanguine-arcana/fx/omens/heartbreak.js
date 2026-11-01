import { fit, Particles, P, Lights, Rng, ease, seg, smooth, lerp, clamp, sparkle, createFrame, painterFor, TAU, WHITE, mix } from "../../../../src/core/index.js";
import { BLOOD, GILT, MOON, heart, heartF } from "../../lib/shared.js";

export const meta = {
  name: "Heartbreak",
  desc: "A heart swells, beats twice and a gold hairline races across it; it shatters into mirror shards that tumble, bounce and settle with glowing gold seams, then fade.",
  tags: ["sanguine arcana", "omen", "betrayal", "heart", "shatter", "kintsugi", "one-shot"],
  size: [112, 116],
  origin: [56, 92],
  duration: 4.6,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: BLOOD, gilt: GILT, moon: MOON, seed: 4 },
};

const S = 17, HCY = -52, FW = 48, T_CRACK0 = 0.95, T_CRACK1 = 1.22, T_BREAK = 1.32, G_ = 820;
const BEATS = [0.62, 0.98];
const beat = (t) => Math.max(...BEATS.map((b) => Math.exp(-(((t - b) / 0.09) ** 2))));

// cut a shaded heart into shards: every pixel goes to its nearest seed, and keeps its colour
function cut(C, seed) {
  const f = createFrame(FW, FW, 0, 0), pp = painterFor(f);
  heart(pp, FW / 2, FW / 2, S, C, { base: 4.3 });
  const R = new Rng(seed), inside = (x, y) => heartF((x - FW / 2) / S, -(y - FW / 2) / S + 0.12) <= 0, seeds = [];
  for (let tries = 0; tries < 900 && seeds.length < 13; tries++) {
    const x = R.range(4, FW - 4), y = R.range(6, FW - 6);
    if (inside(x, y) && seeds.every(([sx, sy]) => Math.hypot(sx - x, sy - y) > 7.4)) seeds.push([x, y]);
  }
  const owner = new Int16Array(FW * FW).fill(-1), base = f.color;
  for (let y = 0; y < FW; y++)
    for (let x = 0; x < FW; x++) {
      if (!(base[y * FW + x] >>> 24)) continue;
      let best = 0, bd = 1e9;
      seeds.forEach(([sx, sy], i) => { const d = Math.hypot(sx - x - 0.5, (sy - y - 0.5) * 1.1); if (d < bd) (bd = d), (best = i); });
      owner[y * FW + x] = best;
    }
  const edge = new Uint8Array(FW * FW), at = (x, y) => (x < 0 || y < 0 || x >= FW || y >= FW ? -1 : owner[y * FW + x]);
  const shards = seeds.map((_, id) => ({ id, n: 0, sx: 0, sy: 0 }));
  for (let y = 0; y < FW; y++)
    for (let x = 0; x < FW; x++) {
      const o = owner[y * FW + x];
      if (o < 0) continue;
      const s = shards[o];
      s.n++; s.sx += x + 0.5; s.sy += y + 0.5;
      if (at(x - 1, y) !== o || at(x + 1, y) !== o || at(x, y - 1) !== o || at(x, y + 1) !== o) edge[y * FW + x] = 1;
    }
  for (const s of shards) {
    s.cx = s.sx / s.n; s.cy = s.sy / s.n;
    s.rb = 1;
  }
  for (let y = 0; y < FW; y++)
    for (let x = 0; x < FW; x++) {
      const o = owner[y * FW + x];
      if (o >= 0) shards[o].rb = Math.max(shards[o].rb, Math.hypot(x + 0.5 - shards[o].cx, y + 0.5 - shards[o].cy));
    }
  return { shards, owner, edge, base };
}

// the hairline: from the notch at the top to the point at the bottom, jagged
function crackPath(seed) {
  const R = new Rng(seed + 50), pts = [[0, -S * 0.72]];
  for (let i = 1; i < 9; i++) pts.push([R.range(-3.4, 3.4) * (i % 2 ? 1 : -1), -S * 0.72 + (i / 9) * S * 1.78]);
  pts.push([0, S * 1.06]);
  return pts;
}

export function create(o) {
  const C = fit(o.palette, 8), G = fit(o.gilt, 8), M = fit(o.moon, 8), R = new Rng(o.seed);
  const floor = () => 0, ps = new Particles({ rng: R, ground: floor, sparks: [WHITE, G[7], G[6], G[5]] }), lights = new Lights();
  const cutting = cut(C, o.seed), crack = crackPath(o.seed);
  const { shards, owner, edge, base } = cutting;
  let t = 0, broke = false, landed = 0;

  function shatter() {
    broke = true;
    for (const s of shards) {
      const wx = s.cx - FW / 2, wy = HCY + (s.cy - FW / 2), d = Math.hypot(wx, wy - HCY) || 1;
      Object.assign(s, { x: wx, y: wy, vx: (wx / d) * R.range(22, 44) + Math.sign(wx || 1) * 6, vy: ((wy - HCY) / d) * R.range(20, 50) - R.range(100, 160), a: 0, va: R.range(-7, 7), rest: false, seam: 0 });
    }
    lights.add(0, HCY, 52, C[7], 1.3, 0.5);
    lights.add(0, HCY, 34, G[6], 1, 0.16);
    for (let i = 0; i < 40; i++) {
      const a = R.range(0, TAU), sp = R.range(60, 190);
      ps.spawn(P.SPARK, Math.cos(a) * 8, HCY + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.25, 0.7));
    }
  }

  return {
    update(dt) {
      t += dt;
      if (!broke && t >= T_BREAK) shatter();
      if (broke) {
        for (const s of shards) {
          if (s.rest) {
            s.seam += dt;
            if (t < 3.1 && R.chance(dt * 1.6)) ps.spawn(P.EMBER, s.x + R.range(-4, 4), s.y - 2, R.range(-6, 6), -R.range(8, 24), R.range(0.8, 1.3), G[6], 1);
            continue;
          }
          s.vy += G_ * dt; s.vx -= s.vx * 0.5 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.va * dt;
          const fy = -s.rb * 0.5;
          if (s.y > fy && s.vy > 0) {
            s.y = fy;
            if (s.vy > 90) {
              s.vy = -s.vy * 0.38; s.vx *= 0.62; s.va *= 0.55;
              for (let i = 0; i < 3; i++) ps.spawn(P.SPARK, s.x, 0, R.range(-40, 40), -R.range(30, 80), R.range(0.15, 0.35));
            } else { s.rest = true; s.vx = s.vy = s.va = 0; landed++; }
          }
        }
      }
      lights.update(dt);
      ps.update(dt);
    },
    drawBack(p) {
      // a pool of rose light on the floor while it hovers, and its shadow
      const k = broke ? 0 : smooth(0.05, 0.5, t);
      if (k > 0) {
        for (let r = 0; r < 3; r++) p.line(-(13 - r * 3.5) * k, 1 + r, (13 - r * 3.5) * k, 1 + r, C[0]);
        p.glow(0, 0, 24, C[4], 0.22 * k);
      }
    },
    draw(p) {
      const fadeK = 1 - smooth(3.4, 4.5, t);
      if (!broke) {
        const grow = ease.outBack(seg(t, 0.05, 0.5)), bt = beat(t), s = S * grow * (1 + 0.07 * bt), trem = t > 1.0 ? Math.sin(t * 90) * 0.6 * smooth(1.0, 1.3, t) : 0;
        const cx = trem, cy = HCY + 1.6 * Math.sin(t * 3.1);
        if (s > 1) {
          p.glow(cx, cy, 44, C[4], 0.3 + 0.3 * bt);
          p.glow(cx, cy, 22, C[5], 0.25 + 0.3 * bt);
          heart(p, cx, cy, s, C, { lift: 0.9 * bt, base: 4.3 });
          // the crack, racing from the notch to the point; the head is white-hot
          const u = seg(t, T_CRACK0, T_CRACK1), n = u * (crack.length - 1);
          for (let i = 1; i < crack.length && i - 1 < n; i++) {
            const k = clamp(n - (i - 1)), [x0, y0] = crack[i - 1], [x1, y1] = crack[i];
            const ex = lerp(x0, x1, k) + cx, ey = lerp(y0, y1, k) + cy;
            p.line(x0 + cx + 1, y0 + cy, ex + 1, ey, C[0]);
            p.line(x0 + cx, y0 + cy, ex, ey, G[6]);
            p.glowLine(x0 + cx, y0 + cy, ex, ey, 6, G[5], 0.5);
            if (k < 1) { sparkle(p, ex, ey, 3, WHITE, G[6], 0.7); }
          }
          if (t > T_CRACK1) p.glow(cx, cy, 30, G[6], 0.7 * smooth(T_CRACK1, T_BREAK, t));
        }
      } else {
        const tt = t - T_BREAK;
        // the shock ring
        const ru = tt / 0.4;
        if (ru > 0 && ru < 1) {
          const r = 6 + 34 * ease.outCubic(ru);
          p.ring(0, HCY, r, Math.max(1, 3 * (1 - ru)), (v) => (v > 0.5 ? WHITE : G[6]), 1 - ru);
          p.glowRing(0, HCY, r, 8, G[5], 0.5 * (1 - ru));
        }
        // the shards
        for (const s of shards) {
          if (s.x === undefined) continue;
          const ca = Math.cos(s.a), sa = Math.sin(s.a), R2 = Math.ceil(s.rb) + 1;
          // a mirror shard flashes as its face swings through the light; once it lies still it only gleams
          const glint = s.rest ? 0.3 * Math.max(0, Math.sin(s.seam * 2.2 + s.id * 1.3)) ** 6 : Math.max(0, Math.sin(s.a * 2 + s.id * 1.3)) ** 6;
          const pulse = s.rest ? 0.5 + 0.5 * Math.sin(s.seam * 5 + s.id) : 0, seamC = s.rest ? (pulse > 0.6 ? G[7] : G[6]) : G[6];
          for (let Y = Math.floor(s.y - R2); Y <= Math.ceil(s.y + R2); Y++)
            for (let X = Math.floor(s.x - R2); X <= Math.ceil(s.x + R2); X++) {
              const dx = X + 0.5 - s.x, dy = Y + 0.5 - s.y, sx = Math.floor(s.cx + dx * ca + dy * sa), sy = Math.floor(s.cy - dx * sa + dy * ca);
              if (sx < 0 || sy < 0 || sx >= FW || sy >= FW || owner[sy * FW + sx] !== s.id) continue;
              const i = sy * FW + sx;
              let c = base[i];
              if (edge[i]) c = seamC;
              else if (glint > 0.12) c = mix(c, glint > 0.7 ? WHITE : M[6], glint * 0.85);
              p.dot(X, Y, c, fadeK);
              if (edge[i] && s.rest) p.light(X, Y, G[5], 0.18 * fadeK);
            }
          if (glint > 0.85 && !s.rest) sparkle(p, s.x, s.y, 2, WHITE, M[6], 0.5);
          if (s.rest) p.glow(s.x, s.y - 2, s.rb * 1.8, G[5], 0.12 * fadeK);
        }
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
