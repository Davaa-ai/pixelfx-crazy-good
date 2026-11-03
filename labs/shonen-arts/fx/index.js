// Every technique in the lab, by id, for the viewer. Add a line here when you add a file. (tools/lab.mjs reads the folders, not this.)

import * as spiral_sphere from "./techniques/spiral-sphere.js";
import * as lightning_edge from "./techniques/lightning-edge.js";
import * as stone_colossus from "./summons/stone-colossus.js";
import * as grove_warden from "./summons/grove-warden.js";
import * as rime_wraith from "./summons/rime-wraith.js";
import * as shadow_legion from "./summons/shadow-legion.js";
import * as crow_sovereign from "./summons/crow-sovereign.js";

export const effects = {
  "techniques/spiral-sphere": spiral_sphere,
  "techniques/lightning-edge": lightning_edge,
  "summons/stone-colossus": stone_colossus,
  "summons/grove-warden": grove_warden,
  "summons/rime-wraith": rime_wraith,
  "summons/shadow-legion": shadow_legion,
  "summons/crow-sovereign": crow_sovereign,
};

export const groups = [
  { id: "techniques", name: "Techniques", blurb: "signature moves performed by a body: a wind-up, a release, a hit that freezes the frame, a long fall-out." },
  { id: "summons", name: "Summons", blurb: "hand seals, a palm on the floor, a seal written in the summon's element, and something arrives. The camera pulls out to fit whatever it is." },
];
