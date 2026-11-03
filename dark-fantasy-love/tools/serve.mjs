#!/usr/bin/env node
// Standalone server for the Dark Fantasy Love gallery (serves repo root read-only so ../src/core resolves).
// Usage: node dark-fantasy-love/tools/serve.mjs [port]
// Opens http://localhost:8090/dark-fantasy-love/gallery/

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const PORT = +(process.argv[2] ?? 8090);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".md": "text/plain; charset=utf-8", ".mp4": "video/mp4",
};

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/" || path === "/dark-fantasy-love" || path === "/dark-fantasy-love/") {
    return res.writeHead(302, { location: "/dark-fantasy-love/gallery/" }).end();
  }
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT + sep)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(PORT, () => console.log(`Dark Fantasy Love gallery: http://localhost:${PORT}/dark-fantasy-love/gallery/`));
