# Game data files

Creature stats live in plain JSON, so they can be read, edited and swapped
without touching TypeScript. Art lives separately in `public/art/species/`
(docs/ART.md): swapping an art pack never changes gameplay, and editing data
never changes art.

## Species: `src/data/species/<line>.json`

One file per evolution line, stages in order. The file name is the line id.

```json
{
  "format": "verdant.speciesline/1",
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
      "learnset": [[1, "vine_lash"], [1, "sap_seal"], [6, "root_tap"]]
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
| `learnset` | `[level, move]` pairs. Level 1 moves are the starting moves. Move ids must exist in src/data/moves.ts. |

**How it loads:** `src/data/species.ts` imports every file at build time
(Vite inlines them, so there's no runtime fetch) and checks each file's
shape. A mistake fails with the file and field, e.g.
`oak.json: species[0] oak_acorn: baseStats.hp must be an integer 1-255`.

**What guards an edit:** `npm test` runs the file checks
(src/data/speciesFiles.test.ts), the data tests (names, growth caps,
signature moves) and the balance tests (leader win-rate bands). A stat change
that makes a leader too easy or too hard fails there, before it can ship.

**Saves:** a Quickened's stats are computed from its species on load, so
changing base stats also changes creatures in existing saves.

Not in JSON yet: moves (`src/data/moves.ts`), items (`src/data/items.ts`)
and Herbarium entries (`src/data/herbarium.ts`, which keeps a `// Source:` per
fact).
