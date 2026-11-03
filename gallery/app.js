// The core library's page: the 244 effects and how to reach them. Everything else lives in the shared studio.

import { effects, categories } from "../src/fx/index.js";
import { framing } from "./framing.js";
import { boot } from "./studio.js";

const REPO = "https://github.com/patch-gg/pixelfx";

boot({
  collection: "core",
  title: "pixelfx.",
  mark: `<svg viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="6" height="6" fill="#fff"/><rect width="3" height="3" fill="#f53cd1"/></svg>`,
  lede: "{n} pixel art effects and animations, every one a small piece of code. Open any of them to scrub its frames, recolor it and export a sprite sheet.",
  effects,
  categories,
  framing,
  groups: [
    { label: "Combat", ids: ["moves", "melee", "impacts", "projectiles", "explosions"] },
    { label: "Elements", ids: ["fire", "water", "ice", "lightning", "nature", "weather"] },
    { label: "Magic", ids: ["arcane", "holy", "shadow", "spawn", "status"] },
    { label: "Game & world", ids: ["scifi", "ui", "pickups", "transitions", "critters"] },
  ],
  suggestions: ["fire", "slash", "portal", "lightning"],
  links: [
    { label: "GitHub", href: REPO },
    { label: "Claude skill", href: `${REPO}#the-skill` },
    { label: "patch.gg", href: "https://patch.gg" },
  ],
  repo: REPO,
  corePath: "pixelfx",
  effectPath: (id) => `pixelfx/fx/${id}`,
  sourceUrl: (id) => `${REPO}/blob/main/src/fx/${id}.js`,
});
