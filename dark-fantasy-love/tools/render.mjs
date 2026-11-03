#!/usr/bin/env node
// Standalone renderer for the Dark Fantasy Love pack: writes to dark-fantasy-love/records/
// Usage:
//   node dark-fantasy-love/tools/render.mjs vows/crimson-thread
//   node dark-fantasy-love/tools/render.mjs vows --sheet
//   node dark-fantasy-love/tools/render.mjs vows/crimson-thread --act

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allIds, resolveIds, loadEffect, renderFrames, renderAct, contactSheet, spriteSheet, canvas, upscale, save } from "../../tools/lib/fxlib.mjs";

const PACK = join(dirname(fileURLToPath(import.meta.url)), "..");
const FX_DIR = join(PACK, "fx");

const args = process.argv.slice(2), flags = {}, pats = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!a.startsWith("--")) pats.push(a);
  else if (["sheet", "all", "no-actor", "act"].includes(a.slice(2))) flags[a.slice(2)] = true;
  else flags[a.slice(2)] = args[++i];
}

const ids = pats.length ? resolveIds(pats, FX_DIR) : allIds(FX_DIR);
const out = flags.out ?? join(PACK, "records");
let failed = 0;

for (const id of ids) {
  try {
    const fx = await loadEffect(id, FX_DIR);
    const dir = join(out, id), made = [];
    const r = renderFrames(fx, {
      fps: flags.fps ? +flags.fps : undefined,
      seed: flags.seed ? +flags.seed : undefined,
      bg: flags.bg,
      actor: flags["no-actor"] ? false : undefined,
      options: flags.opts ? JSON.parse(flags.opts) : undefined,
    });
    made.push(save(join(dir, "contact.png"), contactSheet(fx, r, { max: flags.all ? 400 : +(flags.max ?? 16), zoom: flags.zoom ? +flags.zoom : undefined })));
    if (flags.act && fx.mod.act) {
      const ar = renderAct(fx, { fps: 60, bg: flags.bg });
      const from = ar.frames[0].t, to = ar.frames[ar.frames.length - 1].t, step = 1 / 12, list = [];
      for (const f of ar.frames) {
        if (f.t < from - 1e-6 || f.t > to + 1e-6) continue;
        if (f.t + 1e-6 >= from + list.length * step) list.push(f);
      }
      const k = +(flags.zoom ?? 2), cols = 6, rows = Math.ceil(list.length / cols);
      const img = canvas(cols * (ar.w * k + 4), rows * (ar.h * k + 18));
      list.forEach((f, j) => {
        const x = (j % cols) * (ar.w * k + 4), y = Math.floor(j / cols) * (ar.h * k + 18);
        img.text(f.t.toFixed(2), x + 2, y + 3, 2);
        img.paste(upscale(f.color, ar.w, ar.h, k), ar.w * k, ar.h * k, x, y + 16);
      });
      made.push(save(join(dir, "act.png"), img.png()));
    }
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
