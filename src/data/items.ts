// Items. Names <= 12 chars. Prices follow SLICE.md (pod 200, flask 300,
// neem 250). Price 0 = cannot be bought or sold.

import type { Item } from "../contracts";

const LIST: Item[] = [
  // Pods
  { id: "terrarium_pod", name: "Terrarium Pod", pocket: "pods", price: 200,
    description: "Glass acorn. Tired plants root in.",
    effect: { kind: "pod", catchMultiplier: 1 }, usableInBattle: true, usableInField: false },
  { id: "glass_pod", name: "Glass Pod", pocket: "pods", price: 600,
    description: "Thick glass, warm soil. Better odds.",
    effect: { kind: "pod", catchMultiplier: 1.5 }, usableInBattle: true, usableInField: false },

  // Healing
  { id: "water_flask", name: "Water Flask", pocket: "items", price: 300,
    description: "A long cool drink. Restores 20 HP.",
    effect: { kind: "heal", amount: 20 }, usableInBattle: true, usableInField: true },
  { id: "spring_water", name: "Spring Water", pocket: "items", price: 700,
    description: "Icy spring water. Restores 60 HP.",
    effect: { kind: "heal", amount: 60 }, usableInBattle: true, usableInField: true },
  { id: "rain_jar", name: "Rain Jar", pocket: "items", price: 1500,
    description: "Soft rain, saved. Restores all HP.",
    effect: { kind: "heal_full" }, usableInBattle: true, usableInField: true },
  { id: "compost", name: "Compost", pocket: "items", price: 1500,
    description: "Lifts the wilted back to half HP.",
    effect: { kind: "revive", fraction: 0.5 }, usableInBattle: true, usableInField: true },
  { id: "neem_spray", name: "Neem Spray", pocket: "items", price: 250,
    description: "Neem oil mist. Cures any status.",
    effect: { kind: "cure_status" }, usableInBattle: true, usableInField: true },
  { id: "plant_food", name: "Plant Food", pocket: "items", price: 1200,
    description: "Slow feed: 10 PP to every move.",
    effect: { kind: "restore_pp", amount: 10 }, usableInBattle: true, usableInField: true },

  // Key items
  { id: "field_herbarium", name: "Herbarium", pocket: "key", price: 0,
    description: "Sketch the seen. Press the caught.",
    effect: { kind: "none" }, usableInBattle: false, usableInField: false },
  { id: "centuryheart_seed", name: "Century Seed", pocket: "key", price: 0,
    description: "Warm to the touch. It hums.",
    effect: { kind: "none" }, usableInBattle: false, usableInField: false },
  { id: "fennimores_letter", name: "Old Letter", pocket: "key", price: 0,
    description: "For DR. VALE. A green wax seal.",
    effect: { kind: "none" }, usableInBattle: false, usableInField: false },
];

export const ITEMS: Record<string, Item> = Object.fromEntries(LIST.map((i) => [i.id, i]));
