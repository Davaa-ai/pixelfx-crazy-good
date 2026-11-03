// Attachment Hearts Sanctuary Gallery:
// Top 4-column panoramic altar plays all 4 hovering hearts side-by-side (with live Surge trigger),
// backed by the full pixelfx category grid, recoloring, slow-mo inspector, and sprite-sheet exporter.

import { effects, categories, HEART_PAL } from "../fx/index.js";
import { createFrame, clearFrame, createFx, composite, backdrop, PAL, BACKDROPS } from "../../src/core/index.js";

const ALL_PALS = { ...HEART_PAL, ...PAL };
const FX = Object.entries(effects).map(([id, mod]) => {
  const meta = { fps: 30, bg: "dark", loop: false, duration: 1, tags: [], options: {}, ...mod.meta };
  return { id, cat: id.split("/")[0], name: meta.name, mod: { ...mod, meta }, meta };
});
const byId = Object.fromEntries(FX.map((f) => [f.id, f]));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s) => document.querySelector(s);
function el(tag, props = {}, kids = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const k of [].concat(kids)) e.append(k);
  return e;
}

class Player {
  constructor(canvas, fx, aspect, pad, onOneShotDone = null) {
    Object.assign(this, { canvas, fx, ctx: canvas.getContext("2d"), opts: {}, flip: false, speed: 1, playing: true, onOneShotDone });
    this.bg = fx.meta.bg;
    this.layout(aspect, pad);
  }
  setFx(fx) {
    this.fx = fx;
    this.bg = fx.meta.bg;
    this.layout(this.aspect, this.pad);
  }
  layout(aspect, pad) {
    Object.assign(this, { aspect, pad });
    const [w, h] = this.fx.meta.size, [ox, oy] = this.fx.meta.origin;
    this.W = Math.ceil(Math.max(w * pad, h * pad * aspect));
    this.H = Math.ceil(this.W / aspect);
    this.x = Math.floor((this.W - w) / 2) + ox;
    this.y = Math.floor((this.H - h) / 2) + oy;
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    const shown = this.canvas.getBoundingClientRect().width * devicePixelRatio;
    this.canvas.style.imageRendering = shown && shown < this.W ? "auto" : "";
    this.frame = createFrame(this.W, this.H);
    this.img = this.ctx.createImageData(this.W, this.H);
    this.setBg(this.bg);
    this.restart();
  }
  setBg(kind) {
    this.bg = kind;
    this.bgBuf = kind === "none" ? null : backdrop(kind, this.W, this.H, this.y);
    this.dirty = true;
  }
  restart() {
    this.inst = createFx(this.fx.mod, { x: this.x, y: this.y, flip: this.flip, ...this.opts });
    this.acc = 0;
    this.wait = 0;
    this.dirty = true;
  }
  tick(dt) {
    const m = this.fx.meta, step = 1 / m.fps;
    if (this.playing) this.acc = Math.min(this.acc + dt * this.speed, 0.25);
    let moved = false;
    while (this.acc >= step) {
      this.acc -= step;
      if (!m.loop && this.inst.t >= m.duration) {
        if (this.onOneShotDone) {
          this.onOneShotDone();
          return;
        }
        this.wait += step;
        if (this.wait > 0.45) this.restart();
      } else this.inst.update(step);
      moved = true;
    }
    if (moved || this.dirty) this.render();
  }
  seek(t) {
    this.restart();
    this.inst.update(t);
    this.render();
  }
  render() {
    const f = clearFrame(this.frame);
    this.inst.draw(f, "back");
    this.inst.draw(f, "front");
    composite(f, this.img.data, this.bgBuf);
    this.ctx.putImageData(this.img, 0, 0);
    this.dirty = false;
  }
}

// ---- 4-Heart Sanctuary Hero Lineup
const heroPlayers = [];
const SURGE_PAIRS = {
  magnetic: ["magnetic/magnetic-heart", "magnetic/magnetic-pull"],
  armored:  ["armored/armored-heart",  "armored/armor-clamp"],
  polar:    ["polar/polar-heart",      "polar/thermal-clash"],
  luminous: ["luminous/luminous-heart", "luminous/radiant-bloom"],
};

function buildLineup() {
  const box = $("#lineup");
  for (const c of categories) {
    const [loopId, surgeId] = SURGE_PAIRS[c.id];
    const loopFx = byId[loopId], surgeFx = byId[surgeId];
    const cv = el("canvas", { ariaLabel: loopFx.name });
    const surgeBtn = el("button", { className: "surge-btn", type: "button", textContent: "surge ✦" });
    const stage = el("div", { className: "relic-stage" }, [
      cv,
      el("span", { className: "relic-badge", textContent: c.style }),
    ]);
    const titleEl = el("b", { textContent: loopFx.name });
    const card = el("article", { className: "relic" }, [
      stage,
      el("div", { className: "relic-foot" }, [
        el("div", { className: "relic-mn", textContent: c.mn }),
        el("div", { className: "relic-row" }, [titleEl, surgeBtn]),
      ]),
    ]);
    card.style.setProperty("--accent", c.accent);
    box.append(card);

    let activeFx = loopFx;
    const player = new Player(cv, loopFx, 11 / 10, 1.06, () => {
      activeFx = loopFx;
      surgeBtn.dataset.active = "false";
      surgeBtn.textContent = "surge ✦";
      player.setFx(loopFx);
      player.setBg("none");
    });
    player.setBg("none");
    if (reduced) player.seek(loopFx.meta.duration * 0.25);

    stage.addEventListener("click", () => openDetail(activeFx));
    titleEl.addEventListener("click", () => openDetail(loopFx));
    surgeBtn.addEventListener("click", () => {
      activeFx = surgeFx;
      surgeBtn.dataset.active = "true";
      surgeBtn.textContent = "surging…";
      player.setFx(surgeFx);
      player.setBg("none");
    });

    heroPlayers.push(player);
  }
}

// ---- Full Catalog Grid
const tiles = [];
const sections = [];
function buildGrid() {
  $("#count").textContent = FX.length;
  const main = $("#grid");
  for (const c of categories) {
    const list = FX.filter((f) => f.cat === c.id);
    if (!list.length) continue;
    const grid = el("div", { className: "grid" });
    const sec = el("section", { id: c.id }, [
      el("div", { className: "section-head" }, [
        el("h2", { textContent: c.name + "." }),
        el("span", { className: "mn-tag", textContent: `${c.mn} · ${c.style}` }),
        el("p", { textContent: c.blurb }),
      ]),
      grid,
    ]);
    sections.push({ c, sec, list });
    for (const fx of list) {
      const cv = el("canvas", { ariaLabel: fx.name });
      const fig = el("figure", { className: "tile", tabIndex: 0 }, [
        el("div", { className: "stage" }, cv),
        el("figcaption", {}, [
          el("b", { textContent: fx.name }),
          el("small", { textContent: fx.meta.loop ? "hover loop" : `surge · ${+fx.meta.duration.toFixed(1)}s` }),
        ]),
      ]);
      const t = { fx, fig, cv, player: null, visible: false, hover: false };
      fig.addEventListener("click", () => openDetail(fx));
      fig.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openDetail(fx)));
      fig.addEventListener("pointerenter", () => (t.hover = true));
      fig.addEventListener("pointerleave", () => (t.hover = false));
      grid.append(fig);
      tiles.push(t);
    }
    main.append(sec);
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const t = tiles.find((x) => x.fig === e.target);
      t.visible = e.isIntersecting;
      if (t.visible && !t.player) {
        t.player = new Player(t.cv, t.fx, 6 / 5, 1.15);
        if (reduced) t.player.seek(t.fx.meta.duration * 0.4);
      }
    }
  }, { rootMargin: "200px" });
  tiles.forEach((t) => io.observe(t.fig));
}

// ---- Filters
const state = { cat: "all", q: "" };
function chips() {
  const box = $("#chips");
  const mk = (id, label, n) => {
    const b = el("button", { className: "chip", type: "button" }, [label, el("span", { textContent: n })]);
    b.dataset.cat = id;
    b.addEventListener("click", () => setCat(id));
    box.append(b);
  };
  mk("all", "all", FX.length);
  mk("loops", "hovering loops", FX.filter((f) => f.meta.loop).length);
  mk("surges", "awakening surges", FX.filter((f) => !f.meta.loop).length);
  for (const s of sections) mk(s.c.id, s.c.name, s.list.length);
}
function setCat(id, fromHash = false) {
  const valid = ["all", "loops", "surges", ...sections.map((s) => s.c.id)];
  state.cat = valid.includes(id) ? id : "all";
  document.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === state.cat)));
  if (!fromHash) history.replaceState(null, "", state.cat === "all" ? location.pathname : "#" + state.cat);
  filter();
}
function filter() {
  const q = state.q.trim().toLowerCase();
  let shown = 0;
  for (const s of sections) {
    let any = false;
    for (const fx of s.list) {
      const t = tiles.find((x) => x.fx === fx);
      const catOk =
        state.cat === "all" ||
        (state.cat === "loops" && fx.meta.loop) ||
        (state.cat === "surges" && !fx.meta.loop) ||
        state.cat === s.c.id;
      const hit = catOk && (!q || [fx.id, fx.name, fx.meta.desc, s.c.mn, s.c.style, ...fx.meta.tags].join(" ").toLowerCase().includes(q));
      t.fig.hidden = !hit;
      any ||= hit;
      shown += hit;
    }
    s.sec.hidden = !any;
  }
  $("#none").hidden = shown > 0;
}

// ---- Detail Modal
let detail = null;
function openDetail(fx) {
  const d = $("#detail");
  detail = new Player($("#big"), fx, 16 / 10, 1.35);
  const m = fx.meta;
  const catMeta = categories.find((c) => c.id === fx.cat);
  $("#d-name").textContent = m.name;
  $("#d-id").textContent = `${fx.id} · ${catMeta.mn} (${catMeta.style})`;
  $("#d-desc").textContent = m.desc;
  const frames = Math.round(m.duration * m.fps) + (m.loop ? 0 : 1);
  $("#d-facts").replaceChildren(
    ...[["kind", m.loop ? "seamless hovering loop" : "awakening surge (one-shot)"], ["length", `${+m.duration.toFixed(2)} s, ${frames} frames at ${m.fps} fps`], ["canvas", `${m.size[0]} × ${m.size[1]} px`], ["tags", m.tags.join(", ")]].flatMap(([k, v]) => [el("dt", { textContent: k }), el("dd", { textContent: v })]),
  );
  $("#d-bg").replaceChildren(...BACKDROPS.concat("none").map((b) => btn(b, () => detail.setBg(b), b === m.bg, "bg")));
  $("#d-speed").replaceChildren(...[0.25, 0.5, 1].map((s) => btn(`${s}×`, () => (detail.speed = s), s === 1, "speed")));
  const pal = $("#d-pal");
  pal.replaceChildren(
    el("option", { value: "", textContent: "its own" }),
    el("optgroup", { label: "attachment hearts" }, Object.keys(HEART_PAL).map((k) => el("option", { value: k, textContent: k }))),
    el("optgroup", { label: "pixelfx core" }, Object.keys(PAL).map((k) => el("option", { value: k, textContent: k }))),
  );
  pal.value = "";
  $("#d-flip").setAttribute("aria-pressed", "false");
  $("#d-play").setAttribute("aria-pressed", "true");
  $("#d-play").textContent = "pause";
  $("#d-sheet").replaceChildren();
  code(fx);
  d.showModal();
  d.scrollTop = 0;
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
  const opts = { x: 160, y: 150, ...(detail.opts.palette ? { palette: "[…]" } : {}), ...(detail.flip ? { flip: true } : {}) };
  $("#d-code").textContent = [
    `import { createFrame, createFx, composite } from "./src/core/index.js";`,
    `import * as ${v} from "./attachment-hearts/fx/${fx.id}.js";`,
    ``,
    `const frame = createFrame(320, 200);`,
    `const fx = createFx(${v}, ${JSON.stringify(opts).replace(/"\[…\]"/, "[…]").replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ")});`,
    ``,
    `// every tick`,
    `fx.update(dt);`,
    `fx.draw(frame);          // color + additive light buffers`,
    `composite(frame, imageData.data, null);`,
  ].join("\n");
  $("#d-src").href = `../fx/${fx.id}.js`;
}
function sheet() {
  const fx = detail.fx, m = fx.meta, [w, h] = m.size, n = Math.max(1, Math.round(m.duration * m.fps) + (m.loop ? 0 : 1));
  const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt((n * h) / w)))), rows = Math.ceil(n / cols);
  const cv = el("canvas", { width: cols * w, height: rows * h }), ctx = cv.getContext("2d");
  const frame = createFrame(w, h), img = ctx.createImageData(w, h);
  const inst = createFx(fx.mod, { x: m.origin[0], y: m.origin[1], ...detail.opts, flip: detail.flip });
  for (let i = 0; i < n; i++) {
    if (i) inst.update(1 / m.fps);
    inst.draw(clearFrame(frame));
    composite(frame, img.data, null);
    ctx.putImageData(img, (i % cols) * w, Math.floor(i / cols) * h);
  }
  const k = Math.max(1, Math.min(4, Math.floor(1100 / (cols * w))));
  const pic = el("img", { src: cv.toDataURL("image/png"), alt: `${m.name} sprite sheet`, width: cols * w * k, height: rows * h * k });
  $("#d-sheet").replaceChildren(pic, el("p", { textContent: `${n} frames of ${w} × ${h} px, ${cols} across, ${m.fps} fps, ${m.loop ? "loops" : "plays once"}. Pre-baked in attachment-hearts/sheets/${fx.id}.png or run: node attachment-hearts/tools/render.mjs ${fx.id} --sheet` }));
}
function wireDetail() {
  const d = $("#detail");
  $("#d-close").addEventListener("click", () => d.close());
  d.addEventListener("close", () => (detail = null));
  d.addEventListener("click", (e) => e.target === d && d.close());
  $("#d-play").addEventListener("click", (e) => {
    detail.playing = !detail.playing;
    e.target.setAttribute("aria-pressed", String(detail.playing));
    e.target.textContent = detail.playing ? "pause" : "play";
  });
  $("#d-again").addEventListener("click", () => detail.restart());
  $("#d-flip").addEventListener("click", (e) => {
    detail.flip = !detail.flip;
    e.target.setAttribute("aria-pressed", String(detail.flip));
    detail.restart();
    code(detail.fx);
  });
  $("#d-seed").addEventListener("click", () => {
    detail.opts.seed = 1 + Math.floor(Math.random() * 9999);
    detail.restart();
  });
  $("#d-pal").addEventListener("change", (e) => {
    if (e.target.value) detail.opts.palette = ALL_PALS[e.target.value];
    else delete detail.opts.palette;
    detail.restart();
    code(detail.fx);
  });
  $("#d-make").addEventListener("click", sheet);
  $("#d-copy").addEventListener("click", async (e) => {
    const text = $("#d-code").textContent;
    try {
      await navigator.clipboard.writeText(text);
      e.target.textContent = "copied";
    } catch {
      getSelection().selectAllChildren($("#d-code"));
      e.target.textContent = "selected";
    }
    setTimeout(() => (e.target.textContent = "copy"), 1400);
  });
}

let last = performance.now();
function frameLoop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (detail) {
    detail.tick(dt);
  } else {
    if (!reduced) for (const hp of heroPlayers) hp.tick(dt);
    for (const t of tiles) if (t.visible && t.player && !t.fig.hidden && (!reduced || t.hover)) t.player.tick(dt);
  }
  requestAnimationFrame(frameLoop);
}

buildLineup();
buildGrid();
chips();
wireDetail();
$("#q").addEventListener("input", (e) => {
  state.q = e.target.value;
  filter();
});
setCat(location.hash.slice(1) || "all", true);
addEventListener("hashchange", () => setCat(location.hash.slice(1) || "all", true));
requestAnimationFrame(frameLoop);
