# Verdant Reach: architecture and team rules

A Game Boy Color–style monster collector in which every creature is a real plant.
- Browser game: Vite + TypeScript (strict) + Canvas 2D at 160x144, integer-scaled.
- No runtime dependencies.
- Story bible: [docs/story/](story/) (read it).
- Slice scope: [SLICE.md](SLICE.md).

## The quality bar

The target is **a polished vertical slice that feels like a real Game Boy Color
game**, not a prototype. Concretely:

- Authentic feel: GBC resolution, 8x8 bitmap font, 16px grid movement with
  smooth walking animation, Crystal-style text boxes and menus, fades,
  battle intro transitions, music in every location.
- **No placeholder text or art in the finished slice.** Missing assets must be
  caught by a check, not shipped.
- Systems are complete for the slice:
  - battles: wild, trainer, catching, switching, items, running, growth
    (evolution), move learning, status, weather;
  - saving and loading;
  - a day/night cycle that changes encounters and tint;
  - healing and whiteout.
- The writing is warm and concise. It fits an 18-character x 2-line text box,
  and every Herbarium entry contains a true fact about the real plant.
- No crashes and no soft-locks. Every module has `vitest` tests for its pure
  logic.

## Ownership

**Edit only your own directories.** Read anything.

| Agent | Owns | Entry points other modules rely on |
|---|---|---|
| **1. Engine** | `src/engine/`, `src/overworld/`, `src/ui/`, `src/save/`, `src/main.ts`, `index.html` | `createGameContext`, `createUiKit` (`src/ui/kit.ts`), `createTitleScene` (`src/ui/title.ts`), `newGameState`, `createSave` (`src/save/index.ts`), `createOverworldScene` (`src/overworld/index.ts`) |
| **2. Battle** | `src/battle/`, `src/screens/` | `createBattleScene`, `createQuickened`, `healParty` (`src/battle/index.ts`); `createScreens` (`src/screens/index.ts`) |
| **3. Data + Audio** | `src/data/`, `src/audio/` | `DATA: GameData` (`src/data/index.ts`); `createAudio(): AudioService` (`src/audio/index.ts`) |
| **4. World** | `src/world/` | `WORLD: WorldData` (`src/world/index.ts`) |
| **5. Art** | `public/art/` (bundles, [ART.md](ART.md)), `src/art/` (registry), `tools/art/` (artkit, `art.py`, generators) | bundles that resolve the logical paths in `src/contracts/constants.ts`; `public/art/index.json` (`npm run art:index`) |

`src/contracts/` belongs to **main** (the coordinator) and is frozen. If a
contract really blocks you, message main with `SendMessage` (to: "main")
saying exactly what you need. Otherwise adapt inside your own module and list
the workaround in your final report.

Module boundaries:
- Import other modules **only through their entry points**, and contracts from
  `src/contracts`.
- The placeholder files that exist now are typed stubs. Replace your own
  freely, but keep the exported signatures.

## Running and checking

- `npm run typecheck` must pass for the whole repo. If it fails only because
  of another agent's half-finished file, note it and don't edit their file.
- `npm test` (vitest): put your tests next to your code as `*.test.ts`.
- **Dev server: use your own port so agents don't collide.**
  `npx vite --port <port> --strictPort`, with ports engine 5174, battle 5175,
  data/audio 5176, world 5177, art 5178.
  - Never use 5173; that's main's.
  - If you have the browser tools (`mcp__Claude_Browser__*`), open your own
    tab on your own port. Close your tab and stop your server when done.
- **Dev scenes:** `http://localhost:<port>/?dev=<dir>` loads `src/<dir>/dev.ts`,
  whose default export is `(ctx: GameContext) => Scene | Promise<Scene>`.
  Build one for your module so you can test in isolation. For example,
  `?dev=battle` starts a fixture battle and `?dev=audio` is a jukebox.
- **Do not `git commit`**; main integrates and commits. Don't touch
  `node_modules` beyond `npm install` of dev-only tools (and say so if you
  do). The shipped game must have zero runtime dependencies.

## Conventions

- Logical screen is 160x144. Draw at integer coordinates only, with no
  smoothing.
- Controls:

  | Button | Keys |
  |---|---|
  | A | Z, Space, J |
  | B | X, Esc, Backspace, K |
  | START | Enter |
  | SELECT | Shift |
  | Movement | Arrows or WASD |

  Holding B while walking runs: an updated mechanic.
- Time of day comes from the real clock: morning 4–10, day 10–18, night 18–4.
- Text: the bitmap font is 8x8 and the text box shows 18 columns x 2 lines.
  Use `ctx.ui.say` (auto-wraps and pages). Upper-case names in dialogue, as in
  Crystal ("DR. VALE", "BRAM").
- Script flags are snake_case strings (`got_starter`). The engine sets
  `beat_<trainerId>` after a won trainer battle.
- The game must work with the audio placeholder (silent) and with missing
  art (draw a magenta box and log once). The final build must have neither.

## Updated mechanics vs. Crystal

These are deliberate improvements:
- Running with B.
- Physical/special split per move (not per type).
- Exp goes to every party member that took part. Party members that sat out
  get 50%.
- Pods can be thrown at any time in a wild battle, and a critical capture can
  happen.
- Field moves need no HM slots (none are in the slice anyway).
- Autosave is optional and off by default; START → SAVE.
