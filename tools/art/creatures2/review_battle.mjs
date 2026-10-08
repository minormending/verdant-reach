// Keep all licensed image bytes in a temporary recording and ignored output.
import { readFileSync,readdirSync,mkdtempSync,mkdirSync,copyFileSync,rmSync } from 'node:fs';
import { resolve,relative,join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';
import { softwareReview } from '../limezu/review_canvas.mjs';
const root=resolve(import.meta.dirname,'../../..');
const output=join(root,'tools/art/limezu/review/r5b_battle.png');
execFileSync('git',['check-ignore','-q','--',relative(root,output)],{cwd:root});
if(!readFileSync(join(root,'public/art/packs/limezu/pack.json'))) throw new Error('Local LimeZu pack required');
const ids=['oak_sapling','green_chili','lily_pad','great_oak'];
const files={};
function walk(dir) {
  for(const item of readdirSync(dir,{withFileTypes:true})) {
    const path=join(dir,item.name),rel=relative(join(root,'public'),path);
    if(item.isDirectory()) {
      if(!rel.startsWith('art/packs/') || rel.startsWith('art/packs/limezu')) walk(path);
    } else if(item.name.endsWith('.json')) {
      try {files[rel]=JSON.parse(readFileSync(path));} catch { /* optional templates */ }
    } else if(item.name.endsWith('.png') && (!rel.includes('/species/') || ids.some(id=>rel.includes('/species/'+id+'/')))) {
      files[rel]='data:image/png;base64,'+readFileSync(path).toString('base64');
    }
  }
}
walk(join(root,'public/art'));
const built=await build({configFile:false,root,logLevel:'warn',build:{write:false,minify:false,
  lib:{entry:resolve(import.meta.dirname,'review_battle.ts'),name:'R5bReview',formats:['iife']}}});
const code=(Array.isArray(built)?built[0]:built).output.find(o=>o.type==='chunk').code;
const temp=mkdtempSync(join(tmpdir(),'verdant-r5b-'));
try {
  await softwareReview(code,files,join(temp,'r5b_battle-commands.json'));
  execFileSync(process.env.PYTHON ?? '/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python',
    [resolve(import.meta.dirname,'_battle_replay.py'),temp],{cwd:root,stdio:'inherit'});
  mkdirSync(resolve(output,'..'),{recursive:true});copyFileSync(join(temp,'r5b_battle.png'),output);
  console.log('Two 320x180 real scene software captures:',relative(root,output));
} finally {rmSync(temp,{recursive:true,force:true});}
