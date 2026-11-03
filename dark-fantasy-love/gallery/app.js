// Dark Fantasy Love live studio gallery: every bespoke gothic-romance effect playing live from source code,
// with frame-accurate scrubbing, gothic & core palette ramps, and browser sprite-sheet PNG/JSON export.

import { effects, categories, GOTHIC_PAL } from "../fx/index.js";
import {
  createFrame, clearFrame, createFx, createAct, actBounds, actSpan, actTiming,
  composite, backdrop, drawActor, painterFor, stockActor, actorAlphaOf, PAL, BACKDROPS,
} from "../../src/core/index.js";

const ALL_PALS = { ...GOTHIC_PAL, ...PAL };
const CAT_MAP = Object.fromEntries(categories.map((c) => [c.id, c]));

const FX = Object.entries(effects).map(([id, mod]) => {
  const meta = { fps: 30, bg: "dark", loop: false, duration: 1, tags: [], options: {}, ...mod.meta };
  const cat = id.split("/")[0];
  const search = [id, cat, CAT_MAP[cat]?.name ?? "", meta.name, meta.desc, ...meta.tags, mod.act ? "acted choreography hitstop" : "", meta.loop ? "loop" : "one-shot oneshot"]
    .join(" ")
    .toLowerCase();
  return { id, cat, name: meta.name, mod: { ...mod, meta }, meta, search };
});
const FX_BY_ID = new Map(FX.map((f) => [f.id, f]));

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isScreen = (fx) => fx.meta.size[0] >= 320 && Math.abs(fx.meta.size[0] / fx.meta.size[1] - 16 / 9) < 0.05;
const $ = (s, root = document) => root.querySelector(s);
function el(tag, props = {}, kids = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const k of [].concat(kids)) if (k != null && k !== false) e.append(k);
  return e;
}

class Player {
  constructor(canvas, fx, aspect, pad, bgOverride = "auto") {
    Object.assign(this, {
      canvas, fx, ctx: canvas.getContext("2d"),
      opts: {}, flip: false, actor: true, speed: 1, playing: true,
      frameIndex: 0, totalFrames: 1,
    });
    this.bg = bgOverride === "auto" ? fx.meta.bg : bgOverride;
    this.layout(aspect, pad);
  }

  get acted() {
    return !!this.fx.mod.act && this.actor;
  }

  get isFrozen() {
    return this.acted && !!this.inst?.frozen;
  }

  computeMetrics() {
    const m = this.fx.meta;
    if (!this.acted) {
      this.totalFrames = Math.max(1, Math.round(m.duration * m.fps) + (m.loop ? 0 : 1));
      this.cycleSpan = { from: 0, to: m.duration, stops: 0 };
      return;
    }
    const span = actSpan(this.fx.mod);
    const endT = m.loop ? m.duration : span.to;
    const stops = (this.fx.mod.act.hits ?? []).reduce((acc, h) => acc + (h.stop ?? 0), 0);
    const totalSec = Math.max(1 / m.fps, endT - span.from + stops);
    this.totalFrames = Math.max(2, Math.round(totalSec * m.fps) + (m.loop ? 0 : 1));
    this.cycleSpan = { from: span.from, to: endT, stops, totalSec };
  }

  layout(aspect, pad) {
    Object.assign(this, { aspect, pad });
    const acted = this.acted, b = acted ? { ...actBounds(this.fx.mod) } : null;
    if (b) b.y1 = Math.min(b.y1, 22);
    const [w, h] = acted ? [b.x1 - b.x0, b.y1 - b.y0] : this.fx.meta.size;
    const [ox, oy] = acted ? [-b.x0, -b.y0] : this.fx.meta.origin;
    this.W = Math.ceil(Math.max(w * (acted ? Math.min(pad, 1.1) : pad), h * (acted ? Math.min(pad, 1.1) : pad) * aspect));
    this.H = Math.ceil(this.W / aspect);
    this.x = Math.floor((this.W - w) / 2) + ox;
    this.y = acted ? Math.max(oy + 2, this.H - b.y1 - 2) : Math.floor((this.H - h) / 2) + oy;
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    const shown = this.canvas.getBoundingClientRect().width * devicePixelRatio;
    this.canvas.style.imageRendering = shown && shown < this.W ? "auto" : "";
    this.frame = createFrame(this.W, this.H);
    this.img = this.ctx.createImageData(this.W, this.H);
    this.computeMetrics();
    this.setBg(this.bg);
    this.restart();
  }

  setBg(kind) {
    this.bg = kind;
    this.bgBuf = kind === "none" ? null : backdrop(kind, this.W, this.H, this.y);
    this.dirty = true;
  }

  restart() {
    this.inst = (this.acted ? createAct : createFx)(this.fx.mod, { x: this.x, y: this.y, flip: this.flip, ...this.opts });
    this.acc = 0;
    this.wait = 0;
    this.frameIndex = 0;
    this.dirty = true;
  }

  tick(dt) {
    const m = this.fx.meta, step = 1 / m.fps;
    if (this.playing) this.acc = Math.min(this.acc + dt * this.speed, 0.25);
    let moved = false;
    while (this.acc >= step) {
      this.acc -= step;
      if (!m.loop && (this.acted ? this.inst.done() : this.inst.t >= m.duration)) {
        this.wait += step;
        if (this.wait > 0.45) this.restart();
      } else {
        this.inst.update(step);
        this.frameIndex = m.loop ? (this.frameIndex + 1) % this.totalFrames : Math.min(this.frameIndex + 1, this.totalFrames - 1);
      }
      moved = true;
    }
    if (moved || this.dirty) this.render();
    return moved;
  }

  seek(t) {
    this.seekFrame(Math.round(t * this.fx.meta.fps));
  }

  seekFrame(targetFrame) {
    const clamped = Math.max(0, Math.min(this.totalFrames - 1, targetFrame | 0));
    const step = 1 / this.fx.meta.fps;
    this.wait = 0;
    this.acc = 0;
    if (clamped < this.frameIndex) {
      this.inst = (this.acted ? createAct : createFx)(this.fx.mod, { x: this.x, y: this.y, flip: this.flip, ...this.opts });
      this.frameIndex = 0;
    }
    while (this.frameIndex < clamped) {
      this.inst.update(step);
      this.frameIndex++;
    }
    this.render();
  }

  get displayTime() {
    const m = this.fx.meta;
    if (this.acted) {
      const v = m.loop && this.inst.t >= m.duration ? this.inst.t % m.duration : this.inst.t;
      return `${v >= -0.004 ? "+" : ""}${(Math.abs(v) < 0.005 ? 0 : v).toFixed(2)}s`;
    }
    const v = m.loop ? this.inst.t % m.duration : Math.min(this.inst.t, m.duration);
    return `${v.toFixed(2)}s`;
  }

  render() {
    const f = clearFrame(this.frame);
    if (this.acted) {
      this.inst.draw(f);
      composite(f, this.img.data, this.bgBuf);
      const [sx, sy] = this.inst.shake;
      if (sx || sy || !this.bgBuf) this.ctx.clearRect(0, 0, this.W, this.H);
      this.ctx.putImageData(this.img, sx, sy);
      this.dirty = false;
      return;
    }
    this.inst.draw(f, "back");
    const m = this.fx.meta, tt = m.loop ? this.inst.t % m.duration : Math.min(this.inst.t, m.duration);
    if (m.actor && this.actor) {
      drawActor(painterFor(f).place(this.x, this.y, this.flip), this.inst.options.actor ?? stockActor(), actorAlphaOf(this.fx.mod, tt, this.inst.options));
    }
    this.inst.draw(f, "front");
    composite(f, this.img.data, this.bgBuf);
    if (!this.bgBuf) this.ctx.clearRect(0, 0, this.W, this.H);
    this.ctx.putImageData(this.img, 0, 0);
    this.dirty = false;
  }
}

const state = { cat: "all", trait: "all", q: "", gridBg: "auto" };
const tiles = [];
const sections = [];
const chipRefs = new Map();

function matchesTrait(fx, trait) {
  if (trait === "acted") return !!fx.mod.act;
  if (trait === "loop") return !!fx.meta.loop;
  if (trait === "oneshot") return !fx.meta.loop;
  return true;
}

function matchesQuery(fx, q) {
  if (!q) return true;
  return q.split(/\s+/).filter(Boolean).every((term) => fx.search.includes(term));
}

function build() {
  $("#count").textContent = FX.length;
  const main = $("#grid");
  for (const c of categories) {
    const list = FX.filter((f) => f.cat === c.id);
    if (!list.length) continue;
    const grid = el("div", { className: "grid" });
    const countEl = el("span", { className: "section-count", textContent: `${list.length}` });
    const titleBtn = el("button", { type: "button", textContent: c.name + "." });
    titleBtn.addEventListener("click", () => setCat(state.cat === c.id ? "all" : c.id));
    const head = el("div", { className: "section-head" }, [
      el("div", { className: "section-title-group" }, [el("h2", {}, titleBtn), el("p", { textContent: c.blurb })]),
      countEl,
    ]);
    const sec = el("section", { id: c.id }, [head, grid]);
    sections.push({ c, sec, list, countEl });

    for (const fx of list) {
      const cv = el("canvas", { ariaLabel: fx.name });
      const b = fx.mod.act ? actBounds(fx.mod) : null;
      const [fw, fh] = b ? [b.x1 - b.x0, b.y1 - b.y0] : fx.meta.size;
      const cls = isScreen(fx)
        ? "tile big screen"
        : fw > 200 || fh > 170 || (b && (fw > 155 || fx.mod.act.target || fx.mod.act.targets))
          ? "tile big"
          : "tile";
      const catTag = el("span", { className: "tile-cat", textContent: c.name, hidden: true });
      const fig = el("figure", { className: cls, tabIndex: 0 }, [
        el("div", { className: "stage" }, cv),
        el("figcaption", {}, [
          el("span", { className: "tile-title" }, [el("b", { textContent: fx.name }), catTag]),
          el("span", { className: "tile-meta" }, [
            fx.mod.act ? el("span", { className: "badge-act", textContent: "act" }) : null,
            el("span", { textContent: fx.meta.loop ? "loop" : `${+fx.meta.duration.toFixed(2)}s` }),
          ]),
        ]),
      ]);
      const t = { fx, fig, cv, catTag, player: null, visible: false, hover: false };
      fig.addEventListener("click", () => openDetail(fx));
      fig.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openDetail(fx)));
      fig.addEventListener("pointerenter", () => {
        t.hover = true;
        if (t.player && !t.fx.meta.loop && t.player.wait > 0.05) t.player.restart();
      });
      fig.addEventListener("pointerleave", () => (t.hover = false));
      grid.append(fig);
      tiles.push(t);
    }
    main.append(sec);
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const t = tiles.find((x) => x.fig === e.target);
      if (!t) continue;
      t.visible = e.isIntersecting;
      if (t.visible && !t.player) {
        t.player = isScreen(t.fx)
          ? new Player(t.cv, t.fx, 16 / 9, 1, state.gridBg)
          : new Player(t.cv, t.fx, 6 / 5, 1.25, state.gridBg);
        if (reduced) t.player.seek(t.fx.meta.duration * 0.4);
      }
    }
  }, { rootMargin: "220px" });
  tiles.forEach((t) => io.observe(t.fig));
}

function buildChips() {
  const rail = $("#chips");
  const mk = (id, label, n) => {
    const countSpan = el("span", { textContent: String(n) });
    const b = el("button", { className: "chip", type: "button" }, [label, countSpan]);
    b.dataset.cat = id;
    b.addEventListener("click", () => setCat(state.cat === id && id !== "all" ? "all" : id));
    chipRefs.set(id, { btn: b, countSpan });
    rail.append(b);
  };
  mk("all", "all", FX.length);
  rail.append(el("span", { className: "rail-divider", ariaHidden: "true" }));
  for (const s of sections) mk(s.c.id, s.c.name, s.list.length);
}

function syncUrlHash() {
  if (detail) {
    const next = "#" + detail.fx.id;
    if (location.hash !== next) history.replaceState(null, "", next);
    return;
  }
  const target = state.cat === "all" ? location.pathname + location.search : "#" + state.cat;
  if ((state.cat === "all" && location.hash) || (state.cat !== "all" && location.hash !== "#" + state.cat)) {
    history.replaceState(null, "", target);
  }
}

function setCat(id, { fromHash = false, scroll = true } = {}) {
  state.cat = sections.some((s) => s.c.id === id) ? id : "all";
  for (const [cid, ref] of chipRefs) ref.btn.setAttribute("aria-pressed", String(cid === state.cat));
  if (!fromHash) syncUrlHash();
  filter();
  if (!fromHash && scroll) window.scrollTo({ top: 0 });
}

function setTrait(trait) {
  state.trait = trait;
  document.querySelectorAll("#traits .seg-btn").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.trait === trait));
  });
  filter();
}

function resetAllFilters() {
  state.q = "";
  $("#q").value = "";
  $("#q-clear").hidden = true;
  $("#q-kbd").hidden = false;
  setTrait("all");
  setCat("all");
}

function filter() {
  const q = state.q.trim().toLowerCase();
  const showCatOnTile = state.cat === "all" && (!!q || state.trait !== "all");
  let shown = 0;
  let totalBeforeCat = 0;

  for (const s of sections) {
    let catPoolCount = 0;
    let secShown = 0;
    for (const fx of s.list) {
      const baseHit = matchesTrait(fx, state.trait) && matchesQuery(fx, q);
      if (baseHit) catPoolCount++;
      const hit = baseHit && (state.cat === "all" || state.cat === s.c.id);
      const t = tiles.find((x) => x.fx === fx);
      t.fig.hidden = !hit;
      t.catTag.hidden = !showCatOnTile;
      if (hit) {
        secShown++;
        shown++;
      }
    }
    totalBeforeCat += catPoolCount;
    s.sec.hidden = secShown === 0;
    s.countEl.textContent = secShown === s.list.length ? `${s.list.length}` : `${secShown} / ${s.list.length}`;

    const ref = chipRefs.get(s.c.id);
    if (ref) {
      ref.countSpan.textContent = String(catPoolCount);
      ref.btn.dataset.empty = String(catPoolCount === 0);
    }
  }

  const allRef = chipRefs.get("all");
  if (allRef) allRef.countSpan.textContent = String(totalBeforeCat);

  const isFiltered = state.cat !== "all" || state.trait !== "all" || !!q;
  $("#result-meta").textContent = isFiltered ? `${shown} of ${FX.length}` : `${FX.length} effects`;
  $("#reset-all").hidden = !isFiltered;
  $("#none").hidden = shown > 0;
  if (shown === 0) {
    $("#none-msg").textContent = q
      ? `Nothing matches "${state.q.trim()}"${state.cat !== "all" ? ` in ${CAT_MAP[state.cat]?.name}` : ""}.`
      : "No effects match the selected filters.";
  }
}

function visibleEffects() {
  const vis = tiles.filter((t) => !t.fig.hidden).map((t) => t.fx);
  return vis.length ? vis : FX;
}

let detail = null;
let activeTab = "code";
let sheetCache = null;
let showPivot = false;

function openDetail(fx) {
  const d = $("#detail");
  const wrap = $("#big-wrap");
  const big = $("#big");
  const screen = isScreen(fx);
  wrap.classList.toggle("screen", screen);

  const prevSpeed = detail?.speed ?? 1;
  const prevFlip = detail?.flip ?? false;
  const prevPalKey = $("#d-pal").value || "";

  detail = screen ? new Player(big, fx, 16 / 9, 1) : new Player(big, fx, 16 / 10, 1.5);
  detail.speed = prevSpeed;
  detail.flip = prevFlip;
  if (prevPalKey && ALL_PALS[prevPalKey]) detail.opts.palette = ALL_PALS[prevPalKey];
  if (prevFlip || prevPalKey) detail.restart();

  const m = fx.meta;
  $("#d-cat-btn").textContent = CAT_MAP[fx.cat]?.name ?? fx.cat;
  $("#d-id").textContent = fx.id;
  $("#d-name").textContent = m.name;
  $("#d-desc").textContent = m.desc;

  const list = visibleEffects();
  const idx = list.indexOf(fx);
  $("#d-pos").textContent = idx >= 0 ? `${idx + 1} / ${list.length}` : "";
  $("#d-prev").disabled = list.length <= 1;
  $("#d-next").disabled = list.length <= 1;

  const frames = Math.round(m.duration * m.fps) + (m.loop ? 0 : 1);
  $("#d-facts").replaceChildren(
    ...[
      ["kind", m.loop ? "seamless loop" : "one-shot"],
      ["timing", `${+m.duration.toFixed(2)}s · ${frames}f @ ${m.fps} fps`],
      ...(fx.mod.act ? [["acted", actFacts(fx.mod)]] : []),
      ["canvas", `${m.size[0]} × ${m.size[1]} px (origin ${m.origin[0]}, ${m.origin[1]})`],
    ].flatMap(([k, v]) => [el("dt", { textContent: k }), el("dd", { textContent: v })]),
  );

  $("#d-tags").replaceChildren(
    ...m.tags.map((tag) => {
      const b = el("button", { className: "tag-chip", type: "button", textContent: `#${tag}` });
      b.addEventListener("click", () => {
        d.close();
        state.q = tag;
        $("#q").value = tag;
        $("#q-clear").hidden = false;
        $("#q-kbd").hidden = true;
        setCat("all");
      });
      return b;
    }),
  );

  $("#d-bg").replaceChildren(
    ...BACKDROPS.concat("none").map((b) => btn(b, () => {
      detail.setBg(b);
      wrap.dataset.bg = b;
      detail.render();
    }, b === detail.bg, "bg")),
  );
  wrap.dataset.bg = detail.bg;

  $("#d-speed").replaceChildren(
    ...[0.25, 0.5, 1].map((s) => btn(`${s}×`, () => (detail.speed = s), s === detail.speed, "speed")),
  );

  const pal = $("#d-pal");
  pal.replaceChildren(
    el("option", { value: "", textContent: "effect default" }),
    el("optgroup", { label: "dark fantasy love" }, Object.keys(GOTHIC_PAL).map((k) => el("option", { value: k, textContent: k }))),
    el("optgroup", { label: "pixelfx core" }, Object.keys(PAL).map((k) => el("option", { value: k, textContent: k }))),
  );
  pal.value = prevPalKey;
  renderPaletteRamp();

  $("#d-seed-val").textContent = detail.opts.seed ? `#${detail.opts.seed}` : "default";
  const hasActor = !!(m.actor || fx.mod.act);
  $("#d-actor").hidden = !hasActor;
  $("#d-actor").setAttribute("aria-pressed", String(detail.actor));
  $("#d-flip").setAttribute("aria-pressed", String(detail.flip));
  $("#d-pivot").setAttribute("aria-pressed", String(showPivot));
  $("#d-play").setAttribute("aria-pressed", "true");
  $("#d-play").textContent = "pause";

  syncScrubberMeta();
  syncPivotOverlay();
  syncTransportReadout();
  code(fx);

  sheetCache = null;
  if (activeTab === "sheet") buildSpriteSheet();
  else $("#d-sheet").replaceChildren();

  if (!d.open) d.showModal();
  syncUrlHash();
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function syncScrubberMeta() {
  if (!detail) return;
  const scrub = $("#d-scrub");
  scrub.max = String(Math.max(1, detail.totalFrames - 1));
  scrub.value = String(detail.frameIndex);

  const marks = $("#d-marks");
  marks.replaceChildren();
  if (detail.acted && detail.fx.mod.act) {
    const { from, totalSec } = detail.cycleSpan;
    const hits = detail.fx.mod.act.hits ?? [];
    const realOf = (tau) => {
      let extra = 0;
      for (const h of hits) if (h.t < tau) extra += h.stop ?? 0;
      return clamp01((tau - from + extra) / totalSec);
    };
    if (from < -0.01) {
      const releaseTick = el("span", { className: "scrub-tick", title: "Effect release (t = 0)" });
      releaseTick.style.left = `${(realOf(0) * 100).toFixed(1)}%`;
      marks.append(releaseTick);
    }
    for (const h of hits) {
      const tick = el("span", { className: "scrub-tick hit", title: `Hit at ${h.t}s` });
      tick.style.left = `${(realOf(h.t) * 100).toFixed(1)}%`;
      marks.append(tick);
    }
  }
}

function syncPivotOverlay() {
  const mark = $("#d-pivot-mark");
  if (!detail || !showPivot) {
    mark.hidden = true;
    return;
  }
  mark.hidden = false;
  mark.style.left = `${((detail.x / detail.W) * 100).toFixed(2)}%`;
  mark.style.top = `${((detail.y / detail.H) * 100).toFixed(2)}%`;
}

function syncTransportReadout() {
  if (!detail) return;
  $("#d-scrub").value = String(detail.frameIndex);
  $("#d-time").textContent = `f ${detail.frameIndex + 1}/${detail.totalFrames} · ${detail.displayTime}`;
  $("#d-freeze-badge").hidden = !detail.isFrozen;
}

function renderPaletteRamp() {
  const rampBox = $("#d-ramp");
  if (!detail) return;
  const key = $("#d-pal").value;
  const colors = (key && ALL_PALS[key]) || detail.fx.meta.options?.palette || GOTHIC_PAL.crimsonVelvet;
  rampBox.replaceChildren(...colors.map((hexColor) => {
    const s = el("span", { title: String(hexColor) });
    s.style.background = String(hexColor);
    return s;
  }));
}

function actFacts(mod) {
  const k = mod.act.poses, lead = Math.max(0, -k[0][0]), end = k[k.length - 1][0] - mod.meta.duration;
  const hits = (mod.act.hits ?? []).filter((h) => h.stop);
  const parts = [];
  if (lead > 0) parts.push(`${lead.toFixed(2)}s wind-up`);
  if (hits.length) parts.push(`${hits.length === 1 ? `${Math.round(hits[0].stop * 1000)}ms freeze` : `${hits.length} freezes`}`);
  if (!mod.meta.loop && end > 0.02) parts.push(`${end.toFixed(2)}s recovery`);
  return parts.join(", ") || "choreographed rig";
}

function btn(label, fn, on, group) {
  const b = el("button", { className: "btn", type: "button", textContent: label });
  b.setAttribute("aria-pressed", String(!!on));
  b.addEventListener("click", () => {
    if (group) b.parentElement.querySelectorAll(".btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    fn();
  });
  return b;
}

function code(fx) {
  const v = fx.id.split("/")[1].replace(/-(\w)/g, (_, c) => c.toUpperCase());
  const palKey = $("#d-pal").value;
  const isGothic = palKey && Object.prototype.hasOwnProperty.call(GOTHIC_PAL, palKey);
  const opts = {
    x: 160,
    y: 120,
    ...(palKey ? { palette: `${isGothic ? "GOTHIC_PAL" : "PAL"}.${palKey}` } : {}),
    ...(detail.flip ? { flip: true } : {}),
    ...(detail.opts.seed ? { seed: detail.opts.seed } : {}),
  };
  const acted = !!fx.mod.act && detail.actor;
  const make = acted ? "createAct" : "createFx";
  const coreImports = ["createFrame", make, "composite", ...(palKey && !isGothic ? ["PAL"] : [])].join(", ");
  const optsStr = JSON.stringify(opts)
    .replace(/"(GOTHIC_PAL|PAL)\.(\w+)"/, "$1.$2")
    .replace(/"(\w+)":/g, "$1: ")
    .replace(/,/g, ", ");

  $("#d-code").textContent = [
    `import { ${coreImports} } from "./src/core/index.js";`,
    ...(isGothic ? [`import { GOTHIC_PAL } from "./dark-fantasy-love/fx/index.js";`] : []),
    `import * as ${v} from "./dark-fantasy-love/fx/${fx.id}.js";`,
    ``,
    `const frame = createFrame(320, 180);`,
    `const fx = ${make}(${v}, ${optsStr});`,
    ``,
    `// every tick`,
    `fx.update(dt);`,
    `fx.draw(frame);          // color + light buffers`,
    `composite(frame, imageData.data, null);`,
    ...(fx.mod.act ? [``, `// custom rig? read timing from ${v}.act`] : []),
  ].join("\n");
  $("#d-src").href = `../fx/${fx.id}.js`;
}

function buildSpriteSheet() {
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
      app: "https://github.com/patch-gg/pixelfx",
      version: "1",
      image: `${name}.png`,
      format: "RGBA8888",
      size: { w: cols * w, h: rows * h },
      scale: "1",
      frameTags: [{ name, from: 0, to: n - 1, direction: "forward" }],
      pixelfx: {
        id: fx.id,
        name: m.name,
        fps: m.fps,
        loop: m.loop,
        frames: n,
        frameSize: [w, h],
        pivot: m.origin,
        columns: cols,
        ...(fx.mod.act ? { act: actTiming(fx.mod) } : {}),
      },
    },
  };

  const dataUrl = cv.toDataURL("image/png");
  const k = Math.max(1, Math.min(3, Math.floor(720 / (cols * w))));
  const pic = el("img", {
    src: dataUrl,
    alt: `${m.name} sprite sheet`,
    width: cols * w * k,
    height: rows * h * k,
  });
  const cli = `node dark-fantasy-love/tools/render.mjs ${fx.id} --sheet`;
  $("#d-sheet").replaceChildren(
    el("div", { className: "sheetout-frame" }, pic),
    el("p", {
      textContent: `${n} frames (${w} × ${h} px, ${cols} cols @ ${m.fps} fps). Pre-baked in dark-fantasy-love/sheets/${fx.id}.png or CLI: ${cli}`,
    }),
  );

  sheetCache = { name, dataUrl, atlas, cli };
  return sheetCache;
}

function downloadBlob(filename, href) {
  const a = el("a", { href, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
}

function setExportTab(tab) {
  activeTab = tab;
  const isCode = tab === "code";
  $("#tab-code").setAttribute("aria-selected", String(isCode));
  $("#tab-sheet").setAttribute("aria-selected", String(!isCode));
  $("#pane-code").hidden = !isCode;
  $("#pane-sheet").hidden = isCode;
  $("#d-copy").textContent = isCode ? "copy" : "copy cli";
  if (!isCode && !sheetCache && detail) buildSpriteSheet();
}

function navigateDetail(dir) {
  if (!detail) return;
  const list = visibleEffects();
  if (list.length <= 1) return;
  const idx = Math.max(0, list.indexOf(detail.fx));
  openDetail(list[(idx + dir + list.length) % list.length]);
}

function setDetailPlaying(playing) {
  if (!detail) return;
  detail.playing = playing;
  $("#d-play").setAttribute("aria-pressed", String(playing));
  $("#d-play").textContent = playing ? "pause" : "play";
}

function stepDetailFrame(delta) {
  if (!detail) return;
  setDetailPlaying(false);
  const total = detail.totalFrames;
  const next = detail.fx.meta.loop
    ? (detail.frameIndex + delta + total) % total
    : Math.max(0, Math.min(total - 1, detail.frameIndex + delta));
  detail.seekFrame(next);
  syncTransportReadout();
}

function flashButtonText(button, label, revertLabel) {
  button.textContent = label;
  clearTimeout(button._timer);
  button._timer = setTimeout(() => (button.textContent = revertLabel), 1300);
}

function wireDetail() {
  const d = $("#detail");
  $("#d-close").addEventListener("click", () => d.close());
  d.addEventListener("close", () => {
    detail = null;
    syncUrlHash();
  });
  d.addEventListener("click", (e) => e.target === d && d.close());

  $("#d-cat-btn").addEventListener("click", () => {
    if (!detail) return;
    const cat = detail.fx.cat;
    d.close();
    setCat(cat);
  });

  $("#d-copy-id").addEventListener("click", async (e) => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.fx.id);
      flashButtonText(e.currentTarget, "copied", "copy id");
    } catch {
      flashButtonText(e.currentTarget, detail.fx.id, "copy id");
    }
  });

  $("#d-prev").addEventListener("click", () => navigateDetail(-1));
  $("#d-next").addEventListener("click", () => navigateDetail(1));

  $("#d-play").addEventListener("click", () => setDetailPlaying(!detail.playing));
  $("#d-step-prev").addEventListener("click", () => stepDetailFrame(-1));
  $("#d-step-next").addEventListener("click", () => stepDetailFrame(1));
  $("#d-again").addEventListener("click", () => {
    detail.restart();
    detail.render();
    syncTransportReadout();
  });

  $("#d-scrub").addEventListener("input", (e) => {
    if (!detail) return;
    setDetailPlaying(false);
    detail.seekFrame(+e.target.value);
    syncTransportReadout();
  });

  $("#d-flip").addEventListener("click", (e) => {
    detail.flip = !detail.flip;
    e.currentTarget.setAttribute("aria-pressed", String(detail.flip));
    detail.restart();
    detail.render();
    sheetCache = null;
    if (activeTab === "sheet") buildSpriteSheet();
    code(detail.fx);
    syncTransportReadout();
  });

  $("#d-actor").addEventListener("click", (e) => {
    detail.actor = !detail.actor;
    e.currentTarget.setAttribute("aria-pressed", String(detail.actor));
    if (detail.fx.mod.act) {
      detail.layout(detail.aspect, detail.pad);
      syncScrubberMeta();
      syncPivotOverlay();
    }
    detail.dirty = true;
    detail.render();
    code(detail.fx);
    syncTransportReadout();
  });

  $("#d-pivot").addEventListener("click", (e) => {
    showPivot = !showPivot;
    e.currentTarget.setAttribute("aria-pressed", String(showPivot));
    syncPivotOverlay();
  });

  $("#d-seed").addEventListener("click", () => {
    detail.opts.seed = 1 + Math.floor(Math.random() * 9999);
    $("#d-seed-val").textContent = `#${detail.opts.seed}`;
    detail.restart();
    detail.render();
    sheetCache = null;
    if (activeTab === "sheet") buildSpriteSheet();
    code(detail.fx);
    syncTransportReadout();
  });

  $("#d-pal").addEventListener("change", (e) => {
    if (e.target.value) detail.opts.palette = ALL_PALS[e.target.value];
    else delete detail.opts.palette;
    renderPaletteRamp();
    detail.restart();
    detail.render();
    sheetCache = null;
    if (activeTab === "sheet") buildSpriteSheet();
    code(detail.fx);
    syncTransportReadout();
  });

  $("#tab-code").addEventListener("click", () => setExportTab("code"));
  $("#tab-sheet").addEventListener("click", () => setExportTab("sheet"));

  $("#d-dl-png").addEventListener("click", () => {
    const s = sheetCache ?? buildSpriteSheet();
    if (s) downloadBlob(`${s.name}.png`, s.dataUrl);
  });

  $("#d-dl-json").addEventListener("click", () => {
    const s = sheetCache ?? buildSpriteSheet();
    if (!s) return;
    const blob = new Blob([JSON.stringify(s.atlas, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    downloadBlob(`${s.name}.json`, url);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  $("#d-copy").addEventListener("click", async (e) => {
    const btnEl = e.currentTarget;
    const baseLabel = activeTab === "code" ? "copy" : "copy cli";
    const text = activeTab === "code"
      ? $("#d-code").textContent
      : (sheetCache ?? buildSpriteSheet())?.cli ?? "";
    try {
      await navigator.clipboard.writeText(text);
      flashButtonText(btnEl, "copied", baseLabel);
    } catch {
      if (activeTab === "code") getSelection().selectAllChildren($("#d-code"));
      flashButtonText(btnEl, "selected", baseLabel);
    }
  });
}

function wireKeyboard() {
  addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    if (detail && $("#detail").open) {
      if (inInput && document.activeElement?.id !== "d-scrub") return;
      if (e.key === " " && document.activeElement?.tagName !== "BUTTON") {
        e.preventDefault();
        setDetailPlaying(!detail.playing);
      } else if (e.key === ",") {
        e.preventDefault();
        stepDetailFrame(-1);
      } else if (e.key === ".") {
        e.preventDefault();
        stepDetailFrame(1);
      } else if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        detail.restart();
        detail.render();
        syncTransportReadout();
      } else if ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        $("#d-flip").click();
      } else if ((e.key === "c" || e.key === "C") && !e.metaKey && !e.ctrlKey && !$("#d-actor").hidden) {
        e.preventDefault();
        $("#d-actor").click();
      } else if ((e.key === "p" || e.key === "P") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        $("#d-pivot").click();
      } else if (e.key === "ArrowLeft" && document.activeElement?.id !== "d-scrub") {
        e.preventDefault();
        navigateDetail(-1);
      } else if (e.key === "ArrowRight" && document.activeElement?.id !== "d-scrub") {
        e.preventDefault();
        navigateDetail(1);
      }
      return;
    }

    if (e.key === "/" && !inInput && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      $("#q").focus();
      $("#q").select();
    } else if (e.key === "Escape" && document.activeElement === $("#q") && $("#q").value) {
      e.preventDefault();
      resetAllFilters();
    }
  });
}

function applyHash() {
  const raw = decodeURIComponent(location.hash.slice(1));
  if (!raw) {
    if ($("#detail").open) $("#detail").close();
    setCat("all", { fromHash: true });
    return;
  }
  if (FX_BY_ID.has(raw)) {
    const fx = FX_BY_ID.get(raw);
    if (!detail || detail.fx !== fx) openDetail(fx);
    return;
  }
  if ($("#detail").open) $("#detail").close();
  setCat(raw, { fromHash: true });
}

async function probeArcanaLab() {
  if (location.protocol === "file:") return;
  try {
    const r = await fetch("../../labs/sanguine-arcana/index.html", { method: "HEAD" });
    if (r.ok) $("#pack-sa").hidden = false;
  } catch {
    // optional lab folder not present
  }
}

let last = performance.now();
function frameLoop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (detail) {
    if (detail.tick(dt)) syncTransportReadout();
  } else {
    for (const t of tiles) {
      if (t.visible && t.player && !t.fig.hidden && (!reduced || t.hover)) t.player.tick(dt);
    }
  }
  requestAnimationFrame(frameLoop);
}

build();
buildChips();
wireDetail();
wireKeyboard();

$("#q").addEventListener("input", (e) => {
  state.q = e.target.value;
  const has = state.q.length > 0;
  $("#q-clear").hidden = !has;
  $("#q-kbd").hidden = has;
  filter();
});
$("#q-clear").addEventListener("click", () => {
  state.q = "";
  $("#q").value = "";
  $("#q-clear").hidden = true;
  $("#q-kbd").hidden = false;
  filter();
  $("#q").focus();
});

document.querySelectorAll("#traits .seg-btn").forEach((b) => {
  b.addEventListener("click", () => setTrait(b.dataset.trait));
});

$("#reset-all").addEventListener("click", resetAllFilters);
$("#none-reset").addEventListener("click", resetAllFilters);
document.querySelectorAll(".chip-suggest").forEach((b) => {
  b.addEventListener("click", () => {
    state.q = b.dataset.q;
    $("#q").value = state.q;
    $("#q-clear").hidden = false;
    $("#q-kbd").hidden = true;
    setTrait("all");
    setCat("all");
  });
});

$("#g-bg").addEventListener("change", (e) => {
  state.gridBg = e.target.value;
  for (const t of tiles) {
    if (t.player) {
      t.player.setBg(state.gridBg === "auto" ? t.fx.meta.bg : state.gridBg);
      if (reduced || !t.visible) t.player.render();
    }
  }
});

applyHash();
addEventListener("hashchange", applyHash);
probeArcanaLab();
requestAnimationFrame(frameLoop);
