// Build a self-contained offline review; all crops and render outputs stay ignored.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';
const root = resolve(import.meta.dirname, '../../..');
const review = resolve(import.meta.dirname,'review');
const guarded = path => {
  if (!path.startsWith(review+'/')) throw new Error('output must stay in review');
  execFileSync('git',['check-ignore','-q','--',relative(root,path)],{cwd:root});
};
guarded(review+'/r6.html'); mkdirSync(review,{recursive:true});
const files = {};
const ids = ['oak_acorn','chili_blossom','lily_seedpod','dandelion_bud','bramble_blossom','moonflower_seed'];
function walk(dir) {
  for (const item of readdirSync(dir,{withFileTypes:true})) {
    const path=resolve(dir,item.name), rel=relative(root+'/public',path);
    if (item.isDirectory()) { if (rel === 'art/packs' || !rel.startsWith('art/packs/') || rel.startsWith('art/packs/limezu')) walk(path); }
    else if (item.name.endsWith('.json')) { try { files[rel]=JSON.parse(readFileSync(path)); } catch { /* unindexed authoring templates */ } }
    else if (item.name.endsWith('.png') && (!rel.includes('/species/') || ids.some(id=>rel.includes('/species/'+id+'/')))) files[rel]='data:image/png;base64,'+readFileSync(path).toString('base64');
  }
}
walk(root+'/public/art');
const out = await build({configFile:false,root,logLevel:'warn',build:{write:false,minify:false,lib:{entry:resolve(import.meta.dirname,'review_ui.ts'),name:'R6Review',formats:['iife']}}});
const code = (Array.isArray(out)?out[0]:out).output.find(o=>o.type==='chunk').code;
writeFileSync(review+'/r6.html','<!doctype html><meta charset="utf-8"><title>R6 review loading</title><style>body{background:#302923;color:#f8eedc}canvas{display:block;image-rendering:pixelated}a{color:#f8eedc}</style><script>window.__files='+JSON.stringify(files)+';</script><script>'+code.replaceAll('</script','<\\/script')+'</script>');
console.log('Open tools/art/limezu/review/r6.html in a browser, then Save r6.png into the same ignored review directory.');

if (process.argv.includes('--software')) {
  const { softwareReview } = await import('./review_canvas.mjs');
  guarded(review+'/r6-commands.json');
  await softwareReview(code,files,review+'/r6-commands.json');
  console.log('Software draw commands saved to the ignored review directory.');
}
