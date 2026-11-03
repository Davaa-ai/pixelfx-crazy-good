// Dark Fantasy Love: the pack's effects and palettes, in the shared studio.

import { start } from "../../gallery/frame.js";

start({
  collection: "dark-fantasy",
  title: "dark fantasy love.",
  lede: "{n} bespoke gothic-romance pixel art effects, every one a small piece of code. Open any of them to scrub its frames, recolor it and export a sprite sheet.",
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
  load: async () => {
    const [{ effects, categories, GOTHIC_PAL }, { framing }] = await Promise.all([import("../fx/index.js"), import("./framing.js")]);
    return { effects, categories, framing, palettes: GOTHIC_PAL };
  },
});
