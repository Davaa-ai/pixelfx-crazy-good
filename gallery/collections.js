// Every collection in this workspace, in the order you move through them. One list, so every page offers the same way
// between them. The standalone build ships only the core library, so it offers only that.

const ROOT = new URL("../", import.meta.url);
const STANDALONE = typeof __PIXELFX_STANDALONE__ !== "undefined";

const ALL = [
  {
    id: "core",
    name: "Core library",
    path: "gallery/",
    blurb: "The full library: fire, magic, weather, UI and more",
    mark: `<svg viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="6" height="6" fill="#fff"/><rect width="3" height="3" fill="#f53cd1"/></svg>`,
  },
  {
    id: "dark-fantasy",
    name: "Dark fantasy love",
    path: "dark-fantasy-love/gallery/",
    blurb: "Gothic-romance vows, thorns and spectral elegies",
    mark: `<svg viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="3" height="2" fill="#c4264e"/><rect x="5" y="1" width="3" height="2" fill="#c4264e"/><rect y="2" width="9" height="3" fill="#c4264e"/><rect x="1" y="5" width="7" height="1" fill="#8a1638"/><rect x="2" y="6" width="5" height="1" fill="#8a1638"/><rect x="3" y="7" width="3" height="1" fill="#540d24"/><rect x="4" y="8" width="1" height="1" fill="#ffd06b"/><rect x="4" y="2" width="1" height="6" fill="#ffd06b"/><rect x="1" y="2" width="2" height="1" fill="#ffa8ba"/></svg>`,
  },
  {
    id: "hearts",
    name: "Attachment hearts",
    path: "attachment-hearts/gallery/",
    blurb: "Four attachment styles as sculpted hearts",
    mark: `<svg viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="2" width="4" height="3" fill="#383247"/><rect x="6" y="2" width="4" height="3" fill="#ff8d29"/><rect y="3" width="5" height="3" fill="#5ab0eb"/><rect x="6" y="3" width="5" height="3" fill="#dc2f72"/><rect x="5" y="3" width="1" height="5" fill="#fff"/><rect x="1" y="6" width="4" height="2" fill="#dc2f72"/><rect x="6" y="6" width="4" height="2" fill="#ffd166"/><rect x="3" y="8" width="5" height="2" fill="#ffedb0"/><rect x="5" y="10" width="1" height="1" fill="#fff"/></svg>`,
  },
  {
    id: "sanguine",
    name: "Sanguine arcana",
    path: "labs/sanguine-arcana/",
    blurb: "Love archetypes as animated tarot cards",
    mark: `<svg viewBox="0 0 7 9" shape-rendering="crispEdges" aria-hidden="true"><rect width="7" height="9" fill="#efc65e"/><rect x="1" y="1" width="5" height="7" fill="#220b1c"/><rect x="2" y="3" width="3" height="2" fill="#e24c5c"/><rect x="3" y="5" width="1" height="1" fill="#e24c5c"/><rect x="3" y="2" width="1" height="1" fill="#ffe8a0"/></svg>`,
  },
  {
    id: "shonen",
    name: "Shonen arts",
    path: "labs/shonen-arts/",
    blurb: "Signature techniques and summons, performed",
    mark: `<svg viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" width="3" height="7" fill="#2a94ef"/><rect y="2" width="7" height="3" fill="#2a94ef"/><rect x="1" y="1" width="5" height="5" fill="#78cdff"/><rect x="2" y="2" width="3" height="3" fill="#fff"/></svg>`,
  },
  {
    id: "anime",
    name: "Anime lab",
    path: "anime/gallery/",
    blurb: "Demon Slayer, Jujutsu Kaisen, Attack on Titan, Bleach and Solo Leveling",
    mark: `<svg viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" width="1" height="7" fill="#ff6a3d"/><rect y="3" width="7" height="1" fill="#ff6a3d"/><rect x="1" y="1" width="5" height="5" fill="#ff6a3d"/><rect x="2" y="2" width="3" height="3" fill="#fff"/></svg>`,
  },
  {
    id: "sakuga",
    name: "Anime sakuga",
    path: "anime-sakuga/gallery/",
    blurb: "Haki, ki, brawler and sword combat",
    mark: `<svg viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true"><rect x="4" y="0" width="3" height="3" fill="#ff4a6e"/><rect x="2" y="2" width="5" height="3" fill="#ff4a6e"/><rect x="3" y="5" width="3" height="4" fill="#d81b44"/><rect x="5" y="1" width="1" height="2" fill="#060308"/><rect x="3" y="3" width="3" height="1" fill="#060308"/><rect x="4" y="5" width="1" height="3" fill="#060308"/><rect x="6" y="3" width="1" height="1" fill="#ffffff"/></svg>`,
  },
];

export const COLLECTIONS = STANDALONE ? ALL.filter((c) => c.id === "core") : ALL;

export const collectionUrl = (c, hash = "") => (STANDALONE ? new URL(location.pathname, location.href).href : new URL(c.path, ROOT).href) + hash;

// which collection a URL belongs to, for working out which way a navigation is heading
export function collectionAt(url) {
  const path = new URL(url, location.href).pathname.replace(/index\.html$/, "");
  return COLLECTIONS.find((c) => new URL(c.path, ROOT).pathname === path) ?? null;
}
