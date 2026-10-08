// Offline review of the real scenes. Bundled by review_ui.mjs into the ignored
// review directory; all image data is supplied there, never in this source.
import { createArtAssets } from '../../../src/art';
import { createSceneStack } from '../../../src/engine/core';
import { DATA } from '../../../src/data';
import { WORLD } from '../../../src/world';
import { newGameState } from '../../../src/save';
import { createQuickened } from '../../../src/battle/logic/stats';
import { seeded } from '../../../src/battle/logic/rng';
import { createUiKit } from '../../../src/ui/kit';
import { beginSkinFrame } from '../../../src/ui/skin';
import { runStartMenu } from '../../../src/overworld/startMenu';
import { bagScreen } from '../../../src/screens/bag';
import { partyScreen } from '../../../src/screens/party';
import { summaryScreen } from '../../../src/screens/summary';
import { shopScreen } from '../../../src/screens/shop';
import { optionsScreen } from '../../../src/screens/options';
import { nameEntry } from '../../../src/ui/nameEntry';
import { createBattleScene } from '../../../src/battle/scene';
import { renderWorldPreview } from '../../../src/world/dev';
import type { Button, GameContext, SpeciesId } from '../../../src/contracts';

async function main() {
  const files = (window as any).__files;
  window.fetch = (async (url: string) => {
    const value = files[url];
    return { ok: value !== undefined, json: async () => value, text: async () => JSON.stringify(value) } as Response;
  }) as typeof fetch;
  const assets = createArtAssets({ packs: ['limezu'] }); await assets.ready();
  await Promise.all(Object.entries(files).filter(([k]) => k.endsWith('.png')).map(async ([url, src]) => {
    const image = new Image(); image.src = src as string; await image.decode(); assets.overrideFile(url, image);
  }));
  const ids = ['oak_acorn','chili_blossom','lily_seedpod','dandelion_bud','bramble_blossom','moonflower_seed'] as SpeciesId[];
  function context() {
    let press: Button | undefined;
    const scenes = createSceneStack(), state = newGameState({ world: WORLD });
    state.playerName = 'ROSE'; state.money = 3210;
    state.party = ids.map((s,i) => createQuickened(DATA,s,30+i,seeded(i)));
    state.party[1].hp = Math.floor(state.party[1].stats.hp * .4);
    state.party[2].hp = Math.max(1,Math.floor(state.party[2].stats.hp * .15));
    state.box = [...state.party]; state.herbarium = { seen: ids, caught: ids };
    state.bag = { water_flask: 5, rain_jar: 2, neem_spray: 1, spring_water: 2, compost: 1, glass_pod: 10, field_herbarium: 1 };
    const ctx = { assets, scenes, state, data: DATA, world: WORLD, rng: seeded(1),
      input: { pressed: (b: Button) => b === press, repeat: (b: Button) => b === press, held: () => false },
      audio: new Proxy({}, { get: (_,key) => key === 'current' ? () => null : () => Promise.resolve() }),
    } as unknown as GameContext;
    ctx.ui = createUiKit(ctx);
    const tick = async (n = 1, button?: Button) => { for (let i = 0; i < n; i++) { press = i === 0 ? button : undefined; scenes.top()?.update(1000/60); for (let j=0;j<20;j++) await null; } press = undefined; };
    return { ctx, tick };
  }
  const map = document.createElement('canvas');
  const worldCtx = context().ctx;
  renderWorldPreview(worldCtx, WORLD.maps.route_1, map, 1);
  const images: { label: string; image: HTMLCanvasElement }[] = [];
  async function capture(label: string, setup: (c: ReturnType<typeof context>) => Promise<void>) {
    const c = context(); await setup(c);
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
    const g = canvas.getContext('2d')!; g.imageSmoothingEnabled = false;
    g.fillStyle = '#b4c894'; g.fillRect(0,0,320,180);
    g.drawImage(map,0,0,320,180,0,0,320,180);
    beginSkinFrame(g); c.ctx.scenes.top()!.draw(g);
    images.push({ label, image: canvas });
  }
  await capture('Dialogue (mid-page)', async c => { void c.ctx.ui.say('DR. VALE: Every plant has a story. Take your time and look closely.'); await c.tick(75); });
  await capture('START menu', async c => { void runStartMenu(c.ctx,{ scriptRunning: false, async glide() {} }); await c.tick(30); });
  await capture('Bag', async c => { void bagScreen(c.ctx,{ inBattle: false }); await c.tick(30); });
  await capture('Party (green / yellow / red HP)', async c => { void partyScreen(c.ctx,{ mode:'view' }); await c.tick(30); });
  await capture('Summary', async c => { void summaryScreen(c.ctx,c.ctx.state.party,0); await c.tick(30); });
  await capture('Shop (BUY)', async c => { void shopScreen(c.ctx,['water_flask','rain_jar','neem_spray','glass_pod']); await c.tick(30); await c.tick(1,'a'); await c.tick(10); });
  await capture('Options', async c => { void optionsScreen(c.ctx); await c.tick(30); });
  await capture('Battle (moves, yellow / red HP)', async c => {
    c.ctx.state.party[0].hp = Math.floor(c.ctx.state.party[0].stats.hp * .4);
    const scene = createBattleScene(c.ctx,{ kind:'wild',wild:{ species:'bramble_blossom',level:28 },backdrop:'grass' },()=>{});
    c.ctx.scenes.push(scene);
    // Drive the real intro until the command rail, then open FIGHT.
    for (let i=0;i<1500;i++) {
      await c.tick(1,i%90 === 89 ? 'a' : undefined);
      const b = scene as any;
      if (b.idle && b.ui.overlays.length) {
        await c.tick(1,'a'); await c.tick(2);
        if (b.ui.overlays.length) { b.enemyHud.hp = b.enemyHud.q.stats.hp * .15; return; }
      }
    }
    throw new Error('battle move menu did not open');
  });
  await capture('Name entry', async c => { void nameEntry(c.ctx,{ title:'YOUR NAME?',max:7,defaultName:'ROSE' }); await c.tick(30); });
  const sheet = document.createElement('canvas'); sheet.width = 3 * 336; sheet.height = 3 * 216;
  const g = sheet.getContext('2d')!; g.fillStyle = '#302923'; g.fillRect(0,0,sheet.width,sheet.height);
  g.font = '12px monospace';
  images.forEach(({label,image},i) => { const x = i%3*336+8, y=Math.floor(i/3)*216; g.fillStyle='#f8eedc';g.fillText(label,x,y+18);g.drawImage(image,x,y+28); });
  document.body.append(sheet);
  const link = document.createElement('a'); link.textContent='Save r6.png'; link.download='r6.png'; link.href=sheet.toDataURL('image/png'); document.body.prepend(link);
  document.title = 'R6 UI review — ready';
  (window as any).__reviewDone?.(sheet, images.map(i => i.label));
}
main().catch(e => { document.body.textContent=String(e.stack ?? e); document.title='R6 review ERROR'; });
