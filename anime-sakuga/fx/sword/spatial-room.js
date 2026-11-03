// Surgeon's Spatial Dome (ROOM + Shambles/Tact): a spinning cyan bead drops from an open downward palm
// and blooms into a spherical operating dome enclosing fighter and foe; severed stone cubes float up
// in zero gravity before a crisp horizontal katana cut bisects the entire sphere along one plane.

import { Particles, Lights, P, Rng, rng, fit, clamp, smooth, seg, ease, band, sparkle, TAU, WHITE, READY } from "../../../src/core/index.js";
import { SAKUGA_PAL } from "../categories.js";
import { brightBolt, handAt, YutaponSim, ringFast } from "../_lib.js";

const STONE = ["#0b0e14", "#18202c", "#2b384d", "#445773", "#6780a3", "#94aecf", "#c7daf0", "#f0f7ff"];

export const meta = {
  name: "Surgeon's spatial dome",
  desc: "A cyan bead drops from an open palm and expands a spherical operating dome; stone blocks levitate in zero-G before one sword cut bisects the entire space.",
  tags: ["sword", "spatial", "dome", "room", "telekinesis", "slash", "one-piece", "one-shot"],
  size: [264, 164],
  origin: [56, 134],
  duration: 2.6,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: SAKUGA_PAL.opeCyan, seed: 6 },
};

const OPEN = 0.24, LIFT = 0.52, SLICE = 1.04, CLOSE = 1.88;
const TX = 106;
// Dome center and radius (clipped cleanly at the floor y = 0 for grounded 3D perspective!)
const DX = 58, DY = -18, DR = 78;

const PALM_DOWN = {
  ...READY, crouch: 3, lean: 1,
  fx: 13, fy: -23,
  offWeapon: "sword", bx: -6, by: -21, sb: -2.25,
  ffx: 8, fbx: -8,
};
const TACT_UP = {
  ...PALM_DOWN, crouch: 2, lean: 0,
  fx: 12, fy: -32,
};
const DRAW_WIND = {
  ...READY, crouch: 5, lean: -3,
  weapon: "sword", fx: -7, fy: -23, sa: -2.75,
  bx: 9, by: -22, armsFront: true, ffx: 9, fbx: -9,
};
const BISECT = {
  ...READY, x: 4, crouch: 4, lean: 5,
  weapon: "sword", fx: 16, fy: -23, sa: 0.28,
  bx: -8, by: -23, ffx: 12, fbx: -10, toeB: true, ghost: 1,
};

export const act = {
  target: { x: TX },
  ghost: "#34b0f5",
  poses: [
    [-0.4, { ...READY, offWeapon: "sword", bx: -6, by: -21, sb: -2.25 }],
    [-0.14, PALM_DOWN],
    [0, PALM_DOWN, "snap"],
    [LIFT - 0.06, PALM_DOWN],
    [LIFT + 0.14, TACT_UP, "out"],
    [SLICE - 0.16, DRAW_WIND, "snap"],
    [SLICE, BISECT, "snap"],
    [SLICE + 0.45, { ...BISECT, crouch: 5 }],
    [CLOSE, { ...READY, x: 2, weapon: "sword", fx: 12, fy: -21, sa: -0.75 }, "out"],
    [2.6, { ...READY, x: 2, weapon: "sword", fx: 12, fy: -21, sa: -0.75 }],
  ],
  hits: [
    { t: SLICE, stop: 0.16, shake: 0.28, amp: 2, push: 3.2, straw: 26, flash: 0.07, skin: "ice" },
    { t: CLOSE + 0.1, push: 0, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: SLICE, x: 8, n: 6, dir: 1 }],
};

/** Draw a hemisphere/dome arc clipped above y = 2, with optional upper-half horizontal shear `shiftX` above `cutY`. */
function drawDomeShell(p, cx, cy, r, C, a, shiftX = 0, cutY = -24) {
  if (r < 2 || a <= 0.02) return;
  // Soft translucent interior membrane glaze near the rim
  p.each(cx - r - 6, cy - r - 2, cx + r + 8, 2, (x, y, sx, sy) => {
    if (y > 1) return;
    const ox = y < cutY ? shiftX : 0;
    const dx = x - (cx + ox), dy = y - cy;
    const d = Math.hypot(dx, dy) / r;
    if (d > 1 || d < 0.84) return;
    const rim = (d - 0.84) / 0.16;
    p.blendPx(sx, sy, d > 0.96 ? WHITE : C[5], a * (d > 0.96 ? 0.72 : 0.16 * rim));
  });
}

export function create(o) {
  const C = fit(o.palette, 8), S = fit(STONE, 8), R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]], haze: C[4] });
  const lights = new Lights(), cubes = new YutaponSim(R, 0);

  let t = 0, lifted = false, sliced = false, nextMote = OPEN;

  // Dome radius envelope: opens fast at OPEN, holds steady, collapses smoothly at CLOSE
  const domeR = (time) => {
    if (time < OPEN || time >= CLOSE + 0.28) return 0;
    if (time < OPEN + 0.24) return DR * ease.outQuart((time - OPEN) / 0.24);
    if (time < CLOSE) return DR;
    return DR * (1 - ease.inCubic((time - CLOSE) / 0.28));
  };

  return {
    update(dt) {
      t += dt;
      const r = domeR(t);
      if (r > 20 && t < CLOSE && t >= nextMote) {
        nextMote += 0.07;
        const mx = DX + R.range(-r * 0.75, r * 0.75);
        ps.spawn(P.MOTE, mx, R.range(-8, -2), R.range(-8, 8), R.range(-38, -16), R.range(0.35, 0.65), C[6], 0.75);
      }

      // Tact: 7 surgical stone cubes levitate weightlessly out of the floor (negative gravity!)
      if (!lifted && t >= LIFT) {
        lifted = true;
        for (let i = 0; i < 7; i++) {
          const rx = 24 + i * 16 + R.range(-4, 4);
          cubes.spawn(rx, -2, R.range(-6, 6), R.range(-34, -18), 1.42, R.range(2.6, 3.8), i * 0.03, -12);
        }
      }
      // At CLOSE, drop any remaining levitating cubes back under normal gravity
      if (t >= CLOSE) {
        for (const q of cubes.list) q.grav = 560;
      }

      if (!sliced && t >= SLICE) {
        sliced = true;
        lights.add(TX, -24, 68, C[5], 0.9, 0.34);
        lights.add(DX, -24, 48, WHITE, 0.75, 0.12);
        for (let i = 0; i < 24; i++) {
          ps.spawn(P.SPARK, DX + R.range(-55, 65), -24, R.range(-95, 135), R.range(-45, 45), R.range(0.18, 0.42));
        }
      }

      cubes.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    drawBack(p) {
      if (t >= meta.duration - 0.04) return;
      const r = domeR(t);
      if (r > 2) {
        const a = t >= CLOSE ? 1 - (t - CLOSE) / 0.28 : 1;
        // Ground intersection ring (far half behind characters)
        const baseR = Math.sqrt(Math.max(4, r * r - DY * DY));
        band(p, DX, 0, baseR, 0.16, 2.2, 0.78 * a, C, (g) => Math.sin(g) < 0, t < OPEN + 0.12);
        // Upper latitude scan-ring (far half)
        if (r > 40) {
          const latY = -52, latR = Math.sqrt(Math.max(0, r * r - (latY - DY) ** 2));
          if (latR > 6) band(p, DX, latY, latR, 0.14, 1.2, 0.45 * a, C, (g) => Math.sin(g) < 0, false);
        }
      }
      cubes.draw(p, S, "back", C[5]);
      ps.draw(p, "back");
    },

    draw(p) {
      if (t >= meta.duration - 0.04) return;
      const f = Math.floor(t * 30);
      const [hx, hy] = handAt(act.poses, t);

      // 1. Pre-Room Spinning Surgical Vortex Bead under the downward palm (0..OPEN+0.06)
      if (t < OPEN + 0.06) {
        const u = clamp(t / OPEN);
        const bx = hx + 1, by = hy + 4;
        p.glow(bx, by, 18 * u + 5, C[5], 0.65);
        ringFast(p, bx, by, 4 + 3 * Math.sin(t * 28), 1.2, C[6], 0.9);
        p.circle(bx, by, 2.4, WHITE);
        sparkle(p, bx, by, 6 * u, WHITE, C[5], 0.6);
      }

      // 2. Spherical ROOM Dome + Bisecting Spatial Shear!
      const r = domeR(t);
      if (r > 2) {
        const a = t >= CLOSE ? 1 - (t - CLOSE) / 0.28 : 1;
        const cutY = -24;
        // Upper hemisphere physically shifts 6px right after SLICE, then snaps back!
        const shear = t >= SLICE && t < CLOSE ? 6 * Math.sin(clamp((t - SLICE) / 0.75) * Math.PI) : 0;

        drawDomeShell(p, DX, DY, r, C, a, shear, cutY);

        // Ground intersection ring (near half in front of feet)
        const baseR = Math.sqrt(Math.max(4, r * r - DY * DY));
        band(p, DX, 0, baseR, 0.16, 2.2, 0.88 * a, C, (g) => Math.sin(g) >= 0, t < OPEN + 0.12);

        // Upper latitude scan-ring (near half, shifted by spatial shear!)
        if (r > 40) {
          const latY = -52, latR = Math.sqrt(Math.max(0, r * r - (latY - DY) ** 2));
          if (latR > 6) band(p, DX + shear, latY, latR, 0.14, 1.2, 0.58 * a, C, (g) => Math.sin(g) >= 0, false);
        }
      }

      // 3. Razor Horizontal Spatial Sword Cut & "Shambles" Teleport Sparks (SLICE..SLICE+0.42)
      if (t >= SLICE && t < SLICE + 0.42) {
        const u = (t - SLICE) / 0.42;
        const fade = 1 - smooth(0.3, 1, u);
        const span = DR + 8;
        p.beam(DX - span, -24, DX + span + 6, -24, 4.4 * fade, (bu, bv) => (bv < 0.42 ? WHITE : C[5]), fade);
        p.glowLine(DX - span, -24, DX + span, -24, 7, C[5], 0.45 * fade);

        // Shambles electric spatial-swap arcs on fighter & target!
        if (u < 0.55) {
          const Rb = rng(o.seed + 51, Math.floor(f / 2));
          brightBolt(p, Rb, TX - 12, -38, TX + 12, -12, C, { jag: 0.26, depth: 3, nForks: 1, k: fade, glow: 0.4 });
          sparkle(p, TX, -24, 10 * fade, WHITE, C[5], 0.7 * fade);
        }
      }

      cubes.draw(p, S, "front", C[5]);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
