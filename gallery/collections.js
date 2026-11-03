// Every collection in this workspace, in one place, so every page offers the same way between them. Collections that
// aren't deployed alongside this one (a standalone build of the core library, say) simply don't appear.

export const COLLECTIONS = [
  { id: "core", name: "Core library", path: "gallery/" },
  { id: "dark-fantasy", name: "Dark fantasy love", path: "dark-fantasy-love/gallery/" },
  { id: "hearts", name: "Attachment hearts", path: "attachment-hearts/gallery/" },
  { id: "sanguine", name: "Sanguine arcana", path: "labs/sanguine-arcana/" },
  { id: "shonen", name: "Shonen arts", path: "labs/shonen-arts/" },
  { id: "anime", name: "Anime lab", path: "anime/gallery/" },
];

const ROOT = new URL("../", import.meta.url);
// the standalone build defines this: it ships alone, so there's nothing to look for
const STANDALONE = typeof __PIXELFX_STANDALONE__ !== "undefined";

async function exists(url) {
  try {
    return (await fetch(url, { method: "HEAD" })).ok;
  } catch {
    return false;
  }
}

// fills `nav` with links, one per collection; resolves to how many other collections were found
export async function mountCollections(nav, currentId, className = "coll-link") {
  const links = COLLECTIONS.map((c) => {
    const a = document.createElement("a");
    a.className = className;
    a.href = new URL(c.path, ROOT).href;
    a.textContent = c.name;
    if (c.id === currentId) a.setAttribute("aria-current", "page");
    else a.hidden = true;
    nav.append(a);
    return { a, c };
  });
  if (STANDALONE) return 0;
  const found = await Promise.all(links.map(async ({ a, c }) => {
    if (c.id === currentId) return false;
    const ok = await exists(new URL(c.path + "index.html", ROOT));
    a.hidden = !ok;
    return ok;
  }));
  return found.filter(Boolean).length;
}
