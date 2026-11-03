# PixelFX: Complete Asset & Integration Instructions

This document provides complete instructions for using, modifying, and authoring the **PixelFX** asset library imported into this workspace.

---

## 1. Architecture: Pixel Art Effects in Code

PixelFX contains **244 procedural pixel art effects and animations**, each implemented as code rather than pre-rendered image files. The effects are built upon two core principles developed by Hugo Duprez:

1. **Two Buffers**:
   - `color`: 8-bit RGBA pixel buffer supporting solid pixels, 4×4 Bayer matrix ordered dithering, or true 32-bit linear alpha blending.
   - `light`: Additive illumination buffer composited directly on top of color and backgrounds, creating intense, glowing cores (fire, lightning, plasma, magic).
2. **Two Execution Models**:
   - **Pure Effects** (`draw(p, t, o)`): Time-deterministic mathematical functions of time $t$. Guaranteed zero-seam loops (auroras, portals, flames, waterfalls, loops).
   - **Simulated Effects** (`create(o)` returning `{ update(dt), draw(p) }`): Physics-driven particle engines running at 120 Hz with drag, gravity, collision bounces, and embers. Used for explosions, impacts, and spells.
3. **Deterministic Seeding**: Every random parameter is generated using a seedable PRNG (`Rng`). Frame $N$ renders identically on every execution.
4. **Local Coordinate System**: Origin $(0, 0)$ is the anchor point (e.g. feet of an actor, point of impact, nozzle of a gun, base of a torch). Positive $X$ is right, positive $Y$ is down. 1 unit = 1 pixel.

---

## 2. Integration Guides

### A. Browser & JavaScript Engines (Canvas, Phaser, PixiJS, Three.js, Kaplay)

The engine and effects have zero external runtime dependencies. You can import modules directly:

```javascript
import { createFrame, clearFrame, createFx, createAct, composite } from "./src/core/index.js";
import * as frostNova from "./src/fx/ice/frost-nova.js";

// Setup canvas frame buffer at your game's pixel resolution (e.g. 320x180)
const frame = createFrame(320, 180);
const imgData = new ImageData(320, 180);

// Instantiate effect
const fx = createFx(frostNova, {
  x: 160,
  y: 120,
  flip: false,       // mirror horizontally
  palette: null,     // override color ramp (or pass custom PAL array)
  seed: 42
});

// Game loop tick
function tick(dt) {
  fx.update(dt);
  clearFrame(frame);

  // Layered drawing
  fx.draw(frame, "back");       // Back layer (behind characters)
  renderCharacters(frame);       // Your game character sprites
  fx.draw(frame, "front");      // Front layer (over characters)

  // Composite color + light glow over optional background (or null for transparent)
  composite(frame, imgData.data, null);
  ctx.putImageData(imgData, 0, 0);

  if (fx.done()) {
    // One-shot effects finish automatically; loops can be stopped with fx.stop()
  }
}
```

### B. Game Engines via Sprite Sheets (Godot, Unity, GameMaker, Defold, Bevy)

Every effect in the library has been exported to the `sheets/` directory:
- `sheets/<category>/<name>.png`: Transparent PNG grid containing every frame at native pixel resolution.
- `sheets/<category>/<name>.json`: Aseprite-compatible frame atlas JSON containing frame rects, durations, and `meta.pixelfx` (FPS, loop flag, frame count, pivot coordinate).
- `sheets/index.json`: Master index of all 244 effects with metadata and paths.

#### Godot Engine
1. Copy the PNG and JSON into your Godot project.
2. In the Import dock, set Texture filtering to **Nearest** and disable compression.
3. Use the Aseprite Wizard / JSON Atlas importer, or create an `AnimatedSprite2D`.
4. Set the sprite offset/pivot to `meta.pixelfx.pivot`.

#### Unity
1. Set Texture Type to **Sprite (2D and UI)**.
2. Set Sprite Mode to **Multiple**.
3. Set Filter Mode to **Point (no filter)** and Compression to **None**.
4. Slice frames using the JSON grid cell dimensions or Aseprite importer.

---

## 3. The "Act" System (Character Choreography & Hit-Stop)

Combat effects look detached if characters do not react. PixelFX includes a 3D skeletal actor rig and choreography system:

```javascript
export const act = {
  target: { x: 58 },
  poses: [
    [-0.55, GUARD],             // Wind-up: begins 0.55s before effect release
    [-0.30, WIND_UP],
    [0.00,  CUT, "snap"],       // Release key at t=0
    [0.06,  FOLLOW_THROUGH],
    [0.86,  GUARD]              // Cooldown / recovery
  ],
  hits: [
    { t: 0.06, stop: 0.14, shake: 0.18, amp: 2, push: 2.8, straw: 18 }
  ]
};
```

### Key Principles:
- **Wind-up (Negative Time)**: Keys before $t=0$ prepare the motion (pulling back a hammer, coiling for a jump, drawing a bow).
- **Hit-Stop / Freeze**: During a hit (`stop: 0.14`), the simulation pauses completely for 140 ms to deliver visceral impact.
- **Screen Shake**: `amp` and `shake` specify the displacement vector `[sx, sy]` to apply to the camera.
- **Target Reactions**: `push` knocks the target back; `skin` applies elemental overlays (e.g. `char`, `ice`, `shock`, `poison`).

---

## 4. Asset Directory Breakdown

### A. Elemental Categories
- **Fire (`src/fx/fire/`, `sheets/fire/`)**:
  - `brazier`, `campfire`, `candle`, `fire-breath`, `fire-ring`, `fire-tornado`, `fireball`, `flame-pillar`, `flamethrower`, `meteor`, `spirit-flame`, `torch`
- **Water (`src/fx/water/`, `sheets/water/`)**:
  - `bubbles`, `drip`, `fountain`, `geyser`, `rain-splash`, `ripples`, `splash`, `water-jet`, `water-orb`, `waterfall`, `wave-crash`, `whirlpool`
- **Ice (`src/fx/ice/`, `sheets/ice/`)**:
  - `blizzard-vortex`, `freeze`, `frost-breath`, `frost-nova`, `ice-crystal`, `ice-lance`, `ice-shatter`, `ice-spikes`, `icicle-fall`, `snowflake-burst`
- **Lightning (`src/fx/lightning/`, `sheets/lightning/`)**:
  - `ball-lightning`, `chain-lightning`, `charge-up`, `electrified`, `lightning-strike`, `plasma-ball`, `spark-arc`, `storm-cloud`, `tesla-coil`, `thunderclap`, `zap-hit`
- **Nature (`src/fx/nature/`, `sheets/nature/`)**:
  - `acid-splash`, `boulder`, `earth-spike`, `healing-bloom`, `leaf-storm`, `poison-cloud`, `quake`, `root-snare`, `spore-burst`, `thorns`, `tornado`, `toxic-puddle`, `vine-whip`
- **Arcane (`src/fx/arcane/`, `sheets/arcane/`)**:
  - `arcane-beam`, `arcane-missiles`, `arcane-orb`, `blink-in`, `blink-out`, `magic-circle-cast`, `rune-pulse`, `rune-trap`, `teleport`, `wand-spark`, `warp-portal`, `wizard-shield`
- **Holy (`src/fx/holy/`, `sheets/holy/`)**:
  - `blessing`, `divine-shield`, `feather-burst`, `halo`, `heal`, `healing-ring`, `holy-burst`, `holy-rays`, `holy-strike`, `purify`
- **Shadow (`src/fx/shadow/`, `sheets/shadow/`)**:
  - `black-hole`, `curse`, `dark-explosion`, `eclipse`, `grasping-hands`, `hex-sigil`, `life-steal`, `necro-skulls`, `shadow-flames`, `shadow-tendrils`, `soul-drain`, `void-orb`
- **Weather (`src/fx/weather/`, `sheets/weather/`)**:
  - `aurora`, `blizzard`, `cherry-blossoms`, `clouds`, `falling-leaves`, `fireflies`, `fog`, `god-rays`, `rain`, `shooting-stars`, `snow`, `storm`

### B. Sci-Fi Category (`src/fx/scifi/`, `sheets/scifi/`)
- `emp-blast`: Expanding electromagnetic shock ring with dead-pixel distortion and circuit shorts.
- `energy-core`: Pulsing plasma sphere housed inside a steel containment lattice with orbiting magnetic rings.
- `force-field`: Hexagonal kinetic energy barrier with impact deflections and spark scattering.
- `glitch`: Digital signal corruption with chromatic RGB split, horizontal slice tearing, and noise quantization.
- `hologram`: Ground projector casting an oscillating 3D wireframe mesh with interlaced scanlines.
- `jetpack`: Twin dual thrusters with high-velocity shock diamonds and billowy exhaust plumes.
- `laser-grid`: Security laser emitter array with scissoring detection beams and floor scorch particles.
- `scanner`: Target lock-on brackets with diagnostic vertical sweep raster and status readout.
- `teleporter-pad`: Metallic ground dais with rising ring emitters and vertical teleportation column.
- `tractor-beam`: Gravity manipulation projection lifting fractured terrain chunks with dust vortex.
- `warp-in`: High-intensity quantum descent beam assembling actor silhouette line by line.
- `warp-out`: Dematerialization beam dissolving character into rising energy streams.

### C. Effects Categories
- **Explosions (`src/fx/explosions/`, `sheets/explosions/`)**:
  - `barrel-explosion`, `big-explosion`, `cartoon-pow`, `dirt-explosion`, `firework-burst`, `firework-rocket`, `grenade`, `implosion`, `nuke`, `plasma-explosion`, `small-explosion`, `smoke-bomb`
- **Impacts (`src/fx/impacts/`, `sheets/impacts/`)**:
  - `blunt-hit`, `bullet-impact`, `crit-hit`, `ground-slam`, `heavy-landing`, `hit-flash`, `punch-impact`, `shield-block`, `slice-impact`, `spike-hit`, `wall-slam`
- **Projectiles (`src/fx/projectiles/`, `sheets/projectiles/`)**:
  - `arrow`, `bullet-tracer`, `cannon-shot`, `energy-disc`, `homing-missile`, `laser-beam`, `magic-dart`, `plasma-bolt`, `rock-throw`, `shuriken`, `signal-flare`, `sniper-trail`, `sonic-wave`
- **Melee (`src/fx/melee/`, `sheets/melee/`)**:
  - `claw-swipe`, `dagger-flurry`, `double-slash`, `hammer-smash`, `heavy-cleave`, `scythe-reap`, `spear-sweep`, `spin-slash`, `sword-slash`, `thrust`, `uppercut`, `whip-crack`
- **Moves (`src/fx/moves/`, `sheets/moves/`)**:
  - `arrow-shot`, `dash-strike`, `earth-stomp`, `fireball-throw`, `ground-pound`, `holy-smite`, `ice-lance-throw`, `lightning-call`, `meteor-call`, `pistol-shots`, `rocket-launcher`, `sword-combo`
- **Spawn & Death (`src/fx/spawn/`, `sheets/spawn/`)**:
  - `coin-drop`, `disintegrate`, `dissolve-burn`, `egg-hatch`, `poof`, `respawn-beam`, `soul-rise`, `summon-portal`, `tombstone`, `vortex-spawn`
- **Status (`src/fx/status/`, `sheets/status/`)**:
  - `bleeding`, `burning`, `charmed`, `confused`, `cursed`, `frozen`, `haste`, `petrified`, `poisoned`, `rage`, `sleep`, `slowed`, `stunned`

---

## 5. Tooling & CLI Commands

- **Render an effect**:
  ```bash
  node tools/render.mjs fire/torch --sheet
  node tools/render.mjs ice/frost-nova --gif
  ```
- **Export sprite sheets**:
  ```bash
  node tools/sheets.mjs scifi fire water
  ```
- **Verify effect code quality**:
  ```bash
  node tools/check.mjs fire/torch
  ```
- **Run the local interactive gallery**:
  ```bash
  node tools/serve.mjs 8080
  # Open http://localhost:8080/gallery/
  ```
