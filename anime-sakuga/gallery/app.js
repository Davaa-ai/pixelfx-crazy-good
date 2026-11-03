// Anime Sakuga: the pack's effects and palettes, in the shared studio.

import { effects, categories, SAKUGA_PAL } from "../fx/index.js";
import { framing } from "./framing.js";
import { boot } from "../../gallery/studio.js";

boot({
  collection: "sakuga",
  title: "anime sakuga.",
  mark: `<svg viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true"><rect x="4" y="0" width="3" height="3" fill="#ff4a6e"/><rect x="2" y="2" width="5" height="3" fill="#ff4a6e"/><rect x="3" y="5" width="3" height="4" fill="#d81b44"/><rect x="5" y="1" width="1" height="2" fill="#060308"/><rect x="3" y="3" width="3" height="1" fill="#060308"/><rect x="4" y="5" width="1" height="3" fill="#060308"/><rect x="6" y="3" width="1" height="1" fill="#ffffff"/></svg>`,
  lede: "{n} anime & Grand Line inspired pixel art effects, every one a small piece of code: inverted Haki lightning, elastic Mach pistons, spatial domes, dragon iai and buster beams. Open any tile to scrub frames, recolor and export sprite sheets.",
  effects,
  categories,
  framing,
  palettes: SAKUGA_PAL,
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
});
