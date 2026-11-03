// Shonen Arts lab viewer: every technique playing live from procedural code, performed by the stock character when it has
// an act (wind-up, hit-stop, shake, a target that takes it). Imports only from src/core and local lab modules.

import { effects, groups } from "./fx/index.js";
import { createFrame, clearFrame, createFx, createAct, actBounds, actSpan, actTiming, composite, backdrop } from "../../src/core/index.js";
import { AZURE, VOLT, KI, ASH } from "./lib/shared.js";
import { viewRect } from "./lib/summon.js";

// "native" leaves every technique in its own colors; the rest recolor them all
const PALETTES = { native: null, azure: AZURE, volt: VOLT, ki: KI, ash: ASH };
const DEFAULT_PAL = "native";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, root = document) => root.querySelector(s);
function el(tag, props = {}, kids = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const k of [].concat(kids)) if (k != null && k !== false) e.append(k);
  return e;
}

const state = { zoom: 3, palette: DEFAULT_PAL, seed: 0, paused: reduced, body: true };
const tiles = [];

// a technique with an act gets a stage big enough for the whole performance; anything else its own canvas
// a technique with a camera plays on its whole world stage, and the camera picks what's seen
function stageOf(mod) {
  const meta = mod.meta;
  if (!mod.act || mod.camera) return { w: meta.size[0], h: meta.size[1], x: meta.origin[0], y: meta.origin[1] };
  const b = actBounds(mod), pad = 6;
  b.y1 = Math.min(b.y1, 22);
  return { w: b.x1 - b.x0 + pad * 2, h: b.y1 - b.y0 + pad * 2, x: pad - b.x0, y: pad - b.y0 };
}

const main = $("#main");
for (const g of groups) {
  const groupEntries = Object.entries(effects).filter(([id]) => id.startsWith(g.id + "/"));
  const row = el("div", { className: "tiles" });
  main.append(el("section", { id: g.id }, [
    el("div", { className: "section-head" }, [
      el("div", { className: "section-title-group" }, [
        el("h2", { textContent: g.name.toLowerCase() + "." }),
        el("p", { textContent: g.blurb }),
      ]),
      el("span", { className: "section-count", textContent: `${groupEntries.length}` }),
    ]),
    row,
  ]));

  for (const [id, mod] of groupEntries) {
    const meta = { fps: 30, bg: "dark", loop: false, duration: 1, tags: [], options: {}, ...mod.meta };
    const st = stageOf(mod);
    const canvas = el("canvas", { width: st.w, height: st.h });
    const well = el("div", { className: "stage-well" }, canvas);
    const cap = el("figcaption", {}, [
      el("div", { className: "cap-top" }, [
        el("b", { textContent: meta.name }),
        el("em", { textContent: `${meta.loop ? "loop" : "one-shot"} · ${meta.duration}s${mod.act ? " · acted" : ""}` }),
      ]),
      el("span", { textContent: meta.desc }),
    ]);
    const fig = el("figure", { className: "card-item", tabIndex: 0 }, [well, cap]);
    row.append(fig);

    const tile = {
      id, mod, meta, st, fig, canvas, ctx: canvas.getContext("2d"), acted: !!mod.act,
      frame: createFrame(st.w, st.h), img: new ImageData(st.w, st.h),
      bg: meta.bg === "none" ? null : backdrop(meta.bg, st.w, st.h, st.y),
      inst: null, hold: 0, buf: mod.camera ? el("canvas", { width: st.w, height: st.h }) : null,
    };
    fig.addEventListener("click", () => openDetail(tile));
    fig.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openDetail(tile)));
    tiles.push(tile);
  }
}

function makeInstance(tile, acted = tile.acted) {
  const { meta, st } = tile;
  return (acted ? createAct : createFx)(tile.mod, {
    x: st.x,
    y: st.y,
    seed: (meta.options.seed ?? 1) + state.seed,
    ...(state.palette === DEFAULT_PAL ? {} : { palette: PALETTES[state.palette] }),
  });
}
const finished = (tile, inst) => inst.done();

function start(tile) {
  tile.inst = makeInstance(tile);
  tile.hold = 0;
  // with reduced motion, show the technique at its peak rather than its empty first frame
  if (state.paused && reduced) for (let i = 0; i < 60; i++) tile.inst.update(1 / 30);
}

function drawInto(tile, inst, frame, img, ctx) {
  clearFrame(frame);
  if (tile.acted) inst.draw(frame, { body: state.body, target: state.body });
  else inst.draw(frame);
  composite(frame, img.data, tile.bg);
  const [sx, sy] = tile.acted ? inst.shake : [0, 0];
  if (!tile.mod.camera) {
    if (sx || sy) ctx.clearRect(0, 0, frame.w, frame.h);
    ctx.putImageData(img, sx, sy);
    return;
  }
  // the world frame goes to a buffer; the camera's view of it is scaled up to fill the stage, pixels kept square
  tile.buf.getContext("2d").putImageData(img, 0, 0);
  const v = viewRect(tile.mod.camera(inst.t), frame.w, frame.h, tile.st.x, tile.st.y), k = frame.w / v.sw;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#03050c";
  ctx.fillRect(0, 0, frame.w, frame.h);
  ctx.drawImage(tile.buf, v.sx, v.sy, v.sw, v.sh, sx * k, sy * k, frame.w, frame.h);
}
const paint = (t) => drawInto(t, t.inst, t.frame, t.img, t.ctx);

function resize() {
  main.dataset.zoom = String(state.zoom);
  for (const t of tiles) {
    t.canvas.style.width = t.st.w * state.zoom + "px";
    t.canvas.style.height = t.st.h * state.zoom + "px";
  }
}

const restartAll = () => tiles.forEach((t) => {
  start(t);
  paint(t);
});

// ---- palette & zoom segmented controls
const palSeg = $("#pal-seg");
for (const [key, ramp] of Object.entries(PALETTES)) {
  const dot = el("span", { className: "swatch-dot" });
  dot.style.background = ramp ? ramp[5] : "linear-gradient(135deg, #78cdff 50%, #a8dcff 50%)";
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

$("#body-btn").addEventListener("click", (e) => {
  state.body = !state.body;
  e.currentTarget.setAttribute("aria-pressed", String(state.body));
  tiles.forEach(paint);
  if (detail) renderDetail();
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

function frameCount(tile) {
  const m = tile.meta;
  if (!tile.acted) return Math.max(1, Math.round(m.duration * m.fps) + (m.loop ? 0 : 1));
  // an act runs from its first pose to its last, and every freeze adds to it
  const span = actSpan(tile.mod), end = m.loop ? m.duration : span.to;
  const stops = (tile.mod.act.hits ?? []).reduce((a, h) => a + (h.stop ?? 0), 0);
  return Math.max(2, Math.round((end - span.from + stops) * m.fps) + 1);
}

function openDetail(tile) {
  const d = $("#detail");
  const { meta, st } = tile;
  const cv = $("#d-canvas");
  cv.width = st.w;
  cv.height = st.h;
  const scale = Math.max(2, Math.min(4, Math.floor(720 / st.w)));
  cv.style.width = `${st.w * scale}px`;
  cv.style.height = `${st.h * scale}px`;

  const totalFrames = frameCount(tile);
  detail = {
    tile, cv, ctx: cv.getContext("2d"),
    frame: createFrame(st.w, st.h), img: new ImageData(st.w, st.h),
    inst: makeInstance(tile), playing: true, acc: 0, wait: 0, frameIndex: 0, totalFrames, sheet: null,
  };

  const idx = tiles.indexOf(tile);
  $("#d-id").textContent = tile.id;
  $("#d-pos").textContent = `${idx + 1} / ${tiles.length}`;
  $("#d-name").textContent = meta.name;
  $("#d-desc").textContent = meta.desc;
  const timing = tile.acted ? actTiming(tile.mod) : null;
  $("#d-facts").replaceChildren(
    ...[
      ["kind", meta.loop ? "seamless loop" : "one-shot"],
      ["effect", `${meta.duration}s @ ${meta.fps} fps · ${meta.size[0]} × ${meta.size[1]} px`],
      ...(timing ? [
        ["wind-up", `${timing.windup.toFixed(2)}s before release`],
        ["hits", timing.hits.map((h) => `${h.t.toFixed(2)}s${h.freeze ? ` (freeze ${h.freeze}s)` : ""}`).join(", ")],
        ["stage", `${st.w} × ${st.h} px, ${totalFrames}f`],
      ] : []),
      ["palette", state.palette],
    ].flatMap(([k, v]) => [el("dt", { textContent: k }), el("dd", { textContent: v })]),
  );

  const varName = tile.id.split("/")[1].replace(/-(\w)/g, (_, c) => c.toUpperCase());
  const seedOpt = state.seed ? `, seed: ${(meta.options.seed ?? 1) + state.seed}` : "";
  $("#d-code").textContent = [
    `import { createFrame, createFx, createAct, actTiming, composite } from "./src/core/index.js";`,
    `import * as ${varName} from "./labs/shonen-arts/fx/${tile.id}.js";`,
    ``,
    ...(tile.acted ? [
      `// performed by the stock character, with the target, freeze and shake:`,
      `const act = createAct(${varName}, { x: ${st.x}, y: ${st.y}${seedOpt} });`,
      `act.update(dt);`,
      `act.draw(frame);                  // then offset by act.shake`,
      ``,
      `// or the effect alone, on your own character:`,
      `const timing = actTiming(${varName}); // wind-up, hits, poses`,
    ] : []),
    `const fx = createFx(${varName}, { x: ${meta.origin[0]}, y: ${meta.origin[1]}${seedOpt} });`,
    `fx.update(dt);`,
    `fx.draw(frame);`,
    `composite(frame, imageData.data, null);`,
  ].join("\n");

  $("#d-scrub").max = String(Math.max(1, totalFrames - 1));
  $("#d-scrub").value = "0";
  setPlaying(true);
  renderDetail();
  syncDetailReadout();
  if (!d.open) d.showModal();
}

function renderDetail() {
  if (detail) drawInto(detail.tile, detail.inst, detail.frame, detail.img, detail.ctx);
}

function seekDetailFrame(target) {
  if (!detail) return;
  const clamped = Math.max(0, Math.min(detail.totalFrames - 1, target | 0));
  const step = 1 / detail.tile.meta.fps;
  detail.acc = 0;
  detail.wait = 0;
  if (clamped < detail.frameIndex) {
    detail.inst = makeInstance(detail.tile);
    detail.frameIndex = 0;
  }
  while (detail.frameIndex < clamped) {
    detail.inst.update(step);
    detail.frameIndex++;
  }
  renderDetail();
  syncDetailReadout();
}

function syncDetailReadout() {
  if (!detail) return;
  const m = detail.tile.meta, t = detail.inst.t;
  const shown = detail.tile.acted ? `${t < -0.004 ? "−" : "+"}${Math.abs(t).toFixed(2)}s` : `${(m.loop ? t % m.duration : Math.min(t, m.duration)).toFixed(2)}s`;
  $("#d-scrub").value = String(detail.frameIndex);
  $("#d-time").textContent = `f ${detail.frameIndex + 1}/${detail.totalFrames} · ${shown}${detail.inst.frozen ? " · freeze" : ""}`;
}

// the sprite sheet is the effect alone (no body, no target) on its own canvas: what a game drops on its own character
function buildDetailSheet() {
  if (!detail) return null;
  if (detail.sheet) return detail.sheet;
  const { tile } = detail, m = tile.meta, [w, h] = m.size;
  const n = Math.max(1, Math.round(m.duration * m.fps) + (m.loop ? 0 : 1));
  const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt((n * h) / w))));
  const rows = Math.ceil(n / cols);
  const cv = el("canvas", { width: cols * w, height: rows * h });
  const ctx = cv.getContext("2d");
  const frame = createFrame(w, h), img = ctx.createImageData(w, h);
  const inst = createFx(tile.mod, {
    x: m.origin[0], y: m.origin[1], seed: (m.options.seed ?? 1) + state.seed,
    ...(state.palette === DEFAULT_PAL ? {} : { palette: PALETTES[state.palette] }),
  });
  const name = tile.id.split("/")[1];
  const frames = [];

  for (let i = 0; i < n; i++) {
    if (i) inst.update(1 / m.fps);
    inst.draw(clearFrame(frame));
    composite(frame, img.data, null);
    const x = (i % cols) * w, y = Math.floor(i / cols) * h;
    ctx.putImageData(img, x, y);
    frames.push({
      filename: `${name} ${i}`, frame: { x, y, w, h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h }, duration: Math.round(1000 / m.fps),
    });
  }
  detail.sheet = {
    name,
    dataUrl: cv.toDataURL("image/png"),
    atlas: {
      frames,
      meta: {
        app: "https://github.com/patch-gg/pixelfx", version: "1", image: `${name}.png`, format: "RGBA8888",
        size: { w: cols * w, h: rows * h }, scale: "1",
        frameTags: [{ name, from: 0, to: n - 1, direction: "forward" }],
        pixelfx: {
          id: tile.id, name: m.name, fps: m.fps, loop: m.loop, frames: n, frameSize: [w, h], pivot: m.origin, columns: cols,
          ...(tile.acted ? { act: actTiming(tile.mod) } : {}),
        },
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

function setPlaying(on) {
  if (detail) detail.playing = on;
  $("#d-play").textContent = on ? "pause" : "play";
  $("#d-play").setAttribute("aria-pressed", String(on));
}

const dlg = $("#detail");
$("#d-close").addEventListener("click", () => dlg.close());
dlg.addEventListener("close", () => (detail = null));
dlg.addEventListener("click", (e) => e.target === dlg && dlg.close());

const step = (d) => {
  if (!detail) return;
  const idx = tiles.indexOf(detail.tile);
  openDetail(tiles[(idx + d + tiles.length) % tiles.length]);
};
$("#d-prev").addEventListener("click", () => step(-1));
$("#d-next").addEventListener("click", () => step(1));
$("#d-play").addEventListener("click", () => detail && setPlaying(!detail.playing));
$("#d-step-prev").addEventListener("click", () => {
  if (!detail) return;
  setPlaying(false);
  seekDetailFrame((detail.frameIndex - 1 + detail.totalFrames) % detail.totalFrames);
});
$("#d-step-next").addEventListener("click", () => {
  if (!detail) return;
  setPlaying(false);
  seekDetailFrame((detail.frameIndex + 1) % detail.totalFrames);
});
$("#d-replay").addEventListener("click", () => {
  if (!detail) return;
  detail.inst = makeInstance(detail.tile);
  detail.frameIndex = 0;
  detail.wait = 0;
  renderDetail();
  syncDetailReadout();
});
$("#d-scrub").addEventListener("input", (e) => {
  if (!detail) return;
  setPlaying(false);
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
  const click = (id) => (e.preventDefault(), $(id).click());
  if (e.key === " " && document.activeElement?.tagName !== "BUTTON") click("#d-play");
  else if (e.key === ",") click("#d-step-prev");
  else if (e.key === ".") click("#d-step-next");
  else if (e.key === "r" || e.key === "R") click("#d-replay");
  else if (e.key === "ArrowLeft") click("#d-prev");
  else if (e.key === "ArrowRight") click("#d-next");
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
    const m = detail.tile.meta, stp = 1 / m.fps;
    if (detail.playing) detail.acc = Math.min(detail.acc + dt, 0.25);
    let moved = false;
    while (detail.acc >= stp) {
      detail.acc -= stp;
      if (!m.loop && finished(detail.tile, detail.inst)) {
        detail.wait += stp;
        if (detail.wait > 0.7) {
          detail.inst = makeInstance(detail.tile);
          detail.frameIndex = 0;
          detail.wait = 0;
        }
      } else {
        detail.inst.update(stp);
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
      t.inst.update(dt);
      if (!t.meta.loop && finished(t, t.inst) && (t.hold += dt) > 0.9) start(t);
      paint(t);
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
