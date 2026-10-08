// Self-contained, local browser review of real trainer/dialogue scenes.
// The sole speaker entry is injected into this review build, never source.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';
const root=resolve(import.meta.dirname,'../../..'), review=resolve(import.meta.dirname,'review');
function guarded(path) {
  if (!path.startsWith(review+'/')) throw new Error('output must stay in review');
  execFileSync('git',['check-ignore','-q','--',relative(root,path)],{cwd:root});
}
guarded(review+'/r6b.html');mkdirSync(review,{recursive:true});
const files={};
function walk(dir) {
  for (const item of readdirSync(dir,{withFileTypes:true})) {
    const path=resolve(dir,item.name), rel=relative(root+'/public',path);
    if(item.isDirectory()) { if(!rel.startsWith('art/packs/') || rel.startsWith('art/packs/limezu')) walk(path); }
    else if(item.name.endsWith('.json')) { try {files[rel]=JSON.parse(readFileSync(path));} catch {} }
    else if(item.name.endsWith('.png')) files[rel]='data:image/png;base64,'+readFileSync(path).toString('base64');
  }
}
walk(root+'/public/art');
const out=await build({configFile:false,root,logLevel:'warn',plugins:[{name:'review-speaker-fixture',transform(code,id) {
  if(id.endsWith('/src/world/speakers.ts')) return code.replace('= {};','= { "TEST VALE": "vale" };');
}}],build:{write:false,minify:false,lib:{entry:resolve(import.meta.dirname,'review_portraits.ts'),name:'R6bReview',formats:['iife']}}});
const code=(Array.isArray(out)?out[0]:out).output.find(o=>o.type==='chunk').code;
writeFileSync(review+'/r6b.html','<!doctype html><meta charset="utf-8"><title>R6b review loading</title><style>body{background:#302923;color:#f8eedc}canvas{display:block;image-rendering:pixelated}a{color:#f8eedc}</style><script>window.__files='+JSON.stringify(files)+';</script><script>'+code.replaceAll('</script','<\\/script')+'</script>');
console.log('Open the ignored review/r6b.html; save its trainer and dialogue capture links into review/.');
if(process.argv.includes('--software')) {
  const { softwareReview }=await import('./review_canvas.mjs');
  guarded(review+'/r6b-commands.json');await softwareReview(code,files,review+'/r6b-commands.json');
}
