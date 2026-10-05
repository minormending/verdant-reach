// Type chart: attacking type -> defending type -> multiplier. Missing = 1.
//
// Design notes (plant logic first, Gen 2 feel second):
//
//  WOOD   (trees, roots, bark)
//    > water  roots drink it (the starter triangle).
//    > thorn  roots split rock; canopy shades out scrub and stone-plants.
//    < fire   wood is fuel.     < wood   same stuff.
//    < bug    sticky traps foul bark.   < dragon  ancient, hard lineages.
//  FIRE   (chili, fireweed, heat)
//    > wood, bug, frost  burns timber and traps, melts ice.
//    < fire, water       < thorn  succulents hold water (firebreak plants).
//    < dragon  dragon trees live in hot, fire-prone drylands.
//  WATER
//    > fire   douses it.
//    > thorn  overwatering rots cacti and succulents.
//    < water  < wood (drunk by roots)  < dragon.
//  BUG    (carnivorous plants and the insects around them)
//    > bloom  they eat the pollinators flowers depend on.
//    > wood   the swarms they lure include borers that riddle wood.
//    < fire   < thorn (spines guard)  < frost (cold stills insects)
//    < ghost  night plants bloom when most insects sleep.
//  BLOOM  (flowers, pollen, sunlight)
//    > water  an algal bloom smothers a pond.
//    > dragon flowering plants out-competed the ancient lineages.
//    < thorn  petals against spines.  < bug  flowers feed the prey.
//  GHOST  (night bloomers, pale mycoheterotrophs, decay)
//    > ghost  like haunts like.
//    > wood   ghost pipe steals tree sugar through shared fungi; rot.
//    < fire   flame-light dispels the dark.  < dragon (see below).
//  THORN  (prickles, spines, nettles, stone-plants)
//    > bloom, bug  spines shred petals and traps.
//    > frost  hard spines crack brittle, frozen tissue.
//    < wood   bark is too thick.  < thorn.  < ghost  nothing solid to pierce.
//  FROST
//    > wood, bloom, dragon  frost kills buds, soft growth and old tropicals.
//    < fire, water, frost.
//  DRAGON (ancient lineages: dragon's blood trees, ferns, cycads)
//    > dragon  old rivals.
//    > ghost   dragon's blood resin was burned for centuries as incense to
//              ward off spirits, so ghosts are weak to dragons (decided: YES).
//    < bloom   the flowers won.
//
// No immunities: every plant is made of living cells, so nothing is fully
// immune to anything. The lowest multiplier on a single type is 0.5.
//
// Defensive profile (weak / resists):
//   wood   fire bug ghost frost       / water wood thorn
//   fire   water                      / wood fire bug frost
//   water  wood bloom                 / fire water frost
//   bug    fire thorn                 / wood bloom
//   bloom  bug thorn frost            / dragon
//   ghost  ghost dragon               / bug thorn
//   thorn  wood water                 / fire bug bloom
//   frost  fire thorn                 / bug frost
//   dragon bloom frost dragon         / wood fire water

import type { TypeChart } from "../contracts";

export const TYPE_CHART: TypeChart = {
  wood:   { water: 2, thorn: 2, fire: 0.5, wood: 0.5, bug: 0.5, dragon: 0.5 },
  fire:   { wood: 2, bug: 2, frost: 2, fire: 0.5, water: 0.5, thorn: 0.5, dragon: 0.5 },
  water:  { fire: 2, thorn: 2, water: 0.5, wood: 0.5, dragon: 0.5 },
  bug:    { bloom: 2, wood: 2, fire: 0.5, thorn: 0.5, frost: 0.5, ghost: 0.5 },
  bloom:  { water: 2, dragon: 2, thorn: 0.5, bug: 0.5 },
  ghost:  { ghost: 2, wood: 2, fire: 0.5, dragon: 0.5 },
  thorn:  { bloom: 2, bug: 2, frost: 2, wood: 0.5, thorn: 0.5, ghost: 0.5 },
  frost:  { wood: 2, bloom: 2, dragon: 2, fire: 0.5, water: 0.5, frost: 0.5 },
  dragon: { dragon: 2, ghost: 2, bloom: 0.5 },
};
