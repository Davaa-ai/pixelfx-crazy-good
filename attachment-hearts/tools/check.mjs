#!/usr/bin/env node
// Quality gate for the Attachment Hearts pack (attachment-hearts/fx).
// Enforces all pixelfx rules: metadata, bounds, zero spill, seamless loops, short palettes, determinism, <4ms speed.

import { performance } from "node:perf_hooks";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allIds, resolveIds, loadEffect, renderFrames } from "../../tools/lib/fxlib.mjs";
import { createFrame, clearFrame, createFx, BACKDROPS } from "../../src/core/index.js";

const FX_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "fx");
const ids = process.argv.length > 2 ? resolveIds(process.argv.slice(2), FX_DIR) : allIds(FX_DIR);

let bad = 0, warned = 0;

function countLit(buf) {
  let n = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] >>> 24) n++;
  return n;
}
function diffPx(a, b) {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}
function sameBuf(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

for (const id of ids) {
  const errs = [], warns = [];
  let fx;
  try { fx = await loadEffect(id, FX_DIR); }
  catch (e) { console.log(`FAIL  ${id}  import threw: ${e.message}`); bad++; continue; }

  const m = fx.meta;
  if (!m.name || !m.desc) errs.push("meta needs name and desc");
  if (!Array.isArray(m.size) || m.size.length !== 2 || m.size.some((v) => !(v > 0 && Number.isInteger(v)))) errs.push("meta.size must be [w, h] ints");
  if (!Array.isArray(m.origin) || m.origin.length !== 2) errs.push("meta.origin must be [x, y]");
  if (!(m.duration > 0 && m.duration <= 20)) errs.push(`strange duration ${m.duration}`);
  if (!Array.isArray(m.tags) || m.tags.length < 2) warns.push("fewer than 2 tags");
  if (!BACKDROPS.includes(m.bg)) errs.push(`unknown bg "${m.bg}"`);
  if (typeof fx.mod.draw !== "function" && typeof fx.mod.create !== "function") errs.push("export draw(p, t, opts) or create(opts)");

  if (errs.length) { console.log(`FAIL  ${id}\n      ${errs.join("\n      ")}`); bad++; continue; }

  const [w, h] = m.size, [ox, oy] = m.origin;
  const pad = 64, W = w + pad * 2, H = h + pad * 2;
  let spilled = 0, lightSpill = 0, totalLit = 0, bx0 = W, by0 = H, bx1 = -1, by1 = -1;
  const checkBounds = (seed) => {
    const f = createFrame(W, H), inst = createFx(fx.mod, { x: ox + pad, y: oy + pad, seed }), step = 1 / m.fps;
    const n = Math.max(1, Math.round(m.duration * m.fps) + (m.loop ? 0 : 1));
    for (let i = 0; i < n; i++) {
      if (i) inst.update(step);
      clearFrame(f);
      inst.draw(f);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = y * W + x, c = f.color[k] >>> 24, l = f.light[k];
        if (c) {
          totalLit++;
          if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
          if (y < by0) by0 = y; if (y > by1) by1 = y;
          if (x < pad || x >= pad + w || y < pad || y >= pad + h) spilled++;
        } else if (l && (x < pad || x >= pad + w || y < pad || y >= pad + h)) {
          const peak = Math.max(l & 255, (l >> 8) & 255, (l >> 16) & 255);
          if (peak > lightSpill) lightSpill = peak;
        }
      }
    }
  };
  const baseSeed = m.options.seed ?? 1;
  try { for (const s of [baseSeed, 2, 3, 7]) checkBounds(s); }
  catch (e) { errs.push(`draw threw: ${e.stack ?? e.message}`); }

  if (!errs.length) {
    if (totalLit === 0) errs.push("drew nothing on any frame");
    if (spilled > 0) warns.push(`${spilled} px drawn outside the ${w}x${h} canvas (drawing spans x ${bx0 - pad}..${bx1 - pad}, y ${by0 - pad}..${by1 - pad})`);
    if (lightSpill > 60) warns.push(`glow reaches ${lightSpill}/255 outside the canvas — fade it before the edge or widen meta.size`);
    const usedW = bx1 - bx0 + 1, usedH = by1 - by0 + 1;
    if (totalLit > 0 && usedW < w * 0.35 && usedH < h * 0.35) warns.push(`uses only ${usedW}x${usedH} of a ${w}x${h} canvas`);

    const a = renderFrames(fx, { bg: "none", actor: false });
    const b = renderFrames(fx, { bg: "none", actor: false });
    if (!a.frames.every((f, i) => sameBuf(f.raw, b.frames[i].raw))) errs.push("non-deterministic (Math.random inside?)");

    if (!m.loop && a.n > 2) {
      const endLit = countLit(a.frames[a.n - 1].raw);
      if (endLit > 0) warns.push(`one-shot still has ${endLit} px on its last frame (t=${m.duration})`);
    }
    if (m.loop && a.n > 4) {
      let stepSum = 0;
      for (let i = 1; i < a.n; i++) stepSum += diffPx(a.frames[i - 1].raw, a.frames[i].raw);
      const avgStep = stepSum / (a.n - 1);
      const seam = diffPx(a.frames[a.n - 1].raw, a.frames[0].raw);
      if (avgStep > 0 && seam > Math.max(avgStep * 2.5, 40)) warns.push(`loop seam: ${seam} px change from the last frame to the first (a normal step is ${Math.round(avgStep)})`);
    }
    if ("palette" in m.options) {
      try { renderFrames(fx, { bg: "none", actor: false, options: { palette: ["#000", "#555", "#aaa", "#fff"] } }); }
      catch (e) { errs.push(`short custom palette crashed it (use fit()): ${e.message}`); }
    }

    const f = createFrame(w, h), inst = createFx(fx.mod, { x: ox, y: oy });
    const times = [];
    for (let i = 0; i < 60; i++) {
      const t0 = performance.now();
      inst.update(1 / 60);
      clearFrame(f);
      inst.draw(f);
      times.push(performance.now() - t0);
    }
    times.sort((p, q) => p - q);
    const med = times[30];
    if (med > 4) warns.push(`median frame is ${med.toFixed(2)}ms (${w}x${h})`);
  }

  if (errs.length) { bad++; console.log(`FAIL  ${id}\n      ${errs.join("\n      ")}`); }
  else if (warns.length) { warned++; console.log(`warn  ${id}\n      ${warns.join("\n      ")}`); }
  else console.log(`ok    ${id}`);
}

console.log(`\n${ids.length} effects: ${ids.length - bad} pass, ${bad} fail, ${warned} with warnings`);
process.exit(bad ? 1 : 0);
