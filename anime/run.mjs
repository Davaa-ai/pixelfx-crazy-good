#!/usr/bin/env node
// Run any pixelfx tool against the anime effects in anime/fx instead of src/fx, so nothing in the main library is
// touched. Everything the tool accepts still works.
//
//   node anime/run.mjs render demon-slayer/thunder-flash --gif
//   node anime/run.mjs act jujutsu-kaisen/black-flash --mp4
//   node anime/run.mjs check            every anime effect
//   node anime/run.mjs list frost       search them
//   node anime/run.mjs sheets           sprite sheets for all of them -> sheets/<series>/<name>.png

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
process.env.PIXELFX_FX_DIR = join(HERE, "fx");

const [tool, ...rest] = process.argv.slice(2);
const file = tool && join(HERE, "..", "tools", `${tool}.mjs`);
if (!tool || !["render", "act", "check", "list", "sheets"].includes(tool) || !existsSync(file)) {
  console.error("usage: node anime/run.mjs <render|act|check|list|sheets> [args...]   (see anime/README.md)");
  process.exit(1);
}
process.argv = [process.argv[0], file, ...rest];
await import(pathToFileURL(file).href);
