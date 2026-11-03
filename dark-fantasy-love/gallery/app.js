// Dark Fantasy Love: the pack's effects and palettes, in the shared studio.

import { effects, categories, GOTHIC_PAL } from "../fx/index.js";
import { framing } from "./framing.js";
import { boot } from "../../gallery/studio.js";

boot({
  collection: "dark-fantasy",
  title: "dark fantasy love.",
  mark: `<svg viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="3" height="2" fill="#c4264e"/><rect x="5" y="1" width="3" height="2" fill="#c4264e"/><rect y="2" width="9" height="3" fill="#c4264e"/><rect x="1" y="5" width="7" height="1" fill="#8a1638"/><rect x="2" y="6" width="5" height="1" fill="#8a1638"/><rect x="3" y="7" width="3" height="1" fill="#540d24"/><rect x="4" y="8" width="1" height="1" fill="#ffd06b"/><rect x="4" y="2" width="1" height="6" fill="#ffd06b"/><rect x="1" y="2" width="2" height="1" fill="#ffa8ba"/></svg>`,
  lede: "{n} bespoke gothic-romance pixel art effects, every one a small piece of code. Open any of them to scrub its frames, recolor it and export a sprite sheet.",
  effects,
  categories,
  framing,
  palettes: GOTHIC_PAL,
  palettesName: "GOTHIC_PAL",
  packPath: "./dark-fantasy-love/fx/index.js",
  suggestions: ["heart", "rose", "chalice", "ghost"],
  links: [
    { label: "Sheets", href: "../sheets/index.json" },
    { label: "Readme", href: "../README.md" },
  ],
  corePath: "./src/core/index.js",
  effectPath: (id) => `./dark-fantasy-love/fx/${id}.js`,
  sourceUrl: (id) => `../fx/${id}.js`,
});
