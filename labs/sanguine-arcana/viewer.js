// Sanguine Arcana lab viewer: every tarot card and omen playing live from procedural code.
// Imports only from src/core and local lab modules so the folder stays 100% self-contained.

import { effects, groups } from "./fx/index.js";
import { createFrame, clearFrame, createFx, composite, backdrop } from "../../src/core/index.js";
import { BLOOD, VIOLET } from "./lib/shared.js";

const PALETTES = {
  sanguine: BLOOD,
  violet: VIOLET,
  verdigris: ["#04100f", "#0a2420", "#0f4a3f", "#17806a", "#2fb394", "#6fe0bc", "#b6f5de", "#effff8"],
  ashen: ["#0c0b10", "#1d1b24", "#38343f", "#5a5566", "#827c90", "#aaa5b8", "#d3cfe0", "#f6f4fb"],
};

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, root = document) => root.querySelector(s);
function el(tag, props = {}, kids = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const k of [].concat(kids)) if (k != null && k !== false) e.append(k);
  return e;
}

const state = { zoom: 3, palette: "sanguine", seed: 0, paused: reduced };
const tiles = [];

const main = $("#main");
for (const g of groups) {
  const groupEntries = Object.entries(effects).filter(([id]) => id.startsWith(g.id + "/"));
  const row = el("div", { className: "tiles" });
  const sec = el("section", { id: g.id }, [
    el("div", { className: "section-head" }, [
      el("div", { className: "section-title-group" }, [
        el("h2", { textContent: g.name.toLowerCase() + "." }),
        el("p", { textContent: g.blurb }),
      ]),
      el("span", { className: "section-count", textContent: `${groupEntries.length}` }),
    ]),
    row,
  ]);
  main.append(sec);

  for (const [id, mod] of groupEntries) {
    const meta = { fps: 30, bg: "dark", loop: false, duration: 1, tags: [], options: {}, ...mod.meta };
    const [w, h] = meta.size;
    const canvas = el("canvas", { width: w, height: h });
    const well = el("div", { className: "stage-well" }, canvas);
    const cap = el("figcaption", {}, [
      el("div", { className: "cap-top" }, [
        el("b", { textContent: meta.name }),
        el("em", { textContent: `${meta.loop ? "loop" : "one-shot"} · ${meta.duration}s` }),
      ]),
      el("span", { textContent: meta.desc }),
    ]);
    const fig = el("figure", { className: "card-item", tabIndex: 0 }, [well, cap]);
    row.append(fig);

    const tile = {
      id, mod, meta, fig, canvas, ctx: canvas.getContext("2d"),
      frame: createFrame(w, h), img: new ImageData(w, h),
      bg: meta.bg === "none" ? null : backdrop(meta.bg, w, h, meta.origin[1]),
      fx: null, hold: 0,
    };
    fig.addEventListener("click", () => openDetail(tile));
    fig.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openDetail(tile)));
    fig.addEventListener("pointerenter", () => {
      if (!meta.loop && tile.fx?.done()) start(tile);
    });
    tiles.push(tile);
  }
}

function makeInstance(tile) {
  const { meta } = tile;
  const palette = PALETTES[state.palette];
  return createFx(tile.mod, {
    x: meta.origin[0],
    y: meta.origin[1],
    seed: (meta.options.seed ?? 1) + state.seed,
    ...(state.palette === "sanguine" ? {} : { palette }),
  });
}

function start(tile) {
  tile.fx = makeInstance(tile);
  tile.hold = 0;
  if (state.paused && reduced) tile.fx.update(tile.meta.duration * 0.4);
}

function resize() {
  main.dataset.zoom = String(state.zoom);
  for (const t of tiles) {
    t.canvas.style.width = t.meta.size[0] * state.zoom + "px";
    t.canvas.style.height = t.meta.size[1] * state.zoom + "px";
  }
}

function paint(t) {
  clearFrame(t.frame);
  t.fx.draw(t.frame);
  composite(t.frame, t.img.data, t.bg);
  t.ctx.putImageData(t.img, 0, 0);
}

const restartAll = () => tiles.forEach((t) => {
  start(t);
  paint(t);
});

// ---- palette & zoom segmented controls
const palSeg = $("#pal-seg");
for (const [key, ramp] of Object.entries(PALETTES)) {
  const dot = el("span", { className: "swatch-dot" });
  dot.style.background = ramp[5] ?? ramp[ramp.length - 2];
  const b = el("button", { className: "seg-btn", type: "button" }, [dot, key]);
  b.setAttribute("aria-pressed", String(key === state.palette));
  b.addEventListener("click", () => {
    state.palette = key;
    palSeg.querySelectorAll(".seg-btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    restartAll();
    if (detail) openDetail(detail.tile);
  });
  palSeg.append(b);
}

document.querySelectorAll("#zoom-seg .seg-btn").forEach((b) => {
  b.addEventListener("click", () => {
    state.zoom = +b.dataset.zoom;
    document.querySelectorAll("#zoom-seg .seg-btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    resize();
  });
});

$("#seed-btn").addEventListener("click", () => {
  state.seed = (state.seed + 17) % 1000;
  $("#seed-val").textContent = `#${state.seed}`;
  restartAll();
  if (detail) openDetail(detail.tile);
});

$("#restart").addEventListener("click", restartAll);
$("#pause").addEventListener("click", (e) => {
  state.paused = !state.paused;
  e.currentTarget.textContent = state.paused ? "play" : "pause";
  e.currentTarget.setAttribute("aria-pressed", String(state.paused));
});
$("#pause").textContent = state.paused ? "play" : "pause";
$("#pause").setAttribute("aria-pressed", String(state.paused));

// ---- detail inspector with frame scrubbing & sprite-sheet export
let detail = null;

function openDetail(tile) {
  const d = $("#detail");
  const { meta } = tile;
  const [w, h] = meta.size;
  const cv = $("#d-canvas");
  cv.width = w;
  cv.height = h;
  const scale = Math.max(2, Math.min(4, Math.floor(340 / Math.max(w, h * 0.75))));
  cv.style.width = `${w * scale}px`;
  cv.style.height = `${h * scale}px`;

  const totalFrames = Math.max(1, Math.round(meta.duration * meta.fps) + (meta.loop ? 0 : 1));
  detail = {
    tile,
    cv,
    ctx: cv.getContext("2d"),
    frame: createFrame(w, h),
    img: new ImageData(w, h),
    bg: tile.bg,
    fx: makeInstance(tile),
    playing: true,
    acc: 0,
    wait: 0,
    frameIndex: 0,
    totalFrames,
    sheet: null,
  };

  const idx = tiles.indexOf(tile);
  $("#d-id").textContent = tile.id;
  $("#d-pos").textContent = `${idx + 1} / ${tiles.length}`;
  $("#d-name").textContent = meta.name;
  $("#d-desc").textContent = meta.desc;
  $("#d-facts").replaceChildren(
    ...[
      ["kind", meta.loop ? "seamless loop" : "one-shot omen"],
      ["timing", `${meta.duration}s · ${totalFrames}f @ ${meta.fps} fps`],
      ["canvas", `${w} × ${h} px (origin ${meta.origin[0]}, ${meta.origin[1]})`],
      ["palette", state.palette],
    ].flatMap(([k, v]) => [el("dt", { textContent: k }), el("dd", { textContent: v })]),
  );

  const varName = tile.id.split("/")[1].replace(/-(\w)/g, (_, c) => c.toUpperCase());
  $("#d-code").textContent = [
    `import { createFrame, createFx, composite } from "./src/core/index.js";`,
    `import * as ${varName} from "./labs/sanguine-arcana/fx/${tile.id}.js";`,
    ``,
    `const frame = createFrame(${w}, ${h});`,
    `const fx = createFx(${varName}, { x: ${meta.origin[0]}, y: ${meta.origin[1]}${state.seed ? `, seed: ${(meta.options.seed ?? 1) + state.seed}` : ""} });`,
    ``,
    `fx.update(dt);`,
    `fx.draw(frame);`,
    `composite(frame, imageData.data, null);`,
  ].join("\n");

  $("#d-scrub").max = String(Math.max(1, totalFrames - 1));
  $("#d-scrub").value = "0";
  $("#d-play").textContent = "pause";
  $("#d-play").setAttribute("aria-pressed", "true");
  renderDetail();
  syncDetailReadout();
  if (!d.open) d.showModal();
}

function renderDetail() {
  if (!detail) return;
  clearFrame(detail.frame);
  detail.fx.draw(detail.frame);
  composite(detail.frame, detail.img.data, detail.bg);
  detail.ctx.putImageData(detail.img, 0, 0);
}

function seekDetailFrame(target) {
  if (!detail) return;
  const clamped = Math.max(0, Math.min(detail.totalFrames - 1, target | 0));
  const step = 1 / detail.tile.meta.fps;
  detail.acc = 0;
  detail.wait = 0;
  if (clamped < detail.frameIndex) {
    detail.fx = makeInstance(detail.tile);
    detail.frameIndex = 0;
  }
  while (detail.frameIndex < clamped) {
    detail.fx.update(step);
    detail.frameIndex++;
  }
  renderDetail();
  syncDetailReadout();
}

function syncDetailReadout() {
  if (!detail) return;
  const m = detail.tile.meta;
  const t = m.loop ? detail.fx.t % m.duration : Math.min(detail.fx.t, m.duration);
  $("#d-scrub").value = String(detail.frameIndex);
  $("#d-time").textContent = `f ${detail.frameIndex + 1}/${detail.totalFrames} · ${t.toFixed(2)}s`;
}

function buildDetailSheet() {
  if (!detail) return null;
  if (detail.sheet) return detail.sheet;
  const { tile, totalFrames: n } = detail;
  const m = tile.meta, [w, h] = m.size;
  const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt((n * h) / w))));
  const rows = Math.ceil(n / cols);
  const cv = el("canvas", { width: cols * w, height: rows * h });
  const ctx = cv.getContext("2d");
  const frame = createFrame(w, h), img = ctx.createImageData(w, h);
  const inst = makeInstance(tile);
  const name = tile.id.split("/")[1];
  const frames = [];

  for (let i = 0; i < n; i++) {
    if (i) inst.update(1 / m.fps);
    inst.draw(clearFrame(frame));
    composite(frame, img.data, null);
    const x = (i % cols) * w, y = Math.floor(i / cols) * h;
    ctx.putImageData(img, x, y);
    frames.push({
      filename: `${name} ${i}`,
      frame: { x, y, w, h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h },
      sourceSize: { w, h },
      duration: Math.round(1000 / m.fps),
    });
  }
  detail.sheet = {
    name,
    dataUrl: cv.toDataURL("image/png"),
    atlas: {
      frames,
      meta: {
        app: "https://github.com/patch-gg/pixelfx",
        version: "1",
        image: `${name}.png`,
        format: "RGBA8888",
        size: { w: cols * w, h: rows * h },
        scale: "1",
        frameTags: [{ name, from: 0, to: n - 1, direction: "forward" }],
        pixelfx: { id: tile.id, name: m.name, fps: m.fps, loop: m.loop, frames: n, frameSize: [w, h], pivot: m.origin, columns: cols },
      },
    },
  };
  return detail.sheet;
}

function downloadFile(filename, href) {
  const a = el("a", { href, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
}

const dlg = $("#detail");
$("#d-close").addEventListener("click", () => dlg.close());
dlg.addEventListener("close", () => (detail = null));
dlg.addEventListener("click", (e) => e.target === dlg && dlg.close());

$("#d-prev").addEventListener("click", () => {
  if (!detail) return;
  const idx = tiles.indexOf(detail.tile);
  openDetail(tiles[(idx - 1 + tiles.length) % tiles.length]);
});
$("#d-next").addEventListener("click", () => {
  if (!detail) return;
  const idx = tiles.indexOf(detail.tile);
  openDetail(tiles[(idx + 1) % tiles.length]);
});
$("#d-play").addEventListener("click", () => {
  if (!detail) return;
  detail.playing = !detail.playing;
  $("#d-play").textContent = detail.playing ? "pause" : "play";
  $("#d-play").setAttribute("aria-pressed", String(detail.playing));
});
$("#d-step-prev").addEventListener("click", () => {
  if (!detail) return;
  detail.playing = false;
  $("#d-play").textContent = "play";
  $("#d-play").setAttribute("aria-pressed", "false");
  seekDetailFrame((detail.frameIndex - 1 + detail.totalFrames) % detail.totalFrames);
});
$("#d-step-next").addEventListener("click", () => {
  if (!detail) return;
  detail.playing = false;
  $("#d-play").textContent = "play";
  $("#d-play").setAttribute("aria-pressed", "false");
  seekDetailFrame((detail.frameIndex + 1) % detail.totalFrames);
});
$("#d-replay").addEventListener("click", () => {
  if (!detail) return;
  detail.fx = makeInstance(detail.tile);
  detail.frameIndex = 0;
  detail.wait = 0;
  renderDetail();
  syncDetailReadout();
});
$("#d-scrub").addEventListener("input", (e) => {
  if (!detail) return;
  detail.playing = false;
  $("#d-play").textContent = "play";
  $("#d-play").setAttribute("aria-pressed", "false");
  seekDetailFrame(+e.target.value);
});
$("#d-dl-png").addEventListener("click", () => {
  const s = buildDetailSheet();
  if (s) downloadFile(`${s.name}.png`, s.dataUrl);
});
$("#d-dl-json").addEventListener("click", () => {
  const s = buildDetailSheet();
  if (!s) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(s.atlas, null, 2)], { type: "application/json" }));
  downloadFile(`${s.name}.json`, url);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});
$("#d-copy").addEventListener("click", async (e) => {
  const b = e.currentTarget;
  try {
    await navigator.clipboard.writeText($("#d-code").textContent);
    b.textContent = "copied";
  } catch {
    b.textContent = "selected";
  }
  setTimeout(() => (b.textContent = "copy"), 1300);
});

addEventListener("keydown", (e) => {
  if (!detail || !dlg.open) return;
  if (document.activeElement?.id === "d-scrub" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
  if (e.key === " " && document.activeElement?.tagName !== "BUTTON") {
    e.preventDefault();
    $("#d-play").click();
  } else if (e.key === ",") {
    e.preventDefault();
    $("#d-step-prev").click();
  } else if (e.key === ".") {
    e.preventDefault();
    $("#d-step-next").click();
  } else if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    $("#d-replay").click();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    $("#d-prev").click();
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    $("#d-next").click();
  }
});

// deep links, and the go-to-anything palette landing here
function openFromHash() {
  const raw = decodeURIComponent(location.hash.slice(1));
  const tile = tiles.find((t) => t.id === raw);
  if (tile) openDetail(tile);
  else if (raw) document.getElementById(raw)?.scrollIntoView();
}
addEventListener("hashchange", openFromHash);
addEventListener("pixelfx:open", (e) => {
  const tile = tiles.find((t) => t.id === e.detail.id);
  if (tile) openDetail(tile);
});
addEventListener("pixelfx:jump", (e) => {
  if (dlg.open) dlg.close();
  if (e.detail.id) document.getElementById(e.detail.id)?.scrollIntoView();
  else scrollTo(0, 0);
});
setTimeout(openFromHash);

resize();
restartAll();
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (detail && dlg.open) {
    const m = detail.tile.meta, step = 1 / m.fps;
    if (detail.playing) detail.acc = Math.min(detail.acc + dt, 0.25);
    let moved = false;
    while (detail.acc >= step) {
      detail.acc -= step;
      if (!m.loop && detail.fx.done()) {
        detail.wait += step;
        if (detail.wait > 0.7) {
          detail.fx = makeInstance(detail.tile);
          detail.frameIndex = 0;
          detail.wait = 0;
        }
      } else {
        detail.fx.update(step);
        detail.frameIndex = m.loop ? (detail.frameIndex + 1) % detail.totalFrames : Math.min(detail.frameIndex + 1, detail.totalFrames - 1);
      }
      moved = true;
    }
    if (moved) {
      renderDetail();
      syncDetailReadout();
    }
  } else if (!state.paused) {
    for (const t of tiles) {
      t.fx.update(dt);
      if (t.fx.done() && !t.meta.loop && (t.hold += dt) > 0.9) start(t);
      paint(t);
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
