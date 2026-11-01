# Sanguine Arcana (lab)

A test pack of dark-fantasy **love archetypes as animated tarot cards**, plus two one-shot **omens**, drawn entirely in
code on the pixelfx engine. It is a lab: self-contained, safe to delete, easy to keep.

## The pieces

Each card is an 80 x 128 loop with one **motion rule** that carries its meaning.

| | piece | archetype | motion rule |
|---|---|---|---|
| I | The Tethered | fated bond | **tension**: shears hover over a red thread; it pulls taut and only glows brighter when they bite |
| II | The Thorn Cage | possession | **constriction**: a briar cage tightens round a heart, it beats faster and bleeds, then it lets go |
| III | The Twin Moons | star-crossed | **near-miss**: a pale moon and a blood moon trade places in an eclipse that never becomes a kiss |
| IV | The Vigil | love after death | **persistence**: a wind nearly kills the candle, a spirit-flame leans in and lights it again |
| - | Heartbreak (omen) | betrayal | a heart cracks, shatters into mirror shards with glowing gold seams |
| - | Blood Pact (omen) | devotion | two sparks meet in a drop of blood that falls into a rune seal and rises as a wax seal on crossed ribbons |

## Run it

From the repo root (nothing to install):

```bash
node tools/serve.mjs 8080
```

then open <http://localhost:8080/labs/sanguine-arcana/>. Click a piece to replay it. The viewer can recolor everything
(palette), scrub the seed and zoom.

```bash
node labs/sanguine-arcana/tools/lab.mjs render arcana/the-vigil --zoom 4        # contact sheet -> out/arcana/the-vigil/contact.png
node labs/sanguine-arcana/tools/lab.mjs render omens --gif                      # a category, plus an animated GIF each
node labs/sanguine-arcana/tools/lab.mjs render arcana/the-vigil --at 0.4,2.1    # just those moments, for looking closely
node labs/sanguine-arcana/tools/lab.mjs render arcana/the-tethered --sheet      # transparent sprite sheet + Aseprite-style JSON
node labs/sanguine-arcana/tools/lab.mjs check                                   # determinism, seams, spills, empty ends, speed
node labs/sanguine-arcana/tools/lab.mjs overview                                # every piece side by side -> out/overview.gif
```

`out/` is git-ignored.

## Delete it

Remove the folder. Nothing outside it was changed: no edits to `src/`, `gallery/`, `tools/` or `package.json`, and
the lab imports only `src/core` and `tools/lib`.

```bash
rm -rf labs/sanguine-arcana
```

## Keep a piece

Move its file into the library and regenerate the index:

```bash
git mv labs/sanguine-arcana/fx/arcana/the-vigil.js src/fx/arcana/the-vigil.js
# then in the moved file: fix the two imports (../../../../src/core/ -> ../../core/, ../../lib/shared.js -> a helper beside it)
node tools/index.mjs
```

Cards share `lib/shared.js` (palettes, the gilt frame, the heart), so move that too, or inline what a piece needs.
A new category also needs a line in `src/fx/categories.js`.

## Add one

Same contract as `src/fx`, see `docs/AUTHORING.md`: a file exporting `meta` and `draw(p, t, o)` (pure loop) or
`create(o)` (simulation). Cards use `cardMeta`, `windowBack`, `cardFront`, `foilSheen` and `clipCard` from
`lib/shared.js`. Then add the file to `fx/index.js` for the viewer.

## Layout

```
fx/arcana/*.js   fx/omens/*.js    the effects
fx/index.js                        the list the viewer reads
lib/shared.js                      palettes (BLOOD GILT MOON VIOLET), card frame, heart
tools/lab.mjs                      render / check / overview, over the repo's tools/lib
index.html  viewer.js              the standalone viewer
```
