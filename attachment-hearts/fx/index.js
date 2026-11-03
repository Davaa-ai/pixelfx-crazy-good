// Attachment Hearts (ТАТАЛЦАЛ): all 8 procedural pixel-art effects (4 hovering relic loops + 4 awakening surges).

import * as magnetic_heart from "./magnetic/magnetic-heart.js";
import * as magnetic_pull from "./magnetic/magnetic-pull.js";
import * as armored_heart from "./armored/armored-heart.js";
import * as armor_clamp from "./armored/armor-clamp.js";
import * as polar_heart from "./polar/polar-heart.js";
import * as thermal_clash from "./polar/thermal-clash.js";
import * as luminous_heart from "./luminous/luminous-heart.js";
import * as radiant_bloom from "./luminous/radiant-bloom.js";

export { categories, HEART_PAL } from "./categories.js";

export const heroIds = [
  "magnetic/magnetic-heart",
  "armored/armored-heart",
  "polar/polar-heart",
  "luminous/luminous-heart",
];

export const effects = {
  "magnetic/magnetic-heart": magnetic_heart,
  "magnetic/magnetic-pull": magnetic_pull,
  "armored/armored-heart": armored_heart,
  "armored/armor-clamp": armor_clamp,
  "polar/polar-heart": polar_heart,
  "polar/thermal-clash": thermal_clash,
  "luminous/luminous-heart": luminous_heart,
  "luminous/radiant-bloom": radiant_bloom,
};
