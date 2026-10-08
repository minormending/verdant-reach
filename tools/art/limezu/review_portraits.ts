// Built into a private offline review. The mjs wrapper injects TEST VALE only
// into this build of speakers.ts so the real script->speaker->UI path runs.
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
import { runScript, type ScriptHost } from '../../../src/overworld/script';
import { renderWorldPreview } from '../../../src/world/dev';
import type { Button, GameContext } from '../../../src/contracts';

async function main() {
  const files=(window as any).__files;
  window.fetch=(async(url:string)=>({ok:files[url]!==undefined,json:async()=>files[url],text:async()=>JSON.stringify(files[url])})) as typeof fetch;
  const assets=createArtAssets({packs:['limezu']});await assets.ready();
  await Promise.all(Object.entries(files).filter(([k])=>k.endsWith('.png')).map(async([url,src])=>{
    const image=new Image();image.src=src as string;await image.decode();assets.overrideFile(url,image);
  }));
  function context() {
    let press:Button|undefined;
    const scenes=createSceneStack(),state=newGameState({world:WORLD});
    state.playerName='ROSE';state.party=[createQuickened(DATA,'oak_acorn',30,seeded(1))];
    const ctx={assets,scenes,state,data:DATA,world:WORLD,rng:seeded(1),input:{pressed:(b:Button)=>b===press,repeat:()=>false,held:()=>false},
      audio:new Proxy({},{get:(_,key)=>key==='current'?()=>null:()=>Promise.resolve()})} as unknown as GameContext;
    ctx.ui=createUiKit(ctx);
    const tick=async(n=1,button?:Button)=>{for(let i=0;i<n;i++){press=i===0?button:undefined;scenes.top()?.update(1000/60);for(let j=0;j<20;j++)await null;}press=undefined;};
    return {ctx,tick};
  }
  const captures:HTMLCanvasElement[]=[];
  function capture(label:string,c:ReturnType<typeof context>,world=false) {
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const g=canvas.getContext('2d')!;
    g.imageSmoothingEnabled=false;g.fillStyle='#b4c894';g.fillRect(0,0,320,180);
    if(world){const map=document.createElement('canvas');renderWorldPreview(c.ctx,WORLD.maps.route_1,map,1);g.drawImage(map,0,0,320,180,0,0,320,180);}
    beginSkinFrame(g);c.ctx.scenes.top()!.draw(g);document.body.append(canvas);captures.push(canvas);
    const link=document.createElement('a');link.textContent='Save '+label;link.download=label;link.href=canvas.toDataURL('image/png');document.body.prepend(link);
  }
  const battle=context(),trainer=Object.values(WORLD.trainers).find(t=>t.portrait==='gardener'&&t.team.length)!;
  const scene=createBattleScene(battle.ctx,{kind:'trainer',trainer:trainer.id,backdrop:'grass'},()=>{});
  battle.ctx.scenes.push(scene);
  for(let i=0;i<500;i++) {
    await battle.tick();const b=scene as any;
    if(b.enemyTrainer.visible && b.enemyTrainer.dx===0 && b.playerTrainer.visible && b.fade===0 && b.ui.tb.visible && b.ui.tb.waiting) break;
    if(i===499)throw new Error('trainer intro capture did not settle');
  }
  capture('r6b-intro.png',battle);
  const dialogue=context();void runScript({ctx:dialogue.ctx} as ScriptHost,[{op:'say',text:'Every plant has a story. Take your time and look closely.',speaker:'TEST VALE'}]);
  await dialogue.tick(100);capture('r6b-dialogue.png',dialogue,true);
  const sheet=document.createElement('canvas');sheet.width=640;sheet.height=180;const g=sheet.getContext('2d')!;
  captures.forEach((c,i)=>g.drawImage(c,i*320,0));
  (window as any).__reviewDone?.(sheet,['Trainer intro','Dialogue with test-only speaker mapping']);
  document.title='R6b review ready';
}
main().catch(e=>{document.body.textContent=String(e.stack??e);document.title='R6b review ERROR';});
