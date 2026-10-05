# Production polish pass: 10 agents

**Goal:** take the slice (Prologue → Conservatory 2) from "working" to
**production-ready, AAA-for-the-GBC-era** in art, maps, dialogue and
gameplay feel. Read [STYLE.md](STYLE.md) first; it is the bar. Also read
[ARCHITECTURE.md](ARCHITECTURE.md) and [SLICE.md](SLICE.md), and skim the story
bible at `/Users/kevinramdath/projects/research/creature-sprites/story/`.

## What changed in the contracts for this pass

`src/contracts/` is frozen again; ask main for anything else.

- **New tiles** (TILES): flowers_red, flowers_yellow, stone_path, bridge,
  mushrooms, gate_open, chair, stump, log, lamp_post, barrel, crate, bench,
  pond_lily, reeds, cliff, stone_wall, garden_plot, crops, scarecrow,
  haybale, fireplace, stove, potted_tree, glass_wall, workbench, microscope.
  Their legend characters are already in `src/world/build.ts` (`LEGEND`).
- **AUTOTILE + `tileVariantPath`:** edge variants `key@mask.png`, where the
  mask is N=1|E=2|S=4|W=8 same-group neighbours.
- **`tileAltPath`:** ground variation tiles `key~1..3.png`.
- **New STRUCTURES:** barn, windmill, well, big_oak, big_maple. `door` is
  now optional; doorless structures are scenery.
- **New CHARACTERS:** cat, dog, bird (ambient) and hedge_gate, lever, valve
  (puzzle objects, used as NPCs with scripts/`visibleWhen`).
- **`MapDef.ambient`:** pollen, leaves, fireflies (night only), rain, mist or
  spores.
- **New ScriptCmd ops:** `camera` / `cameraReset` (cutscene pans), `ambient`,
  `flash`.

## Owners

Edit only what you own; read anything.

| # | Agent | Owns | Dev port |
|---|---|---|---|
| 1 | **Species art A** | `public/assets/species/<id>/` for the oak, chili, lily, dandelion, bramble and sunflower lines (18 ids); `tools/art/species_a/`; `creature-sprites/photos/game/` folders for those lines | 5181 |
| 2 | **Species art B** | `public/assets/species/<id>/` for the pumpkin, fern, flytrap, sundew, maple, nettle and moonflower lines (19 ids); `tools/art/species_b/`; their `photos/game/` folders | 5182 |
| 3 | **Environment art** | `public/assets/tiles/`, `public/assets/structures/`, `tools/art/tiles.py`, `tools/art/structures.py` | 5183 |
| 4 | **Characters + UI art** | `public/assets/characters/`, `trainers/`, `ui/`, `items/`; `tools/art/characters.py`, `portraits.py`, `ui.py`, `items.py` | 5184 |
| 5 | **Engine + overworld visuals** | `src/engine/`, `src/overworld/`, `src/ui/`, `src/save/` | 5185 |
| 6 | **Battle + screens** | `src/battle/`, `src/screens/` | 5186 |
| 7 | **Maps A (south)** | `src/world/maps/`: player_home, herbarium, herbarium_roof, fallowfield, route_1, hedgerow, fennimore_house, route_2; also `src/world/build.ts`, `validate.ts`, `world.test.ts`, `dev.ts` | 5187 |
| 8 | **Maps B (north)** | `src/world/maps/`: bramblegate, bramblegate_market, bramblegate_conservatory, greenhouse.ts (both greenhouses), route_3, sugarbush, sugarbush_grove, sugarbush_conservatory | 5188 |
| 9 | **Narrative + cutscenes** | `src/world/scripts/`; the text fields in `src/world/trainers.ts` (names, intro/defeat/after); description strings in `src/data/items.ts` and entry text in `src/data/herbarium.ts` (text only, keep the facts true) | 5189 |
| 10 | **Platform + QA + audio mix** | `index.html`, `src/main.ts`, `public/` (non-assets: favicon, web manifest), `src/platform/` (new), `src/audio/` (mix and ambience only), `e2e/` (new) | 5190 |

Shared-file rules:

- **Maps vs narrative.** Map agents own their map files, including the NPC
  lines inside them (write them to the voice in STYLE.md §5). If a layout
  change breaks a cutscene's `moveNpc` / `movePlayer` path or a position in
  `src/world/scripts/`, the map agent fixes that path array (and only that)
  in the script file. Re-read before every edit and keep edits surgical.
  Keep story-critical NPC ids unchanged.
- **Gameplay numbers stay as they are.** Teams, levels, learnsets and stats
  are guarded by `src/battle/logic/balance.test.ts`. Only touch them if a
  test or the QA agent shows a real problem, and keep that test green.
- **Asset manifest.** Any art agent that adds files runs
  `/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/build_manifest.py`.
  It regenerates the whole manifest, so concurrent runs are safe.
- **Contracts.** `src/contracts/` is frozen. Ask main via SendMessage
  (to: "main").
- **No git commits.** Main integrates.

## Definition of done (all agents)

- `npm run typecheck` and `npm test` are green, including the manifest test.
  That test lists every required asset, so art agents must make it pass.
- **You looked at your work in the real game,** not just in isolation.
  - Use your port and your own browser tab (`mcp__Claude_Browser__*`), and add
    `?timer` when the pane is hidden.
  - Dev routes: `?dev=world&map=<id>` (map overview), and
    `?dev=world&play=1&map=<id>&x=&y=&flags=a,b&species=<id>&level=<n>`
    (play from any state).
  - `window.__t` (dev only) offers `goto(x,y)`, `talkThrough()`, `info()`,
    `step(dir)`.
- **Review your screenshots critically against STYLE.md and iterate.**
  "Fine" isn't the bar. Stop your server and close your tab when done.
- **Final report** (under 350 words): what changed, before/after highlights,
  anything you couldn't finish, and integration notes for other owners.
