// Anime Sakuga: the pack's effects and palettes, in the shared studio.

import { start } from "../../gallery/frame.js";

start({
  collection: "sakuga",
  title: "anime sakuga.",
  lede: "{n} anime & Grand Line inspired pixel art effects, every one a small piece of code: inverted Haki lightning, elastic Mach pistons, spatial domes, dragon iai and buster beams. Open any tile to scrub frames, recolor and export sprite sheets.",
  palettesName: "SAKUGA_PAL",
  packPath: "./anime-sakuga/fx/index.js",
  suggestions: ["haki", "one-piece", "sword", "beam"],
  links: [
    { label: "Sheets", href: "../sheets/index.json" },
    { label: "Readme", href: "../README.md" },
  ],
  corePath: "./src/core/index.js",
  effectPath: (id) => `./anime-sakuga/fx/${id}.js`,
  sourceUrl: (id) => `../fx/${id}.js`,
  load: async () => {
    const [{ effects, categories, SAKUGA_PAL }, { framing }] = await Promise.all([import("../fx/index.js"), import("./framing.js")]);
    return { effects, categories, framing, palettes: SAKUGA_PAL };
  },
});
