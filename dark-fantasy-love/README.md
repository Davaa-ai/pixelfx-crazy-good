# Dark Fantasy Love — Bespoke `pixelfx` Asset Pack

A standalone, archetype-defining procedural pixel-art VFX collection built on the exact underlying engine, two-buffer mechanics (`color` + additive `light`), Bayer ordered dithering, deterministic RNG, and 3D acted choreography (`act`) of **`pixelfx`**.

Every file for this pack lives strictly inside `dark-fantasy-love/`. **Zero files in the main `pixelfx` project were modified**, so you can preview, keep, merge, or delete this entire pack cleanly at any time.

---

## Archetype & Aesthetic Pillars

**Dark Fantasy Love** explores gothic devotion where romance and tragedy are inseparable — inspired by cathedral reliquaries, crimson velvet, tarnished gold filigree, barbed briars, celestial eclipses, and love that lingers past death.

### Custom Color Ramps (`GOTHIC_PAL` in `fx/categories.js`)
- `crimsonVelvet` — Deep arterial shadow `#12040a` to velvet rose catchlight `#fff0f4`
- `reliquaryGold` — Smoked bronze `#160d05` to consecrated candlelight `#ffffff`
- `mourningVeil` — Abyssal plum `#06040b` to lavender dusk `#f2e8ff`
- `spectralTear` — Midnight crypt `#0a101d` to moonlight silver `#ffffff`
- `witheredRose` — Driedburgundy `#11080c` to dusty heirloom petal `#fff5f5`
- `ashenBride` — Soot veil `#0d0c12` to porcelain lace `#ffffff`

### Custom Procedural Primitives (`fx/_lib.js`)
- `drawGothicHeart` / `inGothicHeart` — Sculpted pointed cathedral heart SDF with directional ramp shading, specular catchlight, optional tarnished-gold filigree bands, and glowing fault cracks.
- `PetalSim` / `drawPetal` — Deterministic 3D aerodynamic rose petals that flutter, bank, tumble in depth (`drawBack` + `draw`), and settle onto the stone floor (`y = 0`).
- `drawRose` — Cupped whorled pixel-art rose bloom with dark spiral petal creases and pointed sepals.
- `unlight` — Carves additive glow out of eclipse silhouettes so pitch-black forms stay stark against blazing coronas.

---

## The 8 Effects (Across 4 Sub-Archetypes)

| ID | Name | Kind | Acted | Description |
| :--- | :--- | :--- | :--- | :--- |
| `vows/crimson-thread` | **Thread of fate** | One-shot (`2.6s`) | Yes (`target`) | A taut red thread whips from chest to chest, plucks in standing waves, pulls the beloved inward, and fuses twin ruby beads into a gilded vow-knot draped in golden chains. |
| `vows/blood-chalice` | **Wedding chalice** | Loop (`3.0s`) | — | An ornate golden goblet flanked by flickering votive candles overflows with crimson wine, feeding a beating gilded heart crowned in orbiting thorns via twin helical ribbons. |
| `briar/thorn-embrace` | **Briar embrace** | One-shot (`3.4s`) | Yes (`onBody`) | Three 3D helical briar vines coil behind and across the character, blooming five crimson roses and kindling a gilded heart-ward before withering to ash. |
| `briar/rose-reap` | **Bleeding rose slash** | One-shot (`1.8s`) | Yes (`target`) | A wide velvet-crimson and gold sword crescent leaves a lingering barbed briar arc that bursts into a rose bloom and 20 tumbling 3D petals on 150ms hit-stop. |
| `mourning/eclipsed-heart` | **Eclipsed lovers** | Loop (`3.6s`) | — | Inside a tilted golden armillary ring, a crimson sun and weeping silver moon orbit into eclipse, carving an abyssal black gothic heart rimmed in diamond fire while tears splash below. |
| `mourning/shattered-reliquary` | **Heartbreak shatter** | One-shot (`3.4s`) | — | A suspended stained-glass reliquary heart beats faster as glowing fault cracks spread, imploding to a star before bursting into bouncing ruby glass shards and mourning smoke. |
| `elegy/spectral-waltz` | **Ghostly embrace** | Loop (`3.2s`) | Yes (`onBody`) | A translucent moonlight apparition rises behind the character and drapes spectral arms over their shoulders, kindling a warm shared crimson-gold heart where their hands clasp. |
| `elegy/crimson-betrothal` | **Crimson betrothal** | One-shot (`2.9s`) | Yes (`target`) | Full chained signature move: solemn blade salute -> red thread & rose sigil -> petal-blur dash -> sweeping bleeding-rose cleave -> erupting briars, cathedral heart crest & ruby glass burst -> solemn bow recovery. |

---

## Preview the Live Interactive Gallery

Run the pack's zero-dependency server from the repository root (`d:\code\assets`):

```powershell
node dark-fantasy-love/tools/serve.mjs
```

Then open **`http://localhost:8090/dark-fantasy-love/gallery/`** in your browser.
- Click any tile to inspect at full resolution, slow playback (`0.25×` / `0.5×`), recolor live with any `GOTHIC_PAL` or `pixelfx` palette, roll new deterministic seeds, toggle the character (`actor`), mirror (`flip`), or export custom recolored PNG sprite sheets on the fly.

---

## Using the Assets in Your Game

### Option A — Pre-Baked Sprite Sheets (Godot, Unity, GameMaker, Phaser, Aseprite)
All 8 transparent PNG sprite sheets + Aseprite-compatible JSON atlases + master `index.json` are pre-baked in:
- `dark-fantasy-love/sheets/<category>/<name>.png`
- `dark-fantasy-love/sheets/<category>/<name>.json`
- `dark-fantasy-love/sheets/index.json`

### Option B — Live Procedural JS / Canvas Import
```js
import { createFrame, createAct, composite } from "./src/core/index.js";
import * as crimsonBetrothal from "./dark-fantasy-love/fx/elegy/crimson-betrothal.js";

const frame = createFrame(320, 180);
const fx = createAct(crimsonBetrothal, { x: 96, y: 142 });

// Every tick:
fx.update(dt);
fx.draw(frame); // writes both color & additive light buffers
composite(frame, imageData.data, null);
```

---

## CLI Tooling (Isolated to `dark-fantasy-love/`)

```powershell
# Run all deterministic quality, bounds, loop-seam, palette & performance checks:
node dark-fantasy-love/tools/check.mjs

# Render contact sheets + acted step-strips into dark-fantasy-love/records/:
node dark-fantasy-love/tools/render.mjs --act --zoom 2

# Re-bake all PNG sprite sheets + JSON atlases into dark-fantasy-love/sheets/:
node dark-fantasy-love/tools/sheets.mjs
```

---

## Keep or Delete Without Disruption

- **To delete completely** (zero trace left in the main `pixelfx` project):
  ```powershell
  Remove-Item -Recurse -Force dark-fantasy-love
  ```
- **To merge permanently into the main `pixelfx` gallery**:
  1. Copy `dark-fantasy-love/fx/{_lib.js,vows,briar,mourning,elegy}` into `src/fx/` (updating `../../../src/core/index.js` imports to `../../core/index.js`).
  2. Append the 4 categories from `dark-fantasy-love/fx/categories.js` into `src/fx/categories.js`.
  3. Run `node tools/index.mjs && node tools/check.mjs && node tools/sheets.mjs`.
