// The first paint. A collection's page runs this before anything heavy: the whole frame and the shape of its contact sheet
// appear at once, so a crossing between collections lands on a finished page, and the effects fill it in as they load.

import { COLLECTIONS } from "./collections.js";
import { MANIFEST } from "./manifest.js";
import { mountNav, paletteKey } from "./nav.js";
import { iconSvg } from "./icons.js";

const SHORTCUTS = [
  ["Everywhere", [[`${paletteKey}`, "Go to anything"], ["[ ]", "Previous or next collection"], ["?", "This list"]]],
  ["Browsing", [["/", "Search this collection"], ["← ↑ → ↓", "Move between effects"], ["Enter", "Open effect"], ["K", "Pause or play all motion"]]],
  ["Inspecting", [["Space", "Play or pause"], [", .", "Step one frame"], ["← →", "Previous or next effect"], ["R", "Replay"], ["M", "Mirror"], ["C", "Character"], ["O", "Origin"], ["G", "Pixel grid"], ["+ −", "Zoom"], ["L", "Copy link"], ["Esc", "Back to effects"]]],
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// the first sections, in their final layout, with the stage color the art will appear on
function skeleton(info) {
  return (info?.categories ?? []).slice(0, 2).map((c) => `
    <section class="sec" aria-hidden="true">
      <header class="sec-head"><h2>${c.name}.</h2>${c.blurb ? `<p>${c.blurb}</p>` : ""}<span class="sec-n">${c.count}</span></header>
      <ul class="contact">${[...c.cells].map((k) => `<li class="cell${k === "n" ? "" : " wide"}${k === "s" ? " screen" : ""}"><span class="tile"><span class="stage"></span><span class="cap"></span></span></li>`).join("")}</ul>
    </section>`).join("");
}

function navSkeleton(cfg, info) {
  const cats = info?.categories ?? [];
  const groups = cfg.groups ?? [{ label: null, ids: cats.map((c) => c.id) }];
  return groups.map((g) => {
    const mine = g.ids.map((id) => cats.find((c) => c.id === id)).filter(Boolean);
    if (!mine.length) return "";
    return `<div class="cat-group">${g.label ? `<h3>${g.label}</h3>` : ""}<ul>${mine.map((c) => `<li><a href="#${c.id}"><span>${cap(c.name)}</span><span class="n">${c.count}</span></a></li>`).join("")}</ul></div>`;
  }).join("");
}

function shell(cfg, info) {
  const [before, after] = cfg.lede.split("{n}");
  return `
<a class="skip" href="#sections">Skip to effects</a>
<div class="app">
  <div class="rail">
    <header class="top">
      <div class="brand" id="switch"></div>
      <div class="search">
        ${iconSvg("search")}
        <input id="q" type="search" placeholder="Search effects" aria-label="Search effects" autocomplete="off" spellcheck="false" enterkeyhint="search">
        <kbd id="q-kbd" aria-hidden="true">/</kbd>
        <button class="ghost q-clear" id="q-clear" type="button" aria-label="Clear search" hidden>${iconSvg("close")}</button>
      </div>
      <button class="ghost browse" id="browse" type="button" popovertarget="side" aria-label="Browse and filter">${iconSvg("browse")}<span class="dot" id="browse-dot" hidden></span></button>
    </header>
    <aside class="side" id="side" popover aria-label="Browse and filter">
      <div class="side-title">
        <h2>Browse</h2>
        <button class="ghost" type="button" popovertarget="side" popovertargetaction="hide" aria-label="Close">${iconSvg("close")}</button>
      </div>
      <div class="seg type" id="types" role="group" aria-label="Filter by kind">
        <button type="button" data-type="all" aria-pressed="true">All</button>
        <button type="button" data-type="loop" aria-pressed="false">Loops</button>
        <button type="button" data-type="oneshot" aria-pressed="false">One-shots</button>
        <button type="button" data-type="acted" aria-pressed="false" title="Performed by a character: wind-up, hit-stop, recovery">Acted</button>
      </div>
      <nav class="cats" id="cats" aria-label="Categories">${navSkeleton(cfg, info)}</nav>
      <div class="side-foot">
        ${COLLECTIONS.length > 1 ? `<button class="row-btn" type="button" data-palette>${iconSvg("search")}<span>Go to anything</span><kbd aria-hidden="true">${paletteKey}</kbd></button>` : ""}
        <button class="row-btn" id="motion" type="button" aria-pressed="false"><span id="motion-ico"></span><span id="motion-label">Pause motion</span><kbd aria-hidden="true">K</kbd></button>
        <label class="row-btn select-row"><span>Backdrop</span>
          <select id="g-bg">
            <option value="auto">Per effect</option>
            <option value="dark">Dark</option>
            <option value="ground">Ground</option>
            <option value="sky">Sky</option>
            <option value="light">Light</option>
            <option value="black">Black</option>
          </select>
        </label>
        <p class="links">${cfg.links.map((l) => `<a href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`).join("")}<button class="link-btn" id="keys-open" type="button">Shortcuts</button></p>
      </div>
    </aside>
  </div>
  <main class="main" id="main">
    <div class="status" id="status"><p class="lede">${before}<b>${info?.count ?? ""}</b>${after}</p></div>
    <div id="hero"></div>
    <div id="sections">${skeleton(info)}</div>
    <div class="empty" id="none" hidden></div>
    <div id="pager"></div>
  </main>
</div>

<dialog class="studio" id="studio" aria-labelledby="d-name" closedby="closerequest">
  <header class="s-top">
    <button class="ghost s-back" id="d-close" type="button" title="Back to effects (Esc)">${iconSvg("prev")}<span>All effects</span></button>
    <p class="s-crumb"><button class="link-btn" id="d-cat" type="button"></button><span aria-hidden="true">/</span><code id="d-id"></code></p>
    <div class="s-nav">
      <span class="s-pos" id="d-pos"></span>
      <button class="ghost" id="d-prev" type="button" title="Previous effect (←)" aria-label="Previous effect">${iconSvg("prev")}</button>
      <button class="ghost" id="d-next" type="button" title="Next effect (→)" aria-label="Next effect">${iconSvg("next")}</button>
      <button class="ghost s-link" id="d-link" type="button" title="Copy a link to exactly this setup (L)">${iconSvg("link")}<span>Copy link</span></button>
    </div>
  </header>

  <div class="s-work">
    <div class="s-stage" id="big-wrap">
      <canvas id="big" role="img"></canvas>
      <div class="pixel-grid" id="d-grid" hidden aria-hidden="true"></div>
      <div class="pivot" id="d-pivot-mark" hidden aria-hidden="true"></div>
      <span class="s-badge" id="d-freeze" hidden>Hit-stop</span>
    </div>

    <div class="s-transport">
      <button class="tool play" id="d-play" type="button" title="Play or pause (Space)" autofocus></button>
      <button class="tool" id="d-back" type="button" title="Back one frame (,)" aria-label="Back one frame">${iconSvg("stepBack")}</button>
      <button class="tool" id="d-fwd" type="button" title="Forward one frame (.)" aria-label="Forward one frame">${iconSvg("stepForward")}</button>
      <button class="tool" id="d-again" type="button" title="Replay (R)" aria-label="Replay from the start">${iconSvg("replay")}</button>
      <div class="timeline">
        <div class="phases" id="d-phases" aria-hidden="true"></div>
        <input class="scrub" id="d-scrub" type="range" min="0" max="30" value="0" step="1" aria-label="Frame">
        <div class="marks" id="d-marks" aria-hidden="true"></div>
      </div>
      <output class="readout" id="d-time" for="d-scrub"></output>
      <div class="seg speed" id="d-speed" role="group" aria-label="Playback speed"></div>
      <div class="zoom" id="d-zoom" role="group" aria-label="Zoom">
        <button class="tool" id="d-zoom-out" type="button" title="Zoom out (−)" aria-label="Zoom out">${iconSvg("minus")}</button>
        <output id="d-zoom-val"></output>
        <button class="tool" id="d-zoom-in" type="button" title="Zoom in (+)" aria-label="Zoom in">${iconSvg("plus")}</button>
      </div>
    </div>

    <div class="s-panel" id="d-panel">
      <div class="p-head">
        <h2 id="d-name"></h2>
        <p id="d-desc"></p>
        <dl class="facts" id="d-facts"></dl>
        <p class="tags" id="d-tags"></p>
      </div>

      <section class="p-sec" aria-labelledby="look-h">
        <h3 id="look-h">Look</h3>
        <fieldset class="bgs" id="d-bg"><legend>Backdrop</legend></fieldset>
        <fieldset class="pals" id="d-pal-set"><legend>Palette <b id="d-pal-name"></b></legend><div class="pal-grid" id="d-pal"></div></fieldset>
        <div class="toggles">
          <button class="toggle" id="d-flip" type="button" aria-pressed="false" title="Mirror (M)">${iconSvg("mirror")}Mirror</button>
          <button class="toggle" id="d-actor" type="button" aria-pressed="true" title="Character (C)">${iconSvg("person")}Character</button>
          <button class="toggle" id="d-pivot" type="button" aria-pressed="false" title="Origin (O)">${iconSvg("origin")}Origin</button>
          <button class="toggle" id="d-gridb" type="button" aria-pressed="false" title="Pixel grid (G)">${iconSvg("grid")}Grid</button>
          <button class="toggle" id="d-seed" type="button" title="New random seed">${iconSvg("dice")}<span id="d-seed-val">Seed</span></button>
        </div>
      </section>

      <section class="p-sec" aria-labelledby="use-h">
        <h3 id="use-h">Use it</h3>
        <div class="tabs" role="tablist" aria-label="Ways to use this effect">
          <button id="tab-code" type="button" role="tab" aria-selected="true" aria-controls="pane-code">Code</button>
          <button id="tab-sheet" type="button" role="tab" aria-selected="false" aria-controls="pane-sheet" tabindex="-1">Sprite sheet</button>
          <span class="tabs-end">
            <a class="link-btn" id="d-src" target="_blank" rel="noopener">Source</a>
            <button class="tool label" id="d-copy" type="button">${iconSvg("copy")}<span>Copy</span></button>
          </span>
        </div>
        <div class="pane" id="pane-code" role="tabpanel" aria-labelledby="tab-code" tabindex="0"><pre id="d-code"></pre></div>
        <div class="pane" id="pane-sheet" role="tabpanel" aria-labelledby="tab-sheet" hidden>
          <div class="sheet-prev" id="d-sheet"></div>
          <p class="sheet-note" id="d-sheet-note"></p>
          <div class="sheet-acts">
            <button class="tool label primary" id="d-dl-png" type="button">${iconSvg("download")}<span>PNG</span></button>
            <button class="tool label" id="d-dl-json" type="button">${iconSvg("download")}<span>JSON atlas</span></button>
          </div>
        </div>
      </section>
    </div>
  </div>
  <div class="sr-only" id="d-live" aria-live="polite"></div>
</dialog>

<dialog class="keys" id="keys" aria-labelledby="keys-h" closedby="any">
  <header><h2 id="keys-h">Keyboard shortcuts</h2><button class="ghost" id="keys-close" type="button" aria-label="Close">${iconSvg("close")}</button></header>
  <div class="keys-cols">${SHORTCUTS.map(([h, rows]) => `<section><h3>${h}</h3><dl>${rows.map(([k, v]) => `<dt><kbd>${k}</kbd></dt><dd>${v}</dd>`).join("")}</dl></section>`).join("")}</div>
</dialog>`;
}

// cfg.load brings in the heavy part: the effects and whatever else depends on them.
export function start(cfg) {
  const info = MANIFEST[cfg.collection];
  document.querySelector("#app").innerHTML = shell(cfg, info);
  mountNav({ collection: cfg.collection, host: document.querySelector("#switch"), pager: document.querySelector("#pager"), title: cfg.title, manifest: MANIFEST });

  Promise.all([import("./studio.js"), cfg.load()])
    .then(([{ boot }, loaded]) => boot({ ...cfg, ...loaded }))
    .catch((err) => {
      console.error(err);
      document.querySelector("#sections").innerHTML = `<div class="empty"><h2>These effects didn't load.</h2><p>Check your connection and reload the page.</p></div>`;
    });
}
