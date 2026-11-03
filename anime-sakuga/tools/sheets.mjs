#!/usr/bin/env node
// Export transparent PNG sprite sheets + Aseprite-style JSON atlases + index.json
// strictly into anime-sakuga/sheets/.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allIds, resolveIds, loadEffect, renderFrames, spriteSheet, save } from "../../tools/lib/fxlib.mjs";
import { actTiming } from "../../src/core/index.js";

const PACK = join(dirname(fileURLToPath(import.meta.url)), "..");
const FX_DIR = join(PACK, "fx");
const out = join(PACK, "sheets");

const ids = process.argv.length > 2 ? resolveIds(process.argv.slice(2), FX_DIR) : allIds(FX_DIR);
const index = [];

for (const id of ids) {
  const fx = await loadEffect(id, FX_DIR), r = renderFrames(fx, { bg: "none" }), name = id.split("/")[1];
  const s = spriteSheet(fx, r, name);
  save(join(out, id + ".png"), s.png);
  save(join(out, id + ".json"), JSON.stringify(s.json, null, 1));
  const m = fx.meta;
  index.push({
    id,
    name: m.name,
    desc: m.desc,
    tags: m.tags,
    loop: m.loop,
    fps: r.fps,
    frames: r.n,
    frameSize: m.size,
    pivot: m.origin,
    columns: s.json.meta.pixelfx.columns,
    image: `${id}.png`,
    json: `${id}.json`,
    ...(fx.mod.act ? { act: actTiming(fx.mod) } : {}),
  });
  process.stdout.write(".");
}
if (process.argv.length <= 2) writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 2));
console.log(`\n${ids.length} sheets -> anime-sakuga/sheets/`);
