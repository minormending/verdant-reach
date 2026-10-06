// Move -> animation family. Pure data so it can be tested: every move in the
// game maps to one of these families (with a palette/variant), and the scene's
// renderer (./movefx) draws each family differently.

import type { Move, TypeId } from "../contracts";

export const ANIM_FAMILIES = [
  "vine_whip",    // a vine grows across and lashes
  "seed_arc",     // seeds / burrs lobbed in arcs
  "heavy_drop",   // something heavy falls from above (acorn, gourd, log, fossil)
  "spin_seed",    // a winged samara helicopters in
  "wind_seeds",   // dandelion parachutes ride a breeze
  "slash",        // blade-like cuts (leaf edge, hook thorns, fronds)
  "drain",        // motes drawn out of the foe into the user
  "glob",         // sticky liquid lobbed and splattered (sap, resin, oil)
  "gale",         // a whirling storm of leaves or petals
  "roots",        // roots burst up from the ground
  "toxin",        // poison bubbles well up
  "harden",       // the user's surface toughens (bark, sap, folding)
  "bristle",      // spines stand up all round the user
  "shield",       // a curled-up shell (protect)
  "light_rays",   // sunlight pours down (photosynthesis)
  "rush",         // speed lines and a sugar sparkle
  "grow",         // leaves unfurl outward from the user
  "ember",        // a hot seed, then embers flicker up
  "smoke",        // smouldering smoke and sparks
  "burst",        // radial explosion of seeds or petals
  "blaze",        // a wall of fire along the ground
  "droplet",      // a heavy drop splashes
  "wave",         // a wave sweeps across
  "downpour",     // rain streaks hammer the foe
  "slam",         // a broad pad smacks the foe
  "pitfall",      // pitcher walls rise and swallow
  "mist",         // drifting mist clouds
  "snap",         // flytrap jaws clamp shut
  "tendrils",     // sundew tentacles / dodder coils
  "lure",         // nectar and scent drift and swirl
  "spores",       // spores drift across and hang
  "beam",         // a focused beam of light
  "ghost_touch",  // pale wisps reach out of the dark
  "wither",       // the foe greys and drops leaves
  "volley",       // thorns / needles fired in a line
  "frost",        // ice crystals grow on the foe, then shatter
  "blizzard",     // snow drifts pile up on the foe
  "weather_sun",
  "weather_rain",
  "weather_frost",
] as const;
export type AnimFamily = (typeof ANIM_FAMILIES)[number];

/** Optional variant (shape or palette) within a family. */
export interface AnimSpec {
  family: AnimFamily;
  variant?: string;
}

const S = (family: AnimFamily, variant?: string): AnimSpec => ({ family, variant });

/** Explicit per-move choices (every move in src/data/moves.ts). */
export const MOVE_ANIMS: Record<string, AnimSpec> = {
  // wood
  vine_lash: S("vine_whip"),
  acorn_drop: S("heavy_drop", "acorn"),
  samara_spin: S("spin_seed"),
  leaf_edge: S("slash", "leaf"),
  gourd_slam: S("heavy_drop", "gourd"),
  seed_burst: S("seed_arc", "seed"),
  timber: S("heavy_drop", "log"),
  sap_drain: S("drain", "sap"),
  sap_spout: S("glob", "sap"),
  leaf_gale: S("gale", "leaf"),
  root_tap: S("roots", "tap"),
  root_snare: S("roots", "snare"),
  allelopathy: S("toxin", "soil"),
  sap_seal: S("harden", "sap"),
  bark_skin: S("harden", "bark"),
  curl_up: S("shield"),
  photosynthesise: S("light_rays", "heal"),
  sugar_rush: S("rush"),
  // fire
  ember_seed: S("ember", "seed"),
  chili_burst: S("burst", "chili"),
  wildfire: S("blaze"),
  smoulder: S("smoke"),
  capsaicin: S("glob", "oil"),
  sun_flare: S("weather_sun"),
  // water
  dew_drop: S("droplet"),
  undertow: S("wave", "undertow"),
  flood: S("wave", "flood"),
  downpour: S("downpour"),
  pad_slap: S("slam"),
  mist_veil: S("mist", "veil"),
  rain_call: S("weather_rain"),
  // bug
  quick_snap: S("snap", "quick"),
  dew_grasp: S("tendrils", "dew"),
  snap_trap: S("snap", "trap"),
  pitfall: S("pitfall"),
  digest: S("drain", "acid"),
  sticky_dew: S("glob", "dew"),
  nectar_lure: S("lure", "nectar"),
  // bloom
  pollen_puff: S("spores", "pollen"),
  wind_scatter: S("wind_seeds"),
  sunbeam: S("beam", "sun"),
  petal_storm: S("gale", "petal"),
  unfurl: S("grow", "unfurl"),
  sun_track: S("light_rays", "track"),
  perfume: S("lure", "scent"),
  // ghost
  pale_touch: S("ghost_touch"),
  rot_touch: S("toxin", "rot"),
  dodder_coil: S("tendrils", "dodder"),
  wither: S("wither"),
  moonbeam: S("beam", "moon"),
  pale_bloom: S("burst", "pale"),
  night_fold: S("harden", "night"),
  spore_cloud: S("spores", "sleep"),
  // thorn
  thorn_jab: S("volley", "jab"),
  sting_hairs: S("volley", "hairs"),
  spine_volley: S("volley", "spines"),
  burr_hitch: S("seed_arc", "burr"),
  thorn_lash: S("vine_whip", "thorn"),
  hook_thorns: S("slash", "hook"),
  bristle: S("bristle"),
  splinter: S("volley", "splinter"),
  // frost
  cold_mist: S("mist", "cold"),
  hoarfrost: S("frost", "hoar"),
  frost_bloom: S("frost", "bloom"),
  snowdrift: S("blizzard"),
  frost_needle: S("volley", "ice"),
  cold_snap: S("weather_frost"),
  // dragon
  fossil_print: S("heavy_drop", "fossil"),
  red_resin: S("glob", "resin"),
  primal_frond: S("slash", "frond"),
  old_growth: S("grow", "old"),
  // round 3: the new lines' signature moves
  cattail_fluff: S("wind_seeds", "fluff"),
  pitfall_slurp: S("pitfall", "slurp"),
  slick_rim: S("pitfall", "rim"),
  lucky_leaf: S("slash", "clover"),
  nitro_fix: S("light_rays", "heal"),
  digitalis: S("toxin", "digitalis"),
  holly_spines: S("slash", "holly"),
  rose_thorn: S("volley", "rose"),
  menthol_chill: S("frost", "menthol"),
  evergreen: S("harden", "evergreen"),
  dragon_nip: S("snap", "dragon_nip"),
  dragon_snap: S("snap", "dragon"),
  // round 4: the Chapter 4 lines (orchard, Palm House)
  windfall: S("heavy_drop", "apple"),
  aerial_root: S("roots", "snare"),
  fenestrate: S("harden", "bark"),
  lotus_effect: S("shield"),
  pod_shower: S("seed_arc", "seed"),
  velamen: S("drain", "sap"),
  false_nectar: S("lure", "nectar"),
  long_bloom: S("light_rays", "heal"),
  pollen_perch: S("slash", "leaf"),
  // Chapter 5: reuse the drain, drifting seeds, growth, heat and bark families
  root_siphon: S("drain", "sap"),
  seed_drift: S("wind_seeds", "fluff"),
  serotiny: S("grow", "unfurl"),
  snowmelt: S("ember", "seed"),
  heartwood: S("harden", "bark"),
  // fallback move used with no PP left
  struggle: S("slam", "struggle"),
};

/** Type defaults for moves added later without an explicit entry. */
const TYPE_DEFAULT: Record<TypeId, Record<Move["category"], AnimSpec>> = {
  wood:   { physical: S("vine_whip"), special: S("gale", "leaf"), status: S("grow", "unfurl") },
  fire:   { physical: S("ember", "seed"), special: S("ember", "seed"), status: S("smoke") },
  water:  { physical: S("slam"), special: S("droplet"), status: S("mist", "veil") },
  bug:    { physical: S("snap", "quick"), special: S("drain", "acid"), status: S("lure", "nectar") },
  bloom:  { physical: S("gale", "petal"), special: S("spores", "pollen"), status: S("lure", "scent") },
  ghost:  { physical: S("ghost_touch"), special: S("beam", "moon"), status: S("spores", "sleep") },
  thorn:  { physical: S("volley", "spines"), special: S("volley", "hairs"), status: S("bristle") },
  frost:  { physical: S("volley", "ice"), special: S("frost", "hoar"), status: S("mist", "cold") },
  dragon: { physical: S("slash", "frond"), special: S("glob", "resin"), status: S("grow", "old") },
};

export function animFor(move: Pick<Move, "id" | "type" | "category">): AnimSpec {
  return MOVE_ANIMS[move.id] ?? TYPE_DEFAULT[move.type]?.[move.category] ?? S("slam");
}

/**
 * Does this animation play on the user (buffs, heals, protect, weather) rather
 * than travelling to the target?
 */
export function isSelfAnim(spec: AnimSpec): boolean {
  return (
    spec.family === "harden" || spec.family === "bristle" || spec.family === "shield" ||
    spec.family === "light_rays" || spec.family === "rush" || spec.family === "grow" ||
    (spec.family === "mist" && spec.variant === "veil") ||
    spec.family.startsWith("weather_")
  );
}
