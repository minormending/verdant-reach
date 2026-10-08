// Original review fixture; pixels load locally and all captures stay ignored.
// Exercise the actual BattleScene.draw(), including the local LimeZu UI skin.
import { createArtAssets } from '../../../src/art';
import { createSceneStack } from '../../../src/engine/core';
import { DATA } from '../../../src/data';
import { WORLD } from '../../../src/world';
import { newGameState } from '../../../src/save';
import { createQuickened } from '../../../src/battle/logic/stats';
import { seeded } from '../../../src/battle/logic/rng';
import { createUiKit } from '../../../src/ui/kit';
import { beginSkinFrame } from '../../../src/ui/skin';
import { createBattleScene } from '../../../src/battle/scene';
import type { Button, GameContext, SpeciesId } from '../../../src/contracts';

async function main() {
  const files = (window as any).__files;
  window.fetch = (async (url: string) => ({ ok: files[url] !== undefined,
    json: async () => files[url], text: async () => JSON.stringify(files[url]) })) as typeof fetch;
  const assets = createArtAssets({ packs: ['limezu'] }); await assets.ready();
  await Promise.all(Object.entries(files).filter(([k]) => k.endsWith('.png')).map(async ([url,src]) => {
    const image = new Image(); image.src = src as string; await image.decode(); assets.overrideFile(url,image);
  }));
  const captures: HTMLCanvasElement[] = [];
  const labels: string[] = [];
  for (const [player,foe] of [['oak_sapling','green_chili'],['lily_pad','great_oak']] as [SpeciesId,SpeciesId][]) {
    let press: Button | undefined;
    const scenes = createSceneStack(), state = newGameState({ world: WORLD });
    state.party = [createQuickened(DATA,player,30,seeded(1))];
    const ctx = { assets, scenes, state, data: DATA, world: WORLD, rng: seeded(1),
      input: { pressed:(b:Button)=>b===press, repeat:(b:Button)=>b===press, held:()=>false },
      audio: new Proxy({}, {get:(_,key)=>key==='current'?()=>null:()=>Promise.resolve()})
    } as unknown as GameContext;
    ctx.ui = createUiKit(ctx);
    const scene = createBattleScene(ctx,{kind:'wild',wild:{species:foe,level:30},backdrop:'grass'},()=>{});
    scenes.push(scene);
    let ready = false;
    for (let i=0;i<1800;i++) {
      press=i%60===59?'a':undefined;
      scenes.top()?.update(1000/60); for(let j=0;j<20;j++) await null;
      if ((scene as any).idle && (scene as any).ui.overlays.length) {ready=true;break;}
    }
    if(!ready) throw new Error(`Battle intro did not settle: ${player}/${foe}`);
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
    const g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;
    beginSkinFrame(g);scene.draw(g);captures.push(canvas);labels.push(`${player} back / ${foe} front`);
  }
  const sheet=document.createElement('canvas');sheet.width=640;sheet.height=180;
  const g=sheet.getContext('2d')!;captures.forEach((c,i)=>g.drawImage(c,i*320,0));
  document.body.append(sheet);document.title='R5b battle review ready';
  (window as any).__reviewDone?.(sheet,labels);
}
main().catch(e=>{document.body.textContent=String(e.stack??e);document.title='R5b review ERROR';});
