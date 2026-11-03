# Shonen Arts (lab)

Anime-inspired **signature techniques** as pixel-art effects, drawn entirely in code on the pixelfx engine. Each one
captures how a technique *moves and feels* (the charge, the release, the freeze on contact, the fall-out), never a
character: the stock pixelfx body performs everything. It is a lab: self-contained, safe to delete, easy to keep.

## The pieces

| | technique | archetype | motion rule |
|---|---|---|---|
| I | Spiral Sphere | the spinning sphere in the palm | **winding**: wind spirals in, winds tighter, is carried in a sprint, grinds into the target and unwinds as a spiral shockwave |
| II | Lightning Edge | lightning in the hand | **piercing**: lightning crackles in a low hand, louder and wilder, is dragged through the floor in a sprint and driven straight through the target as a spear |

**Summons** share one core (`lib/summon.js`): hand seals, a palm slammed to the floor, a seal written in the summon's element,
and a **camera** (`export const camera`) that frames the caster tight and pulls out fast until whatever arrives fits. They play on a
384 x 216 world stage; the viewer and `lab.mjs act` film it through the camera, nearest-neighbour, so pixels stay square.

| | summon | size (camera pulls out to) | element & arrival |
|---|---|---|---|
| III | Stone Colossus | huge, ~135 px (1.2x) | the floor quakes and cracks with amber light, rock spikes burst up, a mossy boulder giant heaves itself out of the ground; furnace eyes, a roar of dust; sinks back |
| IV | Grove Warden | large, ~140 px with antlers (1.2x) | vines run out across the floor and leaf, grass springs up, flowers open, vines spiral up and weave a bark-and-antler guardian; petals, fireflies; withers |
| V | Rime Wraith | medium, ~118 px (1.5x) | frost ferns, a ring of ice spikes, a column of ice with a figure inside that cracks and bursts into shards; she hovers, shards orbiting, snow; melts to snow |
| VI | Shadow Legion | wide, an army (1.2x) | a black pool spreads, shadow writhes up, soldiers rise rank by rank and then a horned knight; eyes light in turn, dark flame; they sink back |
| VII | Crow Sovereign | small, ~70 px (1.6x) | feathers fountain, a murder of crows sweeps in and wheels into a vortex that collapses into a masked master; a dozen crows revolve round him; he bursts back into the flock |

## Run it

From the repo root (nothing to install):

```bash
node tools/serve.mjs 8080
```

then open <http://localhost:8080/labs/shonen-arts/>. Click a technique to step through it frame by frame. The viewer can
recolor everything (palette), hide the body and target, scrub the seed and zoom.

```bash
node labs/shonen-arts/tools/lab.mjs act techniques/spiral-sphere --gif           # performed: body, target, freeze, shake
node labs/shonen-arts/tools/lab.mjs act techniques/spiral-sphere --at 1.0,1.7,2.2  # just those moments
node labs/shonen-arts/tools/lab.mjs render techniques/spiral-sphere --sheet      # the effect alone + Aseprite-style JSON
node labs/shonen-arts/tools/lab.mjs check                                        # determinism, spills, empty ends, speed
```

`out/` is git-ignored.

## Delete it

Remove the folder. Nothing outside it was changed, and the lab imports only `src/core` and `tools/lib`.

## Add one

Same contract as `src/fx` (see `docs/AUTHORING.md`): a file exporting `meta`, `create(o)` (or `draw(p, t, o)`), and an
`act` so a body performs it. If the effect has to follow a hand, read the pose with `poseAt(act.poses, t)` as
`spiral-sphere.js` does. Then add the file to `fx/index.js` for the viewer.

## Layout

```
fx/techniques/*.js     the techniques
fx/summons/*.js        the summons
fx/index.js            the list the viewer reads
lib/shared.js          palettes (AZURE VOLT ASH KI), dithered tone, great-circle orbits, lightning inker, hand tracking
lib/summon.js          the summoning core: caster act, camera, seal circle, rune trail, shading (ball, slab) with clipping
tools/lab.mjs          act / render / check / overview, over the repo's tools/lib
index.html  viewer.js  the standalone page
```
