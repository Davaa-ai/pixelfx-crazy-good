// The core library's page: the 244 effects and how to reach them. Everything else lives in the shared studio.

import { start } from "./frame.js";

const REPO = "https://github.com/patch-gg/pixelfx";

start({
  collection: "core",
  title: "pixelfx.",
  lede: "{n} pixel art effects and animations, every one a small piece of code. Open any of them to scrub its frames, recolor it and export a sprite sheet.",
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
  load: async () => {
    const [{ effects, categories }, { framing }] = await Promise.all([import("../src/fx/index.js"), import("./framing.js")]);
    return { effects, categories, framing };
  },
});
