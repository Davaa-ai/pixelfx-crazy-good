// Every effect in the lab, by id, for the viewer. Add a line here when you add a file. (tools/lab.mjs reads the folders, not this.)

import * as the_tethered from "./arcana/the-tethered.js";
import * as the_thorn_cage from "./arcana/the-thorn-cage.js";
import * as the_twin_moons from "./arcana/the-twin-moons.js";
import * as the_vigil from "./arcana/the-vigil.js";
import * as heartbreak from "./omens/heartbreak.js";
import * as blood_pact from "./omens/blood-pact.js";

export const effects = {
  "arcana/the-tethered": the_tethered,
  "arcana/the-thorn-cage": the_thorn_cage,
  "arcana/the-twin-moons": the_twin_moons,
  "arcana/the-vigil": the_vigil,
  "omens/heartbreak": heartbreak,
  "omens/blood-pact": blood_pact,
};

export const groups = [
  { id: "arcana", name: "Arcana", blurb: "animated tarot cards, one love archetype each. Every card is a loop with one motion rule." },
  { id: "omens", name: "Omens", blurb: "one-shot effects: a moment, played once, that ends empty." },
];
