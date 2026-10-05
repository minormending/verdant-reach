import { it } from "vitest";
import { DATA } from "../../data";
import { WORLD } from "../../world";
import { createQuickened } from "./stats";
import { seeded } from "./rng";
import { chooseFoeAction } from "./ai";
import { createBattleState, resolveTurn } from "./battle";
it("probe", () => {
  const rng = seeded(7);
  const t = WORLD.trainers["hollis"];
  const p = [createQuickened(DATA, "red_chili", 40, rng)];
  p[0].moves = [{ id: "wildfire", pp: 5 }];
  const f = t.team.map(x => { const q = createQuickened(DATA, x.species, x.level, rng); if (x.moves) q.moves = x.moves.map(id => ({ id, pp: 10 })); return q; });
  const s = createBattleState({ data: DATA, playerParty: p, playerActive: 0, foeParty: f, wild: false, time: "day", foeTrainer: "H", foeItems: { water_flask: 2 } });
  for (let i = 0; i < 5; i++) {
    const fa = chooseFoeAction(s, "smart", rng);
    const ev = resolveTurn(s, { kind: "move", slot: 0 }, fa, rng);
    console.log(`T${i} F:${JSON.stringify(fa)} ` + JSON.stringify(ev).slice(0, 600));
  }
});
