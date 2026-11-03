// Shared 3D Sculpted Heart, Tectonic Plate, Voronoi Gem Facet & Physics Toolkit for Attachment Hearts.
// Precomputes a compact 64x56 typed-array mesh per seed (<1ms once, <0.15ms/frame) so every heart has real
// twin-lobe 3D normals, jagged beveled rock/iron plates, flat-shaded crystal gem facets, and wire stitches.

import { Rng, rand, noise2, clamp, lerp, TAU, WHITE } from "../../src/core/index.js";
import { HEART_PAL } from "./categories.js";

export const ROSE = HEART_PAL.magnetiteRose;
export const EMBER = HEART_PAL.forgedEmber;
export const ICE = HEART_PAL.glacierRime;
export const MAGMA = HEART_PAL.volcanicMagma;
export const SUN = HEART_PAL.sunstoneGold;
export const CRAG = HEART_PAL.obsidianCrag;
export const BRONZE = HEART_PAL.bronzeWire;
export const GARNET = HEART_PAL.garnetRim;

const MW = 64, MH = 56, OX = 32, OY = 27, S = 21.5;
const meshCache = new Map();

// Twin-lobe + tapered shield-point 2.5D heart: returns [sd, z] where sd > 0 is inside (in px) and z in [0..1].
export function heartField(dx, dy) {
  const u = dx / S, v = dy / S, au = Math.abs(u);
  if (au > 1.18 || v < -1.02 || v > 1.08) return [-12, 0];

  if (v <= -0.30) {
    const cx = 0.44, cy = -0.30, R = 0.57;
    const r = Math.hypot(au - cx, v - cy);
    const sd = (R - r) * S;
    const z = r < R ? Math.sqrt(Math.max(0, R * R - r * r)) / R : 0;
    return [sd, z];
  }
  const t = (v + 0.30) / 1.26;
  // Radial falloff past the bottom point (t >= 1) so crust offsets never create a horizontal shelf!
  if (t >= 1) return [-Math.hypot(au, t - 1) * S, 0];
  const w = 1.01 * Math.pow(1 - t, 0.78) * (1 + 0.14 * t * (1 - t));
  const sd = (w - au) * S * 0.92;
  if (sd <= -4) return [sd, 0];
  const q = clamp(au / Math.max(0.04, w), 0, 1);
  const cleft = Math.pow(Math.max(0, 1 - t * 2.1), 2) * 0.28 * Math.exp(-(u * u) / 0.045);
  const z = Math.max(0, Math.sqrt(Math.max(0, 1 - q * q)) * (1 - 0.32 * t) - cleft);
  return [sd, z];
}

export function getHeartMesh(seed = 1) {
  const key = seed | 0;
  if (meshCache.has(key)) return meshCache.get(key);

  const R = new Rng(key * 977 + 31);
  const N = MW * MH;
  const sd = new Float32Array(N);
  const z = new Float32Array(N);
  const nx = new Float32Array(N);
  const ny = new Float32Array(N);
  const nz = new Float32Array(N);

  for (let j = 0; j < MH; j++) {
    for (let i = 0; i < MW; i++) {
      const [d, h] = heartField(i - OX, j - OY);
      sd[j * MW + i] = d;
      z[j * MW + i] = h;
    }
  }
  for (let j = 1; j < MH - 1; j++) {
    for (let i = 1; i < MW - 1; i++) {
      const k = j * MW + i;
      const gx = (z[k + 1] - z[k - 1]) * -4.2;
      const gy = (z[k + MW] - z[k - MW]) * -4.2;
      const gz = 1.0;
      const inv = 1 / Math.hypot(gx, gy, gz);
      nx[k] = gx * inv; ny[k] = gy * inv; nz[k] = gz * inv;
    }
  }

  // 25 stratified tectonic stone/iron plate sites
  const plates = [];
  for (let gy = 0; gy < 5; gy++) {
    for (let gx = 0; gx < 5; gx++) {
      plates.push({
        x: -21 + gx * 10.5 + R.range(-3.0, 3.0),
        y: -19 + gy * 9.5 + R.range(-2.6, 2.6),
        rim: R.range(-0.3, 1.25),
        tx: R.range(-0.2, 0.2),
        ty: R.range(-0.2, 0.2),
        tone: R.range(-0.5, 0.5),
      });
    }
  }

  // 36 polygonal crystal gem facet sites with distinct angular normals so every facet reads clearly!
  const facets = [];
  for (let gy = 0; gy < 6; gy++) {
    for (let gx = 0; gx < 6; gx++) {
      const fx = -19.5 + gx * 7.8 + R.range(-2.2, 2.2);
      const fy = -18.5 + gy * 7.5 + R.range(-2.2, 2.2);
      const ci = clamp(Math.round(fx + OX), 1, MW - 2), cj = clamp(Math.round(fy + OY), 1, MH - 2);
      const ck = cj * MW + ci;
      let fnx = nx[ck] + R.range(-0.52, 0.52);
      let fny = ny[ck] + R.range(-0.52, 0.52);
      let fnz = Math.max(0.22, nz[ck] + R.range(-0.22, 0.28));
      const inv = 1 / Math.hypot(fnx, fny, fnz);
      facets.push({ x: fx, y: fy, nx: fnx * inv, ny: fny * inv, nz: fnz * inv, sparkle: R.next() });
    }
  }

  const plateId = new Uint8Array(N);
  const plateId2 = new Uint8Array(N);
  const plateEdge = new Float32Array(N);
  const bevelX = new Float32Array(N);
  const bevelY = new Float32Array(N);
  const facetId = new Uint8Array(N);
  const facetEdge = new Float32Array(N);
  const fault = new Float32Array(MH);

  for (let j = 0; j < MH; j++) {
    const dy = j - OY;
    fault[j] = noise2(dy * 0.16, 7.7, key) * 3.0 + Math.sin(dy * 0.24) * 1.3;
  }

  for (let j = 0; j < MH; j++) {
    const dy = j - OY;
    for (let i = 0; i < MW; i++) {
      const dx = i - OX, k = j * MW + i;

      // domain-warped Voronoi for jagged geological plates
      const wx = dx + noise2(dx * 0.16, dy * 0.16, key + 11) * 2.4;
      const wy = dy + noise2(dx * 0.16, dy * 0.16, key + 29) * 2.4;
      let d1 = 1e9, d2 = 1e9, p1 = 0, p2 = 0;
      for (let m = 0; m < plates.length; m++) {
        const dd = Math.hypot(wx - plates[m].x, wy - plates[m].y);
        if (dd < d1) { d2 = d1; p2 = p1; d1 = dd; p1 = m; }
        else if (dd < d2) { d2 = dd; p2 = m; }
      }
      plateId[k] = p1;
      plateId2[k] = p2;
      plateEdge[k] = (d2 - d1) * 0.5;
      const bvx = plates[p1].x - plates[p2].x, bvy = plates[p1].y - plates[p2].y;
      const bl = Math.hypot(bvx, bvy) || 1;
      bevelX[k] = bvx / bl;
      bevelY[k] = bvy / bl;

      // straight-edged Voronoi for cut gemstone facets
      let fd1 = 1e9, fd2 = 1e9, f1 = 0;
      for (let m = 0; m < facets.length; m++) {
        const dd = Math.hypot(dx - facets[m].x, dy - facets[m].y);
        if (dd < fd1) { fd2 = fd1; fd1 = dd; f1 = m; }
        else if (dd < fd2) fd2 = dd;
      }
      facetId[k] = f1;
      facetEdge[k] = (fd2 - fd1) * 0.5;
    }
  }

  // Pick 6 scenic plate-pair seams on left & lower-right flanks for metallic wire stitches
  const stitches = [];
  const seenPairs = new Set();
  for (let j = 8; j < MH - 8; j += 2) {
    for (let i = 6; i < MW - 6; i += 2) {
      const dx = i - OX, dy = j - OY, k = j * MW + i;
      if (sd[k] < 4.5 || plateEdge[k] > 0.75) continue;
      if (!(dx < -4 || (dx > 4 && dy > 3))) continue;
      const a = Math.min(plateId[k], plateId2[k]), b = Math.max(plateId[k], plateId2[k]);
      const pk = (a << 8) | b;
      if (seenPairs.has(pk)) continue;
      seenPairs.add(pk);
      const pa = plates[plateId[k]], pb = plates[plateId2[k]];
      const ux = pb.x - pa.x, uy = pb.y - pa.y, ul = Math.hypot(ux, uy) || 1;
      stitches.push({ x: dx, y: dy, nx: ux / ul, ny: uy / ul });
      if (stitches.length >= 6) break;
    }
    if (stitches.length >= 6) break;
  }

  const mesh = { MW, MH, OX, OY, sd, z, nx, ny, nz, plates, facets, plateId, plateId2, plateEdge, bevelX, bevelY, facetId, facetEdge, fault, stitches };
  meshCache.set(key, mesh);
  return mesh;
}

// Shade a dark obsidian/forged-iron crust pixel using 8-color ramp S8 (biased dark so stone reads heavy & dark!)
export function shadeCrustPx(mesh, k, lx, ly, lz, S8, maxStep = 4) {
  const pid = mesh.plateId[k], pl = mesh.plates[pid], pe = mesh.plateEdge[k];
  let snx = mesh.nx[k] + pl.tx, sny = mesh.ny[k] + pl.ty, snz = mesh.nz[k];
  if (pe < 2.2) {
    const kBev = (1 - pe / 2.2) * 0.75;
    snx -= mesh.bevelX[k] * kBev;
    sny -= mesh.bevelY[k] * kBev;
  }
  const inv = 1 / Math.hypot(snx, sny, snz);
  const ndl = (snx * lx + sny * ly + snz * lz) * inv;
  let idx = Math.round(clamp((ndl * 0.52 + 0.36 + pl.tone * 0.14) * maxStep, 0, maxStep));
  if (pe < 1.3 && ndl > 0.26) idx = Math.min(maxStep + 1, idx + 1); // crisp beveled top-left catchlight
  if (pe < 1.1 && ndl < -0.05) idx = Math.max(0, idx - 1);          // deep chiseled crevice shadow
  return S8[idx];
}

// Shade a cut gemstone facet pixel using 8-color ramp C8 (preserves midtones so individual facets pop!)
export function shadeCrystalPx(mesh, k, lx, ly, lz, C8, glowBoost = 0) {
  const fid = mesh.facetId[k], fc = mesh.facets[fid], fe = mesh.facetEdge[k];
  const ndl = fc.nx * lx + fc.ny * ly + fc.nz * lz;
  const spec = Math.pow(Math.max(0, ndl), 9);
  let v = clamp(ndl * 0.48 + 0.36 + glowBoost * 0.24 + spec * 0.38, 0, 1);
  if (fe < 0.68 && ndl > 0.18) v = Math.min(1, v + 0.18); // crisp cut-gem ridge highlight
  const idx = clamp(Math.round(v * 6.6), 1, 7);
  return spec > 0.74 ? WHITE : C8[idx];
}

// Draw metallic bronze wire bindings stitched across tectonic armor seams
export function drawWireStitches(p, cx, cy, mesh, B8, glintPh = 0, spread = 0) {
  for (let s = 0; s < mesh.stitches.length; s++) {
    const st = mesh.stitches[s];
    const tx = -st.ny, ty = st.nx;
    const reach = 2.6 + spread * 0.5;
    for (let strand = -1; strand <= 1; strand++) {
      const ox = tx * strand * 1.4, oy = ty * strand * 1.4;
      const x0 = cx + st.x + ox - st.nx * reach, y0 = cy + st.y + oy - st.ny * reach;
      const x1 = cx + st.x + ox + st.nx * reach, y1 = cy + st.y + oy + st.ny * reach;
      const hot = Math.sin(glintPh * TAU + s * 1.3 + strand * 0.5) > 0.72;
      p.px(x0, y0, B8[0]);
      p.px(x1, y1, B8[0]);
      p.line(x0, y0, x1, y1, hot ? B8[6] : strand === 0 ? B8[5] : B8[3]);
    }
  }
}

// Sculpted volcanic basalt crag altar pedestal at y = -14..0 with faceted rock planes & crimson/elemental rim light
export function drawCragPedestal(p, seed, Cr8, leftRimCol, rightRimCol, rimStrength = 0.65) {
  const peaks = [
    [-33, 4], [-26, 8], [-18, 11], [-10, 14], [-2, 12], [6, 15], [14, 11], [22, 9], [30, 5],
  ];
  for (let x = -36; x <= 36; x++) {
    let h = 1.5;
    let slope = 0;
    for (const [px, ph] of peaks) {
      const w = ph * 1.15;
      const d = Math.abs(x - px);
      if (d < w) {
        const cand = ph * (1 - d / w);
        if (cand > h) {
          h = cand;
          slope = Math.sign(x - px); // -1 = left-facing sunlit plane, +1 = right-facing shadow plane!
        }
      }
    }
    const jag = (rand(x + seed * 17, 3) - 0.5) * 1.6;
    const top = Math.max(1, Math.round(h + jag));
    for (let y = 0; y < top; y++) {
      const fromTop = top - 1 - y;
      let col;
      if (fromTop === 0) {
        const sideCol = x < 0 ? leftRimCol : rightRimCol;
        const centerFactor = clamp(1 - Math.abs(x) / 28, 0.2, 1);
        col = rand(x * 3, seed) < rimStrength * centerFactor ? sideCol : slope <= 0 ? Cr8[4] : Cr8[2];
      } else if (fromTop === 1 && slope < 0) {
        col = Cr8[3];
      } else {
        const ci = slope < 0 ? 2 : slope > 0 ? 0 : 1;
        col = Cr8[clamp(ci + (y > top * 0.55 ? 1 : 0), 0, 3)];
      }
      p.px(x, -y, col);
    }
  }
}

// Soft radial-dithered vapor/steam puff (avoids solid polka-dot circles; looks like genuine pixel-art smoke/steam!)
export function drawSoftPuff(p, cx, cy, r, coreCol, midCol, edgeCol, density = 0.7) {
  const R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy) / Math.max(0.5, r);
      if (d > 1) continue;
      const falloff = (1 - d * d) * density;
      const col = d < 0.38 ? coreCol : d < 0.72 ? midCol : edgeCol;
      p.dot(cx + dx, cy + dy, col, falloff);
    }
  }
}

// Angular 3D polyhedral ore/rock chunk
export function drawOreChunk(p, cx, cy, r, ang, S8, rimCol, rimDirX = 1, rimDirY = 0) {
  const R = Math.ceil(r) + 1;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const rx = dx * ca + dy * sa, ry = -dx * sa + dy * ca;
      const oct = Math.max(Math.abs(rx) * 0.92 + Math.abs(ry) * 0.45, Math.abs(ry) * 0.95 + Math.abs(rx) * 0.32, Math.abs(rx - ry * 0.35) * 0.88);
      if (oct > r) continue;
      const edge = oct > r - 0.95;
      const towardCore = (dx * rimDirX + dy * rimDirY) / (Math.hypot(dx, dy) || 1);
      let c;
      if (edge && towardCore > 0.15 && rimCol) c = rimCol;
      else if (rx + ry < -r * 0.15) c = S8[3];
      else if (rx + ry < r * 0.25) c = S8[1];
      else c = S8[0];
      p.px(cx + dx, cy + dy, c);
    }
  }
}

// True tall dipole magnetic field curve emerging high from North cleft (0, -14) and arching wide into South point (0, +20)
export function dipolePoint(cx, cy, lobeSign, R0, u) {
  // Parametric dipole loop: u=0 emerges steeply upward-outward from cleft; u=0.45 reaches wide outer ear; u=1 enters bottom tip
  const th = lerp(0.06 * Math.PI, 0.94 * Math.PI, u);
  const s = Math.sin(th), c = Math.cos(th);
  // Boost upper lobe height so arcs soar ABOVE the heart's crown just like iron-filing dipole loops in the artwork!
  const x = cx + lobeSign * R0 * Math.pow(s, 1.55);
  const y = cy - c * (17 + R0 * 0.62) - Math.pow(Math.max(0, c), 2) * (R0 * 0.22) + 3;
  return [x, y];
}
