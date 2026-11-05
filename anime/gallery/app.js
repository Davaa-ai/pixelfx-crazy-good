// The anime lab, in the shared studio.

import { start } from "../../gallery/frame.js";

start({
  collection: "anime",
  title: "anime lab.",
  lede: "{n} anime-inspired pixel art effects, every one a small piece of code. Open any of them to scrub its frames, recolor it and export a sprite sheet.",
  suggestions: ["thunder", "domain", "titan", "petals", "gate"],
  links: [
    { label: "Catalog", href: "../CATALOG.md" },
    { label: "Readme", href: "../README.md" },
  ],
  corePath: "./src/core/index.js",
  effectPath: (id) => `./anime/fx/${id}.js`,
  sourceUrl: (id) => `../fx/${id}.js`,
  load: async () => {
    const [{ effects, categories }, { framing }] = await Promise.all([import("../fx/index.js"), import("./framing.js")]);
    return { effects, categories, framing };
  },
});
