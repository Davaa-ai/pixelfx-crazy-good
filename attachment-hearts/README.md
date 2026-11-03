# Attachment Hearts (`ТАТАЛЦАЛ`) — Bespoke `pixelfx` Relic Pack

Four intricately sculpted, hovering 3D-faceted pixel-art hearts inspired by the **four attachment styles** (*“Чамайг юу татдаг вэ? Чи юунаас зугтдаг вэ? — Хайрлах дөрвөн хэв маяг”*), plus four paired **Awakening Surge** one-shots, built on the exact deterministic engine, two-buffer lighting (`color` + additive `light`), and Bayer ordered dithering of **`pixelfx`**.

Every file lives strictly inside `attachment-hearts/`. **Zero files outside `attachment-hearts/` were modified.**

---

## 3D Sculptural & Physical Architecture (`fx/_lib.js`)

Rather than flat 2D heart icons, `getHeartMesh(seed)` precomputes a compact `64 × 56` typed-array 2.5D relief mesh (`< 1 ms` once per seed, `< 0.15 ms` per frame):
- **Twin-Lobe 3D Surface Normals (`heartField`)**: Real rounded left/right lobes with a central cleavage valley and tapered relic point, enabling live dynamic lighting as each heart hovers and sways.
- **Domain-Warped Tectonic Armor Plates (`shadeCrustPx`)**: Stratified Voronoi blocks warped by 2D value noise with chiseled 1 px beveled catchlights, deep crevice shadows, and optional 3D metallic bronze wire stitches (`drawWireStitches`).
- **Cut Gemstone Crystal Facets (`shadeCrystalPx`)**: Polygonal flat-shaded gem planes with independent angular normals that catch specular glints as the heart breathes.
- **Real-World Elemental Physics**: True dipole field curves (`dipolePoint`), radial Bayer-dithered Leidenfrost vapor plumes (`drawSoftPuff`), polyhedral orbiting ore chunks (`drawOreChunk`), and faceted volcanic crag pedestals (`drawCragPedestal`).

---

## The 8 Effects (4 Hovering Relics + 4 Awakening Surges)

| Category / Style | Effect ID | Kind | Unique Visual Mechanics |
| :--- | :--- | :--- | :--- |
| **Magnetic Heart**<br>`СОРОНЗОН ЗҮРХ`<br>*(Anxious · Preoccupied)* | `magnetic/magnetic-heart`<br>`magnetic/magnetic-pull` | Loop (`3.6s`)<br>One-shot (`2.8s`) | Dark magnetite crust veined in neon pink breaks open over a faceted rose-quartz core; soaring dipole flux arcs carry iron-filing motes and tug 9 orbiting ore chunks inward with electric snaps. |
| **Armored Heart**<br>`ХУЯГТ ЗҮРХ`<br>*(Avoidant · Dismissive)* | `armored/armored-heart`<br>`armored/armor-clamp` | Loop (`3.6s`)<br>One-shot (`2.8s`) | Interlocking dark iron & basalt plates lashed with 3D bronze wire stitches; molten crimson pressure pushes the seams open in fiery veins before the heavy armor slams shut with cold-steel lock glints. |
| **Polar Heart**<br>`ЭСРЭГ ТЭСРЭГ ЗҮРХ`<br>*(Disorganized · Fearful-Avoidant)* | `polar/polar-heart`<br>`polar/thermal-clash` | Loop (`3.6s`)<br>One-shot (`2.9s`) | Deep sapphire glacier-ice left lobe and magma-cracked basalt right lobe grind in vertical push-pull shear — erupting Leidenfrost flash-boiled steam plumes, sizzling meltwater drops, frost shards, and licking flames. |
| **Luminous Heart**<br>`ГЭРЭЛТ ЗҮРХ`<br>*(Secure · Grounded)* | `luminous/luminous-heart`<br>`luminous/radiant-bloom` | Loop (`3.6s`)<br>One-shot (`2.9s`) | Curved dark stone cradle lined with crimson-garnet crystals frames an open honey-gold sunstone heart — radiating volumetric cathedral god-rays, gemstone caustics, and calm levitating pebbles. |

---

## Preview the Custom Sanctuary Gallery

```powershell
node attachment-hearts/tools/serve.mjs
```

Open **`http://localhost:8091/attachment-hearts/gallery/`** (or **`http://localhost:8090/attachment-hearts/gallery/`** if the repo server is already running).
- Watch all **4 Hovering Hearts side-by-side** in the top panoramic Sanctuary Lineup, press **`surge ✦`** on any pedestal to trigger its one-shot reaction live in-place, or click any heart to open the full `pixelfx` inspector (slow-mo, backdrop toggle, `HEART_PAL` + `PAL` live recoloring, seed roller, PNG sprite-sheet builder, and copyable JS code).

---

## Pre-Baked Sprite Sheets & JS Integration

- **Transparent PNG Sprite Sheets + JSON Atlases**: `attachment-hearts/sheets/<cat>/<name>.png`, `.json`, and `attachment-hearts/sheets/index.json`.
- **Direct Procedural ES Module Import**:
  ```js
  import { createFrame, createFx, composite } from "./src/core/index.js";
  import * as polarHeart from "./attachment-hearts/fx/polar/polar-heart.js";

  const frame = createFrame(200, 180);
  const fx = createFx(polarHeart, { x: 100, y: 158 });

  // Every tick:
  fx.update(dt);
  fx.draw(frame); // color + additive light buffers
  composite(frame, imageData.data, null);
  ```

---

## CLI Tooling & Clean Removal

```powershell
# Quality, determinism, bounds, seamless loop & <4ms frame-time check:
node attachment-hearts/tools/check.mjs

# Render contact sheets into attachment-hearts/records/:
node attachment-hearts/tools/render.mjs --zoom 2

# Re-bake all PNG sprite sheets + JSON atlases into attachment-hearts/sheets/:
node attachment-hearts/tools/sheets.mjs

# Delete completely with zero disruption to pixelfx:
Remove-Item -Recurse -Force attachment-hearts
```
