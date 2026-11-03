// Moving between collections, on every page: a switcher, go-to-anything (Ctrl/Cmd+K), [ and ] for the neighbors, a next
// and previous at the end of each page, transitions that slide the way you're heading, and pages ready before you land.

import { COLLECTIONS, collectionUrl, collectionAt } from "./collections.js";
import { iconSvg } from "./icons.js";
import { searchable, score, termsOf } from "./search.js";

const RECENT_KEY = "pixelfx.recent";
const RECENT_MAX = 5;
const RESULT_MAX = 30;

function html(markup) {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
export const paletteKey = isMac ? "⌘K" : "Ctrl K";

function readRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) ?? [];
  } catch {
    return [];
  }
}

// the effects you opened last, wherever they were, offered first next time
export function remember(collection, id, name) {
  try {
    const next = [[collection, id, name], ...readRecent().filter(([c, i]) => c !== collection || i !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // private windows and blocked storage just don't remember
  }
}

// ---- which way a navigation is heading, so the page can slide that way
function headingFrom(fromUrl, toUrl) {
  const a = collectionAt(fromUrl), b = collectionAt(toUrl);
  if (!a || !b || a === b) return null;
  const from = COLLECTIONS.indexOf(a), to = COLLECTIONS.indexOf(b), last = COLLECTIONS.length - 1;
  // the list wraps, so stepping off either end still heads the way you pressed
  if (from === 0 && to === last) return "backward";
  if (from === last && to === 0) return "forward";
  return to > from ? "forward" : "backward";
}

// The rail stays put while the rest slides. It only carries the name during the crossing: a lasting name would float
// it above the inspector when that opens, and would keep the page out of the back/forward cache.
function holdFrame(on) {
  const el = document.querySelector(matchMedia("(max-width: 1023px)").matches ? ".top" : ".rail");
  if (el) el.style.viewTransitionName = on ? "coll-frame" : "";
}

// a crossing can be skipped, by a hidden tab or a slow page; that's not an error
function settle(vt) {
  for (const done of [vt.ready, vt.updateCallbackDone, vt.finished]) done?.catch(() => {});
}

function watchCrossings() {
  addEventListener("pageswap", (e) => {
    if (!e.viewTransition) return;
    const dir = e.activation?.entry?.url && headingFrom(location.href, e.activation.entry.url);
    if (dir) e.viewTransition.types.add(dir);
    holdFrame(true);
    settle(e.viewTransition);
  });
  addEventListener("pageshow", (e) => {
    if (e.persisted) holdFrame(false);
  });
  addEventListener("pagereveal", (e) => {
    if (!e.viewTransition) return;
    const from = window.navigation?.activation?.from?.url;
    const dir = from && headingFrom(from, location.href);
    if (dir) e.viewTransition.types.add(dir);
    holdFrame(true);
    settle(e.viewTransition);
    e.viewTransition.finished.catch(() => {}).finally(() => holdFrame(false));
  });
}

// the neighbors are fetched ahead; anything you point at is fully rendered before you click
function speculate(current) {
  if (!HTMLScriptElement.supports?.("speculationrules") || COLLECTIONS.length < 2) return;
  const i = COLLECTIONS.indexOf(current), n = COLLECTIONS.length;
  const near = [COLLECTIONS[(i + 1) % n], COLLECTIONS[(i - 1 + n) % n]].map((c) => collectionUrl(c));
  const rules = document.createElement("script");
  rules.type = "speculationrules";
  rules.textContent = JSON.stringify({
    prefetch: [{ urls: [...new Set(near)], eagerness: "eager" }],
    prerender: [{ where: { selector_matches: ".coll-link:not([aria-current]), .pager a" }, eagerness: "moderate" }],
  });
  document.head.append(rules);
}

function neighbor(current, step) {
  const n = COLLECTIONS.length, i = COLLECTIONS.indexOf(current);
  return COLLECTIONS[(i + step + n) % n];
}

// ---- the switcher
function mountSwitcher(host, current, { title, count }) {
  const menu = html(`
    <nav class="coll-menu" id="coll-menu" popover aria-label="Collections">
      <ul>${COLLECTIONS.map((c) => `
        <li><a class="coll-link" href="${collectionUrl(c)}"${c === current ? ' aria-current="page"' : ""}>
          <span class="coll-mark">${c.mark}</span>
          <span class="coll-text"><b>${esc(c.name)}</b><span>${esc(c.blurb)}</span></span>
          <span class="coll-n">${count(c.id) ?? ""}</span>
        </a></li>`).join("")}
      </ul>
      <p class="coll-foot">
        <button class="link-btn" type="button" data-palette>Go to anything <kbd>${paletteKey}</kbd></button>
        <span><kbd>[</kbd> <kbd>]</kbd> previous, next</span>
      </p>
    </nav>`);
  const button = html(`
    <button class="coll-btn" type="button" popovertarget="coll-menu" aria-label="${esc(title ?? current.name)}, switch collection" aria-expanded="false">
      <span class="coll-mark">${current.mark}</span>
      <span class="coll-title">${esc(title ?? "Collections")}</span>
      ${COLLECTIONS.length > 1 ? iconSvg("chevron") : ""}
    </button>`);
  host.append(button, menu);
  if (COLLECTIONS.length < 2) {
    button.removeAttribute("popovertarget");
    button.disabled = true;
    menu.remove();
    return;
  }

  // sits under its button, kept inside the window
  menu.addEventListener("beforetoggle", (e) => {
    if (e.newState !== "open") return;
    const r = button.getBoundingClientRect();
    menu.style.top = `${Math.round(r.bottom + 4)}px`;
    menu.style.left = `${Math.round(Math.max(8, Math.min(r.left, innerWidth - 348)))}px`;
  });
  menu.addEventListener("toggle", (e) => {
    button.setAttribute("aria-expanded", String(e.newState === "open"));
    if (e.newState === "open") menu.querySelector('[aria-current="page"]')?.focus();
  });
  menu.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const links = [...menu.querySelectorAll(".coll-link")], i = links.indexOf(document.activeElement);
    const next = e.key === "Home" ? 0 : e.key === "End" ? links.length - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
    links[next].focus();
  });
}

// ---- go to anything
function mountPalette(current, manifest) {
  const dlg = html(`
    <dialog class="cmd" id="cmd" aria-label="Go to anything" closedby="any">
      <div class="cmd-search">
        ${iconSvg("search")}
        <input id="cmd-q" type="search" placeholder="Go to any effect, section or collection" autocomplete="off" spellcheck="false" enterkeyhint="go"
          role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="cmd-list" aria-label="Go to anything">
        <kbd>Esc</kbd>
      </div>
      <div class="cmd-list" id="cmd-list" role="listbox" aria-label="Results"></div>
      <p class="cmd-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> go</span><span><kbd>${isMac ? "⌘" : "Ctrl"} Enter</kbd> new tab</span></p>
    </dialog>`);
  document.body.append(dlg);
  const q = dlg.querySelector("#cmd-q"), list = dlg.querySelector("#cmd-list");
  let items = [], active = 0, composing = false, loading = null, index = null;

  const byId = Object.fromEntries(COLLECTIONS.map((c) => [c.id, c]));

  const collectionItems = () => COLLECTIONS.map((c) => ({
    kind: "collection", col: c, name: c.name, detail: c.blurb, url: collectionUrl(c),
    s: searchable({ id: c.id, name: c.name, tags: c.blurb.split(/\W+/) }),
  }));

  const sectionItems = () => COLLECTIONS.flatMap((c) => (manifest[c.id]?.categories ?? []).map((cat) => ({
    kind: "section", col: c, id: cat.id, name: cat.name.charAt(0).toUpperCase() + cat.name.slice(1), detail: `Section in ${c.name}`, url: collectionUrl(c, `#${cat.id}`),
    s: searchable({ id: cat.id, name: cat.name, tags: cat.blurb.split(/\W+/) }),
  })));

  // the effect list is only worth fetching once someone opens this
  function loadIndex() {
    loading ??= import("./search-index.js").then(({ SEARCH }) => {
      index = COLLECTIONS.flatMap((c) => (SEARCH[c.id] ?? []).map(([id, name, flags, secs, tags]) => ({
        kind: "effect", col: c, id, name, flags, secs, detail: c.name, url: collectionUrl(c, `#${id}`),
        s: searchable({ id, name, tags: tags.split(" "), cat: id.split("/")[0], catName: id.split("/")[0].replace(/-/g, " "), loop: !!(flags & 1), acted: !!(flags & 2) }),
      })));
      render();
    });
    return loading;
  }

  function results() {
    const terms = termsOf(q.value);
    if (!terms.length) {
      const recent = readRecent()
        .filter(([c]) => byId[c])
        .map(([c, id, name]) => ({ kind: "effect", col: byId[c], id, name, detail: byId[c].name, url: collectionUrl(byId[c], `#${id}`), group: "Recent" }));
      return [...recent, ...collectionItems().map((it) => ({ ...it, group: "Collections" }))];
    }
    const pool = [...collectionItems(), ...sectionItems(), ...(index ?? [])];
    return pool
      .map((it) => ({ it, v: score(it.s, terms) + (it.kind === "collection" ? 12 : it.kind === "section" ? 6 : 0) + (it.col === current ? 4 : 0) }))
      .filter(({ it, v }) => v > (it.kind === "collection" ? 12 : it.kind === "section" ? 6 : 0) + (it.col === current ? 4 : 0))
      .sort((a, b) => b.v - a.v)
      .slice(0, RESULT_MAX)
      .map(({ it }) => it);
  }

  function highlight(name) {
    const lower = name.toLowerCase();
    let at = -1, len = 0;
    for (const t of termsOf(q.value)) {
      const i = lower.indexOf(t);
      if (i >= 0 && t.length > len) {
        at = i;
        len = t.length;
      }
    }
    if (at < 0) return esc(name);
    return `${esc(name.slice(0, at))}<mark>${esc(name.slice(at, at + len))}</mark>${esc(name.slice(at + len))}`;
  }

  const metaOf = (it) => {
    if (it.kind !== "effect" || it.flags === undefined) return "";
    return `${it.flags & 2 ? iconSvg("person") : ""}<span>${it.flags & 1 ? "loop" : `${it.secs}s`}</span>`;
  };

  function render() {
    items = results();
    active = 0;
    let group = null;
    const parts = [];
    items.forEach((it, i) => {
      if (it.group && it.group !== group) {
        group = it.group;
        parts.push(`<p class="cmd-group" role="presentation">${esc(group)}</p>`);
      }
      parts.push(`<a class="cmd-opt" id="cmd-${i}" role="option" href="${esc(it.url)}" data-i="${i}" tabindex="-1" aria-selected="false">
        <span class="coll-mark">${it.col.mark}</span>
        <span class="cmd-text"><b>${highlight(it.name)}</b><span>${esc(it.detail)}</span></span>
        <span class="cmd-meta">${metaOf(it)}</span>
      </a>`);
    });
    if (!items.length) {
      parts.push(`<p class="cmd-none">${index ? `Nothing for “${esc(q.value.trim())}”.` : "Searching…"}</p>`);
    }
    list.innerHTML = parts.join("");
    setActive(0);
  }

  function setActive(i) {
    list.querySelector('[aria-selected="true"]')?.setAttribute("aria-selected", "false");
    active = i;
    const el = list.querySelector(`#cmd-${i}`);
    if (el) {
      el.setAttribute("aria-selected", "true");
      el.scrollIntoView({ block: "nearest" });
      q.setAttribute("aria-activedescendant", el.id);
    } else q.removeAttribute("aria-activedescendant");
  }

  function go(it, newTab) {
    if (!it) return;
    if (it.kind === "effect") remember(it.col.id, it.id, it.name);
    if (newTab) {
      open(it.url, "_blank", "noopener");
      return;
    }
    if (it.col !== current) {
      location.href = it.url;
      return;
    }
    dlg.close();
    if (it.kind === "effect") dispatchEvent(new CustomEvent("pixelfx:open", { detail: { id: it.id } }));
    else if (it.kind === "section") dispatchEvent(new CustomEvent("pixelfx:jump", { detail: { id: it.id } }));
    else dispatchEvent(new CustomEvent("pixelfx:jump", { detail: { id: null } }));
  }

  q.addEventListener("input", render);
  q.addEventListener("compositionstart", () => {
    composing = true;
  });
  q.addEventListener("compositionend", () => {
    composing = false;
  });
  // keys stop here, so a page's own shortcuts can't fire underneath
  dlg.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (composing || e.isComposing) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length) setActive((active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active], e.metaKey || e.ctrlKey);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      dlg.close();
    }
  });
  list.addEventListener("click", (e) => {
    const a = e.target.closest(".cmd-opt");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    go(items[+a.dataset.i], false);
  });
  list.addEventListener("pointermove", (e) => {
    const a = e.target.closest(".cmd-opt");
    if (a && +a.dataset.i !== active) setActive(+a.dataset.i);
  });

  function show() {
    if (dlg.open) return;
    q.value = "";
    render();
    dlg.showModal();
    q.focus();
    loadIndex();
  }
  return { show, close: () => dlg.close(), prepare: loadIndex };
}

function mountPager(host, current) {
  if (!host || COLLECTIONS.length < 2) return;
  const link = (c, label, ico, cls) => `<a class="${cls}" href="${collectionUrl(c)}" rel="${label === "Next" ? "next" : "prev"}">
    <span class="pager-label">${label === "Next" ? "" : iconSvg(ico)}${label}${label === "Next" ? iconSvg(ico) : ""}</span>
    <span class="pager-name">${c.mark}<b>${esc(c.name)}</b></span>
  </a>`;
  host.replaceChildren(html(`<nav class="pager" aria-label="Other collections">
    ${link(neighbor(current, -1), "Previous", "prev", "pager-prev")}
    ${link(neighbor(current, 1), "Next", "next", "pager-next")}
  </nav>`));
}

// host: where the switcher goes. pager: where the next and previous go at the end of the page.
export function mountNav({ collection, host, pager, title, manifest }) {
  const current = COLLECTIONS.find((c) => c.id === collection) ?? COLLECTIONS[0];
  const data = manifest ?? {};
  watchCrossings();
  mountSwitcher(host, current, { title, count: (id) => data[id]?.count });
  mountPager(pager, current);
  const palette = mountPalette(current, data);
  speculate(current);

  document.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-palette]");
    if (!b) return;
    const menu = document.getElementById("coll-menu");
    if (menu?.matches(":popover-open")) menu.hidePopover();
    const side = document.getElementById("side");
    if (side?.matches(":popover-open")) side.hidePopover();
    palette.show();
  });
  document.addEventListener("pointerover", (e) => {
    if (e.target.closest?.("[data-palette]")) palette.prepare();
  });

  addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      palette.show();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== "[" && e.key !== "]")) return;
    const a = document.activeElement;
    if (a?.tagName === "TEXTAREA" || a?.tagName === "SELECT" || a?.isContentEditable || (a?.tagName === "INPUT" && a.type === "search")) return;
    if (document.querySelector("dialog[open]") || COLLECTIONS.length < 2) return;
    location.href = collectionUrl(neighbor(current, e.key === "]" ? 1 : -1));
  });
  return palette;
}
