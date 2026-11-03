#!/usr/bin/env node
// Render and check the Shonen Arts techniques without touching the main library. Reuses tools/lib.
//
//   node labs/shonen-arts/tools/lab.mjs render techniques/spiral-sphere          contact sheet in labs/shonen-arts/out/
//   node labs/shonen-arts/tools/lab.mjs render techniques --gif --zoom 3  a category, with animated GIFs
//   node labs/shonen-arts/tools/lab.mjs act techniques/spiral-sphere --gif       performed: the body, the target, the freeze
//   node labs/shonen-arts/tools/lab.mjs check                                every effect in the lab
//
// render options: --gif --mp4 --sheet --all (every frame) --max N --zoom N --scale N --seed N --opts JSON --at 0.4,1.8 (just those seconds)

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { resolveIds, allIds, loadEffect, renderFrames, renderAct, contactSheet, spriteSheet, writeVideo, save } from "../../../tools/lib/fxlib.mjs";
import { createFrame, clearFrame, createFx, resolveOptions, Painter } from "../../../src/core/index.js";
import { viewRect } from "../lib/summon.js";

// what a camera sees of an act's frames: each frame cropped to the view and scaled back up, nearest neighbour
function filmed(fx, r) {
  if (!fx.mod.camera) return r;
  const { w, h } = r, [X, Y] = r.pivot;
  return {
    ...r,
    frames: r.frames.map((f) => {
      const v = viewRect(fx.mod.camera(f.t), w, h, X, Y), out = new Uint8ClampedArray(w * h * 4), kx = v.sw / w, ky = v.sh / h;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const s = (Math.min(h - 1, Math.floor(v.sy + y * ky)) * w + Math.min(w - 1, Math.floor(v.sx + x * kx))) * 4, d = (y * w + x) * 4;
          out[d] = f.color[s]; out[d + 1] = f.color[s + 1]; out[d + 2] = f.color[s + 2]; out[d + 3] = f.color[s + 3];
        }
      return { ...f, color: out };
    }),
  };
}

const LAB = join(dirname(fileURLToPath(import.meta.url)), ".."), FX = join(LAB, "fx"), OUT = join(LAB, "out");
const [cmd, ...rest] = process.argv.slice(2), flags = {}, pats = [];
for (let i = 0; i < rest.length; i++) {
  if (!rest[i].startsWith("--")) pats.push(rest[i]);
  else if (["gif", "mp4", "sheet", "all"].includes(rest[i].slice(2))) flags[rest[i].slice(2)] = true;
  else flags[rest[i].slice(2)] = rest[++i];
}
const ids = pats.length ? resolveIds(pats, FX) : allIds(FX);
if (!["render", "act", "check", "overview"].includes(cmd) || !ids.length) {
  console.error("usage: node labs/shonen-arts/tools/lab.mjs <render|act|check|overview> [id|category]... [--gif] [--mp4] [--sheet] [--all] [--zoom N]");
  process.exit(1);
}

let failed = 0;
if (cmd === "act") {
  // the technique performed: a contact sheet of 12 fps steps (or --at seconds), plus --gif / --mp4 of the whole act
  for (const id of ids) {
    const fx = await loadEffect(id, FX), dir = join(OUT, id), made = [];
    const r = filmed(fx, renderAct(fx, { fps: fx.meta.fps, seed: flags.seed ? +flags.seed : undefined, pad: fx.mod.camera ? 0 : undefined }));
    const pick = flags.at ? flags.at.split(",").map((s) => r.frames.findIndex((f) => f.t >= +s - 1e-6)).filter((i) => i >= 0) : null;
    const sheetR = { ...r, frames: pick ? pick.map((i) => r.frames[i]) : r.frames };
    made.push(save(join(dir, pick ? "act-close.png" : "act.png"), contactSheet(fx, sheetR, { max: pick ? pick.length : +(flags.max ?? 30), zoom: flags.zoom ? +flags.zoom : undefined, width: 1800 })));
    const k = +(flags.scale ?? 3);
    if (flags.gif && writeVideo(join(dir, "act.gif"), r, k)) made.push(join(dir, "act.gif"));
    if (flags.mp4 && writeVideo(join(dir, "act.mp4"), r, k)) made.push(join(dir, "act.mp4"));
    console.log(`${id}  ${r.n} frames  ->  ${made.join("  ")}`);
  }
  process.exit(0);
}
if (cmd === "overview") {
  // every piece side by side in one animated GIF (out/overview.gif), for showing the pack at a glance
  const rs = [];
  for (const id of ids) rs.push(renderFrames(await loadEffect(id, FX), {}));
  const gap = 8, H = Math.max(...rs.map((r) => r.h)) + gap * 2, W = rs.reduce((a, r) => a + r.w + gap, gap), N = +(flags.frames ?? 240), frames = [];
  for (let i = 0; i < N; i++) {
    const buf = new Uint8ClampedArray(W * H * 4);
    for (let j = 0; j < W * H; j++) buf.set([11, 6, 16, 255], j * 4);
    let x0 = gap;
    for (const r of rs) {
      const src = r.frames[i % r.n].color, y0 = Math.floor((H - r.h) / 2);
      for (let y = 0; y < r.h; y++) buf.set(src.subarray(y * r.w * 4, (y + 1) * r.w * 4), ((y0 + y) * W + x0) * 4);
      x0 += r.w + gap;
    }
    frames.push({ color: buf });
  }
  const file = join(OUT, "overview.gif");
  console.log(writeVideo(file, { w: W, h: H, fps: 30, n: N, frames }, +(flags.scale ?? 2), { loops: 1 }) ? `overview -> ${file}` : "ffmpeg not found: no GIF written");
  process.exit(0);
}
if (cmd === "render") {
  for (const id of ids) {
    try {
      const fx = await loadEffect(id, FX);
      const r = renderFrames(fx, { seed: flags.seed ? +flags.seed : undefined, options: flags.opts ? JSON.parse(flags.opts) : undefined });
      const dir = join(OUT, id), made = [];
      // --at 0.4,1.8,2.9 : a contact sheet of just those moments (seconds), for looking closely
      const pick = flags.at ? flags.at.split(",").map((s) => Math.min(r.n - 1, Math.round(+s * r.fps))) : null;
      const sheetR = pick ? { ...r, frames: pick.map((i) => r.frames[i]) } : r;
      made.push(save(join(dir, pick ? "close.png" : "contact.png"), contactSheet(fx, sheetR, { max: pick ? pick.length : flags.all ? 400 : +(flags.max ?? 12), zoom: flags.zoom ? +flags.zoom : undefined, width: pick ? 1800 : undefined })));
      const k = +(flags.scale ?? Math.max(2, Math.min(6, Math.floor(480 / Math.max(r.w, r.h)))));
      const loops = fx.meta.loop ? 2 : 1;
      if (flags.gif && writeVideo(join(dir, "anim.gif"), r, k, { loops })) made.push(join(dir, "anim.gif"));
      if (flags.mp4 && writeVideo(join(dir, "anim.mp4"), r, k, { loops: fx.meta.loop ? 3 : 1 })) made.push(join(dir, "anim.mp4"));
      if (flags.sheet) {
        const name = id.split("/")[1], s = spriteSheet(fx, r, name);
        made.push(save(join(dir, `${name}.png`), s.png), save(join(dir, `${name}.json`), JSON.stringify(s.json, null, 1)));
      }
      console.log(`${id}  ${r.n} frames  ->  ${made.join("  ")}`);
    } catch (e) {
      failed++;
      console.error(`${id}  FAILED: ${e.stack ?? e}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

// ---- check: the mistakes eyes miss (a subset of tools/check.mjs: no acts, since the lab has no characters)
const M = 16, count = (buf, test) => { let n = 0; for (let i = 0; i < buf.length; i++) if (test(buf[i], i)) n++; return n; };
for (const id of ids) {
  const errs = [], notes = [];
  try {
    const fx = await loadEffect(id, FX), { meta, mod } = fx, src = readFileSync(fx.file, "utf8");
    if (!meta.name) errs.push("meta.name missing");
    if (!meta.desc || meta.desc.length < 12) errs.push("meta.desc missing or too short");
    if (!meta.tags?.length) errs.push("meta.tags missing");
    if (/Math\.random|Date\.now|performance\.now/.test(src)) errs.push("uses Math.random / Date: use the seeded Rng so frames repeat");
    if (errs.length) throw new Error(errs.join("; "));

    const [W, H] = meta.size, frame = createFrame(W + M * 2, H + M * 2, -M, -M), fw = frame.w, fps = meta.fps;
    const inside = (i) => { const x = (i % fw) - M, y = Math.floor(i / fw) - M; return x >= 0 && y >= 0 && x < W && y < H; };
    const n = Math.max(2, Math.round(meta.duration * fps)), opts = { x: meta.origin[0], y: meta.origin[1], ...meta.options };
    const run = (o) => {
      const inst = createFx(mod, o), shots = [], ms = [];
      let spill = 0, spillLight = 0, maxPx = 0;
      for (let i = 0; i <= n; i++) {
        if (i) inst.update(1 / fps);
        clearFrame(frame);
        const t0 = performance.now();
        inst.draw(frame);
        ms.push(performance.now() - t0);
        shots.push(frame.color.slice());
        maxPx = Math.max(maxPx, count(frame.color, (c, j) => c >>> 24 && inside(j)));
        spill = Math.max(spill, count(frame.color, (c, j) => c >>> 24 && !inside(j)));
        spillLight = Math.max(spillLight, count(frame.light, (c, j) => (c & 255) + ((c >>> 8) & 255) + ((c >>> 16) & 255) > 90 && !inside(j)));
      }
      return { shots, ms, spill, spillLight, maxPx };
    };
    const a = run(opts), b = run(opts);
    if (a.maxPx === 0) errs.push("draws nothing");
    if (a.shots.some((s, i) => count(s, (c, j) => c !== b.shots[i][j]) > 0)) errs.push("not deterministic: two runs with the same seed differ");
    let spill = a.spill, spillLight = a.spillLight;
    for (const seed of [2, 3, 7]) { const r = run({ ...opts, seed }); spill = Math.max(spill, r.spill); spillLight = Math.max(spillLight, r.spillLight); }
    if (spill > 0) notes.push(`${spill} px drawn outside the ${W}x${H} canvas`);
    if (spillLight > 60) notes.push(`glow spills ${spillLight} px past the canvas`);
    if (!meta.loop) {
      const last = a.shots[a.shots.length - 1], left = count(last, (c, j) => c >>> 24 && inside(j));
      if (left > 0 && !meta.card) notes.push(`${left} px still drawn at t = duration: one-shots should end empty`);
    } else {
      // a loop's last step back to the first frame changes no more than a normal step does
      const sh = a.shots.slice(0, n), step = (x, y) => count(x, (c, j) => c !== y[j]);
      const diffs = sh.slice(0, -1).map((s, i) => step(s, sh[i + 1])).sort((x, y) => x - y);
      const typical = diffs[Math.floor(diffs.length * 0.9)] ?? 0, seam = step(sh[n - 1], sh[0]);
      if (seam > Math.max(typical * 2, 12)) notes.push(`loop seam: ${seam} px change from the last frame to the first (a normal step is ${typical})`);
    }
    // any palette works: a short one leaves no holes
    let holes = 0;
    const put = Painter.prototype.put;
    Painter.prototype.put = function (sx, sy, c, al) { if (typeof c !== "number" || c !== c) holes++; return put.call(this, sx, sy, c, al); };
    try {
      const short = resolveOptions(meta, { ...opts, palette: ["#141024", "#5a3c8c", "#c8a0f0", "#ffffff"], gilt: ["#201008", "#a87820", "#fff0a0"], moon: ["#101830", "#6f93bf", "#ffffff"] });
      const inst = createFx(mod, short);
      for (let i = 0; i <= 8; i++) { clearFrame(frame); inst.draw(frame); inst.update(meta.duration / 8 * 0.999); }
    } finally { Painter.prototype.put = put; }
    if (holes) errs.push(`${holes} pixels drawn with an undefined colour on a short palette: use fit(o.palette, n)`);
    const ms = [...a.ms].sort((x, y) => x - y), med = ms[ms.length >> 1];
    if (med > 4) notes.push(`slow: ${med.toFixed(1)} ms a frame (median)`);
    if (errs.length) throw new Error(errs.join("; "));
    console.log(`ok    ${id}  ${med.toFixed(2)} ms${notes.length ? "\n        " + notes.join("\n        ") : ""}`);
  } catch (e) {
    failed++;
    console.error(`FAIL  ${id}  ${e.message ?? e}`);
  }
}
process.exit(failed ? 1 : 0);
