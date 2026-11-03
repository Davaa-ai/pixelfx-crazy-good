// The anime lab, in the shared studio.

import { effects, categories } from "../fx/index.js";
import { framing } from "./framing.js";
import { boot } from "../../gallery/studio.js";

boot({
  collection: "anime",
  title: "anime lab.",
  mark: `<svg viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" width="1" height="7" fill="#ff6a3d"/><rect y="3" width="7" height="1" fill="#ff6a3d"/><rect x="1" y="1" width="5" height="5" fill="#ff6a3d"/><rect x="2" y="2" width="3" height="3" fill="#fff"/></svg>`,
  lede: "{n} anime-inspired pixel art effects, every one a small piece of code. Open any of them to scrub its frames, recolor it and export a sprite sheet.",
  effects,
  categories,
  framing,
  suggestions: ["thunder", "water", "domain", "titan"],
  links: [
    { label: "Catalog", href: "../CATALOG.md" },
    { label: "Readme", href: "../README.md" },
  ],
  corePath: "./src/core/index.js",
  effectPath: (id) => `./anime/fx/${id}.js`,
  sourceUrl: (id) => `../fx/${id}.js`,
});
