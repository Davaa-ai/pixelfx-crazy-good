# anime lab

Twenty effects inspired by **Demon Slayer**, **Jujutsu Kaisen**, **Attack on Titan**, **Bleach** and **Solo Leveling**,
built on pixelfx's own mechanics: the two buffers (color and additive light), seeded particles, acts with a wind-up, a freeze on contact and a
target that takes the hit, and loops that tile with no seam.

It is a separate bench. Nothing here is in `src/fx`, the registry, the catalog, the README count or the main gallery,
so you can run, break and delete all of it without touching the library. The only shared file that changed is
`tools/lib/fxlib.mjs`, by one backwards-compatible line: an optional `PIXELFX_FX_DIR` that points the tools at another
folder. Unset, every tool behaves exactly as before.

These are generic motifs (breathing-style slashes, cursed-energy-style orbs and domains, wire-and-gas grapple gear).
No characters, costumes, symbols or logos are drawn.

## try them

**Live, in the browser** (the full gallery player: acts, mirror, palettes, seeds, sprite sheets):

```bash
node tools/serve.mjs
# open http://localhost:8080/anime/gallery/
```

**From the terminal**, through `anime/run.mjs`, which runs any pixelfx tool against `anime/fx`:

```bash
node anime/run.mjs render demon-slayer/thunder-flash --gif       # contact sheet + GIF in records/
node anime/run.mjs act jujutsu-kaisen/black-flash --mp4          # the whole act, character and target
node anime/run.mjs act attack-on-titan/odm-swing --from 0.3 --to 1.1 --step 0.05 --zoom 3
node anime/run.mjs check                                          # all of them: spills, seams, determinism, speed
node anime/run.mjs sheets                                         # sprite sheets -> sheets/<series>/<name>.png
```

`node anime/build-index.mjs` regenerates `anime/fx/index.js` (what the gallery reads) and `anime/CATALOG.md` after you add
or rename an effect. GIF previews of everything are in [`previews/`](previews).

## the effects

### demon slayer

| effect | what happens | pixelfx mechanic it leans on |
|---|---|---|
| **thunder flash** [<sub>gif</sub>](previews/demon-slayer-thunder-flash.gif) | A sheath-draw crouch with static crawling over him, then a zig-zag lightning dash. He is already past the target when the cut finally shows, with the click of the sheath. | stepped stroke flicker, an act whose hit lands half a second after the effect, after-images |
| **water wheel** [<sub>gif</sub>](previews/demon-slayer-water-wheel.gif) | A spinning leap trails a ribbon of water with curling foam crests. It rolls off along the floor and rears up into a breaking wave over the target. | a ribbon traced from a moving point, split into near and far halves (`drawBack` / `draw`), a real yaw spin |
| **rising sun** [<sub>gif</sub>](previews/demon-slayer-rising-sun.gif) | A low blade swings up in one huge crescent of flame, tongues streaming off it. A sun rises behind the target and sheds embers. | a polar shader for the crescent, `FIRE` puffs, an effect drawn behind the target |
| **slayer mark** [<sub>gif</sub>](previews/demon-slayer-slayer-mark.gif) | A heartbeat loop: crimson veins race over the body, a mark flares on the brow, red light breathes round him, steam pours off. | `onBody` loop that reads the actor's mask, seamless `cycle` particles |

### jujutsu kaisen

| effect | what happens | pixelfx mechanic it leans on |
|---|---|---|
| **black flash** [<sub>gif</sub>](previews/jujutsu-kaisen-black-flash.gif) | Time stretches as rings pull into the fist. At contact: a white speed-line frame, a void, red-edged black lightning, and a long held freeze. | a 0.28 s hit-stop and shake, translucent void disc, three re-struck bolt tangles |
| **orb convergence** [<sub>gif</sub>](previews/jujutsu-kaisen-orb-convergence.gif) | One hand pulls (a blue orb, debris falling in), the other pushes (a red orb, rings out). They merge into a violet sphere whose beam erases a hole through the target. | orbs follow the act's own hand positions (`poseAt`), a hole drawn over the target |
| **domain expansion** [<sub>gif</sub>](previews/jujutsu-kaisen-domain-expansion.gif) | A full-screen one: a seal, a void unfolding with sigils in its sky and a grid on its floor, a slash barrage that speeds up, then cracks and shards. | the 320 x 180 screen-effect contract of the transitions, clipped painter |
| **cursed aura** [<sub>gif</sub>](previews/jujutsu-kaisen-cursed-aura.gif) | A loop: dark violet flame lifting off the whole body with a bright rim, a wave of light climbing him each beat, black sparks, burning eyes. | `onBody` loop, mask outline, loop-safe noise |

### attack on titan

| effect | what happens | pixelfx mechanic it leans on |
|---|---|---|
| **ODM swing** [<sub>gif</sub>](previews/attack-on-titan-odm-swing.gif) | Two hooks fire and bite, the wires snap taut, gas jets haul him up in an arc. A spinning double cut through the nape, then steam pours off the wound. | a body path shared between the act and the effect, wire slack, vapour jets |
| **thunder spear** [<sub>gif</sub>](previews/attack-on-titan-thunder-spear.gif) | A cabled lance lodges in the target and blinks, faster and faster. Then a white flash, blue thunder arcs, a ring along the floor and a rolling smoke column. | a staged timeline (fly, lodge, fuse, blast), `Bits` debris, `SMOKE` column |
| **titan shift** [<sub>gif</sub>](previews/attack-on-titan-titan-shift.gif) | A pinprick and a tremor, then a twisting double-helix lightning bolt, a white pillar, a dome of light, glowing cracks and a wall of boiling steam. | strands that pass in front of and behind each other, translucent clipped dome |
| **rumbling** [<sub>gif</sub>](previews/attack-on-titan-rumbling.gif) | A loop of giant footfalls far off: floor rings, dust bursts, racing cracks, hopping pebbles. Each step shakes the whole picture. | an act with only `hits` and `shake`, so the environment, not a character, drives the freeze |

### bleach

| effect | what happens | pixelfx mechanic it leans on |
|---|---|---|
| **moon-fang wave** [<sub>gif</sub>](previews/bleach-moon-fang-wave.gif) | Black fire licks off the raised blade. One cut down sends a towering black crescent with a crimson rim and a white-hot edge tearing along the floor, through the target, leaving a trench that cools from white to dull red. | a crescent drawn with a polar shader whose back edge frays on noise, `unlight` so its black core stays black under the glow, `floorScar` |
| **thousand petals** [<sub>gif</sub>](previews/bleach-thousand-petals.gif) | The blade comes apart from the tip down into 230 petal-blades. A flick of the hilt streams them over to the target, where they close into a whirling sphere, crush in, burst, then flow home and set back into steel. | every petal's path is a function of time (cloud, bezier stream, tilted orbit, return) blended with its own lag; the sphere's far half is drawn behind the target |
| **release pillar** [<sub>gif</sub>](previews/bleach-release-pillar.gif) | Blade held out, pebbles trembling. Then a pillar of pale pressure erupts to the sky, wound with spiral streams and tearing wind lines, and collapses into him, leaving a black, crimson-edged aura. | a column shader with streak noise, helices split into near and far halves, `band` shock rings, light taken back off his body so he reads as a figure in the glare |
| **fingertip cero** [<sub>gif</sub>](previews/bleach-fingertip-cero.gif) | Crimson motes stream into a black-rimmed sphere at a raised fingertip, spun round with rings. It fires a black-edged beam with a white heart and shock rings racing down it, and the target explodes. | `STREAK` gathering, a beam shader with a rounded head, `unlight` along its black rim, a hand lined up with the muzzle |

### solo leveling

| effect | what happens | pixelfx mechanic it leans on |
|---|---|---|
| **dungeon gate** [<sub>gif</sub>](previews/solo-leveling-dungeon-gate.gif) | A loop: an oval rift of crackling light over a whirlpool that falls away into the dark, motes and floor mist drawn in spiralling. Recolor it red for the bad ones. | a pure `draw(t)` loop: log-spiral shader, rim wobble from `loopNoise`, `cycle` particles, static re-struck 12 times a second |
| **system window** [<sub>gif</sub>](previews/solo-leveling-system-window.gif) | A point of blue light opens into a line, then a holographic panel: corner brackets glint, a notice types itself in, LEVEL UP flares, a scan line sweeps it. Then it tears into glitched slices and folds away. | translucent glass with `blend`, pixel text typed by time, row-tearing glitch; the words are options (`title`, `head`, `line`) |
| **ruler's grip** [<sub>gif</sub>](previews/solo-leveling-rulers-grip.gif) | An open palm pushes ripples through the air. A giant hand of violet light wraps the target, fingers in front and behind, while stones lift off the floor. A clench crushes it, a sweep of the arm flings it. | fingers as bands on a tilted ellipse round the target, split by depth into `drawBack` and `draw`; three hits (shiver, crush, fling) |
| **twin dagger rush** [<sub>gif</sub>](previews/solo-leveling-twin-dagger-rush.gif) | Shadow pools at his feet, then he steps through it round the target four times (`yaw` turns him to face it from behind), a cut at every arrival. He lands past it with his back turned, and only then does the great X tear open. | snapped act keys as teleports, two daggers (`offWeapon`), a delayed X with speed lines, a long freeze on the last hit |

`node anime/run.mjs check` passes all twenty with no failures. A few new ones warn that their glow reaches a little past the
canvas (a pillar that goes to the sky will do that).

## where things are

```
anime/
  fx/<series>/<name>.js    the effects (same contract as src/fx: meta, create or draw, optional act)
  fx/_lib.js               ribbons along a path, path glow, manga speed-line bursts, stroke flicker, unlight, floor scars
  fx/categories.js         the five series, for the gallery
  fx/index.js              generated registry (node anime/build-index.mjs)
  gallery/                 the live viewer: the shared studio pointed at this registry
  run.mjs                  run render / act / check / list / sheets against anime/fx
  previews/                GIFs of every effect
  CATALOG.md               generated list
```

The viewer is a short config over `gallery/studio.js`, the studio every collection shares, so it needs no copy of the
player. Run `node tools/framing.mjs` after adding an effect so the studio can frame it on its art.

## making one more

An effect is one file; copy the closest one and change it. The loop is the same as the main library's: render, look at
`records/<id>/contact.png`, fix the worst thing, render again, then `node anime/run.mjs check <id>`. For anything with a
character, `node anime/run.mjs act <id>` shows consecutive 12 fps steps, which is where motion bugs show. See
[docs/AUTHORING.md](../docs/AUTHORING.md) for the contract and the quality bar.

## promoting one into the main library

Once you like one: move `anime/fx/<series>/<name>.js` into `src/fx/<category>/`, change its imports from
`../../../src/core/index.js` to `../../core/index.js`, inline anything it takes from `anime/fx/_lib.js` (or move that file
to a category helper), then run `node tools/index.mjs`. Until then, nothing in the main library knows these exist.
