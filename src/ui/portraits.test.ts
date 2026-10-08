import { afterEach, expect, it, vi } from "vitest";
import type { ArtImage, Assets, GameContext, ScriptCmd } from "../contracts";
import { facePath, SCREEN_W, SCREEN_H, TEXTBOX } from "../contracts";
import { blinkFrame, drawSpeakerFace, FACE_CARD } from "./portraits";
import { createUiKit } from "./kit";
import { createSceneStack } from "../engine/core";
import { runScript, scriptFacePaths, type ScriptHost } from "../overworld/script";
import { newGameState } from "../save";
import { WORLD } from "../world";
vi.mock("../world/speakers", () => ({ speakerFace: (name?: string) => ({ VALE: "vale", PLAYER: "player" }[name?.trim().toUpperCase() ?? ""] ?? null) }));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const image = { width:48,height:48 } as ArtImage;
function assets(loaded = true): Assets {
  return { has: vi.fn(()=>loaded), exists: vi.fn(()=>true), image: vi.fn(()=>loaded ? image : undefined), loadAll: vi.fn(async()=>{}),
    imageFrames: ()=>2, imageFrame: vi.fn(()=>image) };
}
it("blinks for exactly six ticks per 150 ticks, while base portraits stay static", () => {
  expect(Array.from({length:300},(_,i)=>blinkFrame(i,2)).reduce((a,b)=>a+b,0)).toBe(12);
  expect([143,144,149,150].map(t=>blinkFrame(t,2))).toEqual([0,1,1,0]);
  expect(blinkFrame(149)).toBe(0);
});
it("places the card above the unchanged 36×3 box within 320×180", () => {
  expect(FACE_CARD.x).toBe(TEXTBOX.x+4);
  expect(FACE_CARD.y+48).toBe(TEXTBOX.y+4);
  expect(FACE_CARD.x).toBeGreaterThanOrEqual(0); expect(FACE_CARD.y).toBeGreaterThanOrEqual(0);
  expect(FACE_CARD.x+48).toBeLessThanOrEqual(SCREEN_W); expect(FACE_CARD.y+48).toBeLessThanOrEqual(SCREEN_H);
  const drawImage=vi.fn(), a=assets();
  drawSpeakerFace({drawImage} as unknown as CanvasRenderingContext2D,a,"vale",149);
  expect(drawImage).toHaveBeenCalledWith(image,FACE_CARD.x,FACE_CARD.y);
  expect(a.imageFrame).toHaveBeenCalledWith(facePath("vale"),1);
});
it("adds no canvas calls or asset loading for fallback, null speakers or signs", () => {
  const drawImage=vi.fn(), g={drawImage} as unknown as CanvasRenderingContext2D, missing=assets(false), a=assets();
  drawSpeakerFace(g,missing,"vale",149); drawSpeakerFace(g,a,null,149); drawSpeakerFace(g,a,undefined,149);
  expect(drawImage).not.toHaveBeenCalled(); expect(missing.image).not.toHaveBeenCalled(); expect(missing.loadAll).not.toHaveBeenCalled();
});
it("preloads branches and calls once, resolves the active player, and handles cycles", () => {
  const scripts: Record<string,ScriptCmd[]> = { sub: [{op:"say",text:"One",speaker:"VALE"},{op:"call",script:"sub"}] };
  expect(scriptFacePaths(scripts, [[{op:"call",script:"sub"},{op:"if",when:[{flag:"fixture",is:true}],then:[{op:"say",text:"Two",speaker:"PLAYER"}]}]], "pip")).toEqual([facePath("vale"),facePath("pip")]);
});
it("keeps a same-speaker card through the confirm frame, without reloads or clock resets", async () => {
  let confirm=false;
  const scenes=createSceneStack(), a=assets(), state=newGameState({world:WORLD}); state.options.textSpeed="fast";
  const ctx={scenes,assets:a,state,world:WORLD,input:{pressed:()=>confirm,held:()=>false,repeat:()=>false},audio:{playSfx(){}}} as unknown as GameContext;
  ctx.ui=createUiKit(ctx);
  const host={ctx,playerCharacter:()=>"pip"} as ScriptHost;
  const say=vi.spyOn(ctx.ui,"say");
  const running=runScript(host,[{op:"say",text:"ONE",speaker:"VALE"},{op:"say",text:"TWO",speaker:"VALE"},{op:"say",text:"DONE"}]);
  // Font atlas only; fake canvas pixels contain no licensed art.
  vi.stubGlobal("document",{createElement:()=>({width:128,height:128,getContext:()=>({fillRect(){}})})});
  const calls: unknown[][]=[];
  const g={save(){},restore(){},fillRect(){},drawImage:(...args:unknown[])=>calls.push(args)} as unknown as CanvasRenderingContext2D;
  for(let i=0;i<145;i++) scenes.top()?.update(0);
  const first=scenes.top(); confirm=true; first?.update(0);
  expect(scenes.top()).toBe(first); // Card remains for this very draw.
  first?.draw(g);
  expect(calls.at(-1)).toEqual([image,FACE_CARD.x,FACE_CARD.y]);
  confirm=false; for(let i=0;i<15;i++) await null;
  expect(scenes.top()).not.toBe(first); expect(say).toHaveBeenCalledTimes(2);
  const clock=say.mock.calls[0][1]?.faceClock;
  expect(say.mock.calls[1][1]?.faceClock).toBe(clock);
  expect(clock?.tick).toBe(146);
  scenes.top()?.update(0); expect(clock?.tick).toBe(147);
  expect(a.loadAll).not.toHaveBeenCalled();
  for(let i=0;i<50;i++) scenes.top()?.update(0);
  confirm=true; scenes.top()?.update(0); confirm=false; for(let i=0;i<15;i++) await null;
  expect(say.mock.calls[2][1]).toBeUndefined();
  for(let i=0;i<50;i++) scenes.top()?.update(0);
  confirm=true; scenes.top()?.update(0); await running;
});
