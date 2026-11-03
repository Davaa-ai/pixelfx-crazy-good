// The studio: one shell for every collection. A contact sheet of live effects with search, a sidebar that tracks where
// you are, and an inspector for scrubbing, recoloring and exporting. A collection passes its effects to boot().

import { createFrame, clearFrame, createFx, actTiming, composite, PAL, BACKDROPS, toHex } from "../src/core/index.js";
import { Player, isScreen } from "./player.js";
import { icon, iconSvg } from "./icons.js";
import { mountCollections } from "./collections.js";

const $ = (s, root = document) => root.querySelector(s);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrow = matchMedia("(max-width: 1023px)");

function el(tag, props = {}, kids = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("aria-") || k.startsWith("data-")) e.setAttribute(k, v);
    else e[k] = v;
  }
  for (const k of [].concat(kids)) if (k != null && k !== false) e.append(k);
  return e;
}

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    // private windows and blocked storage just don't remember
  }
  return null;
}

const SHORTCUTS = [
  ["Browsing", [["/", "Search"], ["← ↑ → ↓", "Move between effects"], ["Enter", "Open effect"], ["K", "Pause or play all motion"], ["?", "This list"]]],
  ["Inspecting", [["Space", "Play or pause"], [", .", "Step one frame"], ["← →", "Previous or next effect"], ["R", "Replay"], ["M", "Mirror"], ["C", "Character"], ["O", "Origin"], ["G", "Pixel grid"], ["+ −", "Zoom"], ["L", "Copy link"], ["Esc", "Back to effects"]]],
];

function shell(cfg) {
  return `
<a class="skip" href="#sections">Skip to effects</a>
<div class="app">
  <div class="rail">
    <header class="top">
      <a class="brand" href="./" aria-label="${cfg.title}, back to top">${cfg.mark}<span>${cfg.title}</span></a>
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
      <nav class="cats" id="cats" aria-label="Categories"></nav>
      <div class="side-foot">
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
        <details class="colls" id="colls" hidden>
          <summary>${iconSvg("chevron")}<span>Other collections</span></summary>
          <nav id="coll-nav" aria-label="Collections"></nav>
        </details>
        <p class="links">${cfg.links.map((l) => `<a href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`).join("")}<button class="link-btn" id="keys-open" type="button">Shortcuts</button></p>
      </div>
    </aside>
  </div>
  <main class="main" id="main">
    <div class="status" id="status"></div>
    <div id="hero"></div>
    <div id="sections"></div>
    <div class="empty" id="none" hidden></div>
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

// Optimal string alignment distance, capped: enough to forgive a typo without matching everything.
function typoDistance(a, b, cap = 2) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev2 = null, prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
      row.push(d);
      if (d < best) best = d;
    }
    if (best > cap) return cap + 1;
    prev2 = prev;
    prev = row;
  }
  return prev[b.length];
}

export function boot(cfg) {
  const palettes = { ...cfg.palettes, ...PAL };
  const framing = cfg.framing ?? {};
  const catMap = Object.fromEntries(cfg.categories.map((c) => [c.id, c]));

  const FX = Object.entries(cfg.effects).map(([id, mod]) => {
    const meta = { fps: 30, bg: "dark", loop: false, duration: 1, tags: [], options: {}, ...mod.meta };
    const cat = id.split("/")[0];
    const name = meta.name.toLowerCase();
    const tags = meta.tags.map((t) => t.toLowerCase());
    const words = new Set([...name.split(/[^a-z0-9]+/), ...tags, cat].filter(Boolean));
    return { id, cat, name: meta.name, lname: name, tags, words: [...words], desc: meta.desc.toLowerCase(), catName: (catMap[cat]?.name ?? "").toLowerCase(), mod: { ...mod, meta }, meta };
  });
  const FX_BY_ID = new Map(FX.map((f) => [f.id, f]));

  document.body.querySelector("#app").innerHTML = shell(cfg);
  document.title = cfg.pageTitle ?? document.title;

  const dlg = $("#studio"), wrap = $("#big-wrap"), big = $("#big");
  const state = { q: "", type: "all", cat: null, gridBg: "auto", paused: store("pixelfx.paused") === "1" || (store("pixelfx.paused") === null && reduced) };
  const tiles = [], sections = [], navLinks = new Map(), tileOf = new Map(), tileByLink = new WeakMap();
  const frameHooks = [];

  // ---- search: best match first, and a typo still finds it
  function termScore(fx, term) {
    if (fx.lname === term) return 100;
    const names = fx.lname.split(/[^a-z0-9]+/);
    if (names[0] === term) return 90;
    if (names[0].startsWith(term)) return 80;
    if (names.includes(term)) return 75;
    if (names.some((w) => w.startsWith(term))) return 65;
    if (fx.tags.includes(term) || fx.cat === term || fx.catName === term) return 55;
    if (fx.tags.some((t) => t.startsWith(term)) || fx.catName.startsWith(term)) return 40;
    if (fx.lname.includes(term) || fx.id.includes(term)) return 30;
    if ((term === "loop" || term === "loops") && fx.meta.loop) return 28;
    if ((term === "acted" || term === "act") && fx.mod.act) return 28;
    // a typo in a name or tag says more about what you meant than the same letters somewhere in a description
    if (term.length >= 4) {
      const allowed = term.length >= 7 ? 2 : 1;
      if (fx.words.some((w) => typoDistance(term, w, allowed) <= allowed)) return 22;
    }
    return fx.desc.includes(term) ? 14 : 0;
  }

  function score(fx, terms) {
    let total = 0;
    for (const t of terms) {
      const s = termScore(fx, t);
      if (!s) return 0;
      total += s;
    }
    return total;
  }

  function matchesType(fx, type) {
    if (type === "acted") return !!fx.mod.act;
    if (type === "loop") return !!fx.meta.loop;
    if (type === "oneshot") return !fx.meta.loop;
    return true;
  }

  function markName(node, name, terms) {
    if (!terms.length) {
      node.textContent = name;
      return;
    }
    const lower = name.toLowerCase();
    let hit = -1, len = 0;
    for (const t of terms) {
      const i = lower.indexOf(t);
      if (i >= 0 && t.length > len) {
        hit = i;
        len = t.length;
      }
    }
    if (hit < 0) node.textContent = name;
    else node.replaceChildren(name.slice(0, hit), el("mark", { textContent: name.slice(hit, hit + len) }), name.slice(hit + len));
  }

  // ---- the contact sheet
  function makeTile(fx) {
    const cv = el("canvas", { "aria-hidden": "true" });
    const stage = el("span", { className: "stage" }, cv);
    const label = el("b", { textContent: fx.name });
    const where = el("span", { className: "tile-cat", textContent: cap(catMap[fx.cat]?.name ?? fx.cat), hidden: true });
    const meta = el("span", { className: "tile-meta" }, [
      fx.mod.act ? icon("person") : null,
      el("span", { textContent: fx.meta.loop ? "loop" : `${+fx.meta.duration.toFixed(2)}s` }),
    ]);
    const a = el("a", {
      className: "tile", href: `#${fx.id}`, tabIndex: -1,
      "aria-label": `${fx.name}, ${fx.mod.act ? "performed by a character, " : ""}${fx.meta.loop ? "loop" : `${+fx.meta.duration.toFixed(2)} second one-shot`}`,
    }, [stage, el("span", { className: "cap" }, [el("span", { className: "tile-name" }, [label, where]), meta])]);
    const [fw, fh] = fx.meta.size;
    const cls = isScreen(fx) ? "cell wide screen" : fx.mod.act || fw > 200 || fh > 170 ? "cell wide" : "cell";
    const cell = el("li", { className: cls }, a);
    const t = { fx, cell, a, cv, stage, label, where, player: null, visible: false, hover: false, focus: false, last: 0, home: null };
    tileOf.set(fx, t);
    tileByLink.set(a, t);

    a.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      openStudio(fx, { from: t });
    });
    a.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "touch") return;
      t.hover = true;
      t.last = performance.now();
      if (t.player && !fx.meta.loop) t.player.restart();
    });
    a.addEventListener("pointerleave", () => {
      t.hover = false;
    });
    a.addEventListener("focus", () => {
      t.focus = true;
      t.last = performance.now();
      setRoving(t);
    });
    a.addEventListener("blur", () => {
      t.focus = false;
    });
    return t;
  }

  function buildSections() {
    const host = $("#sections");
    for (const c of cfg.categories) {
      const list = FX.filter((f) => f.cat === c.id);
      if (!list.length) continue;
      const grid = el("ul", { className: "contact" });
      const count = el("span", { className: "sec-n", textContent: String(list.length) });
      const sec = el("section", { className: "sec", id: c.id, tabIndex: -1, "aria-labelledby": `h-${c.id}` }, [
        el("header", { className: "sec-head" }, [
          el("h2", { id: `h-${c.id}`, textContent: `${c.name}.` }),
          c.kicker ? el("span", { className: "sec-kick", textContent: c.kicker }) : null,
          el("p", { textContent: c.blurb }),
          count,
        ]),
        grid,
      ]);
      const secTiles = list.map(makeTile);
      secTiles.forEach((t) => {
        t.home = grid;
        grid.append(t.cell);
        tiles.push(t);
      });
      host.append(sec);
      sections.push({ c, sec, grid, list, count, tiles: secTiles });
    }

    const results = el("ul", { className: "contact" });
    const resultsSec = el("section", { className: "sec", id: "results", hidden: true, "aria-label": "Search results" }, results);
    host.prepend(resultsSec);
    sections.results = { sec: resultsSec, grid: results };
    tiles[0] && setRoving(tiles[0]);
  }

  // Waking is sliced across frames: fast-forwarding every visible tile to its best frame in one go would stall the page.
  const wakeQueue = [];
  function wakeSome(budget = 8) {
    const start = performance.now();
    while (wakeQueue.length && performance.now() - start < budget) {
      const t = wakeQueue.shift();
      if (!t.visible || t.player || t.cell.hidden) continue;
      const r = t.stage.getBoundingClientRect();
      if (!r.width) continue;
      t.player = new Player(t.cv, t.fx, { bg: state.gridBg, art: framing[t.fx.id] ?? null, soft: true });
      t.player.fit(r.width, r.height);
      t.player.seekFrame(t.player.peak);
      t.last = performance.now();
      t.stage.classList.add("live");
    }
  }

  function watchTiles() {
    const seen = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const t = tileByLink.get(e.target);
        if (!t) continue;
        t.visible = e.isIntersecting;
        if (t.visible) {
          t.last = performance.now();
          if (!t.player) wakeQueue.push(t);
        }
      }
    }, { rootMargin: "240px 0px" });
    tiles.forEach((t) => seen.observe(t.a));

    let resizeTimer = 0;
    const sized = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        for (const t of tiles) {
          if (!t.player || !t.visible) continue;
          const r = t.stage.getBoundingClientRect();
          if (r.width) t.player.fit(r.width, r.height);
        }
      }, 120);
    });
    sized.observe($("#sections"));
  }

  // ---- sidebar
  function buildNav() {
    const nav = $("#cats");
    const groups = cfg.groups ?? [{ label: null, ids: sections.map((s) => s.c.id) }];
    const grouped = new Set(groups.flatMap((g) => g.ids));
    const extra = sections.map((s) => s.c.id).filter((id) => !grouped.has(id));
    for (const g of extra.length ? [...groups, { label: "More", ids: extra }] : groups) {
      const secs = g.ids.map((id) => sections.find((s) => s.c.id === id)).filter(Boolean);
      if (!secs.length) continue;
      const ul = el("ul");
      for (const s of secs) {
        const n = el("span", { className: "n", textContent: String(s.list.length) });
        const a = el("a", { href: `#${s.c.id}` }, [el("span", { textContent: cap(s.c.name) }), n]);
        a.addEventListener("click", (e) => {
          if (a.getAttribute("aria-disabled") === "true") {
            e.preventDefault();
            return;
          }
          if (state.q.trim()) {
            e.preventDefault();
            state.cat = state.cat === s.c.id ? null : s.c.id;
            applyFilters();
            scrollTo(0, 0);
          }
          if ($("#side").matches(":popover-open")) $("#side").hidePopover();
        });
        navLinks.set(s.c.id, { a, n });
        ul.append(el("li", {}, a));
      }
      nav.append(el("div", { className: "cat-group" }, [g.label ? el("h3", { textContent: g.label }) : null, ul]));
    }
  }

  // sidebar follows the page: the section under the top of the viewport is the one you're in
  function watchPosition() {
    const inBand = new Set();
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) inBand.add(e.target.id);
        else inBand.delete(e.target.id);
      }
      if (state.q.trim()) return;
      const current = sections.find((s) => inBand.has(s.c.id) && !s.sec.hidden);
      if (current) markCurrent(current.c.id);
    }, { rootMargin: "-56px 0px -85% 0px" });
    sections.forEach((s) => spy.observe(s.sec));
  }

  function markCurrent(id) {
    for (const [cid, { a }] of navLinks) {
      if (cid === id) {
        a.setAttribute("aria-current", "true");
        const box = $("#cats").closest(".side"), ar = a.getBoundingClientRect(), br = box.getBoundingClientRect();
        if (box.scrollHeight > box.clientHeight && (ar.top < br.top + 8 || ar.bottom > br.bottom - 8)) {
          box.scrollTop += ar.top - br.top - br.height / 2;
        }
      } else a.removeAttribute("aria-current");
    }
  }

  // ---- filtering
  function clearSearch() {
    state.q = "";
    state.cat = null;
    $("#q").value = "";
    syncSearchUi();
  }

  function syncSearchUi() {
    const has = $("#q").value.length > 0;
    $("#q-clear").hidden = !has;
    $("#q-kbd").hidden = has;
  }

  function setType(type) {
    state.type = type;
    document.querySelectorAll("#types [data-type]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === type)));
    applyFilters();
  }

  function resetAll() {
    clearSearch();
    setType("all");
    $("#q").focus();
  }

  let wasSearching = false;
  function applyFilters() {
    const terms = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const searching = terms.length > 0;
    if (!searching) state.cat = null;
    const hits = [];
    const pool = new Map();
    let poolAll = 0;

    for (const t of tiles) {
      const s = searching ? score(t.fx, terms) : 1;
      const ok = s > 0 && matchesType(t.fx, state.type);
      if (ok) {
        pool.set(t.fx.cat, (pool.get(t.fx.cat) ?? 0) + 1);
        poolAll++;
      }
      const show = ok && (!state.cat || state.cat === t.fx.cat);
      t.cell.hidden = !show;
      if (show) hits.push({ t, s });
      markName(t.label, t.fx.name, terms);
      t.where.hidden = !searching;
    }

    const { sec: resultsSec, grid: resultsGrid } = sections.results;
    if (searching) {
      hits.sort((a, b) => b.s - a.s);
      resultsGrid.replaceChildren(...hits.map((h) => h.t.cell));
    } else if (wasSearching) {
      for (const t of tiles) t.home.append(t.cell);
    }
    wasSearching = searching;
    resultsSec.hidden = !searching || !hits.length;

    for (const s of sections) {
      const shown = s.tiles.filter((t) => !t.cell.hidden).length;
      s.sec.hidden = searching || shown === 0;
      s.count.textContent = shown === s.list.length ? String(s.list.length) : `${shown} of ${s.list.length}`;
    }
    for (const s of sections) {
      const link = navLinks.get(s.c.id);
      if (!link) continue;
      const n = pool.get(s.c.id) ?? 0;
      link.n.textContent = String(n);
      link.a.setAttribute("aria-disabled", String(n === 0));
      if (searching) {
        if (state.cat === s.c.id) link.a.setAttribute("aria-current", "true");
        else link.a.removeAttribute("aria-current");
      }
    }

    renderStatus(hits.length, terms);
    renderEmpty(hits.length, terms);
    const dot = $("#browse-dot");
    dot.hidden = state.type === "all" && !state.cat;
    const first = hits.length ? (searching ? hits[0].t : tiles.find((t) => !t.cell.hidden)) : null;
    if (first) setRoving(first);
    syncQuery();
    for (const t of hits) if (t.t.visible && !t.t.player) wakeQueue.push(t.t);
  }

  function renderStatus(shown, terms) {
    const box = $("#status");
    const filtered = terms.length > 0 || state.type !== "all";
    if (!filtered) {
      const [before, after] = cfg.lede.split("{n}");
      box.replaceChildren(el("p", { className: "lede" }, [before, el("b", { textContent: String(FX.length) }), after]));
      return;
    }
    const typeNames = { loop: "Loops", oneshot: "One-shots", acted: "Acted" };
    const chip = (label, clear) => {
      const b = el("button", { className: "chip", type: "button", "aria-label": `Remove filter ${label}` }, [el("span", { textContent: label }), icon("close")]);
      b.addEventListener("click", clear);
      return b;
    };
    box.replaceChildren(
      el("p", { className: "filter-line" }, [
        el("span", { className: "shown", role: "status" }, [el("b", { textContent: String(shown) }), ` of ${FX.length}`]),
        terms.length ? chip(`“${state.q.trim()}”`, () => {
          clearSearch();
          applyFilters();
          $("#q").focus();
        }) : null,
        state.cat ? chip(cap(catMap[state.cat]?.name ?? state.cat), () => {
          state.cat = null;
          applyFilters();
        }) : null,
        state.type !== "all" ? chip(typeNames[state.type], () => setType("all")) : null,
      ]),
    );
  }

  function renderEmpty(shown, terms) {
    const box = $("#none");
    box.hidden = shown > 0;
    if (shown > 0) return;
    const reset = el("button", { className: "tool label", type: "button", textContent: "Clear filters" });
    reset.addEventListener("click", resetAll);
    const tryWord = (w) => {
      const b = el("button", { className: "link-btn", type: "button", textContent: w });
      b.addEventListener("click", () => {
        $("#q").value = w;
        state.q = w;
        syncSearchUi();
        setType("all");
      });
      return b;
    };
    const asked = state.q.trim();
    const typeOnly = !asked;
    const withoutType = asked && state.type !== "all" && FX.some((f) => score(f, terms) > 0);
    box.replaceChildren(
      el("h2", { textContent: typeOnly ? "Nothing fits those filters." : `Nothing for “${asked}”.` }),
      withoutType
        ? el("p", { textContent: "It exists, just not with this filter on." })
        : el("p", {}, ["Try ", ...cfg.suggestions.flatMap((w, i) => [i ? ", " : "", tryWord(w)]), "."]),
      reset,
    );
  }

  let queryTimer = 0;
  function syncQuery() {
    clearTimeout(queryTimer);
    queryTimer = setTimeout(() => {
      const u = new URL(location.href);
      const set = (k, v) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
      set("q", state.q.trim());
      set("type", state.type === "all" ? "" : state.type);
      set("bg", state.gridBg === "auto" ? "" : state.gridBg);
      if (u.href !== location.href) history.replaceState(history.state, "", u);
    }, 250);
  }

  // ---- moving around the sheet with the arrow keys; one tab stop for the whole grid
  let roving = null;
  function setRoving(t) {
    if (roving === t) return;
    if (roving) roving.a.tabIndex = -1;
    roving = t;
    t.a.tabIndex = 0;
  }

  function moveFocus(from, key) {
    const list = tiles.filter((t) => !t.cell.hidden && t.a.getClientRects().length);
    if (!list.length) return;
    const rects = list.map((t) => ({ t, r: t.a.getBoundingClientRect() }));
    const me = from.a.getBoundingClientRect();
    const cx = me.left + me.width / 2, cy = me.top + me.height / 2;
    let best = null, bestD = Infinity;
    if (key === "Home" || key === "End") {
      best = (key === "Home" ? list[0] : list[list.length - 1]);
    } else {
      for (const { t, r } of rects) {
        if (t === from) continue;
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        let d;
        if (key === "ArrowRight" && r.left >= me.right - 2 && r.top < me.bottom && r.bottom > me.top) d = r.left - me.right + Math.abs(y - cy) / 4;
        else if (key === "ArrowLeft" && r.right <= me.left + 2 && r.top < me.bottom && r.bottom > me.top) d = me.left - r.right + Math.abs(y - cy) / 4;
        else if (key === "ArrowDown" && r.top >= me.bottom - 2) d = (r.top - me.bottom) * 2 + Math.abs(x - cx);
        else if (key === "ArrowUp" && r.bottom <= me.top + 2) d = (me.top - r.bottom) * 2 + Math.abs(x - cx);
        else continue;
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
      // off the end of a row, carry on into the next one
      if (!best && (key === "ArrowRight" || key === "ArrowLeft")) {
        const i = list.indexOf(from);
        best = list[i + (key === "ArrowRight" ? 1 : -1)] ?? null;
      }
    }
    if (best) {
      setRoving(best);
      best.a.focus();
    }
  }

  // ---- inspector
  let detail = null;
  let activeTab = "code";
  let sheetCache = null;
  let showPivot = false;
  let showGrid = false;
  let returnToTile = true;

  const urlFor = (fx) => {
    const u = new URL(location.href);
    const p = new URLSearchParams();
    if (detail && detail.fx === fx) {
      const pal = palKey();
      if (pal) p.set("pal", pal);
      if (detail.opts.seed) p.set("seed", detail.opts.seed);
      if (detail.flip) p.set("flip", "1");
      if (!detail.actor) p.set("actor", "0");
      if (detail.speed !== 1) p.set("speed", detail.speed);
      if (detail.bg !== fx.meta.bg) p.set("bg", detail.bg);
    }
    const qs = p.toString();
    u.hash = fx.id + (qs ? `?${qs}` : "");
    return u.href;
  };

  const palKey = () => $("#d-pal input:checked")?.value ?? "";

  function syncUrl() {
    if (detail) history.replaceState(history.state, "", urlFor(detail.fx));
  }

  function parseHash() {
    const raw = decodeURIComponent(location.hash.slice(1));
    const q = raw.indexOf("?");
    return q < 0 ? { path: raw, params: new URLSearchParams() } : { path: raw.slice(0, q), params: new URLSearchParams(raw.slice(q + 1)) };
  }

  function visibleEffects() {
    const list = wasSearching ? [...sections.results.grid.children].map((c) => tiles.find((t) => t.cell === c)).filter((t) => t && !t.cell.hidden).map((t) => t.fx) : tiles.filter((t) => !t.cell.hidden).map((t) => t.fx);
    return list.length ? list : FX;
  }

  // the tile grows into the stage and shrinks back; the eye never loses the effect
  function morph(tile, opening, change) {
    const r = tile?.stage.getBoundingClientRect();
    const onScreen = r && r.bottom > 0 && r.top < innerHeight && r.width;
    if (!document.startViewTransition || reduced || !onScreen || document.hidden) {
      change();
      return;
    }
    const name = "fx-stage";
    (opening ? tile.stage : wrap).style.viewTransitionName = name;
    const vt = document.startViewTransition(() => {
      (opening ? tile.stage : wrap).style.viewTransitionName = "";
      change();
      (opening ? wrap : tile.stage).style.viewTransitionName = name;
    });
    // a hidden tab can't animate: the change still happens, the transition just rejects
    vt.ready.catch(() => {});
    vt.finished.catch(() => {}).finally(() => {
      tile.stage.style.viewTransitionName = "";
      wrap.style.viewTransitionName = "";
    });
  }

  function openStudio(fx, { push = true, params = null, from = null } = {}) {
    const fresh = !dlg.open;
    if (push && fresh) history.pushState({ studio: 1 }, "", `#${fx.id}`);
    const show = () => {
      // Back can land while the opening transition is still waiting for a frame
      if (push && parseHash().path !== fx.id) return;
      if (fresh) dlg.showModal();
      loadEffect(fx, params);
      if (!push || !fresh) syncUrl();
    };
    if (fresh && from) morph(from, true, show);
    else show();
  }

  function closeStudio() {
    if (!dlg.open) return;
    const tile = detail && tileOf.get(detail.fx);
    morph(tile && !tile.cell.hidden ? tile : null, false, () => dlg.close());
  }

  function loadEffect(fx, params) {
    const prev = detail;
    const screen = isScreen(fx);
    const prevPal = palKey();
    const wantPal = params?.get("pal") ?? prevPal;

    const art = framing[fx.id] ?? null;
    detail = new Player(big, fx, { pad: 1.32, art, soft: true });
    detail.speed = +(params?.get("speed") ?? prev?.speed ?? 1) || 1;
    detail.flip = params?.get("flip") === "1" || (!params?.has("flip") && !!prev?.flip);
    if (params?.get("actor") === "0") detail.actor = false;
    if (params?.get("seed")) detail.opts.seed = +params.get("seed");
    if (params?.get("bg") && [...BACKDROPS, "none"].includes(params.get("bg"))) detail.bg = params.get("bg");
    const hasPal = "palette" in (fx.meta.options ?? {});
    if (hasPal && wantPal && palettes[wantPal]) detail.opts.palette = palettes[wantPal];

    const r = wrap.getBoundingClientRect();
    detail.fit(r.width, r.height, 0, true);
    setPlaying(true);

    const m = fx.meta;
    const list = visibleEffects();
    const idx = list.indexOf(fx);
    $("#d-cat").textContent = cap(catMap[fx.cat]?.name ?? fx.cat);
    $("#d-id").textContent = fx.id;
    $("#d-name").textContent = m.name;
    $("#d-desc").textContent = m.desc;
    big.setAttribute("aria-label", `${m.name}: ${m.desc}`);
    $("#d-pos").textContent = idx >= 0 ? `${idx + 1} of ${list.length}` : "";
    $("#d-prev").disabled = $("#d-next").disabled = list.length <= 1;
    $("#d-panel").scrollTop = 0;

    const frames = Math.round(m.duration * m.fps) + (m.loop ? 0 : 1);
    $("#d-facts").replaceChildren(...[
      ["Kind", m.loop ? "Seamless loop" : "One-shot"],
      ["Length", `${+m.duration.toFixed(2)} s, ${frames} frames at ${m.fps} fps`],
      ...(fx.mod.act ? [["Acted", actFacts(fx.mod)]] : []),
      ["Canvas", `${m.size[0]} × ${m.size[1]} px, origin ${m.origin[0]}, ${m.origin[1]}`],
    ].flatMap(([k, v]) => [el("dt", { textContent: k }), el("dd", { textContent: v })]));

    $("#d-tags").replaceChildren(...m.tags.map((tag) => {
      const b = el("button", { className: "link-btn", type: "button", textContent: tag });
      b.addEventListener("click", () => {
        $("#q").value = tag;
        state.q = tag;
        syncSearchUi();
        returnToTile = false;
        dlg.close();
        applyFilters();
        scrollTo(0, 0);
      });
      return b;
    }));

    buildBackdrops();
    buildPalettes(fx, hasPal && palettes[wantPal] ? wantPal : "");
    buildSpeeds();

    const hasActor = !!(m.actor || fx.mod.act);
    $("#d-actor").hidden = !hasActor;
    $("#d-actor").setAttribute("aria-pressed", String(detail.actor));
    $("#d-flip").setAttribute("aria-pressed", String(detail.flip));
    $("#d-seed-val").textContent = detail.opts.seed ? `Seed ${detail.opts.seed}` : "Seed";
    $("#d-zoom").hidden = screen;

    syncTimeline();
    syncOverlays();
    syncReadout();
    writeCode();
    sheetCache = null;
    if (activeTab === "sheet") buildSheet();
    else $("#d-sheet").replaceChildren();
    $("#d-live").textContent = `${m.name}. ${idx >= 0 ? `${idx + 1} of ${list.length}.` : ""}`;
  }

  function actFacts(mod) {
    const k = mod.act.poses, lead = Math.max(0, -k[0][0]), end = k[k.length - 1][0] - mod.meta.duration;
    const hits = (mod.act.hits ?? []).filter((h) => h.stop);
    const parts = [];
    if (lead > 0) parts.push(`${lead.toFixed(2)} s wind-up`);
    if (hits.length) parts.push(hits.length === 1 ? `${Math.round(hits[0].stop * 1000)} ms freeze` : `${hits.length} freezes`);
    if (!mod.meta.loop && end > 0.02) parts.push(`${end.toFixed(2)} s recovery`);
    return parts.join(", ") || "Choreographed";
  }

  // a radio per option keeps these one tab stop each, with arrow keys, for free
  function radio(name, value, checked, kids, onPick, title) {
    const input = el("input", { type: "radio", name, value, checked });
    input.addEventListener("change", onPick);
    return el("label", { title: title ?? "" }, [input, ...kids]);
  }

  function buildBackdrops() {
    const set = $("#d-bg");
    set.replaceChildren(set.querySelector("legend"), ...[...BACKDROPS, "none"].map((b) => radio("d-bg", b, b === detail.bg, [
      el("span", { className: `bg-swatch bg-${b}` }),
      el("span", { textContent: b === "none" ? "None" : cap(b) }),
    ], () => {
      detail.setBg(b);
      wrap.dataset.bg = b;
      detail.render();
      syncUrl();
    })));
    wrap.dataset.bg = detail.bg;
  }

  const hexOf = (c) => (typeof c === "number" ? toHex(c) : String(c));

  function ramp(colors) {
    const s = el("span", { className: "ramp" });
    s.style.setProperty("--ramp", `linear-gradient(90deg, ${colors.map((c, i) => `${hexOf(c)} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(", ")})`);
    return s;
  }

  function buildPalettes(fx, chosen) {
    const box = $("#d-pal"), defaults = fx.meta.options?.palette;
    $("#d-pal-set").hidden = !defaults;
    if (!defaults) {
      box.replaceChildren();
      return;
    }
    const pick = (key) => () => {
      if (key) detail.opts.palette = palettes[key];
      else delete detail.opts.palette;
      $("#d-pal-name").textContent = key || "Original";
      replayKeepingPlace();
    };
    box.replaceChildren(
      radio("d-pal", "", !chosen, [ramp(defaults), el("span", { className: "sr-only", textContent: "Original" })], pick(""), "Original"),
      ...Object.keys(palettes).map((k) => radio("d-pal", k, k === chosen, [ramp(palettes[k]), el("span", { className: "sr-only", textContent: k })], pick(k), k)),
    );
    $("#d-pal-name").textContent = chosen || "Original";
  }

  function buildSpeeds() {
    const box = $("#d-speed");
    box.replaceChildren(...[[0.25, "¼×"], [0.5, "½×"], [1, "1×"]].map(([s, label]) => {
      const b = el("button", { type: "button", textContent: label, "aria-pressed": String(s === detail.speed), "aria-label": `${s} times speed` });
      b.addEventListener("click", () => {
        detail.speed = s;
        box.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        syncUrl();
      });
      return b;
    }));
  }

  function replayKeepingPlace() {
    const keep = detail.frameIndex;
    detail.restart();
    detail.seekFrame(keep);
    sheetCache = null;
    if (activeTab === "sheet") buildSheet();
    writeCode();
    syncReadout();
    syncUrl();
  }

  // the wind-up, the effect and the recovery are different jobs, so the timeline says which you're looking at
  function syncTimeline() {
    const scrub = $("#d-scrub");
    scrub.max = String(Math.max(1, detail.totalFrames - 1));
    scrub.style.setProperty("--ticks", String(Math.min(detail.totalFrames - 1, 120)));
    const phases = $("#d-phases"), marks = $("#d-marks");
    phases.replaceChildren();
    marks.replaceChildren();
    phases.hidden = true;
    if (!detail.acted || !detail.fx.mod.act) return;
    const { from, totalSec, to } = detail.cycleSpan;
    const m = detail.fx.meta, hits = detail.fx.mod.act.hits ?? [];
    const pos = (tau) => {
      let extra = 0;
      for (const h of hits) if (h.t < tau) extra += h.stop ?? 0;
      return clamp01((tau - from + extra) / totalSec);
    };
    const spans = [];
    if (from < -0.01) spans.push(["Wind-up", 0, pos(0), "wind"]);
    spans.push(["Effect", pos(0), m.loop ? 1 : pos(Math.min(m.duration, to)), "effect"]);
    if (!m.loop && to > m.duration + 0.02) spans.push(["Recovery", pos(m.duration), 1, "rec"]);
    for (const [label, a, b, kind] of spans) {
      const s = el("span", { className: `phase ${kind}`, textContent: label });
      s.style.left = `${a * 100}%`;
      s.style.width = `${(b - a) * 100}%`;
      phases.append(s);
    }
    phases.hidden = false;
    for (const h of hits) {
      const tick = el("span", { className: "tick", title: `Hit at ${h.t} s` });
      tick.style.setProperty("--at", pos(h.t));
      marks.append(tick);
    }
  }

  function syncOverlays() {
    if (!detail) return;
    const mark = $("#d-pivot-mark"), grid = $("#d-grid"), dpr = devicePixelRatio || 1;
    const sharp = detail.sharp, unit = sharp ? wrap.clientWidth / detail.W : detail.k / dpr;
    mark.hidden = !showPivot;
    if (showPivot) {
      mark.style.left = `${detail.x * unit}px`;
      mark.style.top = `${detail.y * unit}px`;
    }
    grid.hidden = !showGrid || unit < 3;
    grid.style.setProperty("--cell", `${unit}px`);
    $("#d-gridb").disabled = unit < 3;
    $("#d-gridb").title = unit < 3 ? "Zoom in to see the pixel grid" : "Pixel grid (G)";
    $("#d-zoom-val").textContent = sharp ? "Fit" : `${detail.k}×`;
    $("#d-zoom-out").disabled = sharp || detail.k <= 1;
  }

  function syncReadout() {
    if (!detail) return;
    const scrub = $("#d-scrub"), f = detail.frameIndex, total = detail.totalFrames;
    scrub.value = String(f);
    scrub.style.setProperty("--p", total > 1 ? f / (total - 1) : 0);
    const secs = detail.seconds;
    const label = `${secs < 0 ? "−" : ""}${Math.abs(secs).toFixed(2)} s`;
    $("#d-time").replaceChildren(el("span", {}, [el("b", { textContent: `${f + 1}` }), ` / ${total}`]), el("span", { textContent: label }));
    scrub.setAttribute("aria-valuetext", `Frame ${f + 1} of ${total}, ${label}`);
    $("#d-freeze").hidden = !detail.isFrozen;
  }

  function setPlaying(playing) {
    if (!detail) return;
    detail.playing = playing;
    const b = $("#d-play");
    b.replaceChildren(icon(playing ? "pause" : "play"));
    b.setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  function step(delta) {
    if (!detail) return;
    setPlaying(false);
    const total = detail.totalFrames;
    detail.seekFrame(detail.fx.meta.loop ? (detail.frameIndex + delta + total) % total : Math.max(0, Math.min(total - 1, detail.frameIndex + delta)));
    syncReadout();
  }

  function replay() {
    detail.restart();
    detail.render();
    syncReadout();
  }

  function browse(dir) {
    if (!detail) return;
    const list = visibleEffects();
    if (list.length <= 1) return;
    const i = Math.max(0, list.indexOf(detail.fx));
    const next = list[(i + dir + list.length) % list.length];
    loadEffect(next);
    syncUrl();
  }

  function setZoom(delta) {
    if (!detail || detail.sharp) return;
    const r = wrap.getBoundingClientRect();
    const z = detail.zoom + delta;
    if ((detail.fitScale ?? 1) + z < 1 || (detail.fitScale ?? 1) + z > 24) return;
    detail.fit(r.width, r.height, z);
    syncOverlays();
  }

  function writeCode() {
    const fx = detail.fx;
    const v = fx.id.split("/")[1].replace(/-(\w)/g, (_, c) => c.toUpperCase());
    const palName = palKey();
    const opts = {
      x: 160,
      y: 120,
      ...(palName ? { palette: `PAL.${palName}` } : {}),
      ...(detail.flip ? { flip: true } : {}),
      ...(detail.opts.seed ? { seed: detail.opts.seed } : {}),
    };
    const make = fx.mod.act && detail.actor ? "createAct" : "createFx";
    const custom = palName && !PAL[palName];
    const imports = ["createFrame", make, "composite", ...(palName && !custom ? ["PAL"] : [])].join(", ");
    const optsStr = JSON.stringify(opts).replace(/"PAL\.(\w+)"/, custom ? `${cfg.palettesName}.$1` : "PAL.$1").replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ");
    const text = [
      `import { ${imports} } from "${cfg.corePath}";`,
      ...(custom ? [`import { ${cfg.palettesName} } from "${cfg.packPath}";`] : []),
      `import * as ${v} from "${cfg.effectPath(fx.id)}";`,
      ``,
      `const frame = createFrame(320, 180);`,
      `const fx = ${make}(${v}, ${optsStr});`,
      ``,
      `// every tick`,
      `fx.update(dt);`,
      `fx.draw(frame); // color + light buffers`,
      `composite(frame, imageData.data, null);`,
      ...(fx.mod.act ? [``, `// custom rig? read timing from ${v}.act`] : []),
    ].join("\n");
    const pre = $("#d-code");
    pre.dataset.text = text;
    const parts = [];
    let at = 0;
    for (const m of text.matchAll(/(\/\/.*$)|("[^"]*")|\b(import|from|const|as)\b/gm)) {
      parts.push(text.slice(at, m.index));
      parts.push(el("span", { className: m[1] ? "c-note" : m[2] ? "c-str" : "c-key", textContent: m[0] }));
      at = m.index + m[0].length;
    }
    parts.push(text.slice(at));
    pre.replaceChildren(...parts);
    $("#d-src").href = cfg.sourceUrl(fx.id);
  }

  function buildSheet() {
    if (!detail) return null;
    const fx = detail.fx, m = fx.meta, [w, h] = m.size;
    const n = Math.max(1, Math.round(m.duration * m.fps) + (m.loop ? 0 : 1));
    const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt((n * h) / w))));
    const rows = Math.ceil(n / cols);
    const cv = el("canvas", { width: cols * w, height: rows * h });
    const ctx = cv.getContext("2d");
    const frame = createFrame(w, h), img = ctx.createImageData(w, h);
    const inst = createFx(fx.mod, { x: m.origin[0], y: m.origin[1], ...detail.opts, flip: detail.flip });
    const name = fx.id.split("/")[1];
    const framesJson = [];
    for (let i = 0; i < n; i++) {
      if (i) inst.update(1 / m.fps);
      inst.draw(clearFrame(frame));
      composite(frame, img.data, null);
      const fxX = (i % cols) * w, fxY = Math.floor(i / cols) * h;
      ctx.putImageData(img, fxX, fxY);
      framesJson.push({
        filename: `${name} ${i}`,
        frame: { x: fxX, y: fxY, w, h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w, h },
        sourceSize: { w, h },
        duration: Math.round(1000 / m.fps),
      });
    }
    const atlas = {
      frames: framesJson,
      meta: {
        app: cfg.repo ?? "pixelfx",
        version: "1",
        image: `${name}.png`,
        format: "RGBA8888",
        size: { w: cols * w, h: rows * h },
        scale: "1",
        frameTags: [{ name, from: 0, to: n - 1, direction: "forward" }],
        pixelfx: {
          id: fx.id, name: m.name, fps: m.fps, loop: m.loop, frames: n, frameSize: [w, h], pivot: m.origin, columns: cols,
          ...(fx.mod.act ? { act: actTiming(fx.mod) } : {}),
        },
      },
    };
    const dataUrl = cv.toDataURL("image/png");
    const pic = el("img", { src: dataUrl, alt: `${m.name} sprite sheet`, width: cols * w, height: rows * h });
    $("#d-sheet").replaceChildren(pic);
    const cli = `node tools/render.mjs ${fx.id} --sheet`;
    $("#d-sheet-note").textContent = `${n} frames, ${w} × ${h} px each, ${cols} columns at ${m.fps} fps.`;
    sheetCache = { name, dataUrl, atlas, cli };
    return sheetCache;
  }

  function download(filename, href) {
    const a = el("a", { href, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
  }

  function setTab(tab) {
    activeTab = tab;
    const isCode = tab === "code";
    for (const [id, on] of [["#tab-code", isCode], ["#tab-sheet", !isCode]]) {
      $(id).setAttribute("aria-selected", String(on));
      $(id).tabIndex = on ? 0 : -1;
    }
    $("#pane-code").hidden = !isCode;
    $("#pane-sheet").hidden = isCode;
    $("#d-copy span").textContent = isCode ? "Copy" : "Copy command";
    if (!isCode && !sheetCache && detail) buildSheet();
  }

  async function copy(text, button, doneLabel = "Copied") {
    const label = button.querySelector("span");
    const was = label.textContent, wasIcon = button.querySelector("svg");
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      ok = false;
    }
    label.textContent = ok ? doneLabel : "Press Ctrl+C";
    const check = icon("check");
    if (ok) wasIcon.replaceWith(check);
    $("#d-live").textContent = ok ? doneLabel : "Couldn't reach the clipboard";
    clearTimeout(button._timer);
    button._timer = setTimeout(() => {
      label.textContent = was;
      if (ok) check.replaceWith(wasIcon);
    }, 1400);
    return ok;
  }

  function wireStudio() {
    $("#d-close").addEventListener("click", closeStudio);
    dlg.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeStudio();
    });
    dlg.addEventListener("close", () => {
      const fx = detail?.fx;
      detail = null;
      if (history.state?.studio) history.back();
      else {
        const u = new URL(location.href);
        u.hash = "";
        history.replaceState(null, "", u);
      }
      const t = fx && returnToTile && tileOf.get(fx);
      returnToTile = true;
      if (t && !t.cell.hidden) {
        setRoving(t);
        t.a.focus({ preventScroll: true });
        t.a.scrollIntoView({ block: "nearest" });
      }
    });

    $("#d-cat").addEventListener("click", () => {
      const id = detail.fx.cat;
      clearSearch();
      setType("all");
      returnToTile = false;
      dlg.close();
      setTimeout(() => $(`#${CSS.escape(id)}`)?.scrollIntoView(), 0);
    });
    $("#d-link").addEventListener("click", (e) => copy(urlFor(detail.fx), e.currentTarget, "Link copied"));
    $("#d-prev").addEventListener("click", () => browse(-1));
    $("#d-next").addEventListener("click", () => browse(1));
    $("#d-play").addEventListener("click", () => setPlaying(!detail.playing));
    $("#d-back").addEventListener("click", () => step(-1));
    $("#d-fwd").addEventListener("click", () => step(1));
    $("#d-again").addEventListener("click", replay);
    $("#d-zoom-in").addEventListener("click", () => setZoom(1));
    $("#d-zoom-out").addEventListener("click", () => setZoom(-1));
    $("#d-scrub").addEventListener("input", (e) => {
      setPlaying(false);
      detail.seekFrame(+e.target.value);
      syncReadout();
    });

    $("#d-flip").addEventListener("click", (e) => {
      detail.flip = !detail.flip;
      e.currentTarget.setAttribute("aria-pressed", String(detail.flip));
      replayKeepingPlace();
    });
    $("#d-actor").addEventListener("click", (e) => {
      detail.actor = !detail.actor;
      e.currentTarget.setAttribute("aria-pressed", String(detail.actor));
      const r = wrap.getBoundingClientRect();
      detail.fit(r.width, r.height, 0, true);
      syncTimeline();
      syncOverlays();
      writeCode();
      syncReadout();
      syncUrl();
    });
    $("#d-pivot").addEventListener("click", (e) => {
      showPivot = !showPivot;
      e.currentTarget.setAttribute("aria-pressed", String(showPivot));
      syncOverlays();
    });
    $("#d-gridb").addEventListener("click", (e) => {
      showGrid = !showGrid;
      e.currentTarget.setAttribute("aria-pressed", String(showGrid));
      syncOverlays();
    });
    $("#d-seed").addEventListener("click", () => {
      detail.opts.seed = 1 + Math.floor(Math.random() * 9999);
      $("#d-seed-val").textContent = `Seed ${detail.opts.seed}`;
      replayKeepingPlace();
    });

    $("#tab-code").addEventListener("click", () => setTab("code"));
    $("#tab-sheet").addEventListener("click", () => setTab("sheet"));
    for (const id of ["#tab-code", "#tab-sheet"]) {
      $(id).addEventListener("keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        e.stopPropagation();
        const next = id === "#tab-code" ? "sheet" : "code";
        setTab(next);
        $(`#tab-${next}`).focus();
      });
    }
    $("#d-dl-png").addEventListener("click", () => {
      const s = sheetCache ?? buildSheet();
      if (s) download(`${s.name}.png`, s.dataUrl);
    });
    $("#d-dl-json").addEventListener("click", () => {
      const s = sheetCache ?? buildSheet();
      if (!s) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(s.atlas, null, 2)], { type: "application/json" }));
      download(`${s.name}.json`, url);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
    $("#d-copy").addEventListener("click", (e) => {
      const text = activeTab === "code" ? $("#d-code").dataset.text : (sheetCache ?? buildSheet())?.cli ?? "";
      copy(text, e.currentTarget);
    });

    let refit = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(refit);
      refit = requestAnimationFrame(() => {
        if (!detail) return;
        const r = wrap.getBoundingClientRect();
        detail.fit(r.width, r.height);
        syncOverlays();
        syncReadout();
      });
    }).observe(wrap);

    // on a phone, swiping the stage is the natural way to the next effect
    let swipe = null;
    wrap.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") swipe = { x: e.clientX, y: e.clientY };
    });
    wrap.addEventListener("pointerup", (e) => {
      if (!swipe) return;
      const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) browse(dx < 0 ? 1 : -1);
    });
    wrap.addEventListener("pointercancel", () => {
      swipe = null;
    });
  }

  // ---- keyboard
  function wireKeyboard() {
    $("#sections").addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
      const t = tileByLink.get(document.activeElement);
      if (!t) return;
      e.preventDefault();
      moveFocus(t, e.key);
    });

    addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ($("#keys").open) return;
      const a = document.activeElement;
      const typing = a?.tagName === "TEXTAREA" || a?.tagName === "SELECT" || (a?.tagName === "INPUT" && a.type === "search");
      if (typing) return;
      const k = e.key.toLowerCase();

      if (e.key === "?") {
        e.preventDefault();
        $("#keys").showModal();
        return;
      }

      if (detail && dlg.open) {
        const onRange = a?.id === "d-scrub", onRadio = a?.type === "radio";
        if (e.key === " " && a?.tagName !== "BUTTON" && !onRadio && a?.tagName !== "A") {
          e.preventDefault();
          setPlaying(!detail.playing);
        } else if (e.key === ",") step(-1);
        else if (e.key === ".") step(1);
        else if (k === "r") replay();
        else if (k === "m") $("#d-flip").click();
        else if (k === "c" && !$("#d-actor").hidden) $("#d-actor").click();
        else if (k === "o") $("#d-pivot").click();
        else if (k === "g") $("#d-gridb").click();
        else if (k === "l") $("#d-link").click();
        else if (e.key === "+" || e.key === "=") setZoom(1);
        else if (e.key === "-" || e.key === "−") setZoom(-1);
        else if (e.key === "ArrowLeft" && !onRange && !onRadio) {
          e.preventDefault();
          browse(-1);
        } else if (e.key === "ArrowRight" && !onRange && !onRadio) {
          e.preventDefault();
          browse(1);
        }
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        $("#q").focus();
        $("#q").select();
      } else if (k === "k") {
        setPaused(!state.paused);
      }
    });

    const q = $("#q");
    let composing = false;
    q.addEventListener("compositionstart", () => {
      composing = true;
    });
    q.addEventListener("compositionend", () => {
      composing = false;
    });
    q.addEventListener("input", (e) => {
      state.q = e.target.value;
      syncSearchUi();
      applyFilters();
      if (!state.q) markFromScroll();
      scrollTo(0, 0);
    });
    q.addEventListener("keydown", (e) => {
      if (composing || e.isComposing) return;
      if (e.key === "Enter") {
        const first = visibleEffects()[0];
        if (state.q.trim() && first && $("#none").hidden) openStudio(first, { from: tileOf.get(first) });
      } else if (e.key === "ArrowDown" && roving && !roving.cell.hidden) {
        e.preventDefault();
        roving.a.focus();
      } else if (e.key === "Escape" && q.value) {
        e.preventDefault();
        clearSearch();
        applyFilters();
      } else if (e.key === "Escape") {
        q.blur();
      }
    });
    $("#q-clear").addEventListener("click", () => {
      clearSearch();
      applyFilters();
      q.focus();
    });
  }

  function markFromScroll() {
    const current = sections.find((s) => !s.sec.hidden && s.sec.getBoundingClientRect().bottom > 56);
    if (current) markCurrent(current.c.id);
  }

  // ---- motion: moving art must be stoppable, and stays stopped for people who ask for less of it
  function setPaused(paused) {
    state.paused = paused;
    store("pixelfx.paused", paused ? "1" : "0");
    syncMotion();
    const now = performance.now();
    for (const t of tiles) t.last = now;
  }

  function syncMotion() {
    $("#motion").setAttribute("aria-pressed", String(state.paused));
    $("#motion-ico").replaceChildren(icon(state.paused ? "play" : "pause"));
    $("#motion-label").textContent = state.paused ? "Play motion" : "Pause motion";
  }

  // ---- clock. Tiles share a frame budget: when too many are on screen each runs less often, but never out of time.
  let last = performance.now(), rotor = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (wakeQueue.length) wakeSome();
    if (detail) {
      if (detail.tick(dt)) syncReadout();
    } else {
      for (const hook of frameHooks) hook(dt, state.paused);
      const start = performance.now(), n = tiles.length;
      for (let i = 0; i < n; i++) {
        const t = tiles[(rotor + i) % n];
        if (!t.visible || !t.player || t.cell.hidden) continue;
        if (state.paused && !t.hover && !t.focus) {
          t.last = now;
          continue;
        }
        if (performance.now() - start > 12) {
          rotor = (rotor + i) % n;
          break;
        }
        t.player.tick(Math.min(0.25, (now - t.last) / 1000));
        t.last = now;
      }
    }
    requestAnimationFrame(loop);
  }

  // ---- routing: #category jumps, #category/effect opens, and the query holds the filters
  function route() {
    const { path, params } = parseHash();
    const fx = FX_BY_ID.get(path);
    if (fx) {
      if (!detail || detail.fx !== fx) openStudio(fx, { push: false, params });
      return;
    }
    if (dlg.open) dlg.close();
  }

  function restoreFilters() {
    const q = new URLSearchParams(location.search);
    if (q.get("q")) {
      state.q = q.get("q");
      $("#q").value = state.q;
    }
    if (["loop", "oneshot", "acted"].includes(q.get("type"))) {
      state.type = q.get("type");
      document.querySelectorAll("#types [data-type]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === state.type)));
    }
    if (q.get("bg") && $(`#g-bg option[value="${CSS.escape(q.get("bg"))}"]`)) {
      state.gridBg = q.get("bg");
      $("#g-bg").value = state.gridBg;
    }
    syncSearchUi();
  }

  // ---- boot
  history.scrollRestoration = "manual";
  buildSections();
  buildNav();
  watchTiles();
  watchPosition();
  wireStudio();
  wireKeyboard();
  restoreFilters();
  applyFilters();
  syncMotion();

  document.querySelectorAll("#types [data-type]").forEach((b) => {
    b.addEventListener("click", () => {
      setType(b.dataset.type);
      if (!state.q.trim()) markFromScroll();
    });
  });
  $("#motion").addEventListener("click", () => setPaused(!state.paused));
  $("#g-bg").addEventListener("change", (e) => {
    state.gridBg = e.target.value;
    for (const t of tiles) {
      if (!t.player) continue;
      t.player.setBg(state.gridBg === "auto" ? t.fx.meta.bg : state.gridBg);
      t.player.render();
    }
    syncQuery();
  });
  $("#keys-open").addEventListener("click", () => $("#keys").showModal());
  $("#keys-close").addEventListener("click", () => $("#keys").close());
  narrow.addEventListener("change", () => {
    if ($("#side").matches(":popover-open")) $("#side").hidePopover();
  });

  if (cfg.hero) {
    cfg.hero($("#hero"), {
      Player, framing, FX_BY_ID,
      open: (id) => openStudio(FX_BY_ID.get(id)),
      onFrame: (fn) => frameHooks.push(fn),
      el,
    });
  }

  mountCollections($("#coll-nav"), cfg.collection).then((n) => {
    if (n > 0) $("#colls").hidden = false;
  });

  $("#app").classList.add("ready");
  const { path } = parseHash();
  if (FX_BY_ID.has(path)) route();
  else if (path && $(`#${CSS.escape(path)}`)) $(`#${CSS.escape(path)}`).scrollIntoView();
  addEventListener("hashchange", route);
  requestAnimationFrame(loop);
}
