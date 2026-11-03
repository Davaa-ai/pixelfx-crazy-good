#!/usr/bin/env node
// Standalone renderer for the Attachment Hearts pack: writes to attachment-hearts/records/
// Usage:
//   node attachment-hearts/tools/render.mjs
//   node attachment-hearts/tools/render.mjs magnetic/magnetic-heart --zoom 2

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allIds, resolveIds, loadEffect, renderFrames, contactSheet, spriteSheet, save } from "../../tools/lib/fxlib.mjs";

const PACK = join(dirname(fileURLToPath(import.meta.url)), "..");
const FX_DIR = join(PACK, "fx");

const args = process.argv.slice(2), flags = {}, pats = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!a.startsWith("--")) pats.push(a);
  else if (["sheet", "all", "no-actor"].includes(a.slice(2))) flags[a.slice(2)] = true;
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
