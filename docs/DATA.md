# Game data files

Creatures, moves and items live in plain JSON, so they can be read, edited
and swapped without touching TypeScript. Art lives separately in `public/art/species/`
(docs/ART.md): swapping an art pack never changes gameplay, and editing data
never changes art.

## Species: `src/data/species/<line>.json`

One file per evolution line, stages in order, each with its Field Herbarium
page. The file name is the line id.

```json
{
  "format": "verdant.speciesline/2",
  "line": "oak",
  "pollination": ["woodland"],
  "species": [
    {
      "id": "oak_acorn",
      "name": "Oak Acorn",
      "stage": 1,
      "types": ["wood"],
      "baseStats": { "hp": 52, "atk": 54, "def": 64, "spa": 42, "spd": 54, "spe": 44 },
      "growthRate": "medium",
      "catchRate": 45,
      "baseExp": 64,
      "evYield": { "def": 1 },
      "activity": "any",
      "growsInto": { "species": "oak_sapling", "trigger": { "kind": "vigor", "level": 16 } },
      "learnset": [[1, "vine_lash"], [1, "sap_seal"], [6, "root_tap"]],
      "herbarium": {
        "scientificName": "Quercus robur",
        "category": "Acorn",
        "heightM": 0.1,
        "weightKg": 0.5,
        "entry": "It sits very still, thinking long, slow thoughts. Patience runs in the family: a real oak seldom bears acorns before it is about 40.",
        "fact": "English oak usually starts bearing acorns at ~40 years.",
        "source": "https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/british-trees/a-z-of-british-trees/english-oak/"
      }
    }
  ]
}
```

| Field | Rule |
|---|---|
| `pollination` | Groups from `POLLINATION_GROUPS` (src/contracts/data.ts). `[]` means it can't set seed (legendaries, the Centuryheart). It applies to the whole line. |
| `id` | Must be in `SPECIES_IDS` (src/contracts/ids.ts). Every id there needs exactly one entry. |
| `name` | 1–12 characters. |
| `stage` | 1, 2 or 3, matching the position in the file. |
| `types` | One or two of `TYPES`. |
| `baseStats` | Integers 1–255. Totals are guarded by the data and balance tests. |
| `growthRate` | `fast`, `medium` or `slow`. |
| `catchRate` | 3–255 (Gen 2 rules: lower is harder). |
| `activity` | `any`, `day` or `night` (photoperiod). |
| `growsInto` | Optional. The next stage of the same line, with a trigger: `vigor` (level), `vigor_day`, `vigor_night`, `tending` (friendship), `item` (e.g. `ember_ash`, `cold_snap`) or `cross_pollination` (trade). |
| `learnset` | `[level, move]` pairs. Level 1 moves are the starting moves. Move ids must exist in `moves.json`. |
| `herbarium` | The Field Herbarium page. `entry` is 2–4 short sentences containing **one true, checkable fact**. `fact` states that fact plainly and `source` cites a URL that checks it (the loader requires both). Heights and weights are real ballparks for the stage. No medicinal or cultural claims. |

**How it loads:** `src/data/species.ts` imports every file at build time
(Vite inlines them, so there's no runtime fetch) and checks each file's
shape. A mistake fails with the file and field, e.g.
`oak.json: species[0] oak_acorn: baseStats.hp must be an integer 1-255`.

**What guards an edit:** `npm test` runs the file checks
(src/data/speciesFiles.test.ts, src/data/dataFiles.test.ts), the data tests (names, growth caps,
signature moves) and the balance tests (leader win-rate bands). A stat change
that makes a leader too easy or too hard fails there, before it can ship.

**Saves:** a Quickened's stats are computed from its species on load, so
changing base stats also changes creatures in existing saves.

## Moves: `src/data/moves.json`

One list, in order (later chapters append; keep new moves at the end). One
move per line:

```json
{ "id": "acorn_drop", "name": "Acorn Drop", "type": "wood", "category": "physical", "power": 60, "accuracy": 95, "pp": 20, "priority": 0, "effects": [{ "kind": "flinch", "chance": 20 }], "description": "Drops a hard acorn. May flinch." }
```

| Field | Rule |
|---|---|
| `name` / `description` | 1–12 / 1–36 characters (descriptions show in two 18-column lines). |
| `category` | `physical`, `special` or `status`. |
| `power` | 0 for status moves and fixed-damage moves; above 0 otherwise. |
| `accuracy` | 1–100, or `null` for a move that never misses. |
| `effects` | Any of `status` (with `status`, `chance`, `target`), `stat` (`stat`, `stages`, `chance`, `target`), `drain`, `recoil` (`fraction`), `flinch` (`chance`), `high_crit`, `multi_hit` (`min`, `max`), `fixed_damage` (`amount`: a number or `"level"`), `always_hit`, `heal`, `protect`, `weather`, `root_tap`. Shapes are in `MoveEffect` (src/contracts/data.ts). |

A new move also needs an animation family in `src/battle/anims.ts` (the hints
test checks).

## Items: `src/data/items.json`

```json
{ "id": "water_flask", "name": "Water Flask", "pocket": "items", "price": 300, "description": "A long cool drink. Restores 20 HP.", "effect": { "kind": "heal", "amount": 20 }, "usableInBattle": true, "usableInField": true }
```

| Field | Rule |
|---|---|
| `name` / `description` | 1–13 / 1–36 characters. |
| `pocket` | `items`, `pods` or `key`. |
| `price` | Whole number; 0 means it can't be bought or sold. |
| `effect` | `heal` (`amount`), `heal_full`, `revive` (`fraction`), `cure_status` (optional `status`), `pod` (`catchMultiplier`), `restore_pp` (`amount`) or `none` (key items, growth items). |
