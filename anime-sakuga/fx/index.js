// Anime Sakuga: every bespoke effect, by id.

import * as haki_sovereign_clash from "./haki/sovereign-clash.js";
import * as haki_cursed_crit from "./haki/cursed-crit.js";
import * as brawler_blazing_piston from "./brawler/blazing-piston.js";
import * as brawler_mach_gatling from "./brawler/mach-gatling.js";
import * as brawler_quake_knuckle from "./brawler/quake-knuckle.js";
import * as brawler_sun_awakening from "./brawler/sun-awakening.js";
import * as sword_dragon_iai from "./sword/dragon-iai.js";
import * as sword_spatial_room from "./sword/spatial-room.js";
import * as sword_water_wheel from "./sword/water-wheel.js";
import * as ki_ki_eruption from "./ki/ki-eruption.js";
import * as ki_convergence_cannon from "./ki/convergence-cannon.js";

export { categories, SAKUGA_PAL } from "./categories.js";

export const effects = {
  "haki/sovereign-clash": haki_sovereign_clash,
  "haki/cursed-crit": haki_cursed_crit,
  "brawler/blazing-piston": brawler_blazing_piston,
  "brawler/mach-gatling": brawler_mach_gatling,
  "brawler/quake-knuckle": brawler_quake_knuckle,
  "brawler/sun-awakening": brawler_sun_awakening,
  "sword/dragon-iai": sword_dragon_iai,
  "sword/spatial-room": sword_spatial_room,
  "sword/water-wheel": sword_water_wheel,
  "ki/ki-eruption": ki_ki_eruption,
  "ki/convergence-cannon": ki_convergence_cannon,
};
