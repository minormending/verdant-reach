import type { GameState, WorldData } from "../contracts";

/** Continue resets boulders, so start at the room's entrance instead of behind
 *  a reset stone. The first exit identifies the map the room is entered from;
 *  its first warp back into this room supplies the arrival tile and facing. */
export function continuePosition(world: Pick<WorldData, "maps">, saved: GameState["position"]): GameState["position"] {
  const room = world.maps[saved.map];
  if (!room?.npcs.some((n) => n.pushable)) return saved;
  const exit = room.warps[0];
  const entrance = exit && world.maps[exit.to]?.warps.find((w) => w.to === room.id);
  if (!entrance) throw new Error(`Boulder map "${room.id}" has no entrance from its first exit`);
  return { map: room.id, x: entrance.toX, y: entrance.toY, facing: entrance.facing ?? saved.facing };
}
