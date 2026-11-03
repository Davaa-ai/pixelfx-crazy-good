# Anime Sakuga — Bespoke `pixelfx` Asset Pack

A standalone procedural pixel-art VFX collection built on the exact engine, two-buffer mechanics (`color` + additive `light`), 4×4 Bayer ordered dithering, deterministic RNG, and 3D acted choreography (`act`) of **`pixelfx`**.

Inspired by Grand Line (*One Piece*) combat signatures and modern shonen sakuga animation, every effect lives inside `anime-sakuga/` and plugs into the shared studio gallery.

---

## Aesthetic Pillars & Sakuga Grammar

**Anime Sakuga** translates hand-drawn modern anime impact direction into deterministic pixel art:
- **Inverted-Core Energy (`unlight` + `blackBolt`)**: Conqueror's Haki and Black Flash lightning wrap a stark, pitch-black `#060308` spine in blazing crimson/emerald halos by zeroing out the additive `light` buffer directly along the bolt core so black never washes to pink.
- **Elastic Overdrive & Supersonic Cones (`machRing`)**: Pink overdrive steam, hyper-extended obsidian-armored fists, and tilted 3D Mach vapor rings split into `"back"` and `"front"` depth layers around punches and beams.
- **Yutapon Cubes (`YutaponSim` / `drawYutaponCube`)**: Deterministic 3D orthographic block debris (inspired by Yutaka Nakamura) that tumbles, bounces, and settles onto `y = 0` when beams, quakes, or Haki clashes tear up the stage.
- **Hit-Stop & Spatial Manipulation**: Multi-frame freeze beats (`hitStop`), mid-air plate-glass spiderweb fractures, RGB chromatic spatial pinches, and spherical surgical domains (`ROOM`) sheared cleanly along a sword plane.

### Custom Color Ramps (`SAKUGA_PAL` in `fx/categories.js`)
- `conqueror` — Obsidian black `#060308` through arterial crimson `#d81b44` to white-rose flare `#fff2f5`
- `redHawk` — Charred soot `#120504` through piston orange `#f26e1b` to solar core `#fffdf2`
- `enmaJade` — Deep abyssal pine `#04100b` through kingly emerald `#26cc84` to mint-white `#f4fff9`
- `opeCyan` — Deep trench `#05101c` through surgical cyan `#34b0f5` to pure white `#ffffff`
- `sunGod` — Midnight drum `#120924` through royal violet `#7852bf` to pearl cloud `#ffffff`
- `superKi` — Scorched amber `#1a0c04` through golden flare `#f7b025` to incandescent `#ffffff`
- `ukiyoWave` — Prussian woodblock `#050f24` through Hokusai indigo `#246ec2` to seafoam `#ffffff`
- `cursedFlash` — Void black `#05040a` through cursed magenta-crimson `#c91e52` to white `#ffffff`

---

## The 11 Effects (Across 4 Sub-Archetypes)

| ID | Name | Kind | Acted | Inspiration & Visual Signature |
| :--- | :--- | :--- | :--- | :--- |
| `haki/sovereign-clash` | **Sovereign's clash** | One-shot (`2.8s`) | Yes (`target`) | *One Piece* Conqueror's Haki: dripping black-red lightning coils on a cocked fist and detonates across an untouched `24px` air gap, splitting two willpower hemispheres with towering black-core trunks and Yutapon stone cubes. |
| `haki/cursed-crit` | **Black flash crit** | One-shot (`2.4s`) | Yes (`target`) | *JJK* Black Flash (*Kokusen*): azure cursed flame condenses on the fist; space pinches inward for two frames with an RGB chromatic split before bursting into an 8-ray obsidian-crimson lightning star. |
| `brawler/blazing-piston` | **Blazing piston** | One-shot (`3.0s`) | Yes (`target`) | *One Piece* Gear 2 *Red Hawk*: pink overdrive steam rises as a rear-cocked obsidian fist ignites in a fire vortex, then snaps through the target ringed by three Mach vapor cones in a roaring flame tunnel. |
| `brawler/mach-gatling` | **Mach gatling** | One-shot (`2.6s`) | Yes (`target`) | *One Piece* *Jet Gatling*: pink overdrive steam vents from a wide crouch before unleashing a cone of 52 overlapping blurred obsidian fists, tilted Mach rings, and rapid micro-hit-stops. |
| `brawler/quake-knuckle` | **Tremor air-shatter** | One-shot (`3.0s`) | Yes (`target`) | *One Piece* Whitebeard *Gura Gura*: a compressed sea-quake sphere slams into empty air, spiderwebbing space like cracked plate glass before blasting a shockwave hemisphere across heaving stone blocks. |
| `brawler/sun-awakening` | **Sun-drum awakening** | One-shot (`3.1s`) | Yes (`target`) | *One Piece* Gear 5: buoyant cartoon-physics bounce wrapped in a pearl *hagoromo* cloud-ribbon scarf; landing bends the floor into a rubbery sine wave before snatching a sky bolt bare-handed and hurling a star-pop blast. |
| `sword/dragon-iai` | **Three-fold dragon iai** | One-shot (`2.9s`) | Yes (`target`) | *One Piece* Zoro iai + *Tatsumaki*: emerald Haki licks off twin blades before a 2-frame vanish-dash past the target, a silent poised beat over humming cut-seams, and a delayed X-slash + coiling wind-dragon eruption. |
| `sword/spatial-room` | **Surgeon's spatial dome** | One-shot (`2.6s`) | Yes (`target`) | *One Piece* Law *ROOM* + *Tact*: a spinning cyan bead drops from a downward palm and blooms a spherical operating dome; zero-G stone cubes levitate before one horizontal katana cut shears the upper hemisphere. |
| `sword/water-wheel` | **Ukiyo-e breathing wheel** | One-shot (`2.3s`) | Yes (`target`) | *Demon Slayer* Water Wheel: a mist breath and sprint launch into a 360° mid-air sword spin (`yaw`), painting a Hokusai indigo ocean wheel crowned with hooked white seafoam claws and ink-rimmed droplets. |
| `ki/ki-eruption` | **Rising ki eruption** | Loop (`2.4s`) | Yes (`onBody`) | Classic shonen power-up loop: a jagged two-tier golden flame curtain roars upward with a white inner core, rhythmic ground shock-rings, bio-electric sparks, and levitating crater stones. |
| `ki/convergence-cannon` | **Convergence cannon** | One-shot (`3.2s`) | Yes (`target`) | Shonen buster wave (*Kamehameha*): cupped hands at the hip pull long light rays into a star, then thrust forward to fire a screen-spanning helical plasma wave that carves the floor into tumbling Yutapon cubes. |

---

## Preview the Live Interactive Gallery

Run the pack's zero-dependency server from the repository root (`d:\code\assets`):

```powershell
node anime-sakuga/tools/serve.mjs
```

Then open **`http://localhost:8092/anime-sakuga/gallery/`** in your browser (or launch the workspace-wide server `node tools/serve.mjs 8080` and switch to **Anime sakuga** in the top collection bar).
- Click any tile to scrub frame-by-frame, slow playback (`0.25×` / `0.5×` to inspect 2-frame impact flashes and spatial pinches), recolor live with any `SAKUGA_PAL` or core `pixelfx` ramp, roll new deterministic seeds, toggle the character (`actor`), mirror (`flip`), or export recolored PNG sprite sheets on the fly.

---

## Using the Assets in Your Game

### Option A — Pre-Baked Sprite Sheets (Godot, Unity, GameMaker, Phaser, Aseprite)
All 11 transparent PNG sprite sheets + Aseprite-compatible JSON atlases (with `meta.pixelfx` pivot, `fps`, `loop`, and `act` choreography keyframes) + master `index.json` are pre-baked in:
- `anime-sakuga/sheets/<category>/<name>.png`
- `anime-sakuga/sheets/<category>/<name>.json`
- `anime-sakuga/sheets/index.json`

### Option B — Live Procedural JS / Canvas Import
```js
import { createFrame, createAct, composite } from "./src/core/index.js";
import * as sovereignClash from "./anime-sakuga/fx/haki/sovereign-clash.js";

const frame = createFrame(320, 220);
const fx = createAct(sovereignClash, { x: 72, y: 164 });

// Every tick:
fx.update(dt);
fx.draw(frame); // writes both color & additive light buffers (with unlight black-core carving)
composite(frame, imageData.data, null);
```

---

## CLI Tooling (Isolated to `anime-sakuga/`)

```powershell
# Run all deterministic quality, bounds, loop-seam, palette & performance checks:
node anime-sakuga/tools/check.mjs

# Render contact sheets + acted 12fps step-strips into anime-sakuga/records/:
node anime-sakuga/tools/render.mjs --act --zoom 2

# Re-bake all PNG sprite sheets + JSON atlases into anime-sakuga/sheets/:
node anime-sakuga/tools/sheets.mjs

# Recompute gallery art-framing & peak thumbnail frames:
node tools/framing.mjs
```
