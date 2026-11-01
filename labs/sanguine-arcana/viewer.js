// The lab's own viewer: every effect playing live from its code. No dependency on the main gallery.

import { effects, groups } from "./fx/index.js";
import { createFrame, clearFrame, createFx, composite, backdrop } from "../../src/core/index.js";
import { BLOOD, VIOLET } from "./lib/shared.js";

const PALETTES = {
  Sanguine: BLOOD,
  Violet: VIOLET,
  Verdigris: ["#04100f", "#0a2420", "#0f4a3f", "#17806a", "#2fb394", "#6fe0bc", "#b6f5de", "#effff8"],
  Ashen: ["#0c0b10", "#1d1b24", "#38343f", "#5a5566", "#827c90", "#aaa5b8", "#d3cfe0", "#f6f4fb"],
};
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s) => document.querySelector(s);
const state = { zoom: 3, palette: "Sanguine", seed: 0, paused: reduced };

const tiles = [];
const main = $("#main");
for (const g of groups) {
  const sec = Object.assign(document.createElement("section"), { innerHTML: `<h2>${g.name}</h2><p>${g.blurb}</p>` });
  const row = Object.assign(document.createElement("div"), { className: "tiles" });
  sec.append(row);
  main.append(sec);
  for (const [id, mod] of Object.entries(effects)) {
    if (!id.startsWith(g.id + "/")) continue;
    const meta = { fps: 30, bg: "dark", loop: false, duration: 1, tags: [], options: {}, ...mod.meta };
    const [w, h] = meta.size;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const btn = Object.assign(document.createElement("button"), { className: "stage", type: "button", title: "Replay" });
    btn.setAttribute("aria-label", `Replay ${meta.name}`);
    btn.append(canvas);
    const cap = Object.assign(document.createElement("figcaption"), {
      innerHTML: `<b></b><em>${meta.loop ? "loop" : "one-shot"} · ${meta.duration}s</em><span></span>`,
    });
    cap.querySelector("b").textContent = meta.name;
    cap.querySelector("span").textContent = meta.desc;
    const fig = document.createElement("figure");
    fig.append(btn, cap);
    row.append(fig);
    const tile = { id, mod, meta, canvas, ctx: canvas.getContext("2d"), frame: createFrame(w, h), img: new ImageData(w, h), bg: meta.bg === "none" ? null : backdrop(meta.bg, w, h, meta.origin[1]), fx: null, hold: 0 };
    btn.addEventListener("click", () => start(tile));
    tiles.push(tile);
  }
}

function start(tile) {
  const { meta } = tile;
  const palette = PALETTES[state.palette];
  // an explicit `palette: undefined` would override the effect's own default, so only pass it when it's a swap
  tile.fx = createFx(tile.mod, { x: meta.origin[0], y: meta.origin[1], seed: (meta.options.seed ?? 1) + state.seed, ...(palette === BLOOD ? {} : { palette }) });
  tile.hold = 0;
  if (state.paused && reduced) tile.fx.update(meta.duration * 0.4);   // a still pose, for those who asked for less motion
}
function resize() {
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
const restartAll = () => tiles.forEach(start);

$("#palette").innerHTML = Object.keys(PALETTES).map((k) => `<option>${k}</option>`).join("");
$("#zoom").addEventListener("change", (e) => { state.zoom = +e.target.value; resize(); });
$("#palette").addEventListener("change", (e) => { state.palette = e.target.value; restartAll(); });
$("#seed").addEventListener("change", (e) => { state.seed = Math.max(0, Math.floor(+e.target.value || 0)); restartAll(); });
$("#restart").addEventListener("click", restartAll);
$("#pause").addEventListener("click", (e) => {
  state.paused = !state.paused;
  e.target.textContent = state.paused ? "Play" : "Pause";
  e.target.setAttribute("aria-pressed", String(state.paused));
});
$("#pause").textContent = state.paused ? "Play" : "Pause";
$("#pause").setAttribute("aria-pressed", String(state.paused));

resize();
restartAll();
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  for (const t of tiles) {
    if (!state.paused) {
      t.fx.update(dt);
      // a one-shot rests on its empty last frame for a moment, then plays again
      if (t.fx.done() && !t.meta.loop && (t.hold += dt) > 0.9) start(t);
    }
    paint(t);
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
