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

**Saves:** a Quickened's stats are stored in the save, not computed on load.
They are recomputed from its species only on level-up, growth and in the
Nursery, so a base-stat change reaches a plant in an existing save at its next
level-up or growth.

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

## Trainers: `src/data/trainers.json`

Every trainer's battle data, in one ordered list (story order; the game's
`TRAINERS` keeps this order). The dialogue (`intro`, `defeat`, `after`) stays
in TypeScript, in the lines records of `src/world/trainers.ts`, joined by id.
Edit it by hand or with the Trainer Editor (`trainereditor.html`, docs/TRAINERS.md).

```json
{
  "format": "verdant.trainers/1",
  "trainers": [
    { "id": "hollis", "name": "HOLLIS", "className": "WARDEN", "portrait": "hollis", "ai": "smart", "music": "battle_leader", "prize": 1100, "mark": "bramble_mark",
      "items": [{ "item": "water_flask", "qty": 2 }],
      "team": [
        { "species": "fern_fiddlehead", "level": 8, "moves": ["vine_lash", "curl_up", "sap_drain"] },
        { "species": "bramble_berry", "level": 10, "moves": ["thorn_jab", "vine_lash", "burr_hitch", "sap_seal"] }
      ] }
  ]
}
```

| Field | Rule |
|---|---|
| `id` | lower_snake_case, unique. It must have lines in `src/world/trainers.ts` under the same key, or (for a rival's starter variant, `rival_4_oak`) under its battle's key (`rival_4`). Every lines key must be used. Ids ending `_rematch` are reserved: the build derives them. |
| `name` / `className` | 1–12 / 1–14 characters, upper case as in dialogue. |
| `portrait` | One of `TRAINER_PORTRAITS` (src/contracts/ids.ts), not the player's backs. |
| `ai` | `basic` or `smart` (always written out). |
| `music` | `battle_trainer`, `battle_leader`, `battle_rootstock`, `battle_mercer` or `battle_keeper` (always written out). |
| `prize` | **Only where it differs from the default rule**: an entry without `prize` pays the highest team level x 20 (`defaultPrize`), so changing levels keeps a route trainer's prize in step. Leaders, admins and BRAM state theirs. |
| `mark` | Optional; one of `MARKS`, each awarded by at most one trainer (the Conservatory leaders). |
| `items` | Optional bag: `{ item, qty }` with a known item, qty at least 1, each item once. |
| `note` | Optional designer's note (balance rationale). The game ignores it; the editor shows it. |
| `team` | 1–6 members: `species` (known), `level` (1–100), optional `moves` (1–4 unique known moves; omitted = the engine's default, the last four learned with at least two attacks, `movesAtLevel`), optional `grafted: true` (a graft collar: stats from five levels lower). |

**Derived, not stored.** The Council rematches (`belladonna_rematch` and the
rest) are built from the five seats at +8 levels by `councilRematches`
(src/world/rematches.ts), with their own lines there. Route rematches are built
per fight by `buildRematch`. BRAM's three starter variants per battle are
stored as separate entries (`rival_2_oak`, `_chili`, `_lily`), since their
teams differ; `STARTER_SPECIES` and `COUNTER` stay in `trainers.ts`.

**How it loads:** `src/world/trainers.ts` imports the file (inlined at build
time) and builds `TRAINERS` with `buildTrainers` (src/world/trainerFile.ts),
which first runs `trainersFileErrors` against the game data and the lines. A
mistake fails with the trainer and field, e.g.
`trainers.json: trainers[0] schoolkid_milo: team[0]: unknown species triffid`.
The file is kept in the canonical layout `formatTrainersFile` writes (one
trainer per block, one member per line), and `trainerFile.test.ts` checks that,
so an unchanged export from the editor is byte-identical.

**What guards an edit:** the file checks above, then `npm test`: the world
validator (text fit, references), the balance tests (leader win-rate bands)
and the chapter tests that pin story teams.

**The growth rule (a warning, not an error):** species stay at or past the
level their previous stage grows at (a SUNFLOWER BUD no lower than the level a
SEEDLING becomes one), unless the story says otherwise: a `grafted` member (BRAM's
graft collar) is forced past its growth on purpose. The editor flags the rest.
