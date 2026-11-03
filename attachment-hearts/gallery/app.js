// Attachment Hearts: four hovering hearts side by side, each with a surge to set off, over the pack in the shared studio.

import { start } from "../../gallery/frame.js";

const SURGE_PAIRS = {
  magnetic: ["magnetic/magnetic-heart", "magnetic/magnetic-pull"],
  armored: ["armored/armored-heart", "armored/armor-clamp"],
  polar: ["polar/polar-heart", "polar/thermal-clash"],
  luminous: ["luminous/luminous-heart", "luminous/radiant-bloom"],
};

function lineup(mount, { Player, FX_BY_ID, open, onFrame, el }, categories, framing) {
  const relics = [];
  const row = el("div", { className: "lineup" });

  for (const c of categories) {
    const [loopId, surgeId] = SURGE_PAIRS[c.id];
    const loopFx = FX_BY_ID.get(loopId), surgeFx = FX_BY_ID.get(surgeId);
    const cv = el("canvas", { "aria-hidden": "true" });
    const stage = el("button", { className: "relic-stage", type: "button", "aria-label": `Inspect ${loopFx.name}` }, cv);
    const surge = el("button", { className: "tool label surge", type: "button", textContent: "Surge" });
    const relic = { player: null, surging: false };

    const settle = () => {
      relic.surging = false;
      surge.textContent = "Surge";
      surge.disabled = false;
      relic.player.setFx(loopFx, framing[loopId]);
      relic.player.setBg("none");
    };
    relic.player = new Player(cv, loopFx, { bg: "none", art: framing[loopId], onDone: settle });

    stage.addEventListener("click", () => open(relic.surging ? surgeId : loopId));
    surge.addEventListener("click", () => {
      relic.surging = true;
      surge.textContent = "Surging";
      surge.disabled = true;
      relic.player.setFx(surgeFx, framing[surgeId]);
      relic.player.setBg("none");
    });

    const card = el("article", { className: "relic" }, [
      stage,
      el("div", { className: "relic-foot" }, [
        el("div", {}, [
          el("p", { className: "relic-mn", textContent: c.mn }),
          el("h3", { textContent: loopFx.name }),
          el("p", { className: "relic-style", textContent: c.style }),
        ]),
        surge,
      ]),
    ]);
    card.style.setProperty("--relic", c.accent);
    row.append(card);
    relics.push({ relic, stage });
  }

  mount.append(row);

  const fit = () => {
    for (const { relic, stage } of relics) {
      const r = stage.getBoundingClientRect();
      if (!r.width) continue;
      const first = !relic.player.inst;
      relic.player.fit(r.width, r.height);
      if (first) relic.player.seekFrame(relic.player.peak);
    }
  };
  new ResizeObserver(fit).observe(row);
  fit();

  onFrame((dt, paused) => {
    for (const { relic } of relics) if (!paused || relic.surging) relic.player.tick(dt);
  });
}

start({
  collection: "hearts",
  title: "attachment hearts.",
  lede: "“Чамайг юу татдаг вэ? Чи юунаас зугтдаг вэ?” {n} faceted pixel art effects across the four attachment hearts: hovering relics, and the surge that wakes each one.",
  palettesName: "HEART_PAL",
  packPath: "./attachment-hearts/fx/index.js",
  suggestions: ["magnetic", "polar", "luminous", "surge"],
  links: [
    { label: "Sheets", href: "../sheets/index.json" },
    { label: "Readme", href: "../README.md" },
  ],
  corePath: "./src/core/index.js",
  effectPath: (id) => `./attachment-hearts/fx/${id}.js`,
  sourceUrl: (id) => `../fx/${id}.js`,
  load: async () => {
    const [{ effects, categories, HEART_PAL }, { framing }] = await Promise.all([import("../fx/index.js"), import("./framing.js")]);
    return {
      effects,
      categories: categories.map((c) => ({ ...c, kicker: `${c.mn} · ${c.style}` })),
      framing,
      palettes: HEART_PAL,
      hero: (mount, api) => lineup(mount, api, categories, framing),
    };
  },
});
